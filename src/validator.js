var _ = require("underscore")._,
    Backbone = require("backbone");

Backbone.Validator = function (schema) {
    this.schema = schema || {};
};
Backbone.Validator.prototype = {

};