'use strict';

var request = require('request'),
    Auth = require('./auth'),
    Profiler = require('../profiler');

module.exports = function(config, db) {
    this.auth = new Auth(config, db);
    this.profiler = new Profiler();
    this.profiler.Start('batch');

    this.totalApiRequest = 0;
    this.updateApiSecond = 0;
    this.updateApiRequest = 0;
    this.errorCount = 0;
};

module.exports.prototype._GetGraphFields = function(type, since, until)
{
    switch(type) {
        case 'Source':
            return {
                fields: [
                    'id',
                    'category',
                    'company_overview',
                    'cover',
                    'description',
                    'founded',
                    'general_info',
                    'likes',
                    'location',
                    'name',
                    'parking',
                    'picture'
                ]
            };
        case 'Album':
            return {
                since: since,
                until: until,
                fields: [
                    'comments.limit(20).summary(true).fields(from.fields(id,name,picture),message,like_count,user_likes,created_time)',
                    'likes.limit(20).summary(true).fields(pic)',
                    'id',
                    'from',
                    'name',
                    'link',
                    'likes,comments',
                    'updated_time'
                ]
            };
        case 'Photo':
            return {
                since: since,
                until: until,
                fields: [
                    'comments.limit(20).summary(true).fields(from.fields(id,name,picture),message,created_time)',
                    'picture',
                    'likes.limit(20).summary(true).fields(pic)'
                ]
            };
        case 'Feed':
            return {
                since: since,
                until: until,
                fields: [
                    'comments.limit(10).summary(true).fields(from.fields(id,name,picture),message,like_count,user_likes,created_time)',
                    'likes.limit(10).summary(true).fields(pic)',
                    'source',
                    'shares',
                    'message',
                    'picture',
                    'from',
                    'link',
                    'status_type',
                    'object_id',
                    'created_time',
                    'updated_time',
                    'type'
                ]
            };
        case 'PostFeed':
            return {
                fields: [
                    'comments.limit(10).summary(true).fields(from.fields(id,name,picture),message,like_count,user_likes,created_time)',
                    'likes.limit(10).summary(true).fields(pic)',
                    'message',
                    'picture',
                    'from',
                    'link',
                    'created_time',
                    'updated_time'
                ]
            };
         case 'PostFeed_1':
            return {
                fields: [
                    'comments.limit(10).summary(true).fields(from.fields(id,name,picture),message,like_count,user_likes,created_time)',
                    'likes.limit(10).summary(true).fields(pic)',
                    'picture',
                    'from',
                    'link',
                    'created_time',
                    'updated_time'
                ]
            };
        case 'PostFeed_2':
            return {
                fields: [
                    'comments.limit(10)',
                    'likes.limit(10)',
                    'source',
                    'from',
                    'link',
                    'created_time',
                    'updated_time'
                ]
            };
        case 'Like':
            return 'pic,name';
        case 'Comment':
            return 'from.fields(id,name,picture),message,like_count,user_likes,created_time';
    }
};

module.exports.prototype._APICall = function(source_id, type, url, fields, callback) {
    var that = this;

    var retCallback = function(res) {
        if(!res || res.code) {
            log.error(!res ? 'error occurred' : res.message);
            that.profiler.Start('error');
            that._IncErrorCount();
            callback(null);
        }
        else {
            console.log('source_id in retCallback Api call', source_id);
            that.auth.getCurrentDocId(source_id, function(err, ret){
                callback(res, ret._id);
            });

        }
    };

    this._PreProcessStop(function(bool) {
        if(bool) {
            return callback(null);
        }
        if(type === 'batch' && fields.length > 0) {
            that.totalApiRequest += fields.length;
        } else {
            that.totalApiRequest += 1;
        }
        that.profiler.End('batch', function(second) {
            var logStr = '인증키: ' + source_id;
            logStr += ' 처리시간 ' + second;
            logStr += ' 요청 카운터 : ' + that.totalApiRequest;
            logStr += ' TYPE : ' + type;
            logStr += ' 업데이트된 시간 : ' + that.updateApiSecond;
            logStr += ' 업데이트 API 요청 카운터 : ' + that.updateApiRequest;

            that.auth.IsAuthorized(source_id, function(err, auth) {
                if(err || !auth) {
                    log.error('Is not a IsAuthorized');
                    return;
                }
                log.error('Total API Request Count : ', that.totalApiRequest);
                // log.info('API Request URL', source_id, type, url, fields);
                that.updateApiSecond = second;
                that.updateApiRequest = that.totalApiRequest;
                switch(type) {
                case 'batch':
                    auth.api('', 'post', {batch: fields}, retCallback);
                    break;
                case 'request':
                    request(url, retCallback);
                    break;
                case 'api':
                    if(fields) {
                        log.info('in _APICall : ', url, fields);
                        auth.api(url, fields, retCallback);
                    } else {
                        auth.api(url, retCallback);
                    }
                    break;
                case 'fql':
                    if(fields.query !== undefined){
                        console.log('not undefined');
                        auth.api(url, fields.query, retCallback);
                    }else {
                        console.log('undefined');
                        auth.api(url, fields, retCallback);
                    }
                    break;
                case 'post':
                    auth.api(url, 'POST', fields, callback);
                    break;
                }
            });
        });
    });
};

module.exports.prototype._PreProcessStop = function(callback) {
    var that = this;

    if(this.errorCount >= 3) {
        if(this.errorCount === 3) {
            that.profiler.Start('error');
            this.errorCount++;
        }
        this.profiler.End('error', function(second) {
            if(second > 60 * 1) {
                that.errorCount = 0;
                return callback(false);
            } else {
                return callback(true);
            }
        });
    } else {
        return callback(false);
    }
};

module.exports.prototype._IncErrorCount = function() {
    return this.errorCount++;
};
