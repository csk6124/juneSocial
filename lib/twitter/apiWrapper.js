'use strict';

var request = require('request'),
    Auth = require('./auth'),
    Profiler = require('../profiler');

module.exports = function(config, db) {
    this.config = config;
    this.profiler = new Profiler();
    this.profiler.Start('batch');
    this.auth = new Auth(config, db);

    this.requestFetchCount = 200;
    this.totalApiRequest = 0;
    this.errorCount = 0;
};

module.exports.prototype._APICall = function(screen_name, url, callback) {
    var that = this;

    that.auth.IsAuthorized(screen_name, function(err, result) {
        if(err || !result) {
            log.error('Is not IsAuthorized');
            callback(err, result, null);
            return;
        }
        var options = {
            url: url,
            oauth: {
                consumer_key: that.config.socialAuth.twitter.consumer_key,
                consumer_secret: that.config.socialAuth.twitter.consumer_secret,
                token: result.accToken,
                token_secret: result.accSecret
            }
        };
        that.totalApiRequest += 1;
        that.profiler.End('batch', function(second) {
            var logStr = ' 처리시간 ' + second;
            logStr += ' 요청 카운터 : ' + that.totalApiRequest;
            logStr += ' URL : ' + options.url;
            log.info(logStr);
            request.get(options, callback);
        });
    });
};

module.exports.prototype._GetAPIParameter = function(value, type) {
    var cursor = null,
        url = null,
        count = 200;

    switch(type) {
        case 'user_timeline':
            url = "https://api.twitter.com/1.1/statuses/user_timeline.json?";
            if(value.command === 'after' && value.cursor) {
                cursor = parseInt(value.cursor) - 33;
                url += "max_id=" + cursor;
                url += "&count=" + count;
            } else if(value.command === 'before' && value.cursor) {
                cursor = parseInt(value.cursor) + 33;
                url += "since_id=" + cursor;
                url += "&count=" + count;
            } else if(value.cursor) {
                cursor = parseInt(value.cursor) + 33;
                url += "since_id=" + cursor;
                url += "&count=" + count;
            } else {
                url += "&count=" + count;
            }
            url += "&include_rts=true";
            url += "&user_id=" + value.screen_name;
            break;
        case 'mention_timeline':
            url = "https://api.twitter.com/1.1/statuses/mentions_timeline.json?";
            if(value.command === 'after' && value.cursor) {
                cursor = parseInt(value.cursor) - 33;
                url += "max_id=" + cursor;
                url += "&count=" + count;
            } else if(value.command === 'before' && value.cursor) {
                cursor = parseInt(value.cursor) + 33;
                url += "since_id=" + cursor;
                url += "&count=" + count;
            } else {
                url += "&count=" + count;
            }
            break;
        case 'retweets_of_me':
            url = "https://api.twitter.com/1.1/statuses/retweets_of_me.json?";
            if(value.command === 'after' && value.cursor) {
                cursor = parseInt(value.cursor) - 33;
                url += "max_id=" + cursor;
                url += "&count=" + count;
            } else if(value.command === 'before' && value.cursor) {
                cursor = parseInt(value.cursor) + 33;
                url += "since_id=" + cursor;
                url += "&count=" + count;
            } else {
                url += "&count=" + count;
            }
            break;
        case 'favorite':
            url = "https://api.twitter.com/1.1/favorites/list.json?";
            if(value.command === 'after' && value.cursor) {
                cursor = parseInt(value.cursor) - 33;
                url += "max_id=" + cursor;
                url += "&count=" + count;
            } else if(value.command === 'before' && value.cursor) {
                cursor = parseInt(value.cursor) + 33;
                url += "since_id=" + cursor;
                url += "&count       =" + count;
            } else {
                url += "&count=" + count;
            }
            url += "&user_id=" + value.screen_name;
            break;
        case 'followers':
            url = "https://api.twitter.com/1.1/followers/list.json?";
            if(value.cursor) {
                cursor = parseInt(value.cursor) - 33;
                url += "cursor=" + cursor;
            } else {
                url += "cursor=-1";
            }
            url += "&count=" + count;
            url += "&user_id=" + value.screen_name;
            break;
        case 'friends':
            url = "https://api.twitter.com/1.1/friends/list.json?";
            if(value.cursor) {
                cursor = parseInt(value.cursor) - 33;
                url += "cursor=" + cursor;
            } else {
                url += "cursor=-1";
            }
            url += "&count=" + count;
            url += "&user_id=" + value.screen_name;
            break;
        case 'follow_user_lookup':
            url = "https://api.twitter.com/1.1/users/lookup.json?";
            url += "user_id="+ value.user_id;
            break;
    }
    return url;
};
