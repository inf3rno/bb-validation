var _ = require("underscore"),
    Backbone = require("backbone"),
    Validator = require("./backbone-validator");

describe("Validator", function () {
    describe("validate", function () {
        it("should skip other tests by required full pass or failure", function () {
            schemaSet({
                name:{
                    required:true,
                    type:String
                }
            });
            expectResult({
                name:{
                    required:false
                }
            });
        });
        it("should clear stack by required failure", function () {
            schemaSet({
                name:{
                    min:1,
                    required:true
                }
            });
            expectResult({
                name:{
                    required:false
                }
            });
        });
        it("should clear stack by not required and not given", function () {
            schemaSet({
                name:{
                    min:1,
                    required:false
                }
            });
            expectResult({
                name:{
                    required:true
                }
            })
        });
        it("should clear stack by type failure", function () {
            schemaSet({
                name:{
                    min:5,
                    type:String
                }
            });
            valueSet({
                name:3
            });
            expectResult({
                name:{
                    type:false
                }
            });
        });
        it("should pass by valid values", function () {
            schemaSet({
                email:{
                    match:"email",
                    type:String,
                    required:true
                },
                password:{
                    min:3,
                    type:String,
                    required:true
                }
            });
            valueSet({
                email:"test@test.com",
                password:"mypass"
            });
            expectResult({
                email:{
                    match:true,
                    type:true,
                    required:true
                },
                password:{
                    min:true,
                    type:true,
                    required:true
                }
            });
        });
    });

    var validator;
    var model;
    var requireFail = {
        required:false
    };
    var requirePass = {
        required:true
    };
    beforeEach(function () {
        model = new Backbone.Model();
    });

    var schemaSet = function (schema) {
        validator = new Validator.Validator(schema);
    };
    var valueSet = function (values) {
        model.set(values);
    };
    var expectResult = function (expected) {
        expect(validator.validate(model)).toEqual(expected);
    };
})
;