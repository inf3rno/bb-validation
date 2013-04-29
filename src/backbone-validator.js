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

    var TestProvider = function () {
        this.use = {};
        this.common = {};
    };
    _.extend(TestProvider.prototype, {
        plugin: function (plugin) {
            if (!_.isObject(plugin) || !_.isUndefined(plugin.use) && !_.isObject(plugin.use) || !_.isUndefined(plugin.common) && !_.isObject(plugin.common))
                throw new TypeError("Invalid plugin format.");
            _.each(plugin.use, function (testInfo, key) {
                if (!_.isObject(testInfo) || !_.isFunction(testInfo.exports) || !_.isUndefined(testInfo.deps) && !_.isArray(testInfo.deps))
                    throw new TypeError("Invalid config param use." + key + " given.");
                if (_.has(this.use, key))
                    throw new Error("Store use." + key + " already set.");
                this.use[key] = testInfo;
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
        queue: function (schema) {

        },
        createTestQueue: function (keys) {
            var keySet = {};
            var queue = [];
            _.each(keys, function (key) {
                this.add(keySet, queue, key);
            }, this);
            return queue;
        },
        add: function (keySet, queue, key) {
            if (_.has(keySet, key))
                return;
            if (!_.has(this.use, key))
                throw new SyntaxError("Test " + key + " is not registered.");
            _.each(this.use[key].deps, function (dependency) {
                this.add(keySet, queue, dependency);
            }, this);
            keySet[key] = true;
            queue.push(key);
        }
    });
    TestProvider.extend = Backbone.Model.extend;


    var Validator = Backbone.Model.extend({

    }, {
        plugin: function (plugin) {

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
        run: function (callback, value, relations) {
            if (!_.isFunction(callback))
                throw new TypeError("No callback given.");
            if (this.pending)
                this.stop();
            this.pending = true;
            this.evaluate(this.end.bind(this, this.id, callback), value, relations);
        },
        evaluate: function (done, value, relations) {
            done(value, relations);
        },
        end: function (id, done, error, options) {
            if (this.id == id) {
                done(error, options);
                this.stop();
            }
        },
        stop: function () {
            this.id++;
            this.pending = false;
        },
        relatedTo: function () {
            return this.relations;
        }
    });
    Test.extend = Backbone.Model.extend;

    module.exports = {
        Validator: Validator,
        TestProvider: TestProvider,
        Test: Test
    };

    _.extend(Validator, _.omit(module.exports, "Validator"));
    Backbone.Validator = Validator;
});