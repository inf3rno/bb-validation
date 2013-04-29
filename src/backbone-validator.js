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

    var Validator = function () {
    };

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
            if (!(callback instanceof Function))
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
        relatedTo: function (attribute) {
            this.relations[attribute] = true;
        }
    });
    Test.extend = Backbone.Model.extend;

    module.exports = {
        Validator: Validator,
        Test: Test
    };

    Validator.Test = Test;
    Backbone.Validator = Validator;
});