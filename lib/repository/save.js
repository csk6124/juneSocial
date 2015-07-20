'use strict';

module.exports = function(db) {
    this.db = db;
};

module.exports.prototype._Save = function(object, callback) {
    var self = this;
    if(object.type !== undefined && object.type === 'youtube') {
        if(object.model === 'YoutubeAnalaytics'){
            log.error('query : ', object.query);
            log.error('update : ', object.update);
        }
        this.db[object.model].findOne({
            page_id : object.query.page_id,
            date : object.query.date,
            user_id : object.query.user_id
        }, function(err, statics){
            if(err){
                log.error('Error :', err);
                return;
            }

            if(statics){
                if(statics.activity_ids.indexOf(object.postId) < 0) {
                    statics.activity_ids= [object.postId];
                    statics.youtube.comment++;

                    statics.save(function(err){
                        if(err){
                            log.error('statics.save Error :', err);
                            return;
                        }

                        callback(err, true);
                    });
                }

            }else {
                var temp = {
                    page_id : object.query.page_id,
                    date : object.query.date,
                    user_id : object.query.user_id,
                    youtube: {comment:1},
                    activity_ids:[object.postId]
                };

                self.db[object.model].create(temp, function(err){
                    if(err){
                        log.error('satics.save Error :', err);
                        return;
                    }
                    callback(err, true);
                });

            }
        });
    }else {
        this.db[object.model].update(
            object.query,
            object.update,
            {upsert: true, safe: true}
            ,function(err, res) {
            callback(err, res);

            if(err) {
                log.error('save Error :', err);
                return;
            }
        });
    }
};