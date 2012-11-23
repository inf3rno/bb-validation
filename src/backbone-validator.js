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
var AsyncSeriesTaskRunner = function (tasks, config, context) {
    this.config = config || {};
    this.context = context || this;
    this.id = 0;
    this.running = {};
    this.taskRunner = _.reduceRight(tasks, this.wrapTaskSeries, this.end, this);
};
AsyncSeriesTaskRunner.prototype = {
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
            task.call(this.context, done, value, this.config[key]);
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
_.extend(AsyncSeriesTaskRunner.prototype, Backbone.Events);

/** @class*/
var AttributeValidatorProvider = function (tests, checks) {
    this.tests = tests;
    this.checks = checks;
};
AttributeValidatorProvider.prototype = {
    createValidator:function (config) {
        this.checkConfig(config);
        var validator = new AttributeValidator();
        validator.configure(this.createRunner(config, validator));
        return validator;
    },
    checkConfig:function (config) {
        if (this.checks)
            _.each(config, function (param, key) {
                if (key in this.checks)
                    this.checks[key].call(config, param, key);
            });
    },
    createRunner:function (config, validator) {
        return new AsyncSeriesTaskRunner(
            this.createTasks(config),
            config,
            validator
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
    configure:function (taskRunner) {
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
    },
    check:function (value, callback) {
        this.taskRunner.abort();
        this.callback = callback;
        this.taskRunner.run(value);
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