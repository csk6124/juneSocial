'use strict';

var _ = require('lodash'),
    moment = require('moment'),
    request = require('request'),
    xml2js = require('xml2js').parseString,
    ApiWrapper = require('./apiWrapper'),
    Amqp = require('../amqp'),
    Repository = require('../repository');

module.exports = function(config, db) {
    this.db = db;
    this.amqpTask = new Amqp.Task(config);
    this.ApiWrapper = new ApiWrapper(config, db);
    this.saveToUser = new Repository.User(db);
    this.saveToYoutube = new Repository.Youtube(db);
    this.saveToDashboard = new Repository.Dashboard(db);

    this.testCount = 0;
};


module.exports.prototype.Activities = function(value, callback) {
    var that = this;

    var params = {};
    this.saveToDashboard.GetDashboardYoutube(value, function(dashboardInfo) {
        params = {
            part: 'id,snippet,contentDetails',
            channelId: value.channelId,
            maxResults: 2
        };

        if(value.nextPageToken) {
            params.pageToken = value.nextPageToken;
        } else if(dashboardInfo && dashboardInfo.pageToken) {
            params.pageToken = dashboardInfo.pageToken;
        }
        console.log('pageToken : ', params.pageToken);
        that.ApiWrapper._APICall(value.channelId, 'activities', params, function(err, response) {
            console.log('youtube activities get result');
            if(err) {
                log.info(params);
                log.error(err);
                return callback(false);
            }
            var message = {
                result: response,
                channelId: value.channelId
            };
            console.log('send queue message');
            that.amqpTask.PublishQueue(message, 'YOUTUBE_ACTIVITIES_PARSE');
            return callback(true);
        });
    });

};

module.exports.prototype.Video = function(value, callback) {
    var that = this;

    var params = {
        part: 'id,snippet,contentDetails,statistics,status,player,recordingDetails',
        id: value.videoId,
        maxResults: 50
    };
    if(value.nextPageToken) {
        params.pageToken = value.nextPageToken;
    }
    log.info('Youtube before call video api');
    this.ApiWrapper._APICall(value.channelId, 'video', params, function(err, response) {
        log.info('Youtube after call video api');
        if(err) {
            log.error(err);
            return callback(false);
        }
        var message = {
            result: response,
            channelId: value.channelId,
            videoId: value.videoId
        };
        that.amqpTask.PublishQueue(message, 'YOUTUBE_VIDEO_PARSE');
        return callback(true);
    });
};

module.exports.prototype.AnalyticsForReport = function(value, callback) {
    var that = this;

    var params = {
        ids: 'channel=='+value.channelId,
        startDate: value.start_date,
        endDate: value.end_date,
        metrics: value.metrics
    };

    if(value.filters !== undefined){
        params.filters = value.filters;
    }

    this.ApiWrapper._APICall(value.channelId, 'analytics', params, function(err, response) {
        if(err) {
            log.error(err);
            log.error('response :'.red, response);
            return callback(false);
        }

        return callback(true, response);
    });
};

module.exports.prototype.Analytics = function(value, callback) {
    var that = this;

    var params = {
        ids: 'channel=='+value.channelId,
        startDate: moment(value.start).format("YYYY-MM-DD"),
        endDate: moment(value.end).format("YYYY-MM-DD"),
        filters: 'video==' + value.videoId,
        metrics: 'views,uniques,estimatedMinutesWatched,averageViewDuration,averageViewPercentage,comments,favoritesAdded,favoritesRemoved,likes,dislikes,shares,subscribersGained',
        dimensions: value.dimensions
    };

    this.ApiWrapper._APICall(value.channelId, 'analytics', params, function(err, response) {
        if(err) {
            log.error(err);
            return callback(false);
        }
        var message = {
            result: response,
            channelId: value.channelId,
            videoId: value.videoId
        };
        that.amqpTask.PublishQueue(message, 'YOUTUBE_ANALYTICS_PARSE');
        return callback(true);
    });
};

