'use strict';

var fs = require('fs'),
    path = require('path'),
    request = require('request'),
    ApiWrapper = require('./apiWrapper'),
    Auth = require('./auth'),
    Repository = require('../repository'),
    Profiler = require('../profiler'),
    UtilFs = require('../utilFs');

module.exports = function(config, db) {
    this.profiler = new Profiler();
    this.profiler.Start('publish');
    this.utilFs = new UtilFs(config);
    this.auth = new Auth(config, db);
    this.ApiWrapper = new ApiWrapper(config, db);
    this.saveToFacebook = new Repository.Facebook(db);
};

module.exports.prototype.TextPosting = function(value, callback) {
    var that = this;

    var params = {
        message: value.message
    };
    this.ApiWrapper._APICall(value.id, 'post', value.id + '/feed', params, function(res){
        console.log('TextPosting', res);
        if(!res || res.error) {
            callback(null);
        } else {
            that.saveToFacebook.UpdatePostId(value._id, res.id, function() {
                callback(res);
            });
        }
    });
};

module.exports.prototype.AlbumList = function(value, callback) {
    var that = this;

    var params = {};
    this.ApiWrapper._APICall(value.id, 'api', value.id + '/albums', params, function(res){
        if(res) {
            that.saveToFacebook.UpdatePostId(value._id, res.id, function() {
                callback(res);
            });
        } else {
            callback(res);
        }
    });
};

module.exports.prototype.PhotoUpload = function(value, callback) {
    var that = this;

    var params = {
        url: value.picture,
        message: value.message
    };
    this.ApiWrapper._APICall(value.id, 'post', value.album + '/photos', params, function(res){
        console.log('PhotoUpload', res);
        if(!res || res.error) {
            callback(null);
        } else {
            that.saveToFacebook.UpdatePostId(value._id, res.post_id, function() {
                callback(res);
            });
        }
    });
};

module.exports.prototype.CreateAlbum = function(value, callback) {
    var that = this;

    var params = {
        name: value.album_title
    };
    this.ApiWrapper._APICall(value.id, 'api', value.id + '/albums', params, function(res){
        if(res.data.length > 0){
            if(res.data[0].name === value.album_title){
                callback(res);
            }else{
                that.ApiWrapper._APICall(value.id, 'post', value.id + '/albums', params, function(res){
                    callback(res);
                });
            }
        }
    });
};

module.exports.prototype.VideoUpload = function(value, callback) {
    var that = this;

    that.auth.IsAuthorized(value.id, function(err, FB){
        that.token = FB.getAccessToken();
        that.utilFs.Download(value.video, function(filename){
            log.info('VideoUpload filename : ', filename);
            log.info('value : ', value);
            var r = request.post(
                'https://graph-video.facebook.com/' + value.id + '/videos',
                function optionalCallback(err, httpResponse, body){
                if(err){
                    log.error(err);
                    callback(err, null);
                }else{
                    try {
                        body = eval('('+body+')');
                        log.error('VideoUpload Result : ', body);
                        if(typeof body.error !== 'undefined'){
                            callback(body.error, false);
                        }else{
                            that.saveToFacebook.UpdatePostId(value._id, value.id + '_' + body.id, function() {
                                callback(false,{
                                    id: body.id
                                });
                            });
                        }
                    } catch(e) {
                        callback(false, err);
                    }
                }
            });

            var form = r.form();
            form.append('file', fs.createReadStream(path.join(filename)));
            // form.append('title', value.message);
            form.append('description', value.message);
            form.append('access_token', that.token);
            log.info(form);
            // callback(true, null);
        });
    });
};
