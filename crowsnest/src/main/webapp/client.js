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
            //Connection.pingTimer = setInterval(Connection.ping, Connection.pingInterval);
        };

        this.socket.onmessage = function(message){
            data = JSON.parse(message.data);
            Command.handle(data);
        };

        this.socket.onclose = function(){
            Connection.close();
        };    
        
        this.socket.onerror = function( error ) {
            error.preventDefault();
            // reset the Query button 
            $("#query").button('reset');
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
                      "EXPORT"],

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

    handleTABLE_UPDATE: function(returnData) {
        var tableName = returnData['table'];
        //console.log(returnData.data);
        var toSplice = [];
        $.each(returnData.data,function(i, val) {
            //console.log(val);
            if(val['update'] === "stitching"){
                var b = $("#table_"+tableName).dataTable().fnFindCellRowIndexes(val['rowId'], 'rowId' );
                console.log(b);
                if(b.length === 0){
                    return true;
                }
                tables[tableName].fnUpdate( val, b[0] );
                toSplice.push(b);
            }
        });
        $.each(toSplice,function(i,val){ returnData.data = returnData.data.splice(val,1)});
        tables[tableName].fnAddData(returnData.data);
    },

    handleCLOSE_QUERY: function(returnData) {
        console.log(returnData);
        $('#li_'+returnData.table).html('<a class="indicator">'+returnData.table+'</a>');
        // reset the Query button 
        queryBtn.button('reset');
    },

    handleDOWNLOAD_EXPORT: function(returnData){
        window.open(returnData.data);
    }
};