module.exports.prototype.Comments = function(value, callback) {
    var that = this;

    var startIndex = 1;
    this.saveToDashboard.GetDashboardVideoYoutube(value, function(dashboardInfo) {
        if(dashboardInfo) {
            startIndex = dashboardInfo.startIndex
        }
        var url = 'https://gdata.youtube.com/feeds/api/videos/' + value.videoId + '/comments?v=2';
        request.get({
            url: url
        }, function(err, response, body) {
            if(err || !body || body.error) {
                log.error('Comments', err, body);
                return callback(false);
            }
            var message = {
                result: body,
                channelId: value.channelId,
                videoId: value.videoId
            };
            that.amqpTask.PublishQueue(message, 'YOUTUBE_COMMENT_PARSE');
            return callback(true);
        });
    });
};

module.exports.prototype.User = function(value, callback) {
    var that = this;
    log.info('Youtube user Request run');
    request.get({
        url: value.uri
    }, function(err, response, body) {
        log.info('Youtube user Request result get');
        if(err || !body || body.error) {
            log.error('User', err, body);
            return callback(false);
        }
        var message = {
            user: body,
            comment: value.comment,
            channelId: value.channelId,
            videoId: value.videoId
        };
        that.amqpTask.PublishQueue(message, 'YOUTUBE_USER_PARSE');

        return callback(true);
    });
};

module.exports.prototype.CommentsParse = function(value, callback) {
    var that = this;

    xml2js(value.result, function(err, result) {
        if(!result.feed || !result.feed.entry) {
            log.info('Nothing Comments');
            return callback(true);
        }
        if(result.error) {
            log.info(result.error);
            return callback(true);
        }

        var comments = [];
        _.each(result.feed.entry, function(entry) {
            if(entry.author && entry.author[0].uri) {
                comments.push({
                    uri: entry.author[0].uri[0],
                    entry: entry
                });
            }
        });

        _.each(comments, function(comment) {
            var message = {
                comment: comment,
                uri: comment.uri,
                channelId: value.channelId,
                videoId: value.videoId
            };
            that.amqpTask.PublishQueue(message, 'YOUTUBE_USER_REQUEST');
        });

        value.startIndex = result.feed['openSearch:totalResults'][0];
        that.saveToDashboard.SetDashboardVideoYoutube(value, function() {
            return callback(true);
        });

    });
};

module.exports.prototype.UserParse = function(value, callback) {
    var that = this;

    xml2js(value.user, function (err, result) {
        try {
            var data = {
                id: value.comment.entry.id[0],
                message: value.comment.entry.content[0],
                from: {
                    id: result.entry['yt:googlePlusUserId'][0],
                    name: result.entry.author[0]['name'][0],
                    picture: result.entry['media:thumbnail'][0]['$'].url
                },
                published: value.comment.entry.published[0]
            };
            that.saveToYoutube.Comment({
                channelId: value.channelId,
                videoId: value.videoId
            }, data);

            var userInfo = {
                channelId: value.channelId,
                user_id: result.entry['yt:googlePlusUserId'][0],
                name: result.entry.author[0]['name'][0],
                pic: result.entry['media:thumbnail'][0]['$'].url,
                message: value.comment.entry.content[0],
                created_at: value.comment.entry.published[0],
                comment_id: value.comment.entry.id[0],
                post_id: value.videoId,
                user: {
                    id: result.entry['yt:googlePlusUserId'][0]
                }
            };

            that.saveToUser.User(userInfo, value.channelId, 'youtube');
            that.saveToUser.UserActivity(userInfo, 'yt_comment');
            that.saveToUser.UserStatistics(userInfo, value.channelId, 'yt_comment');
        } catch(e) {
            console.error(e);
        }
        return callback(true);
    });
};

