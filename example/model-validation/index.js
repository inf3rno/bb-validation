if (typeof define !== 'function')
    var define = require('amdefine')(module, require);

define(function (require, exports, module) {

    var Backbone = require("backbone");
    require("../../src/backbone-validator");
    require("../../src/backbone-validator-basic-tests");

    Backbone.Validator.plugin({
        use: {
            registered: {
                exports: Backbone.Validator.Test.extend({
                    registered: {
                        "test@test.com": true,
                        "test@test.hu": true
                    },
                    initialize: function (schema) {
                        this.delay = schema || 1;
                    },
                    evaluate: function (done, asyncParams) {
                        setTimeout(function () {
                            done({error: this.registered[asyncParams.value]});
                        }.bind(this), this.delay);
                    }
                }),
                deps: ["max", "match"]
            }
        }
    });

    var model = new Backbone.Model({
        email: "test@test.hu",
        password: "abc",
        password2: "abcd"
    });

    var validator = new Backbone.Validator({
        model: model,
        schema: {
            email: {
                required: true,
                type: String,
                match: "email",
                max: 127,
                registered: 1
            },
            password: {
                required: true,
                type: String,
                range: {
                    min: 5,
                    max: 14
                }
            },
            password2: {
                duplicate: "password"
            }
        }
    });
    validator.on("change", function () {
        console.log("pending", validator.pending, "errors", validator.errors, validator.attributes);
    });
    validator.test.on("end", function () {
        console.log("tests ended");
    });
    console.log("initial run, should result error by password and password2, and pending by the async test of email");
    validator.run();

    console.log("changing password to valid, it will check password2 too, because it is related to password");
    model.set({
        password: "abcdefgh"
    });

    console.log("changing password2 to valid");
    model.set({
        password2: "abcdefgh"
    });

    console.log("...");

    console.log("waiting for the end of the async test");

    var deferredChange = function () {
        console.log("changing email to valid, now async test runs again, btw it stops previous test automatically if it is pending and you run it again...");
        model.set({
            email: "test@test.it"
        });
        validator.test.off("end", deferredChange);
    };
    validator.test.on("end", deferredChange);

});
