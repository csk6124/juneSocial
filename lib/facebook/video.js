'use strict';

var ApiWrapper = require('./apiWrapper'),
    Repository = require('../repository');


module.exports = function(config, db) {
    this.ApiWrapper = new ApiWrapper(config, db);
    this.saveToFacebook = new Repository.Facebook(db);
};


module.exports.prototype.PostFeed = function(value, post_id, callback) {
    var that = this;

    log.info('value in PostFeed', value);
    that.ApiWrapper._APICall(
        value.social_id,
        'api',
        post_id,
        that.ApiWrapper._GetGraphFields('PostFeed_2'),
        function(res) {
            log.error('PostFeed', res);
            that.saveToFacebook.PostFeed({
                source_id: value.social_id,
                id: post_id
            }, res, callback);
        }
    );
};

module.exports.prototype.PostVideo = function(value, upload_result, callback) {
    var that = this;

    that.ApiWrapper._APICall(
        value.social_id,
        'api',
        upload_result.video_id,
        null,
        function(res) {
            log.error('PostVideo', res);
            that.saveToFacebook.PostVideo({
                source_id: value.social_id,
                id: upload_result.id
            }, res, callback);
        }
    );
};
