// ==UserScript==
// @name        KameSame Open Framework - Jquery module
// @namespace   timberpile
// @description Progress module for KameSame Open Framework
// @version     0.1
// @copyright   2022+, Robin Findley, Timberpile
// @license     MIT; http://opensource.org/licenses/MIT
// ==/UserScript==

(function(global) {

	//########################################################################
	//------------------------------
	// Published interface
	//------------------------------
	global.ksof.Jquery = {
		version: version,
	};
	//########################################################################

	var version;

	ksof.ready('document')
	.then(function(){
		var promises = [];
		try {
			$.fn.jquery;
		} catch(e) {
			promises.push(ksof.load_script(ksof.support_files['jquery.js'], true /* cache */));
		}
		return Promise.all(promises);
	})
	.then(function(data){
		version = $.fn.jquery;
		// Notify listeners that we are ready.
		// Delay guarantees include() callbacks are called before ready() callbacks.
		setTimeout(function(){ksof.set_state('ksof.Jquery', 'ready');},0);
	});

})(window);