module.exports.prototype.ActivitiesParse = function(value) {
    var that = this;

    var message = {};
    if(!value.result || !value.result.items) {
        log.info('Nothing Activities');
        return;
    }
    _.each(value.result.items, function(item) {
        if(item.contentDetails.upload) {
            that.saveToYoutube.Activity(value, item);
            message = {
                channelId: value.channelId,
                videoId: item.contentDetails.upload.videoId
            };
            that.amqpTask.PublishQueue(message, 'YOUTUBE_VIDEO_REQUEST');
        }
    });

    if(value.result.nextPageToken) {
         that.saveToDashboard.SetDashboardYoutube({
            channelId: value.channelId,
            pageToken: value.result.nextPageToken
        }, function() {
            message = {
                channelId: value.channelId,
                nextPageToken: value.result.nextPageToken
            };
            that.amqpTask.PublishQueue(message, 'YOUTUBE_ACTIVITIES_REQUEST');
        });
    } else {
        log.info('END Activities');
        that.db['Publish'].find({
            social_id: value.channelId
        })
        .exec(function(err, result) {
            if(err || !result) return;

            _.each(result, function(data) {
                message = {
                    channelId: data.social_id,
                    videoId: data.id
                };
                that.amqpTask.PublishQueue(message, 'YOUTUBE_COMMENT_REQUEST');
            });
        });
    }
};

module.exports.prototype.VideoParse = function(value) {
    var that = this;

    var message = {};

    if(!value.result || !value.result.items) {
        log.info('Nothing Video');
        return;
    }
    _.each(value.result.items, function(item) {
        that.saveToYoutube.Video(value, item);
    });
    if(value.result.nextPageToken) {
        message = {
            channelId: value.channelId,
            videoId: value.videoId,
            nextPageToken: value.result.nextPageToken
        };
        that.amqpTask.PublishQueue(message, 'YOUTUBE_VIDEO_REQUEST');
    } else {
        log.info('END Video');
        message = {
            channelId: value.channelId,
            videoId: value.videoId,
            dimensions: 'day',
            start: '2010-01-01',
            end: moment().endOf("month").format("YYYY-MM-DD")
        };
        that.amqpTask.PublishQueue(message, 'YOUTUBE_ANALYTICS_REQUEST');
    }
};

module.exports.prototype.AnalyticsParse = function(value) {
    var that = this;

    if(!value.result || value.result.items) {
        log.info('Nothing Analytics');
        return;
    }
    _.each(value.result.rows, function(rows) {
        var update = {};
        _.each(rows, function(row, index) {
            switch(value.result.columnHeaders[index].name) {
                case "day":
                    update['day'] = row;
                    break;
                case "views":
                    update['views'] = row;
                    break;
                case "uniques":
                    update['uniques'] = row;
                    break;
                case "estimatedMinutesWatched":
                    update['estimatedMinutesWatched'] = row;
                    break;
                case "averageViewDuration":
                    update['averageViewDuration'] = row;
                    break;
                case "averageViewPercentage":
                    update['averageViewPercentage'] = row;
                    break;
                case "comments":
                    update['comments'] = row;
                    break;
                case "favoritesAdded":
                    update['favoritesAdded'] = row;
                    break;
                case "favoritesRemoved":
                    update['favoritesRemoved'] = row;
                    break;
                case "likes":
                    update['likes'] = row;
                    break;
                case "dislikes":
                    update['dislikes'] = row;
                    break;
                case "shares":
                    update['shares'] = row;
                    break;
                case "subscribersGained":
                    update['subscribersGained'] = row;
                    break;
            }
        });
        that.saveToYoutube.Analytics(value, update);
    });
    log.info('END Analytics');
};

module.exports.prototype.VideoCategories = function(value, callback) {
    var params = {
        part: 'snippet',
        hl: 'ko_KR',
        regionCode: 'KR'
    };
    this.ApiWrapper._APICall(value.userId, 'category', params, function(err, response) {
        if(err) {
            log.error(err);
            return callback(false);
        }
        var message = {
            result: response
        };
        return callback(message);
    });
};