var asInitVals = new Array();
var sourceFields = JSON.parse('{\
"Categories": { "fields" : \
["FlowStartTime","FlowEndTime","SrcIp","SrcPort","DstIp","DstPort","Next Hop", \
"PacketCount","Layer_3_Bytes","IP_Protocol","highest_alert","flowStatus","Flow_Count","SrcIp-GeoLocation","DstIp-GeoLocation","rowId"], \
"alert_fields" : ["SrcIp","DstIp"], \
"aoColumns": [ \
{ "sWidth":"108px","mDataProp": "FlowStartTime","bSortable": true,"sType": "date", "bFilter": true },\
{ "sWidth":"104px","mDataProp": "FlowEndTime","bSortable": true,"sType": "date" , "bFilter": true},\
{ "sWidth":"86px","mDataProp": "SrcIp", "bSortable": true, "sType": "ip-address" , "bFilter": true}, \
{ "sWidth":"58px","mDataProp": "SrcPort","bSortable": true, "sType": "numeric" , "bFilter": true}, \
{ "sWidth":"86px","mDataProp": "DstIp","bSortable": true, "sType": "ip-address" , "bFilter": true}, \
{ "sWidth":"80px","mDataProp": "DstPort","bSortable": true, "sType": "numeric" , "bFilter": true}, \
{ "sWidth":"86px","mDataProp": "Next Hop","bSortable": true,"sType": "ip-address" , "bFilter": true},\
{ "sWidth":"58px","mDataProp": "PacketCount","bSortable": true,"sType": "numeric" , "bFilter": true},\
{ "sWidth":"58px","mDataProp": "Layer_3_Bytes","bSortable": true,"sType": "numeric" , "bFilter": true},\
{ "sWidth":"68px","mDataProp": "IP_Protocol","bSortable": true,"sType": "numeric" , "bFilter": true},\
{ "sWidth":"62px","mDataProp": "highest_alert","bSortable": true,"sType": "string" , "bFilter": true},\
{ "sWidth":"54px","mDataProp": "flowStatus","bSortable": true,"sType": "string" , "bFilter": true},\
{ "sWidth":"48px","mDataProp": "Flow_Count","bSortable": true,"sType": "string" , "bFilter": true},\
{ "sWidth":"108px","mDataProp": "SrcIp-GeoLocation","bSortable": true,"sType": "string" , "bFilter": true},\
{ "sWidth":"108px","mDataProp": "DstIp-GeoLocation","bSortable": true,"sType": "string" , "bFilter": true},\
{ "sWidth":"0px","mDataProp": "rowId","sType": "string" , "bVisible": false }\
], \
"columnNames": ["Flow Start Time", "Flow End Time", "Source IP", "Source Port", "Destination IP", "Destination Port", \
"Next Hop", "Packet Count", "Layer 3 Bytes", "IP Protocol", "Highest Alert", "Flow Status", \
"Flow Count", "Source Location", "Destination Location"] \
},\
"ACS": { "fields" : \
["ISO_Date","enriched-ipAndPort-splitIp","enriched-ipAndPort-splitPort","ip","destinationDns",\
"enriched-ipAndPort-splitIp-GeoLocation", "ip-GeoLocation", "highest_alert"], \
"alert_fields" : ["enriched-ipAndPort-splitIp","ip"], \
"aoColumns": [ \
{ "sWidth":"175px","mDataProp": "ISO_Date","bSortable": true,"sType": "date" , "bFilter": true},\
{ "sWidth":"130px","mDataProp": "enriched-ipAndPort-splitIp", "bSortable": true, "sType": "ip-address" , "bFilter": true}, \
{ "sWidth":"70px","mDataProp": "enriched-ipAndPort-splitPort","bSortable": true, "sType": "numeric" , "bFilter": true}, \
{ "sWidth":"130px","mDataProp": "ip","bSortable": true, "sType": "ip-address" , "bFilter": true}, \
{ "sWidth":"200px","mDataProp": "destinationDns","bSortable": true,"sType": "domain" , "bFilter": true},\
{ "sWidth":"50%","mDataProp": "enriched-ipAndPort-splitIp-GeoLocation","bSortable": true,"sType": "string" , "bFilter": true},\
{ "sWidth":"50%","mDataProp": "ip-GeoLocation","bSortable": true,"sType": "string" , "bFilter": true},\
{ "sWidth":"100px","mDataProp": "highest_alert","bSortable": true,"sType": "string" , "bFilter": true}\
], \
"columnNames": ["ISO Date", "Split IP", "Split Port", "IP Address", "Destination DNS", "Split IP GeoLocation", \
"IP GeoLocation", "Highest Alert"] \
},\
"CBP": { "fields" : \
["ISO_Date","src","s_port","dst","service_id","service","Metadata-Label","src-GeoLocation", "dst-GeoLocation", "highest_alert"], \
"alert_fields" : ["src","dst"], \
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
], \
"columnNames": ["ISO Date", "Source", "Source Port", "Destination", "Service ID", "Service", \
"MetaData Label", "Source GeoLocation", "Destination GeoLocation", "Highest Alert"] \
}\
}');

function generateDatasets(){
    //  var setHtml = "<legend>Datasets</legend><div>";
    var setHtml = "";
    $.each(sourceFields,function(i, val) {
        setHtml += 
            '<div class="checkbox"> \
<label> \
<input id="checkBox_' + i + '" name="' + i + '" type="checkbox" value="" style="opacity: 0;">' + i +
    '</label> \
</div>'
    });
    setHtml += '</div>';
    $('#datasets').html(setHtml);
    $('#datasets input').change(function(){
        if(this.checked){
            addDatasetToTable(this.name);
        }else{
            removeDatasetFromTable(this.name);
        }
    });
}

