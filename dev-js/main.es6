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
	    zoom: 3,
	    maxBounds: [[-142.88705714746362, 16.058344948432406],[-51.9023017869731,55.76690067417138]],
	    minZoom: 2.5,
	    attributionControl: false,
	});

	var nav = new mapboxgl.NavigationControl({showCompass:false});
	theMap.addControl(nav, 'top-left');

	theMap.on('load', function(){

		toGeoJSON('cen_policy-simplified-2.csv');
		
		function go(geoJSONData){
			console.log(geoJSONData);
			var addPointLayers = mbHelper.addSourceAndLayers.call(theMap,
				{ // source
					"name": "policy-points",
			        "type": "vector",
			        //"data": geoJSONData
			        "url": "mapbox://ostermanj.63wez16h"
				}, [ // layers
					{ // layer one
		            "id": "points",
		            "type": "circle",
		            "source": "policy-points",
		            "source-layer": "policies",
		            "maxzoom": 9,
		            "paint": {
		              	"circle-color": [
			                'match',
			                ['get', 't_ded'],
			                5, '#051839',
			                /* other */ '#990000'
			            ],
			            "circle-radius": {
			                'stops': [[5, 3], [8, 18]]
			            },
			            "circle-opacity": 0.1
			            }
			        },
			        { // layer two
		            "id": "points-data-driven",
		            "type": "circle",
		            "source": "policy-points",
		            "source-layer": "policies",
		            "minzoom": 9,
		            "paint": {
		              	"circle-color": [
			                'match',
			                ['get', 't_ded'],
			                5, '#051839',
			                /* other */ '#990000'
			            ],
			            "circle-radius": {
			            	property: 'prem',
			                type: 'exponential',
					        stops: [
					          [62, 5],
					          [2500, 60]
					        ]
			            },
			            "circle-opacity": 0.1,
			            "circle-stroke-color": "#ffffff",
			            "circle-stroke-width": 1
			        }
				}]
			);
			var addClusteredLayers = mbHelper.addSourceAndLayers.call(theMap,
			    { // source


			    	"name": "policies",
			        "type": "geojson",
			        "data": geoJSONData,
			        "cluster": true,
			        "clusterRadius": 0.5 // Radius of each cluster when clustering points (defaults to 50)
			    }, [ // layers

			       { // layer one
			            id: "cluster-count",
				        type: "symbol",
				        source: "policies",
				        filter: ["has", "point_count"],
				        "minzoom": 6,
				        layout: {
				            "text-field": "{point_count_abbreviated}",
				            "text-size": 12,

				        },
				        "paint": {
				        	"text-color": "#ffffff"
				        }
			        }
		        ] // end layers array
		    ); // end addlayers

		   addClusteredLayers.then(() => { console.log('cluster layers added');});
		   addPointLayers.then(() => { console.log('cluster layers added');});
		} // end go()  
		function toGeoJSON(url){
			
			d3.csv(url, function(err, data){
				if (err) {
					throw err;
				}
				//console.log(data);
				var features = [];
				data.forEach(each => {
					var coerced = {};
					for ( var key in each ) {
						if ( each.hasOwnProperty(key) ){
							coerced[key] = !isNaN(+each[key]) ? +each[key] : each[key];
						}
					}
					features.push({
						"type": "Feature",
						"properties": coerced,
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

	 theMap.on("mousemove", "points-data-driven", function(e) {
        console.log(e);
    });

	return theMap;
   
}()); // end IIFE 