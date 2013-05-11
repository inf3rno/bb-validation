if (typeof define !== 'function')
    var define = require('amdefine')(module, require);
require("./jasmine-stub");

var _ = require("underscore"),
    Backbone = require("backbone");
require("../src/backbone-validator");

var Validator = Backbone.Validator;
var TestProvider = Backbone.Validator.TestProvider;
var Parallel = Backbone.Validator.Parallel;
var Series = Backbone.Validator.Series;
var Test = Backbone.Validator.Test;
var NextTest = Test.extend({
    constructor: function (config) {
        this.config = config;
        Test.call(this, {});
    }
});
var ErrorTest = NextTest.extend({
    evaluate: function (callback) {
        callback({error: this.config || true});
    }
});
var EndTest = NextTest.extend({
    evaluate: function (callback) {
        callback({end: true});
    }
});
var AsyncNextTest = NextTest.extend({
    evaluate: function (callback) {
        setTimeout(function () {
            callback();
        }.bind(this), 1);
    }
});
var AsyncErrorTest = NextTest.extend({
    evaluate: function (callback) {
        setTimeout(function () {
            callback({error: this.config || true});
        }.bind(this), 1);
    }
});

describe("Validator", function () {

    describe("series", function () {
        it("returns empty tests by empty schema", function () {
            expectDependency({}, [], {});
        });

        it("returns tests in schema key order if no dependency", function () {
            var use = {
                a: {},
                b: {}
            };
            expectDependency(use, ["a"], ["a"]);
            expectDependency(use, ["a", "b"], ["a", "b"]);
        });

        it("returns tests in dependency and schema key order by one level depth dependencies", function () {
            var use = {
                a: {},
                b: {
                    deps: ["a"]
                }
            };
            expectDependency(use, ["a", "b"], ["a", "b"]);
            expectDependency(use, ["b", "a"], ["a", "b"]);
            expectDependency(use, ["b"], ["a", "b"]);
        });
        it("returns tests in dependency and schema key order by multi level depth dependencies", function () {
            var use = {
                a: {},
                b: {
                    deps: ["a"]
                },
                c: {
                    deps: ["b"]
                }
            };
            expectDependency(use, ["a", "b", "c"], ["a", "b", "c"]);
            expectDependency(use, ["b", "c", "a"], ["a", "b", "c"]);
            expectDependency(use, ["c", "b", "a"], ["a", "b", "c"]);
            expectDependency(use, ["a", "c"], ["a", "b", "c"]);
            expectDependency(use, ["c", "a"], ["a", "b", "c"]);
            expectDependency(use, ["b", "c"], ["a", "b", "c"]);
            expectDependency(use, ["c", "b"], ["a", "b", "c"]);
            expectDependency(use, ["c"], ["a", "b", "c"]);

            var use = {
                a: {
                    deps: ["b", "c"]
                },
                b: {
                    deps: ["d"]
                },
                c: {
                    deps: ["d"]
                },
                d: {}
            };

            expectDependency(use, ["a"], ["d", "b", "c", "a"]);
        });

        it("prevents circular dependency", function () {
            var aa = {
                a: {
                    deps: ["a"]
                }
            };
            expectCircularDependency(aa, ["a"], "a");

            var aba = {
                a: {
                    deps: ["b"]
                },
                b: {
                    deps: ["a"]
                }
            };
            expectCircularDependency(aba, ["a"], "a");
            expectCircularDependency(aba, ["b"], "b");
            expectCircularDependency(aba, ["a", "b"], "a");
            expectCircularDependency(aba, ["b", "a"], "b");

        });

        it("instantiates the tests in proper order", function () {
            var Tests = {
                a: Test.extend(),
                b: Test.extend(),
                c: Test.extend(),
                d: Test.extend()
            };
            var use = {
                a: {
                    deps: ["b", "c"],
                    exports: Tests.a
                },
                b: {
                    deps: ["d"],
                    exports: Tests.b
                },
                c: {
                    deps: ["d"],
                    exports: Tests.c
                },
                d: {
                    exports: Tests.d
                }
            };

            expectTestClasses(use, ["a"], [Tests.d, Tests.b, Tests.c, Tests.a]);
        });

        it("adds common & schema to every test instance", function () {
            var use = {
                a: {
                    deps: ["b", "c"]
                },
                b: {
                    deps: ["d"]
                },
                c: {
                    deps: ["d"]
                },
                d: {
                }
            };
            expectTestParams(use, {
                a: 1
            }, {
                a: 1,
                b: undefined,
                c: undefined,
                d: undefined
            })
            expectTestParams(use, {
                a: 1,
                d: 4
            }, {
                a: 1,
                b: undefined,
                c: undefined,
                d: 4
            });
            expectTestParams(use, {
                a: 1,
                b: 2,
                c: 3,
                d: 4
            }, {
                a: 1,
                b: 2,
                c: 3,
                d: 4
            });
            expectTestParams(use, {
                a: 1,
                c: 3,
                b: 2,
                d: 4
            }, {
                a: 1,
                b: 2,
                c: 3,
                d: 4
            });

        })
    });


    var expectCircularDependency = function (use, keys, circularKey) {
        _.each(use, function (record) {
            record.exports = Test;
        });

        var CustomValidator = Validator.extend({
            provider: new TestProvider()
        });
        CustomValidator.plugin(Validator.prototype.provider);
        CustomValidator.plugin({use: use});
        var validator = jasmine.createStub(CustomValidator, ["constructor"]);

        expect(function () {
            validator.series(_.object(keys));
        }).toThrow("Circular dependency by test " + circularKey + ".");
    };

    var expectDependency = function (use, keys, expectedOrder) {
        _.each(use, function (record) {
            record.exports = Test;
        });

        var CustomValidator = Validator.extend({
            provider: new TestProvider()
        });
        CustomValidator.plugin(Validator.prototype.provider);
        CustomValidator.plugin({use: use});
        var validator = jasmine.createStub(CustomValidator, ["constructor"]);

        var queue = validator.series(_.object(keys));
        var actualOrder = _.keys(queue.schema);
        expect(actualOrder).toEqual(expectedOrder);

    };

    var expectTestClasses = function (use, keys, expectedClasses) {
        var CustomValidator = Validator.extend({
            provider: new TestProvider()
        });
        CustomValidator.plugin(Validator.prototype.provider);
        CustomValidator.plugin({use: use});
        var validator = jasmine.createStub(CustomValidator, ["constructor"]);

        var queue = validator.series(_.object(keys));
        var actualClasses = [];
        _.each(queue.schema, function (test) {
            actualClasses.push(test.constructor);
        });
        expect(actualClasses).toEqual(expectedClasses);

    }

    var expectTestParams = function (use, schema, expectedSchema) {
        var Tests = {};
        _.each(use, function (record, key) {
            Tests[key] = Test.extend({
                constructor: jasmine.createSpy(),
                relatedTo: function () {
                }
            });
            record.exports = Tests[key];
        });

        var provider = new TestProvider();
        var CustomValidator = Validator.extend({
            provider: provider
        });
        CustomValidator.plugin(Validator.prototype.provider);
        CustomValidator.plugin({use: use, common: {x: 1}});

        var validator = jasmine.createStub(CustomValidator, ["constructor"]);
        validator.series(schema);

        _.each(expectedSchema, function (expectedParam, key) {
            expect(Tests[key].callCount).toEqual(1);
            expect(Tests[key]).toHaveBeenCalledWith({schema: expectedParam, common: provider.common});
        });

    };
});


