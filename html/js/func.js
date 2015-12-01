var hostname = "http://localhost:9200";

var MAX_NUMPERPAGE = 25;
var MAX_FACETSIZE = 5;
var offset = 0;
var refineOffsets = [0,0,0];
var lastOptions = {};
var extraFilters = {
	loc: [],
	con: [],
	lab: []
}
var refinesLoc = [];
var refinesCon = [];
var refinesLab = [];
var suspendSelectAll = false;

var loadingDiv = $('<div class="loadingDiv"><img src="img/loading1.gif"/></div>');
var currentQuery = getUrlParameter("keyword");
var currentLocation = getUrlParameter("location");

Opentip.styles.base = {
	showOn: 'mouseover',
	target: true,
	tipJoint: 'center bottom',
	group: 'detail',
	background: "#fff",
	borderRadius: 0,
	borderColor: "#3ecae3"
}

function addRefineSearch(title, options, originalSize) {
	var doesThisExist = $('.sidebar-refineSection.' + title.toLowerCase());

	if (doesThisExist.length > 0) {
		var refineOptions = doesThisExist.find('.sidebar-checkboxes');
		refineOptions.html("");
		for (var i in options) {
			var refID = title.toLowerCase().replace(/ /g,'-') + '-' + i;
			refineOptions.append('<div class="sidebar-checkboxDiv">' +
				'<input type="checkbox" id="'+refID+'"/><label for="'+refID+'" class="box"></label>' +
				'<label for="'+refID+'" class="boxName">'+options[i]+'</label></div>');
		}

		if (options.length < originalSize) {
			doesThisExist.find('.seeMore').hide();
		}

		return;
	}
	var newRefineSection = $('<div class="sidebar-refineSection '+title.toLowerCase()+'"></div>');
	newRefineSection.append('<label class="cyanSubTitle">' + title + ':</label>');
	newRefineSection.append('<div><a href="#" class="selectAll">Select All</a> | <a href="#" class="selectNone">None</a></div>');

	var refineOptions = $('<div class="sidebar-checkboxes"></div>');
	for (var i in options) {
		var refID = title.toLowerCase().replace(/ /g,'-') + '-' + i;
		refineOptions.append('<div class="sidebar-checkboxDiv">' +
			'<input type="checkbox" id="'+refID+'"/><label for="'+refID+'" class="box"></label>' +
			'<label for="'+refID+'" class="boxName">'+options[i]+'</label></div>');
	}

	newRefineSection.append(refineOptions);

	if (options.length == originalSize) {
		newRefineSection.append('<div><a href="#" class="seeMore">+ Show More</a>');
	}

	$('#sidebar').append(newRefineSection);

	newRefineSection.find(".seeMore").click(function(e){
		if (newRefineSection.hasClass('concepts'))
			addMoreConceptFacets(5);
		else if (newRefineSection.hasClass('labels'))
			addMoreLabelFacets(5);
		else if (newRefineSection.hasClass('location'))
			addMoreGeoFacets(5);

		e.preventDefault();
	});
}

