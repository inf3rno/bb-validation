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
        var provider = new ValidatorProvider();
        it("calls every task in order if no error", function () {
            var tasks = {
                a:function (value, config, done) {
                    var err = null;
                    done(err, config);
                },
                b:function (value, config, done) {
                    done(null, config);
                },
                c:function (value, config, done) {
                    done(null, config);
                }
            };
            var config = {
                a:1,
                b:2,
                c:3
            };
            var validator = provider.validator(tasks, config);
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
            validator.validate(123);
            expect(buffer).toEqual([
                "start",
                {key:"a", result:config["a"]},
                {key:"b", result:config["b"]},
                {key:"c", result:config["c"]},
                "end"
            ]);
        });


    });
});


