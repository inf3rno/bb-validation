if (typeof define !== 'function')
    var define = require('amdefine')(module);

define(function (require, exports, module) {
    var $ = require("jquery"),
        _ = require("underscore"),
        Backbone = require("backbone"),
        validation = require("../src/validation"),
        formTemplate = require("tpl!registrationForm.html");

    var AbstractForm = Backbone.View.extend({
        tagName:"form",
        initialize:function () {
            this.render();
        },
        render:function () {
            this.displayContent();
            this.findInputs();
            this.bindInputs();
            this.findButton();
            return this;
        },
        displayContent:function () {
            this.$el.html(this.template(this.model.toJSON()));
        },
        findInputs:function () {
            this.$inputs = {};
            $("input", this.$el).each(function (index, input) {
                var $input = $(input);
                var attribute = $input.attr("name");
                if (!attribute)
                    return;
                this.$inputs[attribute] = $input;
            }.bind(this));
        },
        bindInputs:function () {
            _.each(this.$inputs, function ($input) {
                $input.change(function () {
                    this.model.set(attribute, $input.val());
                }.bind(this));
            }, this);
        },
        findButton:function () {
            this.$button = $("button", this.$el);
        }
    });

    var RegistrationForm = AbstractForm.extend({
        className:"registration",
        template:formTemplate,
        render:function () {
            this.constructor.__super__.render.apply(this, arguments);
            this.createMessenger();
            this.createAggregator();
            return this;
        },
        createMessenger:function () {
            this.messenger = new InputErrors({
                form:this
            });
        },
        createAggregator:function () {
            this.aggregator = new SubmitButtonDisabler({
                form:this
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
        initialize:function () {
            this.form = this.options.form;
            this.model = this.form.model.validator;
            this.$displays = {};
            _.each(this.form.$inputs, function ($input, attribute) {
                this.$displays[attribute] = $input.next();
            }, this);
            this.constructor.__super__.initialize.apply(this, arguments);
        },
        display:function (attribute, chunks, pending) {
            var $display = this.$displays[attribute];
            if (!$display)
                return;
            var message = "";
            if (chunks)
                message += chunks.join("<br/>");
            if (pending)
                message += "Pending ...";
            $display.html(message);
        }
    });

    var SubmitButtonDisabler = validation.Aggregator.extend({
        initialize:function () {
            this.form = this.options.form;
            this.model = this.form.model.validator;
            this.$button = this.form.$button;
            this.constructor.__super__.initialize.apply(this, arguments);
        },
        display:function (errors, pending) {
            if (errors + pending)
                this.$button.attr("disabled", "disabled");
            else
                this.$button.removeAttr("disabled");
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