describe("TestProvider", function () {

    describe("merge", function () {
        it("should throw exception by invalid format", function () {
            var store = new TestProvider();
            expect(function () {
                store.merge();
            }).toThrow("Invalid plugin format.");
        });

        it("should accept empty object", function () {
            var store = new TestProvider();
            expect(function () {
                store.merge({})
            }).not.toThrow();
        });

        it("should parse config", function () {
            var store = new TestProvider();
            store.merge({
                use: {
                    test1: {
                        exports: Backbone.Validator.Test
                    }
                }
            });
            expect(store.use.test1.exports).toEqual(Backbone.Validator.Test);
        });

        it("should prevent test conflicts", function () {
            var store = new TestProvider();
            var plugin = {
                use: {
                    test1: {
                        exports: Backbone.Validator.Test
                    }
                }
            };
            store.merge(plugin);
            expect(function () {
                store.merge(plugin);
            }).toThrow("Store use.test1 already set.");
        });

        it("should merge common maps", function () {
            var store = new TestProvider();
            var base = {a: 1};
            store.merge({
                common: {
                    map: base
                }
            });
            store.merge({
                common: {
                    map: {
                        b: 2
                    }
                }
            });
            expect(store.common).toEqual({
                map: {
                    a: 1,
                    b: 2
                }
            });
            expect(base).toEqual({a: 1});
        });

        it("should prevent common conflicts", function () {
            var store = new TestProvider();
            var plugin = {
                common: {
                    a: "a"
                }
            };
            store.merge(plugin);
            expect(function () {
                store.merge(plugin);
            }).toThrow("Store common.a already set.");
        });

        it("should prevent common map conflicts", function () {
            var store = new TestProvider();
            var plugin = {
                common: {
                    map: {
                        a: "a"
                    }
                }
            };
            store.merge(plugin);
            expect(function () {
                store.merge(plugin);
            }).toThrow("Store common.map.a already set.");
        });

    });

});

