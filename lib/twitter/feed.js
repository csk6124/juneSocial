'use strict';

/**
* twitter timeline, mention_line(reply)등을 가져온다.
* 나머지 데이타는 리얼타임으로 데이타를 가져온다.
*
*/
var _ = require('lodash'),
    Step = require('step'),
    ApiWrapper = require('./apiWrapper'),
    Amqp = require('../amqp'),
    Repository = require('../repository');

module.exports = function(config, db) {
    this.db = db;
    this.amqpTask = new Amqp.Task(config);
    this.saveToTwitter = new Repository.Twitter(db);
    this.saveToUser = new Repository.User(db);
    this.saveToDashboard = new Repository.Dashboard(db);
    this.ApiWrapper = new ApiWrapper(config, db);
};

module.exports.prototype.Feed = function(value, callback) {
    var that = this;

    new Step(
    function getDashboard() {
        that.saveToDashboard.GetDashboard(value, 'user_timeline', this);
    },
    function UserTimeline(dashboardInfo) {
        console.log('dashboardInfo', dashboardInfo);
        if(dashboardInfo && dashboardInfo.cursor) {
            value.cursor = dashboardInfo.cursor;
        }
        if(dashboardInfo && dashboardInfo.command) {
            value.command = dashboardInfo.command;
        }
        that.UserTimeline(value, this);
    },
    function () {
        console.log('callback');
        callback(true);
    });
};

module.exports.prototype.UserTimeline = function(value, callback) {
    var that = this;

    console.log('UserTimeline', value);

    this.ApiWrapper._APICall(value.screen_name, this.ApiWrapper._GetAPIParameter(value, 'user_timeline'), function(err, response, body) {
        if(err) {
            log.error('API Call Error', err, body);
            return callback(false);
        } else {
            try {
                var userTimeLineData = JSON.parse(body);
                if(userTimeLineData.errors) {
                    that.saveToDashboard.SetDashboard({screen_name: value.screen_name, max_id: value.cursor}, 'user_timeline');
                    log.error('usertimelinedata Error', userTimeLineData.errors);
                    return callback(false);
                } else if(userTimeLineData.length <= 0) {
                    that.saveToDashboard.SetDashboard(value, 'user_timeline');
                    log.info('End UserTimeline');

                    that.saveToDashboard.GetDashboard(value, 'mention_timeline', function(dashboardInfo) {
                        var message = {
                            screen_name: value.screen_name,
                            command: dashboardInfo.command,
                            cursor:  dashboardInfo.cursor
                        };
                        console.log('UserTimeline message', message)
                        that.amqpTask.PublishQueue(message, 'TWITTER_MENTION_TIMELINE_REQUEST');
                        return callback(true);
                    });
                } else {
                    var message = {
                        result: userTimeLineData,
                        screen_name: value.screen_name,
                        command: value.command,
                        cursor: value.cursor,
                        max_id: value.max_id
                    };
                    that.amqpTask.PublishQueue(message, 'TWITTER_USER_TIMELINE_PARSE');
                    return callback(true);
                }
            } catch(e) {
                log.warn('Data None');
                return callback(false);
            }
        }
    });
};

module.exports.prototype.MentionTimeline = function(value, callback) {
    var that = this;

    this.ApiWrapper._APICall(value.screen_name, this.ApiWrapper._GetAPIParameter(value, 'mention_timeline'), function(err, response, body) {
        if(err) {
            log.error(err, body);
            return callback(false);
        } else {
            var metionData = JSON.parse(body);
            if(!metionData) {
                log.warn('Nothing data');
                return callback(false);
            }
            if(metionData.errors) {
                log.error(metionData.errors);
                return callback(false);
            } else if(metionData.length <= 0) {
                that.saveToDashboard.SetDashboard(value, 'mention_timeline');
                log.info('End MentionTimeline');
                that.saveToDashboard.GetDashboard(value, 'retweets_of_me', function(dashboardInfo) {
                    var message = {
                        screen_name: value.screen_name,
                        command: dashboardInfo.command,
                        cursor:  dashboardInfo.cursor
                    };
                    console.log('mention_timeline message', message)
                    that.amqpTask.PublishQueue(message, 'TWITTER_RETWEET_OF_ME_REQUEST');
                    return callback(true);
                });
            } else {
                var message = {
                    result: metionData,
                    screen_name: value.screen_name,
                    command: value.command,
                    cursor: value.cursor,
                    max_id: value.max_id
                };
                that.amqpTask.PublishQueue(message, 'TWITTER_MENTION_TIMELINE_PARSE');
                return callback(true);
            }
        }
    });
};

