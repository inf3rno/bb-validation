if (typeof define !== 'function')
    var define = require('amdefine')(module, require);
require("./jasmine-stub");

var _ = require("underscore"),
    Backbone = require("backbone");
require("../src/backbone-validator");


describe("Validator", function () {

    var Validator = Backbone.Validator;

    it("extends the Backbone lib", function () {
        expect(Validator instanceof Function).toBeTruthy();
        expect(Validator.extend instanceof Function).toBeTruthy();
    });

});


describe("TestProvider", function () {

    var TestProvider = Backbone.Validator.TestProvider;

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

        it("should append common collections", function () {
            var store = new TestProvider();
            store.plugin({
                common: {
                    map: {
                        a: 1
                    },
                    list: ["a"]
                }
            });
            store.plugin({
                common: {
                    map: {
                        b: 2
                    },
                    list: ["b"]
                }
            });
            expect(store.common).toEqual({
                map: {
                    a: 1,
                    b: 2
                },
                list: ["a", "b"]
            });
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


    describe("createTestQueue", function () {
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

    var expectTestOrder = function (expectedLevel1ListQueue, level3Keys) {
        var testGenerator = 0;
        var use = {};
        var registerTestForKey = function (level123Key) {
            var isRegistered = !!use[level123Key];
            if (isRegistered)
                return;
            use[level123Key] = {};
            var isLevel1 = level123Key.length == 1;
            if (isLevel1)
                use[level123Key].exports = ++testGenerator;
            else {
                var level23Key = level123Key;
                var level23Deps = [];

                var level23KeyParts = level123Key.split("_");

                var level1TestSourceKey = level23KeyParts[0];
                registerTestForKey(level1TestSourceKey);
                level23KeyParts.shift();
                var flatLevel12Keys = level23KeyParts;

                _.each(flatLevel12Keys, function (flatLevel12Key) {
                    var isLevel2 = flatLevel12Key.length > 1;
                    if (isLevel2) {
                        var level2Key = flatLevel12Key.split("").join("_");
                        registerTestForKey(level2Key);
                        level23Deps.push(level2Key);
                    }
                    else {
                        var level1Key = flatLevel12Key;
                        registerTestForKey(level1Key);
                        level23Deps.push(level1Key);
                    }
                });

                use[level23Key].exports = use[level1TestSourceKey].exports;
                use[level23Key].deps = level23Deps;
            }
        };
        _.each(level3Keys, registerTestForKey);

        var provider = new TestProvider();
        provider.use = use;

        var expectedKeys = [];
        var expectedTests = [];
        _.each(expectedLevel1ListQueue, function (level1Key) {
            expectedKeys.push(level1Key);
            expectedTests.push(use[level1Key].exports);
        });
        var actualLevel1Queue = provider.createTestQueue(level3Keys);
        var testMap = {};
        _.each(actualLevel1Queue, function (key) {
            testMap[key] = use[key].exports;
        }, this);
        var actualLevel1MapQueue = testMap;

        var actualKeys = [];
        var actualTests = [];
        var level3ToLevel1TestSourceKey = function (level123Key) {
            var parts = level123Key.split("_");
            return parts[0];
        };
        _.each(actualLevel1MapQueue, function (test, level123Key) {
            actualKeys.push(level3ToLevel1TestSourceKey(level123Key));
            actualTests.push(test);
        });
        expect(expectedKeys).toEqual(actualKeys);
        expect(expectedTests).toEqual(actualTests);
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