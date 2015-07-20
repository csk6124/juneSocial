'use strict';

var Step = require('step'),
    twitterAPI = require('node-twitter-api'),
    fs = require('fs'),
    Auth = require('./auth'),
    Repository = require('../repository'),
    UtilFs = require('../utilFs');

module.exports = function(config, db) {
    this.config = config.socialAuth.twitter;
    this.auth = new Auth(config, db);
    this.utilFs = new UtilFs(config);
    this.saveToTwitter = new Repository.Twitter(db);
};

module.exports.prototype.Post = function(value, callback) {
    var that = this;

    new Step(
    function getAuth() {
        that.auth.IsAuthorized(value.screen_name, this);
    },
    function (err, result) {
        if(err) {
            return that.emit('ERROR', err);
        }
        var twitter = new twitterAPI({
            consumerKey: that.config.consumer_key,
            consumerSecret: that.config.consumer_secret
        });

        var urlName = 'update_with_media';
        that.utilFs.Download(value.picture, function(filename){
            var options = {
                status: value.message
            };
            if(value.picture) {
                urlName = 'update_with_media';
                options.media = [filename];
            } else {
                urlName = 'update';
            }

            twitter.statuses(
                urlName,
                options,
                result.accToken,
                result.accSecret,
                function(err, data) {
                    if (filename && fs.exists(filename)) {
                        fs.unlinkSync(filename);
                    }
                    if(err) {
                        log.error('Error upload', err);
                        return callback(err, data);
                    } else {
                        console.log('twitte status', err, data);
                        that.saveToTwitter.UpdatePost(value._id, data, function() {
                            callback(err, data);
                        });
                    }
                }
            );
        });
    });
};
