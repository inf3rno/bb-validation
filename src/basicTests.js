if (typeof define !== 'function')
    var define = require('amdefine')(module, require);

define(function (require, exports, module) {

    var _ = require("underscore"),
        validation = require("./validation")

    var RequiredTest = validation.Test.extend({
        initialize: function (required) {
            this.schema = (required === undefined || !!required);
        },
        run: function (done, value) {
            var existence = value !== undefined;
            if (!existence && this.schema)
                done(true);
            else if (!existence)
                done(false, {abort: true});
            else
                done(false);
        }
    });

    var TypeTest = validation.Test.extend({
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
        run: function (done, value) {
            var passed;
            if (typeof(this.schema) == "string")
                passed = (typeof(value) == this.schema);
            else if (typeof(this.schema) == "function")
                passed = (value instanceof this.schema);
            else
                passed = (value === this.schema);
            done(!passed);
        },
        deps: ["required"]
    });

    var NumberTest = validation.Test.extend({
        toNumber: function (value) {
            if (typeof (value) == "string")
                return value.length;
            else if (value instanceof Array)
                return value.length;
            else if (isNaN(value))
                return Number.NaN;
            else
                return value;
        }
    });

    var MinTest = NumberTest.extend({
        initialize: function (min) {
            if (typeof(min) != "number" || isNaN(min))
                throw new Error("Invalid schema." + this.key + ": must be number.");
            this.schema = min;
        },
        run: function (done, value) {
            done(this.toNumber(value) < this.schema);
        },
        deps: ["type"]
    });

    var MaxTest = NumberTest.extend({
        initialize: function (max) {
            if (typeof(max) != "number" || isNaN(max))
                throw new Error("Invalid schema." + this.key + ": must be number.");
            this.schema = max;
        },
        run: function (done, value) {
            done(this.toNumber(value) > this.schema);
        },
        deps: ["type"]
    });

    var RangeTest = NumberTest.extend({
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
        run: function (done, value) {
            var num = this.toNumber(value);
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

    var IdenticalTest = validation.Test.extend({
        run: function (done, value) {
            done(value !== this.schema);
        },
        deps: ["required"]
    });

    var EqualTest = validation.Test.extend({
        run: function (done, value) {
            var valid;
            if (typeof(this.schema) == "object")
                valid = _.isEqual(value, this.schema);
            else
                valid = value === this.schema;
            done(!valid);
        },
        deps: ["required"]
    });

    var MemberTest = validation.Test.extend({
        initialize: function (list) {
            if (!(list instanceof Array))
                throw new Error("Invalid schema." + this.key + ": must be array.");
            this.schema = list;
        },
        run: function (done, value) {
            done(this.schema.indexOf(value) == -1);
        },
        deps: ["required"]
    });

    var MatchTest = validation.Test.extend({
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
                    patterns[index] = this.toRegExp(pattern);
                }, this);
            }, this);
            this.schema = expressions;
        },
        toRegExp: function (value) {
            var regexp;
            if (typeof(value) == "string")
                regexp = this.common.patterns[value];
            else
                regexp = value;
            if (!(regexp instanceof RegExp))
                throw new SyntaxError("Invalid expression given.");
            return regexp;
        },
        run: function (done, value) {
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

    var DuplicateTest = validation.Test.extend({
        initialize: function (duplicationOf) {
            if (typeof(duplicationOf) != "string")
                throw  new Error("Invalid schema. " + this.key + ": invalid attribute name given.");
            this.related(duplicationOf);
            this.schema = duplicationOf;
        },
        run: function (done, value, relations) {
            done(relations[this.schema] != value);
        },
        deps: ["required"]
    });


    module.exports = {
        common: {
            patterns: {
                digits: /^\d+$/,
                number: /^-?\d+(?:[\.,]\d+)?$/,
                email: /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i,
                url: /^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i
            }
        },
        use: {
            required: RequiredTest,
            type: TypeTest,
            min: MinTest,
            max: MaxTest,
            range: RangeTest,
            identical: IdenticalTest,
            equal: EqualTest,
            member: MemberTest,
            match: MatchTest,
            duplicate: DuplicateTest
        },
        override: false,
        noConflict: true
    };

});