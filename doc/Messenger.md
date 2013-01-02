# Messenger

The Messenger is a Validator View, so it extends Backbone.View, and it's Model is the Validator itself.
It's an abstract class, you can extend the display method, which gets attribute name, an array of error messages and a boolean which is true if the tests are pending.
By the default Runner you can have only one error message with pending false, or no error messages with pending true if tests are pending. The display method is called by unrender too, so by any change of the Validator the display is called with an attribute param, and after that shortly with and attribute param, error messages and pending flag.

The current state there are no default messages or message templates, so you have to write your custom test messages by every Validator. For example:

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
        display:function (attribute, chunks, pending) {
            var $input = this.options.$inputs[attribute];
            var message = "";
            if (chunks)
                message = chunks.join("<br/>");
            else if (pending)
                message = "pending ... ";
            $input.next().html(message);
        }
    });

You have to put your messages to the messages object which is multiple level deep. The first key in that object must be the attribute name in the model, the second key must be the name of the test, and if you have a third key, it must be the error message sent by the test, for example by range it can be "min" or "max".