// includes/updater.js
// Handles manga updates
// LocalFox v4 © Joshua "geoffreak" DeVinney 2011

var functions = require('./functions'),
	mongoose = require('mongoose');
	models = require('./mongoose'),
	scrapers = require('./scrapers');
	terminal = require('./terminal');

var Manga = mongoose.model('Manga');
var Chapter = mongoose.model('Chapter');

var running = {};

exports.isRunning = function isRunning(uri) {
	if (!running[uri] || running[uri] < 0) running[uri] = 0;
	return running[uri] ? true : false;
}

exports.updateManga = function updateManga(uri, cb) {
	if (!uri || exports.isRunning(uri)) {
		cb(false);
		return;
	}
	if (!running[uri]) running[uri] = 0;
	running[uri]++;
	Manga.findOne({uri: uri}, function(err, manga){
		if (err) {
			terminal.error(err, 'finding manga to update');
			cb(err);
			running[uri]--;
			return;
		}
		var cover, chapters = [];
		var isNew = !manga; //doesn't exist yet
		if (isNew) { 
			cover = '';
			continueUpdate();
		}
		else { //already exists
			cover = manga.cover;
			Chapter.find({uri: uri}, function(err, chaps){
				if (err) {
					terminal.error(err, 'finding chapters for updating manga ' + uri);
					cb(err);
					running[uri]--;
					return;
				}
				for (var i = 0; i < chaps.length; i++) {
					if (chaps[i].downloaded)
						chapters.push(chaps[i]);
				}
				continueUpdate();
			});
		}
		function continueUpdate() {
			var isSilent = [];
			scrapers.update(uri, cover, chapters, function(err, data){
				if (err) {
					terminal.error(err, 'updating manga ' + uri);
					cb(err);
					running[uri]--;
					return;
				}
				if (isNew) {
					manga = new Manga();
					manga.uri = uri;
					manga.cover = data.cover;
					manga.genres = data.genres;
					manga.title = data.title;
					manga.status = data.status;
					manga.description = data.description;
					manga.chapterCount = data.chapters.add.length;
					manga.save(function(err){
						if (err) {
							terminal.error(err, 'saving new manga ' + uri);
							cb(err);
							running[uri]--;
							return;
						}
						cb(false, uri);
						running[uri]--;
					});
				}
				else {
					var update = {
						$set: {
							cover: data.cover,
							genres: data.genres,
							title: data.title,
							status: data.status,
							description: data.description,
							chapterCount: chapters.length + data.chapters.add.length - data.chapters.remove.length,
							lastCheck: Date.now()
						}
					};
					Manga.update({uri: uri}, update, function(err, numAffected){
						if (err) {
							terminal.error(err, 'saving existing manga ' + uri);
							cb(err);
							running[uri]--;
							return;
						}
						cb(false, uri);
						running[uri]--;
					});
					for (var i = 0; i < data.chapters.remove.length; i++) { //remove deleted chapters
						var url = data.chapters.remove[i].url;
						Chapter.findOne({uri: uri, url: url}, function(err, chap){
							if (err) {
								terminal.error(err, 'finding chapter for removal ' + url);
								return;
							}
							chap.remove(function(err){
								if (err) {
									terminal.error(err, 'removing chapter ' + url);
									return;
								}
							});
						});
					}
				}
				//store chapters for later
				for (var i = 0; i < data.chapters.add.length; i++) {
					addChapter(data.chapters.add[i]);
					isSilent[data.chapters.add[i].url] = data.chapters.add[i].isHiddenDownload;
				}
				for (var i = 0; i < data.chapters.update.length; i++) {
					addChapter(data.chapters.update[i]);
					isSilent[data.chapters.update[i].url] = data.chapters.update[i].isHiddenDownload;
				}
				function addChapter(chapter) {
					running[uri]++;
					var url = chapter.url;
					Chapter.findOne({uri: uri, url: url}, function(err, chap){
						if (err) {
							terminal.error(err, 'finding chapter for processing ' + url);
							return;
						}
						if (!chap) {
							chap = new Chapter();
							chap.url = url;
							chap.uri = uri;
						}
						chap.title = chapter.title;
						chap.volume = chapter.volume;
						chap.chapter = chapter.chapter;
						chap.date = chapter.date;
						chap.save(function(err){
							if (err) {
								terminal.error(err, 'saving chapter ' + url);
								return;
							}
						});
					});
				}
			}, function (err, url, pageCount, filepaths){
				if (err) {
					terminal.error(err, 'downloading chapter ' + url);
					running[uri]--;
					return;
				}
				var pages = [];
				for (f in filepaths) {
					pages.push({
						number: f,
						file: filepaths[f]
					});
				}
				var update = {
					$set: {
						pageCount: pageCount,
						pages: pages,
						downloaded: true
					}
				};
				if (!isSilent[url]) {
					update['$set'].isRead = false;
				}
				Chapter.update({uri: uri, url: url}, update, function(err, numAffected){
					if (err) {
						terminal.error(err, 'saving updated chapter ' + url);
						running[uri]--;
						return;
					}
					if (!isSilent[url]) {
						Manga.update({uri: uri}, {$set: {hasUnread: true, lastUpdate: Date.now()}}, function(err, numAffected){
							if (err) {
								terminal.error(err, 'updating manga for unread chapter ' + uri);
								running[uri]--;
								return;
							}
							terminal.debug('A new chapter has been added to ' + uri);
							running[uri]--;
						});
					}
					else {
						terminal.debug('A new chapter has been added to ' + uri);
						running[uri]--;
					}
				});
			});
		}
	});
}

exports.updateAll = function updateAll() {
	terminal.debug('Updating all manga');
	Manga.find({}, ['uri']).sort('lastUpdate', 'ascending').exec(function(err, mangas){
		if (err) {
			terminal.error(err, 'getting all manga for update');
			return;
		}
		for (var m = 0; m < mangas.length; m++) {
			if (exports.isRunning(mangas[m].uri))
				continue;
			exports.updateManga(mangas[m].uri, function(err){
				if (err) {
					terminal.error(err, 'automatically updating ' + url);
				}
			});
		}
	});
	setTimeout(updateAll, 1000 * 60 * 60);//next update in an hour
}