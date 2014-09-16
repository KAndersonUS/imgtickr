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
var connections = {};


app.engine('jade', require('jade').__express);
//app.use(express.logger('dev'));
app.set('view engine', 'jade');
app.use(logger());
app.use(express.static(__dirname));

app.use(function (req, res, next) {
	// limit concurrent IP requests to something reasonable, like 50 req/sec
	var ip = req.ip.replace(/\./g, "");
	if (connections.hasOwnProperty(ip)) {
		connections[ip].count += 1;
	} else {
		connections[ip] = {
			count : 1
		};
		var check = setInterval(function () {
			connections[ip].count--;
			if (connections[ip].count <= 0) {
				delete connections[ip];
				clearInterval(check);
			}
		},1000);
	}
	if (connections[ip].count > 50) {
		res.send(403, "Too many concurrent connections from your IP address, " + req.ip);
	} else {
		next();
	}
});

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
		openChannel(channel);
	}
	res.send(200, {members:channels[channel].members.length+1});
});

app.get('/close/:channel', function (req, res, next) {
	var channel = req.params.channel;
	var socketId = req.param('socketId');
	if (channels[channel].members.length <= 0) {
		delete channels[channel];
	}
	res.send(200);
});

app.get('/stats/:area', function (req, res, next) {

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
			if (fields.handle && fields.handle.length == 13) {
				for (file in files) {
					processImage(files[file].path, fields.handle, function (err, encLine) {
						if (err) { console.log(err); }
						else {
							if (!channels.hasOwnProperty(channel)) {
								openChannel(channel);
							}
							channels[channel].socket.emit(channel + "line", encLine);
						}
					});
				}
				res.writeHead(200);
				res.end();
			} else {
				res.send(403, "Bad handle");
			}


		}
	});

});


server.listen(80);

function openChannel (channel) {
	channels[channel] = {
		socket : null,
		members : {}
	};
	channels[channel].socket = io.of("/channels/" + channel);
	channels[channel].socket.on('connect', function (socket) {
		var socketId = socket.id;
		channels[channel].members[socketId] = {
			uploadTimer : 0,
			ttl : 30,
			pings : [],
			uploads : 0,
			updateTtl : function () {
				this.ttl = this.ttl - (this.pings.length * 5);
				if (this.ttl < 0) {
					// kill member if ttl is below 0
					io.sockets.emit(channel + "members", Object.getOwnPropertyNames(channels[channel].members).length);
					delete this;
				}
			}
		};

		channels[channel].socket.emit(channel + "members", Object.getOwnPropertyNames(channels[channel].members).length);

		var pinger = setInterval(function () {
			var testString = randomString(16);
			channels[channel].members[socketId].pings.push(testString);
			socket.emit('ping', {testString:testString});
		},5000);

		socket.on('pingback', function (data) {
			channels[channel].members[socketId].pings = channels[channel].members[socketId].pings.filter(function (item) {
				return item != data.testString;
			});
			channels[channel].members[socketId].updateTtl();
		});
		socket.on('disconnect', function () {
			clearInterval(pinger);
			delete channels[channel].members[socketId];
			channels[channel].socket.emit(channel + "members", Object.getOwnPropertyNames(channels[channel].members).length);
		});
	});
}


function randomString (length) {
	var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUFWXYZ0123456789";
	var string = "";
	for (var i=0; i < length; i++) {
		string += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return string;
}


function processImage (file, watermark, cb) {
	var image = [];
	var row = [];
	var rowPart = [];
	var processDone = new events.EventEmitter();
	gm(file)
		.resize(130, 130, "!")
		.font("./cour.ttf")
		.fontSize(12)
		.fill("rgba(0,0,0,0.1)")
		.drawText(2, 125, watermark)
		.fill("rgba(255,255,255,0.1)")
		.drawText(3, 126, watermark)
		.rotate("#FFFFFF",-90)
		.setFormat('RGB')
		.stream(function (err, stdout, stderr) {
			stderr.pipe(process.stderr);
			stdout.on('data', function (data) {
				var rawData = JSON.stringify(data);
				var rawDataArr = JSON.parse(rawData);
				while (rawDataArr.length > 0) {
					if (row.length == 130) {
						image.push(row);
						row = [];
					}
					var pixel = rawDataArr.splice(0,3);
					while (pixel.length > 0) {
						rowPart.push(pixel.shift());
						if (rowPart.length == 3) {
							row.push(rowPart);
							rowPart = [];
						}
					}
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

function encodeLine (line) {
	// Line data: [ [ [pos1, pos2, posN...],[r,g,b] ] ]
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