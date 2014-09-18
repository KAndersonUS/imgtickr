var imgtickrControllers = angular.module('imgtickrControllers', []);

imgtickrControllers.controller('mainCtrl', ['$scope', 'api', function ($scope, api) {
	$scope.client = {
		handle : "",
		socket : io.connect('http://' + window.location.host + '/')
	};

	$scope.client.socket.on('ping', function (data) {
		$scope.client.socket.emit('pingback', {
			testString : data.testString
		});
	});
	$scope.client.socket.on('disconnect', function (data) {
		// TODO: show that the server connection is not there
	});
	$scope.client.socket.on('handle', function (data) {
		$scope.client.handle = data;
		$scope.$apply();
	});
	$scope.client.socket.on('channelMeta', function (channels) {
		var all = [];
		for (var chan in channels) {
			if (channels.hasOwnProperty(chan)) {
				var obj = {
					channel : chan,
					members : channels[chan].members
				};
				all.push(obj);
				if ($scope.channels.openChannels.hasOwnProperty(chan)) {
					$scope.channels.openChannels[chan].members = channels[chan].members;
				} else {
					$scope.channels.openChannels[chan] = obj;
				}
			}
		}
		$scope.channels.all = all;
		$scope.$apply();
	});

	$scope.upload = function (formData, channel) {
		// TODO: pass upload code via socket to be matched on upload (to prevent handle spoofing)
		api.upload(formData, channel, $scope.client.handle);
	};

	$scope.channels = {
		openChannels : {},
		openChannelNames : [],
		open : function (channel) {
			if (this.openChannelNames.indexOf(channel) == -1) {
				api.openChannel(channel).success(function (data, status) {
					if ($scope.channels.openChannelNames.indexOf(channel) == -1) {
						$scope.channels.openChannelNames.splice(0,0,channel);
						$scope.client.socket.emit('join', channel);
						$scope.client.socket.on(channel + "line", function (data) {
							$scope.$broadcast(channel + "line", decodeLine(data));
						});
					}

					$scope.channels.all = data.all;
					$scope.channels.openChannels[channel] = {
						members : data.members
					};
					$scope.channels.toOpen = "";
				}).error(function (err) {
					console.log(err);
				});
			}
		},
		close : function (channel) {
			$scope.client.socket.emit('leave', channel);
			$scope.channels.openChannelNames.splice($scope.channels.openChannelNames.indexOf(channel), 1);
			delete $scope.channels.openChannels[channel];
		},
		toOpen : "",
		all : []
	};

	$scope.channels.open('pub');

	if (window.localStorage.hasOwnProperty('imgTickr_chans')) {
		var storedChans = JSON.parse(window.localStorage.imgTickr_chans);
		for (var i=0; i<storedChans.length; i++) {
			$scope.channels.open(storedChans[i]);
		}
	}

	$scope.$watch('channels.openChannelNames', function () {
		window.localStorage['imgTickr_chans'] = JSON.stringify($scope.channels.openChannelNames);
	});

	$scope.$watch('channels.toOpen', function () {
		if ($scope.channels.toOpen) {
			$scope.channels.toOpen = $scope.channels.toOpen.replace(/\W|[0-9]|\s+/g, "", "g").trim().toLowerCase();
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
}]);
