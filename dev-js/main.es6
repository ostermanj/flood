 /* exported theMap, Sharc, Helpers, d3Tip, reflect, arrayFind, SVGInnerHTML, SVGFocus, createBrowseButton */ // let's jshint know that D3Charts can be "defined but not used" in this file
 /* polyfills needed: Promise TO DO: OTHERS?
 */
/*
import { reflect, arrayFind, SVGInnerHTML, SVGFocus } from '../js-vendor/polyfills';
import { Helpers } from '../js-exports/Helpers';
import { d3Tip } from '../js-vendor/d3-tip';
import { createBrowseButton } from '../js-exports/BrowseButtons';
import { createResultItem } from '../js-exports/ResultItems'; 
*/

/*
to do : see also https://www.mapbox.com/mapbox-gl-js/example/heatmap-layer/


*/
window.theMap  = (function(){   
"use strict";  
    mapboxgl.accessToken = 'pk.eyJ1Ijoib3N0ZXJtYW5qIiwiYSI6ImNpdnU5dHVndjA2eDYyb3A3Nng1cGJ3ZXoifQ.Xo_k-kzGfYX_Yo_RDcHDBg';

    const mbHelper = require('mapbox-helper');
    
    var theMap = new mapboxgl.Map({
	    container: 'map',
	    style: 'mapbox://styles/mapbox/light-v9',
	    center: [-96.29192961129883, 38.453175289053746],
	    zoom: 3

	});

	theMap.on('load', function(){

		toGeoJSON('cen_policy-simplified.csv');
		
		function go(geoJSONData){
			var addLayers = mbHelper.addSourceAndLayers.call(theMap,
			    { // source
			    	"name": "policies",
			        "type": "geojson",
			        "data": geoJSONData,
			        "cluster": true,
			        "clusterMaxZoom": 14, // Max zoom to cluster points on
			        "clusterRadius": 25 // Radius of each cluster when clustering points (defaults to 50)
			    }, [ // layers
			        { // layer one
			            "id": "clusters",
			            "type": "circle",
			            "source": "policies",
			            "filter": ["has","point_count"],
			            "paint": {
			              	 "circle-color": [
				                "step",
				                ["get", "point_count"],
				                "#51bbd6",
				                100,
				                "#f1f075",
				                750,
				                "#f28cb1"
				            ],
				            "circle-radius": [
				                "step",
				                ["get", "point_count"],
				                20,
				                100,
				                30,
				                750,
				                40
				            ]
			            },
			            "beforeLayer": "water" // <== this is different from mapbox native specs
			        },
			        { // layer two
			            id: "cluster-count",
				        type: "symbol",
				        source: "policies",
				        filter: ["has", "point_count"],
				        layout: {
				            "text-field": "{point_count_abbreviated}",
				            "text-size": 12
				        }
			        },
			        { // layer three
			        	id: "unclustered-point",
				        type: "circle",
				        source: "policies",
				        filter: ["!has", "point_count"],
				        paint: {
				            "circle-color": "#11b4da",
				            "circle-radius": 4,
				            "circle-stroke-width": 1,
				            "circle-stroke-color": "#fff"
				        }
			        }
		        ] // end layers array
		    ); // end addlayers

		    addLayers.then(() => { console.log('added');});
		} // end continue
		function toGeoJSON(url){
			
			d3.csv(url, function(err, data){
				if (err) {
					throw err;
				}
				//console.log(data);
				var features = [];
				data.forEach(each => {
					features.push({
						"type": "Feature",
						"properties": each,
						"geometry": {
							"type": "Point",
							"coordinates": [+each.longitude, +each.latitude]
						}
					});
				}); // end forEach
				var rtn =  {
					"type": "FeatureCollection",
					"features": features
				};
				console.log(rtn);
				go(rtn);
			}); // end d3 csv
		} // end toGeoJSON
	}); // end on load

	

	return theMap;
   
}()); // end IIFE 