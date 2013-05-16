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
        noMessage: "",
        pendingMessage: "Pending ...",
        unknownMessage: "Not valid.",
        chunkSeparator: "<br/>",
        initialize: function () {
            this.messages = this.options.messages;
            this.mixin([Backbone.UI.HasModel]);
            _(this).bindAll('_refreshValue');
            this._observeModel(this._refreshValue);
        },
        render: function () {
            this.box = $.el.span({className: "messenger"});
            this._refreshValue();
            $(this.el).empty();
            this.el.appendChild($.el.div({className: 'messenger_wrapper'}, this.box));
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
                    var section = this.messages[name];
                    if (_.isString(section))
                        chunks.push(section);
                    else if (section && section[error])
                        chunks.push(section[error]);
                }, this);
                if (!chunks.length)
                    chunks.push(this.unknownMessage);
            }
            else if (errors === undefined)
                pending = true;

            var message = "";
            if (pending)
                message = this.pendingMessage;
            else if (chunks)
                message = chunks.join(this.chunkSeparator);
            else
                message = this.noMessage;

            this.box.innerHTML = message;
        }
    });

    Backbone.UI.Form = Backbone.View.extend({
        tagName: "form",
        initialize: function () {
            this.schema = {};
            this.messages = {};
            this.fields = {};
            this.buttons = {};
            _.each(this.options.fields, function (config, attribute) {
                this.schema[attribute] = config.schema;
                this.messages[attribute] = config.messages;
                this.fields[attribute] = _.omit(config, ["schema", "messages"]);
            }, this);
            _.each(this.options.buttons, function (config, attribute) {
                this.buttons[attribute] = config;
            }, this);
            this.validator = new Backbone.Validator({
                schema: this.schema
            });
            this.render();
        },
        render: function () {
            this.$el.html("");
            _.each(this.fields, function (config, attribute) {
                var field = this.field(attribute, config.label, config.type, config.options);
                this.$el.append(field);
            }, this);
            _.each(this.buttons, function (config, attribute) {
                var button = this.button(config.label, config.type, config.options);
                this.$el.append(button);
            }, this);
            this.validator.bindModel(this.model);
            this.validator.run();
            return this;
        },
        field: function (attribute, label, Field, options) {
            return $.el.p(
                $.el.label({for: attribute}, label),
                new Field(_.extend({
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

});