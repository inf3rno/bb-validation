if (typeof define !== 'function')
    var define = require('amdefine')(module);

define(function (require, exports, module) {
    var $ = require("jquery"),
        _ = require("underscore"),
        Backbone = require("backbone"),
        validation = require("../src/validation"),
        formTemplate = require("tpl!registrationForm.tpl");

    var RegistrationForm = Backbone.View.extend({
        tagName:"form",
        className:"registrationForm",
        template:formTemplate,
        initialize:function () {
            this.render();
        },
        render:function () {
            this.$el.html(this.template(this.model.toJSON()));
            this.bindInputs();
            this.bindButton();
            return this;
        },
        bindInputs:function () {
            this.$inputs = {};
            $("input", this.$el).each(function (index, input) {
                var $input = $(input);
                var attribute = $input.attr("name");
                if (!attribute)
                    return;
                $input.change(function () {
                    this.model.set(attribute, $input.val());
                }.bind(this));
                $input.next().css({color:"red"});
                this.$inputs[attribute] = $input;
            }.bind(this));
            this.messenger = new InputErrors({
                model:this.model.validator,
                $inputs:this.$inputs
            });
        },
        bindButton:function () {
            this.$button = $("button", this.$el);
            this.aggregator = new SubmitButtonDisabler({
                model:this.model.validator,
                $button:this.$button
            });
        }
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

    var InputErrors = validation.Messenger.extend({
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
        },
        display:function (attribute, chunks, pending) {
            var $input = this.options.$inputs[attribute];
            var message = "";
            if (chunks)
                message += chunks.join("<br/>");
            if (pending)
                message += "Pending ...";
            $input.next().html(message);
        }
    });

    var SubmitButtonDisabler = validation.Aggregator.extend({
        display:function (errors, pending) {
            if (errors + pending)
                this.options.$button.attr("disabled", "disabled");
            else
                this.options.$button.removeAttr("disabled");
        }
    });


    module.exports = {
        create:function (attributes) {
            return new RegistrationForm({
                model:new RegistrationModel(attributes)
            });
        }
    };
});