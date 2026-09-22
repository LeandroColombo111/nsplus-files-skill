// DataConversor (verbatim from NS+ tool, nsplusowner.github.io) — the .nsplus compression/encoding logic
var DataConversor = new function () {
	var _ref = this;

	function fromJS(data, reversed) {
		var output = utf8_to_b64(JSON.stringify(data || {}));
		return (reversed) ? output.split("").reverse().join("") : output;
	}
	function toJS(str, reversed) {
		var output = null;
		try {
			output = JSON.parse(b64_to_utf8((reversed) ? str.split("").reverse().join("") : str));
		} catch (e) {
			console.log(e.message);
		}
		return output;
	}
	function utf8_to_b64(str) {
		return btoa(unescape(encodeURIComponent(str)));
	}
	function b64_to_utf8(str) {
		return decodeURIComponent(escape(atob(str)));
	}
	function getDateCode(x) {
		if (!(x && x instanceof Date)) x = new Date(1);
		return utf8_to_b64(x);
	}
	function toDate(d) {
		return (!d) ? null : new Date(b64_to_utf8(d));
	}
	Object.defineProperty(_ref, 'fromJS', { "configurable": false, "writable": false, "value": fromJS });
	Object.defineProperty(_ref, 'toJS', { "configurable": false, "writable": false, "value": toJS });
	Object.defineProperty(_ref, 'getDateCode', { "configurable": false, "writable": false, "value": getDateCode });
	Object.defineProperty(_ref, 'toDate', { "configurable": false, "writable": false, "value": toDate });
	return _ref;
}
