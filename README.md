# bb-validation

This plugin is for helping the validation of Backbone models in Backbone applications. For better understanding of the validation configuration you have to check the [Plugin](doc/Plugin.md) and the [Validator](doc/Validator.md) classes in the documentation and the registration.js in the example directory. If you want to create custom views for the test results, you have to check the [Aggregator](doc/Aggregator.md) and [Messenger](doc/Messenger.md) classes in the documentation and the form.js in the example directory. 

## Features

 * Support of client side (browser) and server side (node.js) applications.
 * Validation of model with synchronous and asynchronous tests.
 * Definition of custom plugin with test inheritance.
 * Custom error messages which can be multi language if you use an i18n plugin.
 * Easy to modify to make it work with your specific needs.
 * And much, much more

## Documentation

The main classes in this package are:

 * [Plugin](doc/Plugin.md) - This is the class of the module or loader plugin object. A further role is helping the installation of custom test libraries.
 * [Aggregator](doc/Aggregator.md) - Aggregates the validation result. For example you can create a button which is disabled by invalid form content.
 * [Messenger](doc/Messenger.md) - Sends validation messages to the client.
 * [AsyncModel/Model](doc/AsyncModel.md) - Validates the Model asynchronously. By this solution the errors are not preventing the change of the model.
 * [SyncModel](doc/SyncModel.md) - Validates the Model synchronosly. You can use the default validation interface of the model with synchronous tests only, and validation errors will hinder the change of the model attributes.
 * [Validator](doc/Validator.md) - The Validator is responsible for running the tests by Model instantiation and by every attribute change. 
 * [Runner](doc/Runner.md) - By each attribute there is a configured Runner instance which runs the tests asynchronously in series, and updates the Validator object with the result.
 * [DependencyResolver](doc/DependencyResolver.md) - The tests can be dependent on eachother. The DependencyResolver put the tests in the proper order.

## Requirements

This plugin works only with the libraries contained by the following list.

 * [underscore.js](http://underscorejs.org/)
 * [backbone.js](http://backbonejs.org)

### Usage in node.js

If you intend to use this plugin in node.js you'll need amdefine.

 * [amdefine](https://npmjs.org/package/amdefine)

The node.js tests are working with jasmine.

 * [jasmine-node](https://npmjs.org/package/jasmine-node)

### Usage in browser

If you intend to use this plugin in browser you'll need require.js and jQuery.

 * [require.js](http://requirejs.org/)
 * [jQuery](http://jquery.com/)

The browser examples are working with several libraries. To ease the try out of the examples I attached this libraries in the example/lib directory.

 * [require.js - domReady](https://github.com/requirejs/domReady)
 * [require.js - tpl](https://github.com/ZeeAgency/requirejs-tpl)