module.exports.prototype.RetweetOfMe = function(value, callback) {
    var that = this;

    console.log('RetweetOfMe value', value)
    this.ApiWrapper._APICall(value.screen_name, this.ApiWrapper._GetAPIParameter(value, 'retweets_of_me'), function(err, response, body) {
        if(err) {
            log.error(err, body);
            return callback(false);
        } else {
            var data = JSON.parse(body);
            if(!data) {
                log.warn('Nothing data');
                return callback(false);
            }
            if(data.errors) {
                log.error(data.errors);
                return callback(false);
            } else if(data.length <= 0) {
                that.saveToDashboard.SetDashboard(value, 'retweets_of_me');
                log.info('End RetweetOfMe');

                that.saveToDashboard.GetDashboard(value, 'followers', function(dashboardInfo) {
                    var message = {
                        screen_name: value.screen_name,
                        command: dashboardInfo.command,
                        cursor:  dashboardInfo.cursor
                    };
                    console.log('followers message', message)
                    that.amqpTask.PublishQueue(message, 'TWITTER_FOLLOWERS_REQUEST');
                    return callback(true);
                });
            } else {
                var message = {
                    result: data,
                    screen_name: value.screen_name,
                    command: value.command,
                    cursor: value.cursor,
                    max_id: value.max_id
                };
                that.amqpTask.PublishQueue(message, 'TWITTER_RETWEET_OF_ME_PARSE');
                return callback(true);
            }
        }
    });
};

module.exports.prototype.Followers = function(value, callback) {
    var that = this;

    this.ApiWrapper._APICall(value.screen_name, this.ApiWrapper._GetAPIParameter(value, 'followers'), function(err, response, body) {
        if(err) {
            log.error(err, body);
            return callback(false);
        } else {
            var data = JSON.parse(body);
            if(!data) {
                log.warn('Nothing data');
                return callback(false);
            }
            if(data.errors) {
                log.error(data.errors);
                return callback(false);
            } else if(data.length <= 0) {
                that.saveToDashboard.SetDashboard(value, 'followers');
                log.info('End Followers');

                that.saveToDashboard.GetDashboard(value, 'friends', function(dashboardInfo) {
                    var message = {
                        screen_name: value.screen_name,
                        command: dashboardInfo.command,
                        cursor:  dashboardInfo.cursor
                    };
                    console.log('friends message', message)
                    that.amqpTask.PublishQueue(message, 'TWITTER_FRIENDS_REQUEST');
                    return callback(true);
                });
            } else {
                var message = {
                    result: data,
                    screen_name: value.screen_name,
                    command: value.command,
                    cursor: value.cursor,
                    max_id: value.max_id
                };
                that.amqpTask.PublishQueue(message, 'TWITTER_FOLLOWERS_PARSE');
                return callback(true);
            }
        }
    });
};

module.exports.prototype.Friends = function(value, callback) {
    var that = this;

    this.ApiWrapper._APICall(value.screen_name, this.ApiWrapper._GetAPIParameter(value, 'friends'), function(err, response, body) {
        if(err) {
            log.error(err, body);
            return callback(false);
        } else {
            var data = JSON.parse(body);
            if(!data) {
                log.warn('Nothing data');
                return callback(false);
            }
            if(data.errors) {
                log.error(data.errors);
                return callback(false);
            } else if(data.length <= 0) {
                that.saveToDashboard.SetDashboard(value, 'friends');
                log.info('End Friends');
            } else {
                var message = {
                    result: data,
                    screen_name: value.screen_name,
                    command: value.command,
                    cursor: value.cursor,
                    max_id: value.max_id
                };
                that.amqpTask.PublishQueue(message, 'TWITTER_FRIENDS_PARSE');
                return callback(true);
            }
        }
    });
};

