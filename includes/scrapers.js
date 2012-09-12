// includes/scrapers.js
// Handles Scrapers
// LocalFox v4 © Joshua "geoffreak" DeVinney 2011

// Includes
var fs = require( 'fs' ),
	Step = require('step'),
	terminal = require('./terminal');

// Variables
var scrapers = {}, 
	uriCodes = {}, 
	scraperCount = 0;

/* 
** Function: load
** Initialize unloaded scrapers
** @params
**		cb:		the callback function to return the results
** @callback
**		an error message or false
**		an integer count of scrapers added by this run
*/
exports.load = function(cb) {
	// find all files inside includes/scrapers/ 
	fs.readdir( __dirname + '/scrapers', function( err, files ) {
		var addCount = 0;
		files.forEach(function(file) {
			try {
				if (file.indexOf('.') == -1) {
					var temp = require('./scrapers/'+file+'/scraper');
					if (!scrapers[temp.config.uriCode]) {
						scrapers[temp.config.uriCode] = temp;
						uriCodes[temp.config.hostname] = temp.config.uriCode;
						scraperCount++;
						addCount++;
					}
				}
			}
			catch (e) {
				terminal.error(e, 'Reading Scrapers');
			}
		});
		if (cb) cb(err, addCount);
	});
}

/* 
** Function: listScrapers
** Lists the information about the scrapers
** @return
**		a string containing scraper information
*/
exports.listScrapers = function() {
	var str = '';
	for (var uriCode in scrapers) {
		var config = scrapers[uriCode].config;
		str += ' - ' + config.name + ' v' + config.version + ' (by ' + config.credits + ')\n';
	}
	return str.substring(0, str.length -1);
}
exports.getScrapers = function() {
	var set = {};
	for (var uriCode in scrapers) {
		set[uriCode] = scrapers[uriCode].config.name;
	}
	return set;
}

/* 
** Function: getScraper
** Finds the correct scraper for a uri
** @params
**		uri:	a manga uri with prefix for a scraper at end behind period (ex: hayate_the_combat_butler.mfx)
**		cb:		the callback function to return the results
** @callback
**		a prefix stripped uri
**		the scraper require object or false if scraper cannot be found 
*/
function getScraper(uri, cb) {
	var uriCode = uri.substr(uri.lastIndexOf('.') + 1);
	if (!scrapers[uriCode])
		cb(false);
	else 
		cb(scrapers[uriCode]);
}

/* 
** Function: search
** Takes a search call and passes it to all scrapers or to a specific scraper if specified
** @params
**		query:	 a string containing the query
**		cb:		 the callback function to return the results
**		code: 	 the 3 letter scraper code [optional]
** @callback
**		-1 if scraper not found (if specified) or an error message or false
**		an object with keys the 3 letter scraper codes and values each an array of objects containing manga uri, 
**			title, and url to view manga on website
*/
exports.search = function(query, cb, code) {
	if (code) {
		terminal.debug('Searching for scraper ' + code)
		getScraper(code, function(scraper) {
			terminal.debug(scraper ? 'Searching in scraper ' + code : 'Could not find scraper')
			if (scraper)
				scraper.search(query, cb);
			else
				cb(-1);
		});
	}
	else {
		terminal.debug('Searching all scrapers ')
		var results = {}, error = false;
		Step(
			function search() {
				var callbacks = [];
				for (var i = 0; i < scraperCount; i++)
					callbacks.push(this.parallel());
				var allScrapers = [];
				for (var s in scrapers) { //we have to move to an array to create new variable namespaces below
					allScrapers.push(scrapers[s]);
				}
				allScrapers.forEach(function(s){
					var scraper = s.config.uriCode;
					terminal.debug('Searching in ' + scraper);
					s.search(query, function(err, result){
						if (err) {
							terminal.debug('Error in ' + scraper);
							error = err;
							while (callbacks.length > 0)
								callbacks.pop()();
						}
						else if (!error) {
							terminal.debug('Finished searching in ' + scraper);
							results[scraper] = result;
							callbacks.pop()();
						}
					});
				});
				if (callbacks.length == 0) {
					terminal.debug('No scrapers to search');
					this()
				}
			},
			function finish(err) {
				terminal.debug('Finished searching');
				if (err || error) {
					cb(err || error);
				}
				else {
					cb(false, results);
				}
			}
		);
	}
}
/* 
** Function: scan
** Takes a scan call and passes it to the correct scraper
** @params
**		uri:	a manga uri, with scraper prefix
**		cb:		the callback function to return the results or return -1 if scraper not found
** @callback
**		-1 if scraper not found or an error message or false
**		an object containing a title string, a genres array of strings, a description string, a cover image 
**			url (or a blank string), a status string (ongoing or completed), and an array of chapters (url, volume, 
**			chapter, title, date)
*/
exports.scan = function(uri, cb) {
	getScraper(uri, function(scraper) {
		if (scraper)
			scraper.scan(uri, cb);
		else
			cb(-1);
	});
}

/* 
** Function: update
** Takes an update call and passes it to the correct scraper
** @params
**		uri:	a manga uri, with scraper prefix
**		cover:	a string with the filepath to the current cover or blank string if no current cover
**		cData:	current chapter data, for comparison purposes (url, volume, chapter, title, date) [no undownloaded
**				chapters]
**		cb:		the callback function to return the results or return -1 if scraper not found
**		cCb:	the callback function to be called after each chapter completed to update chapter
** @callback cb
**		-1 if scraper not found or an error message or false
**		an object containing a title string, a genres array of strings, a description string, a cover image 
**			local file path (or a blank string), a status string (ongoing or completed), an array of new
**			chapters (url, volume, chapter, title, date, isHiddenDownload), an array of updated chapters 
**			(url, volume, chapter, title, date, isHiddenDownload), and an array of chapters to be removed (url)
** @callback cCb
**		an error message or false
**		the url of the chapter
**		an integer page count
**		object of filepaths with keys the page numbers and values the url on the file system where the image is found
*/
exports.update = function(uri, cover, cData, cb, cCb) {
	getScraper(uri, function(scraper) {
		if (scraper)
			scraper.update(uri, cover, cData, cb, cCb);
		else
			cb(-1);
	});
}
