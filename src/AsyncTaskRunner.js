var _ = require("underscore"),
    Backbone = require("backbone");

var TaskRunner = function (tasks, config, context) {
    this.config = config || {};
    this.context = context || this;
    this.id = 0;
    this.running = {};
    this.taskRunner = _.reduceRight(tasks, this.wrapTaskSeries, this.end, this);
};
TaskRunner.prototype.run = function (value) {
    ++this.id;
    this.start(value, this.id);
};
TaskRunner.prototype.start = function (value, id) {
    this.running[this.id] = true;
    this.trigger("start");
    this.taskRunner(value, id);
};
TaskRunner.prototype.wrapTaskSeries = function (wrappedTasks, task, key) {
    return function (value, id) {
        if (!(id in this.running))
            return;
        var done = function (error, result) {
            this.trigger("done", key, result);
            if (error) {
                this.running[id] = false;
                this.trigger("error", key, error);
            }
            else
                wrappedTasks.call(this, value, id);
        }.bind(this);
        task.call(this.context, value, this.config[key], done);
    }.bind(this);
};
TaskRunner.prototype.end = function (value, id) {
    this.running[id] = false;
    this.trigger("end");
};
TaskRunner.prototype.abort = function () {
    this.running = {};
    this.trigger("abort");
};
_.extend(TaskRunner.prototype, Backbone.Events);

module.exports = TaskRunner;