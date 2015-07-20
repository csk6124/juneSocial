#!/home/application/bin/node

var moment = require('moment'),
    _ = require('lodash'),
    mongoskin = require('mongoskin'),
    argv = require('optimist')
        .demand(['m', 'c', 'd'])
        .alias('m', 'type').default('type', 'mention')
        .alias('c', 'config').default('config', 'local')
        .alias('d', 'day').default('day', 1000000)
        .usage('Usage: $0 --mode [mode name]')
        .argv;


var total = 10;

var mapReduce = {
    mention_map: function() {
        var date = new Date(this.created_time.getFullYear(), this.created_time.getMonth(), this.created_time.getDate(), 0, 0, 0);
        var value = {
            created_time: this.created_time,
            screen_name: this.screen_name,
            mention_count: 1
        };
        emit({date: date}, value);
    },
    mention_reduce: function(key, values) {
        var object = {
            screen_name: null,
            created_time : 0,
            mention_count: 0
        }
        values.forEach( function(value) {
            object.screen_name = value.screen_name;
            object.created_time = value.created_time;
            object.mention_count += value.mention_count;
        });
        return object;
    },
    follower_map: function() {
        var date = new Date(this.created_time.getFullYear(), this.created_time.getMonth(), this.created_time.getDate(), 0, 0, 0);
        var value = {
            created_time: this.created_time,
            screen_name: this.screen_name,
            follower_count: 1,
            total_follower_count: 1
        };
        emit({date: date}, value);
    },
    follower_reduce: function(key, values) {
        var object = {
            screen_name: null,
            created_time : 0,
            follower_count: 0,
            total_follower_count: 0
        }
        values.forEach( function(value) {
            object.screen_name = value.screen_name;
            object.created_time = value.created_time;
            object.follower_count += value.follower_count;
            object.total_follower_count += value.total_follower_count;
        });
        return object;
    },
    following_map: function(count) {
        var date = new Date(this.created_time.getFullYear(), this.created_time.getMonth(), this.created_time.getDate(), 0, 0, 0);
        var value = {
            created_time: this.created_time,
            screen_name: this.screen_name,
            following_count: 1,
            total_following_count: 1
        };
        emit({date: date}, value);
    },
    following_reduce: function(key, values) {
        var object = {
            screen_name: null,
            created_time : 0,
            following_count: 0,
            total_following_count: 0
        }

        values.forEach( function(value) {
            object.screen_name = value.screen_name;
            object.created_time = value.created_time;
            object.following_count += value.following_count;
            object.total_following_count += value.total_following_count;
        });
        return object;
    },
    retweet_map: function() {
        var date = new Date(this.created_time.getFullYear(), this.created_time.getMonth(), this.created_time.getDate(), 0, 0, 0);
        var value = {
            created_time: this.created_time,
            screen_name: this.screen_name,
            retweet_count: 1
        };
        emit({date: date}, value);
    },
    retweet_reduce: function(key, values) {
        var object = {
            screen_name: null,
            created_time : 0,
            retweet_count: 0
        }
        values.forEach( function(value) {
            object.screen_name = value.screen_name;
            object.created_time = value.created_time;
            object.retweet_count += value.retweet_count;
        });
        return object;
    },
    tweet_map: function() {
        var date = new Date(this.created_time.getFullYear(), this.created_time.getMonth(), this.created_time.getDate(), 0, 0, 0);
        var value = {
            created_time: this.created_time,
            screen_name: this.screen_name,
            tweet_count: 0,
            tweet_text_count: 0,
            tweet_photo_count: 0,
            tweet_video_count: 0,
            content_type: this.content_type
        };
        emit({date: date}, value);
    },
    tweet_reduce: function(key, values) {
        var object = {
            screen_name: null,
            created_time : 0,
            tweet_count: 0,
            tweet_text_count: 0,
            tweet_photo_count: 0,
            tweet_video_count: 0,
            content_type: null
        }
        values.forEach( function(value) {
            object.content_type = value.content_type;
            object.screen_name = value.screen_name;
            object.created_time = value.created_time;
            object.tweet_count += value.tweet_count + 1;

            if(value.content_type === 'text') {
                object.tweet_text_count += value.tweet_text_count + 1;
            } else if(value.content_type === 'photo') {
                object.tweet_photo_count += value.tweet_photo_count + 1;
            } else if(value.content_type === 'video') {
                object.tweet_video_count += value.tweet_video_count + 1;
            }
        });
        return object;
    }
};

