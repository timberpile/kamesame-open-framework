// ==UserScript==
// @name        Wanikani Open Framework - Apiv2 module
// @namespace   rfindley
// @description Apiv2 module for Wanikani Open Framework
// @version     1.0.3
// @copyright   2018+, Robin Findley
// @license     MIT; http://opensource.org/licenses/MIT
// ==/UserScript==

(function(global) {

	//########################################################################
	//------------------------------
	// Published interface.
	//------------------------------
	global.wkof.Apiv2 = {
		clear_cache: clear_cache,
		fetch_endpoint: fetch_endpoint,
		get_endpoint: get_endpoint,
		is_valid_apikey_format: is_valid_apikey_format,
	};
	//########################################################################

	function promise(){var a,b,c=new Promise(function(d,e){a=d;b=e;});c.resolve=a;c.reject=b;return c;}

	var available_endpoints = [
		'assignments','level_progressions','resets','review_statistics',
		'reviews','study_materials','subjects','summary','user'
	];
	var using_apikey_override = false;
	var skip_username_check = false;

	//------------------------------
	// Retrieve the username from the page.
	//------------------------------
	function get_username() {
		try {
			return ($('.account a[href^="/users/"]').attr('href') || '').match(/[^\/]+$/)[0];
		} catch(e) {
			return undefined;
		}
	}

	//------------------------------
	// Check if a string is a valid apikey format.
	//------------------------------
	function is_valid_apikey_format(str) {
		return ((typeof str === 'string') &&
			(str.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/) !== null));
	}

	//------------------------------
	// Clear any datapoint cache not belonging to the current user.
	//------------------------------
	function clear_cache(include_non_user) {
		var clear_promises = [];
		var dir = wkof.file_cache.dir;
		for (var idx in available_endpoints) {
			var filename = 'Apiv2.'+available_endpoints[idx];
			if ((filename === 'Apiv2.subjects' && include_non_user !== true) || !dir[filename]) continue;
			clear_promises.push(filename);
		}
		clear_promises = clear_promises.map(delete_file);

		if (clear_promises.length > 0) {
			console.log('Clearing user cache...');
			return Promise.all(clear_promises);
		} else {
			return Promise.resolve();
		}

		function delete_file(filename){
			return wkof.file_cache.delete(filename);
		}
	}

	wkof.set_state('wkof.Apiv2.key', 'not_ready');

	//------------------------------
	// Get the API key (either from localStorage, or from the Account page).
	//------------------------------
	function get_apikey() {
		// If we already have the apikey, just return it.
		if (is_valid_apikey_format(wkof.Apiv2.key))
			return Promise.resolve(wkof.Apiv2.key);

		// If we don't have the apikey, but override was requested, return error.
		if (using_apikey_override) 
			return Promise.reject('Invalid api2_key_override in localStorage!');

		// Fetch the apikey from the account page.
		console.log('Fetching API key...');
		wkof.set_state('wkof.Apiv2.key', 'fetching');
		return wkof.load_file('https://www.wanikani.com/settings/account')
		.then(parse_page);

		function parse_page(page){
			var page = $(page);
			var apikey = page.find('#user_api_key_v2').val();
			if (!wkof.Apiv2.is_valid_apikey_format(apikey))
				return Promise.reject('No API key (version 2) found on account page!');

			// Store the api key.
			wkof.Apiv2.key = apikey;
			localStorage.setItem('apiv2_key', apikey);
			wkof.set_state('wkof.Apiv2.key', 'ready');
			return apikey;
		};
	}

	//------------------------------
	// Fetch a URL asynchronously, and pass the result as resolved Promise data.
	//------------------------------
	function fetch_endpoint(endpoint, options) {
		var retry_cnt, endpoint_data, url, headers;
		var progress_data = {name:'wk_api_'+endpoint, label:'Wanikani '+endpoint, value:0, max:100};
		var bad_key_cnt = 0;

		// Parse options.
		if (!options) options = {};
		var filters = options.filters;
		if (!filters) filters = {};
		var progress_callback = options.progress_callback;

		// Get timestamp of last fetch from options (if specified)
		var last_update = options.last_update;

		// If no prior fetch... (i.e. no valid last_update)
		if (typeof last_update !== 'string' && !(last_update instanceof Date)) {
			// If updated_after is present, use it.  Otherwise, default to ancient date.
			if (filters.updated_after === undefined)
				last_update = '1999-01-01T01:00:00.000000Z';
			else
				last_update = filters.updated_after;
		}
		// If last_update is a Date object, convert it to ISO string.
		// If it's a string, but not an ISO string, try converting to an ISO string.
		if (last_update instanceof Date)
			last_update = last_update.toISOString().replace(/Z$/,'000Z');
		else if (last_update.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/) === null)
			last_update = new Date(last_update).toISOString().replace(/Z$/,'000Z');

		// Set up URL and headers
		url = "https://www.wanikani.com/api/v2/" + endpoint;

		// Add user-specified data filters to the URL
		filters.updated_after = last_update;
		var arr = [];
		for (var name in filters) {
			var value = filters[name];
			if (Array.isArray(value)) value = value.join(',');
			arr.push(name+'='+value);
		}
		url += '?'+arr.join('&');

		// Get API key and fetch the data.
		var fetch_promise = promise();
		get_apikey()
		.then(setup_and_fetch);

		return fetch_promise;

		//============
		function setup_and_fetch() {
			wkof.Progress.update(progress_data);
			headers = {
			//	'Wanikani-Revision': '20170710', // Placeholder?
				'Authorization': 'Bearer '+wkof.Apiv2.key,
			};
			headers['If-Modified-Since'] = new Date(last_update).toUTCString(last_update);

			retry_cnt = 0;
			fetch();
		}

		//============
		function fetch() {
			retry_cnt++;
			var request = new XMLHttpRequest();
			request.onreadystatechange = received;
			request.open('GET', url, true);
			for (var key in headers)
				request.setRequestHeader(key, headers[key]);
			request.send();
		}

		//============
		function received(event) {
			// ReadyState of 4 means transaction is complete.
			if (this.readyState !== 4) return;

			// Check for rate-limit error.  Delay and retry if necessary.
			if (this.status === 429 && retry_cnt < 40) {
				var delay = Math.min((retry_cnt * 250), 2000);
				setTimeout(fetch, delay);
				return;
			}

			// Check for bad API key.
			if (this.status === 401) return bad_apikey();

			// Check of 'no updates'.
			if (this.status >= 300) {
				if (typeof progress_callback === 'function')
					progress_callback(endpoint, 0, 1, 1);
				progress_data.value = 1;
				progress_data.max = 1;
				wkof.Progress.update(progress_data);
				return fetch_promise.reject({status:this.status, url:url});
			}

			// Process the response data.
			var json = JSON.parse(event.target.response);

			// Data may be a single object, or collection of objects.
			// Collections are paginated, so we may need more fetches.
			if (json.object === 'collection') {
				// It's a multi-page endpoint.
				var first_new, so_far, total;
				if (endpoint_data === undefined) {
					// First page of results.
					first_new = 0;
					so_far = json.data.length;
				} else {
					// Nth page of results.
					first_new = endpoint_data.data.length;
					so_far = first_new + json.data.length;
					json.data = endpoint_data.data.concat(json.data);
				}
				endpoint_data = json;
				total = json.total_count;

				// Call the 'progress' callback.
				if (typeof progress_callback === 'function')
					progress_callback(endpoint, first_new, so_far, total);
				progress_data.value = so_far;
				progress_data.max = total;
				wkof.Progress.update(progress_data);

				// If there are more pages, fetch the next one.
				if (json.pages.next_url !== null) {
					retry_cnt = 0;
					url = json.pages.next_url;
					fetch();
					return;
				}

				// This was the last page.  Return the data.
				fetch_promise.resolve(endpoint_data);

			} else {
				// Single-page result.  Report single-page progress, and return data.
				if (typeof progress_callback === 'function')
					progress_callback(endpoint, 0, 1, 1);
				progress_data.value = 1;
				progress_data.max = 1;
				wkof.Progress.update(progress_data);
				fetch_promise.resolve(json);
			}
		}

		//============
		function bad_apikey(){
			// If we are using an override key, abort and return error.
			if (using_apikey_override) {
				fetch_promise.reject('Wanikani doesn\'t recognize the apiv2_key_override key ("'+wkof.Apiv2.key+'")');
				return;
			}

			// If bad key received too many times, abort and return error.
			bad_key_cnt++;
			if (bad_key_cnt > 1) {
				fetch_promise.reject('Aborting fetch: Bad key reported multiple times!');
				return;
			}

			// We received a bad key.  Report on the console, then try fetching the key (and data) again.
			console.log('Seems we have a bad API key.  Erasing stored info.');
			localStorage.removeItem('apiv2_key');
			wkof.Apiv2.key = undefined;
			get_apikey()
			.then(populate_user_cache)
			.then(setup_and_fetch);
		}
	}


	var min_update_interval = 60;
	var ep_cache = {};

	//------------------------------
	// Get endpoint data from cache with updates from API.
	//------------------------------
	function get_endpoint(ep_name, options) {
		if (!options) options = {};

		// We cache data for 'min_update_interval' seconds.
		// If within that interval, we return the cached data.
		// User can override cache via "options.force_update = true"
		var ep_info = ep_cache[ep_name];
		if (ep_info) {
			// If still awaiting prior fetch return pending promise.
			// Also, not force_update, return non-expired cache (i.e. resolved promise)
			if (options.force_update !== true || ep_info.timer === undefined)
				return ep_info.promise;
			// User is requesting force_update, and we have unexpired cache.
			// Clear the expiration timer since we will re-fetch anyway.
			clearTimeout(ep_info.timer);
		}

		// Create a promise to fetch data.  The resolved promise will also serve as cache.
		var get_promise = promise();
		ep_cache[ep_name] = {promise: get_promise};

		// Make sure the requested endpoint is valid.
		var merged_data;
		if (available_endpoints.indexOf(ep_name) < 0) {
			get_promise.reject(new Error('Invalid endpoint name "'+ep_name+'"'));
			return get_promise;
		}

		// Perform the fetch, and process the data.
		wkof.file_cache.load('Apiv2.'+ep_name)
		.then(fetch, fetch);
		return get_promise;

		//============
		function fetch(cache_data) {
			if (typeof cache_data === 'string') cache_data = {last_update:null};
			merged_data = cache_data;
			var fetch_options = Object.assign({}, options);
			fetch_options.last_update = cache_data.last_update;
			fetch_endpoint(ep_name, fetch_options)
			.then(process_api_data, handle_error);
		}

		//============
		function process_api_data(fetched_data) {
			// Mark the data with the last_update timestamp reported by the server.
			if (fetched_data.data_updated_at !== null) merged_data.last_update = fetched_data.data_updated_at;

			// Process data according to whether it is paginated or not.
			if (fetched_data.object === 'collection') {
				if (merged_data.data === undefined) merged_data.data = {};
				for (var idx = 0; idx < fetched_data.data.length; idx++) {
					var item = fetched_data.data[idx];
					merged_data.data[item.id] = item;
				}
			} else {
				merged_data.data = fetched_data.data;
			}

			// If it's the 'user' endpoint, we insert the apikey before caching.
			if (ep_name === 'user') merged_data.data.apikey = wkof.Apiv2.key;

			// Save data to cache and finish up.
			wkof.file_cache.save('Apiv2.'+ep_name, merged_data)
			.then(finish);
		}

		//============
		function finish() {
			// Return the data, then set up a cache expiration timer.
			get_promise.resolve(merged_data.data);
			ep_cache[ep_name].timer = setTimeout(expire_cache, min_update_interval*1000);
		}

		//============
		function expire_cache() {
			// Delete the data from cache.
			delete ep_cache[ep_name];
		}

		//============
		function handle_error(error) {
			if (typeof error === 'string')
				get_promise.reject(error);
			if (error.status >= 300 && error.status <= 399)
				finish();
			else
				get_promise.reject('Error '+error.status+' fetching "'+error.url+'"');
		}
	}

	//########################################################################
	//------------------------------
	// Make sure user cache matches the current (or override) user.
	//------------------------------
	function validate_user_cache() {
		var user = get_username();
		if (!user) {
			// Username unavailable if not logged in, or if on Lessons or Reviews pages.
			// If not logged in, stop running the framework.
			if (location.pathname.match(/^(\/|\/login)$/) !== null)
				return Promise.reject('Couldn\'t extract username from user menu!  Not logged in?');
			skip_username_check = true;
		}

		var apikey = localStorage.getItem('apiv2_key_override');
		if (apikey !== null) {
			// It looks like we're trying to override the apikey (e.g. for debug)
			using_apikey_override = true;
			if (!is_valid_apikey_format(apikey)) {
				return Promise.reject('Invalid api2_key_override in localStorage!');
			}
			console.log('Using apiv2_key_override key ('+apikey+')');
		} else {
			// Use regular apikey (versus override apikey)
			apikey = localStorage.getItem('apiv2_key');
			if (!is_valid_apikey_format(apikey)) apikey = undefined;
		}

		wkof.Apiv2.key = apikey;

		// Make sure cache is still valid
		return wkof.file_cache.load('Apiv2.user')
		.then(process_user_info)
		.catch(retry);

		//============
		function process_user_info(user_info) {
			// If cache matches, we're done.
			if (user_info.data.apikey === wkof.Apiv2.key) {
				// We don't check username when using override key.
				if (using_apikey_override || skip_username_check || (user_info.data.username === user)) {
					wkof.Apiv2.user = user_info.data.username;
					wkof.user = user_info.data;
					return;
				}
			}
			// Cache doesn't match.
			if (!using_apikey_override) {
				// Fetch the key from the accounts page.
				wkof.Apiv2.key = undefined;
				throw 'fetch key';
			} else {
				// We're using override.  No need to fetch key, just populate cache.
				return clear_cache().then(populate_user_cache);
			}
		}

		//============
		function retry() {
			// Either empty cache, or user mismatch.  Fetch key, then populate cache.
			return get_apikey().then(clear_cache).then(populate_user_cache);
		}
	}

	//------------------------------
	// Populate the user info into cache.
	//------------------------------
	function populate_user_cache() {
		console.log('Fetching user info...');
		return fetch_endpoint('user')
		.then(function(user_info){
			// Store the apikey in the cache.
			user_info.data.apikey = wkof.Apiv2.key;
			wkof.Apiv2.user = user_info.data.username;
			wkof.user = user_info.data
			console.log('Caching user info...');
			return wkof.file_cache.save('Apiv2.user', user_info);
		});
	}

	//------------------------------
	// Do initialization once document is loaded.
	//------------------------------
	function notify_ready() {
		// Notify listeners that we are ready.
		// Delay guarantees include() callbacks are called before ready() callbacks.
		setTimeout(function(){wkof.set_state('wkof.Apiv2', 'ready');},0);
	}

	//------------------------------
	// Do initialization once document is loaded.
	//------------------------------
	wkof.include('Progress');
	wkof.ready('document,Progress').then(startup);
	function startup() {
		validate_user_cache()
		.then(notify_ready);
	}

})(window);

