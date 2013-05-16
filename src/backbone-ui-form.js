var amdefine = false;
if (typeof define !== 'function')
    var define = require('amdefine')(module, require),
        amdefine = true;

define(function (require, exports, module) {
    var _ = require("underscore"),
        Backbone = require("backbone"),
        $ = require("jquery");

    if (!Backbone.UI)
        throw new Error("Backbone.UI not loaded yet!");

    Backbone.UI.Messenger = Backbone.View.extend({
        tagName: "div",
        className: "messenger_wrapper",
        options: {
            noMessage: "",
            pendingMessage: "Pending ...",
            unknownMessage: "Not valid.",
            chunkSeparator: "<br/>",
            messages: {}
        },
        initialize: function () {
            this.mixin([Backbone.UI.HasModel]);
            _(this).bindAll('_refreshValue');
            this._observeModel(this._refreshValue);
        },
        render: function () {
            this.box = $.el.span({className: "messenger"});
            this._refreshValue();
            $(this.el).empty();
            this.el.appendChild(this.box);
            return this;
        },
        _refreshValue: function () {
            if (!this.box)
                return;
            var errors = this.resolveContent();
            var chunks;
            var pending = false;
            if (errors) {
                chunks = [];
                _.each(errors, function (error, name) {
                    var section = this.options.messages[name];
                    if (_.isString(section))
                        chunks.push(section);
                    else if (section && section[error])
                        chunks.push(section[error]);
                }, this);
                if (!chunks.length)
                    chunks.push(this.options.unknownMessage);
            }
            else if (errors === undefined)
                pending = true;

            var message = "";
            if (pending)
                message = this.options.pendingMessage;
            else if (chunks)
                message = chunks.join(this.options.chunkSeparator);
            else
                message = this.options.noMessage;

            this.box.innerHTML = message;
        }
    });

    Backbone.UI.Form = Backbone.View.extend({
        tagName: "div",
        className: "form_wrapper",
        options: {
            width: null,
            fields: null,
            buttons: null
        },
        initialize: function () {
            this.options.width = this.options.width || this.width;
            this.options.fields = _.extend({}, this.fields, this.options.fields);
            this.options.buttons = _.extend({}, this.buttons, this.options.buttons);
            this.schema = {};
            this.messages = {};
            this.fieldConfigs = {};
            this.buttonConfigs = {};
            _.each(this.options.fields, function (config, attribute) {
                this.schema[attribute] = config.schema;
                this.messages[attribute] = config.messages;
                this.fieldConfigs[attribute] = _.omit(config, ["schema", "messages"]);
            }, this);
            _.each(this.options.buttons, function (config, attribute) {
                this.buttonConfigs[attribute] = config;
            }, this);
            this.validator = new Backbone.Validator({
                schema: this.schema
            });
        },
        render: function () {
            this.form = $.el("form", {className: "form"});
            _.each(this.fieldConfigs, function (config, attribute) {
                var field = this.field(attribute, config.label, config.type, config.options);
                $(this.form).append(field);
            }, this);
            _.each(this.buttonConfigs, function (config, attribute) {
                var button = this.button(config.label, config.type, config.options);
                $(this.form).append(button);
            }, this);
            if (this.options.width)
                this.$el.css({width: this.options.width + "px"});
            this.$el.html(this.form);
            this.validator.bindModel(this.model);
            this.validator.run();
            return this;
        },
        field: function (attribute, label, Field, options) {
            return $.el.p({className: "field_wrapper"},
                $.el.label({for: attribute, className: "label"}, label),
                new Field(_.extend({
                    className: "field",
                    model: this.model,
                    content: attribute
                }, options)).render().el,
                new Backbone.UI.Messenger({
                    model: this.validator,
                    content: attribute,
                    messages: this.messages[attribute]
                }).render().el
            );
        },
        button: function (label, Button, options) {
            var submit = new Button(_.extend({
                disabled: true,
                content: label,
                onclick: function () {
                    this.trigger("submit", this.model);
                    return false;
                }.bind(this)
            }, options));
            this.validator.on("change", function () {
                submit.setEnabled(!this.validator.errors && !this.validator.pending);
            }, this);
            return $.el.p(
                submit.render().el
            );
        }
    });

    var setOptions = function (options) {
        _.each(options, function (value, option) {
            this.prototype.options[option] = value;
        }, this)
    };
    _.each(Backbone.UI, function (item, key) {
        if (_.isFunction(item))
            item.setOptions = setOptions;
    });

});