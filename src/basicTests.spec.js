var _ = require("underscore"),
    basic = require("./basicTests");

describe("patterns", function () {
    var pattern;

    describe("digits", function () {
        beforeEach(function () {
            pattern = "digits";
        });

        it("should match only digits", function () {
            expectNotMatch("");
            expectNotMatch("a");
            expectNotMatch("-1");
            expectNotMatch("0.1");
            expectNotMatch(" ");
            expectMatch("0");
            expectMatch("9");
        });
    });

    describe("number", function () {
        beforeEach(function () {
            pattern = "number";
        });

        it("should match integer", function () {
            expectMatch("0");
            expectMatch("3");
            expectMatch("9");
            expectMatch("-1");
            expectMatch("-10");
        });

        it("should match double", function () {
            expectMatch("0.123");
            expectMatch("0.0");
            expectMatch("-0.54");
            expectMatch("146.678");
            expectMatch("1,34");
        });

        it("should not match non digit characters", function () {
            expectNotMatch("");
            expectNotMatch("a");
            expectNotMatch(" ");
            expectNotMatch("number: 1.3");
            expectNotMatch("-");
            expectNotMatch(".");
            expectNotMatch(",");
            expectNotMatch(".1");
        });
    });

    describe("email", function () {
        beforeEach(function () {
            pattern = "email";
        });

        it("should match email", function () {
            expectMatch("a@b.c");
            expectMatch("a.b@c.d");
            expectMatch("a.b.c@d.e.f");
        });

        it("should not match not email", function () {
            expectNotMatch("");
            expectNotMatch("a");
            expectNotMatch("0");
            expectNotMatch("@");
            expectNotMatch("@a.b");
            expectNotMatch("a@bc");
        });
    });

    describe("url", function () {
        beforeEach(function () {
            pattern = "url";
        });

        it("should match url", function () {
            expectMatch("http://test.com");
            expectMatch("http://my.test.com");
            expectMatch("http://my.your.test.com");
            expectMatch("http://my.test.com/");
            expectMatch("http://my.test.com/my/path");
            expectMatch("http://my.test.com/path?a=123&b")
            expectMatch("http://my.test.com/#anchor:1")
        });

        it("should match url with secure protocol", function () {
            expectMatch("https://test.com");
        });

        it("should match url with ip", function () {
            expectMatch("http://127.0.0.1:8080/path");
        });

        it("should not match unknown protocol", function () {
            expectNotMatch("test://test.com");
        });

        it("should not match invalid hostname", function () {
            expectNotMatch("http://test");
            expectNotMatch("http://test.com:a");
        });
    });

    var expectMatch = function (target) {
        var regex = basic.patterns[pattern];
        expect(regex.test(target)).toBe(true);
    };
    var expectNotMatch = function (target) {
        var regex = basic.patterns[pattern];
        expect(regex.test(target)).toBe(false);
    };
});