function addDatasetToTable(id){
    $('#data-tabs > ul > li.active').removeClass('active');
    $("#data-tabs > ul").append(
        '<li id="li_' + id + '" class="active"> \
            <a href="#tab_' + id + '" class="indicator">'+id+'</a> \
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
}

function selectTab( tabId ) {
    $("#data-tabs>ul>li.active").removeClass("active");
    $('#li_'+tabId).addClass("active");
}

function showTable( id ) {
    $(".tab-pane").removeClass('active');
    $(".tab-pane#tab_" + id).addClass('active');
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
    $.each(info["columnNames"],function(j,value){
        tableHtml = tableHtml + '<th class="sorting">' + value + '</th>';
    });
    tableHtml = tableHtml + '</tr></thead><tbody></tbody><tfoot id="tableFooter_' + id + '"><tr>';
    tableHtml = tableHtml + '</tr></tfoot></table>';
    $('#TableContainer_'+id).html(tableHtml);

    var oTable = $('#table_'+id).dataTable({
        "sDom": 'Rlfrtip',
        "iDisplayStart": 25,
        "aLengthMenu": [10,25, 50, 100, 200, 500],
        "bAutoWidth": true,
        "aaSorting": [[ 0, "desc" ]], 
        "aoColumns": info.aoColumns,
        "fnCreatedRow": function(nRow, aData, iDataIndex) {


            var innerDiv = "";
            var alertLevelHighlight = "safe";
            
            // Add an inner DIV to each Table cell to make
            // sure the content gets trimmed if it's too long
            $.each(nRow.children, function(index, element) {
                element.innerHTML = "<div class='cell-content'>" + element.innerText + "</div>";
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
            
            $(nRow.firstElementChild.firstChild).addClass( alertLevelHighlight );
            
            if(aData['update'] === "true"){
                //$(nRow).addClass("transition");
                $(nRow).bind("webkitAnimationEnd", function() {
                    $(nRow).removeClass('updatedRow');
                });
                $(nRow).addClass("updatedRow");

            }
            
//            var source_location_text = aData["SrcIp-GeoLocation"];
//            var des_location_text = aData["DstIp-GeoLocation"];
//            
//            if(source_location_text !== "UNKNOWN") {
//                $('td:eq(13)', nRow).html( source_location_text.substring( 0, source_location_text.indexOf(":") ) );
//            }
//            
//            if(des_location_text !== "UNKNOWN") {
//                $('td:eq(14)', nRow).html( des_location_text.substring( 0, des_location_text.indexOf(":") ) );
//            }
            
        }} );

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

    $('#table_'+id).on('click', 'tbody>tr', function () {
        var nTr = this;
        if ( oTable.fnIsOpen(nTr) )
        {
            oTable.fnClose(nTr);
        }
        else
        {
            oTable.fnOpen( nTr, fnFormatDetails(oTable, nTr), 'details' );
        }
    } );
}

//Init application and bind functions.
$(document).ready(function() {
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
    } );
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
    } );
    var server = GetURLParameter('server');
    if($.trim(server) == 'local') {
        Connection.init("wss://localhost:50030/data/interface");
    } else{
        Connection.init("wss://10.128.104.105:50030/data/interface");
    }
});

if (typeof String.prototype.contains === 'undefined') { String.prototype.contains = function(it) { return this.indexOf(it) != -1; }; }
$(window).bind('beforeunload',function(){
    Connection.close();
    console.log("socket closed");
    //alert("closing");
});

$("#query").on('click',function(){
    console.log("sent QUERY");
    console.log(buildQuery());
    Connection.send(Command.build("QUERY",buildQuery()));
    $.each(tables,function(key,value){
        value.fnClearTable();
    });
    updateIndicators();
    // Set the Query button / indicator to loading status to indicate
    queryBtn = $("#query");
    queryBtn.button('loading');
});

$("#exportTable").on('click',function(){
    /*var filteredrows = $("#table_Firewall").dataTable()._('tr', {"filter": "applied"});
  var command = Command.build("EXPORT",'{"fields":' + 
    JSON.stringify(sourceFields['Firewall']['fields']) + 
    ',"data":' + JSON.stringify(filteredrows) +'}');
  Connection.send(command);  
  console.log(command);
  */
    //console.log(tables[currentTable]);
    var b = $("#table_"+currentTable).dataTable().fnFindCellRowIndexes('NETFLOW_20140211-44f206a1da23', 'rowId' );
    console.log(b);
});

