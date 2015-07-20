'use strict';

var _ = require('lodash'),
    Step = require('step'),
    Google = require('../google'),
    Twitter = require('../twitter'),
    Facebook = require('../facebook'),
    Repository = require('../repository'),
    UtilFs = require('../utilFs');


module.exports = function(config, db) {
    this.youtube_post = new Google.Post(config, db);
    this.twitter_post = new Twitter.Post(config, db);
    this.facebook_pust = new Facebook.Publish(config, db);
    this.ApiWrapper = new Facebook.ApiWrapper(config, db);
    this.facebook_photo = new Facebook.Photo(config, db);
    this.facebook_video = new Facebook.Video(config, db);
    this.saveToFacebook = new Repository.Facebook(db);
    this.utilFs = new UtilFs(config);
};

module.exports.prototype.Publish = function(value, callback) {
    var that = this;

    switch(value.channel) {
        case 'facebook':
            this._fbPost(value, function(err, result) {
                that._postFeed(value, result, callback);
            });
            break;
        case 'twitter':
            this._twtPost(value, callback);
            break;
        case 'youtube':
            this._ytPost(value, callback);
            break;
    }
};

module.exports.prototype._postFeed = function(value, result, callback) {
    var that = this;
    this.facebookValue = value;

    that.facebook_post_id = null;
    that.facebook_photo_id = null;
    if(result.post_id) {
        that.facebook_post_id = result.post_id;
        that.facebook_photo_id = result.id;
    } else {
        that.facebook_post_id = result.id;
    }

    log.info('_postFeed : ', value, result);

    if(value.video){
        new Step(
             function postFeed(){
                that.facebook_video.PostFeed(that.facebookValue, value.social_id + '_' + result.id, this);
             },
             function postVideo(){
                log.info('in postVideo');
                that.facebook_video.PostVideo(that.facebookValue, {
                    id: value.social_id + '_' + result.id,
                    video_id: result.id
                }, this);
             },
             function complete(err, res){
                console.log('complete', err, res);
                callback(err, res);
             }
        );
    }else if(_.isNull(that.facebook_photo_id)){
        that.facebook_photo.PostFeed(that.facebookValue, that.facebook_post_id, callback);
    }else{
        new Step(
             function postFeed(){
                that.facebook_photo.PostFeed(that.facebookValue, that.facebook_post_id, this);
             },
             function postPhoto(){
                that.facebook_photo.PostPhoto(that.facebookValue, {
                    id: that.facebook_post_id,
                    photo_id: that.facebook_photo_id
                }, this);
             },
             function complete(err, res){
                console.log('complete', err, res);
                callback(err, res);
             }
        );
    }

};

module.exports.prototype._ytPost = function(value, callback) {
    var params = {
        _id: value._id,
        userId: value.social_id,
        video: value.video,
        title: value.youtubeTitle,
        description: value.message,
        privacyStatus: value.youtubePrivacyStatus,
        categoryId: value.youtubeCategory,
        tags: value.youtubeTag
    };
    this.youtube_post.upload(params, function(err, result) {
        callback(err, result);
    });
};

module.exports.prototype._twtPost = function(value, callback) {
    var params = {
        _id: value._id,
        screen_name: value.social_id,
        message: value.message,
        picture: value.picture ? value.picture : null
    };
    this.twitter_post.Post(params, function(err, result) {
        callback(err, result);
    });
};

module.exports.prototype._fbPost = function(value, callback) {
    var params = {
        _id: value._id,
        id: value.social_id,
        message: value.message
    };
    var facebook = this.facebook_pust;
    if(!_.isUndefined(value.picture) && !_.isNull(value.picture)){
        params.picture = value.picture;
        params.album = value.social_id;
        facebook.PhotoUpload(params, function(res){
            callback(false, res);
        });
    }else if(!_.isUndefined(value.video) && !_.isNull(value.video) && value.video !== ''){
        params.video = value.video;
        facebook.VideoUpload(params, function(err, res){
            callback(err, res);
        });
    }else{
        log.info('Text');
        facebook.TextPosting(params, function(res){
            log.info('Text facebook Posting');
            callback(false, res);
        });
    }
};