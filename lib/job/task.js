'use strict';

/**
* Worker Publish 
*
* 작업 스케줄러 Agenda를 이용하여 처리함 
* Adenda는 기본적으로 Mongodb를 이용한 스케줄러 처리
*/
var Agenda = require('agenda');

module.exports = function(config) {
    config.schedularDB = 'schedular';
	this.agenda = new Agenda({
		db: {
			address: config.mongoPath,
			collection: config.schedularDB
		}
	});
};

module.exports.prototype.Add = function(value) {
    this.agenda.schedule(value.humanTime, value.taskName, value.data);
};

module.exports.prototype.Cancel = function(value, callback) {
    this.agenda.cancel(value, function(err, numRemoved){
        callback(err, numRemoved);
    });
};

module.exports.prototype.Now = function(value) {
    this.agenda.now(value.taskName, value.data);
};