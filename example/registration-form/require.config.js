require.config({
    baseUrl: "/example",
    paths: {
        backbone: "lib/backbone",
        underscore: "lib/underscore",
        jquery: "lib/jquery-1.8.3.min",
        domReady: "lib/domReady",
        css: "lib/css",
        laconic: "lib/laconic",
        moment: "lib/moment.min",
        backboneUI: "lib/backbone-ui",
        backboneValidator: "../src/backbone-validator",
        backboneValidatorBasicTests: "../src/backbone-validator-basic-tests",
        backboneUIForm: "../src/backbone-ui-form",
        registration: "registration-form/registration"
    },
    shim: {
        registration: {
            deps: [
                "backboneUIForm",
                "domReady!"
            ]
        },
        backboneValidator: {
            deps: ["backbone"]
        },
        backboneValidatorBasicTests: {
            deps: ["backboneValidator"]
        },
        backboneUIForm: {
            deps: ["backboneUI", "backboneValidator", "backboneValidatorBasicTests"]
        },
        backboneUI: {
            deps: ["backbone", "laconic", "moment", "css!lib/backbone-ui.css"],
            exports: "Backbone.UI"
        },
        laconic: {
            deps: ["jquery"],
            exports: "$.el"
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