var model = new Backbone.Model({
    validator:new Backbone.Validator({
            email:{
                required:true,
                match:"email",
                custom:true
            },
            password:{
                range:{
                    min:3,
                    max:14
                }
            }
        }, new Backbone.Suite({
        custom:function (validator, attr) {
            if (attr)
                validator.pass("custom");
            else
                validator.fail("custom");
        }
    }, {
        custom:/06\d+/g
    })
    )
});

var view = new Backbone.View({
    model:model,
    messager:new Backbone.Messager({
        email:{
            as:"email cím",
            require:"Az {0}et közelező megadni.",
            match:"Helytelen {0} formátum."
        },
        password:{
            as:"jelszó",
            range:{
                min:"A {0} hossza legalább {1} karakter kell, hogy legyen.",
                max:"A {0} hossza legfeljebb {1} karakter lehet."
            }
        }
    }),
    tagName:"div",
    initialize:function () {
        this.messager.on("success", function ($input) {
            $input.css({color:"green"});
        }, this);
        this.messager.on("fail", function ($input, message) {
            $input.css({color:"red"});
            $(".message-box", $input).html(message);
        });
    },
    render:function () {
        var tpl = '<div><input type="text" /><div class="message-box"></div></div>';
        this.$inputs = {
            email:$(tpl),
            password:$(tpl)
        };
        this.$el.append(_.values(this.$inputs));
        this.messager.bind(this.$inputs);
    }
});