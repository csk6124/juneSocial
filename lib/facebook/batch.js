'use strict';

/**
 * @ after  오늘날짜부터 해서 마지막까지 가져옴
 * @ before  기존에 저장되어 있는 부분부터 최근까지 데이타 가져옴
 */

var _ = require('lodash'),
    Profiler = require('../profiler'),
    moment = require('moment'),
    ApiWrapper = require('./apiWrapper'),
    Amqp = require('../amqp'),
    Repository = require('../repository');

module.exports = function(config, db) {
    this.db = db;
    this.amqpTask = new Amqp.Task(config);
    this.profiler = new Profiler();
    this.profiler.Start('batch');
    this.saveToFacebook = new Repository.Facebook(db);
    this.saveToDashboard = new Repository.Dashboard(db);
    this.ApiWrapper = new ApiWrapper(config, db);
};

module.exports.prototype.RequestFeed = function(value, callback) {
    var that = this;

    this.ApiWrapper._APICall(
        value.source_id,
        'request',
        value.url,
        '',
        function(err, res, body) {
            if (!body || err) {
                log.error(!body ? 'error occurred' : err);
                that.profiler.Start('error');
                that.ApiWrapper._IncErrorCount();
                return callback(false);
            }
            var message = {
                result: JSON.parse(body),
                source_id: value.source_id
            };

            if (value.album_id) {
                message.album_id = value.album_id;
            }
            if (value.paging) {
                message.paging = value.paging;
            }
            if (value.since) {
                message.since = value.since;
            }
            if (value.until) {
                message.until = value.until;
            }
            that.amqpTask.PublishQueue(message, value.queue);
            return callback(true);
        });
};

module.exports.prototype.Source = function(source_id) {
    var that = this;

    this.ApiWrapper._APICall(
        source_id,
        'api',
        source_id,
        this.ApiWrapper._GetGraphFields('Source'),
        function(res) {
            var message = {
                since: 1,
                until: Math.round(moment(new Date()).valueOf() / 1000),
                source_id: source_id
            };
            that.amqpTask.PublishQueue(message, 'FACEBOOK_FEED_PARSE');
            that.saveToDashboard.SetDashboardFacebookEx(source_id, res);
        });
};

module.exports.prototype.PostFeed = function(value) {
    var that = this;

    that.ApiWrapper._APICall(
        value.source_id,
        'api',
        value.post_id,
        that.ApiWrapper._GetGraphFields('PostFeed'),
        function(res) {
            var message = {
                model: 'FacebookContents',
                result: res,
                source_id: value.source_id
            };
            that.amqpTask.PublishQueue(message, 'FACEBOOK_POST_FEED_PARSE');
        });
};

module.exports.prototype.Feed = function(source_id, callback) {
    var that = this;

    var since = 1;
    var until = Math.round(moment(new Date()).valueOf() / 1000);
    this.db.FacebookDashboard.findOne({
        'source_id': source_id,
    }, function(err, result) {
        if (result && result.since) {
            since = result.since;
        }
        that.ApiWrapper._APICall(
            source_id,
            'api',
            source_id + '/posts',
            that.ApiWrapper._GetGraphFields('Feed', since, until),
            function(res) {
                if (!res) {
                    return callback(false);
                }
                var message = {
                    model: 'FacebookContents',
                    result: res,
                    since: since,
                    until: until,
                    source_id: source_id
                };
                that.amqpTask.PublishQueue(message, 'FACEBOOK_FEED_PARSE');
            });
        return callback(true);
    });
};

module.exports.prototype.FeedSubBatch = function(value) {
    var that = this;

    var likeArray = {
        source_id: value.source_id,
        type: 'Like',
        info: []
    };
    var commentArray = {
        source_id: value.source_id,
        type: 'Comment',
        info: []
    };

    this.db.FacebookContents.find({
        'source_id': value.source_id
    }, function(err, result) {
        _.each(result, function(data) {
            likeArray.info.push({
                id: data.id,
                cursor: data.like_cursor ? data.like_cursor : ''
            });
            commentArray.info.push({
                id: data.id,
                cursor: data.comment_cursor ? data.comment_cursor : ''
            });
        });
        if (likeArray.info.length > 0) {
            that.amqpTask.PublishQueue(likeArray, 'RPC_FACEBOOK_SUBFEED_REQUEST');
        }
        if (commentArray.info.length > 0) {
            that.amqpTask.PublishQueue(commentArray, 'RPC_FACEBOOK_SUBFEED_REQUEST');
        }
    });
};

