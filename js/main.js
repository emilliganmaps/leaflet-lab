function createSequenceControls(map, attributes){   
    var SequenceControl = L.Control.extend({
        options: {
            position: 'bottomleft'
        },

        onAdd: function (map) {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'sequence-control-container');

            //create range input element (slider)
            $(container).append('<input class="range-slider" type="range">');

            //add skip buttons
            $(container).append('<button class="skip" id="reverse">Previous Year</button>');
            //name forward button
            $(container).append('<button class="skip" id="forward">Next Year</button>');
            
            L.DomEvent.disableClickPropagation(container);
            return container;
        }
    });
    
    map.addControl(new SequenceControl());
    
            //set slider attributes
            $('.range-slider').attr({
                max: 14,
                min: 0,
                value: 0,
                step: 1
            });
            
            //slider listener
            $('.range-slider').on('input', function(){
                var index = $(this).val();
            //update symbols as slider moves   
                updatePropSymbols(map, attributes[index]);
            });
            
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

function createLegend(map, attributes){
    var LegendControl = L.control.extend({
        options: {
            position: 'bottomright'
        },
        onAdd: function (map) {
            var container = L.DomUtil.create('div', 'legend-control-container');
            $(container).append('<div id="temporal-legend">')
            
            var svg = 'svg id="attribute-legend" width="180px" height=180px">';
            
            $(container).append(svg);
            
            $('.range-slider').on('input', function(){
                var index = $(this).val();
                updatePropSymbols(map, attributes[index]);
                $(container).text(attributes[index]);
            });
            
            $('.skip').click(function(){
                var index = $('.range-slider').val();
                if ($(this).attr('id') == 'forward'){
                    index++;
                    index = index > 14 ? 0 : index;
                } else if ($(this).attr('id') == 'reverse'){
                    index--;
                    index = index < 0 ? 14 : index;
                };
                
                updatePropSymbols(map, attributes[index]);
                
                $(container).text(attributes[index]);
            });
            return container;
        }
    });
    map.addControl(new LegendControl());
};

function createPopup(properties, attribute, layer, radius){
    var popupContent = "<p><b>County:</b> " + properties.county + "</p>";
    var year = attribute.split("_")[0];
    popupContent += "<p><b>Number of reported pertussis cases in " + year + ":</b> " + properties[attribute];
    
    layer.bindPopup(popupContent, {
        offset: new L.Point(0,-radius)
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

            createPopup(props, attribute, layer, radius);
        };
	});
};

//create function to make the proportional symbols of a certain color, fill, opacity, etc
function pointToLayer(feature, latlng, attributes){
	
	var attribute = attributes[0];
    
	var geojsonMarkerOptions = {
		fillColor: "#920229",
        color: "#7E0828",
		weight: 1,
		opacity: 1,
		fillOpacity: 0.8
	};
	
	var attValue = Number(feature.properties[attribute]);
	geojsonMarkerOptions.radius = calcPropRadius(attValue);
    
    mainLayer = L.circleMarker(latlng, geojsonMarkerOptions);
	
	createPopup(feature.properties, attribute, mainLayer, geojsonMarkerOptions.radius);
	
	return mainLayer;		
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

//create a second layer of points for population data
function getNextLayer(map){
    //load the data
    $.ajax("data/ca_pop.geojson", {
        dataType: "json",
        success: function(response){
          //reapply proportional symbol functions to new layer 
          newLayer = L.geoJson(response, {
              pointLayer: function(feature, latlng) {
                //only uses one year of data
                var attribute = "pop_2015";
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
                          layer.bindPopup("<b>\nPopulation (2015): </b> " + feature.properties.pop_2015);
                        },
                  createPropSymbols: function(data) {
                    var attribute = "pop_2015";
                  }
            }).addTo(map);
          controlLayers(map);
		 }
    });
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

//Update the legend with new attribute
function updateLegend(map, attribute){
    //create content for legend
    var year = attribute.split("_")[1];
    var content = "Population in " + year;

    //replace legend content
    $('#temporal-legend').html(content);
};

function createLegend(map, attributes){
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },

        onAdd: function (map) {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');

            //add temporal legend div to container
            $(container).append('<div id="temporal-legend">')

            //Step 1: start attribute legend svg string
            var svg = '<svg id="attribute-legend" width="180px" height="180px">';

            //add attribute legend svg to container
            $(container).append(svg);
            
            

            return container;
        }
    });

    map.addControl(new LegendControl());
    
    updateLegend(map, attributes[0]);
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