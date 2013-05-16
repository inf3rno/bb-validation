require.config({
    baseUrl: "/example",
    paths: {
        backbone: "lib/backbone",
        underscore: "lib/underscore",
        jquery: "lib/jquery-1.8.3.min",
        domReady: "lib/domReady",
        backboneValidator: "../src/backbone-validator",
        backboneValidatorBasicTests: "../src/backbone-validator-basic-tests",
        example: "model-validation/example"
    },
    shim: {
        example: {
            deps: [
                "backboneValidatorBasicTests",
                "domReady!"
            ]
        },
        backboneValidator: {
            deps: ["backbone"]
        },
        backboneValidatorBasicTests: {
            deps: ["backboneValidator"]
        },
        backbone: {
            deps: ["underscore", "jquery"],
            exports: "Backbone"
        },
        underscore: {
            exports: "_"
        }
    }

});