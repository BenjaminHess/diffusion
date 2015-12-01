'use strict';

/**
 * @ngdoc factory
 * @name diffusionApp.ApiInterface
 * @description
 * # ApiInterface
 * Factory in the diffusionApp.
 */
angular.module('diffusionApp')
    .factory('ApiInterface', ['$http', '$q', '$rootScope',function ($http, $q, $rootScope) {
        //set app wide variables inlcuding the number of pages and facets returned
        var apinumresultstoreturn = 25;
        //Change the hostname to the location of your elasticsearch instance
        $rootScope.hostname  = "http://localhost:9200";
        // Public API here
        return {

            getCountyGeojson: function () {
                return getlocalData('data/counties20m.geojson').success(function (result) {});
            },
            sourceSearch: function (query, offset, concept, location, label) {
                var deferred = $q.defer();
                var submitQuery = {
                    "aggs": {
                        "counties": {
                            "terms": {
                                "field": "NAME.raw"
                            }
                        }
                    },
                    "query": {
                        "filtered": {
                            "query": {
                                "bool": {
                                    "should": [
                                        {
                                            "query_string": {
                                                "query": query
                                            }
       }
      ]
                                }
                            },
                            "filter": {
                                "bool": {
                                    "must": [
                                        {}
      ]
                                }
                            }
                        }
                    },
                    "highlight": {
                        "fields": {},
                        "fragment_size": 2147483647,
                        "pre_tags": [
    "@start-highlight@"
   ],
                        "post_tags": [
    "@end-highlight@"
   ]
                    },
                    "from": offset,
                    "size": apinumresultstoreturn,
                    "sort": [
                        {
                            "accumuloId": {
                                "order": "asc",
                                "ignore_unmapped": true
                            }
   }
  ]
                };
                //Append the concept the the search query
                if (concept.length > 0) {
                    var conObj = {
                        "terms": {
                            "concept.dimensions": concept
                        }
                    };
                    submitQuery.query.filtered.filter.bool.must.push(conObj);
                };
                //Append the label to the search query
                if (label.length > 0) {
                    var labObj = {
                        "terms": {
                            "label.dimensions": label
                        }
                    };
                    submitQuery.query.filtered.filter.bool.must.push(labObj);
                };
                //Append the location to the search query
                if (location.length > 0) {
                    var locObj = {
                        "terms": {
                            "NAME.raw": location
                        }
                    };
                    submitQuery.query.filtered.filter.bool.must.push(locObj);
                };


                getEntries( $rootScope.hostname , submitQuery).success(function (result) {
                    deferred.resolve(result);
                }).error(function (result) {
                    deferred.reject(result);
                });

                return deferred.promise;
            },
            /***********************Used to tags for all search refinement categories**********************************/
            refineSearch: function (query, fieldType) {
                var terms = [""];
                var inputConcept = {
                    "facets": {
                        "terms": {
                            "terms": {
                                "field": fieldType,
                                "size": 1000,
                                "order": "count",
                                "regex": "^((?![bc]\\d)).+",
                                "exclude": []
                            },
                            "facet_filter": {
                                "fquery": {
                                    "query": {
                                        "filtered": {
                                            "query": {
                                                "bool": {
                                                    "should": [
                                                        {
                                                            "query_string": {
                                                                "query": query
                                                            }
           }
          ]
                                                }
                                            },
                                            "filter": {
                                                "bool": {
                                                    "must": []
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    },
                    "size": 0
                };

                return getEntries( $rootScope.hostname , inputConcept);
            },

            downloadById: function (id) {
                return getEntries( $rootScope.hostname , id);
            }
        };



        /******************************************************************************
        API Functions
        ******************************************************************************/
        function getEntries(hostname, data) {
            return $http({
                method: 'POST',
                url: hostname + "/dataset*/_search?pretty",
                data: data,
                cache: true
            });
        };

        function getlocalData(apiUrl) {
            return $http({
                method: 'GET',
                url: apiUrl,
                cache: true
            });
        };
    }]);
