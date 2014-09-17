var imgtickrControllers = angular.module('imgtickrControllers', []);

imgtickrControllers.controller('mainCtrl', ['$scope', 'api', function ($scope, api) {
	$scope.upload = function (formData, channel) {
		// TODO: pass upload code via socket to be matched on upload (to prevent handle spoofing)
		api.upload(formData, channel, $scope.handle);
	};

	$scope.handle = "";
	$scope.openChannels = {};
	$scope.openChannelNames = [];
	$scope.openChannelMembers = {};

	$scope.channels = {
		open : function (channel) {
			if ($scope.openChannelNames.indexOf(channel) == -1) {
				api.openChannel(channel).success(function (data, status) {
					console.log(status);
					var socket = io.connect('http://' + window.location.host + '/channels/' + channel);
					console.log(socket);
					if (!socket._callbacks.hasOwnProperty('ping')) {
						socket.on('ping', function (data) {
							socket.emit('pingback', {
								testString : data.testString
							});
						});
						socket.on('connect', function () {
							if ($scope.openChannelNames.indexOf(channel) == -1) {
								$scope.openChannelNames.splice(0,0,channel);
								$scope.$apply();
							}
							// TODO: make openChannelNames array reflect openChannels object via watch / Object.getOwnPropertyNames()
						});
						socket.on('disconnect', function (data) {
							// TODO: show that the server connection is not there
						});
						socket.on(channel + "line", function (data) {
							$scope.$broadcast(channel + "line", decodeLine(data));
						});
						socket.on(channel + 'members', function (data) {
							$scope.openChannels[channel].members = data;
							$scope.$apply();
						});
						socket.on('handle', function (data) {
							$scope.handle = data;
							$scope.$apply();
						});
					}

					socket.connect();
					$scope.openChannels[channel] = {
						socket : socket,
						members : data.members
					};
					$scope.openChannelNames.splice(0,0,channel);
					console.log($scope.openChannels);
					$scope.channels.toOpen = "";
				}).error(function (err) {
					console.log(err);
				});
			}
		},
		close : function (channel) {
			console.log($scope.openChannels[channel].socket);
//			$scope.openChannels[channel].socket.disconnect();
			api.closeChannel(channel).success(function (data, status) {
				$scope.openChannelNames.splice($scope.openChannelNames.indexOf(channel), 1);
				delete $scope.openChannels[channel];
				console.log($scope.openChannels);
			}).error(function (err) {
				console.log(err);
			});
		},
		toOpen : "",
		search : function () {
			// TODO: Search channels
		}
	};

	$scope.channels.open('pub');
	// TODO: store open channels in localStorage

	$scope.$watch('channels.toOpen', function () {
		if ($scope.channels.toOpen) {
			$scope.channels.toOpen = $scope.channels.toOpen.replace(/\W+/g, "", "g").trim().toLowerCase();
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
