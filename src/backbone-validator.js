var _ = require("underscore"),
    Backbone = require("backbone");

/** @class*/
var InterdependentTaskSeriesBuilder = function (taskStore) {
    this.taskStore = taskStore;
};
InterdependentTaskSeriesBuilder.prototype = {
    createTasks:function (config) {
        var tasks = {};
        _.each(config, function (params, key) {
            this.appendIfNotContained(key, tasks);
        }, this);
        return tasks;
    },
    appendIfNotContained:function (key, tasks) {
        if (key in tasks)
            return;
        if (!(key in this.taskStore))
            throw new SyntaxError("Task " + key + " is not registered.");
        _.each(this.dependencies(key), function (key) {
            this.appendIfNotContained(key, tasks);
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
var AsyncSeriesTaskRunner = function (tasks, config) {
    this.config = config || {};
    this.id = 0;
    this.running = {};
    this.series = _.reduceRight(tasks, function (wrappedTasks, task, key) {
        return function (iterator) {
            if (!(iterator.id in this.running))
                return;
            iterator.done = function (error, result) {
                if (!(iterator.id in this.running))
                    return;
                this.trigger("done", key, result, iterator);
                if (error) {
                    delete(this.running[iterator.id]);
                    this.trigger("error", key, error, iterator);
                }
                else
                    wrappedTasks.call(this, iterator);
            }.bind(this);
            iterator.config = this.config[key];
            task.call(iterator);
        }.bind(this);
    }, function (iterator) {
        delete(this.running[iterator.id]);
        this.trigger("end", iterator);
    }, this);
};
AsyncSeriesTaskRunner.prototype = {
    iterator:function (params) {
        var iterator = {};
        if (params)
            _.extend(iterator, params);
        iterator.id = ++this.id;
        iterator.run = this.run.bind(this, iterator);
        iterator.stop = this.stop.bind(this, iterator);
        iterator.stopAll = this.stopAll.bind(this);
        return iterator;
    },
    run:function (iterator) {
        iterator.id = ++this.id;
        this.running[iterator.id] = iterator;
        this.trigger("start", iterator);
        this.series(iterator);
    },
    stop:function (iterator) {
        if (!iterator.id in this.running)
            return
        delete(this.running[iterator.id]);
        this.trigger("abort", iterator);
    },
    stopAll:function () {
        var aborted = this.running;
        this.running = {};
        _.each(aborted, function (iterator, id) {
            this.trigger("abort", iterator);
        }, this);
    }
};
_.extend(AsyncSeriesTaskRunner.prototype, Backbone.Events);

/** @class*/
var AttributeValidatorProvider = function (tests, checks) {
    this.tests = tests;
    this.checks = checks;
};
AttributeValidatorProvider.prototype = {
    createValidator:function (config) {
        return new AttributeValidator(this.createRunner(config));
    },
    createRunner:function (config) {
        var tasks = this.createTasks(config)
        this.checkConfig(tasks, config);
        return new AsyncSeriesTaskRunner(tasks, config);
    },
    createTasks:function (config) {
        if (!this.tasksBuilder)
            this.tasksBuilder = new InterdependentTaskSeriesBuilder(this.tests);
        return this.tasksBuilder.createTasks(config);
    },
    checkConfig:function (tasks, config) {
        if (this.checks)
            _.each(tasks, function (task, key) {
                if (key in this.checks)
                    this.checks[key].call(config, config[key], key);
            });
    }
};


/** @class*/
var AttributeValidator = Backbone.Model.extend({
    constructor:function (taskRunner) {
        this.taskRunner = taskRunner;
        this.taskRunner.on("start", function (iterator) {
            this.iterator = iterator;
        }, this);
        this.taskRunner.on("abort", function (iterator) {
            iterator.validator.clear();
        }, this);
        this.taskRunner.on("error", function (key, error, iterator) {
            iterator.validator.set(key, {error:error});
            if (iterator.callback instanceof Function)
                iterator.callback(false);
        }, this);
        this.taskRunner.on("done", function (key, passed, iterator) {
            if (typeof(passed) == "boolean")
                iterator.validator.set(key, passed);
        }, this);
        this.taskRunner.on("end", function (iterator) {
            if (iterator.callback instanceof Function)
                iterator.callback(
                    _.all(iterator.validator.attributes, function (passed) {
                        return passed === true;
                    })
                );
        }, this);
        Backbone.Model.call(this);
    },
    check:function (value, callback) {
        if (this.iterator)
            this.iterator.stop();
        this.taskRunner.run({
            value:value,
            validator:this,
            callback:callback
        });
    }
});


module.exports = {
    InterdependentTaskSeriesBuilder:InterdependentTaskSeriesBuilder,
    AsyncSeriesTaskRunner:AsyncSeriesTaskRunner,
    install:function (pack) {

    }
};