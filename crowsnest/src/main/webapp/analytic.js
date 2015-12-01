var currentTable;
var tables = {};
var htmls = {};
var currentTab;
var Connection = {
    socket : null,    

    pingInterval: 5*1000, 
    pingTimer : null,
    pingLastTime: null,

    init: function(hostURL){            
        if (!("WebSocket" in window)){
            alert("WebSockets not supported! Test this application in other browsers, like Chrome, Firefox, Safari!");
            return;
        }

        this.socket = new WebSocket(hostURL);

        this.socket.onopen = function(){                            
//            Connection.pingTimer = setInterval(Connection.ping, Connection.pingInterval);
            if( runQueryFlag == true ) {
                runQuery();
                runQueryFlag = false;
            }
        };

        this.socket.onmessage = function(message){
            data = JSON.parse(message.data);
            Command.handle(data);
        };

        this.socket.onclose = function(){
            Connection.close();
        };                
    },

    send: function(message){
        this.socket.send(JSON.stringify(message));
    },

    close: function(){        
        clearInterval(Connection.pingTimer);
        document.cookie = 'JSESSIONID' + '=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';     
    },

    ping: function(){            
        Connection.send(Command.build("PING"));
        Connection.pingLastTime = new Date().getTime();
    }    

};

//Handle server commands.
var Command = {
    clientCommands : [ "PING",
                      "QUERY",
                      "QUERY ES",
                      "EXPORT",
                      "CREATE COMMENT",
                      "MARK ANALYTIC"],

    build : function(com, params) {
        if ($.inArray(com, this.clientCommands) == -1) {
            return false;
        } else {
            return {
                command : com,
                params : params ? params : null
            };
        }
    },

    handle : function(data) {
        if (this["handle" + data.command]) {
            this["handle" + data.command](data);
        }             
    },

    handleTABLE_APPEND: function(returnData) {
        var tableName = returnData['table'];
        tables[tableName].fnAddData(returnData.data);
    },

    handleCLOSE_QUERY: function(returnData) {
        console.log(returnData);
        // when a dataset is done loading reset the loading indicator for that tabs
        $('#li_' + returnData.table + " a").removeClass("loading");
    },

    handleDOWNLOAD_EXPORT: function(returnData){
        window.open(returnData.data);
    }
};

var asInitVals = new Array();
var sourceFields = "";



function generateDatasets(){
    var setHtml = "";
    $.each(sourceFields,function(i, val) {
        setHtml += 
            '<div class="checkbox"> \
            <label> \
            <input id="checkBox_' + i + '" name="' + i + '" type="checkbox" value="" style="opacity: 0;">' + i +
                '</label> \
            </div>'
    });
    setHtml += '</table></div>';
    $('#datasets').html(setHtml);
    $('#datasets input').change(function(){
        if(this.checked) {
            // Get the actual text name of the dataset, not ID
            var datasetName = $(this).closest('label').text().trim();
            addDatasetToTable(this.name, datasetName);
        } else {
            removeDatasetFromTable(this.name);
        }
    });
}

function addDatasetToTable(id, name){
    // show the Data Tables container
    $("#dashboard").show();
    $("#dataTableContainer").show();
    
    $('#data-tabs > ul > li.active').removeClass('active');
    $("#data-tabs > ul").append(
        '<li id="li_' + id + '" class="active"> \
            <a href="#tab_' + id + '" name="' + id + '" class="indicator">' + name + '</a> \
        </li>'
    );
    currentTable = id;
    $('#li_'+id).click(function(){
        $("#data-tabs>ul>li.active").removeClass("active");
        $(this).addClass("active");
        $(".tab-pane").removeClass('active');
        $(".tab-pane#tab_" + id).addClass('active');
    });

    $(".tab-pane").removeClass('active');
    $(".tab-content").append('<div class="tab-pane active" id="tab_'+id+'"><div id="TableContainer_'+id+'">'+id+'</div></div>');
    generateTable(id);
}

function removeDatasetFromTable(id){

    if($('#li_' + id).hasClass("active") === true){
        var newId = $("#data-tabs>ul>li>a").first().contents()[0].data.trim();
        currentTable = newId;
        $("#data-tabs>ul>li").first().addClass("active");
        $(".tab-pane#tab_" + currentTable).addClass('active');
        //    $('#tab_content_'+newId).addClass('active');
    }
    $('#li_' + id).remove();
    removeTable(id);
    
    // If no more datasets are selected hide the 
    // Charts / Graphs and Data Table widgets
    if( $("#data-tabs > ul > li").length < 1 ) {
        $("#dashboard").hide();
        $("#dataTableContainer").hide();
    }
}

function removeTable(id){
    delete tables[id];
    $('#TableContainer_'+id).parent().remove();
}

