var amdefine = false;
if (typeof define !== 'function')
    var define = require('amdefine')(module, require),
        amdefine = true;

define(function (require, exports, module) {
    var _ = require("underscore"),
        Backbone = require("backbone");

    var View = Backbone.View.extend({
        initialize: function () {
            this.model.on("change", function () {
                this.unRender();
                this.render();
            }, this);
            this.render();
        },
        render: function () {
        },
        unRender: function () {
        }
    });

    var Aggregator = View.extend({
        render: function () {
            this.display(this.model.errors, this.model.pending);
            return this;
        },
        display: function (errors, pending) {
        }
    });

    var Messenger = View.extend({
        unknownMessage: "Not valid.",
        initialize: function () {
            if (this.options.unknownMessage)
                this.unknownMessage = this.options.unknownMessage;
            if (!this.messages && !this.options.messages)
                throw new Error("No messages given.");
            if (this.options.messages)
                this.messages = this.options.messages;
            View.prototype.initialize.apply(this, arguments);
        },
        render: function () {
            _.each(this.model.attributes, function (errors, attribute) {
                var chunks;
                var pending = false;
                if (errors) {
                    chunks = [];
                    _.each(errors, function (error, name) {
                        var section = this.messages[attribute][name];
                        if (typeof(section) == "string")
                            chunks.push(section);
                        else if (section && section[error])
                            chunks.push(section[error]);
                    }, this);
                    if (!chunks.length)
                        chunks.push(this.unknownMessage);
                }
                else if (errors === undefined)
                    pending = true;
                this.display(attribute, chunks, pending);
            }, this);
            return this;
        },
        unRender: function () {
            _.each(this.model.attributes, function (errors, attribute) {
                this.display(attribute);
            }, this);
        },
        display: function (attribute, chunks, pending) {
        }
    });

    var InputErrors = Messenger.extend({
        pendingMessage: "Pending ...",
        chunkSeparator: "<br/>",
        initialize: function () {
            this.form = this.options.form;
            this.model = this.form.validator;
            this.$displays = {};
            _.each(this.form.$inputs, function ($input, attribute) {
                this.$displays[attribute] = $input.next();
            }, this);
            Messenger.prototype.initialize.apply(this, arguments);
        },
        display: function (attribute, chunks, pending) {
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

    var ButtonDisabler = Aggregator.extend({
        initialize: function () {
            this.form = this.options.form;
            this.model = this.form.validator;
            this.$button = this.form.$button;
            Aggregator.prototype.initialize.apply(this, arguments);
        },
        display: function (errors, pending) {
            if (errors || pending)
                this.$button.attr("disabled", "disabled");
            else
                this.$button.removeAttr("disabled");
        }
    });

    var AbstractForm = Backbone.View.extend({
        tagName: "form",
        Decorators: [],
        initialize: function () {
            this.validator = this.options.validator;
            this.render();
        },
        render: function () {
            this.displayContent();
            this.findInputs();
            this.bindInputs();
            this.findButton();
            this.decorate();
            this.validator.bind(this.model);
            this.validator.run();
            return this;
        },
        displayContent: function () {
            this.$el.html(this.template(this.model.toJSON()));
        },
        findInputs: function () {
            this.$inputs = {};
            $("input", this.$el).each(function (index, input) {
                var $input = $(input);
                var attribute = $input.attr("name");
                if (!attribute)
                    return;
                this.$inputs[attribute] = $input;
            }.bind(this));
        },
        bindInputs: function () {
            _.each(this.$inputs, function ($input, attribute) {
                $input.change(function () {
                    this.model.set(attribute, $input.val());
                }.bind(this));
            }, this);
        },
        findButton: function () {
            this.$button = $("button", this.$el);
        },
        decorate: function () {
            _.each(this.Decorators, function (Decorator) {
                new Decorator({
                    form: this
                });
            }, this);
        }
    });

    _.extend(AbstractForm, {
        InputErrors: InputErrors,
        ButtonDisabler: ButtonDisabler
    });

    Backbone.UI.Form = AbstractForm;
    module.exports = AbstractForm;

});