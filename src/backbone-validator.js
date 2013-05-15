var amdefine = false;
if (typeof define !== 'function')
    var define = require('amdefine')(module, require),
        amdefine = true;

define(function (require, exports, module) {
    var _ = require("underscore"),
        Backbone = require("backbone");

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
            if (this.pending)
                this.stop();
            this.params = params;
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

    var Test = TestBase.extend({
        id: 0,
        run: function (params) {
            TestBase.prototype.run.apply(this, arguments);
            this.evaluate(this.end.bind(this, this.id));
        },
        evaluate: function (done) {
            done({error: false});
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
            this.active += _.size(this.schema);
            _.each(this.schema, function (test, key) {
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

    var ContinuousParallel = Parallel.extend({
        run: function (params) {
            this.params = params;
            if (!this.pending) {
                this.pending = true;
                this.trigger("run", params);
            }
            _.each(_.keys(this.params.value), function (key) {
                var test = this.schema[key];
                if (!test)
                    return;
                if (test.pending)
                    test.stop();
                else
                    ++this.active;
                if (this.error && this.error[key])
                    delete(this.error[key]);
            }, this);
            if (this.error && !_.size(this.error))
                this.error = false;
            _.each(_.keys(this.params.value), function (key) {
                var test = this.schema[key];
                if (!test)
                    return;
                var params = _.omit(this.params, "value");
                params.value = this.params.value[key];
                test.run(params);
            }, this);
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
            var key = this.keys[this.vector];
            ++this.vector;
            this.test = this.schema[key];
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

    var TestStore = function (records) {
        this.data = {};
        if (records)
            this.save(records);
    };
    _.extend(TestStore.prototype, {
        toObject: function () {
            return this.data;
        },
        get: function (key) {
            if (!_.has(this.data, key))
                throw new SyntaxError("Test " + key + " is not registered.");
            return this.data[key];
        },
        save: function (records) {
            _.each(records, function (record, key) {
                this.create(key, record);
            }, this);
        },
        create: function (key, record) {
            if (!_.isObject(record) || !_.isFunction(record.exports) || !_.isUndefined(record.deps) && !_.isArray(record.deps))
                throw new TypeError("Invalid config param use." + key + " given.");
            if (_.has(this.data, key))
                throw new Error("Store use." + key + " already set.");
            this.data[key] = record;
        }
    });

    var CommonStore = function (map) {
        this.data = {};
        if (map)
            this.save(map);
    };
    _.extend(CommonStore.prototype, {
        toObject: function () {
            return this.data;
        },
        save: function (map) {
            _.each(map, function (value, key) {
                this.update(key, value);
            }, this);
        },
        update: function (key, value) {
            if (!_.has(this.data, key) && this.isMap(value))
                this.data[key] = {};
            if (!_.has(this.data, key))
                this.data[key] = value;
            else if (this.isMap(value) && this.isMap(this.data[key])) {
                this.appendMap(key, value);
            }
            else
                throw new Error("Store common." + key + " already set.");
        },
        isMap: function (o) {
            return _.isObject(o) && o.constructor === Object;
        },
        appendMap: function (key, value) {
            var map = this.data[key];
            _.each(value, function (subValue, subKey) {
                if (_.has(map, subKey))
                    throw new Error("Store common." + key + "." + subKey + " already set.");
                map[subKey] = subValue;
            }, this);
        }
    });

    var Validator = Backbone.Model.extend({
        commonStore: new CommonStore(),
        testStore: new TestStore({
            parallel: {
                exports: Parallel
            },
            continuousParallel: {
                exports: ContinuousParallel
            },
            series: {
                exports: Series
            },
            test: {
                exports: Test
            }
        }),
        running: false,
        bound: false,
        pending: false,
        errors: 0,
        constructor: function (config) {
            Backbone.Model.call(this);
            this.build(config.schema);
            if (config.model)
                this.bind(config.model);
        },
        build: function (schema) {
            if (!schema)
                throw new Error("Validator config has to contain schema.");
            this.test = this.parallel(schema);

            this.relations = {};
            _.each(this.test.schema, function (series, attribute) {
                _.each(series.schema, function (test, key) {
                    _.each(test.relations, function (relatedAttribute) {
                        if (!this.relations[relatedAttribute])
                            this.relations[relatedAttribute] = {};
                        this.relations[relatedAttribute][attribute] = true;
                    }, this);
                }, this);
            }, this);

            this.test.on("run", function () {
                this.pending = true;
            }, this);
            _.each(this.test.schema, function (series, attribute) {
                series.on("run", function () {
                    if (this.attributes[attribute])
                        --this.errors;
                    this.set(attribute, undefined);
                }, this);
                series.on("end", function (result) {
                    if (result.error)
                        ++this.errors;
                    this.set(attribute, result.error);
                }, this);
            }, this);
            this.test.on("end", function () {
                this.pending = false;
            }, this);
        },
        bind: function (model) {
            if (this.bound)
                this.unbind();
            this.model = model;
            this.bound = {};
            _.each(this.test.schema, function (series, attribute) {
                var listener = function (model, value, options) {
                    if (!this.running)
                        return;
                    var calling = {};
                    var add = function (attribute) {
                        if (calling[attribute])
                            return;
                        calling[attribute] = true;
                        if (this.relations[attribute])
                            _.each(_.keys(this.relations[attribute]), function (attribute) {
                                add.call(this, attribute);
                            }, this);
                    };
                    add.call(this, attribute);
                    var running = {};
                    _.each(_.keys(calling), function (attribute) {
                        running[attribute] = model.get(attribute)
                    });
                    this.test.run({value: running, attributes: model.attributes});
                }.bind(this);
                this.model.on("change:" + attribute, listener);
                this.bound[attribute] = listener;
            }, this);
        },
        unbind: function () {
            if (this.running)
                this.stop();
            _.each(this.bound, function (listener, attribute) {
                this.model.off("change:" + attribute, listener);
            }, this);
            this.bound = false;
            delete(this.model);
        },
        run: function () {
            if (!this.model)
                throw new Error("Cannot run validator without model.");
            if (this.running)
                this.stop();
            this.running = true;
            var value = {};
            _.each(this.test.schema, function (series, attribute) {
                value[attribute] = this.model.get(attribute);
            }, this);
            this.test.run({value: value, attributes: this.model.attributes});
        },
        stop: function () {
            this.running = false;
            this.test.stop();
            this.clear();
        },
        parallel: function (schema) {
            var parallelSchema = {};
            _.each(_.keys(schema), function (attribute) {
                parallelSchema[attribute] = this.series(schema[attribute]);
            }, this);
            return this.test("continuousParallel", parallelSchema);
        },
        series: function (schema) {
            var visited = {};
            var seriesSchema = {};
            var add = function (key) {
                if (_.has(seriesSchema, key))
                    return;
                if (_.has(visited, key))
                    throw new Error("Circular dependency by test " + key + ".");
                visited[key] = true;
                _.each(this.testStore.get(key).deps, add, this);
                if (!_.has(schema, key) && !this.testStore.get(key).auto)
                    throw new Error("Test " + key + " is not auto configurable.");
                seriesSchema[key] = this.test(key, schema[key]);
            }.bind(this);
            _.each(_.keys(schema), add);
            return this.test("series", seriesSchema);
        },
        test: function (key, schema) {
            var Test = this.testStore.get(key).exports;
            return new Test({
                schema: schema,
                common: this.commonStore.toObject()
            });
        }
    }, {
        plugin: function (plugin) {
            if (plugin.use)
                this.prototype.testStore.save(plugin.use);
            if (plugin.common)
                this.prototype.commonStore.save(plugin.common);
        },
        toPlugin: function () {
            return {
                use: this.prototype.testStore.toObject(),
                common: this.prototype.commonStore.toObject()
            };
        }
    });

    _.extend(Validator, {
        TestStore: TestStore,
        CommonStore: CommonStore,
        Test: Test,
        Series: Series,
        Parallel: Parallel,
        ContinuousParallel: ContinuousParallel
    });

    module.exports = Validator;
    Backbone.Validator = Validator;
});