function generateTable(id){
    
    //$.each(sourceFields,function(i, val) {
    var info = sourceFields[id]; 
    currentTable = id;
    var tableHtml = 
        '<table id="table_'+id+'" cellpadding="0" cellspacing="0" border="0" \
        class="table table-striped table-bordered table-hover dataTable table-advance table-fixed"> \
            <thead id="tableHeader_' + id + '"> \
                <tr>';
    
    $.each(info["fields"],function(j,value){
    	if(value.DisplayName.length > 0 ) {
    		tableHtml = tableHtml + '<th class="sorting">' + value.DisplayName + '</th>';    		
    	} else {
    		tableHtml = tableHtml + '<th class="check"></th>';  
    	}
    });
    
    tableHtml = tableHtml + '</tr> \
                        </thead> \
                    <tbody></tbody> \
                    <tfoot id="tableFooter_' + id + '"> \
                        <tr>';
    
    $.each(info["fields"],function(j,value){
    	if(value.AccumuloName.length > 0) {
    		tableHtml = tableHtml + '<th><input type="text" name="search_' + value.AccumuloName + '" value="' + value.DisplayName + '" class="search_init filterBar"/></th>';
    	} else {
    		tableHtml = tableHtml + '<th></th>';
    	}
    });
    
    tableHtml = tableHtml + '</tr></tfoot></table>';
    $('#TableContainer_'+id).html(tableHtml);

    var oTable = $('#table_'+id).dataTable({
        "sDom": 'Rlfrtip',
        "iDisplayStart": 25,
        "aLengthMenu": [10,25, 50, 100, 200, 500],
        "bAutoWidth": false,
        "aaSorting": [[ 0, "desc" ]], 
        "aoColumns": info.aoColumns,
        "fnCreatedRow": function(nRow, aData, iDataIndex) {

            // add an indicator to let us know if this is an outer row
            $(nRow).addClass("outer");
            
            var innerDiv = "";
            var alertLevelHighlight = "safe";
            var iconDiv = "";

            // Add an inner DIV to each Table cell to make
            // sure the content gets trimmed if it's too long
            $.each(nRow.children, function(index, element) {
                element.innerHTML = "<div class='cell-content'>" + element.innerHTML + "</div>";
                // The first element in the row is a special case since it will hold he Highest Alert level icon
                if( index == 0 ) {
                    var html = '<div class="cell-content"><input type="checkbox" value="' + aData["rowId"] + '|' + aData["SRC IP"] + '|' + aData["DST IP"] + '"/></div>'
                    $(element).html(html);
                    iconDiv = $(element.firstChild.firstChild);
                }
            });


            // Add a colored highlight to each row which 
            // indicates the Highest Alert level
            nRow.firstElementChild.setAttribute("class", "highlight");

            if(aData['highest_alert'] === "VERY HIGH") {
                alertLevelHighlight = "veryhigh";  
            } 
            else if(aData['highest_alert'] === "LOW") {
                alertLevelHighlight = "low";    
            } 
            else if(aData['highest_alert'] === "HIGH") {
                alertLevelHighlight = "high";
            } 
            else if(aData['highest_alert'] === "MEDIUM") {
                alertLevelHighlight = "med";    
            }
            else {
                alertLevelHighlight = "safe";
            }

            $(nRow.firstElementChild.firstChild).addClass( alertLevelHighlight );

            if(aData['update'] === "true"){
                //$(nRow).addClass("transition");
                $(nRow).bind("webkitAnimationEnd", function() {
                    $(nRow).removeClass('updatedRow');
                });
                $(nRow).addClass("updatedRow");
            }

        }
    });

    $("tfoot#tableFooter_" + id + " input").each( function (i) {
        asInitVals[i] = this.value;
    } );

    $("tfoot#tableFooter_" + id + " input").focus( function () {
        if ( this.className.contains("search_init"))
        {
            this.className = "filterBar";
            this.value = "";
        }
    } );

    $("tfoot#tableFooter_" + id + " input").blur( function (i) {
        if ( this.value == "" )
        {
            this.className = "filterBar search_init";
            this.value = asInitVals[$("tfoot#tableFooter_" + id + " input").index(this)];
        }
    } );

    $("tfoot#tableFooter_" + id + " input").keyup( function () {
        tables[id].fnFilter( this.value, $("tfoot#tableFooter_" + id + " input").index(this) );
    } );


    tables[id] = oTable;

    $('#table_' + id).on('click', 'tbody > tr.outer', function (event) {
    	if(!$(event.srcElement).is("input")) {
	        var nTr = this;
	        if ( oTable.fnIsOpen(nTr) )
	        {
	            oTable.fnClose(nTr);
	        }
	        else
	        {
	            oTable.fnOpen( nTr, fnFormatDetails(oTable, nTr), 'details' );
	        }
    	}
    } );
}

function modifySelected() {
	var tableType = $("#data-tabs .active").attr("id").substring(3);
	
	
	var html = "<p>The following analytic results will be updated:</p>";
	html += "<table class='table-striped table-bordered'><thead><th>ID</th><th>Source IP</th><th>Destination IP</th></thead>";

	html += "<tbody>";
	
	$("#table_" + tableType + " input[type=checkbox]:checked").each(function() {
		var splits = $(this).val().split("|");
		html += "<tr><td>" + splits[0] + "</td><td>" + splits[1] + "</td><td>" + splits[2] + "</td></tr>";
	});
	
	html += "</tbody></table>";
	html += "<button class='btn btn-primary right-align' onclick='markSelected(\"In Review\")'>Mark for Review</button>";
	html += "<button class='btn btn-primary right-align' onclick='markSelected(\"Cleared\")'>Mark as Cleared</button>";
	html += "<button class='btn btn-primary right-align' onclick='markSelected(\"Incident\")'>Mark as Incident</button>";
	
	$("#bulk-modal .modal-body").html(html);
	$("#bulk-modal table").dataTable({
		"bPaginate": false,
		"bLengthChange": false,
		"bFilter": false,
		"bInfo": false
	});
	$("#bulk-modal").modal();
}

function markSelected(status) {
	var tableType = $("#data-tabs .active").attr("id").substring(3);
	
	var events = new Array();
	
	$("#table_" + tableType + " input[type=checkbox]:checked").each(function() {
		var splits = $(this).val().split("|");
		
		var event = new Object();
		event.eventID = splits[0];
		event.status = status;
		event.author = "CFPUser";
		events.push(event);
		
		// Auto-comment
		var params = new Object();
		params.Author = "CFPUser";
		params.EventID = splits[0];
		params.Text = "[Auto] Event has been marked as " + status;
		
		Connection.send(Command.build("CREATE COMMENT", JSON.stringify(params)));
		
		$("#text-" + splits[0]).before('<i class="icon-legal"></i> ' + params.Text + ' <span class="time-ago">just now by you</span><br/>');
	});

	// Update marking
	Connection.send(Command.build("MARK ANALYTIC", JSON.stringify(events)));
}

