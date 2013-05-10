if (typeof define !== 'function')
    var define = require('amdefine')(module, require);
require("./jasmine-stub");

var _ = require("underscore"),
    Backbone = require("backbone");
require("../src/backbone-validator");

var Validator = Backbone.Validator;
var TestProvider = Backbone.Validator.TestProvider;
var ParallelQueue = Backbone.Validator.ParallelQueue;
var SeriesQueue = Backbone.Validator.SeriesQueue;
var Test = Backbone.Validator.Test;
var NextTest = Test.extend({
    constructor: function (param) {
        this.param = param;
        Test.call(this, {});
    }
});
var ErrorTest = NextTest.extend({
    evaluate: function (callback) {
        callback(this.param || true);
    }
});
var EndTest = NextTest.extend({
    evaluate: function (callback) {
        callback(false, {end: true});
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
            callback(this.param || true);
        }.bind(this), 1);
    }
});

describe("Validator", function () {

    it("extends the Backbone lib", function () {
        expect(Validator instanceof Function).toBeTruthy();
        expect(Validator.extend instanceof Function).toBeTruthy();
    });

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

        var validator = new Validator({
            provider: new TestProvider()
        });
        validator.plugin(Validator.prototype.provider);
        validator.plugin({use: use});

        expect(function () {
            validator.series(_.object(keys));
        }).toThrow("Circular dependency by test " + circularKey + ".");
    };

    var expectDependency = function (use, keys, expectedOrder) {
        _.each(use, function (record) {
            record.exports = Test;
        });

        var validator = new Validator({
            provider: new TestProvider()
        });
        validator.plugin(Validator.prototype.provider);
        validator.plugin({use: use});

        var queue = validator.series(_.object(keys));
        var actualOrder = _.keys(queue.schema);
        expect(actualOrder).toEqual(expectedOrder);

    };

    var expectTestClasses = function (use, keys, expectedClasses) {
        var validator = new Validator({
            provider: new TestProvider()
        });
        validator.plugin(Validator.prototype.provider);
        validator.plugin({use: use});

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

        var mockProvider = new TestProvider();
        var validator = new Validator({
            provider: mockProvider
        });
        validator.plugin(Validator.prototype.provider);
        validator.plugin({use: use, common: {x: 1}});

        validator.series(schema);

        _.each(expectedSchema, function (expectedParam, key) {
            expect(Tests[key].callCount).toEqual(1);
            expect(Tests[key]).toHaveBeenCalledWith({schema: expectedParam, common: mockProvider.common});
        });

    };
});


