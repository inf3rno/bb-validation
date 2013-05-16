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
        noMessage: "OK",
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

            this.box.innerHTML = message;
        }
    });

    Backbone.UI.Form = Backbone.View.extend({
        tagName: "form",
        initialize: function () {
            this.validator = this.options.validator;
            this.render();
        },
        render: function () {
            var emalField = $.el.p(
                $.el.span("Email"),
                new Backbone.UI.TextField({
                    model: this.model,
                    content: "email"
                }).render().el
            );
            var emErr = new Backbone.UI.Messenger({
                model: this.validator,
                content: "email",
                messages: this.options.messages.email
            }).render().$el;
            var pwField = $.el.p(
                $.el.span("Password"),
                new Backbone.UI.TextField({
                    type: "password",
                    model: this.model,
                    content: "password"
                }).render().el
            );
            var pwErr = new Backbone.UI.Messenger({
                model: this.validator,
                content: "password",
                messages: this.options.messages.password
            }).render().$el;
            var pw2Field = $.el.p(
                $.el.span("Confirm Password"),
                new Backbone.UI.TextField({
                    type: "password",
                    model: this.model,
                    content: "password2"
                }).render().el
            );
            var pw2Err = new Backbone.UI.Messenger({
                model: this.validator,
                content: "password2",
                messages: this.options.messages.password2
            }).render().$el;
            var submit = new Backbone.UI.Button({
                disabled: true,
                content: 'Register',
                onclick: function () {
                    this.trigger("submit", this.model);
                    return false;
                }.bind(this)
            });
            this.validator.on("change", function () {
                submit.setEnabled(!this.validator.errors && !this.validator.pending);
            }, this);

            var button = $.el.p({style: "padding-top: 15px"},
                $.el.span("\u00a0"),
                submit.render().el
            );


            this.$el.html("");
            this.$el.append(emalField);
            this.$el.append(emErr);
            this.$el.append(pwField);
            this.$el.append(pwErr);
            this.$el.append(pw2Field);
            this.$el.append(pw2Err);
            this.$el.append(button);

            this.validator.bindModel(this.model);
            this.validator.run();
            return this;
        }
    });

});