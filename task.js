#!/usr/bin/env node

var amqp = require('amqplib');
var when = require('when');
var argv = require('optimist').alias('m', 'mode').default('mode', 'local').usage('Usage: $0 --mode [mode name]').argv;
var Config = require('./test/config');
var config = new Config(argv.mode);

var type = '';
process.argv.forEach(function(val, index, array) {
  if(index === 2) {
    type = val;
  }
});

console.log(config.rabbitmqUrl);

amqp.connect(config.rabbitmqUrl).then(function(conn) {
  return when(conn.createChannel().then(function(ch) {
    var q;
    var message = {};

    console.log(type)
    if(type === 'facebook') {
      q = 'FACEBOOK_FEED_REQUEST';
      message = {
        queue_name: 'FACEBOOK_FEED_REQUEST',
        source_id: "173730942820612"
      };
    } else if( type === 'subscribe_fb'){
      q = 'FACEBOOK_SUBSCRIBE_EVENT_REQUEST';
      message = {
        queue_name: 'FACEBOOK_SUBSCRIBE_EVENT_REQUEST',
        source_id: "173730942820612",
        post_id: "173730942820612_272532386273800"
      };
    } else if( type === 'fbfeed'){
      q = 'FACEBOOK_FEED_FQL';
      message = {
        queue_name: 'FACEBOOK_FEED_FQL',
        source_id: "310316809030730"
      };
    } else if(type === 'insights') {
      q = 'FACEBOOK_INSIGHTS_PAGE_REQUEST';
      message = {
        queue_name: 'FACEBOOK_INSIGHTS_PAGE_REQUEST',
        id: '102566886578475_353845014783993'
      };
    } else if(type === 'insights_post') {
      q = 'FACEBOOK_INSIGHTS_POST_REQUEST';
      message = {
        queue_name: 'FACEBOOK_INSIGHTS_POST_REQUEST',
        source_id: "102566886578475",
        id: '102566886578475_353845014783993'
      }; 
    } else if(type === 'youtube') {
      q = 'YOUTUBE_ACTIVITIES_REQUEST';
      message = {
        queue_name: 'YOUTUBE_ACTIVITIES_REQUEST',
        channelId: 'UCtVElAKwRZTLP1ei3N0OUIA'
      };
    } else if(type === 'google') {
      q = 'GOOGLEPLUS_FEED_REQUEST';
      message = {
        queue_name: 'GOOGLEPLUS_FEED_REQUEST',
        channelId: 'UCtVElAKwRZTLP1ei3N0OUIA'
      };
    } else if(type === 'twitter') {
      q = 'TWITTER_FEED_REQUEST';
      message = {
        queue_name: 'TWITTER_FEED_REQUEST',
        screen_name: '123772854'
      };
    } else if(type === 'twitter_retweet') {
      q = 'TWITTER_RETWEET_OF_ME_REQUEST';
      message = {
        queue_name: 'TWITTER_RETWEET_OF_ME_REQUEST',
        screen_name: '123772854'
      };
    } else if(type === 'twitter_subscribe') {
      q = 'TWITTER_SUBSCRIBE_REQUEST';
      message = {
        queue_name: 'TWITTER_SUBSCRIBE_REQUEST',
        screen_name: '2484909924'
      };
    } else if(type === 'youtube_ay') {
      q = 'YOUTUBE_ANALYTICS_REQUEST';
      message = {
        queue_name: 'YOUTUBE_ANALYTICS_REQUEST',
        channelId: 'UCtVElAKwRZTLP1ei3N0OUIA',
        videoId: 'TSFBM9jyEDY',
        start: '2014-09-01',
        end: '2014-10-01',
        dimensions: 'month'
      };
    }
    console.log(JSON.stringify(message));
    var ok = ch.assertQueue(q, {durable: true});
    return ok.then(function() {
      ch.sendToQueue(q, new Buffer(JSON.stringify(message)), {deliveryMode: true});
      console.log(" [x] Sent '%s'", message);
      return ch.close();
    });
  })).ensure(function() { conn.close(); });
}).then(null, console.warn);