//Init application and bind functions.
$(document).ready(function() {

    // load the corresponding JSON file for this page
    loadJson();
    startTime();
    generateDatasets();
    fillDefaults();
    $('#startDate').datetimepicker({format:'m/d/Y H:i:s'});
    $('#endDate').datetimepicker({format:'m/d/Y H:i:s'});
    
    jQuery.extend( jQuery.fn.dataTableExt.oSort, {
        "ip-address-pre": function ( a ) {
            var m = a.split("."), x = "";

            for(var i = 0; i < m.length; i++) {
                var item = m[i];
                if(item.length == 1) {
                    x += "00" + item;
                } else if(item.length == 2) {
                    x += "0" + item;
                } else {
                    x += item;
                }
            }

            return x;
        },

        "ip-address-asc": function ( a, b ) {
            return ((a < b) ? -1 : ((a > b) ? 1 : 0));
        },

        "ip-address-desc": function ( a, b ) {
            return ((a < b) ? 1 : ((a > b) ? -1 : 0));
        }
    });

    jQuery.extend( jQuery.fn.dataTableExt.oSort, {
        "domain-pre": function ( a ) {
            var x = a.split("").reverse().join("");
            return x;
        },

        "domain-asc": function ( a, b ) {
            return ((a < b) ? -1 : ((a > b) ? 1 : 0));
        },

        "domain-desc": function ( a, b ) {
            return ((a < b) ? 1 : ((a > b) ? -1 : 0));
        }
    });
    
    var server = GetURLParameter('server');
    if($.trim(server) == 'local') {
        Connection.init("ws://localhost:50031/data/interface");
    } else{
        Connection.init("wss://10.128.104.105:50030/data/interface");
    }
    
    // When a new Tab / Dataset is selected set the current table 
    $("#data-tabs").on('click', 'ul > li > a', function() {
        currentTable = this.name;
    });
    
    // Load any parameters
    loadParameters();
    
});

if (typeof String.prototype.contains === 'undefined') { String.prototype.contains = function(it) { return this.indexOf(it) != -1; }; }
$(window).bind('beforeunload',function(){
    Connection.close();
    console.log("socket closed");
    //alert("closing");
});

$("#query").on('click', runQuery);

function runQuery() {
    console.log("sent QUERY");
    console.log(buildQuery());

    //Grab the data!
    if(document.getElementById('checkBox_Continuous').checked){
      Connection.send(Command.build("QUERYES",buildQuery()));
    }else {
      Connection.send(Command.build("QUERY",buildQuery()));
    }
    
    //Update the charts!
    //drawAllCharts();

    //Update the data tables!
    $.each(tables,function(key,value){
        value.fnClearTable();
    });
    updateIndicators(); //With spinner gifs!
}
/*
$("#exportTable").on('click',function(){
  var filteredrows = $("#table_Firewall").dataTable()._('tr', {"filter": "applied"});
  var command = Command.build("EXPORT",'{"fields":' + 
    JSON.stringify(sourceFields['Firewall']['fields']) + 
    ',"data":' + JSON.stringify(filteredrows) +'}');
  Connection.send(command);  
  console.log(command);
});
*/
$("#Remove").on('click',function(){
    console.log(currentTable);
    var filteredrows = $("#table_"+currentTable).dataTable().$('tr', {"filter": "applied"});
    $.each(filteredrows,function(i, val) {
        $("#table_"+currentTable).dataTable().fnDeleteRow($("#table_"+currentTable).dataTable().fnGetPosition(val));
    });
});

//------SAM WAS HERE-------//
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

//Call this when the user resizes the browser!
$(window).resize(debouncer( function ( e ) {
    redrawMap(false);
}));

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
    
     
     } /*else {
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
    }*/
}

function buildQuery(){
    var fullQuery = '{';
    var hosts = "";
    var includes = "";
    if( pagename == "analytic-results" ) {
        fullQuery += '"queryType":"analyticResults",';
        includes = getIncludes();
    }
    else if( pagename == "search-page" ) {
        hosts = getHosts();
        //if(document.getElementById('checkBox_Continuous').checked){
        //    fullQuery += '"queryType":"liveUpdate",';
        //} else {
            fullQuery += '"queryType":"search",';
        //}
    }

    fullQuery += '"sources":[';
    for(key in tables){
        var json = '{"source":"' + key + '",';
        json += '"fields":' + JSON.stringify(sourceFields[key].fields);
        json += '},'; 
        fullQuery += json;
    }
    fullQuery = fullQuery.substring(0,fullQuery.length -1);
    fullQuery += '],"queryParams":{' + getDates() + includes + hosts + '}}';
    return fullQuery;
}

// Show the loading indicator for each dataset tab currently open
function updateIndicators(){
    $("#data-tabs ul li a.indicator").addClass("loading");
}

function fillDefaults(){
    if( pagename.toUpperCase() == "analytic-results".toUpperCase() ) {
        document.getElementById('startDate').value = "03/03/2014 00:00:00";
        document.getElementById('endDate').value = "03/04/2014 00:00:00";
    }
    else if( pagename.toUpperCase() == "search-page".toUpperCase() ) {
        document.getElementById('search_value').value = "Age By Sex";
        document.getElementById('location').value = "";
        document.getElementById('startDate').value = "02/26/2014 00:00:00";
        document.getElementById('endDate').value = "02/27/2014 00:00:00";
        /*
        document.getElementById('checkBox_Direction_To').checked = true;
        document.getElementById('checkBox_Direction_From').checked = true;
        document.getElementById('checkBox_Continuous').checked = false;
        $('#checkBox_Netflow').prop('checked', true);
        $('#checkBox_Netflow').trigger("change");
        */
    }
}

function getDates(){
    var datesStr = '"sdate":"' + document.getElementById('startDate').value + '",';
    datesStr += '"edate":"' + document.getElementById('endDate').value + '"';
    return datesStr;
}

function getHosts(){
    var hostsStr = '"search_value":"' + document.getElementById('search_value').value + '",';
    hostsStr += '"location":"' + document.getElementById('location').value + '"';
    
    return hostsStr;
}

function getIncludes(){
	var includesStr = '",reviewStatuses":[';
	var checkStr = "";
	
	if(document.getElementById('checkBox_Unmarked').checked) {
		checkStr += '"Unmarked"';
	}
	if(document.getElementById('checkBox_Incident').checked) {
		checkStr += (checkStr.length == 0 ? "" : ",") + '"Incident"';
	}
	if(document.getElementById('checkBox_InReview').checked) {
		checkStr += (checkStr.length == 0 ? "" : ",") + '"In Review"';
	}
	if(document.getElementById('checkBox_Cleared').checked) {
		checkStr += (checkStr.length == 0 ? "" : ",") + '"Cleared"';
	}
	
	includesStr += ']';
	
	return includesStr;
}

