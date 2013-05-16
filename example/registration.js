if (typeof define !== 'function')
    var define = require('amdefine')(module, require);

define(function (require, exports, module) {

    var Backbone = require("backbone");

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

    module.exports = {
        createForm: function (attributes) {
            return new Backbone.UI.Form({
                model: new Backbone.Model(attributes),
                validator: new Backbone.Validator({
                    schema: {
                        email: {
                            required: true,
                            type: String,
                            match: "email",
                            max: 127,
                            registered: 1000
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
                }),
                messages: {
                    email: {
                        required: "The email address is not given.",
                        type: "Email address must be string.",
                        match: "Not an email address.",
                        max: "The given email address is too long.",
                        registered: "The email address is already registered."
                    },
                    password: {
                        required: "The password is not given.",
                        type: "The password must be string.",
                        range: {
                            min: "The password is too short.",
                            max: "The password is too long."
                        }
                    },
                    password2: {
                        duplicate: "The verifier password does not equal to the password."
                    }
                }
            })
        }
    };
});
