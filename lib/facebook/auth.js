'use strict';

var FB = require('fb'),
    util = require('util'),
    events = require('events'),
    _ = require('lodash'),
    Step = require('step');

module.exports = function(config, db) {
    events.EventEmitter.call(this);

    this.db = db;
    this.config = config.socialAuth.facebook;
    FB.options({
        appId: this.config.app_id,
        appSecret: this.config.app_secret,
        redirectUri: this.config.redirectUri
    });
    this.channel_id = null;
};

util.inherits(module.exports, events.EventEmitter);
module.exports.prototype.IsAuthorized = function(id, callback) {
    var that = this;

    log.error('Page ID : ', id);
    var query = {
        pageId: id,
        accToken: {
            $exists: true,
            $ne: ''
        }
    };
    that.db.Channel.findOne(query, function(err, result) {
        if(err || !result) {
            callback(err, null);
        } else {
            that.channel_id = result._id;
            FB.setAccessToken(result.accToken);
            callback(null, FB);
        }
    });
};

module.exports.prototype.IsAuthTokenCheck = function() {
    this.GetAccessTokenUrl();
};

module.exports.prototype.getCurrentDocId = function(id, callback) {
    this.db.Channel.findOne({pageId:id}, function(err, result) {
        if(err || !result) {
            log.error('error in getCurrentDocId :', err);
            callback(err, null);
        } else {
            callback(null, result);
        }
    });
};
module.exports.prototype.GetAccessToken = function(input) {
    var that = this;

    var code = input.code;
    var access_token = null;
    var app_token = null;
    var user_id = null;
    new Step(
    function exchangeCodeForAccessToken() {
        FB.napi('oauth/access_token', {
            client_id:      FB.options('appId'),
            client_secret:  FB.options('appSecret'),
            redirect_uri:   FB.options('redirectUri'),
            code:           code
        }, this);
    },
    function extendAccessToken(err, result) {
        if(err) {that.emit('ERROR', err);return;}
        FB.napi('oauth/access_token', {
            client_id:          FB.options('appId'),
            client_secret:      FB.options('appSecret'),
            grant_type:         'fb_exchange_token',
            fb_exchange_token:  result.access_token
        }, this);
    },
    function appAccessToken(err, result) {
        access_token = result.access_token;
        if(err) {that.emit('ERROR', err);return;}
        FB.napi('oauth/access_token', {
            client_id:          FB.options('appId'),
            client_secret:      FB.options('appSecret'),
            grant_type:         'client_credentials'
        }, this);
    },
    function getUserId(err, result) {
        app_token = result.access_token;
        if(err) {that.emit('ERROR', err);return;}
        FB.api('me', {
            access_token: access_token
        }, this);
    },
    function getPageId(result) {
        user_id = result.id;
        FB.api('me/accounts', {
            access_token: access_token
        }, this);
    },
    function (result) {
        if( !_.isUndefined(result) &&
            !_.isUndefined(result.data)) {
            var pages = [];
            _.each(result.data, function(val) {
                pages.push(val);
            });
            var tokenInfo = {
                app_id: that.config.app_id,
                app_secret: that.config.app_secret,
                app_token: app_token,
                access_token: access_token,
                user_id: user_id,
                page_id: pages
            };
            log.info('tokenInfo', tokenInfo);
            that.emit('ACCESS_TOKEN_SAVE', tokenInfo);
            return;
        }
    });
};

module.exports.prototype.GetAccessTokenUrl = function() {
    var loginUrl = FB.getLoginUrl({ scope: 'read_insights, email, user_about_me, user_birthday, user_location, publish_stream, export_stream, manage_notifications, publish_actions, photo_upload, video_upload, friends_activities, friends_photos, friends_likes, friends_events, manage_pages, read_stream, read_page_mailboxes, create_event, user_videos, user_actions.video' });
    this.emit('ACCESS_TOKEN_URL', loginUrl);
};