function fnFormatDetails ( oTable, nTr ) {
    
    var aData = oTable.fnGetData( nTr );
    var sOut = '<table class="expandedRowTable">';

    var alertBox = '<div class="inner-box"><h4>Alerts</h4>';
    var tableBox = '<div class="inner-box"><h4>Details</h4><table class="expandedRowTable">';
    
    var sOut = "";
    
    if(aData['alert_flags'] !== undefined){
      $.each(aData['alert_flags'], function(i,value){
    	var level = value.level.toLowerCase().replace(" ", "-"); 
    
        alertBox += '<span><i class="icon-warning-sign ' + level + '"></i> ' + value.source + ': ' + value.entity + ' - ' + value.reason;
        alertBox += '</span><button type="button" class="btn btn-default btn-mini" onclick="removeAlert(\"' + value.alertId + '\")">Remove</button><br/>';
      });
      
      alertBox += "</div>";
      
      sOut += alertBox;
    }
    var actionBox = '<div class="inner-box"><h4>Comments</h4>';
        
    $(aData['Comments']).each(function() {
    	
        actionBox += '<i class="icon-' + (this.Text.startsWith("[Auto]") ? 'legal' : 'comment') + '"></i> ' + this.Text + ' <span class="time-ago">' + getTimeAgo(this.Time) + ' by ' + this.Author + '</span><br/>';
    });

    actionBox += '<textarea id="text-' + aData['rowId'] + '"></textarea><br/><br/>';
    actionBox += '<button onclick="addComment(\'' + aData['rowId'] + '\')" class="btn btn-sm">Add Comment</button></div>';
    
    // placeholder for the source and destination IPs
    var ip;
    // Whether or not to run the query as soon as the page loads
    var runQuery = false;
    
    // Get the current url and trim it from any attributes
    // The pivot link should always redirect to the Search page 
    var currentURL = document.URL.split("?")[0].split("/");
    currentURL[ currentURL.length - 1 ] = "index.html";
    currentURL = currentURL.join("/");
    
    
    // Loop though all source fields to find the Flow or ISO start time
    $.each(sourceFields[currentTable].fields, function(index, value) {
        // We assume that the ISO Start Time will always come before the Source and Destination IP addresses
        if( value.dType === "ISO-Time:Start" ) {
            // Flow Date and Start time for this row
            entryDateArray = aData[value.AccumuloName].split("T");
            entryDate = entryDateArray[0].split("-");
            entryTime = entryDateArray[1].split("-")[0].split(":");
            entryTimezone = entryDateArray[1].split("-")[1];
            // This entry's date and time in Date format (year, month, day, hours, minutes, seconds)
            eventDay = new Date( entryDate[0], parseInt(entryDate[1])-1, entryDate[2], entryTime[0], entryTime[1], entryTime[2] );
        //    eventDay.setTimezone( entryTimezone );
            // Today's Date and Time
            today = new Date();
        }
    });
    
    // loop through each source field (ie every row)
    $.each(sourceFields[currentTable].fields, function(index, value) {
        
        if( value.dType === "IP:SRC" || value.dType ==="IP:DST" ) {
            ip = aData[value.AccumuloName];
            
            var yesterday = eventDay.currentDate(-1) + " " + eventDay.currentTime(0);
            var tomorrow = eventDay.currentDate(1) + " " + eventDay.currentTime(0);
            var halfHourAgo = eventDay.currentDate(0) + " "  + eventDay.currentTime(-30);
            var halfHourLater = eventDay.currentDate(0) + " "  + eventDay.currentTime(30);
            var hourAgo = eventDay.currentDate(0) + " "  + eventDay.currentTime(-60);
            var hourLater = eventDay.currentDate(0) + " "  + eventDay.currentTime(60);
    
            var baseSearch = '<a href="' + currentURL + '?runQuery=' + runQuery + '&SrcIp=' + ip; // + '&DstIp=' + destIp;
            var halfHourFromEvent = baseSearch + '&startTime=' + encodeURI(halfHourAgo) + '&endTime=' + encodeURI(halfHourLater) + '" id="window_link" target="_blank">30 Minutes</a>';
            var hourFromEvent = baseSearch + '&startTime=' + encodeURI(hourAgo) + '&endTime=' + encodeURI(hourLater) + '" id="window_link" target="_blank">1 Hour</a>';
            var dayFromEvent = baseSearch + '&startTime=' + encodeURI(yesterday) + '&endTime=' + encodeURI(tomorrow) + '" id="window_link" target="_blank">Full Day</a>';
            
            yesterday = today.currentDate(-1) + " " + today.currentTime(0);
            tomorrow = today.currentDate(1) + " " + today.currentTime(0);
            halfHourAgo = today.currentDate(0) + " "  + today.currentTime(-30);
            halfHourLater = today.currentDate(0) + " "  + today.currentTime(30);
            hourAgo = today.currentDate(0) + " "  + today.currentTime(-60);
            hourLater = today.currentDate(0) + " "  + today.currentTime(60);

            var halfHourFromToday = baseSearch + '&startTime=' + encodeURI(halfHourAgo) + '&endTime=' + encodeURI(halfHourLater) + '" id="window_link" target="_blank">30 Minutes</a>';
            var hourFromToday = baseSearch + '&startTime=' + encodeURI(hourAgo) + '&endTime=' + encodeURI(hourLater) + '" id="window_link" target="_blank">1 Hour</a>';
            var dayFromToday = baseSearch + '&startTime=' + encodeURI(yesterday) + '&endTime=' + encodeURI(tomorrow) + '" id="window_link" target="_blank">Full Day</a>';

            var timeDropdown = '\
                <div class="pivot btn-group"> \
                    <a class="btn btn-mini dropdown-toggle" data-toggle="dropdown" href="#"> \
                        Today <span class="caret"></span> \
                    </a> \
                    <ul class="dropdown-menu"> \
                    <li>' + halfHourFromToday + '</li> \
                    <li>' + hourFromToday + '</li> \
                    <li>' + dayFromToday + '</li> \
                  </ul> \
                </div> \
                <div class="pivot btn-group"> \
                    <a class="btn btn-mini dropdown-toggle" data-toggle="dropdown" href="#"> \
                        Event Day <span class="caret"></span> \
                    </a> \
                    <ul class="dropdown-menu"> \
                        <li>' + halfHourFromEvent + '</li> \
                        <li>' + hourFromEvent + '</li> \
                        <li>' + dayFromEvent + '</li> \
                    </ul> \
                </div>';
            
            tableBox += '<tr class="expandedRow"><td class="expandedLeft">'+ value.DisplayName +':</td><td class="expandedRight">' + aData[value.AccumuloName] +
                        '&nbsp;' + timeDropdown;// + '[' + hourSearch + ' / ' + daySearch + ']';
        }

        else if(value !== 'highest_alert'){
            tableBox += '<tr class="expandedRow"><td class="expandedLeft">'+ value.DisplayName +':</td><td class="expandedRight">'+aData[value.AccumuloName]+'</td></tr>';
        }
    });
    
    tableBox += "</table></div>";

    //sOut += '<tr><td>Highest Alert:</td><td>'+JSON.stringify(aData['highest_alert'])+'</td></tr>';
    sOut += tableBox;
    sOut += actionBox;
    
    return sOut;
}

