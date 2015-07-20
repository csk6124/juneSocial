'use strict';

/**
 *  @author : skjune
 *  사용자 정보 저장 & 사용자 통계
 *  소셜서비스 : facebook, twitter, youtube 사용자
 *
 */
var moment = require('moment'),
    async = require('async'),
    Save = require('./save'),
    _ = require('lodash');

module.exports = function(db) {
    this.db = db;
    this.saveToDB = new Save(db);
};

module.exports.prototype.User = function(val, social_id, type) {
    var that = this;

    var ret = {},
        channel_name = null;

    switch (type) {
        case 'reply':
            ret.post_id = val.in_reply_to_status_id_str;
            ret.user_id = val.user.id_str;
            ret.name = val.user.name;
            ret.screen_name = val.user.screen_name;
            ret.city = val.user.location;
            ret.about = val.user.description;
            ret.created_time = val.user.created_at;
            ret.pic = val.user.profile_image_url;
            ret.followers_count = val.user.followers_count;
            ret.friends_count = val.user.friends_count;
            ret.listed_count = val.user.listed_count;
            ret.favourites_count = val.user.favourites_count;
            ret.statuses_count = val.user.statuses_count;
            channel_name = 'twitter';
            break;
        case 'retweet':
            ret.post_id = val.retweeted_status.id_str;
            ret.user_id = val.user.id_str;
            ret.name = val.user.name;
            ret.screen_name = val.user.screen_name;
            ret.city = val.user.location;
            ret.about = val.user.description;
            ret.created_time = val.user.created_at;
            ret.pic = val.user.profile_image_url;
            ret.followers_count = val.user.followers_count;
            ret.friends_count = val.user.friends_count;
            ret.listed_count = val.user.listed_count;
            ret.favourites_count = val.user.favourites_count;
            ret.statuses_count = val.user.statuses_count;
            channel_name = 'twitter';
            break;
        case 'favorite':
        case 'unfavorite':
            ret.post_id = val.target_object.id;
            ret.user_id = val.source.id;
            ret.name = val.source.name;
            ret.screen_name = val.source.screen_name;
            ret.city = val.source.location;
            ret.about = val.source.description;
            ret.created_time = val.source.created_at;
            ret.pic = val.source.profile_image_url;
            ret.followers_count = val.source.followers_count;
            ret.friends_count = val.source.friends_count;
            ret.listed_count = val.source.listed_count;
            ret.favourites_count = val.source.favourites_count;
            ret.statuses_count = val.source.statuses_count;
            channel_name = 'twitter';
            break;
        case 'facebook':
            ret = val;
            channel_name = 'facebook';
            break;
        case 'youtube':
            ret = val;
            channel_name = 'youtube';
            break;
    }

    var publish_feed_month = 0;
    var activity_feed = 0;
    var totActCnt = 0;
    async.series(
        [
            that._getPublishFeedMonthlyCount(social_id, channel_name),
            that._getActiviFeedMonthlyCount(ret.user_id, social_id, channel_name),
            that._getEventActivityMonthlyCount(ret.user_id, social_id, channel_name)
            // that._getTotActivityCount(ret.user_id, social_id, channel_name)
        ],
        function(err, result) {
            publish_feed_month = result[0];
            activity_feed = result[1];
            // totActCnt = result[2];

            var activity_event_feed = 0;
            if(!_.isUndefined(result[2]) && !_.isNull(result[2])){
                activity_event_feed = result[2];
            }else{
                activity_event_feed = 0;
            }

            var cherifiker = 0;
            if (activity_feed > 3) {
                cherifiker = activity_event_feed / activity_feed;
            }
            var level = 'ghost';
            log.error('publish_feed_month : ', publish_feed_month);
            log.error('activity_feed : ', activity_feed);
            var cal = (activity_feed / publish_feed_month) * 100;
            if (cherifiker > 1) {
                level = 'cherry';
            }else if (cal >= 10) {
                level = 'loyal';
            } else if (cal <= 10 && cal > 0) {
                level = 'basic';
            } else if (cal <= 0) {
                level = 'ghost';
            }

            var updateData = null;

            if (type === 'facebook') {
                updateData = {
                    model: 'SocialUsers',
                    method: 'update',
                    query: {
                        user_id: ret.user_id,
                        page_id: social_id,
                        channel_name: 'facebook'
                    },
                    update: {
                        name: ret.name,
                        city: ret.country,
                        about: ret.about,
                        created_time: null,
                        pic: ret.pic,
                        level: level,
                        gender: ret.gender,
                        // activity_tot: totActCnt,
                        activity_score: cal,
                        $set: {
                            'statistics.friends_count': ret.friend_count
                        }
                    }
                };
            } else if (type === 'youtube') {
                updateData = {
                    model: 'SocialUsers',
                    method: 'update',
                    query: {
                        user_id: ret.user_id,
                        page_id: social_id,
                        channel_name: 'youtube'
                    },
                    update: {
                        name: ret.name,
                        created_time: null,
                        pic: ret.pic,
                        level: level,
                        // activity_tot: totActCnt,
                        activity_score: cal
                    }
                };
            } else {
                updateData = {
                    model: 'SocialUsers',
                    method: 'update',
                    query: {
                        user_id: ret.user_id,
                        page_id: social_id,
                        channel_name: 'twitter'
                    },
                    update: {
                        name: ret.name,
                        screen_name: ret.screen_name,
                        city: ret.city,
                        about: ret.about,
                        created_time: ret.created_time,
                        pic: ret.pic,
                        level: level,
                        // activity_tot: totActCnt,
                        activity_score: cal,
                        $set: {
                            'statistics.followers_count': ret.followers_count,
                            'statistics.friends_count': ret.friends_count,
                            'statistics.listed_count': ret.listed_count,
                            'statistics.favourites_count': ret.favourites_count,
                            'statistics.statuses_count': ret.statuses_count
                        }
                    }
                };
            }
            console.log('SocialUsers'.red, updateData);
            that.saveToDB._Save(updateData, function() {});
        }
    );

};

