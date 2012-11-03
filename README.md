**warning: not a working plugin yet, it's in development stage!**

configure model and view:

    var model = new Backbone.Model({
        validator:new Backbone.Validator({
            email:{
                required:true,
                pattern:"email"
            },
            password:{
                range:{
                    min:3,
                    max:14
                }
            }
        }),
    });
    
    var view = new Backbone.View({
        model:model,
        messager:new Backbone.Messager({
            email:{
                as:"email cím",
                require:"Az {0}et közelező megadni.",
                pattern:"Helytelen {0} formátum."
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

classes

    Validator
       schema
           suite: custom-tests
           attribute: test-config
       events
           pass -> attribute, stack
           pass:attribute -> stack
           fail -> attribute, stack
           fail:attribute -> stack
           pending -> attribute, stack
           pending:attribute -> stack
    
    Messager
       rules
           attribute: templates
       events
           pass -> attribute, stack
           pass:attribute -> stack
           fail -> attribute, stack
           fail:attribute -> stack
           pending -> attribute, stack
           pending:attribute -> stack
