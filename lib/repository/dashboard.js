'use strict';

/**
 * @author : skjune
 *
 * paginationd을 위한 cursor 데이타 저장
 * post, comment, like, share, user등의 pagination curso or 날짜정보를 저장한다.
 * 소셜 : facebook, twitter, youtube 대상
 */
var Save = require('./save');

module.exports = function(db) {
    this.db = db;
    this.saveToDB = new Save(db);
};

module.exports.prototype.GetDashboard = function(value, type, callback) {
    console.log('GetDashboard', value);
    this.db.TwitterDashboard.findOne({
        screen_name: value.screen_name
    }, function(err, result) {
        console.log('Error', err);
        console.log('TwitterDashboard', result)
        switch(type) {
        case 'user_timeline':
            if(result && result.cursor) {
                value.command = 'before';
                value.cursor = result.cursor;
                callback(value);
            } else {
                value.command = 'after';
                value.cursor = null;
                callback(value);
            }
            break;
        case 'mention_timeline':
            if(result && result.mention_cursor) {
                value.command = 'before';
                value.cursor = result.mention_cursor;
                callback(value);
            } else {
                value.command = 'after';
                value.cursor = null;
                callback(value);
            }
            break;
        case 'retweets_of_me':
            if(result && result.retweet_cursor) {
                value.command = 'before';
                value.cursor = result.retweet_cursor;
                callback(value);
            } else {
                value.command = 'after';
                value.cursor = null;
                callback(value);
            }
            break;
        case 'followers':
            if(result && result.followers_cursor) {
                value.command = 'before';
                value.cursor = result.followers_cursor;
                callback(value);
            } else {
                value.command = 'after';
                value.cursor = null;
                callback(value);
            }
            break;
        case 'friends':
            if(result && result.friends_cursor) {
                value.command = 'before';
                value.cursor = result.friends_cursor;
                callback(value);
            } else {
                value.command = 'after';
                value.cursor = null;
                callback(value);
            }
            break;
        default:
            callback(null);
        }
    });
};

module.exports.prototype.SetDashboard = function(value, type) {
    var updateData = {
        model: 'TwitterDashboard',
        query: {
            screen_name: value.screen_name
        }
    };

    switch(type) {
    case 'user_timeline':
        updateData.update = {
            cursor: value.max_id
        };
        break;
    case 'mention_timeline':
        updateData.update = {
            mention_cursor: value.max_id
        };
        break;
    case 'retweets_of_me':
        updateData.update = {
            retweet_cursor: value.max_id
        };
        break;
    case 'followers':
        updateData.update = {
            followers_cursor: value.cursor
        };
        break;
    case 'friends':
        updateData.update = {
            friends_cursor: value.cursor
        };
        break;
    }

    if(value.max_id) {
        console.log('SetDashboard', updateData)
        this.saveToDB._Save(updateData, function() {});
    }
};

module.exports.prototype.GetDashboardVideoYoutube = function(value, callback) {
    if(value.nextPageToken) {
        return callback(value);
    }

    this.db.YoutubeDashboard.findOne({
        videoId: value.videoId
    }, function(err, result) {
        if(err || !result) {
            return callback(null);
        }
        value.pageToken = result.pageToken;
        callback(value);
    });
};

module.exports.prototype.SetDashboardVideoYoutube = function(value, callback) {
    var updateData = {
        model: 'YoutubeDashboard',
        query: {
            videoId: value.videoId
        },
        update: {}
    };

    if(value.startIndex) {
        updateData.update.startIndex = value.startIndex;
    }
    if(value.startIndex) {
        this.saveToDB._Save(updateData, function() {
            callback();
        });
    } else {
        callback();
    }
};

module.exports.prototype.GetDashboardYoutube = function(value, callback) {
    if(value.nextPageToken) {
        return callback(value);
    }

    this.db.YoutubeDashboard.findOne({
        channelId: value.channelId
    }, function(err, result) {
        if(err || !result) {
            return callback(null);
        }
        value.pageToken = result.pageToken;
        callback(value);
    });
};

module.exports.prototype.SetDashboardYoutube = function(value, callback) {
    var updateData = {
        model: 'YoutubeDashboard',
        query: {
            channelId: value.channelId
        }
    };
    updateData.update = {
        pageToken: value.pageToken
    };
    if(value.pageToken) {
        this.saveToDB._Save(updateData, function() {
            callback();
        });
    } else {
        callback();
    }
};

module.exports.prototype.SetDashboardFacebookEx = function(source_id, res) {
    var updateData = {
        model: 'FacebookDashboard',
        query: {
            source_id: source_id
        },
        update: res
    };
    this.saveToDB._Save(updateData, function() {});
};

module.exports.prototype.SetDashboardFacebook = function(value) {
    var updateData = {
        model: 'FacebookDashboard',
        query: {
            source_id: value.source_id
        },
        update: {}
    };

    var isUpdate = false;
    if(value.album_paging) {
        updateData.update.album_paging = value.album_paging;
        isUpdate = true;
    }
    if(value.album_id) {
        updateData.update.album_id = value.album_id;
        isUpdate = true;
    }
    if(value.photo_paging) {
        updateData.update.photo_paging = value.photo_paging;
        isUpdate = true;
    }
    if(value.feed_paging) {
        updateData.update.feed_paging = value.feed_paging;
        isUpdate = true;
    }
    if(value.since) {
        updateData.update.since = value.since;
        isUpdate = true;
    }
    if(value.fqlTime) {
        updateData.update.fqlTime = value.fqlTime;
        isUpdate = true;
    }

    if(isUpdate) {
        this.saveToDB._Save(updateData, function() {});
    }
};
