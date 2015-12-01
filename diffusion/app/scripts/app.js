'use strict';

/**
 * @ngdoc overview
 * @name diffusionApp
 * @description
 * # diffusionApp
 *
 * Main module of the application.
 */
angular
    .module('diffusionApp', [
    'ngAnimate',
    'ngAria',
    'ngCookies',
    'ngMessages',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch',
    'leaflet-directive',
    'ui.bootstrap',
    'checklist-model',
    'nvd3', 
    'ngTable'
  ]).run(function ($rootScope) {
    })
    .config(function ($routeProvider) {
        $routeProvider
            .when('/', {
                templateUrl: 'views/search.html',
                controller: 'SearchCtrl'
            })
            .when('/about', {
                templateUrl: 'views/about.html',
                controller: 'AboutCtrl'
            })
            .when('/search', {
                templateUrl: 'views/search.html',
                controller: 'SearchCtrl'
            })
            .when('/results/keyword=:keyword?&location=:location?&offset=:offset', {
                templateUrl: 'views/results.html',
                controller: 'ResultsCtrl'
            })
            .when('/map/keyword=:keyword?&location=:location?&offset=:offset', {
              templateUrl: 'views/results_map.html',
              controller: 'ResultsMapCtrl'
            })
            .otherwise({
                redirectTo: '/'
            });
    });