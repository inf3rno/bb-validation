var model = new Backbone.Model({
    validator:new Backbone.Validator({
        suite:{
            patterns:{
                custom:/06\d+/g
            },
            custom:function (validator, attr) {
                if (attr)
                    validator.pass();
                else
                    validator.fail();
            }
        },
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
    })
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