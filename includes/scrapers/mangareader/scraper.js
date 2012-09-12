// includes/scrapers/mangareader/scraper.js
// Scraper for Mangareader.net
// LocalFox v4 © Joshua "geoffreak" DeVinney 2011

// Includes
var url = require('url'),
	regex = require('./regex'),
	downloader = require('../../downloader'),
	htmlhandler = require('../../htmlhandler'),
	functions = require('../../functions'),
	updateprocessor = require('../../updateprocessor'),
	terminal = require('../../terminal');

// Configuration
exports.config = {
	name: 'Manga Reader', //name of site being scanned
	hostname: 'www.mangareader.net', //hostname returned by url's hostname parameter
	uriCode: 'mrd', //the scraper's code to be appeneded to uris like a file extension
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
	//parse url special characters for get request
	query = encodeURIComponent(query);
	var url = 'http://www.mangareader.net/actions/search/?q='+query+'&limit=100000';
	htmlhandler(url, regex.search, function(err, results){
		if (err) {
			cb(err);
			return;
		}
		for (var i = 0; i < results.manga.length; i++) {
			results.manga[i].url = 'http://www.mangareader.net' + results.manga[i].url;
			results.manga[i].uri = functions.appendUriCode(encodeUri(results.manga[i].url), exports.config.uriCode);
		}
		cb(false, results.manga);
		//console.log(results.data.length);
	});
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
	var localUri = uri.substr(0, uri.lastIndexOf('.'));
	htmlhandler(decodeUri(localUri), regex.title, function(err, results){
		if (err) {
			cb(err);
			return;
		}
		var chapters = [];
		while ((chap = results.chapters.pop()) != null) {
			//mangareader has only days, so transform all times to GMT for consistency
			chap.date = new Date(chap.date).getTime() - (new Date().getTimezoneOffset() * (1000 * 60));
			chapters.push({
				url: 'http://www.mangareader.net' + chap.url,
				volume: 0,
				chapter: chap.chapter,
				title: chap.title,
				date: new Date(chap.date)
			});
		};
		results.chapters = chapters;
		results.status = results.status.toLowerCase();
		delete results.html;
		cb(false, results);
	});
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
**		uri:	a manga uri, stripped of the prefix for this scraper
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
	helper(1, url);
	function helper(pageNum, pageUrl){
		htmlhandler(pageUrl, regex.page, function(err, results){
			if (err) {
				cb(err);
				return;
			}
			if (results.image == '') {
				//I haven't seen a page without an image on mangareader, but I added this just in case
				terminal.warn('MRD unable to find image on page at ' + pageUrl);
				cb(false, pageNum - 1, images);
				return;
			}
			downloader(function(err, filepath){
				if (err) {
					cb(err);
					return;
				}
				images[pageNum] = filepath;
				if (results.hasNextPage) {
					helper(pageNum + 1, 'http://www.mangareader.net' + results.nextPage);
				}
				else {
					cb(false, pageNum, images);
				}
			}, results.image, uri, vol, chap, pageNum);
		});
	}
}

/* 
** Function: decodeUri
** Takes an encoded uri and obtains the url of the chapter
** @params
**		uri:	a string encoded uri
** @return
**		a url of the manga's index
*/
function decodeUri(uri) {
	uri = uri.replace('.', '/');
	if (uri.indexOf('/') != -1) //old style url ex: http://www.mangareader.net/94/bleach.html
		return 'http://www.mangareader.net/' + uri + '.html';
	else //new style url ex: http://www.mangareader.net/bloody-monday-last-season
		return 'http://www.mangareader.net/' + uri;
}

/* 
** Function: encodeUri
** Takes a manga's index url and encodes it into a uri
** @params
**		url:	a url of the manga's index
** @return
**		a string encoded uri
*/
function encodeUri(mangaUrl) {
	var path = url.parse(mangaUrl).pathname.substr(1);
	if (path.indexOf('/') != -1) //old style url ex: http://www.mangareader.net/94/bleach.html
		return path.substr(0, path.indexOf('.')).replace('/', '.');
	else //new style url ex: http://www.mangareader.net/bloody-monday-last-season
		return path;
}

