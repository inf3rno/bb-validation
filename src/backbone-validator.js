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
        testStore: new TestStore({
            parallel: {
                exports: Parallel
            },
            series: {
                exports: Series
            },
            test: {
                exports: Test
            }
        }),
        commonStore: new CommonStore(),
        constructor: function (config) {
            Backbone.Model.call(this);
            this.model = config.model;
            this.test = this.parallel(config.schema);
        },
        run: function () {
            this.test.run({value: attributes, attributes: attributes});
        },
        parallel: function (schema) {
            //this.relations = {};
            var parallelSchema = {};
            _.each(_.keys(schema), function (attribute) {
                parallelSchema[attribute] = this.series(schema[attribute]);
                //this.model.on("change:" + attribute, function (model, value, options) {
                //    this.change(attribute, value);
                //});
            }, this);
            return this.test("parallel", parallelSchema);
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
                _.each(this.testStore.get(key).deps, add, this);
                seriesSchema[key] = this.test(key, schema[key]);
            }.bind(this);
            _.each(_.keys(schema), add);
            return this.test("series", seriesSchema);
        },
        test: function (key, schema) {
            var Test = this.testStore.get(key).exports;
            var test = new Test({
                schema: schema,
                common: this.commonStore.toObject()
            });
            //this.relations[attribute].push(test.relations);
            return test;
        },
        change: function (attribute, value) {
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
                running[attribute] = this.model.get(attribute)
            });
            this.test.run({value: running, attributes: this.model.attributes});
        }
    }, {
        plugin: function (plugin) {
            if (plugin.use)
                this.prototype.testStore.save(plugin.use);
            if (plugin.common)
                this.prototype.commonStore.save(plugin.common);
        }
    });

    _.extend(Validator, {
        TestStore: TestStore,
        CommonStore: CommonStore,
        Series: Series,
        Parallel: Parallel,
        Test: Test
    });

    module.exports = Validator;
    Backbone.Validator = Validator;
});