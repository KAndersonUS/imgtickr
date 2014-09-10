/**
 * Created by kanderson on 7/6/2014.
 */

var socket = io('http://' + window.location.host);

var position = 0;
var maxPosition = window.innerHeight;

$(window).on('resize', function () {
	maxPosition = window.innerHeight;
	canvases = document.getElementsByTagName('canvas');
	canvases.height = maxPosition;
	console.log('resize');
});


socket.on('line', function (data) {
	// break down array into bytes and draw
	var line = JSON.parse(data);
	if (line.length != 130) {
		console.log(line.length);
	}
//	console.log(line);
	printLine(line, position);
	if (position == maxPosition) {
		position = 0;
	} else {
		position++;
	}

	function printLine (line, position) {
		for (var i = 0; i < line.length; i++) {
			var pixelSize = 1;
			var x = i*pixelSize;
			var y = position*pixelSize;
			var tickerCanvas = document.getElementById('tickr');
			var tickerContext = tickerCanvas.getContext('2d');
			tickerContext.fillStyle = 'rgb(' + line[i][0] + ', ' + line[i][1] + ', ' + line[i][2] + ')';
			tickerContext.fillRect(x, y, pixelSize, pixelSize);
		}
	}
});

$(document).ready(function () {
	var canvas = document.createElement('canvas');
	canvas.height = maxPosition;
	canvas.width = 130;
	canvas.id = "tickr";
	var body = document.getElementsByTagName("body")[0];
	var dropzone = $('#dropzone');
	dropzone.height = maxPosition;
	dropzone.width = 130;
	dropzone.fileUpload({
		url : '/upload',
		autoUpload : true,
		dropZone : dropzone
	});
	dropzone.append(canvas);
	dropzone.bind('fileuploadadd', function (e, data) {
		console.log(e);
		console.log("file added");
	});
	dropzone.bind('fileuploadsubmit', function (e, data) {
		console.log("file submitted");
	});

	$(document).bind('drop dragover', function (e) {
		e.preventDefault();
	});

	$(document).bind('dragover', function (e) {
		e.preventDefault();
		var dropZone = $('#dropzone'),
			timeout = window.dropZoneTimeout;
		if (!timeout) {
			dropZone.addClass('in');
		} else {
			clearTimeout(timeout);
		}
		var found = false,
			node = e.target;
		do {
			if (node === dropZone[0]) {
				found = true;
				break;
			}
			node = node.parentNode;
		} while (node != null);
		if (found) {
			dropZone.addClass('hover');
		} else {
			dropZone.removeClass('hover');
		}
		window.dropZoneTimeout = setTimeout(function () {
			window.dropZoneTimeout = null;
			dropZone.removeClass('in hover');
		}, 100);
	});
});

function upload () {

//	formData.append('file', document.getElementById('file').files[0]);

	$.ajax({
		url : '/upload',
		type : 'POST',
		data : formData,
		contentType : false,
		processData : false
	})
}

