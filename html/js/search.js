var initialSidebarSize = 175;
var pageName = "search";

//You must import func.js first!
$(document).ready(function()
{

	var keyWord = getUrlParameter("keyword");
	var location = getUrlParameter("location");
	var body = $("#results");
	body.css('margin-left',initialSidebarSize + 66);
	$("#sidebar").width(initialSidebarSize);

	generateConceptFacets(keyWord, location);
	generateLabelFacets(keyWord, location);
	generateGeoFacets(keyWord, location);
	generateSearchResults(keyWord, location, true);

	$("#input-keyword").val(keyWord);
	$("#input-location").val(location);

	if (location != "") {
		$(".results-searchLocation").html(location);
	}

	//Bind Events
	$(".next").click(function(e){
		offset += 25;
		$(".results-moduleBody").html(loadingDiv);
		generateSearchResults(getUrlParameter("keyword"),getUrlParameter("location"));
		//e.preventDefault();
	});

	$(".prev").click(function(e){
		offset = offset < 25 ? 0 : offset-25;
		$(".results-moduleBody").html(loadingDiv);
		generateSearchResults(getUrlParameter("keyword"),getUrlParameter("location"));
		//e.preventDefault();
	});

	$('.moduleHeader').click(function() {
		var parent = $(this).parent();
		parent.find('.results-moduleBody').slideToggle();
		if (!parent.find('.icon').hasClass("open")){
			parent.find('.icon').toggleClass("open").html("&#9662;");
		} else {
			parent.find('.icon').toggleClass("open").html("&#9656;");
		}
	});

	$("#intro-form input").keypress(function(event) {
		if (event.which == 13) {
			event.preventDefault();
			$("#intro-form").submit();
		}
	});

	$("#input-saveButton").click(function(){
		$.ajax({
			dataType:"json",
			type: 'POST',
			url: hostname + "/dataset*/_search?pretty",
			data: JSON.stringify(lastOptions)
		}).done(function(result) {
				var newURL = 'data:text/json;charset=utf8,' + encodeURIComponent(JSON.stringify(result));
				window.open(newURL, '_blank');
				window.focus();
			}
		);
	});

	interact('.resize')
		.resizable(true)
		.on('resizemove', function (event) {
			var target = event.target;
			var newWidth  = parseFloat(target.style.width ) + event.dx;

			if (newWidth > 150) {
				// add the change in coords to the previous width of the target element
				body.css('margin-left',parseFloat(body.css('margin-left'))+event.dx);

				// update the element's style
				target.style.width  = newWidth + 'px';
			}
		});
});