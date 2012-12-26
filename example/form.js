if (typeof define !== 'function')
    var define = require('amdefine')(module);

define(function (require, exports, module) {
    var $ = require("jquery"),
        _ = require("underscore"),
        Backbone = require("backbone"),
        validation = require("../src/validation");

    var AbstractForm = Backbone.View.extend({
        tagName:"form",
        Decorators:[],
        initialize:function () {
            this.render();
        },
        render:function () {
            this.displayContent();
            this.findInputs();
            this.bindInputs();
            this.findButton();
            this.decorate();
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
        },
        decorate:function () {
            _.each(this.Decorators, function (Decorator) {
                new Decorator({
                    form:this
                });
            }, this);
        }
    });

    var InputErrors = validation.Messenger.extend({
        pendingMessage:"Pending ...",
        chunkSeparator:"<br/>",
        initialize:function () {
            this.form = this.options.form;
            this.model = this.form.model.validator;
            this.$displays = {};
            _.each(this.form.$inputs, function ($input, attribute) {
                this.$displays[attribute] = $input.next();
            }, this);
            validation.Messenger.prototype.initialize.apply(this, arguments);
        },
        display:function (attribute, chunks, pending) {
            var $display = this.$displays[attribute];
            if (!$display)
                return;
            var message = "";
            if (pending)
                message = this.pendingMessage;
            else if (chunks)
                message = chunks.join(this.chunkSeparator);
            $display.html(message);
        }
    });

    var ButtonDisabler = validation.Aggregator.extend({
        initialize:function () {
            this.form = this.options.form;
            this.model = this.form.model.validator;
            this.$button = this.form.$button;
            validation.Aggregator.prototype.initialize.apply(this, arguments);
        },
        display:function (errors, pending) {
            if (errors + pending)
                this.$button.attr("disabled", "disabled");
            else
                this.$button.removeAttr("disabled");
        }
    });

    module.exports = {
        AbstractForm:AbstractForm,
        messenger:{
            InputErrors:InputErrors
        },
        aggregator:{
            ButtonDisabler:ButtonDisabler
        }
    };
});