function addResultModule(sections, options, details, displayNone) {
	var resultModule = $('.results-module');
	var resultDiv = $('.results-moduleBody');

	if (displayNone) {
		resultDiv.html("No results to display.");
		return;
	}

	var resultTable = $('<table style="width: 100%;"></table>');
	resultTable.append('<tr><th class="upper cyanSubTitle" style="width:50%;">Description</th><th class="upper cyanSubTitle" style="width:20%;">Location</th><th class="upper cyanSubTitle" style="width:10%;">Quantity</th><th class="upper cyanSubTitle" style="width:20%;">Action</th></tr>')

	var optKeys = Object.keys(options);
	if (sections.length === optKeys.length) {
		for (var i in sections) {
			resultTable.append('<tr><td>'+sections[i]+'</td></tr>');
			var rows = options[optKeys[i]];
			for (var j in rows) {
				var resultRow = $("<tr></tr>");
				var cell = rows[j];
				for (var k in cell) {
					if (k == 0 && cell[k].length > 125) {
						resultRow.append('<td class="hoverFull"><div class="cellFull" style="display:none;">'+ cell[k] + '</div><div class="cellShort">' + cell[k].substring(0,125) + '...</div></td>');
					} else {
						resultRow.append('<td><div>' + cell[k] + '</div></td>');
					}
				}
				resultTable.append(resultRow);
			}
			if (i != sections.length-1) {
				resultTable.append('<tr><td colspan="4"><hr size="1"/></td></tr>');
			}
		}
	} else {
		console.log("The sections and options don't match up.");
	}

	resultDiv.html(resultTable);
	resultModule.append(resultDiv);

	$('#results-body').append(resultModule);
	$('#sidebar').height($('#results').height());

	$("#results a.details").each(function(i){
		var tip = new Opentip(this, {style: 'base'});
		tip.setContent(details[i]);
	});

	$("#results a.download").click(function(){
		$(this).html("Fetching...");
		generateDownload(this.id);
	});

	$("td.hoverFull").mouseenter(function(){
		$(this).find('.cellFull').show();
		$(this).find('.cellShort').hide();
	}).mouseleave(function(){
			$(this).find('.cellFull').hide();
			$(this).find('.cellShort').show();
		});
}

function addMapModule(title, regions) {
	var resultModule = $('<div id="map-module"></div>');

	if ($("#map-module").length > 0) {
		resultModule = $("#map-module");
		resultModule.html("");
	}

	resultModule.append('<div class="upper moduleHeader"><span class="icon">&#9656;</span>' + title + '</div>');
	var resultDiv = $('<div class="map-moduleBody"><div id="mapContainer"></div></div>');

	resultModule.append(resultDiv);

	$('#results-body').prepend(resultModule);
	mapInitiate(regions);
}

function addDataModule(title) {
	var resultModule = $('<div class="data-module"></div>');
	resultModule.append('<div class="upper moduleHeader"><span class="icon">&#9656;</span>' + title + '</div>');
	var resultDiv = $('<div class="data-moduleBody"></div>');

	resultModule.append(resultDiv);

	$('#results-body').append(resultModule);
}

