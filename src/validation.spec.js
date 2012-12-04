var _ = require("underscore"),
    Backbone = require("backbone"),
    validation = require("./validation"),
    Model = validation.Model,
    Validator = validation.Validator,
    Runner = validation.Runner,
    DependencyResolver = validation.DependencyResolver;

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

describe("validation.Runner", function () {
});

describe("validation.DependencyResolver", function () {

    describe("createTestMap", function () {
        it("returns empty definitions by empty config", function () {
            expectTestOrder(
                [],
                []
            );
        });

        it("returns definitions in config key order if no dependency", function () {
            expectTestOrder(
                ["a"],
                ["a"]
            );
            expectTestOrder(
                ["a", "b"],
                ["a", "b"]
            );
            expectTestOrder(
                ["b", "a"],
                ["b", "a"]
            );
            expectTestOrder(
                ["b", "c", "a"],
                ["b", "c", "a"]
            );
            expectTestOrder(
                ["a", "b", "c"],
                ["a", "b", "c"]
            );
        });

        it("returns definitions in dependency and config key order by one level depth dependencies", function () {
            expectTestOrder(
                ["a", "b"],
                ["a", "b_a"]
            );
            expectTestOrder(
                ["a", "b"],
                ["b_a", "a"]
            );
            expectTestOrder(
                ["a", "b"],
                ["b_a"]
            );
            expectTestOrder(
                ["a", "b", "c"],
                ["b_a", "c_a"]
            );
            expectTestOrder(
                ["a", "c", "b"],
                ["c_a", "b_a"]
            );
            expectTestOrder(
                ["a", "d", "b", "c"],
                ["d_a", "c_a_b"]
            );
        });
        it("returns definitions in dependency and config key order by multi level depth dependencies", function () {
            expectTestOrder(
                ["a", "b", "c"],
                ["a", "b_a", "c_ab"]
            );
            expectTestOrder(
                ["a", "b", "c"],
                ["a", "c_ab", "b_a"]
            );
            expectTestOrder(
                ["a", "b", "c"],
                ["c_ab", "b_a"]
            );
            expectTestOrder(
                ["a", "b", "c"],
                ["b_a", "c_ab"]
            );
            expectTestOrder(
                ["a", "b", "c"],
                ["c_ab"]
            );
            expectTestOrder(
                ["a", "d", "b", "c"],
                ["d_a", "c_ab"]
            );
            expectTestOrder(
                ["a", "b", "c", "d"],
                ["c_ab", "d_a"]
            );
            expectTestOrder(
                ["a", "d", "b", "e", "c"],
                ["d_a", "e_ab", "c_ab"]
            );
        });
    });

    var expectTestOrder = function (expectedMap, names) {
        var expectedNames = [];
        var expectedTests = [];
        _.each(expectedMap, function (name) {
            expectedNames.push(name);
            expectedTests.push(tests[name]);
        });
        var actualMap = resolver.createTestMap(names);
        var actualNames = [];
        var actualTests = [];
        _.each(actualMap, function (test, definitionName) {
            actualNames.push(definitionNameToTestName[definitionName]);
            actualTests.push(test);
        });
        expect(expectedNames).toEqual(actualNames);
        expect(expectedTests).toEqual(actualTests);
    };

    var tests = {
        a:0,
        b:1,
        c:2,
        d:3,
        e:4
    };
    var definitionNameToTestName = {
        a:"a",
        b:"b",
        b_a:"b",
        e_ab:"e",
        c_ab:"c",
        d_ab:"d",
        c:"c",
        d_a:"d",
        e_ab:"e",
        c_a:"c",
        c_a_b:"c"
    };
    var definitions = {
        a:tests.a,
        b:tests.b,
        b_a:["a", tests.b],
        c_ab:["b_a", tests.c],
        d_ab:["b_a", tests.d],
        c:tests.c,
        d_a:["a", tests.d],
        e_ab:["b_a", tests.e],
        c_a:["a", tests.c],
        c_a_b:["a", "b", tests.c]
    };
    var resolver = new DependencyResolver(definitions);
});