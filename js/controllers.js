var imgtickrControllers = angular.module('imgtickrControllers', []);

imgtickrControllers.controller('mainCtrl', ['$scope', 'api', function ($scope, api) {
	$scope.upload = function (formData, channel) {
		api.upload(formData, channel);
	};

	$scope.openChannels = {};
	$scope.openChannelNames = [];

	$scope.openChannel = function (channel) {
		// TODO: check that channel isn't already open.
		console.log(channel);
		api.openChannel(channel).success(function () {
			var socket = io.connect('http://' + window.location.host + '/channels/' + channel);
			socket.on('connect', function () {
				// create channel element
				$scope.openChannelNames.push(channel);
				console.log($scope.openChannelNames);
				$scope.$apply();
			});
			socket.on('disconnect', function () {
				// destroy the channel element, but with some safeguards so random disconnects don't fuck with users.
				$scope.openChannelNames.splice($scope.openChannelNames.indexOf(channel));
			});
			socket.on(channel, function (data) {
//				console.log(data);
				$scope.$broadcast(channel, decodeLine(data));
			});
			$scope.openChannels[channel] = socket;
		});
	};

	$scope.openChannel('public');

	function decodeLine (lineData) {
		// Line data: [ n,[r,g,b] ], [ [ [pos1, pos2, posN...],[r,g,b] ] ]
		var line = [];
		for (var i=0; i < lineData.length; i++) {
//			console.log(lineData.length);
//			if (typeof lineData[i][0] == 'array') {
				// we're getting specific position values for this color.
				for (var posIndex = 0; posIndex < lineData[i][0].length; posIndex++) {
					line[lineData[i][0][posIndex]] = lineData[i][1];
				}
//			} else if (typeof lineData[i][0] == 'number') {
				// we're getting a pixel repeated n times in a row, starting from i
//				var pos = Number(i);
//				var count = 0;
//				do {
//					line[pos] = lineData[i][0];
//					pos++;
//					count++;
//				} while (count < lineData[i][0]);
//			}
		}
//		console.log(lineData);
//		console.log(line);
		return line;
	}
}]);