module.exports.prototype.UserActivity = function(val, type) {
    var ret = {};
    switch (type) {
        case 'reply':
            ret.user_id = val.user.id_str;
            ret.page_id = val.in_reply_to_user_id_str;
            ret.post_id = val.in_reply_to_status_id_str;
            ret.message = val.text ? val.text : null;
            ret.created_time = val.created_at;
            break;
        case 'yt_comment':
            ret.user_id = val.user_id;
            ret.page_id = val.channelId;
            ret.post_id = val.post_id;
            ret.comment_id = val.comment_id;
            ret.message = val.message ? val.message : null;
            ret.created_time = val.created_at;
            type = 'comment';
            break;
        case 'favorite':
        case 'unfavorite':
            ret.user_id = val.source.id_str;
            ret.page_id = val.target.id_str;
            ret.post_id = val.target_object.id_str;
            ret.message = null;
            ret.created_time = val.created_at;
            break;
        case 'retweet':
            ret.user_id = val.user.id_str;
            ret.page_id = val.retweeted_status.user.id_str;
            ret.post_id = val.retweeted_status.id_str;
            ret.message = val.retweeted_status.text ? val.retweeted_status.text : null;
            ret.created_time = val.created_at;
            break;
        case 'like':
            ret.user_id = val.user_id;
            ret.page_id = val.page_id;
            ret.post_id = val.post_id;
            ret.message = null;
            ret.created_time = val.created_time;
            break;
        case 'comment':
            ret.user_id = val.user_id;
            ret.page_id = val.page_id;
            ret.post_id = val.post_id;
            ret.comment_id = val.comment_id;
            ret.message = (val.message === undefined) ? null : val.message;
            ret.created_time = val.created_time;
            break;
    }

    var updateData = {
        model: 'SocialUserActivities',
        method: 'update',
        query: {
            user_id: '' + ret.user_id,
            page_id: ret.page_id,
            post_id: ret.post_id,
            type: type
        },
        update: {
            type: type,
            message: ret.message,
            created_time: ret.created_time
        }
    };

    if (type === 'comment') {
        updateData.query.comment_id = ret.comment_id;
        updateData.update.comment_id = ret.comment_id;
    }


    console.log('UserActivity updateData', updateData)
    this.saveToDB._Save(updateData, function() {});

};

