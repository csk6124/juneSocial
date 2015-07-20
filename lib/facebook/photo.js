'use strict';

var ApiWrapper = require('./apiWrapper'),
    Repository = require('../repository');


module.exports = function(config, db) {
    this.ApiWrapper = new ApiWrapper(config, db);
    this.saveToFacebook = new Repository.Facebook(db);
};


module.exports.prototype.PostFeed = function(value, post_id, callback) {
    var that = this;

    that.ApiWrapper._APICall(
        value.social_id,
        'api',
        post_id,
        that.ApiWrapper._GetGraphFields('PostFeed_1'),
        function(res) {
            that.saveToFacebook.PostFeed({
                source_id: value.social_id,
                id: post_id
            }, res, callback);
        }
    );
};

module.exports.prototype.PostPhoto = function(value, upload_result, callback) {
    var that = this;

    that.ApiWrapper._APICall(
        value.social_id,
        'api',
        upload_result.photo_id,
        null,
        function(res) {
            console.log('PostPhoto', res);
            that.saveToFacebook.PostPhoto({
                source_id: value.social_id,
                id: upload_result.id
            }, res, callback);
        }
    );
};
