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

    var User = Backbone.Model.extend({
        notAllowedEmailHost: "gmail.com",
        sync: function (method, model, options) {
            if (method == "read" || method == "delete")
                throw new Error("Example is not prepared for these methods.");
            var email = model.get("email");
            var status = 201;
            if (email.indexOf(this.notAllowedEmailHost) != -1)
                status = 400;
            else if (method == "update")
                status = 500;
            options.xhr = {
                status: status
            };
            if (status >= 400)
                options.error(options.xhr);
            else
                options.success({
                    id: 1
                });
        }
    });

    module.exports = {
        createForm: function (attributes) {
            var user = new User(attributes);
            user.on("change:id", function () {
                window.alert("Event after new user saved.");
            });
            return new Backbone.UI.Form({
                width: 500,
                model: user,
                fields: {
                    email: {
                        type: Backbone.UI.TextField,
                        label: "Email",
                        schema: {
                            required: true,
                            type: String,
                            match: "email",
                            max: 127,
                            registered: 1000
                        },
                        messages: {
                            required: "The email address is not given.",
                            type: "Email address must be string.",
                            match: "Not an email address.",
                            max: "The given email address is too long.",
                            registered: "The email address is already registered."
                        }
                    },
                    password: {
                        type: Backbone.UI.TextField,
                        options: {
                            type: "password"
                        },
                        label: "Password",
                        schema: {
                            required: true,
                            type: String,
                            range: {
                                min: 5,
                                max: 14
                            }
                        },
                        messages: {
                            required: "The password is not given.",
                            type: "The password must be string.",
                            range: {
                                min: "The password is too short.",
                                max: "The password is too long."
                            }
                        }
                    },
                    password2: {
                        type: Backbone.UI.TextField,
                        options: {
                            type: "password"
                        },
                        label: "Confirm Password",
                        schema: {
                            duplicate: "password"
                        },
                        messages: {
                            duplicate: "The verifier password does not equal to the password."
                        }
                    }
                },
                buttons: {
                    submit: {
                        type: Backbone.UI.Button,
                        label: "Register",
                        messages: {
                            500: "User already saved.",
                            400: "Cannot register user with gmail account.",
                            201: "User registered"
                        }
                    }
                }
            });
        }
    };
});
