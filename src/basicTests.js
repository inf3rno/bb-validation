if (typeof define !== 'function')
    var define = require('amdefine')(module, require);

define(function (require, exports, module) {

    var _ = require("underscore"),
        validation = require("./validation")

    var patterns = {
        digits: /^\d+$/,
        number: /^-?\d+(?:[\.,]\d+)?$/,
        email: /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i,
        url: /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i
    };

    var toNumber = function (value) {
        if (typeof (value) == "string")
            return value.length;
        else if (value instanceof Array)
            return value.length;
        else if (isNaN(value))
            return Number.NaN;
        else
            return value;
    };

    var toRegExp = function (value) {
        var regexp;
        if (typeof(value) == "string")
            regexp = this.patterns[value];
        else
            regexp = value;
        if (!(regexp instanceof RegExp))
            throw new SyntaxError("Invalid expression given.");
        return regexp;
    };

    var AbstractTest = validation.Test.extend({
        patterns: patterns,
        initialize: function (options) {
            this.schema = this.check(options.schema, this.key, this.attribute);
        },
        run: function (value, done) {
            this.value = value;
            this.test(done);
        }
    });

    var RequiredTest = AbstractTest.extend({
        initialize: function (required) {
            this.schema = (required === undefined || !!required);
        },
        test: function (done) {
            var existence = this.value !== undefined;
            if (!existence && this.schema)
                done(true);
            else if (!existence)
                done(false, {abort: true});
            else
                done(false);
        }
    });

    var TypeTest = AbstractTest.extend({
        initialize: function (type) {
            if (type == "null")
                type = null;
            else if (type === undefined)
                type = "undefined";
            else if (typeof(type) == "function") {
                if (type == String)
                    type = "string";
                else if (type == Number)
                    type = "number";
                else if (type == Boolean)
                    type = "boolean";
                else if (type == Object)
                    type = "object";
            }
            if (type !== null && (typeof(type) != "string" || ["undefined", "boolean", "number", "string", "object", "function"].indexOf(type) == -1) && !(type instanceof Function))
                throw new Error("Invalid schema." + this.key + ": must be Function or type or null.");
            this.schema = type;
        },
        test: function (done) {
            var passed;
            if (typeof(this.schema) == "string")
                passed = (typeof(this.value) == this.schema);
            else if (typeof(this.schema) == "function")
                passed = (this.value instanceof this.schema);
            else
                passed = (this.value === this.schema);
            done(!passed);
        },
        deps: ["required"]
    });

    var MinTest = AbstractTest.extend({
        initialize: function (min) {
            if (typeof(min) != "number" || isNaN(min))
                throw new Error("Invalid schema." + this.key + ": must be number.");
            this.schema = min;
        },
        test: function (done) {
            var num = toNumber(this.value);
            done(num < this.schema);
        },
        deps: ["type"]
    });

    var MaxTest = AbstractTest.extend({
        initialize: function (max) {
            if (typeof(max) != "number" || isNaN(max))
                throw new Error("Invalid schema." + this.key + ": must be number.");
            this.schema = max;
        },
        test: function (done) {
            var num = toNumber(this.value);
            done(num > this.schema);
        },
        deps: ["type"]
    });

    var RangeTest = AbstractTest.extend({
        initialize: function (range) {
            if ((range instanceof Array) && range.length == 2 && typeof(range[0]) == "number" && !isNaN(range[0]) && typeof(range[1]) == "number" && !isNaN(range[1]))
                range = {
                    min: Math.min(range[0], range[1]),
                    max: Math.max(range[0], range[1])
                };
            if (typeof(range) != "object" || typeof(range.min) != "number" || isNaN(range.min) || typeof(range.max) != "number" || isNaN(range.max) || range.max < range.min)
                throw new Error("Invalid schema." + this.key + ": must be range.");
            this.schema = range;
        },
        test: function (done) {
            var num = toNumber(this.value);
            var err;
            if (num < this.schema.min)
                err = "min";
            else if (num > this.schema.max)
                err = "max";
            else
                err = false;
            done(err);
        },
        deps: ["type"]
    });

    var IdenticalTest = AbstractTest.extend({
        test: function (done) {
            done(this.value !== this.schema);
        },
        deps: ["required"]
    });

    var EqualTest = AbstractTest.extend({
        test: function (done) {
            var valid;
            if (typeof(this.schema) == "object")
                valid = _.isEqual(this.value, this.schema);
            else
                valid = this.value === this.schema;
            done(!valid);
        },
        deps: ["required"]
    });

    var ContainedTest = AbstractTest.extend({
        initialize: function (list) {
            if (!(list instanceof Array))
                throw new Error("Invalid schema." + this.key + ": must be array.");
            this.schema = list;
        },
        test: function (done) {
            done(this.schema.indexOf(this.value) == -1);
        },
        deps: ["required"]
    });

    var MatchTest = AbstractTest.extend({
        initialize: function (expressions) {
            if (typeof(expressions) == "string" || (expressions instanceof RegExp) || (expressions instanceof Array))
                expressions = {all: expressions};
            if (!_.size(expressions))
                throw new Error("Invalid schema." + this.key + ": empty schema given.");
            _.each(expressions, function (patterns, operator) {
                if (operator != "any" && operator != "all")
                    throw new Error("Invalid schema." + this.key + ": invalid operator[" + operator + "] given.");
                if (!(patterns instanceof Array))
                    expressions[operator] = patterns = [patterns];
                if (!_.size(patterns))
                    throw new Error("Invalid schema." + this.key + ": empty operator." + operator + " given.");
                _.each(patterns, function (pattern, index) {
                    patterns[index] = toRegExp.call(this, pattern);
                }, this);
            }, this);
            this.schema = expressions;
        },
        test: function (done) {
            var value = this.value;
            var match = function (expression) {
                return expression.test(value);
            };
            var valid = true;
            if (this.schema.all && !_.all(this.schema.all, match))
                valid = false;
            if (this.schema.any && !_.any(this.schema.any, match))
                valid = false;
            done(!valid);
        },
        deps: ["type"]
    });

    var DuplicateTest = AbstractTest.extend({
        initialize: function (duplicate) {
            if (typeof(duplicate) != "string")
                throw  new Error("Invalid schema. " + this.key + ": invalid attribute name given.");
            this.related(duplicate, this.attribute);
            this.schema = duplicate;
        },
        test: function (done) {
            done(this.attributes[this.schema] != this.value);
        },
        deps: ["required"]
    });


    module.exports = {
        patterns: patterns,
        required: RequiredTest,
        type: TypeTest,
        min: MinTest,
        max: MaxTest,
        range: RangeTest,
        same: IdenticalTest,
        equal: EqualTest,
        contained: ContainedTest,
        match: MatchTest,
        duplicate: DuplicateTest
    };

});