**Backbone validation plugin 
version 1.0.**

This is a plugin for Backbone validation, which works both in browsers and node.js applications. The main classes in this package are: **Model**, **Validator**, **Messenger** and **Aggregator**.

**1.) Installation, custom test libraries**

Before anything else you have to define your custom tester functions. I created a ***basic test collection***. You can install it the following way with **require.js** :

    require(["jquery", "underscore", "backbone", "domReady!", "../src/validation", "../src/basicTests"], function ($, _, Backbone, domReady, validation, basics) {
        validation.Validator.customize(basics);
        ...
    });

Or you can extend the **Validator** class if you want to create a custom branch of tests. In that case you can create a custom **Model** class which uses your custom **Validator** class.

    var MyValidator = validation.Validator.extend({}).customize(myTests);
    var MyModel = validation.Model.extend({
        Validator: MyValidator
    });

The custom test packages can contains **tests**, **checks** and **patterns**.

The **tests** are checking the setted value by the actual attribute, and their scope is the test runner of the attribute. The runner has properties: attributes (the attributes which the model.validate has been called with), config (the config of the current test in the schema), value (the new value by the attribute), pending (used external by validator, need for pending count), name (the name of the current test).

The **checks** are called by configuring the tests, so by creating the validator with the actual **schema**, and their scope is the validator itself. They can call the **related** method of the validator, and can add relations, for example by password verifying you have to call

    this.depend("password", "password2");

or

    this.depend("password", ["password2"]);
This results the call of the password2 test runner by changing the password.
The validator contains the installed **patterns** too. So you can reach the installed patterns by name.


If you want to create your custom test library, then please study the basic tests first.


**2.) Model and Validator**

If you want to create a validable **Model** class, you can do it very simply, for example:

    var RegistrationModel = validation.Model.extend({
        schema:{
            email:{
                required:true,
                type:String,
                match:"email",
                max:127
            },
            password:{
                required:true,
                type:String,
                range:{
                    min:5,
                    max:14
                }
            },
            password2:{
                duplicate:"password"
            }
        }
    });


The **Model** uses the normal **Backbone.Model** ***validate*** method, but because the asynchronous validation it always sets the values. The **Model** does not use the **Backbone.Model** ***error*** event, the errors are collected by the **Validator**. By the instantiation of the **Model** class, a **Validator** instance will be created automatically with the given schema. You can reach this instance under the **model.validator** property. The **Validator** is an extension of **Backbone.Model**. It runs the tests on the attributes by any change of the **Model**, and the **Validator** attributes are the results of those tests. If there is no error by a **Model** attribute, the result is ***false***. In case of any error, the result is an object with the name of the failed test, and the code of the error, for example:

    {type:true}
or

    {range:"min"}


Normally a test has only two possible outputs: the error is **true** or **false**. In extreme cases there are more possible outputs, for example by a range test the error can be **false**, **"min"** and **"max"**. This is important if you want to display an error specific message. For example by **"min"**: **"Too short."**, by **"max"**: **"Too long."**. Btw. you can still use min and max tests instead of a range test.

**3.) Validator views: Messenger and Aggregator**

As I mentioned before; the **Validator** is a **Backbone.Model** extension also, and because of that, you can pass **Backbone.View**s to it. I created two classes of this kind: **Messenger** and **Aggregator**.

The **Messenger** can give detailed international error messages.

        var InputErrors = validation.Messenger.extend({
            messages:{
                email:{
                    required:"The email address is not given.",
                    type:"Email address must be string",
                    match:"Not an email address",
                    max:"The given email address is too long."
                },
                password:{
                    required:"The password is not given",
                    type:"The password must be string",
                    range:{
                        min:"The password is too short.",
                        max:"The password is too long."
                    }
                },
                password2:{
                    duplicate:"The verifier password does not equal with the password."
                }
            },
            display:function (attribute, chunks) {
                var $input = this.options.$inputs[attribute];
                var message = "";
                if (chunks)
                    message = chunks.join("<br/>");
                $input.next().html(message);
            }
        });

By any change of the **Validator**, the ***display*** method of the **Messenger** is called twice. By the first time it is called by the unRender without chunks, by the second time it is called by the render with message chunks depending on errors. The **Messenger** is prepared to multiple error messages per attribute handling, despite the fact, that this feature is not supported in my asynchronous test runners. My runners are running the tests in sequence, and they abort by every error. If you need, you can write a custom test runner, which supports multiple errors by attribute.

The **Aggregator** can summarize the result of the tests, for example there are no errors, so you can send the form, etc...

        var SubmitButtonDisabler = validation.Aggregator.extend({
            display:function (errors) {
                if (errors)
                    this.options.$submit.attr("disabled", "disabled");
                else
                    this.options.$submit.removeAttr("disabled");
            }
        });

If something is not clear, please check the example folder first, and after that you can still write an issue! Good work! :-)