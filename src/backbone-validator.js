var amdefine = false;
if (typeof define !== 'function')
    var define = require('amdefine')(module, require),
        amdefine = true;

define(function (require, exports, module) {
    var _ = require("underscore"),
        Backbone = require("backbone");


    var TestProvider = function () {
        this.use = {};
        this.common = {};
    };
    _.extend(TestProvider.prototype, {
        merge: function (plugin) {
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

    var TestBase = function () {
    };
    TestBase.extend = Backbone.Model.extend;
    _.extend(TestBase.prototype, Backbone.Events, {

    });

    var TestCollection = TestBase.extend({

    });

    var Parallel = TestCollection.extend({
        pending: 0,
        error: false,
        constructor: function (options) {
            this.schema = options.schema;
            _.each(this.schema, function (test, key) {
                test.on("end", this.done.bind(this, key));
            }, this);
        },
        run: function (values, params) {
            if (this.pending)
                this.stop();
            this.trigger("run");
            _.each(this.schema, function (test, key) {
                ++this.pending;
                test.run(values[key], params);
            }, this);
        },
        done: function (key, result) {
            var error = result.error;
            --this.pending;
            if (error) {
                if (!this.error)
                    this.error = {};
                this.error[key] = error;
            }
            if (!this.pending)
                this.end();
        },
        end: function () {
            var result = {
                error: this.error
            };
            this.reset();
            this.trigger("end", result);
        },
        stop: function () {
            if (!this.pending)
                return;
            _.each(this.schema, function (test) {
                if (test.pending) {
                    test.stop();
                    --this.pending;
                }
            }, this);
            this.reset();
            this.trigger("stop");
        },
        reset: function () {
            this.error = false;
            this.pending = 0;
        }
    });

    var Series = TestCollection.extend({
        pending: false,
        error: false,
        constructor: function (options) {
            this.schema = options.schema;
            this.keys = _.keys(this.schema);
            _.each(this.schema, function (test) {
                test.on("end", this.done.bind(this));
            }, this);
        },
        run: function (value, params) {
            if (this.pending)
                this.stop();
            this.pending = true;
            this.vector = 0;
            this.value = value;
            this.params = params;
            this.trigger("run");
            this.next();
        },
        next: function () {
            this.key = this.keys[this.vector];
            ++this.vector;
            this.current = this.schema[this.key];
            this.current.run(this.value, this.params);
        },
        done: function (result) {
            var error = result.error;
            var end = result.end;
            if (error || end || this.vector >= this.keys.length) {
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
            var result = {
                error: this.error
            };
            this.reset();
            this.trigger("end", result);
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
            delete(this.params);
        }
    });

    var Test = TestBase.extend({
        pending: false,
        id: 0,
        constructor: function (options) {
            if (!options)
                throw new TypeError("Options is not set.");
            _.extend(this, _.pick(options, "common"));
            this.initialize.call(this, options.schema);
        },
        initialize: function (schema) {
            this.schema = schema;
        },
        run: function (value, params) {
            if (this.pending)
                this.stop();
            this.pending = true;
            this.value = value;
            this.params = params;
            this.trigger("run");
            this.evaluate(this.end.bind(this, this.id));
        },
        evaluate: function (done) {
            var error, options;
            done(error, options);
        },
        end: function (id, result) {
            if (this.id == id) {
                this.reset();
                this.trigger("end", result || {});
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
            delete(this.params);
        },
        abort: function () {
        }
    });


    var Validator = Backbone.Model.extend({
        provider: new TestProvider(),
        constructor: function (options) {
            Backbone.Model.call(this);
            this.test = this.parallel(options.schema);
        },
        run: function () {
            this.test.run(value, attributes);
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
    }, {
        plugin: function (plugin) {
            this.prototype.provider.merge(plugin);
        }
    });

    Validator.plugin({
        use: {
            parallel: {
                exports: Parallel
            },
            series: {
                exports: Series
            },
            test: {
                exports: Test
            }
        }
    });


    _.extend(Validator, {
        TestProvider: TestProvider,
        Series: Series,
        Parallel: Parallel,
        Test: Test
    });

    module.exports = Validator;
    Backbone.Validator = Validator;
});