function addComment(rowId) {
	var text = $("#text-" + rowId).val();
	
	if(text.length > 0) {
		var params = new Object();
		params.Author = "CFPUser";
		params.EventID = rowId;
		params.Text = text;
		
		Connection.send(Command.build("CREATE COMMENT", JSON.stringify(params)));
		
		$("#text-" + rowId).val("");
		$("#text-" + rowId).before('<i class="icon-comment"></i> ' + text + ' <span class="time-ago">just now by you</span><br/>');
	}
}

function startTime()
{
    var today=new Date();
    var h=today.getHours();
    var m=today.getMinutes();
    var s=today.getSeconds();
    // add a zero in front of numbers<10
    m=checkTime(m);
    s=checkTime(s);
    //document.getElementById('clock').innerHTML="Current Time: " + h+":"+m+":"+s;
    t=setTimeout(function(){startTime();},500);
}

function checkTime(i)
{
    if (i<10)
    {
        i="0" + i;
    }
    return i;
}

function getTimeAgo(time) {
    var difference = new Date().getTime() - time;

    if(difference > 2592000000) {
            var months = Math.floor(difference / 2592000000);
            return months + " month" + (months == 1 ? "" : "s") + " ago";
    } else if(difference > 86400000) {
            var days = Math.floor(difference / 86400000);
            return days + " day" + (days == 1 ? "" : "s") + " ago";
    } else if(difference > 3600000) {
            var hours = Math.floor(difference / 3600000);
            return hours + " hour" + (hours == 1 ? "" : "s") + " ago";
    } else if(difference > 60000) {
            var minutes = Math.floor(difference / 60000);
            return minutes + " minute" + (minutes == 1 ? "" : "s") + " ago";
    } else {
            var seconds = Math.floor(difference / 1000);
            return seconds + " second" + (seconds == 1 ? "" : "s") + " ago";
    }
}


function GetURLParameter(sParam)
{
//    var sPageURL = window.location.search.substring(1);
    var sPageURL = document.URL.split("?")[1];
    if( sPageURL === undefined ) 
        return undefined;
    
    var sURLVariables = sPageURL.split('&');
    for (var i = 0; i < sURLVariables.length; i++) 
    {
        var sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] == sParam) 
        {
            return sParameterName[1];
        }
    }
}

var pagename = "";

