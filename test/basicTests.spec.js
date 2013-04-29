require("./jasmine-stub");
var _ = require("underscore"),
    basic = require("../src/basicTests");
var common = basic.common;
var patterns = common.patterns;
var use = basic.use;

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
        var regex = patterns[pattern];
        expect(regex.test(target)).toBe(true);
    };
    var expectNotMatch = function (target) {
        var regex = patterns[pattern];
        expect(regex.test(target)).toBe(false);
    };
});

describe("tests", function () {
    var Test;

    describe("required", function () {
        beforeEach(function () {
            Test = use.required.exports;
        });

        it("should configure true if not given or convert to boolean anyway", function () {
            expectInit(undefined, true);
            expectInit(0, false);
            expectInit(1, true);
            expectInit("", false);
            expectInit("a", true);
            expectInit(true, true);
            expectInit(false, false);
        });

        it("should pass if required and value is not undefined", function () {
            _.each([null, "", 0, 1, "a", {}, []], function (value) {
                expectTestResult({
                    value: value,
                    schema: true,
                    err: false
                });
            });
        });

        it("should fail and break if required but value is undefined", function () {
            expectTestResult({
                schema: true,
                err: true
            });
        });

        it("should pass if not required and given", function () {
            expectTestResult({
                value: 0,
                schema: false,
                err: false
            });
        });

        it("should pass and break if not required and not given", function () {
            expectTestResult({
                schema: false,
                err: false,
                options: {abort: true}
            });
        });

    });

    describe("type", function () {
        beforeEach(function () {
            Test = use.type.exports;
        });

        it("should configure type strings, functions, null but throw exception by another variable", function () {
            _.each(["", 0, true, 1, "test", [], {}], function (value) {
                expectInitThrow(value);
            });
            _.each(["boolean", "number", "string", "function", "object", "undefined"], function (value) {
                expectInit(value, value);
            });
            expectInit("null", null);
            expectInit(null, null);
            expectInit(undefined, "undefined");
            expectInit(Boolean, "boolean");
            expectInit(Number, "number");
            expectInit(String, "string");
            expectInit(Array, Array);
            expectInit(Function, Function);
            expectInit(RegExp, RegExp);
            var f = function () {
            };
            expectInit(f, f);
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
                expectTestResult({
                    value: o[0],
                    schema: o[1],
                    err: false
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
                [Number.NaN, "number"],
                [null, "number"]
            ], function (o) {
                expectTestResult({
                    value: o[0],
                    schema: o[1],
                    err: true
                });
            })
        });
    });

    describe("min", function () {
        beforeEach(function () {
            Test = use.min.exports;
        });

        it("should configure number but throw exception by any other variable", function () {
            _.each([undefined, null, "", Number.NaN, {}], function (value) {
                expectInitThrow(value);
            });
            _.each([-1, 0, 1, 1.234, -123.142], function (value) {
                expectInit(value, value);
            });
        });

        it("should pass if number is not smaller than schema", function () {
            _.each([3.3333, 3.5, 4, 10, 100, 1000], function (value) {
                expectTestResult({
                    value: value,
                    schema: 3.3333,
                    err: false
                });
            });
        });

        it("should fail and break if number is bigger than schema", function () {
            _.each([3.3332, 3, 1, 0, -1, -4], function (value) {
                expectTestResult({
                    value: value,
                    schema: 3.3333,
                    err: true
                });
            });
        });
    });

    describe("max", function () {
        beforeEach(function () {
            Test = use.max.exports;
        });

        it("should configure number but throw exception by any other variable", function () {
            _.each([undefined, null, "", Number.NaN, {}], function (value) {
                expectInitThrow(value);
            });
            _.each([-1, 0, 1, 1.234, -123.142], function (value) {
                expectInit(value, value);
            });
        });

        it("should fail and break if number is smaller than schema", function () {
            _.each([3.3334, 3.5, 4, 10, 100, 1000], function (value) {
                expectTestResult({
                    value: value,
                    schema: 3.3333,
                    err: true
                });
            });
        });

        it("should pass if number is not smaller than schema", function () {
            _.each([3.3333, 3, 1, 0, -1, -4], function (value) {
                expectTestResult({
                    value: value,
                    schema: 3.3333,
                    err: false
                });
            });
        });
    });

    describe("range", function () {
        beforeEach(function () {
            Test = use.range.exports;
        });

        it("should configure range but throw exception by any other variable", function () {
            _.each([
                undefined,
                null,
                "",
                Number.NaN,
                {}
            ], function (value) {
                expectInitThrow([value, 1]);
                expectInitThrow([1, value]);
                expectInitThrow([value, value]);
            });

            _.each([-1, 0, 1, 1.234, -123.142], function (value) {
                expectInit([100, value], {min: value, max: 100});
                expectInit([value, 100], {min: value, max: 100});
                expectInit([value, value], {min: value, max: value});
                expectInit({min: value, max: 100}, {min: value, max: 100});
                expectInit({min: value, max: value}, {min: value, max: value});
                expectInitThrow({min: 100, max: value});
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
                expectTestResult({
                    value: o[0],
                    schema: {min: o[1], max: o[2]},
                    err: false
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
                expectTestResult({
                    value: o[0],
                    schema: {min: o[1], max: o[2]},
                    err: o[3]
                });
            });
        });
    });

    describe("identical", function () {
        beforeEach(function () {
            Test = use.identical.exports;
        });

        it("should pass if value and schema are the same", function () {
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
                expectTestResult({
                    value: value,
                    schema: value,
                    err: false
                });
            });
        });

        it("should fail and break if value and schema are not the same", function () {
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
                expectTestResult({
                    value: o[0],
                    schema: o[1],
                    err: true
                });
            });
        });
    });

    describe("equal", function () {
        beforeEach(function () {
            Test = use.equal.exports;
        });

        it("should pass if value and schema are equal", function () {
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
                    {a: 1, b: [2, null]},
                    {a: 1, b: [2, null]}
                ]
            ], function (o) {
                expectTestResult({
                    value: o[0],
                    schema: o[1],
                    err: false
                });
            });
        });

        it("should fail and break if value and schema are not equal", function () {
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
                expectTestResult({
                    value: o[0],
                    schema: o[1],
                    err: true
                });
            });
        });
    });

    describe("member", function () {
        beforeEach(function () {
            Test = use.member.exports;
        });

        it("should configure array by throw exception by any other variable", function () {
            _.each([
                [],
                [0],
                ["1", 2, 3]
            ], function (value) {
                expectInit(value, value);
            });
            _.each([
                undefined,
                {},
                null,
                0,
                "a",
                new Date()
            ], function (value) {
                expectInitThrow(value);
            });
        });

        it("should pass if schema list contains the item", function () {
            _.each([
                0,
                1,
                "a"
            ], function (value) {
                expectTestResult({
                    value: value,
                    schema: [0, 1, "a"],
                    err: false
                });
            });
        });

        it("should fail and break if schema list does not contain the item", function () {
            _.each([
                null,
                undefined,
                "b",
                ""
            ], function (value) {
                expectTestResult({
                    value: value,
                    schema: [0, 1, "a"],
                    err: true
                });
            });
        });
    });

    describe("match", function () {
        beforeEach(function () {
            Test = use.match.exports;
        });

        it("should configure pattern if it's a name of common pattern or a regex pattern", function () {
            expectInit("digits", {all: [patterns.digits]});
            expectInit("email", {all: [patterns.email]});
            expectInitThrow("test");
            expectInit(/a/, {all: [/a/]});
            expectInit(["email"], {all: [patterns.email]});
            expectInit(["email", /a/], {all: [patterns.email, /a/]});
            expectInitThrow([]);
            expectInitThrow({all: []});
            expectInitThrow({any: []});
            expectInit({all: ["email"]}, {all: [patterns.email]});
            expectInit({any: ["email"]}, {any: [patterns.email]});
            expectInit({any: "email"}, {any: [patterns.email]});
            expectInitThrow({test: ["email"]});
            expectInit({any: "email", all: "email"}, {any: [patterns.email], all: [patterns.email]});
            expectInitThrow(undefined);
            expectInitThrow(0);
            expectInitThrow(null);
            expectInitThrow({});
        });

        it("should pass if patterns match", function () {
            _.each([
                ["123", {all: [patterns.digits]} ],
                ["123", {any: [patterns.digits, patterns.email]} ],
                ["123", {all: [patterns.digits, patterns.number]} ],
                ["123", {any: [patterns.digits, patterns.number]} ],
                ["123", {all: [patterns.digits, /123/], any: [patterns.number, patterns.email]} ]
            ], function (o) {
                expectTestResult({
                    value: o[0],
                    schema: o[1],
                    err: false
                });
            });
        });

        it("should fail and break if pattern does not match", function () {
            _.each([
                ["a123", {all: [patterns.digits]} ],
                ["123", {all: [patterns.digits, patterns.email]} ],
                ["abc", {any: [patterns.digits, patterns.number]} ],
                ["123", {all: [patterns.digits, /123/], any: [patterns.email]} ]
            ], function (o) {
                expectTestResult({
                    value: o[0],
                    schema: o[1],
                    err: true
                });
            });
        });
    });


    describe("duplicate", function () {
        beforeEach(function () {
            Test = use.duplicate.exports;
        });

        it("should configure strings only", function () {
            expectInit("test", "test");
            expectInitThrow(123);
            expectInitRelations("password", ["password"]);
        });

        it("should error if it's not duplication of the attribute", function () {
            expectTestResult({
                value: "test",
                schema: "password",
                err: true,
                relations: {}
            });
        });

        it("should pass if it's duplication of the attribute", function () {
            expectTestResult({
                value: "test",
                schema: "password",
                err: false,
                relations: {
                    password: "test"
                }
            });
        });
    });

    var expectInit = function (value, expected) {
        var mockTest = jasmine.createStub(Test, ["constructor"]);
        mockTest.constructor.andCallThrough();
        mockTest.constructor({
            common: common,
            schema: value
        });
        expect(mockTest.schema).toEqual(expected);
    };

    var expectInitRelations = function (value, relations) {
        var mockTest = jasmine.createStub(Test, ["constructor"]);
        mockTest.constructor.andCallThrough();
        mockTest.constructor({
            common: common,
            schema: value
        });
        expect(_.keys(mockTest.relatedTo())).toEqual(relations);
    };

    var expectInitThrow = function (value, exception) {
        var mockTest = jasmine.createStub(Test, ["constructor"]);
        mockTest.constructor.andCallThrough();
        expect(function () {
            mockTest.constructor({
                common: common,
                schema: value
            });
        }).toThrow(exception);
    };

    var expectTestResult = function (params) {
        var isDone = false;
        var actual;
        var expected = {
            err: params.err,
            options: params.options
        };

        var mockTest = jasmine.createStub(Test, ["constructor"]);
        _.extend(mockTest, {
            common: common,
            schema: params.schema
        });
        runs(function () {
            mockTest.run(function (err, options) {
                actual = {
                    err: err,
                    options: options
                };
                isDone = true;
            }, params.value, params.relations);
        });
        waitsFor(function () {
            return isDone == true;
        });
        runs(function () {
            expect(actual).toEqual(expected);
        });
    }

});
