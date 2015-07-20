'use strict';

var _ = require('lodash'),
    querystring = require('querystring'),
    Profiler = require('../profiler'),
    moment = require('moment'),
    ApiWrapper = require('./apiWrapper'),
    Repository = require('../repository'),
    UtilFs = require('../utilFs'),
    Amqp = require('../amqp');

module.exports = function(config, db) {
    this.amqpTask = new Amqp.Task(config);
    this.profiler = new Profiler();
    this.profiler.Start('insights');
    this.saveToFacebook = new Repository.Facebook(db);
    this.utilFs = new UtilFs(config);
    this.ApiWrapper = new ApiWrapper(config, db);
};

module.exports.prototype.PageInsightsParse = function(value, callback) {
    var that = this;

    var previousList = [];
    var statistics = [];
    var previousMatch = function(url) {
        var result = {};
        var fb_matching = [];
        var regex = /https\:\/\/graph\.facebook\.com\/graph\/server\.php\?\_fb\_url\=(\d*)\/insights\/(\w*)\&access_token\=(\w*)\&_fb_profilable_request_id\=(\d*)\&since\=(\d*)\&until\=(\d*)/;
        var escapePath = querystring.unescape(url);
        fb_matching = escapePath.match(regex);
        if(fb_matching === null) {
            regex = /https\:\/\/graph\.facebook\.com\/graph\/server\.php\?since\=(\d*)\&until\=(\d*)&\_fb\_url\=(\d*)\/insights\/(\w*)\&access_token\=(\w*)\&_fb_profilable_request_id\=(\d*)/;
            fb_matching = escapePath.match(regex);
            result = {
                since: fb_matching[1],
                until: fb_matching[2],
                id: fb_matching[3],
                metric: fb_matching[4]
            };
        } else {
            result = {
                since: fb_matching[5],
                until: fb_matching[6],
                id: fb_matching[1],
                metric: fb_matching[2]
            };
        }
        return result;
    };

    _.each(value.result, function(data) {
        _.each(data.data[0] && data.data[0].values, function(val) {
            var statistic = {};
            statistic.day = moment(val.end_time).format('YYYY-MM-DD');
            switch(data.data[0].name) {
                case 'page_fans':
                    statistic.page_fans = val.value;
                    break;
                case 'page_fan_adds_unique':
                    statistic.page_fan_adds_unique = val.value;
                    break;
                case 'page_fans_by_like_source_unique':
                    statistic.page_fans_by_like_source_unique = val.value;
                    break;
                case 'page_fan_removes_unique':
                    statistic.page_fan_removes_unique = val.value;
                    break;
                case 'page_fans_by_unlike_source_unique':
                    statistic.page_fans_by_unlike_source_unique = val.value;
                    break;
                case 'page_fans_gender_age':
                    val.value = that.utilFs._replace(val.value, 'dot');
                    statistic.page_fans_gender_age = val.value;
                    break;
                case 'page_fans_locale':
                    val.value = that.utilFs._replace(val.value, 'dot');
                    val.value = that.utilFs._replace(val.value, 'empty');
                    statistics.page_fans_locale = val.value;
                    break;
                case 'page_fans_city':
                    val.value = that.utilFs._replace(val.value, 'dot');
                    val.value = that.utilFs._replace(val.value, 'empty');
                    statistics.page_fans_city = val.value;
                    break;
                case 'page_fans_country':
                    val.value = that.utilFs._replace(val.value, 'dot');
                    val.value = that.utilFs._replace(val.value, 'empty');
                    statistics.page_fans_country = val.value;
                    break;
                case 'page_impressions_by_age_gender_unique':
                    val.value = that.utilFs._replace(val.value, 'dot');
                    statistic.page_impressions_by_age_gender_unique = val.value;
                    break;
                case 'page_impressions_by_story_type_unique':
                    val.value = that.utilFs._replace(val.value, 'empty');
                    statistic.page_impressions_by_story_type_unique = val.value;
                    break;
                case 'page_impressions_by_country_unique':
                    val.value = that.utilFs._replace(val.value, 'dot');
                    val.value = that.utilFs._replace(val.value, 'empty');
                    statistic.page_impressions_by_country_unique = val.value;
                    break;
                case 'page_impressions_by_city_unique':
                    val.value = that.utilFs._replace(val.value, 'dot');
                    val.value = that.utilFs._replace(val.value, 'empty');
                    statistic.page_impressions_by_city_unique = val.value;
                    break;
                case 'page_impressions_paid_unique':
                    val.value = that.utilFs._replace(val.value, 'empty');
                    statistic.page_impressions_paid_unique = val.value;
                    break;
                case 'page_impressions_organic_unique':
                    val.value = that.utilFs._replace(val.value, 'empty');
                    statistic.page_impressions_organic_unique = val.value;
                    break;
                case 'page_impressions_viral_unique':
                    val.value = that.utilFs._replace(val.value, 'empty');
                    statistic.page_impressions_viral_unique = val.value;
                    break;
                case 'page_impressions_paid':
                    val.value = that.utilFs._replace(val.value, 'empty');
                    statistic.page_impressions_paid = val.value;
                    break;
                case 'page_impressions_organic':
                    val.value = that.utilFs._replace(val.value, 'empty');
                    statistic.page_impressions_organic = val.value;
                    break;
                case 'page_impressions_viral':
                    val.value = that.utilFs._replace(val.value, 'empty');
                    statistic.page_impressions_viral = val.value;
                    break;
                case 'page_negative_feedback_unique':
                    val.value = that.utilFs._replace(val.value, 'empty');
                    statistic.page_negative_feedback_unique = val.value;
                    break;
                case 'page_positive_feedback_by_type':
                    val.value = that.utilFs._replace(val.value, 'empty');
                    statistic.page_positive_feedback_by_type = val.value;
                    break;
                case 'page_positive_feedback_by_type_unique':
                    val.value = that.utilFs._replace(val.value, 'empty');
                    statistic.page_positive_feedback_by_type_unique = val.value;
                    break;
                case 'page_negative_feedback_by_type_unique':
                    val.value = that.utilFs._replace(val.value, 'empty');
                    statistic.page_negative_feedback_by_type_unique = val.value;
                    break;
                case 'page_posts_impressions_paid':
                    val.value = that.utilFs._replace(val.value, 'empty');
                    statistic.page_posts_impressions_paid = val.value;
                    break;
                case 'page_posts_impressions_paid_unique':
                    val.value = that.utilFs._replace(val.value, 'empty');
                    statistic.page_posts_impressions_paid_unique = val.value;
                    break;
                case 'page_posts_impressions_organic':
                    val.value = that.utilFs._replace(val.value, 'empty');
                    statistic.page_posts_impressions_organic = val.value;
                    break;
                case 'page_posts_impressions_organic_unique':
                    val.value = that.utilFs._replace(val.value, 'empty');
                    statistic.page_posts_impressions_organic_unique = val.value;
                    break;
                case 'page_posts_impressions_viral':
                    val.value = that.utilFs._replace(val.value, 'empty');
                    statistic.page_posts_impressions_viral = val.value;
                    break;
                case 'page_posts_impressions_viral_unique':
                    val.value = that.utilFs._replace(val.value, 'empty');
                    statistic.page_posts_impressions_viral_unique = val.value;
                    break;
                case 'page_stories':
                    val.value = that.utilFs._replace(val.value, 'empty');
                    statistic.page_stories = val.value;
                    break;
                case 'page_stories_by_story_type':
                    val.value = that.utilFs._replace(val.value, 'empty');
                    statistic.page_stories_by_story_type = val.value;
                    break;
                case 'page_admin_num_posts_by_type':
                    statistics.page_admin_num_posts_by_type = val.value;
                    break;
                case 'page_consumptions_by_consumption_type':
                    val.value = that.utilFs._replace(val.value, 'empty');
                    statistic.page_consumptions_by_consumption_type = val.value;
                    break;
            }
            var filterDay = _.where(statistics, {day: statistic.day});
            if(filterDay.length <= 0) {
                statistics.push(statistic);
            } else {
                _.each(statistics, function(v) {
                    if(v.day === statistic.day) {
                        v[data.data[0].name] = val.value;
                    }
                });
            }
        });
        if( data.data.length > 0 &&
            data.paging.hasOwnProperty('previous')) {
            var r = previousMatch(data.paging.previous);
            previousList.push(r);
        }
    });
    if(previousList.length > 0) {
        var limit_date = new moment('2009-01-01 00:00:00');
        // var previousUntil = new Date(previousList.until);

        limit_date = limit_date.valueOf() / 1000;
        var previousUntil = parseInt(previousList[0].until);
        log.info(limit_date);
        log.info(previousList[0].until);

        if(previousUntil > limit_date.valueOf()){
            setTimeout(function(){
                var message = {
                    id: value.source_id,
                    queue: 'FACEBOOK_INSIGHTS_PAGE_PARSE',
                    previousList: previousList
                };
                that.amqpTask.PublishQueue(message, 'FACEBOOK_INSIGHTS_PAGE_REQUEST');
            }, 1000);
        }
    }
    var length = statistics.length;
    if(length === 0) {
        return callback(true);
    }
    _.each(statistics, function(v) {
        that.saveToFacebook.PageInsight(value, v, function() {
            length--;
            if(length <= 0) {
                return callback(true);
            }
        });
    });
};

