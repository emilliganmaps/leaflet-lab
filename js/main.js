function createSequenceControls(map, attributes){
    //create range input element (slider)
    $('#panel').append('<input class="range-slider" type="range">');

    //set slider attributes
    $('.range-slider').attr({
        max: 14,
        min: 0,
        value: 0,
        step: 1
    });
    
    //name reverse button
    $('#panel').append('<button class="skip" id="reverse">Previous Year</button>');
    //name forward button
    $('#panel').append('<button class="skip" id="forward">Next Year</button>');

    $('.skip').click(function(){
        //get the old index value
        var index = $('.range-slider').val();

        //forward one step or backward one step
        if ($(this).attr('id') == 'forward'){
            index++;
            //loops to first once end of slider is reached
            index = index > 14 ? 0 : index;
        } else if ($(this).attr('id') == 'reverse'){
            index--;
            //loops to last once beginning of slider is reached
            index = index < 0 ? 14 : index;
        };

        //update slider
        $('.range-slider').val(index);
        //update symbols
        updatePropSymbols(map, attributes[index]);
    });
};

function updatePropSymbols(map, attribute){
    map.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
            //access feature properties
            var props = layer.feature.properties;

            //update each feature's radius based on new attribute values
            var radius = calcPropRadius(props[attribute]);
            layer.setRadius(radius);

            //add city to popup content string
            var popupContent = "<p><b>County:</b> " + props.county + "</p>";

            //add formatted attribute to panel content string
            var year = attribute.split("_")[0];
            popupContent += "<p><b>Number of reported pertussis cases in " + year + ":</b> " + props[attribute];

            //replace the layer popup
            layer.bindPopup(popupContent, {
                offset: new L.Point(0,-radius)
            });
        };
	});
};

//create function to make the proportional symbols of a certain color, fill, opacity, etc
function pointToLayer(feature, latlng, attributes){
	
	var attribute = attributes[0];
    
	var geojsonMarkerOptions = {
		fillColor: "#73435A",
        color: "#73435A",
		weight: 1,
		opacity: 1,
		fillOpacity: 0.6
	};
	
	var attValue = Number(feature.properties[attribute]);
	geojsonMarkerOptions.radius = calcPropRadius(attValue);
    
    var layer = L.circleMarker(latlng, geojsonMarkerOptions);
	
	//build popup content string starting with city...Example 2.1 line 24
	var popupContent = "<p><b>County:</b> " + feature.properties.county + "</p>";

	//add formatted attribute to popup content string
	var year = attribute.split("_")[0];
	
	popupContent += "<p><b>Reported cases of pertussis in " + year + ":</b> " + feature.properties[attribute];
	
	//bind the popup to the circle marker
    layer.bindPopup(popupContent, {
		offset: new L.point(0, -geojsonMarkerOptions.radius)
	});
	
	return layer;		
};

function processData(data){
    //empty array to hold attributes
    var attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with population values
        if (attribute.indexOf("0") > -1){
            attributes.push(attribute);
        };
    };

    return attributes;
};
	
function createPropSymbols(data, map, attributes){
	//adjusts the symbols for each data point to reflect its value using the calcPropRadius function results
	L.geoJson(data, {
		pointToLayer: function(feature,latlng){
			return pointToLayer(feature,latlng,attributes);
		}
	}).addTo(map);
};

//function to retrieve the data and place it on the map
function getData(map){
    //load the data
    $.ajax("data/ca_pertussis.geojson", {
        dataType: "json",
        success: function(response){  
			//create an attributes array
            var attributes = processData(response);
                    createPropSymbols(response, map, attributes);
                    createSequenceControls(map, attributes);
		}
    });
};

//create a second layer of points for population data
function getNextLayer(map){
    //load the data
    $.ajax("data/population.geojson", {
        dataType: "json",
        success: function(response){
          //reapply proportional symbol functions to new layer 
          newLayer = L.geoJson(response, {
              pointLayer: function(feature, latlng) {
                //only uses one year of data
                var attribute = "pop_2018";
                var attValue = Number(feature.properties[attribute]);
            
                function calcPropRadius(attValue) {
                  //scale factor to adjust symbol size evenly
                  var scaleFactor = 15;
                  //area based on attribute value and scale factor
                  var area = attValue * scaleFactor;
                  //radius calculated based on area
                  var radius = Math.sqrt(area/Math.PI);

                  return radius;
                };
                      
                },
                  onEachFeature: function(feature, layer) {
                          layer.bindPopup("<b>\nPopulation (2018): </b> " + feature.properties.pop_2018);
                        },
                  createPropSymbols: function(data) {
                    var attribute = "pop_2018";
                  }
            }).addTo(map);
          controlLayers(map);
		 }
    });
};

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //scale factor to adjust symbol size evenly
    var scaleFactor = 15;
    //area based on attribute value and scale factor
    var area = attValue * scaleFactor;
    //radius calculated based on area
    var radius = Math.sqrt(area/Math.PI);

    return radius;
}; 


//function call to create the leaflet map
function createMap(){
    //zooms automatically to California
    var map = L.map('map', {
        center: [36.7783, -119.4179],
        zoom: 6
    });

//mapbox basemap
L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoiZW1pbGxpZ2FuIiwiYSI6ImNqczg0NWlxZTBia2U0NG1renZyZDR5YnUifQ.UxV3OqOsN6KuZsclo96yvQ', {
    //map attribution
    attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery &copy; <a href="http://mapbox.com">Mapbox</a>',
    maxZoom: 18,
    //uses mapbox streets as opposed to satellite imagery, etc.
    id: 'mapbox.light',
    //my unique access token
    accessToken: 'pk.eyJ1IjoiZW1pbGxpZ2FuIiwiYSI6ImNqczg0NWlxZTBia2U0NG1renZyZDR5YnUifQ.UxV3OqOsN6KuZsclo96yvQ'
}).addTo(map);
    
        getData(map);
        getNextLayer(map);
};

//make population a controllable layer
function controlLayers(map){
    var overlayMaps = {
        "Population": newLayer
    };
//toggle population points on and off
    L.control.layers(null, overlayMaps).addTo(map);
};

//create map when everything has been intialized
$(document).ready(createMap);