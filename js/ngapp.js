var imgtickr = angular.module('imgtickr', [
	'imgtickrControllers',
	'imgtickrDirectives'
]);

imgtickr.factory('api', ['$http', function ($http) {
	return {
		upload : function (formData, channel, handle) {
			return $http({
				url: "/upload/" + channel,
				method: "POST",
				transformRequest: function (data) {
					console.log(data);
					var formData = new FormData();
					formData.append('file', data);
					formData.append('handle', handle);
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
				method: "POST"
			})
		}
	}
}]);