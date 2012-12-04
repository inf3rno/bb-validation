var _ = require("underscore"),
    Backbone = require("backbone"),
    Model = require("./validation").Model,
    Validator = require("./validation").Validator;

describe("validation.Model", function () {

    it("extends backbone model", function () {
        expect(Model.prototype instanceof Backbone.Model).toBe(true);
    });

    it("creates different validator instances for each model instance", function () {
        var model = new Model();
        expect(model.validator).not.toBe(undefined);
        var model2 = new Model();
        expect(model2.validator).not.toBe(model.validator);
    });

    it("passes the model to the validator initializer, and runs validator automatically", function () {
        var mockValidator = jasmine.createSpyObj("validator", ["initialize", "run"]);
        var Model2 = Model.extend({
            Validator:function (model) {
                mockValidator.initialize(model);
                return mockValidator;
            }
        });
        var model2 = new Model2();
        expect(mockValidator.initialize).toHaveBeenCalledWith(model2);
        expect(mockValidator.run).toHaveBeenCalledWith(model2.attributes);
    });

    it("runs validator by every change with the complete attribute map", function () {
        var createMockValidator = function () {
            return jasmine.createSpyObj("validator", ["initialize", "run"]);
        };
        var Model2 = Model.extend({
            Validator:createMockValidator
        });
        var model2 = new Model2({
            a:0,
            b:1
        });
        model2.validator = createMockValidator();
        expect(model2.validator.run).not.toHaveBeenCalled();
        model2.validator.run.andReturn("error");
        model2.set({
            a:1
        });
        expect(model2.validator.run).toHaveBeenCalledWith({a:1, b:1});
        expect(model2.validator.run).not.toHaveBeenCalledWith(model2.attributes);
        model2.validator = createMockValidator();
        model2.validator.run.andReturn("error");
        model2.unset("a");
        expect(model2.validator.run).toHaveBeenCalledWith({b:1});
        model2.validator = createMockValidator();
        model2.validator.run.andReturn("error");
        model2.clear();
        expect(model2.validator.run).toHaveBeenCalledWith({});
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

    it("stops by error by each attribute, but every attribute in schema is processed", function () {
        var Validator2 = Validator.extend({});
        Validator2.install({
            tests:{
                a:function (done) {
                    done();
                },
                b:function (done) {
                    done("error");
                },
                c:function (done) {
                    done();
                }
            }
        });
        var model = {
            schema:{
                myAttr:{
                    a:null,
                    b:null,
                    c:null
                },
                myAttr2:{
                    a:null,
                    c:null
                }
            }
        };
        var validator = new Validator2(model);
        validator.run({});
        var result = validator.toJSON();
        expect(result.myAttr).toEqual({b:"error"});
        expect(result.myAttr2).toBe(false);
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