module.exports.prototype.PageInsights = function(value, callback) {
    var that = this;

    var params = [];
    if(value.previousList) {
        _.each(value.previousList, function(previous) {
            params.push({
                method: 'get',
                relative_url: previous.id + '/insights/' + previous.metric + "?since=" + previous.since + "&until=" + previous.until
            });
        });
    } else {
        var metrics = [
            'page_fans',
            'page_fan_adds_unique',
            'page_fans_by_like_source_unique',
            'page_fan_removes_unique',
            'page_fans_by_unlike_source_unique',
            'page_fans_gender_age',
            'page_fans_locale',
            'page_fans_city',
            'page_fans_country',
            'page_impressions_by_age_gender_unique',
            'page_impressions_by_story_type_unique',
            'page_impressions_by_country_unique',
            'page_impressions_by_city_unique',
            'page_impressions_paid_unique',
            'page_impressions_organic_unique',
            'page_impressions_viral_unique',
            'page_impressions_paid',
            'page_impressions_organic',
            'page_impressions_viral',
            'page_negative_feedback_unique',
            'page_positive_feedback_by_type',
            'page_positive_feedback_by_type_unique',
            'page_negative_feedback_by_type',
            'page_negative_feedback_by_type_unique',
            'page_posts_impressions_paid',
            'page_posts_impressions_paid_unique',
            'page_posts_impressions_organic',
            'page_posts_impressions_organic_unique',
            'page_posts_impressions_viral',
            'page_posts_impressions_viral_unique',
            'page_stories',
            'page_stories_by_story_type',
            'page_admin_num_posts_by_type',
            'page_consumptions_by_consumption_type'
        ];
        var date = new Date();
        date.setMonth(date.getMonth() - 2);
        var month_ago = moment(date).format('YYYY-MM-DD');
        var until = moment().format('YYYY-MM-DD');
        _.each(metrics, function(metric) {
            params.push({
                method: 'get',
                relative_url: value.id + '/insights/' + metric + '?since=' + month_ago + '&until=' + until
            });
        });
    }

    this.ApiWrapper._APICall(value.id, 'batch', '', params, function(res) {
        var bodys = [];
        _.each(res, function(val) {
            if(!val || val.code !== 200) {
                log.error(val.body);
                that.ApiWrapper._IncErrorCount();
                return callback(false);
            }
            try {
                var body = JSON.parse(val.body);
                bodys.push(body);
            } catch(e) {
                log.error(e);
                return callback(false);
            }
        });
        var message = {
            result: bodys,
            source_id: value.id
        };
        that.amqpTask.PublishQueue(message, 'FACEBOOK_INSIGHTS_PAGE_PARSE');
        return callback(true);
    });
};