function loadJson() {

    pagename = $("body").attr("id");

    var jsonText = "";

    if( pagename.toUpperCase() === "analytic-results".toUpperCase() ) {
        jsonText = '{\
"RECENTLYREGISTERED": { "fields" : [ \
{"AccumuloName":"","DisplayName":"","dType":"","alertable":false},\
{"AccumuloName":"ISO Date","DisplayName":"ISO Date","dType":"ISO-Time:Start","alertable":false},\
{"AccumuloName":"Short Domain","DisplayName":"Domain","dType":"Domain:Short","alertable":true},\
{"AccumuloName":"Date Registered","DisplayName":"Date Registered","dType":"NONE","alertable":false},\
{"AccumuloName":"SRC IP","DisplayName":"Source IP","dType":"IP:SRC","alertable":true},\
{"AccumuloName":"DST IP","DisplayName":"Destination IP","dType":"IP:DST","alertable":true},\
{"AccumuloName":"DST Port","DisplayName":"Destination Port","dType":"Port:DST","alertable":false},\
{"AccumuloName":"URL","DisplayName":"URL","dType":"Domain:Full","alertable":true},\
{"AccumuloName":"SRC Geolocation","DisplayName":"Source Location","dType":"GEO:SRC","alertable":false},\
{"AccumuloName":"DST Geolocation","DisplayName":"Destination Location","dType":"GEO:DST","alertable":false},\
{"AccumuloName":"highest_alert","DisplayName":"Highest Alert","dType":"Alert","alertable":false}\
],\
"aoColumns": [ \
{ "sWidth":"15px","mDataProp": "ISO Date","bSortable": false,"sType": "string", "bFilter": false },\
{ "sWidth":"175px","mDataProp": "ISO Date","bSortable": true,"sType": "date", "bFilter": true },\
{ "sWidth":"175px","mDataProp": "Short Domain","bSortable": true,"sType": "string" , "bFilter": true},\
{ "sWidth":"130px","mDataProp": "Date Registered", "bSortable": true, "sType": "date" , "bFilter": true}, \
{ "sWidth":"130px","mDataProp": "SRC IP","bSortable": true, "sType": "numeric" , "bFilter": true}, \
{ "sWidth":"130px","mDataProp": "DST IP","bSortable": true, "sType": "ip-address" , "bFilter": true}, \
{ "sWidth":"70px","mDataProp": "DST Port","bSortable": true, "sType": "numeric" , "bFilter": true}, \
{ "sWidth":"40%","mDataProp": "URL","bSortable": true,"sType": "string" , "bFilter": true},\
{ "sWidth":"30%","mDataProp": "SRC Geolocation","bSortable": true,"sType": "numeric" , "bFilter": true},\
{ "sWidth":"30%","mDataProp": "DST Geolocation","bSortable": true,"sType": "string" , "bFilter": true},\
{ "sWidth":"100px","mDataProp": "highest_alert","bSortable": true,"sType": "string" , "bFilter": true}\
]},\
"NITBEACONING": { "fields" : [ \
{"AccumuloName":"","DisplayName":"","dType":"","alertable":false},\
{"AccumuloName":"SrcIp","DisplayName":"Source IP","dType":"IP:SRC","alertable":true},\
{"AccumuloName":"Src Port","DisplayName":"Source Port","dType":"Port:SRC","alertable":false},\
{"AccumuloName":"DstIp","DisplayName":"Destination IP","dType":"IP:DST","alertable":true},\
{"AccumuloName":"Dst Port","DisplayName":"Destination Port","dType":"Port:DST","alertable":false},\
{"AccumuloName":"First Beacon","DisplayName":"First Beacon","dType":"NONE","alertable":false},\
{"AccumuloName":"Last Beacon","DisplayName":"Last Beacon","dType":"NONE","alertable":false},\
{"AccumuloName":"Beacon Interval","DisplayName":"Beacon Interval","dType":"NONE","alertable":false},\
{"AccumuloName":"Duration","DisplayName":"Duration","dType":"NONE","alertable":false},\
{"AccumuloName":"Total Beacons","DisplayName":"Total Beacons","dType":"NONE","alertable":false},\
{"AccumuloName":"Avg Bytes","DisplayName":"Average Bytes","dType":"NONE","alertable":false},\
{"AccumuloName":"Total Bytes","DisplayName":"Total Bytes","dType":"NONE","alertable":false},\
{"AccumuloName":"Avg Packets","DisplayName":"Average Packets","dType":"NONE","alertable":false},\
{"AccumuloName":"Total Packets","DisplayName":"Total Packets","dType":"NONE","alertable":false},\
{"AccumuloName":"highest_alert","DisplayName":"Highest Alert","dType":"Alert","alertable":false},\
{"AccumuloName":"Src Ip GeoLocation","DisplayName":"Source Location","dType":"GEO:SRC","alertable":false},\
{"AccumuloName":"Dst Ip GeoLocation","DisplayName":"Destination Location","dType":"GEO:DST","alertable":false}\
],\
"aoColumns": [ \
{ "sWidth":"130px","mDataProp": "SrcIp","bSortable": false,"sType": "ip-address", "bFilter": false },\
{ "sWidth":"130px","mDataProp": "SrcIp","bSortable": true,"sType": "ip-address", "bFilter": true },\
{ "sWidth":"70px","mDataProp": "Src Port", "bSortable": true, "sType": "numeric" , "bFilter": true}, \
{ "sWidth":"130px","mDataProp": "DstIp","bSortable": true,"sType": "ip-address" , "bFilter": true},\
{ "sWidth":"70px","mDataProp": "Dst Port", "bSortable": true, "sType": "numeric" , "bFilter": true}, \
{ "sWidth":"175px","mDataProp": "First Beacon","bSortable": true,"sType": "date", "bFilter": true },\
{ "sWidth":"175px","mDataProp": "Last Beacon","bSortable": true,"sType": "date" , "bFilter": true},\
{ "sWidth":"100px","mDataProp": "Beacon Interval","bSortable": true, "sType": "string" , "bFilter": true},\
{ "sWidth":"100px","mDataProp": "Duration","bSortable": true, "sType": "string" , "bFilter": true},\
{ "sWidth":"100px","mDataProp": "Total Beacons","bSortable": true, "sType": "numeric" , "bFilter": true}, \
{ "sWidth":"100px","mDataProp": "Avg Bytes","bSortable": true,"sType": "numeric" , "bFilter": true},\
{ "sWidth":"100px","mDataProp": "Total Bytes","bSortable": true,"sType": "numeric" , "bFilter": true},\
{ "sWidth":"100px","mDataProp": "Avg Packets","bSortable": true,"sType": "numeric" , "bFilter": true},\
{ "sWidth":"100px","mDataProp": "Total Packets","bSortable": true,"sType": "numeric" , "bFilter": true},\
{ "sWidth":"50%","mDataProp": "Src Ip GeoLocation","bSortable": true,"sType": "string" , "bFilter": true},\
{ "sWidth":"50%","mDataProp": "Dst Ip GeoLocation","bSortable": true,"sType": "string" , "bFilter": true},\
{ "sWidth":"100px","mDataProp": "highest_alert","bSortable": true,"sType": "string" , "bFilter": true}\
]},\
"LATERALNETFLOW": { "fields" : [ \
{"AccumuloName":"","DisplayName":"","dType":"","alertable":false},\
{"AccumuloName":"Flow Start Time","DisplayName":"Flow Start Time","dType":"ISO-Time:Start","alertable":false},\
{"AccumuloName":"Flow End Time","DisplayName":"Flow End Time","dType":"ISO-Time:End","alertable":false},\
{"AccumuloName":"SrcIp","DisplayName":"Source IP","dType":"IP:SRC","alertable":true},\
{"AccumuloName":"Src Port","DisplayName":"Source Port","dType":"Port:SRC","alertable":false},\
{"AccumuloName":"DstIp","DisplayName":"Destination IP","dType":"IP:DST","alertable":true},\
{"AccumuloName":"Dst Port","DisplayName":"Destination Port","dType":"Port:DST","alertable":false},\
{"AccumuloName":"Next Hop","DisplayName":"Next Hop","dType":"NONE","alertable":false},\
{"AccumuloName":"Packet Count","DisplayName":"Packet Count","dType":"NONE","alertable":false},\
{"AccumuloName":"Layer 3 Bytes","DisplayName":"Layer 3 Bytes","dType":"NONE","alertable":false},\
{"AccumuloName":"highest_alert","DisplayName":"Highest Alert","dType":"Alert","alertable":false},\
{"AccumuloName":"Src Ip GeoLocation","DisplayName":"Source Location","dType":"GEO:SRC","alertable":false},\
{"AccumuloName":"Dst Ip GeoLocation","DisplayName":"Destination Location","dType":"GEO:DST","alertable":false}\
],\
"aoColumns": [ \
{ "sWidth":"175px","mDataProp": "Flow Start Time","bSortable": false,"sType": "date", "bFilter": false },\
{ "sWidth":"175px","mDataProp": "Flow Start Time","bSortable": true,"sType": "date", "bFilter": true },\
{ "sWidth":"175px","mDataProp": "Flow End Time","bSortable": true,"sType": "date" , "bFilter": true},\
{ "sWidth":"130px","mDataProp": "SrcIp", "bSortable": true, "sType": "ip-address" , "bFilter": true}, \
{ "sWidth":"70px","mDataProp": "Src Port","bSortable": true, "sType": "numeric" , "bFilter": true}, \
{ "sWidth":"130px","mDataProp": "DstIp","bSortable": true, "sType": "ip-address" , "bFilter": true}, \
{ "sWidth":"70px","mDataProp": "Dst Port","bSortable": true, "sType": "numeric" , "bFilter": true}, \
{ "sWidth":"130px","mDataProp": "Next Hop","bSortable": true,"sType": "ip-address" , "bFilter": true},\
{ "sWidth":"70px","mDataProp": "Packet Count","bSortable": true,"sType": "numeric" , "bFilter": true},\
{ "sWidth":"100px","mDataProp": "Layer 3 Bytes","bSortable": true,"sType": "numeric" , "bFilter": true},\
{ "sWidth":"50%","mDataProp": "Src Ip GeoLocation","bSortable": true,"sType": "string" , "bFilter": true},\
{ "sWidth":"50%","mDataProp": "Dst Ip GeoLocation","bSortable": true,"sType": "string" , "bFilter": true},\
{ "sWidth":"100px","mDataProp": "highest_alert","bSortable": true,"sType": "string" , "bFilter": true}\
]},\
"XFILLNETFLOW": { "fields" : [ \
{"AccumuloName":"","DisplayName":"","dType":"","alertable":false},\
{"AccumuloName":"Flow Start Time","DisplayName":"Flow Start Time","dType":"ISO-Time:Start","alertable":false},\
{"AccumuloName":"Flow End Time","DisplayName":"Flow End Time","dType":"ISO-Time:End","alertable":false},\
{"AccumuloName":"SrcIp","DisplayName":"Source IP","dType":"IP:SRC","alertable":true},\
{"AccumuloName":"Src Port","DisplayName":"Source Port","dType":"Port:SRC","alertable":false},\
{"AccumuloName":"DstIp","DisplayName":"Destination IP","dType":"IP:DST","alertable":true},\
{"AccumuloName":"Dst Port","DisplayName":"Destination Port","dType":"Port:DST","alertable":false},\
{"AccumuloName":"Next Hop","DisplayName":"Next Hop","dType":"NONE","alertable":false},\
{"AccumuloName":"Packet Count","DisplayName":"Packet Count","dType":"NONE","alertable":false},\
{"AccumuloName":"Layer 3 Bytes","DisplayName":"Layer 3 Bytes","dType":"NONE","alertable":false},\
{"AccumuloName":"highest_alert","DisplayName":"Highest Alert","dType":"Alert","alertable":false},\
{"AccumuloName":"Src Ip GeoLocation","DisplayName":"Source Location","dType":"GEO:SRC","alertable":false},\
{"AccumuloName":"Dst Ip GeoLocation","DisplayName":"Destination Location","dType":"GEO:DST","alertable":false}\
],\
"aoColumns": [ \
{ "sWidth":"175px","mDataProp": "Flow Start Time","bSortable": false,"sType": "date", "bFilter": false },\
{ "sWidth":"175px","mDataProp": "Flow Start Time","bSortable": true,"sType": "date", "bFilter": true },\
{ "sWidth":"175px","mDataProp": "Flow End Time","bSortable": true,"sType": "date" , "bFilter": true},\
{ "sWidth":"130px","mDataProp": "SrcIp", "bSortable": true, "sType": "ip-address" , "bFilter": true}, \
{ "sWidth":"70px","mDataProp": "Src Port","bSortable": true, "sType": "numeric" , "bFilter": true}, \
{ "sWidth":"130px","mDataProp": "DstIp","bSortable": true, "sType": "ip-address" , "bFilter": true}, \
{ "sWidth":"70px","mDataProp": "Dst Port","bSortable": true, "sType": "numeric" , "bFilter": true}, \
{ "sWidth":"130px","mDataProp": "Next Hop","bSortable": true,"sType": "ip-address" , "bFilter": true},\
{ "sWidth":"70px","mDataProp": "Packet Count","bSortable": true,"sType": "numeric" , "bFilter": true},\
{ "sWidth":"100px","mDataProp": "Layer 3 Bytes","bSortable": true,"sType": "numeric" , "bFilter": true},\
{ "sWidth":"50%","mDataProp": "Src Ip GeoLocation","bSortable": true,"sType": "string" , "bFilter": true},\
{ "sWidth":"50%","mDataProp": "Dst Ip GeoLocation","bSortable": true,"sType": "string" , "bFilter": true},\
{ "sWidth":"100px","mDataProp": "highest_alert","bSortable": true,"sType": "string" , "bFilter": true}\
]}}';}
    else if( pagename.toUpperCase() === "search-page".toUpperCase() ) {
        jsonText = '{ "Categories": { "fields" : [ \
{"AccumuloName":"label","DisplayName":"Label","dType":"NONE","alertable":false},\
{"AccumuloName":"concept","DisplayName":"Concept","dType":"NONE","alertable":false},\
{"AccumuloName":"state","DisplayName":"State","dType":"NONE","alertable":true},\
{"AccumuloName":"county","DisplayName":"County","dType":"NONE","alertable":false}\
],\
"aoColumns": [ \
{ "sWidth":"108px","mDataProp": "label","bSortable": true,"sType": "string", "bFilter": true },\
{ "sWidth":"104px","mDataProp": "concept","bSortable": true,"sType": "string" , "bFilter": true},\
{ "sWidth":"86px","mDataProp": "state", "bSortable": true, "sType": "string" , "bFilter": true}, \
{ "sWidth":"58px","mDataProp": "county","bSortable": true, "sType": "string" , "bFilter": true}, \
{ "sWidth":"0px","mDataProp": "rowId","sType": "string" , "bVisible": false }\
]},\
"ACS": { "fields" : [\
{"AccumuloName":"ISO_Date","DisplayName":"ISO Date","dType":"ISO-Time:Start","alertable":false},\
{"AccumuloName":"enriched-ipAndPort-splitIp","DisplayName":"Source IP","dType":"IP:SRC","alertable":true},\
{"AccumuloName":"enriched-ipAndPort-splitPort","DisplayName":"Source Port","dType":"Port:SRC","alertable":false},\
{"AccumuloName":"ip","DisplayName":"DNS Server IP","dType":"IP:DST","alertable":true},\
{"AccumuloName":"destinationDns","DisplayName":"Domain Name","dType":"Domain:Full","alertable":true},\
{"AccumuloName":"enriched-ipAndPort-splitIp-GeoLocation","DisplayName":"Source Location","dType":"GEO:SRC","alertable":false},\
{"AccumuloName":"ip-GeoLocation","DisplayName":"DNS Server Location","dType":"GEO:DST","alertable":false},\
{"AccumuloName":"highest_alert","DisplayName":"Highest Alert","dType":"Alert","alertable":false}\
],\
"aoColumns": [ \
{ "sWidth":"175px","mDataProp": "ISO_Date","bSortable": true,"sType": "date" , "bFilter": true},\
{ "sWidth":"130px","mDataProp": "enriched-ipAndPort-splitIp", "bSortable": true, "sType": "ip-address" , "bFilter": true}, \
{ "sWidth":"70px","mDataProp": "enriched-ipAndPort-splitPort","bSortable": true, "sType": "numeric" , "bFilter": true}, \
{ "sWidth":"130px","mDataProp": "ip","bSortable": true, "sType": "ip-address" , "bFilter": true}, \
{ "sWidth":"200px","mDataProp": "destinationDns","bSortable": true,"sType": "domain" , "bFilter": true},\
{ "sWidth":"50%","mDataProp": "enriched-ipAndPort-splitIp-GeoLocation","bSortable": true,"sType": "string" , "bFilter": true},\
{ "sWidth":"50%","mDataProp": "ip-GeoLocation","bSortable": true,"sType": "string" , "bFilter": true},\
{ "sWidth":"100px","mDataProp": "highest_alert","bSortable": true,"sType": "string" , "bFilter": true}\
]},\
"CBP": { "fields" : [\
{"AccumuloName":"ISO_Date","DisplayName":"Event Time","dType":"ISO-Time:Start","alertable":false},\
{"AccumuloName":"src","DisplayName":"Source IP","dType":"IP:SRC","alertable":true},\
{"AccumuloName":"s_port","DisplayName":"Source Port","dType":"Port:SRC","alertable":false},\
{"AccumuloName":"dst","DisplayName":"Destination IP","dType":"IP:DST","alertable":true},\
{"AccumuloName":"service_id","DisplayName":"Service ID","dType":"NONE","alertable":false},\
{"AccumuloName":"service","DisplayName":"Service","dType":"NONE","alertable":false},\
{"AccumuloName":"Metadata-Label","DisplayName":"MetaData Label","dType":"NONE","alertable":false},\
{"AccumuloName":"src-GeoLocation","DisplayName":"Source GeoLocation","dType":"GEO:SRC","alertable":false},\
{"AccumuloName":"dst-GeoLocation","DisplayName":"Destination GeoLocation","dType":"GEO:DST","alertable":false},\
{"AccumuloName":"highest_alert","DisplayName":"Highest Alert","dType":"Alert","alertable":false}\
], \
"aoColumns": [ \
{ "sWidth":"175px","mDataProp": "ISO_Date","bSortable": true,"sType": "date" , "bFilter": true},\
{ "sWidth":"130px","mDataProp": "src", "bSortable": true, "sType": "ip-address" , "bFilter": true}, \
{ "sWidth":"70px","mDataProp": "s_port","bSortable": true, "sType": "numeric" , "bFilter": true}, \
{ "sWidth":"130px","mDataProp": "dst","bSortable": true, "sType": "ip-address" , "bFilter": true}, \
{ "sWidth":"125px","mDataProp": "service_id","bSortable": true,"sType": "string" , "bFilter": true},\
{ "sWidth":"70px","mDataProp": "service","bSortable": true,"sType": "numeric" , "bFilter": true},\
{ "sWidth":"75px","mDataProp": "Metadata-Label","bSortable": true,"sType": "string" , "bFilter": true},\
{ "sWidth":"50%","mDataProp": "src-GeoLocation","bSortable": true,"sType": "string" , "bFilter": true},\
{ "sWidth":"50%","mDataProp": "dst-GeoLocation","bSortable": true,"sType": "string" , "bFilter": true},\
{ "sWidth":"100px","mDataProp": "highest_alert","bSortable": true,"sType": "string" , "bFilter": true}\
]}\
}';
    }
    sourceFields = JSON.parse( jsonText );
}

