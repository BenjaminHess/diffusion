var width = 960;
var height = 500;
var centered;

var minEstimate = Number.MAX_VALUE;
var maxEstimate = Number.MIN_VALUE;
var numberOfScaleSegments = 6;


// VARIABLES
var dataURL = "http://api.census.gov/data/2012/acs5?get=GEOID,NAME&&for=county:*&in=state:*";
var geoType = "COUNTY";

var div, svg, path, states;
//a count of search results that per county
var countyCounts = [];
//the full list of page search results by county
var countyData = [];

function mapInitiate(counties) {
    div = d3.select("#mapContainer").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    svg = d3.select("#mapContainer").append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("background-color", "#ffffff");

    path = d3.geo.path();
    //we iterate and extract all county source objects for later mapping to the counties[geoId]
    counties.hits.hits.forEach(function (item) {
        countyData.push(item._source);
    });
    countyCounts = counties.aggregations.counties.buckets;
    if (Object.keys(countyCounts).length < numberOfScaleSegments - 1) {
        numberOfScaleSegments = Object.keys(countyCounts).length + 1;
    }

    //Reading map file and data
    queue()
        .defer(d3.json, "js/us.json")
        .defer(d3.json, dataURL)
        .await(loadData);
}


//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function loadData(error, map, data) {

    var geoIDs = {};
    var geoNames = {};
    var geoCounty = {};


    loadDataToArrays(data, geoNames, geoIDs, geoCounty)
    var colorScale = createColorScaleAndLegend();

    loadDataToMap(map, geoNames, geoIDs, geoCounty, colorScale)

};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function loadDataToArrays(data, geoNames, geoIDs, counties) {

    var past1st = false;


    //Load Census data into arrays of geo-name and estimate, skipping 1st row (headers)
    data.forEach(function (d) {
        if (past1st) {
            var idIndex = parseInt(d[0].substring(7));
            geoNames[idIndex] = d[1];
            var geoID = d[0];
            geoIDs[idIndex] = geoID;

            for (var i in countyCounts) {
                if (countyCounts[i].key === d[1]) {
                    counties[geoID] = countyCounts[i].doc_count;
                }
            }

            if (counties[geoID] && counties[geoID] < minEstimate) {
                minEstimate = counties[geoID];
            }

            if (counties[geoID] && counties[geoID] > maxEstimate) {
                maxEstimate = counties[geoID];
            }
        } else {
            past1st = true;
        }
    });

}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function loadDataToMap(map, geoNames, geoIDs, counties, colorScale) {
    var mapObjects;

    if (geoType == "COUNTY") {
        mapObjects = map.objects.counties;
    } else {
        mapObjects = map.objects.states;
    }

    //Set counties to the color corresponding to their estimate
    var g = svg.append("g");


    g.attr("class", "region")
        .selectAll("path")
        .data(topojson.feature(map, mapObjects).features)
        .enter().append("path")
        .attr("d", path)
        .style("fill", function (d) {
            return (colorScale(counties[geoIDs[d.id]] ? counties[geoIDs[d.id]] : 0));
        })
        .style("opacity", 0.8)
        .on("click", function (d) {
            var x, y, k;

            if (d && centered !== d) {
                var centroid = path.centroid(d);
                x = centroid[0];
                y = centroid[1];
                k = 4;
                centered = d;
            } else {
                x = width / 2;
                y = height / 2;
                k = 1;
                centered = null;
            }

            g.selectAll("path")
                .classed("active", centered && function (d) {
                    return d === centered;
                });

            g.transition()
                .duration(750)
                .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
                .style("stroke-width", 1.5 / k + "px");

            states.transition()
                .duration(750)
                .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")");


        })


    //Adding mouse events: Display geo-name and estimate on mouse-over
    .on("mouseover", function (d) {
            d3.select(this).transition().duration(0).style("fill", '#f00');
            div.transition().duration(0)
                .style("opacity", 20)
                //past popup styling
                // div.text(geoNames[d.id] + " : " +(counties[geoIDs[d.id]] ? counties[geoIDs[d.id]] : "0"))
            div.html(function (i) {
                    var result = [];
                    var conceptCount = {};
                    countyData.forEach(function (item) {
                        if (item.NAME == geoNames[d.id]) {
                            if (!conceptCount[item.concept]) {
                                conceptCount[item.concept] = [item.label.replace(/!!/g, ' ') + ": " + item.value + "<br>"];
                            } else {
                                conceptCount[item.concept] = [conceptCount[item.concept]] + [item.label.replace('!!', ' ') + ": " + item.value + "<br>"];
                            }
                        }
                    });
                    Object.keys(conceptCount).forEach(function (key) {
                        result.push("<b>" + key.substring(key.indexOf('  ')) + "</b><br>");
                        result.push(conceptCount[key]);
                    });
                    result.unshift("<b>", geoNames[d.id], "</b><hr>");
                    return result.join("").replace(/::/g, ":");;
                })
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 30) + "px");
        })
        .on("mouseout", function () {
            d3.select(this)
                .transition().duration(0)
                .style("fill", '#87dfe8');
            div.transition().duration(0)
                .style("fill", '#87dfe8');
        })

    states = svg.append("path")
        .datum(topojson.mesh(map, map.objects.states, function (a, b) {
            return a !== b;
        }))
        .attr("class", "states")
        .attr("d", path);

}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function createColorScaleAndLegend() {

    var colorDomain = new Array();
    var extColorDomain = new Array();
    var legendLabels = new Array();
    calculateScale(colorDomain, extColorDomain, legendLabels)

    var colorScale = d3.scale.threshold()
        .domain(colorDomain)
        .range(["#87dfe8", "#ff52f9", "#ffc000", "#ffa10d", "#aeea00", "#02123b"]);

    var legend = svg.selectAll("g.legend")
        .data(extColorDomain)
        .enter().append("g")
        .attr("class", "legend");

    var ls_w = 20
    var ls_h = 20;
    
    	svg.append("svg:text")
		   .attr("class", "title")
	   .attr("x", 20)
	   .attr("y", 355)
	   .text("Density of Results");

    legend.append("rect")
        .attr("x", 20)
        .attr("y", function (d, i) {
            return height - (i * ls_h) - 2 * ls_h;
        })
        .attr("width", ls_w)
        .attr("height", ls_h)
        .style("fill", function (d, i) {
            return colorScale(d);
        })
        .style("opacity", 0.8);

    legend.append("text")
        .attr("x", 50)
        .attr("y", function (d, i) {
            return height - (i * ls_h) - ls_h - 4;
        })
        .text(function (d, i) {
            return legendLabels[i];
        });

    return colorScale;

}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function calculateScale(colorDomain, extColorDomain, legendLabels) {
    var scaleInfo = calculateScaleInterval();
    var lastIndex = numberOfScaleSegments - 1;

    extColorDomain[0] = 0;
    extColorDomain[1] = calculate1stScaleNumber(scaleInfo);

    for (i = 2; i <= lastIndex; i++) {
        extColorDomain[i] = new Number(new Number(extColorDomain[i - 1] + scaleInfo.scaleInterval).toFixed(scaleInfo.numberOfDecimals));
    }

    for (i = 1; i <= lastIndex; i++) {
        colorDomain[i - 1] = extColorDomain[i];
        legendLabels[i] = extColorDomain[i].toString();
    }

    legendLabels[0] = "<".concat(legendLabels[1].toString());
    legendLabels[lastIndex] = legendLabels[lastIndex].toString().concat("+");

}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function ScaleInfo(scaleInterval, numberOfDecimals) {
    this.scaleInterval = new Number(scaleInterval);
    this.numberOfDecimals = numberOfDecimals;
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function calculateScaleInterval() {

    var numberOfDecimals = 10;
    var powerOfTen = 0.00001;
    var scaleInterval = new Number((maxEstimate - minEstimate) / (numberOfScaleSegments + 1));

    while (scaleInterval >= powerOfTen) {
        powerOfTen = powerOfTen * 10;
        numberOfDecimals--;
    }

    if (scaleInterval >= .75 && scaleInterval < 1) {
        scaleInterval = 1;
    } else if (powerOfTen < 100 && scaleInterval < 4.5) {
        scaleInterval = scaleInterval.toFixed(numberOfDecimals);
    } else {
        var i = scaleInterval / powerOfTen;
        var j = new Number(0);

        if (i < .15) {
            j = .1;
        } else if (i < .225) {
            j = .2;
        } else if (i < .375) {
            j = .25;
        } else if (i < .75) {
            j = .5;
        } else {
            j = 1
        }

        scaleInterval = j * powerOfTen;
    }

    var scaleInfo = new ScaleInfo(scaleInterval, numberOfDecimals);
    return scaleInfo;

}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////

function calculate1stScaleNumber(scaleInfo) {
    return minEstimate;

}