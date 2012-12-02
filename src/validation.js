if (typeof define !== 'function')
    var define = require('amdefine')(module);

define(function (require, exports, module) {
    var _ = require("underscore"),
        Backbone = require("backbone");

    var Model = Backbone.Model.extend({

    });

    module.exports = {
        Model:Model
    };

});