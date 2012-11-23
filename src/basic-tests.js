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
    required:function (done, value, required) {
        var existence = value !== undefined;
        done(!existence ? 1 : 0, existence || !required);
    },
    type:["required", function (done, value, type) {
        var passed;
        if (typeof(type) == "string")
            passed = (typeof(value) == type);
        else if (typeof(type) == "function")
            passed = (value instanceof type);
        else
            passed = (value === type);
        done(!passed ? 1 : 0, passed);
    }],
    min:["type", function (done, value, min) {
        var num = toNumber(value);
        var err;
        if (num < min)
            err = 1;
        else
            err = 0;
        done(err, !err);
    }],
    max:["type", function (done, value, max) {
        var num = toNumber(value);
        var err;
        if (num > max)
            err = 1;
        else
            err = 0;
        done(err, !err);
    }],
    range:["type", function (done, value, range) {
        var num = toNumber(value);
        var err;
        if (num < range.min)
            err = 1;
        else if (num > range.max)
            err = 2;
        else
            err = 0;
        done(err, !err);
    }],
    same:["required", function (done, actual, expected) {
        var valid = actual === expected;
        done(valid ? 0 : 1, valid);
    }],
    equal:["required", function (done, actual, expected) {
        var valid;
        if (typeof(expected) == "object")
            valid = _.isEqual(actual, expected);
        else
            valid = actual === expected;
        done(valid ? 0 : 1, valid);
    }],
    contained:["required", function (done, item, list) {
        var valid = list.indexOf(item) != -1;
        done(valid ? 0 : 1, valid);
    }],
    match:["type", function (done, value, expressions) {
        var match = function (expression) {
            return expression.test(value);
        };
        var valid = true;
        if (expressions.all && !_.all(expressions.all, match))
            valid = false;
        if (expressions.any && !_.any(expressions.any, match))
            valid = false;
        done(valid ? 0 : 1, valid);
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
        if (type !== null && (typeof(type) != "string" || ["undefined", "boolean", "number", "string", "object", "function"].indexOf(type) == -1) && !(type instanceof Function))
            throw new Error("Invalid config." + key + ": must be Function or type or null.");
        this[key] = type;
    },
    min:function (min, key) {
        if (typeof(min) != "number" || isNaN(min))
            throw new Error("Invalid config." + key + ": must be number.");
    },
    max:function (max, key) {
        if (typeof(max) != "number" || isNaN(max))
            throw new Error("Invalid config." + key + ": must be number.");
    },
    range:function (range, key) {
        if ((range instanceof Array) && range.length == 2 && typeof(range[0]) == "number" && !isNaN(range[0]) && typeof(range[1]) == "number" && !isNaN(range[1]))
            this[key] = range = {
                min:Math.min(range[0], range[1]),
                max:Math.max(range[0], range[1])
            };
        if (typeof(range) != "object" || typeof(range.min) != "number" || isNaN(range.min) || typeof(range.max) != "number" || isNaN(range.max) || range.max < range.min)
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
            if (operator != "any" && operator != "all")
                throw new Error("Invalid config." + key + ": invalid operator[" + operator + "] given.");
            if (!(patterns instanceof Array))
                expressions[operator] = patterns = [patterns];
            if (!_.size(patterns))
                throw new Error("Invalid config." + key + ": empty operator." + operator + " given.");
            _.each(patterns, function (pattern, index) {
                patterns[index] = toRegExp(pattern);
            });
        });
        this[key] = expressions;
    }
};


module.exports = {
    patterns:patterns,
    attributeValidatorProvider:new validation.AttributeValidatorProvider(tests, checks)
};