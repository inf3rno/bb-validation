if (typeof define !== 'function')
    var define = require('amdefine')(module);

define(function (require, exports, module) {
    var _ = require("underscore"),
        Backbone = require("backbone");

    if (!Object.create)
        Object.create = function (proto) {
            var Surrogate = function () {
                this.constructor = Surrogate;
            };
            Surrogate.prototype = proto;
            return new Surrogate();
        };

    var View = Backbone.View.extend({
        initialize:function () {
            this.model.on("change", function () {
                this.unRender();
                this.render();
            }, this);
            this.render();
        },
        render:function () {
        },
        unRender:function () {
        }
    });

    var Aggregator = View.extend({
        render:function () {
            this.display(this.model.errors, this.model.pending);
            return this;
        },
        display:function (errors) {
        }
    });

    var Messenger = View.extend({
        unknownMessage:"Not valid.",
        initialize:function () {
            if (this.options.unknownMessage)
                this.unknownMessage = this.options.unknownMessage;
            if (!this.messages && !this.options.messages)
                throw new Error("No messages given.");
            if (this.options.messages)
                this.messages = this.options.messages;
            View.prototype.initialize.apply(this, arguments);
        },
        render:function () {
            _.each(this.model.attributes, function (errors, attribute) {
                var chunks;
                var pending = false;
                if (errors) {
                    chunks = [];
                    _.each(errors, function (error, name) {
                        var section = this.messages[attribute][name];
                        if (typeof(section) == "string")
                            chunks.push(section);
                        else if (section && section[error])
                            chunks.push(section[error]);
                    }, this);
                    if (!chunks.length)
                        chunks.push(this.unknownMessage);
                }
                else if (errors === undefined)
                    pending = true;
                this.display(attribute, chunks, pending);
            }, this);
            return this;
        },
        unRender:function () {
            _.each(this.model.attributes, function (errors, attribute) {
                this.display(attribute);
            }, this);
        },
        display:function (attribute, chunks, pending) {
        }
    });

    var AbstractModel = Backbone.Model.extend({
        constructor:function () {
            if (this.validator)
                this.Validator = this.Validator.extend({}).customize(this.validator);
            this.validator = new this.Validator(this);
            Backbone.Model.apply(this, arguments);
            this.validate(this.attributes, true);
        }
    });

    var AsyncModel = AbstractModel.extend({
        _validate:function (attrs, options) {
            Backbone.Model.prototype._validate.apply(this, arguments);
            return true;
        },
        validate:function (attributes) {
            this.validator.run(attributes);
        }
    });

    var SyncModel = AbstractModel.extend({
        validate:function (attributes) {
            this.validator.run(attributes);
            if (this.validator.pending)
                throw new Error("Cannot use asynchronous tests in a sync model.");
            if (!this.validator.errors)
                return;
            var error = {};
            _.each(this.validator.attributes, function (errors, attribute) {
                if (errors)
                    error[attribute] = errors;
            });
            return error;
        }
    });

    var Validator = Backbone.Model.extend({
        checks:{},
        tests:{},
        patterns:{},
        errors:0,
        pending:0,
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
                runner.on("run", function () {
                    ++this.pending;
                    this.set(attribute, undefined, {old:this.get(attribute)});
                }, this);
                runner.on("end", function (result) {
                    --this.pending;
                    this.set(attribute, result, {old:this.get(attribute)});
                }, this);
                this.runners[attribute] = runner;
                this.on("change:" + attribute, function (model, value, options) {
                    if (!!options.old != !!value) {
                        if (value)
                            ++this.errors;
                        else
                            --this.errors;
                    }
                }, this);
            }, this);
        },
        run:function (attributes, force) {
            this.pending = 0;
            _.each(this.runners, function (runner, attribute) {
                if (force || this.model.get(attribute) !== attributes[attribute])
                    runner.run(attributes, attributes[attribute]);
            }, this);
        }
    }, {
        extendable:{
            checks:true,
            tests:true,
            patterns:true
        },
        customize:function (pack) {
            if (!pack)
                return;
            _.each(pack, function (value, property) {
                if (this.extendable[property]) {
                    var needNewBranch = this.prototype[property] && this.__super__ && this.prototype[property] === this.__super__[property];
                    if (needNewBranch)
                        this.prototype[property] = Object.create(this.__super__[property]);
                    _.extend(this.prototype[property], value);
                }
                else
                    this.prototype[property] = value;
            }, this);
            return this;
        }
    });

    AbstractModel.prototype.Validator = Validator;

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
            this.trigger("run");
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
        View:View,
        Aggregator:Aggregator,
        Messenger:Messenger,
        Model:AsyncModel,
        SyncModel:SyncModel,
        Validator:Validator,
        Runner:Runner,
        DependencyResolver:DependencyResolver
    };

});