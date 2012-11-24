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
    this.taskRunner = _.reduceRight(tasks, this.wrapTaskSeries, this.end, this);
};
AsyncSeriesTaskRunner.prototype = {
    run:function (value, context) {
        if (!context)
            context = this;
        ++this.id;
        this.start(value, this.id, context);
    },
    start:function (value, id, context) {
        this.running[id] = true;
        this.trigger("start", context);
        this.taskRunner(value, id, context);
    },
    wrapTaskSeries:function (wrappedTasks, task, key) {
        return function (value, id, context) {
            if (!(id in this.running))
                return;
            var done = function (error, result) {
                this.trigger("done", key, result, context);
                if (error) {
                    this.running[id] = false;
                    this.trigger("error", key, error, context);
                }
                else
                    wrappedTasks.call(this, value, id, context);
            }.bind(this);
            task.call(context, done, value, this.config[key]);
        }.bind(this);
    },
    end:function (value, id, context) {
        this.running[id] = false;
        this.trigger("end", context);
    },
    abort:function () {
        this.running = {};
        this.trigger("abort");
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
        this.checkConfig(config);
        return new AttributeValidator(this.createRunner(config));
    },
    checkConfig:function (config) {
        if (this.checks)
            _.each(config, function (param, key) {
                if (key in this.checks)
                    this.checks[key].call(config, param, key);
            });
    },
    createRunner:function (config) {
        return new AsyncSeriesTaskRunner(
            this.createTasks(config),
            config
        );
    },
    createTasks:function (config) {
        if (!this.tasksBuilder)
            this.tasksBuilder = new InterdependentTaskSeriesBuilder(this.tests);
        return this.tasksBuilder.createTasks(config);
    }
};


/** @class*/
var AttributeValidator = Backbone.Model.extend({
    constructor:function (taskRunner) {
        if (this.taskRunner)
            throw new Error("Already configured.");
        this.taskRunner = taskRunner;
        this.taskRunner.on("abort", function () {
            this.clear();
        }, this);
        this.taskRunner.on("error", function (key, error) {
            this.set(key, {error:error});
            if (this.callback instanceof Function)
                this.callback(false);
        }, this);
        this.taskRunner.on("done", function (key, passed) {
            if (typeof(passed) == "boolean")
                this.set(key, passed);
        }, this);
        this.taskRunner.on("end", function () {
            if (this.callback instanceof Function)
                this.callback(
                    _.all(this.attributes, function (passed) {
                        return passed === true;
                    })
                );
        }, this);
        Backbone.Model.call(this);
    },
    check:function (value, callback) {
        this.taskRunner.abort();
        this.callback = callback;
        this.taskRunner.run(value, this);
    }
});

var settings = {
    attributeValidatorProvider:new AttributeValidatorProvider({})
};

module.exports = {
    InterdependentTaskSeriesBuilder:InterdependentTaskSeriesBuilder,
    AsyncSeriesTaskRunner:AsyncSeriesTaskRunner,
    AttributeValidatorProvider:AttributeValidatorProvider,
    AttributeValidator:AttributeValidator,
    install:function (pack) {
        _.extend(settings, pack);
    }
};