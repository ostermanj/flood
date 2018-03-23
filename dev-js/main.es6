 /* exported Charts */
 import { Donuts } from '../js-exports/Donuts';
 import { Bars } from '../js-exports/Bars';
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
   	const theCharts = [];
   
    var geojson;
    var gateCheck = 0;
    
    var theMap = new mapboxgl.Map({
	    container: 'map',
	    style: 'mapbox://styles/ostermanj/cjf03o37b3tve2rqp2inw6a1f',
	    center: [-96.29192961129883, 38.453175289053746],
	    zoom: 3,
	    maxBounds: [[-142.88705714746362, 16.058344948432406],[-51.9023017869731,55.76690067417138]],
	    minZoom: 1.5,
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
		updateAll();
		addUnclustered();
		addClustered();
		//calculateZScores('prem');
	} // end gate

	function calculateZScores(field,cutoff){ // cutoff specifies upper bound to get rid of outliers
		console.log('calculating z-scores');
		var mean = d3.mean(geojson.features, d => d.properties[field]);
		var sd =   d3.deviation(geojson.features, d => d.properties[field]);
		var min,
			max,
			cutoffZ = ( cutoff - mean ) / sd;

		console.log('cutoff is ' + cutoffZ);
		geojson.features.forEach(each => {
			each.properties[field + 'Z'] = ( each.properties[field] - mean ) / sd;
			min = each.properties[field + 'Z'] < min || min === undefined ? each.properties[field + 'Z'] : min;
			max = each.properties[field + 'Z'] > max || max === undefined ? each.properties[field + 'Z'] : max;
		});
		max = d3.min([max,cutoffZ,3]);
		min = d3.max([min, -3]);
		console.log('done', geojson, min, max);
		return {
			min,
			max,
			mean,
			sd
		};
	}

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
	/*function checkFeaturesLoaded(){
		if ( theMap.loaded()){
			
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
			theCharts.push( // should be able to create charts now, whether or not map has loaded. map needs to have
							// loaded for them to update, though.
				new Donuts.Donut({
					margin: { // percentages
		                top: 15,
		                right: 10,
		                bottom: 5,
		                left: 10
		            },
		            heightToWidth: 1,
		            container: '#chart-0',
		            data: geojson.features,
		            comparator: function(each){
		            	return each.properties.t_ded < 5;
		            } 
				}),
				new Bars.Bar({ 
					title: 'Properties in view', 
					margin: {
						top:0,
						right:1,
						bottom:0,
						left:1 
					},
					heightToWidth: 0.03,
					container: '#in-view-bar',
					data: geojson.features,
					numerator(inViewIDs){
						return inViewIDs.size;
					},
					denominator(){
						return this.data.length;
					},
					textFunction(n,d){
						return `${d3.format(",")(n)} of ${d3.format(",")(d)} (${d3.format(".0%")(n / d)})`;
					}
				}),
				new Bars.Bar({
					title: '... with low deductible', 
					margin: {
						top:0,
						right:1,
						bottom:0,
						left:1 
					},
					heightToWidth: 0.03,
					container: '#deductible-bar',
					data: geojson.features,
					numerator(inViewIDs){
						var filteredData = this.data.filter(each => inViewIDs.has(each.properties.id)),
							numberMatching = 0;
						filteredData.forEach(each => {
							if ( each.properties.t_ded < 5 ){
								numberMatching++;
							}
						});
						return numberMatching;
					},
					denominator(inViewIDs){ // for this one denominator is number of policies in view
						 return inViewIDs.size;
					},
					textFunction(n,d){
						return `${d3.format(",")(n)} of ${d3.format(",")(d)} (${d3.format(".0%")(n / d)})`;
					}
				}),
				new Bars.Bar({
					title: 'Average premium', 
					margin: {
						top:0,
						right:1,
						bottom:0,
						left:1 
					},
					zScores: calculateZScores('prem',2200),
					min(){
						console.log(this);
						return this.zScores.min;
					},
					heightToWidth: 0.03,
					container: '#premium-bar',
					data: geojson.features,
					numerator(inViewIDs){
						var filteredData = this.data.filter(each => inViewIDs.has(each.properties.id));
							
						return d3.mean(filteredData, d => d.properties.premZ);
					},
					denominator(){ 
						 return this.zScores.max;
					},
					textFunction(n){ 
						console.log(this.zScores);
						return '$' + d3.format(".2f")(this.zScores.mean + this.zScores.sd * n ) + ' (z = ' + d3.format(".2f")(n) + ')';
					}
				})
			); // end push
			gateCheck++;  
			gate();
			//addClusterLayers(rtn);
			
		}); // end d3 csv
	} // end toGeoJSON
	/*var featuresInView = {
		render(){
			this.chart = new Bars.Bar({
				margin: {
					top:0,
					right:0,
					bottom:0,
					left:0
				},
				heightToWidth: 0.03,
				container: '#total-view',
				total: geojson.features.length
			});

			/*this.total = geojson.features.length;
			this.svg = d3.select('#total-view')
				.append('svg')
				.attr('width', '100%')
	            .attr('xmlns','http://www.w3.org/2000/svg')
	            .attr('version','1.1') 
	            .attr('viewBox', '0 0 100 3');

	        this.background = this.svg.append('line')
	        	.classed('background-line', true)
	        	.attr('x0',0)
	        	.attr('y0',0)
	        	.attr('x1',100)
	        	.attr('y1',0);

	        this.line = this.svg.append('line')
	        	.classed('total-line', true)
	        	.attr('x0',0)
	        	.attr('y0',0)
	        	.attr('x1',0)
	        	.attr('y1',0);

	        this.text = d3.select('#total-view')
	        	.append('span')
	        	.text(() => `${d3.format(",")(this.total)} of ${d3.format(",")(this.total)} in view` );
	        	

			this.update(countFeatures());
		},
		update(n){
			/*d3.select('#total-in-view')
				.text(() => d3.format(",")(n) + ' of ' + d3.format(",")(this.total) + ' properties in view');*/
			/*this.line
				.transition().duration(200)
				.attr('x1', () => ( n / this.total) * 100 );
			this.text
				.text(() => `${d3.format(",")(n)} of ${d3.format(",")(this.total)} in view` );

		}*/ 

	
	var inViewIDs = new Set();
	function countFeatures(){ 
		/* jshint laxbreak:true */
		inViewIDs.clear(); 
		//var count = 0;
		var bounds = theMap.getBounds();
		geojson.features.forEach(each => {
			if (    each.properties.longitude >= bounds._sw.lng 
				 && each.properties.longitude <= bounds._ne.lng 
				 && each.properties.latitude  >= bounds._sw.lat 
				 && each.properties.latitude  <= bounds._ne.lat ){
				inViewIDs.add(each.properties.id);
			}
		});
	}
	theMap.on('moveend', function(){
		updateAll();
	});
	theMap.on('zoomend', function(){
		updateAll();
	});
	function updateAll(){
		countFeatures();
		theCharts.forEach(each => each.update(inViewIDs));
	}
	/*theMap.on("mousemove", "points-data-driven", function(e) {
        console.log(e);
    });*/

	return theMap;
   
}()); // end IIFE 