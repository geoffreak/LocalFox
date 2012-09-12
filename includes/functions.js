// includes/functions.js
// Holds common functions 
// LocalFox v4 © Joshua "geoffreak" DeVinney 2011

// Includes
var http = require('http-get'),
	terminal = require('./terminal');

// Variables
var delay = 100000; //wait this many miliseconds for timeouts and after retry-able errors

exports.downloadPath = __dirname + '/../public/images/manga';

// trim excess whitespace from ends of string
exports.trim = function trim(str) {
	var	str = str.replace(/^\s\s*/, ''),
		ws = /\s/,
		i = str.length;
	while (ws.test(str.charAt(--i)));
	return str.slice(0, i + 1);
}

exports.parseFloatIfPossible = function(val) {
	return (parseFloat(val) || parseFloat(val) === 0) ? parseFloat(val) : val;
} 

/* 
** Function: httpGet
** wrapper for the http-get library that adds error handling, timeouts, and retries
** @params
**		options:	an object with the attributes needed for the http-get libary plus an optional file attribute to
						be added when a file is to be downloaded
**		cb:		the callback function to return the results
** @callback cb
**		an error message or false (only when a retry isn't possible)
**		an object containing the results to the call to http-get
** @callback cCb
*/
exports.httpGet = function(options, cb){
    options.headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.7; rv:13.0) Gecko/20100101 Firefox/13.0.1'
    }
    //terminal.log(options);
	terminal.debug('Connecting to ' + options.url);
	doFetch(1);
	function doFetch(attempt) {
		var timedOut = false;
		var timeout = setTimeout(function(){
			timedOut = true;
			terminal.debug("Timed out fetching " + options.url);
			terminal.debug('Attempting again (attempt ' + (attempt + 1) + ')');
			doFetch(attempt + 1);
		}, delay * attempt); 
		if (options.file) {
			http.get(options, options.file, processResults);
		}
		else {
			http.get(options, processResults);
		}
		function processResults(err, result) {
			clearTimeout(timeout);
            if (timedOut) return;
			else if (err) {
				switch (err.code){
					case 'ECONNREFUSED': //DNS errors?
						if (err.message == 'ECONNREFUSED, Could not contact DNS servers')
							terminal.warn("Unable to reach DNS servers. (Is your internet connected?)");
						else if (err.message == 'ECONNREFUSED, Connection refused') {
							terminal.warn("Connection was refused. (Is the url malformed?)");
							def(); return;
						}
						else
							terminal.warn("Connection was refused. (Is your internet connected?)" + ' ['+err.message+']');
						terminal.warn('Attempting again in ' + (delay * attempt / 1000) + ' seconds (attempt ' + (attempt + 1) + ')');
						setTimeout(function(){ doFetch(attempt + 1); }, delay * attempt);
						break;
					case 'ENOTFOUND': //Malformed URL?
						if (err.message == 'ENOTFOUND, Domain name not found') {
							terminal.warn("Unable to find domain. (Is the url malformed?)");
						}
						else {
							terminal.warn("Unable to find server. (Is the url malformed?)");
						}
						def();
						break;
					case 'ENOENT': //file errors
						terminal.warn('Unable to create the file specified. (Do the directories exist?)');
						def();
						break;
					case 502:
					case 503:
					case 504:
					case 'ECONNRESET':
						terminal.warn("Connection Error (This should resolve after a retry)" + ' [HTTP error '+err.message+']\nError connecting to ' + options.url + '\nAttempting again in ' + (delay * attempt / 1000) + ' seconds (attempt ' + (attempt + 1) + ')');
						setTimeout(function(){ doFetch(attempt + 1); }, delay * attempt);
						break;
					default:
						def();
				}
				function def(){
					terminal.error(err, "Failed fetching " + options.url + ' ['+err.code+']');
					cb(err);
				}
			}
			else
				cb(false, result);
		};
	}
}

/* 
** Function: appendUriCode
** Takes a manga's uri and adds the uriCode
** @params
**		url:	 a url of the manga's index
**		uriCode: uriCode of scraper
** @return
**		a string uri with uriCode
*/
exports.appendUriCode = function (uri, uriCode) {
	return uri + '.' + uriCode;
}

var getTimeDiffDescription = function (diff, unit, timeDivisor)
{
 
	var unitAmount = (diff / timeDivisor).toFixed(0);
	if (unitAmount > 0) {
		return unitAmount + ' ' + unit + (unitAmount == 1 ? '': 's') + ' ago';
	} else if (unitAmount < 0) {
		return 'in ' + Math.abs(unitAmount) + ' ' + unit + (unitAmount == 1 ? '' : 's');
	} else {
		return null;
	}
 
}
var m_names = new Array("Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec");
exports.getTimeDiff = function (time)
{
 	if (!time) return 'Null time';
	var now = new Date();
	var diff = now.getTime() - time.getTime();
	
	if (diff > 1000 * 60 * 60 * 24 * 30)
		return m_names[time.getMonth()] + ' ' + time.getDate() + ', ' + time.getFullYear();

	var timeDiff = getTimeDiffDescription(diff, 'day', 86400000);
	if (!timeDiff) {
		timeDiff = getTimeDiffDescription(diff, 'hour', 3600000);
		if (!timeDiff) {
			timeDiff = getTimeDiffDescription(diff, 'minute', 60000);
			if (!timeDiff) {
				timeDiff = getTimeDiffDescription(diff, 'second', 1000);
				if (!timeDiff) {
					timeDiff = 'just now';
				}
			}
		}
	}
 
	return timeDiff;
 
}

