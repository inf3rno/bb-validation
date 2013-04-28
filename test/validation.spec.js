if (typeof define !== 'function')
    var define = require('amdefine')(module, require);

var _ = require("underscore"),
    Backbone = require("backbone"),
    validation = require("../src/validation"),
    Model = validation.Model,
    Validator = validation.Validator,
    Runner = validation.Runner,
    DependencyResolver = validation.DependencyResolver;

describe("validation.Validator", function () {

    it("can install custom tests", function () {
        Validator.customize({
            tests: tests
        });
        expect(Validator.prototype.tests.custom).toEqual(tests.custom);
    });
    it("can install custom checks and patterns either", function () {
        Validator.customize({
            checks: checks,
            patterns: patterns
        });
        expect(Validator.prototype.tests.custom).toEqual(tests.custom);
        expect(Validator.prototype.checks.custom).toEqual(checks.custom);
        expect(Validator.prototype.patterns.custom).toEqual(patterns.custom);
    });

    it("can inherit tests, checks, patterns, but cannot override super", function () {
        var Validator2 = Validator.extend({});
        Validator2.customize({
            tests: testsOverride,
            checks: checkOverride,
            patterns: patternsOverride
        });
        expect(Validator2.prototype.tests.custom).toEqual(testsOverride.custom);
        expect(Validator2.prototype.tests.custom2).toEqual(tests.custom2);
        expect(Validator2.prototype.checks.custom).toEqual(checkOverride.custom);
        expect(Validator2.prototype.checks.custom2).toEqual(checks.custom2);
        expect(Validator2.prototype.patterns.custom).toEqual(patternsOverride.custom);
        expect(Validator2.prototype.patterns.custom2).toEqual(patterns.custom2);
    });

    it("creates dependency resolver with tests", function () {
        var mockModel = {
        };
        var mockResolver = jasmine.createSpyObj("resolver", ["initialize", "createTestMap"]);
        var mockRunner = jasmine.createSpyObj("runner", ["initialize", "on"]);
        var Validator2 = Validator.extend({
            DependencyResolver: function () {
                mockResolver.initialize.apply(mockResolver, arguments);
                return mockResolver;
            },
            Runner: function () {
                return mockRunner;
            }
        });
        var validator = new Validator2({
            model: mockModel,
            schema: {
                attr1: {
                    test1: "a",
                    test2: "b"
                },
                attr2: {
                    test1: "c"
                }
            }
        });
        expect(mockResolver.initialize.callCount).toEqual(1);
        expect(mockResolver.initialize).toHaveBeenCalledWith(Validator2.prototype.tests);
        expect(mockResolver.createTestMap.callCount).toEqual(2);
    });

    it("creates runners with dependency resolver outputs", function () {
        var mockModel = {

        };
        var testMap1 = {test1: function () {
        }, test2: function () {
        }};
        var testMap2 = {test1: function () {
        }};
        var mockResolver = jasmine.createSpyObj("resolver", ["initialize", "createTestMap"]);
        mockResolver.createTestMap.andCallFake(function (names) {
            if (names.length == 2)
                return testMap1;
            else if (names.length == 1)
                return testMap2;
        });
        var mockRunner = jasmine.createSpyObj("runner", ["initialize", "on"]);
        var Validator2 = Validator.extend({
            DependencyResolver: function () {
                mockResolver.initialize.apply(mockResolver, arguments);
                return mockResolver;
            },
            Runner: function () {
                mockRunner.initialize.apply(mockRunner, arguments);
                return mockRunner;
            }
        });
        var validator = new Validator2({
            model: mockModel,
            schema: {
                attr1: {
                    test1: "a",
                    test2: "b"
                },
                attr2: {
                    test1: "c"
                }
            }
        });
        expect(mockResolver.initialize.callCount).toEqual(1);
        expect(mockResolver.initialize).toHaveBeenCalledWith(Validator2.prototype.tests);

        expect(mockRunner.initialize.callCount).toEqual(2);
        expect(mockRunner.initialize).toHaveBeenCalledWith(testMap1, validator.schema.attr1);
        expect(mockRunner.initialize).toHaveBeenCalledWith(testMap2, validator.schema.attr2);

        expect(mockRunner.on).toHaveBeenCalled();
    });

    it("calls checks by construct", function () {
        var mockModel = {
        };
        var check1 = jasmine.createSpy("check1");
        var check2 = jasmine.createSpy("check2");
        var Validator2 = Validator.extend({}).customize({
            checks: {
                test1: check1, test2: check2
            },
            tests: {
                test1: function () {
                }, test2: function () {
                }
            }
        });
        var validator = new Validator2({
            model: mockModel,
            schema: {
                attr1: {
                    test1: "a",
                    test2: "b"
                },
                attr2: {
                    test1: "c"
                }
            }
        });
        expect(check1.callCount).toEqual(2);
        expect(check2.callCount).toEqual(1);
        expect(check1).toHaveBeenCalledWith("a", "test1", "attr1");
        expect(check1).toHaveBeenCalledWith("c", "test1", "attr2");
        expect(check2).toHaveBeenCalledWith("b", "test2", "attr1");
    });


    it("calls the runners by run", function () {
        var mockModel = {
        };
        var mockResolver = jasmine.createSpyObj("resolver", ["createTestMap"]);
        var mockRunner = jasmine.createSpyObj("runner", ["on", "run"]);
        var Validator2 = Validator.extend({
            DependencyResolver: function () {
                return mockResolver;
            },
            Runner: function () {
                return mockRunner;
            }
        });
        var validator = new Validator2({
            model: mockModel,
            schema: {
                attr1: {
                    test1: "a",
                    test2: "b"
                },
                attr2: {
                    test1: "c"
                }
            }
        });
        expect(mockRunner.run).not.toHaveBeenCalled();
        var attributes = {attr1: 1};
        mockModel.get = function (attr) {
            return attributes[attr];
        };
        validator.run(attributes);
        expect(mockRunner.run.callCount).toEqual(0);
        mockRunner.run.reset();

        mockModel.get = function (attr) {
            if (attr == "attr1")
                return attributes.attr1;
            else
                return {};
        };
        validator.run(attributes);
        expect(mockRunner.run.callCount).toEqual(1);
        mockRunner.run.reset();

        mockModel.get = function (attr) {
            return {};
        };
        validator.run(attributes);
        expect(mockRunner.run.callCount).toEqual(2);
        mockRunner.run.reset();
    });

    var tests = {
        custom: function (done) {
            done();
        },
        custom2: function (done) {
            done();
        }
    };
    var testsOverride = {
        custom: function (done) {
            done();
        }
    };
    var checks = {
        custom: function (config) {
        },
        custom2: function (config2) {
        }
    };
    var checkOverride = {
        custom: function (config) {
        }
    };
    var patterns = {
        custom: new RegExp(),
        custom2: new RegExp()
    };
    var patternsOverride = {
        custom: new RegExp()
    };

});

