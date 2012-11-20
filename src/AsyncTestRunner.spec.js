var _ = require("underscore"),
    Backbone = require("backbone");

var ValidatorProvider = function () {

};
ValidatorProvider.prototype.validator = function (tasks, config) {
    return new Validator(tasks, config);
};

var Validator = function (tasks, config) {
    this.config = config;
    this.id = 0;
    this.running = {};

    var wrapNext = function (series, task, key, tasks) {
        return function (value, id) {
            if (!(id in this.running))
                return;
            var done = function (error, result) {
                this.trigger("done", key, result);
                if (error) {
                    this.running[id] = false;
                    this.trigger("error", key, error);
                }
                else
                    series.call(this, value, id);
            }.bind(this);
            task.call(this, value, this.config[key], done);
        }.bind(this);
    };
    var end = function (value, id) {
        this.running[id] = false;
        this.trigger("end");
    };
    this.taskRunner = _.reduceRight(tasks, wrapNext, end, this);
};
Validator.prototype.validate = function (value) {
    ++this.id;
    this.running[this.id] = true;
    this.trigger("start");
    this.taskRunner(value, this.id);
};
Validator.prototype.abort = function () {
    this.running = {};
};
_.extend(Validator.prototype, Backbone.Events);


describe("basic async with underscore", function () {
    describe("sync series", function () {

        it("calls every task in order if no error", function () {
            expectSync([
                "start",
                {key:"a", result:null},
                {key:"b", result:null},
                "end"
            ], {
                tasks:{a:callNext, b:callNext},
                config:{},
                value:null
            });
        });

        it("does not end by calling empty task", function () {
            expectSync([
                "start",
                {key:"a", result:null}
            ], {
                tasks:{a:callNext, b:emptyTask},
                config:{},
                value:null
            });
        });


    });

    describe("async series", function () {
        it("calls every task in order if no error", function () {
            expectAsync([
                "start",
                {key:"a", result:null},
                {key:"b", result:null},
                "end"
            ], {
                tasks:{a:delayNext, b:callNext},
                config:{},
                value:null,
                delay:10
            });
        });

        it("breaks by error", function () {
            expectAsync([
                "start",
                {key:"a", result:null},
                {key:"a", error:true}
            ], {
                tasks:{a:raiseError},
                config:{},
                value:null,
                delay:10
            });
        });

        it("can handle concurrent calls", function () {
            expectConcurrent([
                "start",
                "start",
                {key:"a", result:null},
                {key:"b", result:null},
                "end",
                {key:"a", result:null},
                {key:"b", result:null},
                "end"
            ], {
                tasks:{a:delayNext, b:callNext},
                config:{},
                values:[1, 2],
                delay:10
            });
        });

        it("breaks one of the concurrent calls but leaves another one untouched", function () {
            expectConcurrent([
                "start",
                "start",
                {key:"a", result:null},
                {key:"b", result:null},
                {key:"b", error:true},
                {key:"a", result:null},
                {key:"b", result:null},
                "end"
            ], {
                tasks:{a:delayNext, b:raiseErrorIfValueEqualsConfig},
                config:{b:1},
                values:[1, 2],
                delay:10
            });
        });

        it("breaks both of the concurrent calls by abort", function () {
            expectConcurrent([
                "start",
                "start",
                {key:"a", result:null},
                {key:"b", result:null},
                {key:"a", result:null}
            ], {
                tasks:{a:delayNext, b:abortIfValueEqualsConfig, c:delayNext},
                config:{b:1},
                values:[1, 2],
                delay:10
            });
        });


    });

    var provider = new ValidatorProvider();
    var callNext = function (value, config, done) {
        var err = null;
        var result = null;
        done(err, result);
    };
    var delayNext = function (value, config, done) {
        var err = null;
        var result = null;
        setTimeout(function () {
            done(err, result);
        }, 1);
    };
    var raiseError = function (value, config, done) {
        done(true, null);
    };
    var raiseErrorIfValueEqualsConfig = function (value, config, done) {
        done(value == config, null);
    };
    var emptyTask = function () {

    };
    var abortIfValueEqualsConfig = function (value, config, done) {
        if (value == config)
            this.abort();
        done(null, null);
    };

    var expectAsync = function (expected, params) {
        var validator = provider.validator(
            params.tasks,
            params.config
        );
        var buffer = log(validator);
        runs(function () {
            validator.validate(params.value);
        });
        waits(params.delay);
        runs(function () {
            expect(buffer).toEqual(expected);
        });
    };
    var expectConcurrent = function (expected, params) {
        var validator = provider.validator(
            params.tasks,
            params.config
        );
        var buffer = log(validator);
        runs(function () {
            _.each(params.values, function (value) {
                setTimeout(function () {
                    validator.validate(value);
                }, 1);
            });
        });
        waits(params.delay);
        runs(function () {
            expect(buffer).toEqual(expected);
        });
    };
    var expectSync = function (expected, params) {
        var validator = provider.validator(
            params.tasks,
            params.config
        );
        var buffer = log(validator);
        validator.validate(params.value);
        expect(buffer).toEqual(expected);
    };

    var log = function (validator) {
        var buffer = [];
        validator.on("start", function () {
            buffer.push("start");
        });
        validator.on("done", function (key, result) {
            buffer.push({key:key, result:result});
        });
        validator.on("error", function (key, error) {
            buffer.push({key:key, error:error});
        });
        validator.on("end", function () {
            buffer.push("end");
        });
        return buffer;
    };
});


