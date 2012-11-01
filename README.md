
/*
* konfigolás:
* new Validator(schema)
* new View({
*     init: function (){
*        this.messager.on("success", function ($input){
*            $input.css({color: "green"});
*        });
 *       this.messager.on("fail", function ($input, message){
 *           $input.css({color: "red"});
 *           $(".message-box",$input).html(message);
 *       });
*     },
*     model: new Model({
*        validator: new Validator({
*             email: {
*                 required: true,
*                 pattern: "email"
*             },
*             password: {
*                 range: {
*                     min: 3,
*                     max: 14
*                 }
*             }
*        }),
*     }),
*     messager: new Messager({
*         keys: {
*             email: "email cím",
*             password: "jelszó"
*         },
*         values: {
*             email: {
*                 require: "Az {0}et közelező megadni.",
*                 pattern: "Helytelen {0} formátum."
*             },
*             password: {
*                 range: {
*                     min: "A {0} hossza legalább {1} karakter kell, hogy legyen.",
*                     max: "A {0} hossza legfeljebb {1} karakter lehet."
*                 }
*             }
*         }
*     })
* })
* */

/*
* kell egy validator, ami végigpörgeti a teszteket
* a tesztek lehetnek akár assert-es, vagy bármilyen más tesztek is
*   az ideális az lenne, ha Error típusú dolgot szórnának vissza, de ezt nem igazán várhatja el az ember
*   a try-catch az nem js-es megoldás, inkább eseménykezelőset csináljunk, az jobban fekszik mindenkinek
*   események:
*   success
*   fail
*   fail:property
*   fail:property type
* kell egy hibaüzenet kezelő, ami a property&type -ot lefordítja message-re, és azt átadja a view-nak
*   ennél jó, ha sablonok vannak
*   sablon lehet akár a property-knél is, de inkább a type-ra jellemző
* kell egy proxy szerűség, ami a szerver oldali fail eseményeket továbbítja
* szerver oldalon bővíthetőnek kell lennie extra aszinkron csekkolással is
* kliens oldalon is bővíthetőnek kell lennie aszinkron csekkolással, ami a szervertől kéri el, hogy sikeres volt e a művelet
* */