module.exports.prototype.UserStatistics = function(val, social_id, type) {
    var that = this;


    var updateData = {
        model: 'SocialUserStatistics',
        method: 'update',
        query: {
            page_id: social_id,
            date: moment(val.created_at).format('YYYY-MM-DD')
        },
        update: {}
    };
    switch (type) {
        case 'yt_comment':
            updateData.query.user_id = val.user.id;
            updateData.query.activity_ids = {
                $in:[val.post_id]
            };
            updateData.update = {
                $inc: {
                    'youtube.comment': 1
                },
                $addToSet: {
                    activity_ids: val.post_id
                }
            };
            updateData.type = 'youtube';
            updateData.postId = val.post_id;
            break;
        case 'comment':
            updateData.query.user_id = val.user.id;

            updateData.update = {
                $inc: {
                    'facebook.comment': 1
                },
                $addToSet: {
                    activity_ids: val.post_id
                }
            };
            break;
        case 'like':
            updateData.query.user_id = val.user.id;
            updateData.update = {
                $inc: {
                    'facebook.like': 1
                },
                $addToSet: {
                    activity_ids: val.post_id
                }
            };
            break;
        case 'share':
            updateData.query.user_id = val.user.id;
            updateData.update = {
                $inc: {
                    'facebook.share': 1
                },
                $addToSet: {
                    activity_ids: val.post_id
                }
            };
            break;
        case 'reply':
            updateData.query.user_id = val.user.id;
            updateData.update = {
                $inc: {
                    'twitter.reply': 1
                },
                $addToSet: {
                    activity_ids: val.in_reply_to_status_id
                }
            };
            break;
        case 'favorite':
            updateData.query.user_id = val.source.id;
            val.user = {
                id: val.source.id_str,
                name: val.source.name,
                screen_name: val.source.screen_name
            };
            updateData.update = {
                $inc: {
                    'twitter.favorite': 1
                },
                $addToSet: {
                    activity_ids: val.target_object.id
                }
            };
            break;
        case 'unfavorite':
            updateData.query.user_id = val.source.id;
            val.user = {
                id: val.source.id_str,
                name: val.source.name,
                screen_name: val.source.screen_name
            };
            updateData.update = {
                $inc: {
                    'twitter.unfavorite': 1
                },
                $addToSet: {
                    activity_ids: val.target_object.id
                }
            };
            break;
        case 'retweet':
            updateData.query.user_id = val.user.id;
            updateData.update = {
                $inc: {
                    'twitter.retweet': 1
                },
                $addToSet: {
                    activity_ids: val.retweeted_status.id_str
                }
            };
            break;
    }

    var staticInfo = {
        type: type,
        page_id: social_id,
        user_id: val.user.id
    };

console.log('saveToDB._Save updateData :'.red, updateData, staticInfo);
    that.saveToDB._Save(updateData, (function(staticInfo) {
        return function(err, res) {
        console.log('after saveToDB._Save updateData :'.red, staticInfo);
            that.db['SocialUserStatistics'].find({
                page_id: staticInfo.page_id,
                user_id: staticInfo.user_id
            }, function(err, statics) {
                if (err) {
                    console.error('db error', err);
                    return;
                }

                var totCnt = 0;
                var sns = ['facebook', 'twitter', 'youtube'];

                _.each(statics, function(user){
                    _.each(sns, function(channel_type){
                        if(!_.isUndefined(user[channel_type])){
                            _.each(user[channel_type], function(value){
                                totCnt += value;
                            });
                        }
                    });
                });

                // for (var i = 0; i < statics.length; i++) {
                //     var user = statics[i];

                //     for (var j = 0; j < sns.length; j++) {
                //         for (var index in user[sns[j]]) {
                //             totCnt += user[sns[j]][index];
                //         }
                //     }

                // }

                that.db['SocialUsers'].findOneAndUpdate({
                    user_id: staticInfo.user_id
                }, {
                    activity_tot: totCnt
                }, function(err, res) {
                    if (err) {
                        console.log('find one and update Error');
                        return;
                    }
                });

            });
        };
    })(staticInfo));


    if (type === 'like' || type === 'comment') {
        var ret = {};
        switch (type) {
            case 'like':
                ret.user_id = val.user.id;
                ret.page_id = social_id;
                ret.post_id = val.post_id;
                ret.message = null;
                ret.created_time = val.created_at;
                break;
            case 'comment':
                ret.user_id = val.user.id;
                ret.page_id = social_id;
                ret.post_id = val.post_id;
                ret.comment_id = val.comment_id;
                ret.message = (val.message === undefined) ? null : val.message;
                ret.created_time = val.created_at;
                break;
        }

        var updateData = {
            model: 'SocialUserActivities',
            method: 'update',
            query: {
                user_id: '' + ret.user_id,
                page_id: ret.page_id,
                post_id: ret.post_id,
                type: type
            },
            update: {
                type: type,
                message: ret.message,
                created_time: ret.created_time
            }
        };

        if (type === 'comment') {
            updateData.query.comment_id = ret.comment_id;
            updateData.update.comment_id = ret.comment_id;
        }


        console.log('saveToDB._Save updateData :', updateData);
        that.saveToDB._Save(updateData, function() {});
    }

};