describe("validation.Runner", function () {
    it("calls tests with the proper settings property", function () {
        var called = {};
        var register = function (done) {
            called[this.name] = {
                schema: this.schema,
                value: this.value,
                attributes: this.attributes
            };
            done();
        };
        var testMap = {
            a: register,
            b: register
        };
        var schema = {
            a: 1,
            b: 2
        };
        var runner = new Runner(testMap, schema);
        var attributes = {
            attr1: "value1",
            attr2: "value2"
        };
        runner.run(attributes, attributes.attr1);
        expect(called).toEqual({
            a: {
                schema: schema.a,
                value: attributes.attr1,
                attributes: attributes
            },
            b: {
                schema: schema.b,
                value: attributes.attr1,
                attributes: attributes
            }
        });
    });

    it("stops by error", function () {
        var called = {};
        var testMap = {
            a: function (done) {
                called.a = true;
                done();
            },
            b: function (done) {
                called.b = true;
                done("error");
            },
            c: function (done) {
                called.c = true;
                done();
            }
        };
        var settings = {
            a: null,
            b: null,
            c: null
        };
        var runner = new Runner(testMap, settings);
        var result;
        runner.on("end", function (r) {
            result = r;
        });
        runner.run({});
        expect(called).toEqual({a: true, b: true});
        expect(result).toEqual({b: "error"});
    });

    it("keeps correct order by async tests", function () {
        var called = [];
        var testMap = {
            a: function (done) {
                setTimeout(function () {
                    called.push(this.name);
                    done();
                }.bind(this), 1);
            },
            b: function (done) {
                called.push(this.name);
                done();
            }
        };
        var settings = {
            a: null,
            b: null
        };
        var isDone = false;
        var runner = new Runner(testMap, settings);
        runner.on("end", function () {
            isDone = true;
        });
        runs(function () {
            runner.run({});
        });
        waitsFor(function () {
            return isDone;
        });
        runs(function () {
            expect(called).toEqual(["a", "b"]);
        });
    });

    it("triggers done without tests", function () {
        var test = jasmine.createSpy("test").andCallFake(function (done) {
            done();
        });

        var testMap = {
            a: test,
            b: test
        };
        var settings = {};
        var runner = new Runner(testMap, settings);
        var isDone = false;
        runner.on("end", function (r) {
            isDone = true;
        });
        runner.run({});
        expect(isDone).toEqual(true);
        expect(test).not.toHaveBeenCalled();
    });

    it("restarts sequence by a second call of run", function () {
        var called = [];
        var testMap = {
            a: function (done) {
                called.push(this.name);
                done();
            },
            b: function (done) {
                setTimeout(function () {
                    called.push(this.name);
                    done();
                }.bind(this), 1);
            },
            c: function (done) {
                called.push(this.name);
                done();
            }
        };
        var settings = {
            a: null,
            b: null,
            c: null
        };
        var runner = new Runner(testMap, settings);
        var atEnd = false;
        runner.on("end", function (r) {
            atEnd = true;
        });
        runs(function () {
            runner.run({});
            runner.run({});
        });
        waitsFor(function () {
            return atEnd;
        });
        runs(function () {
            expect(called).toEqual(["a", "a", "b", "b", "c"]);
        });
    });

    it("has a pending state", function () {
        var testMap = {
            a: function (done) {
                setTimeout(function () {
                    done();
                }.bind(this), 1);
            }
        };
        var settings = {
            a: null
        };
        var isDone = false;
        var runner = new Runner(testMap, settings);
        runner.on("end", function () {
            isDone = true;
        });
        runs(function () {
            runner.run({});
            expect(runner.pending).toBe(true);
        });
        waitsFor(function () {
            return isDone;
        });
        runs(function () {
            expect(runner.pending).toBe(false);
        });
    });
});

