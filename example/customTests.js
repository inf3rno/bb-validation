var LoginModel = Backbone.ValidableModel.extend({
    Validator:Backbone.Validator.extend({}).install({
        tests:{
            my:function (done) {
                if (this.value != this.config)
                    done("err");
                else
                    done();
            },
            x:function (done) {
                this.clear();
                this.abort();
                //...
            }
        }
    }),
    validate:{
        email:{
            type:String,
            match:"email"
        },
        password:{
            type:String,
            min:5,
            my:"passsssss"
        }
    }
});

var LoginView = Backbone.View.extend({

});

