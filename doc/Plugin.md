# Plugin

By requiring the validation package you will get a Plugin instance. This instance is empty until you add one or more test libraries to it.
You can add test libraries with the add method, or with the extend method. The add method adds the test to the current Plugin instance, the extend method creates a new Plugin instance, and adds the tests to that.

If you would like to install a test library globally, it is recommended to use the add method, for example:

    var validation = require("./validation");
        validation.add(require("./testLibrary"));

or

    var validation = require("./validation");
        validation.add({
            checks: {
                custom: function (config, name){
                    if (!config)
                        return this.patterns.word;
                        //if no config given, returns the default pattern
                    if (!(config instanceof RegExp))
                        throw new SyntaxError("The given config is not valid by test: " + name);
                        //if invalid config, throws exception
                    return config;
                    //if config is okay, returns that
                }
            },
            tests: {
                custom: ["my, "dependency", "list", function (done){
                     if (this.config.test(this.value))
                        done();
                     else
                        done("not.equal"));
                }]
            },
            patterns: {
                word: /\w+/
            }
        });

The checks, tests and patterns attributes are "extendable". So if you set them multiple times with the add method, you will get an intersection of the param objects by each attribute, not the param object you gave last time. For example:

        validation.add({
            patterns: {
                word: /\w+/
            }
        });
        validation.add({
            patterns: {
                digit: /\d+/
            }
        });

will result in **validation.Validator.prototype.patterns** :

        {
            word: /\w+/,
            digit: /\d+/
        }

The method extend behaves a little different way. If you call that, it extends the Plugin, Validator and Model classes, and returns the extended Plugin instance. So the original Plugin instance won't change... This is useful if you have a specific test you want use locally. For example a dummy email check:

        var validation = require("../src/validation");
        var extendedValidation = validation.extend({
            checks:{
                registered:function (delay, key) {
                    return delay || 1;
                }
            },
            tests:{
                registered:function (done) {
                    var registeredEmails = {
                        "test@test.com":true,
                        "test@test.hu":true
                    };
                    setTimeout(function () {
                        done(registeredEmails[this.value]);
                    }.bind(this), this.config);
                }
            }
        });

By this example the **validation** and the **extendedValidation** are not the same objects. Only the **extendedValidation** contains the test called **registered**.

You can use the Plugin as requireJS loader plugin. The resource name must be the path of your test libraries, and the result will be an extended Plugin instance. For example:

    var extendedValidation = require("../src/validation!../src/basicTests:../custom/myTests");

The resource name is stored by require.js, so you will get the same object by every require call with that resource order. Because of that it's recommended to use the extend method and not the add method if you want to add form specific local tests.