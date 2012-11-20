var _ = require("underscore"),
    Backbone = require("backbone"),
    async = require("async");

/** @class*/
var ValidatorProvider = function () {
};
_.extend(ValidatorProvider.prototype, /** @lends ValidatorProvider#*/ {
    validator:function (config) {
        var tests = this.selector(config);
        var validator = function (value) {
            var results = {};
            _.all(tests, function (test, key) {
                return test.call(results, value, config[key], key) !== false;
            });
            return results;
        };
        return validator;
    },
    templates:{
        required:function (value, required, key) {
            var existence = (value !== undefined);
            var passed = (!required || existence);
            this[key] = passed;
            return existence;
        },
        type:["required", function (value, type, key) {
            var passed = (typeof(value) == type);
            this[key] = passed;
            return passed;
        }],
        min:["type", function (value, min, key) {
            this[key] = (value.length >= min);
        }],
        max:["type", function (value, max, key) {
            this[key] = (value.length < max);
        }]
    },
    selector:(function () {
        var need = function (key) {
            if (!(key in this.templates))
                throw new SyntaxError("The " + key + " is not a registered test template.");
        };
        var dependencies = function (key) {
            var template = this.templates[key];
            if (template instanceof Array)
                return template.slice(0, -1);
            else
                return [];
        };
        var template = function (key) {
            var template = this.templates[key];
            if (template instanceof Array)
                return template[template.length - 1];
            else
                return template;
        };
        var unfold = function (key, tests) {
            need.call(this, key);
            _.each(dependencies.call(this, key), function (key) {
                if (!(key in tests))
                    unfold.call(this, key, tests);
            }, this);
            tests[key] = template.call(this, key);
        };
        return function (config) {
            var tests = {};
            _.each(config, function (params, key) {
                unfold.call(this, key, tests);
            }, this);
            return tests;
        };
    })()


});

describe("validator", function () {
    var provider = new ValidatorProvider();

    describe("call", function () {

        it("returns results", function () {
            var validate = provider.validator({
                required:true,
                type:"string",
                min:3,
                max:10
            });
            expect(validate("abcde")).toEqual({required:true, type:true, min:true, max:true});
            expect(validate("a")).toEqual({required:true, type:true, min:false, max:true});
            expect(validate(0)).toEqual({required:true, type:false});
            expect(validate()).toEqual({required:false});
        });

    });
});