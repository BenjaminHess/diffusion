'use strict';

/**
 * @ngdoc directive
 * @name diffusionApp.directive:map
 * @description
 * # map
 */
angular.module('diffusionApp')
    .directive('map', function () {
        return {
            templateUrl: 'views/templates/map.html',
            restrict: 'E',
            controller: 'MapCtrl',
            scope: {
                height: '@',
                width: '@',
                id: '@'
            }
        };
    });