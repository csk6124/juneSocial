'use strict';

var _ = require('lodash'),
    ApiWrapper = require('./apiWrapper'),
    Amqp = require('../amqp'),
    Repository = require('../repository'),
    UtilFs = require('../utilFs');

module.exports = function(config, db) {
    this.amqpTask = new Amqp.Task(config);
    this.utilFs = new UtilFs(config);
    this.ApiWrapper = new ApiWrapper(config, db);
    this.saveToYoutube = new Repository.Youtube(db);
};

module.exports.prototype.upload = function(value, callback) {
    var that = this;

    this.utilFs.YoutubeDownload(value.video, function(filename){
        var option = {
            metadata: {
                snippet: {
                    title: value.title,
                    description: value.description,
                    tags: value.tags
                },
                status: {
                    privacyStatus: value.privacyStatus
                }
            },
            videoName: filename
        };

        if(!_.isUndefined(value.categoryId)){
            option.metadata.snippet.categoryId = value.categoryId.value;
        }
        if(filename) {
            that.ApiWrapper._APIUploadCall(value.userId, 'videoInsert', option, function(err, response) {
                console.log('_APIUploadCall', err, response);
                if(err) {
                    log.error(err);
                    return callback(err, response);
                } else {
                    that.saveToYoutube.UpdatePost(value._id, response, function() {
                        return callback(err, response);
                    });
                }

            });
        } else {
            callback(null, true);
        }
    });

};

