'use strict';

var _ = require('lodash');

module.exports = function() {
	this.vName = [];
};

module.exports.prototype.Start = function(name) {
	var isMatch = false;
	_.each(this.vName, function(info) {
		if(info.name === name) {
			info.start = process.hrtime();
			isMatch = true;
		}
	});
	if(!isMatch) {
		this.vName.push({name:name, start:process.hrtime()});
	}
};

module.exports.prototype.End = function(name, callback) {
	_.each(this.vName, function(val) {
		if(val.name === name) {
			var start = val.start;
			var precision = 3; 
		    var elapsed = process.hrtime(start)[1] / 1000000; 
		    var message = "서비스 " + name + " execute time : " + process.hrtime(start)[0] + "s, " + elapsed.toFixed(precision) + "ms - "; 
		    callback(message);
		}
	});
};