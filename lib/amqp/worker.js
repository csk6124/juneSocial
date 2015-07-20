'use strict';

var events = require('events');

module.exports = function(config) {
    events.EventEmitter.call(this);
    this.config = config;
};

module.exports.prototype.Init = function() {
    var that = this;

    this.amqp = require('amqplib').connect(that.config.rabbitmqUrl); 
};

module.exports.prototype.AddWork = function(queue_name, callback) {
    var amqp = this.amqp;
    amqp.then(function(conn) {
        return conn.createChannel().then(function(ch) {
            var ok = ch.assertQueue(queue_name, {durable: true})
                .then(function(qok) { return qok.queue; });

            ok = ok.then(callback(ch));
        });
    }).then(null, console.warn);

};