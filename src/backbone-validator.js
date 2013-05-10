var amdefine = false;
if (typeof define !== 'function')
    var define = require('amdefine')(module, require),
        amdefine = true;

define(function (require, exports, module) {
    var _ = require("underscore"),
        Backbone = require("backbone");

    if (!Object.create)
        Object.create = function (proto) {
            var Surrogate = function () {
                this.constructor = Surrogate;
            };
            Surrogate.prototype = proto;
            var instance = new Surrogate();
            return instance;
        };

    var Validator = Backbone.Model.extend({
        provider: null,
        constructor: function (options) {
            if (options.provider)
                this.provider = options.provider;
            Backbone.Model.call(this);
        },
        run: function () {

        },
        plugin: function (plugin) {
            this.provider.plugin(plugin);
        },
        parallel: function (schema) {
            var parallelSchema = {};
            _.each(_.keys(schema), function (attribute) {
                parallelSchema[attribute] = this.series(schema[attribute]);
            }, this);
            return this.provider.test("parallel", parallelSchema);
        },
        series: function (schema) {
            var visited = {};
            var seriesSchema = {};
            var add = function (key) {
                if (_.has(seriesSchema, key))
                    return;
                if (_.has(visited, key))
                    throw new SyntaxError("Circular dependency by test " + key + ".");
                visited[key] = true;
                _.each(this.provider.deps(key), add, this);
                seriesSchema[key] = this.provider.test(key, schema[key]);
            }.bind(this);
            _.each(_.keys(schema), add);
            return this.provider.test("series", seriesSchema);
        }
    });

    var TestProvider = function () {
        this.use = {};
        this.common = {};
    };
    _.extend(TestProvider.prototype, {
        plugin: function (plugin) {
            if (!_.isObject(plugin) || !_.isUndefined(plugin.use) && !_.isObject(plugin.use) || !_.isUndefined(plugin.common) && !_.isObject(plugin.common))
                throw new TypeError("Invalid plugin format.");
            _.each(plugin.use, function (record, key) {
                if (!_.isObject(record) || !_.isFunction(record.exports) || !_.isUndefined(record.deps) && !_.isArray(record.deps))
                    throw new TypeError("Invalid config param use." + key + " given.");
                if (_.has(this.use, key))
                    throw new Error("Store use." + key + " already set.");
                this.use[key] = record;
            }, this);
            var isMap = function (o) {
                return _.isObject(o) && o.constructor === Object;
            };
            _.each(plugin.common, function (value, key) {
                if (!_.has(this.common, key) && isMap(value))
                    this.common[key] = {};
                if (!_.has(this.common, key))
                    this.common[key] = value;
                else if (isMap(value) && isMap(this.common[key])) {
                    var map = this.common[key];
                    _.each(value, function (subValue, subKey) {
                        if (_.has(map, subKey))
                            throw new Error("Store common." + key + "." + subKey + " already set.");
                        map[subKey] = subValue;
                    }, this);
                }
                else
                    throw new Error("Store common." + key + " already set.");
            }, this);
        },
        test: function (key, schema) {
            if (!_.has(this.use, key))
                throw new SyntaxError("Test " + key + " is not registered.");
            var Test = this.use[key].exports;
            return new Test({
                schema: schema,
                common: this.common
            });
        },
        deps: function (key) {
            if (!_.has(this.use, key))
                throw new SyntaxError("Test " + key + " is not registered.");
            return this.use[key].deps;
        }
    });

    var ParallelQueue = function (options) {
        this.schema = options.schema;
        this.relations = {};
        _.each(this.schema, function (test, attribute) {
            _.each(test.relatedTo(), function (key) {
                this.relations[key] = true;
            }, this);
            test.on("end", this.done.bind(this, attribute));
        }, this);
    };
    _.extend(ParallelQueue.prototype, Backbone.Events, {
        pending: 0,
        error: false,
        relatedTo: function () {
            return _.keys(this.relations);
        },
        run: function (value, attributes) {
            if (this.pending)
                this.stop();
            this.trigger("run");
            _.each(this.schema, function (test, attribute) {
                var attr = {};
                _.each(test.relatedTo(), function (relation) {
                    attr[relation] = attributes[relation];
                }, this);
                ++this.pending;
                test.run(attributes[attribute], attr);
            }, this);
        },
        done: function (attribute, error, options) {
            --this.pending;
            if (error) {
                if (!this.error)
                    this.error = {};
                this.error[attribute] = error;
            }
            if (!this.pending)
                this.end();
        },
        end: function () {
            var error = this.error;
            this.reset();
            this.trigger("end", error);
        },
        stop: function () {
            if (!this.pending)
                return;
            _.each(this.schema, function (test) {
                if (test.pending)
                    test.stop();
            });
            this.reset();
            this.trigger("stop");
        },
        reset: function () {
            this.error = false;
            this.pending = 0;
        }
    });

    var SeriesQueue = function (options) {
        this.schema = options.schema;
        this.keys = _.keys(this.schema);
        this.relations = {};
        _.each(this.schema, function (test) {
            _.each(test.relatedTo(), function (key) {
                this.relations[key] = true;
            }, this);
            test.on("end", this.done.bind(this));
        }, this);
    };
    _.extend(SeriesQueue.prototype, Backbone.Events, {
        pending: false,
        error: false,
        relatedTo: function () {
            return _.keys(this.relations);
        },
        run: function (value, attributes) {
            if (this.pending)
                this.stop();
            this.pending = true;
            this.vector = 0;
            this.value = value;
            this.attributes = attributes;
            this.trigger("run");
            this.next();
        },
        next: function () {
            this.key = this.keys[this.vector];
            ++this.vector;
            this.current = this.schema[this.key];
            var attr = {};
            _.each(this.current.relatedTo(), function (relation) {
                attr[relation] = this.attributes[relation];
            }, this);
            this.current.run(this.value, attr);
        },
        done: function (error, options) {
            if (error || options && options.end || this.vector >= this.keys.length) {
                if (error) {
                    this.error = {};
                    this.error[this.key] = error;
                }
                this.end();
            }
            else
                this.next();
        },
        end: function () {
            var error = this.error;
            this.reset();
            this.trigger("end", error);
        },
        stop: function () {
            this.current.stop();
            this.pending = false;
            this.trigger("stop");
        },
        reset: function () {
            this.pending = false;
            this.error = false;
            this.vector = 0;
            delete(this.value);
            delete(this.attributes);
        }
    });

    var Test = function (options) {
        if (!options)
            throw new TypeError("Options is not set.");
        this.relations = {};
        _.extend(this, _.pick(options, "common"));
        this.initialize.call(this, options.schema);
    };
    _.extend(Test.prototype, Backbone.Events, {
        pending: false,
        id: 0,
        initialize: function (schema) {
            this.schema = schema;
        },
        relatedTo: function () {
            return _.keys(this.relations);
        },
        run: function (value, attributes) {
            if (this.pending)
                this.stop();
            this.pending = true;
            this.value = value;
            this.attributes = attributes;
            this.trigger("run");
            this.evaluate(this.end.bind(this, this.id));
        },
        evaluate: function (done) {
            var error, options;
            done(error, options);
        },
        end: function (id, error, options) {
            if (this.id == id) {
                this.reset();
                this.trigger("end", error, options);
            }
        },
        stop: function () {
            this.reset();
            this.abort();
            this.trigger("stop");
        },
        reset: function () {
            this.id++;
            this.pending = false;
            delete(this.value);
            delete(this.attributes);
        },
        abort: function () {
        }
    });

    TestProvider.extend = SeriesQueue.extend = Test.extend = Backbone.Model.extend;

    var provider = new TestProvider();
    provider.plugin({
        use: {
            parallel: {
                exports: ParallelQueue
            },
            series: {
                exports: SeriesQueue
            },
            test: {
                exports: Test
            }
        }
    });
    Validator.prototype.provider = provider;


    _.extend(Validator, {
        TestProvider: TestProvider,
        SeriesQueue: SeriesQueue,
        ParallelQueue: ParallelQueue,
        Test: Test
    });

    module.exports = Validator;
    Backbone.Validator = Validator;
});