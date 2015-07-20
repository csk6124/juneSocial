'use strict';

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
            id: val.id,
            message: val.snippet.title,
            publish_time: val.snippet.publishedAt,
            created_time: val.snippet.publishedAt,
        }
    };
    this.saveToDB._Save(updateData, callback);
};

module.exports.prototype.Channel = function(value, item) {
	var updateData = {
        model: this.timline_name,
        query: {
            social_id: value.userId,
            id: item.id,
            channel: 'youtube'
        },
        update: {
            publish_type: 'publish',
            thumbnails: item.snippet.thumbnails,
            statistics: item.statistics,
            contentDetails: item.contentDetails,
            publish_time: item.snippet.publishedAt,
            created_time: item.snippet.publishedAt,
        }
    };
    if(item.snippet.title) {
        updateData.update.title = item.snippet.title;
    }
    if(item.snippet.description) {
        updateData.update.description = item.snippet.description;
    }

	if(value.pageToken) {
        updateData.update.nextPageToken = value.nextPageToken;
	}
	this.saveToDB._Save(updateData, function() {});
};

module.exports.prototype.Activity = function(value, item) {
	var updateData = {
        model: this.timline_name,
        query: {
            social_id: value.channelId,
            id: item.contentDetails.upload.videoId,
            channel: 'youtube'
        },
        update: {
            publish_type: 'publish',
            thumbnails: item.snippet.thumbnails,
            type: item.snippet.type,
            contentDetails: item.contentDetails,
            publish_time: item.snippet.publishedAt,
            created_time: item.snippet.publishedAt,
        }
    };
    if(item.snippet.title) {
        updateData.update.title = item.snippet.title;
    }
    if(item.snippet.description) {
        updateData.update.description = item.snippet.description;
    }
    this.saveToDB._Save(updateData, function() {});
};

module.exports.prototype.Video = function(value, item) {
	var updateData = {
        model: this.timline_name,
        query: {
            social_id: value.channelId,
            id: value.videoId,
            channel: 'youtube'
        },
        update: {
            publish_type: 'publish',
            contentDetails: item.contentDetails,
            status: item.status,
            statistics: item.statistics
        }
    };
    if(item.snippet.title) {
        updateData.update.title = item.snippet.title;
    }
    if(item.snippet.description) {
        updateData.update.description = item.snippet.description;
    }
    this.saveToDB._Save(updateData, function() {});
};

module.exports.prototype.Analytics = function(value, item) {
	var updateData = {
        model: 'YoutubeAnalytics',
        method: 'update',
        query: {
            channelId: value.channelId,
            videoId: value.videoId,
            day: item.day
        },
        update: item
    };
    this.saveToDB._Save(updateData, function() {});
};

module.exports.prototype.Comment = function(value, item) {
    console.log('comment', value, item);

    var updateData = {
        model: this.timline_name,
        query: {
            social_id: value.channelId,
            id: value.videoId,
            channel: 'youtube'
        },
        update: {
            publish_type: 'publish',
            $addToSet: {
                'comment_info': {
                    $each: [{
                        video_id: item.id,
                        id: item.from.id,
                        name: item.from.name,
                        picture: item.from.picture,
                        message: item.message,
                        created_time: item.published
                    }],
                    $sort: {
                        created_time: 1
                    },
                    $slice: -5
                }
            }

        }
    };
    this.saveToDB._Save(updateData, function() {});
};