describe("Parallel", function () {

    describe("run", function () {

        it("calls tests parallel, and ends when every test is done", function () {
            var createTest = function (Test) {
                var test = jasmine.createStub(Test, ["run"]);
                test.run.andCallThrough();
                return test;
            };
            var tests = {
                a: createTest(AsyncNextTest),
                b: createTest(AsyncNextTest)
            };
            var parallel = new Parallel({
                schema: tests
            });
            runs(function () {
                parallel.run({value: {}});
                expect(tests.a.run).toHaveBeenCalled();
                expect(tests.b.run).toHaveBeenCalled();
                expect(parallel.pending).toBeTruthy();
            });
            waitsFor(function () {
                return !parallel.pending;
            });
            runs(function () {
                expect(tests.a.pending).toBeFalsy();
                expect(tests.b.pending).toBeFalsy();
            });
        });

        it("continues by error", function () {
            var endingOrder = [];
            var createTest = function (Test) {
                var test = jasmine.createStub(Test, ["run"]);
                test.run.andCallThrough();
                test.on("end", function () {
                    endingOrder.push(Test);
                });
                return test;
            };
            var tests = {
                a: createTest(AsyncErrorTest),
                b: createTest(AsyncNextTest)
            };

            var parallel = new Parallel({
                schema: tests
            });
            var done = false;
            runs(function () {
                parallel.run({value: {}});
            });
            waitsFor(function () {
                return !parallel.pending;
            });
            runs(function () {
                expect(tests.a.run).toHaveBeenCalled();
                expect(tests.b.run).toHaveBeenCalled();
                expect(endingOrder).toEqual([AsyncErrorTest, AsyncNextTest]);
            });
        });

        it("aggregates errors", function () {
            var parallel = new Parallel({
                schema: {
                    a: new AsyncErrorTest(1),
                    b: new AsyncNextTest(),
                    c: new AsyncErrorTest(2)
                }
            });
            var error = false;
            parallel.on("end", function (result) {
                error = result.error;
            });
            runs(function () {
                parallel.run({value: {}});
            });
            waitsFor(function () {
                return !parallel.pending;
            });
            runs(function () {
                expect(error).toEqual({a: 1, c: 2});
            });
        });

    });
    describe("stop", function () {
        it("stops every running test", function () {
            var tests = {
                a: jasmine.createStub(AsyncNextTest, ["stop"]),
                b: jasmine.createStub(NextTest, ["stop"]),
                c: jasmine.createStub(AsyncNextTest, ["stop"])
            };
            _.each(tests, function (test) {
                test.stop.andCallThrough();
            });

            var parallel = new Parallel({
                schema: tests
            });

            parallel.run({value: {}});
            parallel.stop();

            expect(tests.a.stop).toHaveBeenCalled();
            expect(tests.b.stop).not.toHaveBeenCalled();
            expect(tests.c.stop).toHaveBeenCalled();

        });
    });

});

