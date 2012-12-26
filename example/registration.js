if (typeof define !== 'function')
    var define = require('amdefine')(module);

define(function (require, exports, module) {
    var $ = require("jquery"),
        _ = require("underscore"),
        Backbone = require("backbone"),
        validation = require("../src/validation"),
        form = require("form");

    var RegistrationForm = form.AbstractForm.extend({
        template:require("tpl!registrationForm.html"),
        className:"registration",
        Decorators:[
            form.messenger.InputErrors.extend({
                messages:{
                    email:{
                        required:"The email address is not given.",
                        type:"Email address must be string.",
                        match:"Not an email address.",
                        max:"The given email address is too long.",
                        registered:"The email address is already registered."
                    },
                    password:{
                        required:"The password is not given.",
                        type:"The password must be string.",
                        range:{
                            min:"The password is too short.",
                            max:"The password is too long."
                        }
                    },
                    password2:{
                        duplicate:"The verifier password does not equal to the password."
                    }
                }
            }),
            form.aggregator.ButtonDisabler
        ]
    });

    var RegistrationModel = validation.Model.extend({
        schema:{
            email:{
                required:true,
                type:String,
                match:"email",
                max:127,
                registered:1000
            },
            password:{
                required:true,
                type:String,
                range:{
                    min:5,
                    max:14
                }
            },
            password2:{
                duplicate:"password"
            }
        },
        validator:{
            tests:{
                registered:function (done) {
                    var registeredEmails = {
                        "test@test.com":true,
                        "test@test.hu":true
                    };
                    setTimeout(function () {
                        done(registeredEmails[this.value]);
                    }.bind(this), this.config);
                }
            },
            checks:{
                registered:function (delay, key) {
                    return delay || 1;
                }
            }
        }
    });


    module.exports = {
        createForm:function (attributes) {
            return new RegistrationForm({
                model:new RegistrationModel(attributes)
            });
        }
    };
});