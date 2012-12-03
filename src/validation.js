if (typeof define !== 'function')
    var define = require('amdefine')(module);

define(function (require, exports, module) {
    var _ = require("underscore"),
        Backbone = require("backbone");

    var inherit = Object.create || function (proto) {
        var C = function () {
            this.constructor = C;
        };
        C.prototype = proto;
        return new C();
    };

    var Validator = Backbone.Model.extend({
        checks:{},
        tests:{},
        patterns:{}
    }, {
        install:function (pack) {
            if (!pack)
                throw new Error("No install package given.");
            var installable = {checks:true, tests:true, patterns:true};
            _.each(pack, function (addons, property) {
                if (!installable[property])
                    throw new Error("Property " + property + " is not installable.");
                if (this.__super__ && this.prototype[property] === this.__super__[property]) {
                    this.prototype[property] = inherit(this.__super__[property]);
                }
                _.extend(this.prototype[property], addons);
            }, this);
            return this;
        }
    });

    var Model = Backbone.Model.extend({
        Validator:Validator,
        constructor:function () {
            Backbone.Model.apply(this, arguments);
            this.validator = new this.Validator();
        }
    });

    module.exports = {
        Model:Model,
        Validator:Validator
    };

});