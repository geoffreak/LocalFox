// includes/downloader.js
// Holds functions for downloading web pages and images
// LocalFox v4 © Joshua "geoffreak" DeVinney 2011

// Includes
var terminal = require('./terminal'),
	http = require('http-get'),
	fs = require("fs"),
	util = require("util"),
    url = require("url"),
	functions = require('./functions');

// Variables
var MAX_RUNNING = 30, //don't let more than this many images download at once
	DOWNLOAD_PATH = functions.downloadPath; //where to place downloaded images
	//DOWNLOAD_PATH = 'C:/Users/Joshua DeVinney/Desktop/testing' //placeholder
	
// automatically create directories if they do not exist at a path
function mkdirs(path, mode, callback){
	var path = path.indexOf('\\') >= 0 ? path.replace('\\', '/') : path;//change windows slashes to unix
	if (path.substr(path.length - 1) == '/') { //remove trailing slash
		path = path.substr(0, path.length - 1);
	}
	function tryDirectory(dir, cb){
		fs.stat(dir, function (err, stat) {
			if (err) { //the file doesn't exist, try one stage earlier then create
				if (err.errno == 2 || err.errno == 32 || err.errno == 34) {
					if (dir.lastIndexOf('/') == dir.indexOf('/')) {//only slash remaining is initial slash
						//should only be triggered when path is '/' in Unix, or 'C:/' in Windows
						cb(new Error('notfound'));
					}
					else {
						tryDirectory(dir.substr(0, dir.lastIndexOf('/')), function(err){
							if (err) { //error, return
								cb(err);
							}
							else { //make this directory
								fs.mkdir(dir, mode, function (error) {
									if (error && error.errno != 17) {
										terminal.error(error, "Failed to make " + dir);
										return cb(new Error('failed'));
									} else {
										cb();
									}
								});
							}
						});
					}
				}
				else { //unkown error
					console.log(util.inspect(err, true));
					cb(err);
				}
			}
			else {
				if (stat.isDirectory()) { //directory exists, no need to check previous directories
					cb();
				}
				else { //file exists at location, cannot make folder
					return cb(new Error('exists'));
				}
			}
		});
	}
	tryDirectory(path, callback);
};

	function mkdirsold(_path, mode, callback) {
	  var dirs = _path;
	  
	  var windows = dirs.indexOf('\\') >= 0;
	  if (windows)
	  	dirs = dirs.split('\\');
	  else
	  	dirs = dirs.split('/');
	  
	  var walker = [dirs.shift()];
	
	  var walk = function (ds, acc, m, cb) {
		if (ds.length > 0) {
		  var d = ds.shift();
		  acc.push(d);
		  var dir = windows ? acc.join('\\') : acc.join('/');
	
		  fs.stat(dir, function (err, stat) {
			if (err) {
			  // file does not exist
			  if (err.errno == 2 || err.errno == 32) {
				fs.mkdir(dir, m, function (erro) {
				  if (erro && erro.errno != 17) {
					terminal.error(erro, "Failed to make " + dir);
					return cb(new Error("Failed to make " + dir + "\n" + erro));
				  } else {
					return walk(ds, acc, m, cb);
				  }
				});
			  } else {
				return cb(err);
			  }
			} else {
			  if (stat.isDirectory()) {
				return walk(ds, acc, m, cb);
			  } else {
				return cb(new Error("Failed to mkdir " + dir + ": File exists\n"));
			  }
			}
		  });
		} else {
		  return cb();
		}
	  };
	  return walk(dirs, walker, mode, callback);
	};

//pad zeroes in front of a number to make it the correct number of digits
function numberFormat(value, digits){
	var val = '' + value; //make it a string
	while (val.length < digits)
		val = '0' + val;
	return val;
}

// download an image
module.exports = downloadImage = function (cb, url, mangaUri, volumeNum, chapterNum, pageNum){
	// if no volume, chapter, or page number specified, it's a cover image
	var img = {cb: cb, url: url, mangaUri: mangaUri, volumeNum: volumeNum, chapterNum: chapterNum, pageNum: pageNum, isCover: !(volumeNum || chapterNum || pageNum)};
	// if runningSize greater than MAX_RUNNING or if there are elements in queue, add to queue instead
	if (imageQueue.length > 0 || runningSize >= MAX_RUNNING) {
		imageQueue.unshift(img);
	}
	else { //go ahead and run since the queue is empty and fewer than MAX_RUNNING images are downloading
		runDownload(img);
	}
}
// queue images to limit number downloading at once
var imageQueue = [], runningSize = 0;
// downloader
function runDownload(img) {
	//increase running size
	runningSize++;
	
	//process variables we will need to place the file
	var host = url.parse(img.url).hostname,
		filepath = '/' + img.mangaUri + '/',
		extension = url.parse(img.url).pathname.split(".").pop(),
		filename;
	if (!img.isCover) {
		filepath += 'v' + numberFormat(img.volumeNum, 2) + '/c' + numberFormat(img.chapterNum, 3) + '/';
		filename = numberFormat(img.pageNum, 3) + '.' + extension;
	}
	else {
		filename = 'cover.' + extension;
	}
	
	mkdirs(DOWNLOAD_PATH+filepath, 0777, function(err){
		if (err) {
			img.cb(err);
			runningSize--;
			return;
		}
		var options = {
			url: img.url, 
			file: DOWNLOAD_PATH + filepath + filename
		}
		functions.httpGet(options, function getCallback(err, result) {
			if (err && err.code != 404) {
				terminal.error(err, "Failed downloading " + filepath+filename);
				img.cb(err);
				runningSize--;
			}
			else {
				terminal.debug("Finished downloading " + filepath+filename);
				//report that we finished to the calling function by sending back the filename
				img.cb(false, filepath + filename);
				//now that we're done, decrease running size and call next in queue if we have one
				runningSize--;
				if (imageQueue.length > 0) runDownload(imageQueue.pop());
			}
		});
	});
}