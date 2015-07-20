'use strict';

var _ = require('lodash'),
	Save = require('./save');

module.exports = function(db) {
	this.saveToDB = new Save(db);
	this.timline_name = 'Publish';
};

module.exports.prototype.SubscribeEvent = function(req, change, val, callback) {
	callback();

};

module.exports.prototype.PageInsight = function(value, v, callback) {
	var updateData = {
		model: 'FacebookAnalytics',
		query: {
			source_id: value.source_id,
			day: new Date(v.day)
		},
		update: v
	};
	this.saveToDB._Save(updateData, callback);
};

module.exports.prototype.UpdatePostId = function(_id, post_id, callback) {
	var updateData = {
		model: this.timline_name,
		query: {
			_id: _id
		},
		update: {
			id: post_id,
			publish_type: 'publish'
		}
	};
	this.saveToDB._Save(updateData, callback);
};

module.exports.prototype.PostInsight = function(value, statistics, callback) {
	var updateData = {
		model: this.timline_name,
		query: {
			id: value.feed_id,
			channel: 'facebook'
		},
		update: {
			$set: {
				'statistics.post_engaged_users': statistics.post_engaged_users,
				'statistics.post_consumptions_by_type': statistics.post_consumptions_by_type,
				'statistics.post_impressions_unique': statistics.post_impressions_unique,
				'statistics.post_stories_by_action_type': statistics.post_stories_by_action_type,
				'statistics.post_negative_feedback_by_type': statistics.post_negative_feedback_by_type,
				'statistics.post_impressions_paid_unique': statistics.post_impressions_paid_unique,
				'statistics.post_impressions_organic_unique': statistics.post_impressions_organic_unique,
				'statistics.post_impressions_viral_unique': statistics.post_impressions_viral_unique,
				'statistics.post_impressions_fan_unique': statistics.post_impressions_fan_unique,
				'statistics.post_video_views_organic': statistics.post_video_views_organic,
				'statistics.post_video_views_paid': statistics.post_video_views_paid,
				'statistics.post_storytellers_by_action_type': statistics.post_storytellers_by_action_type
			}
		}
	};
	this.saveToDB._Save(updateData, callback);
};

module.exports.prototype.PostFeed = function(value, data, callback) {
	log.error('data in PostFeed', data);
	var updateData = {
		model: this.timline_name,
		query: {
			id: data.id,
			social_id: value.source_id,
			channel: 'facebook'
		},
		update: {
			publish_type: 'publish',
			created_time: data.created_time,
			publish_time: data.created_time,
			updated_time: data.updated_time,
			user: data.from
		}
	};
	if(data.message) {
		updateData.update.message = data.message;
	}
	if(data.picture) {
		updateData.update.picture = data.picture;
	}

	var likeCount  = 0;
	var commentCount  = 0;
	var shareCount  = 0;
	if(data.comments && data.comments.data) {
		commentCount = data.comments.data.length;
		updateData.update.comment_info = [];
		_.each(data.comments.data, function(comment) {
			updateData.update.comment_info.push({
				picture: comment.from.picture.data.url,
				name: comment.from.name,
				message: comment.message,
				like_count: comment.like_count,
				user_likes: comment.user_likes,
				created_time: comment.created_time,
				comment_id: comment.id,
				id:comment.from.id
			});
		});
	}
	if(data.likes && data.likes.data) {
		likeCount = data.likes.data.length;
		updateData.update.like_info = [];
		_.each(data.likes.data, function(like) {
			console.log('realtime update >>>>');
			log.error(like);
			updateData.update.like_info.push({
				id: like.id,
				picture: like.pic
			});
		});
	}
	if(data.shares && data.shares.data) {
		shareCount = data.shares.data.length;
		updateData.update.share_info = data.shares.data;
	}
	_.extend(updateData.update, {
		$set: {
			'statistics.likeCount': likeCount,
			'statistics.commentCount': commentCount,
			'statistics.shareCount': shareCount
		}
	});

	this.saveToDB._Save(updateData, callback);
};

module.exports.prototype.PostPhoto = function(value, data, callback) {
	var updateData = {
		model: this.timline_name,
		query: {
			id: value.id,
			social_id: value.source_id,
			channel: 'facebook'
		},
		update: {
			publish_type: 'publish'
		}
	};

	// TODO 썸네일 이미지가 필요할지 여부
	if(data.images && data.images.length > 0){
		updateData.update.picture = data.images[0].source;
	}
	log.info('Photo Info ', updateData);
	this.saveToDB._Save(updateData, callback);
};

module.exports.prototype.PostVideo = function(value, data, callback) {
	log.error('Post Video value : ', value);
	log.error('Post Video data : ', data);
	var updateData = {
		model: this.timline_name,
		query: {
			id: value.id,
			social_id: value.source_id,
			channel: 'facebook'
		},
		update: {
			publish_type: 'publish'
		}
	};

	// TODO 썸네일 이미지가 필요할지 여부
	if(data.embed_html){
		updateData.update.video = data.embed_html;
	}
	log.info('Video Info ', updateData);
	this.saveToDB._Save(updateData, callback);
};