module.exports.prototype.PostInsights = function(value, callback) {
    var that = this;

    var params = [];
    var metrics = [
        'post_engaged_users',
        'post_consumptions_by_type',
        'post_impressions_unique',
        'post_stories_by_action_type',
        'post_negative_feedback_by_type',
        'post_impressions_paid_unique',
        'post_impressions_organic_unique',
        'post_impressions_viral_unique',
        'post_impressions_fan_unique',
        'post_video_views_organic',
        'post_video_views_paid',
        'post_storytellers_by_action_type'
    ];
    _.each(metrics, function(metric) {
        params.push({
            method: 'get',
            relative_url: value.feed_id + '/insights/' + metric
        });
    });
    this.ApiWrapper._APICall(value.id, 'batch', '', params, function(res) {
        var statistics = {};
        _.each(res, function(val) {
            if(!val || val.code !== 200) {
                log.error(val.body);
                return callback(false);
            }
            try {
                var body = JSON.parse(val.body);
                if(body.data[0] && body.data[0].values) {
                    var data = body.data[0].values[0].value;
                    switch(body.data[0].name) {
                    case 'post_engaged_users':
                        statistics.post_engaged_users = data;
                        break;
                    case 'post_consumptions_by_type':
                        data = that.utilFs._replace(data, 'empty');
                        statistics.post_consumptions_by_type = data;
                        break;
                    case 'post_impressions_unique':
                        statistics.post_impressions_unique = data;
                        break;
                    case 'post_stories_by_action_type':
                        statistics.post_stories_by_action_type = data;
                        break;
                    case 'post_negative_feedback_by_type':
                        statistics.post_negative_feedback_by_type = data;
                        break;
                    case 'post_impressions_paid_unique':
                        statistics.post_impressions_paid_unique = data;
                        break;
                    case 'post_impressions_organic_unique':
                        statistics.post_impressions_organic_unique = data;
                        break;
                    case 'post_impressions_viral_unique':
                        statistics.post_impressions_viral_unique = data;
                        break;
                    case 'post_impressions_fan_unique':
                        statistics.post_impressions_fan_unique = data;
                        break;
                    case 'post_video_views_organic':
                        statistics.post_video_views_organic = data;
                        break;
                    case 'post_video_views_paid':
                        statistics.post_video_views_paid = data;
                        break;
                    case 'post_storytellers_by_action_type':
                        statistics.post_storytellers_by_action_type = data;
                        break;
                    }
                } else {
                    log.error('Error', body);
                }
            } catch(e) {
                log.error(e);
            }
        });
        that.saveToFacebook.PostInsight(value, statistics, function() {
            return callback(true);
        });
    });
};



