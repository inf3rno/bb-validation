if (typeof define !== 'function')
    var define = require('amdefine')(module);

define(function (require, exports, module) {
    var _ = require("underscore"),
        Backbone = require("backbone");

    /** @class
     * @extends Backbone.Events
     * @constructor
     */
    var AbstractTest = function () {
    };
    _.extend(AbstractTest.prototype, Backbone.Events, /** @lends AbstractTest#*/{
        enabled:true,
        pass:function () {
            this.trigger("done", true);
        },
        fail:function () {
            this.trigger("done", false);
        },
        disable:function () {
            if (!this.enabled)
                throw new SyntaxError("Test is already disabled.");
            this.enabled = false;
            this.trigger("toggle", this.enabled);
        },
        enable:function () {
            if (this.enabled)
                throw new SyntaxError("Test is already enabled.");
            this.enabled = true;
            this.trigger("toggle", this.enabled);
        },
        check:function (value) {
            if (!this.enabled)
                throw new SyntaxError("Cannot run disabled test.");
            this.evaluate(value);
        }
    });

    /** @class
     * @extends AbstractTest
     * @constructor
     */
    var AbstractAsyncTest = function () {
    };
    _.extend(AbstractAsyncTest.prototype, AbstractTest.prototype, /** @lends AbstractAsyncTest#*/ {
        id:0,
        tick:function () {
            ++this.id;
        },
        concurrency:function (id) {
            return id != this.id;
        },
        pass:function (id) {
            if (this.concurrency(id))
                return;
            this.tick();
            AbstractTest.prototype.pass.call(this);
        },
        fail:function (id) {
            if (this.concurrency(id))
                return;
            this.tick();
            AbstractTest.prototype.fail.call(this);
        },
        disable:function () {
            this.tick();
            AbstractTest.prototype.disable.call(this);
        },
        enable:function () {
            this.tick();
            AbstractTest.prototype.enable.call(this);
        },
        check:function (value) {
            this.tick();
            AbstractTest.prototype.check.apply(this, arguments);
        }
    });

    var RequiredTest = function (required) {
        this.required = required;
    };
    _.extend(RequiredTest.prototype, AbstractTest.prototype, {
        evaluate:function (value) {
            if (value !== undefined || !this.required)
                this.pass();
            else
                this.fail();
        }
    });

    var TypeTest = function (type) {
        if (type == "null")
            type = null;
        else if (type === undefined)
            type = "undefined";
        else if (typeof(type) == "function") {
            if (type == String)
                type = "string";
            else if (type == Number)
                type = "number";
            else if (type == Boolean)
                type = "boolean";
            else if (type == Object)
                type = "object";
        }
        this.type = type;
    };
    _.extend(TypeTest.prototype, AbstractTest.prototype, {
        evaluate:function (value) {
            var passed;
            if (typeof(this.type) == "string")
                passed = (typeof(value) == this.type);
            else if (typeof(this.type) == "function")
                passed = (value instanceof this.type);
            else if (this.type === null)
                passed = (value === this.type);
            else
                throw new SyntaxError("Invalid type param.");
            if (passed)
                this.pass();
            else
                this.fail();
        }
    });

    var MinTest = function (min) {
        if (isNaN(min))
            throw new SyntaxError("Invalid min param.");
        this.min = min;
    };
    _.extend(MinTest.prototype, AbstractTest.prototype, {
        evaluate:function (num) {
            if (typeof (num) == "string")
                num = num.length;
            if (num < this.min)
                this.fail();
            else
                this.pass();
        }
    });

    var MaxTest = function (max) {
        if (isNaN(max))
            throw new SyntaxError("Invalid max param.");
        this.max = max;
    };
    _.extend(MaxTest.prototype, AbstractTest.prototype, {
        evaluate:function (num) {
            if (typeof (num) == "string")
                num = num.length;
            if (num > this.max)
                this.fail();
            else
                this.pass();
        }
    });

    var RangeTest = function (range) {
        if (typeof(range) != "object" || isNaN(range.min) || isNaN(range.max))
            throw new SyntaxError("Invalid range param.");
        _.extend(this, range);
    };
    _.extend(RangeTest.prototype, AbstractTest.prototype, {
        evaluate:function (num) {
            if (typeof (num) == "string")
                num = num.length;
            if (num > this.max || num < this.min)
                this.fail();
            else
                this.pass();
        }
    });

    var SameTest = function (expected) {
        this.expected = expected;
    };
    _.extend(SameTest.prototype, AbstractTest.prototype, {
        evaluate:function (actual) {
            if (actual === this.expected)
                this.pass();
            else
                this.fail();
        }
    });
    var EqualTest = function (expected) {
        this.expected = expected;
    };
    _.extend(EqualTest.prototype, AbstractTest.prototype, {
        evaluate:function (actual) {
            var passed = typeof(this.expected) == "object" ? _.isEqual(actual, this.expected) : actual === this.expected;
            if (passed)
                this.pass();
            else
                this.fail();
        }
    });
    var ContainedTest = function (list) {
        this.list = list;
    };
    _.extend(ContainedTest.prototype, AbstractTest.prototype, {
        evaluate:function (item) {
            if (this.list.indexOf(item) != -1)
                this.pass();
            else
                this.fail();
        }
    });

    var MatchTest = function (expressions) {
        if (typeof(expressions) == "string" || (expressions instanceof RegExp) || (expressions instanceof Array))
            expressions = {all:expressions};
        if (expressions.all && !(expressions.all instanceof Array))
            expressions.all = [expressions.all];
        if (expressions.any && !(expressions.any instanceof Array))
            expressions.any = [expressions.any];
        this.expressions = expressions;
    };
    _.extend(MatchTest.prototype, AbstractTest.prototype, {
        patterns:{
            digits:/^\d+$/,
            number:/^-?(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/,
            email:/^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i,
            url:/^(https?|ftp):\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i
        },
        evaluate:function (value) {
            var tester = function (expression) {
                if (typeof(expression) == "string")
                    expression = this.patterns[expression];
                if (!(expression instanceof RegExp))
                    throw new SyntaxError("Invalid expression given.");
                return expression.test(value);
            };
            var valid = true;
            if (this.expressions.all)
                valid = valid && _.all(this.expressions.all, tester, this);
            if (this.expressions.any)
                valid = valid && _.any(this.expressions.any, tester, this);
            if (valid)
                this.pass();
            else
                this.fail();
        }
    });


    /** @class
     * @constructor
     */
    var Suite = function (suite, patterns) {
        if (suite)
            _.extend(this, suite);
    };
    _.extend(Suite.prototype, /** @lends Suite#*/{
        /** @param Validator validator*/
        required:function (validator, required) {
            var test = new RequiredTest(required);
            test.on("done", function (passed) {
                var existence = (validator.value !== undefined);
                if (existence)
                    validator.pass("required");
                else {
                    validator.clear();
                    if (required)
                        validator.fail("required");
                    else
                        validator.pass("required");
                    validator.done();
                }
            });
            test.check(validator.value);
        },
        /** @param Validator validator*/
        type:function (validator, type) {
            var test = new TypeTest(type);
            test.on("done", function (passed) {
                if (passed)
                    validator.pass("type");
                else {
                    validator.clear();
                    validator.fail("type");
                    validator.done();
                }
            });
            test.check(validator.value);
        },
        /** @param Validator validator*/
        min:function (validator, min) {
            var test = new MinTest(min);
            test.on("done", function (passed) {
                if (passed)
                    validator.pass("min");
                else
                    validator.fail("min");
            });
            test.check(validator.value);
        },
        /** @param Validator validator*/
        max:function (validator, max) {
            var test = new MaxTest(max);
            test.on("done", function (passed) {
                if (passed)
                    validator.pass("max");
                else
                    validator.fail("max");
            });
            test.check(validator.value);
        },
        /** @param Validator validator*/
        range:function (validator, range) {
            var test = new RangeTest(range);
            test.on("done", function (passed) {
                if (passed)
                    validator.pass("range");
                else
                    validator.fail("range");
            });
            test.check(validator.value);
        },
        /** @param Validator validator*/
        equal:function (validator, expected) {
            var test = new EqualTest(expected);
            test.on("done", function (passed) {
                if (passed)
                    validator.pass("equal");
                else
                    validator.fail("equal");
            });
            test.check(validator.value);
        },
        /** @param Validator validator*/
        same:function (validator, expected) {
            var test = new SameTest(expected);
            test.on("done", function (passed) {
                if (passed)
                    validator.pass("same");
                else
                    validator.fail("same");
            });
            test.check(validator.value);
        },
        /** @param Validator validator*/
        contained:function (validator, list) {
            var test = new ContainedTest(list);
            test.on("done", function (passed) {
                if (passed)
                    validator.pass("contained");
                else
                    validator.fail("contained");
            });
            test.check(validator.value);
        },
        /** @param Validator validator
         * @param RegExp expression
         * */
        match:function (validator, expressions) {
            var test = new MatchTest(expressions);
            test.on("done", function (passed) {
                if (passed)
                    validator.pass("match");
                else
                    validator.fail("match");
            });
            test.check(validator.value);
        }
    });

    /** @class
     * @extends Backbone.Events
     * @constructor
     */
    var Validator = function (schema, suite) {
        this.schema = schema;
        if (suite)
            this.suite = function () {
                return new Suite(suite);
            };
        this.suites = {};
        _.each(this.schema, function (rules, attribute) {
            this.suites[attribute] = new this.suite();
        }, this);
    };
    _.extend(Validator.prototype, Backbone.Events, /** @lends Validator#*/{
        suite:Suite,
        validate:function (model) {
            _.each(this.schema, function (rules, attribute) {
                this.attribute = attribute;
                this.value = model.get(attribute);
                this.isDone = false;
                this.clear();
                _.all(rules, function (params, test) {
                    var check = this.suites[attribute][test];
                    if (!(check instanceof Function))
                        throw new SyntaxError("Invalid validator config: test " + test + " not exist.");
                    check.call(this.suites[attribute], this, params);
                    if (typeof (this.stack[test]) != "boolean")
                        this.pendings.push(test);
                    return !this.isDone;
                }, this);
                var event = this.pendings.length ? "pending" : (this.isValid ? "pass" : "fail");
                this.trigger(event, this.attribute, this.stack);
                this.trigger(event + ":" + this.attribute, this.stack);
            }, this);
        },
        pass:function (test) {
            this.stack[test] = true;
        },
        fail:function (test) {
            this.stack[test] = false;
            this.isValid = false;
        },
        done:function () {
            this.pendings = [];
            this.isDone = true;
        },
        clear:function () {
            this.pendings = [];
            this.isValid = true;
            this.stack = {};
        }
    });

    module.exports = {
        Suite:Suite,
        Validator:Validator
    };

    _.extend(Backbone, module.exports);
})
;