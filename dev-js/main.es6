 /* exported Charts, d3Tip, MapValues */
 //import { Donuts } from '../js-exports/Donuts';
 import { Bars } from '../js-exports/Bars';
 import { d3Tip } from '../js-vendor/d3-tip';
 import { MapValues } from '../js-vendor/polyfills';
 import policies from './../policies.json';
 
 /* polyfills needed: Promise TO DO: OTHERS?
 */
/*
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

	function checkSupported(){

		function webgl_support() { 
		    try {
			    var canvas = document.createElement( 'canvas' ); 
			    return !! window.WebGLRenderingContext && ( 
		         canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' ) );
		    } catch(e) {
		    	return false;
    	    } 
		}

		var problems = 0;
		 
		if ( webgl_support() == null ){
			d3.select('#webgl-warning')
				.classed('warning', true)
				.append('li')
				.text('Your device may not support the graphics this tool relies on; please try on another.');
		}
		if ( typeof Map !== 'function' || typeof Set !== 'function' ) {
			problems++;
			d3.select('#webgl-warning')
				.classed('warning', true)
				.append('li')
				.text('Your browser is out of date and will have trouble loading this feature. We’re showing you an image instead. Please try another browser.');

			d3.select('#webgl-warning')
				.append('img')
				.attr('src','assets/flood-insurance-policy-map.png');
		}

		return problems;
		
	}

	if ( checkSupported() > 0 ) {
		return;
	}
	//var tip = d3.tip().attr('class', 'd3-tip').html(function(d) { return d; });
	
    mapboxgl.accessToken = 'pk.eyJ1Ijoib3N0ZXJtYW5qIiwiYSI6ImNpdnU5dHVndjA2eDYyb3A3Nng1cGJ3ZXoifQ.Xo_k-kzGfYX_Yo_RDcHDBg';
    d3.selectAll('.help-link')
    	.on('click', () => {
    		d3.event.preventDefault();
    	});
    const mbHelper = require('mapbox-helper');
   // d3.tip = require('d3-tip');
    const tip = d3.tip().attr('class', 'd3-tip').direction('w').html(function(d) { console.log(this,d);return d[d3.select(this.parentNode.parentNode.parentNode).attr('id').replace('-','')]; });
   	const theCharts = [];
   
    var geojson;
    var featurePropertiesById = new Map(); 
    var gateCheck = 0;

    var sizeZoomThreshold = 8;
    
    var theMap = new mapboxgl.Map({
	    container: 'map',
	    style: 'mapbox://styles/ostermanj/cjf03o37b3tve2rqp2inw6a1f',
	    center: [-96.6434921115092, 37.98467337085599],
	    zoom: 3,
	    maxBounds: [[-142.88705714746362, 16.058344948432406],[-51.9023017869731,55.76690067417138]],
	    minZoom: 1.5,
	    attributionControl: false,
	});

	var nav = new mapboxgl.NavigationControl({showCompass:false});
	theMap.addControl(nav, 'top-right');

	var medianIncomes = new Map();
	theMap.on('load', function(){
		addUnclustered();
		gateCheck++;
		gate();
	});
	console.log(policies);
	toGeoJSON(policies);
	function gate(){
		if ( gateCheck < 2 ){
			return;
		}
		updateAll();
		addClustered();
		//calculateZScores('prem');
	} // end gate

	/*var censusTractsInView = new Set();
	function calculateMedianIncomes(inViewIDs){
		console.log(inViewIDs);
		var medianIncomes = [];
		censusTractsInView.clear();
		inViewIDs.forEach(d => {
			console.log(d);
			var feature = geojson.features.find(f => f.properties.id === d);
			var censusTract = feature.cen_tract;
			if ( !censusTractsInView.has(censusTract)){
				censusTractsInView.add(censusTract);
				medianIncomes.push(feature.med_income);
			}
		});
		return medianIncomes;
	}*/
	function calculateZScores(field, cutoff = null, hardCutoff = null, ignore = [] ){  // cutoff specifies upper bound to get rid of outliers
																  // a weak cutoff calculates values for whole set but
																  // sets max for the viz based on the cutoff value. a hard
																  // cutoff excludes values beyond the cutoff from the 
																  // calculations	
																  // the ignore array is values that should be treated as invalid
																  // such as all the erroneoue $250k home values.
		console.log('calculating z-scores');
		var mean = d3.mean(geojson.features, d => {
			if ( hardCutoff === null ) {
				return ignore.indexOf(d.properties[field]) === -1 ? d.properties[field] : null;
			}
			if ( d.properties[field] <= hardCutoff ){
				return ignore.indexOf(d.properties[field]) === -1 ? d.properties[field] : null;
			}
		});
		var sd = d3.deviation(geojson.features, d => {
			if ( hardCutoff === null ) {
				return ignore.indexOf(d.properties[field]) === -1 ? d.properties[field] : null;
			}
			if ( d.properties[field] <= hardCutoff ){
				return ignore.indexOf(d.properties[field]) === -1 ? d.properties[field] : null;
			}
		});
		var min,
			max,
			cutoffZ = cutoff ? ( cutoff - mean ) / sd : null;

		console.log('cutoff is ' + cutoffZ);
		geojson.features.forEach(each => {
			if ( hardCutoff && each.properties[field] > hardCutoff || ignore.indexOf(each.properties[field]) !== -1 ){
				each.properties[field + 'Z'] = null;
			} else {
				each.properties[field + 'Z'] = ( each.properties[field] - mean ) / sd;
				min = each.properties[field + 'Z'] < min || min === undefined ? each.properties[field + 'Z'] : min;
				max = each.properties[field + 'Z'] > max || max === undefined ? each.properties[field + 'Z'] : max;
			}
		});
		console.log('actualMin:' + min, 'actualMax:' + max);
		//max = d3.min([max,cutoffZ,3]);
		//min = d3.max([min, -3]);
		max = 2.33;
		min = -2.33;
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
		        //"type": "geojson",
		        //"data": geojson
		        "type": "vector",
		        "url":"mapbox://ostermanj.63wez16h",
			}, [ // layers
				{ // layer one
	            "id": "points",
	            "type": "circle",
	            "source": "policy-points",
	            "source-layer":"policies",
	            "maxzoom": sizeZoomThreshold,
	            "paint": {
	              	"circle-color": [
		                'match',
		                ['get', 't_ded'],
		                5, '#0f439c',
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
	            "minzoom": sizeZoomThreshold,
	            "paint": {
	              	"circle-color": [
		                'match',
		                ['get', 't_ded'],
		                5, '#0f439c',
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
	function toGeoJSON(data){
			var features = []; 
			data.forEach(each => {

				var value = +each.med_income ? +each.med_income : null;
				if ( !medianIncomes.has(+each.cen_tract) ){
					medianIncomes.set(+each.cen_tract, value); // no duplicate tracts
				}
				var coerced = {};
				for ( var key in each ) {
					if ( each.hasOwnProperty(key) ){
						coerced[key] = !isNaN(+each[key]) ? +each[key] : each[key];
					}
				}  
				featurePropertiesById.set(coerced.id,coerced);
				features.push({
					"type": "Feature",
					"properties": coerced,
					"geometry": {
						"type": "Point",
						"coordinates": [+each.longitude, +each.latitude]
					}   
				});
			}); // end forEach
			console.log(medianIncomes);
			console.log(featurePropertiesById);
			geojson =  {
				"type": "FeatureCollection",
				"features": features
			};
			d3.select('div.bar-charts')
				.classed('load', false);
			theCharts.push( // should be able to create charts now, whether or not map has loaded. map needs to have
							// loaded for them to update, though.
				new Bars.Bar({ 
					title: 'Properties in view', 
					margin: {
						top:0,
						right:1,
						bottom:0,
						left:1 
					},
					heightToWidth: 0.05,
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
					heightToWidth: 0.05,
					infoMark:true,
					container: '#deductible-bar',
					data: geojson.features,
					numerator(inViewIDs){
						if ( inViewIDs.size === 0 ){
							return this.min;
						}
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
						if (inViewIDs.size === 0){
							return 'none in view';
						}
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
					zScores: calculateZScores('prem',2000),
					min(){
						console.log(this);
						return this.zScores.min;
					},
					heightToWidth: 0.05,
					container: '#premium-bar',
					data: geojson.features,
					numerator(inViewIDs){
						if ( inViewIDs.size === 0 ){
							return this.min;
						}
						var filteredData = this.data.filter(each => inViewIDs.has(each.properties.id));
							
						return d3.mean(filteredData, d => d.properties.premZ);
					},
					denominator(){ 
						 return this.zScores.max;
					},
					textFunction(n){ 
						if (inViewIDs.size === 0){
							return 'none in view';
						}
						return '$' + d3.format(",.2f")(this.zScores.mean + this.zScores.sd * n ) + ' (z = ' + d3.format(".2f")(n) + ')';
					}
				}),
				
				new Bars.Bar({
					title: 'Average home replacement value', 
					margin: {
						top:0,
						right:1,
						bottom:0,
						left:1 
					},
					zScores: calculateZScores('value',550,20000,[250]),
					min(){
						
						return this.zScores.min;
					},
					infoMark:true,
					heightToWidth: 0.05,
					container: '#value-bar',
					data: geojson.features,
					numerator(inViewIDs){
						if ( inViewIDs.size === 0 ){
							return this.min;
						}
						var filteredData = this.data.filter(each => inViewIDs.has(each.properties.id));
						return d3.mean(filteredData, d => d.properties.valueZ);
					},
					denominator(){ 
						 return this.zScores.max;
					},
					textFunction(n){ 
						if (inViewIDs.size === 0){
							return 'none in view';
						}
						return '$' + d3.format(",.0f")((this.zScores.mean + this.zScores.sd * n ) * 1000 ) + ' (z = ' + d3.format(".2f")(n) + ')';
					}
				}),
				new Bars.Bar({
					title: 'Average flood insurance coverage', 
					margin: {
						top:0,
						right:1,
						bottom:0,
						left:1 
					},
					infoMark:true,
					zScores: calculateZScores('tcov',null,null,[]),
					/*min(){
						return d3.min(this.data, d => d.properties.tcov);
					},*/
					min(){
						
						return this.zScores.min;
					},
					heightToWidth: 0.05,
					container: '#coverage-bar',
					data: geojson.features,
					numerator(inViewIDs){
						if ( inViewIDs.size === 0 ){
							return this.min;
						}
						this.filteredData = this.data.filter(each => inViewIDs.has(each.properties.id));
						return d3.mean(this.filteredData, d => d.properties.tcovZ);
					},
					denominator(){ 
						 return this.zScores.max;
					},
					textFunction(n){ 
						
						if (inViewIDs.size === 0){
							return 'none in view';
						}
						return '$' + d3.format(",.0f")((this.zScores.mean + this.zScores.sd * n ) * 1000 ) + ' (z = ' + d3.format(".2f")(n) + ')';
					}
				}),
				new Bars.Bar({
					title: 'Average median household income', 
					margin: {
						top:0,
						right:1,
						bottom:0,
						left:1 
					},
					infoMark:true,
					zScores: (function(){
						console.log(medianIncomes);
						var mean = d3.mean([...medianIncomes.values()]);
						var sd = d3.deviation([...medianIncomes.values()]);
						var min,
							max,
							cutoffZ = ( 150000 - mean ) / sd;
						geojson.features.forEach(each => {
							// some med_incomes are recorded as zero; they should be ignored
							if ( each.properties.med_income > 0 ){
								each.properties.med_incomeZ = ( each.properties.med_income - mean ) / sd;
								min = each.properties.med_incomeZ < min || min === undefined ? each.properties.med_incomeZ : min;
								max = each.properties.med_incomeZ > max || max === undefined ? each.properties.med_incomeZ : max;
							} else {
								each.properties.med_incomeZ = null;
							}
						});
						max = max < cutoffZ ? max : cutoffZ;
						console.log({
							min,
							max,
							mean,
							sd
						});
						return {
							min: -2.33,
							max: 2.33,
							mean,
							sd
						};
					})(),
					min(){
						return this.zScores.min;
					},
					heightToWidth: 0.05,
					container: '#income-bar',
					data: geojson.features,
					numerator(inViewIDs){
						if ( inViewIDs.size === 0 ){
							return this.min;
						}
						var representedTracts = new Set();
						var medIncomeZArray = [];
						inViewIDs.forEach(id => {
							var matchingFeature = featurePropertiesById.get(id);
							if ( !representedTracts.has(matchingFeature.cen_tract) ){
								representedTracts.add(matchingFeature.cen_tract);
								medIncomeZArray.push(matchingFeature.med_incomeZ); // pushes income from only one representative
																				  //
							}
						});
						console.log('medIncomeZArray',medIncomeZArray);
						return d3.mean(medIncomeZArray);

						//this.medianIncomesInView = calculateMedianIncomes(inViewIDs);
						//return d3.mean(this.medianIncomesInView);
					},
					denominator(){ 
						 return this.zScores.max;
					},
					textFunction(n){ 
						if (inViewIDs.size === 0){
							return 'none in view';
						}
						return '$' + d3.format(",.0f")(this.zScores.mean + this.zScores.sd * n ) + ' (z = ' + d3.format(".2f")(n) + ')';
					}
				}),
				new Bars.Bar({
					title: 'Average marginal cost for lower deductible', 
					margin: {
						top:0,
						right:1,
						bottom:0,
						left:1 
					},
					zScores: calculateZScores('ddp',null,null,[]),
					/*min(){
						return d3.min(this.data, d => d.properties.tcov);
					},*/
					min(){
						
						return this.zScores.min;
					},
					heightToWidth: 0.05,
					container: '#marginal-bar',
					data: geojson.features,
					numerator(inViewIDs){
						if ( inViewIDs.size === 0 ){
							return this.min;
						}
						this.filteredData = this.data.filter(each => inViewIDs.has(each.properties.id));
						return d3.mean(this.filteredData, d => d.properties.ddpZ);
					},
					denominator(){ 
						 return this.zScores.max;
					},
					textFunction(n){ 
						
						if (inViewIDs.size === 0){
							return 'none in view';
						}
						return '$' + d3.format(",.0f")((this.zScores.mean + this.zScores.sd * n ) ) + ' (z = ' + d3.format(".2f")(n) + ')';
					}
				})

			); // end push
			gateCheck++;
			var information = {
				mapfeature: 'This map represents new flood insurance policies initiated between June and December 2014. The analysis in the related paper revolves around the decision whether to pay more for a lower deductible.',
				deductiblebar: 'The standard deductible is $5,000; anything less is consider a low deductible.',
				valuebar: 'This calculation ignores extreme outliers (values above $20M) which are likely due to data errors; it also ignores overrepresented values of $250,000, the majority of which are likely due to reporting errors.',
				incomebar: 'Median household income is a property of the census tract in which the policyholder resides. Each census tract with an associated policy in view is counted once.',
				coveragebar: 'Flood coverage is limited to $250,000.'
			};
			var infoMarks = d3.selectAll('.has-info-mark')
				.append('svg')
				.datum(information)
				.attr('width','12px')
				.attr('viewBox', '0 0 12 12')
				.attr('class','info-mark')
				.append('g');

			infoMarks
				.call(tip) 
				.on('mouseenter', function(d){
					
					tip.show.call(this,d);
				})
				.on('click', function(d){
					d3.event.stopPropagation();
					tip.show.call(this,d);
				})
				.on('mouseleave', tip.hide);

			d3.select('#map-feature')
				.on('click', () => {
					console.log('click');
					d3.selectAll('.d3-tip')
						.style('opacity',0);
				});
				

			infoMarks
				.append('circle')
				.attr('class', 'info-mark-background') 
				.attr('cx',6)
				.attr('cy',6)
				.attr('r',6);
				

			infoMarks
				.append('path')
				.attr('class','info-mark-foreground')
				.attr('d', `M5.231,7.614V6.915c0-0.364,0.084-0.702,0.254-1.016c0.169-0.313,0.355-0.613,0.559-0.902
							c0.203-0.287,0.39-0.564,0.559-0.831C6.772,3.9,6.857,3.631,6.857,3.36c0-0.195-0.081-0.357-0.242-0.489
							C6.455,2.74,6.268,2.674,6.057,2.674c-0.153,0-0.288,0.034-0.407,0.102c-0.118,0.068-0.222,0.155-0.311,0.26
							C5.25,3.142,5.177,3.261,5.117,3.392c-0.06,0.131-0.097,0.264-0.114,0.4l-1.46-0.407C3.704,2.75,4.008,2.261,4.457,1.919
							c0.448-0.343,1.016-0.515,1.701-0.515c0.313,0,0.607,0.044,0.882,0.133C7.316,1.626,7.56,1.756,7.771,1.925
							C7.982,2.095,8.15,2.306,8.272,2.56c0.123,0.254,0.185,0.546,0.185,0.876c0,0.423-0.096,0.785-0.286,1.085
							c-0.191,0.301-0.4,0.586-0.629,0.857C7.314,5.65,7.104,5.923,6.914,6.198S6.628,6.789,6.628,7.144v0.47H5.231z M5.079,10.699V8.896
							h1.752v1.803H5.079z`
				);

			/*d3.selectAll('.figure-title.has-info-mark')
				.append('a')
				.attr('title', function(){
					return information[d3.select(this.parentNode.parentNode).attr('id').replace('-','')];
				})
				.attr('href','#')
				.attr('class','info-mark small')
				.text('?');
			d3.selectAll('.info-mark')
				.on('click',() => {
					d3.event.preventDefault();
				});*/

			gate();
			//addClusterLayers(rtn);
			
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
		console.log(inViewIDs);
	}
	theMap.on('moveend', function(){
		updateAll();
	});
	theMap.on('zoomend', function(arg){
		console.log(arg);
		updateAll();
		d3.select('#size-legend')
			.classed('show', theMap.getZoom() >= sizeZoomThreshold);
	});
	function updateAll(){
		countFeatures();
		theCharts.forEach(each => each.update(inViewIDs));
	}
	theMap.on("mousemove", "points-data-driven", function(e) {
        console.log(e);
    });

   

	return theMap;
   
}()); // end IIFE 