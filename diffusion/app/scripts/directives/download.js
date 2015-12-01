'use strict';

/**
 * @ngdoc directive
 * @name diffusionApp.directive:download
 * @description
 * # download
 */
angular.module('diffusionApp')
    .directive('download', function () {
        return {
            templateUrl: 'views/templates/download.html',
            restrict: 'E',
            transclude: true,
            scope: {
                queryid: '@'
            },
            controller: 'DownloadCtrl'
        };
    });