var queryString = function(type) {
    var day = argv.day ? argv.day : 1;
    var time_int = 60 * 60 * 24 * 1000 * day;
    return {
        out:'test_coll_day',
        query: {
            created_time: {
                '$gt':new Date(Date.now() - time_int)
            },
            type: type
        }
    };
};

var list_count = 0;
var success_count = 0;

var run = function(type) {
    var db = null;
    switch(argv.config) {
        case "local":
            db = mongoskin.db('mongodb://192.168.0.200/skjune');
            break;
        case "dev":
            db = mongoskin.db('mongodb://127.0.0.1/skjune');
            break;
    }
    db.collection('twitteractivities');
    db.bind('twitteractivities');
    db.twitteractivities.mapReduce(type.map, type.reduce, type.queryString, function(emit, collection) {
        collection.find().toArray(function(err, results) {
            if(err || results.length <= 0) {
                if(err) console.log(err);
                process.exit(1);
            }

            var total_follower = 0,
                total_following = 0;

            list_count = results.length;
            results.forEach(function(r) {
                var query = {
                    day: new Date(r._id.date),
                    screen_name: r.value.screen_name
                };
                var update = {}
                if(r.value.mention_count) {
                    update.$addToSet = {
                        'statistics': {
                            created_time: r.value.created_time,
                            count: r.value.mention_count,
                            type: 'mention'
                        }
                    }
                }
                if(r.value.tweet_count) {
                    update.$addToSet = {
                        'statistics': {
                            created_time: r.value.created_time,
                            text_count: r.value.tweet_text_count,
                            photo_count: r.value.tweet_photo_count,
                            video_count: r.value.tweet_video_count,
                            count: r.value.tweet_count,
                            type: 'tweet'
                        }
                    }
                }
                if(r.value.retweet_count) {
                    update.$addToSet = {
                        'statistics': {
                            created_time: r.value.created_time,
                            count: r.value.retweet_count,
                            type: 'retweet'
                        }
                    }
                }
                if(r.value.follower_count) {
                    total_follower += r.value.follower_count;
                    update.$addToSet = {
                        'statistics': {
                            created_time: r.value.created_time,
                            count: r.value.follower_count,
                            total_count: total_follower,
                            type: 'follower'
                        }
                    }
                }
                if(r.value.following_count) {
                    console.log('r.value', r.value);
                    total_following += r.value.total_following_count;
                    update.$addToSet = {
                        'statistics': {
                            created_time: r.value.created_time,
                            count: r.value.following_count,
                            total_count: total_following,
                            type: 'following'
                        }
                    }
                }
                console.log('update', query, update)
                db.collection('twitteranalytics').update(query, update, {upsert: true, safe: true}, function(err, result) {
                    success_count++;
                    if(err) console.log(err);
                    if(result) console.log(result);
                    if(list_count === success_count){
                        process.exit(1);
                    }
                    // process.exit(1);
                });
            });
        });
    });
};

switch(argv.type) {
case 'mention':
    var type = {
        map: mapReduce.mention_map,
        reduce: mapReduce.mention_reduce,
        queryString: queryString('mention')
    };
    run(type);
    break;
case 'follower':
    var type = {
        map: mapReduce.follower_map,
        reduce: mapReduce.follower_reduce,
        queryString: queryString('follower')
    };
    run(type);
    break;
case 'following':

    var type = {
        map: mapReduce.following_map,
        reduce: mapReduce.following_reduce,
        queryString: queryString('following')
    };
    console.log(type.queryString);
    run(type);
    break;
case 'retweet':
    var type = {
        map: mapReduce.retweet_map,
        reduce: mapReduce.retweet_reduce,
        queryString: queryString('retweet')
    };
    run(type);
    break;
case 'tweet':
    var type = {
        map: mapReduce.tweet_map,
        reduce: mapReduce.tweet_reduce,
        queryString: queryString('tweet')
    };
    run(type);
    break;
};


