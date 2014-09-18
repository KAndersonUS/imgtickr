var gm = require('gm');
var events = require('events');

module.exports = function processImage (file, watermark, cb) {
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