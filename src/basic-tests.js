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
    required:function () {
        var existence = this.value !== undefined;
        this.done(existence ? 0 : 1, existence || !this.config);
    },
    type:["required", function () {
        var passed;
        if (typeof(this.config) == "string")
            passed = (typeof(this.value) == this.config);
        else if (typeof(this.config) == "function")
            passed = (this.value instanceof this.config);
        else
            passed = (this.value === this.config);
        this.done(passed ? 0 : 1, passed);
    }],
    min:["type", function () {
        var num = toNumber(this.value);
        var err;
        if (num < this.config)
            err = 1;
        else
            err = 0;
        this.done(err, !err);
    }],
    max:["type", function () {
        var num = toNumber(this.value);
        var err;
        if (num > this.config)
            err = 1;
        else
            err = 0;
        this.done(err, !err);
    }],
    range:["type", function () {
        var num = toNumber(this.value);
        var err;
        if (num < this.config.min)
            err = 1;
        else if (num > this.config.max)
            err = 2;
        else
            err = 0;
        this.done(err, !err);
    }],
    same:["required", function () {
        var valid = this.value === this.config;
        this.done(valid ? 0 : 1, valid);
    }],
    equal:["required", function () {
        var valid;
        if (typeof(this.config) == "object")
            valid = _.isEqual(this.value, this.config);
        else
            valid = this.value === this.config;
        this.done(valid ? 0 : 1, valid);
    }],
    contained:["required", function () {
        var valid = this.config.indexOf(this.value) != -1;
        this.done(valid ? 0 : 1, valid);
    }],
    match:["type", function () {
        var value = this.value;
        var match = function (expression) {
            return expression.test(value);
        };
        var valid = true;
        if (this.config.all && !_.all(this.config.all, match))
            valid = false;
        if (this.config.any && !_.any(this.config.any, match))
            valid = false;
        this.done(valid ? 0 : 1, valid);
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
    tests:tests,
    checks:checks
};