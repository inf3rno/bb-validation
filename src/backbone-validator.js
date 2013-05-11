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
            if (plugin.use)
                this.createAll(plugin.use);
            if (plugin.common)
                this.updateCommon(plugin.common);
        },
        test: function (key, schema) {
            var Test = this.read(key).exports;
            return new Test({
                schema: schema,
                common: this.common
            });
        },
        read: function (key) {
            if (!_.has(this.use, key))
                throw new SyntaxError("Test " + key + " is not registered.");
            return this.use[key];
        },
        createAll: function (records) {
            _.each(records, function (record, key) {
                this.create(key, record);
            }, this);
        },
        create: function (key, record) {
            if (!_.isObject(record) || !_.isFunction(record.exports) || !_.isUndefined(record.deps) && !_.isArray(record.deps))
                throw new TypeError("Invalid config param use." + key + " given.");
            if (_.has(this.use, key))
                throw new Error("Store use." + key + " already set.");
            this.use[key] = record;
        },
        updateCommon: function (common) {
            var isMap = function (o) {
                return _.isObject(o) && o.constructor === Object;
            };
            _.each(common, function (value, key) {
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
        }
    });

    var TestBase = function (config) {
        if (!config)
            throw new TypeError("Config is not set.");
        _.extend(this, _.omit(config, "schema"));
        this.initialize.call(this, config.schema);
    };
    TestBase.extend = Backbone.Model.extend;
    _.extend(TestBase.prototype, Backbone.Events, {
        pending: false,
        initialize: function (schema) {
            this.schema = schema;
        },
        run: function (params) {
            this.params = params;
            if (this.pending)
                this.stop();
            this.pending = true;
            this.trigger("run", params);
        },
        end: function (result) {
            this.reset();
            this.trigger("end", result);
        },
        stop: function () {
            this.reset();
            this.trigger("stop");
        },
        reset: function () {
            this.pending = false;
            delete(this.params);
        }
    });

    var TestCollection = TestBase.extend({
        error: false,
        initialize: function (schema) {
            this.schema = schema;
            _.each(this.schema, function (test, key) {
                test.on("end", this.done.bind(this, key));
            }, this);
        },
        done: function (key, result) {
            if (result.error) {
                if (!this.error)
                    this.error = {};
                this.error[key] = result.error;
            }
        },
        end: function () {
            TestBase.prototype.end.call(this, {
                error: this.error
            });
        },
        reset: function () {
            TestBase.prototype.reset.call(this);
            this.error = false;
        }
    });

    var Parallel = TestCollection.extend({
        active: 0,
        run: function (params) {
            TestCollection.prototype.run.apply(this, arguments);
            _.each(this.schema, function (test, key) {
                ++this.active;
                var params = _.omit(this.params, "value");
                params.value = this.params.value[key];
                test.run(params);
            }, this);
        },
        done: function (key, result) {
            --this.active;
            TestCollection.prototype.done.apply(this, arguments);
            if (!this.active)
                this.end();
        },
        stop: function () {
            _.each(this.schema, function (test) {
                if (test.pending)
                    test.stop();
            }, this);
            TestCollection.prototype.stop.call(this);
        },
        reset: function () {
            TestCollection.prototype.reset.call(this);
            this.active = 0;
        }
    });

    var Series = TestCollection.extend({
        vector: 0,
        initialize: function (schema) {
            TestCollection.prototype.initialize.apply(this, arguments);
            this.keys = _.keys(schema);
        },
        run: function (params) {
            TestCollection.prototype.run.apply(this, arguments);
            this.next();
        },
        done: function (key, result) {
            TestCollection.prototype.done.apply(this, arguments);
            if (!result.error && !result.end && this.vector < this.keys.length)
                this.next();
            else
                this.end();
        },
        next: function () {
            this.key = this.keys[this.vector];
            ++this.vector;
            this.test = this.schema[this.key];
            this.test.run(this.params);
        },
        stop: function () {
            this.test.stop();
            TestCollection.prototype.stop.call(this);
        },
        reset: function () {
            TestCollection.prototype.reset.call(this);
            this.vector = 0;
        }
    });

    var Test = TestBase.extend({
        id: 0,
        run: function (params) {
            TestBase.prototype.run.apply(this, arguments);
            this.evaluate(this.end.bind(this, this.id));
        },
        evaluate: function (done) {
            var error, options;
            done(error, options);
        },
        end: function (id, result) {
            if (this.id == id)
                TestBase.prototype.end.call(this, result || {});
        },
        stop: function () {
            this.abort();
            TestBase.prototype.stop.call(this);
        },
        reset: function () {
            TestBase.prototype.reset.call(this);
            this.id++;
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
            this.test.run({value: value, attributes: attributes});
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
                _.each(this.provider.read(key).deps, add, this);
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