'use strict';

var events = require('events'),
    amqp = require('amqplib'),
    when = require('when');

module.exports = function(config) {
    events.EventEmitter.call(this);
    this.config = config;
    this.limit = 2000;
    this.delayQueue = [];
};

module.exports.prototype.Publish = function(options) {
    var self = this;

    amqp.connect(this.config.rabbitmqUrl).then(function(conn) {
        return when(conn.createChannel().then(function(ch) {
            var q = options.queueName;
            var ok = ch.assertQueue(q, {durable: true});

            return ok.then(function() {
                ch.sendToQueue(q, new Buffer(JSON.stringify(options.message)), {deliveryMode: true});
                return ch.close();
            });
        })).ensure(function() { conn.close(); self.restartPublish(); });
    }).then(null, console.warn);
};

module.exports.prototype.testCon = function() {
    console.log('called conn.close after');
};

module.exports.prototype.PublishQueue = function(message, queue_name) {

    if(this.delayQueue.length <= this.limit) {
        message.queue_name = queue_name;
        var options = {
            queueName: queue_name,
            message: message
        };

        this.Publish(options);
    }else {
        console.log('queue size over 4000 '.red);
        this.delayQueue.push({message:message, queue_name:queue_name});
    }

    // message.queue_name = queue_name;
    // var options = {
    //     queueName: queue_name,
    //     message: message
    // };

    // this.Publish(options);
};

module.exports.prototype.restartPublish = function() {
    var publish = this.delayQueue.pop();

    if( publish !== undefined ){
        publish.message.queue_name = publish.queue_name;

        var options = {
            queueName:publish.queue_name,
            message:publish.message
        };

        console.log('delay queue restart '.red, options);
        this.Publish(options);
    }
};