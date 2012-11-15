var _ = require("underscore"),
    Backbone = require("backbone"),
    async = require("async");

/** @class*/
var ValidatorProvider = function () {
};
_.extend(ValidatorProvider.prototype, /** @lends ValidatorProvider#*/ {
    createValidator:function (config) {
        var provider = this;
        var validator = function (value) {
            var results = {};
            var tests = {
                environment:function (callback, env) {
                    env.config = config;
                    env.value = value;
                    env.results = results;
                    callback();
                }
            };
            _.each(provider.templates, function (template, name) {
                if (config.hasOwnProperty(name))
                    tests[name] = template;
            });
            async.auto(tests);
            return results;
        };
        return validator;
    },
    templates:{
        required:["environment", function (callback, env) {
            var existence = (env.value !== undefined);
            var passed = (!env.config.required || existence);
            env.results.required = passed;
            callback(existence ? null : true);
        }],
        type:["required", function (callback, env) {
            var passed = (typeof(env.value) == env.config.type);
            env.results.type = passed;
            callback(passed ? null : true);
        }],
        min:["type", function (callback, env) {
            env.results.min = (env.value.length >= env.config.min);
            callback();
        }],
        max:["type", function (callback, env) {
            env.results.max = (env.value.length < env.config.max);
            callback();
        }]
    }
});

describe("validator", function () {
    var provider = new ValidatorProvider();

    describe("call", function () {

        it("returns results", function () {
            var validate = provider.createValidator({
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