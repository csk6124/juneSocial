'use strict';

/**
 * twitter raaltime stream and batch process
 *
 */
var twitter = require('ntwitter'),
    _ = require('lodash'),
    Step = require('step'),
    Auth = require('./auth'),
    Repository = require('../repository');

module.exports = function(config, db) {
    this.config = config;
    this.auth = new Auth(config, db);
    this.saveToTwitter = new Repository.Twitter(db);
    this.saveToUser = new Repository.User(db);
};

module.exports.prototype.Stream = function(value) {
    var that = this;

    new Step(
    function getAuth() {
        that.auth.IsAuthorized(value.screen_name, this);
    },
    function setStream(err, result) {

        var twit = new twitter({
            consumer_key: that.config.socialAuth.twitter.consumer_key,
            consumer_secret: that.config.socialAuth.twitter.consumer_secret,
            access_token_key: result.accToken,
            access_token_secret: result.accSecret
        });

        var oauth = {
            consumer_key: that.config.socialAuth.twitter.consumer_key,
            consumer_secret: that.config.socialAuth.twitter.consumer_secret,
            token: result.accToken,
            token_secret: result.accSecret
        };

        twit.stream('user', function(stream) {
            stream.on('data', function (data) {
                that.Add(result.pageId, oauth, data);
            });
            stream.on('error', function (data,b) {
                log.info('user error', data, b);
            });
            stream.on('tweet', function (tweet) {
                log.info('user twwet', tweet);
            });
            stream.on('end', function (response) {
                log.info('user end', response);
            });
            stream.on('destroy', function (response) {
                log.info('user destroy', response);
            });
        });
    });
};

 module.exports.prototype.Add = function(screen_name, oauth, data) {
    if( !_.isUndefined(data.event) && data.event === 'favorite'){

        this.saveToTwitter.FavoriteFromSubscribe(data);
        this.saveToUser.User(data, screen_name, 'favorite');
        this.saveToUser.UserActivity(data, 'favorite');
        this.saveToUser.UserStatistics(data, screen_name, 'favorite');

    } else if( !_.isUndefined(data.event) && data.event === 'unfavorite'){

        this.saveToTwitter.UnFavoriteFromSubscribe(data);
        this.saveToUser.User(data, screen_name, 'unfavorite');
        this.saveToUser.UserActivity(data, 'unfavorite');
        this.saveToUser.UserStatistics(data, screen_name, 'unfavorite');

    } else if( !_.isUndefined(data.retweeted_status)) {
        this.saveToTwitter.Retweet(data);
        this.saveToUser.User(data, screen_name, 'retweet');
        this.saveToUser.UserActivity(data, 'retweet');
        this.saveToUser.UserStatistics(data, screen_name, 'retweet');

    } else if(!_.isUndefined(data.in_reply_to_status_id) && !_.isNull(data.in_reply_to_status_id)) {

        this.saveToTwitter.Reply(data);
        this.saveToUser.User(data, screen_name, 'reply');
        this.saveToUser.UserActivity(data, 'reply');
        this.saveToUser.UserStatistics(data, screen_name, 'reply');

    } else if(!_.isUndefined(data.text) && !_.isUndefined(data.user.id_str)) {
        this.saveToTwitter.Timeline(data, data.user.id_str);
    }
 };
