var assert = require("assert"),
    Validator = require("../validator");


describe("assert", function () {
    it("equal", function () {
        var validator = new Validator();
        assert.equal(1, 2, "not equals");
    });
});