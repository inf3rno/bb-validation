var model = new Backbone.ValidableModel({
    schema:{
        email:{
            required:true,
            match:"email"
        },
        password:{
            range:{
                min:3,
                max:14
            }
        }
    }
});

var view = new Backbone.ValidableView({
    model:model,
    messages:{
        email:{
            alias:"email cím",
            require:"Az {alias}et közelező megadni.",
            match:"Helytelen {alias} formátum."
        },
        password:{
            alias:"jelszó",
            range:{
                min:"A {alias} hossza legalább {config.min} karakter kell, hogy legyen.",
                max:"A {alias} hossza legfeljebb {config.max} karakter lehet."
            }
        }
    },
    tagName:"div",
    initialize:function () {
        this.messager.on("validate", function ($input) {
            $input.css({color:"grey"});
        }, this);
        this.messager.on("pass", function ($input) {
            $input.css({color:"green"});
        }, this);
        this.messager.on("error", function ($input, message) {
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