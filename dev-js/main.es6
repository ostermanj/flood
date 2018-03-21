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
    const medianIncomes = new Map();
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

	toGeoJSON('cen_policy-simplified-3.csv');

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
			theMap.on('render', checkFeatures);
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

	function checkFeatures(){
		var features;
		if ( theMap.loaded()){
			features = theMap.queryRenderedFeatures({layers:['points']});
			console.log(features);
			theMap.off('render', checkFeatures);
		}
		/*if ( theMap.areTilesLoaded() && features.length > 0 ){
			console.log(features);
			theMap.off('render', checkFeatures);
			//console.log(theMap.querySourceFeatures('policy-points',{sourceLayer:'policies'}));
		}*/
		//console.log(theMap.loaded());
	}
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
			createMedianIncomeMap();
		}); // end d3 csv
	} // end toGeoJSON
	function createMedianIncomeMap(){
		geojson.features.forEach(each => {
			if ( !medianIncomes.has(each.properties.cen_tract) ){
				let income = each.properties.med_income > 0 ? each.properties.med_income : null;
				medianIncomes.set(each.properties.cen_tract, income); 	
			}
		});
		console.log(medianIncomes);
		window.medianIncomes = medianIncomes;
		createCharts(geojson);
	}
	function createCharts(geojson){
		new Donut({
			margin: { // percentages
                top: 15,
                right: 10,
                bottom: 5,
                left: 10
            },
            heightToWidth: 1,
            container: '#chart-0',
            data: geojson.features
		});

	/*	new Donut({
			margin: { // percentages
                top: 15,
                right: 10,
                bottom: 5,
                left: 10
            },
            heightToWidth: 1,
            container: '#chart-1',
            data: [...medianIncomes.values()]
		});

		new Donut({
			margin: { // percentages
                top: 15,
                right: 10,
                bottom: 5,
                left: 10
            },
            heightToWidth: 1,
            container: '#chart-2',
            data: [...medianIncomes.values()]
		}); //*/
	}

	var Donut = function(configObject){ // margins {}, height #, width #, containerID, dataPath
	    console.log(this, configObject);
	    this.setup(configObject);
	};

	Donut.prototype = {

	    setup(configObject){
	    	console.log('in set up');
	        var viewBox = '0 0 100 ' + Math.round(configObject.heightToWidth * 100);
	        var tau = 2 * Math.PI;
	        this.margin = configObject.margin;
	        this.width = 100 - this.margin.left - this.margin.right;
	        this.height = configObject.heightToWidth * 100 - this.margin.top - this.margin.bottom;
	        this.radius = Math.min(this.width,this.height) / 2;
	        this.data = configObject.data;
	        console.log(this.radius);
	        this.arc = d3.arc()
	          .outerRadius(this.radius)
	          .innerRadius(this.radius / 2)
	          .startAngle(0); 
	        window.arc = this.arc;
	        console.log(this.data);
	        this.scale = d3.scaleLinear().domain([0,this.data.length]).range([0,1]);
	        this.value = this.data.length;
	        //this.y = d3.scaleLinear().domain(d3.range(this.data)).range([this.height, 0]);
 
	        
	       // this.labelOffset = configObject.trendLabelPosition === 'below' ? 4 : -3;
	       // this.yAxisCount = configObject.yAxisCount;
	       // this.hasBeenUpdated = false;


	        this.svg = d3.select(configObject.container)
	            .append('svg')
	            .attr('width', '100%')
	            .attr('xmlns','http://www.w3.org/2000/svg')
	            .attr('version','1.1')
	            .attr('viewBox', viewBox)
	            .append('g')
	            .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

	    	this.svg.append('path')
	            .classed('background',true)
	            .datum({endAngle: tau})
	            //.style("fill", "#ddd")
	            .attr('d', this.arc)
	            .attr('transform', 'translate(' + this.width / 2 + ',' + this.height / 2 + ')');

	        this.svg.append('path')
	            .classed('foreground',true)
	            .datum({endAngle: this.value * tau})
	            //.style("fill", "#ddd")
	            .attr('d', this.arc)
	            .attr('transform', 'translate(' + this.width / 2 + ',' + this.height / 2 + ')');

	         this.svg.append("text")
	            .attr("text-anchor", "middle")
	            .attr('class','pie_number')
	            .attr('y',5)
	            .text(d3.format(".2s")(this.value))
	            .attr('transform', 'translate(' + this.width / 2 + ',' + this.height / 2 + ')');

	    }
	};
	 theMap.on('moveend', function() {
	 	console.log('move end'); 
	 });
	/*theMap.on("mousemove", "points-data-driven", function(e) {
        console.log(e);
    });*/

	return theMap;
   
}()); // end IIFE 