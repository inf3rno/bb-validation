# Aggregator

The Aggregator is a Validator View, so it extends Backbone.View, and it's Model is the Validator itself.
It's an abstract class, you can extend the display method, which gets error and pending counts by every change of the Validator.

The Aggregator can summarize the result of the tests, for example:

    var SubmitButtonDisabler = validation.Aggregator.extend({
        display:function (errors, pending) {
            if (errors || pending)
                this.options.$submit.attr("disabled", "disabled");
            else
                this.options.$submit.removeAttr("disabled");
        }
    });