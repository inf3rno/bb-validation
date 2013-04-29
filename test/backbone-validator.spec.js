if (typeof define !== 'function')
    var define = require('amdefine')(module, require);
require("./jasmine-stub");

var _ = require("underscore"),
    Backbone = require("backbone");
require("../src/backbone-validator");


describe("Validator", function () {

    it("extends the Backbone lib", function () {
        expect(Backbone.Validator instanceof Function).toBe(true);
    });


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