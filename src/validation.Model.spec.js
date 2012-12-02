var _ = require("underscore"),
    Backbone = require("backbone"),
    Model = require("./validation").Model;

describe("validation.Model", function () {

    it("extends backbone model", function () {
        expect(Model.prototype instanceof Backbone.Model).toBe(true);
    });
});