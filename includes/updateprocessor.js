// includes/updateprocessor.js
// Handles update processing based on date
// LocalFox v4 © Joshua "geoffreak" DeVinney 2011

// Includes
var downloader = require('./downloader');

/* 
** Function: byDate
** Takes a manga uri and previous data and returns the information that needs updating in the database as well as
** 		processing the downloads for the update. Determines updates (silent only) based on the date attribute and 
**		updates cover image only when there is a chapter needing downloading.
** @params
**		uri:	a manga uri
**		cover:	a string with the filepath to the current cover or blank string if no current cover
**		cData:	current chapter data, for comparison purposes (url, volume, chapter, title, date) [no undownloaded
**				chapters]
**		cb:		the callback function to return the results
**		cCb:	the callback function to be called after each chapter completed to update chapter in database
**		scanFunction:		the scan function of the scraper (uri, cb)
**		downloadFunction:	the download function of the scraper (uri, vol #, chap #, chapter url, callback)
**								expects (err, pages, images) to return through callback when download finishes
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
exports.byDate = function(uri, cover, cData, cb, cCb, scanFunction, downloadFunction) {
	scanFunction(uri, function(err, results){
		if (err) {
			cb(err);
			return;
		}
		var liveListing = {}, currentListing = {}, chapters = {
			add: [],
			update: [],
			remove: []
		};
		for (var i = 0; i < results.chapters.length; i++) {
			liveListing[results.chapters[i].url] = results.chapters[i];
		}
		for (var i = 0; i < cData.length; i++) {
			currentListing[cData[i].url] = cData[i];
			if (!liveListing[cData[i].url]) { 
				//if the url doesn't exist on the live site, remove
				chapters.remove.push(cData[i]);
			}
			else if (liveListing[cData[i].url].date.getTime() != cData[i].date.getTime()) {
				//if the dates don't match, silent update
				cData[i].isHiddenDownload = true
				cData[i].date = liveListing[cData[i].url].date;
				cData[i].title = liveListing[cData[i].url].title;
				cData[i].volume = liveListing[cData[i].url].volume;
				cData[i].chapter = liveListing[cData[i].url].chapter;
				chapters.update.push(cData[i]);
			}
		}
		for (var i = 0; i < results.chapters.length; i++) { 
			if (!currentListing[results.chapters[i].url]) {
				//if the url doesn't exist in localfox, add
				results.chapters[i].isHiddenDownload = false
				chapters.add.push(results.chapters[i]);
			}
		}
		var manga = {
			cover: cover,
			chapters: chapters,
			genres: results.genres,
			status: results.status,
			title: results.title,
			description: results.description
		}
		if ((results.cover && !cover) || (results.cover && (chapters.add.length || chapters.update.length))) {
			//if we found a cover and there wasn't one, or if there is an update to the chapters, download the cover
			downloader(function(err, filepath){
				if (err) {
					cb(err);
					return;
				}
				manga.cover = filepath;
				continueUpdate();
			}, results.cover, uri);
		}
		else {
			continueUpdate();
		}
		function continueUpdate(){
			cb(false, manga);
			function processDownload() {
				var c;
				if (chapters.add.length > 0)
					c = chapters.add.pop();
				else if (chapters.update.length > 0)
					c = chapters.update.pop();
				if (!c)
					return;
				downloadFunction(uri, c.volume, c.chapter, c.url, function(err, pages, images){
					if (err) {
						cCb(err, c.url);
					}
					else {
						cCb(false, c.url, pages, images);
					}
					process.nextTick(processDownload); //break the stack so we can save memory
				});
			}
			process.nextTick(processDownload); //break the stack so we can save memory
		}
	});
}