'use strict';

/**
 * @ngdoc directive
 * @name diffusionApp.directive:nav
 * @description
 * # nav
 */
angular.module('diffusionApp')
    .directive('nav', function () {
        return {
            templateUrl: 'views/templates/nav.html',
            restrict: 'E',
            controller: ['$scope', '$rootScope', '$routeParams', '$route', '$location',
                function ($scope, $rootScope, $routeParams, $route, $location) {

                    $scope.selected = $location.url();
                    $scope.sindex = $location.url().lastIndexOf('/');
                    $scope.selected = $scope.selected.substring($scope.sindex, 1);
                    if ($scope.selected === '/') {
                        $scope.selected = $location.url();
                    }

                    $scope.$on('$routeChangeSuccess', function (event) {
                        $scope.selected = $location.url();
                        $scope.sindex = $location.url().lastIndexOf('/');
                        $scope.selected = $scope.selected.substring($scope.sindex, 1);
                        if ($scope.selected === '/') {
                            $scope.selected = $location.url();
                        }
                    });


      }]
        };
    });