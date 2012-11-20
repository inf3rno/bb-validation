var _ = require("underscore"),
    TaskListBuilder = require("./backbone-validator.js").TaskListBuilder;

describe("TaskListBuilder", function () {

    describe("createTaskList", function () {
        it("returns empty tasks by empty config", function () {
            expectTaskOrder(
                [],
                []
            );
        });

        it("returns tasks in config key order if no dependency", function () {
            expectTaskOrder(
                ["a"],
                ["a"]
            );
            expectTaskOrder(
                ["a", "b"],
                ["a", "b"]
            );
            expectTaskOrder(
                ["b", "a"],
                ["b", "a"]
            );
            expectTaskOrder(
                ["b", "c", "a"],
                ["b", "c", "a"]
            );
            expectTaskOrder(
                ["a", "b", "c"],
                ["a", "b", "c"]
            );
        });

        it("returns tasks in dependency and config key order by one level depth dependencies", function () {
            expectTaskOrder(
                ["a", "b"],
                ["a", "b_a"]
            );
            expectTaskOrder(
                ["a", "b"],
                ["b_a", "a"]
            );
            expectTaskOrder(
                ["a", "b"],
                ["b_a"]
            );
            expectTaskOrder(
                ["a", "b", "c"],
                ["b_a", "c_a"]
            );
            expectTaskOrder(
                ["a", "c", "b"],
                ["c_a", "b_a"]
            );
            expectTaskOrder(
                ["a", "d", "b", "c"],
                ["d_a", "c_a_b"]
            );
        });
        it("returns tasks in dependency and config key order by multi level depth dependencies", function () {
            expectTaskOrder(
                ["a", "b", "c"],
                ["a", "b_a", "c_ab"]
            );
            expectTaskOrder(
                ["a", "b", "c"],
                ["a", "c_ab", "b_a"]
            );
            expectTaskOrder(
                ["a", "b", "c"],
                ["c_ab", "b_a"]
            );
            expectTaskOrder(
                ["a", "b", "c"],
                ["b_a", "c_ab"]
            );
            expectTaskOrder(
                ["a", "b", "c"],
                ["c_ab"]
            );
            expectTaskOrder(
                ["a", "d", "b", "c"],
                ["d_a", "c_ab"]
            );
            expectTaskOrder(
                ["a", "b", "c", "d"],
                ["c_ab", "d_a"]
            );
            expectTaskOrder(
                ["a", "d", "b", "e", "c"],
                ["d_a", "e_ab", "c_ab"]
            );
        });
    });

    var expectTaskOrder = function (expected, params) {
        var expectedKeys = [];
        var expectedValues = [];
        _.each(expected, function (key) {
            expectedKeys.push(key);
            expectedValues.push(tasks[key]);
        });
        var config = {};
        _.each(params, function (key) {
            config[key] = null;
        });
        var actual = builder.createTaskList(config);
        var actualKeys = [];
        var actualValues = [];
        _.each(actual, function (task, storeKey) {
            actualKeys.push(taskBindings[storeKey]);
            actualValues.push(task);
        });
        expect(expectedKeys).toEqual(actualKeys);
        expect(expectedValues).toEqual(actualValues);
    };

    var tasks = {
        a:0,
        b:1,
        c:2,
        d:3,
        e:4
    };
    var taskBindings = {
        a:"a",
        b:"b",
        b_a:"b",
        e_ab:"e",
        c_ab:"c",
        d_ab:"d",
        c:"c",
        d_a:"d",
        e_ab:"e",
        c_a:"c",
        c_a_b:"c"
    };
    var taskStore = {
        a:tasks.a,
        b:tasks.b,
        b_a:["a", tasks.b],
        c_ab:["b_a", tasks.c],
        d_ab:["b_a", tasks.d],
        c:tasks.c,
        d_a:["a", tasks.d],
        e_ab:["b_a", tasks.e],
        c_a:["a", tasks.c],
        c_a_b:["a", "b", tasks.c]
    };
    var builder = new TaskListBuilder(taskStore);
});