function buildQuery(){
    var fullQuery = '{';
    if(document.getElementById('checkBox_Continuous').checked){
        fullQuery += '"queryType":"liveUpdate",';
    } else {
        fullQuery += '"queryType":"search",';
    }
    fullQuery += '"sources":[';
    for(key in tables){
        var json = '{"source":"' + key + '",';
        json += '"alerts":' + JSON.stringify(sourceFields[key].alert_fields) + ','; 
        json += '"fields":' + JSON.stringify(sourceFields[key].fields);
        json += '},'; 
        fullQuery += json;
    }
    fullQuery = fullQuery.substring(0,fullQuery.length -1);
    fullQuery += '],"queryParams":{' + getDates() + ',' + getHosts() + '}}';
    return fullQuery;
}

function updateIndicators(){
    $("#data-tabs ul li a.indicator").each(function(x,y){
        if($(y).contents().length === 1){
            $(y).append('<div id="facebook"><div id="block_1" class="facebook_block"></div>\
<div id="block_2" class="facebook_block"></div><div id="block_3" class="facebook_block"></div>');
        }
    })
}

function fillDefaults(){
    document.getElementById('host1IP').value = "128.229.32.[100-105]";
    document.getElementById('host1Port').value = "";
    document.getElementById('host2IP').value = "";
    document.getElementById('host2Port').value = "";
    document.getElementById('startDate').value = "03/03/2014 00:00:00";
    document.getElementById('endDate').value = "03/04/2014 00:00:00";
    

    document.getElementById('checkBox_Direction_To').checked = true;
    document.getElementById('checkBox_Direction_From').checked = true;
    //document.getElementById('checkBox_Continuous').checked = true;
    $('#checkBox_Netflow').prop('checked', true);
    $('#checkBox_Netflow').trigger("change");
}

function getDates(){
    var datesStr = '"sdate":"' + document.getElementById('startDate').value + '",';
    datesStr += '"edate":"' + document.getElementById('endDate').value + '"';
    return datesStr;
}
function getHosts(){
    var hostsStr = '"host1":"' + document.getElementById('host1IP').value + '",';
    hostsStr += '"host1Port":"' + document.getElementById('host1Port').value + '",';
    hostsStr += '"host2":"' + document.getElementById('host2IP').value + '",';
    hostsStr += '"host2Port":"' + document.getElementById('host2Port').value + '",';

    hostsStr += '"direction":"';
    if(document.getElementById('checkBox_Direction_To').checked && document.getElementById('checkBox_Direction_From').checked){
        hostsStr += 'To,From"';
    } else if(document.getElementById('checkBox_Direction_To').checked){
        hostsStr += 'To"';
    } else {
        hostsStr += 'From"';
    }
    return hostsStr;
}

function fnFormatDetails ( oTable, nTr )
{
    var aData = oTable.fnGetData( nTr );
    var sOut = '<table class="expandedRowTable">';
    if(aData['alert_flags'] !== undefined){
        $.each(aData['alert_flags'], function(i,value){
            var left = "ALERT - " + value.source + ':\n';
            var right = value.entity + " - " + value.reason + '\n';
            sOut += '<tr class="expandedRow"><td class="expandedLeft">'+left+'</td><td class="expandedRight">'+right+'</td></tr>';
        });
        
    }
    $.each(sourceFields[currentTable].fields, function(index, value){
        if(value !== 'highest_alert'){
            sOut += '<tr class="expandedRow"><td class="expandedLeft">'+ value +':</td><td class="expandedRight">'+aData[value]+'</td></tr>';
        }
    });

    //sOut += '<tr><td>Highest Alert:</td><td>'+JSON.stringify(aData['highest_alert'])+'</td></tr>';
    sOut += '</table>';
    return sOut;
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
    t=setTimeout(function(){startTime()},500);
}

function checkTime(i)
{
    if (i<10)
    {
        i="0" + i;
    }
    return i;
}

function GetURLParameter(sParam)
{
    var sPageURL = window.location.search.substring(1);
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

function submit() {
    return null;
}

function messageSendFailed( error ) {}





