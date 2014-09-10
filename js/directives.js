var imgtickrDirectives = angular.module('imgtickrDirectives', []);

imgtickrDirectives.directive('tickr', function () {
	return {
		restrict: 'C',
		scope: {
			channel : "="
		},
		templateUrl : 'tickr.html',
		link: function (scope, elem, attrs) {
			var canvas = elem.find("canvas")[0];
			var context = canvas.getContext('2d');
			console.log(scope.channel);
			scope.file = null;
			scope.upload = scope.$parent.upload;

			canvas.width = elem.width();
			scope.x = canvas.width;

			scope.$on(scope.channel, function (event, data) {
//				console.log(data);
//				canvas.width = canvas.width + 1;
				scope.x--;
				if (scope.x < 0) {
					scope.x = canvas.width;
				}
//				context.translate(-1, 0);
				printLine(data, context, canvas.width);
			});

			function printLine (line, context, width) {
				for (var i = 0; i < line.length; i++) {
					var pixelSize = 1;
					var x = scope.x;
					var y = i*pixelSize;
					context.fillStyle = 'rgb(' + line[i][0] + ', ' + line[i][1] + ', ' + line[i][2] + ')';
					context.fillRect(x, y, pixelSize, pixelSize);
				}
			}
		}
	}
});

//http://uncorkedstudios.com/blog/multipartformdata-file-upload-with-angularjs
imgtickrDirectives.directive('fileModel', ['$parse', function ($parse) {
	return {
		restrict: 'A',
		link: function (scope, elem, attrs) {
			var model = $parse(attrs.fileModel);
			var modelSetter = model.assign;
			elem.bind('change', function (){
				scope.$apply(function () {
					modelSetter(scope, elem[0].files[0]);
				})
			})
		}
	}
}]);