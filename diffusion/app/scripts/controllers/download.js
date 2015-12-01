'use strict';

/**
 * @ngdoc function
 * @name diffusionApp.controller:DownloadCtrl
 * @description
 * # DownloadCtrl
 * Controller of the diffusionApp
 */
angular.module('diffusionApp')
    .controller('DownloadCtrl', ['$scope', '$rootScope', '$window', 'ApiInterface', function ($scope, $rootScope, $window, ApiInterface) {

        $scope.download = function (queryid) {
            $window.location.href = $rootScope.hostname + '/dataset*/_search?q=' + queryid;

            /* The below enables the download of database entries by accumoid*/
            //            $scope.submitQuery = {
            //                "query": {
            //                    "filtered": {
            //                        "query": {
            //                            "bool": {
            //                                "should": [{
            //                                    "query_string": {
            //                                        "query": $scope.queryid
            //                                    }
            //                                    }]
            //                            }
            //                        },
            //                        "filter": {
            //                            "bool": {
            //                                "must": [{}]
            //                            }
            //                        }
            //                    }
            //                },
            //                "sort": [{
            //                    "accumuloId": {
            //                        "order": "asc",
            //                        "ignore_unmapped": true
            //                    }
            //                    }]
            //            };
            //
            //            ApiInterface.downloadById($scope.submitQuery).success(function (data, status, headers, config) {
            //                window.open("data:text/json;charset=utf-8," + JSON.stringify(data), '_blank');
            //
            //            }).error(function (data, status, headers, config) {
            //                console.log("There was an error with your download request" + data + " Status: " + status)
            //            });
        };

                    }]);
