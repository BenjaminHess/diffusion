$(document).ready(function()
{
	addMapModule("Map Visualization");
	addDataModule("Data Visualization");

	var keyWord = getUrlParameter("keyword");
	var location = getUrlParameter("location");
	generateConceptFacets(keyWord, location);
	generateLabelFacets(keyWord, location);
	generateGeoFacets(keyWord, location);
	generateSearchResults(keyWord, location);

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
});