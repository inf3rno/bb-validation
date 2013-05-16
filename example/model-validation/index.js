var define = require('amdefine')(module, require);

define(function (require, exports, module) {
    var Backbone = require("backbone");
    require("../../src/backbone-validator");
    require("../../src/backbone-validator-basic-tests");
    require("./example");
});