describe("Series", function () {

    describe("run", function () {
        it("calls tests run in proper order", function () {
            var endingOrder = [];
            var createTest = function (Test, id) {
                var test = jasmine.createStub(Test, ["run"]);
                test.run.andCallThrough();
                test.on("end", function () {
                    endingOrder.push(id);
                });
                return test;
            };
            var tests = {
                a: createTest(NextTest, 1),
                b: createTest(NextTest, 2),
                c: createTest(NextTest, 3)
            };
            var series = new Series({
                schema: tests
            });
            series.run({});
            expect(tests.a.run).toHaveBeenCalled();
            expect(tests.b.run).toHaveBeenCalled();
            expect(tests.c.run).toHaveBeenCalled();
            expect(endingOrder).toEqual([1, 2, 3]);
        });

        it("ends by error", function () {
            var createTest = function (Test) {
                var test = jasmine.createStub(Test, ["run"]);
                test.run.andCallThrough();
                return test;
            };
            var tests = {
                a: createTest(NextTest),
                b: createTest(ErrorTest),
                c: createTest(NextTest)
            };
            var series = new Series({
                schema: tests
            });
            var error;
            series.on("end", function (result) {
                error = result.error;
            });
            series.run({});
            expect(tests.a.run).toHaveBeenCalled();
            expect(tests.b.run).toHaveBeenCalled();
            expect(tests.c.run).not.toHaveBeenCalled();
            expect(error).toEqual({b: true});
        });

        it("ends by options.end", function () {
            var createTest = function (Test) {
                var test = jasmine.createStub(Test, ["run"]);
                test.run.andCallThrough();
                return test;
            };
            var tests = {
                a: createTest(NextTest),
                b: createTest(EndTest),
                c: createTest(NextTest)
            };
            var series = new Series({
                schema: tests
            });
            var error;
            series.on("end", function (result) {
                error = result.error;
            });
            series.run({});
            expect(tests.a.run).toHaveBeenCalled();
            expect(tests.b.run).toHaveBeenCalled();
            expect(tests.c.run).not.toHaveBeenCalled();
            expect(error).toEqual(false);
        });

        it("is pending until the end", function () {
            var createTest = function (Test) {
                var test = jasmine.createStub(Test, ["run"]);
                test.run.andCallThrough();
                return test;
            };
            var tests = {
                a: createTest(NextTest),
                b: createTest(NextTest),
                c: createTest(NextTest)
            };
            var series = new Series({
                schema: tests
            });
            var pending = [];
            var isPending = function () {
                pending.push(series.pending);
            };
            series.on("run", isPending);
            tests.a.on("run", isPending);
            tests.b.on("run", isPending);
            tests.c.on("run", isPending);
            series.on("end", isPending);
            series.run({});
            expect(pending).toEqual([true, true, true, true, false]);
        });

    });

    describe("stop", function () {
        it("calls stop on current test by stop", function () {
            var createTest = function (Test) {
                var test = jasmine.createStub(Test, ["stop"]);
                test.stop.andCallThrough();
                return test;
            };
            var tests = {
                a: createTest(NextTest),
                b: createTest(AsyncNextTest),
                c: createTest(NextTest)
            };
            var series = new Series({
                schema: tests
            });
            var done = false;
            runs(function () {
                series.run({});
                series.stop();
            });
            waitsFor(function () {
                return !series.pending;
            });
            runs(function () {
                expect(tests.a.stop).not.toHaveBeenCalled();
                expect(tests.b.stop).toHaveBeenCalled();
                expect(tests.c.stop).not.toHaveBeenCalled();
            });
        });

        it("stops by rerun", function () {
            var test = jasmine.createStub(AsyncNextTest, ["run", "stop"]);
            test.run.andCallThrough();
            test.stop.andCallThrough();
            var series = jasmine.createStub(Series, ["constructor", "stop"]);
            series.constructor.andCallThrough();
            series.stop.andCallThrough();
            series.constructor({
                schema: {
                    a: test
                }
            });
            var done = false;
            series.on("end", function () {
                done = true;
            });
            runs(function () {
                series.run({});
                series.run({});
            });
            waitsFor(function () {
                return done;
            });
            runs(function () {
                expect(series.stop).toHaveBeenCalled();
                expect(test.stop).toHaveBeenCalled();
                expect(test.run.callCount).toEqual(2);
                expect(test.stop.callCount).toEqual(1);
            });
        });
    });

});

