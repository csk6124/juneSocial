'use strict';

var fs = require('fs'),
    googleapis = require('googleapis'),
    analytics = googleapis.youtubeAnalytics('v1'),
    youtube = googleapis.youtube('v3'),
    plus = googleapis.plus('v1'),
    Auth = require('./auth'),
    Profiler = require('../profiler');

module.exports = function(config, db) {
    this.config = config;
    this.profiler = new Profiler();
    this.profiler.Start('batch');
    this.auth = new Auth(config, db);

    this.totalApiRequest = 0;
};

module.exports.prototype._APIUploadCall = function(channelId, type, option, callback) {
    console.log('_APIUploadCall', channelId, type, option);
    this.profiler.End('batch', function(second) {
        var logStr = '처리시간 ' + second;
        logStr += ' TYPE : ' + type;
        logStr += ' channelId : ' + channelId;
        log.info(logStr);
    });
    this.auth.IsAuthorized(channelId, function(auth) {
        auth.refreshAccessToken(function(){
            youtube.videos.insert({
                auth: auth,
                part: 'snippet,status',
                autoLevels: true,
                resource: {
                    snippet: option.metadata.snippet,
                    status: option.metadata.status,
                    title: 'Test',
                    mimeType: option.videoName.type
                },
                media: {
                    body: fs.readFileSync(option.videoName.name),
                    mimeType: option.videoName.type
                }
            }, callback);
        });
    });
};


module.exports.prototype._APICall = function(channelId, type, params, callback) {
    var that = this;

    that.totalApiRequest += 1;
    that.profiler.End('batch', function(second) {
        var logStr = '처리시간 ' + second;
        logStr += ' 요청 카운터 : ' + that.totalApiRequest;
        logStr += ' TYPE : ' + type;
        logStr += ' channelId : ' + channelId;
        log.info(logStr);
    });

    that.auth.IsAuthorized(channelId, function(auth) {
        if(!auth) {
            callback('is not Authorized', null);
            return;
        }
        auth.refreshAccessToken(function(){
            switch(type) {
            case 'channel':
                youtube.channels.list({
                    auth: auth,
                    part: params.part,
                    forUsername: params.forUsername,
                    maxResults: params.maxResults,
                }, callback);
                break;
            case 'activities':
                youtube.activities.list({
                    auth: auth,
                    mine: true,
                    part: params.part,
                    maxResults: params.maxResults,
                    pageToken: params.pageToken,
                }, callback);
                break;
            case 'video':
                youtube.videos.list({
                    auth: auth,
                    part: params.part,
                    id: params.id,
                    maxResults: 50
                }, callback);
                break;
            case 'analytics':
                analytics.reports.query({
                    auth: auth,
                    ids: params.ids,
                    'start-date': params.startDate,
                    'end-date': params.endDate,
                    metrics: params.metrics,
                    dimensions: params.dimensions
                }, callback);
                break;
            case 'category':
                youtube.videoCategories.list({
                    auth: auth,
                    part: params.part,
                    hl: params.hl,
                    regionCode: params.regionCode
                }, callback);
                break;
            case 'feed':
                plus.activities.list({
                    auth: auth,
                    userId: params.userId,
                    collection: params.collection,
                    maxResults: params.maxResults
                }, callback);
                break;
            case 'comment':
                plus.comments.list({
                    auth: auth,
                    activityId: params.activityId,
                    collection: params.collection,
                    maxResults: params.maxResults
                }, callback);
                break;
            case 'like':
                plus.people.listByActivity({
                    auth: auth,
                    activityId: params.activityId,
                    collection: params.collection,
                    maxResults: params.maxResults
                }, callback);
                break;
            case 'share':
                plus.people.listByActivity({
                    auth: auth,
                    activityId: params.activityId,
                    collection: params.collection,
                    maxResults: params.maxResults
                }, callback);
                break;
            }
        });
    });
};
