var imgtickr = angular.module('imgtickr', [
	'imgtickrControllers',
	'imgtickrDirectives'
]);

imgtickr.factory('api', ['$http', function ($http) {
	return {
		upload : function (formData, channel) {
			return $http({
				url: "/upload/" + channel,
				method: "POST",
				transformRequest: function (data) {
					var formData = new FormData();
					formData.append('file', data);
//					for (var key in data) {
//						if (data.hasOwnProperty(key)){
//							if (key == 'file') {
//								console.log('found file: ' + data[key]);
//								formData.append("file", data[key]);
//							} else {
//								formData.append(key, angular.toJson(data[key]));
//							}
//						}
//					}
					return formData;
				},
				headers: {'Content-Type':undefined},
				data: formData
			})
		},
		openChannel : function (channel) {
			return $http({
				url: "/open/" + channel,
				method: "GET"
			})
		},
		closeChannel : function (channel) {
			return $http({
				url: "/close/" + channel,
				method: "GET"
			})
		}
	}
}]);