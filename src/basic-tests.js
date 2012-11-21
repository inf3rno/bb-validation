var _ = require("underscore"),
    Backbone = require("backbone"),
    validation = require("./backbone-validator");

var patterns = {
    digits:/^\d+$/,
    number:/^-?\d+(?:[\.,]\d+)?$/,
    email:/^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i,
    url:/^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i
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
        regexp = patterns[value];
    else
        regexp = value;
    if (!(regexp instanceof RegExp))
        throw new SyntaxError("Invalid expression given.");
    return regexp;
};

var tests = {
    required:function (value, required, done) {
        var existence = value === undefined;
        done(!existence, existence || !required);
    },
    type:["required", function (value, type, done) {
        var passed;
        if (typeof(type) == "string")
            passed = (typeof(value) == type);
        else if (typeof(type) == "function")
            passed = (value instanceof type);
        else
            passed = (value === type);
        done(!passed, passed);
    }],
    min:["type", function (value, min, done) {
        var num = toNumber(value);
        done(null, num >= min);
    }],
    max:["type", function (value, max, done) {
        var num = toNumber(value);
        done(null, num <= max);
    }],
    range:["type", function (value, range, done) {
        var num = toNumber(value);
        done(null, num >= range.min && num <= range.max);
    }],
    same:["required", function (actual, expected, done) {
        done(null, actual === expected);
    }],
    equal:["required", function (actual, expected, done) {
        if (typeof(expected) == "object")
            done(null, _.isEqual(actual, expected));
        else
            done(null, actual === expected);
    }],
    contained:["required", function (item, list, done) {
        done(null, list.indexOf(item) != -1);
    }],
    match:["type", function (value, expressions, done) {
        var match = function (expression) {
            return expression.test(value);
        };
        var valid = true;
        if (expressions.all && !_.all(expressions.all, match))
            valid = false;
        if (expressions.any && !_.any(expressions.any, match))
            valid = false;
        done(null, valid);
    }]
};

var checks = {
    required:function (required, key) {
        this[key] = required === undefined || !!required;
    },
    type:function (type, key) {
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
        if (type !== null && typeof(type) != "string" && !(type instanceof Function))
            throw new Error("Invalid config." + key + ": must be Function or type or null.");
        this[key] = type;
    },
    min:function (min, key) {
        if (isNaN(min))
            throw new Error("Invalid config." + key + ": must be number.");
    },
    max:function (max, key) {
        if (isNaN(max))
            throw new Error("Invalid config." + key + ": must be number.");
    },
    range:function (range, key) {
        if (range instanceof Array)
            this[key] = range = {
                min:Math.min(range[0], range[1]),
                max:Math.max(range[0], range[1])
            };
        if (typeof(range) != "object" || isNaN(range.min) || isNaN(range.max))
            throw new Error("Invalid config." + key + ": must be range.");
    },
    contained:function (list, key) {
        if (!(list instanceof Array))
            throw new Error("Invalid config." + key + ": must be array.");
    },
    match:function (expressions, key) {
        if (typeof(expressions) == "string" || (expressions instanceof RegExp) || (expressions instanceof Array))
            expressions = {all:expressions};
        if (!_.size(expressions))
            throw new Error("Invalid config." + key + ": empty config given.");
        _.each(expressions, function (patterns, operator) {
            if (operator != "any" || operator != "all")
                throw new Error("Invalid config." + key + ": invalid operator[" + operator + "] given.");
            if (!(patterns instanceof Array))
                this[operator] = patterns = [patterns];
            if (!_.size(patterns))
                throw new Error("Invalid config." + key + ": empty operator." + operator + " given.");
            _.each(patterns, function (pattern, index) {
                this[index] = toRegExp(pattern);
            });
        });
        this[key] = expressions;
    }
};


module.exports = {
    patterns:patterns,
    attributeValidatorProvider:new validation.AttributeValidatorProvider(tests, checks)
};