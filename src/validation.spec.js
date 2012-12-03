var _ = require("underscore"),
    Backbone = require("backbone"),
    Model = require("./validation").Model,
    Validator = require("./validation").Validator;

describe("validation.Model", function () {

    it("extends backbone model", function () {
        expect(Model.prototype instanceof Backbone.Model).toBe(true);
    });

    it("creates a validator instance for every model instance", function () {
        var model = new Model();
        expect(model.validator).not.toBe(undefined);
        var model2 = new Model();
        expect(model2.validator).not.toBe(model.validator);
    });

});

describe("validation.Validator", function () {

    it("can install custom tests", function () {
        Validator.install({
            tests:tests
        });
        expect(Validator.prototype.tests.custom).toEqual(tests.custom);
    });
    it("can install custom checks and patterns either", function () {
        Validator.install({
            checks:checks,
            patterns:patterns
        });
        expect(Validator.prototype.checks.custom).toEqual(checks.custom);
        expect(Validator.prototype.patterns.custom).toEqual(patterns.custom);
    });

    it("can inherit tests, checks, patterns, but cannot override super", function () {
        var Validator2 = Validator.extend({});
        Validator2.install({
            tests:testsOverride,
            checks:checkOverride,
            patterns:patternsOverride
        });
        expect(Validator2.prototype.tests.custom).toEqual(testsOverride.custom);
        expect(Validator2.prototype.tests.custom2).toEqual(tests.custom2);
        expect(Validator2.prototype.checks.custom).toEqual(checkOverride.custom);
        expect(Validator2.prototype.checks.custom2).toEqual(checks.custom2);
        expect(Validator2.prototype.patterns.custom).toEqual(patternsOverride.custom);
        expect(Validator2.prototype.patterns.custom2).toEqual(patterns.custom2);
    });

    var tests = {
        custom:function (done) {
            done();
        },
        custom2:function (done) {
            done();
        }
    };
    var testsOverride = {
        custom:function (done) {
            done();
        }
    };
    var checks = {
        custom:function (config) {
        },
        custom2:function (config2) {
        }
    };
    var checkOverride = {
        custom:function (config) {
        }
    };
    var patterns = {
        custom:new RegExp(),
        custom2:new RegExp()
    };
    var patternsOverride = {
        custom:new RegExp()
    };


});