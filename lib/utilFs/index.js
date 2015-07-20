'use strict';


var request = require('request'),
    fs = require('fs'),
    moment = require('moment');

module.exports = function(config) {
    this.config = config;
    this.config.uploadPath = '/tmp/image';
};

module.exports.prototype._replace = function(value, type) {
    value = JSON.stringify(value);
    switch(type) {
        case 'dot':
            value = value.replace(/(\.*)/g, '');
            break;
        case 'empty':
            value = value.replace(/(\s*)/g, '');
            break;
    }
    return JSON.parse(value);
};

module.exports.prototype.Download = function(uri, callback) {
    var that = this;

    if(uri) {
        var tmpFile = uri.split('/movie/');
        var filename = this.config.uploadPath + "/" + moment().unix() + '_' + tmpFile[1];
        request.head(uri, function(err, res){
            log.info('content-type:', res.headers['content-type']);
            log.info('content-length:', res.headers['content-length']);
            that.tmpRes = res;
            request(uri).pipe(fs.createWriteStream(filename)).on('close', function() {
                callback(filename, that.tmpRes);
            });
        });
    } else {
        callback(null);
    }
};

module.exports.prototype.YoutubeDownload = function(uri, callback) {
    if(uri) {
        var filename = this.config.uploadPath + "/" + moment().unix();
        request.head(uri, function(err, res){
            log.info('content-type:', res.headers['content-type']);
            log.info('content-length:', res.headers['content-length']);
            filename = {
                name: filename,
                type: res.headers['content-type']
            };
            request(uri).pipe(fs.createWriteStream(filename.name)).on('close', function() {
                callback(filename);
            });
        });
    } else {
        callback(null);
    }
};
