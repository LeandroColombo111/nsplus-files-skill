// -----------------------
// Enumeration CLASS (verbatim from NS+ tool, nsplusowner.github.io)
// -----------------------
function Enumeration() {
    var _self = this;
    var _keys = [];
    var _values = {};

    function initialize(values) {
        function add(items){
            for (var i=0; i < items.length; i++) {
                addEnumValue(items[i], i);
            }
        }
        if (typeof values[0] == 'string') {
            add(values);
        } else if (values[0] instanceof Array) {
            add(values[0]);
        } else {
            var jsonDef = values[0];
            for (var key in jsonDef) {
                addEnumValue(key, jsonDef[key]);
            }
            jsonDef = null;
        }
    }
    function addEnumValue(key, value) {
        _keys.push(key);
        if (_self[key] == undefined) {
            _values[key] = value;
            Object.defineProperty(_self, key, { 'enumerable': true, 'configurable': false, 'get': function () { return _values[key]; } });
        }
    }
    function hasValue(value) {
        return Object.values(_self).indexOf(value) != -1;
    }
    function getKey(value) {
        return _keys[value];
    }
    if (arguments && arguments.length > 0) initialize(arguments);
    else throw new Error('Cannot define new enum without arguments');

    Object.defineProperty(_self, 'hasValue', { 'enumerable': false, 'configurable': false, 'writable': false, 'value': hasValue });
    Object.defineProperty(_self, 'getKey', { 'enumerable': false, 'configurable': false, 'writable': false, 'value': getKey });
    return (Object.freeze) ? Object.freeze(_self) : _self;
}
