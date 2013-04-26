# SyncModel

The SyncModel is similar to the AsyncModel, but it can call only synchronous tests, it prevents the attribute overriding if a validation error occures. By validation errors it triggers the "error" event with a complete error object. It is not recommended to use this kind of model. In a normal form, or post data validating situation you won't need it, but if you have a special problem it suites for, you may use it.