(function () {

    if (!jasmine)
        throw new Error("Jasmine not loaded yet.");

    var wrap = function (proto, method, options) {
        if (!proto[method] instanceof Function)
            throw new TypeError("Cannot mock " + method + " it's not a function.");
        jasmine.getEnv().currentSpec.spyOn(proto, method);
        var spy = proto[method];
        if (options) {
            if (options.callThrough)
                spy.andCallThrough();
            else if (options.callFake)
                spy.andCallFake(options.callFake);
        }
        return spy;
    };

    jasmine.createStub = function (cls, methods) {
        if (!(cls instanceof Function))
            throw new TypeError("Invalid class param.");
        if (!methods)
            throw new TypeError("Invalid stub config.");

        var args = [];
        if (methods && (methods.constructor instanceof Array))
            args = methods.constructor;
        var mockClass = function () {
            this.constructor.apply(this, args);
        };
        mockClass.prototype = Object.create(cls.prototype);
        mockClass.prototype.constructor = cls;

        if (methods == "*")
            for (var property in mockClass.prototype) {
                if (mockClass.prototype[property] instanceof Function)
                    wrap(mockClass.prototype, property, {
                        callThrough: false,
                        callFake: false
                    });
            }
        else if (methods instanceof Array)
            for (var i = 0; i < methods.length; ++i) {
                var method = methods[i];
                wrap(mockClass.prototype, method, {
                    callThrough: false,
                    callFake: false
                });
            }
        else if (methods instanceof Object) {
            for (var property in methods) {
                if (!methods.hasOwnProperty(property))
                    continue;
                var options = methods[property];
                if (options instanceof Function)
                    options = {
                        callThrough: false,
                        callFake: options
                    };
                else if (options === false || options === undefined || options === null)
                    options = {
                        callThrough: false,
                        callFake: false
                    };
                else
                    options = {
                        callThrough: true,
                        callFake: false
                    };
                wrap(mockClass.prototype, property, options);
            }
        }

        return new mockClass();
    };
})();
