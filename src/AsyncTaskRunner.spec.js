var _ = require("underscore"),
    Backbone = require("backbone"),
    AsyncSeriesTaskRunner = require("./backbone-validator.js").AsyncSeriesTaskRunner;

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
                config:{b:2},
                values:[1, 2],
                delay:10
            });
        });


    });

    describe("task series context", function () {

        it("sends the given context param by events", function () {
            var context = {test:1};
            expectSync([
                {start:context},
                {done:context, result:null},
                {done:context, result:null},
                {end:context}
            ], {
                tasks:{a:callNext, b:callNext},
                config:{},
                value:null,
                context:context,
                logger:logContext
            });

            expectSync([
                {start:context},
                {done:context, result:null},
                {done:context, result:null},
                {error:context}
            ], {
                tasks:{a:callNext, b:raiseError},
                config:{},
                value:null,
                context:context,
                logger:logContext
            });

        });

        it("calls the tasks in the given context", function () {
            var context = {test:1};
            expectSync([
                {start:context},
                {done:context, result:context},
                {done:context, result:context},
                {end:context}
            ], {
                tasks:{a:resultsContext, b:resultsContext},
                config:{},
                value:null,
                context:context,
                logger:logContext
            });
        });

        it("sends different event param: context by concurrent calls", function () {
            var context1 = {test:1};
            var context2 = {test:2};
            expectConcurrent([
                {start:context1},
                {start:context2},
                {done:context1, result:null},
                {done:context1, result:null},
                {end:context1},
                {done:context2, result:null},
                {done:context2, result:null},
                {end:context2}
            ], {
                tasks:{a:delayNext, b:callNext},
                config:{},
                values:[1, 2],
                contexts:[context1, context2],
                logger:logContext,
                delay:10
            });

            expectConcurrent([
                {start:context1},
                {start:context2},
                {done:context1, result:null},
                {done:context1, result:null},
                {error:context1},
                {done:context2, result:null},
                {done:context2, result:null},
                {end:context2}
            ], {
                tasks:{a:delayNext, b:raiseErrorIfValueEqualsConfig},
                config:{b:1},
                values:[1, 2],
                contexts:[context1, context2],
                logger:logContext,
                delay:10
            });
        });

        it("calls the tasks in different context by concurrent calls", function () {
            var context1 = {test:1};
            var context2 = {test:2};
            expectConcurrent([
                {start:context1},
                {start:context2},
                {done:context1, result:null},
                {done:context1, result:context1},
                {end:context1},
                {done:context2, result:null},
                {done:context2, result:context2},
                {end:context2}
            ], {
                tasks:{a:delayNext, b:resultsContext},
                config:{},
                values:[1, 2],
                contexts:[context1, context2],
                logger:logContext,
                delay:10
            });
        });


    });

    var callNext = function () {
        var err = null;
        var result = null;
        this.done(err, result);
    };
    var delayNext = function () {
        var err = null;
        var result = null;
        setTimeout(function () {
            this.done(err, result);
        }.bind(this), 1);
    };
    var raiseError = function () {
        this.done(true, null);
    };
    var raiseErrorIfValueEqualsConfig = function () {
        this.done(this.value == this.config, null);
    };
    var emptyTask = function () {

    };
    var abortIfValueEqualsConfig = function () {
        if (this.value == this.config)
            this.stopAll();
        this.done(null, null);
    };
    var resultsContext = function () {
        this.done(null, this);
    };

    var expectAsync = function (expected, params) {
        var taskRunner = new AsyncSeriesTaskRunner(params.tasks, params.config);
        var logger = params.logger || log;
        var buffer = logger(taskRunner);
        runs(function () {
            taskRunner.iterator({value:params.value, context:params.context}).run();
        });
        waits(params.delay);
        runs(function () {
            expect(buffer).toEqual(expected);
        });
    };
    var expectConcurrent = function (expected, params) {
        var taskRunner = new AsyncSeriesTaskRunner(params.tasks, params.config);
        var logger = params.logger || log;
        var buffer = logger(taskRunner);
        runs(function () {
            var contexts = params.contexts || [];
            _.each(params.values, function (value, index) {
                setTimeout(function () {
                    taskRunner.iterator({value:value, context:contexts[index]}).run();
                }, 1);
            });
        });
        waits(params.delay);
        runs(function () {
            expect(buffer).toEqual(expected);
        });
    };
    var expectSync = function (expected, params) {
        var taskRunner = new AsyncSeriesTaskRunner(params.tasks, params.config);
        var logger = params.logger || log;
        var buffer = logger(taskRunner);
        taskRunner.iterator({value:params.value, context:params.context}).run();
        expect(buffer).toEqual(expected);
    };

    var log = function (taskRunner) {
        var buffer = [];
        taskRunner.on("start", function () {
            buffer.push("start");
        });
        taskRunner.on("done", function (key, result) {
            buffer.push({key:key, result:result});
        });
        taskRunner.on("error", function (key, error) {
            buffer.push({key:key, error:error});
        });
        taskRunner.on("end", function () {
            buffer.push("end");
        });
        return buffer;
    };

    var logContext = function (taskRunner) {
        var buffer = [];
        taskRunner.on("start", function (scope) {
            buffer.push({start:scope.context});
        });
        taskRunner.on("done", function (key, result, scope) {
            buffer.push({done:scope.context, result:result ? result.context : result});
        });
        taskRunner.on("error", function (key, error, scope) {
            buffer.push({error:scope.context});
        });
        taskRunner.on("end", function (scope) {
            buffer.push({end:scope.context});
        });
        return buffer;
    };

});


