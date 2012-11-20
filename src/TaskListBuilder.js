var _ = require("underscore");

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

module.exports = TaskListBuilder;