var _ = require("underscore"),
    Backbone = require("backbone"),
    Model = require("./validation").Model,
    Validator = require("./validation").Validator;

describe("validation.Model", function () {

    it("extends backbone model", function () {
        expect(Model.prototype instanceof Backbone.Model).toBe(true);
    });

});

describe("validation.Validator", function () {

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

    it("can install custom tests", function () {
        Validator.install({
            tests:tests
        });
        expect(Validator.prototype.tests.custom).toEqual(tests.custom);
    });

    it("can inherit tests, but cannot override super", function () {
        var Validator2 = Validator.extend({});
        Validator2.install({
            tests:testsOverride
        });
        expect(Validator2.prototype.tests.custom).toEqual(testsOverride.custom);
        expect(Validator2.prototype.tests.custom2).toEqual(tests.custom2);
    });

});