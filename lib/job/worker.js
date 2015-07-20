'use strict';

var _ = require('lodash'),
    Agenda = require('agenda'),
    Post = require('./post');

module.exports = function(config, db) {
    this.db = db;
    config.schedularDB = 'schedular';
    this.post = new Post(config,db);
    this.agenda = new Agenda({
        db: {
            address: config.mongoPath,
            collection: config.schedularDB
        }
    });
};

module.exports.prototype.Run = function() {
    var that = this;

    var work = function(job, done) {
        var data = job.attrs.data;
        log.info('>>>>>>>>>>>>>>>>> job invoke', data);

        that.db.Publish.findOne({
            _id: data._id
        }, function(err, publish) {
            console.log('publish find', err, publish);
            if(err || publish === null) {
                log.error('worker publish occur error while publish.findOne',err);
                return done();
            }
            if(_.isNull(publish)) {
                return;
            }

            var find = _.find(publish.appr_user_list, {value:true});
            var goPublish = false;
            if(_.isUndefined(find)){
                if(publish.any_user_approv){
                    goPublish = true;
                }else {
                    find = _.find(publish.appr_user_list, {value:false});
                    if(_.isUndefined(find)) {
                        goPublish = true;
                    }
                }
            }

            console.log('goPublish', goPublish);
            if(!goPublish){
                if(publish.nowPost) {
                    goPublish = true;
                }
            }
            if(goPublish){
                that.post.Publish(data, function() {
                    done();
                });
            }
        });
    };
    this.agenda.define('publish social post', work);
    this.agenda.start();
};



