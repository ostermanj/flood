(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
'use strict';

var _Bars = require('../js-exports/Bars');

var _d3Tip = require('../js-vendor/d3-tip');

var _polyfills = require('../js-vendor/polyfills');

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } } /* exported Charts, d3Tip, MapValues, PromisePolyfill */
//import { Donuts } from '../js-exports/Donuts';


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
window.theMap = function () {
	"use strict";

	function webgl_support() {
		try {
			var canvas = document.createElement('canvas');
			return !!window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
		} catch (e) {
			return false;
		}
	}
	console.log(webgl_support());
	if (webgl_support() == null) {
		d3.select('#webgl-warning').classed('warning', true).text('Your device may not support the graphics this tool relies on; please try on another.');
	}
	//var tip = d3.tip().attr('class', 'd3-tip').html(function(d) { return d; });

	mapboxgl.accessToken = 'pk.eyJ1Ijoib3N0ZXJtYW5qIiwiYSI6ImNpdnU5dHVndjA2eDYyb3A3Nng1cGJ3ZXoifQ.Xo_k-kzGfYX_Yo_RDcHDBg';
	d3.selectAll('.help-link').on('click', function () {
		d3.event.preventDefault();
	});
	var mbHelper = require('mapbox-helper');
	// d3.tip = require('d3-tip');
	var tip = d3.tip().attr('class', 'd3-tip').direction('w').html(function (d) {
		console.log(this, d);return d[d3.select(this.parentNode.parentNode.parentNode).attr('id').replace('-', '')];
	});
	var theCharts = [];

	var geojson;
	var featurePropertiesById = new Map();
	var gateCheck = 0;

	var sizeZoomThreshold = 8;

	var theMap = new mapboxgl.Map({
		container: 'map',
		style: 'mapbox://styles/ostermanj/cjf03o37b3tve2rqp2inw6a1f',
		center: [-95.149351486459073, 37.98467337085599],
		zoom: 3,
		maxBounds: [[-142.88705714746362, 16.058344948432406], [-51.9023017869731, 55.76690067417138]],
		minZoom: 1.5,
		attributionControl: false
	});

	var nav = new mapboxgl.NavigationControl({ showCompass: false });
	theMap.addControl(nav, 'top-right');

	var medianIncomes = new Map();
	toGeoJSON('policies.csv');
	theMap.on('load', function () {
		gateCheck++;
		gate();
	});
	function gate() {
		if (gateCheck < 2) {
			return;
		}
		updateAll();
		addUnclustered();
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
	function calculateZScores(field) {
		var cutoff = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : null;
		var hardCutoff = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
		var ignore = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];
		// cutoff specifies upper bound to get rid of outliers
		// a weak cutoff calculates values for whole set but
		// sets max for the viz based on the cutoff value. a hard
		// cutoff excludes values beyond the cutoff from the 
		// calculations	
		// the ignore array is values that should be treated as invalid
		// such as all the erroneoue $250k home values.
		console.log('calculating z-scores');
		var mean = d3.mean(geojson.features, function (d) {
			if (hardCutoff === null) {
				return ignore.indexOf(d.properties[field]) === -1 ? d.properties[field] : null;
			}
			if (d.properties[field] <= hardCutoff) {
				return ignore.indexOf(d.properties[field]) === -1 ? d.properties[field] : null;
			}
		});
		var sd = d3.deviation(geojson.features, function (d) {
			if (hardCutoff === null) {
				return ignore.indexOf(d.properties[field]) === -1 ? d.properties[field] : null;
			}
			if (d.properties[field] <= hardCutoff) {
				return ignore.indexOf(d.properties[field]) === -1 ? d.properties[field] : null;
			}
		});
		var min,
		    max,
		    cutoffZ = cutoff ? (cutoff - mean) / sd : null;

		console.log('cutoff is ' + cutoffZ);
		geojson.features.forEach(function (each) {
			if (hardCutoff && each.properties[field] > hardCutoff || ignore.indexOf(each.properties[field]) !== -1) {
				each.properties[field + 'Z'] = null;
			} else {
				each.properties[field + 'Z'] = (each.properties[field] - mean) / sd;
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
			min: min,
			max: max,
			mean: mean,
			sd: sd
		};
	}

	function addUnclustered() {
		return mbHelper.addSourceAndLayers.call(theMap, { // source
			"name": "policy-points",
			"type": "geojson",
			"data": geojson
		}, [// layers
		{ // layer one
			"id": "points",
			"type": "circle",
			"source": "policy-points",
			"maxzoom": sizeZoomThreshold,
			"paint": {
				"circle-color": ['match', ['get', 't_ded'], 5, '#0f439c',
				/* other */'#990000'],
				"circle-radius": {
					'stops': [[5, 3], [8, 18]]
				},
				"circle-opacity": 0.1
			}
		}, { // layer two
			"id": "points-data-driven",
			"type": "circle",
			"source": "policy-points",
			"minzoom": sizeZoomThreshold,
			"paint": {
				"circle-color": ['match', ['get', 't_ded'], 5, '#0f439c',
				/* other */'#990000'],
				"circle-radius": {
					property: 'prem',
					type: 'exponential',
					stops: [[62, 5], [2500, 60]]
				},
				"circle-opacity": 0.1,
				"circle-stroke-color": "#ffffff",
				"circle-stroke-width": 1
			}
		}]);
	}
	/*function checkFeaturesLoaded(){
 	if ( theMap.loaded()){
 		
 		theMap.off('render', checkFeatures);
 	}
 }*/
	function addClustered() {

		mbHelper.addSourceAndLayers.call(theMap, { // source
			"name": "policies",
			"type": "geojson",
			"data": geojson,
			"cluster": true,
			"clusterRadius": 0.5 // Radius of each cluster when clustering points (defaults to 50)
		}, [// layers
		{ // layer one
			id: "cluster-count",
			type: "symbol",
			source: "policies",
			filter: ["has", "point_count"],
			"minzoom": 6,
			layout: {
				"text-field": "{point_count_abbreviated}",
				"text-size": 12

			},
			"paint": {
				"text-color": "#ffffff"
			}
		}] // end layers array
		); // end addlayers
	} // end addClustered
	function toGeoJSON(url) {

		d3.csv(url, function (err, data) {
			if (err) {
				throw err;
			}
			//console.log(data);
			var features = [];
			data.forEach(function (each) {

				var value = +each.med_income ? +each.med_income : null;
				if (!medianIncomes.has(+each.cen_tract)) {
					medianIncomes.set(+each.cen_tract, value); // no duplicate tracts
				}
				var coerced = {};
				for (var key in each) {
					if (each.hasOwnProperty(key)) {
						coerced[key] = !isNaN(+each[key]) ? +each[key] : each[key];
					}
				}
				featurePropertiesById.set(coerced.id, coerced);
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
			geojson = {
				"type": "FeatureCollection",
				"features": features
			};
			theCharts.push( // should be able to create charts now, whether or not map has loaded. map needs to have
			// loaded for them to update, though.
			new _Bars.Bars.Bar({
				title: 'Properties in view',
				margin: {
					top: 0,
					right: 1,
					bottom: 0,
					left: 1
				},
				heightToWidth: 0.05,
				container: '#in-view-bar',
				data: geojson.features,
				numerator: function numerator(inViewIDs) {
					return inViewIDs.size;
				},
				denominator: function denominator() {
					return this.data.length;
				},
				textFunction: function textFunction(n, d) {
					return d3.format(",")(n) + ' of ' + d3.format(",")(d) + ' (' + d3.format(".0%")(n / d) + ')';
				}
			}), new _Bars.Bars.Bar({
				title: '... with low deductible',
				margin: {
					top: 0,
					right: 1,
					bottom: 0,
					left: 1
				},
				heightToWidth: 0.05,
				infoMark: true,
				container: '#deductible-bar',
				data: geojson.features,
				numerator: function numerator(inViewIDs) {
					if (inViewIDs.size === 0) {
						return this.min;
					}
					var filteredData = this.data.filter(function (each) {
						return inViewIDs.has(each.properties.id);
					}),
					    numberMatching = 0;
					filteredData.forEach(function (each) {
						if (each.properties.t_ded < 5) {
							numberMatching++;
						}
					});
					return numberMatching;
				},
				denominator: function denominator(inViewIDs) {
					// for this one denominator is number of policies in view
					return inViewIDs.size;
				},
				textFunction: function textFunction(n, d) {
					if (inViewIDs.size === 0) {
						return 'none in view';
					}
					return d3.format(",")(n) + ' of ' + d3.format(",")(d) + ' (' + d3.format(".0%")(n / d) + ')';
				}
			}), new _Bars.Bars.Bar({
				title: 'Average premium',
				margin: {
					top: 0,
					right: 1,
					bottom: 0,
					left: 1
				},
				zScores: calculateZScores('prem', 2000),
				min: function min() {
					console.log(this);
					return this.zScores.min;
				},

				heightToWidth: 0.05,
				container: '#premium-bar',
				data: geojson.features,
				numerator: function numerator(inViewIDs) {
					if (inViewIDs.size === 0) {
						return this.min;
					}
					var filteredData = this.data.filter(function (each) {
						return inViewIDs.has(each.properties.id);
					});

					return d3.mean(filteredData, function (d) {
						return d.properties.premZ;
					});
				},
				denominator: function denominator() {
					return this.zScores.max;
				},
				textFunction: function textFunction(n) {
					if (inViewIDs.size === 0) {
						return 'none in view';
					}
					return '$' + d3.format(",.2f")(this.zScores.mean + this.zScores.sd * n) + ' (z = ' + d3.format(".2f")(n) + ')';
				}
			}), new _Bars.Bars.Bar({
				title: 'Average home replacement value',
				margin: {
					top: 0,
					right: 1,
					bottom: 0,
					left: 1
				},
				zScores: calculateZScores('value', 550, 20000, [250]),
				min: function min() {

					return this.zScores.min;
				},

				infoMark: true,
				heightToWidth: 0.05,
				container: '#value-bar',
				data: geojson.features,
				numerator: function numerator(inViewIDs) {
					if (inViewIDs.size === 0) {
						return this.min;
					}
					var filteredData = this.data.filter(function (each) {
						return inViewIDs.has(each.properties.id);
					});
					return d3.mean(filteredData, function (d) {
						return d.properties.valueZ;
					});
				},
				denominator: function denominator() {
					return this.zScores.max;
				},
				textFunction: function textFunction(n) {
					if (inViewIDs.size === 0) {
						return 'none in view';
					}
					return '$' + d3.format(",.0f")((this.zScores.mean + this.zScores.sd * n) * 1000) + ' (z = ' + d3.format(".2f")(n) + ')';
				}
			}), new _Bars.Bars.Bar({
				title: 'Average flood insurance coverage',
				margin: {
					top: 0,
					right: 1,
					bottom: 0,
					left: 1
				},
				infoMark: true,
				zScores: calculateZScores('tcov', null, null, []),
				/*min(){
    	return d3.min(this.data, d => d.properties.tcov);
    },*/
				min: function min() {

					return this.zScores.min;
				},

				heightToWidth: 0.05,
				container: '#coverage-bar',
				data: geojson.features,
				numerator: function numerator(inViewIDs) {
					if (inViewIDs.size === 0) {
						return this.min;
					}
					this.filteredData = this.data.filter(function (each) {
						return inViewIDs.has(each.properties.id);
					});
					return d3.mean(this.filteredData, function (d) {
						return d.properties.tcovZ;
					});
				},
				denominator: function denominator() {
					return this.zScores.max;
				},
				textFunction: function textFunction(n) {

					if (inViewIDs.size === 0) {
						return 'none in view';
					}
					return '$' + d3.format(",.0f")((this.zScores.mean + this.zScores.sd * n) * 1000) + ' (z = ' + d3.format(".2f")(n) + ')';
				}
			}), new _Bars.Bars.Bar({
				title: 'Average median household income',
				margin: {
					top: 0,
					right: 1,
					bottom: 0,
					left: 1
				},
				infoMark: true,
				zScores: function () {
					console.log(medianIncomes);
					var mean = d3.mean([].concat(_toConsumableArray(medianIncomes.values())));
					var sd = d3.deviation([].concat(_toConsumableArray(medianIncomes.values())));
					var min,
					    max,
					    cutoffZ = (150000 - mean) / sd;
					geojson.features.forEach(function (each) {
						// some med_incomes are recorded as zero; they should be ignored
						if (each.properties.med_income > 0) {
							each.properties.med_incomeZ = (each.properties.med_income - mean) / sd;
							min = each.properties.med_incomeZ < min || min === undefined ? each.properties.med_incomeZ : min;
							max = each.properties.med_incomeZ > max || max === undefined ? each.properties.med_incomeZ : max;
						} else {
							each.properties.med_incomeZ = null;
						}
					});
					max = max < cutoffZ ? max : cutoffZ;
					console.log({
						min: min,
						max: max,
						mean: mean,
						sd: sd
					});
					return {
						min: -2.33,
						max: 2.33,
						mean: mean,
						sd: sd
					};
				}(),
				min: function min() {
					return this.zScores.min;
				},

				heightToWidth: 0.05,
				container: '#income-bar',
				data: geojson.features,
				numerator: function numerator(inViewIDs) {
					if (inViewIDs.size === 0) {
						return this.min;
					}
					var representedTracts = new Set();
					var medIncomeZArray = [];
					inViewIDs.forEach(function (id) {
						var matchingFeature = featurePropertiesById.get(id);
						if (!representedTracts.has(matchingFeature.cen_tract)) {
							representedTracts.add(matchingFeature.cen_tract);
							medIncomeZArray.push(matchingFeature.med_incomeZ); // pushes income from only one representative
							//
						}
					});
					console.log('medIncomeZArray', medIncomeZArray);
					return d3.mean(medIncomeZArray);

					//this.medianIncomesInView = calculateMedianIncomes(inViewIDs);
					//return d3.mean(this.medianIncomesInView);
				},
				denominator: function denominator() {
					return this.zScores.max;
				},
				textFunction: function textFunction(n) {
					if (inViewIDs.size === 0) {
						return 'none in view';
					}
					return '$' + d3.format(",.0f")(this.zScores.mean + this.zScores.sd * n) + ' (z = ' + d3.format(".2f")(n) + ')';
				}
			}), new _Bars.Bars.Bar({
				title: 'Average marginal cost for lower deductible',
				margin: {
					top: 0,
					right: 1,
					bottom: 0,
					left: 1
				},
				zScores: calculateZScores('ddp', null, null, []),
				/*min(){
    	return d3.min(this.data, d => d.properties.tcov);
    },*/
				min: function min() {

					return this.zScores.min;
				},

				heightToWidth: 0.05,
				container: '#marginal-bar',
				data: geojson.features,
				numerator: function numerator(inViewIDs) {
					if (inViewIDs.size === 0) {
						return this.min;
					}
					this.filteredData = this.data.filter(function (each) {
						return inViewIDs.has(each.properties.id);
					});
					return d3.mean(this.filteredData, function (d) {
						return d.properties.ddpZ;
					});
				},
				denominator: function denominator() {
					return this.zScores.max;
				},
				textFunction: function textFunction(n) {

					if (inViewIDs.size === 0) {
						return 'none in view';
					}
					return '$' + d3.format(",.0f")(this.zScores.mean + this.zScores.sd * n) + ' (z = ' + d3.format(".2f")(n) + ')';
				}
			})); // end push
			gateCheck++;
			var information = {
				mapfeature: 'This map represents new flood insurance policies initiated between June and December 2014. The analysis in the related paper revolves around the decision whether to pay more for a lower deductible.',
				deductiblebar: 'The standard deductible is $5,000; anything less is consider a low deductible.',
				valuebar: 'This calculation ignores extreme outliers (values above $20M) which are likely due to data errors; it also ignores overrepresented values of $250,000, the majority of which are likely due to reporting errors.',
				incomebar: 'Median household income is a property of the census tract in which the policyholder resides. Each census tract with an associated policy in view is counted once.',
				coveragebar: 'Flood coverage is limited to $250,000.'
			};
			var infoMarks = d3.selectAll('.has-info-mark').append('svg').datum(information).attr('width', '12px').attr('viewBox', '0 0 12 12').attr('class', 'info-mark').append('g');

			infoMarks.call(tip).on('mouseenter', function (d) {
				console.log(d3.event);
				tip.show.call(this, d);
			}).on('mouseleave', tip.hide);

			infoMarks.append('circle').attr('class', 'info-mark-background').attr('cx', 6).attr('cy', 6).attr('r', 6);

			infoMarks.append('path').attr('class', 'info-mark-foreground').attr('d', 'M5.231,7.614V6.915c0-0.364,0.084-0.702,0.254-1.016c0.169-0.313,0.355-0.613,0.559-0.902\n\t\t\t\t\t\t\tc0.203-0.287,0.39-0.564,0.559-0.831C6.772,3.9,6.857,3.631,6.857,3.36c0-0.195-0.081-0.357-0.242-0.489\n\t\t\t\t\t\t\tC6.455,2.74,6.268,2.674,6.057,2.674c-0.153,0-0.288,0.034-0.407,0.102c-0.118,0.068-0.222,0.155-0.311,0.26\n\t\t\t\t\t\t\tC5.25,3.142,5.177,3.261,5.117,3.392c-0.06,0.131-0.097,0.264-0.114,0.4l-1.46-0.407C3.704,2.75,4.008,2.261,4.457,1.919\n\t\t\t\t\t\t\tc0.448-0.343,1.016-0.515,1.701-0.515c0.313,0,0.607,0.044,0.882,0.133C7.316,1.626,7.56,1.756,7.771,1.925\n\t\t\t\t\t\t\tC7.982,2.095,8.15,2.306,8.272,2.56c0.123,0.254,0.185,0.546,0.185,0.876c0,0.423-0.096,0.785-0.286,1.085\n\t\t\t\t\t\t\tc-0.191,0.301-0.4,0.586-0.629,0.857C7.314,5.65,7.104,5.923,6.914,6.198S6.628,6.789,6.628,7.144v0.47H5.231z M5.079,10.699V8.896\n\t\t\t\t\t\t\th1.752v1.803H5.079z');

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
	function countFeatures() {
		/* jshint laxbreak:true */
		inViewIDs.clear();
		//var count = 0;
		var bounds = theMap.getBounds();
		geojson.features.forEach(function (each) {
			if (each.properties.longitude >= bounds._sw.lng && each.properties.longitude <= bounds._ne.lng && each.properties.latitude >= bounds._sw.lat && each.properties.latitude <= bounds._ne.lat) {
				inViewIDs.add(each.properties.id);
			}
		});
		console.log(inViewIDs);
	}
	theMap.on('moveend', function () {
		updateAll();
	});
	theMap.on('zoomend', function (arg) {
		console.log(arg);
		updateAll();
		d3.select('#size-legend').classed('show', theMap.getZoom() >= sizeZoomThreshold);
	});
	function updateAll() {
		countFeatures();
		theCharts.forEach(function (each) {
			return each.update(inViewIDs);
		});
	}
	theMap.on("mousemove", "points-data-driven", function (e) {
		console.log(e);
	});

	return theMap;
}(); // end IIFE

},{"../js-exports/Bars":2,"../js-vendor/d3-tip":3,"../js-vendor/polyfills":4,"mapbox-helper":5}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
var Bars = exports.Bars = function () {

	var Bar = function Bar(configObject) {
		// margins {}, height #, width #, containerID, dataPath
		this.setup(configObject);
	};

	Bar.prototype = {
		setup: function setup(configObject) {
			var _this = this;

			// some of setup is common to all charts and could be handled by prototypical inheritance
			console.log(configObject);
			var viewBox = '0 0 100 ' + Math.round(configObject.heightToWidth * 100);
			this.container = configObject.container;
			this.margin = configObject.margin;
			this.width = 100 - this.margin.left - this.margin.right;
			this.height = configObject.heightToWidth * 100 - this.margin.top - this.margin.bottom;
			this.title = configObject.title;
			this.infoMark = configObject.infoMark || false;
			this.comparator = configObject.comparator;
			this.truncateRight = configObject.truncateRight || false;
			this.backgroundColor = configObject.backgroundColor || 'gray';
			this.data = configObject.data;
			this.numerator = configObject.numerator;
			this.denominator = configObject.denominator;
			this.textFunction = configObject.textFunction;
			this.zScores = configObject.zScores || null;
			this.min = configObject.min ? configObject.min.call(this) : 0;
			//this.max = configObject.max ? configObject.max.call(this) : 100;
			//this.scale = d3.scaleLinear().domain([this.min,this.max]).range([0,this.width]);


			d3.select(this.container).append('span').classed('figure-title', true).classed('has-info-mark', function () {
				return _this.infoMark;
			}).text(this.title);

			this.svg = d3.select(this.container).append('svg').attr('width', '100%').attr('xmlns', 'http://www.w3.org/2000/svg').attr('version', '1.1').attr('viewBox', viewBox).append('g').attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

			this.background = this.svg.append('line').classed('background-line-' + this.backgroundColor, true).attr('x0', 0).attr('y0', 0).attr('x1', this.width).attr('y1', 0);

			this.line = this.svg.append('line').classed('foreground-line', true).attr('x0', 0).attr('y0', 0).attr('x1', 0).attr('y1', 0);

			this.text = d3.select(this.container).append('span').attr('class', 'value');

			//this.update(this.numerator());  
		},
		update: function update(inViewIDs) {
			var _this2 = this;

			console.log(this);
			var n = this.numerator(inViewIDs),
			    d = this.denominator(inViewIDs);
			d3.select(this.container).classed('overflow', n > d);

			if (this.truncateRight) {
				d = this.min = 0 - d;
			} else if (this.min < 0 && d > 0) {
				if (Math.abs(this.min) < d) {
					this.min = 0 - d;
				} else {
					d = 0 - this.min;
				}
			}
			console.log('min: ' + this.min + '; max: ' + d);
			this.scale = d3.scaleLinear().domain([this.min, d]).range([0, this.width]).clamp(true);
			this.line.transition().duration(200).attr('x1', function () {
				return _this2.scale(n);
			});
			this.text.text(function () {
				return _this2.textFunction(n, d);
			});
		}
	};

	return {
		Bar: Bar
	};
}();

},{}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
// d3.tip
// Copyright (c) 2013 Justin Palmer
// ES6 / D3 v4 Adaption Copyright (c) 2016 Constantin Gavrilete
// Removal of ES6 for D3 v4 Adaption Copyright (c) 2016 David Gotz
//
// Tooltips for d3.js SVG visualizations

var d3Tip = exports.d3Tip = function () {
  d3.functor = function functor(v) {
    return typeof v === "function" ? v : function () {
      return v;
    };
  };

  d3.tip = function () {

    var direction = d3_tip_direction,
        offset = d3_tip_offset,
        html = d3_tip_html,
        node = initNode(),
        svg = null,
        point = null,
        target = null;

    function tip(vis) {
      svg = getSVGNode(vis);
      point = svg.createSVGPoint();
      document.body.appendChild(node);
    }

    // Public - show the tooltip on the screen
    //
    // Returns a tip
    tip.show = function () {
      var args = Array.prototype.slice.call(arguments);
      if (args[args.length - 1] instanceof SVGElement) target = args.pop();
      var content = html.apply(this, args),
          poffset = offset.apply(this, args),
          dir = direction.apply(this, args),
          nodel = getNodeEl(),
          i = directions.length,
          coords,
          scrollTop = document.documentElement.scrollTop || document.body.scrollTop,
          scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft;

      nodel.html(content).style('position', 'absolute').style('opacity', 1).style('pointer-events', 'all');

      while (i--) {
        nodel.classed(directions[i], false);
      }coords = direction_callbacks[dir].apply(this);
      nodel.classed(dir, true).style('top', coords.top + poffset[0] + scrollTop + 'px').style('left', coords.left + poffset[1] + scrollLeft + 'px');

      return tip;
    };

    // Public - hide the tooltip
    //
    // Returns a tip
    tip.hide = function () {
      var nodel = getNodeEl();
      nodel.style('opacity', 0).style('pointer-events', 'none');
      return tip;
    };

    // Public: Proxy attr calls to the d3 tip container.  Sets or gets attribute value.
    //
    // n - name of the attribute
    // v - value of the attribute
    //
    // Returns tip or attribute value
    tip.attr = function (n, v) {
      if (arguments.length < 2 && typeof n === 'string') {
        return getNodeEl().attr(n);
      } else {
        var args = Array.prototype.slice.call(arguments);
        d3.selection.prototype.attr.apply(getNodeEl(), args);
      }

      return tip;
    };

    // Public: Proxy style calls to the d3 tip container.  Sets or gets a style value.
    //
    // n - name of the property
    // v - value of the property
    //
    // Returns tip or style property value
    tip.style = function (n, v) {
      // debugger;
      if (arguments.length < 2 && typeof n === 'string') {
        return getNodeEl().style(n);
      } else {
        var args = Array.prototype.slice.call(arguments);
        if (args.length === 1) {
          var styles = args[0];
          Object.keys(styles).forEach(function (key) {
            return d3.selection.prototype.style.apply(getNodeEl(), [key, styles[key]]);
          });
        }
      }

      return tip;
    };

    // Public: Set or get the direction of the tooltip
    //
    // v - One of n(north), s(south), e(east), or w(west), nw(northwest),
    //     sw(southwest), ne(northeast) or se(southeast)
    //
    // Returns tip or direction
    tip.direction = function (v) {
      if (!arguments.length) return direction;
      direction = v == null ? v : d3.functor(v);

      return tip;
    };

    // Public: Sets or gets the offset of the tip
    //
    // v - Array of [x, y] offset
    //
    // Returns offset or
    tip.offset = function (v) {
      if (!arguments.length) return offset;
      offset = v == null ? v : d3.functor(v);

      return tip;
    };

    // Public: sets or gets the html value of the tooltip
    //
    // v - String value of the tip
    //
    // Returns html value or tip
    tip.html = function (v) {
      if (!arguments.length) return html;
      html = v == null ? v : d3.functor(v);

      return tip;
    };

    // Public: destroys the tooltip and removes it from the DOM
    //
    // Returns a tip
    tip.destroy = function () {
      if (node) {
        getNodeEl().remove();
        node = null;
      }
      return tip;
    };

    function d3_tip_direction() {
      return 'n';
    }
    function d3_tip_offset() {
      return [0, 0];
    }
    function d3_tip_html() {
      return ' ';
    }

    var direction_callbacks = {
      n: direction_n,
      s: direction_s,
      e: direction_e,
      w: direction_w,
      nw: direction_nw,
      ne: direction_ne,
      sw: direction_sw,
      se: direction_se
    };

    var directions = Object.keys(direction_callbacks);

    function direction_n() {
      var bbox = getScreenBBox();
      return {
        top: bbox.n.y - node.offsetHeight,
        left: bbox.n.x - node.offsetWidth / 2
      };
    }

    function direction_s() {
      var bbox = getScreenBBox();
      return {
        top: bbox.s.y,
        left: bbox.s.x - node.offsetWidth / 2
      };
    }

    function direction_e() {
      var bbox = getScreenBBox();
      return {
        top: bbox.e.y - node.offsetHeight / 2,
        left: bbox.e.x
      };
    }

    function direction_w() {
      var bbox = getScreenBBox();
      return {
        top: bbox.w.y - node.offsetHeight / 2,
        left: bbox.w.x - node.offsetWidth
      };
    }

    function direction_nw() {
      var bbox = getScreenBBox();
      return {
        top: bbox.nw.y - node.offsetHeight,
        left: bbox.nw.x - node.offsetWidth
      };
    }

    function direction_ne() {
      var bbox = getScreenBBox();
      return {
        top: bbox.ne.y - node.offsetHeight,
        left: bbox.ne.x
      };
    }

    function direction_sw() {
      var bbox = getScreenBBox();
      return {
        top: bbox.sw.y,
        left: bbox.sw.x - node.offsetWidth
      };
    }

    function direction_se() {
      var bbox = getScreenBBox();
      return {
        top: bbox.se.y,
        left: bbox.e.x
      };
    }

    function initNode() {
      var node = d3.select(document.createElement('div'));
      node.style('position', 'absolute').style('top', 0).style('opacity', 0).style('pointer-events', 'none').style('box-sizing', 'border-box');

      return node.node();
    }

    function getSVGNode(el) {
      el = el.node();
      if (el.tagName.toLowerCase() === 'svg') return el;

      return el.ownerSVGElement;
    }

    function getNodeEl() {
      if (node === null) {
        node = initNode();
        // re-add node to DOM
        document.body.appendChild(node);
      };
      return d3.select(node);
    }

    // Private - gets the screen coordinates of a shape
    //
    // Given a shape on the screen, will return an SVGPoint for the directions
    // n(north), s(south), e(east), w(west), ne(northeast), se(southeast), nw(northwest),
    // sw(southwest).
    //
    //    +-+-+
    //    |   |
    //    +   +
    //    |   |
    //    +-+-+
    //
    // Returns an Object {n, s, e, w, nw, sw, ne, se}
    function getScreenBBox() {
      var targetel = target || d3.event.target;
      console.log(targetel);
      function tryBBox() {
        try {
          targetel.getBBox();
        } catch (err) {
          targetel = targetel.parentNode;
          tryBBox();
        }
      }
      tryBBox();
      while ('undefined' === typeof targetel.getScreenCTM) {
        // && 'undefined' === targetel.parentNode) {
        targetel = targetel.parentNode;
      }
      console.log(targetel);
      var bbox = {},
          matrix = targetel.getScreenCTM(),
          tbbox = targetel.getBBox(),
          width = tbbox.width,
          height = tbbox.height,
          x = tbbox.x,
          y = tbbox.y;

      point.x = x;
      point.y = y;
      bbox.nw = point.matrixTransform(matrix);
      point.x += width;
      bbox.ne = point.matrixTransform(matrix);
      point.y += height;
      bbox.se = point.matrixTransform(matrix);
      point.x -= width;
      bbox.sw = point.matrixTransform(matrix);
      point.y -= height / 2;
      bbox.w = point.matrixTransform(matrix);
      point.x += width;
      bbox.e = point.matrixTransform(matrix);
      point.x -= width / 2;
      point.y -= height / 2;
      bbox.n = point.matrixTransform(matrix);
      point.y += height;
      bbox.s = point.matrixTransform(matrix);

      return bbox;
    }

    return tip;
  };
}();

},{}],4:[function(require,module,exports){
(function (global){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/* Polyfill service v3.25.1
 * For detailed credits and licence information see https://github.com/financial-times/polyfill-service.
 * 
 * UA detected: ie/10.0.0
 * Features requested: Promise
 * 
 * - Promise, License: MIT */

var PromisePolyfill = exports.PromisePolyfill = function (undefined) {

  // Promise
  !function (n) {
    function t(e) {
      if (r[e]) return r[e].exports;var o = r[e] = { exports: {}, id: e, loaded: !1 };return n[e].call(o.exports, o, o.exports, t), o.loaded = !0, o.exports;
    }var r = {};return t.m = n, t.c = r, t.p = "", t(0);
  }({ 0: /*!***********************!*\
         !*** ./src/global.js ***!
         \***********************/
    function _(n, t, r) {
      (function (n) {
        var t = r( /*! ./yaku */80);try {
          (n || {}).Promise = t, window.Promise = t;
        } catch (err) {}
      }).call(t, function () {
        return this;
      }());
    }, 80: /*!*********************!*\
           !*** ./src/yaku.js ***!
           \*********************/
    function _(n, t) {
      (function (t) {
        !function () {
          "use strict";
          function r() {
            return un[B][G] || J;
          }function e(n, t) {
            for (var r in t) {
              n[r] = t[r];
            }
          }function o(n) {
            return n && "object" == (typeof n === "undefined" ? "undefined" : _typeof(n));
          }function i(n) {
            return "function" == typeof n;
          }function u(n, t) {
            return n instanceof t;
          }function c(n) {
            return u(n, U);
          }function f(n, t, r) {
            if (!t(n)) throw v(r);
          }function s() {
            try {
              return C.apply(F, arguments);
            } catch (e) {
              return rn.e = e, rn;
            }
          }function a(n, t) {
            return C = n, F = t, s;
          }function l(n, t) {
            function r() {
              for (var r = 0; r < o;) {
                t(e[r], e[r + 1]), e[r++] = S, e[r++] = S;
              }o = 0, e.length > n && (e.length = n);
            }var e = O(n),
                o = 0;return function (n, t) {
              e[o++] = n, e[o++] = t, 2 === o && un.nextTick(r);
            };
          }function h(n, t) {
            var r,
                e,
                o,
                c,
                f = 0;if (!n) throw v(W);var s = n[un[B][D]];if (i(s)) e = s.call(n);else {
              if (!i(n.next)) {
                if (u(n, O)) {
                  for (r = n.length; f < r;) {
                    t(n[f], f++);
                  }return f;
                }throw v(W);
              }e = n;
            }for (; !(o = e.next()).done;) {
              if (c = a(t)(o.value, f++), c === rn) throw i(e[K]) && e[K](), c.e;
            }return f;
          }function v(n) {
            return new TypeError(n);
          }function _(n) {
            return (n ? "" : X) + new U().stack;
          }function d(n, t) {
            var r = "on" + n.toLowerCase(),
                e = H[r];I && I.listeners(n).length ? n === tn ? I.emit(n, t._v, t) : I.emit(n, t) : e ? e({ reason: t._v, promise: t }) : un[n](t._v, t);
          }function p(n) {
            return n && n._s;
          }function w(n) {
            if (p(n)) return new n(en);var t, r, e;return t = new n(function (n, o) {
              if (t) throw v();r = n, e = o;
            }), f(r, i), f(e, i), t;
          }function m(n, t) {
            return function (r) {
              A && (n[Q] = _(!0)), t === q ? T(n, r) : k(n, t, r);
            };
          }function y(n, t, r, e) {
            return i(r) && (t._onFulfilled = r), i(e) && (n[M] && d(nn, n), t._onRejected = e), A && (t._p = n), n[n._c++] = t, n._s !== z && cn(n, t), t;
          }function j(n) {
            if (n._umark) return !0;n._umark = !0;for (var t, r = 0, e = n._c; r < e;) {
              if (t = n[r++], t._onRejected || j(t)) return !0;
            }
          }function x(n, t) {
            function r(n) {
              return e.push(n.replace(/^\s+|\s+$/g, ""));
            }var e = [];return A && (t[Q] && r(t[Q]), function o(n) {
              n && N in n && (o(n._next), r(n[N] + ""), o(n._p));
            }(t)), (n && n.stack ? n.stack : n) + ("\n" + e.join("\n")).replace(on, "");
          }function g(n, t) {
            return n(t);
          }function k(n, t, r) {
            var e = 0,
                o = n._c;if (n._s === z) for (n._s = t, n._v = r, t === $ && (A && c(r) && (r.longStack = x(r, n)), fn(n)); e < o;) {
              cn(n, n[e++]);
            }return n;
          }function T(n, t) {
            if (t === n && t) return k(n, $, v(Y)), n;if (t !== P && (i(t) || o(t))) {
              var r = a(b)(t);if (r === rn) return k(n, $, r.e), n;i(r) ? (A && p(t) && (n._next = t), p(t) ? R(n, t, r) : un.nextTick(function () {
                R(n, t, r);
              })) : k(n, q, t);
            } else k(n, q, t);return n;
          }function b(n) {
            return n.then;
          }function R(n, t, r) {
            var e = a(r, t)(function (r) {
              t && (t = P, T(n, r));
            }, function (r) {
              t && (t = P, k(n, $, r));
            });e === rn && t && (k(n, $, e.e), t = P);
          }var S,
              C,
              F,
              P = null,
              E = "object" == (typeof window === "undefined" ? "undefined" : _typeof(window)),
              H = E ? window : t,
              I = H.process,
              L = H.console,
              A = !1,
              O = Array,
              U = Error,
              $ = 1,
              q = 2,
              z = 3,
              B = "Symbol",
              D = "iterator",
              G = "species",
              J = B + "(" + G + ")",
              K = "return",
              M = "_uh",
              N = "_pt",
              Q = "_st",
              V = "Invalid this",
              W = "Invalid argument",
              X = "\nFrom previous ",
              Y = "Chaining cycle detected for promise",
              Z = "Uncaught (in promise)",
              nn = "rejectionHandled",
              tn = "unhandledRejection",
              rn = { e: P },
              en = function en() {},
              on = /^.+\/node_modules\/yaku\/.+\n?/gm,
              un = n.exports = function (n) {
            var t,
                r = this;if (!o(r) || r._s !== S) throw v(V);if (r._s = z, A && (r[N] = _()), n !== en) {
              if (!i(n)) throw v(W);t = a(n)(m(r, q), m(r, $)), t === rn && k(r, $, t.e);
            }
          };un["default"] = un, e(un.prototype, { then: function then(n, t) {
              if (void 0 === this._s) throw v();return y(this, w(un.speciesConstructor(this, un)), n, t);
            }, "catch": function _catch(n) {
              return this.then(S, n);
            }, "finally": function _finally(n) {
              function t(t) {
                return un.resolve(n()).then(function () {
                  return t;
                });
              }return this.then(t, t);
            }, _c: 0, _p: P }), un.resolve = function (n) {
            return p(n) ? n : T(w(this), n);
          }, un.reject = function (n) {
            return k(w(this), $, n);
          }, un.race = function (n) {
            var t = this,
                r = w(t),
                e = function e(n) {
              k(r, q, n);
            },
                o = function o(n) {
              k(r, $, n);
            },
                i = a(h)(n, function (n) {
              t.resolve(n).then(e, o);
            });return i === rn ? t.reject(i.e) : r;
          }, un.all = function (n) {
            function t(n) {
              k(o, $, n);
            }var r,
                e = this,
                o = w(e),
                i = [];return r = a(h)(n, function (n, u) {
              e.resolve(n).then(function (n) {
                i[u] = n, --r || k(o, q, i);
              }, t);
            }), r === rn ? e.reject(r.e) : (r || k(o, q, []), o);
          }, un.Symbol = H[B] || {}, a(function () {
            Object.defineProperty(un, r(), { get: function get() {
                return this;
              } });
          })(), un.speciesConstructor = function (n, t) {
            var e = n.constructor;return e ? e[r()] || t : t;
          }, un.unhandledRejection = function (n, t) {
            L && L.error(Z, A ? t.longStack : x(n, t));
          }, un.rejectionHandled = en, un.enableLongStackTrace = function () {
            A = !0;
          }, un.nextTick = E ? function (n) {
            setTimeout(n);
          } : I.nextTick, un._s = 1;var cn = l(999, function (n, t) {
            var r, e;return e = n._s !== $ ? t._onFulfilled : t._onRejected, e === S ? void k(t, n._s, n._v) : (r = a(g)(e, n._v), r === rn ? void k(t, $, r.e) : void T(t, r));
          }),
              fn = l(9, function (n) {
            j(n) || (n[M] = 1, d(tn, n));
          });
        }();
      }).call(t, function () {
        return this;
      }());
    } });
}.call('object' === (typeof window === "undefined" ? "undefined" : _typeof(window)) && window || 'object' === (typeof self === "undefined" ? "undefined" : _typeof(self)) && self || 'object' === (typeof global === "undefined" ? "undefined" : _typeof(global)) && global || {});

/**
 * MapValues  
 * Copyright(c) 2017, John Osterman
 *
 * MIT License
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and 
 * associated documentation files (the "Software"), to deal in the Software without restriction, including 
 * without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell 
 * copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the 
 * following conditions:

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT 
 * LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO 
 * EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER 
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE 
 * USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/* poor man's polyfill for Map.values(). simply returns an array of the values. Cannot guarantee it preserves
 * insertion order or that it will handle all property or value types. almost certainly not equivalent to native
 * prototype 
 */

var MapValues = exports.MapValues = function () {
  Map.prototype.values = Map.prototype.values || function () {
    var array = [];
    this.forEach(function (each) {
      array.push(each);
    });
    return array;
  };
}();

/**
 * SVG focus 
 * Copyright(c) 2017, John Osterman
 *
 * MIT License
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and 
 * associated documentation files (the "Software"), to deal in the Software without restriction, including 
 * without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell 
 * copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the 
 * following conditions:

 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT 
 * LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO 
 * EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER 
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE 
 * USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// IE/Edge (perhaps others) does not allow programmatic focusing of SVG Elements (via `focus()`). Same for `blur()`.

var SVGFocus = exports.SVGFocus = function () {
  if ('focus' in SVGElement.prototype === false) {
    SVGElement.prototype.focus = HTMLElement.prototype.focus;
  }
  if ('blur' in SVGElement.prototype === false) {
    SVGElement.prototype.blur = HTMLElement.prototype.blur;
  }
}();

/**
 * innerHTML property for SVGElement
 * Copyright(c) 2010, Jeff Schiller
 *
 * Licensed under the Apache License, Version 2
 *
 * Works in a SVG document in Chrome 6+, Safari 5+, Firefox 4+ and IE9+.
 * Works in a HTML5 document in Chrome 7+, Firefox 4+ and IE9+.
 * Does not work in Opera since it doesn't support the SVGElement interface yet.
 *
 * I haven't decided on the best name for this property - thus the duplication.
 */
// edited by John Osterman to declare the variable `sXML`, which was referenced without being declared
// which failed silently in implicit strict mode of an export

// most browsers allow setting innerHTML of svg elements but IE does not (not an HTML element)
// this polyfill provides that. necessary for d3 method `.html()` on svg elements

var SVGInnerHTML = exports.SVGInnerHTML = function () {
  var serializeXML = function serializeXML(node, output) {
    var nodeType = node.nodeType;
    if (nodeType == 3) {
      // TEXT nodes.
      // Replace special XML characters with their entities.
      output.push(node.textContent.replace(/&/, '&amp;').replace(/</, '&lt;').replace('>', '&gt;'));
    } else if (nodeType == 1) {
      // ELEMENT nodes.
      // Serialize Element nodes.
      output.push('<', node.tagName);
      if (node.hasAttributes()) {
        var attrMap = node.attributes;
        for (var i = 0, len = attrMap.length; i < len; ++i) {
          var attrNode = attrMap.item(i);
          output.push(' ', attrNode.name, '=\'', attrNode.value, '\'');
        }
      }
      if (node.hasChildNodes()) {
        output.push('>');
        var childNodes = node.childNodes;
        for (var i = 0, len = childNodes.length; i < len; ++i) {
          serializeXML(childNodes.item(i), output);
        }
        output.push('</', node.tagName, '>');
      } else {
        output.push('/>');
      }
    } else if (nodeType == 8) {
      // TODO(codedread): Replace special characters with XML entities?
      output.push('<!--', node.nodeValue, '-->');
    } else {
      // TODO: Handle CDATA nodes.
      // TODO: Handle ENTITY nodes.
      // TODO: Handle DOCUMENT nodes.
      throw 'Error serializing XML. Unhandled node of type: ' + nodeType;
    }
  };
  // The innerHTML DOM property for SVGElement.
  if ('innerHTML' in SVGElement.prototype === false) {
    Object.defineProperty(SVGElement.prototype, 'innerHTML', {
      get: function get() {
        var output = [];
        var childNode = this.firstChild;
        while (childNode) {
          serializeXML(childNode, output);
          childNode = childNode.nextSibling;
        }
        return output.join('');
      },
      set: function set(markupText) {
        console.log(this);
        // Wipe out the current contents of the element.
        while (this.firstChild) {
          this.removeChild(this.firstChild);
        }

        try {
          // Parse the markup into valid nodes.
          var dXML = new DOMParser();
          dXML.async = false;
          // Wrap the markup into a SVG node to ensure parsing works.
          console.log(markupText);
          var sXML = '<svg xmlns="http://www.w3.org/2000/svg">' + markupText + '</svg>';
          console.log(sXML);
          var svgDocElement = dXML.parseFromString(sXML, 'text/xml').documentElement;

          // Now take each node, import it and append to this element.
          var childNode = svgDocElement.firstChild;
          while (childNode) {
            this.appendChild(this.ownerDocument.importNode(childNode, true));
            childNode = childNode.nextSibling;
          }
        } catch (e) {
          throw new Error('Error parsing XML string');
        };
      }
    });

    // The innerSVG DOM property for SVGElement.
    Object.defineProperty(SVGElement.prototype, 'innerSVG', {
      get: function get() {
        return this.innerHTML;
      },
      set: function set(markupText) {
        this.innerHTML = markupText;
      }
    });
  }
}();

// https://tc39.github.io/ecma262/#sec-array.prototype.find
var arrayFind = exports.arrayFind = function () {
  if (!Array.prototype.find) {
    Object.defineProperty(Array.prototype, 'find', {
      value: function value(predicate) {
        // 1. Let O be ? ToObject(this value).
        if (this == null) {
          throw new TypeError('"this" is null or not defined');
        }

        var o = Object(this);

        // 2. Let len be ? ToLength(? Get(O, "length")).
        var len = o.length >>> 0;

        // 3. If IsCallable(predicate) is false, throw a TypeError exception.
        if (typeof predicate !== 'function') {
          throw new TypeError('predicate must be a function');
        }

        // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
        var thisArg = arguments[1];

        // 5. Let k be 0.
        var k = 0;

        // 6. Repeat, while k < len
        while (k < len) {
          // a. Let Pk be ! ToString(k).
          // b. Let kValue be ? Get(O, Pk).
          // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
          // d. If testResult is true, return kValue.
          var kValue = o[k];
          if (predicate.call(thisArg, kValue, k, o)) {
            return kValue;
          }
          // e. Increase k by 1.
          k++;
        }

        // 7. Return undefined.
        return undefined;
      }
    });
  }
}();

// Copyright (C) 2011-2012 Software Languages Lab, Vrije Universiteit Brussel
// This code is dual-licensed under both the Apache License and the MPL

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/* Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is a shim for the ES-Harmony reflection module
 *
 * The Initial Developer of the Original Code is
 * Tom Van Cutsem, Vrije Universiteit Brussel.
 * Portions created by the Initial Developer are Copyright (C) 2011-2012
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 */

// ----------------------------------------------------------------------------

// This file is a polyfill for the upcoming ECMAScript Reflect API,
// including support for Proxies. See the draft specification at:
// http://wiki.ecmascript.org/doku.php?id=harmony:reflect_api
// http://wiki.ecmascript.org/doku.php?id=harmony:direct_proxies

// For an implementation of the Handler API, see handlers.js, which implements:
// http://wiki.ecmascript.org/doku.php?id=harmony:virtual_object_api

// This implementation supersedes the earlier polyfill at:
// code.google.com/p/es-lab/source/browse/trunk/src/proxies/DirectProxies.js

// This code was tested on tracemonkey / Firefox 12
//  (and should run fine on older Firefox versions starting with FF4)
// The code also works correctly on
//   v8 --harmony_proxies --harmony_weakmaps (v3.6.5.1)

// Language Dependencies:
//  - ECMAScript 5/strict
//  - "old" (i.e. non-direct) Harmony Proxies
//  - Harmony WeakMaps
// Patches:
//  - Object.{freeze,seal,preventExtensions}
//  - Object.{isFrozen,isSealed,isExtensible}
//  - Object.getPrototypeOf
//  - Object.keys
//  - Object.prototype.valueOf
//  - Object.prototype.isPrototypeOf
//  - Object.prototype.toString
//  - Object.prototype.hasOwnProperty
//  - Object.getOwnPropertyDescriptor
//  - Object.defineProperty
//  - Object.defineProperties
//  - Object.getOwnPropertyNames
//  - Object.getOwnPropertySymbols
//  - Object.getPrototypeOf
//  - Object.setPrototypeOf
//  - Object.assign
//  - Function.prototype.toString
//  - Date.prototype.toString
//  - Array.isArray
//  - Array.prototype.concat
//  - Proxy
// Adds new globals:
//  - Reflect

// Direct proxies can be created via Proxy(target, handler)

// ----------------------------------------------------------------------------

var reflect = exports.reflect = function (global) {
  // function-as-module pattern
  "use strict";

  // === Direct Proxies: Invariant Enforcement ===

  // Direct proxies build on non-direct proxies by automatically wrapping
  // all user-defined proxy handlers in a Validator handler that checks and
  // enforces ES5 invariants.

  // A direct proxy is a proxy for an existing object called the target object.

  // A Validator handler is a wrapper for a target proxy handler H.
  // The Validator forwards all operations to H, but additionally
  // performs a number of integrity checks on the results of some traps,
  // to make sure H does not violate the ES5 invariants w.r.t. non-configurable
  // properties and non-extensible, sealed or frozen objects.

  // For each property that H exposes as own, non-configurable
  // (e.g. by returning a descriptor from a call to getOwnPropertyDescriptor)
  // the Validator handler defines those properties on the target object.
  // When the proxy becomes non-extensible, also configurable own properties
  // are checked against the target.
  // We will call properties that are defined on the target object
  // "fixed properties".

  // We will name fixed non-configurable properties "sealed properties".
  // We will name fixed non-configurable non-writable properties "frozen
  // properties".

  // The Validator handler upholds the following invariants w.r.t. non-configurability:
  // - getOwnPropertyDescriptor cannot report sealed properties as non-existent
  // - getOwnPropertyDescriptor cannot report incompatible changes to the
  //   attributes of a sealed property (e.g. reporting a non-configurable
  //   property as configurable, or reporting a non-configurable, non-writable
  //   property as writable)
  // - getPropertyDescriptor cannot report sealed properties as non-existent
  // - getPropertyDescriptor cannot report incompatible changes to the
  //   attributes of a sealed property. It _can_ report incompatible changes
  //   to the attributes of non-own, inherited properties.
  // - defineProperty cannot make incompatible changes to the attributes of
  //   sealed properties
  // - deleteProperty cannot report a successful deletion of a sealed property
  // - hasOwn cannot report a sealed property as non-existent
  // - has cannot report a sealed property as non-existent
  // - get cannot report inconsistent values for frozen data
  //   properties, and must report undefined for sealed accessors with an
  //   undefined getter
  // - set cannot report a successful assignment for frozen data
  //   properties or sealed accessors with an undefined setter.
  // - get{Own}PropertyNames lists all sealed properties of the target.
  // - keys lists all enumerable sealed properties of the target.
  // - enumerate lists all enumerable sealed properties of the target.
  // - if a property of a non-extensible proxy is reported as non-existent,
  //   then it must forever be reported as non-existent. This applies to
  //   own and inherited properties and is enforced in the
  //   deleteProperty, get{Own}PropertyDescriptor, has{Own},
  //   get{Own}PropertyNames, keys and enumerate traps

  // Violation of any of these invariants by H will result in TypeError being
  // thrown.

  // Additionally, once Object.preventExtensions, Object.seal or Object.freeze
  // is invoked on the proxy, the set of own property names for the proxy is
  // fixed. Any property name that is not fixed is called a 'new' property.

  // The Validator upholds the following invariants regarding extensibility:
  // - getOwnPropertyDescriptor cannot report new properties as existent
  //   (it must report them as non-existent by returning undefined)
  // - defineProperty cannot successfully add a new property (it must reject)
  // - getOwnPropertyNames cannot list new properties
  // - hasOwn cannot report true for new properties (it must report false)
  // - keys cannot list new properties

  // Invariants currently not enforced:
  // - getOwnPropertyNames lists only own property names
  // - keys lists only enumerable own property names
  // Both traps may list more property names than are actually defined on the
  // target.

  // Invariants with regard to inheritance are currently not enforced.
  // - a non-configurable potentially inherited property on a proxy with
  //   non-mutable ancestry cannot be reported as non-existent
  // (An object with non-mutable ancestry is a non-extensible object whose
  // [[Prototype]] is either null or an object with non-mutable ancestry.)

  // Changes in Handler API compared to previous harmony:proxies, see:
  // http://wiki.ecmascript.org/doku.php?id=strawman:direct_proxies
  // http://wiki.ecmascript.org/doku.php?id=harmony:direct_proxies

  // ----------------------------------------------------------------------------

  // ---- WeakMap polyfill ----

  // TODO: find a proper WeakMap polyfill

  // define an empty WeakMap so that at least the Reflect module code
  // will work in the absence of WeakMaps. Proxy emulation depends on
  // actual WeakMaps, so will not work with this little shim.

  if (typeof WeakMap === "undefined") {
    global.WeakMap = function () {};
    global.WeakMap.prototype = {
      get: function get(k) {
        return undefined;
      },
      set: function set(k, v) {
        throw new Error("WeakMap not supported");
      }
    };
  }

  // ---- Normalization functions for property descriptors ----

  function isStandardAttribute(name) {
    return (/^(get|set|value|writable|enumerable|configurable)$/.test(name)
    );
  }

  // Adapted from ES5 section 8.10.5
  function toPropertyDescriptor(obj) {
    if (Object(obj) !== obj) {
      throw new TypeError("property descriptor should be an Object, given: " + obj);
    }
    var desc = {};
    if ('enumerable' in obj) {
      desc.enumerable = !!obj.enumerable;
    }
    if ('configurable' in obj) {
      desc.configurable = !!obj.configurable;
    }
    if ('value' in obj) {
      desc.value = obj.value;
    }
    if ('writable' in obj) {
      desc.writable = !!obj.writable;
    }
    if ('get' in obj) {
      var getter = obj.get;
      if (getter !== undefined && typeof getter !== "function") {
        throw new TypeError("property descriptor 'get' attribute must be " + "callable or undefined, given: " + getter);
      }
      desc.get = getter;
    }
    if ('set' in obj) {
      var setter = obj.set;
      if (setter !== undefined && typeof setter !== "function") {
        throw new TypeError("property descriptor 'set' attribute must be " + "callable or undefined, given: " + setter);
      }
      desc.set = setter;
    }
    if ('get' in desc || 'set' in desc) {
      if ('value' in desc || 'writable' in desc) {
        throw new TypeError("property descriptor cannot be both a data and an " + "accessor descriptor: " + obj);
      }
    }
    return desc;
  }

  function isAccessorDescriptor(desc) {
    if (desc === undefined) return false;
    return 'get' in desc || 'set' in desc;
  }
  function isDataDescriptor(desc) {
    if (desc === undefined) return false;
    return 'value' in desc || 'writable' in desc;
  }
  function isGenericDescriptor(desc) {
    if (desc === undefined) return false;
    return !isAccessorDescriptor(desc) && !isDataDescriptor(desc);
  }

  function toCompletePropertyDescriptor(desc) {
    var internalDesc = toPropertyDescriptor(desc);
    if (isGenericDescriptor(internalDesc) || isDataDescriptor(internalDesc)) {
      if (!('value' in internalDesc)) {
        internalDesc.value = undefined;
      }
      if (!('writable' in internalDesc)) {
        internalDesc.writable = false;
      }
    } else {
      if (!('get' in internalDesc)) {
        internalDesc.get = undefined;
      }
      if (!('set' in internalDesc)) {
        internalDesc.set = undefined;
      }
    }
    if (!('enumerable' in internalDesc)) {
      internalDesc.enumerable = false;
    }
    if (!('configurable' in internalDesc)) {
      internalDesc.configurable = false;
    }
    return internalDesc;
  }

  function isEmptyDescriptor(desc) {
    return !('get' in desc) && !('set' in desc) && !('value' in desc) && !('writable' in desc) && !('enumerable' in desc) && !('configurable' in desc);
  }

  function isEquivalentDescriptor(desc1, desc2) {
    return sameValue(desc1.get, desc2.get) && sameValue(desc1.set, desc2.set) && sameValue(desc1.value, desc2.value) && sameValue(desc1.writable, desc2.writable) && sameValue(desc1.enumerable, desc2.enumerable) && sameValue(desc1.configurable, desc2.configurable);
  }

  // copied from http://wiki.ecmascript.org/doku.php?id=harmony:egal
  function sameValue(x, y) {
    if (x === y) {
      // 0 === -0, but they are not identical
      return x !== 0 || 1 / x === 1 / y;
    }

    // NaN !== NaN, but they are identical.
    // NaNs are the only non-reflexive value, i.e., if x !== x,
    // then x is a NaN.
    // isNaN is broken: it converts its argument to number, so
    // isNaN("foo") => true
    return x !== x && y !== y;
  }

  /**
   * Returns a fresh property descriptor that is guaranteed
   * to be complete (i.e. contain all the standard attributes).
   * Additionally, any non-standard enumerable properties of
   * attributes are copied over to the fresh descriptor.
   *
   * If attributes is undefined, returns undefined.
   *
   * See also: http://wiki.ecmascript.org/doku.php?id=harmony:proxies_semantics
   */
  function normalizeAndCompletePropertyDescriptor(attributes) {
    if (attributes === undefined) {
      return undefined;
    }
    var desc = toCompletePropertyDescriptor(attributes);
    // Note: no need to call FromPropertyDescriptor(desc), as we represent
    // "internal" property descriptors as proper Objects from the start
    for (var name in attributes) {
      if (!isStandardAttribute(name)) {
        Object.defineProperty(desc, name, { value: attributes[name],
          writable: true,
          enumerable: true,
          configurable: true });
      }
    }
    return desc;
  }

  /**
   * Returns a fresh property descriptor whose standard
   * attributes are guaranteed to be data properties of the right type.
   * Additionally, any non-standard enumerable properties of
   * attributes are copied over to the fresh descriptor.
   *
   * If attributes is undefined, will throw a TypeError.
   *
   * See also: http://wiki.ecmascript.org/doku.php?id=harmony:proxies_semantics
   */
  function normalizePropertyDescriptor(attributes) {
    var desc = toPropertyDescriptor(attributes);
    // Note: no need to call FromGenericPropertyDescriptor(desc), as we represent
    // "internal" property descriptors as proper Objects from the start
    for (var name in attributes) {
      if (!isStandardAttribute(name)) {
        Object.defineProperty(desc, name, { value: attributes[name],
          writable: true,
          enumerable: true,
          configurable: true });
      }
    }
    return desc;
  }

  // store a reference to the real ES5 primitives before patching them later
  var prim_preventExtensions = Object.preventExtensions,
      prim_seal = Object.seal,
      prim_freeze = Object.freeze,
      prim_isExtensible = Object.isExtensible,
      prim_isSealed = Object.isSealed,
      prim_isFrozen = Object.isFrozen,
      prim_getPrototypeOf = Object.getPrototypeOf,
      prim_getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor,
      prim_defineProperty = Object.defineProperty,
      prim_defineProperties = Object.defineProperties,
      prim_keys = Object.keys,
      prim_getOwnPropertyNames = Object.getOwnPropertyNames,
      prim_getOwnPropertySymbols = Object.getOwnPropertySymbols,
      prim_assign = Object.assign,
      prim_isArray = Array.isArray,
      prim_concat = Array.prototype.concat,
      prim_isPrototypeOf = Object.prototype.isPrototypeOf,
      prim_hasOwnProperty = Object.prototype.hasOwnProperty;

  // these will point to the patched versions of the respective methods on
  // Object. They are used within this module as the "intrinsic" bindings
  // of these methods (i.e. the "original" bindings as defined in the spec)
  var Object_isFrozen, Object_isSealed, Object_isExtensible, Object_getPrototypeOf, Object_getOwnPropertyNames;

  /**
   * A property 'name' is fixed if it is an own property of the target.
   */
  function isFixed(name, target) {
    return {}.hasOwnProperty.call(target, name);
  }
  function isSealed(name, target) {
    var desc = Object.getOwnPropertyDescriptor(target, name);
    if (desc === undefined) {
      return false;
    }
    return desc.configurable === false;
  }
  function isSealedDesc(desc) {
    return desc !== undefined && desc.configurable === false;
  }

  /**
   * Performs all validation that Object.defineProperty performs,
   * without actually defining the property. Returns a boolean
   * indicating whether validation succeeded.
   *
   * Implementation transliterated from ES5.1 section 8.12.9
   */
  function isCompatibleDescriptor(extensible, current, desc) {
    if (current === undefined && extensible === false) {
      return false;
    }
    if (current === undefined && extensible === true) {
      return true;
    }
    if (isEmptyDescriptor(desc)) {
      return true;
    }
    if (isEquivalentDescriptor(current, desc)) {
      return true;
    }
    if (current.configurable === false) {
      if (desc.configurable === true) {
        return false;
      }
      if ('enumerable' in desc && desc.enumerable !== current.enumerable) {
        return false;
      }
    }
    if (isGenericDescriptor(desc)) {
      return true;
    }
    if (isDataDescriptor(current) !== isDataDescriptor(desc)) {
      if (current.configurable === false) {
        return false;
      }
      return true;
    }
    if (isDataDescriptor(current) && isDataDescriptor(desc)) {
      if (current.configurable === false) {
        if (current.writable === false && desc.writable === true) {
          return false;
        }
        if (current.writable === false) {
          if ('value' in desc && !sameValue(desc.value, current.value)) {
            return false;
          }
        }
      }
      return true;
    }
    if (isAccessorDescriptor(current) && isAccessorDescriptor(desc)) {
      if (current.configurable === false) {
        if ('set' in desc && !sameValue(desc.set, current.set)) {
          return false;
        }
        if ('get' in desc && !sameValue(desc.get, current.get)) {
          return false;
        }
      }
    }
    return true;
  }

  // ES6 7.3.11 SetIntegrityLevel
  // level is one of "sealed" or "frozen"
  function setIntegrityLevel(target, level) {
    var ownProps = Object_getOwnPropertyNames(target);
    var pendingException = undefined;
    if (level === "sealed") {
      var l = +ownProps.length;
      var k;
      for (var i = 0; i < l; i++) {
        k = String(ownProps[i]);
        try {
          Object.defineProperty(target, k, { configurable: false });
        } catch (e) {
          if (pendingException === undefined) {
            pendingException = e;
          }
        }
      }
    } else {
      // level === "frozen"
      var l = +ownProps.length;
      var k;
      for (var i = 0; i < l; i++) {
        k = String(ownProps[i]);
        try {
          var currentDesc = Object.getOwnPropertyDescriptor(target, k);
          if (currentDesc !== undefined) {
            var desc;
            if (isAccessorDescriptor(currentDesc)) {
              desc = { configurable: false };
            } else {
              desc = { configurable: false, writable: false };
            }
            Object.defineProperty(target, k, desc);
          }
        } catch (e) {
          if (pendingException === undefined) {
            pendingException = e;
          }
        }
      }
    }
    if (pendingException !== undefined) {
      throw pendingException;
    }
    return Reflect.preventExtensions(target);
  }

  // ES6 7.3.12 TestIntegrityLevel
  // level is one of "sealed" or "frozen"
  function testIntegrityLevel(target, level) {
    var isExtensible = Object_isExtensible(target);
    if (isExtensible) return false;

    var ownProps = Object_getOwnPropertyNames(target);
    var pendingException = undefined;
    var configurable = false;
    var writable = false;

    var l = +ownProps.length;
    var k;
    var currentDesc;
    for (var i = 0; i < l; i++) {
      k = String(ownProps[i]);
      try {
        currentDesc = Object.getOwnPropertyDescriptor(target, k);
        configurable = configurable || currentDesc.configurable;
        if (isDataDescriptor(currentDesc)) {
          writable = writable || currentDesc.writable;
        }
      } catch (e) {
        if (pendingException === undefined) {
          pendingException = e;
          configurable = true;
        }
      }
    }
    if (pendingException !== undefined) {
      throw pendingException;
    }
    if (level === "frozen" && writable === true) {
      return false;
    }
    if (configurable === true) {
      return false;
    }
    return true;
  }

  // ---- The Validator handler wrapper around user handlers ----

  /**
   * @param target the object wrapped by this proxy.
   * As long as the proxy is extensible, only non-configurable properties
   * are checked against the target. Once the proxy becomes non-extensible,
   * invariants w.r.t. non-extensibility are also enforced.
   *
   * @param handler the handler of the direct proxy. The object emulated by
   * this handler is validated against the target object of the direct proxy.
   * Any violations that the handler makes against the invariants
   * of the target will cause a TypeError to be thrown.
   *
   * Both target and handler must be proper Objects at initialization time.
   */
  function Validator(target, handler) {
    // for non-revokable proxies, these are const references
    // for revokable proxies, on revocation:
    // - this.target is set to null
    // - this.handler is set to a handler that throws on all traps
    this.target = target;
    this.handler = handler;
  }

  Validator.prototype = {

    /**
     * If getTrap returns undefined, the caller should perform the
     * default forwarding behavior.
     * If getTrap returns normally otherwise, the return value
     * will be a callable trap function. When calling the trap function,
     * the caller is responsible for binding its |this| to |this.handler|.
     */
    getTrap: function getTrap(trapName) {
      var trap = this.handler[trapName];
      if (trap === undefined) {
        // the trap was not defined,
        // perform the default forwarding behavior
        return undefined;
      }

      if (typeof trap !== "function") {
        throw new TypeError(trapName + " trap is not callable: " + trap);
      }

      return trap;
    },

    // === fundamental traps ===

    /**
     * If name denotes a fixed property, check:
     *   - whether targetHandler reports it as existent
     *   - whether the returned descriptor is compatible with the fixed property
     * If the proxy is non-extensible, check:
     *   - whether name is not a new property
     * Additionally, the returned descriptor is normalized and completed.
     */
    getOwnPropertyDescriptor: function getOwnPropertyDescriptor(name) {
      "use strict";

      var trap = this.getTrap("getOwnPropertyDescriptor");
      if (trap === undefined) {
        return Reflect.getOwnPropertyDescriptor(this.target, name);
      }

      name = String(name);
      var desc = trap.call(this.handler, this.target, name);
      desc = normalizeAndCompletePropertyDescriptor(desc);

      var targetDesc = Object.getOwnPropertyDescriptor(this.target, name);
      var extensible = Object.isExtensible(this.target);

      if (desc === undefined) {
        if (isSealedDesc(targetDesc)) {
          throw new TypeError("cannot report non-configurable property '" + name + "' as non-existent");
        }
        if (!extensible && targetDesc !== undefined) {
          // if handler is allowed to return undefined, we cannot guarantee
          // that it will not return a descriptor for this property later.
          // Once a property has been reported as non-existent on a non-extensible
          // object, it should forever be reported as non-existent
          throw new TypeError("cannot report existing own property '" + name + "' as non-existent on a non-extensible object");
        }
        return undefined;
      }

      // at this point, we know (desc !== undefined), i.e.
      // targetHandler reports 'name' as an existing property

      // Note: we could collapse the following two if-tests into a single
      // test. Separating out the cases to improve error reporting.

      if (!extensible) {
        if (targetDesc === undefined) {
          throw new TypeError("cannot report a new own property '" + name + "' on a non-extensible object");
        }
      }

      if (name !== undefined) {
        if (!isCompatibleDescriptor(extensible, targetDesc, desc)) {
          throw new TypeError("cannot report incompatible property descriptor " + "for property '" + name + "'");
        }
      }

      if (desc.configurable === false) {
        if (targetDesc === undefined || targetDesc.configurable === true) {
          // if the property is configurable or non-existent on the target,
          // but is reported as a non-configurable property, it may later be
          // reported as configurable or non-existent, which violates the
          // invariant that if the property might change or disappear, the
          // configurable attribute must be true.
          throw new TypeError("cannot report a non-configurable descriptor " + "for configurable or non-existent property '" + name + "'");
        }
        if ('writable' in desc && desc.writable === false) {
          if (targetDesc.writable === true) {
            // if the property is non-configurable, writable on the target,
            // but is reported as non-configurable, non-writable, it may later
            // be reported as non-configurable, writable again, which violates
            // the invariant that a non-configurable, non-writable property
            // may not change state.
            throw new TypeError("cannot report non-configurable, writable property '" + name + "' as non-configurable, non-writable");
          }
        }
      }

      return desc;
    },

    /**
     * In the direct proxies design with refactored prototype climbing,
     * this trap is deprecated. For proxies-as-prototypes, instead
     * of calling this trap, the get, set, has or enumerate traps are
     * called instead.
     *
     * In this implementation, we "abuse" getPropertyDescriptor to
     * support trapping the get or set traps for proxies-as-prototypes.
     * We do this by returning a getter/setter pair that invokes
     * the corresponding traps.
     *
     * While this hack works for inherited property access, it has some
     * quirks:
     *
     * In Firefox, this trap is only called after a prior invocation
     * of the 'has' trap has returned true. Hence, expect the following
     * behavior:
     * <code>
     * var child = Object.create(Proxy(target, handler));
     * child[name] // triggers handler.has(target, name)
     * // if that returns true, triggers handler.get(target, name, child)
     * </code>
     *
     * On v8, the 'in' operator, when applied to an object that inherits
     * from a proxy, will call getPropertyDescriptor and walk the proto-chain.
     * That calls the below getPropertyDescriptor trap on the proxy. The
     * result of the 'in'-operator is then determined by whether this trap
     * returns undefined or a property descriptor object. That is why
     * we first explicitly trigger the 'has' trap to determine whether
     * the property exists.
     *
     * This has the side-effect that when enumerating properties on
     * an object that inherits from a proxy in v8, only properties
     * for which 'has' returns true are returned:
     *
     * <code>
     * var child = Object.create(Proxy(target, handler));
     * for (var prop in child) {
     *   // only enumerates prop if (prop in child) returns true
     * }
     * </code>
     */
    getPropertyDescriptor: function getPropertyDescriptor(name) {
      var handler = this;

      if (!handler.has(name)) return undefined;

      return {
        get: function get() {
          return handler.get(this, name);
        },
        set: function set(val) {
          if (handler.set(this, name, val)) {
            return val;
          } else {
            throw new TypeError("failed assignment to " + name);
          }
        },
        enumerable: true,
        configurable: true
      };
    },

    /**
     * If name denotes a fixed property, check for incompatible changes.
     * If the proxy is non-extensible, check that new properties are rejected.
     */
    defineProperty: function defineProperty(name, desc) {
      // TODO(tvcutsem): the current tracemonkey implementation of proxies
      // auto-completes 'desc', which is not correct. 'desc' should be
      // normalized, but not completed. Consider:
      // Object.defineProperty(proxy, 'foo', {enumerable:false})
      // This trap will receive desc =
      //  {value:undefined,writable:false,enumerable:false,configurable:false}
      // This will also set all other attributes to their default value,
      // which is unexpected and different from [[DefineOwnProperty]].
      // Bug filed: https://bugzilla.mozilla.org/show_bug.cgi?id=601329

      var trap = this.getTrap("defineProperty");
      if (trap === undefined) {
        // default forwarding behavior
        return Reflect.defineProperty(this.target, name, desc);
      }

      name = String(name);
      var descObj = normalizePropertyDescriptor(desc);
      var success = trap.call(this.handler, this.target, name, descObj);
      success = !!success; // coerce to Boolean

      if (success === true) {

        var targetDesc = Object.getOwnPropertyDescriptor(this.target, name);
        var extensible = Object.isExtensible(this.target);

        // Note: we could collapse the following two if-tests into a single
        // test. Separating out the cases to improve error reporting.

        if (!extensible) {
          if (targetDesc === undefined) {
            throw new TypeError("cannot successfully add a new property '" + name + "' to a non-extensible object");
          }
        }

        if (targetDesc !== undefined) {
          if (!isCompatibleDescriptor(extensible, targetDesc, desc)) {
            throw new TypeError("cannot define incompatible property " + "descriptor for property '" + name + "'");
          }
          if (isDataDescriptor(targetDesc) && targetDesc.configurable === false && targetDesc.writable === true) {
            if (desc.configurable === false && desc.writable === false) {
              // if the property is non-configurable, writable on the target
              // but was successfully reported to be updated to
              // non-configurable, non-writable, it can later be reported
              // again as non-configurable, writable, which violates
              // the invariant that non-configurable, non-writable properties
              // cannot change state
              throw new TypeError("cannot successfully define non-configurable, writable " + " property '" + name + "' as non-configurable, non-writable");
            }
          }
        }

        if (desc.configurable === false && !isSealedDesc(targetDesc)) {
          // if the property is configurable or non-existent on the target,
          // but is successfully being redefined as a non-configurable property,
          // it may later be reported as configurable or non-existent, which violates
          // the invariant that if the property might change or disappear, the
          // configurable attribute must be true.
          throw new TypeError("cannot successfully define a non-configurable " + "descriptor for configurable or non-existent property '" + name + "'");
        }
      }

      return success;
    },

    /**
     * On success, check whether the target object is indeed non-extensible.
     */
    preventExtensions: function preventExtensions() {
      var trap = this.getTrap("preventExtensions");
      if (trap === undefined) {
        // default forwarding behavior
        return Reflect.preventExtensions(this.target);
      }

      var success = trap.call(this.handler, this.target);
      success = !!success; // coerce to Boolean
      if (success) {
        if (Object_isExtensible(this.target)) {
          throw new TypeError("can't report extensible object as non-extensible: " + this.target);
        }
      }
      return success;
    },

    /**
     * If name denotes a sealed property, check whether handler rejects.
     */
    delete: function _delete(name) {
      "use strict";

      var trap = this.getTrap("deleteProperty");
      if (trap === undefined) {
        // default forwarding behavior
        return Reflect.deleteProperty(this.target, name);
      }

      name = String(name);
      var res = trap.call(this.handler, this.target, name);
      res = !!res; // coerce to Boolean

      var targetDesc;
      if (res === true) {
        targetDesc = Object.getOwnPropertyDescriptor(this.target, name);
        if (targetDesc !== undefined && targetDesc.configurable === false) {
          throw new TypeError("property '" + name + "' is non-configurable " + "and can't be deleted");
        }
        if (targetDesc !== undefined && !Object_isExtensible(this.target)) {
          // if the property still exists on a non-extensible target but
          // is reported as successfully deleted, it may later be reported
          // as present, which violates the invariant that an own property,
          // deleted from a non-extensible object cannot reappear.
          throw new TypeError("cannot successfully delete existing property '" + name + "' on a non-extensible object");
        }
      }

      return res;
    },

    /**
     * The getOwnPropertyNames trap was replaced by the ownKeys trap,
     * which now also returns an array (of strings or symbols) and
     * which performs the same rigorous invariant checks as getOwnPropertyNames
     *
     * See issue #48 on how this trap can still get invoked by external libs
     * that don't use the patched Object.getOwnPropertyNames function.
     */
    getOwnPropertyNames: function getOwnPropertyNames() {
      // Note: removed deprecation warning to avoid dependency on 'console'
      // (and on node, should anyway use util.deprecate). Deprecation warnings
      // can also be annoying when they are outside of the user's control, e.g.
      // when an external library calls unpatched Object.getOwnPropertyNames.
      // Since there is a clean fallback to `ownKeys`, the fact that the
      // deprecated method is still called is mostly harmless anyway.
      // See also issues #65 and #66.
      // console.warn("getOwnPropertyNames trap is deprecated. Use ownKeys instead");
      return this.ownKeys();
    },

    /**
     * Checks whether the trap result does not contain any new properties
     * if the proxy is non-extensible.
     *
     * Any own non-configurable properties of the target that are not included
     * in the trap result give rise to a TypeError. As such, we check whether the
     * returned result contains at least all sealed properties of the target
     * object.
     *
     * Additionally, the trap result is normalized.
     * Instead of returning the trap result directly:
     *  - create and return a fresh Array,
     *  - of which each element is coerced to a String
     *
     * This trap is called a.o. by Reflect.ownKeys, Object.getOwnPropertyNames
     * and Object.keys (the latter filters out only the enumerable own properties).
     */
    ownKeys: function ownKeys() {
      var trap = this.getTrap("ownKeys");
      if (trap === undefined) {
        // default forwarding behavior
        return Reflect.ownKeys(this.target);
      }

      var trapResult = trap.call(this.handler, this.target);

      // propNames is used as a set of strings
      var propNames = Object.create(null);
      var numProps = +trapResult.length;
      var result = new Array(numProps);

      for (var i = 0; i < numProps; i++) {
        var s = String(trapResult[i]);
        if (!Object.isExtensible(this.target) && !isFixed(s, this.target)) {
          // non-extensible proxies don't tolerate new own property names
          throw new TypeError("ownKeys trap cannot list a new " + "property '" + s + "' on a non-extensible object");
        }

        propNames[s] = true;
        result[i] = s;
      }

      var ownProps = Object_getOwnPropertyNames(this.target);
      var target = this.target;
      ownProps.forEach(function (ownProp) {
        if (!propNames[ownProp]) {
          if (isSealed(ownProp, target)) {
            throw new TypeError("ownKeys trap failed to include " + "non-configurable property '" + ownProp + "'");
          }
          if (!Object.isExtensible(target) && isFixed(ownProp, target)) {
            // if handler is allowed to report ownProp as non-existent,
            // we cannot guarantee that it will never later report it as
            // existent. Once a property has been reported as non-existent
            // on a non-extensible object, it should forever be reported as
            // non-existent
            throw new TypeError("ownKeys trap cannot report existing own property '" + ownProp + "' as non-existent on a non-extensible object");
          }
        }
      });

      return result;
    },

    /**
     * Checks whether the trap result is consistent with the state of the
     * wrapped target.
     */
    isExtensible: function isExtensible() {
      var trap = this.getTrap("isExtensible");
      if (trap === undefined) {
        // default forwarding behavior
        return Reflect.isExtensible(this.target);
      }

      var result = trap.call(this.handler, this.target);
      result = !!result; // coerce to Boolean
      var state = Object_isExtensible(this.target);
      if (result !== state) {
        if (result) {
          throw new TypeError("cannot report non-extensible object as extensible: " + this.target);
        } else {
          throw new TypeError("cannot report extensible object as non-extensible: " + this.target);
        }
      }
      return state;
    },

    /**
     * Check whether the trap result corresponds to the target's [[Prototype]]
     */
    getPrototypeOf: function getPrototypeOf() {
      var trap = this.getTrap("getPrototypeOf");
      if (trap === undefined) {
        // default forwarding behavior
        return Reflect.getPrototypeOf(this.target);
      }

      var allegedProto = trap.call(this.handler, this.target);

      if (!Object_isExtensible(this.target)) {
        var actualProto = Object_getPrototypeOf(this.target);
        if (!sameValue(allegedProto, actualProto)) {
          throw new TypeError("prototype value does not match: " + this.target);
        }
      }

      return allegedProto;
    },

    /**
     * If target is non-extensible and setPrototypeOf trap returns true,
     * check whether the trap result corresponds to the target's [[Prototype]]
     */
    setPrototypeOf: function setPrototypeOf(newProto) {
      var trap = this.getTrap("setPrototypeOf");
      if (trap === undefined) {
        // default forwarding behavior
        return Reflect.setPrototypeOf(this.target, newProto);
      }

      var success = trap.call(this.handler, this.target, newProto);

      success = !!success;
      if (success && !Object_isExtensible(this.target)) {
        var actualProto = Object_getPrototypeOf(this.target);
        if (!sameValue(newProto, actualProto)) {
          throw new TypeError("prototype value does not match: " + this.target);
        }
      }

      return success;
    },

    /**
     * In the direct proxies design with refactored prototype climbing,
     * this trap is deprecated. For proxies-as-prototypes, for-in will
     * call the enumerate() trap. If that trap is not defined, the
     * operation is forwarded to the target, no more fallback on this
     * fundamental trap.
     */
    getPropertyNames: function getPropertyNames() {
      throw new TypeError("getPropertyNames trap is deprecated");
    },

    // === derived traps ===

    /**
     * If name denotes a fixed property, check whether the trap returns true.
     */
    has: function has(name) {
      var trap = this.getTrap("has");
      if (trap === undefined) {
        // default forwarding behavior
        return Reflect.has(this.target, name);
      }

      name = String(name);
      var res = trap.call(this.handler, this.target, name);
      res = !!res; // coerce to Boolean

      if (res === false) {
        if (isSealed(name, this.target)) {
          throw new TypeError("cannot report existing non-configurable own " + "property '" + name + "' as a non-existent " + "property");
        }
        if (!Object.isExtensible(this.target) && isFixed(name, this.target)) {
          // if handler is allowed to return false, we cannot guarantee
          // that it will not return true for this property later.
          // Once a property has been reported as non-existent on a non-extensible
          // object, it should forever be reported as non-existent
          throw new TypeError("cannot report existing own property '" + name + "' as non-existent on a non-extensible object");
        }
      }

      // if res === true, we don't need to check for extensibility
      // even for a non-extensible proxy that has no own name property,
      // the property may have been inherited

      return res;
    },

    /**
     * If name denotes a fixed non-configurable, non-writable data property,
     * check its return value against the previously asserted value of the
     * fixed property.
     */
    get: function get(receiver, name) {

      // experimental support for invoke() trap on platforms that
      // support __noSuchMethod__
      /*
      if (name === '__noSuchMethod__') {
        var handler = this;
        return function(name, args) {
          return handler.invoke(receiver, name, args);
        }
      }
      */

      var trap = this.getTrap("get");
      if (trap === undefined) {
        // default forwarding behavior
        return Reflect.get(this.target, name, receiver);
      }

      name = String(name);
      var res = trap.call(this.handler, this.target, name, receiver);

      var fixedDesc = Object.getOwnPropertyDescriptor(this.target, name);
      // check consistency of the returned value
      if (fixedDesc !== undefined) {
        // getting an existing property
        if (isDataDescriptor(fixedDesc) && fixedDesc.configurable === false && fixedDesc.writable === false) {
          // own frozen data property
          if (!sameValue(res, fixedDesc.value)) {
            throw new TypeError("cannot report inconsistent value for " + "non-writable, non-configurable property '" + name + "'");
          }
        } else {
          // it's an accessor property
          if (isAccessorDescriptor(fixedDesc) && fixedDesc.configurable === false && fixedDesc.get === undefined) {
            if (res !== undefined) {
              throw new TypeError("must report undefined for non-configurable " + "accessor property '" + name + "' without getter");
            }
          }
        }
      }

      return res;
    },

    /**
     * If name denotes a fixed non-configurable, non-writable data property,
     * check that the trap rejects the assignment.
     */
    set: function set(receiver, name, val) {
      var trap = this.getTrap("set");
      if (trap === undefined) {
        // default forwarding behavior
        return Reflect.set(this.target, name, val, receiver);
      }

      name = String(name);
      var res = trap.call(this.handler, this.target, name, val, receiver);
      res = !!res; // coerce to Boolean

      // if success is reported, check whether property is truly assignable
      if (res === true) {
        var fixedDesc = Object.getOwnPropertyDescriptor(this.target, name);
        if (fixedDesc !== undefined) {
          // setting an existing property
          if (isDataDescriptor(fixedDesc) && fixedDesc.configurable === false && fixedDesc.writable === false) {
            if (!sameValue(val, fixedDesc.value)) {
              throw new TypeError("cannot successfully assign to a " + "non-writable, non-configurable property '" + name + "'");
            }
          } else {
            if (isAccessorDescriptor(fixedDesc) && fixedDesc.configurable === false && // non-configurable
            fixedDesc.set === undefined) {
              // accessor with undefined setter
              throw new TypeError("setting a property '" + name + "' that has " + " only a getter");
            }
          }
        }
      }

      return res;
    },

    /**
     * Any own enumerable non-configurable properties of the target that are not
     * included in the trap result give rise to a TypeError. As such, we check
     * whether the returned result contains at least all sealed enumerable properties
     * of the target object.
     *
     * The trap should return an iterator.
     *
     * However, as implementations of pre-direct proxies still expect enumerate
     * to return an array of strings, we convert the iterator into an array.
     */
    enumerate: function enumerate() {
      var trap = this.getTrap("enumerate");
      if (trap === undefined) {
        // default forwarding behavior
        var trapResult = Reflect.enumerate(this.target);
        var result = [];
        var nxt = trapResult.next();
        while (!nxt.done) {
          result.push(String(nxt.value));
          nxt = trapResult.next();
        }
        return result;
      }

      var trapResult = trap.call(this.handler, this.target);

      if (trapResult === null || trapResult === undefined || trapResult.next === undefined) {
        throw new TypeError("enumerate trap should return an iterator, got: " + trapResult);
      }

      // propNames is used as a set of strings
      var propNames = Object.create(null);

      // var numProps = +trapResult.length;
      var result = []; // new Array(numProps);

      // trapResult is supposed to be an iterator
      // drain iterator to array as current implementations still expect
      // enumerate to return an array of strings
      var nxt = trapResult.next();

      while (!nxt.done) {
        var s = String(nxt.value);
        if (propNames[s]) {
          throw new TypeError("enumerate trap cannot list a " + "duplicate property '" + s + "'");
        }
        propNames[s] = true;
        result.push(s);
        nxt = trapResult.next();
      }

      /*for (var i = 0; i < numProps; i++) {
        var s = String(trapResult[i]);
        if (propNames[s]) {
          throw new TypeError("enumerate trap cannot list a "+
                              "duplicate property '"+s+"'");
        }
         propNames[s] = true;
        result[i] = s;
      } */

      var ownEnumerableProps = Object.keys(this.target);
      var target = this.target;
      ownEnumerableProps.forEach(function (ownEnumerableProp) {
        if (!propNames[ownEnumerableProp]) {
          if (isSealed(ownEnumerableProp, target)) {
            throw new TypeError("enumerate trap failed to include " + "non-configurable enumerable property '" + ownEnumerableProp + "'");
          }
          if (!Object.isExtensible(target) && isFixed(ownEnumerableProp, target)) {
            // if handler is allowed not to report ownEnumerableProp as an own
            // property, we cannot guarantee that it will never report it as
            // an own property later. Once a property has been reported as
            // non-existent on a non-extensible object, it should forever be
            // reported as non-existent
            throw new TypeError("cannot report existing own property '" + ownEnumerableProp + "' as non-existent on a " + "non-extensible object");
          }
        }
      });

      return result;
    },

    /**
     * The iterate trap is deprecated by the enumerate trap.
     */
    iterate: Validator.prototype.enumerate,

    /**
     * Any own non-configurable properties of the target that are not included
     * in the trap result give rise to a TypeError. As such, we check whether the
     * returned result contains at least all sealed properties of the target
     * object.
     *
     * The trap result is normalized.
     * The trap result is not returned directly. Instead:
     *  - create and return a fresh Array,
     *  - of which each element is coerced to String,
     *  - which does not contain duplicates
     *
     * FIXME: keys trap is deprecated
     */
    /*
    keys: function() {
      var trap = this.getTrap("keys");
      if (trap === undefined) {
        // default forwarding behavior
        return Reflect.keys(this.target);
      }
       var trapResult = trap.call(this.handler, this.target);
       // propNames is used as a set of strings
      var propNames = Object.create(null);
      var numProps = +trapResult.length;
      var result = new Array(numProps);
       for (var i = 0; i < numProps; i++) {
       var s = String(trapResult[i]);
       if (propNames[s]) {
         throw new TypeError("keys trap cannot list a "+
                             "duplicate property '"+s+"'");
       }
       if (!Object.isExtensible(this.target) && !isFixed(s, this.target)) {
         // non-extensible proxies don't tolerate new own property names
         throw new TypeError("keys trap cannot list a new "+
                             "property '"+s+"' on a non-extensible object");
       }
        propNames[s] = true;
       result[i] = s;
      }
       var ownEnumerableProps = Object.keys(this.target);
      var target = this.target;
      ownEnumerableProps.forEach(function (ownEnumerableProp) {
        if (!propNames[ownEnumerableProp]) {
          if (isSealed(ownEnumerableProp, target)) {
            throw new TypeError("keys trap failed to include "+
                                "non-configurable enumerable property '"+
                                ownEnumerableProp+"'");
          }
          if (!Object.isExtensible(target) &&
              isFixed(ownEnumerableProp, target)) {
              // if handler is allowed not to report ownEnumerableProp as an own
              // property, we cannot guarantee that it will never report it as
              // an own property later. Once a property has been reported as
              // non-existent on a non-extensible object, it should forever be
              // reported as non-existent
              throw new TypeError("cannot report existing own property '"+
                                  ownEnumerableProp+"' as non-existent on a "+
                                  "non-extensible object");
          }
        }
      });
       return result;
    },
    */

    /**
     * New trap that reifies [[Call]].
     * If the target is a function, then a call to
     *   proxy(...args)
     * Triggers this trap
     */
    apply: function apply(target, thisBinding, args) {
      var trap = this.getTrap("apply");
      if (trap === undefined) {
        return Reflect.apply(target, thisBinding, args);
      }

      if (typeof this.target === "function") {
        return trap.call(this.handler, target, thisBinding, args);
      } else {
        throw new TypeError("apply: " + target + " is not a function");
      }
    },

    /**
     * New trap that reifies [[Construct]].
     * If the target is a function, then a call to
     *   new proxy(...args)
     * Triggers this trap
     */
    construct: function construct(target, args, newTarget) {
      var trap = this.getTrap("construct");
      if (trap === undefined) {
        return Reflect.construct(target, args, newTarget);
      }

      if (typeof target !== "function") {
        throw new TypeError("new: " + target + " is not a function");
      }

      if (newTarget === undefined) {
        newTarget = target;
      } else {
        if (typeof newTarget !== "function") {
          throw new TypeError("new: " + newTarget + " is not a function");
        }
      }
      return trap.call(this.handler, target, args, newTarget);
    }
  };

  // ---- end of the Validator handler wrapper handler ----

  // In what follows, a 'direct proxy' is a proxy
  // whose handler is a Validator. Such proxies can be made non-extensible,
  // sealed or frozen without losing the ability to trap.

  // maps direct proxies to their Validator handlers
  var directProxies = new WeakMap();

  // patch Object.{preventExtensions,seal,freeze} so that
  // they recognize fixable proxies and act accordingly
  Object.preventExtensions = function (subject) {
    var vhandler = directProxies.get(subject);
    if (vhandler !== undefined) {
      if (vhandler.preventExtensions()) {
        return subject;
      } else {
        throw new TypeError("preventExtensions on " + subject + " rejected");
      }
    } else {
      return prim_preventExtensions(subject);
    }
  };
  Object.seal = function (subject) {
    setIntegrityLevel(subject, "sealed");
    return subject;
  };
  Object.freeze = function (subject) {
    setIntegrityLevel(subject, "frozen");
    return subject;
  };
  Object.isExtensible = Object_isExtensible = function Object_isExtensible(subject) {
    var vHandler = directProxies.get(subject);
    if (vHandler !== undefined) {
      return vHandler.isExtensible();
    } else {
      return prim_isExtensible(subject);
    }
  };
  Object.isSealed = Object_isSealed = function Object_isSealed(subject) {
    return testIntegrityLevel(subject, "sealed");
  };
  Object.isFrozen = Object_isFrozen = function Object_isFrozen(subject) {
    return testIntegrityLevel(subject, "frozen");
  };
  Object.getPrototypeOf = Object_getPrototypeOf = function Object_getPrototypeOf(subject) {
    var vHandler = directProxies.get(subject);
    if (vHandler !== undefined) {
      return vHandler.getPrototypeOf();
    } else {
      return prim_getPrototypeOf(subject);
    }
  };

  // patch Object.getOwnPropertyDescriptor to directly call
  // the Validator.prototype.getOwnPropertyDescriptor trap
  // This is to circumvent an assertion in the built-in Proxy
  // trapping mechanism of v8, which disallows that trap to
  // return non-configurable property descriptors (as per the
  // old Proxy design)
  Object.getOwnPropertyDescriptor = function (subject, name) {
    var vhandler = directProxies.get(subject);
    if (vhandler !== undefined) {
      return vhandler.getOwnPropertyDescriptor(name);
    } else {
      return prim_getOwnPropertyDescriptor(subject, name);
    }
  };

  // patch Object.defineProperty to directly call
  // the Validator.prototype.defineProperty trap
  // This is to circumvent two issues with the built-in
  // trap mechanism:
  // 1) the current tracemonkey implementation of proxies
  // auto-completes 'desc', which is not correct. 'desc' should be
  // normalized, but not completed. Consider:
  // Object.defineProperty(proxy, 'foo', {enumerable:false})
  // This trap will receive desc =
  //  {value:undefined,writable:false,enumerable:false,configurable:false}
  // This will also set all other attributes to their default value,
  // which is unexpected and different from [[DefineOwnProperty]].
  // Bug filed: https://bugzilla.mozilla.org/show_bug.cgi?id=601329
  // 2) the current spidermonkey implementation does not
  // throw an exception when this trap returns 'false', but instead silently
  // ignores the operation (this is regardless of strict-mode)
  // 2a) v8 does throw an exception for this case, but includes the rather
  //     unhelpful error message:
  // 'Proxy handler #<Object> returned false from 'defineProperty' trap'
  Object.defineProperty = function (subject, name, desc) {
    var vhandler = directProxies.get(subject);
    if (vhandler !== undefined) {
      var normalizedDesc = normalizePropertyDescriptor(desc);
      var success = vhandler.defineProperty(name, normalizedDesc);
      if (success === false) {
        throw new TypeError("can't redefine property '" + name + "'");
      }
      return subject;
    } else {
      return prim_defineProperty(subject, name, desc);
    }
  };

  Object.defineProperties = function (subject, descs) {
    var vhandler = directProxies.get(subject);
    if (vhandler !== undefined) {
      var names = Object.keys(descs);
      for (var i = 0; i < names.length; i++) {
        var name = names[i];
        var normalizedDesc = normalizePropertyDescriptor(descs[name]);
        var success = vhandler.defineProperty(name, normalizedDesc);
        if (success === false) {
          throw new TypeError("can't redefine property '" + name + "'");
        }
      }
      return subject;
    } else {
      return prim_defineProperties(subject, descs);
    }
  };

  Object.keys = function (subject) {
    var vHandler = directProxies.get(subject);
    if (vHandler !== undefined) {
      var ownKeys = vHandler.ownKeys();
      var result = [];
      for (var i = 0; i < ownKeys.length; i++) {
        var k = String(ownKeys[i]);
        var desc = Object.getOwnPropertyDescriptor(subject, k);
        if (desc !== undefined && desc.enumerable === true) {
          result.push(k);
        }
      }
      return result;
    } else {
      return prim_keys(subject);
    }
  };

  Object.getOwnPropertyNames = Object_getOwnPropertyNames = function Object_getOwnPropertyNames(subject) {
    var vHandler = directProxies.get(subject);
    if (vHandler !== undefined) {
      return vHandler.ownKeys();
    } else {
      return prim_getOwnPropertyNames(subject);
    }
  };

  // fixes issue #71 (Calling Object.getOwnPropertySymbols() on a Proxy
  // throws an error)
  if (prim_getOwnPropertySymbols !== undefined) {
    Object.getOwnPropertySymbols = function (subject) {
      var vHandler = directProxies.get(subject);
      if (vHandler !== undefined) {
        // as this shim does not support symbols, a Proxy never advertises
        // any symbol-valued own properties
        return [];
      } else {
        return prim_getOwnPropertySymbols(subject);
      }
    };
  }

  // fixes issue #72 ('Illegal access' error when using Object.assign)
  // Object.assign polyfill based on a polyfill posted on MDN: 
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/\
  //  Global_Objects/Object/assign
  // Note that this polyfill does not support Symbols, but this Proxy Shim
  // does not support Symbols anyway.
  if (prim_assign !== undefined) {
    Object.assign = function (target) {

      // check if any argument is a proxy object
      var noProxies = true;
      for (var i = 0; i < arguments.length; i++) {
        var vHandler = directProxies.get(arguments[i]);
        if (vHandler !== undefined) {
          noProxies = false;
          break;
        }
      }
      if (noProxies) {
        // not a single argument is a proxy, perform built-in algorithm
        return prim_assign.apply(Object, arguments);
      }

      // there is at least one proxy argument, use the polyfill

      if (target === undefined || target === null) {
        throw new TypeError('Cannot convert undefined or null to object');
      }

      var output = Object(target);
      for (var index = 1; index < arguments.length; index++) {
        var source = arguments[index];
        if (source !== undefined && source !== null) {
          for (var nextKey in source) {
            if (source.hasOwnProperty(nextKey)) {
              output[nextKey] = source[nextKey];
            }
          }
        }
      }
      return output;
    };
  }

  // returns whether an argument is a reference to an object,
  // which is legal as a WeakMap key.
  function isObject(arg) {
    var type = typeof arg === "undefined" ? "undefined" : _typeof(arg);
    return type === 'object' && arg !== null || type === 'function';
  };

  // a wrapper for WeakMap.get which returns the undefined value
  // for keys that are not objects (in which case the underlying
  // WeakMap would have thrown a TypeError).
  function safeWeakMapGet(map, key) {
    return isObject(key) ? map.get(key) : undefined;
  };

  // returns a new function of zero arguments that recursively
  // unwraps any proxies specified as the |this|-value.
  // The primitive is assumed to be a zero-argument method
  // that uses its |this|-binding.
  function makeUnwrapping0ArgMethod(primitive) {
    return function builtin() {
      var vHandler = safeWeakMapGet(directProxies, this);
      if (vHandler !== undefined) {
        return builtin.call(vHandler.target);
      } else {
        return primitive.call(this);
      }
    };
  };

  // returns a new function of 1 arguments that recursively
  // unwraps any proxies specified as the |this|-value.
  // The primitive is assumed to be a 1-argument method
  // that uses its |this|-binding.
  function makeUnwrapping1ArgMethod(primitive) {
    return function builtin(arg) {
      var vHandler = safeWeakMapGet(directProxies, this);
      if (vHandler !== undefined) {
        return builtin.call(vHandler.target, arg);
      } else {
        return primitive.call(this, arg);
      }
    };
  };

  Object.prototype.valueOf = makeUnwrapping0ArgMethod(Object.prototype.valueOf);
  Object.prototype.toString = makeUnwrapping0ArgMethod(Object.prototype.toString);
  Function.prototype.toString = makeUnwrapping0ArgMethod(Function.prototype.toString);
  Date.prototype.toString = makeUnwrapping0ArgMethod(Date.prototype.toString);

  Object.prototype.isPrototypeOf = function builtin(arg) {
    // bugfix thanks to Bill Mark:
    // built-in isPrototypeOf does not unwrap proxies used
    // as arguments. So, we implement the builtin ourselves,
    // based on the ECMAScript 6 spec. Our encoding will
    // make sure that if a proxy is used as an argument,
    // its getPrototypeOf trap will be called.
    while (true) {
      var vHandler2 = safeWeakMapGet(directProxies, arg);
      if (vHandler2 !== undefined) {
        arg = vHandler2.getPrototypeOf();
        if (arg === null) {
          return false;
        } else if (sameValue(arg, this)) {
          return true;
        }
      } else {
        return prim_isPrototypeOf.call(this, arg);
      }
    }
  };

  Array.isArray = function (subject) {
    var vHandler = safeWeakMapGet(directProxies, subject);
    if (vHandler !== undefined) {
      return Array.isArray(vHandler.target);
    } else {
      return prim_isArray(subject);
    }
  };

  function isProxyArray(arg) {
    var vHandler = safeWeakMapGet(directProxies, arg);
    if (vHandler !== undefined) {
      return Array.isArray(vHandler.target);
    }
    return false;
  }

  // Array.prototype.concat internally tests whether one of its
  // arguments is an Array, by checking whether [[Class]] == "Array"
  // As such, it will fail to recognize proxies-for-arrays as arrays.
  // We patch Array.prototype.concat so that it "unwraps" proxies-for-arrays
  // by making a copy. This will trigger the exact same sequence of
  // traps on the proxy-for-array as if we would not have unwrapped it.
  // See <https://github.com/tvcutsem/harmony-reflect/issues/19> for more.
  Array.prototype.concat = function () /*...args*/{
    var length;
    for (var i = 0; i < arguments.length; i++) {
      if (isProxyArray(arguments[i])) {
        length = arguments[i].length;
        arguments[i] = Array.prototype.slice.call(arguments[i], 0, length);
      }
    }
    return prim_concat.apply(this, arguments);
  };

  // setPrototypeOf support on platforms that support __proto__

  var prim_setPrototypeOf = Object.setPrototypeOf;

  // patch and extract original __proto__ setter
  var __proto__setter = function () {
    var protoDesc = prim_getOwnPropertyDescriptor(Object.prototype, '__proto__');
    if (protoDesc === undefined || typeof protoDesc.set !== "function") {
      return function () {
        throw new TypeError("setPrototypeOf not supported on this platform");
      };
    }

    // see if we can actually mutate a prototype with the generic setter
    // (e.g. Chrome v28 doesn't allow setting __proto__ via the generic setter)
    try {
      protoDesc.set.call({}, {});
    } catch (e) {
      return function () {
        throw new TypeError("setPrototypeOf not supported on this platform");
      };
    }

    prim_defineProperty(Object.prototype, '__proto__', {
      set: function set(newProto) {
        return Object.setPrototypeOf(this, Object(newProto));
      }
    });

    return protoDesc.set;
  }();

  Object.setPrototypeOf = function (target, newProto) {
    var handler = directProxies.get(target);
    if (handler !== undefined) {
      if (handler.setPrototypeOf(newProto)) {
        return target;
      } else {
        throw new TypeError("proxy rejected prototype mutation");
      }
    } else {
      if (!Object_isExtensible(target)) {
        throw new TypeError("can't set prototype on non-extensible object: " + target);
      }
      if (prim_setPrototypeOf) return prim_setPrototypeOf(target, newProto);

      if (Object(newProto) !== newProto || newProto === null) {
        throw new TypeError("Object prototype may only be an Object or null: " + newProto);
        // throw new TypeError("prototype must be an object or null")
      }
      __proto__setter.call(target, newProto);
      return target;
    }
  };

  Object.prototype.hasOwnProperty = function (name) {
    var handler = safeWeakMapGet(directProxies, this);
    if (handler !== undefined) {
      var desc = handler.getOwnPropertyDescriptor(name);
      return desc !== undefined;
    } else {
      return prim_hasOwnProperty.call(this, name);
    }
  };

  // ============= Reflection module =============
  // see http://wiki.ecmascript.org/doku.php?id=harmony:reflect_api

  var Reflect = global.Reflect = {
    getOwnPropertyDescriptor: function getOwnPropertyDescriptor(target, name) {
      return Object.getOwnPropertyDescriptor(target, name);
    },
    defineProperty: function defineProperty(target, name, desc) {

      // if target is a proxy, invoke its "defineProperty" trap
      var handler = directProxies.get(target);
      if (handler !== undefined) {
        return handler.defineProperty(target, name, desc);
      }

      // Implementation transliterated from [[DefineOwnProperty]]
      // see ES5.1 section 8.12.9
      // this is the _exact same algorithm_ as the isCompatibleDescriptor
      // algorithm defined above, except that at every place it
      // returns true, this algorithm actually does define the property.
      var current = Object.getOwnPropertyDescriptor(target, name);
      var extensible = Object.isExtensible(target);
      if (current === undefined && extensible === false) {
        return false;
      }
      if (current === undefined && extensible === true) {
        Object.defineProperty(target, name, desc); // should never fail
        return true;
      }
      if (isEmptyDescriptor(desc)) {
        return true;
      }
      if (isEquivalentDescriptor(current, desc)) {
        return true;
      }
      if (current.configurable === false) {
        if (desc.configurable === true) {
          return false;
        }
        if ('enumerable' in desc && desc.enumerable !== current.enumerable) {
          return false;
        }
      }
      if (isGenericDescriptor(desc)) {
        // no further validation necessary
      } else if (isDataDescriptor(current) !== isDataDescriptor(desc)) {
        if (current.configurable === false) {
          return false;
        }
      } else if (isDataDescriptor(current) && isDataDescriptor(desc)) {
        if (current.configurable === false) {
          if (current.writable === false && desc.writable === true) {
            return false;
          }
          if (current.writable === false) {
            if ('value' in desc && !sameValue(desc.value, current.value)) {
              return false;
            }
          }
        }
      } else if (isAccessorDescriptor(current) && isAccessorDescriptor(desc)) {
        if (current.configurable === false) {
          if ('set' in desc && !sameValue(desc.set, current.set)) {
            return false;
          }
          if ('get' in desc && !sameValue(desc.get, current.get)) {
            return false;
          }
        }
      }
      Object.defineProperty(target, name, desc); // should never fail
      return true;
    },
    deleteProperty: function deleteProperty(target, name) {
      var handler = directProxies.get(target);
      if (handler !== undefined) {
        return handler.delete(name);
      }

      var desc = Object.getOwnPropertyDescriptor(target, name);
      if (desc === undefined) {
        return true;
      }
      if (desc.configurable === true) {
        delete target[name];
        return true;
      }
      return false;
    },
    getPrototypeOf: function getPrototypeOf(target) {
      return Object.getPrototypeOf(target);
    },
    setPrototypeOf: function setPrototypeOf(target, newProto) {

      var handler = directProxies.get(target);
      if (handler !== undefined) {
        return handler.setPrototypeOf(newProto);
      }

      if (Object(newProto) !== newProto || newProto === null) {
        throw new TypeError("Object prototype may only be an Object or null: " + newProto);
      }

      if (!Object_isExtensible(target)) {
        return false;
      }

      var current = Object.getPrototypeOf(target);
      if (sameValue(current, newProto)) {
        return true;
      }

      if (prim_setPrototypeOf) {
        try {
          prim_setPrototypeOf(target, newProto);
          return true;
        } catch (e) {
          return false;
        }
      }

      __proto__setter.call(target, newProto);
      return true;
    },
    preventExtensions: function preventExtensions(target) {
      var handler = directProxies.get(target);
      if (handler !== undefined) {
        return handler.preventExtensions();
      }
      prim_preventExtensions(target);
      return true;
    },
    isExtensible: function isExtensible(target) {
      return Object.isExtensible(target);
    },
    has: function has(target, name) {
      return name in target;
    },
    get: function get(target, name, receiver) {
      receiver = receiver || target;

      // if target is a proxy, invoke its "get" trap
      var handler = directProxies.get(target);
      if (handler !== undefined) {
        return handler.get(receiver, name);
      }

      var desc = Object.getOwnPropertyDescriptor(target, name);
      if (desc === undefined) {
        var proto = Object.getPrototypeOf(target);
        if (proto === null) {
          return undefined;
        }
        return Reflect.get(proto, name, receiver);
      }
      if (isDataDescriptor(desc)) {
        return desc.value;
      }
      var getter = desc.get;
      if (getter === undefined) {
        return undefined;
      }
      return desc.get.call(receiver);
    },
    // Reflect.set implementation based on latest version of [[SetP]] at
    // http://wiki.ecmascript.org/doku.php?id=harmony:proto_climbing_refactoring
    set: function set(target, name, value, receiver) {
      receiver = receiver || target;

      // if target is a proxy, invoke its "set" trap
      var handler = directProxies.get(target);
      if (handler !== undefined) {
        return handler.set(receiver, name, value);
      }

      // first, check whether target has a non-writable property
      // shadowing name on receiver
      var ownDesc = Object.getOwnPropertyDescriptor(target, name);

      if (ownDesc === undefined) {
        // name is not defined in target, search target's prototype
        var proto = Object.getPrototypeOf(target);

        if (proto !== null) {
          // continue the search in target's prototype
          return Reflect.set(proto, name, value, receiver);
        }

        // Rev16 change. Cf. https://bugs.ecmascript.org/show_bug.cgi?id=1549
        // target was the last prototype, now we know that 'name' is not shadowed
        // by an existing (accessor or data) property, so we can add the property
        // to the initial receiver object
        // (this branch will intentionally fall through to the code below)
        ownDesc = { value: undefined,
          writable: true,
          enumerable: true,
          configurable: true };
      }

      // we now know that ownDesc !== undefined
      if (isAccessorDescriptor(ownDesc)) {
        var setter = ownDesc.set;
        if (setter === undefined) return false;
        setter.call(receiver, value); // assumes Function.prototype.call
        return true;
      }
      // otherwise, isDataDescriptor(ownDesc) must be true
      if (ownDesc.writable === false) return false;
      // we found an existing writable data property on the prototype chain.
      // Now update or add the data property on the receiver, depending on
      // whether the receiver already defines the property or not.
      var existingDesc = Object.getOwnPropertyDescriptor(receiver, name);
      if (existingDesc !== undefined) {
        var updateDesc = { value: value,
          // FIXME: it should not be necessary to describe the following
          // attributes. Added to circumvent a bug in tracemonkey:
          // https://bugzilla.mozilla.org/show_bug.cgi?id=601329
          writable: existingDesc.writable,
          enumerable: existingDesc.enumerable,
          configurable: existingDesc.configurable };
        Object.defineProperty(receiver, name, updateDesc);
        return true;
      } else {
        if (!Object.isExtensible(receiver)) return false;
        var newDesc = { value: value,
          writable: true,
          enumerable: true,
          configurable: true };
        Object.defineProperty(receiver, name, newDesc);
        return true;
      }
    },
    /*invoke: function(target, name, args, receiver) {
      receiver = receiver || target;
       var handler = directProxies.get(target);
      if (handler !== undefined) {
        return handler.invoke(receiver, name, args);
      }
       var fun = Reflect.get(target, name, receiver);
      return Function.prototype.apply.call(fun, receiver, args);
    },*/
    enumerate: function enumerate(target) {
      var handler = directProxies.get(target);
      var result;
      if (handler !== undefined) {
        // handler.enumerate should return an iterator directly, but the
        // iterator gets converted to an array for backward-compat reasons,
        // so we must re-iterate over the array
        result = handler.enumerate(handler.target);
      } else {
        result = [];
        for (var name in target) {
          result.push(name);
        };
      }
      var l = +result.length;
      var idx = 0;
      return {
        next: function next() {
          if (idx === l) return { done: true };
          return { done: false, value: result[idx++] };
        }
      };
    },
    // imperfect ownKeys implementation: in ES6, should also include
    // symbol-keyed properties.
    ownKeys: function ownKeys(target) {
      return Object_getOwnPropertyNames(target);
    },
    apply: function apply(target, receiver, args) {
      // target.apply(receiver, args)
      return Function.prototype.apply.call(target, receiver, args);
    },
    construct: function construct(target, args, newTarget) {
      // return new target(...args);

      // if target is a proxy, invoke its "construct" trap
      var handler = directProxies.get(target);
      if (handler !== undefined) {
        return handler.construct(handler.target, args, newTarget);
      }

      if (typeof target !== "function") {
        throw new TypeError("target is not a function: " + target);
      }
      if (newTarget === undefined) {
        newTarget = target;
      } else {
        if (typeof newTarget !== "function") {
          throw new TypeError("newTarget is not a function: " + target);
        }
      }

      return new (Function.prototype.bind.apply(newTarget, [null].concat(args)))();
    }
  };

  // feature-test whether the Proxy global exists, with
  // the harmony-era Proxy.create API
  if (typeof Proxy !== "undefined" && typeof Proxy.create !== "undefined") {

    var primCreate = Proxy.create,
        primCreateFunction = Proxy.createFunction;

    var revokedHandler = primCreate({
      get: function get() {
        throw new TypeError("proxy is revoked");
      }
    });

    global.Proxy = function (target, handler) {
      // check that target is an Object
      if (Object(target) !== target) {
        throw new TypeError("Proxy target must be an Object, given " + target);
      }
      // check that handler is an Object
      if (Object(handler) !== handler) {
        throw new TypeError("Proxy handler must be an Object, given " + handler);
      }

      var vHandler = new Validator(target, handler);
      var proxy;
      if (typeof target === "function") {
        proxy = primCreateFunction(vHandler,
        // call trap
        function () {
          var args = Array.prototype.slice.call(arguments);
          return vHandler.apply(target, this, args);
        },
        // construct trap
        function () {
          var args = Array.prototype.slice.call(arguments);
          return vHandler.construct(target, args);
        });
      } else {
        proxy = primCreate(vHandler, Object.getPrototypeOf(target));
      }
      directProxies.set(proxy, vHandler);
      return proxy;
    };

    global.Proxy.revocable = function (target, handler) {
      var proxy = new Proxy(target, handler);
      var revoke = function revoke() {
        var vHandler = directProxies.get(proxy);
        if (vHandler !== null) {
          vHandler.target = null;
          vHandler.handler = revokedHandler;
        }
        return undefined;
      };
      return { proxy: proxy, revoke: revoke };
    };

    // add the old Proxy.create and Proxy.createFunction methods
    // so old code that still depends on the harmony-era Proxy object
    // is not broken. Also ensures that multiple versions of this
    // library should load fine
    global.Proxy.create = primCreate;
    global.Proxy.createFunction = primCreateFunction;
  } else {
    // Proxy global not defined, or old API not available
    if (typeof Proxy === "undefined") {
      // Proxy global not defined, add a Proxy function stub
      global.Proxy = function (_target, _handler) {
        throw new Error("proxies not supported on this platform. On v8/node/iojs, make sure to pass the --harmony_proxies flag");
      };
    }
    // Proxy global defined but old API not available
    // presumably Proxy global already supports new API, leave untouched
  }

  // for node.js modules, export every property in the Reflect object
  // as part of the module interface
  if (typeof exports !== 'undefined') {
    Object.keys(Reflect).forEach(function (key) {
      exports[key] = Reflect[key];
    });
  }

  // function-as-module pattern
}(typeof exports !== 'undefined' ? global : undefined);

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],5:[function(require,module,exports){
'use strict';

var mbHelper = {
    promises: {},
    addSourceAndLayers: function addSourceAndLayers(sourceOptions, layerOptionsArray) {
        var _this = this;

        // this = map
        var sourceName = sourceOptions.name;
        mbHelper.promises[sourceOptions.name] = new Promise(function (resolve) {
            // TO DO: figure out reject?
            delete sourceOptions.name;
            function checkDataLoaded() {
                if (this.getSource(sourceName)) {
                    // if addSource has taken effect
                    resolve(true);
                    this.off('render', checkDataLoaded); // turn off the listener for render
                }
            }
            _this.on('render', checkDataLoaded);
            _this.addSource(sourceName, sourceOptions);
        });
        var layerPromises = [];
        return mbHelper.promises[sourceName].then(function () {
            layerOptionsArray.forEach(function (each) {
                layerPromises.push(new Promise(function (resolve) {
                    // TO DO: figure out reject?
                    var beforeLayer = each.beforeLayer ? each.beforeLayer : '';
                    delete each.beforeLayer;
                    each.source = sourceName;
                    function checkLayerLoaded() {
                        if (this.getLayer(each.id)) {
                            // if addLayer  has taken effect
                            resolve(true);
                            this.off('render', checkLayerLoaded); // turn off the listener for render
                        }
                    }
                    _this.on('render', checkLayerLoaded);
                    _this.addLayer(each, beforeLayer);
                }));
            });
            return Promise.all(layerPromises);
        });
    }
};

exports.addSourceAndLayers = mbHelper.addSourceAndLayers;

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkZXYtanMvbWFpbi5lczYiLCJqcy1leHBvcnRzL0JhcnMuanMiLCJqcy12ZW5kb3IvZDMtdGlwLmpzIiwianMtdmVuZG9yL3BvbHlmaWxscy5qcyIsIm5vZGVfbW9kdWxlcy9tYXBib3gtaGVscGVyL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNFQzs7QUFDQTs7QUFDQTs7b01BSkE7QUFDQTs7O0FBS0E7O0FBRUQ7Ozs7Ozs7QUFPQTs7Ozs7QUFLQSxPQUFPLE1BQVAsR0FBa0IsWUFBVTtBQUM1Qjs7QUFDRSxVQUFTLGFBQVQsR0FBeUI7QUFDdkIsTUFBRztBQUNGLE9BQUksU0FBUyxTQUFTLGFBQVQsQ0FBd0IsUUFBeEIsQ0FBYjtBQUNBLFVBQU8sQ0FBQyxDQUFFLE9BQU8scUJBQVYsS0FDRixPQUFPLFVBQVAsQ0FBbUIsT0FBbkIsS0FBZ0MsT0FBTyxVQUFQLENBQW1CLG9CQUFuQixDQUQ5QixDQUFQO0FBRUEsR0FKRCxDQUlDLE9BQU8sQ0FBUCxFQUFXO0FBQUUsVUFBTyxLQUFQO0FBQWU7QUFDOUI7QUFDRCxTQUFRLEdBQVIsQ0FBWSxlQUFaO0FBQ0QsS0FBSyxtQkFBbUIsSUFBeEIsRUFBOEI7QUFDN0IsS0FBRyxNQUFILENBQVUsZ0JBQVYsRUFDRSxPQURGLENBQ1UsU0FEVixFQUNxQixJQURyQixFQUVFLElBRkYsQ0FFTyxzRkFGUDtBQUdBO0FBQ0Q7O0FBRUcsVUFBUyxXQUFULEdBQXVCLDhGQUF2QjtBQUNBLElBQUcsU0FBSCxDQUFhLFlBQWIsRUFDRSxFQURGLENBQ0ssT0FETCxFQUNjLFlBQU07QUFDbEIsS0FBRyxLQUFILENBQVMsY0FBVDtBQUNBLEVBSEY7QUFJQSxLQUFNLFdBQVcsUUFBUSxlQUFSLENBQWpCO0FBQ0Q7QUFDQyxLQUFN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QUFDQSx5QkFBSyxHQUFMLENBQVMsUUFBVCxFQUFtQixlQUFuQixFQUY2QixDQUVRO0FBQ3hDO0FBQ0o7QUFDRCxrQkFBSyxFQUFMLENBQVEsUUFBUixFQUFrQixlQUFsQjtBQUNBLGtCQUFLLFNBQUwsQ0FBZSxVQUFmLEVBQTJCLGFBQTNCO0FBQ0gsU0FWdUMsQ0FBeEM7QUFXQSxZQUFJLGdCQUFnQixFQUFwQjtBQUNBLGVBQU8sU0FBUyxRQUFULENBQWtCLFVBQWxCLEVBQThCLElBQTlCLENBQW1DLFlBQU07QUFDNUMsOEJBQWtCLE9BQWxCLENBQTBCLFVBQUMsSUFBRCxFQUFVO0FBQ2hDLDhCQUFjLElBQWQsQ0FDSSxJQUFJLE9BQUosQ0FBWSxVQUFDLE9BQUQsRUFBYTtBQUFFO0FBQ3ZCLHdCQUFJLGNBQWMsS0FBSyxXQUFMLEdBQW1CLEtBQUssV0FBeEIsR0FBc0MsRUFBeEQ7QUFDQSwyQkFBTyxLQUFLLFdBQVo7QUFDQSx5QkFBSyxNQUFMLEdBQWMsVUFBZDtBQUNBLDZCQUFTLGdCQUFULEdBQTJCO0FBQ3ZCLDRCQUFLLEtBQUssUUFBTCxDQUFjLEtBQUssRUFBbkIsQ0FBTCxFQUE2QjtBQUFFO0FBQzNCLG9DQUFRLElBQVI7QUFDQSxpQ0FBSyxHQUFMLENBQVMsUUFBVCxFQUFtQixnQkFBbkIsRUFGeUIsQ0FFYTtBQUN6QztBQUNKO0FBQ0QsMEJBQUssRUFBTCxDQUFRLFFBQVIsRUFBa0IsZ0JBQWxCO0FBQ0EsMEJBQUssUUFBTCxDQUFjLElBQWQsRUFBb0IsV0FBcEI7QUFDSCxpQkFaRCxDQURKO0FBZUgsYUFoQkQ7QUFpQkEsbUJBQU8sUUFBUSxHQUFSLENBQVksYUFBWixDQUFQO0FBQ0gsU0FuQk0sQ0FBUDtBQW9CSDtBQXBDWSxDQUFqQjs7QUF1Q0EsUUFBUSxrQkFBUixHQUE2QixTQUFTLGtCQUF0QyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9cmV0dXJuIGV9KSgpIiwiIC8qIGV4cG9ydGVkIENoYXJ0cywgZDNUaXAsIE1hcFZhbHVlcywgUHJvbWlzZVBvbHlmaWxsICovXG4gLy9pbXBvcnQgeyBEb251dHMgfSBmcm9tICcuLi9qcy1leHBvcnRzL0RvbnV0cyc7XG4gaW1wb3J0IHsgQmFycyB9IGZyb20gJy4uL2pzLWV4cG9ydHMvQmFycyc7XG4gaW1wb3J0IHsgZDNUaXAgfSBmcm9tICcuLi9qcy12ZW5kb3IvZDMtdGlwJztcbiBpbXBvcnQgeyBNYXBWYWx1ZXMsIFByb21pc2VQb2x5ZmlsbCB9IGZyb20gJy4uL2pzLXZlbmRvci9wb2x5ZmlsbHMnO1xuIFxuIC8qIHBvbHlmaWxscyBuZWVkZWQ6IFByb21pc2UgVE8gRE86IE9USEVSUz9cbiAqL1xuLypcbmltcG9ydCB7IEhlbHBlcnMgfSBmcm9tICcuLi9qcy1leHBvcnRzL0hlbHBlcnMnO1xuaW1wb3J0IHsgZDNUaXAgfSBmcm9tICcuLi9qcy12ZW5kb3IvZDMtdGlwJztcbmltcG9ydCB7IGNyZWF0ZUJyb3dzZUJ1dHRvbiB9IGZyb20gJy4uL2pzLWV4cG9ydHMvQnJvd3NlQnV0dG9ucyc7XG5pbXBvcnQgeyBjcmVhdGVSZXN1bHRJdGVtIH0gZnJvbSAnLi4vanMtZXhwb3J0cy9SZXN1bHRJdGVtcyc7IFxuKi9cbiAgXG4vKlxudG8gZG8gOiBzZWUgYWxzbyBodHRwczovL3d3dy5tYXBib3guY29tL21hcGJveC1nbC1qcy9leGFtcGxlL2hlYXRtYXAtbGF5ZXIvXG4gXG5cbiovXG53aW5kb3cudGhlTWFwICA9IChmdW5jdGlvbigpeyAgIFxuXCJ1c2Ugc3RyaWN0XCI7XG5cdCBmdW5jdGlvbiB3ZWJnbF9zdXBwb3J0KCkgeyBcblx0ICAgdHJ5e1xuXHQgICAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoICdjYW52YXMnICk7IFxuXHQgICAgcmV0dXJuICEhIHdpbmRvdy5XZWJHTFJlbmRlcmluZ0NvbnRleHQgJiYgKCBcblx0ICAgICAgICAgY2FudmFzLmdldENvbnRleHQoICd3ZWJnbCcgKSB8fCBjYW52YXMuZ2V0Q29udGV4dCggJ2V4cGVyaW1lbnRhbC13ZWJnbCcgKSApO1xuXHQgICB9Y2F0Y2goIGUgKSB7IHJldHVybiBmYWxzZTsgfSBcblx0IH1cblx0IGNvbnNvbGUubG9nKHdlYmdsX3N1cHBvcnQoKSk7XG5cdGlmICggd2ViZ2xfc3VwcG9ydCgpID09IG51bGwgKXtcblx0XHRkMy5zZWxlY3QoJyN3ZWJnbC13YXJuaW5nJylcblx0XHRcdC5jbGFzc2VkKCd3YXJuaW5nJywgdHJ1ZSlcblx0XHRcdC50ZXh0KCdZb3VyIGRldmljZSBtYXkgbm90IHN1cHBvcnQgdGhlIGdyYXBoaWNzIHRoaXMgdG9vbCByZWxpZXMgb247IHBsZWFzZSB0cnkgb24gYW5vdGhlci4nKTtcblx0fVxuXHQvL3ZhciB0aXAgPSBkMy50aXAoKS5hdHRyKCdjbGFzcycsICdkMy10aXAnKS5odG1sKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQ7IH0pO1xuXHRcbiAgICBtYXBib3hnbC5hY2Nlc3NUb2tlbiA9ICdway5leUoxSWpvaWIzTjBaWEp0WVc1cUlpd2lZU0k2SW1OcGRuVTVkSFZuZGpBMmVEWXliM0EzTm5nMWNHSjNaWG9pZlEuWG9fay1rekdmWVhfWW9fUkRjSERCZyc7XG4gICAgZDMuc2VsZWN0QWxsKCcuaGVscC1saW5rJylcbiAgICBcdC5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgXHRcdGQzLmV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgXHR9KTtcbiAgICBjb25zdCBtYkhlbHBlciA9IHJlcXVpcmUoJ21hcGJveC1oZWxwZXInKTtcbiAgIC8vIGQzLnRpcCA9IHJlcXVpcmUoJ2QzLXRpcCcpO1xuICAgIGNvbnN0IHRpcCA9IGQzLnRpcCgpLmF0dHIoJ2NsYXNzJywgJ2QzLXRpcCcpLmRpcmVjdGlvbigndycpLmh0bWwoZnVuY3Rpb24oZCkgeyBjb25zb2xlLmxvZyh0aGlzLGQpO3JldHVybiBkW2QzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUucGFyZW50Tm9kZS5wYXJlbnROb2RlKS5hdHRyKCdpZCcpLnJlcGxhY2UoJy0nLCcnKV07IH0pO1xuICAgXHRjb25zdCB0aGVDaGFydHMgPSBbXTtcbiAgIFxuICAgIHZhciBnZW9qc29uO1xuICAgIHZhciBmZWF0dXJlUHJvcGVydGllc0J5SWQgPSBuZXcgTWFwKCk7IFxuICAgIHZhciBnYXRlQ2hlY2sgPSAwO1xuXG4gICAgdmFyIHNpemVab29tVGhyZXNob2xkID0gODtcbiAgICBcbiAgICB2YXIgdGhlTWFwID0gbmV3IG1hcGJveGdsLk1hcCh7XG5cdCAgICBjb250YWluZXI6ICdtYXAnLFxuXHQgICAgc3R5bGU6ICdtYXBib3g6Ly9zdHlsZXMvb3N0ZXJtYW5qL2NqZjAzbzM3YjN0dmUycnFwMmludzZhMWYnLFxuXHQgICAgY2VudGVyOiBbLTk1LjE0OTM1MTQ4NjQ1OTA3MywgMzcuOTg0NjczMzcwODU1OTldLFxuXHQgICAgem9vbTogMyxcblx0ICAgIG1heEJvdW5kczogW1stMTQyLjg4NzA1NzE0NzQ2MzYyLCAxNi4wNTgzNDQ5NDg0MzI0MDZdLFstNTEuOTAyMzAxNzg2OTczMSw1NS43NjY5MDA2NzQxNzEzOF1dLFxuXHQgICAgbWluWm9vbTogMS41LFxuXHQgICAgYXR0cmlidXRpb25Db250cm9sOiBmYWxzZSxcblx0fSk7XG5cblx0dmFyIG5hdiA9IG5ldyBtYXBib3hnbC5OYXZpZ2F0aW9uQ29udHJvbCh7c2hvd0NvbXBhc3M6ZmFsc2V9KTtcblx0dGhlTWFwLmFkZENvbnRyb2wobmF2LCAndG9wLXJpZ2h0Jyk7XG5cblx0dmFyIG1lZGlhbkluY29tZXMgPSBuZXcgTWFwKCk7XG5cdHRvR2VvSlNPTigncG9saWNpZXMuY3N2Jyk7XG5cdHRoZU1hcC5vbignbG9hZCcsIGZ1bmN0aW9uKCl7XG5cdFx0Z2F0ZUNoZWNrKys7XG5cdFx0Z2F0ZSgpO1xuXHR9KTtcblx0ZnVuY3Rpb24gZ2F0ZSgpe1xuXHRcdGlmICggZ2F0ZUNoZWNrIDwgMiApe1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR1cGRhdGVBbGwoKTtcblx0XHRhZGRVbmNsdXN0ZXJlZCgpO1xuXHRcdGFkZENsdXN0ZXJlZCgpO1xuXHRcdC8vY2FsY3VsYXRlWlNjb3JlcygncHJlbScpO1xuXHR9IC8vIGVuZCBnYXRlXG5cblx0Lyp2YXIgY2Vuc3VzVHJhY3RzSW5WaWV3ID0gbmV3IFNldCgpO1xuXHRmdW5jdGlvbiBjYWxjdWxhdGVNZWRpYW5JbmNvbWVzKGluVmlld0lEcyl7XG5cdFx0Y29uc29sZS5sb2coaW5WaWV3SURzKTtcblx0XHR2YXIgbWVkaWFuSW5jb21lcyA9IFtdO1xuXHRcdGNlbnN1c1RyYWN0c0luVmlldy5jbGVhcigpO1xuXHRcdGluVmlld0lEcy5mb3JFYWNoKGQgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coZCk7XG5cdFx0XHR2YXIgZmVhdHVyZSA9IGdlb2pzb24uZmVhdHVyZXMuZmluZChmID0+IGYucHJvcGVydGllcy5pZCA9PT0gZCk7XG5cdFx0XHR2YXIgY2Vuc3VzVHJhY3QgPSBmZWF0dXJlLmNlbl90cmFjdDtcblx0XHRcdGlmICggIWNlbnN1c1RyYWN0c0luVmlldy5oYXMoY2Vuc3VzVHJhY3QpKXtcblx0XHRcdFx0Y2Vuc3VzVHJhY3RzSW5WaWV3LmFkZChjZW5zdXNUcmFjdCk7XG5cdFx0XHRcdG1lZGlhbkluY29tZXMucHVzaChmZWF0dXJlLm1lZF9pbmNvbWUpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHJldHVybiBtZWRpYW5JbmNvbWVzO1xuXHR9Ki9cblx0ZnVuY3Rpb24gY2FsY3VsYXRlWlNjb3JlcyhmaWVsZCwgY3V0b2ZmID0gbnVsbCwgaGFyZEN1dG9mZiA9IG51bGwsIGlnbm9yZSA9IFtdICl7ICAvLyBjdXRvZmYgc3BlY2lmaWVzIHVwcGVyIGJvdW5kIHRvIGdldCByaWQgb2Ygb3V0bGllcnNcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ICAvLyBhIHdlYWsgY3V0b2ZmIGNhbGN1bGF0ZXMgdmFsdWVzIGZvciB3aG9sZSBzZXQgYnV0XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCAgLy8gc2V0cyBtYXggZm9yIHRoZSB2aXogYmFzZWQgb24gdGhlIGN1dG9mZiB2YWx1ZS4gYSBoYXJkXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCAgLy8gY3V0b2ZmIGV4Y2x1ZGVzIHZhbHVlcyBiZXlvbmQgdGhlIGN1dG9mZiBmcm9tIHRoZSBcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ICAvLyBjYWxjdWxhdGlvbnNcdFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQgIC8vIHRoZSBpZ25vcmUgYXJyYXkgaXMgdmFsdWVzIHRoYXQgc2hvdWxkIGJlIHRyZWF0ZWQgYXMgaW52YWxpZFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQgIC8vIHN1Y2ggYXMgYWxsIHRoZSBlcnJvbmVvdWUgJDI1MGsgaG9tZSB2YWx1ZXMuXG5cdFx0Y29uc29sZS5sb2coJ2NhbGN1bGF0aW5nIHotc2NvcmVzJyk7XG5cdFx0dmFyIG1lYW4gPSBkMy5tZWFuKGdlb2pzb24uZmVhdHVyZXMsIGQgPT4ge1xuXHRcdFx0aWYgKCBoYXJkQ3V0b2ZmID09PSBudWxsICkge1xuXHRcdFx0XHRyZXR1cm4gaWdub3JlLmluZGV4T2YoZC5wcm9wZXJ0aWVzW2ZpZWxkXSkgPT09IC0xID8gZC5wcm9wZXJ0aWVzW2ZpZWxkXSA6IG51bGw7XG5cdFx0XHR9XG5cdFx0XHRpZiAoIGQucHJvcGVydGllc1tmaWVsZF0gPD0gaGFyZEN1dG9mZiApe1xuXHRcdFx0XHRyZXR1cm4gaWdub3JlLmluZGV4T2YoZC5wcm9wZXJ0aWVzW2ZpZWxkXSkgPT09IC0xID8gZC5wcm9wZXJ0aWVzW2ZpZWxkXSA6IG51bGw7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0dmFyIHNkID0gZDMuZGV2aWF0aW9uKGdlb2pzb24uZmVhdHVyZXMsIGQgPT4ge1xuXHRcdFx0aWYgKCBoYXJkQ3V0b2ZmID09PSBudWxsICkge1xuXHRcdFx0XHRyZXR1cm4gaWdub3JlLmluZGV4T2YoZC5wcm9wZXJ0aWVzW2ZpZWxkXSkgPT09IC0xID8gZC5wcm9wZXJ0aWVzW2ZpZWxkXSA6IG51bGw7XG5cdFx0XHR9XG5cdFx0XHRpZiAoIGQucHJvcGVydGllc1tmaWVsZF0gPD0gaGFyZEN1dG9mZiApe1xuXHRcdFx0XHRyZXR1cm4gaWdub3JlLmluZGV4T2YoZC5wcm9wZXJ0aWVzW2ZpZWxkXSkgPT09IC0xID8gZC5wcm9wZXJ0aWVzW2ZpZWxkXSA6IG51bGw7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0dmFyIG1pbixcblx0XHRcdG1heCxcblx0XHRcdGN1dG9mZlogPSBjdXRvZmYgPyAoIGN1dG9mZiAtIG1lYW4gKSAvIHNkIDogbnVsbDtcblxuXHRcdGNvbnNvbGUubG9nKCdjdXRvZmYgaXMgJyArIGN1dG9mZlopO1xuXHRcdGdlb2pzb24uZmVhdHVyZXMuZm9yRWFjaChlYWNoID0+IHtcblx0XHRcdGlmICggaGFyZEN1dG9mZiAmJiBlYWNoLnByb3BlcnRpZXNbZmllbGRdID4gaGFyZEN1dG9mZiB8fCBpZ25vcmUuaW5kZXhPZihlYWNoLnByb3BlcnRpZXNbZmllbGRdKSAhPT0gLTEgKXtcblx0XHRcdFx0ZWFjaC5wcm9wZXJ0aWVzW2ZpZWxkICsgJ1onXSA9IG51bGw7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRlYWNoLnByb3BlcnRpZXNbZmllbGQgKyAnWiddID0gKCBlYWNoLnByb3BlcnRpZXNbZmllbGRdIC0gbWVhbiApIC8gc2Q7XG5cdFx0XHRcdG1pbiA9IGVhY2gucHJvcGVydGllc1tmaWVsZCArICdaJ10gPCBtaW4gfHwgbWluID09PSB1bmRlZmluZWQgPyBlYWNoLnByb3BlcnRpZXNbZmllbGQgKyAnWiddIDogbWluO1xuXHRcdFx0XHRtYXggPSBlYWNoLnByb3BlcnRpZXNbZmllbGQgKyAnWiddID4gbWF4IHx8IG1heCA9PT0gdW5kZWZpbmVkID8gZWFjaC5wcm9wZXJ0aWVzW2ZpZWxkICsgJ1onXSA6IG1heDtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRjb25zb2xlLmxvZygnYWN0dWFsTWluOicgKyBtaW4sICdhY3R1YWxNYXg6JyArIG1heCk7XG5cdFx0Ly9tYXggPSBkMy5taW4oW21heCxjdXRvZmZaLDNdKTtcblx0XHQvL21pbiA9IGQzLm1heChbbWluLCAtM10pO1xuXHRcdG1heCA9IDIuMzM7XG5cdFx0bWluID0gLTIuMzM7XG5cdFx0Y29uc29sZS5sb2coJ2RvbmUnLCBnZW9qc29uLCBtaW4sIG1heCk7XG5cdFx0cmV0dXJuIHtcblx0XHRcdG1pbixcblx0XHRcdG1heCxcblx0XHRcdG1lYW4sXG5cdFx0XHRzZFxuXHRcdH07XG5cdH1cblxuXHRmdW5jdGlvbiBhZGRVbmNsdXN0ZXJlZCgpe1xuXHRcdHJldHVybiBtYkhlbHBlci5hZGRTb3VyY2VBbmRMYXllcnMuY2FsbCh0aGVNYXAsXG5cdFx0XHR7IC8vIHNvdXJjZVxuXHRcdFx0XHRcIm5hbWVcIjogXCJwb2xpY3ktcG9pbnRzXCIsXG5cdFx0ICAgICAgICBcInR5cGVcIjogXCJnZW9qc29uXCIsXG5cdFx0ICAgICAgICBcImRhdGFcIjogZ2VvanNvblxuXHRcdFx0fSwgWyAvLyBsYXllcnNcblx0XHRcdFx0eyAvLyBsYXllciBvbmVcblx0ICAgICAgICAgICAgXCJpZFwiOiBcInBvaW50c1wiLFxuXHQgICAgICAgICAgICBcInR5cGVcIjogXCJjaXJjbGVcIixcblx0ICAgICAgICAgICAgXCJzb3VyY2VcIjogXCJwb2xpY3ktcG9pbnRzXCIsXG5cdCAgICAgICAgICAgIFwibWF4em9vbVwiOiBzaXplWm9vbVRocmVzaG9sZCxcblx0ICAgICAgICAgICAgXCJwYWludFwiOiB7XG5cdCAgICAgICAgICAgICAgXHRcImNpcmNsZS1jb2xvclwiOiBbXG5cdFx0ICAgICAgICAgICAgICAgICdtYXRjaCcsXG5cdFx0ICAgICAgICAgICAgICAgIFsnZ2V0JywgJ3RfZGVkJ10sXG5cdFx0ICAgICAgICAgICAgICAgIDUsICcjMGY0MzljJyxcblx0XHQgICAgICAgICAgICAgICAgLyogb3RoZXIgKi8gJyM5OTAwMDAnXG5cdFx0ICAgICAgICAgICAgXSxcblx0XHQgICAgICAgICAgICBcImNpcmNsZS1yYWRpdXNcIjoge1xuXHRcdCAgICAgICAgICAgICAgICAnc3RvcHMnOiBbWzUsIDNdLCBbOCwgMThdXVxuXHRcdCAgICAgICAgICAgIH0sXG5cdFx0ICAgICAgICAgICAgXCJjaXJjbGUtb3BhY2l0eVwiOiAwLjFcblx0XHQgICAgICAgICAgICB9XG5cdFx0ICAgICAgICB9LFxuXHRcdCAgICAgICAgeyAvLyBsYXllciB0d29cblx0ICAgICAgICAgICAgXCJpZFwiOiBcInBvaW50cy1kYXRhLWRyaXZlblwiLFxuXHQgICAgICAgICAgICBcInR5cGVcIjogXCJjaXJjbGVcIixcblx0ICAgICAgICAgICAgXCJzb3VyY2VcIjogXCJwb2xpY3ktcG9pbnRzXCIsXG5cdCAgICAgICAgICAgIFwibWluem9vbVwiOiBzaXplWm9vbVRocmVzaG9sZCxcblx0ICAgICAgICAgICAgXCJwYWludFwiOiB7XG5cdCAgICAgICAgICAgICAgXHRcImNpcmNsZS1jb2xvclwiOiBbXG5cdFx0ICAgICAgICAgICAgICAgICdtYXRjaCcsXG5cdFx0ICAgICAgICAgICAgICAgIFsnZ2V0JywgJ3RfZGVkJ10sXG5cdFx0ICAgICAgICAgICAgICAgIDUsICcjMGY0MzljJyxcblx0XHQgICAgICAgICAgICAgICAgLyogb3RoZXIgKi8gJyM5OTAwMDAnXG5cdFx0ICAgICAgICAgICAgXSxcblx0XHQgICAgICAgICAgICBcImNpcmNsZS1yYWRpdXNcIjoge1xuXHRcdCAgICAgICAgICAgIFx0cHJvcGVydHk6ICdwcmVtJyxcblx0XHQgICAgICAgICAgICAgICAgdHlwZTogJ2V4cG9uZW50aWFsJyxcblx0XHRcdFx0ICAgICAgICBzdG9wczogW1xuXHRcdFx0XHQgICAgICAgICAgWzYyLCA1XSxcblx0XHRcdFx0ICAgICAgICAgIFsyNTAwLCA2MF1cblx0XHRcdFx0ICAgICAgICBdXG5cdFx0ICAgICAgICAgICAgfSxcblx0XHQgICAgICAgICAgICBcImNpcmNsZS1vcGFjaXR5XCI6IDAuMSxcblx0XHQgICAgICAgICAgICBcImNpcmNsZS1zdHJva2UtY29sb3JcIjogXCIjZmZmZmZmXCIsXG5cdFx0ICAgICAgICAgICAgXCJjaXJjbGUtc3Ryb2tlLXdpZHRoXCI6IDFcblx0XHQgICAgICAgIH1cblx0XHRcdH1dXG5cdFx0KTsgXG5cdH1cblx0LypmdW5jdGlvbiBjaGVja0ZlYXR1cmVzTG9hZGVkKCl7XG5cdFx0aWYgKCB0aGVNYXAubG9hZGVkKCkpe1xuXHRcdFx0XG5cdFx0XHR0aGVNYXAub2ZmKCdyZW5kZXInLCBjaGVja0ZlYXR1cmVzKTtcblx0XHR9XG5cdH0qL1xuXHRmdW5jdGlvbiBhZGRDbHVzdGVyZWQoKXtcblx0XHRcblx0XHRtYkhlbHBlci5hZGRTb3VyY2VBbmRMYXllcnMuY2FsbCh0aGVNYXAsXG5cdFx0ICAgIHsgLy8gc291cmNlXG5cdFx0ICAgIFx0XCJuYW1lXCI6IFwicG9saWNpZXNcIixcblx0XHQgICAgICAgIFwidHlwZVwiOiBcImdlb2pzb25cIixcblx0XHQgICAgICAgIFwiZGF0YVwiOiBnZW9qc29uLFxuXHRcdCAgICAgICAgXCJjbHVzdGVyXCI6IHRydWUsXG5cdFx0ICAgICAgICBcImNsdXN0ZXJSYWRpdXNcIjogMC41IC8vIFJhZGl1cyBvZiBlYWNoIGNsdXN0ZXIgd2hlbiBjbHVzdGVyaW5nIHBvaW50cyAoZGVmYXVsdHMgdG8gNTApXG5cdFx0ICAgIH0sIFsgLy8gbGF5ZXJzXG5cdFx0ICAgICAgIHsgLy8gbGF5ZXIgb25lXG5cdFx0ICAgICAgICAgICAgaWQ6IFwiY2x1c3Rlci1jb3VudFwiLFxuXHRcdFx0ICAgICAgICB0eXBlOiBcInN5bWJvbFwiLFxuXHRcdFx0ICAgICAgICBzb3VyY2U6IFwicG9saWNpZXNcIixcblx0XHRcdCAgICAgICAgZmlsdGVyOiBbXCJoYXNcIiwgXCJwb2ludF9jb3VudFwiXSxcblx0XHRcdCAgICAgICAgXCJtaW56b29tXCI6IDYsXG5cdFx0XHQgICAgICAgIGxheW91dDoge1xuXHRcdFx0ICAgICAgICAgICAgXCJ0ZXh0LWZpZWxkXCI6IFwie3BvaW50X2NvdW50X2FiYnJldmlhdGVkfVwiLFxuXHRcdFx0ICAgICAgICAgICAgXCJ0ZXh0LXNpemVcIjogMTIsXG5cblx0XHRcdCAgICAgICAgfSxcblx0XHRcdCAgICAgICAgXCJwYWludFwiOiB7XG5cdFx0XHQgICAgICAgIFx0XCJ0ZXh0LWNvbG9yXCI6IFwiI2ZmZmZmZlwiXG5cdFx0XHQgICAgICAgIH1cblx0XHQgICAgICAgIH1cblx0ICAgICAgICBdIC8vIGVuZCBsYXllcnMgYXJyYXlcblx0ICAgICk7IC8vIGVuZCBhZGRsYXllcnNcblx0fSAvLyBlbmQgYWRkQ2x1c3RlcmVkXG5cdGZ1bmN0aW9uIHRvR2VvSlNPTih1cmwpe1xuXHRcdFxuXHRcdGQzLmNzdih1cmwsIGZ1bmN0aW9uKGVyciwgZGF0YSl7XG5cdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdHRocm93IGVycjtcblx0XHRcdH1cblx0XHRcdC8vY29uc29sZS5sb2coZGF0YSk7XG5cdFx0XHR2YXIgZmVhdHVyZXMgPSBbXTsgXG5cdFx0XHRkYXRhLmZvckVhY2goZWFjaCA9PiB7XG5cblx0XHRcdFx0dmFyIHZhbHVlID0gK2VhY2gubWVkX2luY29tZSA/ICtlYWNoLm1lZF9pbmNvbWUgOiBudWxsO1xuXHRcdFx0XHRpZiAoICFtZWRpYW5JbmNvbWVzLmhhcygrZWFjaC5jZW5fdHJhY3QpICl7XG5cdFx0XHRcdFx0bWVkaWFuSW5jb21lcy5zZXQoK2VhY2guY2VuX3RyYWN0LCB2YWx1ZSk7IC8vIG5vIGR1cGxpY2F0ZSB0cmFjdHNcblx0XHRcdFx0fVxuXHRcdFx0XHR2YXIgY29lcmNlZCA9IHt9O1xuXHRcdFx0XHRmb3IgKCB2YXIga2V5IGluIGVhY2ggKSB7XG5cdFx0XHRcdFx0aWYgKCBlYWNoLmhhc093blByb3BlcnR5KGtleSkgKXtcblx0XHRcdFx0XHRcdGNvZXJjZWRba2V5XSA9ICFpc05hTigrZWFjaFtrZXldKSA/ICtlYWNoW2tleV0gOiBlYWNoW2tleV07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9ICBcblx0XHRcdFx0ZmVhdHVyZVByb3BlcnRpZXNCeUlkLnNldChjb2VyY2VkLmlkLGNvZXJjZWQpO1xuXHRcdFx0XHRmZWF0dXJlcy5wdXNoKHtcblx0XHRcdFx0XHRcInR5cGVcIjogXCJGZWF0dXJlXCIsXG5cdFx0XHRcdFx0XCJwcm9wZXJ0aWVzXCI6IGNvZXJjZWQsXG5cdFx0XHRcdFx0XCJnZW9tZXRyeVwiOiB7XG5cdFx0XHRcdFx0XHRcInR5cGVcIjogXCJQb2ludFwiLFxuXHRcdFx0XHRcdFx0XCJjb29yZGluYXRlc1wiOiBbK2VhY2gubG9uZ2l0dWRlLCArZWFjaC5sYXRpdHVkZV1cblx0XHRcdFx0XHR9ICAgXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7IC8vIGVuZCBmb3JFYWNoXG5cdFx0XHRjb25zb2xlLmxvZyhtZWRpYW5JbmNvbWVzKTtcblx0XHRcdGNvbnNvbGUubG9nKGZlYXR1cmVQcm9wZXJ0aWVzQnlJZCk7XG5cdFx0XHRnZW9qc29uID0gIHtcblx0XHRcdFx0XCJ0eXBlXCI6IFwiRmVhdHVyZUNvbGxlY3Rpb25cIixcblx0XHRcdFx0XCJmZWF0dXJlc1wiOiBmZWF0dXJlc1xuXHRcdFx0fTtcblx0XHRcdHRoZUNoYXJ0cy5wdXNoKCAvLyBzaG91bGQgYmUgYWJsZSB0byBjcmVhdGUgY2hhcnRzIG5vdywgd2hldGhlciBvciBub3QgbWFwIGhhcyBsb2FkZWQuIG1hcCBuZWVkcyB0byBoYXZlXG5cdFx0XHRcdFx0XHRcdC8vIGxvYWRlZCBmb3IgdGhlbSB0byB1cGRhdGUsIHRob3VnaC5cblx0XHRcdFx0bmV3IEJhcnMuQmFyKHsgXG5cdFx0XHRcdFx0dGl0bGU6ICdQcm9wZXJ0aWVzIGluIHZpZXcnLCBcblx0XHRcdFx0XHRtYXJnaW46IHtcblx0XHRcdFx0XHRcdHRvcDowLFxuXHRcdFx0XHRcdFx0cmlnaHQ6MSxcblx0XHRcdFx0XHRcdGJvdHRvbTowLFxuXHRcdFx0XHRcdFx0bGVmdDoxIFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aGVpZ2h0VG9XaWR0aDogMC4wNSxcblx0XHRcdFx0XHRjb250YWluZXI6ICcjaW4tdmlldy1iYXInLFxuXHRcdFx0XHRcdGRhdGE6IGdlb2pzb24uZmVhdHVyZXMsXG5cdFx0XHRcdFx0bnVtZXJhdG9yKGluVmlld0lEcyl7XG5cdFx0XHRcdFx0XHRyZXR1cm4gaW5WaWV3SURzLnNpemU7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRkZW5vbWluYXRvcigpe1xuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuZGF0YS5sZW5ndGg7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR0ZXh0RnVuY3Rpb24obixkKXtcblx0XHRcdFx0XHRcdHJldHVybiBgJHtkMy5mb3JtYXQoXCIsXCIpKG4pfSBvZiAke2QzLmZvcm1hdChcIixcIikoZCl9ICgke2QzLmZvcm1hdChcIi4wJVwiKShuIC8gZCl9KWA7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KSxcblx0XHRcdFx0bmV3IEJhcnMuQmFyKHtcblx0XHRcdFx0XHR0aXRsZTogJy4uLiB3aXRoIGxvdyBkZWR1Y3RpYmxlJywgXG5cdFx0XHRcdFx0bWFyZ2luOiB7XG5cdFx0XHRcdFx0XHR0b3A6MCxcblx0XHRcdFx0XHRcdHJpZ2h0OjEsXG5cdFx0XHRcdFx0XHRib3R0b206MCxcblx0XHRcdFx0XHRcdGxlZnQ6MSBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGhlaWdodFRvV2lkdGg6IDAuMDUsXG5cdFx0XHRcdFx0aW5mb01hcms6dHJ1ZSxcblx0XHRcdFx0XHRjb250YWluZXI6ICcjZGVkdWN0aWJsZS1iYXInLFxuXHRcdFx0XHRcdGRhdGE6IGdlb2pzb24uZmVhdHVyZXMsXG5cdFx0XHRcdFx0bnVtZXJhdG9yKGluVmlld0lEcyl7XG5cdFx0XHRcdFx0XHRpZiAoIGluVmlld0lEcy5zaXplID09PSAwICl7XG5cdFx0XHRcdFx0XHRcdHJldHVybiB0aGlzLm1pbjtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHZhciBmaWx0ZXJlZERhdGEgPSB0aGlzLmRhdGEuZmlsdGVyKGVhY2ggPT4gaW5WaWV3SURzLmhhcyhlYWNoLnByb3BlcnRpZXMuaWQpKSxcblx0XHRcdFx0XHRcdFx0bnVtYmVyTWF0Y2hpbmcgPSAwO1xuXHRcdFx0XHRcdFx0ZmlsdGVyZWREYXRhLmZvckVhY2goZWFjaCA9PiB7XG5cdFx0XHRcdFx0XHRcdGlmICggZWFjaC5wcm9wZXJ0aWVzLnRfZGVkIDwgNSApe1xuXHRcdFx0XHRcdFx0XHRcdG51bWJlck1hdGNoaW5nKys7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0cmV0dXJuIG51bWJlck1hdGNoaW5nO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0ZGVub21pbmF0b3IoaW5WaWV3SURzKXsgLy8gZm9yIHRoaXMgb25lIGRlbm9taW5hdG9yIGlzIG51bWJlciBvZiBwb2xpY2llcyBpbiB2aWV3XG5cdFx0XHRcdFx0XHQgcmV0dXJuIGluVmlld0lEcy5zaXplO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0dGV4dEZ1bmN0aW9uKG4sZCl7XG5cdFx0XHRcdFx0XHRpZiAoaW5WaWV3SURzLnNpemUgPT09IDApe1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gJ25vbmUgaW4gdmlldyc7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZXR1cm4gYCR7ZDMuZm9ybWF0KFwiLFwiKShuKX0gb2YgJHtkMy5mb3JtYXQoXCIsXCIpKGQpfSAoJHtkMy5mb3JtYXQoXCIuMCVcIikobiAvIGQpfSlgO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSksXG5cdFx0XHRcdG5ldyBCYXJzLkJhcih7XG5cdFx0XHRcdFx0dGl0bGU6ICdBdmVyYWdlIHByZW1pdW0nLCBcblx0XHRcdFx0XHRtYXJnaW46IHtcblx0XHRcdFx0XHRcdHRvcDowLFxuXHRcdFx0XHRcdFx0cmlnaHQ6MSxcblx0XHRcdFx0XHRcdGJvdHRvbTowLFxuXHRcdFx0XHRcdFx0bGVmdDoxIFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0elNjb3JlczogY2FsY3VsYXRlWlNjb3JlcygncHJlbScsMjAwMCksXG5cdFx0XHRcdFx0bWluKCl7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyh0aGlzKTtcblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLnpTY29yZXMubWluO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aGVpZ2h0VG9XaWR0aDogMC4wNSxcblx0XHRcdFx0XHRjb250YWluZXI6ICcjcHJlbWl1bS1iYXInLFxuXHRcdFx0XHRcdGRhdGE6IGdlb2pzb24uZmVhdHVyZXMsXG5cdFx0XHRcdFx0bnVtZXJhdG9yKGluVmlld0lEcyl7XG5cdFx0XHRcdFx0XHRpZiAoIGluVmlld0lEcy5zaXplID09PSAwICl7XG5cdFx0XHRcdFx0XHRcdHJldHVybiB0aGlzLm1pbjtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHZhciBmaWx0ZXJlZERhdGEgPSB0aGlzLmRhdGEuZmlsdGVyKGVhY2ggPT4gaW5WaWV3SURzLmhhcyhlYWNoLnByb3BlcnRpZXMuaWQpKTtcblx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRyZXR1cm4gZDMubWVhbihmaWx0ZXJlZERhdGEsIGQgPT4gZC5wcm9wZXJ0aWVzLnByZW1aKTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGRlbm9taW5hdG9yKCl7IFxuXHRcdFx0XHRcdFx0IHJldHVybiB0aGlzLnpTY29yZXMubWF4O1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0dGV4dEZ1bmN0aW9uKG4peyBcblx0XHRcdFx0XHRcdGlmIChpblZpZXdJRHMuc2l6ZSA9PT0gMCl7XG5cdFx0XHRcdFx0XHRcdHJldHVybiAnbm9uZSBpbiB2aWV3Jztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybiAnJCcgKyBkMy5mb3JtYXQoXCIsLjJmXCIpKHRoaXMuelNjb3Jlcy5tZWFuICsgdGhpcy56U2NvcmVzLnNkICogbiApICsgJyAoeiA9ICcgKyBkMy5mb3JtYXQoXCIuMmZcIikobikgKyAnKSc7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KSxcblx0XHRcdFx0XG5cdFx0XHRcdG5ldyBCYXJzLkJhcih7XG5cdFx0XHRcdFx0dGl0bGU6ICdBdmVyYWdlIGhvbWUgcmVwbGFjZW1lbnQgdmFsdWUnLCBcblx0XHRcdFx0XHRtYXJnaW46IHtcblx0XHRcdFx0XHRcdHRvcDowLFxuXHRcdFx0XHRcdFx0cmlnaHQ6MSxcblx0XHRcdFx0XHRcdGJvdHRvbTowLFxuXHRcdFx0XHRcdFx0bGVmdDoxIFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0elNjb3JlczogY2FsY3VsYXRlWlNjb3JlcygndmFsdWUnLDU1MCwyMDAwMCxbMjUwXSksXG5cdFx0XHRcdFx0bWluKCl7XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLnpTY29yZXMubWluO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aW5mb01hcms6dHJ1ZSxcblx0XHRcdFx0XHRoZWlnaHRUb1dpZHRoOiAwLjA1LFxuXHRcdFx0XHRcdGNvbnRhaW5lcjogJyN2YWx1ZS1iYXInLFxuXHRcdFx0XHRcdGRhdGE6IGdlb2pzb24uZmVhdHVyZXMsXG5cdFx0XHRcdFx0bnVtZXJhdG9yKGluVmlld0lEcyl7XG5cdFx0XHRcdFx0XHRpZiAoIGluVmlld0lEcy5zaXplID09PSAwICl7XG5cdFx0XHRcdFx0XHRcdHJldHVybiB0aGlzLm1pbjtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHZhciBmaWx0ZXJlZERhdGEgPSB0aGlzLmRhdGEuZmlsdGVyKGVhY2ggPT4gaW5WaWV3SURzLmhhcyhlYWNoLnByb3BlcnRpZXMuaWQpKTtcblx0XHRcdFx0XHRcdHJldHVybiBkMy5tZWFuKGZpbHRlcmVkRGF0YSwgZCA9PiBkLnByb3BlcnRpZXMudmFsdWVaKTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGRlbm9taW5hdG9yKCl7IFxuXHRcdFx0XHRcdFx0IHJldHVybiB0aGlzLnpTY29yZXMubWF4O1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0dGV4dEZ1bmN0aW9uKG4peyBcblx0XHRcdFx0XHRcdGlmIChpblZpZXdJRHMuc2l6ZSA9PT0gMCl7XG5cdFx0XHRcdFx0XHRcdHJldHVybiAnbm9uZSBpbiB2aWV3Jztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybiAnJCcgKyBkMy5mb3JtYXQoXCIsLjBmXCIpKCh0aGlzLnpTY29yZXMubWVhbiArIHRoaXMuelNjb3Jlcy5zZCAqIG4gKSAqIDEwMDAgKSArICcgKHogPSAnICsgZDMuZm9ybWF0KFwiLjJmXCIpKG4pICsgJyknO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSksXG5cdFx0XHRcdG5ldyBCYXJzLkJhcih7XG5cdFx0XHRcdFx0dGl0bGU6ICdBdmVyYWdlIGZsb29kIGluc3VyYW5jZSBjb3ZlcmFnZScsIFxuXHRcdFx0XHRcdG1hcmdpbjoge1xuXHRcdFx0XHRcdFx0dG9wOjAsXG5cdFx0XHRcdFx0XHRyaWdodDoxLFxuXHRcdFx0XHRcdFx0Ym90dG9tOjAsXG5cdFx0XHRcdFx0XHRsZWZ0OjEgXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRpbmZvTWFyazp0cnVlLFxuXHRcdFx0XHRcdHpTY29yZXM6IGNhbGN1bGF0ZVpTY29yZXMoJ3Rjb3YnLG51bGwsbnVsbCxbXSksXG5cdFx0XHRcdFx0LyptaW4oKXtcblx0XHRcdFx0XHRcdHJldHVybiBkMy5taW4odGhpcy5kYXRhLCBkID0+IGQucHJvcGVydGllcy50Y292KTtcblx0XHRcdFx0XHR9LCovXG5cdFx0XHRcdFx0bWluKCl7XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLnpTY29yZXMubWluO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aGVpZ2h0VG9XaWR0aDogMC4wNSxcblx0XHRcdFx0XHRjb250YWluZXI6ICcjY292ZXJhZ2UtYmFyJyxcblx0XHRcdFx0XHRkYXRhOiBnZW9qc29uLmZlYXR1cmVzLFxuXHRcdFx0XHRcdG51bWVyYXRvcihpblZpZXdJRHMpe1xuXHRcdFx0XHRcdFx0aWYgKCBpblZpZXdJRHMuc2l6ZSA9PT0gMCApe1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5taW47XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR0aGlzLmZpbHRlcmVkRGF0YSA9IHRoaXMuZGF0YS5maWx0ZXIoZWFjaCA9PiBpblZpZXdJRHMuaGFzKGVhY2gucHJvcGVydGllcy5pZCkpO1xuXHRcdFx0XHRcdFx0cmV0dXJuIGQzLm1lYW4odGhpcy5maWx0ZXJlZERhdGEsIGQgPT4gZC5wcm9wZXJ0aWVzLnRjb3ZaKTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGRlbm9taW5hdG9yKCl7IFxuXHRcdFx0XHRcdFx0IHJldHVybiB0aGlzLnpTY29yZXMubWF4O1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0dGV4dEZ1bmN0aW9uKG4peyBcblx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0aWYgKGluVmlld0lEcy5zaXplID09PSAwKXtcblx0XHRcdFx0XHRcdFx0cmV0dXJuICdub25lIGluIHZpZXcnO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuICckJyArIGQzLmZvcm1hdChcIiwuMGZcIikoKHRoaXMuelNjb3Jlcy5tZWFuICsgdGhpcy56U2NvcmVzLnNkICogbiApICogMTAwMCApICsgJyAoeiA9ICcgKyBkMy5mb3JtYXQoXCIuMmZcIikobikgKyAnKSc7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KSxcblx0XHRcdFx0bmV3IEJhcnMuQmFyKHtcblx0XHRcdFx0XHR0aXRsZTogJ0F2ZXJhZ2UgbWVkaWFuIGhvdXNlaG9sZCBpbmNvbWUnLCBcblx0XHRcdFx0XHRtYXJnaW46IHtcblx0XHRcdFx0XHRcdHRvcDowLFxuXHRcdFx0XHRcdFx0cmlnaHQ6MSxcblx0XHRcdFx0XHRcdGJvdHRvbTowLFxuXHRcdFx0XHRcdFx0bGVmdDoxIFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aW5mb01hcms6dHJ1ZSxcblx0XHRcdFx0XHR6U2NvcmVzOiAoZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKG1lZGlhbkluY29tZXMpO1xuXHRcdFx0XHRcdFx0dmFyIG1lYW4gPSBkMy5tZWFuKFsuLi5tZWRpYW5JbmNvbWVzLnZhbHVlcygpXSk7XG5cdFx0XHRcdFx0XHR2YXIgc2QgPSBkMy5kZXZpYXRpb24oWy4uLm1lZGlhbkluY29tZXMudmFsdWVzKCldKTtcblx0XHRcdFx0XHRcdHZhciBtaW4sXG5cdFx0XHRcdFx0XHRcdG1heCxcblx0XHRcdFx0XHRcdFx0Y3V0b2ZmWiA9ICggMTUwMDAwIC0gbWVhbiApIC8gc2Q7XG5cdFx0XHRcdFx0XHRnZW9qc29uLmZlYXR1cmVzLmZvckVhY2goZWFjaCA9PiB7XG5cdFx0XHRcdFx0XHRcdC8vIHNvbWUgbWVkX2luY29tZXMgYXJlIHJlY29yZGVkIGFzIHplcm87IHRoZXkgc2hvdWxkIGJlIGlnbm9yZWRcblx0XHRcdFx0XHRcdFx0aWYgKCBlYWNoLnByb3BlcnRpZXMubWVkX2luY29tZSA+IDAgKXtcblx0XHRcdFx0XHRcdFx0XHRlYWNoLnByb3BlcnRpZXMubWVkX2luY29tZVogPSAoIGVhY2gucHJvcGVydGllcy5tZWRfaW5jb21lIC0gbWVhbiApIC8gc2Q7XG5cdFx0XHRcdFx0XHRcdFx0bWluID0gZWFjaC5wcm9wZXJ0aWVzLm1lZF9pbmNvbWVaIDwgbWluIHx8IG1pbiA9PT0gdW5kZWZpbmVkID8gZWFjaC5wcm9wZXJ0aWVzLm1lZF9pbmNvbWVaIDogbWluO1xuXHRcdFx0XHRcdFx0XHRcdG1heCA9IGVhY2gucHJvcGVydGllcy5tZWRfaW5jb21lWiA+IG1heCB8fCBtYXggPT09IHVuZGVmaW5lZCA/IGVhY2gucHJvcGVydGllcy5tZWRfaW5jb21lWiA6IG1heDtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRlYWNoLnByb3BlcnRpZXMubWVkX2luY29tZVogPSBudWxsO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdG1heCA9IG1heCA8IGN1dG9mZlogPyBtYXggOiBjdXRvZmZaO1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coe1xuXHRcdFx0XHRcdFx0XHRtaW4sXG5cdFx0XHRcdFx0XHRcdG1heCxcblx0XHRcdFx0XHRcdFx0bWVhbixcblx0XHRcdFx0XHRcdFx0c2Rcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdFx0bWluOiAtMi4zMyxcblx0XHRcdFx0XHRcdFx0bWF4OiAyLjMzLFxuXHRcdFx0XHRcdFx0XHRtZWFuLFxuXHRcdFx0XHRcdFx0XHRzZFxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHR9KSgpLFxuXHRcdFx0XHRcdG1pbigpe1xuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuelNjb3Jlcy5taW47XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRoZWlnaHRUb1dpZHRoOiAwLjA1LFxuXHRcdFx0XHRcdGNvbnRhaW5lcjogJyNpbmNvbWUtYmFyJyxcblx0XHRcdFx0XHRkYXRhOiBnZW9qc29uLmZlYXR1cmVzLFxuXHRcdFx0XHRcdG51bWVyYXRvcihpblZpZXdJRHMpe1xuXHRcdFx0XHRcdFx0aWYgKCBpblZpZXdJRHMuc2l6ZSA9PT0gMCApe1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5taW47XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR2YXIgcmVwcmVzZW50ZWRUcmFjdHMgPSBuZXcgU2V0KCk7XG5cdFx0XHRcdFx0XHR2YXIgbWVkSW5jb21lWkFycmF5ID0gW107XG5cdFx0XHRcdFx0XHRpblZpZXdJRHMuZm9yRWFjaChpZCA9PiB7XG5cdFx0XHRcdFx0XHRcdHZhciBtYXRjaGluZ0ZlYXR1cmUgPSBmZWF0dXJlUHJvcGVydGllc0J5SWQuZ2V0KGlkKTtcblx0XHRcdFx0XHRcdFx0aWYgKCAhcmVwcmVzZW50ZWRUcmFjdHMuaGFzKG1hdGNoaW5nRmVhdHVyZS5jZW5fdHJhY3QpICl7XG5cdFx0XHRcdFx0XHRcdFx0cmVwcmVzZW50ZWRUcmFjdHMuYWRkKG1hdGNoaW5nRmVhdHVyZS5jZW5fdHJhY3QpO1xuXHRcdFx0XHRcdFx0XHRcdG1lZEluY29tZVpBcnJheS5wdXNoKG1hdGNoaW5nRmVhdHVyZS5tZWRfaW5jb21lWik7IC8vIHB1c2hlcyBpbmNvbWUgZnJvbSBvbmx5IG9uZSByZXByZXNlbnRhdGl2ZVxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCAgLy9cblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygnbWVkSW5jb21lWkFycmF5JyxtZWRJbmNvbWVaQXJyYXkpO1xuXHRcdFx0XHRcdFx0cmV0dXJuIGQzLm1lYW4obWVkSW5jb21lWkFycmF5KTtcblxuXHRcdFx0XHRcdFx0Ly90aGlzLm1lZGlhbkluY29tZXNJblZpZXcgPSBjYWxjdWxhdGVNZWRpYW5JbmNvbWVzKGluVmlld0lEcyk7XG5cdFx0XHRcdFx0XHQvL3JldHVybiBkMy5tZWFuKHRoaXMubWVkaWFuSW5jb21lc0luVmlldyk7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRkZW5vbWluYXRvcigpeyBcblx0XHRcdFx0XHRcdCByZXR1cm4gdGhpcy56U2NvcmVzLm1heDtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHRleHRGdW5jdGlvbihuKXsgXG5cdFx0XHRcdFx0XHRpZiAoaW5WaWV3SURzLnNpemUgPT09IDApe1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gJ25vbmUgaW4gdmlldyc7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZXR1cm4gJyQnICsgZDMuZm9ybWF0KFwiLC4wZlwiKSh0aGlzLnpTY29yZXMubWVhbiArIHRoaXMuelNjb3Jlcy5zZCAqIG4gKSArICcgKHogPSAnICsgZDMuZm9ybWF0KFwiLjJmXCIpKG4pICsgJyknO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSksXG5cdFx0XHRcdG5ldyBCYXJzLkJhcih7XG5cdFx0XHRcdFx0dGl0bGU6ICdBdmVyYWdlIG1hcmdpbmFsIGNvc3QgZm9yIGxvd2VyIGRlZHVjdGlibGUnLCBcblx0XHRcdFx0XHRtYXJnaW46IHtcblx0XHRcdFx0XHRcdHRvcDowLFxuXHRcdFx0XHRcdFx0cmlnaHQ6MSxcblx0XHRcdFx0XHRcdGJvdHRvbTowLFxuXHRcdFx0XHRcdFx0bGVmdDoxIFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0elNjb3JlczogY2FsY3VsYXRlWlNjb3JlcygnZGRwJyxudWxsLG51bGwsW10pLFxuXHRcdFx0XHRcdC8qbWluKCl7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZDMubWluKHRoaXMuZGF0YSwgZCA9PiBkLnByb3BlcnRpZXMudGNvdik7XG5cdFx0XHRcdFx0fSwqL1xuXHRcdFx0XHRcdG1pbigpe1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy56U2NvcmVzLm1pbjtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGhlaWdodFRvV2lkdGg6IDAuMDUsXG5cdFx0XHRcdFx0Y29udGFpbmVyOiAnI21hcmdpbmFsLWJhcicsXG5cdFx0XHRcdFx0ZGF0YTogZ2VvanNvbi5mZWF0dXJlcyxcblx0XHRcdFx0XHRudW1lcmF0b3IoaW5WaWV3SURzKXtcblx0XHRcdFx0XHRcdGlmICggaW5WaWV3SURzLnNpemUgPT09IDAgKXtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMubWluO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0dGhpcy5maWx0ZXJlZERhdGEgPSB0aGlzLmRhdGEuZmlsdGVyKGVhY2ggPT4gaW5WaWV3SURzLmhhcyhlYWNoLnByb3BlcnRpZXMuaWQpKTtcblx0XHRcdFx0XHRcdHJldHVybiBkMy5tZWFuKHRoaXMuZmlsdGVyZWREYXRhLCBkID0+IGQucHJvcGVydGllcy5kZHBaKTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGRlbm9taW5hdG9yKCl7IFxuXHRcdFx0XHRcdFx0IHJldHVybiB0aGlzLnpTY29yZXMubWF4O1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0dGV4dEZ1bmN0aW9uKG4peyBcblx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0aWYgKGluVmlld0lEcy5zaXplID09PSAwKXtcblx0XHRcdFx0XHRcdFx0cmV0dXJuICdub25lIGluIHZpZXcnO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuICckJyArIGQzLmZvcm1hdChcIiwuMGZcIikoKHRoaXMuelNjb3Jlcy5tZWFuICsgdGhpcy56U2NvcmVzLnNkICogbiApICkgKyAnICh6ID0gJyArIGQzLmZvcm1hdChcIi4yZlwiKShuKSArICcpJztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pXG5cblx0XHRcdCk7IC8vIGVuZCBwdXNoXG5cdFx0XHRnYXRlQ2hlY2srKztcblx0XHRcdHZhciBpbmZvcm1hdGlvbiA9IHtcblx0XHRcdFx0bWFwZmVhdHVyZTogJ1RoaXMgbWFwIHJlcHJlc2VudHMgbmV3IGZsb29kIGluc3VyYW5jZSBwb2xpY2llcyBpbml0aWF0ZWQgYmV0d2VlbiBKdW5lIGFuZCBEZWNlbWJlciAyMDE0LiBUaGUgYW5hbHlzaXMgaW4gdGhlIHJlbGF0ZWQgcGFwZXIgcmV2b2x2ZXMgYXJvdW5kIHRoZSBkZWNpc2lvbiB3aGV0aGVyIHRvIHBheSBtb3JlIGZvciBhIGxvd2VyIGRlZHVjdGlibGUuJyxcblx0XHRcdFx0ZGVkdWN0aWJsZWJhcjogJ1RoZSBzdGFuZGFyZCBkZWR1Y3RpYmxlIGlzICQ1LDAwMDsgYW55dGhpbmcgbGVzcyBpcyBjb25zaWRlciBhIGxvdyBkZWR1Y3RpYmxlLicsXG5cdFx0XHRcdHZhbHVlYmFyOiAnVGhpcyBjYWxjdWxhdGlvbiBpZ25vcmVzIGV4dHJlbWUgb3V0bGllcnMgKHZhbHVlcyBhYm92ZSAkMjBNKSB3aGljaCBhcmUgbGlrZWx5IGR1ZSB0byBkYXRhIGVycm9yczsgaXQgYWxzbyBpZ25vcmVzIG92ZXJyZXByZXNlbnRlZCB2YWx1ZXMgb2YgJDI1MCwwMDAsIHRoZSBtYWpvcml0eSBvZiB3aGljaCBhcmUgbGlrZWx5IGR1ZSB0byByZXBvcnRpbmcgZXJyb3JzLicsXG5cdFx0XHRcdGluY29tZWJhcjogJ01lZGlhbiBob3VzZWhvbGQgaW5jb21lIGlzIGEgcHJvcGVydHkgb2YgdGhlIGNlbnN1cyB0cmFjdCBpbiB3aGljaCB0aGUgcG9saWN5aG9sZGVyIHJlc2lkZXMuIEVhY2ggY2Vuc3VzIHRyYWN0IHdpdGggYW4gYXNzb2NpYXRlZCBwb2xpY3kgaW4gdmlldyBpcyBjb3VudGVkIG9uY2UuJyxcblx0XHRcdFx0Y292ZXJhZ2ViYXI6ICdGbG9vZCBjb3ZlcmFnZSBpcyBsaW1pdGVkIHRvICQyNTAsMDAwLidcblx0XHRcdH07XG5cdFx0XHR2YXIgaW5mb01hcmtzID0gZDMuc2VsZWN0QWxsKCcuaGFzLWluZm8tbWFyaycpXG5cdFx0XHRcdC5hcHBlbmQoJ3N2ZycpXG5cdFx0XHRcdC5kYXR1bShpbmZvcm1hdGlvbilcblx0XHRcdFx0LmF0dHIoJ3dpZHRoJywnMTJweCcpXG5cdFx0XHRcdC5hdHRyKCd2aWV3Qm94JywgJzAgMCAxMiAxMicpXG5cdFx0XHRcdC5hdHRyKCdjbGFzcycsJ2luZm8tbWFyaycpXG5cdFx0XHRcdC5hcHBlbmQoJ2cnKTtcblxuXHRcdFx0aW5mb01hcmtzXG5cdFx0XHRcdC5jYWxsKHRpcClcblx0XHRcdFx0Lm9uKCdtb3VzZWVudGVyJywgZnVuY3Rpb24oZCl7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coZDMuZXZlbnQpO1xuXHRcdFx0XHRcdHRpcC5zaG93LmNhbGwodGhpcyxkKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0Lm9uKCdtb3VzZWxlYXZlJywgdGlwLmhpZGUpO1xuXHRcdFx0XHRcblxuXHRcdFx0aW5mb01hcmtzXG5cdFx0XHRcdC5hcHBlbmQoJ2NpcmNsZScpXG5cdFx0XHRcdC5hdHRyKCdjbGFzcycsICdpbmZvLW1hcmstYmFja2dyb3VuZCcpIFxuXHRcdFx0XHQuYXR0cignY3gnLDYpXG5cdFx0XHRcdC5hdHRyKCdjeScsNilcblx0XHRcdFx0LmF0dHIoJ3InLDYpO1xuXHRcdFx0XHRcblxuXHRcdFx0aW5mb01hcmtzXG5cdFx0XHRcdC5hcHBlbmQoJ3BhdGgnKVxuXHRcdFx0XHQuYXR0cignY2xhc3MnLCdpbmZvLW1hcmstZm9yZWdyb3VuZCcpXG5cdFx0XHRcdC5hdHRyKCdkJywgYE01LjIzMSw3LjYxNFY2LjkxNWMwLTAuMzY0LDAuMDg0LTAuNzAyLDAuMjU0LTEuMDE2YzAuMTY5LTAuMzEzLDAuMzU1LTAuNjEzLDAuNTU5LTAuOTAyXG5cdFx0XHRcdFx0XHRcdGMwLjIwMy0wLjI4NywwLjM5LTAuNTY0LDAuNTU5LTAuODMxQzYuNzcyLDMuOSw2Ljg1NywzLjYzMSw2Ljg1NywzLjM2YzAtMC4xOTUtMC4wODEtMC4zNTctMC4yNDItMC40ODlcblx0XHRcdFx0XHRcdFx0QzYuNDU1LDIuNzQsNi4yNjgsMi42NzQsNi4wNTcsMi42NzRjLTAuMTUzLDAtMC4yODgsMC4wMzQtMC40MDcsMC4xMDJjLTAuMTE4LDAuMDY4LTAuMjIyLDAuMTU1LTAuMzExLDAuMjZcblx0XHRcdFx0XHRcdFx0QzUuMjUsMy4xNDIsNS4xNzcsMy4yNjEsNS4xMTcsMy4zOTJjLTAuMDYsMC4xMzEtMC4wOTcsMC4yNjQtMC4xMTQsMC40bC0xLjQ2LTAuNDA3QzMuNzA0LDIuNzUsNC4wMDgsMi4yNjEsNC40NTcsMS45MTlcblx0XHRcdFx0XHRcdFx0YzAuNDQ4LTAuMzQzLDEuMDE2LTAuNTE1LDEuNzAxLTAuNTE1YzAuMzEzLDAsMC42MDcsMC4wNDQsMC44ODIsMC4xMzNDNy4zMTYsMS42MjYsNy41NiwxLjc1Niw3Ljc3MSwxLjkyNVxuXHRcdFx0XHRcdFx0XHRDNy45ODIsMi4wOTUsOC4xNSwyLjMwNiw4LjI3MiwyLjU2YzAuMTIzLDAuMjU0LDAuMTg1LDAuNTQ2LDAuMTg1LDAuODc2YzAsMC40MjMtMC4wOTYsMC43ODUtMC4yODYsMS4wODVcblx0XHRcdFx0XHRcdFx0Yy0wLjE5MSwwLjMwMS0wLjQsMC41ODYtMC42MjksMC44NTdDNy4zMTQsNS42NSw3LjEwNCw1LjkyMyw2LjkxNCw2LjE5OFM2LjYyOCw2Ljc4OSw2LjYyOCw3LjE0NHYwLjQ3SDUuMjMxeiBNNS4wNzksMTAuNjk5VjguODk2XG5cdFx0XHRcdFx0XHRcdGgxLjc1MnYxLjgwM0g1LjA3OXpgXG5cdFx0XHRcdCk7XG5cblx0XHRcdC8qZDMuc2VsZWN0QWxsKCcuZmlndXJlLXRpdGxlLmhhcy1pbmZvLW1hcmsnKVxuXHRcdFx0XHQuYXBwZW5kKCdhJylcblx0XHRcdFx0LmF0dHIoJ3RpdGxlJywgZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRyZXR1cm4gaW5mb3JtYXRpb25bZDMuc2VsZWN0KHRoaXMucGFyZW50Tm9kZS5wYXJlbnROb2RlKS5hdHRyKCdpZCcpLnJlcGxhY2UoJy0nLCcnKV07XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5hdHRyKCdocmVmJywnIycpXG5cdFx0XHRcdC5hdHRyKCdjbGFzcycsJ2luZm8tbWFyayBzbWFsbCcpXG5cdFx0XHRcdC50ZXh0KCc/Jyk7XG5cdFx0XHRkMy5zZWxlY3RBbGwoJy5pbmZvLW1hcmsnKVxuXHRcdFx0XHQub24oJ2NsaWNrJywoKSA9PiB7XG5cdFx0XHRcdFx0ZDMuZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0fSk7Ki9cblxuXHRcdFx0Z2F0ZSgpO1xuXHRcdFx0Ly9hZGRDbHVzdGVyTGF5ZXJzKHJ0bik7XG5cdFx0XHRcblx0XHR9KTsgLy8gZW5kIGQzIGNzdlxuXHR9IC8vIGVuZCB0b0dlb0pTT05cblx0Lyp2YXIgZmVhdHVyZXNJblZpZXcgPSB7XG5cdFx0cmVuZGVyKCl7XG5cdFx0XHR0aGlzLmNoYXJ0ID0gbmV3IEJhcnMuQmFyKHtcblx0XHRcdFx0bWFyZ2luOiB7XG5cdFx0XHRcdFx0dG9wOjAsXG5cdFx0XHRcdFx0cmlnaHQ6MCxcblx0XHRcdFx0XHRib3R0b206MCxcblx0XHRcdFx0XHRsZWZ0OjBcblx0XHRcdFx0fSxcblx0XHRcdFx0aGVpZ2h0VG9XaWR0aDogMC4wMyxcblx0XHRcdFx0Y29udGFpbmVyOiAnI3RvdGFsLXZpZXcnLFxuXHRcdFx0XHR0b3RhbDogZ2VvanNvbi5mZWF0dXJlcy5sZW5ndGhcblx0XHRcdH0pO1xuXG5cdFx0XHQvKnRoaXMudG90YWwgPSBnZW9qc29uLmZlYXR1cmVzLmxlbmd0aDtcblx0XHRcdHRoaXMuc3ZnID0gZDMuc2VsZWN0KCcjdG90YWwtdmlldycpXG5cdFx0XHRcdC5hcHBlbmQoJ3N2ZycpXG5cdFx0XHRcdC5hdHRyKCd3aWR0aCcsICcxMDAlJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3htbG5zJywnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnKVxuXHQgICAgICAgICAgICAuYXR0cigndmVyc2lvbicsJzEuMScpIFxuXHQgICAgICAgICAgICAuYXR0cigndmlld0JveCcsICcwIDAgMTAwIDMnKTtcblxuXHQgICAgICAgIHRoaXMuYmFja2dyb3VuZCA9IHRoaXMuc3ZnLmFwcGVuZCgnbGluZScpXG5cdCAgICAgICAgXHQuY2xhc3NlZCgnYmFja2dyb3VuZC1saW5lJywgdHJ1ZSlcblx0ICAgICAgICBcdC5hdHRyKCd4MCcsMClcblx0ICAgICAgICBcdC5hdHRyKCd5MCcsMClcblx0ICAgICAgICBcdC5hdHRyKCd4MScsMTAwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kxJywwKTtcblxuXHQgICAgICAgIHRoaXMubGluZSA9IHRoaXMuc3ZnLmFwcGVuZCgnbGluZScpXG5cdCAgICAgICAgXHQuY2xhc3NlZCgndG90YWwtbGluZScsIHRydWUpXG5cdCAgICAgICAgXHQuYXR0cigneDAnLDApXG5cdCAgICAgICAgXHQuYXR0cigneTAnLDApXG5cdCAgICAgICAgXHQuYXR0cigneDEnLDApXG5cdCAgICAgICAgXHQuYXR0cigneTEnLDApO1xuXG5cdCAgICAgICAgdGhpcy50ZXh0ID0gZDMuc2VsZWN0KCcjdG90YWwtdmlldycpXG5cdCAgICAgICAgXHQuYXBwZW5kKCdzcGFuJylcblx0ICAgICAgICBcdC50ZXh0KCgpID0+IGAke2QzLmZvcm1hdChcIixcIikodGhpcy50b3RhbCl9IG9mICR7ZDMuZm9ybWF0KFwiLFwiKSh0aGlzLnRvdGFsKX0gaW4gdmlld2AgKTtcblx0ICAgICAgICBcdFxuXG5cdFx0XHR0aGlzLnVwZGF0ZShjb3VudEZlYXR1cmVzKCkpO1xuXHRcdH0sXG5cdFx0dXBkYXRlKG4pe1xuXHRcdFx0LypkMy5zZWxlY3QoJyN0b3RhbC1pbi12aWV3Jylcblx0XHRcdFx0LnRleHQoKCkgPT4gZDMuZm9ybWF0KFwiLFwiKShuKSArICcgb2YgJyArIGQzLmZvcm1hdChcIixcIikodGhpcy50b3RhbCkgKyAnIHByb3BlcnRpZXMgaW4gdmlldycpOyovXG5cdFx0XHQvKnRoaXMubGluZVxuXHRcdFx0XHQudHJhbnNpdGlvbigpLmR1cmF0aW9uKDIwMClcblx0XHRcdFx0LmF0dHIoJ3gxJywgKCkgPT4gKCBuIC8gdGhpcy50b3RhbCkgKiAxMDAgKTtcblx0XHRcdHRoaXMudGV4dFxuXHRcdFx0XHQudGV4dCgoKSA9PiBgJHtkMy5mb3JtYXQoXCIsXCIpKG4pfSBvZiAke2QzLmZvcm1hdChcIixcIikodGhpcy50b3RhbCl9IGluIHZpZXdgICk7XG4gIFxuXHRcdH0qLyBcblxuXHRcblx0dmFyIGluVmlld0lEcyA9IG5ldyBTZXQoKTtcblx0ZnVuY3Rpb24gY291bnRGZWF0dXJlcygpeyBcblx0XHQvKiBqc2hpbnQgbGF4YnJlYWs6dHJ1ZSAqL1xuXHRcdGluVmlld0lEcy5jbGVhcigpOyBcblx0XHQvL3ZhciBjb3VudCA9IDA7XG5cdFx0dmFyIGJvdW5kcyA9IHRoZU1hcC5nZXRCb3VuZHMoKTtcblx0XHRnZW9qc29uLmZlYXR1cmVzLmZvckVhY2goZWFjaCA9PiB7XG5cdFx0XHRpZiAoICAgIGVhY2gucHJvcGVydGllcy5sb25naXR1ZGUgPj0gYm91bmRzLl9zdy5sbmcgXG5cdFx0XHRcdCAmJiBlYWNoLnByb3BlcnRpZXMubG9uZ2l0dWRlIDw9IGJvdW5kcy5fbmUubG5nIFxuXHRcdFx0XHQgJiYgZWFjaC5wcm9wZXJ0aWVzLmxhdGl0dWRlICA+PSBib3VuZHMuX3N3LmxhdCBcblx0XHRcdFx0ICYmIGVhY2gucHJvcGVydGllcy5sYXRpdHVkZSAgPD0gYm91bmRzLl9uZS5sYXQgKXtcblx0XHRcdFx0aW5WaWV3SURzLmFkZChlYWNoLnByb3BlcnRpZXMuaWQpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdGNvbnNvbGUubG9nKGluVmlld0lEcyk7XG5cdH1cblx0dGhlTWFwLm9uKCdtb3ZlZW5kJywgZnVuY3Rpb24oKXtcblx0XHR1cGRhdGVBbGwoKTtcblx0fSk7XG5cdHRoZU1hcC5vbignem9vbWVuZCcsIGZ1bmN0aW9uKGFyZyl7XG5cdFx0Y29uc29sZS5sb2coYXJnKTtcblx0XHR1cGRhdGVBbGwoKTtcblx0XHRkMy5zZWxlY3QoJyNzaXplLWxlZ2VuZCcpXG5cdFx0XHQuY2xhc3NlZCgnc2hvdycsIHRoZU1hcC5nZXRab29tKCkgPj0gc2l6ZVpvb21UaHJlc2hvbGQpO1xuXHR9KTtcblx0ZnVuY3Rpb24gdXBkYXRlQWxsKCl7XG5cdFx0Y291bnRGZWF0dXJlcygpO1xuXHRcdHRoZUNoYXJ0cy5mb3JFYWNoKGVhY2ggPT4gZWFjaC51cGRhdGUoaW5WaWV3SURzKSk7XG5cdH1cblx0dGhlTWFwLm9uKFwibW91c2Vtb3ZlXCIsIFwicG9pbnRzLWRhdGEtZHJpdmVuXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgfSk7XG5cbiAgIFxuXG5cdHJldHVybiB0aGVNYXA7XG4gICBcbn0oKSk7IC8vIGVuZCBJSUZFICIsImV4cG9ydCBjb25zdCBCYXJzID0gKGZ1bmN0aW9uKCl7XG5cblx0dmFyIEJhciA9IGZ1bmN0aW9uKGNvbmZpZ09iamVjdCl7IC8vIG1hcmdpbnMge30sIGhlaWdodCAjLCB3aWR0aCAjLCBjb250YWluZXJJRCwgZGF0YVBhdGhcblx0ICAgIHRoaXMuc2V0dXAoY29uZmlnT2JqZWN0KTtcblx0fTtcblxuXHRCYXIucHJvdG90eXBlID0ge1xuXHRcdHNldHVwKGNvbmZpZ09iamVjdCl7IC8vIHNvbWUgb2Ygc2V0dXAgaXMgY29tbW9uIHRvIGFsbCBjaGFydHMgYW5kIGNvdWxkIGJlIGhhbmRsZWQgYnkgcHJvdG90eXBpY2FsIGluaGVyaXRhbmNlXG5cdCAgICBcdGNvbnNvbGUubG9nKGNvbmZpZ09iamVjdCk7XG5cdCAgICAgICAgdmFyIHZpZXdCb3ggPSAnMCAwIDEwMCAnICsgTWF0aC5yb3VuZChjb25maWdPYmplY3QuaGVpZ2h0VG9XaWR0aCAqIDEwMCk7XG5cdCAgICAgICAgdGhpcy5jb250YWluZXIgPSBjb25maWdPYmplY3QuY29udGFpbmVyO1xuXHQgICAgICAgIHRoaXMubWFyZ2luID0gY29uZmlnT2JqZWN0Lm1hcmdpbjtcblx0ICAgICAgICB0aGlzLndpZHRoID0gMTAwIC0gdGhpcy5tYXJnaW4ubGVmdCAtIHRoaXMubWFyZ2luLnJpZ2h0O1xuXHQgICAgICAgIHRoaXMuaGVpZ2h0ID0gY29uZmlnT2JqZWN0LmhlaWdodFRvV2lkdGggKiAxMDAgLSB0aGlzLm1hcmdpbi50b3AgLSB0aGlzLm1hcmdpbi5ib3R0b207XG5cdCAgICAgICAgdGhpcy50aXRsZSA9IGNvbmZpZ09iamVjdC50aXRsZTtcblx0ICAgICAgICB0aGlzLmluZm9NYXJrID0gY29uZmlnT2JqZWN0LmluZm9NYXJrIHx8IGZhbHNlO1xuXHQgICAgICAgIHRoaXMuY29tcGFyYXRvciA9IGNvbmZpZ09iamVjdC5jb21wYXJhdG9yO1xuXHQgICAgICAgIHRoaXMudHJ1bmNhdGVSaWdodCA9IGNvbmZpZ09iamVjdC50cnVuY2F0ZVJpZ2h0IHx8IGZhbHNlO1xuXHQgICAgICAgIHRoaXMuYmFja2dyb3VuZENvbG9yID0gY29uZmlnT2JqZWN0LmJhY2tncm91bmRDb2xvciB8fCAnZ3JheSc7XG5cdCAgICAgICAgdGhpcy5kYXRhID0gY29uZmlnT2JqZWN0LmRhdGE7XG5cdCAgICAgICAgdGhpcy5udW1lcmF0b3IgPSBjb25maWdPYmplY3QubnVtZXJhdG9yO1xuXHQgICAgICAgIHRoaXMuZGVub21pbmF0b3IgPSBjb25maWdPYmplY3QuZGVub21pbmF0b3I7XG5cdCAgICAgICAgdGhpcy50ZXh0RnVuY3Rpb24gPSBjb25maWdPYmplY3QudGV4dEZ1bmN0aW9uO1xuXHQgICAgICAgIHRoaXMuelNjb3JlcyA9IGNvbmZpZ09iamVjdC56U2NvcmVzIHx8IG51bGw7XG5cdCAgICAgICAgdGhpcy5taW4gPSBjb25maWdPYmplY3QubWluID8gY29uZmlnT2JqZWN0Lm1pbi5jYWxsKHRoaXMpIDogMDtcblx0ICAgICAgICAvL3RoaXMubWF4ID0gY29uZmlnT2JqZWN0Lm1heCA/IGNvbmZpZ09iamVjdC5tYXguY2FsbCh0aGlzKSA6IDEwMDtcblx0ICAgICAgICAvL3RoaXMuc2NhbGUgPSBkMy5zY2FsZUxpbmVhcigpLmRvbWFpbihbdGhpcy5taW4sdGhpcy5tYXhdKS5yYW5nZShbMCx0aGlzLndpZHRoXSk7XG5cdCAgICAgICAgXG5cblx0ICAgICAgICBkMy5zZWxlY3QodGhpcy5jb250YWluZXIpXG5cdCAgICAgICAgXHQuYXBwZW5kKCdzcGFuJylcblx0ICAgICAgICBcdC5jbGFzc2VkKCdmaWd1cmUtdGl0bGUnLCB0cnVlKVxuXHQgICAgICAgIFx0LmNsYXNzZWQoJ2hhcy1pbmZvLW1hcmsnLCAoKSA9PiB0aGlzLmluZm9NYXJrKVxuXHQgICAgICAgIFx0LnRleHQodGhpcy50aXRsZSk7XG5cblx0ICAgICAgICB0aGlzLnN2ZyA9IGQzLnNlbGVjdCh0aGlzLmNvbnRhaW5lcilcblx0ICAgICAgICAgICAgLmFwcGVuZCgnc3ZnJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3dpZHRoJywgJzEwMCUnKVxuXHQgICAgICAgICAgICAuYXR0cigneG1sbnMnLCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycpXG5cdCAgICAgICAgICAgIC5hdHRyKCd2ZXJzaW9uJywnMS4xJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3ZpZXdCb3gnLCB2aWV3Qm94KVxuXHQgICAgICAgICAgICAuYXBwZW5kKCdnJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIHRoaXMubWFyZ2luLmxlZnQgKyAnLCcgKyB0aGlzLm1hcmdpbi50b3AgKyAnKScpO1xuXG5cdCAgICAgICAgdGhpcy5iYWNrZ3JvdW5kID0gdGhpcy5zdmcuYXBwZW5kKCdsaW5lJylcblx0ICAgICAgICBcdC5jbGFzc2VkKCdiYWNrZ3JvdW5kLWxpbmUtJyArIHRoaXMuYmFja2dyb3VuZENvbG9yLCB0cnVlKVxuXHQgICAgICAgIFx0LmF0dHIoJ3gwJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kwJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3gxJyx0aGlzLndpZHRoKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kxJywwKTtcblxuXHQgICAgICAgIHRoaXMubGluZSA9IHRoaXMuc3ZnLmFwcGVuZCgnbGluZScpXG5cdCAgICAgICAgXHQuY2xhc3NlZCgnZm9yZWdyb3VuZC1saW5lJywgdHJ1ZSlcblx0ICAgICAgICBcdC5hdHRyKCd4MCcsMClcblx0ICAgICAgICBcdC5hdHRyKCd5MCcsMClcblx0ICAgICAgICBcdC5hdHRyKCd4MScsMClcblx0ICAgICAgICBcdC5hdHRyKCd5MScsMCk7XG5cblx0ICAgICAgICB0aGlzLnRleHQgPSBkMy5zZWxlY3QodGhpcy5jb250YWluZXIpXG5cdCAgICAgICAgXHQuYXBwZW5kKCdzcGFuJylcblx0ICAgICAgICBcdC5hdHRyKCdjbGFzcycsJ3ZhbHVlJyk7XG5cdCAgICAgICAgXHRcblxuXHQgICAgICAgIC8vdGhpcy51cGRhdGUodGhpcy5udW1lcmF0b3IoKSk7ICBcbiAgICAgICAgfSxcbiAgICAgICAgdXBkYXRlKGluVmlld0lEcyl7XG4gICAgICAgIFx0Y29uc29sZS5sb2codGhpcyk7XG5cdFx0XHR2YXIgbiA9IHRoaXMubnVtZXJhdG9yKGluVmlld0lEcyksXG5cdFx0XHRcdGQgPSB0aGlzLmRlbm9taW5hdG9yKGluVmlld0lEcyk7IFxuXHRcdFx0ZDMuc2VsZWN0KHRoaXMuY29udGFpbmVyKVxuXHRcdFx0XHQuY2xhc3NlZCgnb3ZlcmZsb3cnLCBuID4gZCApO1xuXG4gICAgICAgIFx0aWYgKHRoaXMudHJ1bmNhdGVSaWdodCl7XG4gICAgICAgIFx0XHRkID0gdGhpcy5taW4gPSAwIC0gZDtcbiAgICAgICAgXHR9IGVsc2UgaWYgKCB0aGlzLm1pbiA8IDAgJiYgZCA+IDAgKSB7XG4gICAgICAgIFx0XHRpZiAoTWF0aC5hYnModGhpcy5taW4pIDwgZCkge1xuICAgICAgICBcdFx0XHR0aGlzLm1pbiA9IDAgLSBkO1xuICAgICAgICBcdFx0fSBlbHNlIHtcbiAgICAgICAgXHRcdFx0ZCA9IDAgLSB0aGlzLm1pbjtcbiAgICAgICAgXHRcdH1cbiAgICAgICAgXHR9XG4gICAgICAgIFx0Y29uc29sZS5sb2coJ21pbjogJyArIHRoaXMubWluICsgJzsgbWF4OiAnICsgZCk7XG5cdFx0XHR0aGlzLnNjYWxlID0gZDMuc2NhbGVMaW5lYXIoKS5kb21haW4oW3RoaXMubWluLGRdKS5yYW5nZShbMCx0aGlzLndpZHRoXSkuY2xhbXAodHJ1ZSk7XG5cdFx0XHR0aGlzLmxpbmVcblx0XHRcdFx0LnRyYW5zaXRpb24oKS5kdXJhdGlvbigyMDApXG5cdFx0XHRcdC5hdHRyKCd4MScsICgpID0+IHRoaXMuc2NhbGUobikpO1xuXHRcdFx0dGhpcy50ZXh0XG5cdFx0XHRcdC50ZXh0KCgpID0+IHRoaXMudGV4dEZ1bmN0aW9uKG4sZCkpO1xuXHRcdH1cblx0fTtcblxuXHRyZXR1cm4ge1xuXHRcdEJhclxuXHR9O1xuICAgICAgICBcbn0pKCk7IiwiLy8gZDMudGlwXG4vLyBDb3B5cmlnaHQgKGMpIDIwMTMgSnVzdGluIFBhbG1lclxuLy8gRVM2IC8gRDMgdjQgQWRhcHRpb24gQ29weXJpZ2h0IChjKSAyMDE2IENvbnN0YW50aW4gR2F2cmlsZXRlXG4vLyBSZW1vdmFsIG9mIEVTNiBmb3IgRDMgdjQgQWRhcHRpb24gQ29weXJpZ2h0IChjKSAyMDE2IERhdmlkIEdvdHpcbi8vXG4vLyBUb29sdGlwcyBmb3IgZDMuanMgU1ZHIHZpc3VhbGl6YXRpb25zXG5cbmV4cG9ydCBjb25zdCBkM1RpcCA9IChmdW5jdGlvbigpe1xuICBkMy5mdW5jdG9yID0gZnVuY3Rpb24gZnVuY3Rvcih2KSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2ID09PSBcImZ1bmN0aW9uXCIgPyB2IDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdjtcbiAgICB9O1xuICB9O1xuXG4gIGQzLnRpcCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIGRpcmVjdGlvbiA9IGQzX3RpcF9kaXJlY3Rpb24sXG4gICAgICAgIG9mZnNldCAgICA9IGQzX3RpcF9vZmZzZXQsXG4gICAgICAgIGh0bWwgICAgICA9IGQzX3RpcF9odG1sLFxuICAgICAgICBub2RlICAgICAgPSBpbml0Tm9kZSgpLFxuICAgICAgICBzdmcgICAgICAgPSBudWxsLFxuICAgICAgICBwb2ludCAgICAgPSBudWxsLFxuICAgICAgICB0YXJnZXQgICAgPSBudWxsXG5cbiAgICBmdW5jdGlvbiB0aXAodmlzKSB7XG4gICAgICBzdmcgPSBnZXRTVkdOb2RlKHZpcylcbiAgICAgIHBvaW50ID0gc3ZnLmNyZWF0ZVNWR1BvaW50KClcbiAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQobm9kZSlcbiAgICB9XG5cbiAgICAvLyBQdWJsaWMgLSBzaG93IHRoZSB0b29sdGlwIG9uIHRoZSBzY3JlZW5cbiAgICAvL1xuICAgIC8vIFJldHVybnMgYSB0aXBcbiAgICB0aXAuc2hvdyA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpXG4gICAgICBpZihhcmdzW2FyZ3MubGVuZ3RoIC0gMV0gaW5zdGFuY2VvZiBTVkdFbGVtZW50KSB0YXJnZXQgPSBhcmdzLnBvcCgpXG4gICAgICB2YXIgY29udGVudCA9IGh0bWwuYXBwbHkodGhpcywgYXJncyksXG4gICAgICAgICAgcG9mZnNldCA9IG9mZnNldC5hcHBseSh0aGlzLCBhcmdzKSxcbiAgICAgICAgICBkaXIgICAgID0gZGlyZWN0aW9uLmFwcGx5KHRoaXMsIGFyZ3MpLFxuICAgICAgICAgIG5vZGVsICAgPSBnZXROb2RlRWwoKSxcbiAgICAgICAgICBpICAgICAgID0gZGlyZWN0aW9ucy5sZW5ndGgsXG4gICAgICAgICAgY29vcmRzLFxuICAgICAgICAgIHNjcm9sbFRvcCAgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wIHx8IGRvY3VtZW50LmJvZHkuc2Nyb2xsVG9wLFxuICAgICAgICAgIHNjcm9sbExlZnQgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsTGVmdCB8fCBkb2N1bWVudC5ib2R5LnNjcm9sbExlZnRcblxuICAgICAgbm9kZWwuaHRtbChjb250ZW50KVxuICAgICAgICAuc3R5bGUoJ3Bvc2l0aW9uJywgJ2Fic29sdXRlJylcbiAgICAgICAgLnN0eWxlKCdvcGFjaXR5JywgMSlcbiAgICAgICAgLnN0eWxlKCdwb2ludGVyLWV2ZW50cycsICdhbGwnKVxuXG4gICAgICB3aGlsZShpLS0pIG5vZGVsLmNsYXNzZWQoZGlyZWN0aW9uc1tpXSwgZmFsc2UpXG4gICAgICBjb29yZHMgPSBkaXJlY3Rpb25fY2FsbGJhY2tzW2Rpcl0uYXBwbHkodGhpcylcbiAgICAgIG5vZGVsLmNsYXNzZWQoZGlyLCB0cnVlKVxuICAgICAgICAuc3R5bGUoJ3RvcCcsIChjb29yZHMudG9wICsgIHBvZmZzZXRbMF0pICsgc2Nyb2xsVG9wICsgJ3B4JylcbiAgICAgICAgLnN0eWxlKCdsZWZ0JywgKGNvb3Jkcy5sZWZ0ICsgcG9mZnNldFsxXSkgKyBzY3JvbGxMZWZ0ICsgJ3B4JylcblxuICAgICAgcmV0dXJuIHRpcFxuICAgIH1cblxuICAgIC8vIFB1YmxpYyAtIGhpZGUgdGhlIHRvb2x0aXBcbiAgICAvL1xuICAgIC8vIFJldHVybnMgYSB0aXBcbiAgICB0aXAuaGlkZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG5vZGVsID0gZ2V0Tm9kZUVsKClcbiAgICAgIG5vZGVsXG4gICAgICAgIC5zdHlsZSgnb3BhY2l0eScsIDApXG4gICAgICAgIC5zdHlsZSgncG9pbnRlci1ldmVudHMnLCAnbm9uZScpXG4gICAgICByZXR1cm4gdGlwXG4gICAgfVxuXG4gICAgLy8gUHVibGljOiBQcm94eSBhdHRyIGNhbGxzIHRvIHRoZSBkMyB0aXAgY29udGFpbmVyLiAgU2V0cyBvciBnZXRzIGF0dHJpYnV0ZSB2YWx1ZS5cbiAgICAvL1xuICAgIC8vIG4gLSBuYW1lIG9mIHRoZSBhdHRyaWJ1dGVcbiAgICAvLyB2IC0gdmFsdWUgb2YgdGhlIGF0dHJpYnV0ZVxuICAgIC8vXG4gICAgLy8gUmV0dXJucyB0aXAgb3IgYXR0cmlidXRlIHZhbHVlXG4gICAgdGlwLmF0dHIgPSBmdW5jdGlvbihuLCB2KSB7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIgJiYgdHlwZW9mIG4gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBnZXROb2RlRWwoKS5hdHRyKG4pXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgYXJncyA9ICBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpXG4gICAgICAgIGQzLnNlbGVjdGlvbi5wcm90b3R5cGUuYXR0ci5hcHBseShnZXROb2RlRWwoKSwgYXJncylcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRpcFxuICAgIH1cblxuICAgIC8vIFB1YmxpYzogUHJveHkgc3R5bGUgY2FsbHMgdG8gdGhlIGQzIHRpcCBjb250YWluZXIuICBTZXRzIG9yIGdldHMgYSBzdHlsZSB2YWx1ZS5cbiAgICAvL1xuICAgIC8vIG4gLSBuYW1lIG9mIHRoZSBwcm9wZXJ0eVxuICAgIC8vIHYgLSB2YWx1ZSBvZiB0aGUgcHJvcGVydHlcbiAgICAvL1xuICAgIC8vIFJldHVybnMgdGlwIG9yIHN0eWxlIHByb3BlcnR5IHZhbHVlXG4gICAgdGlwLnN0eWxlID0gZnVuY3Rpb24obiwgdikge1xuICAgICAgLy8gZGVidWdnZXI7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIgJiYgdHlwZW9mIG4gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBnZXROb2RlRWwoKS5zdHlsZShuKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgICBpZiAoYXJncy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICB2YXIgc3R5bGVzID0gYXJnc1swXTtcbiAgICAgICAgICBPYmplY3Qua2V5cyhzdHlsZXMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgICByZXR1cm4gZDMuc2VsZWN0aW9uLnByb3RvdHlwZS5zdHlsZS5hcHBseShnZXROb2RlRWwoKSwgW2tleSwgc3R5bGVzW2tleV1dKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGlwXG4gICAgfVxuXG4gICAgLy8gUHVibGljOiBTZXQgb3IgZ2V0IHRoZSBkaXJlY3Rpb24gb2YgdGhlIHRvb2x0aXBcbiAgICAvL1xuICAgIC8vIHYgLSBPbmUgb2Ygbihub3J0aCksIHMoc291dGgpLCBlKGVhc3QpLCBvciB3KHdlc3QpLCBudyhub3J0aHdlc3QpLFxuICAgIC8vICAgICBzdyhzb3V0aHdlc3QpLCBuZShub3J0aGVhc3QpIG9yIHNlKHNvdXRoZWFzdClcbiAgICAvL1xuICAgIC8vIFJldHVybnMgdGlwIG9yIGRpcmVjdGlvblxuICAgIHRpcC5kaXJlY3Rpb24gPSBmdW5jdGlvbih2KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBkaXJlY3Rpb25cbiAgICAgIGRpcmVjdGlvbiA9IHYgPT0gbnVsbCA/IHYgOiBkMy5mdW5jdG9yKHYpXG5cbiAgICAgIHJldHVybiB0aXBcbiAgICB9XG5cbiAgICAvLyBQdWJsaWM6IFNldHMgb3IgZ2V0cyB0aGUgb2Zmc2V0IG9mIHRoZSB0aXBcbiAgICAvL1xuICAgIC8vIHYgLSBBcnJheSBvZiBbeCwgeV0gb2Zmc2V0XG4gICAgLy9cbiAgICAvLyBSZXR1cm5zIG9mZnNldCBvclxuICAgIHRpcC5vZmZzZXQgPSBmdW5jdGlvbih2KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBvZmZzZXRcbiAgICAgIG9mZnNldCA9IHYgPT0gbnVsbCA/IHYgOiBkMy5mdW5jdG9yKHYpXG5cbiAgICAgIHJldHVybiB0aXBcbiAgICB9XG5cbiAgICAvLyBQdWJsaWM6IHNldHMgb3IgZ2V0cyB0aGUgaHRtbCB2YWx1ZSBvZiB0aGUgdG9vbHRpcFxuICAgIC8vXG4gICAgLy8gdiAtIFN0cmluZyB2YWx1ZSBvZiB0aGUgdGlwXG4gICAgLy9cbiAgICAvLyBSZXR1cm5zIGh0bWwgdmFsdWUgb3IgdGlwXG4gICAgdGlwLmh0bWwgPSBmdW5jdGlvbih2KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBodG1sXG4gICAgICBodG1sID0gdiA9PSBudWxsID8gdiA6IGQzLmZ1bmN0b3IodilcblxuICAgICAgcmV0dXJuIHRpcFxuICAgIH1cblxuICAgIC8vIFB1YmxpYzogZGVzdHJveXMgdGhlIHRvb2x0aXAgYW5kIHJlbW92ZXMgaXQgZnJvbSB0aGUgRE9NXG4gICAgLy9cbiAgICAvLyBSZXR1cm5zIGEgdGlwXG4gICAgdGlwLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmKG5vZGUpIHtcbiAgICAgICAgZ2V0Tm9kZUVsKCkucmVtb3ZlKCk7XG4gICAgICAgIG5vZGUgPSBudWxsO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRpcDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkM190aXBfZGlyZWN0aW9uKCkgeyByZXR1cm4gJ24nIH1cbiAgICBmdW5jdGlvbiBkM190aXBfb2Zmc2V0KCkgeyByZXR1cm4gWzAsIDBdIH1cbiAgICBmdW5jdGlvbiBkM190aXBfaHRtbCgpIHsgcmV0dXJuICcgJyB9XG5cbiAgICB2YXIgZGlyZWN0aW9uX2NhbGxiYWNrcyA9IHtcbiAgICAgIG46ICBkaXJlY3Rpb25fbixcbiAgICAgIHM6ICBkaXJlY3Rpb25fcyxcbiAgICAgIGU6ICBkaXJlY3Rpb25fZSxcbiAgICAgIHc6ICBkaXJlY3Rpb25fdyxcbiAgICAgIG53OiBkaXJlY3Rpb25fbncsXG4gICAgICBuZTogZGlyZWN0aW9uX25lLFxuICAgICAgc3c6IGRpcmVjdGlvbl9zdyxcbiAgICAgIHNlOiBkaXJlY3Rpb25fc2VcbiAgICB9O1xuXG4gICAgdmFyIGRpcmVjdGlvbnMgPSBPYmplY3Qua2V5cyhkaXJlY3Rpb25fY2FsbGJhY2tzKTtcblxuICAgIGZ1bmN0aW9uIGRpcmVjdGlvbl9uKCkge1xuICAgICAgdmFyIGJib3ggPSBnZXRTY3JlZW5CQm94KClcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRvcDogIGJib3gubi55IC0gbm9kZS5vZmZzZXRIZWlnaHQsXG4gICAgICAgIGxlZnQ6IGJib3gubi54IC0gbm9kZS5vZmZzZXRXaWR0aCAvIDJcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkaXJlY3Rpb25fcygpIHtcbiAgICAgIHZhciBiYm94ID0gZ2V0U2NyZWVuQkJveCgpXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0b3A6ICBiYm94LnMueSxcbiAgICAgICAgbGVmdDogYmJveC5zLnggLSBub2RlLm9mZnNldFdpZHRoIC8gMlxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpcmVjdGlvbl9lKCkge1xuICAgICAgdmFyIGJib3ggPSBnZXRTY3JlZW5CQm94KClcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRvcDogIGJib3guZS55IC0gbm9kZS5vZmZzZXRIZWlnaHQgLyAyLFxuICAgICAgICBsZWZ0OiBiYm94LmUueFxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpcmVjdGlvbl93KCkge1xuICAgICAgdmFyIGJib3ggPSBnZXRTY3JlZW5CQm94KClcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRvcDogIGJib3gudy55IC0gbm9kZS5vZmZzZXRIZWlnaHQgLyAyLFxuICAgICAgICBsZWZ0OiBiYm94LncueCAtIG5vZGUub2Zmc2V0V2lkdGhcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkaXJlY3Rpb25fbncoKSB7XG4gICAgICB2YXIgYmJveCA9IGdldFNjcmVlbkJCb3goKVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9wOiAgYmJveC5udy55IC0gbm9kZS5vZmZzZXRIZWlnaHQsXG4gICAgICAgIGxlZnQ6IGJib3gubncueCAtIG5vZGUub2Zmc2V0V2lkdGhcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkaXJlY3Rpb25fbmUoKSB7XG4gICAgICB2YXIgYmJveCA9IGdldFNjcmVlbkJCb3goKVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9wOiAgYmJveC5uZS55IC0gbm9kZS5vZmZzZXRIZWlnaHQsXG4gICAgICAgIGxlZnQ6IGJib3gubmUueFxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpcmVjdGlvbl9zdygpIHtcbiAgICAgIHZhciBiYm94ID0gZ2V0U2NyZWVuQkJveCgpXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0b3A6ICBiYm94LnN3LnksXG4gICAgICAgIGxlZnQ6IGJib3guc3cueCAtIG5vZGUub2Zmc2V0V2lkdGhcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkaXJlY3Rpb25fc2UoKSB7XG4gICAgICB2YXIgYmJveCA9IGdldFNjcmVlbkJCb3goKVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9wOiAgYmJveC5zZS55LFxuICAgICAgICBsZWZ0OiBiYm94LmUueFxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluaXROb2RlKCkge1xuICAgICAgdmFyIG5vZGUgPSBkMy5zZWxlY3QoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JykpXG4gICAgICBub2RlXG4gICAgICAgIC5zdHlsZSgncG9zaXRpb24nLCAnYWJzb2x1dGUnKVxuICAgICAgICAuc3R5bGUoJ3RvcCcsIDApXG4gICAgICAgIC5zdHlsZSgnb3BhY2l0eScsIDApXG4gICAgICAgIC5zdHlsZSgncG9pbnRlci1ldmVudHMnLCAnbm9uZScpXG4gICAgICAgIC5zdHlsZSgnYm94LXNpemluZycsICdib3JkZXItYm94JylcblxuICAgICAgcmV0dXJuIG5vZGUubm9kZSgpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U1ZHTm9kZShlbCkge1xuICAgICAgZWwgPSBlbC5ub2RlKClcbiAgICAgIGlmKGVsLnRhZ05hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ3N2ZycpXG4gICAgICAgIHJldHVybiBlbFxuXG4gICAgICByZXR1cm4gZWwub3duZXJTVkdFbGVtZW50XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Tm9kZUVsKCkge1xuICAgICAgaWYobm9kZSA9PT0gbnVsbCkge1xuICAgICAgICBub2RlID0gaW5pdE5vZGUoKTtcbiAgICAgICAgLy8gcmUtYWRkIG5vZGUgdG8gRE9NXG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQobm9kZSk7XG4gICAgICB9O1xuICAgICAgcmV0dXJuIGQzLnNlbGVjdChub2RlKTtcbiAgICB9XG5cbiAgICAvLyBQcml2YXRlIC0gZ2V0cyB0aGUgc2NyZWVuIGNvb3JkaW5hdGVzIG9mIGEgc2hhcGVcbiAgICAvL1xuICAgIC8vIEdpdmVuIGEgc2hhcGUgb24gdGhlIHNjcmVlbiwgd2lsbCByZXR1cm4gYW4gU1ZHUG9pbnQgZm9yIHRoZSBkaXJlY3Rpb25zXG4gICAgLy8gbihub3J0aCksIHMoc291dGgpLCBlKGVhc3QpLCB3KHdlc3QpLCBuZShub3J0aGVhc3QpLCBzZShzb3V0aGVhc3QpLCBudyhub3J0aHdlc3QpLFxuICAgIC8vIHN3KHNvdXRod2VzdCkuXG4gICAgLy9cbiAgICAvLyAgICArLSstK1xuICAgIC8vICAgIHwgICB8XG4gICAgLy8gICAgKyAgICtcbiAgICAvLyAgICB8ICAgfFxuICAgIC8vICAgICstKy0rXG4gICAgLy9cbiAgICAvLyBSZXR1cm5zIGFuIE9iamVjdCB7biwgcywgZSwgdywgbncsIHN3LCBuZSwgc2V9XG4gICAgZnVuY3Rpb24gZ2V0U2NyZWVuQkJveCgpIHtcbiAgICAgIHZhciB0YXJnZXRlbCAgID0gdGFyZ2V0IHx8IGQzLmV2ZW50LnRhcmdldDtcbiAgICAgIGNvbnNvbGUubG9nKHRhcmdldGVsKTtcbiAgICAgIGZ1bmN0aW9uIHRyeUJCb3goKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB0YXJnZXRlbC5nZXRCQm94KCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgIHRhcmdldGVsID0gdGFyZ2V0ZWwucGFyZW50Tm9kZTtcbiAgICAgICAgICB0cnlCQm94KCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHRyeUJCb3goKTtcbiAgICAgIHdoaWxlICgndW5kZWZpbmVkJyA9PT0gdHlwZW9mIHRhcmdldGVsLmdldFNjcmVlbkNUTSApey8vICYmICd1bmRlZmluZWQnID09PSB0YXJnZXRlbC5wYXJlbnROb2RlKSB7XG4gICAgICAgICAgdGFyZ2V0ZWwgPSB0YXJnZXRlbC5wYXJlbnROb2RlO1xuICAgICAgfVxuICAgICAgY29uc29sZS5sb2codGFyZ2V0ZWwpO1xuICAgICAgdmFyIGJib3ggICAgICAgPSB7fSxcbiAgICAgICAgICBtYXRyaXggICAgID0gdGFyZ2V0ZWwuZ2V0U2NyZWVuQ1RNKCksXG4gICAgICAgICAgdGJib3ggICAgICA9IHRhcmdldGVsLmdldEJCb3goKSxcbiAgICAgICAgICB3aWR0aCAgICAgID0gdGJib3gud2lkdGgsXG4gICAgICAgICAgaGVpZ2h0ICAgICA9IHRiYm94LmhlaWdodCxcbiAgICAgICAgICB4ICAgICAgICAgID0gdGJib3gueCxcbiAgICAgICAgICB5ICAgICAgICAgID0gdGJib3gueVxuXG4gICAgICBwb2ludC54ID0geFxuICAgICAgcG9pbnQueSA9IHlcbiAgICAgIGJib3gubncgPSBwb2ludC5tYXRyaXhUcmFuc2Zvcm0obWF0cml4KVxuICAgICAgcG9pbnQueCArPSB3aWR0aFxuICAgICAgYmJveC5uZSA9IHBvaW50Lm1hdHJpeFRyYW5zZm9ybShtYXRyaXgpXG4gICAgICBwb2ludC55ICs9IGhlaWdodFxuICAgICAgYmJveC5zZSA9IHBvaW50Lm1hdHJpeFRyYW5zZm9ybShtYXRyaXgpXG4gICAgICBwb2ludC54IC09IHdpZHRoXG4gICAgICBiYm94LnN3ID0gcG9pbnQubWF0cml4VHJhbnNmb3JtKG1hdHJpeClcbiAgICAgIHBvaW50LnkgLT0gaGVpZ2h0IC8gMlxuICAgICAgYmJveC53ICA9IHBvaW50Lm1hdHJpeFRyYW5zZm9ybShtYXRyaXgpXG4gICAgICBwb2ludC54ICs9IHdpZHRoXG4gICAgICBiYm94LmUgPSBwb2ludC5tYXRyaXhUcmFuc2Zvcm0obWF0cml4KVxuICAgICAgcG9pbnQueCAtPSB3aWR0aCAvIDJcbiAgICAgIHBvaW50LnkgLT0gaGVpZ2h0IC8gMlxuICAgICAgYmJveC5uID0gcG9pbnQubWF0cml4VHJhbnNmb3JtKG1hdHJpeClcbiAgICAgIHBvaW50LnkgKz0gaGVpZ2h0XG4gICAgICBiYm94LnMgPSBwb2ludC5tYXRyaXhUcmFuc2Zvcm0obWF0cml4KVxuXG4gICAgICByZXR1cm4gYmJveFxuICAgIH1cblxuICAgIHJldHVybiB0aXBcbiAgfTtcbn0pKCk7IiwiLyogUG9seWZpbGwgc2VydmljZSB2My4yNS4xXG4gKiBGb3IgZGV0YWlsZWQgY3JlZGl0cyBhbmQgbGljZW5jZSBpbmZvcm1hdGlvbiBzZWUgaHR0cHM6Ly9naXRodWIuY29tL2ZpbmFuY2lhbC10aW1lcy9wb2x5ZmlsbC1zZXJ2aWNlLlxuICogXG4gKiBVQSBkZXRlY3RlZDogaWUvMTAuMC4wXG4gKiBGZWF0dXJlcyByZXF1ZXN0ZWQ6IFByb21pc2VcbiAqIFxuICogLSBQcm9taXNlLCBMaWNlbnNlOiBNSVQgKi9cblxuZXhwb3J0IGNvbnN0IFByb21pc2VQb2x5ZmlsbCA9ICAoZnVuY3Rpb24odW5kZWZpbmVkKSB7XG5cbi8vIFByb21pc2VcbiFmdW5jdGlvbihuKXtmdW5jdGlvbiB0KGUpe2lmKHJbZV0pcmV0dXJuIHJbZV0uZXhwb3J0czt2YXIgbz1yW2VdPXtleHBvcnRzOnt9LGlkOmUsbG9hZGVkOiExfTtyZXR1cm4gbltlXS5jYWxsKG8uZXhwb3J0cyxvLG8uZXhwb3J0cyx0KSxvLmxvYWRlZD0hMCxvLmV4cG9ydHN9dmFyIHI9e307cmV0dXJuIHQubT1uLHQuYz1yLHQucD1cIlwiLHQoMCl9KHswOi8qISoqKioqKioqKioqKioqKioqKioqKioqISpcXFxuICAhKioqIC4vc3JjL2dsb2JhbC5qcyAqKiohXG4gIFxcKioqKioqKioqKioqKioqKioqKioqKiovXG5mdW5jdGlvbihuLHQscil7KGZ1bmN0aW9uKG4pe3ZhciB0PXIoLyohIC4veWFrdSAqLzgwKTt0cnl7KG58fHt9KS5Qcm9taXNlPXQsd2luZG93LlByb21pc2U9dH1jYXRjaChlcnIpe319KS5jYWxsKHQsZnVuY3Rpb24oKXtyZXR1cm4gdGhpc30oKSl9LDgwOi8qISoqKioqKioqKioqKioqKioqKioqKiEqXFxcbiAgISoqKiAuL3NyYy95YWt1LmpzICoqKiFcbiAgXFwqKioqKioqKioqKioqKioqKioqKiovXG5mdW5jdGlvbihuLHQpeyhmdW5jdGlvbih0KXshZnVuY3Rpb24oKXtcInVzZSBzdHJpY3RcIjtmdW5jdGlvbiByKCl7cmV0dXJuIHVuW0JdW0ddfHxKfWZ1bmN0aW9uIGUobix0KXtmb3IodmFyIHIgaW4gdCluW3JdPXRbcl19ZnVuY3Rpb24gbyhuKXtyZXR1cm4gbiYmXCJvYmplY3RcIj09dHlwZW9mIG59ZnVuY3Rpb24gaShuKXtyZXR1cm5cImZ1bmN0aW9uXCI9PXR5cGVvZiBufWZ1bmN0aW9uIHUobix0KXtyZXR1cm4gbiBpbnN0YW5jZW9mIHR9ZnVuY3Rpb24gYyhuKXtyZXR1cm4gdShuLFUpfWZ1bmN0aW9uIGYobix0LHIpe2lmKCF0KG4pKXRocm93IHYocil9ZnVuY3Rpb24gcygpe3RyeXtyZXR1cm4gQy5hcHBseShGLGFyZ3VtZW50cyl9Y2F0Y2goZSl7cmV0dXJuIHJuLmU9ZSxybn19ZnVuY3Rpb24gYShuLHQpe3JldHVybiBDPW4sRj10LHN9ZnVuY3Rpb24gbChuLHQpe2Z1bmN0aW9uIHIoKXtmb3IodmFyIHI9MDtyPG87KXQoZVtyXSxlW3IrMV0pLGVbcisrXT1TLGVbcisrXT1TO289MCxlLmxlbmd0aD5uJiYoZS5sZW5ndGg9bil9dmFyIGU9TyhuKSxvPTA7cmV0dXJuIGZ1bmN0aW9uKG4sdCl7ZVtvKytdPW4sZVtvKytdPXQsMj09PW8mJnVuLm5leHRUaWNrKHIpfX1mdW5jdGlvbiBoKG4sdCl7dmFyIHIsZSxvLGMsZj0wO2lmKCFuKXRocm93IHYoVyk7dmFyIHM9blt1bltCXVtEXV07aWYoaShzKSllPXMuY2FsbChuKTtlbHNle2lmKCFpKG4ubmV4dCkpe2lmKHUobixPKSl7Zm9yKHI9bi5sZW5ndGg7ZjxyOyl0KG5bZl0sZisrKTtyZXR1cm4gZn10aHJvdyB2KFcpfWU9bn1mb3IoOyEobz1lLm5leHQoKSkuZG9uZTspaWYoYz1hKHQpKG8udmFsdWUsZisrKSxjPT09cm4pdGhyb3cgaShlW0tdKSYmZVtLXSgpLGMuZTtyZXR1cm4gZn1mdW5jdGlvbiB2KG4pe3JldHVybiBuZXcgVHlwZUVycm9yKG4pfWZ1bmN0aW9uIF8obil7cmV0dXJuKG4/XCJcIjpYKSsobmV3IFUpLnN0YWNrfWZ1bmN0aW9uIGQobix0KXt2YXIgcj1cIm9uXCIrbi50b0xvd2VyQ2FzZSgpLGU9SFtyXTtJJiZJLmxpc3RlbmVycyhuKS5sZW5ndGg/bj09PXRuP0kuZW1pdChuLHQuX3YsdCk6SS5lbWl0KG4sdCk6ZT9lKHtyZWFzb246dC5fdixwcm9taXNlOnR9KTp1bltuXSh0Ll92LHQpfWZ1bmN0aW9uIHAobil7cmV0dXJuIG4mJm4uX3N9ZnVuY3Rpb24gdyhuKXtpZihwKG4pKXJldHVybiBuZXcgbihlbik7dmFyIHQscixlO3JldHVybiB0PW5ldyBuKGZ1bmN0aW9uKG4sbyl7aWYodCl0aHJvdyB2KCk7cj1uLGU9b30pLGYocixpKSxmKGUsaSksdH1mdW5jdGlvbiBtKG4sdCl7cmV0dXJuIGZ1bmN0aW9uKHIpe0EmJihuW1FdPV8oITApKSx0PT09cT9UKG4scik6ayhuLHQscil9fWZ1bmN0aW9uIHkobix0LHIsZSl7cmV0dXJuIGkocikmJih0Ll9vbkZ1bGZpbGxlZD1yKSxpKGUpJiYobltNXSYmZChubixuKSx0Ll9vblJlamVjdGVkPWUpLEEmJih0Ll9wPW4pLG5bbi5fYysrXT10LG4uX3MhPT16JiZjbihuLHQpLHR9ZnVuY3Rpb24gaihuKXtpZihuLl91bWFyaylyZXR1cm4hMDtuLl91bWFyaz0hMDtmb3IodmFyIHQscj0wLGU9bi5fYztyPGU7KWlmKHQ9bltyKytdLHQuX29uUmVqZWN0ZWR8fGoodCkpcmV0dXJuITB9ZnVuY3Rpb24geChuLHQpe2Z1bmN0aW9uIHIobil7cmV0dXJuIGUucHVzaChuLnJlcGxhY2UoL15cXHMrfFxccyskL2csXCJcIikpfXZhciBlPVtdO3JldHVybiBBJiYodFtRXSYmcih0W1FdKSxmdW5jdGlvbiBvKG4pe24mJk4gaW4gbiYmKG8obi5fbmV4dCkscihuW05dK1wiXCIpLG8obi5fcCkpfSh0KSksKG4mJm4uc3RhY2s/bi5zdGFjazpuKSsoXCJcXG5cIitlLmpvaW4oXCJcXG5cIikpLnJlcGxhY2Uob24sXCJcIil9ZnVuY3Rpb24gZyhuLHQpe3JldHVybiBuKHQpfWZ1bmN0aW9uIGsobix0LHIpe3ZhciBlPTAsbz1uLl9jO2lmKG4uX3M9PT16KWZvcihuLl9zPXQsbi5fdj1yLHQ9PT0kJiYoQSYmYyhyKSYmKHIubG9uZ1N0YWNrPXgocixuKSksZm4obikpO2U8bzspY24obixuW2UrK10pO3JldHVybiBufWZ1bmN0aW9uIFQobix0KXtpZih0PT09biYmdClyZXR1cm4gayhuLCQsdihZKSksbjtpZih0IT09UCYmKGkodCl8fG8odCkpKXt2YXIgcj1hKGIpKHQpO2lmKHI9PT1ybilyZXR1cm4gayhuLCQsci5lKSxuO2kocik/KEEmJnAodCkmJihuLl9uZXh0PXQpLHAodCk/UihuLHQscik6dW4ubmV4dFRpY2soZnVuY3Rpb24oKXtSKG4sdCxyKX0pKTprKG4scSx0KX1lbHNlIGsobixxLHQpO3JldHVybiBufWZ1bmN0aW9uIGIobil7cmV0dXJuIG4udGhlbn1mdW5jdGlvbiBSKG4sdCxyKXt2YXIgZT1hKHIsdCkoZnVuY3Rpb24ocil7dCYmKHQ9UCxUKG4scikpfSxmdW5jdGlvbihyKXt0JiYodD1QLGsobiwkLHIpKX0pO2U9PT1ybiYmdCYmKGsobiwkLGUuZSksdD1QKX12YXIgUyxDLEYsUD1udWxsLEU9XCJvYmplY3RcIj09dHlwZW9mIHdpbmRvdyxIPUU/d2luZG93OnQsST1ILnByb2Nlc3MsTD1ILmNvbnNvbGUsQT0hMSxPPUFycmF5LFU9RXJyb3IsJD0xLHE9Mix6PTMsQj1cIlN5bWJvbFwiLEQ9XCJpdGVyYXRvclwiLEc9XCJzcGVjaWVzXCIsSj1CK1wiKFwiK0crXCIpXCIsSz1cInJldHVyblwiLE09XCJfdWhcIixOPVwiX3B0XCIsUT1cIl9zdFwiLFY9XCJJbnZhbGlkIHRoaXNcIixXPVwiSW52YWxpZCBhcmd1bWVudFwiLFg9XCJcXG5Gcm9tIHByZXZpb3VzIFwiLFk9XCJDaGFpbmluZyBjeWNsZSBkZXRlY3RlZCBmb3IgcHJvbWlzZVwiLFo9XCJVbmNhdWdodCAoaW4gcHJvbWlzZSlcIixubj1cInJlamVjdGlvbkhhbmRsZWRcIix0bj1cInVuaGFuZGxlZFJlamVjdGlvblwiLHJuPXtlOlB9LGVuPWZ1bmN0aW9uKCl7fSxvbj0vXi4rXFwvbm9kZV9tb2R1bGVzXFwveWFrdVxcLy4rXFxuPy9nbSx1bj1uLmV4cG9ydHM9ZnVuY3Rpb24obil7dmFyIHQscj10aGlzO2lmKCFvKHIpfHxyLl9zIT09Uyl0aHJvdyB2KFYpO2lmKHIuX3M9eixBJiYocltOXT1fKCkpLG4hPT1lbil7aWYoIWkobikpdGhyb3cgdihXKTt0PWEobikobShyLHEpLG0ociwkKSksdD09PXJuJiZrKHIsJCx0LmUpfX07dW5bXCJkZWZhdWx0XCJdPXVuLGUodW4ucHJvdG90eXBlLHt0aGVuOmZ1bmN0aW9uKG4sdCl7aWYodm9pZCAwPT09dGhpcy5fcyl0aHJvdyB2KCk7cmV0dXJuIHkodGhpcyx3KHVuLnNwZWNpZXNDb25zdHJ1Y3Rvcih0aGlzLHVuKSksbix0KX0sXCJjYXRjaFwiOmZ1bmN0aW9uKG4pe3JldHVybiB0aGlzLnRoZW4oUyxuKX0sXCJmaW5hbGx5XCI6ZnVuY3Rpb24obil7ZnVuY3Rpb24gdCh0KXtyZXR1cm4gdW4ucmVzb2x2ZShuKCkpLnRoZW4oZnVuY3Rpb24oKXtyZXR1cm4gdH0pfXJldHVybiB0aGlzLnRoZW4odCx0KX0sX2M6MCxfcDpQfSksdW4ucmVzb2x2ZT1mdW5jdGlvbihuKXtyZXR1cm4gcChuKT9uOlQodyh0aGlzKSxuKX0sdW4ucmVqZWN0PWZ1bmN0aW9uKG4pe3JldHVybiBrKHcodGhpcyksJCxuKX0sdW4ucmFjZT1mdW5jdGlvbihuKXt2YXIgdD10aGlzLHI9dyh0KSxlPWZ1bmN0aW9uKG4pe2socixxLG4pfSxvPWZ1bmN0aW9uKG4pe2sociwkLG4pfSxpPWEoaCkobixmdW5jdGlvbihuKXt0LnJlc29sdmUobikudGhlbihlLG8pfSk7cmV0dXJuIGk9PT1ybj90LnJlamVjdChpLmUpOnJ9LHVuLmFsbD1mdW5jdGlvbihuKXtmdW5jdGlvbiB0KG4pe2sobywkLG4pfXZhciByLGU9dGhpcyxvPXcoZSksaT1bXTtyZXR1cm4gcj1hKGgpKG4sZnVuY3Rpb24obix1KXtlLnJlc29sdmUobikudGhlbihmdW5jdGlvbihuKXtpW3VdPW4sLS1yfHxrKG8scSxpKX0sdCl9KSxyPT09cm4/ZS5yZWplY3Qoci5lKToocnx8ayhvLHEsW10pLG8pfSx1bi5TeW1ib2w9SFtCXXx8e30sYShmdW5jdGlvbigpe09iamVjdC5kZWZpbmVQcm9wZXJ0eSh1bixyKCkse2dldDpmdW5jdGlvbigpe3JldHVybiB0aGlzfX0pfSkoKSx1bi5zcGVjaWVzQ29uc3RydWN0b3I9ZnVuY3Rpb24obix0KXt2YXIgZT1uLmNvbnN0cnVjdG9yO3JldHVybiBlP2VbcigpXXx8dDp0fSx1bi51bmhhbmRsZWRSZWplY3Rpb249ZnVuY3Rpb24obix0KXtMJiZMLmVycm9yKFosQT90LmxvbmdTdGFjazp4KG4sdCkpfSx1bi5yZWplY3Rpb25IYW5kbGVkPWVuLHVuLmVuYWJsZUxvbmdTdGFja1RyYWNlPWZ1bmN0aW9uKCl7QT0hMH0sdW4ubmV4dFRpY2s9RT9mdW5jdGlvbihuKXtzZXRUaW1lb3V0KG4pfTpJLm5leHRUaWNrLHVuLl9zPTE7dmFyIGNuPWwoOTk5LGZ1bmN0aW9uKG4sdCl7dmFyIHIsZTtyZXR1cm4gZT1uLl9zIT09JD90Ll9vbkZ1bGZpbGxlZDp0Ll9vblJlamVjdGVkLGU9PT1TP3ZvaWQgayh0LG4uX3Msbi5fdik6KHI9YShnKShlLG4uX3YpLHI9PT1ybj92b2lkIGsodCwkLHIuZSk6dm9pZCBUKHQscikpfSksZm49bCg5LGZ1bmN0aW9uKG4pe2oobil8fChuW01dPTEsZCh0bixuKSl9KX0oKX0pLmNhbGwodCxmdW5jdGlvbigpe3JldHVybiB0aGlzfSgpKX19KTt9KVxuLmNhbGwoJ29iamVjdCcgPT09IHR5cGVvZiB3aW5kb3cgJiYgd2luZG93IHx8ICdvYmplY3QnID09PSB0eXBlb2Ygc2VsZiAmJiBzZWxmIHx8ICdvYmplY3QnID09PSB0eXBlb2YgZ2xvYmFsICYmIGdsb2JhbCB8fCB7fSk7XG5cblxuLyoqXG4gKiBNYXBWYWx1ZXMgIFxuICogQ29weXJpZ2h0KGMpIDIwMTcsIEpvaG4gT3N0ZXJtYW5cbiAqXG4gKiBNSVQgTGljZW5zZVxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgXG4gKiBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgXG4gKiB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgXG4gKiBmb2xsb3dpbmcgY29uZGl0aW9uczpcblxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBcbiAqIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBcbiAqIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBcbiAqIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFxuICogVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cbiAqL1xuIFxuIC8qIHBvb3IgbWFuJ3MgcG9seWZpbGwgZm9yIE1hcC52YWx1ZXMoKS4gc2ltcGx5IHJldHVybnMgYW4gYXJyYXkgb2YgdGhlIHZhbHVlcy4gQ2Fubm90IGd1YXJhbnRlZSBpdCBwcmVzZXJ2ZXNcbiAgKiBpbnNlcnRpb24gb3JkZXIgb3IgdGhhdCBpdCB3aWxsIGhhbmRsZSBhbGwgcHJvcGVydHkgb3IgdmFsdWUgdHlwZXMuIGFsbW9zdCBjZXJ0YWlubHkgbm90IGVxdWl2YWxlbnQgdG8gbmF0aXZlXG4gICogcHJvdG90eXBlIFxuICAqL1xuXG5leHBvcnQgY29uc3QgTWFwVmFsdWVzID0gKGZ1bmN0aW9uKCl7XG4gIE1hcC5wcm90b3R5cGUudmFsdWVzID0gTWFwLnByb3RvdHlwZS52YWx1ZXMgfHwgZnVuY3Rpb24oKXtcbiAgICB2YXIgYXJyYXkgPSBbXTtcbiAgICB0aGlzLmZvckVhY2goZnVuY3Rpb24oZWFjaCl7XG4gICAgICBhcnJheS5wdXNoKGVhY2gpO1xuICAgIH0pO1xuICAgIHJldHVybiBhcnJheTtcbiAgfTtcbn0pKCk7XG5cbi8qKlxuICogU1ZHIGZvY3VzIFxuICogQ29weXJpZ2h0KGMpIDIwMTcsIEpvaG4gT3N0ZXJtYW5cbiAqXG4gKiBNSVQgTGljZW5zZVxuICpcbiAqIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgXG4gKiBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZSBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgXG4gKiB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIFxuICogY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdCBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGUgXG4gKiBmb2xsb3dpbmcgY29uZGl0aW9uczpcblxuICogVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTUyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBcbiAqIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0YgTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTiBOTyBcbiAqIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLCBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBcbiAqIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFIFxuICogVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cbiAqL1xuXG4gLy8gSUUvRWRnZSAocGVyaGFwcyBvdGhlcnMpIGRvZXMgbm90IGFsbG93IHByb2dyYW1tYXRpYyBmb2N1c2luZyBvZiBTVkcgRWxlbWVudHMgKHZpYSBgZm9jdXMoKWApLiBTYW1lIGZvciBgYmx1cigpYC5cblxuIGV4cG9ydCBjb25zdCBTVkdGb2N1cyA9IChmdW5jdGlvbigpe1xuICAgIGlmICggJ2ZvY3VzJyBpbiBTVkdFbGVtZW50LnByb3RvdHlwZSA9PT0gZmFsc2UgKSB7XG4gICAgICBTVkdFbGVtZW50LnByb3RvdHlwZS5mb2N1cyA9IEhUTUxFbGVtZW50LnByb3RvdHlwZS5mb2N1cztcbiAgICB9XG4gICAgaWYgKCAnYmx1cicgaW4gU1ZHRWxlbWVudC5wcm90b3R5cGUgPT09IGZhbHNlICkge1xuICAgICAgU1ZHRWxlbWVudC5wcm90b3R5cGUuYmx1ciA9IEhUTUxFbGVtZW50LnByb3RvdHlwZS5ibHVyO1xuICAgIH1cbiB9KSgpO1xuXG5cblxuXG4vKipcbiAqIGlubmVySFRNTCBwcm9wZXJ0eSBmb3IgU1ZHRWxlbWVudFxuICogQ29weXJpZ2h0KGMpIDIwMTAsIEplZmYgU2NoaWxsZXJcbiAqXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMlxuICpcbiAqIFdvcmtzIGluIGEgU1ZHIGRvY3VtZW50IGluIENocm9tZSA2KywgU2FmYXJpIDUrLCBGaXJlZm94IDQrIGFuZCBJRTkrLlxuICogV29ya3MgaW4gYSBIVE1MNSBkb2N1bWVudCBpbiBDaHJvbWUgNyssIEZpcmVmb3ggNCsgYW5kIElFOSsuXG4gKiBEb2VzIG5vdCB3b3JrIGluIE9wZXJhIHNpbmNlIGl0IGRvZXNuJ3Qgc3VwcG9ydCB0aGUgU1ZHRWxlbWVudCBpbnRlcmZhY2UgeWV0LlxuICpcbiAqIEkgaGF2ZW4ndCBkZWNpZGVkIG9uIHRoZSBiZXN0IG5hbWUgZm9yIHRoaXMgcHJvcGVydHkgLSB0aHVzIHRoZSBkdXBsaWNhdGlvbi5cbiAqL1xuLy8gZWRpdGVkIGJ5IEpvaG4gT3N0ZXJtYW4gdG8gZGVjbGFyZSB0aGUgdmFyaWFibGUgYHNYTUxgLCB3aGljaCB3YXMgcmVmZXJlbmNlZCB3aXRob3V0IGJlaW5nIGRlY2xhcmVkXG4vLyB3aGljaCBmYWlsZWQgc2lsZW50bHkgaW4gaW1wbGljaXQgc3RyaWN0IG1vZGUgb2YgYW4gZXhwb3J0XG5cbi8vIG1vc3QgYnJvd3NlcnMgYWxsb3cgc2V0dGluZyBpbm5lckhUTUwgb2Ygc3ZnIGVsZW1lbnRzIGJ1dCBJRSBkb2VzIG5vdCAobm90IGFuIEhUTUwgZWxlbWVudClcbi8vIHRoaXMgcG9seWZpbGwgcHJvdmlkZXMgdGhhdC4gbmVjZXNzYXJ5IGZvciBkMyBtZXRob2QgYC5odG1sKClgIG9uIHN2ZyBlbGVtZW50c1xuXG5leHBvcnQgY29uc3QgU1ZHSW5uZXJIVE1MID0gKGZ1bmN0aW9uKCkge1xuICB2YXIgc2VyaWFsaXplWE1MID0gZnVuY3Rpb24obm9kZSwgb3V0cHV0KSB7XG4gICAgdmFyIG5vZGVUeXBlID0gbm9kZS5ub2RlVHlwZTtcbiAgICBpZiAobm9kZVR5cGUgPT0gMykgeyAvLyBURVhUIG5vZGVzLlxuICAgICAgLy8gUmVwbGFjZSBzcGVjaWFsIFhNTCBjaGFyYWN0ZXJzIHdpdGggdGhlaXIgZW50aXRpZXMuXG4gICAgICBvdXRwdXQucHVzaChub2RlLnRleHRDb250ZW50LnJlcGxhY2UoLyYvLCAnJmFtcDsnKS5yZXBsYWNlKC88LywgJyZsdDsnKS5yZXBsYWNlKCc+JywgJyZndDsnKSk7XG4gICAgfSBlbHNlIGlmIChub2RlVHlwZSA9PSAxKSB7IC8vIEVMRU1FTlQgbm9kZXMuXG4gICAgICAvLyBTZXJpYWxpemUgRWxlbWVudCBub2Rlcy5cbiAgICAgIG91dHB1dC5wdXNoKCc8Jywgbm9kZS50YWdOYW1lKTtcbiAgICAgIGlmIChub2RlLmhhc0F0dHJpYnV0ZXMoKSkge1xuICAgICAgICB2YXIgYXR0ck1hcCA9IG5vZGUuYXR0cmlidXRlcztcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGF0dHJNYXAubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgICB2YXIgYXR0ck5vZGUgPSBhdHRyTWFwLml0ZW0oaSk7XG4gICAgICAgICAgb3V0cHV0LnB1c2goJyAnLCBhdHRyTm9kZS5uYW1lLCAnPVxcJycsIGF0dHJOb2RlLnZhbHVlLCAnXFwnJyk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGlmIChub2RlLmhhc0NoaWxkTm9kZXMoKSkge1xuICAgICAgICBvdXRwdXQucHVzaCgnPicpO1xuICAgICAgICB2YXIgY2hpbGROb2RlcyA9IG5vZGUuY2hpbGROb2RlcztcbiAgICAgICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGNoaWxkTm9kZXMubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgICAgICBzZXJpYWxpemVYTUwoY2hpbGROb2Rlcy5pdGVtKGkpLCBvdXRwdXQpO1xuICAgICAgICB9XG4gICAgICAgIG91dHB1dC5wdXNoKCc8LycsIG5vZGUudGFnTmFtZSwgJz4nKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG91dHB1dC5wdXNoKCcvPicpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAobm9kZVR5cGUgPT0gOCkge1xuICAgICAgLy8gVE9ETyhjb2RlZHJlYWQpOiBSZXBsYWNlIHNwZWNpYWwgY2hhcmFjdGVycyB3aXRoIFhNTCBlbnRpdGllcz9cbiAgICAgIG91dHB1dC5wdXNoKCc8IS0tJywgbm9kZS5ub2RlVmFsdWUsICctLT4nKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVE9ETzogSGFuZGxlIENEQVRBIG5vZGVzLlxuICAgICAgLy8gVE9ETzogSGFuZGxlIEVOVElUWSBub2Rlcy5cbiAgICAgIC8vIFRPRE86IEhhbmRsZSBET0NVTUVOVCBub2Rlcy5cbiAgICAgIHRocm93ICdFcnJvciBzZXJpYWxpemluZyBYTUwuIFVuaGFuZGxlZCBub2RlIG9mIHR5cGU6ICcgKyBub2RlVHlwZTtcbiAgICB9XG4gIH1cbiAgLy8gVGhlIGlubmVySFRNTCBET00gcHJvcGVydHkgZm9yIFNWR0VsZW1lbnQuXG4gIGlmICggJ2lubmVySFRNTCcgaW4gU1ZHRWxlbWVudC5wcm90b3R5cGUgPT09IGZhbHNlICl7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFNWR0VsZW1lbnQucHJvdG90eXBlLCAnaW5uZXJIVE1MJywge1xuICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG91dHB1dCA9IFtdO1xuICAgICAgICB2YXIgY2hpbGROb2RlID0gdGhpcy5maXJzdENoaWxkO1xuICAgICAgICB3aGlsZSAoY2hpbGROb2RlKSB7XG4gICAgICAgICAgc2VyaWFsaXplWE1MKGNoaWxkTm9kZSwgb3V0cHV0KTtcbiAgICAgICAgICBjaGlsZE5vZGUgPSBjaGlsZE5vZGUubmV4dFNpYmxpbmc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG91dHB1dC5qb2luKCcnKTtcbiAgICAgIH0sXG4gICAgICBzZXQ6IGZ1bmN0aW9uKG1hcmt1cFRleHQpIHtcbiAgICAgICAgY29uc29sZS5sb2codGhpcyk7XG4gICAgICAgIC8vIFdpcGUgb3V0IHRoZSBjdXJyZW50IGNvbnRlbnRzIG9mIHRoZSBlbGVtZW50LlxuICAgICAgICB3aGlsZSAodGhpcy5maXJzdENoaWxkKSB7XG4gICAgICAgICAgdGhpcy5yZW1vdmVDaGlsZCh0aGlzLmZpcnN0Q2hpbGQpO1xuICAgICAgICB9XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICAvLyBQYXJzZSB0aGUgbWFya3VwIGludG8gdmFsaWQgbm9kZXMuXG4gICAgICAgICAgdmFyIGRYTUwgPSBuZXcgRE9NUGFyc2VyKCk7XG4gICAgICAgICAgZFhNTC5hc3luYyA9IGZhbHNlO1xuICAgICAgICAgIC8vIFdyYXAgdGhlIG1hcmt1cCBpbnRvIGEgU1ZHIG5vZGUgdG8gZW5zdXJlIHBhcnNpbmcgd29ya3MuXG4gICAgICAgICAgY29uc29sZS5sb2cobWFya3VwVGV4dCk7XG4gICAgICAgICAgdmFyIHNYTUwgPSAnPHN2ZyB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+JyArIG1hcmt1cFRleHQgKyAnPC9zdmc+JztcbiAgICAgICAgICBjb25zb2xlLmxvZyhzWE1MKTtcbiAgICAgICAgICB2YXIgc3ZnRG9jRWxlbWVudCA9IGRYTUwucGFyc2VGcm9tU3RyaW5nKHNYTUwsICd0ZXh0L3htbCcpLmRvY3VtZW50RWxlbWVudDtcblxuICAgICAgICAgIC8vIE5vdyB0YWtlIGVhY2ggbm9kZSwgaW1wb3J0IGl0IGFuZCBhcHBlbmQgdG8gdGhpcyBlbGVtZW50LlxuICAgICAgICAgIHZhciBjaGlsZE5vZGUgPSBzdmdEb2NFbGVtZW50LmZpcnN0Q2hpbGQ7XG4gICAgICAgICAgd2hpbGUoY2hpbGROb2RlKSB7XG4gICAgICAgICAgICB0aGlzLmFwcGVuZENoaWxkKHRoaXMub3duZXJEb2N1bWVudC5pbXBvcnROb2RlKGNoaWxkTm9kZSwgdHJ1ZSkpO1xuICAgICAgICAgICAgY2hpbGROb2RlID0gY2hpbGROb2RlLm5leHRTaWJsaW5nO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBjYXRjaChlKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdFcnJvciBwYXJzaW5nIFhNTCBzdHJpbmcnKTtcbiAgICAgICAgfTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIFRoZSBpbm5lclNWRyBET00gcHJvcGVydHkgZm9yIFNWR0VsZW1lbnQuXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFNWR0VsZW1lbnQucHJvdG90eXBlLCAnaW5uZXJTVkcnLCB7XG4gICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5pbm5lckhUTUw7XG4gICAgICB9LFxuICAgICAgc2V0OiBmdW5jdGlvbihtYXJrdXBUZXh0KSB7XG4gICAgICAgIHRoaXMuaW5uZXJIVE1MID0gbWFya3VwVGV4dDtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufSkoKTtcblxuXG4vLyBodHRwczovL3RjMzkuZ2l0aHViLmlvL2VjbWEyNjIvI3NlYy1hcnJheS5wcm90b3R5cGUuZmluZFxuZXhwb3J0IGNvbnN0IGFycmF5RmluZCA9IChmdW5jdGlvbigpe1xuICBpZiAoIUFycmF5LnByb3RvdHlwZS5maW5kKSB7XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEFycmF5LnByb3RvdHlwZSwgJ2ZpbmQnLCB7XG4gICAgICB2YWx1ZTogZnVuY3Rpb24ocHJlZGljYXRlKSB7XG4gICAgICAgLy8gMS4gTGV0IE8gYmUgPyBUb09iamVjdCh0aGlzIHZhbHVlKS5cbiAgICAgICAgaWYgKHRoaXMgPT0gbnVsbCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ1widGhpc1wiIGlzIG51bGwgb3Igbm90IGRlZmluZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHZhciBvID0gT2JqZWN0KHRoaXMpO1xuXG4gICAgICAgIC8vIDIuIExldCBsZW4gYmUgPyBUb0xlbmd0aCg/IEdldChPLCBcImxlbmd0aFwiKSkuXG4gICAgICAgIHZhciBsZW4gPSBvLmxlbmd0aCA+Pj4gMDtcblxuICAgICAgICAvLyAzLiBJZiBJc0NhbGxhYmxlKHByZWRpY2F0ZSkgaXMgZmFsc2UsIHRocm93IGEgVHlwZUVycm9yIGV4Y2VwdGlvbi5cbiAgICAgICAgaWYgKHR5cGVvZiBwcmVkaWNhdGUgIT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdwcmVkaWNhdGUgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyA0LiBJZiB0aGlzQXJnIHdhcyBzdXBwbGllZCwgbGV0IFQgYmUgdGhpc0FyZzsgZWxzZSBsZXQgVCBiZSB1bmRlZmluZWQuXG4gICAgICAgIHZhciB0aGlzQXJnID0gYXJndW1lbnRzWzFdO1xuXG4gICAgICAgIC8vIDUuIExldCBrIGJlIDAuXG4gICAgICAgIHZhciBrID0gMDtcblxuICAgICAgICAvLyA2LiBSZXBlYXQsIHdoaWxlIGsgPCBsZW5cbiAgICAgICAgd2hpbGUgKGsgPCBsZW4pIHtcbiAgICAgICAgICAvLyBhLiBMZXQgUGsgYmUgISBUb1N0cmluZyhrKS5cbiAgICAgICAgICAvLyBiLiBMZXQga1ZhbHVlIGJlID8gR2V0KE8sIFBrKS5cbiAgICAgICAgICAvLyBjLiBMZXQgdGVzdFJlc3VsdCBiZSBUb0Jvb2xlYW4oPyBDYWxsKHByZWRpY2F0ZSwgVCwgwqsga1ZhbHVlLCBrLCBPIMK7KSkuXG4gICAgICAgICAgLy8gZC4gSWYgdGVzdFJlc3VsdCBpcyB0cnVlLCByZXR1cm4ga1ZhbHVlLlxuICAgICAgICAgIHZhciBrVmFsdWUgPSBvW2tdO1xuICAgICAgICAgIGlmIChwcmVkaWNhdGUuY2FsbCh0aGlzQXJnLCBrVmFsdWUsIGssIG8pKSB7XG4gICAgICAgICAgICByZXR1cm4ga1ZhbHVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICAvLyBlLiBJbmNyZWFzZSBrIGJ5IDEuXG4gICAgICAgICAgaysrO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gNy4gUmV0dXJuIHVuZGVmaW5lZC5cbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxufSkoKTsgXG5cbi8vIENvcHlyaWdodCAoQykgMjAxMS0yMDEyIFNvZnR3YXJlIExhbmd1YWdlcyBMYWIsIFZyaWplIFVuaXZlcnNpdGVpdCBCcnVzc2VsXG4vLyBUaGlzIGNvZGUgaXMgZHVhbC1saWNlbnNlZCB1bmRlciBib3RoIHRoZSBBcGFjaGUgTGljZW5zZSBhbmQgdGhlIE1QTFxuXG4vLyBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xuLy8geW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxuLy8gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4vL1xuLy8gaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXG4vL1xuLy8gVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxuLy8gZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxuLy8gV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXG4vLyBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXG4vLyBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cblxuLyogVmVyc2lvbjogTVBMIDEuMVxuICpcbiAqIFRoZSBjb250ZW50cyBvZiB0aGlzIGZpbGUgYXJlIHN1YmplY3QgdG8gdGhlIE1vemlsbGEgUHVibGljIExpY2Vuc2UgVmVyc2lvblxuICogMS4xICh0aGUgXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGhcbiAqIHRoZSBMaWNlbnNlLiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqIGh0dHA6Ly93d3cubW96aWxsYS5vcmcvTVBML1xuICpcbiAqIFNvZnR3YXJlIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBiYXNpcyxcbiAqIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuIFNlZSB0aGUgTGljZW5zZVxuICogZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcmlnaHRzIGFuZCBsaW1pdGF0aW9ucyB1bmRlciB0aGVcbiAqIExpY2Vuc2UuXG4gKlxuICogVGhlIE9yaWdpbmFsIENvZGUgaXMgYSBzaGltIGZvciB0aGUgRVMtSGFybW9ueSByZWZsZWN0aW9uIG1vZHVsZVxuICpcbiAqIFRoZSBJbml0aWFsIERldmVsb3BlciBvZiB0aGUgT3JpZ2luYWwgQ29kZSBpc1xuICogVG9tIFZhbiBDdXRzZW0sIFZyaWplIFVuaXZlcnNpdGVpdCBCcnVzc2VsLlxuICogUG9ydGlvbnMgY3JlYXRlZCBieSB0aGUgSW5pdGlhbCBEZXZlbG9wZXIgYXJlIENvcHlyaWdodCAoQykgMjAxMS0yMDEyXG4gKiB0aGUgSW5pdGlhbCBEZXZlbG9wZXIuIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogQ29udHJpYnV0b3Iocyk6XG4gKlxuICovXG5cbiAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbiAvLyBUaGlzIGZpbGUgaXMgYSBwb2x5ZmlsbCBmb3IgdGhlIHVwY29taW5nIEVDTUFTY3JpcHQgUmVmbGVjdCBBUEksXG4gLy8gaW5jbHVkaW5nIHN1cHBvcnQgZm9yIFByb3hpZXMuIFNlZSB0aGUgZHJhZnQgc3BlY2lmaWNhdGlvbiBhdDpcbiAvLyBodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1oYXJtb255OnJlZmxlY3RfYXBpXG4gLy8gaHR0cDovL3dpa2kuZWNtYXNjcmlwdC5vcmcvZG9rdS5waHA/aWQ9aGFybW9ueTpkaXJlY3RfcHJveGllc1xuXG4gLy8gRm9yIGFuIGltcGxlbWVudGF0aW9uIG9mIHRoZSBIYW5kbGVyIEFQSSwgc2VlIGhhbmRsZXJzLmpzLCB3aGljaCBpbXBsZW1lbnRzOlxuIC8vIGh0dHA6Ly93aWtpLmVjbWFzY3JpcHQub3JnL2Rva3UucGhwP2lkPWhhcm1vbnk6dmlydHVhbF9vYmplY3RfYXBpXG5cbiAvLyBUaGlzIGltcGxlbWVudGF0aW9uIHN1cGVyc2VkZXMgdGhlIGVhcmxpZXIgcG9seWZpbGwgYXQ6XG4gLy8gY29kZS5nb29nbGUuY29tL3AvZXMtbGFiL3NvdXJjZS9icm93c2UvdHJ1bmsvc3JjL3Byb3hpZXMvRGlyZWN0UHJveGllcy5qc1xuXG4gLy8gVGhpcyBjb2RlIHdhcyB0ZXN0ZWQgb24gdHJhY2Vtb25rZXkgLyBGaXJlZm94IDEyXG4vLyAgKGFuZCBzaG91bGQgcnVuIGZpbmUgb24gb2xkZXIgRmlyZWZveCB2ZXJzaW9ucyBzdGFydGluZyB3aXRoIEZGNClcbiAvLyBUaGUgY29kZSBhbHNvIHdvcmtzIGNvcnJlY3RseSBvblxuIC8vICAgdjggLS1oYXJtb255X3Byb3hpZXMgLS1oYXJtb255X3dlYWttYXBzICh2My42LjUuMSlcblxuIC8vIExhbmd1YWdlIERlcGVuZGVuY2llczpcbiAvLyAgLSBFQ01BU2NyaXB0IDUvc3RyaWN0XG4gLy8gIC0gXCJvbGRcIiAoaS5lLiBub24tZGlyZWN0KSBIYXJtb255IFByb3hpZXNcbiAvLyAgLSBIYXJtb255IFdlYWtNYXBzXG4gLy8gUGF0Y2hlczpcbiAvLyAgLSBPYmplY3Que2ZyZWV6ZSxzZWFsLHByZXZlbnRFeHRlbnNpb25zfVxuIC8vICAtIE9iamVjdC57aXNGcm96ZW4saXNTZWFsZWQsaXNFeHRlbnNpYmxlfVxuIC8vICAtIE9iamVjdC5nZXRQcm90b3R5cGVPZlxuIC8vICAtIE9iamVjdC5rZXlzXG4gLy8gIC0gT2JqZWN0LnByb3RvdHlwZS52YWx1ZU9mXG4gLy8gIC0gT2JqZWN0LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mXG4gLy8gIC0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZ1xuIC8vICAtIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHlcbiAvLyAgLSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yXG4gLy8gIC0gT2JqZWN0LmRlZmluZVByb3BlcnR5XG4gLy8gIC0gT2JqZWN0LmRlZmluZVByb3BlcnRpZXNcbiAvLyAgLSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lc1xuIC8vICAtIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHNcbiAvLyAgLSBPYmplY3QuZ2V0UHJvdG90eXBlT2ZcbiAvLyAgLSBPYmplY3Quc2V0UHJvdG90eXBlT2ZcbiAvLyAgLSBPYmplY3QuYXNzaWduXG4gLy8gIC0gRnVuY3Rpb24ucHJvdG90eXBlLnRvU3RyaW5nXG4gLy8gIC0gRGF0ZS5wcm90b3R5cGUudG9TdHJpbmdcbiAvLyAgLSBBcnJheS5pc0FycmF5XG4gLy8gIC0gQXJyYXkucHJvdG90eXBlLmNvbmNhdFxuIC8vICAtIFByb3h5XG4gLy8gQWRkcyBuZXcgZ2xvYmFsczpcbiAvLyAgLSBSZWZsZWN0XG5cbiAvLyBEaXJlY3QgcHJveGllcyBjYW4gYmUgY3JlYXRlZCB2aWEgUHJveHkodGFyZ2V0LCBoYW5kbGVyKVxuXG4gLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG5leHBvcnQgY29uc3QgcmVmbGVjdCA9IChmdW5jdGlvbihnbG9iYWwpeyAvLyBmdW5jdGlvbi1hcy1tb2R1bGUgcGF0dGVyblxuXCJ1c2Ugc3RyaWN0XCI7XG4gXG4vLyA9PT0gRGlyZWN0IFByb3hpZXM6IEludmFyaWFudCBFbmZvcmNlbWVudCA9PT1cblxuLy8gRGlyZWN0IHByb3hpZXMgYnVpbGQgb24gbm9uLWRpcmVjdCBwcm94aWVzIGJ5IGF1dG9tYXRpY2FsbHkgd3JhcHBpbmdcbi8vIGFsbCB1c2VyLWRlZmluZWQgcHJveHkgaGFuZGxlcnMgaW4gYSBWYWxpZGF0b3IgaGFuZGxlciB0aGF0IGNoZWNrcyBhbmRcbi8vIGVuZm9yY2VzIEVTNSBpbnZhcmlhbnRzLlxuXG4vLyBBIGRpcmVjdCBwcm94eSBpcyBhIHByb3h5IGZvciBhbiBleGlzdGluZyBvYmplY3QgY2FsbGVkIHRoZSB0YXJnZXQgb2JqZWN0LlxuXG4vLyBBIFZhbGlkYXRvciBoYW5kbGVyIGlzIGEgd3JhcHBlciBmb3IgYSB0YXJnZXQgcHJveHkgaGFuZGxlciBILlxuLy8gVGhlIFZhbGlkYXRvciBmb3J3YXJkcyBhbGwgb3BlcmF0aW9ucyB0byBILCBidXQgYWRkaXRpb25hbGx5XG4vLyBwZXJmb3JtcyBhIG51bWJlciBvZiBpbnRlZ3JpdHkgY2hlY2tzIG9uIHRoZSByZXN1bHRzIG9mIHNvbWUgdHJhcHMsXG4vLyB0byBtYWtlIHN1cmUgSCBkb2VzIG5vdCB2aW9sYXRlIHRoZSBFUzUgaW52YXJpYW50cyB3LnIudC4gbm9uLWNvbmZpZ3VyYWJsZVxuLy8gcHJvcGVydGllcyBhbmQgbm9uLWV4dGVuc2libGUsIHNlYWxlZCBvciBmcm96ZW4gb2JqZWN0cy5cblxuLy8gRm9yIGVhY2ggcHJvcGVydHkgdGhhdCBIIGV4cG9zZXMgYXMgb3duLCBub24tY29uZmlndXJhYmxlXG4vLyAoZS5nLiBieSByZXR1cm5pbmcgYSBkZXNjcmlwdG9yIGZyb20gYSBjYWxsIHRvIGdldE93blByb3BlcnR5RGVzY3JpcHRvcilcbi8vIHRoZSBWYWxpZGF0b3IgaGFuZGxlciBkZWZpbmVzIHRob3NlIHByb3BlcnRpZXMgb24gdGhlIHRhcmdldCBvYmplY3QuXG4vLyBXaGVuIHRoZSBwcm94eSBiZWNvbWVzIG5vbi1leHRlbnNpYmxlLCBhbHNvIGNvbmZpZ3VyYWJsZSBvd24gcHJvcGVydGllc1xuLy8gYXJlIGNoZWNrZWQgYWdhaW5zdCB0aGUgdGFyZ2V0LlxuLy8gV2Ugd2lsbCBjYWxsIHByb3BlcnRpZXMgdGhhdCBhcmUgZGVmaW5lZCBvbiB0aGUgdGFyZ2V0IG9iamVjdFxuLy8gXCJmaXhlZCBwcm9wZXJ0aWVzXCIuXG5cbi8vIFdlIHdpbGwgbmFtZSBmaXhlZCBub24tY29uZmlndXJhYmxlIHByb3BlcnRpZXMgXCJzZWFsZWQgcHJvcGVydGllc1wiLlxuLy8gV2Ugd2lsbCBuYW1lIGZpeGVkIG5vbi1jb25maWd1cmFibGUgbm9uLXdyaXRhYmxlIHByb3BlcnRpZXMgXCJmcm96ZW5cbi8vIHByb3BlcnRpZXNcIi5cblxuLy8gVGhlIFZhbGlkYXRvciBoYW5kbGVyIHVwaG9sZHMgdGhlIGZvbGxvd2luZyBpbnZhcmlhbnRzIHcuci50LiBub24tY29uZmlndXJhYmlsaXR5OlxuLy8gLSBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IgY2Fubm90IHJlcG9ydCBzZWFsZWQgcHJvcGVydGllcyBhcyBub24tZXhpc3RlbnRcbi8vIC0gZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yIGNhbm5vdCByZXBvcnQgaW5jb21wYXRpYmxlIGNoYW5nZXMgdG8gdGhlXG4vLyAgIGF0dHJpYnV0ZXMgb2YgYSBzZWFsZWQgcHJvcGVydHkgKGUuZy4gcmVwb3J0aW5nIGEgbm9uLWNvbmZpZ3VyYWJsZVxuLy8gICBwcm9wZXJ0eSBhcyBjb25maWd1cmFibGUsIG9yIHJlcG9ydGluZyBhIG5vbi1jb25maWd1cmFibGUsIG5vbi13cml0YWJsZVxuLy8gICBwcm9wZXJ0eSBhcyB3cml0YWJsZSlcbi8vIC0gZ2V0UHJvcGVydHlEZXNjcmlwdG9yIGNhbm5vdCByZXBvcnQgc2VhbGVkIHByb3BlcnRpZXMgYXMgbm9uLWV4aXN0ZW50XG4vLyAtIGdldFByb3BlcnR5RGVzY3JpcHRvciBjYW5ub3QgcmVwb3J0IGluY29tcGF0aWJsZSBjaGFuZ2VzIHRvIHRoZVxuLy8gICBhdHRyaWJ1dGVzIG9mIGEgc2VhbGVkIHByb3BlcnR5LiBJdCBfY2FuXyByZXBvcnQgaW5jb21wYXRpYmxlIGNoYW5nZXNcbi8vICAgdG8gdGhlIGF0dHJpYnV0ZXMgb2Ygbm9uLW93biwgaW5oZXJpdGVkIHByb3BlcnRpZXMuXG4vLyAtIGRlZmluZVByb3BlcnR5IGNhbm5vdCBtYWtlIGluY29tcGF0aWJsZSBjaGFuZ2VzIHRvIHRoZSBhdHRyaWJ1dGVzIG9mXG4vLyAgIHNlYWxlZCBwcm9wZXJ0aWVzXG4vLyAtIGRlbGV0ZVByb3BlcnR5IGNhbm5vdCByZXBvcnQgYSBzdWNjZXNzZnVsIGRlbGV0aW9uIG9mIGEgc2VhbGVkIHByb3BlcnR5XG4vLyAtIGhhc093biBjYW5ub3QgcmVwb3J0IGEgc2VhbGVkIHByb3BlcnR5IGFzIG5vbi1leGlzdGVudFxuLy8gLSBoYXMgY2Fubm90IHJlcG9ydCBhIHNlYWxlZCBwcm9wZXJ0eSBhcyBub24tZXhpc3RlbnRcbi8vIC0gZ2V0IGNhbm5vdCByZXBvcnQgaW5jb25zaXN0ZW50IHZhbHVlcyBmb3IgZnJvemVuIGRhdGFcbi8vICAgcHJvcGVydGllcywgYW5kIG11c3QgcmVwb3J0IHVuZGVmaW5lZCBmb3Igc2VhbGVkIGFjY2Vzc29ycyB3aXRoIGFuXG4vLyAgIHVuZGVmaW5lZCBnZXR0ZXJcbi8vIC0gc2V0IGNhbm5vdCByZXBvcnQgYSBzdWNjZXNzZnVsIGFzc2lnbm1lbnQgZm9yIGZyb3plbiBkYXRhXG4vLyAgIHByb3BlcnRpZXMgb3Igc2VhbGVkIGFjY2Vzc29ycyB3aXRoIGFuIHVuZGVmaW5lZCBzZXR0ZXIuXG4vLyAtIGdldHtPd259UHJvcGVydHlOYW1lcyBsaXN0cyBhbGwgc2VhbGVkIHByb3BlcnRpZXMgb2YgdGhlIHRhcmdldC5cbi8vIC0ga2V5cyBsaXN0cyBhbGwgZW51bWVyYWJsZSBzZWFsZWQgcHJvcGVydGllcyBvZiB0aGUgdGFyZ2V0LlxuLy8gLSBlbnVtZXJhdGUgbGlzdHMgYWxsIGVudW1lcmFibGUgc2VhbGVkIHByb3BlcnRpZXMgb2YgdGhlIHRhcmdldC5cbi8vIC0gaWYgYSBwcm9wZXJ0eSBvZiBhIG5vbi1leHRlbnNpYmxlIHByb3h5IGlzIHJlcG9ydGVkIGFzIG5vbi1leGlzdGVudCxcbi8vICAgdGhlbiBpdCBtdXN0IGZvcmV2ZXIgYmUgcmVwb3J0ZWQgYXMgbm9uLWV4aXN0ZW50LiBUaGlzIGFwcGxpZXMgdG9cbi8vICAgb3duIGFuZCBpbmhlcml0ZWQgcHJvcGVydGllcyBhbmQgaXMgZW5mb3JjZWQgaW4gdGhlXG4vLyAgIGRlbGV0ZVByb3BlcnR5LCBnZXR7T3dufVByb3BlcnR5RGVzY3JpcHRvciwgaGFze093bn0sXG4vLyAgIGdldHtPd259UHJvcGVydHlOYW1lcywga2V5cyBhbmQgZW51bWVyYXRlIHRyYXBzXG5cbi8vIFZpb2xhdGlvbiBvZiBhbnkgb2YgdGhlc2UgaW52YXJpYW50cyBieSBIIHdpbGwgcmVzdWx0IGluIFR5cGVFcnJvciBiZWluZ1xuLy8gdGhyb3duLlxuXG4vLyBBZGRpdGlvbmFsbHksIG9uY2UgT2JqZWN0LnByZXZlbnRFeHRlbnNpb25zLCBPYmplY3Quc2VhbCBvciBPYmplY3QuZnJlZXplXG4vLyBpcyBpbnZva2VkIG9uIHRoZSBwcm94eSwgdGhlIHNldCBvZiBvd24gcHJvcGVydHkgbmFtZXMgZm9yIHRoZSBwcm94eSBpc1xuLy8gZml4ZWQuIEFueSBwcm9wZXJ0eSBuYW1lIHRoYXQgaXMgbm90IGZpeGVkIGlzIGNhbGxlZCBhICduZXcnIHByb3BlcnR5LlxuXG4vLyBUaGUgVmFsaWRhdG9yIHVwaG9sZHMgdGhlIGZvbGxvd2luZyBpbnZhcmlhbnRzIHJlZ2FyZGluZyBleHRlbnNpYmlsaXR5OlxuLy8gLSBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IgY2Fubm90IHJlcG9ydCBuZXcgcHJvcGVydGllcyBhcyBleGlzdGVudFxuLy8gICAoaXQgbXVzdCByZXBvcnQgdGhlbSBhcyBub24tZXhpc3RlbnQgYnkgcmV0dXJuaW5nIHVuZGVmaW5lZClcbi8vIC0gZGVmaW5lUHJvcGVydHkgY2Fubm90IHN1Y2Nlc3NmdWxseSBhZGQgYSBuZXcgcHJvcGVydHkgKGl0IG11c3QgcmVqZWN0KVxuLy8gLSBnZXRPd25Qcm9wZXJ0eU5hbWVzIGNhbm5vdCBsaXN0IG5ldyBwcm9wZXJ0aWVzXG4vLyAtIGhhc093biBjYW5ub3QgcmVwb3J0IHRydWUgZm9yIG5ldyBwcm9wZXJ0aWVzIChpdCBtdXN0IHJlcG9ydCBmYWxzZSlcbi8vIC0ga2V5cyBjYW5ub3QgbGlzdCBuZXcgcHJvcGVydGllc1xuXG4vLyBJbnZhcmlhbnRzIGN1cnJlbnRseSBub3QgZW5mb3JjZWQ6XG4vLyAtIGdldE93blByb3BlcnR5TmFtZXMgbGlzdHMgb25seSBvd24gcHJvcGVydHkgbmFtZXNcbi8vIC0ga2V5cyBsaXN0cyBvbmx5IGVudW1lcmFibGUgb3duIHByb3BlcnR5IG5hbWVzXG4vLyBCb3RoIHRyYXBzIG1heSBsaXN0IG1vcmUgcHJvcGVydHkgbmFtZXMgdGhhbiBhcmUgYWN0dWFsbHkgZGVmaW5lZCBvbiB0aGVcbi8vIHRhcmdldC5cblxuLy8gSW52YXJpYW50cyB3aXRoIHJlZ2FyZCB0byBpbmhlcml0YW5jZSBhcmUgY3VycmVudGx5IG5vdCBlbmZvcmNlZC5cbi8vIC0gYSBub24tY29uZmlndXJhYmxlIHBvdGVudGlhbGx5IGluaGVyaXRlZCBwcm9wZXJ0eSBvbiBhIHByb3h5IHdpdGhcbi8vICAgbm9uLW11dGFibGUgYW5jZXN0cnkgY2Fubm90IGJlIHJlcG9ydGVkIGFzIG5vbi1leGlzdGVudFxuLy8gKEFuIG9iamVjdCB3aXRoIG5vbi1tdXRhYmxlIGFuY2VzdHJ5IGlzIGEgbm9uLWV4dGVuc2libGUgb2JqZWN0IHdob3NlXG4vLyBbW1Byb3RvdHlwZV1dIGlzIGVpdGhlciBudWxsIG9yIGFuIG9iamVjdCB3aXRoIG5vbi1tdXRhYmxlIGFuY2VzdHJ5LilcblxuLy8gQ2hhbmdlcyBpbiBIYW5kbGVyIEFQSSBjb21wYXJlZCB0byBwcmV2aW91cyBoYXJtb255OnByb3hpZXMsIHNlZTpcbi8vIGh0dHA6Ly93aWtpLmVjbWFzY3JpcHQub3JnL2Rva3UucGhwP2lkPXN0cmF3bWFuOmRpcmVjdF9wcm94aWVzXG4vLyBodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1oYXJtb255OmRpcmVjdF9wcm94aWVzXG5cbi8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuLy8gLS0tLSBXZWFrTWFwIHBvbHlmaWxsIC0tLS1cblxuLy8gVE9ETzogZmluZCBhIHByb3BlciBXZWFrTWFwIHBvbHlmaWxsXG5cbi8vIGRlZmluZSBhbiBlbXB0eSBXZWFrTWFwIHNvIHRoYXQgYXQgbGVhc3QgdGhlIFJlZmxlY3QgbW9kdWxlIGNvZGVcbi8vIHdpbGwgd29yayBpbiB0aGUgYWJzZW5jZSBvZiBXZWFrTWFwcy4gUHJveHkgZW11bGF0aW9uIGRlcGVuZHMgb25cbi8vIGFjdHVhbCBXZWFrTWFwcywgc28gd2lsbCBub3Qgd29yayB3aXRoIHRoaXMgbGl0dGxlIHNoaW0uXG5pZiAodHlwZW9mIFdlYWtNYXAgPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgZ2xvYmFsLldlYWtNYXAgPSBmdW5jdGlvbigpe307XG4gIGdsb2JhbC5XZWFrTWFwLnByb3RvdHlwZSA9IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKGspIHsgcmV0dXJuIHVuZGVmaW5lZDsgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKGssdikgeyB0aHJvdyBuZXcgRXJyb3IoXCJXZWFrTWFwIG5vdCBzdXBwb3J0ZWRcIik7IH1cbiAgfTtcbn1cblxuLy8gLS0tLSBOb3JtYWxpemF0aW9uIGZ1bmN0aW9ucyBmb3IgcHJvcGVydHkgZGVzY3JpcHRvcnMgLS0tLVxuXG5mdW5jdGlvbiBpc1N0YW5kYXJkQXR0cmlidXRlKG5hbWUpIHtcbiAgcmV0dXJuIC9eKGdldHxzZXR8dmFsdWV8d3JpdGFibGV8ZW51bWVyYWJsZXxjb25maWd1cmFibGUpJC8udGVzdChuYW1lKTtcbn1cblxuLy8gQWRhcHRlZCBmcm9tIEVTNSBzZWN0aW9uIDguMTAuNVxuZnVuY3Rpb24gdG9Qcm9wZXJ0eURlc2NyaXB0b3Iob2JqKSB7XG4gIGlmIChPYmplY3Qob2JqKSAhPT0gb2JqKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcInByb3BlcnR5IGRlc2NyaXB0b3Igc2hvdWxkIGJlIGFuIE9iamVjdCwgZ2l2ZW46IFwiK1xuICAgICAgICAgICAgICAgICAgICAgICAgb2JqKTtcbiAgfVxuICB2YXIgZGVzYyA9IHt9O1xuICBpZiAoJ2VudW1lcmFibGUnIGluIG9iaikgeyBkZXNjLmVudW1lcmFibGUgPSAhIW9iai5lbnVtZXJhYmxlOyB9XG4gIGlmICgnY29uZmlndXJhYmxlJyBpbiBvYmopIHsgZGVzYy5jb25maWd1cmFibGUgPSAhIW9iai5jb25maWd1cmFibGU7IH1cbiAgaWYgKCd2YWx1ZScgaW4gb2JqKSB7IGRlc2MudmFsdWUgPSBvYmoudmFsdWU7IH1cbiAgaWYgKCd3cml0YWJsZScgaW4gb2JqKSB7IGRlc2Mud3JpdGFibGUgPSAhIW9iai53cml0YWJsZTsgfVxuICBpZiAoJ2dldCcgaW4gb2JqKSB7XG4gICAgdmFyIGdldHRlciA9IG9iai5nZXQ7XG4gICAgaWYgKGdldHRlciAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBnZXR0ZXIgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcInByb3BlcnR5IGRlc2NyaXB0b3IgJ2dldCcgYXR0cmlidXRlIG11c3QgYmUgXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwiY2FsbGFibGUgb3IgdW5kZWZpbmVkLCBnaXZlbjogXCIrZ2V0dGVyKTtcbiAgICB9XG4gICAgZGVzYy5nZXQgPSBnZXR0ZXI7XG4gIH1cbiAgaWYgKCdzZXQnIGluIG9iaikge1xuICAgIHZhciBzZXR0ZXIgPSBvYmouc2V0O1xuICAgIGlmIChzZXR0ZXIgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2Ygc2V0dGVyICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJwcm9wZXJ0eSBkZXNjcmlwdG9yICdzZXQnIGF0dHJpYnV0ZSBtdXN0IGJlIFwiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICBcImNhbGxhYmxlIG9yIHVuZGVmaW5lZCwgZ2l2ZW46IFwiK3NldHRlcik7XG4gICAgfVxuICAgIGRlc2Muc2V0ID0gc2V0dGVyO1xuICB9XG4gIGlmICgnZ2V0JyBpbiBkZXNjIHx8ICdzZXQnIGluIGRlc2MpIHtcbiAgICBpZiAoJ3ZhbHVlJyBpbiBkZXNjIHx8ICd3cml0YWJsZScgaW4gZGVzYykge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcInByb3BlcnR5IGRlc2NyaXB0b3IgY2Fubm90IGJlIGJvdGggYSBkYXRhIGFuZCBhbiBcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCJhY2Nlc3NvciBkZXNjcmlwdG9yOiBcIitvYmopO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGVzYztcbn1cblxuZnVuY3Rpb24gaXNBY2Nlc3NvckRlc2NyaXB0b3IoZGVzYykge1xuICBpZiAoZGVzYyA9PT0gdW5kZWZpbmVkKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiAoJ2dldCcgaW4gZGVzYyB8fCAnc2V0JyBpbiBkZXNjKTtcbn1cbmZ1bmN0aW9uIGlzRGF0YURlc2NyaXB0b3IoZGVzYykge1xuICBpZiAoZGVzYyA9PT0gdW5kZWZpbmVkKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiAoJ3ZhbHVlJyBpbiBkZXNjIHx8ICd3cml0YWJsZScgaW4gZGVzYyk7XG59XG5mdW5jdGlvbiBpc0dlbmVyaWNEZXNjcmlwdG9yKGRlc2MpIHtcbiAgaWYgKGRlc2MgPT09IHVuZGVmaW5lZCkgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gIWlzQWNjZXNzb3JEZXNjcmlwdG9yKGRlc2MpICYmICFpc0RhdGFEZXNjcmlwdG9yKGRlc2MpO1xufVxuXG5mdW5jdGlvbiB0b0NvbXBsZXRlUHJvcGVydHlEZXNjcmlwdG9yKGRlc2MpIHtcbiAgdmFyIGludGVybmFsRGVzYyA9IHRvUHJvcGVydHlEZXNjcmlwdG9yKGRlc2MpO1xuICBpZiAoaXNHZW5lcmljRGVzY3JpcHRvcihpbnRlcm5hbERlc2MpIHx8IGlzRGF0YURlc2NyaXB0b3IoaW50ZXJuYWxEZXNjKSkge1xuICAgIGlmICghKCd2YWx1ZScgaW4gaW50ZXJuYWxEZXNjKSkgeyBpbnRlcm5hbERlc2MudmFsdWUgPSB1bmRlZmluZWQ7IH1cbiAgICBpZiAoISgnd3JpdGFibGUnIGluIGludGVybmFsRGVzYykpIHsgaW50ZXJuYWxEZXNjLndyaXRhYmxlID0gZmFsc2U7IH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoISgnZ2V0JyBpbiBpbnRlcm5hbERlc2MpKSB7IGludGVybmFsRGVzYy5nZXQgPSB1bmRlZmluZWQ7IH1cbiAgICBpZiAoISgnc2V0JyBpbiBpbnRlcm5hbERlc2MpKSB7IGludGVybmFsRGVzYy5zZXQgPSB1bmRlZmluZWQ7IH1cbiAgfVxuICBpZiAoISgnZW51bWVyYWJsZScgaW4gaW50ZXJuYWxEZXNjKSkgeyBpbnRlcm5hbERlc2MuZW51bWVyYWJsZSA9IGZhbHNlOyB9XG4gIGlmICghKCdjb25maWd1cmFibGUnIGluIGludGVybmFsRGVzYykpIHsgaW50ZXJuYWxEZXNjLmNvbmZpZ3VyYWJsZSA9IGZhbHNlOyB9XG4gIHJldHVybiBpbnRlcm5hbERlc2M7XG59XG5cbmZ1bmN0aW9uIGlzRW1wdHlEZXNjcmlwdG9yKGRlc2MpIHtcbiAgcmV0dXJuICEoJ2dldCcgaW4gZGVzYykgJiZcbiAgICAgICAgICEoJ3NldCcgaW4gZGVzYykgJiZcbiAgICAgICAgICEoJ3ZhbHVlJyBpbiBkZXNjKSAmJlxuICAgICAgICAgISgnd3JpdGFibGUnIGluIGRlc2MpICYmXG4gICAgICAgICAhKCdlbnVtZXJhYmxlJyBpbiBkZXNjKSAmJlxuICAgICAgICAgISgnY29uZmlndXJhYmxlJyBpbiBkZXNjKTtcbn1cblxuZnVuY3Rpb24gaXNFcXVpdmFsZW50RGVzY3JpcHRvcihkZXNjMSwgZGVzYzIpIHtcbiAgcmV0dXJuIHNhbWVWYWx1ZShkZXNjMS5nZXQsIGRlc2MyLmdldCkgJiZcbiAgICAgICAgIHNhbWVWYWx1ZShkZXNjMS5zZXQsIGRlc2MyLnNldCkgJiZcbiAgICAgICAgIHNhbWVWYWx1ZShkZXNjMS52YWx1ZSwgZGVzYzIudmFsdWUpICYmXG4gICAgICAgICBzYW1lVmFsdWUoZGVzYzEud3JpdGFibGUsIGRlc2MyLndyaXRhYmxlKSAmJlxuICAgICAgICAgc2FtZVZhbHVlKGRlc2MxLmVudW1lcmFibGUsIGRlc2MyLmVudW1lcmFibGUpICYmXG4gICAgICAgICBzYW1lVmFsdWUoZGVzYzEuY29uZmlndXJhYmxlLCBkZXNjMi5jb25maWd1cmFibGUpO1xufVxuXG4vLyBjb3BpZWQgZnJvbSBodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1oYXJtb255OmVnYWxcbmZ1bmN0aW9uIHNhbWVWYWx1ZSh4LCB5KSB7XG4gIGlmICh4ID09PSB5KSB7XG4gICAgLy8gMCA9PT0gLTAsIGJ1dCB0aGV5IGFyZSBub3QgaWRlbnRpY2FsXG4gICAgcmV0dXJuIHggIT09IDAgfHwgMSAvIHggPT09IDEgLyB5O1xuICB9XG5cbiAgLy8gTmFOICE9PSBOYU4sIGJ1dCB0aGV5IGFyZSBpZGVudGljYWwuXG4gIC8vIE5hTnMgYXJlIHRoZSBvbmx5IG5vbi1yZWZsZXhpdmUgdmFsdWUsIGkuZS4sIGlmIHggIT09IHgsXG4gIC8vIHRoZW4geCBpcyBhIE5hTi5cbiAgLy8gaXNOYU4gaXMgYnJva2VuOiBpdCBjb252ZXJ0cyBpdHMgYXJndW1lbnQgdG8gbnVtYmVyLCBzb1xuICAvLyBpc05hTihcImZvb1wiKSA9PiB0cnVlXG4gIHJldHVybiB4ICE9PSB4ICYmIHkgIT09IHk7XG59XG5cbi8qKlxuICogUmV0dXJucyBhIGZyZXNoIHByb3BlcnR5IGRlc2NyaXB0b3IgdGhhdCBpcyBndWFyYW50ZWVkXG4gKiB0byBiZSBjb21wbGV0ZSAoaS5lLiBjb250YWluIGFsbCB0aGUgc3RhbmRhcmQgYXR0cmlidXRlcykuXG4gKiBBZGRpdGlvbmFsbHksIGFueSBub24tc3RhbmRhcmQgZW51bWVyYWJsZSBwcm9wZXJ0aWVzIG9mXG4gKiBhdHRyaWJ1dGVzIGFyZSBjb3BpZWQgb3ZlciB0byB0aGUgZnJlc2ggZGVzY3JpcHRvci5cbiAqXG4gKiBJZiBhdHRyaWJ1dGVzIGlzIHVuZGVmaW5lZCwgcmV0dXJucyB1bmRlZmluZWQuXG4gKlxuICogU2VlIGFsc286IGh0dHA6Ly93aWtpLmVjbWFzY3JpcHQub3JnL2Rva3UucGhwP2lkPWhhcm1vbnk6cHJveGllc19zZW1hbnRpY3NcbiAqL1xuZnVuY3Rpb24gbm9ybWFsaXplQW5kQ29tcGxldGVQcm9wZXJ0eURlc2NyaXB0b3IoYXR0cmlidXRlcykge1xuICBpZiAoYXR0cmlidXRlcyA9PT0gdW5kZWZpbmVkKSB7IHJldHVybiB1bmRlZmluZWQ7IH1cbiAgdmFyIGRlc2MgPSB0b0NvbXBsZXRlUHJvcGVydHlEZXNjcmlwdG9yKGF0dHJpYnV0ZXMpO1xuICAvLyBOb3RlOiBubyBuZWVkIHRvIGNhbGwgRnJvbVByb3BlcnR5RGVzY3JpcHRvcihkZXNjKSwgYXMgd2UgcmVwcmVzZW50XG4gIC8vIFwiaW50ZXJuYWxcIiBwcm9wZXJ0eSBkZXNjcmlwdG9ycyBhcyBwcm9wZXIgT2JqZWN0cyBmcm9tIHRoZSBzdGFydFxuICBmb3IgKHZhciBuYW1lIGluIGF0dHJpYnV0ZXMpIHtcbiAgICBpZiAoIWlzU3RhbmRhcmRBdHRyaWJ1dGUobmFtZSkpIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShkZXNjLCBuYW1lLFxuICAgICAgICB7IHZhbHVlOiBhdHRyaWJ1dGVzW25hbWVdLFxuICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlIH0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGVzYztcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgZnJlc2ggcHJvcGVydHkgZGVzY3JpcHRvciB3aG9zZSBzdGFuZGFyZFxuICogYXR0cmlidXRlcyBhcmUgZ3VhcmFudGVlZCB0byBiZSBkYXRhIHByb3BlcnRpZXMgb2YgdGhlIHJpZ2h0IHR5cGUuXG4gKiBBZGRpdGlvbmFsbHksIGFueSBub24tc3RhbmRhcmQgZW51bWVyYWJsZSBwcm9wZXJ0aWVzIG9mXG4gKiBhdHRyaWJ1dGVzIGFyZSBjb3BpZWQgb3ZlciB0byB0aGUgZnJlc2ggZGVzY3JpcHRvci5cbiAqXG4gKiBJZiBhdHRyaWJ1dGVzIGlzIHVuZGVmaW5lZCwgd2lsbCB0aHJvdyBhIFR5cGVFcnJvci5cbiAqXG4gKiBTZWUgYWxzbzogaHR0cDovL3dpa2kuZWNtYXNjcmlwdC5vcmcvZG9rdS5waHA/aWQ9aGFybW9ueTpwcm94aWVzX3NlbWFudGljc1xuICovXG5mdW5jdGlvbiBub3JtYWxpemVQcm9wZXJ0eURlc2NyaXB0b3IoYXR0cmlidXRlcykge1xuICB2YXIgZGVzYyA9IHRvUHJvcGVydHlEZXNjcmlwdG9yKGF0dHJpYnV0ZXMpO1xuICAvLyBOb3RlOiBubyBuZWVkIHRvIGNhbGwgRnJvbUdlbmVyaWNQcm9wZXJ0eURlc2NyaXB0b3IoZGVzYyksIGFzIHdlIHJlcHJlc2VudFxuICAvLyBcImludGVybmFsXCIgcHJvcGVydHkgZGVzY3JpcHRvcnMgYXMgcHJvcGVyIE9iamVjdHMgZnJvbSB0aGUgc3RhcnRcbiAgZm9yICh2YXIgbmFtZSBpbiBhdHRyaWJ1dGVzKSB7XG4gICAgaWYgKCFpc1N0YW5kYXJkQXR0cmlidXRlKG5hbWUpKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZGVzYywgbmFtZSxcbiAgICAgICAgeyB2YWx1ZTogYXR0cmlidXRlc1tuYW1lXSxcbiAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlc2M7XG59XG5cbi8vIHN0b3JlIGEgcmVmZXJlbmNlIHRvIHRoZSByZWFsIEVTNSBwcmltaXRpdmVzIGJlZm9yZSBwYXRjaGluZyB0aGVtIGxhdGVyXG52YXIgcHJpbV9wcmV2ZW50RXh0ZW5zaW9ucyA9ICAgICAgICBPYmplY3QucHJldmVudEV4dGVuc2lvbnMsXG4gICAgcHJpbV9zZWFsID0gICAgICAgICAgICAgICAgICAgICBPYmplY3Quc2VhbCxcbiAgICBwcmltX2ZyZWV6ZSA9ICAgICAgICAgICAgICAgICAgIE9iamVjdC5mcmVlemUsXG4gICAgcHJpbV9pc0V4dGVuc2libGUgPSAgICAgICAgICAgICBPYmplY3QuaXNFeHRlbnNpYmxlLFxuICAgIHByaW1faXNTZWFsZWQgPSAgICAgICAgICAgICAgICAgT2JqZWN0LmlzU2VhbGVkLFxuICAgIHByaW1faXNGcm96ZW4gPSAgICAgICAgICAgICAgICAgT2JqZWN0LmlzRnJvemVuLFxuICAgIHByaW1fZ2V0UHJvdG90eXBlT2YgPSAgICAgICAgICAgT2JqZWN0LmdldFByb3RvdHlwZU9mLFxuICAgIHByaW1fZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcixcbiAgICBwcmltX2RlZmluZVByb3BlcnR5ID0gICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSxcbiAgICBwcmltX2RlZmluZVByb3BlcnRpZXMgPSAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzLFxuICAgIHByaW1fa2V5cyA9ICAgICAgICAgICAgICAgICAgICAgT2JqZWN0LmtleXMsXG4gICAgcHJpbV9nZXRPd25Qcm9wZXJ0eU5hbWVzID0gICAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyxcbiAgICBwcmltX2dldE93blByb3BlcnR5U3ltYm9scyA9ICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMsXG4gICAgcHJpbV9hc3NpZ24gPSAgICAgICAgICAgICAgICAgICBPYmplY3QuYXNzaWduLFxuICAgIHByaW1faXNBcnJheSA9ICAgICAgICAgICAgICAgICAgQXJyYXkuaXNBcnJheSxcbiAgICBwcmltX2NvbmNhdCA9ICAgICAgICAgICAgICAgICAgIEFycmF5LnByb3RvdHlwZS5jb25jYXQsXG4gICAgcHJpbV9pc1Byb3RvdHlwZU9mID0gICAgICAgICAgICBPYmplY3QucHJvdG90eXBlLmlzUHJvdG90eXBlT2YsXG4gICAgcHJpbV9oYXNPd25Qcm9wZXJ0eSA9ICAgICAgICAgICBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG4vLyB0aGVzZSB3aWxsIHBvaW50IHRvIHRoZSBwYXRjaGVkIHZlcnNpb25zIG9mIHRoZSByZXNwZWN0aXZlIG1ldGhvZHMgb25cbi8vIE9iamVjdC4gVGhleSBhcmUgdXNlZCB3aXRoaW4gdGhpcyBtb2R1bGUgYXMgdGhlIFwiaW50cmluc2ljXCIgYmluZGluZ3Ncbi8vIG9mIHRoZXNlIG1ldGhvZHMgKGkuZS4gdGhlIFwib3JpZ2luYWxcIiBiaW5kaW5ncyBhcyBkZWZpbmVkIGluIHRoZSBzcGVjKVxudmFyIE9iamVjdF9pc0Zyb3plbixcbiAgICBPYmplY3RfaXNTZWFsZWQsXG4gICAgT2JqZWN0X2lzRXh0ZW5zaWJsZSxcbiAgICBPYmplY3RfZ2V0UHJvdG90eXBlT2YsXG4gICAgT2JqZWN0X2dldE93blByb3BlcnR5TmFtZXM7XG5cbi8qKlxuICogQSBwcm9wZXJ0eSAnbmFtZScgaXMgZml4ZWQgaWYgaXQgaXMgYW4gb3duIHByb3BlcnR5IG9mIHRoZSB0YXJnZXQuXG4gKi9cbmZ1bmN0aW9uIGlzRml4ZWQobmFtZSwgdGFyZ2V0KSB7XG4gIHJldHVybiAoe30pLmhhc093blByb3BlcnR5LmNhbGwodGFyZ2V0LCBuYW1lKTtcbn1cbmZ1bmN0aW9uIGlzU2VhbGVkKG5hbWUsIHRhcmdldCkge1xuICB2YXIgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBuYW1lKTtcbiAgaWYgKGRlc2MgPT09IHVuZGVmaW5lZCkgeyByZXR1cm4gZmFsc2U7IH1cbiAgcmV0dXJuIGRlc2MuY29uZmlndXJhYmxlID09PSBmYWxzZTtcbn1cbmZ1bmN0aW9uIGlzU2VhbGVkRGVzYyhkZXNjKSB7XG4gIHJldHVybiBkZXNjICE9PSB1bmRlZmluZWQgJiYgZGVzYy5jb25maWd1cmFibGUgPT09IGZhbHNlO1xufVxuXG4vKipcbiAqIFBlcmZvcm1zIGFsbCB2YWxpZGF0aW9uIHRoYXQgT2JqZWN0LmRlZmluZVByb3BlcnR5IHBlcmZvcm1zLFxuICogd2l0aG91dCBhY3R1YWxseSBkZWZpbmluZyB0aGUgcHJvcGVydHkuIFJldHVybnMgYSBib29sZWFuXG4gKiBpbmRpY2F0aW5nIHdoZXRoZXIgdmFsaWRhdGlvbiBzdWNjZWVkZWQuXG4gKlxuICogSW1wbGVtZW50YXRpb24gdHJhbnNsaXRlcmF0ZWQgZnJvbSBFUzUuMSBzZWN0aW9uIDguMTIuOVxuICovXG5mdW5jdGlvbiBpc0NvbXBhdGlibGVEZXNjcmlwdG9yKGV4dGVuc2libGUsIGN1cnJlbnQsIGRlc2MpIHtcbiAgaWYgKGN1cnJlbnQgPT09IHVuZGVmaW5lZCAmJiBleHRlbnNpYmxlID09PSBmYWxzZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAoY3VycmVudCA9PT0gdW5kZWZpbmVkICYmIGV4dGVuc2libGUgPT09IHRydWUpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBpZiAoaXNFbXB0eURlc2NyaXB0b3IoZGVzYykpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBpZiAoaXNFcXVpdmFsZW50RGVzY3JpcHRvcihjdXJyZW50LCBkZXNjKSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIGlmIChjdXJyZW50LmNvbmZpZ3VyYWJsZSA9PT0gZmFsc2UpIHtcbiAgICBpZiAoZGVzYy5jb25maWd1cmFibGUgPT09IHRydWUpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKCdlbnVtZXJhYmxlJyBpbiBkZXNjICYmIGRlc2MuZW51bWVyYWJsZSAhPT0gY3VycmVudC5lbnVtZXJhYmxlKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9XG4gIGlmIChpc0dlbmVyaWNEZXNjcmlwdG9yKGRlc2MpKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgaWYgKGlzRGF0YURlc2NyaXB0b3IoY3VycmVudCkgIT09IGlzRGF0YURlc2NyaXB0b3IoZGVzYykpIHtcbiAgICBpZiAoY3VycmVudC5jb25maWd1cmFibGUgPT09IGZhbHNlKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIGlmIChpc0RhdGFEZXNjcmlwdG9yKGN1cnJlbnQpICYmIGlzRGF0YURlc2NyaXB0b3IoZGVzYykpIHtcbiAgICBpZiAoY3VycmVudC5jb25maWd1cmFibGUgPT09IGZhbHNlKSB7XG4gICAgICBpZiAoY3VycmVudC53cml0YWJsZSA9PT0gZmFsc2UgJiYgZGVzYy53cml0YWJsZSA9PT0gdHJ1ZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoY3VycmVudC53cml0YWJsZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgaWYgKCd2YWx1ZScgaW4gZGVzYyAmJiAhc2FtZVZhbHVlKGRlc2MudmFsdWUsIGN1cnJlbnQudmFsdWUpKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIGlmIChpc0FjY2Vzc29yRGVzY3JpcHRvcihjdXJyZW50KSAmJiBpc0FjY2Vzc29yRGVzY3JpcHRvcihkZXNjKSkge1xuICAgIGlmIChjdXJyZW50LmNvbmZpZ3VyYWJsZSA9PT0gZmFsc2UpIHtcbiAgICAgIGlmICgnc2V0JyBpbiBkZXNjICYmICFzYW1lVmFsdWUoZGVzYy5zZXQsIGN1cnJlbnQuc2V0KSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoJ2dldCcgaW4gZGVzYyAmJiAhc2FtZVZhbHVlKGRlc2MuZ2V0LCBjdXJyZW50LmdldCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuLy8gRVM2IDcuMy4xMSBTZXRJbnRlZ3JpdHlMZXZlbFxuLy8gbGV2ZWwgaXMgb25lIG9mIFwic2VhbGVkXCIgb3IgXCJmcm96ZW5cIlxuZnVuY3Rpb24gc2V0SW50ZWdyaXR5TGV2ZWwodGFyZ2V0LCBsZXZlbCkge1xuICB2YXIgb3duUHJvcHMgPSBPYmplY3RfZ2V0T3duUHJvcGVydHlOYW1lcyh0YXJnZXQpO1xuICB2YXIgcGVuZGluZ0V4Y2VwdGlvbiA9IHVuZGVmaW5lZDtcbiAgaWYgKGxldmVsID09PSBcInNlYWxlZFwiKSB7XG4gICAgdmFyIGwgPSArb3duUHJvcHMubGVuZ3RoO1xuICAgIHZhciBrO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbDsgaSsrKSB7XG4gICAgICBrID0gU3RyaW5nKG93blByb3BzW2ldKTtcbiAgICAgIHRyeSB7XG4gICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGssIHsgY29uZmlndXJhYmxlOiBmYWxzZSB9KTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgaWYgKHBlbmRpbmdFeGNlcHRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHBlbmRpbmdFeGNlcHRpb24gPSBlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIC8vIGxldmVsID09PSBcImZyb3plblwiXG4gICAgdmFyIGwgPSArb3duUHJvcHMubGVuZ3RoO1xuICAgIHZhciBrO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbDsgaSsrKSB7XG4gICAgICBrID0gU3RyaW5nKG93blByb3BzW2ldKTtcbiAgICAgIHRyeSB7XG4gICAgICAgIHZhciBjdXJyZW50RGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrKTtcbiAgICAgICAgaWYgKGN1cnJlbnREZXNjICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB2YXIgZGVzYztcbiAgICAgICAgICBpZiAoaXNBY2Nlc3NvckRlc2NyaXB0b3IoY3VycmVudERlc2MpKSB7XG4gICAgICAgICAgICBkZXNjID0geyBjb25maWd1cmFibGU6IGZhbHNlIH1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGVzYyA9IHsgY29uZmlndXJhYmxlOiBmYWxzZSwgd3JpdGFibGU6IGZhbHNlIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgaywgZGVzYyk7XG4gICAgICAgIH0gICAgICAgIFxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBpZiAocGVuZGluZ0V4Y2VwdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcGVuZGluZ0V4Y2VwdGlvbiA9IGU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgaWYgKHBlbmRpbmdFeGNlcHRpb24gIT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IHBlbmRpbmdFeGNlcHRpb247XG4gIH1cbiAgcmV0dXJuIFJlZmxlY3QucHJldmVudEV4dGVuc2lvbnModGFyZ2V0KTtcbn1cblxuLy8gRVM2IDcuMy4xMiBUZXN0SW50ZWdyaXR5TGV2ZWxcbi8vIGxldmVsIGlzIG9uZSBvZiBcInNlYWxlZFwiIG9yIFwiZnJvemVuXCJcbmZ1bmN0aW9uIHRlc3RJbnRlZ3JpdHlMZXZlbCh0YXJnZXQsIGxldmVsKSB7XG4gIHZhciBpc0V4dGVuc2libGUgPSBPYmplY3RfaXNFeHRlbnNpYmxlKHRhcmdldCk7XG4gIGlmIChpc0V4dGVuc2libGUpIHJldHVybiBmYWxzZTtcbiAgXG4gIHZhciBvd25Qcm9wcyA9IE9iamVjdF9nZXRPd25Qcm9wZXJ0eU5hbWVzKHRhcmdldCk7XG4gIHZhciBwZW5kaW5nRXhjZXB0aW9uID0gdW5kZWZpbmVkO1xuICB2YXIgY29uZmlndXJhYmxlID0gZmFsc2U7XG4gIHZhciB3cml0YWJsZSA9IGZhbHNlO1xuICBcbiAgdmFyIGwgPSArb3duUHJvcHMubGVuZ3RoO1xuICB2YXIgaztcbiAgdmFyIGN1cnJlbnREZXNjO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgIGsgPSBTdHJpbmcob3duUHJvcHNbaV0pO1xuICAgIHRyeSB7XG4gICAgICBjdXJyZW50RGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBrKTtcbiAgICAgIGNvbmZpZ3VyYWJsZSA9IGNvbmZpZ3VyYWJsZSB8fCBjdXJyZW50RGVzYy5jb25maWd1cmFibGU7XG4gICAgICBpZiAoaXNEYXRhRGVzY3JpcHRvcihjdXJyZW50RGVzYykpIHtcbiAgICAgICAgd3JpdGFibGUgPSB3cml0YWJsZSB8fCBjdXJyZW50RGVzYy53cml0YWJsZTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBpZiAocGVuZGluZ0V4Y2VwdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHBlbmRpbmdFeGNlcHRpb24gPSBlO1xuICAgICAgICBjb25maWd1cmFibGUgPSB0cnVlO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBpZiAocGVuZGluZ0V4Y2VwdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgcGVuZGluZ0V4Y2VwdGlvbjtcbiAgfVxuICBpZiAobGV2ZWwgPT09IFwiZnJvemVuXCIgJiYgd3JpdGFibGUgPT09IHRydWUpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKGNvbmZpZ3VyYWJsZSA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICByZXR1cm4gdHJ1ZTtcbn1cblxuLy8gLS0tLSBUaGUgVmFsaWRhdG9yIGhhbmRsZXIgd3JhcHBlciBhcm91bmQgdXNlciBoYW5kbGVycyAtLS0tXG5cbi8qKlxuICogQHBhcmFtIHRhcmdldCB0aGUgb2JqZWN0IHdyYXBwZWQgYnkgdGhpcyBwcm94eS5cbiAqIEFzIGxvbmcgYXMgdGhlIHByb3h5IGlzIGV4dGVuc2libGUsIG9ubHkgbm9uLWNvbmZpZ3VyYWJsZSBwcm9wZXJ0aWVzXG4gKiBhcmUgY2hlY2tlZCBhZ2FpbnN0IHRoZSB0YXJnZXQuIE9uY2UgdGhlIHByb3h5IGJlY29tZXMgbm9uLWV4dGVuc2libGUsXG4gKiBpbnZhcmlhbnRzIHcuci50LiBub24tZXh0ZW5zaWJpbGl0eSBhcmUgYWxzbyBlbmZvcmNlZC5cbiAqXG4gKiBAcGFyYW0gaGFuZGxlciB0aGUgaGFuZGxlciBvZiB0aGUgZGlyZWN0IHByb3h5LiBUaGUgb2JqZWN0IGVtdWxhdGVkIGJ5XG4gKiB0aGlzIGhhbmRsZXIgaXMgdmFsaWRhdGVkIGFnYWluc3QgdGhlIHRhcmdldCBvYmplY3Qgb2YgdGhlIGRpcmVjdCBwcm94eS5cbiAqIEFueSB2aW9sYXRpb25zIHRoYXQgdGhlIGhhbmRsZXIgbWFrZXMgYWdhaW5zdCB0aGUgaW52YXJpYW50c1xuICogb2YgdGhlIHRhcmdldCB3aWxsIGNhdXNlIGEgVHlwZUVycm9yIHRvIGJlIHRocm93bi5cbiAqXG4gKiBCb3RoIHRhcmdldCBhbmQgaGFuZGxlciBtdXN0IGJlIHByb3BlciBPYmplY3RzIGF0IGluaXRpYWxpemF0aW9uIHRpbWUuXG4gKi9cbmZ1bmN0aW9uIFZhbGlkYXRvcih0YXJnZXQsIGhhbmRsZXIpIHtcbiAgLy8gZm9yIG5vbi1yZXZva2FibGUgcHJveGllcywgdGhlc2UgYXJlIGNvbnN0IHJlZmVyZW5jZXNcbiAgLy8gZm9yIHJldm9rYWJsZSBwcm94aWVzLCBvbiByZXZvY2F0aW9uOlxuICAvLyAtIHRoaXMudGFyZ2V0IGlzIHNldCB0byBudWxsXG4gIC8vIC0gdGhpcy5oYW5kbGVyIGlzIHNldCB0byBhIGhhbmRsZXIgdGhhdCB0aHJvd3Mgb24gYWxsIHRyYXBzXG4gIHRoaXMudGFyZ2V0ICA9IHRhcmdldDtcbiAgdGhpcy5oYW5kbGVyID0gaGFuZGxlcjtcbn1cblxuVmFsaWRhdG9yLnByb3RvdHlwZSA9IHtcblxuICAvKipcbiAgICogSWYgZ2V0VHJhcCByZXR1cm5zIHVuZGVmaW5lZCwgdGhlIGNhbGxlciBzaG91bGQgcGVyZm9ybSB0aGVcbiAgICogZGVmYXVsdCBmb3J3YXJkaW5nIGJlaGF2aW9yLlxuICAgKiBJZiBnZXRUcmFwIHJldHVybnMgbm9ybWFsbHkgb3RoZXJ3aXNlLCB0aGUgcmV0dXJuIHZhbHVlXG4gICAqIHdpbGwgYmUgYSBjYWxsYWJsZSB0cmFwIGZ1bmN0aW9uLiBXaGVuIGNhbGxpbmcgdGhlIHRyYXAgZnVuY3Rpb24sXG4gICAqIHRoZSBjYWxsZXIgaXMgcmVzcG9uc2libGUgZm9yIGJpbmRpbmcgaXRzIHx0aGlzfCB0byB8dGhpcy5oYW5kbGVyfC5cbiAgICovXG4gIGdldFRyYXA6IGZ1bmN0aW9uKHRyYXBOYW1lKSB7XG4gICAgdmFyIHRyYXAgPSB0aGlzLmhhbmRsZXJbdHJhcE5hbWVdO1xuICAgIGlmICh0cmFwID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIHRoZSB0cmFwIHdhcyBub3QgZGVmaW5lZCxcbiAgICAgIC8vIHBlcmZvcm0gdGhlIGRlZmF1bHQgZm9yd2FyZGluZyBiZWhhdmlvclxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHRyYXAgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcih0cmFwTmFtZSArIFwiIHRyYXAgaXMgbm90IGNhbGxhYmxlOiBcIit0cmFwKTtcbiAgICB9XG5cbiAgICByZXR1cm4gdHJhcDtcbiAgfSxcblxuICAvLyA9PT0gZnVuZGFtZW50YWwgdHJhcHMgPT09XG5cbiAgLyoqXG4gICAqIElmIG5hbWUgZGVub3RlcyBhIGZpeGVkIHByb3BlcnR5LCBjaGVjazpcbiAgICogICAtIHdoZXRoZXIgdGFyZ2V0SGFuZGxlciByZXBvcnRzIGl0IGFzIGV4aXN0ZW50XG4gICAqICAgLSB3aGV0aGVyIHRoZSByZXR1cm5lZCBkZXNjcmlwdG9yIGlzIGNvbXBhdGlibGUgd2l0aCB0aGUgZml4ZWQgcHJvcGVydHlcbiAgICogSWYgdGhlIHByb3h5IGlzIG5vbi1leHRlbnNpYmxlLCBjaGVjazpcbiAgICogICAtIHdoZXRoZXIgbmFtZSBpcyBub3QgYSBuZXcgcHJvcGVydHlcbiAgICogQWRkaXRpb25hbGx5LCB0aGUgcmV0dXJuZWQgZGVzY3JpcHRvciBpcyBub3JtYWxpemVkIGFuZCBjb21wbGV0ZWQuXG4gICAqL1xuICBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3I6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcblxuICAgIHZhciB0cmFwID0gdGhpcy5nZXRUcmFwKFwiZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yXCIpO1xuICAgIGlmICh0cmFwID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBSZWZsZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0aGlzLnRhcmdldCwgbmFtZSk7XG4gICAgfVxuXG4gICAgbmFtZSA9IFN0cmluZyhuYW1lKTtcbiAgICB2YXIgZGVzYyA9IHRyYXAuY2FsbCh0aGlzLmhhbmRsZXIsIHRoaXMudGFyZ2V0LCBuYW1lKTtcbiAgICBkZXNjID0gbm9ybWFsaXplQW5kQ29tcGxldGVQcm9wZXJ0eURlc2NyaXB0b3IoZGVzYyk7XG5cbiAgICB2YXIgdGFyZ2V0RGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGhpcy50YXJnZXQsIG5hbWUpO1xuICAgIHZhciBleHRlbnNpYmxlID0gT2JqZWN0LmlzRXh0ZW5zaWJsZSh0aGlzLnRhcmdldCk7XG5cbiAgICBpZiAoZGVzYyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAoaXNTZWFsZWREZXNjKHRhcmdldERlc2MpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJjYW5ub3QgcmVwb3J0IG5vbi1jb25maWd1cmFibGUgcHJvcGVydHkgJ1wiK25hbWUrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCInIGFzIG5vbi1leGlzdGVudFwiKTtcbiAgICAgIH1cbiAgICAgIGlmICghZXh0ZW5zaWJsZSAmJiB0YXJnZXREZXNjICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAvLyBpZiBoYW5kbGVyIGlzIGFsbG93ZWQgdG8gcmV0dXJuIHVuZGVmaW5lZCwgd2UgY2Fubm90IGd1YXJhbnRlZVxuICAgICAgICAgIC8vIHRoYXQgaXQgd2lsbCBub3QgcmV0dXJuIGEgZGVzY3JpcHRvciBmb3IgdGhpcyBwcm9wZXJ0eSBsYXRlci5cbiAgICAgICAgICAvLyBPbmNlIGEgcHJvcGVydHkgaGFzIGJlZW4gcmVwb3J0ZWQgYXMgbm9uLWV4aXN0ZW50IG9uIGEgbm9uLWV4dGVuc2libGVcbiAgICAgICAgICAvLyBvYmplY3QsIGl0IHNob3VsZCBmb3JldmVyIGJlIHJlcG9ydGVkIGFzIG5vbi1leGlzdGVudFxuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJjYW5ub3QgcmVwb3J0IGV4aXN0aW5nIG93biBwcm9wZXJ0eSAnXCIrbmFtZStcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiJyBhcyBub24tZXhpc3RlbnQgb24gYSBub24tZXh0ZW5zaWJsZSBvYmplY3RcIik7XG4gICAgICB9XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIC8vIGF0IHRoaXMgcG9pbnQsIHdlIGtub3cgKGRlc2MgIT09IHVuZGVmaW5lZCksIGkuZS5cbiAgICAvLyB0YXJnZXRIYW5kbGVyIHJlcG9ydHMgJ25hbWUnIGFzIGFuIGV4aXN0aW5nIHByb3BlcnR5XG5cbiAgICAvLyBOb3RlOiB3ZSBjb3VsZCBjb2xsYXBzZSB0aGUgZm9sbG93aW5nIHR3byBpZi10ZXN0cyBpbnRvIGEgc2luZ2xlXG4gICAgLy8gdGVzdC4gU2VwYXJhdGluZyBvdXQgdGhlIGNhc2VzIHRvIGltcHJvdmUgZXJyb3IgcmVwb3J0aW5nLlxuXG4gICAgaWYgKCFleHRlbnNpYmxlKSB7XG4gICAgICBpZiAodGFyZ2V0RGVzYyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJjYW5ub3QgcmVwb3J0IGEgbmV3IG93biBwcm9wZXJ0eSAnXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZSArIFwiJyBvbiBhIG5vbi1leHRlbnNpYmxlIG9iamVjdFwiKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobmFtZSAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBpZiAoIWlzQ29tcGF0aWJsZURlc2NyaXB0b3IoZXh0ZW5zaWJsZSwgdGFyZ2V0RGVzYywgZGVzYykpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImNhbm5vdCByZXBvcnQgaW5jb21wYXRpYmxlIHByb3BlcnR5IGRlc2NyaXB0b3IgXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJmb3IgcHJvcGVydHkgJ1wiK25hbWUrXCInXCIpO1xuICAgICAgfVxuICAgIH1cbiAgICBcbiAgICBpZiAoZGVzYy5jb25maWd1cmFibGUgPT09IGZhbHNlKSB7XG4gICAgICBpZiAodGFyZ2V0RGVzYyA9PT0gdW5kZWZpbmVkIHx8IHRhcmdldERlc2MuY29uZmlndXJhYmxlID09PSB0cnVlKSB7XG4gICAgICAgIC8vIGlmIHRoZSBwcm9wZXJ0eSBpcyBjb25maWd1cmFibGUgb3Igbm9uLWV4aXN0ZW50IG9uIHRoZSB0YXJnZXQsXG4gICAgICAgIC8vIGJ1dCBpcyByZXBvcnRlZCBhcyBhIG5vbi1jb25maWd1cmFibGUgcHJvcGVydHksIGl0IG1heSBsYXRlciBiZVxuICAgICAgICAvLyByZXBvcnRlZCBhcyBjb25maWd1cmFibGUgb3Igbm9uLWV4aXN0ZW50LCB3aGljaCB2aW9sYXRlcyB0aGVcbiAgICAgICAgLy8gaW52YXJpYW50IHRoYXQgaWYgdGhlIHByb3BlcnR5IG1pZ2h0IGNoYW5nZSBvciBkaXNhcHBlYXIsIHRoZVxuICAgICAgICAvLyBjb25maWd1cmFibGUgYXR0cmlidXRlIG11c3QgYmUgdHJ1ZS5cbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgICBcImNhbm5vdCByZXBvcnQgYSBub24tY29uZmlndXJhYmxlIGRlc2NyaXB0b3IgXCIgK1xuICAgICAgICAgIFwiZm9yIGNvbmZpZ3VyYWJsZSBvciBub24tZXhpc3RlbnQgcHJvcGVydHkgJ1wiICsgbmFtZSArIFwiJ1wiKTtcbiAgICAgIH1cbiAgICAgIGlmICgnd3JpdGFibGUnIGluIGRlc2MgJiYgZGVzYy53cml0YWJsZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgaWYgKHRhcmdldERlc2Mud3JpdGFibGUgPT09IHRydWUpIHtcbiAgICAgICAgICAvLyBpZiB0aGUgcHJvcGVydHkgaXMgbm9uLWNvbmZpZ3VyYWJsZSwgd3JpdGFibGUgb24gdGhlIHRhcmdldCxcbiAgICAgICAgICAvLyBidXQgaXMgcmVwb3J0ZWQgYXMgbm9uLWNvbmZpZ3VyYWJsZSwgbm9uLXdyaXRhYmxlLCBpdCBtYXkgbGF0ZXJcbiAgICAgICAgICAvLyBiZSByZXBvcnRlZCBhcyBub24tY29uZmlndXJhYmxlLCB3cml0YWJsZSBhZ2Fpbiwgd2hpY2ggdmlvbGF0ZXNcbiAgICAgICAgICAvLyB0aGUgaW52YXJpYW50IHRoYXQgYSBub24tY29uZmlndXJhYmxlLCBub24td3JpdGFibGUgcHJvcGVydHlcbiAgICAgICAgICAvLyBtYXkgbm90IGNoYW5nZSBzdGF0ZS5cbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgICAgXCJjYW5ub3QgcmVwb3J0IG5vbi1jb25maWd1cmFibGUsIHdyaXRhYmxlIHByb3BlcnR5ICdcIiArIG5hbWUgK1xuICAgICAgICAgICAgXCInIGFzIG5vbi1jb25maWd1cmFibGUsIG5vbi13cml0YWJsZVwiKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkZXNjO1xuICB9LFxuXG4gIC8qKlxuICAgKiBJbiB0aGUgZGlyZWN0IHByb3hpZXMgZGVzaWduIHdpdGggcmVmYWN0b3JlZCBwcm90b3R5cGUgY2xpbWJpbmcsXG4gICAqIHRoaXMgdHJhcCBpcyBkZXByZWNhdGVkLiBGb3IgcHJveGllcy1hcy1wcm90b3R5cGVzLCBpbnN0ZWFkXG4gICAqIG9mIGNhbGxpbmcgdGhpcyB0cmFwLCB0aGUgZ2V0LCBzZXQsIGhhcyBvciBlbnVtZXJhdGUgdHJhcHMgYXJlXG4gICAqIGNhbGxlZCBpbnN0ZWFkLlxuICAgKlxuICAgKiBJbiB0aGlzIGltcGxlbWVudGF0aW9uLCB3ZSBcImFidXNlXCIgZ2V0UHJvcGVydHlEZXNjcmlwdG9yIHRvXG4gICAqIHN1cHBvcnQgdHJhcHBpbmcgdGhlIGdldCBvciBzZXQgdHJhcHMgZm9yIHByb3hpZXMtYXMtcHJvdG90eXBlcy5cbiAgICogV2UgZG8gdGhpcyBieSByZXR1cm5pbmcgYSBnZXR0ZXIvc2V0dGVyIHBhaXIgdGhhdCBpbnZva2VzXG4gICAqIHRoZSBjb3JyZXNwb25kaW5nIHRyYXBzLlxuICAgKlxuICAgKiBXaGlsZSB0aGlzIGhhY2sgd29ya3MgZm9yIGluaGVyaXRlZCBwcm9wZXJ0eSBhY2Nlc3MsIGl0IGhhcyBzb21lXG4gICAqIHF1aXJrczpcbiAgICpcbiAgICogSW4gRmlyZWZveCwgdGhpcyB0cmFwIGlzIG9ubHkgY2FsbGVkIGFmdGVyIGEgcHJpb3IgaW52b2NhdGlvblxuICAgKiBvZiB0aGUgJ2hhcycgdHJhcCBoYXMgcmV0dXJuZWQgdHJ1ZS4gSGVuY2UsIGV4cGVjdCB0aGUgZm9sbG93aW5nXG4gICAqIGJlaGF2aW9yOlxuICAgKiA8Y29kZT5cbiAgICogdmFyIGNoaWxkID0gT2JqZWN0LmNyZWF0ZShQcm94eSh0YXJnZXQsIGhhbmRsZXIpKTtcbiAgICogY2hpbGRbbmFtZV0gLy8gdHJpZ2dlcnMgaGFuZGxlci5oYXModGFyZ2V0LCBuYW1lKVxuICAgKiAvLyBpZiB0aGF0IHJldHVybnMgdHJ1ZSwgdHJpZ2dlcnMgaGFuZGxlci5nZXQodGFyZ2V0LCBuYW1lLCBjaGlsZClcbiAgICogPC9jb2RlPlxuICAgKlxuICAgKiBPbiB2OCwgdGhlICdpbicgb3BlcmF0b3IsIHdoZW4gYXBwbGllZCB0byBhbiBvYmplY3QgdGhhdCBpbmhlcml0c1xuICAgKiBmcm9tIGEgcHJveHksIHdpbGwgY2FsbCBnZXRQcm9wZXJ0eURlc2NyaXB0b3IgYW5kIHdhbGsgdGhlIHByb3RvLWNoYWluLlxuICAgKiBUaGF0IGNhbGxzIHRoZSBiZWxvdyBnZXRQcm9wZXJ0eURlc2NyaXB0b3IgdHJhcCBvbiB0aGUgcHJveHkuIFRoZVxuICAgKiByZXN1bHQgb2YgdGhlICdpbictb3BlcmF0b3IgaXMgdGhlbiBkZXRlcm1pbmVkIGJ5IHdoZXRoZXIgdGhpcyB0cmFwXG4gICAqIHJldHVybnMgdW5kZWZpbmVkIG9yIGEgcHJvcGVydHkgZGVzY3JpcHRvciBvYmplY3QuIFRoYXQgaXMgd2h5XG4gICAqIHdlIGZpcnN0IGV4cGxpY2l0bHkgdHJpZ2dlciB0aGUgJ2hhcycgdHJhcCB0byBkZXRlcm1pbmUgd2hldGhlclxuICAgKiB0aGUgcHJvcGVydHkgZXhpc3RzLlxuICAgKlxuICAgKiBUaGlzIGhhcyB0aGUgc2lkZS1lZmZlY3QgdGhhdCB3aGVuIGVudW1lcmF0aW5nIHByb3BlcnRpZXMgb25cbiAgICogYW4gb2JqZWN0IHRoYXQgaW5oZXJpdHMgZnJvbSBhIHByb3h5IGluIHY4LCBvbmx5IHByb3BlcnRpZXNcbiAgICogZm9yIHdoaWNoICdoYXMnIHJldHVybnMgdHJ1ZSBhcmUgcmV0dXJuZWQ6XG4gICAqXG4gICAqIDxjb2RlPlxuICAgKiB2YXIgY2hpbGQgPSBPYmplY3QuY3JlYXRlKFByb3h5KHRhcmdldCwgaGFuZGxlcikpO1xuICAgKiBmb3IgKHZhciBwcm9wIGluIGNoaWxkKSB7XG4gICAqICAgLy8gb25seSBlbnVtZXJhdGVzIHByb3AgaWYgKHByb3AgaW4gY2hpbGQpIHJldHVybnMgdHJ1ZVxuICAgKiB9XG4gICAqIDwvY29kZT5cbiAgICovXG4gIGdldFByb3BlcnR5RGVzY3JpcHRvcjogZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciBoYW5kbGVyID0gdGhpcztcblxuICAgIGlmICghaGFuZGxlci5oYXMobmFtZSkpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgICByZXR1cm4ge1xuICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIGhhbmRsZXIuZ2V0KHRoaXMsIG5hbWUpO1xuICAgICAgfSxcbiAgICAgIHNldDogZnVuY3Rpb24odmFsKSB7XG4gICAgICAgIGlmIChoYW5kbGVyLnNldCh0aGlzLCBuYW1lLCB2YWwpKSB7XG4gICAgICAgICAgcmV0dXJuIHZhbDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiZmFpbGVkIGFzc2lnbm1lbnQgdG8gXCIrbmFtZSk7XG4gICAgICAgIH1cbiAgICAgIH0sXG4gICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgY29uZmlndXJhYmxlOiB0cnVlXG4gICAgfTtcbiAgfSxcblxuICAvKipcbiAgICogSWYgbmFtZSBkZW5vdGVzIGEgZml4ZWQgcHJvcGVydHksIGNoZWNrIGZvciBpbmNvbXBhdGlibGUgY2hhbmdlcy5cbiAgICogSWYgdGhlIHByb3h5IGlzIG5vbi1leHRlbnNpYmxlLCBjaGVjayB0aGF0IG5ldyBwcm9wZXJ0aWVzIGFyZSByZWplY3RlZC5cbiAgICovXG4gIGRlZmluZVByb3BlcnR5OiBmdW5jdGlvbihuYW1lLCBkZXNjKSB7XG4gICAgLy8gVE9ETyh0dmN1dHNlbSk6IHRoZSBjdXJyZW50IHRyYWNlbW9ua2V5IGltcGxlbWVudGF0aW9uIG9mIHByb3hpZXNcbiAgICAvLyBhdXRvLWNvbXBsZXRlcyAnZGVzYycsIHdoaWNoIGlzIG5vdCBjb3JyZWN0LiAnZGVzYycgc2hvdWxkIGJlXG4gICAgLy8gbm9ybWFsaXplZCwgYnV0IG5vdCBjb21wbGV0ZWQuIENvbnNpZGVyOlxuICAgIC8vIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm94eSwgJ2ZvbycsIHtlbnVtZXJhYmxlOmZhbHNlfSlcbiAgICAvLyBUaGlzIHRyYXAgd2lsbCByZWNlaXZlIGRlc2MgPVxuICAgIC8vICB7dmFsdWU6dW5kZWZpbmVkLHdyaXRhYmxlOmZhbHNlLGVudW1lcmFibGU6ZmFsc2UsY29uZmlndXJhYmxlOmZhbHNlfVxuICAgIC8vIFRoaXMgd2lsbCBhbHNvIHNldCBhbGwgb3RoZXIgYXR0cmlidXRlcyB0byB0aGVpciBkZWZhdWx0IHZhbHVlLFxuICAgIC8vIHdoaWNoIGlzIHVuZXhwZWN0ZWQgYW5kIGRpZmZlcmVudCBmcm9tIFtbRGVmaW5lT3duUHJvcGVydHldXS5cbiAgICAvLyBCdWcgZmlsZWQ6IGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTYwMTMyOVxuXG4gICAgdmFyIHRyYXAgPSB0aGlzLmdldFRyYXAoXCJkZWZpbmVQcm9wZXJ0eVwiKTtcbiAgICBpZiAodHJhcCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBkZWZhdWx0IGZvcndhcmRpbmcgYmVoYXZpb3JcbiAgICAgIHJldHVybiBSZWZsZWN0LmRlZmluZVByb3BlcnR5KHRoaXMudGFyZ2V0LCBuYW1lLCBkZXNjKTtcbiAgICB9XG5cbiAgICBuYW1lID0gU3RyaW5nKG5hbWUpO1xuICAgIHZhciBkZXNjT2JqID0gbm9ybWFsaXplUHJvcGVydHlEZXNjcmlwdG9yKGRlc2MpO1xuICAgIHZhciBzdWNjZXNzID0gdHJhcC5jYWxsKHRoaXMuaGFuZGxlciwgdGhpcy50YXJnZXQsIG5hbWUsIGRlc2NPYmopO1xuICAgIHN1Y2Nlc3MgPSAhIXN1Y2Nlc3M7IC8vIGNvZXJjZSB0byBCb29sZWFuXG5cbiAgICBpZiAoc3VjY2VzcyA9PT0gdHJ1ZSkge1xuXG4gICAgICB2YXIgdGFyZ2V0RGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGhpcy50YXJnZXQsIG5hbWUpO1xuICAgICAgdmFyIGV4dGVuc2libGUgPSBPYmplY3QuaXNFeHRlbnNpYmxlKHRoaXMudGFyZ2V0KTtcblxuICAgICAgLy8gTm90ZTogd2UgY291bGQgY29sbGFwc2UgdGhlIGZvbGxvd2luZyB0d28gaWYtdGVzdHMgaW50byBhIHNpbmdsZVxuICAgICAgLy8gdGVzdC4gU2VwYXJhdGluZyBvdXQgdGhlIGNhc2VzIHRvIGltcHJvdmUgZXJyb3IgcmVwb3J0aW5nLlxuXG4gICAgICBpZiAoIWV4dGVuc2libGUpIHtcbiAgICAgICAgaWYgKHRhcmdldERlc2MgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJjYW5ub3Qgc3VjY2Vzc2Z1bGx5IGFkZCBhIG5ldyBwcm9wZXJ0eSAnXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lICsgXCInIHRvIGEgbm9uLWV4dGVuc2libGUgb2JqZWN0XCIpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmICh0YXJnZXREZXNjICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgaWYgKCFpc0NvbXBhdGlibGVEZXNjcmlwdG9yKGV4dGVuc2libGUsIHRhcmdldERlc2MsIGRlc2MpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImNhbm5vdCBkZWZpbmUgaW5jb21wYXRpYmxlIHByb3BlcnR5IFwiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJkZXNjcmlwdG9yIGZvciBwcm9wZXJ0eSAnXCIrbmFtZStcIidcIik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzRGF0YURlc2NyaXB0b3IodGFyZ2V0RGVzYykgJiZcbiAgICAgICAgICAgIHRhcmdldERlc2MuY29uZmlndXJhYmxlID09PSBmYWxzZSAmJlxuICAgICAgICAgICAgdGFyZ2V0RGVzYy53cml0YWJsZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgaWYgKGRlc2MuY29uZmlndXJhYmxlID09PSBmYWxzZSAmJiBkZXNjLndyaXRhYmxlID09PSBmYWxzZSkge1xuICAgICAgICAgICAgICAvLyBpZiB0aGUgcHJvcGVydHkgaXMgbm9uLWNvbmZpZ3VyYWJsZSwgd3JpdGFibGUgb24gdGhlIHRhcmdldFxuICAgICAgICAgICAgICAvLyBidXQgd2FzIHN1Y2Nlc3NmdWxseSByZXBvcnRlZCB0byBiZSB1cGRhdGVkIHRvXG4gICAgICAgICAgICAgIC8vIG5vbi1jb25maWd1cmFibGUsIG5vbi13cml0YWJsZSwgaXQgY2FuIGxhdGVyIGJlIHJlcG9ydGVkXG4gICAgICAgICAgICAgIC8vIGFnYWluIGFzIG5vbi1jb25maWd1cmFibGUsIHdyaXRhYmxlLCB3aGljaCB2aW9sYXRlc1xuICAgICAgICAgICAgICAvLyB0aGUgaW52YXJpYW50IHRoYXQgbm9uLWNvbmZpZ3VyYWJsZSwgbm9uLXdyaXRhYmxlIHByb3BlcnRpZXNcbiAgICAgICAgICAgICAgLy8gY2Fubm90IGNoYW5nZSBzdGF0ZVxuICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgICAgICAgIFwiY2Fubm90IHN1Y2Nlc3NmdWxseSBkZWZpbmUgbm9uLWNvbmZpZ3VyYWJsZSwgd3JpdGFibGUgXCIgK1xuICAgICAgICAgICAgICAgIFwiIHByb3BlcnR5ICdcIiArIG5hbWUgKyBcIicgYXMgbm9uLWNvbmZpZ3VyYWJsZSwgbm9uLXdyaXRhYmxlXCIpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKGRlc2MuY29uZmlndXJhYmxlID09PSBmYWxzZSAmJiAhaXNTZWFsZWREZXNjKHRhcmdldERlc2MpKSB7XG4gICAgICAgIC8vIGlmIHRoZSBwcm9wZXJ0eSBpcyBjb25maWd1cmFibGUgb3Igbm9uLWV4aXN0ZW50IG9uIHRoZSB0YXJnZXQsXG4gICAgICAgIC8vIGJ1dCBpcyBzdWNjZXNzZnVsbHkgYmVpbmcgcmVkZWZpbmVkIGFzIGEgbm9uLWNvbmZpZ3VyYWJsZSBwcm9wZXJ0eSxcbiAgICAgICAgLy8gaXQgbWF5IGxhdGVyIGJlIHJlcG9ydGVkIGFzIGNvbmZpZ3VyYWJsZSBvciBub24tZXhpc3RlbnQsIHdoaWNoIHZpb2xhdGVzXG4gICAgICAgIC8vIHRoZSBpbnZhcmlhbnQgdGhhdCBpZiB0aGUgcHJvcGVydHkgbWlnaHQgY2hhbmdlIG9yIGRpc2FwcGVhciwgdGhlXG4gICAgICAgIC8vIGNvbmZpZ3VyYWJsZSBhdHRyaWJ1dGUgbXVzdCBiZSB0cnVlLlxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgIFwiY2Fubm90IHN1Y2Nlc3NmdWxseSBkZWZpbmUgYSBub24tY29uZmlndXJhYmxlIFwiICtcbiAgICAgICAgICBcImRlc2NyaXB0b3IgZm9yIGNvbmZpZ3VyYWJsZSBvciBub24tZXhpc3RlbnQgcHJvcGVydHkgJ1wiICtcbiAgICAgICAgICBuYW1lICsgXCInXCIpO1xuICAgICAgfVxuXG4gICAgfVxuXG4gICAgcmV0dXJuIHN1Y2Nlc3M7XG4gIH0sXG5cbiAgLyoqXG4gICAqIE9uIHN1Y2Nlc3MsIGNoZWNrIHdoZXRoZXIgdGhlIHRhcmdldCBvYmplY3QgaXMgaW5kZWVkIG5vbi1leHRlbnNpYmxlLlxuICAgKi9cbiAgcHJldmVudEV4dGVuc2lvbnM6IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0cmFwID0gdGhpcy5nZXRUcmFwKFwicHJldmVudEV4dGVuc2lvbnNcIik7XG4gICAgaWYgKHRyYXAgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gZGVmYXVsdCBmb3J3YXJkaW5nIGJlaGF2aW9yXG4gICAgICByZXR1cm4gUmVmbGVjdC5wcmV2ZW50RXh0ZW5zaW9ucyh0aGlzLnRhcmdldCk7XG4gICAgfVxuXG4gICAgdmFyIHN1Y2Nlc3MgPSB0cmFwLmNhbGwodGhpcy5oYW5kbGVyLCB0aGlzLnRhcmdldCk7XG4gICAgc3VjY2VzcyA9ICEhc3VjY2VzczsgLy8gY29lcmNlIHRvIEJvb2xlYW5cbiAgICBpZiAoc3VjY2Vzcykge1xuICAgICAgaWYgKE9iamVjdF9pc0V4dGVuc2libGUodGhpcy50YXJnZXQpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJjYW4ndCByZXBvcnQgZXh0ZW5zaWJsZSBvYmplY3QgYXMgbm9uLWV4dGVuc2libGU6IFwiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFyZ2V0KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHN1Y2Nlc3M7XG4gIH0sXG5cbiAgLyoqXG4gICAqIElmIG5hbWUgZGVub3RlcyBhIHNlYWxlZCBwcm9wZXJ0eSwgY2hlY2sgd2hldGhlciBoYW5kbGVyIHJlamVjdHMuXG4gICAqL1xuICBkZWxldGU6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICBcInVzZSBzdHJpY3RcIjtcbiAgICB2YXIgdHJhcCA9IHRoaXMuZ2V0VHJhcChcImRlbGV0ZVByb3BlcnR5XCIpO1xuICAgIGlmICh0cmFwID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIGRlZmF1bHQgZm9yd2FyZGluZyBiZWhhdmlvclxuICAgICAgcmV0dXJuIFJlZmxlY3QuZGVsZXRlUHJvcGVydHkodGhpcy50YXJnZXQsIG5hbWUpO1xuICAgIH1cblxuICAgIG5hbWUgPSBTdHJpbmcobmFtZSk7XG4gICAgdmFyIHJlcyA9IHRyYXAuY2FsbCh0aGlzLmhhbmRsZXIsIHRoaXMudGFyZ2V0LCBuYW1lKTtcbiAgICByZXMgPSAhIXJlczsgLy8gY29lcmNlIHRvIEJvb2xlYW5cblxuICAgIHZhciB0YXJnZXREZXNjO1xuICAgIGlmIChyZXMgPT09IHRydWUpIHtcbiAgICAgIHRhcmdldERlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRoaXMudGFyZ2V0LCBuYW1lKTtcbiAgICAgIGlmICh0YXJnZXREZXNjICE9PSB1bmRlZmluZWQgJiYgdGFyZ2V0RGVzYy5jb25maWd1cmFibGUgPT09IGZhbHNlKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJwcm9wZXJ0eSAnXCIgKyBuYW1lICsgXCInIGlzIG5vbi1jb25maWd1cmFibGUgXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJhbmQgY2FuJ3QgYmUgZGVsZXRlZFwiKTtcbiAgICAgIH1cbiAgICAgIGlmICh0YXJnZXREZXNjICE9PSB1bmRlZmluZWQgJiYgIU9iamVjdF9pc0V4dGVuc2libGUodGhpcy50YXJnZXQpKSB7XG4gICAgICAgIC8vIGlmIHRoZSBwcm9wZXJ0eSBzdGlsbCBleGlzdHMgb24gYSBub24tZXh0ZW5zaWJsZSB0YXJnZXQgYnV0XG4gICAgICAgIC8vIGlzIHJlcG9ydGVkIGFzIHN1Y2Nlc3NmdWxseSBkZWxldGVkLCBpdCBtYXkgbGF0ZXIgYmUgcmVwb3J0ZWRcbiAgICAgICAgLy8gYXMgcHJlc2VudCwgd2hpY2ggdmlvbGF0ZXMgdGhlIGludmFyaWFudCB0aGF0IGFuIG93biBwcm9wZXJ0eSxcbiAgICAgICAgLy8gZGVsZXRlZCBmcm9tIGEgbm9uLWV4dGVuc2libGUgb2JqZWN0IGNhbm5vdCByZWFwcGVhci5cbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgICBcImNhbm5vdCBzdWNjZXNzZnVsbHkgZGVsZXRlIGV4aXN0aW5nIHByb3BlcnR5ICdcIiArIG5hbWUgK1xuICAgICAgICAgIFwiJyBvbiBhIG5vbi1leHRlbnNpYmxlIG9iamVjdFwiKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmVzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBUaGUgZ2V0T3duUHJvcGVydHlOYW1lcyB0cmFwIHdhcyByZXBsYWNlZCBieSB0aGUgb3duS2V5cyB0cmFwLFxuICAgKiB3aGljaCBub3cgYWxzbyByZXR1cm5zIGFuIGFycmF5IChvZiBzdHJpbmdzIG9yIHN5bWJvbHMpIGFuZFxuICAgKiB3aGljaCBwZXJmb3JtcyB0aGUgc2FtZSByaWdvcm91cyBpbnZhcmlhbnQgY2hlY2tzIGFzIGdldE93blByb3BlcnR5TmFtZXNcbiAgICpcbiAgICogU2VlIGlzc3VlICM0OCBvbiBob3cgdGhpcyB0cmFwIGNhbiBzdGlsbCBnZXQgaW52b2tlZCBieSBleHRlcm5hbCBsaWJzXG4gICAqIHRoYXQgZG9uJ3QgdXNlIHRoZSBwYXRjaGVkIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzIGZ1bmN0aW9uLlxuICAgKi9cbiAgZ2V0T3duUHJvcGVydHlOYW1lczogZnVuY3Rpb24oKSB7XG4gICAgLy8gTm90ZTogcmVtb3ZlZCBkZXByZWNhdGlvbiB3YXJuaW5nIHRvIGF2b2lkIGRlcGVuZGVuY3kgb24gJ2NvbnNvbGUnXG4gICAgLy8gKGFuZCBvbiBub2RlLCBzaG91bGQgYW55d2F5IHVzZSB1dGlsLmRlcHJlY2F0ZSkuIERlcHJlY2F0aW9uIHdhcm5pbmdzXG4gICAgLy8gY2FuIGFsc28gYmUgYW5ub3lpbmcgd2hlbiB0aGV5IGFyZSBvdXRzaWRlIG9mIHRoZSB1c2VyJ3MgY29udHJvbCwgZS5nLlxuICAgIC8vIHdoZW4gYW4gZXh0ZXJuYWwgbGlicmFyeSBjYWxscyB1bnBhdGNoZWQgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMuXG4gICAgLy8gU2luY2UgdGhlcmUgaXMgYSBjbGVhbiBmYWxsYmFjayB0byBgb3duS2V5c2AsIHRoZSBmYWN0IHRoYXQgdGhlXG4gICAgLy8gZGVwcmVjYXRlZCBtZXRob2QgaXMgc3RpbGwgY2FsbGVkIGlzIG1vc3RseSBoYXJtbGVzcyBhbnl3YXkuXG4gICAgLy8gU2VlIGFsc28gaXNzdWVzICM2NSBhbmQgIzY2LlxuICAgIC8vIGNvbnNvbGUud2FybihcImdldE93blByb3BlcnR5TmFtZXMgdHJhcCBpcyBkZXByZWNhdGVkLiBVc2Ugb3duS2V5cyBpbnN0ZWFkXCIpO1xuICAgIHJldHVybiB0aGlzLm93bktleXMoKTtcbiAgfSxcblxuICAvKipcbiAgICogQ2hlY2tzIHdoZXRoZXIgdGhlIHRyYXAgcmVzdWx0IGRvZXMgbm90IGNvbnRhaW4gYW55IG5ldyBwcm9wZXJ0aWVzXG4gICAqIGlmIHRoZSBwcm94eSBpcyBub24tZXh0ZW5zaWJsZS5cbiAgICpcbiAgICogQW55IG93biBub24tY29uZmlndXJhYmxlIHByb3BlcnRpZXMgb2YgdGhlIHRhcmdldCB0aGF0IGFyZSBub3QgaW5jbHVkZWRcbiAgICogaW4gdGhlIHRyYXAgcmVzdWx0IGdpdmUgcmlzZSB0byBhIFR5cGVFcnJvci4gQXMgc3VjaCwgd2UgY2hlY2sgd2hldGhlciB0aGVcbiAgICogcmV0dXJuZWQgcmVzdWx0IGNvbnRhaW5zIGF0IGxlYXN0IGFsbCBzZWFsZWQgcHJvcGVydGllcyBvZiB0aGUgdGFyZ2V0XG4gICAqIG9iamVjdC5cbiAgICpcbiAgICogQWRkaXRpb25hbGx5LCB0aGUgdHJhcCByZXN1bHQgaXMgbm9ybWFsaXplZC5cbiAgICogSW5zdGVhZCBvZiByZXR1cm5pbmcgdGhlIHRyYXAgcmVzdWx0IGRpcmVjdGx5OlxuICAgKiAgLSBjcmVhdGUgYW5kIHJldHVybiBhIGZyZXNoIEFycmF5LFxuICAgKiAgLSBvZiB3aGljaCBlYWNoIGVsZW1lbnQgaXMgY29lcmNlZCB0byBhIFN0cmluZ1xuICAgKlxuICAgKiBUaGlzIHRyYXAgaXMgY2FsbGVkIGEuby4gYnkgUmVmbGVjdC5vd25LZXlzLCBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lc1xuICAgKiBhbmQgT2JqZWN0LmtleXMgKHRoZSBsYXR0ZXIgZmlsdGVycyBvdXQgb25seSB0aGUgZW51bWVyYWJsZSBvd24gcHJvcGVydGllcykuXG4gICAqL1xuICBvd25LZXlzOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdHJhcCA9IHRoaXMuZ2V0VHJhcChcIm93bktleXNcIik7XG4gICAgaWYgKHRyYXAgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gZGVmYXVsdCBmb3J3YXJkaW5nIGJlaGF2aW9yXG4gICAgICByZXR1cm4gUmVmbGVjdC5vd25LZXlzKHRoaXMudGFyZ2V0KTtcbiAgICB9XG5cbiAgICB2YXIgdHJhcFJlc3VsdCA9IHRyYXAuY2FsbCh0aGlzLmhhbmRsZXIsIHRoaXMudGFyZ2V0KTtcblxuICAgIC8vIHByb3BOYW1lcyBpcyB1c2VkIGFzIGEgc2V0IG9mIHN0cmluZ3NcbiAgICB2YXIgcHJvcE5hbWVzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICB2YXIgbnVtUHJvcHMgPSArdHJhcFJlc3VsdC5sZW5ndGg7XG4gICAgdmFyIHJlc3VsdCA9IG5ldyBBcnJheShudW1Qcm9wcyk7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG51bVByb3BzOyBpKyspIHtcbiAgICAgIHZhciBzID0gU3RyaW5nKHRyYXBSZXN1bHRbaV0pO1xuICAgICAgaWYgKCFPYmplY3QuaXNFeHRlbnNpYmxlKHRoaXMudGFyZ2V0KSAmJiAhaXNGaXhlZChzLCB0aGlzLnRhcmdldCkpIHtcbiAgICAgICAgLy8gbm9uLWV4dGVuc2libGUgcHJveGllcyBkb24ndCB0b2xlcmF0ZSBuZXcgb3duIHByb3BlcnR5IG5hbWVzXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJvd25LZXlzIHRyYXAgY2Fubm90IGxpc3QgYSBuZXcgXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJwcm9wZXJ0eSAnXCIrcytcIicgb24gYSBub24tZXh0ZW5zaWJsZSBvYmplY3RcIik7XG4gICAgICB9XG5cbiAgICAgIHByb3BOYW1lc1tzXSA9IHRydWU7XG4gICAgICByZXN1bHRbaV0gPSBzO1xuICAgIH1cblxuICAgIHZhciBvd25Qcm9wcyA9IE9iamVjdF9nZXRPd25Qcm9wZXJ0eU5hbWVzKHRoaXMudGFyZ2V0KTtcbiAgICB2YXIgdGFyZ2V0ID0gdGhpcy50YXJnZXQ7XG4gICAgb3duUHJvcHMuZm9yRWFjaChmdW5jdGlvbiAob3duUHJvcCkge1xuICAgICAgaWYgKCFwcm9wTmFtZXNbb3duUHJvcF0pIHtcbiAgICAgICAgaWYgKGlzU2VhbGVkKG93blByb3AsIHRhcmdldCkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwib3duS2V5cyB0cmFwIGZhaWxlZCB0byBpbmNsdWRlIFwiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJub24tY29uZmlndXJhYmxlIHByb3BlcnR5ICdcIitvd25Qcm9wK1wiJ1wiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIU9iamVjdC5pc0V4dGVuc2libGUodGFyZ2V0KSAmJlxuICAgICAgICAgICAgaXNGaXhlZChvd25Qcm9wLCB0YXJnZXQpKSB7XG4gICAgICAgICAgICAvLyBpZiBoYW5kbGVyIGlzIGFsbG93ZWQgdG8gcmVwb3J0IG93blByb3AgYXMgbm9uLWV4aXN0ZW50LFxuICAgICAgICAgICAgLy8gd2UgY2Fubm90IGd1YXJhbnRlZSB0aGF0IGl0IHdpbGwgbmV2ZXIgbGF0ZXIgcmVwb3J0IGl0IGFzXG4gICAgICAgICAgICAvLyBleGlzdGVudC4gT25jZSBhIHByb3BlcnR5IGhhcyBiZWVuIHJlcG9ydGVkIGFzIG5vbi1leGlzdGVudFxuICAgICAgICAgICAgLy8gb24gYSBub24tZXh0ZW5zaWJsZSBvYmplY3QsIGl0IHNob3VsZCBmb3JldmVyIGJlIHJlcG9ydGVkIGFzXG4gICAgICAgICAgICAvLyBub24tZXhpc3RlbnRcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJvd25LZXlzIHRyYXAgY2Fubm90IHJlcG9ydCBleGlzdGluZyBvd24gcHJvcGVydHkgJ1wiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvd25Qcm9wK1wiJyBhcyBub24tZXhpc3RlbnQgb24gYSBub24tZXh0ZW5zaWJsZSBvYmplY3RcIik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENoZWNrcyB3aGV0aGVyIHRoZSB0cmFwIHJlc3VsdCBpcyBjb25zaXN0ZW50IHdpdGggdGhlIHN0YXRlIG9mIHRoZVxuICAgKiB3cmFwcGVkIHRhcmdldC5cbiAgICovXG4gIGlzRXh0ZW5zaWJsZTogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRyYXAgPSB0aGlzLmdldFRyYXAoXCJpc0V4dGVuc2libGVcIik7XG4gICAgaWYgKHRyYXAgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gZGVmYXVsdCBmb3J3YXJkaW5nIGJlaGF2aW9yXG4gICAgICByZXR1cm4gUmVmbGVjdC5pc0V4dGVuc2libGUodGhpcy50YXJnZXQpO1xuICAgIH1cblxuICAgIHZhciByZXN1bHQgPSB0cmFwLmNhbGwodGhpcy5oYW5kbGVyLCB0aGlzLnRhcmdldCk7XG4gICAgcmVzdWx0ID0gISFyZXN1bHQ7IC8vIGNvZXJjZSB0byBCb29sZWFuXG4gICAgdmFyIHN0YXRlID0gT2JqZWN0X2lzRXh0ZW5zaWJsZSh0aGlzLnRhcmdldCk7XG4gICAgaWYgKHJlc3VsdCAhPT0gc3RhdGUpIHtcbiAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImNhbm5vdCByZXBvcnQgbm9uLWV4dGVuc2libGUgb2JqZWN0IGFzIGV4dGVuc2libGU6IFwiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhcmdldCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiY2Fubm90IHJlcG9ydCBleHRlbnNpYmxlIG9iamVjdCBhcyBub24tZXh0ZW5zaWJsZTogXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFyZ2V0KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHN0YXRlO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDaGVjayB3aGV0aGVyIHRoZSB0cmFwIHJlc3VsdCBjb3JyZXNwb25kcyB0byB0aGUgdGFyZ2V0J3MgW1tQcm90b3R5cGVdXVxuICAgKi9cbiAgZ2V0UHJvdG90eXBlT2Y6IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0cmFwID0gdGhpcy5nZXRUcmFwKFwiZ2V0UHJvdG90eXBlT2ZcIik7XG4gICAgaWYgKHRyYXAgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gZGVmYXVsdCBmb3J3YXJkaW5nIGJlaGF2aW9yXG4gICAgICByZXR1cm4gUmVmbGVjdC5nZXRQcm90b3R5cGVPZih0aGlzLnRhcmdldCk7XG4gICAgfVxuXG4gICAgdmFyIGFsbGVnZWRQcm90byA9IHRyYXAuY2FsbCh0aGlzLmhhbmRsZXIsIHRoaXMudGFyZ2V0KTtcblxuICAgIGlmICghT2JqZWN0X2lzRXh0ZW5zaWJsZSh0aGlzLnRhcmdldCkpIHtcbiAgICAgIHZhciBhY3R1YWxQcm90byA9IE9iamVjdF9nZXRQcm90b3R5cGVPZih0aGlzLnRhcmdldCk7XG4gICAgICBpZiAoIXNhbWVWYWx1ZShhbGxlZ2VkUHJvdG8sIGFjdHVhbFByb3RvKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwicHJvdG90eXBlIHZhbHVlIGRvZXMgbm90IG1hdGNoOiBcIiArIHRoaXMudGFyZ2V0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gYWxsZWdlZFByb3RvO1xuICB9LFxuXG4gIC8qKlxuICAgKiBJZiB0YXJnZXQgaXMgbm9uLWV4dGVuc2libGUgYW5kIHNldFByb3RvdHlwZU9mIHRyYXAgcmV0dXJucyB0cnVlLFxuICAgKiBjaGVjayB3aGV0aGVyIHRoZSB0cmFwIHJlc3VsdCBjb3JyZXNwb25kcyB0byB0aGUgdGFyZ2V0J3MgW1tQcm90b3R5cGVdXVxuICAgKi9cbiAgc2V0UHJvdG90eXBlT2Y6IGZ1bmN0aW9uKG5ld1Byb3RvKSB7XG4gICAgdmFyIHRyYXAgPSB0aGlzLmdldFRyYXAoXCJzZXRQcm90b3R5cGVPZlwiKTtcbiAgICBpZiAodHJhcCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBkZWZhdWx0IGZvcndhcmRpbmcgYmVoYXZpb3JcbiAgICAgIHJldHVybiBSZWZsZWN0LnNldFByb3RvdHlwZU9mKHRoaXMudGFyZ2V0LCBuZXdQcm90byk7XG4gICAgfVxuXG4gICAgdmFyIHN1Y2Nlc3MgPSB0cmFwLmNhbGwodGhpcy5oYW5kbGVyLCB0aGlzLnRhcmdldCwgbmV3UHJvdG8pO1xuXG4gICAgc3VjY2VzcyA9ICEhc3VjY2VzcztcbiAgICBpZiAoc3VjY2VzcyAmJiAhT2JqZWN0X2lzRXh0ZW5zaWJsZSh0aGlzLnRhcmdldCkpIHtcbiAgICAgIHZhciBhY3R1YWxQcm90byA9IE9iamVjdF9nZXRQcm90b3R5cGVPZih0aGlzLnRhcmdldCk7XG4gICAgICBpZiAoIXNhbWVWYWx1ZShuZXdQcm90bywgYWN0dWFsUHJvdG8pKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJwcm90b3R5cGUgdmFsdWUgZG9lcyBub3QgbWF0Y2g6IFwiICsgdGhpcy50YXJnZXQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBzdWNjZXNzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBJbiB0aGUgZGlyZWN0IHByb3hpZXMgZGVzaWduIHdpdGggcmVmYWN0b3JlZCBwcm90b3R5cGUgY2xpbWJpbmcsXG4gICAqIHRoaXMgdHJhcCBpcyBkZXByZWNhdGVkLiBGb3IgcHJveGllcy1hcy1wcm90b3R5cGVzLCBmb3ItaW4gd2lsbFxuICAgKiBjYWxsIHRoZSBlbnVtZXJhdGUoKSB0cmFwLiBJZiB0aGF0IHRyYXAgaXMgbm90IGRlZmluZWQsIHRoZVxuICAgKiBvcGVyYXRpb24gaXMgZm9yd2FyZGVkIHRvIHRoZSB0YXJnZXQsIG5vIG1vcmUgZmFsbGJhY2sgb24gdGhpc1xuICAgKiBmdW5kYW1lbnRhbCB0cmFwLlxuICAgKi9cbiAgZ2V0UHJvcGVydHlOYW1lczogZnVuY3Rpb24oKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImdldFByb3BlcnR5TmFtZXMgdHJhcCBpcyBkZXByZWNhdGVkXCIpO1xuICB9LFxuXG4gIC8vID09PSBkZXJpdmVkIHRyYXBzID09PVxuXG4gIC8qKlxuICAgKiBJZiBuYW1lIGRlbm90ZXMgYSBmaXhlZCBwcm9wZXJ0eSwgY2hlY2sgd2hldGhlciB0aGUgdHJhcCByZXR1cm5zIHRydWUuXG4gICAqL1xuICBoYXM6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgdHJhcCA9IHRoaXMuZ2V0VHJhcChcImhhc1wiKTtcbiAgICBpZiAodHJhcCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBkZWZhdWx0IGZvcndhcmRpbmcgYmVoYXZpb3JcbiAgICAgIHJldHVybiBSZWZsZWN0Lmhhcyh0aGlzLnRhcmdldCwgbmFtZSk7XG4gICAgfVxuXG4gICAgbmFtZSA9IFN0cmluZyhuYW1lKTtcbiAgICB2YXIgcmVzID0gdHJhcC5jYWxsKHRoaXMuaGFuZGxlciwgdGhpcy50YXJnZXQsIG5hbWUpO1xuICAgIHJlcyA9ICEhcmVzOyAvLyBjb2VyY2UgdG8gQm9vbGVhblxuXG4gICAgaWYgKHJlcyA9PT0gZmFsc2UpIHtcbiAgICAgIGlmIChpc1NlYWxlZChuYW1lLCB0aGlzLnRhcmdldCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImNhbm5vdCByZXBvcnQgZXhpc3Rpbmcgbm9uLWNvbmZpZ3VyYWJsZSBvd24gXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJwcm9wZXJ0eSAnXCIrIG5hbWUgKyBcIicgYXMgYSBub24tZXhpc3RlbnQgXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJwcm9wZXJ0eVwiKTtcbiAgICAgIH1cbiAgICAgIGlmICghT2JqZWN0LmlzRXh0ZW5zaWJsZSh0aGlzLnRhcmdldCkgJiZcbiAgICAgICAgICBpc0ZpeGVkKG5hbWUsIHRoaXMudGFyZ2V0KSkge1xuICAgICAgICAgIC8vIGlmIGhhbmRsZXIgaXMgYWxsb3dlZCB0byByZXR1cm4gZmFsc2UsIHdlIGNhbm5vdCBndWFyYW50ZWVcbiAgICAgICAgICAvLyB0aGF0IGl0IHdpbGwgbm90IHJldHVybiB0cnVlIGZvciB0aGlzIHByb3BlcnR5IGxhdGVyLlxuICAgICAgICAgIC8vIE9uY2UgYSBwcm9wZXJ0eSBoYXMgYmVlbiByZXBvcnRlZCBhcyBub24tZXhpc3RlbnQgb24gYSBub24tZXh0ZW5zaWJsZVxuICAgICAgICAgIC8vIG9iamVjdCwgaXQgc2hvdWxkIGZvcmV2ZXIgYmUgcmVwb3J0ZWQgYXMgbm9uLWV4aXN0ZW50XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImNhbm5vdCByZXBvcnQgZXhpc3Rpbmcgb3duIHByb3BlcnR5ICdcIituYW1lK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCInIGFzIG5vbi1leGlzdGVudCBvbiBhIG5vbi1leHRlbnNpYmxlIG9iamVjdFwiKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBpZiByZXMgPT09IHRydWUsIHdlIGRvbid0IG5lZWQgdG8gY2hlY2sgZm9yIGV4dGVuc2liaWxpdHlcbiAgICAvLyBldmVuIGZvciBhIG5vbi1leHRlbnNpYmxlIHByb3h5IHRoYXQgaGFzIG5vIG93biBuYW1lIHByb3BlcnR5LFxuICAgIC8vIHRoZSBwcm9wZXJ0eSBtYXkgaGF2ZSBiZWVuIGluaGVyaXRlZFxuXG4gICAgcmV0dXJuIHJlcztcbiAgfSxcblxuICAvKipcbiAgICogSWYgbmFtZSBkZW5vdGVzIGEgZml4ZWQgbm9uLWNvbmZpZ3VyYWJsZSwgbm9uLXdyaXRhYmxlIGRhdGEgcHJvcGVydHksXG4gICAqIGNoZWNrIGl0cyByZXR1cm4gdmFsdWUgYWdhaW5zdCB0aGUgcHJldmlvdXNseSBhc3NlcnRlZCB2YWx1ZSBvZiB0aGVcbiAgICogZml4ZWQgcHJvcGVydHkuXG4gICAqL1xuICBnZXQ6IGZ1bmN0aW9uKHJlY2VpdmVyLCBuYW1lKSB7XG5cbiAgICAvLyBleHBlcmltZW50YWwgc3VwcG9ydCBmb3IgaW52b2tlKCkgdHJhcCBvbiBwbGF0Zm9ybXMgdGhhdFxuICAgIC8vIHN1cHBvcnQgX19ub1N1Y2hNZXRob2RfX1xuICAgIC8qXG4gICAgaWYgKG5hbWUgPT09ICdfX25vU3VjaE1ldGhvZF9fJykge1xuICAgICAgdmFyIGhhbmRsZXIgPSB0aGlzO1xuICAgICAgcmV0dXJuIGZ1bmN0aW9uKG5hbWUsIGFyZ3MpIHtcbiAgICAgICAgcmV0dXJuIGhhbmRsZXIuaW52b2tlKHJlY2VpdmVyLCBuYW1lLCBhcmdzKTtcbiAgICAgIH1cbiAgICB9XG4gICAgKi9cblxuICAgIHZhciB0cmFwID0gdGhpcy5nZXRUcmFwKFwiZ2V0XCIpO1xuICAgIGlmICh0cmFwID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIGRlZmF1bHQgZm9yd2FyZGluZyBiZWhhdmlvclxuICAgICAgcmV0dXJuIFJlZmxlY3QuZ2V0KHRoaXMudGFyZ2V0LCBuYW1lLCByZWNlaXZlcik7XG4gICAgfVxuXG4gICAgbmFtZSA9IFN0cmluZyhuYW1lKTtcbiAgICB2YXIgcmVzID0gdHJhcC5jYWxsKHRoaXMuaGFuZGxlciwgdGhpcy50YXJnZXQsIG5hbWUsIHJlY2VpdmVyKTtcblxuICAgIHZhciBmaXhlZERlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRoaXMudGFyZ2V0LCBuYW1lKTtcbiAgICAvLyBjaGVjayBjb25zaXN0ZW5jeSBvZiB0aGUgcmV0dXJuZWQgdmFsdWVcbiAgICBpZiAoZml4ZWREZXNjICE9PSB1bmRlZmluZWQpIHsgLy8gZ2V0dGluZyBhbiBleGlzdGluZyBwcm9wZXJ0eVxuICAgICAgaWYgKGlzRGF0YURlc2NyaXB0b3IoZml4ZWREZXNjKSAmJlxuICAgICAgICAgIGZpeGVkRGVzYy5jb25maWd1cmFibGUgPT09IGZhbHNlICYmXG4gICAgICAgICAgZml4ZWREZXNjLndyaXRhYmxlID09PSBmYWxzZSkgeyAvLyBvd24gZnJvemVuIGRhdGEgcHJvcGVydHlcbiAgICAgICAgaWYgKCFzYW1lVmFsdWUocmVzLCBmaXhlZERlc2MudmFsdWUpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImNhbm5vdCByZXBvcnQgaW5jb25zaXN0ZW50IHZhbHVlIGZvciBcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibm9uLXdyaXRhYmxlLCBub24tY29uZmlndXJhYmxlIHByb3BlcnR5ICdcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWUrXCInXCIpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2UgeyAvLyBpdCdzIGFuIGFjY2Vzc29yIHByb3BlcnR5XG4gICAgICAgIGlmIChpc0FjY2Vzc29yRGVzY3JpcHRvcihmaXhlZERlc2MpICYmXG4gICAgICAgICAgICBmaXhlZERlc2MuY29uZmlndXJhYmxlID09PSBmYWxzZSAmJlxuICAgICAgICAgICAgZml4ZWREZXNjLmdldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgaWYgKHJlcyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwibXVzdCByZXBvcnQgdW5kZWZpbmVkIGZvciBub24tY29uZmlndXJhYmxlIFwiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImFjY2Vzc29yIHByb3BlcnR5ICdcIituYW1lK1wiJyB3aXRob3V0IGdldHRlclwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmVzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBJZiBuYW1lIGRlbm90ZXMgYSBmaXhlZCBub24tY29uZmlndXJhYmxlLCBub24td3JpdGFibGUgZGF0YSBwcm9wZXJ0eSxcbiAgICogY2hlY2sgdGhhdCB0aGUgdHJhcCByZWplY3RzIHRoZSBhc3NpZ25tZW50LlxuICAgKi9cbiAgc2V0OiBmdW5jdGlvbihyZWNlaXZlciwgbmFtZSwgdmFsKSB7XG4gICAgdmFyIHRyYXAgPSB0aGlzLmdldFRyYXAoXCJzZXRcIik7XG4gICAgaWYgKHRyYXAgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gZGVmYXVsdCBmb3J3YXJkaW5nIGJlaGF2aW9yXG4gICAgICByZXR1cm4gUmVmbGVjdC5zZXQodGhpcy50YXJnZXQsIG5hbWUsIHZhbCwgcmVjZWl2ZXIpO1xuICAgIH1cblxuICAgIG5hbWUgPSBTdHJpbmcobmFtZSk7XG4gICAgdmFyIHJlcyA9IHRyYXAuY2FsbCh0aGlzLmhhbmRsZXIsIHRoaXMudGFyZ2V0LCBuYW1lLCB2YWwsIHJlY2VpdmVyKTtcbiAgICByZXMgPSAhIXJlczsgLy8gY29lcmNlIHRvIEJvb2xlYW5cblxuICAgIC8vIGlmIHN1Y2Nlc3MgaXMgcmVwb3J0ZWQsIGNoZWNrIHdoZXRoZXIgcHJvcGVydHkgaXMgdHJ1bHkgYXNzaWduYWJsZVxuICAgIGlmIChyZXMgPT09IHRydWUpIHtcbiAgICAgIHZhciBmaXhlZERlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRoaXMudGFyZ2V0LCBuYW1lKTtcbiAgICAgIGlmIChmaXhlZERlc2MgIT09IHVuZGVmaW5lZCkgeyAvLyBzZXR0aW5nIGFuIGV4aXN0aW5nIHByb3BlcnR5XG4gICAgICAgIGlmIChpc0RhdGFEZXNjcmlwdG9yKGZpeGVkRGVzYykgJiZcbiAgICAgICAgICAgIGZpeGVkRGVzYy5jb25maWd1cmFibGUgPT09IGZhbHNlICYmXG4gICAgICAgICAgICBmaXhlZERlc2Mud3JpdGFibGUgPT09IGZhbHNlKSB7XG4gICAgICAgICAgaWYgKCFzYW1lVmFsdWUodmFsLCBmaXhlZERlc2MudmFsdWUpKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiY2Fubm90IHN1Y2Nlc3NmdWxseSBhc3NpZ24gdG8gYSBcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJub24td3JpdGFibGUsIG5vbi1jb25maWd1cmFibGUgcHJvcGVydHkgJ1wiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lK1wiJ1wiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaWYgKGlzQWNjZXNzb3JEZXNjcmlwdG9yKGZpeGVkRGVzYykgJiZcbiAgICAgICAgICAgICAgZml4ZWREZXNjLmNvbmZpZ3VyYWJsZSA9PT0gZmFsc2UgJiYgLy8gbm9uLWNvbmZpZ3VyYWJsZVxuICAgICAgICAgICAgICBmaXhlZERlc2Muc2V0ID09PSB1bmRlZmluZWQpIHsgICAgICAvLyBhY2Nlc3NvciB3aXRoIHVuZGVmaW5lZCBzZXR0ZXJcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJzZXR0aW5nIGEgcHJvcGVydHkgJ1wiK25hbWUrXCInIHRoYXQgaGFzIFwiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIiBvbmx5IGEgZ2V0dGVyXCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEFueSBvd24gZW51bWVyYWJsZSBub24tY29uZmlndXJhYmxlIHByb3BlcnRpZXMgb2YgdGhlIHRhcmdldCB0aGF0IGFyZSBub3RcbiAgICogaW5jbHVkZWQgaW4gdGhlIHRyYXAgcmVzdWx0IGdpdmUgcmlzZSB0byBhIFR5cGVFcnJvci4gQXMgc3VjaCwgd2UgY2hlY2tcbiAgICogd2hldGhlciB0aGUgcmV0dXJuZWQgcmVzdWx0IGNvbnRhaW5zIGF0IGxlYXN0IGFsbCBzZWFsZWQgZW51bWVyYWJsZSBwcm9wZXJ0aWVzXG4gICAqIG9mIHRoZSB0YXJnZXQgb2JqZWN0LlxuICAgKlxuICAgKiBUaGUgdHJhcCBzaG91bGQgcmV0dXJuIGFuIGl0ZXJhdG9yLlxuICAgKlxuICAgKiBIb3dldmVyLCBhcyBpbXBsZW1lbnRhdGlvbnMgb2YgcHJlLWRpcmVjdCBwcm94aWVzIHN0aWxsIGV4cGVjdCBlbnVtZXJhdGVcbiAgICogdG8gcmV0dXJuIGFuIGFycmF5IG9mIHN0cmluZ3MsIHdlIGNvbnZlcnQgdGhlIGl0ZXJhdG9yIGludG8gYW4gYXJyYXkuXG4gICAqL1xuICBlbnVtZXJhdGU6IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0cmFwID0gdGhpcy5nZXRUcmFwKFwiZW51bWVyYXRlXCIpO1xuICAgIGlmICh0cmFwID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIGRlZmF1bHQgZm9yd2FyZGluZyBiZWhhdmlvclxuICAgICAgdmFyIHRyYXBSZXN1bHQgPSBSZWZsZWN0LmVudW1lcmF0ZSh0aGlzLnRhcmdldCk7XG4gICAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgICB2YXIgbnh0ID0gdHJhcFJlc3VsdC5uZXh0KCk7XG4gICAgICB3aGlsZSAoIW54dC5kb25lKSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKFN0cmluZyhueHQudmFsdWUpKTtcbiAgICAgICAgbnh0ID0gdHJhcFJlc3VsdC5uZXh0KCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuICAgIHZhciB0cmFwUmVzdWx0ID0gdHJhcC5jYWxsKHRoaXMuaGFuZGxlciwgdGhpcy50YXJnZXQpO1xuICAgIFxuICAgIGlmICh0cmFwUmVzdWx0ID09PSBudWxsIHx8XG4gICAgICAgIHRyYXBSZXN1bHQgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICB0cmFwUmVzdWx0Lm5leHQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImVudW1lcmF0ZSB0cmFwIHNob3VsZCByZXR1cm4gYW4gaXRlcmF0b3IsIGdvdDogXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRyYXBSZXN1bHQpOyAgICBcbiAgICB9XG4gICAgXG4gICAgLy8gcHJvcE5hbWVzIGlzIHVzZWQgYXMgYSBzZXQgb2Ygc3RyaW5nc1xuICAgIHZhciBwcm9wTmFtZXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIFxuICAgIC8vIHZhciBudW1Qcm9wcyA9ICt0cmFwUmVzdWx0Lmxlbmd0aDtcbiAgICB2YXIgcmVzdWx0ID0gW107IC8vIG5ldyBBcnJheShudW1Qcm9wcyk7XG4gICAgXG4gICAgLy8gdHJhcFJlc3VsdCBpcyBzdXBwb3NlZCB0byBiZSBhbiBpdGVyYXRvclxuICAgIC8vIGRyYWluIGl0ZXJhdG9yIHRvIGFycmF5IGFzIGN1cnJlbnQgaW1wbGVtZW50YXRpb25zIHN0aWxsIGV4cGVjdFxuICAgIC8vIGVudW1lcmF0ZSB0byByZXR1cm4gYW4gYXJyYXkgb2Ygc3RyaW5nc1xuICAgIHZhciBueHQgPSB0cmFwUmVzdWx0Lm5leHQoKTtcbiAgICBcbiAgICB3aGlsZSAoIW54dC5kb25lKSB7XG4gICAgICB2YXIgcyA9IFN0cmluZyhueHQudmFsdWUpO1xuICAgICAgaWYgKHByb3BOYW1lc1tzXSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiZW51bWVyYXRlIHRyYXAgY2Fubm90IGxpc3QgYSBcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImR1cGxpY2F0ZSBwcm9wZXJ0eSAnXCIrcytcIidcIik7XG4gICAgICB9XG4gICAgICBwcm9wTmFtZXNbc10gPSB0cnVlO1xuICAgICAgcmVzdWx0LnB1c2gocyk7XG4gICAgICBueHQgPSB0cmFwUmVzdWx0Lm5leHQoKTtcbiAgICB9XG4gICAgXG4gICAgLypmb3IgKHZhciBpID0gMDsgaSA8IG51bVByb3BzOyBpKyspIHtcbiAgICAgIHZhciBzID0gU3RyaW5nKHRyYXBSZXN1bHRbaV0pO1xuICAgICAgaWYgKHByb3BOYW1lc1tzXSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiZW51bWVyYXRlIHRyYXAgY2Fubm90IGxpc3QgYSBcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImR1cGxpY2F0ZSBwcm9wZXJ0eSAnXCIrcytcIidcIik7XG4gICAgICB9XG5cbiAgICAgIHByb3BOYW1lc1tzXSA9IHRydWU7XG4gICAgICByZXN1bHRbaV0gPSBzO1xuICAgIH0gKi9cblxuICAgIHZhciBvd25FbnVtZXJhYmxlUHJvcHMgPSBPYmplY3Qua2V5cyh0aGlzLnRhcmdldCk7XG4gICAgdmFyIHRhcmdldCA9IHRoaXMudGFyZ2V0O1xuICAgIG93bkVudW1lcmFibGVQcm9wcy5mb3JFYWNoKGZ1bmN0aW9uIChvd25FbnVtZXJhYmxlUHJvcCkge1xuICAgICAgaWYgKCFwcm9wTmFtZXNbb3duRW51bWVyYWJsZVByb3BdKSB7XG4gICAgICAgIGlmIChpc1NlYWxlZChvd25FbnVtZXJhYmxlUHJvcCwgdGFyZ2V0KSkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJlbnVtZXJhdGUgdHJhcCBmYWlsZWQgdG8gaW5jbHVkZSBcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibm9uLWNvbmZpZ3VyYWJsZSBlbnVtZXJhYmxlIHByb3BlcnR5ICdcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG93bkVudW1lcmFibGVQcm9wK1wiJ1wiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIU9iamVjdC5pc0V4dGVuc2libGUodGFyZ2V0KSAmJlxuICAgICAgICAgICAgaXNGaXhlZChvd25FbnVtZXJhYmxlUHJvcCwgdGFyZ2V0KSkge1xuICAgICAgICAgICAgLy8gaWYgaGFuZGxlciBpcyBhbGxvd2VkIG5vdCB0byByZXBvcnQgb3duRW51bWVyYWJsZVByb3AgYXMgYW4gb3duXG4gICAgICAgICAgICAvLyBwcm9wZXJ0eSwgd2UgY2Fubm90IGd1YXJhbnRlZSB0aGF0IGl0IHdpbGwgbmV2ZXIgcmVwb3J0IGl0IGFzXG4gICAgICAgICAgICAvLyBhbiBvd24gcHJvcGVydHkgbGF0ZXIuIE9uY2UgYSBwcm9wZXJ0eSBoYXMgYmVlbiByZXBvcnRlZCBhc1xuICAgICAgICAgICAgLy8gbm9uLWV4aXN0ZW50IG9uIGEgbm9uLWV4dGVuc2libGUgb2JqZWN0LCBpdCBzaG91bGQgZm9yZXZlciBiZVxuICAgICAgICAgICAgLy8gcmVwb3J0ZWQgYXMgbm9uLWV4aXN0ZW50XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiY2Fubm90IHJlcG9ydCBleGlzdGluZyBvd24gcHJvcGVydHkgJ1wiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvd25FbnVtZXJhYmxlUHJvcCtcIicgYXMgbm9uLWV4aXN0ZW50IG9uIGEgXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibm9uLWV4dGVuc2libGUgb2JqZWN0XCIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9LFxuXG4gIC8qKlxuICAgKiBUaGUgaXRlcmF0ZSB0cmFwIGlzIGRlcHJlY2F0ZWQgYnkgdGhlIGVudW1lcmF0ZSB0cmFwLlxuICAgKi9cbiAgaXRlcmF0ZTogVmFsaWRhdG9yLnByb3RvdHlwZS5lbnVtZXJhdGUsXG5cbiAgLyoqXG4gICAqIEFueSBvd24gbm9uLWNvbmZpZ3VyYWJsZSBwcm9wZXJ0aWVzIG9mIHRoZSB0YXJnZXQgdGhhdCBhcmUgbm90IGluY2x1ZGVkXG4gICAqIGluIHRoZSB0cmFwIHJlc3VsdCBnaXZlIHJpc2UgdG8gYSBUeXBlRXJyb3IuIEFzIHN1Y2gsIHdlIGNoZWNrIHdoZXRoZXIgdGhlXG4gICAqIHJldHVybmVkIHJlc3VsdCBjb250YWlucyBhdCBsZWFzdCBhbGwgc2VhbGVkIHByb3BlcnRpZXMgb2YgdGhlIHRhcmdldFxuICAgKiBvYmplY3QuXG4gICAqXG4gICAqIFRoZSB0cmFwIHJlc3VsdCBpcyBub3JtYWxpemVkLlxuICAgKiBUaGUgdHJhcCByZXN1bHQgaXMgbm90IHJldHVybmVkIGRpcmVjdGx5LiBJbnN0ZWFkOlxuICAgKiAgLSBjcmVhdGUgYW5kIHJldHVybiBhIGZyZXNoIEFycmF5LFxuICAgKiAgLSBvZiB3aGljaCBlYWNoIGVsZW1lbnQgaXMgY29lcmNlZCB0byBTdHJpbmcsXG4gICAqICAtIHdoaWNoIGRvZXMgbm90IGNvbnRhaW4gZHVwbGljYXRlc1xuICAgKlxuICAgKiBGSVhNRToga2V5cyB0cmFwIGlzIGRlcHJlY2F0ZWRcbiAgICovXG4gIC8qXG4gIGtleXM6IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0cmFwID0gdGhpcy5nZXRUcmFwKFwia2V5c1wiKTtcbiAgICBpZiAodHJhcCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBkZWZhdWx0IGZvcndhcmRpbmcgYmVoYXZpb3JcbiAgICAgIHJldHVybiBSZWZsZWN0LmtleXModGhpcy50YXJnZXQpO1xuICAgIH1cblxuICAgIHZhciB0cmFwUmVzdWx0ID0gdHJhcC5jYWxsKHRoaXMuaGFuZGxlciwgdGhpcy50YXJnZXQpO1xuXG4gICAgLy8gcHJvcE5hbWVzIGlzIHVzZWQgYXMgYSBzZXQgb2Ygc3RyaW5nc1xuICAgIHZhciBwcm9wTmFtZXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIHZhciBudW1Qcm9wcyA9ICt0cmFwUmVzdWx0Lmxlbmd0aDtcbiAgICB2YXIgcmVzdWx0ID0gbmV3IEFycmF5KG51bVByb3BzKTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbnVtUHJvcHM7IGkrKykge1xuICAgICB2YXIgcyA9IFN0cmluZyh0cmFwUmVzdWx0W2ldKTtcbiAgICAgaWYgKHByb3BOYW1lc1tzXSkge1xuICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJrZXlzIHRyYXAgY2Fubm90IGxpc3QgYSBcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZHVwbGljYXRlIHByb3BlcnR5ICdcIitzK1wiJ1wiKTtcbiAgICAgfVxuICAgICBpZiAoIU9iamVjdC5pc0V4dGVuc2libGUodGhpcy50YXJnZXQpICYmICFpc0ZpeGVkKHMsIHRoaXMudGFyZ2V0KSkge1xuICAgICAgIC8vIG5vbi1leHRlbnNpYmxlIHByb3hpZXMgZG9uJ3QgdG9sZXJhdGUgbmV3IG93biBwcm9wZXJ0eSBuYW1lc1xuICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJrZXlzIHRyYXAgY2Fubm90IGxpc3QgYSBuZXcgXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcInByb3BlcnR5ICdcIitzK1wiJyBvbiBhIG5vbi1leHRlbnNpYmxlIG9iamVjdFwiKTtcbiAgICAgfVxuXG4gICAgIHByb3BOYW1lc1tzXSA9IHRydWU7XG4gICAgIHJlc3VsdFtpXSA9IHM7XG4gICAgfVxuXG4gICAgdmFyIG93bkVudW1lcmFibGVQcm9wcyA9IE9iamVjdC5rZXlzKHRoaXMudGFyZ2V0KTtcbiAgICB2YXIgdGFyZ2V0ID0gdGhpcy50YXJnZXQ7XG4gICAgb3duRW51bWVyYWJsZVByb3BzLmZvckVhY2goZnVuY3Rpb24gKG93bkVudW1lcmFibGVQcm9wKSB7XG4gICAgICBpZiAoIXByb3BOYW1lc1tvd25FbnVtZXJhYmxlUHJvcF0pIHtcbiAgICAgICAgaWYgKGlzU2VhbGVkKG93bkVudW1lcmFibGVQcm9wLCB0YXJnZXQpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImtleXMgdHJhcCBmYWlsZWQgdG8gaW5jbHVkZSBcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibm9uLWNvbmZpZ3VyYWJsZSBlbnVtZXJhYmxlIHByb3BlcnR5ICdcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG93bkVudW1lcmFibGVQcm9wK1wiJ1wiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIU9iamVjdC5pc0V4dGVuc2libGUodGFyZ2V0KSAmJlxuICAgICAgICAgICAgaXNGaXhlZChvd25FbnVtZXJhYmxlUHJvcCwgdGFyZ2V0KSkge1xuICAgICAgICAgICAgLy8gaWYgaGFuZGxlciBpcyBhbGxvd2VkIG5vdCB0byByZXBvcnQgb3duRW51bWVyYWJsZVByb3AgYXMgYW4gb3duXG4gICAgICAgICAgICAvLyBwcm9wZXJ0eSwgd2UgY2Fubm90IGd1YXJhbnRlZSB0aGF0IGl0IHdpbGwgbmV2ZXIgcmVwb3J0IGl0IGFzXG4gICAgICAgICAgICAvLyBhbiBvd24gcHJvcGVydHkgbGF0ZXIuIE9uY2UgYSBwcm9wZXJ0eSBoYXMgYmVlbiByZXBvcnRlZCBhc1xuICAgICAgICAgICAgLy8gbm9uLWV4aXN0ZW50IG9uIGEgbm9uLWV4dGVuc2libGUgb2JqZWN0LCBpdCBzaG91bGQgZm9yZXZlciBiZVxuICAgICAgICAgICAgLy8gcmVwb3J0ZWQgYXMgbm9uLWV4aXN0ZW50XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiY2Fubm90IHJlcG9ydCBleGlzdGluZyBvd24gcHJvcGVydHkgJ1wiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvd25FbnVtZXJhYmxlUHJvcCtcIicgYXMgbm9uLWV4aXN0ZW50IG9uIGEgXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibm9uLWV4dGVuc2libGUgb2JqZWN0XCIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9LFxuICAqL1xuICBcbiAgLyoqXG4gICAqIE5ldyB0cmFwIHRoYXQgcmVpZmllcyBbW0NhbGxdXS5cbiAgICogSWYgdGhlIHRhcmdldCBpcyBhIGZ1bmN0aW9uLCB0aGVuIGEgY2FsbCB0b1xuICAgKiAgIHByb3h5KC4uLmFyZ3MpXG4gICAqIFRyaWdnZXJzIHRoaXMgdHJhcFxuICAgKi9cbiAgYXBwbHk6IGZ1bmN0aW9uKHRhcmdldCwgdGhpc0JpbmRpbmcsIGFyZ3MpIHtcbiAgICB2YXIgdHJhcCA9IHRoaXMuZ2V0VHJhcChcImFwcGx5XCIpO1xuICAgIGlmICh0cmFwID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBSZWZsZWN0LmFwcGx5KHRhcmdldCwgdGhpc0JpbmRpbmcsIGFyZ3MpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgdGhpcy50YXJnZXQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgcmV0dXJuIHRyYXAuY2FsbCh0aGlzLmhhbmRsZXIsIHRhcmdldCwgdGhpc0JpbmRpbmcsIGFyZ3MpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiYXBwbHk6IFwiKyB0YXJnZXQgKyBcIiBpcyBub3QgYSBmdW5jdGlvblwiKTtcbiAgICB9XG4gIH0sXG5cbiAgLyoqXG4gICAqIE5ldyB0cmFwIHRoYXQgcmVpZmllcyBbW0NvbnN0cnVjdF1dLlxuICAgKiBJZiB0aGUgdGFyZ2V0IGlzIGEgZnVuY3Rpb24sIHRoZW4gYSBjYWxsIHRvXG4gICAqICAgbmV3IHByb3h5KC4uLmFyZ3MpXG4gICAqIFRyaWdnZXJzIHRoaXMgdHJhcFxuICAgKi9cbiAgY29uc3RydWN0OiBmdW5jdGlvbih0YXJnZXQsIGFyZ3MsIG5ld1RhcmdldCkge1xuICAgIHZhciB0cmFwID0gdGhpcy5nZXRUcmFwKFwiY29uc3RydWN0XCIpO1xuICAgIGlmICh0cmFwID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBSZWZsZWN0LmNvbnN0cnVjdCh0YXJnZXQsIGFyZ3MsIG5ld1RhcmdldCk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiB0YXJnZXQgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIm5ldzogXCIrIHRhcmdldCArIFwiIGlzIG5vdCBhIGZ1bmN0aW9uXCIpO1xuICAgIH1cblxuICAgIGlmIChuZXdUYXJnZXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgbmV3VGFyZ2V0ID0gdGFyZ2V0O1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodHlwZW9mIG5ld1RhcmdldCAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJuZXc6IFwiKyBuZXdUYXJnZXQgKyBcIiBpcyBub3QgYSBmdW5jdGlvblwiKTtcbiAgICAgIH0gICAgICBcbiAgICB9XG4gICAgcmV0dXJuIHRyYXAuY2FsbCh0aGlzLmhhbmRsZXIsIHRhcmdldCwgYXJncywgbmV3VGFyZ2V0KTtcbiAgfVxufTtcblxuLy8gLS0tLSBlbmQgb2YgdGhlIFZhbGlkYXRvciBoYW5kbGVyIHdyYXBwZXIgaGFuZGxlciAtLS0tXG5cbi8vIEluIHdoYXQgZm9sbG93cywgYSAnZGlyZWN0IHByb3h5JyBpcyBhIHByb3h5XG4vLyB3aG9zZSBoYW5kbGVyIGlzIGEgVmFsaWRhdG9yLiBTdWNoIHByb3hpZXMgY2FuIGJlIG1hZGUgbm9uLWV4dGVuc2libGUsXG4vLyBzZWFsZWQgb3IgZnJvemVuIHdpdGhvdXQgbG9zaW5nIHRoZSBhYmlsaXR5IHRvIHRyYXAuXG5cbi8vIG1hcHMgZGlyZWN0IHByb3hpZXMgdG8gdGhlaXIgVmFsaWRhdG9yIGhhbmRsZXJzXG52YXIgZGlyZWN0UHJveGllcyA9IG5ldyBXZWFrTWFwKCk7XG5cbi8vIHBhdGNoIE9iamVjdC57cHJldmVudEV4dGVuc2lvbnMsc2VhbCxmcmVlemV9IHNvIHRoYXRcbi8vIHRoZXkgcmVjb2duaXplIGZpeGFibGUgcHJveGllcyBhbmQgYWN0IGFjY29yZGluZ2x5XG5PYmplY3QucHJldmVudEV4dGVuc2lvbnMgPSBmdW5jdGlvbihzdWJqZWN0KSB7XG4gIHZhciB2aGFuZGxlciA9IGRpcmVjdFByb3hpZXMuZ2V0KHN1YmplY3QpO1xuICBpZiAodmhhbmRsZXIgIT09IHVuZGVmaW5lZCkge1xuICAgIGlmICh2aGFuZGxlci5wcmV2ZW50RXh0ZW5zaW9ucygpKSB7XG4gICAgICByZXR1cm4gc3ViamVjdDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcInByZXZlbnRFeHRlbnNpb25zIG9uIFwiK3N1YmplY3QrXCIgcmVqZWN0ZWRcIik7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBwcmltX3ByZXZlbnRFeHRlbnNpb25zKHN1YmplY3QpO1xuICB9XG59O1xuT2JqZWN0LnNlYWwgPSBmdW5jdGlvbihzdWJqZWN0KSB7XG4gIHNldEludGVncml0eUxldmVsKHN1YmplY3QsIFwic2VhbGVkXCIpO1xuICByZXR1cm4gc3ViamVjdDtcbn07XG5PYmplY3QuZnJlZXplID0gZnVuY3Rpb24oc3ViamVjdCkge1xuICBzZXRJbnRlZ3JpdHlMZXZlbChzdWJqZWN0LCBcImZyb3plblwiKTtcbiAgcmV0dXJuIHN1YmplY3Q7XG59O1xuT2JqZWN0LmlzRXh0ZW5zaWJsZSA9IE9iamVjdF9pc0V4dGVuc2libGUgPSBmdW5jdGlvbihzdWJqZWN0KSB7XG4gIHZhciB2SGFuZGxlciA9IGRpcmVjdFByb3hpZXMuZ2V0KHN1YmplY3QpO1xuICBpZiAodkhhbmRsZXIgIT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB2SGFuZGxlci5pc0V4dGVuc2libGUoKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcHJpbV9pc0V4dGVuc2libGUoc3ViamVjdCk7XG4gIH1cbn07XG5PYmplY3QuaXNTZWFsZWQgPSBPYmplY3RfaXNTZWFsZWQgPSBmdW5jdGlvbihzdWJqZWN0KSB7XG4gIHJldHVybiB0ZXN0SW50ZWdyaXR5TGV2ZWwoc3ViamVjdCwgXCJzZWFsZWRcIik7XG59O1xuT2JqZWN0LmlzRnJvemVuID0gT2JqZWN0X2lzRnJvemVuID0gZnVuY3Rpb24oc3ViamVjdCkge1xuICByZXR1cm4gdGVzdEludGVncml0eUxldmVsKHN1YmplY3QsIFwiZnJvemVuXCIpO1xufTtcbk9iamVjdC5nZXRQcm90b3R5cGVPZiA9IE9iamVjdF9nZXRQcm90b3R5cGVPZiA9IGZ1bmN0aW9uKHN1YmplY3QpIHtcbiAgdmFyIHZIYW5kbGVyID0gZGlyZWN0UHJveGllcy5nZXQoc3ViamVjdCk7XG4gIGlmICh2SGFuZGxlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHZIYW5kbGVyLmdldFByb3RvdHlwZU9mKCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHByaW1fZ2V0UHJvdG90eXBlT2Yoc3ViamVjdCk7XG4gIH1cbn07XG5cbi8vIHBhdGNoIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IgdG8gZGlyZWN0bHkgY2FsbFxuLy8gdGhlIFZhbGlkYXRvci5wcm90b3R5cGUuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yIHRyYXBcbi8vIFRoaXMgaXMgdG8gY2lyY3VtdmVudCBhbiBhc3NlcnRpb24gaW4gdGhlIGJ1aWx0LWluIFByb3h5XG4vLyB0cmFwcGluZyBtZWNoYW5pc20gb2YgdjgsIHdoaWNoIGRpc2FsbG93cyB0aGF0IHRyYXAgdG9cbi8vIHJldHVybiBub24tY29uZmlndXJhYmxlIHByb3BlcnR5IGRlc2NyaXB0b3JzIChhcyBwZXIgdGhlXG4vLyBvbGQgUHJveHkgZGVzaWduKVxuT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvciA9IGZ1bmN0aW9uKHN1YmplY3QsIG5hbWUpIHtcbiAgdmFyIHZoYW5kbGVyID0gZGlyZWN0UHJveGllcy5nZXQoc3ViamVjdCk7XG4gIGlmICh2aGFuZGxlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHZoYW5kbGVyLmdldE93blByb3BlcnR5RGVzY3JpcHRvcihuYW1lKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcHJpbV9nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc3ViamVjdCwgbmFtZSk7XG4gIH1cbn07XG5cbi8vIHBhdGNoIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSB0byBkaXJlY3RseSBjYWxsXG4vLyB0aGUgVmFsaWRhdG9yLnByb3RvdHlwZS5kZWZpbmVQcm9wZXJ0eSB0cmFwXG4vLyBUaGlzIGlzIHRvIGNpcmN1bXZlbnQgdHdvIGlzc3VlcyB3aXRoIHRoZSBidWlsdC1pblxuLy8gdHJhcCBtZWNoYW5pc206XG4vLyAxKSB0aGUgY3VycmVudCB0cmFjZW1vbmtleSBpbXBsZW1lbnRhdGlvbiBvZiBwcm94aWVzXG4vLyBhdXRvLWNvbXBsZXRlcyAnZGVzYycsIHdoaWNoIGlzIG5vdCBjb3JyZWN0LiAnZGVzYycgc2hvdWxkIGJlXG4vLyBub3JtYWxpemVkLCBidXQgbm90IGNvbXBsZXRlZC4gQ29uc2lkZXI6XG4vLyBPYmplY3QuZGVmaW5lUHJvcGVydHkocHJveHksICdmb28nLCB7ZW51bWVyYWJsZTpmYWxzZX0pXG4vLyBUaGlzIHRyYXAgd2lsbCByZWNlaXZlIGRlc2MgPVxuLy8gIHt2YWx1ZTp1bmRlZmluZWQsd3JpdGFibGU6ZmFsc2UsZW51bWVyYWJsZTpmYWxzZSxjb25maWd1cmFibGU6ZmFsc2V9XG4vLyBUaGlzIHdpbGwgYWxzbyBzZXQgYWxsIG90aGVyIGF0dHJpYnV0ZXMgdG8gdGhlaXIgZGVmYXVsdCB2YWx1ZSxcbi8vIHdoaWNoIGlzIHVuZXhwZWN0ZWQgYW5kIGRpZmZlcmVudCBmcm9tIFtbRGVmaW5lT3duUHJvcGVydHldXS5cbi8vIEJ1ZyBmaWxlZDogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9NjAxMzI5XG4vLyAyKSB0aGUgY3VycmVudCBzcGlkZXJtb25rZXkgaW1wbGVtZW50YXRpb24gZG9lcyBub3Rcbi8vIHRocm93IGFuIGV4Y2VwdGlvbiB3aGVuIHRoaXMgdHJhcCByZXR1cm5zICdmYWxzZScsIGJ1dCBpbnN0ZWFkIHNpbGVudGx5XG4vLyBpZ25vcmVzIHRoZSBvcGVyYXRpb24gKHRoaXMgaXMgcmVnYXJkbGVzcyBvZiBzdHJpY3QtbW9kZSlcbi8vIDJhKSB2OCBkb2VzIHRocm93IGFuIGV4Y2VwdGlvbiBmb3IgdGhpcyBjYXNlLCBidXQgaW5jbHVkZXMgdGhlIHJhdGhlclxuLy8gICAgIHVuaGVscGZ1bCBlcnJvciBtZXNzYWdlOlxuLy8gJ1Byb3h5IGhhbmRsZXIgIzxPYmplY3Q+IHJldHVybmVkIGZhbHNlIGZyb20gJ2RlZmluZVByb3BlcnR5JyB0cmFwJ1xuT2JqZWN0LmRlZmluZVByb3BlcnR5ID0gZnVuY3Rpb24oc3ViamVjdCwgbmFtZSwgZGVzYykge1xuICB2YXIgdmhhbmRsZXIgPSBkaXJlY3RQcm94aWVzLmdldChzdWJqZWN0KTtcbiAgaWYgKHZoYW5kbGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICB2YXIgbm9ybWFsaXplZERlc2MgPSBub3JtYWxpemVQcm9wZXJ0eURlc2NyaXB0b3IoZGVzYyk7XG4gICAgdmFyIHN1Y2Nlc3MgPSB2aGFuZGxlci5kZWZpbmVQcm9wZXJ0eShuYW1lLCBub3JtYWxpemVkRGVzYyk7XG4gICAgaWYgKHN1Y2Nlc3MgPT09IGZhbHNlKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiY2FuJ3QgcmVkZWZpbmUgcHJvcGVydHkgJ1wiK25hbWUrXCInXCIpO1xuICAgIH1cbiAgICByZXR1cm4gc3ViamVjdDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcHJpbV9kZWZpbmVQcm9wZXJ0eShzdWJqZWN0LCBuYW1lLCBkZXNjKTtcbiAgfVxufTtcblxuT2JqZWN0LmRlZmluZVByb3BlcnRpZXMgPSBmdW5jdGlvbihzdWJqZWN0LCBkZXNjcykge1xuICB2YXIgdmhhbmRsZXIgPSBkaXJlY3RQcm94aWVzLmdldChzdWJqZWN0KTtcbiAgaWYgKHZoYW5kbGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICB2YXIgbmFtZXMgPSBPYmplY3Qua2V5cyhkZXNjcyk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBuYW1lcy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIG5hbWUgPSBuYW1lc1tpXTtcbiAgICAgIHZhciBub3JtYWxpemVkRGVzYyA9IG5vcm1hbGl6ZVByb3BlcnR5RGVzY3JpcHRvcihkZXNjc1tuYW1lXSk7XG4gICAgICB2YXIgc3VjY2VzcyA9IHZoYW5kbGVyLmRlZmluZVByb3BlcnR5KG5hbWUsIG5vcm1hbGl6ZWREZXNjKTtcbiAgICAgIGlmIChzdWNjZXNzID09PSBmYWxzZSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiY2FuJ3QgcmVkZWZpbmUgcHJvcGVydHkgJ1wiK25hbWUrXCInXCIpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc3ViamVjdDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcHJpbV9kZWZpbmVQcm9wZXJ0aWVzKHN1YmplY3QsIGRlc2NzKTtcbiAgfVxufTtcblxuT2JqZWN0LmtleXMgPSBmdW5jdGlvbihzdWJqZWN0KSB7XG4gIHZhciB2SGFuZGxlciA9IGRpcmVjdFByb3hpZXMuZ2V0KHN1YmplY3QpO1xuICBpZiAodkhhbmRsZXIgIT09IHVuZGVmaW5lZCkge1xuICAgIHZhciBvd25LZXlzID0gdkhhbmRsZXIub3duS2V5cygpO1xuICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG93bktleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBrID0gU3RyaW5nKG93bktleXNbaV0pO1xuICAgICAgdmFyIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHN1YmplY3QsIGspO1xuICAgICAgaWYgKGRlc2MgIT09IHVuZGVmaW5lZCAmJiBkZXNjLmVudW1lcmFibGUgPT09IHRydWUpIHtcbiAgICAgICAgcmVzdWx0LnB1c2goayk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXN1bHQ7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHByaW1fa2V5cyhzdWJqZWN0KTtcbiAgfVxufVxuXG5PYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyA9IE9iamVjdF9nZXRPd25Qcm9wZXJ0eU5hbWVzID0gZnVuY3Rpb24oc3ViamVjdCkge1xuICB2YXIgdkhhbmRsZXIgPSBkaXJlY3RQcm94aWVzLmdldChzdWJqZWN0KTtcbiAgaWYgKHZIYW5kbGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdkhhbmRsZXIub3duS2V5cygpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBwcmltX2dldE93blByb3BlcnR5TmFtZXMoc3ViamVjdCk7XG4gIH1cbn1cblxuLy8gZml4ZXMgaXNzdWUgIzcxIChDYWxsaW5nIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMoKSBvbiBhIFByb3h5XG4vLyB0aHJvd3MgYW4gZXJyb3IpXG5pZiAocHJpbV9nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgIT09IHVuZGVmaW5lZCkge1xuICBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzID0gZnVuY3Rpb24oc3ViamVjdCkge1xuICAgIHZhciB2SGFuZGxlciA9IGRpcmVjdFByb3hpZXMuZ2V0KHN1YmplY3QpO1xuICAgIGlmICh2SGFuZGxlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBhcyB0aGlzIHNoaW0gZG9lcyBub3Qgc3VwcG9ydCBzeW1ib2xzLCBhIFByb3h5IG5ldmVyIGFkdmVydGlzZXNcbiAgICAgIC8vIGFueSBzeW1ib2wtdmFsdWVkIG93biBwcm9wZXJ0aWVzXG4gICAgICByZXR1cm4gW107XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBwcmltX2dldE93blByb3BlcnR5U3ltYm9scyhzdWJqZWN0KTtcbiAgICB9XG4gIH07XG59XG5cbi8vIGZpeGVzIGlzc3VlICM3MiAoJ0lsbGVnYWwgYWNjZXNzJyBlcnJvciB3aGVuIHVzaW5nIE9iamVjdC5hc3NpZ24pXG4vLyBPYmplY3QuYXNzaWduIHBvbHlmaWxsIGJhc2VkIG9uIGEgcG9seWZpbGwgcG9zdGVkIG9uIE1ETjogXG4vLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9cXFxuLy8gIEdsb2JhbF9PYmplY3RzL09iamVjdC9hc3NpZ25cbi8vIE5vdGUgdGhhdCB0aGlzIHBvbHlmaWxsIGRvZXMgbm90IHN1cHBvcnQgU3ltYm9scywgYnV0IHRoaXMgUHJveHkgU2hpbVxuLy8gZG9lcyBub3Qgc3VwcG9ydCBTeW1ib2xzIGFueXdheS5cbmlmIChwcmltX2Fzc2lnbiAhPT0gdW5kZWZpbmVkKSB7XG4gIE9iamVjdC5hc3NpZ24gPSBmdW5jdGlvbiAodGFyZ2V0KSB7XG4gICAgXG4gICAgLy8gY2hlY2sgaWYgYW55IGFyZ3VtZW50IGlzIGEgcHJveHkgb2JqZWN0XG4gICAgdmFyIG5vUHJveGllcyA9IHRydWU7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciB2SGFuZGxlciA9IGRpcmVjdFByb3hpZXMuZ2V0KGFyZ3VtZW50c1tpXSk7XG4gICAgICBpZiAodkhhbmRsZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBub1Byb3hpZXMgPSBmYWxzZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChub1Byb3hpZXMpIHtcbiAgICAgIC8vIG5vdCBhIHNpbmdsZSBhcmd1bWVudCBpcyBhIHByb3h5LCBwZXJmb3JtIGJ1aWx0LWluIGFsZ29yaXRobVxuICAgICAgcmV0dXJuIHByaW1fYXNzaWduLmFwcGx5KE9iamVjdCwgYXJndW1lbnRzKTtcbiAgICB9XG4gICAgXG4gICAgLy8gdGhlcmUgaXMgYXQgbGVhc3Qgb25lIHByb3h5IGFyZ3VtZW50LCB1c2UgdGhlIHBvbHlmaWxsXG4gICAgXG4gICAgaWYgKHRhcmdldCA9PT0gdW5kZWZpbmVkIHx8IHRhcmdldCA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignQ2Fubm90IGNvbnZlcnQgdW5kZWZpbmVkIG9yIG51bGwgdG8gb2JqZWN0Jyk7XG4gICAgfVxuXG4gICAgdmFyIG91dHB1dCA9IE9iamVjdCh0YXJnZXQpO1xuICAgIGZvciAodmFyIGluZGV4ID0gMTsgaW5kZXggPCBhcmd1bWVudHMubGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICB2YXIgc291cmNlID0gYXJndW1lbnRzW2luZGV4XTtcbiAgICAgIGlmIChzb3VyY2UgIT09IHVuZGVmaW5lZCAmJiBzb3VyY2UgIT09IG51bGwpIHtcbiAgICAgICAgZm9yICh2YXIgbmV4dEtleSBpbiBzb3VyY2UpIHtcbiAgICAgICAgICBpZiAoc291cmNlLmhhc093blByb3BlcnR5KG5leHRLZXkpKSB7XG4gICAgICAgICAgICBvdXRwdXRbbmV4dEtleV0gPSBzb3VyY2VbbmV4dEtleV07XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvdXRwdXQ7XG4gIH07XG59XG5cbi8vIHJldHVybnMgd2hldGhlciBhbiBhcmd1bWVudCBpcyBhIHJlZmVyZW5jZSB0byBhbiBvYmplY3QsXG4vLyB3aGljaCBpcyBsZWdhbCBhcyBhIFdlYWtNYXAga2V5LlxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHZhciB0eXBlID0gdHlwZW9mIGFyZztcbiAgcmV0dXJuICh0eXBlID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGwpIHx8ICh0eXBlID09PSAnZnVuY3Rpb24nKTtcbn07XG5cbi8vIGEgd3JhcHBlciBmb3IgV2Vha01hcC5nZXQgd2hpY2ggcmV0dXJucyB0aGUgdW5kZWZpbmVkIHZhbHVlXG4vLyBmb3Iga2V5cyB0aGF0IGFyZSBub3Qgb2JqZWN0cyAoaW4gd2hpY2ggY2FzZSB0aGUgdW5kZXJseWluZ1xuLy8gV2Vha01hcCB3b3VsZCBoYXZlIHRocm93biBhIFR5cGVFcnJvcikuXG5mdW5jdGlvbiBzYWZlV2Vha01hcEdldChtYXAsIGtleSkge1xuICByZXR1cm4gaXNPYmplY3Qoa2V5KSA/IG1hcC5nZXQoa2V5KSA6IHVuZGVmaW5lZDtcbn07XG5cbi8vIHJldHVybnMgYSBuZXcgZnVuY3Rpb24gb2YgemVybyBhcmd1bWVudHMgdGhhdCByZWN1cnNpdmVseVxuLy8gdW53cmFwcyBhbnkgcHJveGllcyBzcGVjaWZpZWQgYXMgdGhlIHx0aGlzfC12YWx1ZS5cbi8vIFRoZSBwcmltaXRpdmUgaXMgYXNzdW1lZCB0byBiZSBhIHplcm8tYXJndW1lbnQgbWV0aG9kXG4vLyB0aGF0IHVzZXMgaXRzIHx0aGlzfC1iaW5kaW5nLlxuZnVuY3Rpb24gbWFrZVVud3JhcHBpbmcwQXJnTWV0aG9kKHByaW1pdGl2ZSkge1xuICByZXR1cm4gZnVuY3Rpb24gYnVpbHRpbigpIHtcbiAgICB2YXIgdkhhbmRsZXIgPSBzYWZlV2Vha01hcEdldChkaXJlY3RQcm94aWVzLCB0aGlzKTtcbiAgICBpZiAodkhhbmRsZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIGJ1aWx0aW4uY2FsbCh2SGFuZGxlci50YXJnZXQpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gcHJpbWl0aXZlLmNhbGwodGhpcyk7XG4gICAgfVxuICB9XG59O1xuXG4vLyByZXR1cm5zIGEgbmV3IGZ1bmN0aW9uIG9mIDEgYXJndW1lbnRzIHRoYXQgcmVjdXJzaXZlbHlcbi8vIHVud3JhcHMgYW55IHByb3hpZXMgc3BlY2lmaWVkIGFzIHRoZSB8dGhpc3wtdmFsdWUuXG4vLyBUaGUgcHJpbWl0aXZlIGlzIGFzc3VtZWQgdG8gYmUgYSAxLWFyZ3VtZW50IG1ldGhvZFxuLy8gdGhhdCB1c2VzIGl0cyB8dGhpc3wtYmluZGluZy5cbmZ1bmN0aW9uIG1ha2VVbndyYXBwaW5nMUFyZ01ldGhvZChwcmltaXRpdmUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIGJ1aWx0aW4oYXJnKSB7XG4gICAgdmFyIHZIYW5kbGVyID0gc2FmZVdlYWtNYXBHZXQoZGlyZWN0UHJveGllcywgdGhpcyk7XG4gICAgaWYgKHZIYW5kbGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBidWlsdGluLmNhbGwodkhhbmRsZXIudGFyZ2V0LCBhcmcpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gcHJpbWl0aXZlLmNhbGwodGhpcywgYXJnKTtcbiAgICB9XG4gIH1cbn07XG5cbk9iamVjdC5wcm90b3R5cGUudmFsdWVPZiA9XG4gIG1ha2VVbndyYXBwaW5nMEFyZ01ldGhvZChPYmplY3QucHJvdG90eXBlLnZhbHVlT2YpO1xuT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZyA9XG4gIG1ha2VVbndyYXBwaW5nMEFyZ01ldGhvZChPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nKTtcbkZ1bmN0aW9uLnByb3RvdHlwZS50b1N0cmluZyA9XG4gIG1ha2VVbndyYXBwaW5nMEFyZ01ldGhvZChGdW5jdGlvbi5wcm90b3R5cGUudG9TdHJpbmcpO1xuRGF0ZS5wcm90b3R5cGUudG9TdHJpbmcgPVxuICBtYWtlVW53cmFwcGluZzBBcmdNZXRob2QoRGF0ZS5wcm90b3R5cGUudG9TdHJpbmcpO1xuXG5PYmplY3QucHJvdG90eXBlLmlzUHJvdG90eXBlT2YgPSBmdW5jdGlvbiBidWlsdGluKGFyZykge1xuICAvLyBidWdmaXggdGhhbmtzIHRvIEJpbGwgTWFyazpcbiAgLy8gYnVpbHQtaW4gaXNQcm90b3R5cGVPZiBkb2VzIG5vdCB1bndyYXAgcHJveGllcyB1c2VkXG4gIC8vIGFzIGFyZ3VtZW50cy4gU28sIHdlIGltcGxlbWVudCB0aGUgYnVpbHRpbiBvdXJzZWx2ZXMsXG4gIC8vIGJhc2VkIG9uIHRoZSBFQ01BU2NyaXB0IDYgc3BlYy4gT3VyIGVuY29kaW5nIHdpbGxcbiAgLy8gbWFrZSBzdXJlIHRoYXQgaWYgYSBwcm94eSBpcyB1c2VkIGFzIGFuIGFyZ3VtZW50LFxuICAvLyBpdHMgZ2V0UHJvdG90eXBlT2YgdHJhcCB3aWxsIGJlIGNhbGxlZC5cbiAgd2hpbGUgKHRydWUpIHtcbiAgICB2YXIgdkhhbmRsZXIyID0gc2FmZVdlYWtNYXBHZXQoZGlyZWN0UHJveGllcywgYXJnKTtcbiAgICBpZiAodkhhbmRsZXIyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGFyZyA9IHZIYW5kbGVyMi5nZXRQcm90b3R5cGVPZigpO1xuICAgICAgaWYgKGFyZyA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9IGVsc2UgaWYgKHNhbWVWYWx1ZShhcmcsIHRoaXMpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gcHJpbV9pc1Byb3RvdHlwZU9mLmNhbGwodGhpcywgYXJnKTtcbiAgICB9XG4gIH1cbn07XG5cbkFycmF5LmlzQXJyYXkgPSBmdW5jdGlvbihzdWJqZWN0KSB7XG4gIHZhciB2SGFuZGxlciA9IHNhZmVXZWFrTWFwR2V0KGRpcmVjdFByb3hpZXMsIHN1YmplY3QpO1xuICBpZiAodkhhbmRsZXIgIT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBBcnJheS5pc0FycmF5KHZIYW5kbGVyLnRhcmdldCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHByaW1faXNBcnJheShzdWJqZWN0KTtcbiAgfVxufTtcblxuZnVuY3Rpb24gaXNQcm94eUFycmF5KGFyZykge1xuICB2YXIgdkhhbmRsZXIgPSBzYWZlV2Vha01hcEdldChkaXJlY3RQcm94aWVzLCBhcmcpO1xuICBpZiAodkhhbmRsZXIgIT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiBBcnJheS5pc0FycmF5KHZIYW5kbGVyLnRhcmdldCk7XG4gIH1cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG4vLyBBcnJheS5wcm90b3R5cGUuY29uY2F0IGludGVybmFsbHkgdGVzdHMgd2hldGhlciBvbmUgb2YgaXRzXG4vLyBhcmd1bWVudHMgaXMgYW4gQXJyYXksIGJ5IGNoZWNraW5nIHdoZXRoZXIgW1tDbGFzc11dID09IFwiQXJyYXlcIlxuLy8gQXMgc3VjaCwgaXQgd2lsbCBmYWlsIHRvIHJlY29nbml6ZSBwcm94aWVzLWZvci1hcnJheXMgYXMgYXJyYXlzLlxuLy8gV2UgcGF0Y2ggQXJyYXkucHJvdG90eXBlLmNvbmNhdCBzbyB0aGF0IGl0IFwidW53cmFwc1wiIHByb3hpZXMtZm9yLWFycmF5c1xuLy8gYnkgbWFraW5nIGEgY29weS4gVGhpcyB3aWxsIHRyaWdnZXIgdGhlIGV4YWN0IHNhbWUgc2VxdWVuY2Ugb2Zcbi8vIHRyYXBzIG9uIHRoZSBwcm94eS1mb3ItYXJyYXkgYXMgaWYgd2Ugd291bGQgbm90IGhhdmUgdW53cmFwcGVkIGl0LlxuLy8gU2VlIDxodHRwczovL2dpdGh1Yi5jb20vdHZjdXRzZW0vaGFybW9ueS1yZWZsZWN0L2lzc3Vlcy8xOT4gZm9yIG1vcmUuXG5BcnJheS5wcm90b3R5cGUuY29uY2F0ID0gZnVuY3Rpb24oLyouLi5hcmdzKi8pIHtcbiAgdmFyIGxlbmd0aDtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoaXNQcm94eUFycmF5KGFyZ3VtZW50c1tpXSkpIHtcbiAgICAgIGxlbmd0aCA9IGFyZ3VtZW50c1tpXS5sZW5ndGg7XG4gICAgICBhcmd1bWVudHNbaV0gPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHNbaV0sIDAsIGxlbmd0aCk7XG4gICAgfVxuICB9XG4gIHJldHVybiBwcmltX2NvbmNhdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcblxuLy8gc2V0UHJvdG90eXBlT2Ygc3VwcG9ydCBvbiBwbGF0Zm9ybXMgdGhhdCBzdXBwb3J0IF9fcHJvdG9fX1xuXG52YXIgcHJpbV9zZXRQcm90b3R5cGVPZiA9IE9iamVjdC5zZXRQcm90b3R5cGVPZjtcblxuLy8gcGF0Y2ggYW5kIGV4dHJhY3Qgb3JpZ2luYWwgX19wcm90b19fIHNldHRlclxudmFyIF9fcHJvdG9fX3NldHRlciA9IChmdW5jdGlvbigpIHtcbiAgdmFyIHByb3RvRGVzYyA9IHByaW1fZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKE9iamVjdC5wcm90b3R5cGUsJ19fcHJvdG9fXycpO1xuICBpZiAocHJvdG9EZXNjID09PSB1bmRlZmluZWQgfHxcbiAgICAgIHR5cGVvZiBwcm90b0Rlc2Muc2V0ICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwic2V0UHJvdG90eXBlT2Ygbm90IHN1cHBvcnRlZCBvbiB0aGlzIHBsYXRmb3JtXCIpO1xuICAgIH1cbiAgfVxuXG4gIC8vIHNlZSBpZiB3ZSBjYW4gYWN0dWFsbHkgbXV0YXRlIGEgcHJvdG90eXBlIHdpdGggdGhlIGdlbmVyaWMgc2V0dGVyXG4gIC8vIChlLmcuIENocm9tZSB2MjggZG9lc24ndCBhbGxvdyBzZXR0aW5nIF9fcHJvdG9fXyB2aWEgdGhlIGdlbmVyaWMgc2V0dGVyKVxuICB0cnkge1xuICAgIHByb3RvRGVzYy5zZXQuY2FsbCh7fSx7fSk7XG4gIH0gY2F0Y2ggKGUpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwic2V0UHJvdG90eXBlT2Ygbm90IHN1cHBvcnRlZCBvbiB0aGlzIHBsYXRmb3JtXCIpO1xuICAgIH1cbiAgfVxuXG4gIHByaW1fZGVmaW5lUHJvcGVydHkoT2JqZWN0LnByb3RvdHlwZSwgJ19fcHJvdG9fXycsIHtcbiAgICBzZXQ6IGZ1bmN0aW9uKG5ld1Byb3RvKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LnNldFByb3RvdHlwZU9mKHRoaXMsIE9iamVjdChuZXdQcm90bykpO1xuICAgIH1cbiAgfSk7XG5cbiAgcmV0dXJuIHByb3RvRGVzYy5zZXQ7XG59KCkpO1xuXG5PYmplY3Quc2V0UHJvdG90eXBlT2YgPSBmdW5jdGlvbih0YXJnZXQsIG5ld1Byb3RvKSB7XG4gIHZhciBoYW5kbGVyID0gZGlyZWN0UHJveGllcy5nZXQodGFyZ2V0KTtcbiAgaWYgKGhhbmRsZXIgIT09IHVuZGVmaW5lZCkge1xuICAgIGlmIChoYW5kbGVyLnNldFByb3RvdHlwZU9mKG5ld1Byb3RvKSkge1xuICAgICAgcmV0dXJuIHRhcmdldDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcInByb3h5IHJlamVjdGVkIHByb3RvdHlwZSBtdXRhdGlvblwiKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKCFPYmplY3RfaXNFeHRlbnNpYmxlKHRhcmdldCkpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJjYW4ndCBzZXQgcHJvdG90eXBlIG9uIG5vbi1leHRlbnNpYmxlIG9iamVjdDogXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICB0YXJnZXQpO1xuICAgIH1cbiAgICBpZiAocHJpbV9zZXRQcm90b3R5cGVPZilcbiAgICAgIHJldHVybiBwcmltX3NldFByb3RvdHlwZU9mKHRhcmdldCwgbmV3UHJvdG8pO1xuXG4gICAgaWYgKE9iamVjdChuZXdQcm90bykgIT09IG5ld1Byb3RvIHx8IG5ld1Byb3RvID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0IHByb3RvdHlwZSBtYXkgb25seSBiZSBhbiBPYmplY3Qgb3IgbnVsbDogXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Byb3RvKTtcbiAgICAgIC8vIHRocm93IG5ldyBUeXBlRXJyb3IoXCJwcm90b3R5cGUgbXVzdCBiZSBhbiBvYmplY3Qgb3IgbnVsbFwiKVxuICAgIH1cbiAgICBfX3Byb3RvX19zZXR0ZXIuY2FsbCh0YXJnZXQsIG5ld1Byb3RvKTtcbiAgICByZXR1cm4gdGFyZ2V0O1xuICB9XG59XG5cbk9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkgPSBmdW5jdGlvbihuYW1lKSB7XG4gIHZhciBoYW5kbGVyID0gc2FmZVdlYWtNYXBHZXQoZGlyZWN0UHJveGllcywgdGhpcyk7XG4gIGlmIChoYW5kbGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICB2YXIgZGVzYyA9IGhhbmRsZXIuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG5hbWUpO1xuICAgIHJldHVybiBkZXNjICE9PSB1bmRlZmluZWQ7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHByaW1faGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLCBuYW1lKTtcbiAgfVxufVxuXG4vLyA9PT09PT09PT09PT09IFJlZmxlY3Rpb24gbW9kdWxlID09PT09PT09PT09PT1cbi8vIHNlZSBodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1oYXJtb255OnJlZmxlY3RfYXBpXG5cbnZhciBSZWZsZWN0ID0gZ2xvYmFsLlJlZmxlY3QgPSB7XG4gIGdldE93blByb3BlcnR5RGVzY3JpcHRvcjogZnVuY3Rpb24odGFyZ2V0LCBuYW1lKSB7XG4gICAgcmV0dXJuIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBuYW1lKTtcbiAgfSxcbiAgZGVmaW5lUHJvcGVydHk6IGZ1bmN0aW9uKHRhcmdldCwgbmFtZSwgZGVzYykge1xuXG4gICAgLy8gaWYgdGFyZ2V0IGlzIGEgcHJveHksIGludm9rZSBpdHMgXCJkZWZpbmVQcm9wZXJ0eVwiIHRyYXBcbiAgICB2YXIgaGFuZGxlciA9IGRpcmVjdFByb3hpZXMuZ2V0KHRhcmdldCk7XG4gICAgaWYgKGhhbmRsZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIGhhbmRsZXIuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBuYW1lLCBkZXNjKTtcbiAgICB9XG5cbiAgICAvLyBJbXBsZW1lbnRhdGlvbiB0cmFuc2xpdGVyYXRlZCBmcm9tIFtbRGVmaW5lT3duUHJvcGVydHldXVxuICAgIC8vIHNlZSBFUzUuMSBzZWN0aW9uIDguMTIuOVxuICAgIC8vIHRoaXMgaXMgdGhlIF9leGFjdCBzYW1lIGFsZ29yaXRobV8gYXMgdGhlIGlzQ29tcGF0aWJsZURlc2NyaXB0b3JcbiAgICAvLyBhbGdvcml0aG0gZGVmaW5lZCBhYm92ZSwgZXhjZXB0IHRoYXQgYXQgZXZlcnkgcGxhY2UgaXRcbiAgICAvLyByZXR1cm5zIHRydWUsIHRoaXMgYWxnb3JpdGhtIGFjdHVhbGx5IGRvZXMgZGVmaW5lIHRoZSBwcm9wZXJ0eS5cbiAgICB2YXIgY3VycmVudCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBuYW1lKTtcbiAgICB2YXIgZXh0ZW5zaWJsZSA9IE9iamVjdC5pc0V4dGVuc2libGUodGFyZ2V0KTtcbiAgICBpZiAoY3VycmVudCA9PT0gdW5kZWZpbmVkICYmIGV4dGVuc2libGUgPT09IGZhbHNlKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmIChjdXJyZW50ID09PSB1bmRlZmluZWQgJiYgZXh0ZW5zaWJsZSA9PT0gdHJ1ZSkge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgbmFtZSwgZGVzYyk7IC8vIHNob3VsZCBuZXZlciBmYWlsXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGlzRW1wdHlEZXNjcmlwdG9yKGRlc2MpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGlzRXF1aXZhbGVudERlc2NyaXB0b3IoY3VycmVudCwgZGVzYykpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAoY3VycmVudC5jb25maWd1cmFibGUgPT09IGZhbHNlKSB7XG4gICAgICBpZiAoZGVzYy5jb25maWd1cmFibGUgPT09IHRydWUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKCdlbnVtZXJhYmxlJyBpbiBkZXNjICYmIGRlc2MuZW51bWVyYWJsZSAhPT0gY3VycmVudC5lbnVtZXJhYmxlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKGlzR2VuZXJpY0Rlc2NyaXB0b3IoZGVzYykpIHtcbiAgICAgIC8vIG5vIGZ1cnRoZXIgdmFsaWRhdGlvbiBuZWNlc3NhcnlcbiAgICB9IGVsc2UgaWYgKGlzRGF0YURlc2NyaXB0b3IoY3VycmVudCkgIT09IGlzRGF0YURlc2NyaXB0b3IoZGVzYykpIHtcbiAgICAgIGlmIChjdXJyZW50LmNvbmZpZ3VyYWJsZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNEYXRhRGVzY3JpcHRvcihjdXJyZW50KSAmJiBpc0RhdGFEZXNjcmlwdG9yKGRlc2MpKSB7XG4gICAgICBpZiAoY3VycmVudC5jb25maWd1cmFibGUgPT09IGZhbHNlKSB7XG4gICAgICAgIGlmIChjdXJyZW50LndyaXRhYmxlID09PSBmYWxzZSAmJiBkZXNjLndyaXRhYmxlID09PSB0cnVlKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmIChjdXJyZW50LndyaXRhYmxlID09PSBmYWxzZSkge1xuICAgICAgICAgIGlmICgndmFsdWUnIGluIGRlc2MgJiYgIXNhbWVWYWx1ZShkZXNjLnZhbHVlLCBjdXJyZW50LnZhbHVlKSkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoaXNBY2Nlc3NvckRlc2NyaXB0b3IoY3VycmVudCkgJiYgaXNBY2Nlc3NvckRlc2NyaXB0b3IoZGVzYykpIHtcbiAgICAgIGlmIChjdXJyZW50LmNvbmZpZ3VyYWJsZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgaWYgKCdzZXQnIGluIGRlc2MgJiYgIXNhbWVWYWx1ZShkZXNjLnNldCwgY3VycmVudC5zZXQpKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIGlmICgnZ2V0JyBpbiBkZXNjICYmICFzYW1lVmFsdWUoZGVzYy5nZXQsIGN1cnJlbnQuZ2V0KSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBuYW1lLCBkZXNjKTsgLy8gc2hvdWxkIG5ldmVyIGZhaWxcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcbiAgZGVsZXRlUHJvcGVydHk6IGZ1bmN0aW9uKHRhcmdldCwgbmFtZSkge1xuICAgIHZhciBoYW5kbGVyID0gZGlyZWN0UHJveGllcy5nZXQodGFyZ2V0KTtcbiAgICBpZiAoaGFuZGxlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gaGFuZGxlci5kZWxldGUobmFtZSk7XG4gICAgfVxuICAgIFxuICAgIHZhciBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIG5hbWUpO1xuICAgIGlmIChkZXNjID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAoZGVzYy5jb25maWd1cmFibGUgPT09IHRydWUpIHtcbiAgICAgIGRlbGV0ZSB0YXJnZXRbbmFtZV07XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlOyAgICBcbiAgfSxcbiAgZ2V0UHJvdG90eXBlT2Y6IGZ1bmN0aW9uKHRhcmdldCkge1xuICAgIHJldHVybiBPYmplY3QuZ2V0UHJvdG90eXBlT2YodGFyZ2V0KTtcbiAgfSxcbiAgc2V0UHJvdG90eXBlT2Y6IGZ1bmN0aW9uKHRhcmdldCwgbmV3UHJvdG8pIHtcbiAgICBcbiAgICB2YXIgaGFuZGxlciA9IGRpcmVjdFByb3hpZXMuZ2V0KHRhcmdldCk7XG4gICAgaWYgKGhhbmRsZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIGhhbmRsZXIuc2V0UHJvdG90eXBlT2YobmV3UHJvdG8pO1xuICAgIH1cbiAgICBcbiAgICBpZiAoT2JqZWN0KG5ld1Byb3RvKSAhPT0gbmV3UHJvdG8gfHwgbmV3UHJvdG8gPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJPYmplY3QgcHJvdG90eXBlIG1heSBvbmx5IGJlIGFuIE9iamVjdCBvciBudWxsOiBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgbmV3UHJvdG8pO1xuICAgIH1cbiAgICBcbiAgICBpZiAoIU9iamVjdF9pc0V4dGVuc2libGUodGFyZ2V0KSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICB2YXIgY3VycmVudCA9IE9iamVjdC5nZXRQcm90b3R5cGVPZih0YXJnZXQpO1xuICAgIGlmIChzYW1lVmFsdWUoY3VycmVudCwgbmV3UHJvdG8pKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgXG4gICAgaWYgKHByaW1fc2V0UHJvdG90eXBlT2YpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHByaW1fc2V0UHJvdG90eXBlT2YodGFyZ2V0LCBuZXdQcm90byk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgX19wcm90b19fc2V0dGVyLmNhbGwodGFyZ2V0LCBuZXdQcm90byk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0sXG4gIHByZXZlbnRFeHRlbnNpb25zOiBmdW5jdGlvbih0YXJnZXQpIHtcbiAgICB2YXIgaGFuZGxlciA9IGRpcmVjdFByb3hpZXMuZ2V0KHRhcmdldCk7XG4gICAgaWYgKGhhbmRsZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIGhhbmRsZXIucHJldmVudEV4dGVuc2lvbnMoKTtcbiAgICB9XG4gICAgcHJpbV9wcmV2ZW50RXh0ZW5zaW9ucyh0YXJnZXQpO1xuICAgIHJldHVybiB0cnVlO1xuICB9LFxuICBpc0V4dGVuc2libGU6IGZ1bmN0aW9uKHRhcmdldCkge1xuICAgIHJldHVybiBPYmplY3QuaXNFeHRlbnNpYmxlKHRhcmdldCk7XG4gIH0sXG4gIGhhczogZnVuY3Rpb24odGFyZ2V0LCBuYW1lKSB7XG4gICAgcmV0dXJuIG5hbWUgaW4gdGFyZ2V0O1xuICB9LFxuICBnZXQ6IGZ1bmN0aW9uKHRhcmdldCwgbmFtZSwgcmVjZWl2ZXIpIHtcbiAgICByZWNlaXZlciA9IHJlY2VpdmVyIHx8IHRhcmdldDtcblxuICAgIC8vIGlmIHRhcmdldCBpcyBhIHByb3h5LCBpbnZva2UgaXRzIFwiZ2V0XCIgdHJhcFxuICAgIHZhciBoYW5kbGVyID0gZGlyZWN0UHJveGllcy5nZXQodGFyZ2V0KTtcbiAgICBpZiAoaGFuZGxlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gaGFuZGxlci5nZXQocmVjZWl2ZXIsIG5hbWUpO1xuICAgIH1cblxuICAgIHZhciBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIG5hbWUpO1xuICAgIGlmIChkZXNjID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHZhciBwcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZih0YXJnZXQpO1xuICAgICAgaWYgKHByb3RvID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgICByZXR1cm4gUmVmbGVjdC5nZXQocHJvdG8sIG5hbWUsIHJlY2VpdmVyKTtcbiAgICB9XG4gICAgaWYgKGlzRGF0YURlc2NyaXB0b3IoZGVzYykpIHtcbiAgICAgIHJldHVybiBkZXNjLnZhbHVlO1xuICAgIH1cbiAgICB2YXIgZ2V0dGVyID0gZGVzYy5nZXQ7XG4gICAgaWYgKGdldHRlciA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cbiAgICByZXR1cm4gZGVzYy5nZXQuY2FsbChyZWNlaXZlcik7XG4gIH0sXG4gIC8vIFJlZmxlY3Quc2V0IGltcGxlbWVudGF0aW9uIGJhc2VkIG9uIGxhdGVzdCB2ZXJzaW9uIG9mIFtbU2V0UF1dIGF0XG4gIC8vIGh0dHA6Ly93aWtpLmVjbWFzY3JpcHQub3JnL2Rva3UucGhwP2lkPWhhcm1vbnk6cHJvdG9fY2xpbWJpbmdfcmVmYWN0b3JpbmdcbiAgc2V0OiBmdW5jdGlvbih0YXJnZXQsIG5hbWUsIHZhbHVlLCByZWNlaXZlcikge1xuICAgIHJlY2VpdmVyID0gcmVjZWl2ZXIgfHwgdGFyZ2V0O1xuXG4gICAgLy8gaWYgdGFyZ2V0IGlzIGEgcHJveHksIGludm9rZSBpdHMgXCJzZXRcIiB0cmFwXG4gICAgdmFyIGhhbmRsZXIgPSBkaXJlY3RQcm94aWVzLmdldCh0YXJnZXQpO1xuICAgIGlmIChoYW5kbGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBoYW5kbGVyLnNldChyZWNlaXZlciwgbmFtZSwgdmFsdWUpO1xuICAgIH1cblxuICAgIC8vIGZpcnN0LCBjaGVjayB3aGV0aGVyIHRhcmdldCBoYXMgYSBub24td3JpdGFibGUgcHJvcGVydHlcbiAgICAvLyBzaGFkb3dpbmcgbmFtZSBvbiByZWNlaXZlclxuICAgIHZhciBvd25EZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIG5hbWUpO1xuXG4gICAgaWYgKG93bkRlc2MgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gbmFtZSBpcyBub3QgZGVmaW5lZCBpbiB0YXJnZXQsIHNlYXJjaCB0YXJnZXQncyBwcm90b3R5cGVcbiAgICAgIHZhciBwcm90byA9IE9iamVjdC5nZXRQcm90b3R5cGVPZih0YXJnZXQpO1xuXG4gICAgICBpZiAocHJvdG8gIT09IG51bGwpIHtcbiAgICAgICAgLy8gY29udGludWUgdGhlIHNlYXJjaCBpbiB0YXJnZXQncyBwcm90b3R5cGVcbiAgICAgICAgcmV0dXJuIFJlZmxlY3Quc2V0KHByb3RvLCBuYW1lLCB2YWx1ZSwgcmVjZWl2ZXIpO1xuICAgICAgfVxuXG4gICAgICAvLyBSZXYxNiBjaGFuZ2UuIENmLiBodHRwczovL2J1Z3MuZWNtYXNjcmlwdC5vcmcvc2hvd19idWcuY2dpP2lkPTE1NDlcbiAgICAgIC8vIHRhcmdldCB3YXMgdGhlIGxhc3QgcHJvdG90eXBlLCBub3cgd2Uga25vdyB0aGF0ICduYW1lJyBpcyBub3Qgc2hhZG93ZWRcbiAgICAgIC8vIGJ5IGFuIGV4aXN0aW5nIChhY2Nlc3NvciBvciBkYXRhKSBwcm9wZXJ0eSwgc28gd2UgY2FuIGFkZCB0aGUgcHJvcGVydHlcbiAgICAgIC8vIHRvIHRoZSBpbml0aWFsIHJlY2VpdmVyIG9iamVjdFxuICAgICAgLy8gKHRoaXMgYnJhbmNoIHdpbGwgaW50ZW50aW9uYWxseSBmYWxsIHRocm91Z2ggdG8gdGhlIGNvZGUgYmVsb3cpXG4gICAgICBvd25EZXNjID1cbiAgICAgICAgeyB2YWx1ZTogdW5kZWZpbmVkLFxuICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlIH07XG4gICAgfVxuXG4gICAgLy8gd2Ugbm93IGtub3cgdGhhdCBvd25EZXNjICE9PSB1bmRlZmluZWRcbiAgICBpZiAoaXNBY2Nlc3NvckRlc2NyaXB0b3Iob3duRGVzYykpIHtcbiAgICAgIHZhciBzZXR0ZXIgPSBvd25EZXNjLnNldDtcbiAgICAgIGlmIChzZXR0ZXIgPT09IHVuZGVmaW5lZCkgcmV0dXJuIGZhbHNlO1xuICAgICAgc2V0dGVyLmNhbGwocmVjZWl2ZXIsIHZhbHVlKTsgLy8gYXNzdW1lcyBGdW5jdGlvbi5wcm90b3R5cGUuY2FsbFxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIC8vIG90aGVyd2lzZSwgaXNEYXRhRGVzY3JpcHRvcihvd25EZXNjKSBtdXN0IGJlIHRydWVcbiAgICBpZiAob3duRGVzYy53cml0YWJsZSA9PT0gZmFsc2UpIHJldHVybiBmYWxzZTtcbiAgICAvLyB3ZSBmb3VuZCBhbiBleGlzdGluZyB3cml0YWJsZSBkYXRhIHByb3BlcnR5IG9uIHRoZSBwcm90b3R5cGUgY2hhaW4uXG4gICAgLy8gTm93IHVwZGF0ZSBvciBhZGQgdGhlIGRhdGEgcHJvcGVydHkgb24gdGhlIHJlY2VpdmVyLCBkZXBlbmRpbmcgb25cbiAgICAvLyB3aGV0aGVyIHRoZSByZWNlaXZlciBhbHJlYWR5IGRlZmluZXMgdGhlIHByb3BlcnR5IG9yIG5vdC5cbiAgICB2YXIgZXhpc3RpbmdEZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihyZWNlaXZlciwgbmFtZSk7XG4gICAgaWYgKGV4aXN0aW5nRGVzYyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICB2YXIgdXBkYXRlRGVzYyA9XG4gICAgICAgIHsgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgIC8vIEZJWE1FOiBpdCBzaG91bGQgbm90IGJlIG5lY2Vzc2FyeSB0byBkZXNjcmliZSB0aGUgZm9sbG93aW5nXG4gICAgICAgICAgLy8gYXR0cmlidXRlcy4gQWRkZWQgdG8gY2lyY3VtdmVudCBhIGJ1ZyBpbiB0cmFjZW1vbmtleTpcbiAgICAgICAgICAvLyBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD02MDEzMjlcbiAgICAgICAgICB3cml0YWJsZTogICAgIGV4aXN0aW5nRGVzYy53cml0YWJsZSxcbiAgICAgICAgICBlbnVtZXJhYmxlOiAgIGV4aXN0aW5nRGVzYy5lbnVtZXJhYmxlLFxuICAgICAgICAgIGNvbmZpZ3VyYWJsZTogZXhpc3RpbmdEZXNjLmNvbmZpZ3VyYWJsZSB9O1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHJlY2VpdmVyLCBuYW1lLCB1cGRhdGVEZXNjKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIU9iamVjdC5pc0V4dGVuc2libGUocmVjZWl2ZXIpKSByZXR1cm4gZmFsc2U7XG4gICAgICB2YXIgbmV3RGVzYyA9XG4gICAgICAgIHsgdmFsdWU6IHZhbHVlLFxuICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlIH07XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkocmVjZWl2ZXIsIG5hbWUsIG5ld0Rlc2MpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICB9LFxuICAvKmludm9rZTogZnVuY3Rpb24odGFyZ2V0LCBuYW1lLCBhcmdzLCByZWNlaXZlcikge1xuICAgIHJlY2VpdmVyID0gcmVjZWl2ZXIgfHwgdGFyZ2V0O1xuXG4gICAgdmFyIGhhbmRsZXIgPSBkaXJlY3RQcm94aWVzLmdldCh0YXJnZXQpO1xuICAgIGlmIChoYW5kbGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBoYW5kbGVyLmludm9rZShyZWNlaXZlciwgbmFtZSwgYXJncyk7XG4gICAgfVxuXG4gICAgdmFyIGZ1biA9IFJlZmxlY3QuZ2V0KHRhcmdldCwgbmFtZSwgcmVjZWl2ZXIpO1xuICAgIHJldHVybiBGdW5jdGlvbi5wcm90b3R5cGUuYXBwbHkuY2FsbChmdW4sIHJlY2VpdmVyLCBhcmdzKTtcbiAgfSwqL1xuICBlbnVtZXJhdGU6IGZ1bmN0aW9uKHRhcmdldCkge1xuICAgIHZhciBoYW5kbGVyID0gZGlyZWN0UHJveGllcy5nZXQodGFyZ2V0KTtcbiAgICB2YXIgcmVzdWx0O1xuICAgIGlmIChoYW5kbGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIGhhbmRsZXIuZW51bWVyYXRlIHNob3VsZCByZXR1cm4gYW4gaXRlcmF0b3IgZGlyZWN0bHksIGJ1dCB0aGVcbiAgICAgIC8vIGl0ZXJhdG9yIGdldHMgY29udmVydGVkIHRvIGFuIGFycmF5IGZvciBiYWNrd2FyZC1jb21wYXQgcmVhc29ucyxcbiAgICAgIC8vIHNvIHdlIG11c3QgcmUtaXRlcmF0ZSBvdmVyIHRoZSBhcnJheVxuICAgICAgcmVzdWx0ID0gaGFuZGxlci5lbnVtZXJhdGUoaGFuZGxlci50YXJnZXQpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQgPSBbXTtcbiAgICAgIGZvciAodmFyIG5hbWUgaW4gdGFyZ2V0KSB7IHJlc3VsdC5wdXNoKG5hbWUpOyB9OyAgICAgIFxuICAgIH1cbiAgICB2YXIgbCA9ICtyZXN1bHQubGVuZ3RoO1xuICAgIHZhciBpZHggPSAwO1xuICAgIHJldHVybiB7XG4gICAgICBuZXh0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKGlkeCA9PT0gbCkgcmV0dXJuIHsgZG9uZTogdHJ1ZSB9O1xuICAgICAgICByZXR1cm4geyBkb25lOiBmYWxzZSwgdmFsdWU6IHJlc3VsdFtpZHgrK10gfTtcbiAgICAgIH1cbiAgICB9O1xuICB9LFxuICAvLyBpbXBlcmZlY3Qgb3duS2V5cyBpbXBsZW1lbnRhdGlvbjogaW4gRVM2LCBzaG91bGQgYWxzbyBpbmNsdWRlXG4gIC8vIHN5bWJvbC1rZXllZCBwcm9wZXJ0aWVzLlxuICBvd25LZXlzOiBmdW5jdGlvbih0YXJnZXQpIHtcbiAgICByZXR1cm4gT2JqZWN0X2dldE93blByb3BlcnR5TmFtZXModGFyZ2V0KTtcbiAgfSxcbiAgYXBwbHk6IGZ1bmN0aW9uKHRhcmdldCwgcmVjZWl2ZXIsIGFyZ3MpIHtcbiAgICAvLyB0YXJnZXQuYXBwbHkocmVjZWl2ZXIsIGFyZ3MpXG4gICAgcmV0dXJuIEZ1bmN0aW9uLnByb3RvdHlwZS5hcHBseS5jYWxsKHRhcmdldCwgcmVjZWl2ZXIsIGFyZ3MpO1xuICB9LFxuICBjb25zdHJ1Y3Q6IGZ1bmN0aW9uKHRhcmdldCwgYXJncywgbmV3VGFyZ2V0KSB7XG4gICAgLy8gcmV0dXJuIG5ldyB0YXJnZXQoLi4uYXJncyk7XG5cbiAgICAvLyBpZiB0YXJnZXQgaXMgYSBwcm94eSwgaW52b2tlIGl0cyBcImNvbnN0cnVjdFwiIHRyYXBcbiAgICB2YXIgaGFuZGxlciA9IGRpcmVjdFByb3hpZXMuZ2V0KHRhcmdldCk7XG4gICAgaWYgKGhhbmRsZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIGhhbmRsZXIuY29uc3RydWN0KGhhbmRsZXIudGFyZ2V0LCBhcmdzLCBuZXdUYXJnZXQpO1xuICAgIH1cbiAgICBcbiAgICBpZiAodHlwZW9mIHRhcmdldCAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwidGFyZ2V0IGlzIG5vdCBhIGZ1bmN0aW9uOiBcIiArIHRhcmdldCk7XG4gICAgfVxuICAgIGlmIChuZXdUYXJnZXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgbmV3VGFyZ2V0ID0gdGFyZ2V0O1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAodHlwZW9mIG5ld1RhcmdldCAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJuZXdUYXJnZXQgaXMgbm90IGEgZnVuY3Rpb246IFwiICsgdGFyZ2V0KTtcbiAgICAgIH0gICAgICBcbiAgICB9XG5cbiAgICByZXR1cm4gbmV3IChGdW5jdGlvbi5wcm90b3R5cGUuYmluZC5hcHBseShuZXdUYXJnZXQsIFtudWxsXS5jb25jYXQoYXJncykpKTtcbiAgfVxufTtcblxuLy8gZmVhdHVyZS10ZXN0IHdoZXRoZXIgdGhlIFByb3h5IGdsb2JhbCBleGlzdHMsIHdpdGhcbi8vIHRoZSBoYXJtb255LWVyYSBQcm94eS5jcmVhdGUgQVBJXG5pZiAodHlwZW9mIFByb3h5ICE9PSBcInVuZGVmaW5lZFwiICYmXG4gICAgdHlwZW9mIFByb3h5LmNyZWF0ZSAhPT0gXCJ1bmRlZmluZWRcIikge1xuXG4gIHZhciBwcmltQ3JlYXRlID0gUHJveHkuY3JlYXRlLFxuICAgICAgcHJpbUNyZWF0ZUZ1bmN0aW9uID0gUHJveHkuY3JlYXRlRnVuY3Rpb247XG5cbiAgdmFyIHJldm9rZWRIYW5kbGVyID0gcHJpbUNyZWF0ZSh7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHsgdGhyb3cgbmV3IFR5cGVFcnJvcihcInByb3h5IGlzIHJldm9rZWRcIik7IH1cbiAgfSk7XG5cbiAgZ2xvYmFsLlByb3h5ID0gZnVuY3Rpb24odGFyZ2V0LCBoYW5kbGVyKSB7XG4gICAgLy8gY2hlY2sgdGhhdCB0YXJnZXQgaXMgYW4gT2JqZWN0XG4gICAgaWYgKE9iamVjdCh0YXJnZXQpICE9PSB0YXJnZXQpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQcm94eSB0YXJnZXQgbXVzdCBiZSBhbiBPYmplY3QsIGdpdmVuIFwiK3RhcmdldCk7XG4gICAgfVxuICAgIC8vIGNoZWNrIHRoYXQgaGFuZGxlciBpcyBhbiBPYmplY3RcbiAgICBpZiAoT2JqZWN0KGhhbmRsZXIpICE9PSBoYW5kbGVyKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiUHJveHkgaGFuZGxlciBtdXN0IGJlIGFuIE9iamVjdCwgZ2l2ZW4gXCIraGFuZGxlcik7XG4gICAgfVxuXG4gICAgdmFyIHZIYW5kbGVyID0gbmV3IFZhbGlkYXRvcih0YXJnZXQsIGhhbmRsZXIpO1xuICAgIHZhciBwcm94eTtcbiAgICBpZiAodHlwZW9mIHRhcmdldCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICBwcm94eSA9IHByaW1DcmVhdGVGdW5jdGlvbih2SGFuZGxlcixcbiAgICAgICAgLy8gY2FsbCB0cmFwXG4gICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgICAgICByZXR1cm4gdkhhbmRsZXIuYXBwbHkodGFyZ2V0LCB0aGlzLCBhcmdzKTtcbiAgICAgICAgfSxcbiAgICAgICAgLy8gY29uc3RydWN0IHRyYXBcbiAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgICAgIHJldHVybiB2SGFuZGxlci5jb25zdHJ1Y3QodGFyZ2V0LCBhcmdzKTtcbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHByb3h5ID0gcHJpbUNyZWF0ZSh2SGFuZGxlciwgT2JqZWN0LmdldFByb3RvdHlwZU9mKHRhcmdldCkpO1xuICAgIH1cbiAgICBkaXJlY3RQcm94aWVzLnNldChwcm94eSwgdkhhbmRsZXIpO1xuICAgIHJldHVybiBwcm94eTtcbiAgfTtcblxuICBnbG9iYWwuUHJveHkucmV2b2NhYmxlID0gZnVuY3Rpb24odGFyZ2V0LCBoYW5kbGVyKSB7XG4gICAgdmFyIHByb3h5ID0gbmV3IFByb3h5KHRhcmdldCwgaGFuZGxlcik7XG4gICAgdmFyIHJldm9rZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIHZIYW5kbGVyID0gZGlyZWN0UHJveGllcy5nZXQocHJveHkpO1xuICAgICAgaWYgKHZIYW5kbGVyICE9PSBudWxsKSB7XG4gICAgICAgIHZIYW5kbGVyLnRhcmdldCAgPSBudWxsO1xuICAgICAgICB2SGFuZGxlci5oYW5kbGVyID0gcmV2b2tlZEhhbmRsZXI7XG4gICAgICB9XG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH07XG4gICAgcmV0dXJuIHtwcm94eTogcHJveHksIHJldm9rZTogcmV2b2tlfTtcbiAgfVxuICBcbiAgLy8gYWRkIHRoZSBvbGQgUHJveHkuY3JlYXRlIGFuZCBQcm94eS5jcmVhdGVGdW5jdGlvbiBtZXRob2RzXG4gIC8vIHNvIG9sZCBjb2RlIHRoYXQgc3RpbGwgZGVwZW5kcyBvbiB0aGUgaGFybW9ueS1lcmEgUHJveHkgb2JqZWN0XG4gIC8vIGlzIG5vdCBicm9rZW4uIEFsc28gZW5zdXJlcyB0aGF0IG11bHRpcGxlIHZlcnNpb25zIG9mIHRoaXNcbiAgLy8gbGlicmFyeSBzaG91bGQgbG9hZCBmaW5lXG4gIGdsb2JhbC5Qcm94eS5jcmVhdGUgPSBwcmltQ3JlYXRlO1xuICBnbG9iYWwuUHJveHkuY3JlYXRlRnVuY3Rpb24gPSBwcmltQ3JlYXRlRnVuY3Rpb247XG5cbn0gZWxzZSB7XG4gIC8vIFByb3h5IGdsb2JhbCBub3QgZGVmaW5lZCwgb3Igb2xkIEFQSSBub3QgYXZhaWxhYmxlXG4gIGlmICh0eXBlb2YgUHJveHkgPT09IFwidW5kZWZpbmVkXCIpIHtcbiAgICAvLyBQcm94eSBnbG9iYWwgbm90IGRlZmluZWQsIGFkZCBhIFByb3h5IGZ1bmN0aW9uIHN0dWJcbiAgICBnbG9iYWwuUHJveHkgPSBmdW5jdGlvbihfdGFyZ2V0LCBfaGFuZGxlcikge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwicHJveGllcyBub3Qgc3VwcG9ydGVkIG9uIHRoaXMgcGxhdGZvcm0uIE9uIHY4L25vZGUvaW9qcywgbWFrZSBzdXJlIHRvIHBhc3MgdGhlIC0taGFybW9ueV9wcm94aWVzIGZsYWdcIik7XG4gICAgfTtcbiAgfVxuICAvLyBQcm94eSBnbG9iYWwgZGVmaW5lZCBidXQgb2xkIEFQSSBub3QgYXZhaWxhYmxlXG4gIC8vIHByZXN1bWFibHkgUHJveHkgZ2xvYmFsIGFscmVhZHkgc3VwcG9ydHMgbmV3IEFQSSwgbGVhdmUgdW50b3VjaGVkXG59XG5cbi8vIGZvciBub2RlLmpzIG1vZHVsZXMsIGV4cG9ydCBldmVyeSBwcm9wZXJ0eSBpbiB0aGUgUmVmbGVjdCBvYmplY3Rcbi8vIGFzIHBhcnQgb2YgdGhlIG1vZHVsZSBpbnRlcmZhY2VcbmlmICh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgT2JqZWN0LmtleXMoUmVmbGVjdCkuZm9yRWFjaChmdW5jdGlvbiAoa2V5KSB7XG4gICAgZXhwb3J0c1trZXldID0gUmVmbGVjdFtrZXldO1xuICB9KTtcbn1cblxuLy8gZnVuY3Rpb24tYXMtbW9kdWxlIHBhdHRlcm5cbn0odHlwZW9mIGV4cG9ydHMgIT09ICd1bmRlZmluZWQnID8gZ2xvYmFsIDogdGhpcykpOyIsImNvbnN0IG1iSGVscGVyID0ge1xuICAgIHByb21pc2VzOiB7fSxcbiAgICBhZGRTb3VyY2VBbmRMYXllcnMoc291cmNlT3B0aW9ucyxsYXllck9wdGlvbnNBcnJheSl7IC8vIHRoaXMgPSBtYXBcbiAgICAgICAgdmFyIHNvdXJjZU5hbWUgPSBzb3VyY2VPcHRpb25zLm5hbWU7XG4gICAgICAgIG1iSGVscGVyLnByb21pc2VzW3NvdXJjZU9wdGlvbnMubmFtZV0gPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4geyAvLyBUTyBETzogZmlndXJlIG91dCByZWplY3Q/XG4gICAgICAgICAgICBkZWxldGUgc291cmNlT3B0aW9ucy5uYW1lO1xuICAgICAgICAgICAgZnVuY3Rpb24gY2hlY2tEYXRhTG9hZGVkKCl7XG4gICAgICAgICAgICAgICAgaWYgKCB0aGlzLmdldFNvdXJjZShzb3VyY2VOYW1lKSApeyAvLyBpZiBhZGRTb3VyY2UgaGFzIHRha2VuIGVmZmVjdFxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9mZigncmVuZGVyJywgY2hlY2tEYXRhTG9hZGVkKTsgLy8gdHVybiBvZmYgdGhlIGxpc3RlbmVyIGZvciByZW5kZXJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLm9uKCdyZW5kZXInLCBjaGVja0RhdGFMb2FkZWQpO1xuICAgICAgICAgICAgdGhpcy5hZGRTb3VyY2Uoc291cmNlTmFtZSwgc291cmNlT3B0aW9ucyk7XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgbGF5ZXJQcm9taXNlcyA9IFtdO1xuICAgICAgICByZXR1cm4gbWJIZWxwZXIucHJvbWlzZXNbc291cmNlTmFtZV0udGhlbigoKSA9PiB7IFxuICAgICAgICAgICAgbGF5ZXJPcHRpb25zQXJyYXkuZm9yRWFjaCgoZWFjaCkgPT4ge1xuICAgICAgICAgICAgICAgIGxheWVyUHJvbWlzZXMucHVzaChcbiAgICAgICAgICAgICAgICAgICAgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHsgLy8gVE8gRE86IGZpZ3VyZSBvdXQgcmVqZWN0P1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGJlZm9yZUxheWVyID0gZWFjaC5iZWZvcmVMYXllciA/IGVhY2guYmVmb3JlTGF5ZXIgOiAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBlYWNoLmJlZm9yZUxheWVyO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWFjaC5zb3VyY2UgPSBzb3VyY2VOYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gY2hlY2tMYXllckxvYWRlZCgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICggdGhpcy5nZXRMYXllcihlYWNoLmlkKSApeyAvLyBpZiBhZGRMYXllciAgaGFzIHRha2VuIGVmZmVjdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9mZigncmVuZGVyJywgY2hlY2tMYXllckxvYWRlZCk7IC8vIHR1cm4gb2ZmIHRoZSBsaXN0ZW5lciBmb3IgcmVuZGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vbigncmVuZGVyJywgY2hlY2tMYXllckxvYWRlZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZExheWVyKGVhY2gsIGJlZm9yZUxheWVyKTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwobGF5ZXJQcm9taXNlcyk7XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbmV4cG9ydHMuYWRkU291cmNlQW5kTGF5ZXJzID0gbWJIZWxwZXIuYWRkU291cmNlQW5kTGF5ZXJzOyJdfQ==
