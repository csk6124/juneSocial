'use strict';

var util = require('util'),
	events = require('events'),
	_ = require('lodash'),
	request = require('request'),
	OAuth = require('oauth').OAuth,
	Repository = require('../repository');

module.exports = function(config, db) {
	events.EventEmitter.call(this);

	this.config = config.socialAuth.twitter;
	this.db = db;
	this.saveToDB = new Repository.Save(db);
	this.twitter_auth = new OAuth(
		this.config.request_token_url,
		this.config.access_token_url,
		this.config.consumer_key,
		this.config.consumer_secret,
		"1.0",
		this.config.callback_url,
		this.config.method
	);
};

util.inherits(module.exports, events.EventEmitter);
module.exports.prototype.IsAuthorized = function(id, callback) {
	var that = this;
	
	var query = {
		pageId: id
	};
	that.db.Channel.findOne(query, function(err, result) {
		if(!err) {
			callback(null, result);
		} else {
			callback('None Auth', null);
		}
	});
};

module.exports.prototype.GetAccessTokenUrl = function() {
	var that = this;

    this.twitter_auth.getOAuthRequestToken(function(err, token, token_secret, results){
		var updateData = {
            model: 'Auth',
            method: 'update',
            query: {
                'twitter.consumer_key': that.config.consumer_key,
                'twitter.consumer_secret': that.config.consumer_secret
            },
            update: {
                'twitter.token': token,
                'twitter.token_secret': token_secret
            }
        };
        that.saveToDB._Save(updateData, function() {
			log.info('oauth_token', token, 'oauth_token_secret', token_secret, 'results', results);
			that.emit('ACCESS_TOKEN_URL', 'https://api.twitter.com/oauth/authorize?oauth_token=' + token);
		});
    });
};

module.exports.prototype.GetAccessToken = function(input) {
	var that = this;

	var oauth_verifier = input.oauth_verifier;

	this.db.Auth.findOne({
		'twitter.consumer_key': this.config.consumer_key,
		'twitter.consumer_secret': this.config.consumer_secret
	}, function(err, result) {
		if( _.isNull(result) ||
			_.isNull(result.twitter) ||
			_.isNull(result.twitter.token) ||
			_.isNull(result.twitter.token_secret)) {
			if(err) {
				return that.emit('ERROR',err);
			}
		}
		that.twitter_auth.getOAuthAccessToken(
			result.twitter.token,
			result.twitter.token_secret,
			oauth_verifier
		,function(err, oauth_access_token, oauth_access_token_secret){
			if(err) {
				return that.emit('ERROR',err);
			}

			var url = "https://api.twitter.com/1.1/account/settings.json";
			var oauth = {
				consumer_key: that.config.consumer_key,
				consumer_secret: that.config.consumer_secret,
				token: oauth_access_token,
				token_secret: oauth_access_token_secret
			};
			request.get({url: url, oauth: oauth}, function(err, response, body) {
				body = JSON.parse(body);
				try {
					var updateData = {
						model: 'Auth',
						method: 'update',
						query: {
							'twitter.consumer_key': that.config.consumer_key,
							'twitter.consumer_secret': that.config.consumer_secret
						},
						update: {
							'twitter.screen_name': body.screen_name,
							'twitter.access_token': oauth_access_token,
							'twitter.access_token_secret': oauth_access_token_secret,
							update_time: new Date()
						}
					};
					that.saveToDB._Save(updateData, function() {
						var verify_token = {
							oauth_access_token: oauth_access_token,
							oauth_access_token_secret: oauth_access_token_secret
						};
						that.emit('ACCESS_TOKEN_SAVE', verify_token);
					});
				} catch(e) {
					log.error(e);
					return that.emit('ERROR',e);
				}
			});
		});
	});
};

