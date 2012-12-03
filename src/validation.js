if (typeof define !== 'function')
    var define = require('amdefine')(module);

define(function (require, exports, module) {
    var _ = require("underscore"),
        Backbone = require("backbone");

    var Validator = Backbone.Model.extend({
        checks:{},
        tests:{},
        patterns:{}
    });
    Validator.extend = function (protoProps, staticProps) {
        var child = Backbone.Model.extend.apply(this, arguments);
        child.prototype.checks = Object.create(child.prototype.checks, {});
        child.prototype.tests = Object.create(child.prototype.tests, {});
        child.prototype.patterns = Object.create(child.prototype.patterns, {});
        return child;
    };
    Validator.install = function (o) {
        if (!o)
            return this;
        _.extend(this.prototype.checks, o.checks);
        _.extend(this.prototype.tests, o.tests);
        _.extend(this.prototype.patterns, o.patterns);
        return this;
    };

    var Model = Backbone.Model.extend({
    });

    module.exports = {
        Model:Model,
        Validator:Validator
    };

});