var _ = require("underscore"),
    Backbone = require("backbone"),
    async = require("async");

describe("async", function () {
    describe("auto - only with sync tests, I suppose it works by async tests too", function () {
        it("should call dependencies before callback", function () {
            var results;
            var err = null;
            async.auto({
                a:function (callback, r) {
                    callback(err, "a");
                },
                b:["a", function (callback, r) {
                    callback(err, "b");
                }],
                c:["b", function (callback, r) {
                    callback(err, "c");
                }]
            }, function (err, r) {
                results = r;
            });
            expect(results).toEqual({a:"a", b:"b", c:"c"});
        });

        it("should break if err given", function () {
            var results;
            var error;
            var err = null;
            async.auto({
                a:function (callback, r) {
                    callback(err, "a");
                },
                b:["a", function (callback, r) {
                    callback("error", "b");
                }],
                c:["b", function (callback, r) {
                    callback(err, "c");
                }]
            }, function (err, r) {
                results = r;
                error = err;
            });
            expect(error).toEqual("error");
            expect(results).toEqual(undefined);
        });

        it("should run in order by existence, type and min", function () {
            var order = [];
            var results = {};
            var value = "abcde";
            var config = {
                string:true,
                min:3
            };
            var end = true;
            async.auto({
                string:["existence", function (callback) {
                    var passed;
                    var string = (typeof(value) == "string");
                    if (config.string)
                        passed = string;
                    else
                        passed = !string;
                    results.string = passed;
                    order.push("string");
                    callback(string ? null : false);
                }],
                min:["string", function (callback) {
                    var passed;
                    var shorter = (value.length < config.min);
                    passed = !shorter;
                    results.min = passed;
                    order.push("min");
                    callback();
                }],
                existence:function (callback) {
                    var existence = (value !== undefined && value !== null);
                    order.push("existence");
                    callback(existence ? null : end);
                }
            });
            expect(order).toEqual(["existence", "string", "min" ]);
            expect(results).toEqual({string:true, min:true});
        });

        it("should call dependencies just once", function () {
            var depCall = 0;
            async.auto({
                c:["a", function (callback) {
                    ++depCall;
                    callback();
                }],
                b:["a", function (callback) {
                    callback();
                }],
                a:function (callback) {
                    callback();
                }
            });
            expect(depCall).toEqual(1);
        });

        it("should call tasks semi-independent of the order of the property list (so we cannot count on this feature)", function () {
            var order = [];
            var f = {
                a:function (callback) {
                    order.push("a");
                    callback();
                },
                b:["a", function (callback) {
                    order.push("b");
                    callback();
                }],
                c:["a", function (callback) {
                    order.push("c");
                    callback();
                }]
            };
            async.auto({
                b:f.b,
                c:f.c,
                a:f.a
            });
            expect(order).not.toEqual(["a", "b", "c"]);

            order = [];
            async.auto({
                a:f.a,
                b:f.b,
                c:f.c
            });
            expect(order).toEqual(["a", "b", "c"]);
        });

        it("should pass object pointers to results", function () {
            var o = {};
            async.auto({
                env:function (callback, env) {
                    env.o = o;
                    callback();
                },
                test:["env", function (callback, env) {
                    expect(env.o).toBe(o);
                }]
            });
        });

    });
});

