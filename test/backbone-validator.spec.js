if (typeof define !== 'function')
    var define = require('amdefine')(module, require);
require("./jasmine-stub");

var _ = require("underscore"),
    Backbone = require("backbone");
require("../src/backbone-validator");


describe("Validator", function () {

    var Validator = Backbone.Validator;
    var TestProvider = Backbone.Validator.TestProvider;
    var Test = Backbone.Validator.Test;

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

    var TestProvider = Backbone.Validator.TestProvider;
    var Test = Backbone.Validator.Test;

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
    var ParallelQueue = Backbone.Validator.ParallelQueue;
    var Test = Backbone.Validator.Test;
    var NextTest = Test.extend({
        constructor: function () {
            Test.call(this, {});
        }
    });
    var WaitTest = Test.extend({
        constructor: function () {
            Test.call(this, {});
        },
        evaluate: function (callback) {
            setTimeout(function () {
                callback();
            }.bind(this), 1);
        }
    });

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
            var callCount = 0;
            var wait = function (callback) {
                setTimeout(function () {
                    ++callCount;
                    callback();
                }, 1);
            };
            var queue = new ParallelQueue({
                schema: mockTests({
                    a: wait,
                    b: wait
                })
            });
            var done = false;
            runs(function () {
                queue.run(function (e) {
                    done = true;
                }, null, {});
            }, null, {});
            waitsFor(function () {
                return done;
            });
            runs(function () {
                expect(callCount).toEqual(2);
            });
        });

        it("continues by error", function () {
            var order = [];
            var error = function (callback) {
                setTimeout(function () {
                    order.push("e");
                    callback(true);
                }, 1);
            };
            var wait = function (callback) {
                setTimeout(function () {
                    order.push("w");
                    callback();
                }, 1);
            };
            var queue = new ParallelQueue({
                schema: mockTests({
                    a: error,
                    b: wait
                })
            });
            var done = false;
            runs(function () {
                queue.run(function (e) {
                    done = true;
                }, null, {});
            });
            waitsFor(function () {
                return done;
            });
            runs(function () {
                expect(order).toEqual(["e", "w"]);
            });
        });

        it("aggregates errors", function () {
            var error1 = function (callback) {
                setTimeout(function () {
                    callback("error 1");
                }, 1);
            };
            var error2 = function (callback) {
                setTimeout(function () {
                    callback("error 2");
                }, 1);
            };
            var wait = function (callback) {
                setTimeout(function () {
                    callback();
                }, 1);
            };
            var queue = new ParallelQueue({
                schema: mockTests({
                    a: error1,
                    b: wait,
                    c: error2
                })
            });
            var done = false;
            var error = false;
            runs(function () {
                queue.run(function (e) {
                    error = e;
                    done = true;
                }, null, {});
            });
            waitsFor(function () {
                return done;
            });
            runs(function () {
                expect(error).toEqual({a: "error 1", c: "error 2"});
            });
        });

    });
    describe("stop", function () {
        it("stops every running test", function () {
            var tests = {
                a: jasmine.createStub(WaitTest, ["stop"]),
                b: jasmine.createStub(NextTest, ["stop"]),
                c: jasmine.createStub(WaitTest, ["stop"])
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

    var mockTests = function (spies) {
        var schema = {};
        _.each(spies, function (spy, key) {
            schema[key] = jasmine.createStub(Test, "*");
            schema[key].run.andCallFake(spy);
        });
        return schema;
    };
});

describe("SeriesQueue", function () {
    var SeriesQueue = Backbone.Validator.SeriesQueue;
    var Test = Backbone.Validator.Test;

    describe("constructor", function () {
        it("aggregates tests relations", function () {
            var mockQueue = jasmine.createStub(SeriesQueue, "*");
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
        it("calls tests run in proper order", function () {
            var order = [];
            var next = function (callback) {
                order.push(queue.key);
                callback();
            };
            var queue = new SeriesQueue({
                schema: mockTests({
                    a: next,
                    b: next,
                    c: next
                })
            });
            queue.run(function (e) {
            });
            expect(order).toEqual(["a", "b", "c"]);
        });

        it("ends by error", function () {
            var order = [];
            var next = function (callback) {
                order.push(queue.key);
                callback();
            };
            var fail = function (callback) {
                order.push(queue.key);
                callback("fail");
            };
            var queue = new SeriesQueue({
                schema: mockTests({
                    a: next,
                    b: fail,
                    c: next
                })
            });
            var error;
            queue.run(function (e) {
                error = e;
            });
            expect(order).toEqual(["a", "b"]);
            expect(error).toEqual({b: "fail"});
        });

        it("ends by options.end", function () {
            var order = [];
            var next = function (callback) {
                order.push(queue.key);
                callback();
            };
            var end = function (callback) {
                order.push(queue.key);
                callback(false, {end: true});
            };
            var queue = new SeriesQueue({
                schema: mockTests({
                    a: next,
                    b: end,
                    c: next
                })
            });
            var error;
            queue.run(function (e) {
                error = e;
            });
            expect(order).toEqual(["a", "b"]);
            expect(error).toEqual(false);
        });

        it("is pending until the end", function () {
            var pending = [];
            var next = function (callback) {
                pending.push(queue.pending);
                callback();
            };
            var queue = new SeriesQueue({
                schema: mockTests({
                    a: next,
                    b: next,
                    c: next
                })
            });
            pending.push(queue.pending);
            queue.run(function (e) {
                pending.push(queue.pending);
            });
            pending.push(queue.pending);

            expect(pending).toEqual([false, true, true, true, false, false]);
        });

        it("calls tests run with callback, value, relatedAttributes", function () {
            var calls = {};
            var next = function (callback, value, attributes) {
                calls[queue.key] = [value, attributes];
                callback();
            };
            var schema = mockTests({
                a: next,
                b: next,
                c: next
            });
            schema.a.relatedTo.andCallFake(function () {
                return ["x", "y"];
            });
            schema.c.relatedTo.andCallFake(function () {
                return ["y", "z"];
            });
            var queue = new SeriesQueue({
                schema: schema
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
            var next = function (callback) {
                callback();
            };
            var wait = function (callback) {
                setTimeout(function () {
                    callback();
                }, 1);
            };
            var schema = mockTests({
                a: next,
                b: wait,
                c: next
            });
            var queue = new SeriesQueue({
                schema: schema
            });
            var done = false;
            runs(function () {
                queue.run(function (e) {
                    done = true;
                });
                queue.stop();
            });
            waitsFor(function () {
                return done;
            });
            runs(function () {
                expect(schema.a.stop).not.toHaveBeenCalled();
                expect(schema.b.stop).toHaveBeenCalled();
                expect(schema.c.stop).not.toHaveBeenCalled();
            });
        });

        it("is not pending after stop", function () {
            var pending = [];
            var next = function (callback) {
                pending.push(queue.pending);
                callback();
            };
            var wait = function (callback) {
                setTimeout(function () {
                    pending.push(queue.pending);
                    callback();
                }, 1);
            };
            var queue = new SeriesQueue({
                schema: mockTests({
                    a: next,
                    b: wait,
                    c: next
                })
            });
            var done = false;
            runs(function () {
                queue.run(function (e) {
                    done = true;
                });
                queue.stop();
            });
            waitsFor(function () {
                return done;
            });
            runs(function () {
                expect(pending).toEqual([true, false, false]);
            });
        });

        it("stops by rerun", function () {
            var next = function (callback) {
                callback();
            };
            var wait = function (callback) {
                setTimeout(function () {
                    callback();
                }, 1);
            };
            var mockWaitTest = jasmine.createStub(Test, ["constructor", "evaluate", "stop"]);
            mockWaitTest.constructor.andCallThrough();
            mockWaitTest.evaluate.andCallFake(function (done) {
                setTimeout(function () {
                    done();
                }, 1);
            });
            mockWaitTest.stop.andCallThrough();
            mockWaitTest.constructor({
                common: null,
                schema: null
            });
            var mockQueue = jasmine.createStub(SeriesQueue, ["constructor", "stop"]);
            mockQueue.constructor.andCallThrough();
            mockQueue.stop.andCallThrough();
            mockQueue.constructor({
                schema: {
                    a: mockWaitTest
                }
            });

            var done = false;
            runs(function () {
                mockQueue.run(function (e) {
                });
                mockQueue.run(function (e) {
                    done = true;
                });
            });
            waitsFor(function () {
                return done;
            });
            runs(function () {
                expect(mockWaitTest.stop).toHaveBeenCalled();
                expect(mockQueue.stop).toHaveBeenCalled();
            });
        });
    });

    var mockTests = function (spies) {
        var schema = {};
        _.each(spies, function (spy, key) {
            schema[key] = jasmine.createStub(Test, "*");
            schema[key].run.andCallFake(spy);
        });
        return schema;
    };

});

describe("Test", function () {
    var Test = Backbone.Validator.Test;

    it("is similar to Backbone classes", function () {
        expect(Test instanceof Function).toBeTruthy();
        expect(Test.extend instanceof Function).toBeTruthy();
    });

    describe("constructor", function () {
        it("throws exception if no options given", function () {
            var mockTest = jasmine.createStub(Test, ["constructor"]);
            mockTest.constructor.andCallThrough();
            expect(function () {
                mockTest.constructor();
            }).toThrow("Options is not set.");
        });

        it("adds common to properties and calls initialize with schema", function () {
            var common = 1;
            var schema = 2;
            var options = {
                common: common,
                schema: schema
            };
            var mockTest = jasmine.createStub(Test, ["initialize"], [options]);
            expect(mockTest.common).toEqual(common);
            expect(mockTest.initialize).toHaveBeenCalledWith(schema);
        });
    });

    describe("initialize", function () {
        it("adds schema to properties by default", function () {
            var mockTest = jasmine.createStub(Test, ["constructor"]);
            var schema = 1;
            mockTest.initialize(schema);
            expect(mockTest.schema).toEqual(schema);
        });
    });

    describe("run", function () {
        it("throws exception if no callback given", function () {
            var mockTest = jasmine.createStub(Test, ["constructor", "evaluate"])
            expect(mockTest.run).toThrow("No callback given.");
        });

        it("calls test method but no callback", function () {
            var mockTest = jasmine.createStub(Test, ["constructor", "evaluate"]);
            var callback = jasmine.createSpy();
            mockTest.run(callback);
            expect(mockTest.evaluate).toHaveBeenCalled();
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
            var mockTest = jasmine.createStub(SyncTest, ["constructor"]);
            states.push(mockTest.pending);
            mockTest.run(function () {
            });
            states.push(mockTest.pending);
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
            var mockTest = jasmine.createStub(AsyncTest, ["constructor"]);
            var states = [];
            var ended = false;
            runs(function () {
                states.push(mockTest.pending);
                mockTest.run(function () {
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
            var mockTest = jasmine.createStub(Test, ["constructor"]);
            var callback = jasmine.createSpy();
            mockTest.evaluate(callback);
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
            var mockTest = jasmine.createStub(StopTest, ["constructor"]);
            var callback = jasmine.createSpy();
            mockTest.run(callback);
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
            var mockTest = jasmine.createStub(StopTest, ["constructor"]);
            mockTest.run(function () {
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
            var mockTest = jasmine.createStub(StopTest, ["constructor"]);
            var callback = jasmine.createSpy();
            stop = false;
            mockTest.run(callback);
            expect(callback.callCount).toEqual(1);
            stop = true;
            mockTest.run(callback);
            expect(callback.callCount).toEqual(1);
            stop = false;
            mockTest.run(callback);
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
            var mockTest = jasmine.createStub(AsyncTest, ["constructor"]);
            var callback = jasmine.createSpy();
            runs(function () {
                mockTest.run(callback);
                mockTest.stop();
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
            var mockTest = jasmine.createStub(AsyncTest, ["constructor"]);
            var callback1 = jasmine.createSpy();
            var callback2 = jasmine.createSpy();
            runs(function () {
                delay = 1;
                mockTest.run(callback1);
                mockTest.stop();
                delay = 2;
                mockTest.run(callback2);
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