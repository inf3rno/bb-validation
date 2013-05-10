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
            Backbone.Model.call(this);
            this.test = this.parallel(options.schema);
        },
        run: function () {
            //lefuttatja a tesztet minden elemre
            //ez azt hiszem így jó is...
            //elindítja a binding-et ezen kívül, ami figyeli a model változásokat
            //a relatedTo rész az kikerülhet belőle, és egy az egyben tovább lehet adni az attribútumokat -> így gyorsabb a kód
            //mégse -> mármint egy az egyben tovább lehet adni az attribútumokat, de a relatedTo mégis jó
            //arra kell a relatedTo, hogy a realTime binder-nek jelezze, hogy kapcsolat van a tesztek között
            //rossz helyen van a relatedTo, nem lehet általános teszteket írni a használatával
            //a realTime binder-nek tudnia kell valahonnan, hogy 1-1 alsóbb rendű teszt kapcsolatban áll 1-1 attribútummal
            //nagy itt a káosz...
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

    var ParallelQueue = function (options) {
        this.schema = options.schema;
        _.each(this.schema, function (test, attribute) {
            test.on("end", this.done.bind(this, attribute));
        }, this);
    };
    _.extend(ParallelQueue.prototype, Backbone.Events, {
        pending: 0,
        error: false,
        run: function (value, attributes) {
            if (this.pending)
                this.stop();
            this.trigger("run");
            _.each(this.schema, function (test, attribute) {
                ++this.pending;
                test.run(attributes[attribute], attributes);
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
                if (test.pending) {
                    test.stop();
                    --this.pending;
                }
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
        _.each(this.schema, function (test) {
            test.on("end", this.done.bind(this));
        }, this);
    };
    _.extend(SeriesQueue.prototype, Backbone.Events, {
        pending: false,
        error: false,
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
            this.current.run(this.value, this.attributes);
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

    Validator.prototype.provider = new TestProvider();
    Validator.plugin({
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


    _.extend(Validator, {
        TestProvider: TestProvider,
        SeriesQueue: SeriesQueue,
        ParallelQueue: ParallelQueue,
        Test: Test
    });

    module.exports = Validator;
    Backbone.Validator = Validator;
});