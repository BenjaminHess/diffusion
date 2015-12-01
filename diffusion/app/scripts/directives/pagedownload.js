'use strict';

/**
 * @ngdoc directive
 * @name diffusionApp.directive:pagedownload
 * @description
 * # pagedownload
 */
angular.module('diffusionApp')
    .directive('pagedownload', function () {
        return {
            template: '<button class="btn btn-primary btn-md centerbutton" ng-click="pagedownload(data)"><span class="glyphicon glyphicon-download-alt"></span> Download</button>',
            scope: {
                data: '='
            },
            restrict: 'E',
            controller: function () {},
            link: function ($scope, $element, $attributes, controller) {
                $scope.pagedownload = function (data) {
                    window.open("data:text/json;charset=utf-8," + JSON.stringify(data), '_blank');
                };
            }
        }
    });