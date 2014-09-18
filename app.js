/**
 * Created by kanderson on 6/25/2014.
 */

var fs = require('fs');
var util = require('util');
var formidable = require('formidable');

var express = require('express');
var logger = require('morgan');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var processImage = require('./processImage.js');

var clients = {};
var connections = {};
var channels = {};
var channelMeta = {
	join : function (channel) {
		channels[channel].members++;
	},
	leave : function (channel) {
		channels[channel].members--;
		if (channels[channel].members <=0) {
			delete channels[channel];
		}
	},
	notify : function () {
		io.sockets.emit('channelMeta', channels);
	}
};

// express middleware
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

// REST API
app.get('/open/:channel', function (req, res, next) {
	var channel = req.params.channel;
	var all = [];

	if (channel && typeof channel == "string") {
		channel.replace(/\W|[0-9]+/g, "", "g").trim().toLowerCase();
		if (!channels.hasOwnProperty(channel)) {
			// if channel doesn't exist, create it.
			openChannel(channel);
		}
	} 	// no else statement, since the rest is taken care of in socket events

	for (var chan in channels) {
		if (channels.hasOwnProperty(chan)) {
			all.push({channel:chan, members:channels[chan].members});
		}
	}
	res.send(200, {
		members : channels[channel].members,
		all : all
	});
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
				for (var file in files) {
					processImage(files[file].path, fields.handle, function (err, encLine) {
						if (err) { console.log(err); }
						else {
							if (!channels.hasOwnProperty(channel)) {
								openChannel(channel);
							}
							io.to(channel).emit(channel + "line", encLine);
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

app.get('/stats/:area', function (req, res, next) {
	// TODO: this
});

// socket callbacks
io.on('connection', function (socket) {
	var clientId = socket.id;
	if (clients.hasOwnProperty(clientId)) {
		socket.emit('handle', clients[clientId].handle);
	} else {
		// if client doesn't exist yet
		clients[clientId] = {
			handle : randomString(13),
			socket : socket,
			uploadTimer : 0,
			ttl : 30,
			pings : [],
			channels : [],
			uploads : 0,
			updateTtl : function () {
				this.ttl = this.ttl - (this.pings.length * 5);
				if (this.ttl < 0) {
					// kill member if ttl is below 0
					this.disconnect();
				}
			},
			pinger : setInterval(function () {
				var testString = randomString(16);
				try {
					clients[clientId].pings.push(testString);
				} catch (err) {
					console.log(err);
				}
				socket.emit('ping', {testString:testString});
			},5000),
			openChannel : function (channel) {
				this.socket.join(channel);
				channelMeta.join(channel);
				channelMeta.notify();
				// add channel to client's channels array
				if (this.channels.indexOf(channel) == -1) {
					this.channels.push(channel);
				}
			},
			closeChannel : function (channel) {
				// remove channel from client's channels array.
				this.socket.leave(channel);
				channelMeta.leave(channel);
				channelMeta.notify();
				if (this.channels.indexOf(channel) != -1) {
					this.channels.splice(this.channels.indexOf(channel),1);
				}
			},
			disconnect : function () {
				clearInterval(this.pinger);
				for (var i=0; i<this.channels.length; i++) {
					// decrement all subscribed channel's member counts
					channelMeta.leave(this.channels[i]);
				}
				channelMeta.notify();
				delete this;
			}
		};
		clients[clientId].socket.on('pingback', function (data) {
			clients[clientId].pings = clients[clientId].pings.filter(function (item) {
				return item != data.testString;
			});
			clients[clientId].updateTtl();
		});
		clients[clientId].socket.on('disconnect', function () {
			clients[clientId].disconnect();
		});
		clients[clientId].socket.on('join', function (channel) {
			clients[clientId].openChannel(channel);
		});
		clients[clientId].socket.on('leave', function (channel) {
			clients[clientId].closeChannel(channel);
		});
		// send the assigned handle back
		clients[clientId].socket.emit('handle', clients[clientId].handle);
	}
});


server.listen(80);


// helper functions
function openChannel (channel) {
	channels[channel] = {
		members : 0
	};
}

function randomString (length) {
	var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUFWXYZ0123456789";
	var string = "";
	for (var i=0; i < length; i++) {
		string += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return string;
}