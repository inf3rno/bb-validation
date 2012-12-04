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
    it("stops by error", function () {
        var called = {};
        var testMap = {
            a:function (done) {
                called.a = true;
                done();
            },
            b:function (done) {
                called.b = true;
                done("error");
            },
            c:function (done) {
                called.c = true;
                done();
            }
        };
        var settings = {
            a:null,
            b:null,
            c:null
        };
        var runner = new Runner(testMap, settings);
        var result;
        runner.on("done", function (r) {
            result = r;
        });
        runner.run({});
        expect(called).toEqual({a:true, b:true});
        expect(result).toEqual({b:"error"});
    });
});

describe("validation.DependencyResolver", function () {

    describe("createTestMap", function () {
        it("returns empty tests by empty config", function () {
            expectTestOrder(
                [],
                []
            );
        });

        it("returns tests in config key order if no dependency", function () {
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

        it("returns tests in dependency and config key order by one level depth dependencies", function () {
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
        it("returns tests in dependency and config key order by multi level depth dependencies", function () {
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
        var expectedKeys = [];
        var expectedTests = [];
        _.each(expectedMap, function (key) {
            expectedKeys.push(key);
            expectedTests.push(testStore[key]);
        });
        var actualMap = resolver.createTestMap(names);
        var actualKeys = [];
        var actualTests = [];
        _.each(actualMap, function (test, name) {
            actualKeys.push(nameToStoreKey[name]);
            actualTests.push(test);
        });
        expect(expectedKeys).toEqual(actualKeys);
        expect(expectedTests).toEqual(actualTests);
    };

    var testStore = {
        a:0,
        b:1,
        c:2,
        d:3,
        e:4
    };
    var nameToStoreKey = {
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
    var tests = {
        a:testStore.a,
        b:testStore.b,
        b_a:["a", testStore.b],
        c_ab:["b_a", testStore.c],
        d_ab:["b_a", testStore.d],
        c:testStore.c,
        d_a:["a", testStore.d],
        e_ab:["b_a", testStore.e],
        c_a:["a", testStore.c],
        c_a_b:["a", "b", testStore.c]
    };
    var resolver = new DependencyResolver(tests);
});