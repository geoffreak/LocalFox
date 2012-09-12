// includes/mongoose.js
// Handles mongoose schema
// LocalFox v4 © Joshua "geoffreak" DeVinney 2011

//Mongoose connection and schema
var mongoose = require('mongoose');
var functions = require('./functions'),
	terminal = require('./terminal');
	
mongoose.connect('mongodb://localhost/v4')
var Schema = mongoose.Schema;

var PageSchema = new Schema({
	number:	Number,
	file: String
});
var ChapterSchema = new Schema({
	url: {type: String, unique: true},
	uri: {type: String},
	title: String,
	chapter: {type: String, get: functions.parseFloatIfPossible, set: zeroPadded},
	volume: {type: String, get: functions.parseFloatIfPossible, set: zeroPadded},
	date: {type: Date, default: Date.now},
	pageCount: {type: Number, default: 0},
	pages: [PageSchema],
	isRead: {type: Boolean, default: false},
	downloaded: {type: Boolean, default: false},
});
var MangaSchema = new Schema({
	title: String,
	uri: {type: String, unique: true},
	lastCheck: {type: Date, default: Date.now},
	lastUpdate: {type: Date, default: Date.now},
	genres: [String],
	description: String,
	chapterCount: {type: Number, default: 0},
	status: {type: String, enum: ['completed', 'ongoing'], set: toLower, get: toCamel},
	cover: String,
	hasUnread: {type: Boolean, default: false}
});


var Manga = mongoose.model('Manga', MangaSchema);
var Chapter = mongoose.model('Chapter', ChapterSchema);

function toLower(text){
	return text.toLowerCase();
}
function toCamel(text){
	return text ? text.substr(0, 1).toUpperCase() + text.substr(1) : '';
}

function zeroPadded(number){
	var num = number ? parseFloat(number) : 0;
	var decimal = num % 1;
	num -= decimal;
	var str = '' + num;
	while (str.length < 5) 
		str = '0' + str;
	if (decimal > 0) {
		decimal = "" + decimal;
		decimal = decimal.substr(decimal.indexOf('.') + 1);
	}
	else 
		decimal = '';
	return str + '.' + decimal;
}