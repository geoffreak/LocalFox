// includes/scrapers/mangafox/scraper.js
// Scraper for Mangafox.com
// LocalFox v4 © Joshua "geoffreak" DeVinney 2011

// Includes
var regex = require('./regex'),
	Step = require('step'),
	downloader = require('../../downloader'),
	htmlhandler = require('../../htmlhandler'),
	updateprocessor = require('../../updateprocessor'),
	terminal = require('../../terminal'),
	functions = require('../../functions');

// Configuration
exports.config = {
	name: 'Manga Fox', //name of site being scanned
	hostname: 'www.mangafox.com', //hostname returned by url's hostname parameter
	uriCode: 'mfx', //the scraper's code to be appeneded to uris like a file extension
	version: '1.0.0',
	credits: 'Joshua "geoffreak" DeVinney'
}

/* 
** Function: search
** Takes a query string and returns a list of manga from the site returned from the site's search function
** @params
**		query:	a string containing the query
**		cb:		the callback function to return the results
** @callback
**		an error message or false
**		an array of objects containing manga uri, title, and url to view manga on website
*/
exports.search = function(query, cb) {
	query = encodeURIComponent(query);
	htmlhandler('http://mangafox.me/ajax/search.php?term='+query, regex.searchNew, function(err, results){
		if (err) {
			cb(err);
			return;
		}
		results = JSON.parse(results.html);
		var mangas = [];
		for (var i = 0; i < results.length; i++) {
			var manga = results[i];
			var data = {};
			data.title = manga[1];
			data.cover = 'http://l.mfcdn.net/store/manga/' + manga[0] + '/cover.jpg?t=' + Date.now();
			data.uri = manga[2] + '.mfx';
			data.url = 'http://mangafox.me/manga/' + manga[2] + '/';
			data.genres = manga.slice(3, manga.length - 1);
			mangas.push(data);
		};
		cb(false, mangas);
	});
	/*function doQuery(page, resultscb) {
		htmlhandler('http://www.mangafox.com/search.php?sort=name&order=az&name='+query+'&page='+page, regex.search, function(err, results){
			if (err) 
				cb(err);
			else
				resultscb(results);
		});
	}
	var arr = [], unique = {};
	var page = 1, total = 0;
	var handle = function(results){
		total = results.count;
		if (total > 7500) { // mangafox for whatever reason displays ALL results when it can't find any
			terminal.debug('MFX Found too many results, assuming none');
			results.manga = [];
			results.count = total = 0;
		}
		terminal.debug('MFX Searching on page '+page+' - '+results.manga.length+' results on this page.')
		var uniqueFound = 0;
		for (var i = 0; i < results.manga.length; i++) {
			if (!unique[results.manga[i].uri]) {
				results.manga[i].url = 'http://www.mangafox.com/manga/'+results.manga[i].uri+'/';
				results.manga[i].status = results.manga[i].status == 'open' ? 'ongoing' : 'completed';
				//if update string is empty, then it was actually "None" meaning that no chapters are actually there
				results.manga[i].chapters = results.manga[i].date ? results.manga[i].chapters : 0; 
				if (results.manga[i].date == 'Today')
					results.manga[i].date = new Date();
				else if (results.manga[i].date == 'Yesterday')
					results.manga[i].date = new Date().getTime() - (1000 * 60 * 60 * 24);
				results.manga[i].date = results.manga[i].date ? new Date(results.manga[i].date) : new Date(0);
				results.manga[i].date = new Date(results.manga[i].date.getTime() - (results.manga[i].date.getTime() % (1000 * 60 * 60 * 24)));
				unique[results.manga[i].uri] = true;
				results.manga[i].uri = functions.appendUriCode(results.manga[i].uri, exports.config.uriCode)
				arr.push(results.manga[i]);
				uniqueFound++;
			}
		}
		terminal.debug('MFX Found '+arr.length+' of '+total+' results so far')
		//console.log(arr_diff(results.manga, results.test));
		if (total > arr.length && uniqueFound != 0) { 
			page++;
			doQuery(page, handle);
		}
		else {
			cb(false, arr);
		}
	};
	doQuery(page, handle);*/
}

