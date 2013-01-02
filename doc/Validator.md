# Validator

The **Validator** is an extension of **Backbone.Model**. It runs the tests on the attributes by any change of the validable **Model** which instantiated it. The Validator instantiation is done by the Model constructor. By the instantiation the Validator gets the schema property of the Model, it runs the checks on the schema params and creates test Runners with those tests in the proper dependency order. The test order is determined by the DependencyResolver. 

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

By this schema the Validator creates 3 test Runner: one for each field (email, password, password2). The match, max, range tests depend on the type test, the duplicate, type tests depend on the required test. So the required test will be called first by every time. If no error occures by that test, or it does not call abort, then the type or duplicate test comes. If they pass, then come the other tests.

The **Validator** attributes are the results of the tests. If there is no error by a validable **Model** attribute, the result is ***false***. In case of any error, the result is an object with the name of the failed test, and the code of the error, for example:

    {type:true}
or

    {range:"min"}


Normally a test has only two possible outputs: the error is **true** or **false**. In extreme cases there are more possible outputs, for example by a range test the error can be **false**, **"min"** and **"max"**. This is important if you want to display an error specific message. For example by **"min"**: **"Too short."**, by **"max"**: **"Too long."**. Btw. you can still use min and max tests instead of a range test.

The Validator gets the schema you gave by the extension of you Model class. I calls the checks on the config params by the instantiation. After that, the tests will be called automatically on every Model attribute. By Model change the tests are called on the changed attribute and the bounded attributes of the changed attributes only. You can give the bounded attributes by the check section with the call of **Validator.prototype.related**, for example by a password verifier input field:

        duplicate:function (duplicateOf, key, attribute) {
            if (typeof(duplicate) != "string")
                throw  new Error("Invalid config. " + key + ": invalid attribute name given.");
            this.related(duplicateOf, attribute);
            //if the model.attributes[duplicateOf] changes, tests of model.attributes[attribute] will run too
            return duplicateOf;
        }

The tests are called in the scope of the Runner which runs them. For example:

        duplicate:["required", function (done) {
            done(this.attributes[this.config] != this.value);
        }]

The "required" is the dependency of the test. The **this.attributes** are the **model.attributes** merged with the changes. The **this.config** is the output of the **validator.check** call with the config. By the schema in the first example it's "password". The **this.value** is the new value of the attribute, it can be reached by **this.attributes.password2** too. So this test compares the "password" and "password2" attributes, and if they are not the same it returns error.