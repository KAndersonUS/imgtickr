var imgtickrDirectives = angular.module('imgtickrDirectives', []);

$(document).bind('keydown, keypress', function (e) {
	$('#toOpen').focus();
});

imgtickrDirectives.directive('tickr', function () {
	return {
		restrict: 'C',
		scope: {
			channel : "=",
			members : "="
		},
		templateUrl : 'tickr.html',
		link: function (scope, elem, attrs) {
			var printer = elem.find(".tickrTapePrinter");
			var canvas = elem.find("canvas")[0];
			var context = canvas.getContext('2d');

			scope.file = null;
			scope.upload = scope.$parent.upload;
			scope.close = scope.$parent.channels.close;

			canvas.width = elem.width()-55;

			$(window).on('resize', function (e) {
				canvas.width = elem.width()-55;
				scope.x.advance(0);
			});

			scope.x = {
				value : 0,
				advance : function (pos) {
					this.value++;
					if (pos >= 0) {
						this.value = 0;
					}
					if (this.value > canvas.width) {
						this.value = 0;
					}
					printer.css('left', scope.x.value + 4);
				}
			};

			scope.$on(scope.channel  + 'line', function (event, data) {
				scope.x.advance();
				printLine(data, context, canvas.width);
			});

			function printLine (line, context, width) {
				for (var i = 0; i < line.length; i++) {
					var pixelSize = 1;
					var x = scope.x.value;
					var y = i*pixelSize;
					context.fillStyle = 'rgb(' + line[i][0] + ', ' + line[i][1] + ', ' + line[i][2] + ')';
					context.fillRect(x, y, pixelSize, pixelSize);
				}
			}
		}
	}
});

imgtickrDirectives.directive('dropzone', ['$parse', function ($parse) {
	// TODO: upload via url paste
	return {
		restrict: 'A',
		link: function (scope, elem, attrs) {
			var obj = $(elem);
			var fileInput = obj.next("input");
			obj.on('dragenter', function (e) {
				e.stopPropagation();
				e.preventDefault();
				$(this).css('background-color', '#0B85A1');
			});
			obj.on('dragleave', function (e) {
				e.stopPropagation();
				e.preventDefault();
				$(this).css('background-color', '#c8c8c8');
			});
			obj.on('dragover', function (e) {
				e.stopPropagation();
				e.preventDefault();
				$(this).css('background-color', '#0B85A1');
			});
			obj.on('drop', function (e) {
				$(this).css('background-color', '#c8c8c8');
				e.preventDefault();
				var files = e.originalEvent.dataTransfer.files;
				scope.upload(files[0], scope.channel);
			});
			obj.on('click', function (e) {
				fileInput.trigger('click');
			});
			fileInput.on('change', function (e) {
				e.preventDefault();
				var files = e.originalEvent.srcElement.files;
				scope.upload(files[0], scope.channel);
			});
		}
	}
}]);

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

imgtickrDirectives.directive('onEnter', [function () {
	return {
		restrict: 'A',
		link: function (scope, elem, attrs) {
			elem.bind('keydown keypress', function (e) {
				if (e.which === 13) {
					e.preventDefault();
					scope.$eval(attrs.onEnter);
				}
			});
		}
	}
}]);