describe("TestProvider", function () {

    it("extends the Backbone lib", function () {
        expect(TestProvider instanceof Function).toBeTruthy();
        expect(TestProvider.extend instanceof Function).toBeTruthy();
    });

    describe("plugin", function () {
        it("should throw exception by invalid format", function () {
            var store = new TestProvider();
            expect(function () {
                store.plugin();
            }).toThrow("Invalid plugin format.");
        });

        it("should accept empty object", function () {
            var store = new TestProvider();
            expect(function () {
                store.plugin({})
            }).not.toThrow();
        });

        it("should parse config", function () {
            var store = new TestProvider();
            store.plugin({
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
            store.plugin(plugin);
            expect(function () {
                store.plugin(plugin);
            }).toThrow("Store use.test1 already set.");
        });

        it("should merge common maps", function () {
            var store = new TestProvider();
            var base = {a: 1};
            store.plugin({
                common: {
                    map: base
                }
            });
            store.plugin({
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
            store.plugin(plugin);
            expect(function () {
                store.plugin(plugin);
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
            store.plugin(plugin);
            expect(function () {
                store.plugin(plugin);
            }).toThrow("Store common.map.a already set.");
        });

    });

});

describe("ParallelQueue", function () {
    describe("constructor", function () {
        it("aggregates tests relations", function () {
            var mockQueue = jasmine.createStub(ParallelQueue, "*");
            mockQueue.constructor.andCallThrough();
            mockQueue.relatedTo.andCallThrough();
            mockQueue.constructor({
                schema: {
                    a: {relatedTo: function () {
                        return ["x", "y"]
                    }},
                    b: {relatedTo: function () {
                        return ["x", "z"]
                    }}
                }
            });
            expect(mockQueue.relatedTo()).toEqual(["x", "y", "z"]);
        });
    });

    describe("run", function () {

        it("calls tests parallel, and ends when every test is done", function () {
            var createTest = function (Test) {
                var wait = jasmine.createStub(Test, ["run"]);
                wait.run.andCallThrough();
                return wait;
            };
            var tests = {
                a: createTest(AsyncNextTest),
                b: createTest(AsyncNextTest)
            };
            var queue = new ParallelQueue({
                schema: tests
            });
            runs(function () {
                queue.run(function (e) {
                }, null, {});
                expect(tests.a.run).toHaveBeenCalled();
                expect(tests.b.run).toHaveBeenCalled();
                expect(queue.pending).toBeTruthy();
            });
            waitsFor(function () {
                return !queue.pending;
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

            var queue = new ParallelQueue({
                schema: tests
            });
            var done = false;
            runs(function () {
                queue.run(function (e) {
                }, null, {});
            });
            waitsFor(function () {
                return !queue.pending;
            });
            runs(function () {
                expect(tests.a.run).toHaveBeenCalled();
                expect(tests.b.run).toHaveBeenCalled();
                expect(endingOrder).toEqual([AsyncErrorTest, AsyncNextTest]);
            });
        });

        it("aggregates errors", function () {
            var queue = new ParallelQueue({
                schema: {
                    a: new AsyncErrorTest(1),
                    b: new AsyncNextTest(),
                    c: new AsyncErrorTest(2)
                }
            });
            var error = false;
            runs(function () {
                queue.run(function (e) {
                    error = e;
                }, null, {});
            });
            waitsFor(function () {
                return !queue.pending;
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

            var queue = new ParallelQueue({
                schema: tests
            });

            queue.run(function () {
            }, null, {});
            queue.stop();

            expect(tests.a.stop).toHaveBeenCalled();
            expect(tests.b.stop).not.toHaveBeenCalled();
            expect(tests.c.stop).toHaveBeenCalled();

        });
    });

});

describe("SeriesQueue", function () {

    describe("constructor", function () {
        it("aggregates tests relations", function () {
            var createTest = function (Test, relations) {
                var test = jasmine.createStub(Test, ["relatedTo"]);
                test.relatedTo.andCallFake(function () {
                    return relations;
                });
                return test;
            };
            var queue = jasmine.createStub(SeriesQueue, "*");
            queue.constructor.andCallThrough();
            queue.relatedTo.andCallThrough();
            queue.constructor({
                schema: {
                    a: createTest(NextTest, ["x", "y"]),
                    b: createTest(NextTest, ["x", "z"])
                }
            });
            expect(queue.relatedTo()).toEqual(["x", "y", "z"]);
        });
    });

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
            var queue = new SeriesQueue({
                schema: tests
            });
            queue.run(function (e) {
            });
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
            var queue = new SeriesQueue({
                schema: tests
            });
            var error;
            queue.run(function (e) {
                error = e;
            });
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
            var queue = new SeriesQueue({
                schema: tests
            });
            var error;
            queue.run(function (e) {
                error = e;
            });
            expect(tests.a.run).toHaveBeenCalled();
            expect(tests.b.run).toHaveBeenCalled();
            expect(tests.c.run).not.toHaveBeenCalled();
            expect(error).toEqual(false);
        });

        it("is pending until the end", function () {
            var test = jasmine.createStub(NextTest, ["run"]);
            test.run.andCallThrough();
            var queue = new SeriesQueue({
                schema: {
                    a: test,
                    b: test,
                    c: test
                }
            });
            var pending = [];
            var isPending = function () {
                pending.push(queue.pending);
            };
            queue.on("run", isPending);
            test.on("run", isPending);
            queue.on("end", isPending);
            queue.run(function () {
            });
            expect(test.run.callCount).toEqual(3);
            expect(pending).toEqual([true, true, true, true, false]);
        });

        it("calls tests run with callback, value, relatedAttributes", function () {
            var createTest = function (Test, relations) {
                var test = jasmine.createStub(Test, ["relatedTo"]);
                test.relatedTo.andCallFake(function () {
                    return relations;
                });
                return test;
            };
            var tests = {
                a: createTest(NextTest, ["x", "y"]),
                b: createTest(NextTest, []),
                c: createTest(NextTest, ["y", "z"])
            };
            var queue = new SeriesQueue({
                schema: tests
            });
            var calls = {};
            _.each(tests, function (test, key) {
                test.on("run", function () {
                    calls[key] = [this.value, this.attributes];
                });
            });
            queue.run(function (e) {
            }, 123, {
                w: 0,
                x: 1,
                y: 2,
                z: 3
            });
            expect(calls.a).toEqual([123, {x: 1, y: 2}]);
            expect(calls.b).toEqual([123, {}]);
            expect(calls.c).toEqual([123, {y: 2, z: 3}]);
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
            var queue = new SeriesQueue({
                schema: tests
            });
            var done = false;
            runs(function () {
                queue.run(function () {
                });
                queue.stop();
            });
            waitsFor(function () {
                return !queue.pending;
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
            var queue = jasmine.createStub(SeriesQueue, ["constructor", "stop"]);
            queue.constructor.andCallThrough();
            queue.stop.andCallThrough();
            queue.constructor({
                schema: {
                    a: test
                }
            });
            var done = false;
            queue.on("end", function () {
                done = true;
            });
            runs(function () {
                queue.run(function () {
                });
                queue.run(function () {
                });
            });
            waitsFor(function () {
                return done;
            });
            runs(function () {
                expect(queue.stop).toHaveBeenCalled();
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
            }).toThrow("Options is not set.");
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
        it("throws exception if no callback given", function () {
            var test = jasmine.createStub(Test, ["constructor", "evaluate"])
            expect(test.run).toThrow("No callback given.");
        });

        it("calls test method but no callback", function () {
            var test = jasmine.createStub(Test, ["constructor", "evaluate"]);
            var callback = jasmine.createSpy();
            test.run(callback);
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
            test.run(function () {
            });
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
                test.run(function () {
                    ended = true;
                });
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
            test.run(callback);
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
            test.run(function () {
            });
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
            test.run(callback);
            expect(callback.callCount).toEqual(1);
            stop = true;
            test.run(callback);
            expect(callback.callCount).toEqual(1);
            stop = false;
            test.run(callback);
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
            runs(function () {
                test.run(callback);
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
            var callback1 = jasmine.createSpy();
            var callback2 = jasmine.createSpy();
            runs(function () {
                delay = 1;
                test.run(callback1);
                test.stop();
                delay = 2;
                test.run(callback2);
            });
            waitsFor(function () {
                return next == 2;
            });
            runs(function () {
                expect(callback1).not.toHaveBeenCalled();
                expect(callback2).toHaveBeenCalled();
            });
        });

    });

});