describe("Test", function () {

    it("is similar to Backbone classes", function () {
        expect(Test instanceof Function).toBeTruthy();
        expect(Test.extend instanceof Function).toBeTruthy();
    });

    describe("constructor", function () {
        it("throws exception if no options given", function () {
            var test = jasmine.createStub(Test, ["constructor"]);
            test.constructor.andCallThrough();
            expect(function () {
                test.constructor();
            }).toThrow("Config is not set.");
        });

        it("adds common to properties and calls initialize with schema", function () {
            var common = 1;
            var schema = 2;
            var options = {
                common: common,
                schema: schema
            };
            var test = jasmine.createStub(Test, ["initialize"], [options]);
            expect(test.common).toEqual(common);
            expect(test.initialize).toHaveBeenCalledWith(schema);
        });
    });

    describe("initialize", function () {
        it("adds schema to properties by default", function () {
            var test = jasmine.createStub(Test, ["constructor"]);
            var schema = 1;
            test.initialize(schema);
            expect(test.schema).toEqual(schema);
        });
    });

    describe("run", function () {
        it("calls test method but no callback", function () {
            var test = jasmine.createStub(Test, ["constructor", "evaluate"]);
            var callback = jasmine.createSpy();
            test.on("end", callback);
            test.run();
            expect(test.evaluate).toHaveBeenCalled();
            expect(callback).not.toHaveBeenCalled();
        });

        it("has two states: ready, pending", function () {
            var states = [];
            var SyncTest = Test.extend({
                evaluate: function (done) {
                    states.push(this.pending);
                    done();
                    states.push(this.pending);
                }
            });
            var test = jasmine.createStub(SyncTest, ["constructor"]);
            states.push(test.pending);
            test.run();
            states.push(test.pending);
            expect(states).toEqual([false, true, false, false]);
        });

        it("is pending by async tests too", function () {
            var AsyncTest = Test.extend({
                evaluate: function (done) {
                    setTimeout(function () {
                        states.push(this.pending);
                        done();
                        states.push(this.pending);
                    }.bind(this), 1);
                }
            });
            var test = jasmine.createStub(AsyncTest, ["constructor"]);
            var states = [];
            var ended = false;
            runs(function () {
                states.push(test.pending);
                test.on("end", function () {
                    ended = true;
                });
                test.run();
            });
            waitsFor(function () {
                return ended == true;
            });
            runs(function () {
                expect(states).toEqual([false, true, false]);
            });
        });

    });

    describe("evaluate", function () {
        it("calls the given callback by default", function () {
            var test = jasmine.createStub(Test, ["constructor"]);
            var callback = jasmine.createSpy();
            test.evaluate(callback);
            expect(callback).toHaveBeenCalled();
        });
    });

    describe("stop", function () {

        it("does not end pending test by stop", function () {
            var StopTest = Test.extend({
                evaluate: function (done) {
                    this.stop();
                    done();
                }
            });
            var test = jasmine.createStub(StopTest, ["constructor"]);
            var callback = jasmine.createSpy();
            test.on("end", callback);
            test.run();
            expect(callback).not.toHaveBeenCalled();
        });

        it("set pending property to false by stop", function () {
            var states = [];
            var StopTest = Test.extend({
                evaluate: function (done) {
                    states.push(this.pending);
                    this.stop();
                    states.push(this.pending);
                    done();
                }
            });
            var test = jasmine.createStub(StopTest, ["constructor"]);
            test.run();
            expect(states).toEqual([true, false]);
        });

        it("ends tests not stopped after test stopped", function () {
            var stop;
            var StopTest = Test.extend({
                evaluate: function (done) {
                    if (stop)
                        this.stop();
                    done();
                }
            });
            var test = jasmine.createStub(StopTest, ["constructor"]);
            var callback = jasmine.createSpy();
            stop = false;
            test.on("end", callback);
            test.run();
            expect(callback.callCount).toEqual(1);
            stop = true;
            test.run();
            expect(callback.callCount).toEqual(1);
            stop = false;
            test.run();
            expect(callback.callCount).toEqual(2);
        });

        it("does not end stopped async tests", function () {
            var next = false;
            var AsyncTest = Test.extend({
                evaluate: function (done) {
                    setTimeout(function () {
                        done();
                        next = true;
                    }, 1);
                }
            });
            var test = jasmine.createStub(AsyncTest, ["constructor"]);
            var callback = jasmine.createSpy();
            test.on("end", callback);
            runs(function () {
                test.run();
                test.stop();
            });
            waitsFor(function () {
                return next;
            });
            runs(function () {
                expect(callback).not.toHaveBeenCalled();
            });
        });

        it("does not end async test by stopped asnyc test called before", function () {
            var next = 0;
            var delay;
            var AsyncTest = Test.extend({
                evaluate: function (done) {
                    setTimeout(function () {
                        done();
                        ++next;
                    }, delay);
                }
            });
            var test = jasmine.createStub(AsyncTest, ["constructor"]);
            var callback = jasmine.createSpy();
            runs(function () {
                delay = 1;
                test.on("end", callback);
                test.run();
                test.stop();
                delay = 2;
                test.run();
            });
            waitsFor(function () {
                return next == 2;
            });
            runs(function () {
                expect(callback).toHaveBeenCalled();
                expect(callback.callCount).toEqual(1);

            });
        });

    });

});