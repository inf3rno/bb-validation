require.config({
    paths:{
        backbone:"../lib/backbone",
        underscore:"../lib/underscore-min",
        jquery:"../lib/jquery-1.8.3.min",
        domReady:"../lib/domReady",
        tpl:"../lib/tpl"
    },
    shim:{
        backbone:{
            deps:["underscore", "jquery"],
            exports:"Backbone"
        },
        underscore:{
            exports:"_"
        }
    }
});