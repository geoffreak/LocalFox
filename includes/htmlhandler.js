// includes/htmlhandler.js
// Helper system to access information from web pages
// LocalFox v4 © Joshua "geoffreak" DeVinney 2011

// Includes
var http = require('http-get'),
	terminal = require('./terminal'),
	functions = require('./functions');

/* 
** Function htmlhandler 
** Scrapes a page with regular expressions and returns formatted results.
** @params
**		url: 	string of the page to access as a string
**		regex:	a key-value map of keys to regex to perform on the result and return under the given key each of
**					the values will either be a RegExp object (typeof -> 'object' or 'function') or a string
**					(typeof -> 'string') with a regular expression inside to specify that multiple results are 
**					desired
**		cb: 	the callback to be used when complete
**		def:	an optional value to set values to when they are unable to be found
** @callback
**		an error object or false
**		an object containing the property html (string html of the page) and all properties as defined by regex
*/
function htmlhandler(url, regex, cb, def) {
	def = def || ''; //def's def value can be set here, replacing the quotes
	var options = {url: url};
	functions.httpGet(options, function processResults(err, result) {
		if (err) {
			cb(err);
			return;
		}
		var html = result.buffer.toString('utf8');
		var results = {
			html: html
		}
		if (regex) {
			for (var key in regex) {
				var rexp = regex[key].rexp;
				switch (typeof rexp) {
					case 'function': //regular expressions are functions in node 0.4.x
					case 'object': //rexp is a regular expression
						var result = html.match(rexp);
						if (regex[key].results == null) {
							if (result) delete result.input;
							results[key] = result || def;
						}
						else {
							switch (typeof regex[key].results) {
								case 'number': //single result desired, return directly (if results found)
									var val = regex[key].results;
									if (result == null)
										results[key] = def;
									else
										results[key] = result[val] != null ? result[val] : def;
									break;
								case 'object': //multiple results desired, return object
									results[key] = {};
									// assign the resulting keys to the named indexes (if results found)
									for (var val in regex[key].results) {
										var index = regex[key].results[val];
										if (result == null)
											results[key][index] = def;
										else
											results[key][index] = result[val] != null ? result[val] : def;
									}
									break;
							}
						}
						break;
					case 'string': //rexp is regex string
						results[key] = [];
						var arr = html.match(new RegExp(rexp, 'gi')) || []; //if no results (null), give empty array
						rexp = new RegExp(rexp, 'i') //change the regex to work for the single items
						for (var i = 0; i < arr.length; i++) {
							var result = arr[i].match(rexp);
							if (regex[key].results == null) {
								if (result) delete result.input;
								results[key][i] = result;
							}
							else {
								switch (typeof regex[key].results) {
									case 'number': //single result desired, return directly (if results found)
										var val = regex[key].results;
										if (result == null)
											results[key][i] = def;
										else
											results[key][i] = result[val] != null ? result[val] : def;
										break;
									case 'object': //multiple results desired, return object
										results[key][i] = {};
										// assign the resulting keys to the named indexes (if results found)
										for (var val in regex[key].results) {
											var index = regex[key].results[val];
											if (result == null)
												results[key][i][index] = def;
											else
												results[key][i][index] = result[val] != null ? result[val] : def;
										}
										break;
								}
							}
						}
						break;
				}
			}
		}
		cb(false, results);
	});
}
module.exports = htmlhandler;