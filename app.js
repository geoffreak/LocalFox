// app.js
// Application Head
// LocalFox v4 © Joshua "geoffreak" DeVinney 2011

// Includes
var express = require('express'),
	Step = require('step'),
	colors = require('colors'),
	functions = require('./includes/functions'),
	mongoose = require('mongoose');
	updater = require('./includes/updater'),
	scrapers = require('./includes/scrapers');
	terminal = require('./includes/terminal');
	web = require('./includes/web');

var Manga = mongoose.model('Manga');
var Chapter = mongoose.model('Chapter');

// Variables
var app;
var port = 3333;

Step(
	function welcomeScreen() {
		// welcome screen
		terminal.log("        __                                ___    ____                   \n       /\\ \\                              /\\_ \\  /\\  _`\\                 \n       \\ \\ \\        ___     ___      __  \\//\\ \\ \\ \\ \\L\\_\\ ___    __  _  \n        \\ \\ \\  __  / __`\\  /'___\\  /'__`\\  \\ \\ \\ \\ \\  _\\// __`\\ /\\ \\/'\\ \n         \\ \\ \\L\\ \\/\\ \\L\\ \\/\\ \\__/ /\\ \\L\\.\\_ \\_\\ \\_\\ \\ \\//\\ \\L\\ \\\\/>  </ \n          \\ \\____/\\ \\____/\\ \\____\\\\ \\__/.\\_\\/\\____\\\\ \\_\\\\ \\____/ /\\_/\\_\\\n           \\/___/  \\/___/  \\/____/ \\/__/\\/_/\\/____/ \\/_/ \\/___/  \\//\\/_/\n                                      __ __      \n                                     /\\ \\\\ \\     \n                               __  __\\ \\ \\\\ \\    \n                              /\\ \\/\\ \\\\ \\ \\\\ \\_  \n                              \\ \\ \\_/ |\\ \\__ ,__\\\n                               \\ \\___/  \\/_/\\_\\_/\n                                \\/__/      \\/_/  \n\n                       ".bold.magenta+" © Joshua \"geoffreak\" DeVinney 2011 \n".grey);
		this();
		
	}, 
	// lets startup the server in parallel
	function startup() {
		// configure server
		app = express.createServer();
		app.configure('production', function(){
			terminal.debugOff();
			app.use(express.errorHandler()); 
		});
		app.configure('development', function(){
			app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
		});
		if (terminal.isDebug()) {
			terminal.warn('LocalFox is currently running in development mode. For less debug\n information and faster page load times, run LocalFox in production mode by\n adding "NODE_ENV=production" before "node app.js".');
		}
		app.configure(function(){
			app.set('views', __dirname + '/views');
			app.set('view engine', 'jade');
			app.use(express.bodyParser());
			app.use(express.methodOverride());
			app.use(express.static(__dirname + '/public'));
			var location, query;
			app.use(function(req, res, next){
				if (!req.header('Referer') && location && location != req.url)
				{
					res.redirect(location);
					return;
				}
				if (req.url == '/search')
				{
					if (req.body.query)
						query = req.body.query
					else
						query = req.params.query
					location = '/search/'+query;
				}
				else
					location = req.url;
				next();
			});
			app.use(app.router);
			terminal.debug('Express application configured');
		});
		//start the routes
		web.routes(app);
		app.listen(port);
		terminal.log(('Server is now running on port ' + port).blue);
		// start the scrapers
		var cbScraper = this;
		scrapers.load(function(err, scraperCount){
			terminal.debug(scraperCount + ' scrapers initialized.');
			cbScraper(err)
		});
	},
	// Start the command prompt
	function running(err) {
		if (err)
			terminal.error(err, 'starting server');
		// Shell
		terminal.startRLInput();
		terminal.addRLHandle('*', 'echo', '', function(str, cb){
			terminal.log('You typed: ' + str);
			cb();
		});
		terminal.addRLHandle('*', 'exit', 'Shutdown LocalFox', function(str, cb){
			if (false && str != 'now') {
				terminal.warn('The following manga are being processed and have cancelled shutdown. To\n shutdown anyways, type "exit now".', true);
				cb();
			}
			else {
				terminal.log('Goodbye!');
				process.exit();
			}
		});
		terminal.addRLHandle('', 'scrapers', 'List the scrapers that are being used by LocalFox', function(str, cb){
			switch (str) {
				case 'rescan':
					scrapers.load(function(err, scraperCount){
						switch (scraperCount) {
							case 0:
								terminal.log('No new scrapers have been added.');
								break;
							case 1:
								terminal.log('1 new scraper has been added.');
								break;
							default:
								terminal.log(scraperCount + ' new scrapers have been added.');
						}
						cb();
					});
					break;
				default:
					terminal.log('The following scrapers are currently being used:');
					terminal.log(scrapers.listScrapers());
					terminal.log('If a scraper has been added since LocalFox was last started, it can be added\n manually by typing "'+'scrapers rescan'.magenta+'". LocalFox must be restarted to reload\n scrapers.');
					cb();
			}
		});
		terminal.addRLHandle('', 'debug', 'Show the status of debugging information', function(str, cb){
			switch (str) {
				case 'on':
					if (!terminal.isDebug()) {
						terminal.debugOn();
						terminal.log('Debugging is now ' + 'on'.yellow + '.');
					}
					else {
						terminal.log('Debugging is already ' + 'on'.yellow + '!');
					}
					break;
				case 'off':
					if (terminal.isDebug()) {
						terminal.debugOff();
						terminal.log('Debugging is now ' + 'off'.yellow + '.');
					}
					else {
						terminal.log('Debugging is already ' + 'off'.yellow + '!');
					}
					break;
				default:
					terminal.log('Debugging is currently ' + (terminal.isDebug() ? 'on' : 'off').yellow + '. To ' + (terminal.isDebug() ? 'disable' : 'enable') + ' debugging messages, type "' + ('debug ' + (terminal.isDebug() ? 'off' : 'on')).magenta + '"');
			}
			cb();
		});
		terminal.addRLHandle('*', 'scrape', '', function(str, cb){
			scrapers.scan(str, function(err, results){
				if (err) {
					if (err == -1)
						terminal.warn('Unable to find scraper');
					else
						terminal.error(err, 'Error in scraping');
					cb();
				}
				else {
					terminal.log(results);
					cb();
				}
			});
		});
		terminal.addRLHandle('*', 'add', '', function(str, cb){
			updater.updateManga(str, function(err, data){
				if (err) {
					console.log('Error in adding ' + str);
					console.log(err);
					cb();
					return;
				}
				console.log(str + ' was added successfully.');
				console.log(data);
				cb();
			});
		});
		terminal.addRLHandle('*', 'search', '', function(str, cb){
			var code = false;
			str = functions.trim(str);
			if (str.indexOf(' ') != -1 && str.split(' ')[0].length == 3) {
				str = str.split(' ');
				code = str[0];
				str[0] = '';
				str = str.join(' ').substr(1);
			}
			scrapers.search(str, function(err, results){
				if (err) {
					if (err == -1)
						terminal.warn('Unable to find scraper');
					else
						terminal.error(err, 'Error in scraping');
					cb();
				}
				else {
					terminal.log(results);
					cb();
				}
			}, code);
		});
		this();
	},
	function(err) {
		if (err)
			terminal.error(err, 'starting command line');
		updater.updateAll();
		this();
	},
	function done(err) {
		if (err)
			terminal.error(err, 'running first updates');
	}
);