module.exports.prototype.Feed = function(value, data, album_id) {
	var updateData = {
		model: this.timline_name,
		query: {
			id: data.id,
			social_id: value.source_id,
			channel: 'facebook'
		},
		update: {
			publish_type: 'publish',
			created_time: data.created_time,
			publish_time: data.created_time,
			updated_time: data.updated_time
		}
	};
	var likeCount = 0,
		commentCount = 0,
		shareCount = 0;

	if(data.picture) {
		updateData.update.picture = data.picture;
	}
	if(data.message) {
		updateData.update.message = data.message;
	}
	if(data.from) {
		updateData.update.user = data.from;
	}
	if(data.link) {
		updateData.update.link = data.link;
	}
	if(data.type) {
		updateData.update.type = data.type;
	}
	if(data.status_type) {
		updateData.update.status_type = data.status_type;
	}
	if(album_id && album_id.length > 0) {
		updateData.update.album_id = album_id[1];
	}
	if(data.likes && data.likes.summary && data.likes.summary.total_count) {
		likeCount = data.likes.summary.total_count;
		if(!data.likes.hasOwnProperty('data')) {
			return;
		}
		updateData.update.like_info = [];
		_.each(data.likes.data, function(like) {
			updateData.update.like_info.push({
				id: like.id,
				picture: like.pic
			});
		});
	}

	if(data.comments && data.comments.summary && data.comments.summary.total_count) {
		commentCount = data.comments.summary.total_count;
		if(!data.comments.hasOwnProperty('data')) {
			return;
		}
		updateData.update.comment_info = [];
		_.each(data.comments.data, function(comment) {
			updateData.update.comment_info.push({
				picture: comment.from.picture.data.url,
				name: comment.from.name,
				message: comment.message,
				like_count: comment.like_count,
				user_likes: comment.user_likes,
				created_time: comment.created_time,
				comment_id: comment.id,
				id:comment.from.id
			});
		});
	}

	if(data.shares && data.shares.count) {
		shareCount = data.shares.count;
		updateData.update.share_info = data.shares;
	}
	_.extend(updateData.update, {
		$set: {
			'statistics.likeCount': likeCount,
			'statistics.commentCount': commentCount,
			'statistics.shareCount': shareCount
		}
	});

	this.saveToDB._Save(updateData, function() {});
};

module.exports.prototype.SubFeedActivity = function(value, data, post_id) {
	var updateData = {
		model: 'FacebookActivities',
		query: {
			source_id: value.source_id,
			feed_id: post_id,
			id: data.id
		},
		update: {
			type: value.type
		}
	};

	switch(value.type) {
		case 'Comment':
			updateData.update.user_id = data.from.id;
			updateData.update.name = data.from.name;
			updateData.update.picture = data.from.picture.data.url;
			updateData.update.message = data.message;
			updateData.update.like_count = data.like_count;
			updateData.update.user_likes = data.user_likes;
			updateData.update.created_time = data.created_time;
			break;
		case 'Like':
			updateData.update.user_id = data.id;
			updateData.update.name = data.name;
			updateData.update.picture = data.pic;
			break;
	}
	this.saveToDB._Save(updateData, function() {});
};

module.exports.prototype.SubFeed = function(value, data, post_id) {
	var updateData = {
		model: this.timline_name,
		query: {
			id: post_id,
			social_id: value.source_id,
			channel: 'facebook'
		}
	};
	if(value.type === 'Comment') {
		updateData.query['comment_info.id'] = {
			$ne: data.id
		};
		updateData.update = {
			publish_type: 'publish',
			$push: {
				'comment_info': {
					$each: [{
						id: data.id,
						user_id: data.from.id,
						name: data.from.name,
						picture: data.from.picture.data.url,
						message: data.message,
						like_count: data.like_count,
						user_likes: data.user_likes,
						created_time: data.created_time
					}],
					$sort: {
						created_time: 1
					},
					$slice: -5
				}
			}
		};
	} else if(value.type === 'Like') {
		updateData.query['like_info.id'] = {
			$ne: data.id
		};
		updateData.update = {
			publish_type: 'publish',
			$push: {
				'like_info': {
					$each: [{
						id: data.id,
						picture: data.pic,
					}],
					$slice: -5
				}
			}
		};
	}
	this.saveToDB._Save(updateData, function() {});
};

module.exports.prototype.Album = function(value, data) {
	var updateData = {
		model: 'FacebookAlbums',
		query: {
			id: data.id,
			source_id: value.source_id
		},
		update: data
	};
	this.saveToDB._Save(updateData, function() {});
};

module.exports.prototype.Photo = function(value, data) {
	var updateData = {
		model: 'FacebookPhotos',
		query: {
			album_id: value.album_id,
			source_id: value.source_id,
			id: data.id
		},
		update: data
	};
	this.saveToDB._Save(updateData, function() {});
};

module.exports.prototype.Cursor = function(value, val, cursorInfo, cursor) {
	var updateData = {
		model: this.timline_name,
		query: {
			id: val.post_id,
			social_id: value.source_id,
			channel: 'facebook'
		},
		update: {
			publish_type: 'publish'
		}
	};
	if(value.type === 'Like') {
		updateData.update.like_cursor = val.paging.cursors.before;
	} else if(value.type === 'Comment') {
		updateData.update.comment_cursor = val.paging.cursors.before;
	}
	if(	value.type === 'Like' && cursorInfo.cursor >= cursor || cursorInfo.cursor === '') {
		this.saveToDB._Save(updateData, function() {});
	} else if(value.type === 'Comment' && cursorInfo.cursor >= cursor  || cursorInfo.cursor === '') {
		this.saveToDB._Save(updateData, function() {});
	}
};