function generateDownload(accumuloId) {
	var options = {
		"query": {
			"filtered": {
				"query": {
					"bool": {
						"should": [
							{
								"query_string": {
									"query": accumuloId.match(/[BC][0-9]{5}/)[0]
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
		"sort": [
			{
				"accumuloId": {
					"order": "asc",
					"ignore_unmapped": true
				}
			}
		]
	};

	$.ajax({
		dataType:"json",
		type: 'POST',
		url: hostname + "/dataset*/_search?pretty",
		data: JSON.stringify(options)
	}).done(function(result) {
			$("#" + accumuloId).html("Download");
			//$("#" + accumuloId).unbind();
			//var downloadLink = document.getElementById(accumuloId);
			//downloadLink.download = accumuloId + ".json";
			//downloadLink.href = "data:text/json;charset=utf-8," + JSON.stringify(result);
			window.open("data:text/json;charset=utf-8," + JSON.stringify(result), '_blank');
			window.focus();
		});
}

function generateSearchResults(query, location, generateMap) {
	if (location != "") {
		query = query + " AND " + location;
	}

	var options = {
		"aggs": {
			"counties" : {
				"terms" : { "field" : "NAME.raw" }
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
		"size": MAX_NUMPERPAGE,
		"sort": [
			{
				"accumuloId": {
					"order": "asc",
					"ignore_unmapped": true
				}
			}
		]
	};

	//TODO: Automate this process for other future refinements
	if (extraFilters.loc.length > 0) {
		var locationArr = [];

		for (var i in extraFilters.loc) {
			locationArr.push(refinesLoc[extraFilters.loc[i]]);
		}
		var locObj = {
			"terms": {
				"NAME.raw": locationArr
			}
		};
		options.query.filtered.filter.bool.must.push(locObj);
	}

	if (extraFilters.con.length > 0) {
		var conceptArr = [];

		for (var i in extraFilters.con) {
			conceptArr.push(refinesCon[extraFilters.con[i]]);
		}
		var conObj = {
			"terms": {
				"concept.dimensions": conceptArr
			}
		};

		options.query.filtered.filter.bool.must.push(conObj);
	}

	if (extraFilters.lab.length > 0) {
		var labelArr = [];

		for (var i in extraFilters.lab) {
			labelArr.push(refinesLab[extraFilters.lab[i]]);
		}
		var labObj = {
			"terms": {
				"label.dimensions": labelArr
			}
		};

		options.query.filtered.filter.bool.must.push(labObj);
	}

	$.ajax({
		dataType:"json",
		type: 'POST',
		url: hostname + "/dataset*/_search?pretty",
		data: JSON.stringify(options)
	}).done(function(result) {
			console.log(result);
			lastOptions = options;
			var hits = result.hits.hits;
			$("#results-total").html(result.hits.total);
			var sections = [];
			var details = [];
			var opts = {};
			for (var i in hits) {
				var conceptToken = hits[i]._source.concept.split(".  ");
				if (opts[conceptToken[0]] == undefined) {
					if (conceptToken.length == 1){
						sections.push('<b>' + conceptToken[0] + ':</b>')
					}else{
						sections.push('<b>' + conceptToken[1] + ':</b>')
					}
					opts[conceptToken[0]] = [];
				}
				var labelArray = hits[i]._source.label.split("!!");
				labelText = labelArray.join(" ");

				opts[conceptToken[0]].push([labelText,hits[i]._source.NAME,hits[i]._source.value,"<a class='upper details' href='#'>Details</a> | <a class='upper download' id='"+hits[i]._source.accumuloId+"' href='#'>Download</a>"]);
				var tipHTML = '<b>Margin of Error: </b> 2%<br/>' +
					'<b>Survey:</b> American Community Survey 1 year estimates<br/>' +
					'<b>Year:</b> 2013<br/>' +
					'<b>Accumulo ID:</b> ' + hits[i]._source.accumuloId;

				details.push(tipHTML);
			}

			generatePagination(result.hits.total);
			addResultModule(sections,opts, details, result.hits.total === 0)

			
			//we pass the full results to the map so it can extract and build contextual county tooltips
			var counties = result;

			if (generateMap) {
				addMapModule("Map Visualization", counties);
			}
		});
}

function generateConceptFacets(query, location) {
	if (location != "") {
		query = query + " AND " + location;
	}

	var options = {
		"facets": {
			"terms": {
				"terms": {
					"field": "concept.dimensions",
					"size": MAX_FACETSIZE,
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

	$.ajax({
		dataType:"json",
		type: 'POST',
		url: hostname + "/dataset*/_search?pretty",
		data: JSON.stringify(options)
	}).done(function(result) {
			var refinements = result.facets.terms.terms;
			refinesCon = [];
			for (var i in refinements) {
				refinesCon.push(refinements[i].term);
				var refine = refinements[i].term.split(" ");
				for (var j in refine) {
					refine[j] = refine[j].charAt(0).toUpperCase() + refine[j].slice(1);
				}
				refinements[i] = refine.join(" ");
			}
			addRefineSearch("Concepts", refinements, MAX_FACETSIZE);

			//Bind Events
			$('.concepts .selectAll').click(function() {
				suspendSelectAll = true;
				$(this).parent().parent().find("input").prop("checked",true).change();
				suspendSelectAll = false;

				generateSearchResults(getUrlParameter("keyword"),getUrlParameter("location"), pageName == "search");
			});

			$('.concepts .selectNone').click(function() {
				suspendSelectAll = true;
				$(this).parent().parent().find("input").prop("checked",false).change();
				suspendSelectAll = false;

				generateSearchResults(getUrlParameter("keyword"),getUrlParameter("location"), pageName == "search");
			});

			$('.concepts input').change(function() {

				var checkedArr = [];
				$('.concepts').find("input:checked").each(function(){
					var conID = this.id.split('-')[1];
					checkedArr.push(parseInt(conID));
				});

				extraFilters.con = checkedArr;

				if (!suspendSelectAll)
					generateSearchResults(getUrlParameter("keyword"),getUrlParameter("location"), pageName == "search");
			});
		});
}

function addMoreConceptFacets(count) {
	var query = currentQuery;
	if (currentLocation != "") {
		query = currentQuery + " AND " + currentLocation;
	}

	refineOffsets[0] += count;

	var options = {
		"facets": {
			"terms": {
				"terms": {
					"field": "concept.dimensions",
					"size": MAX_FACETSIZE + refineOffsets[0],
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

	$.ajax({
		dataType:"json",
		type: 'POST',
		url: hostname + "/dataset*/_search?pretty",
		data: JSON.stringify(options)
	}).done(function(result) {
			var refinements = result.facets.terms.terms;
			refinesCon = [];
			for (var i in refinements) {
				refinesCon.push(refinements[i].term);
				var refine = refinements[i].term.split(" ");
				for (var j in refine) {
					refine[j] = refine[j].charAt(0).toUpperCase() + refine[j].slice(1);
				}
				refinements[i] = refine.join(" ");
			}
			addRefineSearch("Concepts", refinements, MAX_FACETSIZE + refineOffsets[0]);

			//Bind Events
			$('.concepts .selectAll').click(function() {
				suspendSelectAll = true;
				$(this).parent().parent().find("input").prop("checked",true).change();
				suspendSelectAll = false;

				generateSearchResults(getUrlParameter("keyword"),getUrlParameter("location"), pageName == "search");
			});

			$('.concepts .selectNone').click(function() {
				suspendSelectAll = true;
				$(this).parent().parent().find("input").prop("checked",false).change();
				suspendSelectAll = false;

				generateSearchResults(getUrlParameter("keyword"),getUrlParameter("location"), pageName == "search");
			});

			$('.concepts input').change(function() {

				var checkedArr = [];
				$('.concepts').find("input:checked").each(function(){
					var conID = this.id.split('-')[1];
					checkedArr.push(parseInt(conID));
				});

				extraFilters.con = checkedArr;

				if (!suspendSelectAll)
					generateSearchResults(getUrlParameter("keyword"),getUrlParameter("location"), pageName == "search");
			});
		});
}

function generateLabelFacets(query, location) {
	if (location != "") {
		query = query + " AND " + location;
	}

	var options = {
		"facets": {
			"terms": {
				"terms": {
					"field": "label.dimensions",
					"size": MAX_FACETSIZE,
					"order": "count",
					"regex": "^[^Total:].+",
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

	$.ajax({
		dataType:"json",
		type: 'POST',
		url: hostname + "/dataset*/_search?pretty",
		data: JSON.stringify(options)
	}).done(function(result) {
			var refinements = result.facets.terms.terms;
			refinesLab = [];
			for (var i in refinements) {
				refinesLab.push(refinements[i].term);
				var refine = refinements[i].term.split(" ");
				for (var j in refine) {
					refine[j] = refine[j].charAt(0).toUpperCase() + refine[j].slice(1);
				}
				refinements[i] = refine.join(" ");
			}
			addRefineSearch("Labels", refinements, MAX_FACETSIZE);

			//Bind Events
			$('.labels .selectAll').click(function() {
				suspendSelectAll = true;
				$(this).parent().parent().find("input").prop("checked",true).change();
				suspendSelectAll = false;

				generateSearchResults(getUrlParameter("keyword"),getUrlParameter("location"), pageName == "search");
			});

			$('.labels .selectNone').click(function() {
				suspendSelectAll = true;
				$(this).parent().parent().find("input").prop("checked",false).change();
				suspendSelectAll = false;

				generateSearchResults(getUrlParameter("keyword"),getUrlParameter("location"), pageName == "search");
			});

			$('.labels input').change(function() {

				var checkedArr = [];
				$('.labels').find("input:checked").each(function(){
					var labID = this.id.split('-')[1];
					checkedArr.push(parseInt(labID));
				});

				extraFilters.lab = checkedArr;

				if (!suspendSelectAll)
					generateSearchResults(getUrlParameter("keyword"),getUrlParameter("location"), pageName == "search");
			});
		});
}

function addMoreLabelFacets(count) {
	var query = currentQuery;
	if (currentLocation != "") {
		query = currentQuery + " AND " + currentLocation;
	}

	refineOffsets[1] += count;

	var options = {
		"facets": {
			"terms": {
				"terms": {
					"field": "label.dimensions",
					"size": MAX_FACETSIZE + refineOffsets[1],
					"order": "count",
					"regex": "^[^Total:].+",
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

	$.ajax({
		dataType:"json",
		type: 'POST',
		url: hostname + "/dataset*/_search?pretty",
		data: JSON.stringify(options)
	}).done(function(result) {
			var refinements = result.facets.terms.terms;
			refinesLab = [];
			for (var i in refinements) {
				refinesLab.push(refinements[i].term);
				var refine = refinements[i].term.split(" ");
				for (var j in refine) {
					refine[j] = refine[j].charAt(0).toUpperCase() + refine[j].slice(1);
				}
				refinements[i] = refine.join(" ");
			}
			addRefineSearch("Labels", refinements, MAX_FACETSIZE + refineOffsets[1]);

			//Bind Events
			$('.labels .selectAll').click(function() {
				suspendSelectAll = true;
				$(this).parent().parent().find("input").prop("checked",true).change();
				suspendSelectAll = false;

				generateSearchResults(getUrlParameter("keyword"),getUrlParameter("location"), pageName == "search");
			});

			$('.labels .selectNone').click(function() {
				suspendSelectAll = true;
				$(this).parent().parent().find("input").prop("checked",false).change();
				suspendSelectAll = false;

				generateSearchResults(getUrlParameter("keyword"),getUrlParameter("location"), pageName == "search");
			});

			$('.labels input').change(function() {

				var checkedArr = [];
				$('.labels').find("input:checked").each(function(){
					var labID = this.id.split('-')[1];
					checkedArr.push(parseInt(labID));
				});

				extraFilters.lab = checkedArr;

				if (!suspendSelectAll)
					generateSearchResults(getUrlParameter("keyword"),getUrlParameter("location"), pageName == "search");
			});
		});
}

function generateGeoFacets(query, location) {
	if (location != "") {
		query = query + " AND " + location;
	}

	var options = {
		"facets": {
			"terms": {
				"terms": {
					"field": "NAME.raw",
						"size": MAX_FACETSIZE,
						"order": "count",
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
										"must": [
											{
												"match_all": {}
											}
										]
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

	$.ajax({
		dataType:"json",
		type: 'POST',
		url: "http://localhost:9200/dataset*/_search?pretty",
		data: JSON.stringify(options)
	}).done(function(result) {
			var refinements = result.facets.terms.terms;
			refinesLoc = [];
			for (var i in refinements) {
				refinesLoc.push(refinements[i].term);
				var refine = refinements[i].term.split(" ");
				for (var j in refine) {
					refine[j] = refine[j].charAt(0).toUpperCase() + refine[j].slice(1);
				}
				refinements[i] = refine.join(" ");
			}
			addRefineSearch("Location", refinements, MAX_FACETSIZE);

			//Bind Events
			$('.location .selectAll').click(function() {
				suspendSelectAll = true;
				$(this).parent().parent().find("input").prop("checked",true).change();
				suspendSelectAll = false;

				generateSearchResults(getUrlParameter("keyword"),getUrlParameter("location"), pageName == "search");
			});

			$('.location .selectNone').click(function() {
				suspendSelectAll = true;
				$(this).parent().parent().find("input").prop("checked",false).change();
				suspendSelectAll = false;

				generateSearchResults(getUrlParameter("keyword"),getUrlParameter("location"), pageName == "search");
			});

			$('.location input').change(function() {

				var checkedArr = [];
				$('.location').find("input:checked").each(function(){
					var locID = this.id.split('-')[1];
					checkedArr.push(parseInt(locID));
				});
				extraFilters.loc = checkedArr;

				if (!suspendSelectAll)
					generateSearchResults(getUrlParameter("keyword"),getUrlParameter("location"), pageName == "search");
			});
		});
}

function addMoreGeoFacets(count) {
	var query = currentQuery;
	if (currentLocation != "") {
		query = currentQuery + " AND " + currentLocation;
	}

	refineOffsets[2] += count;

	var options = {
		"facets": {
			"terms": {
				"terms": {
					"field": "NAME.raw",
					"size": MAX_FACETSIZE + refineOffsets[2],
					"order": "count",
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
										"must": [
											{
												"match_all": {}
											}
										]
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

	$.ajax({
		dataType:"json",
		type: 'POST',
		url: "http://localhost:9200/dataset*/_search?pretty",
		data: JSON.stringify(options)
	}).done(function(result) {
			var refinements = result.facets.terms.terms;
			refinesLoc = [];
			for (var i in refinements) {
				refinesLoc.push(refinements[i].term);
				var refine = refinements[i].term.split(" ");
				for (var j in refine) {
					refine[j] = refine[j].charAt(0).toUpperCase() + refine[j].slice(1);
				}
				refinements[i] = refine.join(" ");
			}
			addRefineSearch("Location", refinements, MAX_FACETSIZE + refineOffsets[2]);

			//Bind Events
			$('.location .selectAll').click(function() {
				suspendSelectAll = true;
				$(this).parent().parent().find("input").prop("checked",true).change();
				suspendSelectAll = false;

				generateSearchResults(getUrlParameter("keyword"),getUrlParameter("location"), pageName == "search");
			});

			$('.location .selectNone').click(function() {
				suspendSelectAll = true;
				$(this).parent().parent().find("input").prop("checked",false).change();
				suspendSelectAll = false;

				generateSearchResults(getUrlParameter("keyword"),getUrlParameter("location"), pageName == "search");
			});

			$('.location input').change(function() {

				var checkedArr = [];
				$('.location').find("input:checked").each(function(){
					var locID = this.id.split('-')[1];
					checkedArr.push(parseInt(locID));
				});
				extraFilters.loc = checkedArr;

				if (!suspendSelectAll)
					generateSearchResults(getUrlParameter("keyword"),getUrlParameter("location"), pageName == "search");
			});
		});
}

function generatePagination(count) {
	var pageDiv = $(".results-pagination");
	var prevDiv= $('li.prev');
	var nextDiv= $('li.next');
	if (count === 0) {
		$("#results-current").html("0-0");
	}
	else {
		$("#results-current").html(offset+1 + "-" + parseInt(offset+MAX_NUMPERPAGE));
	}

	pageDiv.append(prevDiv);
	if (count > MAX_NUMPERPAGE) {
		if (offset > 0) {
			prevDiv.html('<a href="#results-showing">Previous 25</a>');
		} else {
			prevDiv.html('');
		}

		if (count > MAX_NUMPERPAGE + offset) {
			nextDiv.html('<a href="#results-showing">Next 25</a>');
		} else {
			nextDiv.html('');
		}
	} else {
		prevDiv.html('');
		nextDiv.html('');
	}

	pageDiv.append(nextDiv);
}

function getUrlParameter(name) {
	name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
	var regex = new RegExp("[\\?&]" + name + "=([^&#]*)");
	var result = regex.exec(window.location.href.replace(/\+/g," "));
	if (result == null) {
		return "";
	}
	return decodeURIComponent(result[1]);
}