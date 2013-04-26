var amdefine = false;
if (typeof define !== 'function')
    var define = require('amdefine')(module, require),
        amdefine = true;

define(function (require, exports, module) {
    var _ = require("underscore"),
        Backbone = require("backbone");

    if (!Object.create)
        Object.create = function (proto, properties) { //properties object supported in node.js, but not in every browser
            var Surrogate = function () {
                this.constructor = Surrogate;
            };
            Surrogate.prototype = proto;
            var instance = new Surrogate();
            if (properties)
                _.extend(instance, properties);
            return instance;
        };

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

    module.exports = {
        Aggregator: Aggregator,
        Messenger: Messenger
    }

});