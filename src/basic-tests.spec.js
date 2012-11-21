var _ = require("underscore"),
    Backbone = require("backbone"),
    validation = require("./backbone-validator"),
    basic = require("./basic-tests");


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


    });

    describe("type", function () {
        beforeEach(function () {
            test = "required";
        });

        it("should", function () {

        });
    });

    describe("min", function () {
        beforeEach(function () {
            test = "required";
        });

        it("should", function () {

        });
    });

    describe("max", function () {
        beforeEach(function () {
            test = "required";
        });

        it("should", function () {

        });
    });

    describe("range", function () {
        beforeEach(function () {
            test = "required";
        });

        it("should", function () {

        });
    });

    describe("same", function () {
        beforeEach(function () {
            test = "required";
        });

        it("should", function () {

        });
    });

    describe("equal", function () {
        beforeEach(function () {
            test = "required";
        });

        it("should", function () {

        });
    });

    describe("contained", function () {
        beforeEach(function () {
            test = "required";
        });

        it("should", function () {

        });
    });

    describe("match", function () {
        beforeEach(function () {
            test = "required";
        });

        it("should", function () {

        });
    });

    var expectCheck = function (value, expected) {
        var check = basic.attributeValidatorProvider.checks[test];
        var mock = {};
        mock[test] = value;
        check.call(mock, value, test);
        expect(mock[test]).toEqual(expected);
    };

    var expectTest = function (o) {
        var arr = basic.attributeValidatorProvider.tests[test];
        var task = (arr instanceof Array) ? arr[arr.length] : arr;
        var isDone = false;
        var mock = {};
        runs(function () {
            task(o.value, o.config, function (e, r) {
                mock.err = e;
                mock.result = r;
                isDone = true;
            });
        });
        waitsFor(function () {
            return isDone == true;
        });
        runs(function () {
            expect(mock.err).toEqual(o.err);
            expect(mock.result).toEqual(o.result);
        });
    };

    var expectDependency = function (dep) {
        var arr = basic.attributeValidatorProvider.tests[test];
        var deps = (arr instanceof Array) ? arr.slice(0, -1) : [];
        expect(deps.indexOf(dep)).not.toEqual(-1);
    };

});