module.exports.prototype._getPublishFeedMonthlyCount = function(social_id, type) {
    var that = this;
    var currentDate = new Date();
    currentDate.setMonth(currentDate.getMonth() - 2);

    console.log(currentDate);

    return function(callback) {
        var params = {
            social_id: social_id,
            created_time: {
                $gte: new Date(currentDate.getFullYear(), currentDate.getMonth())
            }
        };
        that.db.Publish.find(params)
            .count(function(err, count) {
                if (err || count <= 0) {
                    return callback(null, 1);
                } else {
                    return callback(null, count);
                }
            });
    };

};

module.exports.prototype._getTotActivityCount = function(user_id, social_id, type) {
    var that = this;

    return function(callback) {
        that.db.SocialUserStatistics.find({
            user_id: user_id,
            page_id: social_id
        }).exec(function(err, statics) {

            var totCnt = 0;

            if (err) {
                console.error('db error', err);
                return callback(null, 0);
            }

            var sns = ['facebook', 'twitter', 'youtube'];
            for (var i = 0; i < statics.length; i++) {
                var user = statics[i];

                for (var j = 0; j < sns.length; j++) {
                    for (var index in user[sns[j]]) {
                        totCnt += user[sns[j]][index];
                    }
                }

            }

            // for (var i = 0; i < users.length; i++) {
            //     if(type === 'facebook') {
            //         for(var key in users[i].facebook){
            //             if(users[i].facebook[key] !== undefined){
            //                 totCnt+=users[i].facebook[key];
            //             }
            //         }
            //     }else {
            //         if (users[i].activity_ids !== undefined) {
            //             totCnt += users[i].activity_ids.length;
            //         }
            //     }
            // }

            return callback(null, totCnt);

        });

    }

};

module.exports.prototype._getActiviFeedMonthlyCount = function(user_id, social_id, type) {
    var that = this;

    var currentDate = new Date();
    currentDate.setMonth(currentDate.getMonth() - 2);

    console.log('_getActiviFeedMonthlyCount type : ', type);
    if (type === 'twitter') {
        return function(callback) {
            var params = {
                user_id: user_id,
                page_id: social_id,
                date: {
                    $gte: moment(currentDate).format('YYYY-MM')
                }
                // date: moment(new Date()).format('YYYY-MM')
            };
            that.db.SocialUserStatistics.find(params)
                .exec(function(err, user) {
                    var ids = 0;
                    var totCnt = 0;

                    if (err || !user) {
                        return callback(null, {
                            ids: ids
                        });
                    } else {

                        if (user.length > 0) {

                            return callback(null, user[0].activity_ids.length);

                        } else {
                            return callback(null, 0);
                        }
                    }
                });
        };
    } else if (type === 'facebook' || type === 'youtube') {
        return function(callback) {
            var params = {
                user_id: user_id,
                page_id: social_id,
                date: {
                    $gte: moment(currentDate).format('YYYY-MM')
                }
                // date: moment(new Date()).format('YYYY-MM')
            };

            that.db.SocialUserStatistics.find(params)
                .exec(function(err, user) {

                    if (err || !user) {
                        return callback(null, 0);
                    } else {
                        if (user.length > 0) {
                            return callback(null, user[0].activity_ids.length);
                        } else {
                            return callback(null, 0);
                        }
                    }
                });
        };
    }
};

module.exports.prototype._getEventActivityMonthlyCount = function(user_id, social_id, type) {
    var that = this;

    var currentDate = new Date();
    currentDate.setMonth(currentDate.getMonth() - 2);

    return function(callback){
        that.db.Publish.find({
            social_id: social_id
        })
        .exec(function(err, posts){
            if(err){
                return callback(err, null);
            }else{
                var post_arr = [];
                _.each(posts, function(post){
                    if(!_.isUndefined(post.id)){
                        post_arr.push(post.id);
                    }
                });
                // return callback(null, post_arr);
                that.db.SocialUserActivities.find({'post_id': {$in: post_arr}, 'user_id': user_id}).exec(function(err, eventActivityCnt){
                    return callback(null, eventActivityCnt.length);
                });
            }
        });
    }
};