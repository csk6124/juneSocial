'use strict';

var _ = require('lodash'),
	ApiWrapper = require('./apiWrapper'),
	Amqp = require('../amqp'),
    Repository = require('../repository');

module.exports = function(config, db) {
	this.amqpTask = new Amqp.Task(config);
	this.ApiWrapper = new ApiWrapper(config, db);
	this.saveToYoutube = new Repository.Youtube(db);
};

module.exports.prototype.Feed = function(value, callback) {
	var that = this;

	var params = {
        userId: 'me',
        collection: 'public',
        maxResults: 100
    };
    if(value.nextPageToken) {
		params.nextPageToken = value.nextPageToken;
    }
	this.ApiWrapper._APICall(value.channelId, 'feed', params, function(err, response) {
		if(err) {
			log.error('APICall Feed', err);
			return callback(false);
		}

		var message = {
			result: response,
			channelId: value.channelId,
			userId: value.userId
		};
		that.amqpTask.PublishQueue(message, 'GOOGLEPLUS_FEED_PARSE');
		return callback(true);
	});
};

module.exports.prototype.FeedSub = function(value, callback) {
	var that = this;

	var params = {
        activityId: value.activityId,
        maxResults: 100
    };
    if(value.type === 'like') {
    	params.collection = 'plusoners';
    } else if(value.type === 'share') {
    	params.collection = 'resharers';
    }

    if(value.nextPageToken) {
    	params.nextPageToken = value.nextPageToken;
    }
	this.ApiWrapper._APICall(value.channelId, value.type, params, function(err, response) {
		if(err) {
			log.error('APICall FeedSub', err);
			return callback(false);
		}
		
		var message = {
			result: response,
			channelId: value.channelId,
			activityId: value.activityId,
			actor_id: value.actor_id,
			source_id: value.source_id,
			type: value.type
		};
		that.amqpTask.PublishQueue(message, 'GOOGLEPLUS_SUBFEED_PARSE');
		return callback(true);
	});
};

module.exports.prototype.FeedParse = function(value) {
	var that = this;

	var message = {};
	var activityId = null;
	_.each(value.result.items, function(item) {
		if(item.verb === 'post') {
			var updateData = {
				model: 'GooglePlusContents',
				query: {id: item.id, actor_id: value.userId},
				update: item
			};
			updateData.update.created_time = item.published;
			updateData.update.updated_time = item.updated;
			//that._Save(updateData, function() {});

			var regex = /https\:\/\/www\.googleapis\.com\/plus\/v1\/activities\/(\w*)/;
			if(item.object.replies.totalItems > 0) {
				activityId = item.object.replies.selfLink.match(regex);
				if(activityId && activityId.length > 0) {
					message = {
						type: 'comment',
						channelId: value.channelId,
						activityId: activityId[1],
						actor_id: value.userId,
						source_id: item.id
					};
					that.amqpTask.PublishQueue(message, 'GOOGLEPLUS_SUBFEED_REQUEST');
				}
			}
			if(item.object.plusoners.totalItems > 0) {
				activityId = item.object.plusoners.selfLink.match(regex);
				if(activityId && activityId.length > 0) {
					message = {
						type: 'like',
						channelId: value.channelId,
						activityId: activityId[1],
						actor_id: value.userId,
						source_id: item.id
					};
					that.amqpTask.PublishQueue(message, 'GOOGLEPLUS_SUBFEED_REQUEST');
				}
			}
			if(item.object.resharers.totalItems > 0) {
				activityId = item.object.resharers.selfLink.match(regex);
				if(activityId && activityId.length > 0) {
					message = {
						type: 'share',
						channelId: value.channelId,
						activityId: activityId[1],
						actor_id: value.userId,
						source_id: item.id
					};
					that.amqpTask.PublishQueue(message, 'GOOGLEPLUS_SUBFEED_REQUEST');
				}
			}
		}
	});

	if(value.result.nextPageToken) {
		message = {
			userId: value.userId,
			nextPageToken : value.result.nextPageToken
		};
		that.amqpTask.PublishQueue(message, 'GOOGLEPLUS_FEED_REQUEST');
	} else {
		log.info('END Feed');
	}
};

module.exports.prototype.FeedSubParse = function(value) {
	var that = this;

	_.each(value.result.items, function(item) {
		console.log('FeedSubParse', value);
		var insertActivities = function(item) {
			var updateData = {
				model: 'YoutubeActivities',
				query: {
					id: item.id,
					source_actor_id: value.actor_id,
					source_id: value.source_id
				}
			};
			switch(value.type) {
				case 'comment':
					updateData.update = item;
					break;
				case 'like':
					updateData.update = item;
					break;
				case 'share':
					updateData.update = {
						actor: item,
						kind: value.result.kind
					};
					break;
			}
			updateData.created_time = item.published;
			updateData.updated_time = item.updated;
		};

		var updateContents = function(item) {
			if(value.type === 'comment') {
				var updateData = {
					model: 'GooglePlusContents',
					query: {
						actor_id: value.actor_id,
						id: value.source_id
					},
					update: {
						$addToSet: {
							'object.replies.users': item
						},
						created_time: item.published,
						updated_time: item.updated
					}
				};
			}
		};
		updateContents(item);
		insertActivities(item);
	});
	if(value.result.nextPageToken) {
		var message = {
			type: value.type,
			activityId: value.activityId,
			actor_id: value.actor_id,
			source_id: value.source_id,
			nextPageToken : value.result.nextPageToken
		};
		that.amqpTask.PublishQueue(message, 'GOOGLEPLUS_SUBFEED_REQUEST');
	} else {
		log.info('END SubFeed');
	}
};

