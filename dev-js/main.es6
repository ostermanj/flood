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
			console.log(geoJSONData);
			var addPointLayers = mbHelper.addSourceAndLayers.call(theMap,
				{ // source
					/*"name": "policy-points",
					"type": "vector",
					"url": "mapbox://ostermanj.2busm34d"*/
					"name": "policy-points",
			        "type": "geojson",
			        "data": geoJSONData
				}, [ // layers
					{ // layer zero
		            "id": "points",
		            "type": "circle",
		            "source": "policy-points",
		         //   "source-layer": "policies",
		            //"maxzoom": 5.25,
		           // "filter": ["has","point_count"],
		            "paint": {
		              	"circle-color": [
			                'match',
			                ['get', 't_ded'],
			                '5', '#000033',
			               /* 4, '#cc9966',
			                3, '#cc9966',
			                2, '#cc6600',
			             //   1.5, '#cc6600',
			             //   1.25, '#99000',
			                1, '#990000',
			                
			                /* other */ '#990000'
			            ],
			            "circle-radius": {
			            	
			                'stops': [[5, 3], [8, 18]]
			            },
			            "circle-opacity": 0.1
			            }
			        }
				]
			);
			var addClusteredLayers = mbHelper.addSourceAndLayers.call(theMap,
			    { // source


			    	"name": "policies",
			        "type": "geojson",
			        "data": geoJSONData,
			        "cluster": true,
			        //"clusterMaxZoom": 14, // Max zoom to cluster points on
			        "clusterRadius": 0.5 // Radius of each cluster when clustering points (defaults to 50)
			    }, [ // layers

			       /* { // layer one
			            "id": "clusters",
			            "type": "circle",
			            "source": "policies",
			            "filter": ["has","point_count"],
			            "minzoom": 5.25,
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
			            }
			        },*/
			       { // layer two
			            id: "cluster-count",
				        type: "symbol",
				        source: "policies",
				        filter: ["has", "point_count"],
				        "minzoom": 5.25,
				        layout: {
				            "text-field": "{point_count_abbreviated}",
				            "text-size": 12,

				        },
				        "paint": {
				        	"text-color": "#ffffff"
				        }
			        }
			   /*     { // layer three
			        	id: "unclustered-point",
				        type: "circle",
				        source: "policies",
				        filter: ["!has", "point_count"],
				        "minzoom": 5.25,
			            "paint": {
			              	"circle-color": [
				                'match',
				                ['get', 't_ded'],
				                '5', '#000033',
				 /               /* other */ /*'#990000'
				            ],
				            "circle-radius": {
				            	'base': 3,
				                'stops': [[6, 4], [22, 180]]
					            },
				            "circle-opacity": 0.85
				            }
				        }*/
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

	 theMap.on("mousemove", "clusters", function(e) {
        console.log(e);
    });

	return theMap;
   
}()); // end IIFE 