 /* exported Charts */
 import { Charts } from '../js-exports/Charts';
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
	console.log(Charts);  
    mapboxgl.accessToken = 'pk.eyJ1Ijoib3N0ZXJtYW5qIiwiYSI6ImNpdnU5dHVndjA2eDYyb3A3Nng1cGJ3ZXoifQ.Xo_k-kzGfYX_Yo_RDcHDBg';

    const mbHelper = require('mapbox-helper');
   
    var geojson;
    var gateCheck = 0;
    
    var theMap = new mapboxgl.Map({
	    container: 'map',
	    style: 'mapbox://styles/ostermanj/cjf03o37b3tve2rqp2inw6a1f',
	    center: [-96.29192961129883, 38.453175289053746],
	    zoom: 3,
	    maxBounds: [[-142.88705714746362, 16.058344948432406],[-51.9023017869731,55.76690067417138]],
	    minZoom: 3,
	    attributionControl: false,
	});

	var nav = new mapboxgl.NavigationControl({showCompass:false});
	theMap.addControl(nav, 'top-left');

	toGeoJSON('policies.csv');

	theMap.on('load', function(){
		gateCheck++;
		gate();
	});
	function gate(){
		if ( gateCheck < 2 ){
			return;
		}
		var unclustered = addUnclustered();
		addClustered();
		unclustered.then(() => {
			console.log(geojson.features.length);
			featuresInView.render();
			//showTotal(geojson.feature.length);
		});
	} // end gate

	function addUnclustered(){
		return mbHelper.addSourceAndLayers.call(theMap,
			{ // source
				"name": "policy-points",
		        "type": "geojson",
		        "data": geojson
			}, [ // layers
				{ // layer one
	            "id": "points",
	            "type": "circle",
	            "source": "policy-points",
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
	}

	/*function checkFeatures(){
		var features;
		if ( theMap.loaded()){
			features = theMap.queryRenderedFeatures({layers:['points']});
			console.log(features);
			theMap.off('render', checkFeatures);
		}
	}*/
	function addClustered(){
		
		mbHelper.addSourceAndLayers.call(theMap,
		    { // source
		    	"name": "policies",
		        "type": "geojson",
		        "data": geojson,
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
	} // end addClustered
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
			geojson =  {
				"type": "FeatureCollection",
				"features": features
			};
			gateCheck++;
			gate();
			//addClusterLayers(rtn);
			
			Charts.createCharts(geojson);
		}); // end d3 csv
	} // end toGeoJSON
	var featuresInView = {
		render(){
			this.total = geojson.features.length;
			theMap.on('render', firstUpdate);
			function firstUpdate(){
				//console.log(theMap.loaded());
				if ( theMap.loaded() ){
					theMap.off('render', firstUpdate);
					featuresInView.update(countUniqueFeatures());
				}
			}
		},
		update(n){
			d3.select('#total-in-view')
				.text(() => d3.format(",")(n) + ' of ' + d3.format(",")(this.total) + ' properties in view');
		}
	};
	
	var uniqueFeatures = new Set();
	function countUniqueFeatures(){
		uniqueFeatures.clear();
		theMap.queryRenderedFeatures({layers:['points','points-data-driven']}).forEach(each => {
			if ( !uniqueFeatures.has(each.properties.id) ){
				uniqueFeatures.add(each.properties.id);
			}
		});
		return uniqueFeatures.size;
	}
	theMap.on('moveend', function(){
		featuresInView.update(countUniqueFeatures());	
	});
	theMap.on('zoomend', function(){
		featuresInView.update(countUniqueFeatures());
		//checkFeatures();
	});
	/*theMap.on("mousemove", "points-data-driven", function(e) {
        console.log(e);
    });*/

	return theMap;
   
}()); // end IIFE 