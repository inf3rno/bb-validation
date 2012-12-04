if (typeof define !== 'function')
    var define = require('amdefine')(module);

define(function (require, exports, module) {
    var _ = require("underscore"),
        Backbone = require("backbone");

    var inherit = Object.create || function (proto) {
        var Surrogate = function () {
            this.constructor = Surrogate;
        };
        Surrogate.prototype = proto;
        return new Surrogate();
    };

    var Model = Backbone.Model.extend({
        constructor:function () {
            Backbone.Model.apply(this, arguments);
            this.validator = new this.Validator(this);
            this.validate(this.attributes);
        },
        validate:function (attributes) {
            return this.validator.run(attributes);
        }
    });

    var Validator = Backbone.Model.extend({
        checks:{},
        tests:{},
        patterns:{},
        constructor:function (model) {
            Backbone.Model.call(this);
            this.model = model;
            this.runners = {};
            _.each(this.model.schema, function (settings, attribute) {
                this.runners[attribute] = new Runner(this, settings, attribute);
            }, this);
            this.on("done", function (attribute, result) {
                this.set(attribute, result);
            });
        },
        run:function (attributes) {
            _.each(this.runners, function (runner, attribute) {
                runner.run();
            }, this);
        }
    }, {
        install:function (pack) {
            if (!pack)
                throw new Error("No install package given.");
            var installable = {checks:true, tests:true, patterns:true};
            _.each(pack, function (addons, property) {
                if (!installable[property])
                    throw new Error("Property " + property + " is not installable.");
                if (this.__super__ && this.prototype[property] === this.__super__[property]) {
                    this.prototype[property] = inherit(this.__super__[property]);
                }
                _.extend(this.prototype[property], addons);
            }, this);
            return this;
        }
    });

    Model.prototype.Validator = Validator;

    var Runner = function (validator, settings, attribute) {
        this.validator = validator;
        this.settings = settings;
        this.attribute = attribute;
        this.tests = {};
        _.each(this.settings, function (config, test) {
            var runTest = this.validator.tests[test];
            if (typeof(runTest) != "function")
                throw new Error("Invalid test name.");
            this.tests[test] = runTest;
        }, this);
    };
    Runner.prototype = {
        run:function () {
            var error;
            var result = false;
            var done = function (err) {
                error = err;
            };
            var runner = {};
            _.all(this.settings, function (config, test) {
                this.tests[test].call(runner, done);
                if (error) {
                    result = {};
                    result[test] = error;
                }
                return !error;
            }, this);
            this.validator.trigger("done", this.attribute, result);
        }
    };

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


    module.exports = {
        Model:Model,
        Validator:Validator,
        Runner:Runner
    };

});