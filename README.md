# Backbone.Validator

This plugin is for helping the validation of Backbone models in Backbone applications.

## Features

 * Support of client side (browser) and server side (node.js) applications.
 * Validation of model with synchronous and asynchronous tests.
 * Definition of custom Test classes.
 * Form generation - this part is alpha version yet.
 * Custom error messages which can be multi language if you use an i18n plugin.

## Documentation

***I promise, I will create separated repo for each of these packages and detailed documentation when days will be 48h long... :S***

 * [Backbone.Validator](https://github.com/inf3rno/bb-validation/blob/master/src/backbone-validator.js) - **stable**, code coverage about 90% - validator, parallel and series runners, abstract test - I will create multiple validator classes probably later, this one is for real time input validation, not the best choice for bash validation
 * [Backbone.Validator Test classes](https://github.com/inf3rno/bb-validation/blob/master/src/backbone-validator-basic-tests.js) - **stable**, 100% code coverage - basic tests: required, type, min, max, range, identical, equal, member, match, duplicate
 * [jasmine.stub](https://github.com/inf3rno/bb-validation/blob/master/test/jasmine-stub.js) - **beta** version yet - it is for easier testing - no self tests yet, it works only with jasmine-node, never tried out with jasmine in browser
 * [Backbone.UI.Form](https://github.com/inf3rno/bb-validation/blob/master/src/backbone-ui-form.js) - **alpha** version yet, it's a bit dummy, I created it for the example - it generates a form with error messages and auto disabling submit button - I develop it right now

Model validation example code (runs in nodejs):

    var validator = new Backbone.Validator({
        model: model,
        schema: {
            email: {
                required: true,
                type: String,
                match: "email",
                max: 127,
                registered: 1
            },
            password: {
                required: true,
                type: String,
                range: {
                    min: 5,
                    max: 14
                }
            },
            password2: {
                duplicate: "password"
            }
        }
    });
    validator.on("change", function () {
        console.log("pending", validator.pending, "errors", validator.errors, validator.attributes);
    });
    validator.test.on("end", function () {
        console.log("all running test ended");
    });
    validator.run();

Form generation example code (runs in browser):

	new Backbone.UI.Form({
		model: new Backbone.Model(attributes),
		fields: {
			email: {
				type: Backbone.UI.TextField,
				label: "Email",
				schema: {
					required: true,
					type: String,
					match: "email",
					max: 127,
					registered: 1000
				},
				messages: {
					required: "The email address is not given.",
					type: "Email address must be string.",
					match: "Not an email address.",
					max: "The given email address is too long.",
					registered: "The email address is already registered."
				}
			},
			password: {
				type: Backbone.UI.TextField,
				options: {
					type: "password"
				},
				label: "Password",
				schema: {
					required: true,
					type: String,
					range: {
						min: 5,
						max: 14
					}
				},
				messages: {
					required: "The password is not given.",
					type: "The password must be string.",
					range: {
						min: "The password is too short.",
						max: "The password is too long."
					}
				}
			},
			password2: {
				type: Backbone.UI.TextField,
				options: {
					type: "password"
				},
				label: "Confirm Password",
				schema: {
					duplicate: "password"
				},
				messages: {
					duplicate: "The verifier password does not equal to the password."
				}
			}
		},
		buttons: {
			submit: {
				type: Backbone.UI.Button,
				label: "Register"
			}
		}
	});

 * The **Backbone.Validator** is a **Backbone.Model** extension. It uses the schema part of the **Backbone.UI.Form** config to validate the model, and stores the results in its attributes: false means no error, undefined means pending, true means error, {subType: true} means error with subtype.
 * The **Backbone.UI.Messenger** is a **Backbone.View** extension. It displays error messages, and uses the **Backbone.Validator** and the messages part of the **Backbone.UI.Form** config for that.
 * The **Backbone.UI.Form** creates a **Backbone.Validator** instance, and multiple **Backbone.UI** fields, buttons and messengers, so it generates a complete form. Now you have to set the field and button classes manually, but later I'll create auto detection for that.

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

If you intend to use this plugin in browser you'll need require.js.

 * [require.js](http://requirejs.org/)

The browser examples are working with several libraries. To ease the try out of the examples I attached this libraries in the example/lib directory.

 * [jQuery](http://jquery.com/)
 * [require.js - domReady](https://github.com/requirejs/domReady)
 * [require.js - tpl](https://github.com/ZeeAgency/requirejs-tpl)
 * laconic, moment.js, backbone.UI, etc...