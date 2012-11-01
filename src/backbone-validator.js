if (typeof define !== 'function')
    var define = require('amdefine')(module);

define(function (require, exports, module) {
    var _ = require("underscore"),
        Backbone = require("backbone");

    var Suite = function () {
    };
    Suite.prototype = {
        /** @param Validator validator*/
        required:function (validator, required) {
            var existence = (validator.value !== undefined);
            if (existence || !required)
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
         * @param RegExp pattern
         * */
        match:function (validator, pattern) {
            if (pattern.test(validator.value))
                validator.pass();
            else
                validator.fail();
        }
    };

    var Validator = function () {

    };
    _.extend(Validator.prototype, /** @lends Validator#*/ Backbone.Events, /** @lends Validator#*/{
        pass:function () {

        },
        fail:function () {
        },
        failAll:function () {
        }
    });

    module.exports = {
        Suite:Suite,
        Validator:Validator
    };

    _.extend(Backbone, module.exports);
});