var _ = require("underscore"),
    Backbone = require("backbone");

/** @class*/
var TaskListBuilder = function (taskStore) {
    this.taskStore = taskStore;
};
TaskListBuilder.prototype = {
    createTaskList:function (config) {
        var tasks = {};
        _.each(config, function (params, key) {
            this.appendIfNecessary(key, tasks);
        }, this);
        return tasks;
    },
    appendIfNecessary:function (key, tasks) {
        if (key in tasks)
            return;
        if (!(key in this.taskStore))
            throw new SyntaxError("The " + key + " is not a registered task.");
        _.each(this.dependencies(key), function (key) {
            this.appendIfNecessary(key, tasks);
        }, this);
        tasks[key] = this.task(key);
    },
    dependencies:function (key) {
        var record = this.taskStore[key];
        if (record instanceof Array)
            return record.slice(0, -1);
        else
            return [];
    },
    task:function (key) {
        var record = this.taskStore[key];
        if (record instanceof Array)
            return record[record.length - 1];
        else
            return record;
    }
};

/** @class*/
var TaskRunner = function (tasks, config, context) {
    this.config = config || {};
    this.context = context || this;
    this.id = 0;
    this.running = {};
    this.taskRunner = _.reduceRight(tasks, this.wrapTaskSeries, this.end, this);
};
TaskRunner.prototype = {
    run:function (value) {
        ++this.id;
        this.start(value, this.id);
    },
    start:function (value, id) {
        this.running[this.id] = true;
        this.trigger("start");
        this.taskRunner(value, id);
    },
    wrapTaskSeries:function (wrappedTasks, task, key) {
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
    },
    end:function (value, id) {
        this.running[id] = false;
        this.trigger("end");
    },
    abort:function () {
        this.running = {};
        this.trigger("abort");
    }
};
_.extend(TaskRunner.prototype, Backbone.Events);

module.exports = {
    TaskListBuilder:TaskListBuilder,
    TaskRunner:TaskRunner
};