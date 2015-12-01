/*
 * dashboard.js - A collection of functions for drawing fancy graphics in C4S.
 *
 * Sam Levine + Moustafa Ishmael, March 2014, for Booz Allen Hamilton.
 *
 */

//========= RESIZE CALLBACK ========//
//Call this when the user resizes the browser!
$(window).resize(debouncer( function ( e ) {
    redrawMap(false);
}));

// Importing a debouncer to allow us to call resize only when the user is done dragging the browser around.
// This saves us from having to do the expensive map redraw on every frame.
function debouncer( func , timeout ) {
   var timeoutID , timeout = timeout || 200;
   return function () {
      var scope = this , args = arguments;
      clearTimeout( timeoutID );
      timeoutID = setTimeout( function () {
          func.apply( scope , Array.prototype.slice.call( args ) );
      } , timeout );
   }
}

//========= DRAWING FUNCTIONS ========//

function drawAllCharts() {
    //Resize the divs!
    $('#pieContainer, #dateChartContainer, #mapContainer').css("height","300px");

    //Update the pie chart! 
    redrawPieChart();

    //Update the bar chart!
    redrawDateChart();

    //Update the IP map!
    redrawMap(true);
}

function redrawPieChart() {
    //IN THE FUTURE, THIS WILL BE REAL DATA
    $('#pieContainer').highcharts({
        chart: {
            plotBackgroundColor: null,
            plotBorderWidth: null,
            plotShadow: false
        },
        title: {
            text: ''
        },
        tooltip: {
            pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
        },
        plotOptions: {
            pie: {
                allowPointSelect: true,
                cursor: 'pointer',
                dataLabels: {
                    enabled: false
                },
                showInLegend: true
            }
        },
        credits: {
            enabled: false
        },
        legend: {
            layout: 'vertical',
            align: 'right',
            verticalAlign: 'middle',
        },
        series: [{
            type: 'pie',
            name: 'Source IP',
            data: [
                ['10.201.26.39',   45.0],
                ['10.5.177.109',       26.8],
                ['156.80.151.200',    8.5],
                ['10.1.105.74',     6.2],
                ['Others',   0.7]
            ]
        }]
    });
}

function redrawDateChart() {
    $('#dateChartContainer').highcharts({
        chart: {
            type: 'column'
        },
        title: {
            text: ''
        },
        xAxis: {
            categories: [
                '2014-02-26',
                '2014-02-27',
                '2014-02-28',
                '2014-03-01',
                '2014-03-02',
                '2014-03-03',
                '2014-03-04',
                '2014-03-05',
                '2014-03-06',
                '2014-03-07',
                '2014-03-08',
                '2014-03-09',
                '2014-03-10',
                '2014-03-11',
                '2014-03-12',
                '2014-03-13',
                '2014-03-14',
                '2014-03-15',
                '2014-03-16',
                '2014-03-17',
                '2014-03-18',
                '2014-03-19',
                '2014-03-20',
                '2014-03-21',
                '2014-03-22',
                '2014-03-23',
                '2014-03-24',
                '2014-03-25',
                '2014-03-26',
                '2014-03-27',
                '2014-03-28',
                '2014-03-29',
                '2014-03-30',
            ],
            labels: {
                "rotation": -45,
                "align": 'right',
                "step": 5,
                //"step": Math.round(results.xAxis.categories.length/10)
            }
        },
        yAxis: {
            min: 0,
            title: {
                text: 'Events/Day'
            }
        },
        tooltip: {
            headerFormat: '<span style="font-size:10px">{point.key}</span><table>',
            pointFormat: '<tr><td style="color:{series.color};padding:0">{series.name}: </td>' +
                '<td style="padding:0"><b>{point.y:.1f} mm</b></td></tr>',
            footerFormat: '</table>',
            shared: true,
            useHTML: true
        },
        plotOptions: {
            column: {
                pointPadding: 0.2,
                borderWidth: 0
            }
        },
        credits: {
            enabled: false
        },
        legend: {
            enabled: false,
        },
        series: [{
            name: 'Events',
            data: [0,0,1,2,1,0,0,5,0,0,0,0,0,0,0,0,5,0,0,4,0,0,1,0,0,2,0,0,1,0,3,0,0]
        }]
    });
}

function redrawMap(firstTime, scaleFactor) {
    var existingHtml = $("#mapContainer").html();
    if (existingHtml === "" && !firstTime) {
        //Do nothing!  Map doesn't existing yet.
    } else {
        //Empty it!
        $("#mapContainer").html("");
        var map = new Datamap({
            element: document.getElementById('mapContainer'),
            scope: 'world',
            setProjection: function(element) {
                var projection = d3.geo.equirectangular()
                  .center([16, 20])
                  //.rotate([4.4, 0])
                  .translate([element.offsetWidth / 2, element.offsetHeight / 2])
                  .scale(110);
                  
                var path = d3.geo.path()
                  .projection(projection);
                
                return {path: path, projection: projection};
            },
            fills: {
                defaultFill: '#ABDDA4',
                bubbleFill: '#FF7F00'
            },
            geographyConfig: {
                popupOnHover: false,
                highlightOnHover: false
            }
        });

        map.bubbles([
            {
                name: '10.201.26.39',
                radius: 7,
                latitude: 11.415,
                longitude: 105.1619,
                fillKey: 'bubbleFill'
            },{
                name: '10.5.177.109',
                radius: 7,
                latitude: 73.482,
                longitude: 54.5854,
                fillKey: 'bubbleFill'
            },{
                name: '156.80.151.200',
                radius: 7,
                latitude: 38.897906,
                longitude: -77.036433,
                fillKey: 'bubbleFill'
            },{
                name: '10.1.105.74',
                radius: 7,
                latitude: -34.603844,
                longitude: -58.406863,
                fillKey: 'bubbleFill'
            }
        ],{
            popupOnHover: false,
        });
    }
}

