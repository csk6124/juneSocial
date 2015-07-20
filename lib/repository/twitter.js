'use strict';

/**
* @author : skjune
* 트위터 Feed 저장
* 트위터 저장 타입 - timeline, favoirite, unfavorite, retweet, reply
*
*/
var Save = require('./save');

module.exports = function(db) {
    this.saveToDB = new Save(db);
    this.timline_name = 'Publish';
};

module.exports.prototype.UpdatePost = function(_id, val, callback) {
    var updateData = {
        model: this.timline_name,
        query: {
            _id: _id
        },
        update: {
            publish_type: 'publish',
            id: val.id_str,
            id_str: val.id_str,
            message: val.text,
            source: val.source,
            location: val.geo,
            entities: val.entities,
            created_time: val.created_at,
            publish_time: val.created_at,
            user: {
                id: val.user.id_str,
                id_str: val.user.id_str,
                name: val.user.name,
                picture: val.user.profile_image_url
            },
            $set: {
                'statistics.favorite_count': val.favorite_count,
                'statistics.retweet_count': val.retweet_count
            }
        }
    };
    this.saveToDB._Save(updateData, callback);
};

module.exports.prototype.Timeline = function(val, screen_name) {
    if(val.in_reply_to_status_id || val.retweeted_status) {
        return;
    }

    var updateData = {
        model: this.timline_name,
        query: {
            social_id: screen_name,
            id: val.id_str,
            channel: 'twitter'
        },
        update: {
            publish_type: 'publish',
            id_str: val.id_str,
            message: val.text,
            picture: val.extended_entities && val.extended_entities.media.length > 0 ? val.extended_entities.media[0].media_url : null,
            source: val.source,
            location: val.geo,
            entities: val.entities,
            created_time: val.created_at,
            publish_time: val.created_at,
            user: {
                id: val.user.id_str,
                id_str: val.user.id_str,
                name: val.user.name,
                picture: val.user.profile_image_url
            },
            $set: {
                'statistics.favorite_count': val.favorite_count,
                'statistics.retweet_count': val.retweet_count
            }
        }
    };
    this.saveToDB._Save(updateData, function() {});
};

module.exports.prototype.Favorite = function(val) {
    if(!val) {
        return;
    }
    var updateData = {
        model: this.timline_name,
        query: {
            id: val.id_str,
            channel: 'twitter'
        }
    };
    updateData.query['favorite_info.id'] = {
        $ne: val.user.id_str
    };
    updateData.update = {
        publish_type: 'publish',
        $set: {
            'statistics.favorite_count': val.favorite_count,
            'statistics.retweet_count': val.retweet_count
        },
        $push: {
            'favorite_info': {
                $each: [{
                    id: val.user.id_str,
                    name: val.user.name,
                    picture: val.user.profile_image_url,
                    screen_name: val.user.screen_name,
                    created_time: val.created_at
                }],
                $sort: {
                    created_time: 1
                },
                $slice: -5
            }
        }
    };
    this.saveToDB._Save(updateData, function() {});
};

module.exports.prototype.FavoriteFromSubscribe = function(val) {
    if(!val) {
        return;
    }

    var updateData = {
        model: this.timline_name,
        query: {
            id: val.target_object.id_str,
            channel: 'twitter'
        }
    };
    updateData.query['favorite_info.id'] = {
        $ne: val.source.id_str
    };
    updateData.update = {
        publish_type: 'publish',
        $set: {
            'statistics.favorite_count': val.target_object.favorite_count,
            'statistics.retweet_count': val.target_object.retweet_count
        },
        $push: {
            'favorite_info': {
                $each: [{
                    id: val.source.id_str,
                    name: val.source.name,
                    picture: val.source.profile_image_url,
                    screen_name: val.source.screen_name,
                    created_time: val.created_at
                }],
                $sort: {
                    created_time: 1
                },
                $slice: -5
            }
        }
    };
    this.saveToDB._Save(updateData, function() {});
};

module.exports.prototype.UnFavoriteFromSubscribe = function(val) {
    if(!val) {
        return;
    }
    var updateData = {
        model: this.timline_name,
        query: {
            id: val.target_object.id_str,
            channel: 'twitter'
        }
    };
    updateData.update = {
        publish_type: 'publish',
        $set: {
            'statistics.favorite_count': val.target_object.favorite_count,
            'statistics.retweet_count': val.target_object.retweet_count
        },
        $pull: {
            'favorite_info': {
                id: val.source.id_str
            }
        }
    };
    this.saveToDB._Save(updateData, function() {});

};

module.exports.prototype.Reply = function(val) {
    if(!val.in_reply_to_status_id_str) {
        return;
    }

    var updateData = {
        model: this.timline_name,
        query: {
            social_id: val.in_reply_to_user_id_str,
            id: val.in_reply_to_status_id_str,
            channel: 'twitter'
        }
    };
    updateData.query['reply_info.id'] = {
        $ne: val.id_str
    };
    updateData.update = {
        publish_type: 'publish',
        $push: {
            'reply_info': {
                $each: [{
                    id: val.id_str,
                    name: val.user.name,
                    picture: val.user.profile_image_url,
                    user_id: val.in_reply_to_user_id_str,
                    screen_name: val.in_reply_to_screen_name,
                    message: val.text,
                    created_time: val.created_at
                }],
                $sort: {
                    created_time: 1
                },
                $slice: -5
            }
        }
    };
    this.saveToDB._Save(updateData, function() {});

};

module.exports.prototype.Retweet = function(val) {
    if(!val.retweeted_status || !val.retweeted_status.id_str) {
        return;
    }
    var updateData = {
        model: this.timline_name,
        query: {
            social_id: val.retweeted_status.user.id_str,
            id: val.retweeted_status.id_str,
            channel: 'twitter'
        }
    };
    updateData.query['retweet_info.id'] = {
        $ne: val.id_str
    };
    updateData.update = {
        publish_type: 'publish',
        $set: {
            'statistics.favorite_count': val.retweeted_status.favorite_count,
            'statistics.retweet_count': val.retweeted_status.retweet_count
        },
        $push: {
            'retweet_info': {
                $each: [{
                    id: val.id_str,
                    name: val.user.name,
                    picture: val.user.profile_image_url,
                    user_id: val.user.id_str,
                    screen_name: val.user.screen_name,
                    message: val.retweeted_status.text,
                    created_time: val.retweeted_status.created_at
                }],
                $sort: {
                    created_time: 1
                },
                $slice: -5
            }
        }
    };
    log.info('Retweet updateData', updateData);
    this.saveToDB._Save(updateData, function() {});

};

module.exports.prototype.Analytics = function(screen_name, val, type) {

    var updateData = {
        model: 'TwitterActivity',
        query: {
            screen_name: screen_name,
            id: val.id_str
        }
    };

    updateData.update = {
        type: type,
        created_time: val.created_at
    };

    if(val.content_type) {
        updateData.update.content_type = val.content_type;
    }

    console.log('Analytics Data in ', screen_name);
    this.saveToDB._Save(updateData, function() {});

};
