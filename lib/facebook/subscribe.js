'use strict';

var FB = require('fb'),
	util = require('util'),
	events = require('events'),
	async = require('async'),
	_ = require('lodash'),
	url = require('url'),
	Repository = require('../repository'),
	Amqp = require('../amqp');

module.exports = function(config, db) {
	events.EventEmitter.call(this);

	this.config = config.socialAuth.facebook;
	this.amqpTask = new Amqp.Task(config);
	this.saveToFacebook = new Repository.Facebook(db);
};

util.inherits(module.exports, events.EventEmitter);
module.exports.prototype.EventCall = function(req) {
	var that = this;

	if(_.isUndefined(req.body.object) || _.isUndefined(req.body.entry)) {	
		return;
	}
	
	_.each(req.body.entry, function(val) {
		_.each(val.changes, function(change) {
			that.saveToFacebook.SubscribeEvent(req, change, val, function() {
				var message = {};
				if(val.id && change.value && change.value.parent_id) {
					log.info('SubscribeEvent', val, change);
					message = {
						queue_name: 'FACEBOOK_SUBSCRIBE_EVENT_REQUEST',
						source_id: val.id,
						post_id: change.value.parent_id
					};
					that.amqpTask.PublishQueue(message, 'FACEBOOK_SUBSCRIBE_EVENT_REQUEST');
					log.info('SUBSCRIBE EVENT INVOKE _PublishQueue', message);
				} else if(val.id && change.value && change.value.post_id) {
					log.info('SubscribeEvent', val, change);
					message = {
						queue_name: 'FACEBOOK_SUBSCRIBE_EVENT_REQUEST',
						source_id: val.id,
						post_id: change.value.post_id
					};
					that.amqpTask.PublishQueue(message, 'FACEBOOK_SUBSCRIBE_EVENT_REQUEST');
					log.info('SUBSCRIBE EVENT INVOKE _PublishQueue', message);
				} else {
					log.error('SubscribeEvent', val, change);
				}
			});
		});
	});
};

module.exports.prototype.SetSubscribe = function(val) {
	var that = this;

	async.series(
        [
            that._getAccount(val),
            that._registerPageTabs(val),
            that._delSubscribeUser(val),
            that._delSubscribePage(val),
            that._registerSubscribeEvent(val),
            that._getSubscribeStatus(val)
        ],
        function(err, result) {
            return that.emit('SUBSCRIBE', result);
        }
    );
};

module.exports.prototype.Verify = function(req, callback) {
	var that = this;

    var url_parts = url.parse(req.url,true);
    var query = url_parts.query;
    if (query.hasOwnProperty('hub.verify_token')) {
        if (query['hub.verify_token'] === 'testFbsub') {
            log.info('Verified!');
            callback(query['hub.challenge']);
            return that.emit('VERIFIED', query['hub.challenge']);
        }
    }
    return that.emit('VERIFIED', null);
};

module.exports.prototype._getAccount = function(val) {
	var that = this;

	return function(done) {
		FB.api('me/accounts', {
			access_token: val.access_token
		}, function(result) {
			that.datas = result;
			done();
		});
	};
};

module.exports.prototype._registerPageTabs = function(val) {
	var that = this;

	return function(done) {
		if(!that.datas.data) {
			return done();
		}
		var length = that.datas.data.length;
		_.each(that.datas.data, function(data) {
			var url = '/' + data.id + '/tabs';
			FB.api(url, 'post', {
				app_id: val.app_id,
				access_token: data.access_token
			}, function() {
				length--;
				if(length === 0) {
					done();
				}
			});
		});
	};
};

module.exports.prototype._delSubscribeUser = function(val) {
	return function(done) {
		log.info('_delSubscribeUser');
		var url = val.app_id + '/subscriptions';
		log.info('_delSubscribeUser', url);
		FB.api(url, 'delete', {
            object: 'user',
            access_token: val.app_token
		}, function() {
			done();
        });
	};
};

module.exports.prototype._delSubscribePage = function(val) {
	return function(done) {
		log.info('delSubscribeUser');
		var url = val.app_id + '/subscriptions';
		log.info('delSubscribeUser', url);
        FB.api(url, 'delete', {
            object: 'page',
            access_token: val.app_token
        }, function() {
			done();
        });
	};
};

module.exports.prototype._registerSubscribeEvent = function(val) {
	var that = this;

	return function(done) {
		log.info('_registerSubscribeEvent', that.config.subscribUrl);
		var url = val.app_id + '/subscriptions';
		log.info('_registerSubscribeEvent', url);
		FB.api(url, 'post', {
			callback_url: that.config.subscribUrl,
			object: 'page',
			fields: 'feed',
			verify_token: 'testFbsub',
			access_token: val.app_token
		}, function() {
			done();
        });
	};
};

module.exports.prototype._getSubscribeStatus = function(val) {
	return function(done) {
		log.info('_getSubscribeStatus');
		var url = val.app_id + '/subscriptions';
		log.info('_getSubscribeStatus', url);
		FB.api(url, {
            access_token: val.app_token
        }, function() {
			done();
        });
	};
};

