if (typeof define !== 'function')
    var define = require('amdefine')(module);

define(function (require, exports, module) {
    var _ = require("underscore"),
        Backbone = require("backbone");

    /** @class
     * @constructor
     */
    var Patterns = function (patterns) {
        if (patterns)
            _.extend(this, patterns);
    };
    _.extend(Patterns.prototype, /** @lends Patterns#*/ {
        digits:/^\d+$/,
        number:/^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/,
        email:/^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i,
        url:/^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i
    });

    /** @class
     * @constructor
     */
    var Suite = function (suite) {
        if (suite) {
            var patterns = this.patterns;
            _.extend(this, suite);
            if (suite.patterns)
                this.patterns = new Patterns(_.extend({}, patterns, suite.patterns));
        }
    };
    _.extend(Suite.prototype, /** @lends Suite#*/{
        /** @type Patterns patterns*/
        patterns:new Patterns(),
        /** @param Validator validator*/
        required:function (validator, required) {
            var existence = (validator.value !== undefined);
            if (!existence && !required)
                validator.passAll();
            else if (existence || !required)
                validator.pass();
            else
                validator.failAll();
        },
        /** @param Validator validator*/
        type:function (validator, type) {
            if (type == "null")
                type = null;
            else if (type === undefined)
                type = "undefined";
            else if (typeof(type) == "function" && typeof (validator.value) != "object" && typeof (validator.value) != "function") {
                if (type == String)
                    type = "string";
                else if (type == Number)
                    type = "number";
                else if (type == Boolean)
                    type = "boolean";
            }
            else if (type == Object)
                type = "object";
            var typeMatch;
            if (typeof(type) == "string")
                typeMatch = (typeof(validator.value) == type);
            else if (typeof(type) == "function")
                typeMatch = (validator.value instanceof type);
            else if (type === null)
                typeMatch = (validator.value === type);
            else
                throw new SyntaxError("Invalid type param.");
            if (typeMatch)
                validator.pass();
            else
                validator.failAll();
        },
        /** @param Validator validator*/
        min:function (validator, min) {
            if (isNaN(min))
                throw new SyntaxError("Invalid min param.");
            var number = typeof (validator.value) == "string" ? validator.value.length : validator.value;
            if (number < min)
                validator.fail();
            else
                validator.pass();
        },
        /** @param Validator validator*/
        max:function (validator, max) {
            if (isNaN(max))
                throw new SyntaxError("Invalid max param.");
            var number = typeof (validator.value) == "string" ? validator.value.length : validator.value;
            if (number > max)
                validator.fail();
            else
                validator.pass();
        },
        /** @param Validator validator*/
        range:function (validator, range) {
            if (typeof(range) != "object" || isNaN(range.min) || isNaN(range.max))
                throw new SyntaxError("Invalid range param.");
            var number = typeof (validator.value) == "string" ? validator.value.length : validator.value;
            if (number > range.max || number < range.min)
                validator.fail();
            else
                validator.pass();
        },
        /** @param Validator validator*/
        equal:function (validator, expected) {
            if (typeof(expected) == "object" ? _.isEqual(validator.value, expected) : validator.value === expected)
                validator.pass();
            else
                validator.fail();
        },
        /** @param Validator validator*/
        same:function (validator, expected) {
            if (validator.value === expected)
                validator.pass();
            else
                validator.fail();
        },
        /** @param Validator validator*/
        contained:function (validator, list) {
            if (list.indexOf(validator.value) != -1)
                validator.pass();
            else
                validator.fail();
        },
        /** @param Validator validator
         * @param RegExp expression
         * */
        match:function (validator, expressions) {
            if (typeof(expressions) == "string" || (expressions instanceof RegExp) || (expressions instanceof Array))
                expressions = {all:expressions};
            if (expressions.all && !(expressions.all instanceof Array))
                expressions.all = [expressions.all];
            if (expressions.any && !(expressions.any instanceof Array))
                expressions.any = [expressions.any];
            var tester = function (expression) {
                if (typeof(expression) == "string")
                    expression = this.patterns[expression];
                if (!(expression instanceof RegExp))
                    throw new SyntaxError("Invalid expression given.");
                return expression.test(validator.value);
            };
            var valid = true;
            if (expressions.all)
                valid = valid && _.all(expressions.all, tester, this);
            if (expressions.any)
                valid = valid && _.any(expressions.any, tester, this);
            if (valid)
                validator.pass();
            else
                validator.fail();
        }
    });

    /** @class
     * @extends Backbone.Events
     * @constructor
     */
    var Validator = function (schema) {
        this.rules = {};
        if (schema) {
            _.extend(this.rules, schema);
            if (schema.suite) {
                this.suite = new Suite(_.extend({}, this.suite, schema.suite));
                delete(this.rules.suite);
            }
        }
    };
    _.extend(Validator.prototype, Backbone.Events, /** @lends Validator#*/{
        suite:new Suite(),
        validate:function (model) {
            this.results = {};
            _.each(this.rules, function (rule, attribute) {
                this.stack = {};
                this.attribute = attribute;
                this.value = model.get(attribute);
                this.next = false;
                _.all(rule, function (params, test) {
                    this.test = test;
                    var check = this.suite[test];
                    if (!(check instanceof Function))
                        throw new SyntaxError("Invalid validator config: test " + test + " not exist.");
                    check.call(this.suite, this, params);
                    return !this.next;
                }, this);
                this.results[this.attribute] = this.stack;
                this.trigger
            }, this);
            return this.results;
        },
        pass:function () {
            this.stack[this.test] = true;
        },
        fail:function () {
            this.stack[this.test] = false;
        },
        passAll:function () {
            this.stack = {};
            this.pass();
            this.next = true;
        },
        failAll:function () {
            this.stack = {};
            this.fail();
            this.next = true;
        }
    });

    module.exports = {
        Patterns:Patterns,
        Suite:Suite,
        Validator:Validator
    };

    _.extend(Backbone, module.exports);
})
;