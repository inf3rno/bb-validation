jasmine.createStub = function (cls, methods) {
    if (!(cls instanceof Function))
        throw new TypeError("Invalid class param.");

    var mockClass = function () {
        this.constructor.apply(this, []);
    };

    mockClass.prototype = Object.create(cls.prototype);
    mockClass.prototype.constructor = cls;

    var wrap = function (method) {
        if (!mockClass.prototype[method] instanceof Function)
            throw new TypeError("Cannot mock " + method + " it's not a function.");
        jasmine.getEnv().currentSpec.spyOn(mockClass.prototype, method);
    };

    if (methods) {
        if (!(methods instanceof Array))
            methods = [methods];
        if (methods.length == 1 && methods[0] == "*")
            for (var property in mockClass.prototype) {
                if (mockClass.prototype[property] instanceof Function)
                    wrap(property);
            }
        else
            for (var i = 0; i < methods.length; ++i) {
                var method = methods[i];
                wrap(method);
            }
    }

    return new mockClass();
};