# Model/AsyncModel

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


The **Model** uses the normal **Backbone.Model** ***validate*** method, but because the asynchronous validation it always sets the values. The **Model** does not use the **Backbone.Model** ***error*** event, the errors are collected by the **Validator**. By the instantiation of the **Model** class, a **Validator** instance will be created automatically with the given schema. You can reach this instance under the **model.validator** property. You can pass **Backbone.View** instances to that **Validator** object.