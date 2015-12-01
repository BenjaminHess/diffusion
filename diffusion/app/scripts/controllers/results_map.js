'use strict';

/**
 * @ngdoc function
 * @name diffusionApp.controller:ResultsMapCtrl
 * @description
 * # ResultsMapCtrl
 * Controller of the diffusionApp
 */
angular.module('diffusionApp')
    .controller('ResultsMapCtrl', ['$scope', '$rootScope', '$routeParams', '$filter', 'ApiInterface', 'ngTableParams', function ($scope, $rootScope, $routeParams, $filter, ApiInterface, ngTableParams) {

        $scope.location = $routeParams.location;
        $scope.keyword = $routeParams.keyword;
        $scope.offset = Number($routeParams.offset);
        $scope.offset25 = Number($scope.offset) + 25;
        $scope.selected = {};
        $scope.groupby = 'concept';
        $scope.tableParams = {};
        $scope.returnedResults = {};
        $scope.sourceArray = [];
        $scope.resultCount = 0;
        $scope.lapsedTime = 0;

        $scope.predefinedConcepts = {
            "Housing": ["plumbing facilities", "year structure built", "imputation of plumbing facilities", "all housing units", "occupants per room", "tenure"],
            "Business": ["total establishments", "total annual payroll", "total employees"],
            "People": ["occupation", "the civilian employed population 16 years and over", "industry", "age", "sex"]
        };



        $scope.checkAll = function (collection) {
            if (collection === "labelList") {
                $scope.selected.labelList = $scope.labelList;
            }
            if (collection === "locationList") {
                $scope.selected.locationList = $scope.locationList;
            }
            if (collection === "conceptList") {
                $scope.selected.conceptList = $scope.conceptList;
            }
        };
        $scope.uncheckAll = function (collection) {
            if (collection === "labelList") {
                $scope.selected.labelList = [];
            }
            if (collection === "locationList") {
                $scope.selected.locationList = [];
            }
            if (collection === "conceptList") {
                $scope.selected.conceptList = [];
            }

        };

        if ($scope.location) {
            $scope.query = $scope.keyword + " AND " + $scope.location;
        } else {
            $scope.query = $scope.keyword;
        }

        $scope.tableParams = new ngTableParams({
            page: 1, // show first page
            count: 25, // count per page
            sorting: {
                NAME: 'asc' // initial sorting
            }
        }, {
            groupBy: $scope.groupby,
            total: $scope.sourceArray.length, // length of data
            getData: function ($defer, params) {
                // use build-in angular filter
                var orderedData = params.sorting() ?
                    $filter('orderBy')($scope.sourceArray, params.orderBy()) :
                    $scope.sourceArray;

                $defer.resolve(orderedData.slice((params.page() - 1) * params.count(), params.page() * params.count()));
            }
        });

        $scope.groupby = 'concept';
        $scope.$watch('groupby', function (value) {
            $scope.tableParams.settings().groupBy = value;
            $scope.tableParams.reload();
        });

        /*Retreive and populate our concepts tag filter with the results of the original searcy query*/
        ApiInterface.refineSearch($scope.query, "concept.dimensions").success(function (data, status, headers) {
            $scope.conceptList = data.facets.terms.terms;
        }).error(function (data, status, headers, config) {
            console.log("There was an error with your concept request" + data + " Status: " + status);
        });

        /*Retreive and populate our label tag filter with the results of the original searcy query*/
        ApiInterface.refineSearch($scope.query, "label.dimensions").success(function (data, status, headers) {
            $scope.labelList = data.facets.terms.terms;
        }).error(function (data, status, headers, config) {
            console.log("There was an error with your label request" + data + " Status: " + status);
        });

        /*Retreive and populate our location tag filter with the results of the original searcy query*/
        ApiInterface.refineSearch($scope.query, "NAME.raw").success(function (data, status, headers) {
            $scope.locationList = data.facets.terms.terms;
        }).error(function (data, status, headers, config) {
            console.log("There was an error with your location request" + data + " Status: " + status);
        });

        //telegraph search results to all dependent components
        $scope.$watchCollection('sourceArray', function (newval, oldval) {
            $rootScope.$broadcast('rootScope:broadcast', $scope.sourceArray);
            //      console.log(newval);
            //       console.log(oldval);
            $rootScope.$broadcast('rootScope:broadcast', $scope.sourceArray);
        }, true);



        $scope.$watch('selected', function (newval, oldval) {
            $scope.searchConcepts = [];
            $scope.searchLabels = [];
            $scope.searchLocations = [];

            angular.forEach(newval.labelList, function (item) {
                $scope.searchLabels.push(item.term);
            });

            angular.forEach(newval.conceptList, function (item) {
                if (typeof item === "object") {
                    $scope.searchConcepts.push(item.term);
                } else if (typeof item === "string") {
                    $scope.searchConcepts.push(item);
                }
            });

            angular.forEach(newval.locationList, function (item) {
                $scope.searchLocations.push(item.term);
            });

            /*Retreive and populate our table with the results and offset of the original search query*/
            ApiInterface.sourceSearch($scope.query, $scope.offset, $scope.searchConcepts, $scope.searchLocations, $scope.searchLabels).then(function (returnedResult) {
                $scope.returnedResults = returnedResult;
                $scope.sourceArray = [];
                angular.forEach(returnedResult.hits.hits, function (item) {
                    $scope.sourceArray.push(item._source);
                });
                $scope.lapsedTime = returnedResult.took;
                $scope.resultCount = returnedResult.hits.total;
                $scope.tableParams.reload();
            });
        }, true);



        $scope.$watch('offset', function () {
            /*Retreive and populate our table with the results and offset of the original search query*/
            ApiInterface.sourceSearch($scope.query, $scope.offset, $scope.searchConcepts, $scope.searchLocations, $scope.searchLabels).then(function (returnedResult) {
                $scope.sourceArray = [];
                angular.forEach(returnedResult.hits.hits, function (item) {
                    $scope.sourceArray.push(item._source);
                });
                $scope.lapsedTime = returnedResult.took;
                $scope.resultCount = returnedResult.hits.total;
                $scope.tableParams.reload();
            });

        }, true);



    }]);
