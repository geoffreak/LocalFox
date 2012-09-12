var functions = require('./functions'),
	mongoose = require('mongoose'),
	updater = require('./updater'),
	scrapers = require('./scrapers'),
	terminal = require('./terminal'),
	rimraf = require('rimraf');

var Manga = mongoose.model('Manga');
var Chapter = mongoose.model('Chapter');

exports.routes = function (app) {
	app.get('/', function(req, res){
		Manga.find({}).sort('lastUpdate', 'descending').exec(function(err, mangas){
			if (err) {
				res.end(err.message);
				return;
			}
			var manga_list = [];
			mangas.forEach(function(manga){
				manga_list.push({
					cover: manga.cover ? '/images/manga/'+manga.uri+'/cover.jpg' : '',
					title: manga.title,
					genres: manga.genres.toString().replace(/,/g,', '),
					status: manga.status,
					uri: manga.uri,
					chapters: manga.chapterCount,
					lastUpdate: functions.getTimeDiff(manga.lastUpdate),
					class: manga.hasUnread ? 'new' : '',
					processing: updater.isRunning(manga.uri)
				});
			});
			res.render('index', {
				mangas: manga_list,
				showAdd: true,
				title: 'View Manga',
				error: false
			});
		})
	});
	app.get('/preview/:url/:query', function(req, res){
		res.render('preview', {
			showAdd: false,
			backTo: 'Search Query',
			backToUrl: '/search/'+req.params.query,
			url: decodeURIComponent(req.params.url),
		});
	});
	app.get('/add/:uri', function(req, res){
		//find if manga exists
		var uri = req.params.uri;
		updater.updateManga(uri, function(err, data){
			if (err) {
				res.send(err);
				return;
			}
			res.redirect('/read/' + uri);
		});
		/*scrapers.update(uri, '', [], function(err, data){
			
		}, function (err, url, pageCount, filepaths){
			console.log(err, url, pageCount, filepaths);
		});*/
	});
	app.get('/read/:uri', function(req, res){
		Manga.findOne({uri: req.params.uri}, function(err, manga){
			if (err) {
				res.send(err);
				return;
			}
			if (!manga) {
				res.redirect('/');
				return;
			}
			Chapter.find({uri: req.params.uri}).sort('volume', 'descending').sort('chapter', 'descending').find(function(err, chapters){
				if (err) {
					terminal.error(err, 'finding chapters for display');
					res.send(err);
					return;
				}
				var chapters_arr = [];
				chapters.forEach(function(chapter){
					chapters_arr.push({
						pubDate: functions.getTimeDiff(chapter.date),
						title: chapter.title || 'Untitled Chapter',
						volume: chapter.volume,
						chapter: chapter.chapter,
						pages: chapter.pageCount,
						class: chapter.isRead ? '' : 'new',
						downloaded: chapter.downloaded
					});
				});
				res.render('view', {
					showAdd: false,
					backTo: 'Manga List',
					backToUrl: '/',
					cover: manga.cover ? '/images/manga/'+manga.uri+'/cover.jpg' : '',
					title: manga.title,
					genres: manga.genres.toString().replace(/,/g,', '),
					mangaStatus: manga.status,
					uri: manga.uri,
					chapterCount: manga.chapterCount,
					lastUpdate: functions.getTimeDiff(manga.lastUpdate),
					class: manga.hasUnread ? 'new' : '',
					processing: updater.isRunning(manga.uri),
					description: manga.description,
					chapters: chapters_arr
				});
			});
		});
	});
	app.get('/read/:uri/v:vol/c:chap', function(req, res){
		res.redirect('/read/'+req.params.uri+'/v'+req.params.vol+'/c'+req.params.chap+'/1')
	});
	app.get('/read/:uri/v:vol/c:chap/:page', function(req, res){
		Manga.findOne({uri: req.params.uri}, function(err, manga){
			if (err) {
				res.send(err.message);
				return;
			}
			if (!manga) {
				res.redirect('/');
				return;
			}
			Chapter.find({uri: req.params.uri}).sort('volume', 'descending').sort('chapter', 'descending').find(function(err, chapters){
				var i, unreadCount = 0;
				for (var index = '0'; parseInt(index) < chapters.length; index = ''+(parseInt(index) + 1))
				{
					var chapter = chapters[index];
					if (chapter.volume == req.params.vol 
						&& chapter.chapter == req.params.chap) {
						i = index;
					}
					else if (!chapter.isRead && chapter.downloaded) unreadCount++; 
					//this is being read, only count others
				}
				if (!i || req.params.page > chapters[i].pageCount) {
					res.redirect('/read/'+req.params.uri);
					return;
				}
				chapters[i].isRead = true;
				chapters[i].save();
				if (manga.hasUnread && unreadCount == 0) {
					manga.hasUnread = false;
					manga.save(function(err){
						if (err) {
							throw err;
						}
						postProcess();
					});
				}
				else {
					postProcess();
				}
				function postProcess() {
					var nextChapter = (parseInt(i) > 0) ? '/read/'+manga.uri+'/v'+chapters[''+(parseInt(i)-1)].volume+'/c'+chapters[''+(parseInt(i)-1)].chapter+'/1' : '';
					var prevChapter = (parseInt(i) < chapters.length - 1) ? '/read/'+manga.uri+'/v'+chapters[''+(parseInt(i)+1)].volume+'/c'+chapters[''+(parseInt(i)+1)].chapter+'/1' : '';
					var nextPage = (req.params.page < chapters[i].pageCount ? '/read/'+manga.uri+'/v'+chapters[i].volume+'/c'+chapters[i].chapter+'/'+(parseInt(req.params.page)+1) : '');
					nextPage = nextPage || nextChapter;
					var prevPage = (req.params.page > 1) ? '/read/'+manga.uri+'/v'+chapters[i].volume+'/c'+chapters[i].chapter+'/'+(parseInt(req.params.page)-1) : '';
					prevPage = prevPage || (chapters[''+(parseInt(i)+1)] ? '/read/'+manga.uri+'/v'+chapters[''+(parseInt(i)+1)].volume+'/c'+chapters[''+(parseInt(i)+1)].chapter+'/'+(chapters[''+(parseInt(i)+1)].pageCount) : '');
					res.render('read', {
						nextChapter: nextChapter,
						prevChapter: prevChapter,
						nextPage: nextPage,
						prevPage: prevPage,
						title: (chapters[i].title || 'Untitled Chapter'),
						pageMin: req.params.page,
						pageMax: chapters[i].pageCount,
						chapter: chapters[i].chapter,
						volume: chapters[i].volume,
						//titleBottom: 'V.'+chapters[i].volume+', C.'+chapters[i].chapter+' - '+(chapters[i].title || 'Untitled Chapter'),
						//titleTop: (chapters[i].title || 'Untitled Chapter')+' - Page '+req.params.page+' of '+chapters[i].pageCount,
						showAdd: false,
						backTo: manga.title,
						backToUrl: '/read/'+req.params.uri,
						image: '/images/manga/' + chapters[i].pages[parseInt(req.params.page) - 1].file
					});
				}
			});
		});
	});
	app.get('/delete/:uri/v:vol/c:chap', function(req, res){
		Manga.findOne({uri: req.params.uri}, function(err, manga){
			if (err) {
				res.end(err.message);
				return;
			}
			if (!manga) {
				res.redirect('/');
				return;
			}
			Chapter.find({uri: req.params.uri}).sort('volume', 'ascending', 'chapter', 'ascending').find(function(err, chapters){
				var i, unreadCount = 0;
				for (var index = '0'; parseInt(index) < chapters.length; index = ''+(parseInt(index) + 1))
				{
					var chapter = chapters[index];
					if (chapter.volume == req.params.vol 
						&& chapter.chapter == req.params.chap) {
						i = index;
					}
					else if (!chapter.isRead && chapter.downloaded) unreadCount++; 
					//this is being deleted, only count others
				}
				if (!i) {
					res.redirect('/read/'+req.params.uri);
					return;
				}
				chapters[i].downloaded = false;
				chapters[i].isRead = true;
				manga.chapterCount = manga.chapterCount - 1;
				if (manga.hasUnread && unreadCount == 0) {
					manga.hasUnread = false;
				}
				manga.save(function(err){
					if (err) {
						throw err;
					}
					chapters[i].save(function(err){
						if (err) {
							throw err;
						}
						res.redirect('/read/'+manga.uri);
					});
				});
			});
		});
	});
	app.get('/delete/:uri', function(req, res){
		Manga.findOne({uri: req.params.uri}, function(err, manga){
			if (err) {
				res.send(err.message);
				return;
			}
			if (!manga) {
				res.redirect('/?no');
				return;
			}
			manga.remove(function(err){
				if (err) {
					terminal.error(err, 'deleting manga ' + req.params.uri);
					res.send(err.message);
					return;
				}
				Chapter.find({uri: req.params.uri}, function(err, chapters){
					if (err) {
						terminal.error(err, 'finding chapters for deletion ' + req.params.uri);
						res.send(err.message);
						return;
					}
					chapters.forEach(function(chapter){
						var url = chapter.url;
						chapter.remove(function(err){
							if (err) {
								terminal.error(err, 'deleting chapter ' + url);
								return;
							}
						});
					});
					rimraf(functions.downloadPath + '/' + req.params.uri + '/', function(err){
						if (err) {
							terminal.error(err, 'deleting files ' + req.params.uri);
							res.send(err.message);
							return;
						}
						res.redirect('/');
					});
				});
			});
		});
	});
	
	app.post('/search', searching);
	app.get('/search/:query', searching);
	function searching(req, res){
		var query;
		if (req.body.query)
			query = req.body.query
		else
			query = req.params.query
		scrapers.search(query, function(err, results){
			var sorting = [];
			var set = scrapers.getScrapers();
			for (s in results) {
				for (var i = 0; i < results[s].length; i++) {
					sorting.push({
						uri: results[s][i].uri,
						url: encodeURIComponent(results[s][i].url),
						title: results[s][i].title,
						//date: results[s][i].date ? functions.getTimeDiff(results[s][i].date) : '',
						cover: results[s][i].cover || '',
						//status: results[s][i].status || '',
						//chapters: results[s][i].chapters || '',
						genres: results[s][i].genres ? results[s][i].genres.toString().replace(/,/g,', ') : '',
						scraper: set[s]
					});
				}
			}
			sorting.sort(function(a, b){
				var a_ = a.title + a.uri;
				var b_ = b.title + b.uri;
				if (a_ < b_)
					return -1;
				else if (a_ > b_)
					return 1;
				return 0;
			});
			res.render('search', {
				showAdd: false,
				backTo: 'Manga List',
				backToUrl: '/',
				results: sorting,
				query: query
			});
		});
	};
}