module.exports.prototype.FeedSub = function(value, callback) {
    var that = this;

    var params = [];
    var post_ids = [];
    var cursorInfo = [];
    _.each(value.info, function(val) {
        var command = null;
        if (_.isUndefined(val.cursor) || _.isNull(val.cursor)) {
            command = 'after';
        } else {
            command = 'before';
        }
        cursorInfo.push({
            feed_id: val.id,
            command: command,
            cursor: val.cursor
        });

        var access = '';
        switch (value.type) {
            case 'Like':
                access = 'likes';
                break;
            case 'Comment':
                access = 'comments';
                break;
        }
        params.push({
            method: 'get',
            relative_url: val.id + '/' + access + '?limit=20&' + command + '=' + val.cursor + '&fields=' + that.ApiWrapper._GetGraphFields(value.type)
        });
        post_ids.push(val.id);
    });

    this.ApiWrapper._APICall(
        value.source_id,
        'batch',
        '',
        params,
        function(res) {
            if (!res) {
                return callback(false);
            }

            var bodys = [];
            _.each(res, function(val, index) {
                if (!val || val.code !== 200) {
                    log.error(val.body);
                    that.ApiWrapper._IncErrorCount();
                    return callback(false);
                }
                try {
                    var body = JSON.parse(val.body);
                    body.post_id = post_ids[index];
                    bodys.push(body);
                } catch (e) {
                    log.error(e);
                }
            });

            var message = {
                result: bodys,
                type: value.type,
                cursorInfo: cursorInfo,
                source_id: value.source_id
            };
            that.amqpTask.PublishQueue(message, 'FACEBOOK_SUBFEED_PARSE');
            return callback(true);
        });
};

module.exports.prototype.Album = function(value, callback) {
    var that = this;

    this.ApiWrapper._APICall(
        value.source_id,
        'api',
        value.source_id + '/albums',
        this.ApiWrapper._GetGraphFields('Album', value.since, value.until),
        function(res) {
            if (!res) {
                return callback(false);
            }
            that._publishQueue(value, '', 'FACEBOOK_ALBUM_PARSE', res);
            return callback(true);
        });
};

module.exports.prototype.Photo = function(value, callback) {
    var that = this;

    this.ApiWrapper._APICall(
        value.source_id,
        'api',
        value.album_id + '/photos',
        this.ApiWrapper._GetGraphFields('Photo', value.since, value.until),
        function(res) {
            if (!res) {
                return callback(false);
            }
            that._publishQueue(value, '', 'FACEBOOK_PHOTO_PARSE', res);
            return callback(true);
        });
};

module.exports.prototype.PostFeedParse = function(value) {
    var data = value.result;
    var likeUsers = [];

    if (!data) {
        return log.error('Nothing Data', value);
    }

    this.saveToFacebook.PostFeed(value, data, function() {

    });

    if (data.likes && data.likes.data) {
        _.each(data.likes.data, function(like) {

            likeUsers.push({
                id: data.id,
                social_id: value.source_id,
                channel: 'facebook',
                user_id: like.id,
                pic: like.pic
            });

        });

        console.log('call PublishQueue');
        likeUsers = _.uniq(likeUsers, true);
        this._publishQueue(likeUsers, '', 'FACEBOOK_FEED_LIKE_USER', likeUsers);
    }


};

module.exports.prototype.FeedParse = function(value) {
    var that = this;
    var likeUsers = [];

    if (!value.result) {
        return log.warn('Nothing Data', value);
    }
    _.each(value.result.data, function(data) {
        if (data.message || data.picture || data.likes || data.comments) {
            var regex = /https\:\/\/www\.facebook\.com\/photo\.php\?fbid\=[\d-]*\&set\=a\.([\d-]*)/;
            var album_id = [];
            if (data.link) {
                album_id = data.link.match(regex);
            }

            that.saveToFacebook.Feed(value, data, album_id);
        }
    });

    if (value.result.data &&
        value.result.data.length > 0 &&
        value.result.paging.hasOwnProperty(value.paging)) {
        that._publishQueue(value, 'FACEBOOK_FEED_PARSE', 'FACEBOOK_FEED_URL_REQUEST');
    } else {
        log.info("Feed END");
        /*
		this._DashboardUpdate({
			source_id: value.source_id,
			album_id: null,
			since: value.until
		});
		that._publishQueue(value, '', 'FACEBOOK_SUBFEED_REQUEST');
		if(value.result.data.length > 0) {
			that._publishQueue(value, '', 'FACEBOOK_ALBUM_REQUEST');
		}
		*/
    }
};

