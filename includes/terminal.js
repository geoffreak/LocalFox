// includes/terminal.js
// Handles terminal interaction and debugging
// LocalFox v4 © Joshua "geoffreak" DeVinney 2011

// Includes
var colors = require('colors'),
	readline = require('readline'),
	util = require('util');

// Variables
var debugOn = true,
	promptRunning = false,
	handles = {
		'*':	{},
		'':		{}
	}, 
	rl, 
	mode = '', 
	modeStack = [];

/* 
** Function: uncaughtExceptionHandler
** Handles uncaught exceptions, then exits
*/
process.on('uncaughtException', function uncaughtExceptionHandler(err) {
	error(err, 'Uncaught exception!');
	exports.warn('The application has encountered a critical error and will now exit.', true);
	process.exit();
});

/* 
** Function: startRLInput
** Starts input from the command line and holds the line handler function
*/
exports.startRLInput = function(){
	rl = readline.createInterface(process.stdin, process.stdout, null);
	rl.on('line', function(line){
		exports.pauseRLInput();
		if (line){
			var key = line.indexOf(' ') != -1 ? line.substr(0, line.indexOf(' ')) : line;
			var str = line.substr(key.length) ? line.substr(key.length + 1) : '';
			var cb = function(){ exports.resumeRLInput(); }
			if (key == 'help') { //display help
				if (str && (handles[mode][str] || handles['*'][str]) && (handles[mode][str] || handles['*'][str]).help) {
					log(str.magenta + ': ' + (handles[mode][str] || handles['*'][str]).help);
				}
				else {
					var arr = [];
					for (k in handles[mode]) {
						if (handles[mode][k].help) {
							var i = 0;
							while (i <= arr.length && k > (arr[i] || -Infinity)) {                            
								i++;
							}                   
							arr.splice(i, 0, k);
						}
					}
					for (k in handles['*']) {
						if (handles['*'][k].help) {
							var i = 0;
							while (i <= arr.length && k > (arr[i] || -Infinity)) {                            
								i++;
							}                   
							arr.splice(i, 0, k);
						}
					}
					var out = '';
					for (var i = 0; i < arr.length; i++) {
						if (out != '') out += ', ';
						out += ('' + arr[i]).magenta;
					}
					log('Here are the following commands that can currently be used. For more info on\n any command, type "help <command>" where <command> is any command below:\n  ' + out + '');
				}
				exports.resumeRLInput();
			}
			else if (handles[mode][key]) { //try mode given handle
				handles[mode][key].handle(str, cb);
			}
			else if (handles['*'][key]) { //try global given handle
				handles['*'][key].handle(str, cb);
			}
			else if (handles[mode]['']) { //try mode default handle
				handles[mode][''].handle(line, cb);
			}
			else { //do nothing
				terminal.log('Unknown command "' + line.yellow + '". Type "help" for instructions at any time.');
				exports.resumeRLInput();
			}
		}
		else
			exports.resumeRLInput();
	});
	log('Starting up the command line. Type "help" for instructions at any time.');
	promptRunning = true; 
	rl.prompt(); 
}

/* 
** Function: pauseRLInput
** Pauses input from the command line
*/
exports.pauseRLInput = function(){ 
	rl.pause(); 
	promptRunning = false;  
}

/* 
** Function: resumeRLInput
** Resumes input from the command line, adding back anything that was typed before
*/
exports.resumeRLInput = function(){ 
	rl.resume(); 
	rl.prompt(); 
	promptRunning = true;  
}

/* 
** Function: addRLHandle
** Registers a readline handle under a mode
** @params
**		mode:	a string of the mode to register the key under [no duplicate modes]
**				an empty string is the root mode at the top of the mode stack
**				a '*' is a global mode and all handles assigned to this mode will be checked after mode's handles
**		key:	a string of the key that will be the first word of input [unique to a mode, no spaces]
**				if provided the same key/mode combo, the second will replace first
**				an empty string is the default handler for when there is no handle [default's default: no action]
**		help:	a string with instructions how to use command, shown when user types "help" in mode
**				leave blank to hide from help command
**		handle:	the function to be called when key is triggered
*/
exports.addRLHandle = function(mode, key, help, handle){
	if (!handles[mode]) handles[mode] = {};
	handles[mode][key] = {
		handle: handle,
		help: help
	};
}

/* 
** Function: setRLMode
** Sets the current mode and handles movement on the mode stack
** @params
**		mode:	a string of the mode to have the line handler look for keys under
*/
exports.setRLMode = function(m){
	if (mode == m || mode == '*') //don't do anything when changing to the same mode or global mode
		return;
	if (modeStack.indexOf(mode) != -1) { //this mode is a higher mode, so jump up to that
		while (mode != m) 
			mode = modeStack.pop();
	}
	else { //we need to go deeper
		modeStack.push(mode);
		mode = m;
	}
}

/* 
** Function: prevRLMode
** Returns to the previous mode 
*/
exports.prevRLMode = function(){
	if (modeStack.length == 0)
		return;
	exports.mode(modeStack[modeStack.length - 1]);
}

/* 
** Function: log
** Logs a message to the console, pausing and unpausing the prompt around it
** @params
**		msg:	a message to be logged to the console
*/
exports.log = log = function(msg){ 
	var runningBefore = promptRunning;
	if (promptRunning) { 
		console.log('');
		exports.pauseRLInput();
	}
	console.log(msg); 
	if (runningBefore)
		exports.resumeRLInput();
}

/* 
** Function: timeLog
** Logs a message with timestamp to the console, pausing and unpausing the prompt around it
** @params
**		msg:	a message to be logged to the console
*/
timeLog = function(str){ //output with timestamp
	var runningBefore = promptRunning;
	if (promptRunning) { 
		console.log('');
		exports.pauseRLInput();
	}
	util.log(str);
	if (runningBefore)
		exports.resumeRLInput();
}

/* 
** Function: warn
** Helper function to log a warning message in red to the console, with optional preceding "WARNING: "
** @params
**		str:			a string warning to be logged to the console
**		hideWarning:	an optional boolean if false will add "WARNING: " in front of message
*/
exports.warn = function(str, hideWarning){
	log((!hideWarning ? 'Warning: '.bold.red : '') + str.red);
}

/* 
** Function: debug
** Helper function to log a debugging message in grey with preceding timestamp and yellow "DEBUG: "
**		messages will not be displayed when not in debug mode
** @params
**		str:	a string debugging message to be logged to the console
*/
exports.debug = function(str){ 
	if (!debugOn) return;
	timeLog('DEBUG: '.yellow+str.grey);
}

/* 
** Function: error
** Helper function to log an error message in red with preceding timestamp and red "ERROR: "
** @params
**		err:	an error object to print the stack of
**		msg:	a string error message to be logged to the console
*/
exports.error = error = function(err, msg){ 
	timeLog('ERROR: '.bold.red + msg.bold.red + '\n' + err.stack.red);
}

/* 
** Function: debugOn
** Turns on debug mode, to enable debug messages
*/
exports.debugOn = function(){
	debugOn = true;
}

/* 
** Function: debugOff
** Turns off debug mode, to disable debug messages
*/
exports.debugOff = function(){
	debugOn = false;
}

/* 
** Function: isDebug
** Returns true if debugging messages turned on, else false
** @return
**		boolean status of debugging
*/
exports.isDebug = function(){ return debugOn; }