var runQueryFlag = false;

function loadParameters() {
    // If a Source IP is provided load the parameters being sent in
    if( GetURLParameter("runQuery") != undefined ) {
        //document.getElementById('host1IP').value = GetURLParameter("SrcIp");
//        document.getElementById('host2IP').value = GetURLParameter("DstIp");
        document.getElementById('startDate').value = decodeURI(GetURLParameter("startTime"));
        document.getElementById('endDate').value = decodeURI(GetURLParameter("endTime"));
       // $('#checkBox_Mcafee').prop('checked', true);
        //$('#checkBox_Mcafee').trigger("change");
    }
    
    // Run the incoming query
    if( GetURLParameter("runQuery") == "true" ) {
        runQueryFlag = true;
    }
}

//String startswWith function
if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str){
    return this.slice(0, str.length) == str;
  };
}
//String endsWith function
if (typeof String.prototype.endsWith != 'function') {
  String.prototype.endsWith = function (str){
    return this.slice(-str.length) == str;
  };
}

// Override the Date object, Get the current Date and Time 
Date.prototype.currentDate = function(dayDiff) { 
    var date = this.getDate() + dayDiff;
    return (((this.getMonth()+1) < 10) ? "0" : "") + 
        (this.getMonth()+1) + "/" + 
        ((date < 10) ? "0" : "") + 
        date + "/" + 
        this.getFullYear();
};
// Time now
Date.prototype.currentTime = function(minDiff) {
    var time = new Date(this.getTime() + minDiff * 60000);
    return ((time.getHours() < 10) ? "0" : "") + 
        time.getHours() + ":" + ((time.getMinutes() < 10) ? "0" : "") + 
        time.getMinutes() + ":" + ((time.getSeconds() < 10)? "0" : "") + 
        time.getSeconds();
};
 

