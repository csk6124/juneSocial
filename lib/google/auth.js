'use strict';

var googleapis = require('googleapis'),
    youtube = googleapis.youtube('v3'),
    OAuth2 = googleapis.auth.OAuth2;

module.exports = function(config, db) {
    this.db = db;
    this.config = config.socialAuth.youtube;
    this.oauth2Client = new OAuth2(
        this.config.CLIENT_ID,
        this.config.CLIENT_SECRET,
        this.config.REDIRECT_URI
    );
};

module.exports.prototype.IsAuthorized = function(channelId, callback) {
    var that = this;

    var query = {
        pageId: channelId
    };
    that.db.Channel.findOne(query, function(err, result) {
        if(!err  && result) {
            var auth = new OAuth2(
                that.config.CLIENT_ID,
                that.config.CLIENT_SECRET,
                that.config.REDIRECT_URI
            );
            auth.setCredentials({
                access_token: result.accToken,
                refresh_token: result.refreshToken
            });
            callback(auth);
        } else {
            callback(null);
        }
    });
};

module.exports.prototype.GetAccessTokenUrl = function(callback) {
    var that = this;

    var scopes = [
        'https://www.googleapis.com/auth/plus.login',
        'https://www.googleapis.com/auth/plus.me',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/yt-analytics-monetary.readonly',
        'https://www.googleapis.com/auth/yt-analytics.readonly',
        'https://www.googleapis.com/auth/youtube',
        'https://www.googleapis.com/auth/youtube.readonly',
        'https://www.googleapis.com/auth/youtube.upload',
        'https://www.googleapis.com/auth/youtubepartner',
        'https://www.googleapis.com/auth/youtubepartner-channel-audit',
        'https://gdata.youtube.com'
    ];
    var url = that.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        approval_prompt: 'force',
        scope: scopes
    });
    callback(url);
};

module.exports.prototype.GetAccessToken = function(input, callback) {
    var that = this;

    if (input.hasOwnProperty("error")) {
        return that.emit('ERROR',"Error.");
    }
    if (!input.hasOwnProperty("code")) {
        return that.emit('ERROR',"Invalid request.");
    }

    var code = input.code;
    if (!code) {
        return that.emit('ERROR',"Code is missing.");
    }
    that.oauth2Client.getToken(code, function(err, tokens) {
        if(err) {
            return callback(null);
        }
        if(tokens) {
            that.oauth2Client.setCredentials(tokens);
            that.oauth2Client.credentials = {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token
            };
            var data = {
                client_id: that.config.CLIENT_ID,
                client_secret: that.config.CLIENT_SECRET,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token
            };
            callback(data);
        }
    });
};

module.exports.prototype.channelList = function(callback) {
    var that = this;

    if(that.oauth2Client) {
        youtube.channels.list({
            auth: that.oauth2Client,
            part: 'snippet,contentDetails,topicDetails',
            mine: true
        }, callback);
    }

};