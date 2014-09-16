var imgtickrControllers = angular.module('imgtickrControllers', []);

imgtickrControllers.controller('mainCtrl', ['$scope', 'api', function ($scope, api) {
	$scope.upload = function (formData, channel) {
		api.upload(formData, channel, $scope.handle);
	};

	$scope.handle = randomString(13);

	$scope.openChannels = {};
	$scope.openChannelNames = [];
	$scope.openChannelMembers = {};

	$scope.channels = {
		open : function (channel) {
			if ($scope.openChannelNames.indexOf(channel) == -1) {
				api.openChannel(channel).success(function (data) {
					var socket = io.connect('http://' + window.location.host + '/channels/' + channel);
					socket.on('connect', function () {
						// create channel element
						$scope.openChannelNames.push(channel);
						// TODO: make openChannelNames array reflect openChannels object via watch / Object.getOwnPropertyNames()
						$scope.$apply();
					});
					socket.on('disconnect', function () {
						// destroy the channel element, but with some safeguards so random disconnects don't fuck with users.
						$scope.openChannelNames.splice($scope.openChannelNames.indexOf(channel));
					});
					socket.on(channel + "line", function (data) {
						$scope.$broadcast(channel + "line", decodeLine(data));
					});
					socket.on(channel + 'members', function (data) {
						$scope.openChannels[channel].members = data;
						$scope.$apply();
					});
					socket.on('ping', function (data) {
						socket.emit('pingback', {
							testString : data.testString
						});
					});
					$scope.openChannels[channel] = {
						socket : socket,
						members : data.members
					};
					$scope.channels.toOpen = "";
				});
			}
		},
		toOpen : "",
		search : function () {
			// TODO: Search channels
		}
	};

	$scope.channels.open('public');

	$scope.$watch('channelToOpen', function () {
		if ($scope.channels.toOpen) {
			$scope.channels.toOpen = $scope.channels.toOpen.replace(/\W+/g, "", "g").trim();
		}
	});

	function decodeLine (lineData) {
		// Line data: [ [ [pos1, pos2, posN...],[r,g,b] ] ]
		var line = [];
		for (var i=0; i < lineData.length; i++) {
			for (var posIndex = 0; posIndex < lineData[i][0].length; posIndex++) {
				line[lineData[i][0][posIndex]] = lineData[i][1];
			}
		}
		return line;
	}

	function randomString (length) {
		var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUFWXYZ0123456789";
		var string = "";
		for (var i=0; i < length; i++) {
			string += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return string;
	}
}]);