module.exports.prototype.FeedSubParse = function(value) {
    var that = this;

    var rpcArray = {
        source_id: value.source_id,
        type: value.type,
        info: []
    };
    var subFeedRequest = function(cursorInfo, val) {
        var cursor = null;
        if (cursorInfo.command === 'after') {
            cursor = val.paging.cursors.after;
        } else {
            cursor = val.paging.cursors.before;
        }
        that.saveToFacebook.Cursor(value, val, cursorInfo, cursor);

        rpcArray.info.push({
            id: val.post_id,
            cursor: cursor,
            like_cursor: value.like_cursor,
            comment_csursor: value.comment_cursor
        });
        that.amqpTask.PublishQueue(rpcArray, 'RPC_FACEBOOK_SUBFEED_REQUEST');
    };
    _.each(value.result, function(val) {
        _.each(val.data, function(data) {
            that.saveToFacebook.SubFeedActivity(value, data, val.post_id);
            that.saveToFacebook.SubFeed(value, data, val.post_id);
        });
        if (val.paging && val.paging.cursors) {
            subFeedRequest(value.cursorInfo, val);
            _.each(value.cursorInfo, function(cursor) {
                if (cursor.feed_id === val.post_id) {
                    return subFeedRequest(value.cursorInfo, val);
                }
            });
        }
    });
};

module.exports.prototype.AlbumParse = function(value) {
    var that = this;

    _.each(value.result.data, function(data) {
        data.source_id = value.source_id;
        that.saveToFacebook.Album(value, data);
        that._publishQueue(value, '', 'FACEBOOK_PHOTO_REQUEST');
    });

    if (value.result.data.length > 0 && value.result.paging.next) {
        this._DashboardUpdate({
            source_id: value.source_id,
            album_id: null,
            album_paging: value.result.paging
        });
        that._publishQueue(value, 'FACEBOOK_ALBUM_PARSE', 'FACEBOOK_FEED_URL_REQUEST');
    } else {
        log.info('ALBUM END');
    }
};

module.exports.prototype.PhotoParse = function(value) {
    var that = this;

    _.each(value.result.data, function(data) {
        that.saveToFacebook.Photo(value, data);
    });
    if (value.result.data.length > 0 && value.result.paging.next) {
        this._DashboardUpdate({
            source_id: value.source_id,
            album_id: value.album_id,
            photo_paging: value.result.paging
        });
        that._publishQueue(value, 'FACEBOOK_PHOTO_PARSE', 'FACEBOOK_FEED_URL_REQUEST');
    } else {
        log.info('PHOTO END');
    }
};

module.exports.prototype._publishQueue = function(value, queue, queue_name, res) {
    var message = {};
    if (queue) {
        message.queue = queue;
    }
    if (res) {
        message.result = res;
    }
    if (value.source_id) {
        message.source_id = value.source_id;
    }
    if (value.album_id) {
        message.album_id = value.album_id;
    }
    if (value.since) {
        message.since = value.since;
    }
    if (value.until) {
        message.until = value.until;
    }
    if (value.result && value.result.paging && value.result.paging.next) {
        message.url = value.result.paging.next;
    }
    this.amqpTask.PublishQueue(message, queue_name);
};

module.exports.prototype.getLikeUerInfo = function(value, callback) {
    var that = this;
    // console.log('get params :', value);

    var userIds = _.map(value.result, function(obj) {
        return obj.user_id;
    }).join(',');


    var query = {
        q: 'select name, uid from user where uid in (' + userIds + ')'
    };
    // console.log('query >> ', query);

    this.ApiWrapper._APICall(value.result[0].social_id, 'fql', 'fql', query, function(res) {

        if (!res) {
            return callback(false);
        }

        // console.log('result from facebook :'.red, res);
        _.each(res.data, function(item) {
            var user = _.find(value.result, {
                user_id: item.uid.toString()
            });
            if (user !== undefined) {
                user.name = item.name;
            }
        });

        // console.log('get name result :', value);

        var updateData = {
            model: 'Publish',
            query: {
                id: value.result[0].id,
                social_id: value.result[0].social_id,
                channel: 'facebook'
            },
            update: {
                like_info: []
            }
        };

        _.each(value.result, function(user) {
            updateData.update.like_info.push({
                id: user.user_id,
                picture: user.pic,
                name: user.name
            });
        });

        that.saveToFacebook.saveToDB._Save(updateData, function() {});

    });
    return callback(true);
};

module.exports.prototype._DashboardUpdate = function(value) {
    this.saveToDashboard.SetDashboardFacebook(value);
};