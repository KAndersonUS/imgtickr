/**
 * Created by kanderson on 6/25/2014.
 */
var gm = require('gm');
var express = require('express');
//var multiparty = require('multiparty');
var formidable = require('formidable');
var util = require('util');
var logger = require('morgan');
var fs = require('fs');
var events = require('events');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var channels = {};

io.on('connection', function (socket) {
	console.log('socket connected');
});

app.engine('jade', require('jade').__express);
//app.use(express.logger('dev'));
app.set('view engine', 'jade');
app.use(logger());
app.use(express.static(__dirname));

app.get('/', function (req, res, next) {
	res.sendfile('./index.html');
	next();
});

app.get('/js/:name', function (req, res, next) {
	res.sendfile('./js/' + req.param('name'));
	next();
});

app.get('/css/:name', function (req, res, next) {
	res.sendfile('./css/' + req.param('name'));
	next();
});

app.get('/open/:channel', function (req, res, next) {
	var channel = req.params.channel;
	if (!channels.hasOwnProperty(channel)) {
		// if channel doesn't exist, create it.
		channels[channel] = {
			socket : null,
			members : 0
		};
		channels[channel].socket = io.of("/channels/" + channel);
		channels[channel].members = 1;
	} else {
		channels[channel].members++;
	}
	res.send(200);
});

app.get('/close/:channel', function (req, res, next) {
	var channel = req.params.channel;
	channels[channel].members--;
	if (channels[channel].members <= 0) {
		delete channels[channel];
	}
	res.send(200);
});

app.post('/upload/:channel', function (req, res, next) {
	var form = new formidable.IncomingForm();
	var channel = req.param('channel');
	form.parse(req, function (err, fields, files) {
		if (err) {
			console.log(err);
			res.writeHead(503, err);
			res.end();
		} else {
//			console.log(files);
			for (file in files) {
				processImage(files[file].path, function (err, encLine) {
					if (err) { console.log(err); }
					else {
						channels[channel].socket.emit(channel, encLine);
					}
				});
			}
			res.writeHead(200);
			res.end();
		}
	});
});

server.listen(80);



function processImage (file, cb) {
	var image = [];
	var row = [];
	var rowPart = [];
	var processDone = new events.EventEmitter();
	gm(file)
		.size(function (err, size) {
			if (err) {
				console.log(err);
				cb(err);
			} else {
				this.resize(130, 130, "!");
				this.rotate("#FFFFFF",-90);
				this.flip();
				this.setFormat('RGB');
				this.stream(function (err, stdout, stderr) {
					stdout.on('data', function (data) {
//						cb(null, data);
						var rawData = JSON.stringify(data);
						var rawDataArr = JSON.parse(rawData);
						while (rawDataArr.length > 0) {
							if (row.length == 130) {
								image.push(row);
								row = [];
							}
							var pixel = rawDataArr.splice(0,3);
//							if (pixel.length != 3) {
							while (pixel.length > 0) {
								rowPart.push(pixel.shift());
								if (rowPart.length == 3) {
									row.push(rowPart);
									rowPart = [];
								}
							}
//							}
						}
						if (image.length == 130-1) {
							image.push(row);
							if (image.length == 130 && image[130 - 1].length == 130) {
								processDone.emit('done');
							}
						}
					});
					processDone.on('done', function () {
						// push each line from the image
						// image should be 130x130 array
						for (var i = image.length-1; i >= 0; i--) {
							// start at the end of the image and work our way back
							var line = [];
							for (var j = 0; j < image[i].length; j++) {
								// but start at the top of each column
								line.push(image[i][j]);
							}
							cb(null, encodeLine(line));
						}
					});
				});
			}
		});
}

function encodeLine (line) {
	// Line data: [ n,[r,g,b] ], [ [ [pos1, pos2, posN...],[r,g,b] ] ]
	var colors = {};
	var encLine = [];
	for (var i=0; i < line.length; i++) {
		// if colors is obj
		var prop = line[i].toString().replace(/,/g, "");
		if (!colors.hasOwnProperty(prop)) {
			colors[prop] = {};
			colors[prop].color = line[i];
			colors[prop].positions = [];
		}
		colors[prop].positions.push(i);
	}
	// convert it to a lineData array.
//	console.log(colors);
	for (var color in colors) {
		if (colors.hasOwnProperty(color)) {
			encLine.push([colors[color].positions, colors[color].color]);
		}
	}
	// note that this does NOT do any good for the repeated colors.
	return encLine;
}