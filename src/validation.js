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
            this.dependencyResolver = new this.DependencyResolver(this.tests);
            this.runners = {};
            _.each(this.model.schema, function (settings, attribute) {
                var tests = this.dependencyResolver.createTestMap(_.keys(settings));
                _.each(settings, function (config, name) {
                    var check = this.checks[name];
                    if (check)
                        settings[name] = check.call(this, config, name);
                }, this);
                var runner = new this.Runner(tests, settings);
                runner.on("end", function (result) {
                    this.set(attribute, result);
                }, this)
                this.runners[attribute] = runner;
            }, this);
        },
        run:function (attributes) {
            _.each(this.runners, function (runner, attribute) {
                runner.run(attributes, attributes[attribute]);
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

    var Runner = function (testMap, settings) {
        this.testMap = testMap;
        this.settings = settings;
        this.names = _.keys(this.settings);
        this.id = 0;
    };
    _.extend(Runner.prototype, Backbone.Events, {
        run:function (attributes, value) {
            ++this.id;
            this.attributes = attributes;
            this.value = value;
            this.error = false;
            this.result = false;
            this.pointer = 0;
            this.next();
        },
        next:function () {
            if (!this.error && this.pointer < this.names.length) {
                this.name = this.names[this.pointer];
                this.config = this.settings[this.name];
                this.testMap[this.name].call(this, this.done.bind(this, this.id));
            }
            else
                this.end();
        },
        done:function (id, error) {
            if (this.id != id)
                return;
            this.error = error;
            if (this.error) {
                this.result = {};
                this.result[this.name] = this.error;
            }
            ++this.pointer;
            this.next();
        },
        end:function () {
            delete(this.name);
            delete(this.config);
            delete(this.value);
            this.trigger("end", this.result);
        }
    });

    Validator.prototype.Runner = Runner;

    var DependencyResolver = function (tests) {
        this.tests = tests;
    };
    DependencyResolver.prototype = {
        createTestMap:function (names) {
            var testMap = {};
            _.each(names, function (name) {
                this.appendIfNotContained(name, testMap);
            }, this);
            return testMap;
        },
        appendIfNotContained:function (name, testMap) {
            if (name in testMap)
                return;
            if (!(name in this.tests))
                throw new SyntaxError("Task " + name + " is not registered.");
            _.each(this.getDependencies(name), function (key) {
                this.appendIfNotContained(key, testMap);
            }, this);
            testMap[name] = this.getTest(name);
        },
        getDependencies:function (name) {
            var definition = this.tests[name];
            if (definition instanceof Array)
                return definition.slice(0, -1);
            else
                return [];
        },
        getTest:function (name) {
            var definition = this.tests[name];
            if (definition instanceof Array)
                return definition[definition.length - 1];
            else
                return definition;
        }
    };

    Validator.prototype.DependencyResolver = DependencyResolver;

    module.exports = {
        Model:Model,
        Validator:Validator,
        Runner:Runner,
        DependencyResolver:DependencyResolver
    };

});