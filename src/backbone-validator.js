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

    }, {
        plugin: function (plugin) {

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
            _.each(plugin.common, function (value, key) {
                if (_.has(this.common, key)) {
                    var stored = this.common[key];
                    if (_.isArray(stored) && _.isArray(value))
                        stored.push.apply(stored, value);
                    else if (_.isObject(stored) && stored.constructor === Object && _.isObject(value) && value.constructor === Object)
                        _.each(value, function (subValue, subKey) {
                            if (_.has(stored, subKey))
                                throw new Error("Store common." + key + "." + subKey + " already set.");
                            stored[subKey] = subValue;
                        });
                    else
                        throw new Error("Store common." + key + " already set.");
                }
                else
                    this.common[key] = value;
            }, this);
        },
        parallel: function (schema) {
            var queueSchema = {};
            _.each(_.keys(schema), function (attribute) {
                queueSchema[attribute] = this.series(schema[attribute]);
            }, this);
            return new ParallelQueue({
                schema: queueSchema,
                common: this.common
            });
        },
        series: function (schema) {
            var visited = {};
            var queueSchema = {};
            var add = function (key) {
                if (_.has(queueSchema, key))
                    return;
                if (_.has(visited, key))
                    throw new SyntaxError("Circular dependency by test " + key + ".");
                visited[key] = true;
                _.each(this.use[key].deps, add, this);
                queueSchema[key] = this.test(key, schema[key]);
            };
            _.each(_.keys(schema), add, this);
            return new SeriesQueue({
                schema: queueSchema,
                common: this.common
            });
        },
        test: function (key, schema) {
            if (!_.has(this.use, key))
                throw new SyntaxError("Test " + key + " is not registered.");
            var Test = this.use[key].exports;
            return new Test({
                schema: schema,
                common: this.common
            });
        }
    });

    var ParallelQueue = function (options) {
        this.schema = options.schema;
        this.relations = {};
        _.each(this.schema, function (test) {
            _.each(test.relatedTo(), function (key) {
                this.relations[key] = true;
            }, this);
        }, this);
    };
    _.extend(ParallelQueue.prototype, Backbone.Events, {
        pending: 0,
        error: false,
        run: function (callback, value, attributes) {
            this.callback = callback;
            _.each(this.schema, function (test, attribute) {
                var attr = {};
                _.each(test.relatedTo(), function (relation) {
                    attr[relation] = attributes[relation];
                }, this);
                ++this.pending;
                test.run(this.done.bind(this, attribute), attributes[attribute], attr);
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
            this.callback(this.error);
        },
        stop: function () {
            if (!this.pending)
                return;
            _.each(this.schema, function (test) {
                if (test.pending) {
                    test.stop();
                    --this.pending;
                }
            });
        },
        relatedTo: function () {
            return _.keys(this.relations);
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
        }, this);
    };
    _.extend(SeriesQueue.prototype, Backbone.Events, {
        pending: false,
        error: false,
        run: function (callback, value, attributes) {
            if (this.pending)
                this.stop();
            this.error = false;
            this.pending = true;
            this.vector = 0;
            this.value = value;
            this.attributes = attributes;
            this.callback = callback;
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
            this.current.run(this.done.bind(this), this.value, attr);
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
            var callback = this.callback;
            var error = this.error;
            this.pending = false;
            this.error = false;
            this.vector = 0;
            delete(this.value);
            delete(this.attributes);
            delete(this.callback);
            callback(error);
        },
        stop: function () {
            this.current.stop();
            this.pending = false;
        },
        relatedTo: function () {
            return _.keys(this.relations);
        }
    });

    var Test = function (options) {
        if (!options)
            throw new TypeError("Options is not set.");
        this.relations = {};
        _.extend(this, _.pick(options, "common"));
        this.initialize.call(this, options.schema);
    };
    _.extend(Test.prototype, {
        pending: false,
        id: 0,
        initialize: function (schema) {
            this.schema = schema;
        },
        run: function (callback, value, attributes) {
            if (!_.isFunction(callback))
                throw new TypeError("No callback given.");
            if (this.pending)
                this.stop();
            this.pending = true;
            this.value = value;
            this.attributes = attributes;
            this.callback = callback;
            this.evaluate(this.end.bind(this, this.id));
        },
        evaluate: function (done) {
            var error, options;
            done(error, options);
        },
        end: function (id, error, options) {
            if (this.id == id) {
                var callback = this.callback;
                this.stop();
                callback(error, options);
            }
        },
        stop: function () {
            this.id++;
            this.pending = false;
            delete(this.value);
            delete(this.attributes);
            delete(this.callback);
            this.abort();
        },
        abort: function () {
        },
        relatedTo: function () {
            return _.keys(this.relations);
        }
    });

    TestProvider.extend = SeriesQueue.extend = Test.extend = Backbone.Model.extend;

    module.exports = {
        Validator: Validator,
        TestProvider: TestProvider,
        SeriesQueue: SeriesQueue,
        ParallelQueue: ParallelQueue,
        Test: Test
    };

    _.extend(Validator, _.omit(module.exports, "Validator"));
    Backbone.Validator = Validator;
});