describe("validation.DependencyResolver", function () {

    describe("createTestMap", function () {
        it("returns empty tests by empty schema", function () {
            expectTestOrder(
                [],
                []
            );
        });

        it("returns tests in schema key order if no dependency", function () {
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

        it("returns tests in dependency and schema key order by one level depth dependencies", function () {
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
        it("returns tests in dependency and schema key order by multi level depth dependencies", function () {
            expectTestOrder(
                ["a", "b", "c"],
                ["a", "b_a", "c_ba"]
            );
            expectTestOrder(
                ["a", "b", "c"],
                ["a", "c_ba", "b_a"]
            );
            expectTestOrder(
                ["a", "b", "c"],
                ["c_ba", "b_a"]
            );
            expectTestOrder(
                ["a", "b", "c"],
                ["b_a", "c_ba"]
            );
            expectTestOrder(
                ["a", "b", "c"],
                ["c_ba"]
            );
            expectTestOrder(
                ["a", "d", "b", "c"],
                ["d_a", "c_ba"]
            );
            expectTestOrder(
                ["a", "b", "c", "d"],
                ["c_ba", "d_a"]
            );
            expectTestOrder(
                ["a", "d", "b", "e", "c"],
                ["d_a", "e_ba", "c_ba"]
            );
        });
    });

    var expectTestOrder = function (expectedMap, descriptions) {
        var tests = {};
        var parse = function (description) {
            if (tests[description])
                return;
            if (description.length == 1) {
                tests[description] = {};
                return;
            }
            var parts = description.split("_");
            var testName = parts[0];
            parse(testName);
            var test = tests[testName];
            parts.shift();
            var deps = [];
            _.each(parts, function (part) {
                var dep = part.split("").join("_");
                deps.push(dep);
                parse(dep);
            });
            deps.push(test);
            tests[description] = deps;
        };
        _.each(descriptions, parse);

        var resolver = new DependencyResolver(tests);

        var expectedKeys = [];
        var expectedTests = [];
        _.each(expectedMap, function (key) {
            expectedKeys.push(key);
            expectedTests.push(tests[key]);
        });
        var actualMap = resolver.createTestMap(descriptions);
        var actualKeys = [];
        var actualTests = [];
        var nameToStoreKey = function (name) {
            var parts = name.split("_");
            return parts[0];
        };
        _.each(actualMap, function (test, name) {
            actualKeys.push(nameToStoreKey(name));
            actualTests.push(test);
        });
        expect(expectedKeys).toEqual(actualKeys);
        expect(expectedTests).toEqual(actualTests);
    };


});