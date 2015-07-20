#!/usr/bin/env node

var ServerLib = require('./test/node_modules/hiveTreeServer');
var amqp = require('amqplib');
var when = require('when');
var argv = require('optimist').alias('m', 'mode').default('mode', 'local').usage('Usage: $0 --mode [mode name]').argv;
var Config = require('./test/config');
var config = new Config(argv.mode);
var path = require('path');
var _ = require('lodash');

var type = '';
process.argv.forEach(function(val, index, array) {
    if(index === 2) {
        type = val;
    }
});

var model = new ServerLib.Model(
    config,
    path.join(__dirname, '/node_modules/hiveTreeModel/models/'),
    function() {}
);

var pageList = [];
var pageCount = 0;
var succCnt = 0;

model.Channel.find({pageId: {$ne: null}, name: 'facebook'})
.exec(function (err, channels) {

    _.each(channels, function(channel){
        if(pageList.indexOf(channel.pageId) === -1){
            pageList.push(channel);
        }
    });
    console.log(pageList);

    pageCount = pageList.length;

    _.each(pageList, function(channel){
        amqp.connect(config.rabbitmqUrl).then(function(conn) {
            return when(conn.createChannel().then(function(ch) {
                var q;
                var message = {};

                q = 'FACEBOOK_INSIGHTS_PAGE_REQUEST';
                message = {
                    queue_name: 'FACEBOOK_INSIGHTS_PAGE_REQUEST',
                    id: channel.pageId
                };

                console.log(JSON.stringify(message));
                var ok = ch.assertQueue(q, {durable: true});
                return ok.then(function() {
                    ch.sendToQueue(q, new Buffer(JSON.stringify(message)), {deliveryMode: true});
                    console.log(" [x] Sent '%s'", JSON.stringify(message));
                    succCnt++;
                    if(succCnt === pageCount){
                        process.exit(1);
                    }
                    return ch.close();
                });
            })).ensure(function() { conn.close(); });
        }).then(null, console.warn);
    });
});
