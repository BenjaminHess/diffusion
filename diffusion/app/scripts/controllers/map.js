'use strict';

/**
 * @ngdoc function
 * @name diffusionApp.controller:MapCtrl
 * @description
 * # MapCtrl
 * Controller of the diffusionApp
 */
angular.module('diffusionApp')
    .controller('MapCtrl', ['$scope', '$rootScope', 'leafletData', 'ApiInterface', function ($scope, $rootScope, leafletData, ApiInterface) {

        $scope.result = {};
        $scope.tableResults = {};

        $scope.$on('rootScope:broadcast', function (event, data) {
            ///   console.log(data); // 'successful broadcast and catch!'           
            $scope.tableResults = data;
        });

        var countyLayer; //init the layername outside

        $scope.$watchCollection('tableResults', function () {
            ApiInterface.getCountyGeojson().then(function (returnedResult) {
                $scope.result = returnedResult.data;
                leafletData.getMap('countyresultmap').then(function (map) {
                    if (map.hasLayer(countyLayer)) {
                        map.removeLayer(countyLayer);
                    };

                    function onEachFeature(feature, layer) {
                        $scope.infoLayer = [];
                        $scope.selectedStyle = {};
                        layer.on({
                            mouseover: function (e) {
                                // this.openPopup();
                                var selected = e.target;
                                $scope.selectedStyle = layer.options;
                                selected.setStyle({
                                    "weight": 2,
                                    "opacity": 1,
                                    "color": 'red',
                                    "fillColor": 'red',
                                    "fillOpacity": .5
                                });
                                selected.bringToFront();
                            },
                            mouseout: function (e) {
                                var selected = e.target;
                                selected.setStyle($scope.selectedStyle);
                                selected.bringToBack();
                            },
                            click: function (e) {
                                this.openPopup();
                            }
                        });
                        layer.setStyle({
                            "weight": 1,
                            "color": 'grey',
                            "opacity": 1,
                            "fillColor": 'grey',
                            "fillOpacity": .1
                        });
                        angular.forEach($scope.tableResults, function (item, key) {
                            if ((item.county == feature.properties.COUNTY) & (item.state == feature.properties.STATE)) {
                                $scope.infoLayer.push("<b>" + item.concept + "</b><br>" + item.label + " : " + item.value + "<br>");

                                layer.setStyle({
                                    "weight": 2,
                                    "opacity": 1,
                                    "color": 'grey',
                                    "fillColor": '#ceff00',
                                    "fillOpacity": .4
                                });
                            };
                        });
                        $scope.infoLayer = $scope.infoLayer.join(' ');
                        layer.bindPopup(
                            "<b>County Name:</b> " + feature.properties.NAME + "<hr>" +
                            $scope.infoLayer + "<br>" + "<a href=" + feature.properties.Source + "target=_blank>Link</a></br>"
                        );
                    }
                    countyLayer = L.geoJson($scope.result, {
                        onEachFeature: onEachFeature,

                        style: function (feature) {
                            return {};
                        }
                    });
                    countyLayer.addTo(map);

                });
            });


        }, true);




        /**********************************************************************
	 Angular Leaflet Map Init
**********************************************************************/
        angular.extend($scope, {
            defaults: {
                scrollWheelZoom: true,
                attributionControl: true
            },
            center: {

                lat: 38,
                lng: -80,
                zoom: 7
                    //                For whole us view
                    //                lat: 40,
                    //                lng: -98,
                    //                zoom: 5
            },
            geojson: {},
            layers: {
                baselayers: {
                    topo: {
                        name: "ESRI World Topographic",
                        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
                        type: "xyz",
                        layerParams: {},
                        layerOptions: {
                            attribution: 'ESRI'
                        },
                        visible: true
                    },
                    xyz: {
                        name: 'OpenStreetMap',
                        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                        type: 'xyz',
                        layerOptions: {
                            attribution: 'OpenStreetMap'
                        },
                        visible: false
                    },
                    world: {
                        name: "ESRI World Imagery",
                        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                        type: "xyz",
                        layerParams: {},
                        layerOptions: {
                            attribution: 'ESRI'
                        },
                        visible: false
                    }
                }
            }
        });


            }]);