module.exports.prototype.FriendsParse = function(value) {
    var that = this;
    _.each(value.result.users, function(val) {
        that.saveToTwitter.Analytics(value.screen_name, val, 'following');
    });

    if(value.result.next_cursor) {
        var message = {
            screen_name: value.screen_name,
            command: value.command,
            cursor: value.result.next_cursor
        };
        that.amqpTask.PublishQueue(message, 'TWITTER_FRIENDS_REQUEST');
    } else {
        value.cursor = value.result.next_cursor;
        that.saveToDashboard.SetDashboard(value, 'friends');
        log.info('End FriendsParse');
    }
};

module.exports.prototype.FollowersParse = function(value) {
    var that = this;

    _.each(value.result.users, function(val) {
        that.saveToTwitter.Analytics(value.screen_name, val, 'follower');
    });

    if(value.result.next_cursor) {
        var message = {
            screen_name: value.screen_name,
            command: value.command,
            cursor: value.result.next_cursor
        };
        that.amqpTask.PublishQueue(message, 'TWITTER_FOLLOWERS_REQUEST');
    } else {
        value.cursor = value.result.next_cursor;
        that.saveToDashboard.SetDashboard(value, 'followers');
        log.info('End FollowersParse');

        that.saveToDashboard.GetDashboard(value, 'friends', function(dashboardInfo) {
            var message = {
                screen_name: value.screen_name,
                command: dashboardInfo.command,
                cursor:  dashboardInfo.cursor
            };
            console.log('friends message', message)
            that.amqpTask.PublishQueue(message, 'TWITTER_FRIENDS_REQUEST');
        });
    }
};

module.exports.prototype.RetweetOfMeParse = function(value) {
    var that = this;

    _.each(value.result, function(val) {
        value.cursor = val.id;

        if(!value.max_id) {
            value.max_id = val.id;
        } else if(value.max_id < val.id) {
            value.max_id = val.id;
        }
        that.saveToTwitter.Analytics(value.screen_name, val, 'retweet');
    });

    if(value.result.length > 0) {
        var message = {
            screen_name: value.screen_name,
            command: value.command,
            cursor: value.cursor,
            max_id: value.max_id
        };
        that.amqpTask.PublishQueue(message, 'TWITTER_RETWEET_OF_ME_REQUEST');
    } else {
        log.info('End RetweetOfMeParse');
    }
};

module.exports.prototype.MentionTimelineParse = function(value) {
    var that = this;

    _.each(value.result, function(val) {
        value.cursor = val.id;

        if(!value.max_id) {
            value.max_id = val.id;
        } else if(value.max_id < val.id) {
            value.max_id = val.id;
        }

        that.saveToTwitter.Reply(val);
        that.saveToTwitter.Analytics(value.screen_name, val, 'mention');
        that.saveToUser.User(val, val.in_reply_to_user_id, 'reply');
        that.saveToUser.UserActivity(val, 'reply');
        that.saveToUser.UserStatistics(val, val.in_reply_to_user_id, 'reply');


    });

    if(value.result.length > 0) {
        var message = {
            screen_name: value.screen_name,
            command: value.command,
            cursor: value.cursor,
            max_id: value.max_id
        };
        that.amqpTask.PublishQueue(message, 'TWITTER_MENTION_TIMELINE_REQUEST');
    } else {
        log.info('End MentionTimelineParse');
    }
};

module.exports.prototype.UserTimelineParse = function(value) {
    var that = this;

    _.each(value.result, function(val) {
        value.cursor = val.id;

        if(!value.max_id) {
            value.max_id = val.id;
        } else if(value.max_id < val.id) {
            value.max_id = val.id;
        }
        that.saveToTwitter.Timeline(val, value.screen_name);

        if(val.extended_entities && val.extended_entities.media.length > 0) {
            val.content_type = val.extended_entities.media[0].type;
            val.picture = val.extended_entities.media[0].media_url;
        } else {
            val.content_type = 'text';
        }
        that.saveToTwitter.Analytics(value.screen_name, val, 'tweet');
    });

    if(value.result.length > 0) {
        var message = {
            screen_name: value.screen_name,
            command: value.command,
            cursor: value.cursor,
            max_id: value.max_id
        };
        that.amqpTask.PublishQueue(message, 'TWITTER_USER_TIMELINE_REQUEST');
    } else {
        log.info('End UserTimelineParse');
    }
};