describe("tests", function () {

    var test;

    describe("required", function () {
        beforeEach(function () {
            test = "required";
        });

        it("should configure true if not given or convert to boolean anyway", function () {
            expectCheck(undefined, true);
            expectCheck(0, false);
            expectCheck(1, true);
            expectCheck("", false);
            expectCheck("a", true);
            expectCheck(true, true);
            expectCheck(false, false);
        });

        it("should pass if required and value is not undefined", function () {
            _.each([null, "", 0, 1, "a", {}, []], function (value) {
                expectTest({
                    value:value,
                    config:true,
                    err:false
                });
            });
        });

        it("should fail and break if required but value is undefined", function () {
            expectTest({
                config:true,
                err:true
            });
        });

        it("should pass if not required and given", function () {
            expectTest({
                value:0,
                config:false,
                err:false
            });
        });

        it("should pass and break if not required and not given", function () {
            expectTest({
                config:false,
                err:false,
                options:{abort:true}
            });
        });

    });

    describe("type", function () {
        beforeEach(function () {
            test = "type";
        });

        it("should configure type strings, functions, null but throw exception by another variable", function () {
            _.each(["", 0, true, 1, "test", [], {}], function (value) {
                expectCheckThrow(value);
            });
            _.each(["boolean", "number", "string", "function", "object", "undefined"], function (value) {
                expectCheck(value, value);
            });
            expectCheck("null", null);
            expectCheck(null, null);
            expectCheck(undefined, "undefined");
            expectCheck(Boolean, "boolean");
            expectCheck(Number, "number");
            expectCheck(String, "string");
            expectCheck(Array, Array);
            expectCheck(Function, Function);
            expectCheck(RegExp, RegExp);
            var f = function () {
            };
            expectCheck(f, f);
        });

        it("should pass if type is good", function () {
            _.each([
                ["str", "string"],
                [0, "number"],
                [false, "boolean"],
                [null, null],
                [undefined, "undefined"],
                [
                    {},
                    "object"
                ],
                [
                    [],
                    Array
                ],
                [/a/, RegExp]
            ], function (o) {
                expectTest({
                    value:o[0],
                    config:o[1],
                    err:false
                });
            })
        });

        it("should fail and break if type is wrong", function () {
            _.each([
                [1, "string"],
                ["", "number"],
                [0, "boolean"],
                [undefined, null],
                [null, "undefined"],
                [
                    function () {
                    },
                    "object"
                ],
                [
                    {},
                    Array
                ],
                ["a", RegExp],
                [Math.NaN, "number"],
                [null, "number"]
            ], function (o) {
                expectTest({
                    value:o[0],
                    config:o[1],
                    err:true
                });
            })
        });
    });

    describe("min", function () {
        beforeEach(function () {
            test = "min";
        });

        it("should configure number but throw exception by any other variable", function () {
            _.each([undefined, null, "", Math.NaN, {}], function (value) {
                expectCheckThrow(value);
            });
            _.each([-1, 0, 1, 1.234, -123.142], function (value) {
                expectCheck(value, value);
            });
        });

        it("should pass if number is not smaller than config", function () {
            _.each([3.3333, 3.5, 4, 10, 100, 1000], function (value) {
                expectTest({
                    value:value,
                    config:3.3333,
                    err:false
                });
            });
        });

        it("should fail and break if number is bigger than config", function () {
            _.each([3.3332, 3, 1, 0, -1, -4], function (value) {
                expectTest({
                    value:value,
                    config:3.3333,
                    err:true
                });
            });
        });
    });

    describe("max", function () {
        beforeEach(function () {
            test = "max";
        });

        it("should configure number but throw exception by any other variable", function () {
            _.each([undefined, null, "", Math.NaN, {}], function (value) {
                expectCheckThrow(value);
            });
            _.each([-1, 0, 1, 1.234, -123.142], function (value) {
                expectCheck(value, value);
            });
        });

        it("should fail and break if number is smaller than config", function () {
            _.each([3.3334, 3.5, 4, 10, 100, 1000], function (value) {
                expectTest({
                    value:value,
                    config:3.3333,
                    err:true
                });
            });
        });

        it("should pass if number is not smaller than config", function () {
            _.each([3.3333, 3, 1, 0, -1, -4], function (value) {
                expectTest({
                    value:value,
                    config:3.3333,
                    err:false
                });
            });
        });
    });

    describe("range", function () {
        beforeEach(function () {
            test = "range";
        });

        it("should configure range but throw exception by any other variable", function () {
            _.each([
                undefined,
                null,
                "",
                Math.NaN,
                {}
            ], function (value) {
                expectCheckThrow([value, 1]);
                expectCheckThrow([1, value]);
                expectCheckThrow([value, value]);
            });

            _.each([-1, 0, 1, 1.234, -123.142], function (value) {
                expectCheck([100, value], {min:value, max:100});
                expectCheck([value, 100], {min:value, max:100});
                expectCheck([value, value], {min:value, max:value});
                expectCheck({min:value, max:100}, {min:value, max:100});
                expectCheck({min:value, max:value}, {min:value, max:value});
                expectCheckThrow({min:100, max:value});
            });

        });

        it("should pass if number in range", function () {
            _.each([
                [0, 0, 0],
                [0, 0, 1],
                [0, -1, 0],
                [0, -1, 1],
                [1, 0, 1],
                [1, -1, 1],
                [-1, -1, 1],
                [-0.5, -1, 0]
            ], function (o) {
                expectTest({
                    value:o[0],
                    config:{min:o[1], max:o[2]},
                    err:false
                });
            });
        });

        it("should fail and break if number out of range (error: 1 by lower, 2 by bigger)", function () {
            _.each([
                [0.1, 0, 0, "max"],
                [-0.1, 0, 0, "min"],
                [-2, -1, 3, "min"],
                [4, -1, 3, "max"],
                [0, 1, 100, "min"],
                [101, 1, 100, "max"],
                [-101, -100, -1, "min"],
                [-0.5, -100, -1, "max"],
                [0, -100, -1, "max"],
                [1, -100, -1, "max"]
            ], function (o) {
                expectTest({
                    value:o[0],
                    config:{min:o[1], max:o[2]},
                    err:o[3]
                });
            });
        });
    });

    describe("same", function () {
        beforeEach(function () {
            test = "same";
        });

        it("should pass if value and config are the same", function () {
            _.each([
                undefined,
                null,
                "",
                0,
                100,
                {},
                function () {
                }
            ], function (value) {
                expectTest({
                    value:value,
                    config:value,
                    err:false
                });
            });
        });

        it("should fail and break if value and config are not the same", function () {
            _.each([
                [undefined, null],
                ["undefined", undefined],
                [
                    {},
                    {}
                ],
                ["0", 0],
                ["", 0],
                [null, 0],
                [function () {
                }, function () {
                }],
                [/a/, /a/]
            ], function (o) {
                expectTest({
                    value:o[0],
                    config:o[1],
                    err:true
                });
            });
        });
    });

    describe("equal", function () {
        beforeEach(function () {
            test = "equal";
        });

        it("should pass if value and config are equal", function () {
            _.each([
                [undefined, undefined],
                [
                    {},
                    {}
                ],
                [0, 0],
                [null, null],
                ["", ""],
                [/a/, /a/],
                [new Date(0), new Date(0)],
                [
                    [],
                    []
                ],
                [
                    {a:1, b:[2, null]},
                    {a:1, b:[2, null]}
                ]
            ], function (o) {
                expectTest({
                    value:o[0],
                    config:o[1],
                    err:false
                });
            });
        });

        it("should fail and break if value and config are not equal", function () {
            _.each([
                [undefined, null],
                ["undefined", undefined],
                ["0", 0],
                ["", 0],
                [null, 0],
                [function () {
                }, function () {
                }]
            ], function (o) {
                expectTest({
                    value:o[0],
                    config:o[1],
                    err:true
                });
            });
        });
    });

    describe("contained", function () {
        beforeEach(function () {
            test = "contained";
        });

        it("should configure array by throw exception by any other variable", function () {
            _.each([
                [],
                [0],
                ["1", 2, 3]
            ], function (value) {
                expectCheck(value, value);
            });
            _.each([
                undefined,
                {},
                null,
                0,
                "a",
                new Date()
            ], function (value) {
                expectCheckThrow(value);
            });
        });

        it("should pass if config list contains the item", function () {
            _.each([
                0,
                1,
                "a"
            ], function (value) {
                expectTest({
                    value:value,
                    config:[0, 1, "a"],
                    err:false
                });
            });
        });

        it("should fail and break if config list does not contain the item", function () {
            _.each([
                null,
                undefined,
                "b",
                ""
            ], function (value) {
                expectTest({
                    value:value,
                    config:[0, 1, "a"],
                    err:true
                });
            });
        });
    });

    describe("match", function () {
        beforeEach(function () {
            test = "match";
        });

        it("should configure pattern if it's a name of common pattern or a regex pattern", function () {
            expectCheck("digits", {all:[basic.patterns.digits]});
            expectCheck("email", {all:[basic.patterns.email]});
            expectCheckThrow("test");
            expectCheck(/a/, {all:[/a/]});
            expectCheck(["email"], {all:[basic.patterns.email]});
            expectCheck(["email", /a/], {all:[basic.patterns.email, /a/]});
            expectCheckThrow([]);
            expectCheckThrow({all:[]});
            expectCheckThrow({any:[]});
            expectCheck({all:["email"]}, {all:[basic.patterns.email]});
            expectCheck({any:["email"]}, {any:[basic.patterns.email]});
            expectCheck({any:"email"}, {any:[basic.patterns.email]});
            expectCheckThrow({test:["email"]});
            expectCheck({any:"email", all:"email"}, {any:[basic.patterns.email], all:[basic.patterns.email]});
            expectCheckThrow(undefined);
            expectCheckThrow(0);
            expectCheckThrow(null);
            expectCheckThrow({});
        });

        it("should pass if patterns match", function () {
            _.each([
                ["123", {all:[basic.patterns.digits]} ],
                ["123", {any:[basic.patterns.digits, basic.patterns.email]} ],
                ["123", {all:[basic.patterns.digits, basic.patterns.number]} ],
                ["123", {any:[basic.patterns.digits, basic.patterns.number]} ],
                ["123", {all:[basic.patterns.digits, /123/], any:[basic.patterns.number, basic.patterns.email]} ]
            ], function (o) {
                expectTest({
                    value:o[0],
                    config:o[1],
                    err:false
                });
            });
        });

        it("should fail and break if pattern does not match", function () {
            _.each([
                ["a123", {all:[basic.patterns.digits]} ],
                ["123", {all:[basic.patterns.digits, basic.patterns.email]} ],
                ["abc", {any:[basic.patterns.digits, basic.patterns.number]} ],
                ["123", {all:[basic.patterns.digits, /123/], any:[basic.patterns.email]} ]
            ], function (o) {
                expectTest({
                    value:o[0],
                    config:o[1],
                    err:true
                });
            });
        });
    });


    describe("duplicate", function () {
        beforeEach(function () {
            test = "duplicate";
        });

        it("should configure strings only", function () {
            expectCheck("test", "test");
            expectCheckThrow(123);
        });

        it("should error if it's not duplication of the attribute", function () {
            expectTest({
                value:"test",
                config:"password",
                err:true,
                model:{
                    get:function (attr) {
                        return this[attr];
                    }
                }
            });
        });

        it("should pass if it's duplication of the attribute", function () {
            expectTest({
                value:"test",
                config:"password",
                err:false,
                model:{
                    password:"test",
                    get:function (attr) {
                        return this[attr];
                    }
                }
            });
        });
    });

    var expectCheck = function (value, expected) {
        var check = basic.checks[test];
        var mock = {};
        mock.patterns = basic.patterns;
        expect(check.call(mock, value, test)).toEqual(expected);
    };

    var expectCheckThrow = function (value, exception) {
        var check = basic.checks[test];
        var mock = {};
        mock[test] = value;
        var caller = function () {
            check.call(mock, value, test);
        };
        expect(caller).toThrow(exception);
    };

    var expectTest = function (o) {
        var arr = basic.tests[test];
        var task = (arr instanceof Array) ? arr[arr.length - 1] : arr;
        var isDone = false;
        var mock = {};
        runs(function () {
            o.done = function (err, options) {
                mock.err = err;
                mock.options = options;
                isDone = true;
            };
            task.call(o, o.done);
        });
        waitsFor(function () {
            return isDone == true;
        });
        runs(function () {
            expect(mock.err).toEqual(o.err);
            expect(mock.options).toEqual(o.options);
        });
    };

});