/* 
** Function: scan
** Takes a manga uri and returns the information obtained from scanning the manga's title page
** @params
**		uri:	a manga uri, stripped of the prefix for this scraper
**		cb:		the callback function to return the results
** @callback
**		an error message or false
**		an object containing a title string, a genres array of strings, a description string, a cover image 
**			url (or a blank string), a status string (ongoing or completed), and an array of chapters (url, volume, 
**			chapter, title, date)
*/
exports.scan = function(uri, cb) {
	var calledBack = false;
	var web, rss;
	var localUri = uri.substr(0, uri.lastIndexOf('.'));
	Step(
		function split() {
			var callbacks = [this.parallel(), this.parallel()];
			htmlhandler('http://mangafox.me/manga/'+localUri+'/', regex.title, function(err, results){
				if (err) {
					calledBack = true;
					cb(err);
					terminal.error(err, 'mfx scraper html scraping');
				}
				web = results;
				if (!calledBack) callbacks[0]();	
			});
			htmlhandler('http://mangafox.me/rss/'+localUri+'.xml', regex.xml, function(err, results){
				if (err) {
					calledBack = true;
					cb(err);
					terminal.error(err, 'mfx scraper rss scraping');
				}
				rss = results;
				if (!calledBack) callbacks[1]();	
			});
		},
		function combine(err){
			if (err) {
				calledBack = true;
				cb(err);
				terminal.error(err, 'mfx scraper combination');
			}
            var chapters = {};
			for (var i = 0; i < web.chapters.length; i++) {
				chapters[web.chapters[i].url] = {
					url:		web.chapters[i].url,
					volume:		functions.parseFloatIfPossible(web.chapters[i].volume),
					chapter:	functions.parseFloatIfPossible(web.chapters[i].chapter),
					title: 		web.chapters[i].title,
					date:		new Date(0)
				};
			}
			for (var i = 0; i < rss.xml.length; i++) {
				rss.xml[i].url = rss.xml[i].url.substr(0, rss.xml[i].url.lastIndexOf('1.html'));
				if (!chapters[rss.xml[i].url])
					terminal.debug('MFX: Unable to match publishing date of ' + rss.xml[i].url);
				else
					chapters[rss.xml[i].url].date = new Date(rss.xml[i].date);
			}
			web.chapters = [];
			for (url in chapters){
				web.chapters.push(chapters[url]);
			}
            if (web.license) {
                //console.log(web.chapters)
                for (var i = 0; i < web.chapters.length; i++) {
                    //console.log('before', chapters[url]);
                    web.chapters[i].url = 'http://www.proxyget.info/browse.php?b=10&u=' + web.chapters[i].url + '';
                    //console.log('after', chapters[url]); 
                }
                //console.log(web.chapters)
            }
            
			delete web.html;
			web.status = web.status.toLowerCase();
			cb(false, web);
		}
	);
}

/* 
** Function: update
** Takes a manga uri and previous data and returns the information that needs updating in the database as well as
** 		processing the downloads for the update.
** @params
**		uri:	a manga uri, stripped of the prefix for this scraper
**		cover:	a string with the filepath to the current cover or blank string if no current cover
**		cData:	current chapter data, for comparison purposes (url, volume, chapter, title, date) [no undownloaded
**				chapters]
**		cb:		the callback function to return the results
**		cCb:	the callback function to be called after each chapter completed to update chapter in database
** @callback cb
**		an error message or false
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
	updateprocessor.byDate(uri, cover, cData, cb, cCb, exports.scan, download)
}

/* 
** Function: download
** Helper function for downloading a specific chapter
** @params
**		uri:	a manga uri, with prefix for this scraper
**		chap:	chapter number, zero padded to 3 digits
**		vol:	volume number, zero padded to 3 digits
**		url:	the url where the chapter can be found
**		cb:		the callback function to return the results
** @callback
**		an error message or false
**		an integer value of the number of pages in the chapter
**		object of filepaths with keys the page numbers and values the url on the file system where the image is found
*/
function download(uri, vol, chap, url, cb) {
	var images = {};
	url = url.substr(0, url.lastIndexOf('/') + 1); //remove the 1.html from the end
	function pagenate(p) { return url + p + '.html'; }
	function helper(page){
		htmlhandler(pagenate(page), regex.page, function(err, results){
			if (err) {
				cb(err);
				return;
			}
            if (results.page.image == '') {
				//we didn't find an image, likely due to a bug on mangafox, so just say we finished chapter
				terminal.debug('MFX unable to find image on page at ' + pagenate(page));
				cb(false, page - 1, images);
				return;
			}
			downloader(function(err, filepath){
				if (err) {
					cb(err);
					return;
				}
				images[page] = filepath; 
				if (results.page.next.length && results.page.next != 'javascript:void(0);') {
					helper(page + 1);
				}
				else {
					cb(false, page, images);
				}
			}, results.page.image, uri, vol, chap, page);
		});
	}
	
	helper(1);
}
//exports.test = download;
