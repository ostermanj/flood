(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
'use strict';

var _Bars = require('../js-exports/Bars');

var _d3Tip = require('../js-vendor/d3-tip');

var _polyfills = require('../js-vendor/polyfills');

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } } /* exported Charts, d3Tip, MapValues */
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

	function checkSupported() {

		function webgl_support() {
			try {
				var canvas = document.createElement('canvas');
				return !!window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
			} catch (e) {
				return false;
			}
		}

		var problems = 0;

		if (webgl_support() == null) {
			d3.select('#webgl-warning').classed('warning', true).append('li').text('Your device may not support the graphics this tool relies on; please try on another.');
		}
		if (typeof Map !== 'function' || typeof Set !== 'function') {
			problems++;
			d3.select('#webgl-warning').classed('warning', true).append('li').text('Your browser is out of date and will have trouble loading this feature. We’re showing you an image instead. Please try another browser.');

			d3.select('#webgl-warning').append('img').attr('src', 'assets/flood-insurance-policy.png');
		}

		return problems;
	}

	if (checkSupported() > 0) {
		return;
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
		center: [-96.6434921115092, 37.98467337085599],
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
			//"type": "geojson",
			//"data": geojson
			"type": "vector",
			"url": "mapbox://ostermanj.63wez16h"
		}, [// layers
		{ // layer one
			"id": "points",
			"type": "circle",
			"source": "policy-points",
			"source-layer": "policies",
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
			"source-layer": "policies",
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

				tip.show.call(this, d);
			}).on('click', function (d) {
				d3.event.stopPropagation();
				tip.show.call(this, d);
			}).on('mouseleave', tip.hide);

			d3.select('#map-feature').on('click', function () {
				console.log('click');
				d3.selectAll('.d3-tip').style('opacity', 0);
			});

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

			this.svg = d3.select(this.container).append('div').attr('class', 'svg-wrapper').append('svg').attr('width', '100%').attr('xmlns', 'http://www.w3.org/2000/svg').attr('version', '1.1').attr('viewBox', viewBox).append('g').attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

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
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

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
    var type = typeof arg === 'undefined' ? 'undefined' : _typeof(arg);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkZXYtanMvbWFpbi5lczYiLCJqcy1leHBvcnRzL0JhcnMuanMiLCJqcy12ZW5kb3IvZDMtdGlwLmpzIiwianMtdmVuZG9yL3BvbHlmaWxscy5qcyIsIm5vZGVfbW9kdWxlcy9tYXBib3gtaGVscGVyL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNFQzs7QUFDQTs7QUFDQTs7b01BSkE7QUFDQTs7O0FBS0E7O0FBRUQ7Ozs7Ozs7QUFPQTs7Ozs7QUFLQSxPQUFPLE1BQVAsR0FBa0IsWUFBVTtBQUM1Qjs7QUFFQyxVQUFTLGNBQVQsR0FBeUI7O0FBRXhCLFdBQVMsYUFBVCxHQUF5QjtBQUNyQixPQUFJO0FBQ0gsUUFBSSxTQUFTLFNBQVMsYUFBVCxDQUF3QixRQUF4QixDQUFiO0FBQ0EsV0FBTyxDQUFDLENBQUUsT0FBTyxxQkFBVixLQUNILE9BQU8sVUFBUCxDQUFtQixPQUFuQixLQUFnQyxPQUFPLFVBQVAsQ0FBbUIsb0JBQW5CLENBRDdCLENBQVA7QUFFQSxJQUpELENBSUUsT0FBTSxDQUFOLEVBQVM7QUFDVixXQUFPLEtBQVA7QUFDRztBQUNQOztBQUVELE1BQUksV0FBVyxDQUFmOztBQUVBLE1BQUssbUJBQW1CLElBQXhCLEVBQThCO0FBQzdCLE1BQUcsTUFBSCxDQUFVLGdCQUFWLEVBQ0UsT0FERixDQUNVLFNBRFYsRUFDcUIsSUFEckIsRUFFRSxNQUZGLENBRVMsSUFGVCxFQUdFLElBSEYsQ0FHTyxzRkFIUDtBQUlBO0FBQ0QsTUFBSyxPQUFPLEdBQVAsS0FBZSxVQUFmLElBQTZCLE9BQU8sR0FBUCxLQUFlLFVBQWpELEVBQThEO0FBQzdEO0FBQ0EsTUFBRyxNQUFILENBQVUsZ0JBQVYsRUFDRSxPQURGLENBQ1UsU0FEVixFQUNxQixJQURyQixFQUVF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USxrQkFBUixHQUE2QixTQUFTLGtCQUF0QyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9cmV0dXJuIGV9KSgpIiwiIC8qIGV4cG9ydGVkIENoYXJ0cywgZDNUaXAsIE1hcFZhbHVlcyAqL1xuIC8vaW1wb3J0IHsgRG9udXRzIH0gZnJvbSAnLi4vanMtZXhwb3J0cy9Eb251dHMnO1xuIGltcG9ydCB7IEJhcnMgfSBmcm9tICcuLi9qcy1leHBvcnRzL0JhcnMnO1xuIGltcG9ydCB7IGQzVGlwIH0gZnJvbSAnLi4vanMtdmVuZG9yL2QzLXRpcCc7XG4gaW1wb3J0IHsgTWFwVmFsdWVzIH0gZnJvbSAnLi4vanMtdmVuZG9yL3BvbHlmaWxscyc7XG4gXG4gLyogcG9seWZpbGxzIG5lZWRlZDogUHJvbWlzZSBUTyBETzogT1RIRVJTP1xuICovXG4vKlxuaW1wb3J0IHsgSGVscGVycyB9IGZyb20gJy4uL2pzLWV4cG9ydHMvSGVscGVycyc7XG5pbXBvcnQgeyBkM1RpcCB9IGZyb20gJy4uL2pzLXZlbmRvci9kMy10aXAnO1xuaW1wb3J0IHsgY3JlYXRlQnJvd3NlQnV0dG9uIH0gZnJvbSAnLi4vanMtZXhwb3J0cy9Ccm93c2VCdXR0b25zJztcbmltcG9ydCB7IGNyZWF0ZVJlc3VsdEl0ZW0gfSBmcm9tICcuLi9qcy1leHBvcnRzL1Jlc3VsdEl0ZW1zJzsgXG4qL1xuICBcbi8qXG50byBkbyA6IHNlZSBhbHNvIGh0dHBzOi8vd3d3Lm1hcGJveC5jb20vbWFwYm94LWdsLWpzL2V4YW1wbGUvaGVhdG1hcC1sYXllci9cbiBcblxuKi9cbndpbmRvdy50aGVNYXAgID0gKGZ1bmN0aW9uKCl7ICAgXG5cInVzZSBzdHJpY3RcIjtcblxuXHRmdW5jdGlvbiBjaGVja1N1cHBvcnRlZCgpe1xuXG5cdFx0ZnVuY3Rpb24gd2ViZ2xfc3VwcG9ydCgpIHsgXG5cdFx0ICAgIHRyeSB7XG5cdFx0XHQgICAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoICdjYW52YXMnICk7IFxuXHRcdFx0ICAgIHJldHVybiAhISB3aW5kb3cuV2ViR0xSZW5kZXJpbmdDb250ZXh0ICYmICggXG5cdFx0ICAgICAgICAgY2FudmFzLmdldENvbnRleHQoICd3ZWJnbCcgKSB8fCBjYW52YXMuZ2V0Q29udGV4dCggJ2V4cGVyaW1lbnRhbC13ZWJnbCcgKSApO1xuXHRcdCAgICB9IGNhdGNoKGUpIHtcblx0XHQgICAgXHRyZXR1cm4gZmFsc2U7XG4gICAgXHQgICAgfSBcblx0XHR9XG5cblx0XHR2YXIgcHJvYmxlbXMgPSAwO1xuXHRcdCBcblx0XHRpZiAoIHdlYmdsX3N1cHBvcnQoKSA9PSBudWxsICl7XG5cdFx0XHRkMy5zZWxlY3QoJyN3ZWJnbC13YXJuaW5nJylcblx0XHRcdFx0LmNsYXNzZWQoJ3dhcm5pbmcnLCB0cnVlKVxuXHRcdFx0XHQuYXBwZW5kKCdsaScpXG5cdFx0XHRcdC50ZXh0KCdZb3VyIGRldmljZSBtYXkgbm90IHN1cHBvcnQgdGhlIGdyYXBoaWNzIHRoaXMgdG9vbCByZWxpZXMgb247IHBsZWFzZSB0cnkgb24gYW5vdGhlci4nKTtcblx0XHR9XG5cdFx0aWYgKCB0eXBlb2YgTWFwICE9PSAnZnVuY3Rpb24nIHx8IHR5cGVvZiBTZXQgIT09ICdmdW5jdGlvbicgKSB7XG5cdFx0XHRwcm9ibGVtcysrO1xuXHRcdFx0ZDMuc2VsZWN0KCcjd2ViZ2wtd2FybmluZycpXG5cdFx0XHRcdC5jbGFzc2VkKCd3YXJuaW5nJywgdHJ1ZSlcblx0XHRcdFx0LmFwcGVuZCgnbGknKVxuXHRcdFx0XHQudGV4dCgnWW91ciBicm93c2VyIGlzIG91dCBvZiBkYXRlIGFuZCB3aWxsIGhhdmUgdHJvdWJsZSBsb2FkaW5nIHRoaXMgZmVhdHVyZS4gV2XigJlyZSBzaG93aW5nIHlvdSBhbiBpbWFnZSBpbnN0ZWFkLiBQbGVhc2UgdHJ5IGFub3RoZXIgYnJvd3Nlci4nKTtcblxuXHRcdFx0ZDMuc2VsZWN0KCcjd2ViZ2wtd2FybmluZycpXG5cdFx0XHRcdC5hcHBlbmQoJ2ltZycpXG5cdFx0XHRcdC5hdHRyKCdzcmMnLCdhc3NldHMvZmxvb2QtaW5zdXJhbmNlLXBvbGljeS5wbmcnKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gcHJvYmxlbXM7XG5cdFx0XG5cdH1cblxuXHRpZiAoIGNoZWNrU3VwcG9ydGVkKCkgPiAwICkge1xuXHRcdHJldHVybjtcblx0fVxuXHQvL3ZhciB0aXAgPSBkMy50aXAoKS5hdHRyKCdjbGFzcycsICdkMy10aXAnKS5odG1sKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQ7IH0pO1xuXHRcbiAgICBtYXBib3hnbC5hY2Nlc3NUb2tlbiA9ICdway5leUoxSWpvaWIzTjBaWEp0WVc1cUlpd2lZU0k2SW1OcGRuVTVkSFZuZGpBMmVEWXliM0EzTm5nMWNHSjNaWG9pZlEuWG9fay1rekdmWVhfWW9fUkRjSERCZyc7XG4gICAgZDMuc2VsZWN0QWxsKCcuaGVscC1saW5rJylcbiAgICBcdC5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgXHRcdGQzLmV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgXHR9KTtcbiAgICBjb25zdCBtYkhlbHBlciA9IHJlcXVpcmUoJ21hcGJveC1oZWxwZXInKTtcbiAgIC8vIGQzLnRpcCA9IHJlcXVpcmUoJ2QzLXRpcCcpO1xuICAgIGNvbnN0IHRpcCA9IGQzLnRpcCgpLmF0dHIoJ2NsYXNzJywgJ2QzLXRpcCcpLmRpcmVjdGlvbigndycpLmh0bWwoZnVuY3Rpb24oZCkgeyBjb25zb2xlLmxvZyh0aGlzLGQpO3JldHVybiBkW2QzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUucGFyZW50Tm9kZS5wYXJlbnROb2RlKS5hdHRyKCdpZCcpLnJlcGxhY2UoJy0nLCcnKV07IH0pO1xuICAgXHRjb25zdCB0aGVDaGFydHMgPSBbXTtcbiAgIFxuICAgIHZhciBnZW9qc29uO1xuICAgIHZhciBmZWF0dXJlUHJvcGVydGllc0J5SWQgPSBuZXcgTWFwKCk7IFxuICAgIHZhciBnYXRlQ2hlY2sgPSAwO1xuXG4gICAgdmFyIHNpemVab29tVGhyZXNob2xkID0gODtcbiAgICBcbiAgICB2YXIgdGhlTWFwID0gbmV3IG1hcGJveGdsLk1hcCh7XG5cdCAgICBjb250YWluZXI6ICdtYXAnLFxuXHQgICAgc3R5bGU6ICdtYXBib3g6Ly9zdHlsZXMvb3N0ZXJtYW5qL2NqZjAzbzM3YjN0dmUycnFwMmludzZhMWYnLFxuXHQgICAgY2VudGVyOiBbLTk2LjY0MzQ5MjExMTUwOTIsIDM3Ljk4NDY3MzM3MDg1NTk5XSxcblx0ICAgIHpvb206IDMsXG5cdCAgICBtYXhCb3VuZHM6IFtbLTE0Mi44ODcwNTcxNDc0NjM2MiwgMTYuMDU4MzQ0OTQ4NDMyNDA2XSxbLTUxLjkwMjMwMTc4Njk3MzEsNTUuNzY2OTAwNjc0MTcxMzhdXSxcblx0ICAgIG1pblpvb206IDEuNSxcblx0ICAgIGF0dHJpYnV0aW9uQ29udHJvbDogZmFsc2UsXG5cdH0pO1xuXG5cdHZhciBuYXYgPSBuZXcgbWFwYm94Z2wuTmF2aWdhdGlvbkNvbnRyb2woe3Nob3dDb21wYXNzOmZhbHNlfSk7XG5cdHRoZU1hcC5hZGRDb250cm9sKG5hdiwgJ3RvcC1yaWdodCcpO1xuXG5cdHZhciBtZWRpYW5JbmNvbWVzID0gbmV3IE1hcCgpO1xuXHR0b0dlb0pTT04oJ3BvbGljaWVzLmNzdicpO1xuXHR0aGVNYXAub24oJ2xvYWQnLCBmdW5jdGlvbigpe1xuXHRcdGdhdGVDaGVjaysrO1xuXHRcdGdhdGUoKTtcblx0fSk7XG5cdGZ1bmN0aW9uIGdhdGUoKXtcblx0XHRpZiAoIGdhdGVDaGVjayA8IDIgKXtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dXBkYXRlQWxsKCk7XG5cdFx0YWRkVW5jbHVzdGVyZWQoKTtcblx0XHRhZGRDbHVzdGVyZWQoKTtcblx0XHQvL2NhbGN1bGF0ZVpTY29yZXMoJ3ByZW0nKTtcblx0fSAvLyBlbmQgZ2F0ZVxuXG5cdC8qdmFyIGNlbnN1c1RyYWN0c0luVmlldyA9IG5ldyBTZXQoKTtcblx0ZnVuY3Rpb24gY2FsY3VsYXRlTWVkaWFuSW5jb21lcyhpblZpZXdJRHMpe1xuXHRcdGNvbnNvbGUubG9nKGluVmlld0lEcyk7XG5cdFx0dmFyIG1lZGlhbkluY29tZXMgPSBbXTtcblx0XHRjZW5zdXNUcmFjdHNJblZpZXcuY2xlYXIoKTtcblx0XHRpblZpZXdJRHMuZm9yRWFjaChkID0+IHtcblx0XHRcdGNvbnNvbGUubG9nKGQpO1xuXHRcdFx0dmFyIGZlYXR1cmUgPSBnZW9qc29uLmZlYXR1cmVzLmZpbmQoZiA9PiBmLnByb3BlcnRpZXMuaWQgPT09IGQpO1xuXHRcdFx0dmFyIGNlbnN1c1RyYWN0ID0gZmVhdHVyZS5jZW5fdHJhY3Q7XG5cdFx0XHRpZiAoICFjZW5zdXNUcmFjdHNJblZpZXcuaGFzKGNlbnN1c1RyYWN0KSl7XG5cdFx0XHRcdGNlbnN1c1RyYWN0c0luVmlldy5hZGQoY2Vuc3VzVHJhY3QpO1xuXHRcdFx0XHRtZWRpYW5JbmNvbWVzLnB1c2goZmVhdHVyZS5tZWRfaW5jb21lKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRyZXR1cm4gbWVkaWFuSW5jb21lcztcblx0fSovXG5cdGZ1bmN0aW9uIGNhbGN1bGF0ZVpTY29yZXMoZmllbGQsIGN1dG9mZiA9IG51bGwsIGhhcmRDdXRvZmYgPSBudWxsLCBpZ25vcmUgPSBbXSApeyAgLy8gY3V0b2ZmIHNwZWNpZmllcyB1cHBlciBib3VuZCB0byBnZXQgcmlkIG9mIG91dGxpZXJzXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCAgLy8gYSB3ZWFrIGN1dG9mZiBjYWxjdWxhdGVzIHZhbHVlcyBmb3Igd2hvbGUgc2V0IGJ1dFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQgIC8vIHNldHMgbWF4IGZvciB0aGUgdml6IGJhc2VkIG9uIHRoZSBjdXRvZmYgdmFsdWUuIGEgaGFyZFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQgIC8vIGN1dG9mZiBleGNsdWRlcyB2YWx1ZXMgYmV5b25kIHRoZSBjdXRvZmYgZnJvbSB0aGUgXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCAgLy8gY2FsY3VsYXRpb25zXHRcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ICAvLyB0aGUgaWdub3JlIGFycmF5IGlzIHZhbHVlcyB0aGF0IHNob3VsZCBiZSB0cmVhdGVkIGFzIGludmFsaWRcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ICAvLyBzdWNoIGFzIGFsbCB0aGUgZXJyb25lb3VlICQyNTBrIGhvbWUgdmFsdWVzLlxuXHRcdGNvbnNvbGUubG9nKCdjYWxjdWxhdGluZyB6LXNjb3JlcycpO1xuXHRcdHZhciBtZWFuID0gZDMubWVhbihnZW9qc29uLmZlYXR1cmVzLCBkID0+IHtcblx0XHRcdGlmICggaGFyZEN1dG9mZiA9PT0gbnVsbCApIHtcblx0XHRcdFx0cmV0dXJuIGlnbm9yZS5pbmRleE9mKGQucHJvcGVydGllc1tmaWVsZF0pID09PSAtMSA/IGQucHJvcGVydGllc1tmaWVsZF0gOiBudWxsO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCBkLnByb3BlcnRpZXNbZmllbGRdIDw9IGhhcmRDdXRvZmYgKXtcblx0XHRcdFx0cmV0dXJuIGlnbm9yZS5pbmRleE9mKGQucHJvcGVydGllc1tmaWVsZF0pID09PSAtMSA/IGQucHJvcGVydGllc1tmaWVsZF0gOiBudWxsO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHZhciBzZCA9IGQzLmRldmlhdGlvbihnZW9qc29uLmZlYXR1cmVzLCBkID0+IHtcblx0XHRcdGlmICggaGFyZEN1dG9mZiA9PT0gbnVsbCApIHtcblx0XHRcdFx0cmV0dXJuIGlnbm9yZS5pbmRleE9mKGQucHJvcGVydGllc1tmaWVsZF0pID09PSAtMSA/IGQucHJvcGVydGllc1tmaWVsZF0gOiBudWxsO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCBkLnByb3BlcnRpZXNbZmllbGRdIDw9IGhhcmRDdXRvZmYgKXtcblx0XHRcdFx0cmV0dXJuIGlnbm9yZS5pbmRleE9mKGQucHJvcGVydGllc1tmaWVsZF0pID09PSAtMSA/IGQucHJvcGVydGllc1tmaWVsZF0gOiBudWxsO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHZhciBtaW4sXG5cdFx0XHRtYXgsXG5cdFx0XHRjdXRvZmZaID0gY3V0b2ZmID8gKCBjdXRvZmYgLSBtZWFuICkgLyBzZCA6IG51bGw7XG5cblx0XHRjb25zb2xlLmxvZygnY3V0b2ZmIGlzICcgKyBjdXRvZmZaKTtcblx0XHRnZW9qc29uLmZlYXR1cmVzLmZvckVhY2goZWFjaCA9PiB7XG5cdFx0XHRpZiAoIGhhcmRDdXRvZmYgJiYgZWFjaC5wcm9wZXJ0aWVzW2ZpZWxkXSA+IGhhcmRDdXRvZmYgfHwgaWdub3JlLmluZGV4T2YoZWFjaC5wcm9wZXJ0aWVzW2ZpZWxkXSkgIT09IC0xICl7XG5cdFx0XHRcdGVhY2gucHJvcGVydGllc1tmaWVsZCArICdaJ10gPSBudWxsO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZWFjaC5wcm9wZXJ0aWVzW2ZpZWxkICsgJ1onXSA9ICggZWFjaC5wcm9wZXJ0aWVzW2ZpZWxkXSAtIG1lYW4gKSAvIHNkO1xuXHRcdFx0XHRtaW4gPSBlYWNoLnByb3BlcnRpZXNbZmllbGQgKyAnWiddIDwgbWluIHx8IG1pbiA9PT0gdW5kZWZpbmVkID8gZWFjaC5wcm9wZXJ0aWVzW2ZpZWxkICsgJ1onXSA6IG1pbjtcblx0XHRcdFx0bWF4ID0gZWFjaC5wcm9wZXJ0aWVzW2ZpZWxkICsgJ1onXSA+IG1heCB8fCBtYXggPT09IHVuZGVmaW5lZCA/IGVhY2gucHJvcGVydGllc1tmaWVsZCArICdaJ10gOiBtYXg7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0Y29uc29sZS5sb2coJ2FjdHVhbE1pbjonICsgbWluLCAnYWN0dWFsTWF4OicgKyBtYXgpO1xuXHRcdC8vbWF4ID0gZDMubWluKFttYXgsY3V0b2ZmWiwzXSk7XG5cdFx0Ly9taW4gPSBkMy5tYXgoW21pbiwgLTNdKTtcblx0XHRtYXggPSAyLjMzO1xuXHRcdG1pbiA9IC0yLjMzO1xuXHRcdGNvbnNvbGUubG9nKCdkb25lJywgZ2VvanNvbiwgbWluLCBtYXgpO1xuXHRcdHJldHVybiB7XG5cdFx0XHRtaW4sXG5cdFx0XHRtYXgsXG5cdFx0XHRtZWFuLFxuXHRcdFx0c2Rcblx0XHR9O1xuXHR9XG5cblx0ZnVuY3Rpb24gYWRkVW5jbHVzdGVyZWQoKXtcblx0XHRyZXR1cm4gbWJIZWxwZXIuYWRkU291cmNlQW5kTGF5ZXJzLmNhbGwodGhlTWFwLFxuXHRcdFx0eyAvLyBzb3VyY2Vcblx0XHRcdFx0XCJuYW1lXCI6IFwicG9saWN5LXBvaW50c1wiLFxuXHRcdCAgICAgICAgLy9cInR5cGVcIjogXCJnZW9qc29uXCIsXG5cdFx0ICAgICAgICAvL1wiZGF0YVwiOiBnZW9qc29uXG5cdFx0ICAgICAgICBcInR5cGVcIjogXCJ2ZWN0b3JcIixcblx0XHQgICAgICAgIFwidXJsXCI6XCJtYXBib3g6Ly9vc3Rlcm1hbmouNjN3ZXoxNmhcIixcblx0XHRcdH0sIFsgLy8gbGF5ZXJzXG5cdFx0XHRcdHsgLy8gbGF5ZXIgb25lXG5cdCAgICAgICAgICAgIFwiaWRcIjogXCJwb2ludHNcIixcblx0ICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY2lyY2xlXCIsXG5cdCAgICAgICAgICAgIFwic291cmNlXCI6IFwicG9saWN5LXBvaW50c1wiLFxuXHQgICAgICAgICAgICBcInNvdXJjZS1sYXllclwiOlwicG9saWNpZXNcIixcblx0ICAgICAgICAgICAgXCJtYXh6b29tXCI6IHNpemVab29tVGhyZXNob2xkLFxuXHQgICAgICAgICAgICBcInBhaW50XCI6IHtcblx0ICAgICAgICAgICAgICBcdFwiY2lyY2xlLWNvbG9yXCI6IFtcblx0XHQgICAgICAgICAgICAgICAgJ21hdGNoJyxcblx0XHQgICAgICAgICAgICAgICAgWydnZXQnLCAndF9kZWQnXSxcblx0XHQgICAgICAgICAgICAgICAgNSwgJyMwZjQzOWMnLFxuXHRcdCAgICAgICAgICAgICAgICAvKiBvdGhlciAqLyAnIzk5MDAwMCdcblx0XHQgICAgICAgICAgICBdLFxuXHRcdCAgICAgICAgICAgIFwiY2lyY2xlLXJhZGl1c1wiOiB7XG5cdFx0ICAgICAgICAgICAgICAgICdzdG9wcyc6IFtbNSwgM10sIFs4LCAxOF1dXG5cdFx0ICAgICAgICAgICAgfSxcblx0XHQgICAgICAgICAgICBcImNpcmNsZS1vcGFjaXR5XCI6IDAuMVxuXHRcdCAgICAgICAgICAgIH1cblx0XHQgICAgICAgIH0sXG5cdFx0ICAgICAgICB7IC8vIGxheWVyIHR3b1xuXHQgICAgICAgICAgICBcImlkXCI6IFwicG9pbnRzLWRhdGEtZHJpdmVuXCIsXG5cdCAgICAgICAgICAgIFwidHlwZVwiOiBcImNpcmNsZVwiLFxuXHQgICAgICAgICAgICBcInNvdXJjZVwiOiBcInBvbGljeS1wb2ludHNcIixcblx0ICAgICAgICAgICAgXCJzb3VyY2UtbGF5ZXJcIjogXCJwb2xpY2llc1wiLFxuXHQgICAgICAgICAgICBcIm1pbnpvb21cIjogc2l6ZVpvb21UaHJlc2hvbGQsXG5cdCAgICAgICAgICAgIFwicGFpbnRcIjoge1xuXHQgICAgICAgICAgICAgIFx0XCJjaXJjbGUtY29sb3JcIjogW1xuXHRcdCAgICAgICAgICAgICAgICAnbWF0Y2gnLFxuXHRcdCAgICAgICAgICAgICAgICBbJ2dldCcsICd0X2RlZCddLFxuXHRcdCAgICAgICAgICAgICAgICA1LCAnIzBmNDM5YycsXG5cdFx0ICAgICAgICAgICAgICAgIC8qIG90aGVyICovICcjOTkwMDAwJ1xuXHRcdCAgICAgICAgICAgIF0sXG5cdFx0ICAgICAgICAgICAgXCJjaXJjbGUtcmFkaXVzXCI6IHtcblx0XHQgICAgICAgICAgICBcdHByb3BlcnR5OiAncHJlbScsXG5cdFx0ICAgICAgICAgICAgICAgIHR5cGU6ICdleHBvbmVudGlhbCcsXG5cdFx0XHRcdCAgICAgICAgc3RvcHM6IFtcblx0XHRcdFx0ICAgICAgICAgIFs2MiwgNV0sXG5cdFx0XHRcdCAgICAgICAgICBbMjUwMCwgNjBdXG5cdFx0XHRcdCAgICAgICAgXVxuXHRcdCAgICAgICAgICAgIH0sXG5cdFx0ICAgICAgICAgICAgXCJjaXJjbGUtb3BhY2l0eVwiOiAwLjEsXG5cdFx0ICAgICAgICAgICAgXCJjaXJjbGUtc3Ryb2tlLWNvbG9yXCI6IFwiI2ZmZmZmZlwiLFxuXHRcdCAgICAgICAgICAgIFwiY2lyY2xlLXN0cm9rZS13aWR0aFwiOiAxXG5cdFx0ICAgICAgICB9XG5cdFx0XHR9XVxuXHRcdCk7IFxuXHR9XG5cdC8qZnVuY3Rpb24gY2hlY2tGZWF0dXJlc0xvYWRlZCgpe1xuXHRcdGlmICggdGhlTWFwLmxvYWRlZCgpKXtcblx0XHRcdFxuXHRcdFx0dGhlTWFwLm9mZigncmVuZGVyJywgY2hlY2tGZWF0dXJlcyk7XG5cdFx0fVxuXHR9Ki9cblx0ZnVuY3Rpb24gYWRkQ2x1c3RlcmVkKCl7XG5cdFx0XG5cdFx0bWJIZWxwZXIuYWRkU291cmNlQW5kTGF5ZXJzLmNhbGwodGhlTWFwLFxuXHRcdCAgICB7IC8vIHNvdXJjZVxuXHRcdCAgICBcdFwibmFtZVwiOiBcInBvbGljaWVzXCIsXG5cdFx0ICAgICAgICBcInR5cGVcIjogXCJnZW9qc29uXCIsXG5cdFx0ICAgICAgICBcImRhdGFcIjogZ2VvanNvbixcblx0XHQgICAgICAgIFwiY2x1c3RlclwiOiB0cnVlLFxuXHRcdCAgICAgICAgXCJjbHVzdGVyUmFkaXVzXCI6IDAuNSAvLyBSYWRpdXMgb2YgZWFjaCBjbHVzdGVyIHdoZW4gY2x1c3RlcmluZyBwb2ludHMgKGRlZmF1bHRzIHRvIDUwKVxuXHRcdCAgICB9LCBbIC8vIGxheWVyc1xuXHRcdCAgICAgICB7IC8vIGxheWVyIG9uZVxuXHRcdCAgICAgICAgICAgIGlkOiBcImNsdXN0ZXItY291bnRcIixcblx0XHRcdCAgICAgICAgdHlwZTogXCJzeW1ib2xcIixcblx0XHRcdCAgICAgICAgc291cmNlOiBcInBvbGljaWVzXCIsXG5cdFx0XHQgICAgICAgIGZpbHRlcjogW1wiaGFzXCIsIFwicG9pbnRfY291bnRcIl0sXG5cdFx0XHQgICAgICAgIFwibWluem9vbVwiOiA2LFxuXHRcdFx0ICAgICAgICBsYXlvdXQ6IHtcblx0XHRcdCAgICAgICAgICAgIFwidGV4dC1maWVsZFwiOiBcIntwb2ludF9jb3VudF9hYmJyZXZpYXRlZH1cIixcblx0XHRcdCAgICAgICAgICAgIFwidGV4dC1zaXplXCI6IDEyLFxuXG5cdFx0XHQgICAgICAgIH0sXG5cdFx0XHQgICAgICAgIFwicGFpbnRcIjoge1xuXHRcdFx0ICAgICAgICBcdFwidGV4dC1jb2xvclwiOiBcIiNmZmZmZmZcIlxuXHRcdFx0ICAgICAgICB9XG5cdFx0ICAgICAgICB9XG5cdCAgICAgICAgXSAvLyBlbmQgbGF5ZXJzIGFycmF5XG5cdCAgICApOyAvLyBlbmQgYWRkbGF5ZXJzXG5cdH0gLy8gZW5kIGFkZENsdXN0ZXJlZFxuXHRmdW5jdGlvbiB0b0dlb0pTT04odXJsKXtcblx0XHRcblx0XHRkMy5jc3YodXJsLCBmdW5jdGlvbihlcnIsIGRhdGEpe1xuXHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHR0aHJvdyBlcnI7XG5cdFx0XHR9XG5cdFx0XHQvL2NvbnNvbGUubG9nKGRhdGEpO1xuXHRcdFx0dmFyIGZlYXR1cmVzID0gW107IFxuXHRcdFx0ZGF0YS5mb3JFYWNoKGVhY2ggPT4ge1xuXG5cdFx0XHRcdHZhciB2YWx1ZSA9ICtlYWNoLm1lZF9pbmNvbWUgPyArZWFjaC5tZWRfaW5jb21lIDogbnVsbDtcblx0XHRcdFx0aWYgKCAhbWVkaWFuSW5jb21lcy5oYXMoK2VhY2guY2VuX3RyYWN0KSApe1xuXHRcdFx0XHRcdG1lZGlhbkluY29tZXMuc2V0KCtlYWNoLmNlbl90cmFjdCwgdmFsdWUpOyAvLyBubyBkdXBsaWNhdGUgdHJhY3RzXG5cdFx0XHRcdH1cblx0XHRcdFx0dmFyIGNvZXJjZWQgPSB7fTtcblx0XHRcdFx0Zm9yICggdmFyIGtleSBpbiBlYWNoICkge1xuXHRcdFx0XHRcdGlmICggZWFjaC5oYXNPd25Qcm9wZXJ0eShrZXkpICl7XG5cdFx0XHRcdFx0XHRjb2VyY2VkW2tleV0gPSAhaXNOYU4oK2VhY2hba2V5XSkgPyArZWFjaFtrZXldIDogZWFjaFtrZXldO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSAgXG5cdFx0XHRcdGZlYXR1cmVQcm9wZXJ0aWVzQnlJZC5zZXQoY29lcmNlZC5pZCxjb2VyY2VkKTtcblx0XHRcdFx0ZmVhdHVyZXMucHVzaCh7XG5cdFx0XHRcdFx0XCJ0eXBlXCI6IFwiRmVhdHVyZVwiLFxuXHRcdFx0XHRcdFwicHJvcGVydGllc1wiOiBjb2VyY2VkLFxuXHRcdFx0XHRcdFwiZ2VvbWV0cnlcIjoge1xuXHRcdFx0XHRcdFx0XCJ0eXBlXCI6IFwiUG9pbnRcIixcblx0XHRcdFx0XHRcdFwiY29vcmRpbmF0ZXNcIjogWytlYWNoLmxvbmdpdHVkZSwgK2VhY2gubGF0aXR1ZGVdXG5cdFx0XHRcdFx0fSAgIFxuXHRcdFx0XHR9KTtcblx0XHRcdH0pOyAvLyBlbmQgZm9yRWFjaFxuXHRcdFx0Y29uc29sZS5sb2cobWVkaWFuSW5jb21lcyk7XG5cdFx0XHRjb25zb2xlLmxvZyhmZWF0dXJlUHJvcGVydGllc0J5SWQpO1xuXHRcdFx0Z2VvanNvbiA9ICB7XG5cdFx0XHRcdFwidHlwZVwiOiBcIkZlYXR1cmVDb2xsZWN0aW9uXCIsXG5cdFx0XHRcdFwiZmVhdHVyZXNcIjogZmVhdHVyZXNcblx0XHRcdH07XG5cdFx0XHR0aGVDaGFydHMucHVzaCggLy8gc2hvdWxkIGJlIGFibGUgdG8gY3JlYXRlIGNoYXJ0cyBub3csIHdoZXRoZXIgb3Igbm90IG1hcCBoYXMgbG9hZGVkLiBtYXAgbmVlZHMgdG8gaGF2ZVxuXHRcdFx0XHRcdFx0XHQvLyBsb2FkZWQgZm9yIHRoZW0gdG8gdXBkYXRlLCB0aG91Z2guXG5cdFx0XHRcdG5ldyBCYXJzLkJhcih7IFxuXHRcdFx0XHRcdHRpdGxlOiAnUHJvcGVydGllcyBpbiB2aWV3JywgXG5cdFx0XHRcdFx0bWFyZ2luOiB7XG5cdFx0XHRcdFx0XHR0b3A6MCxcblx0XHRcdFx0XHRcdHJpZ2h0OjEsXG5cdFx0XHRcdFx0XHRib3R0b206MCxcblx0XHRcdFx0XHRcdGxlZnQ6MSBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGhlaWdodFRvV2lkdGg6IDAuMDUsXG5cdFx0XHRcdFx0Y29udGFpbmVyOiAnI2luLXZpZXctYmFyJyxcblx0XHRcdFx0XHRkYXRhOiBnZW9qc29uLmZlYXR1cmVzLFxuXHRcdFx0XHRcdG51bWVyYXRvcihpblZpZXdJRHMpe1xuXHRcdFx0XHRcdFx0cmV0dXJuIGluVmlld0lEcy5zaXplO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0ZGVub21pbmF0b3IoKXtcblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLmRhdGEubGVuZ3RoO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0dGV4dEZ1bmN0aW9uKG4sZCl7XG5cdFx0XHRcdFx0XHRyZXR1cm4gYCR7ZDMuZm9ybWF0KFwiLFwiKShuKX0gb2YgJHtkMy5mb3JtYXQoXCIsXCIpKGQpfSAoJHtkMy5mb3JtYXQoXCIuMCVcIikobiAvIGQpfSlgO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSksXG5cdFx0XHRcdG5ldyBCYXJzLkJhcih7XG5cdFx0XHRcdFx0dGl0bGU6ICcuLi4gd2l0aCBsb3cgZGVkdWN0aWJsZScsIFxuXHRcdFx0XHRcdG1hcmdpbjoge1xuXHRcdFx0XHRcdFx0dG9wOjAsXG5cdFx0XHRcdFx0XHRyaWdodDoxLFxuXHRcdFx0XHRcdFx0Ym90dG9tOjAsXG5cdFx0XHRcdFx0XHRsZWZ0OjEgXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRoZWlnaHRUb1dpZHRoOiAwLjA1LFxuXHRcdFx0XHRcdGluZm9NYXJrOnRydWUsXG5cdFx0XHRcdFx0Y29udGFpbmVyOiAnI2RlZHVjdGlibGUtYmFyJyxcblx0XHRcdFx0XHRkYXRhOiBnZW9qc29uLmZlYXR1cmVzLFxuXHRcdFx0XHRcdG51bWVyYXRvcihpblZpZXdJRHMpe1xuXHRcdFx0XHRcdFx0aWYgKCBpblZpZXdJRHMuc2l6ZSA9PT0gMCApe1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5taW47XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR2YXIgZmlsdGVyZWREYXRhID0gdGhpcy5kYXRhLmZpbHRlcihlYWNoID0+IGluVmlld0lEcy5oYXMoZWFjaC5wcm9wZXJ0aWVzLmlkKSksXG5cdFx0XHRcdFx0XHRcdG51bWJlck1hdGNoaW5nID0gMDtcblx0XHRcdFx0XHRcdGZpbHRlcmVkRGF0YS5mb3JFYWNoKGVhY2ggPT4ge1xuXHRcdFx0XHRcdFx0XHRpZiAoIGVhY2gucHJvcGVydGllcy50X2RlZCA8IDUgKXtcblx0XHRcdFx0XHRcdFx0XHRudW1iZXJNYXRjaGluZysrO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdHJldHVybiBudW1iZXJNYXRjaGluZztcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGRlbm9taW5hdG9yKGluVmlld0lEcyl7IC8vIGZvciB0aGlzIG9uZSBkZW5vbWluYXRvciBpcyBudW1iZXIgb2YgcG9saWNpZXMgaW4gdmlld1xuXHRcdFx0XHRcdFx0IHJldHVybiBpblZpZXdJRHMuc2l6ZTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHRleHRGdW5jdGlvbihuLGQpe1xuXHRcdFx0XHRcdFx0aWYgKGluVmlld0lEcy5zaXplID09PSAwKXtcblx0XHRcdFx0XHRcdFx0cmV0dXJuICdub25lIGluIHZpZXcnO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuIGAke2QzLmZvcm1hdChcIixcIikobil9IG9mICR7ZDMuZm9ybWF0KFwiLFwiKShkKX0gKCR7ZDMuZm9ybWF0KFwiLjAlXCIpKG4gLyBkKX0pYDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pLFxuXHRcdFx0XHRuZXcgQmFycy5CYXIoe1xuXHRcdFx0XHRcdHRpdGxlOiAnQXZlcmFnZSBwcmVtaXVtJywgXG5cdFx0XHRcdFx0bWFyZ2luOiB7XG5cdFx0XHRcdFx0XHR0b3A6MCxcblx0XHRcdFx0XHRcdHJpZ2h0OjEsXG5cdFx0XHRcdFx0XHRib3R0b206MCxcblx0XHRcdFx0XHRcdGxlZnQ6MSBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHpTY29yZXM6IGNhbGN1bGF0ZVpTY29yZXMoJ3ByZW0nLDIwMDApLFxuXHRcdFx0XHRcdG1pbigpe1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2codGhpcyk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy56U2NvcmVzLm1pbjtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGhlaWdodFRvV2lkdGg6IDAuMDUsXG5cdFx0XHRcdFx0Y29udGFpbmVyOiAnI3ByZW1pdW0tYmFyJyxcblx0XHRcdFx0XHRkYXRhOiBnZW9qc29uLmZlYXR1cmVzLFxuXHRcdFx0XHRcdG51bWVyYXRvcihpblZpZXdJRHMpe1xuXHRcdFx0XHRcdFx0aWYgKCBpblZpZXdJRHMuc2l6ZSA9PT0gMCApe1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5taW47XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR2YXIgZmlsdGVyZWREYXRhID0gdGhpcy5kYXRhLmZpbHRlcihlYWNoID0+IGluVmlld0lEcy5oYXMoZWFjaC5wcm9wZXJ0aWVzLmlkKSk7XG5cdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0cmV0dXJuIGQzLm1lYW4oZmlsdGVyZWREYXRhLCBkID0+IGQucHJvcGVydGllcy5wcmVtWik7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRkZW5vbWluYXRvcigpeyBcblx0XHRcdFx0XHRcdCByZXR1cm4gdGhpcy56U2NvcmVzLm1heDtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHRleHRGdW5jdGlvbihuKXsgXG5cdFx0XHRcdFx0XHRpZiAoaW5WaWV3SURzLnNpemUgPT09IDApe1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gJ25vbmUgaW4gdmlldyc7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZXR1cm4gJyQnICsgZDMuZm9ybWF0KFwiLC4yZlwiKSh0aGlzLnpTY29yZXMubWVhbiArIHRoaXMuelNjb3Jlcy5zZCAqIG4gKSArICcgKHogPSAnICsgZDMuZm9ybWF0KFwiLjJmXCIpKG4pICsgJyknO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSksXG5cdFx0XHRcdFxuXHRcdFx0XHRuZXcgQmFycy5CYXIoe1xuXHRcdFx0XHRcdHRpdGxlOiAnQXZlcmFnZSBob21lIHJlcGxhY2VtZW50IHZhbHVlJywgXG5cdFx0XHRcdFx0bWFyZ2luOiB7XG5cdFx0XHRcdFx0XHR0b3A6MCxcblx0XHRcdFx0XHRcdHJpZ2h0OjEsXG5cdFx0XHRcdFx0XHRib3R0b206MCxcblx0XHRcdFx0XHRcdGxlZnQ6MSBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHpTY29yZXM6IGNhbGN1bGF0ZVpTY29yZXMoJ3ZhbHVlJyw1NTAsMjAwMDAsWzI1MF0pLFxuXHRcdFx0XHRcdG1pbigpe1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy56U2NvcmVzLm1pbjtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGluZm9NYXJrOnRydWUsXG5cdFx0XHRcdFx0aGVpZ2h0VG9XaWR0aDogMC4wNSxcblx0XHRcdFx0XHRjb250YWluZXI6ICcjdmFsdWUtYmFyJyxcblx0XHRcdFx0XHRkYXRhOiBnZW9qc29uLmZlYXR1cmVzLFxuXHRcdFx0XHRcdG51bWVyYXRvcihpblZpZXdJRHMpe1xuXHRcdFx0XHRcdFx0aWYgKCBpblZpZXdJRHMuc2l6ZSA9PT0gMCApe1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5taW47XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR2YXIgZmlsdGVyZWREYXRhID0gdGhpcy5kYXRhLmZpbHRlcihlYWNoID0+IGluVmlld0lEcy5oYXMoZWFjaC5wcm9wZXJ0aWVzLmlkKSk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZDMubWVhbihmaWx0ZXJlZERhdGEsIGQgPT4gZC5wcm9wZXJ0aWVzLnZhbHVlWik7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRkZW5vbWluYXRvcigpeyBcblx0XHRcdFx0XHRcdCByZXR1cm4gdGhpcy56U2NvcmVzLm1heDtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHRleHRGdW5jdGlvbihuKXsgXG5cdFx0XHRcdFx0XHRpZiAoaW5WaWV3SURzLnNpemUgPT09IDApe1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gJ25vbmUgaW4gdmlldyc7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZXR1cm4gJyQnICsgZDMuZm9ybWF0KFwiLC4wZlwiKSgodGhpcy56U2NvcmVzLm1lYW4gKyB0aGlzLnpTY29yZXMuc2QgKiBuICkgKiAxMDAwICkgKyAnICh6ID0gJyArIGQzLmZvcm1hdChcIi4yZlwiKShuKSArICcpJztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pLFxuXHRcdFx0XHRuZXcgQmFycy5CYXIoe1xuXHRcdFx0XHRcdHRpdGxlOiAnQXZlcmFnZSBmbG9vZCBpbnN1cmFuY2UgY292ZXJhZ2UnLCBcblx0XHRcdFx0XHRtYXJnaW46IHtcblx0XHRcdFx0XHRcdHRvcDowLFxuXHRcdFx0XHRcdFx0cmlnaHQ6MSxcblx0XHRcdFx0XHRcdGJvdHRvbTowLFxuXHRcdFx0XHRcdFx0bGVmdDoxIFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aW5mb01hcms6dHJ1ZSxcblx0XHRcdFx0XHR6U2NvcmVzOiBjYWxjdWxhdGVaU2NvcmVzKCd0Y292JyxudWxsLG51bGwsW10pLFxuXHRcdFx0XHRcdC8qbWluKCl7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZDMubWluKHRoaXMuZGF0YSwgZCA9PiBkLnByb3BlcnRpZXMudGNvdik7XG5cdFx0XHRcdFx0fSwqL1xuXHRcdFx0XHRcdG1pbigpe1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy56U2NvcmVzLm1pbjtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGhlaWdodFRvV2lkdGg6IDAuMDUsXG5cdFx0XHRcdFx0Y29udGFpbmVyOiAnI2NvdmVyYWdlLWJhcicsXG5cdFx0XHRcdFx0ZGF0YTogZ2VvanNvbi5mZWF0dXJlcyxcblx0XHRcdFx0XHRudW1lcmF0b3IoaW5WaWV3SURzKXtcblx0XHRcdFx0XHRcdGlmICggaW5WaWV3SURzLnNpemUgPT09IDAgKXtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMubWluO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0dGhpcy5maWx0ZXJlZERhdGEgPSB0aGlzLmRhdGEuZmlsdGVyKGVhY2ggPT4gaW5WaWV3SURzLmhhcyhlYWNoLnByb3BlcnRpZXMuaWQpKTtcblx0XHRcdFx0XHRcdHJldHVybiBkMy5tZWFuKHRoaXMuZmlsdGVyZWREYXRhLCBkID0+IGQucHJvcGVydGllcy50Y292Wik7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRkZW5vbWluYXRvcigpeyBcblx0XHRcdFx0XHRcdCByZXR1cm4gdGhpcy56U2NvcmVzLm1heDtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHRleHRGdW5jdGlvbihuKXsgXG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdGlmIChpblZpZXdJRHMuc2l6ZSA9PT0gMCl7XG5cdFx0XHRcdFx0XHRcdHJldHVybiAnbm9uZSBpbiB2aWV3Jztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybiAnJCcgKyBkMy5mb3JtYXQoXCIsLjBmXCIpKCh0aGlzLnpTY29yZXMubWVhbiArIHRoaXMuelNjb3Jlcy5zZCAqIG4gKSAqIDEwMDAgKSArICcgKHogPSAnICsgZDMuZm9ybWF0KFwiLjJmXCIpKG4pICsgJyknO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSksXG5cdFx0XHRcdG5ldyBCYXJzLkJhcih7XG5cdFx0XHRcdFx0dGl0bGU6ICdBdmVyYWdlIG1lZGlhbiBob3VzZWhvbGQgaW5jb21lJywgXG5cdFx0XHRcdFx0bWFyZ2luOiB7XG5cdFx0XHRcdFx0XHR0b3A6MCxcblx0XHRcdFx0XHRcdHJpZ2h0OjEsXG5cdFx0XHRcdFx0XHRib3R0b206MCxcblx0XHRcdFx0XHRcdGxlZnQ6MSBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGluZm9NYXJrOnRydWUsXG5cdFx0XHRcdFx0elNjb3JlczogKGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyhtZWRpYW5JbmNvbWVzKTtcblx0XHRcdFx0XHRcdHZhciBtZWFuID0gZDMubWVhbihbLi4ubWVkaWFuSW5jb21lcy52YWx1ZXMoKV0pO1xuXHRcdFx0XHRcdFx0dmFyIHNkID0gZDMuZGV2aWF0aW9uKFsuLi5tZWRpYW5JbmNvbWVzLnZhbHVlcygpXSk7XG5cdFx0XHRcdFx0XHR2YXIgbWluLFxuXHRcdFx0XHRcdFx0XHRtYXgsXG5cdFx0XHRcdFx0XHRcdGN1dG9mZlogPSAoIDE1MDAwMCAtIG1lYW4gKSAvIHNkO1xuXHRcdFx0XHRcdFx0Z2VvanNvbi5mZWF0dXJlcy5mb3JFYWNoKGVhY2ggPT4ge1xuXHRcdFx0XHRcdFx0XHQvLyBzb21lIG1lZF9pbmNvbWVzIGFyZSByZWNvcmRlZCBhcyB6ZXJvOyB0aGV5IHNob3VsZCBiZSBpZ25vcmVkXG5cdFx0XHRcdFx0XHRcdGlmICggZWFjaC5wcm9wZXJ0aWVzLm1lZF9pbmNvbWUgPiAwICl7XG5cdFx0XHRcdFx0XHRcdFx0ZWFjaC5wcm9wZXJ0aWVzLm1lZF9pbmNvbWVaID0gKCBlYWNoLnByb3BlcnRpZXMubWVkX2luY29tZSAtIG1lYW4gKSAvIHNkO1xuXHRcdFx0XHRcdFx0XHRcdG1pbiA9IGVhY2gucHJvcGVydGllcy5tZWRfaW5jb21lWiA8IG1pbiB8fCBtaW4gPT09IHVuZGVmaW5lZCA/IGVhY2gucHJvcGVydGllcy5tZWRfaW5jb21lWiA6IG1pbjtcblx0XHRcdFx0XHRcdFx0XHRtYXggPSBlYWNoLnByb3BlcnRpZXMubWVkX2luY29tZVogPiBtYXggfHwgbWF4ID09PSB1bmRlZmluZWQgPyBlYWNoLnByb3BlcnRpZXMubWVkX2luY29tZVogOiBtYXg7XG5cdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0ZWFjaC5wcm9wZXJ0aWVzLm1lZF9pbmNvbWVaID0gbnVsbDtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRtYXggPSBtYXggPCBjdXRvZmZaID8gbWF4IDogY3V0b2ZmWjtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKHtcblx0XHRcdFx0XHRcdFx0bWluLFxuXHRcdFx0XHRcdFx0XHRtYXgsXG5cdFx0XHRcdFx0XHRcdG1lYW4sXG5cdFx0XHRcdFx0XHRcdHNkXG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdHJldHVybiB7XG5cdFx0XHRcdFx0XHRcdG1pbjogLTIuMzMsXG5cdFx0XHRcdFx0XHRcdG1heDogMi4zMyxcblx0XHRcdFx0XHRcdFx0bWVhbixcblx0XHRcdFx0XHRcdFx0c2Rcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0fSkoKSxcblx0XHRcdFx0XHRtaW4oKXtcblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLnpTY29yZXMubWluO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aGVpZ2h0VG9XaWR0aDogMC4wNSxcblx0XHRcdFx0XHRjb250YWluZXI6ICcjaW5jb21lLWJhcicsXG5cdFx0XHRcdFx0ZGF0YTogZ2VvanNvbi5mZWF0dXJlcyxcblx0XHRcdFx0XHRudW1lcmF0b3IoaW5WaWV3SURzKXtcblx0XHRcdFx0XHRcdGlmICggaW5WaWV3SURzLnNpemUgPT09IDAgKXtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMubWluO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0dmFyIHJlcHJlc2VudGVkVHJhY3RzID0gbmV3IFNldCgpO1xuXHRcdFx0XHRcdFx0dmFyIG1lZEluY29tZVpBcnJheSA9IFtdO1xuXHRcdFx0XHRcdFx0aW5WaWV3SURzLmZvckVhY2goaWQgPT4ge1xuXHRcdFx0XHRcdFx0XHR2YXIgbWF0Y2hpbmdGZWF0dXJlID0gZmVhdHVyZVByb3BlcnRpZXNCeUlkLmdldChpZCk7XG5cdFx0XHRcdFx0XHRcdGlmICggIXJlcHJlc2VudGVkVHJhY3RzLmhhcyhtYXRjaGluZ0ZlYXR1cmUuY2VuX3RyYWN0KSApe1xuXHRcdFx0XHRcdFx0XHRcdHJlcHJlc2VudGVkVHJhY3RzLmFkZChtYXRjaGluZ0ZlYXR1cmUuY2VuX3RyYWN0KTtcblx0XHRcdFx0XHRcdFx0XHRtZWRJbmNvbWVaQXJyYXkucHVzaChtYXRjaGluZ0ZlYXR1cmUubWVkX2luY29tZVopOyAvLyBwdXNoZXMgaW5jb21lIGZyb20gb25seSBvbmUgcmVwcmVzZW50YXRpdmVcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQgIC8vXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ21lZEluY29tZVpBcnJheScsbWVkSW5jb21lWkFycmF5KTtcblx0XHRcdFx0XHRcdHJldHVybiBkMy5tZWFuKG1lZEluY29tZVpBcnJheSk7XG5cblx0XHRcdFx0XHRcdC8vdGhpcy5tZWRpYW5JbmNvbWVzSW5WaWV3ID0gY2FsY3VsYXRlTWVkaWFuSW5jb21lcyhpblZpZXdJRHMpO1xuXHRcdFx0XHRcdFx0Ly9yZXR1cm4gZDMubWVhbih0aGlzLm1lZGlhbkluY29tZXNJblZpZXcpO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0ZGVub21pbmF0b3IoKXsgXG5cdFx0XHRcdFx0XHQgcmV0dXJuIHRoaXMuelNjb3Jlcy5tYXg7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR0ZXh0RnVuY3Rpb24obil7IFxuXHRcdFx0XHRcdFx0aWYgKGluVmlld0lEcy5zaXplID09PSAwKXtcblx0XHRcdFx0XHRcdFx0cmV0dXJuICdub25lIGluIHZpZXcnO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuICckJyArIGQzLmZvcm1hdChcIiwuMGZcIikodGhpcy56U2NvcmVzLm1lYW4gKyB0aGlzLnpTY29yZXMuc2QgKiBuICkgKyAnICh6ID0gJyArIGQzLmZvcm1hdChcIi4yZlwiKShuKSArICcpJztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pLFxuXHRcdFx0XHRuZXcgQmFycy5CYXIoe1xuXHRcdFx0XHRcdHRpdGxlOiAnQXZlcmFnZSBtYXJnaW5hbCBjb3N0IGZvciBsb3dlciBkZWR1Y3RpYmxlJywgXG5cdFx0XHRcdFx0bWFyZ2luOiB7XG5cdFx0XHRcdFx0XHR0b3A6MCxcblx0XHRcdFx0XHRcdHJpZ2h0OjEsXG5cdFx0XHRcdFx0XHRib3R0b206MCxcblx0XHRcdFx0XHRcdGxlZnQ6MSBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHpTY29yZXM6IGNhbGN1bGF0ZVpTY29yZXMoJ2RkcCcsbnVsbCxudWxsLFtdKSxcblx0XHRcdFx0XHQvKm1pbigpe1xuXHRcdFx0XHRcdFx0cmV0dXJuIGQzLm1pbih0aGlzLmRhdGEsIGQgPT4gZC5wcm9wZXJ0aWVzLnRjb3YpO1xuXHRcdFx0XHRcdH0sKi9cblx0XHRcdFx0XHRtaW4oKXtcblx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuelNjb3Jlcy5taW47XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRoZWlnaHRUb1dpZHRoOiAwLjA1LFxuXHRcdFx0XHRcdGNvbnRhaW5lcjogJyNtYXJnaW5hbC1iYXInLFxuXHRcdFx0XHRcdGRhdGE6IGdlb2pzb24uZmVhdHVyZXMsXG5cdFx0XHRcdFx0bnVtZXJhdG9yKGluVmlld0lEcyl7XG5cdFx0XHRcdFx0XHRpZiAoIGluVmlld0lEcy5zaXplID09PSAwICl7XG5cdFx0XHRcdFx0XHRcdHJldHVybiB0aGlzLm1pbjtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHRoaXMuZmlsdGVyZWREYXRhID0gdGhpcy5kYXRhLmZpbHRlcihlYWNoID0+IGluVmlld0lEcy5oYXMoZWFjaC5wcm9wZXJ0aWVzLmlkKSk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZDMubWVhbih0aGlzLmZpbHRlcmVkRGF0YSwgZCA9PiBkLnByb3BlcnRpZXMuZGRwWik7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRkZW5vbWluYXRvcigpeyBcblx0XHRcdFx0XHRcdCByZXR1cm4gdGhpcy56U2NvcmVzLm1heDtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHRleHRGdW5jdGlvbihuKXsgXG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdGlmIChpblZpZXdJRHMuc2l6ZSA9PT0gMCl7XG5cdFx0XHRcdFx0XHRcdHJldHVybiAnbm9uZSBpbiB2aWV3Jztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybiAnJCcgKyBkMy5mb3JtYXQoXCIsLjBmXCIpKCh0aGlzLnpTY29yZXMubWVhbiArIHRoaXMuelNjb3Jlcy5zZCAqIG4gKSApICsgJyAoeiA9ICcgKyBkMy5mb3JtYXQoXCIuMmZcIikobikgKyAnKSc7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KVxuXG5cdFx0XHQpOyAvLyBlbmQgcHVzaFxuXHRcdFx0Z2F0ZUNoZWNrKys7XG5cdFx0XHR2YXIgaW5mb3JtYXRpb24gPSB7XG5cdFx0XHRcdG1hcGZlYXR1cmU6ICdUaGlzIG1hcCByZXByZXNlbnRzIG5ldyBmbG9vZCBpbnN1cmFuY2UgcG9saWNpZXMgaW5pdGlhdGVkIGJldHdlZW4gSnVuZSBhbmQgRGVjZW1iZXIgMjAxNC4gVGhlIGFuYWx5c2lzIGluIHRoZSByZWxhdGVkIHBhcGVyIHJldm9sdmVzIGFyb3VuZCB0aGUgZGVjaXNpb24gd2hldGhlciB0byBwYXkgbW9yZSBmb3IgYSBsb3dlciBkZWR1Y3RpYmxlLicsXG5cdFx0XHRcdGRlZHVjdGlibGViYXI6ICdUaGUgc3RhbmRhcmQgZGVkdWN0aWJsZSBpcyAkNSwwMDA7IGFueXRoaW5nIGxlc3MgaXMgY29uc2lkZXIgYSBsb3cgZGVkdWN0aWJsZS4nLFxuXHRcdFx0XHR2YWx1ZWJhcjogJ1RoaXMgY2FsY3VsYXRpb24gaWdub3JlcyBleHRyZW1lIG91dGxpZXJzICh2YWx1ZXMgYWJvdmUgJDIwTSkgd2hpY2ggYXJlIGxpa2VseSBkdWUgdG8gZGF0YSBlcnJvcnM7IGl0IGFsc28gaWdub3JlcyBvdmVycmVwcmVzZW50ZWQgdmFsdWVzIG9mICQyNTAsMDAwLCB0aGUgbWFqb3JpdHkgb2Ygd2hpY2ggYXJlIGxpa2VseSBkdWUgdG8gcmVwb3J0aW5nIGVycm9ycy4nLFxuXHRcdFx0XHRpbmNvbWViYXI6ICdNZWRpYW4gaG91c2Vob2xkIGluY29tZSBpcyBhIHByb3BlcnR5IG9mIHRoZSBjZW5zdXMgdHJhY3QgaW4gd2hpY2ggdGhlIHBvbGljeWhvbGRlciByZXNpZGVzLiBFYWNoIGNlbnN1cyB0cmFjdCB3aXRoIGFuIGFzc29jaWF0ZWQgcG9saWN5IGluIHZpZXcgaXMgY291bnRlZCBvbmNlLicsXG5cdFx0XHRcdGNvdmVyYWdlYmFyOiAnRmxvb2QgY292ZXJhZ2UgaXMgbGltaXRlZCB0byAkMjUwLDAwMC4nXG5cdFx0XHR9O1xuXHRcdFx0dmFyIGluZm9NYXJrcyA9IGQzLnNlbGVjdEFsbCgnLmhhcy1pbmZvLW1hcmsnKVxuXHRcdFx0XHQuYXBwZW5kKCdzdmcnKVxuXHRcdFx0XHQuZGF0dW0oaW5mb3JtYXRpb24pXG5cdFx0XHRcdC5hdHRyKCd3aWR0aCcsJzEycHgnKVxuXHRcdFx0XHQuYXR0cigndmlld0JveCcsICcwIDAgMTIgMTInKVxuXHRcdFx0XHQuYXR0cignY2xhc3MnLCdpbmZvLW1hcmsnKVxuXHRcdFx0XHQuYXBwZW5kKCdnJyk7XG5cblx0XHRcdGluZm9NYXJrc1xuXHRcdFx0XHQuY2FsbCh0aXApIFxuXHRcdFx0XHQub24oJ21vdXNlZW50ZXInLCBmdW5jdGlvbihkKXtcblx0XHRcdFx0XHRcblx0XHRcdFx0XHR0aXAuc2hvdy5jYWxsKHRoaXMsZCk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5vbignY2xpY2snLCBmdW5jdGlvbihkKXtcblx0XHRcdFx0XHRkMy5ldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHRcdFx0XHR0aXAuc2hvdy5jYWxsKHRoaXMsZCk7XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5vbignbW91c2VsZWF2ZScsIHRpcC5oaWRlKTtcblxuXHRcdFx0ZDMuc2VsZWN0KCcjbWFwLWZlYXR1cmUnKVxuXHRcdFx0XHQub24oJ2NsaWNrJywgKCkgPT4ge1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCdjbGljaycpO1xuXHRcdFx0XHRcdGQzLnNlbGVjdEFsbCgnLmQzLXRpcCcpXG5cdFx0XHRcdFx0XHQuc3R5bGUoJ29wYWNpdHknLDApO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0XG5cblx0XHRcdGluZm9NYXJrc1xuXHRcdFx0XHQuYXBwZW5kKCdjaXJjbGUnKVxuXHRcdFx0XHQuYXR0cignY2xhc3MnLCAnaW5mby1tYXJrLWJhY2tncm91bmQnKSBcblx0XHRcdFx0LmF0dHIoJ2N4Jyw2KVxuXHRcdFx0XHQuYXR0cignY3knLDYpXG5cdFx0XHRcdC5hdHRyKCdyJyw2KTtcblx0XHRcdFx0XG5cblx0XHRcdGluZm9NYXJrc1xuXHRcdFx0XHQuYXBwZW5kKCdwYXRoJylcblx0XHRcdFx0LmF0dHIoJ2NsYXNzJywnaW5mby1tYXJrLWZvcmVncm91bmQnKVxuXHRcdFx0XHQuYXR0cignZCcsIGBNNS4yMzEsNy42MTRWNi45MTVjMC0wLjM2NCwwLjA4NC0wLjcwMiwwLjI1NC0xLjAxNmMwLjE2OS0wLjMxMywwLjM1NS0wLjYxMywwLjU1OS0wLjkwMlxuXHRcdFx0XHRcdFx0XHRjMC4yMDMtMC4yODcsMC4zOS0wLjU2NCwwLjU1OS0wLjgzMUM2Ljc3MiwzLjksNi44NTcsMy42MzEsNi44NTcsMy4zNmMwLTAuMTk1LTAuMDgxLTAuMzU3LTAuMjQyLTAuNDg5XG5cdFx0XHRcdFx0XHRcdEM2LjQ1NSwyLjc0LDYuMjY4LDIuNjc0LDYuMDU3LDIuNjc0Yy0wLjE1MywwLTAuMjg4LDAuMDM0LTAuNDA3LDAuMTAyYy0wLjExOCwwLjA2OC0wLjIyMiwwLjE1NS0wLjMxMSwwLjI2XG5cdFx0XHRcdFx0XHRcdEM1LjI1LDMuMTQyLDUuMTc3LDMuMjYxLDUuMTE3LDMuMzkyYy0wLjA2LDAuMTMxLTAuMDk3LDAuMjY0LTAuMTE0LDAuNGwtMS40Ni0wLjQwN0MzLjcwNCwyLjc1LDQuMDA4LDIuMjYxLDQuNDU3LDEuOTE5XG5cdFx0XHRcdFx0XHRcdGMwLjQ0OC0wLjM0MywxLjAxNi0wLjUxNSwxLjcwMS0wLjUxNWMwLjMxMywwLDAuNjA3LDAuMDQ0LDAuODgyLDAuMTMzQzcuMzE2LDEuNjI2LDcuNTYsMS43NTYsNy43NzEsMS45MjVcblx0XHRcdFx0XHRcdFx0QzcuOTgyLDIuMDk1LDguMTUsMi4zMDYsOC4yNzIsMi41NmMwLjEyMywwLjI1NCwwLjE4NSwwLjU0NiwwLjE4NSwwLjg3NmMwLDAuNDIzLTAuMDk2LDAuNzg1LTAuMjg2LDEuMDg1XG5cdFx0XHRcdFx0XHRcdGMtMC4xOTEsMC4zMDEtMC40LDAuNTg2LTAuNjI5LDAuODU3QzcuMzE0LDUuNjUsNy4xMDQsNS45MjMsNi45MTQsNi4xOThTNi42MjgsNi43ODksNi42MjgsNy4xNDR2MC40N0g1LjIzMXogTTUuMDc5LDEwLjY5OVY4Ljg5NlxuXHRcdFx0XHRcdFx0XHRoMS43NTJ2MS44MDNINS4wNzl6YFxuXHRcdFx0XHQpO1xuXG5cdFx0XHQvKmQzLnNlbGVjdEFsbCgnLmZpZ3VyZS10aXRsZS5oYXMtaW5mby1tYXJrJylcblx0XHRcdFx0LmFwcGVuZCgnYScpXG5cdFx0XHRcdC5hdHRyKCd0aXRsZScsIGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0cmV0dXJuIGluZm9ybWF0aW9uW2QzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUucGFyZW50Tm9kZSkuYXR0cignaWQnKS5yZXBsYWNlKCctJywnJyldO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQuYXR0cignaHJlZicsJyMnKVxuXHRcdFx0XHQuYXR0cignY2xhc3MnLCdpbmZvLW1hcmsgc21hbGwnKVxuXHRcdFx0XHQudGV4dCgnPycpO1xuXHRcdFx0ZDMuc2VsZWN0QWxsKCcuaW5mby1tYXJrJylcblx0XHRcdFx0Lm9uKCdjbGljaycsKCkgPT4ge1xuXHRcdFx0XHRcdGQzLmV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdH0pOyovXG5cblx0XHRcdGdhdGUoKTtcblx0XHRcdC8vYWRkQ2x1c3RlckxheWVycyhydG4pO1xuXHRcdFx0XG5cdFx0fSk7IC8vIGVuZCBkMyBjc3Zcblx0fSAvLyBlbmQgdG9HZW9KU09OXG5cdC8qdmFyIGZlYXR1cmVzSW5WaWV3ID0ge1xuXHRcdHJlbmRlcigpe1xuXHRcdFx0dGhpcy5jaGFydCA9IG5ldyBCYXJzLkJhcih7XG5cdFx0XHRcdG1hcmdpbjoge1xuXHRcdFx0XHRcdHRvcDowLFxuXHRcdFx0XHRcdHJpZ2h0OjAsXG5cdFx0XHRcdFx0Ym90dG9tOjAsXG5cdFx0XHRcdFx0bGVmdDowXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGhlaWdodFRvV2lkdGg6IDAuMDMsXG5cdFx0XHRcdGNvbnRhaW5lcjogJyN0b3RhbC12aWV3Jyxcblx0XHRcdFx0dG90YWw6IGdlb2pzb24uZmVhdHVyZXMubGVuZ3RoXG5cdFx0XHR9KTtcblxuXHRcdFx0Lyp0aGlzLnRvdGFsID0gZ2VvanNvbi5mZWF0dXJlcy5sZW5ndGg7XG5cdFx0XHR0aGlzLnN2ZyA9IGQzLnNlbGVjdCgnI3RvdGFsLXZpZXcnKVxuXHRcdFx0XHQuYXBwZW5kKCdzdmcnKVxuXHRcdFx0XHQuYXR0cignd2lkdGgnLCAnMTAwJScpXG5cdCAgICAgICAgICAgIC5hdHRyKCd4bWxucycsJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3ZlcnNpb24nLCcxLjEnKSBcblx0ICAgICAgICAgICAgLmF0dHIoJ3ZpZXdCb3gnLCAnMCAwIDEwMCAzJyk7XG5cblx0ICAgICAgICB0aGlzLmJhY2tncm91bmQgPSB0aGlzLnN2Zy5hcHBlbmQoJ2xpbmUnKVxuXHQgICAgICAgIFx0LmNsYXNzZWQoJ2JhY2tncm91bmQtbGluZScsIHRydWUpXG5cdCAgICAgICAgXHQuYXR0cigneDAnLDApXG5cdCAgICAgICAgXHQuYXR0cigneTAnLDApXG5cdCAgICAgICAgXHQuYXR0cigneDEnLDEwMClcblx0ICAgICAgICBcdC5hdHRyKCd5MScsMCk7XG5cblx0ICAgICAgICB0aGlzLmxpbmUgPSB0aGlzLnN2Zy5hcHBlbmQoJ2xpbmUnKVxuXHQgICAgICAgIFx0LmNsYXNzZWQoJ3RvdGFsLWxpbmUnLCB0cnVlKVxuXHQgICAgICAgIFx0LmF0dHIoJ3gwJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kwJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3gxJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kxJywwKTtcblxuXHQgICAgICAgIHRoaXMudGV4dCA9IGQzLnNlbGVjdCgnI3RvdGFsLXZpZXcnKVxuXHQgICAgICAgIFx0LmFwcGVuZCgnc3BhbicpXG5cdCAgICAgICAgXHQudGV4dCgoKSA9PiBgJHtkMy5mb3JtYXQoXCIsXCIpKHRoaXMudG90YWwpfSBvZiAke2QzLmZvcm1hdChcIixcIikodGhpcy50b3RhbCl9IGluIHZpZXdgICk7XG5cdCAgICAgICAgXHRcblxuXHRcdFx0dGhpcy51cGRhdGUoY291bnRGZWF0dXJlcygpKTtcblx0XHR9LFxuXHRcdHVwZGF0ZShuKXtcblx0XHRcdC8qZDMuc2VsZWN0KCcjdG90YWwtaW4tdmlldycpXG5cdFx0XHRcdC50ZXh0KCgpID0+IGQzLmZvcm1hdChcIixcIikobikgKyAnIG9mICcgKyBkMy5mb3JtYXQoXCIsXCIpKHRoaXMudG90YWwpICsgJyBwcm9wZXJ0aWVzIGluIHZpZXcnKTsqL1xuXHRcdFx0Lyp0aGlzLmxpbmVcblx0XHRcdFx0LnRyYW5zaXRpb24oKS5kdXJhdGlvbigyMDApXG5cdFx0XHRcdC5hdHRyKCd4MScsICgpID0+ICggbiAvIHRoaXMudG90YWwpICogMTAwICk7XG5cdFx0XHR0aGlzLnRleHRcblx0XHRcdFx0LnRleHQoKCkgPT4gYCR7ZDMuZm9ybWF0KFwiLFwiKShuKX0gb2YgJHtkMy5mb3JtYXQoXCIsXCIpKHRoaXMudG90YWwpfSBpbiB2aWV3YCApO1xuICBcblx0XHR9Ki8gXG5cblx0XG5cdHZhciBpblZpZXdJRHMgPSBuZXcgU2V0KCk7XG5cdGZ1bmN0aW9uIGNvdW50RmVhdHVyZXMoKXsgXG5cdFx0LyoganNoaW50IGxheGJyZWFrOnRydWUgKi9cblx0XHRpblZpZXdJRHMuY2xlYXIoKTsgXG5cdFx0Ly92YXIgY291bnQgPSAwO1xuXHRcdHZhciBib3VuZHMgPSB0aGVNYXAuZ2V0Qm91bmRzKCk7XG5cdFx0Z2VvanNvbi5mZWF0dXJlcy5mb3JFYWNoKGVhY2ggPT4ge1xuXHRcdFx0aWYgKCAgICBlYWNoLnByb3BlcnRpZXMubG9uZ2l0dWRlID49IGJvdW5kcy5fc3cubG5nIFxuXHRcdFx0XHQgJiYgZWFjaC5wcm9wZXJ0aWVzLmxvbmdpdHVkZSA8PSBib3VuZHMuX25lLmxuZyBcblx0XHRcdFx0ICYmIGVhY2gucHJvcGVydGllcy5sYXRpdHVkZSAgPj0gYm91bmRzLl9zdy5sYXQgXG5cdFx0XHRcdCAmJiBlYWNoLnByb3BlcnRpZXMubGF0aXR1ZGUgIDw9IGJvdW5kcy5fbmUubGF0ICl7XG5cdFx0XHRcdGluVmlld0lEcy5hZGQoZWFjaC5wcm9wZXJ0aWVzLmlkKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRjb25zb2xlLmxvZyhpblZpZXdJRHMpO1xuXHR9XG5cdHRoZU1hcC5vbignbW92ZWVuZCcsIGZ1bmN0aW9uKCl7XG5cdFx0dXBkYXRlQWxsKCk7XG5cdH0pO1xuXHR0aGVNYXAub24oJ3pvb21lbmQnLCBmdW5jdGlvbihhcmcpe1xuXHRcdGNvbnNvbGUubG9nKGFyZyk7XG5cdFx0dXBkYXRlQWxsKCk7XG5cdFx0ZDMuc2VsZWN0KCcjc2l6ZS1sZWdlbmQnKVxuXHRcdFx0LmNsYXNzZWQoJ3Nob3cnLCB0aGVNYXAuZ2V0Wm9vbSgpID49IHNpemVab29tVGhyZXNob2xkKTtcblx0fSk7XG5cdGZ1bmN0aW9uIHVwZGF0ZUFsbCgpe1xuXHRcdGNvdW50RmVhdHVyZXMoKTtcblx0XHR0aGVDaGFydHMuZm9yRWFjaChlYWNoID0+IGVhY2gudXBkYXRlKGluVmlld0lEcykpO1xuXHR9XG5cdHRoZU1hcC5vbihcIm1vdXNlbW92ZVwiLCBcInBvaW50cy1kYXRhLWRyaXZlblwiLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGUpO1xuICAgIH0pO1xuXG4gICBcblxuXHRyZXR1cm4gdGhlTWFwO1xuICAgXG59KCkpOyAvLyBlbmQgSUlGRSAiLCJleHBvcnQgY29uc3QgQmFycyA9IChmdW5jdGlvbigpe1xuXG5cdHZhciBCYXIgPSBmdW5jdGlvbihjb25maWdPYmplY3QpeyAvLyBtYXJnaW5zIHt9LCBoZWlnaHQgIywgd2lkdGggIywgY29udGFpbmVySUQsIGRhdGFQYXRoXG5cdCAgICB0aGlzLnNldHVwKGNvbmZpZ09iamVjdCk7XG5cdH07XG5cblx0QmFyLnByb3RvdHlwZSA9IHtcblx0XHRzZXR1cChjb25maWdPYmplY3QpeyAvLyBzb21lIG9mIHNldHVwIGlzIGNvbW1vbiB0byBhbGwgY2hhcnRzIGFuZCBjb3VsZCBiZSBoYW5kbGVkIGJ5IHByb3RvdHlwaWNhbCBpbmhlcml0YW5jZVxuXHQgICAgXHRjb25zb2xlLmxvZyhjb25maWdPYmplY3QpO1xuXHQgICAgICAgIHZhciB2aWV3Qm94ID0gJzAgMCAxMDAgJyArIE1hdGgucm91bmQoY29uZmlnT2JqZWN0LmhlaWdodFRvV2lkdGggKiAxMDApO1xuXHQgICAgICAgIHRoaXMuY29udGFpbmVyID0gY29uZmlnT2JqZWN0LmNvbnRhaW5lcjtcblx0ICAgICAgICB0aGlzLm1hcmdpbiA9IGNvbmZpZ09iamVjdC5tYXJnaW47XG5cdCAgICAgICAgdGhpcy53aWR0aCA9IDEwMCAtIHRoaXMubWFyZ2luLmxlZnQgLSB0aGlzLm1hcmdpbi5yaWdodDtcblx0ICAgICAgICB0aGlzLmhlaWdodCA9IGNvbmZpZ09iamVjdC5oZWlnaHRUb1dpZHRoICogMTAwIC0gdGhpcy5tYXJnaW4udG9wIC0gdGhpcy5tYXJnaW4uYm90dG9tO1xuXHQgICAgICAgIHRoaXMudGl0bGUgPSBjb25maWdPYmplY3QudGl0bGU7XG5cdCAgICAgICAgdGhpcy5pbmZvTWFyayA9IGNvbmZpZ09iamVjdC5pbmZvTWFyayB8fCBmYWxzZTtcblx0ICAgICAgICB0aGlzLmNvbXBhcmF0b3IgPSBjb25maWdPYmplY3QuY29tcGFyYXRvcjtcblx0ICAgICAgICB0aGlzLnRydW5jYXRlUmlnaHQgPSBjb25maWdPYmplY3QudHJ1bmNhdGVSaWdodCB8fCBmYWxzZTtcblx0ICAgICAgICB0aGlzLmJhY2tncm91bmRDb2xvciA9IGNvbmZpZ09iamVjdC5iYWNrZ3JvdW5kQ29sb3IgfHwgJ2dyYXknO1xuXHQgICAgICAgIHRoaXMuZGF0YSA9IGNvbmZpZ09iamVjdC5kYXRhO1xuXHQgICAgICAgIHRoaXMubnVtZXJhdG9yID0gY29uZmlnT2JqZWN0Lm51bWVyYXRvcjtcblx0ICAgICAgICB0aGlzLmRlbm9taW5hdG9yID0gY29uZmlnT2JqZWN0LmRlbm9taW5hdG9yO1xuXHQgICAgICAgIHRoaXMudGV4dEZ1bmN0aW9uID0gY29uZmlnT2JqZWN0LnRleHRGdW5jdGlvbjtcblx0ICAgICAgICB0aGlzLnpTY29yZXMgPSBjb25maWdPYmplY3QuelNjb3JlcyB8fCBudWxsO1xuXHQgICAgICAgIHRoaXMubWluID0gY29uZmlnT2JqZWN0Lm1pbiA/IGNvbmZpZ09iamVjdC5taW4uY2FsbCh0aGlzKSA6IDA7XG5cdCAgICAgICAgLy90aGlzLm1heCA9IGNvbmZpZ09iamVjdC5tYXggPyBjb25maWdPYmplY3QubWF4LmNhbGwodGhpcykgOiAxMDA7XG5cdCAgICAgICAgLy90aGlzLnNjYWxlID0gZDMuc2NhbGVMaW5lYXIoKS5kb21haW4oW3RoaXMubWluLHRoaXMubWF4XSkucmFuZ2UoWzAsdGhpcy53aWR0aF0pO1xuXHQgICAgICAgIFxuXG5cdCAgICAgICAgZDMuc2VsZWN0KHRoaXMuY29udGFpbmVyKVxuXHQgICAgICAgIFx0LmFwcGVuZCgnc3BhbicpXG5cdCAgICAgICAgXHQuY2xhc3NlZCgnZmlndXJlLXRpdGxlJywgdHJ1ZSlcblx0ICAgICAgICBcdC5jbGFzc2VkKCdoYXMtaW5mby1tYXJrJywgKCkgPT4gdGhpcy5pbmZvTWFyaylcblx0ICAgICAgICBcdC50ZXh0KHRoaXMudGl0bGUpO1xuXG5cdCAgICAgICAgdGhpcy5zdmcgPSBkMy5zZWxlY3QodGhpcy5jb250YWluZXIpXG5cdCAgICAgICAgXHQuYXBwZW5kKCdkaXYnKVxuXHQgICAgICAgIFx0LmF0dHIoJ2NsYXNzJywnc3ZnLXdyYXBwZXInKVxuXHQgICAgICAgICAgICAuYXBwZW5kKCdzdmcnKVxuXHQgICAgICAgICAgICAuYXR0cignd2lkdGgnLCAnMTAwJScpXG5cdCAgICAgICAgICAgIC5hdHRyKCd4bWxucycsJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3ZlcnNpb24nLCcxLjEnKVxuXHQgICAgICAgICAgICAuYXR0cigndmlld0JveCcsIHZpZXdCb3gpXG5cdCAgICAgICAgICAgIC5hcHBlbmQoJ2cnKVxuXHQgICAgICAgICAgICAuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgdGhpcy5tYXJnaW4ubGVmdCArICcsJyArIHRoaXMubWFyZ2luLnRvcCArICcpJyk7XG5cblx0ICAgICAgICB0aGlzLmJhY2tncm91bmQgPSB0aGlzLnN2Zy5hcHBlbmQoJ2xpbmUnKVxuXHQgICAgICAgIFx0LmNsYXNzZWQoJ2JhY2tncm91bmQtbGluZS0nICsgdGhpcy5iYWNrZ3JvdW5kQ29sb3IsIHRydWUpXG5cdCAgICAgICAgXHQuYXR0cigneDAnLDApXG5cdCAgICAgICAgXHQuYXR0cigneTAnLDApXG5cdCAgICAgICAgXHQuYXR0cigneDEnLHRoaXMud2lkdGgpXG5cdCAgICAgICAgXHQuYXR0cigneTEnLDApO1xuXG5cdCAgICAgICAgdGhpcy5saW5lID0gdGhpcy5zdmcuYXBwZW5kKCdsaW5lJylcblx0ICAgICAgICBcdC5jbGFzc2VkKCdmb3JlZ3JvdW5kLWxpbmUnLCB0cnVlKVxuXHQgICAgICAgIFx0LmF0dHIoJ3gwJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kwJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3gxJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kxJywwKTtcblxuXHQgICAgICAgIHRoaXMudGV4dCA9IGQzLnNlbGVjdCh0aGlzLmNvbnRhaW5lcilcblx0ICAgICAgICBcdC5hcHBlbmQoJ3NwYW4nKVxuXHQgICAgICAgIFx0LmF0dHIoJ2NsYXNzJywndmFsdWUnKTtcblx0ICAgICAgICBcdFxuXG5cdCAgICAgICAgLy90aGlzLnVwZGF0ZSh0aGlzLm51bWVyYXRvcigpKTsgIFxuICAgICAgICB9LFxuICAgICAgICB1cGRhdGUoaW5WaWV3SURzKXtcbiAgICAgICAgXHRjb25zb2xlLmxvZyh0aGlzKTtcblx0XHRcdHZhciBuID0gdGhpcy5udW1lcmF0b3IoaW5WaWV3SURzKSxcblx0XHRcdFx0ZCA9IHRoaXMuZGVub21pbmF0b3IoaW5WaWV3SURzKTsgXG5cdFx0XHRkMy5zZWxlY3QodGhpcy5jb250YWluZXIpXG5cdFx0XHRcdC5jbGFzc2VkKCdvdmVyZmxvdycsIG4gPiBkICk7XG5cbiAgICAgICAgXHRpZiAodGhpcy50cnVuY2F0ZVJpZ2h0KXtcbiAgICAgICAgXHRcdGQgPSB0aGlzLm1pbiA9IDAgLSBkO1xuICAgICAgICBcdH0gZWxzZSBpZiAoIHRoaXMubWluIDwgMCAmJiBkID4gMCApIHtcbiAgICAgICAgXHRcdGlmIChNYXRoLmFicyh0aGlzLm1pbikgPCBkKSB7XG4gICAgICAgIFx0XHRcdHRoaXMubWluID0gMCAtIGQ7XG4gICAgICAgIFx0XHR9IGVsc2Uge1xuICAgICAgICBcdFx0XHRkID0gMCAtIHRoaXMubWluO1xuICAgICAgICBcdFx0fVxuICAgICAgICBcdH1cbiAgICAgICAgXHRjb25zb2xlLmxvZygnbWluOiAnICsgdGhpcy5taW4gKyAnOyBtYXg6ICcgKyBkKTtcblx0XHRcdHRoaXMuc2NhbGUgPSBkMy5zY2FsZUxpbmVhcigpLmRvbWFpbihbdGhpcy5taW4sZF0pLnJhbmdlKFswLHRoaXMud2lkdGhdKS5jbGFtcCh0cnVlKTtcblx0XHRcdHRoaXMubGluZVxuXHRcdFx0XHQudHJhbnNpdGlvbigpLmR1cmF0aW9uKDIwMClcblx0XHRcdFx0LmF0dHIoJ3gxJywgKCkgPT4gdGhpcy5zY2FsZShuKSk7XG5cdFx0XHR0aGlzLnRleHRcblx0XHRcdFx0LnRleHQoKCkgPT4gdGhpcy50ZXh0RnVuY3Rpb24obixkKSk7XG5cdFx0fVxuXHR9O1xuXG5cdHJldHVybiB7XG5cdFx0QmFyXG5cdH07XG4gICAgICAgIFxufSkoKTsiLCIvLyBkMy50aXBcbi8vIENvcHlyaWdodCAoYykgMjAxMyBKdXN0aW4gUGFsbWVyXG4vLyBFUzYgLyBEMyB2NCBBZGFwdGlvbiBDb3B5cmlnaHQgKGMpIDIwMTYgQ29uc3RhbnRpbiBHYXZyaWxldGVcbi8vIFJlbW92YWwgb2YgRVM2IGZvciBEMyB2NCBBZGFwdGlvbiBDb3B5cmlnaHQgKGMpIDIwMTYgRGF2aWQgR290elxuLy9cbi8vIFRvb2x0aXBzIGZvciBkMy5qcyBTVkcgdmlzdWFsaXphdGlvbnNcblxuZXhwb3J0IGNvbnN0IGQzVGlwID0gKGZ1bmN0aW9uKCl7XG4gIGQzLmZ1bmN0b3IgPSBmdW5jdGlvbiBmdW5jdG9yKHYpIHtcbiAgICByZXR1cm4gdHlwZW9mIHYgPT09IFwiZnVuY3Rpb25cIiA/IHYgOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB2O1xuICAgIH07XG4gIH07XG5cbiAgZDMudGlwID0gZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgZGlyZWN0aW9uID0gZDNfdGlwX2RpcmVjdGlvbixcbiAgICAgICAgb2Zmc2V0ICAgID0gZDNfdGlwX29mZnNldCxcbiAgICAgICAgaHRtbCAgICAgID0gZDNfdGlwX2h0bWwsXG4gICAgICAgIG5vZGUgICAgICA9IGluaXROb2RlKCksXG4gICAgICAgIHN2ZyAgICAgICA9IG51bGwsXG4gICAgICAgIHBvaW50ICAgICA9IG51bGwsXG4gICAgICAgIHRhcmdldCAgICA9IG51bGxcblxuICAgIGZ1bmN0aW9uIHRpcCh2aXMpIHtcbiAgICAgIHN2ZyA9IGdldFNWR05vZGUodmlzKVxuICAgICAgcG9pbnQgPSBzdmcuY3JlYXRlU1ZHUG9pbnQoKVxuICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChub2RlKVxuICAgIH1cblxuICAgIC8vIFB1YmxpYyAtIHNob3cgdGhlIHRvb2x0aXAgb24gdGhlIHNjcmVlblxuICAgIC8vXG4gICAgLy8gUmV0dXJucyBhIHRpcFxuICAgIHRpcC5zaG93ID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cylcbiAgICAgIGlmKGFyZ3NbYXJncy5sZW5ndGggLSAxXSBpbnN0YW5jZW9mIFNWR0VsZW1lbnQpIHRhcmdldCA9IGFyZ3MucG9wKClcbiAgICAgIHZhciBjb250ZW50ID0gaHRtbC5hcHBseSh0aGlzLCBhcmdzKSxcbiAgICAgICAgICBwb2Zmc2V0ID0gb2Zmc2V0LmFwcGx5KHRoaXMsIGFyZ3MpLFxuICAgICAgICAgIGRpciAgICAgPSBkaXJlY3Rpb24uYXBwbHkodGhpcywgYXJncyksXG4gICAgICAgICAgbm9kZWwgICA9IGdldE5vZGVFbCgpLFxuICAgICAgICAgIGkgICAgICAgPSBkaXJlY3Rpb25zLmxlbmd0aCxcbiAgICAgICAgICBjb29yZHMsXG4gICAgICAgICAgc2Nyb2xsVG9wICA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxUb3AgfHwgZG9jdW1lbnQuYm9keS5zY3JvbGxUb3AsXG4gICAgICAgICAgc2Nyb2xsTGVmdCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxMZWZ0IHx8IGRvY3VtZW50LmJvZHkuc2Nyb2xsTGVmdFxuXG4gICAgICBub2RlbC5odG1sKGNvbnRlbnQpXG4gICAgICAgIC5zdHlsZSgncG9zaXRpb24nLCAnYWJzb2x1dGUnKVxuICAgICAgICAuc3R5bGUoJ29wYWNpdHknLCAxKVxuICAgICAgICAuc3R5bGUoJ3BvaW50ZXItZXZlbnRzJywgJ2FsbCcpXG5cbiAgICAgIHdoaWxlKGktLSkgbm9kZWwuY2xhc3NlZChkaXJlY3Rpb25zW2ldLCBmYWxzZSlcbiAgICAgIGNvb3JkcyA9IGRpcmVjdGlvbl9jYWxsYmFja3NbZGlyXS5hcHBseSh0aGlzKVxuICAgICAgbm9kZWwuY2xhc3NlZChkaXIsIHRydWUpXG4gICAgICAgIC5zdHlsZSgndG9wJywgKGNvb3Jkcy50b3AgKyAgcG9mZnNldFswXSkgKyBzY3JvbGxUb3AgKyAncHgnKVxuICAgICAgICAuc3R5bGUoJ2xlZnQnLCAoY29vcmRzLmxlZnQgKyBwb2Zmc2V0WzFdKSArIHNjcm9sbExlZnQgKyAncHgnKVxuXG4gICAgICByZXR1cm4gdGlwXG4gICAgfVxuXG4gICAgLy8gUHVibGljIC0gaGlkZSB0aGUgdG9vbHRpcFxuICAgIC8vXG4gICAgLy8gUmV0dXJucyBhIHRpcFxuICAgIHRpcC5oaWRlID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbm9kZWwgPSBnZXROb2RlRWwoKVxuICAgICAgbm9kZWxcbiAgICAgICAgLnN0eWxlKCdvcGFjaXR5JywgMClcbiAgICAgICAgLnN0eWxlKCdwb2ludGVyLWV2ZW50cycsICdub25lJylcbiAgICAgIHJldHVybiB0aXBcbiAgICB9XG5cbiAgICAvLyBQdWJsaWM6IFByb3h5IGF0dHIgY2FsbHMgdG8gdGhlIGQzIHRpcCBjb250YWluZXIuICBTZXRzIG9yIGdldHMgYXR0cmlidXRlIHZhbHVlLlxuICAgIC8vXG4gICAgLy8gbiAtIG5hbWUgb2YgdGhlIGF0dHJpYnV0ZVxuICAgIC8vIHYgLSB2YWx1ZSBvZiB0aGUgYXR0cmlidXRlXG4gICAgLy9cbiAgICAvLyBSZXR1cm5zIHRpcCBvciBhdHRyaWJ1dGUgdmFsdWVcbiAgICB0aXAuYXR0ciA9IGZ1bmN0aW9uKG4sIHYpIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMiAmJiB0eXBlb2YgbiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIGdldE5vZGVFbCgpLmF0dHIobilcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBhcmdzID0gIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cylcbiAgICAgICAgZDMuc2VsZWN0aW9uLnByb3RvdHlwZS5hdHRyLmFwcGx5KGdldE5vZGVFbCgpLCBhcmdzKVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGlwXG4gICAgfVxuXG4gICAgLy8gUHVibGljOiBQcm94eSBzdHlsZSBjYWxscyB0byB0aGUgZDMgdGlwIGNvbnRhaW5lci4gIFNldHMgb3IgZ2V0cyBhIHN0eWxlIHZhbHVlLlxuICAgIC8vXG4gICAgLy8gbiAtIG5hbWUgb2YgdGhlIHByb3BlcnR5XG4gICAgLy8gdiAtIHZhbHVlIG9mIHRoZSBwcm9wZXJ0eVxuICAgIC8vXG4gICAgLy8gUmV0dXJucyB0aXAgb3Igc3R5bGUgcHJvcGVydHkgdmFsdWVcbiAgICB0aXAuc3R5bGUgPSBmdW5jdGlvbihuLCB2KSB7XG4gICAgICAvLyBkZWJ1Z2dlcjtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMiAmJiB0eXBlb2YgbiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIGdldE5vZGVFbCgpLnN0eWxlKG4pXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgIHZhciBzdHlsZXMgPSBhcmdzWzBdO1xuICAgICAgICAgIE9iamVjdC5rZXlzKHN0eWxlcykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgIHJldHVybiBkMy5zZWxlY3Rpb24ucHJvdG90eXBlLnN0eWxlLmFwcGx5KGdldE5vZGVFbCgpLCBba2V5LCBzdHlsZXNba2V5XV0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aXBcbiAgICB9XG5cbiAgICAvLyBQdWJsaWM6IFNldCBvciBnZXQgdGhlIGRpcmVjdGlvbiBvZiB0aGUgdG9vbHRpcFxuICAgIC8vXG4gICAgLy8gdiAtIE9uZSBvZiBuKG5vcnRoKSwgcyhzb3V0aCksIGUoZWFzdCksIG9yIHcod2VzdCksIG53KG5vcnRod2VzdCksXG4gICAgLy8gICAgIHN3KHNvdXRod2VzdCksIG5lKG5vcnRoZWFzdCkgb3Igc2Uoc291dGhlYXN0KVxuICAgIC8vXG4gICAgLy8gUmV0dXJucyB0aXAgb3IgZGlyZWN0aW9uXG4gICAgdGlwLmRpcmVjdGlvbiA9IGZ1bmN0aW9uKHYpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGRpcmVjdGlvblxuICAgICAgZGlyZWN0aW9uID0gdiA9PSBudWxsID8gdiA6IGQzLmZ1bmN0b3IodilcblxuICAgICAgcmV0dXJuIHRpcFxuICAgIH1cblxuICAgIC8vIFB1YmxpYzogU2V0cyBvciBnZXRzIHRoZSBvZmZzZXQgb2YgdGhlIHRpcFxuICAgIC8vXG4gICAgLy8gdiAtIEFycmF5IG9mIFt4LCB5XSBvZmZzZXRcbiAgICAvL1xuICAgIC8vIFJldHVybnMgb2Zmc2V0IG9yXG4gICAgdGlwLm9mZnNldCA9IGZ1bmN0aW9uKHYpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIG9mZnNldFxuICAgICAgb2Zmc2V0ID0gdiA9PSBudWxsID8gdiA6IGQzLmZ1bmN0b3IodilcblxuICAgICAgcmV0dXJuIHRpcFxuICAgIH1cblxuICAgIC8vIFB1YmxpYzogc2V0cyBvciBnZXRzIHRoZSBodG1sIHZhbHVlIG9mIHRoZSB0b29sdGlwXG4gICAgLy9cbiAgICAvLyB2IC0gU3RyaW5nIHZhbHVlIG9mIHRoZSB0aXBcbiAgICAvL1xuICAgIC8vIFJldHVybnMgaHRtbCB2YWx1ZSBvciB0aXBcbiAgICB0aXAuaHRtbCA9IGZ1bmN0aW9uKHYpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGh0bWxcbiAgICAgIGh0bWwgPSB2ID09IG51bGwgPyB2IDogZDMuZnVuY3Rvcih2KVxuXG4gICAgICByZXR1cm4gdGlwXG4gICAgfVxuXG4gICAgLy8gUHVibGljOiBkZXN0cm95cyB0aGUgdG9vbHRpcCBhbmQgcmVtb3ZlcyBpdCBmcm9tIHRoZSBET01cbiAgICAvL1xuICAgIC8vIFJldHVybnMgYSB0aXBcbiAgICB0aXAuZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuICAgICAgaWYobm9kZSkge1xuICAgICAgICBnZXROb2RlRWwoKS5yZW1vdmUoKTtcbiAgICAgICAgbm9kZSA9IG51bGw7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGlwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGQzX3RpcF9kaXJlY3Rpb24oKSB7IHJldHVybiAnbicgfVxuICAgIGZ1bmN0aW9uIGQzX3RpcF9vZmZzZXQoKSB7IHJldHVybiBbMCwgMF0gfVxuICAgIGZ1bmN0aW9uIGQzX3RpcF9odG1sKCkgeyByZXR1cm4gJyAnIH1cblxuICAgIHZhciBkaXJlY3Rpb25fY2FsbGJhY2tzID0ge1xuICAgICAgbjogIGRpcmVjdGlvbl9uLFxuICAgICAgczogIGRpcmVjdGlvbl9zLFxuICAgICAgZTogIGRpcmVjdGlvbl9lLFxuICAgICAgdzogIGRpcmVjdGlvbl93LFxuICAgICAgbnc6IGRpcmVjdGlvbl9udyxcbiAgICAgIG5lOiBkaXJlY3Rpb25fbmUsXG4gICAgICBzdzogZGlyZWN0aW9uX3N3LFxuICAgICAgc2U6IGRpcmVjdGlvbl9zZVxuICAgIH07XG5cbiAgICB2YXIgZGlyZWN0aW9ucyA9IE9iamVjdC5rZXlzKGRpcmVjdGlvbl9jYWxsYmFja3MpO1xuXG4gICAgZnVuY3Rpb24gZGlyZWN0aW9uX24oKSB7XG4gICAgICB2YXIgYmJveCA9IGdldFNjcmVlbkJCb3goKVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9wOiAgYmJveC5uLnkgLSBub2RlLm9mZnNldEhlaWdodCxcbiAgICAgICAgbGVmdDogYmJveC5uLnggLSBub2RlLm9mZnNldFdpZHRoIC8gMlxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpcmVjdGlvbl9zKCkge1xuICAgICAgdmFyIGJib3ggPSBnZXRTY3JlZW5CQm94KClcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRvcDogIGJib3gucy55LFxuICAgICAgICBsZWZ0OiBiYm94LnMueCAtIG5vZGUub2Zmc2V0V2lkdGggLyAyXG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGlyZWN0aW9uX2UoKSB7XG4gICAgICB2YXIgYmJveCA9IGdldFNjcmVlbkJCb3goKVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9wOiAgYmJveC5lLnkgLSBub2RlLm9mZnNldEhlaWdodCAvIDIsXG4gICAgICAgIGxlZnQ6IGJib3guZS54XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGlyZWN0aW9uX3coKSB7XG4gICAgICB2YXIgYmJveCA9IGdldFNjcmVlbkJCb3goKVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9wOiAgYmJveC53LnkgLSBub2RlLm9mZnNldEhlaWdodCAvIDIsXG4gICAgICAgIGxlZnQ6IGJib3gudy54IC0gbm9kZS5vZmZzZXRXaWR0aFxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpcmVjdGlvbl9udygpIHtcbiAgICAgIHZhciBiYm94ID0gZ2V0U2NyZWVuQkJveCgpXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0b3A6ICBiYm94Lm53LnkgLSBub2RlLm9mZnNldEhlaWdodCxcbiAgICAgICAgbGVmdDogYmJveC5udy54IC0gbm9kZS5vZmZzZXRXaWR0aFxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpcmVjdGlvbl9uZSgpIHtcbiAgICAgIHZhciBiYm94ID0gZ2V0U2NyZWVuQkJveCgpXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0b3A6ICBiYm94Lm5lLnkgLSBub2RlLm9mZnNldEhlaWdodCxcbiAgICAgICAgbGVmdDogYmJveC5uZS54XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGlyZWN0aW9uX3N3KCkge1xuICAgICAgdmFyIGJib3ggPSBnZXRTY3JlZW5CQm94KClcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRvcDogIGJib3guc3cueSxcbiAgICAgICAgbGVmdDogYmJveC5zdy54IC0gbm9kZS5vZmZzZXRXaWR0aFxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpcmVjdGlvbl9zZSgpIHtcbiAgICAgIHZhciBiYm94ID0gZ2V0U2NyZWVuQkJveCgpXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0b3A6ICBiYm94LnNlLnksXG4gICAgICAgIGxlZnQ6IGJib3guZS54XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5pdE5vZGUoKSB7XG4gICAgICB2YXIgbm9kZSA9IGQzLnNlbGVjdChkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSlcbiAgICAgIG5vZGVcbiAgICAgICAgLnN0eWxlKCdwb3NpdGlvbicsICdhYnNvbHV0ZScpXG4gICAgICAgIC5zdHlsZSgndG9wJywgMClcbiAgICAgICAgLnN0eWxlKCdvcGFjaXR5JywgMClcbiAgICAgICAgLnN0eWxlKCdwb2ludGVyLWV2ZW50cycsICdub25lJylcbiAgICAgICAgLnN0eWxlKCdib3gtc2l6aW5nJywgJ2JvcmRlci1ib3gnKVxuXG4gICAgICByZXR1cm4gbm9kZS5ub2RlKClcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTVkdOb2RlKGVsKSB7XG4gICAgICBlbCA9IGVsLm5vZGUoKVxuICAgICAgaWYoZWwudGFnTmFtZS50b0xvd2VyQ2FzZSgpID09PSAnc3ZnJylcbiAgICAgICAgcmV0dXJuIGVsXG5cbiAgICAgIHJldHVybiBlbC5vd25lclNWR0VsZW1lbnRcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXROb2RlRWwoKSB7XG4gICAgICBpZihub2RlID09PSBudWxsKSB7XG4gICAgICAgIG5vZGUgPSBpbml0Tm9kZSgpO1xuICAgICAgICAvLyByZS1hZGQgbm9kZSB0byBET01cbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChub2RlKTtcbiAgICAgIH07XG4gICAgICByZXR1cm4gZDMuc2VsZWN0KG5vZGUpO1xuICAgIH1cblxuICAgIC8vIFByaXZhdGUgLSBnZXRzIHRoZSBzY3JlZW4gY29vcmRpbmF0ZXMgb2YgYSBzaGFwZVxuICAgIC8vXG4gICAgLy8gR2l2ZW4gYSBzaGFwZSBvbiB0aGUgc2NyZWVuLCB3aWxsIHJldHVybiBhbiBTVkdQb2ludCBmb3IgdGhlIGRpcmVjdGlvbnNcbiAgICAvLyBuKG5vcnRoKSwgcyhzb3V0aCksIGUoZWFzdCksIHcod2VzdCksIG5lKG5vcnRoZWFzdCksIHNlKHNvdXRoZWFzdCksIG53KG5vcnRod2VzdCksXG4gICAgLy8gc3coc291dGh3ZXN0KS5cbiAgICAvL1xuICAgIC8vICAgICstKy0rXG4gICAgLy8gICAgfCAgIHxcbiAgICAvLyAgICArICAgK1xuICAgIC8vICAgIHwgICB8XG4gICAgLy8gICAgKy0rLStcbiAgICAvL1xuICAgIC8vIFJldHVybnMgYW4gT2JqZWN0IHtuLCBzLCBlLCB3LCBudywgc3csIG5lLCBzZX1cbiAgICBmdW5jdGlvbiBnZXRTY3JlZW5CQm94KCkge1xuICAgICAgdmFyIHRhcmdldGVsICAgPSB0YXJnZXQgfHwgZDMuZXZlbnQudGFyZ2V0O1xuICAgICAgY29uc29sZS5sb2codGFyZ2V0ZWwpO1xuICAgICAgZnVuY3Rpb24gdHJ5QkJveCgpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHRhcmdldGVsLmdldEJCb3goKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgdGFyZ2V0ZWwgPSB0YXJnZXRlbC5wYXJlbnROb2RlO1xuICAgICAgICAgIHRyeUJCb3goKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdHJ5QkJveCgpO1xuICAgICAgd2hpbGUgKCd1bmRlZmluZWQnID09PSB0eXBlb2YgdGFyZ2V0ZWwuZ2V0U2NyZWVuQ1RNICl7Ly8gJiYgJ3VuZGVmaW5lZCcgPT09IHRhcmdldGVsLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICB0YXJnZXRlbCA9IHRhcmdldGVsLnBhcmVudE5vZGU7XG4gICAgICB9XG4gICAgICBjb25zb2xlLmxvZyh0YXJnZXRlbCk7XG4gICAgICB2YXIgYmJveCAgICAgICA9IHt9LFxuICAgICAgICAgIG1hdHJpeCAgICAgPSB0YXJnZXRlbC5nZXRTY3JlZW5DVE0oKSxcbiAgICAgICAgICB0YmJveCAgICAgID0gdGFyZ2V0ZWwuZ2V0QkJveCgpLFxuICAgICAgICAgIHdpZHRoICAgICAgPSB0YmJveC53aWR0aCxcbiAgICAgICAgICBoZWlnaHQgICAgID0gdGJib3guaGVpZ2h0LFxuICAgICAgICAgIHggICAgICAgICAgPSB0YmJveC54LFxuICAgICAgICAgIHkgICAgICAgICAgPSB0YmJveC55XG5cbiAgICAgIHBvaW50LnggPSB4XG4gICAgICBwb2ludC55ID0geVxuICAgICAgYmJveC5udyA9IHBvaW50Lm1hdHJpeFRyYW5zZm9ybShtYXRyaXgpXG4gICAgICBwb2ludC54ICs9IHdpZHRoXG4gICAgICBiYm94Lm5lID0gcG9pbnQubWF0cml4VHJhbnNmb3JtKG1hdHJpeClcbiAgICAgIHBvaW50LnkgKz0gaGVpZ2h0XG4gICAgICBiYm94LnNlID0gcG9pbnQubWF0cml4VHJhbnNmb3JtKG1hdHJpeClcbiAgICAgIHBvaW50LnggLT0gd2lkdGhcbiAgICAgIGJib3guc3cgPSBwb2ludC5tYXRyaXhUcmFuc2Zvcm0obWF0cml4KVxuICAgICAgcG9pbnQueSAtPSBoZWlnaHQgLyAyXG4gICAgICBiYm94LncgID0gcG9pbnQubWF0cml4VHJhbnNmb3JtKG1hdHJpeClcbiAgICAgIHBvaW50LnggKz0gd2lkdGhcbiAgICAgIGJib3guZSA9IHBvaW50Lm1hdHJpeFRyYW5zZm9ybShtYXRyaXgpXG4gICAgICBwb2ludC54IC09IHdpZHRoIC8gMlxuICAgICAgcG9pbnQueSAtPSBoZWlnaHQgLyAyXG4gICAgICBiYm94Lm4gPSBwb2ludC5tYXRyaXhUcmFuc2Zvcm0obWF0cml4KVxuICAgICAgcG9pbnQueSArPSBoZWlnaHRcbiAgICAgIGJib3gucyA9IHBvaW50Lm1hdHJpeFRyYW5zZm9ybShtYXRyaXgpXG5cbiAgICAgIHJldHVybiBiYm94XG4gICAgfVxuXG4gICAgcmV0dXJuIHRpcFxuICB9O1xufSkoKTsiLCIvKipcbiAqIE1hcFZhbHVlcyAgXG4gKiBDb3B5cmlnaHQoYykgMjAxNywgSm9obiBPc3Rlcm1hblxuICpcbiAqIE1JVCBMaWNlbnNlXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBcbiAqIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyBcbiAqIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBcbiAqIGZvbGxvd2luZyBjb25kaXRpb25zOlxuXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIFxuICogTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIFxuICogRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIFxuICogSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgXG4gKiBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuICovXG4gXG4gLyogcG9vciBtYW4ncyBwb2x5ZmlsbCBmb3IgTWFwLnZhbHVlcygpLiBzaW1wbHkgcmV0dXJucyBhbiBhcnJheSBvZiB0aGUgdmFsdWVzLiBDYW5ub3QgZ3VhcmFudGVlIGl0IHByZXNlcnZlc1xuICAqIGluc2VydGlvbiBvcmRlciBvciB0aGF0IGl0IHdpbGwgaGFuZGxlIGFsbCBwcm9wZXJ0eSBvciB2YWx1ZSB0eXBlcy4gYWxtb3N0IGNlcnRhaW5seSBub3QgZXF1aXZhbGVudCB0byBuYXRpdmVcbiAgKiBwcm90b3R5cGUgXG4gICovXG5cbmV4cG9ydCBjb25zdCBNYXBWYWx1ZXMgPSAoZnVuY3Rpb24oKXtcbiAgTWFwLnByb3RvdHlwZS52YWx1ZXMgPSBNYXAucHJvdG90eXBlLnZhbHVlcyB8fCBmdW5jdGlvbigpe1xuICAgIHZhciBhcnJheSA9IFtdO1xuICAgIHRoaXMuZm9yRWFjaChmdW5jdGlvbihlYWNoKXtcbiAgICAgIGFycmF5LnB1c2goZWFjaCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIGFycmF5O1xuICB9O1xufSkoKTtcblxuLyoqXG4gKiBTVkcgZm9jdXMgXG4gKiBDb3B5cmlnaHQoYykgMjAxNywgSm9obiBPc3Rlcm1hblxuICpcbiAqIE1JVCBMaWNlbnNlXG4gKlxuICogUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGEgY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBcbiAqIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZyBcbiAqIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgXG4gKiBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0IHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZSBcbiAqIGZvbGxvd2luZyBjb25kaXRpb25zOlxuXG4gKiBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIFxuICogTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRiBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIFxuICogRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIFxuICogSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEUgXG4gKiBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuICovXG5cbiAvLyBJRS9FZGdlIChwZXJoYXBzIG90aGVycykgZG9lcyBub3QgYWxsb3cgcHJvZ3JhbW1hdGljIGZvY3VzaW5nIG9mIFNWRyBFbGVtZW50cyAodmlhIGBmb2N1cygpYCkuIFNhbWUgZm9yIGBibHVyKClgLlxuXG4gZXhwb3J0IGNvbnN0IFNWR0ZvY3VzID0gKGZ1bmN0aW9uKCl7XG4gICAgaWYgKCAnZm9jdXMnIGluIFNWR0VsZW1lbnQucHJvdG90eXBlID09PSBmYWxzZSApIHtcbiAgICAgIFNWR0VsZW1lbnQucHJvdG90eXBlLmZvY3VzID0gSFRNTEVsZW1lbnQucHJvdG90eXBlLmZvY3VzO1xuICAgIH1cbiAgICBpZiAoICdibHVyJyBpbiBTVkdFbGVtZW50LnByb3RvdHlwZSA9PT0gZmFsc2UgKSB7XG4gICAgICBTVkdFbGVtZW50LnByb3RvdHlwZS5ibHVyID0gSFRNTEVsZW1lbnQucHJvdG90eXBlLmJsdXI7XG4gICAgfVxuIH0pKCk7XG5cblxuXG5cbi8qKlxuICogaW5uZXJIVE1MIHByb3BlcnR5IGZvciBTVkdFbGVtZW50XG4gKiBDb3B5cmlnaHQoYykgMjAxMCwgSmVmZiBTY2hpbGxlclxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyXG4gKlxuICogV29ya3MgaW4gYSBTVkcgZG9jdW1lbnQgaW4gQ2hyb21lIDYrLCBTYWZhcmkgNSssIEZpcmVmb3ggNCsgYW5kIElFOSsuXG4gKiBXb3JrcyBpbiBhIEhUTUw1IGRvY3VtZW50IGluIENocm9tZSA3KywgRmlyZWZveCA0KyBhbmQgSUU5Ky5cbiAqIERvZXMgbm90IHdvcmsgaW4gT3BlcmEgc2luY2UgaXQgZG9lc24ndCBzdXBwb3J0IHRoZSBTVkdFbGVtZW50IGludGVyZmFjZSB5ZXQuXG4gKlxuICogSSBoYXZlbid0IGRlY2lkZWQgb24gdGhlIGJlc3QgbmFtZSBmb3IgdGhpcyBwcm9wZXJ0eSAtIHRodXMgdGhlIGR1cGxpY2F0aW9uLlxuICovXG4vLyBlZGl0ZWQgYnkgSm9obiBPc3Rlcm1hbiB0byBkZWNsYXJlIHRoZSB2YXJpYWJsZSBgc1hNTGAsIHdoaWNoIHdhcyByZWZlcmVuY2VkIHdpdGhvdXQgYmVpbmcgZGVjbGFyZWRcbi8vIHdoaWNoIGZhaWxlZCBzaWxlbnRseSBpbiBpbXBsaWNpdCBzdHJpY3QgbW9kZSBvZiBhbiBleHBvcnRcblxuLy8gbW9zdCBicm93c2VycyBhbGxvdyBzZXR0aW5nIGlubmVySFRNTCBvZiBzdmcgZWxlbWVudHMgYnV0IElFIGRvZXMgbm90IChub3QgYW4gSFRNTCBlbGVtZW50KVxuLy8gdGhpcyBwb2x5ZmlsbCBwcm92aWRlcyB0aGF0LiBuZWNlc3NhcnkgZm9yIGQzIG1ldGhvZCBgLmh0bWwoKWAgb24gc3ZnIGVsZW1lbnRzXG5cbmV4cG9ydCBjb25zdCBTVkdJbm5lckhUTUwgPSAoZnVuY3Rpb24oKSB7XG4gIHZhciBzZXJpYWxpemVYTUwgPSBmdW5jdGlvbihub2RlLCBvdXRwdXQpIHtcbiAgICB2YXIgbm9kZVR5cGUgPSBub2RlLm5vZGVUeXBlO1xuICAgIGlmIChub2RlVHlwZSA9PSAzKSB7IC8vIFRFWFQgbm9kZXMuXG4gICAgICAvLyBSZXBsYWNlIHNwZWNpYWwgWE1MIGNoYXJhY3RlcnMgd2l0aCB0aGVpciBlbnRpdGllcy5cbiAgICAgIG91dHB1dC5wdXNoKG5vZGUudGV4dENvbnRlbnQucmVwbGFjZSgvJi8sICcmYW1wOycpLnJlcGxhY2UoLzwvLCAnJmx0OycpLnJlcGxhY2UoJz4nLCAnJmd0OycpKTtcbiAgICB9IGVsc2UgaWYgKG5vZGVUeXBlID09IDEpIHsgLy8gRUxFTUVOVCBub2Rlcy5cbiAgICAgIC8vIFNlcmlhbGl6ZSBFbGVtZW50IG5vZGVzLlxuICAgICAgb3V0cHV0LnB1c2goJzwnLCBub2RlLnRhZ05hbWUpO1xuICAgICAgaWYgKG5vZGUuaGFzQXR0cmlidXRlcygpKSB7XG4gICAgICAgIHZhciBhdHRyTWFwID0gbm9kZS5hdHRyaWJ1dGVzO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gYXR0ck1hcC5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgICAgICAgIHZhciBhdHRyTm9kZSA9IGF0dHJNYXAuaXRlbShpKTtcbiAgICAgICAgICBvdXRwdXQucHVzaCgnICcsIGF0dHJOb2RlLm5hbWUsICc9XFwnJywgYXR0ck5vZGUudmFsdWUsICdcXCcnKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgaWYgKG5vZGUuaGFzQ2hpbGROb2RlcygpKSB7XG4gICAgICAgIG91dHB1dC5wdXNoKCc+Jyk7XG4gICAgICAgIHZhciBjaGlsZE5vZGVzID0gbm9kZS5jaGlsZE5vZGVzO1xuICAgICAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gY2hpbGROb2Rlcy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgICAgICAgIHNlcmlhbGl6ZVhNTChjaGlsZE5vZGVzLml0ZW0oaSksIG91dHB1dCk7XG4gICAgICAgIH1cbiAgICAgICAgb3V0cHV0LnB1c2goJzwvJywgbm9kZS50YWdOYW1lLCAnPicpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgb3V0cHV0LnB1c2goJy8+Jyk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChub2RlVHlwZSA9PSA4KSB7XG4gICAgICAvLyBUT0RPKGNvZGVkcmVhZCk6IFJlcGxhY2Ugc3BlY2lhbCBjaGFyYWN0ZXJzIHdpdGggWE1MIGVudGl0aWVzP1xuICAgICAgb3V0cHV0LnB1c2goJzwhLS0nLCBub2RlLm5vZGVWYWx1ZSwgJy0tPicpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBUT0RPOiBIYW5kbGUgQ0RBVEEgbm9kZXMuXG4gICAgICAvLyBUT0RPOiBIYW5kbGUgRU5USVRZIG5vZGVzLlxuICAgICAgLy8gVE9ETzogSGFuZGxlIERPQ1VNRU5UIG5vZGVzLlxuICAgICAgdGhyb3cgJ0Vycm9yIHNlcmlhbGl6aW5nIFhNTC4gVW5oYW5kbGVkIG5vZGUgb2YgdHlwZTogJyArIG5vZGVUeXBlO1xuICAgIH1cbiAgfVxuICAvLyBUaGUgaW5uZXJIVE1MIERPTSBwcm9wZXJ0eSBmb3IgU1ZHRWxlbWVudC5cbiAgaWYgKCAnaW5uZXJIVE1MJyBpbiBTVkdFbGVtZW50LnByb3RvdHlwZSA9PT0gZmFsc2UgKXtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoU1ZHRWxlbWVudC5wcm90b3R5cGUsICdpbm5lckhUTUwnLCB7XG4gICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICB2YXIgb3V0cHV0ID0gW107XG4gICAgICAgIHZhciBjaGlsZE5vZGUgPSB0aGlzLmZpcnN0Q2hpbGQ7XG4gICAgICAgIHdoaWxlIChjaGlsZE5vZGUpIHtcbiAgICAgICAgICBzZXJpYWxpemVYTUwoY2hpbGROb2RlLCBvdXRwdXQpO1xuICAgICAgICAgIGNoaWxkTm9kZSA9IGNoaWxkTm9kZS5uZXh0U2libGluZztcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gb3V0cHV0LmpvaW4oJycpO1xuICAgICAgfSxcbiAgICAgIHNldDogZnVuY3Rpb24obWFya3VwVGV4dCkge1xuICAgICAgICBjb25zb2xlLmxvZyh0aGlzKTtcbiAgICAgICAgLy8gV2lwZSBvdXQgdGhlIGN1cnJlbnQgY29udGVudHMgb2YgdGhlIGVsZW1lbnQuXG4gICAgICAgIHdoaWxlICh0aGlzLmZpcnN0Q2hpbGQpIHtcbiAgICAgICAgICB0aGlzLnJlbW92ZUNoaWxkKHRoaXMuZmlyc3RDaGlsZCk7XG4gICAgICAgIH1cblxuICAgICAgICB0cnkge1xuICAgICAgICAgIC8vIFBhcnNlIHRoZSBtYXJrdXAgaW50byB2YWxpZCBub2Rlcy5cbiAgICAgICAgICB2YXIgZFhNTCA9IG5ldyBET01QYXJzZXIoKTtcbiAgICAgICAgICBkWE1MLmFzeW5jID0gZmFsc2U7XG4gICAgICAgICAgLy8gV3JhcCB0aGUgbWFya3VwIGludG8gYSBTVkcgbm9kZSB0byBlbnN1cmUgcGFyc2luZyB3b3Jrcy5cbiAgICAgICAgICBjb25zb2xlLmxvZyhtYXJrdXBUZXh0KTtcbiAgICAgICAgICB2YXIgc1hNTCA9ICc8c3ZnIHhtbG5zPVwiaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmdcIj4nICsgbWFya3VwVGV4dCArICc8L3N2Zz4nO1xuICAgICAgICAgIGNvbnNvbGUubG9nKHNYTUwpO1xuICAgICAgICAgIHZhciBzdmdEb2NFbGVtZW50ID0gZFhNTC5wYXJzZUZyb21TdHJpbmcoc1hNTCwgJ3RleHQveG1sJykuZG9jdW1lbnRFbGVtZW50O1xuXG4gICAgICAgICAgLy8gTm93IHRha2UgZWFjaCBub2RlLCBpbXBvcnQgaXQgYW5kIGFwcGVuZCB0byB0aGlzIGVsZW1lbnQuXG4gICAgICAgICAgdmFyIGNoaWxkTm9kZSA9IHN2Z0RvY0VsZW1lbnQuZmlyc3RDaGlsZDtcbiAgICAgICAgICB3aGlsZShjaGlsZE5vZGUpIHtcbiAgICAgICAgICAgIHRoaXMuYXBwZW5kQ2hpbGQodGhpcy5vd25lckRvY3VtZW50LmltcG9ydE5vZGUoY2hpbGROb2RlLCB0cnVlKSk7XG4gICAgICAgICAgICBjaGlsZE5vZGUgPSBjaGlsZE5vZGUubmV4dFNpYmxpbmc7XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoKGUpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Vycm9yIHBhcnNpbmcgWE1MIHN0cmluZycpO1xuICAgICAgICB9O1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgLy8gVGhlIGlubmVyU1ZHIERPTSBwcm9wZXJ0eSBmb3IgU1ZHRWxlbWVudC5cbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoU1ZHRWxlbWVudC5wcm90b3R5cGUsICdpbm5lclNWRycsIHtcbiAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmlubmVySFRNTDtcbiAgICAgIH0sXG4gICAgICBzZXQ6IGZ1bmN0aW9uKG1hcmt1cFRleHQpIHtcbiAgICAgICAgdGhpcy5pbm5lckhUTUwgPSBtYXJrdXBUZXh0O1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59KSgpO1xuXG5cbi8vIGh0dHBzOi8vdGMzOS5naXRodWIuaW8vZWNtYTI2Mi8jc2VjLWFycmF5LnByb3RvdHlwZS5maW5kXG5leHBvcnQgY29uc3QgYXJyYXlGaW5kID0gKGZ1bmN0aW9uKCl7XG4gIGlmICghQXJyYXkucHJvdG90eXBlLmZpbmQpIHtcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoQXJyYXkucHJvdG90eXBlLCAnZmluZCcsIHtcbiAgICAgIHZhbHVlOiBmdW5jdGlvbihwcmVkaWNhdGUpIHtcbiAgICAgICAvLyAxLiBMZXQgTyBiZSA/IFRvT2JqZWN0KHRoaXMgdmFsdWUpLlxuICAgICAgICBpZiAodGhpcyA9PSBudWxsKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignXCJ0aGlzXCIgaXMgbnVsbCBvciBub3QgZGVmaW5lZCcpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIG8gPSBPYmplY3QodGhpcyk7XG5cbiAgICAgICAgLy8gMi4gTGV0IGxlbiBiZSA/IFRvTGVuZ3RoKD8gR2V0KE8sIFwibGVuZ3RoXCIpKS5cbiAgICAgICAgdmFyIGxlbiA9IG8ubGVuZ3RoID4+PiAwO1xuXG4gICAgICAgIC8vIDMuIElmIElzQ2FsbGFibGUocHJlZGljYXRlKSBpcyBmYWxzZSwgdGhyb3cgYSBUeXBlRXJyb3IgZXhjZXB0aW9uLlxuICAgICAgICBpZiAodHlwZW9mIHByZWRpY2F0ZSAhPT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ3ByZWRpY2F0ZSBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIDQuIElmIHRoaXNBcmcgd2FzIHN1cHBsaWVkLCBsZXQgVCBiZSB0aGlzQXJnOyBlbHNlIGxldCBUIGJlIHVuZGVmaW5lZC5cbiAgICAgICAgdmFyIHRoaXNBcmcgPSBhcmd1bWVudHNbMV07XG5cbiAgICAgICAgLy8gNS4gTGV0IGsgYmUgMC5cbiAgICAgICAgdmFyIGsgPSAwO1xuXG4gICAgICAgIC8vIDYuIFJlcGVhdCwgd2hpbGUgayA8IGxlblxuICAgICAgICB3aGlsZSAoayA8IGxlbikge1xuICAgICAgICAgIC8vIGEuIExldCBQayBiZSAhIFRvU3RyaW5nKGspLlxuICAgICAgICAgIC8vIGIuIExldCBrVmFsdWUgYmUgPyBHZXQoTywgUGspLlxuICAgICAgICAgIC8vIGMuIExldCB0ZXN0UmVzdWx0IGJlIFRvQm9vbGVhbig/IENhbGwocHJlZGljYXRlLCBULCDCqyBrVmFsdWUsIGssIE8gwrspKS5cbiAgICAgICAgICAvLyBkLiBJZiB0ZXN0UmVzdWx0IGlzIHRydWUsIHJldHVybiBrVmFsdWUuXG4gICAgICAgICAgdmFyIGtWYWx1ZSA9IG9ba107XG4gICAgICAgICAgaWYgKHByZWRpY2F0ZS5jYWxsKHRoaXNBcmcsIGtWYWx1ZSwgaywgbykpIHtcbiAgICAgICAgICAgIHJldHVybiBrVmFsdWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIGUuIEluY3JlYXNlIGsgYnkgMS5cbiAgICAgICAgICBrKys7XG4gICAgICAgIH1cblxuICAgICAgICAvLyA3LiBSZXR1cm4gdW5kZWZpbmVkLlxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59KSgpOyBcblxuLy8gQ29weXJpZ2h0IChDKSAyMDExLTIwMTIgU29mdHdhcmUgTGFuZ3VhZ2VzIExhYiwgVnJpamUgVW5pdmVyc2l0ZWl0IEJydXNzZWxcbi8vIFRoaXMgY29kZSBpcyBkdWFsLWxpY2Vuc2VkIHVuZGVyIGJvdGggdGhlIEFwYWNoZSBMaWNlbnNlIGFuZCB0aGUgTVBMXG5cbi8vIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4vLyB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4vLyBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbi8vXG4vLyBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbi8vXG4vLyBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4vLyBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4vLyBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbi8vIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbi8vIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuXG4vKiBWZXJzaW9uOiBNUEwgMS4xXG4gKlxuICogVGhlIGNvbnRlbnRzIG9mIHRoaXMgZmlsZSBhcmUgc3ViamVjdCB0byB0aGUgTW96aWxsYSBQdWJsaWMgTGljZW5zZSBWZXJzaW9uXG4gKiAxLjEgKHRoZSBcIkxpY2Vuc2VcIik7IHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aFxuICogdGhlIExpY2Vuc2UuIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICogaHR0cDovL3d3dy5tb3ppbGxhLm9yZy9NUEwvXG4gKlxuICogU29mdHdhcmUgZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIGJhc2lzLFxuICogV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC4gU2VlIHRoZSBMaWNlbnNlXG4gKiBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyByaWdodHMgYW5kIGxpbWl0YXRpb25zIHVuZGVyIHRoZVxuICogTGljZW5zZS5cbiAqXG4gKiBUaGUgT3JpZ2luYWwgQ29kZSBpcyBhIHNoaW0gZm9yIHRoZSBFUy1IYXJtb255IHJlZmxlY3Rpb24gbW9kdWxlXG4gKlxuICogVGhlIEluaXRpYWwgRGV2ZWxvcGVyIG9mIHRoZSBPcmlnaW5hbCBDb2RlIGlzXG4gKiBUb20gVmFuIEN1dHNlbSwgVnJpamUgVW5pdmVyc2l0ZWl0IEJydXNzZWwuXG4gKiBQb3J0aW9ucyBjcmVhdGVkIGJ5IHRoZSBJbml0aWFsIERldmVsb3BlciBhcmUgQ29weXJpZ2h0IChDKSAyMDExLTIwMTJcbiAqIHRoZSBJbml0aWFsIERldmVsb3Blci4gQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBDb250cmlidXRvcihzKTpcbiAqXG4gKi9cblxuIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuIC8vIFRoaXMgZmlsZSBpcyBhIHBvbHlmaWxsIGZvciB0aGUgdXBjb21pbmcgRUNNQVNjcmlwdCBSZWZsZWN0IEFQSSxcbiAvLyBpbmNsdWRpbmcgc3VwcG9ydCBmb3IgUHJveGllcy4gU2VlIHRoZSBkcmFmdCBzcGVjaWZpY2F0aW9uIGF0OlxuIC8vIGh0dHA6Ly93aWtpLmVjbWFzY3JpcHQub3JnL2Rva3UucGhwP2lkPWhhcm1vbnk6cmVmbGVjdF9hcGlcbiAvLyBodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1oYXJtb255OmRpcmVjdF9wcm94aWVzXG5cbiAvLyBGb3IgYW4gaW1wbGVtZW50YXRpb24gb2YgdGhlIEhhbmRsZXIgQVBJLCBzZWUgaGFuZGxlcnMuanMsIHdoaWNoIGltcGxlbWVudHM6XG4gLy8gaHR0cDovL3dpa2kuZWNtYXNjcmlwdC5vcmcvZG9rdS5waHA/aWQ9aGFybW9ueTp2aXJ0dWFsX29iamVjdF9hcGlcblxuIC8vIFRoaXMgaW1wbGVtZW50YXRpb24gc3VwZXJzZWRlcyB0aGUgZWFybGllciBwb2x5ZmlsbCBhdDpcbiAvLyBjb2RlLmdvb2dsZS5jb20vcC9lcy1sYWIvc291cmNlL2Jyb3dzZS90cnVuay9zcmMvcHJveGllcy9EaXJlY3RQcm94aWVzLmpzXG5cbiAvLyBUaGlzIGNvZGUgd2FzIHRlc3RlZCBvbiB0cmFjZW1vbmtleSAvIEZpcmVmb3ggMTJcbi8vICAoYW5kIHNob3VsZCBydW4gZmluZSBvbiBvbGRlciBGaXJlZm94IHZlcnNpb25zIHN0YXJ0aW5nIHdpdGggRkY0KVxuIC8vIFRoZSBjb2RlIGFsc28gd29ya3MgY29ycmVjdGx5IG9uXG4gLy8gICB2OCAtLWhhcm1vbnlfcHJveGllcyAtLWhhcm1vbnlfd2Vha21hcHMgKHYzLjYuNS4xKVxuXG4gLy8gTGFuZ3VhZ2UgRGVwZW5kZW5jaWVzOlxuIC8vICAtIEVDTUFTY3JpcHQgNS9zdHJpY3RcbiAvLyAgLSBcIm9sZFwiIChpLmUuIG5vbi1kaXJlY3QpIEhhcm1vbnkgUHJveGllc1xuIC8vICAtIEhhcm1vbnkgV2Vha01hcHNcbiAvLyBQYXRjaGVzOlxuIC8vICAtIE9iamVjdC57ZnJlZXplLHNlYWwscHJldmVudEV4dGVuc2lvbnN9XG4gLy8gIC0gT2JqZWN0Lntpc0Zyb3plbixpc1NlYWxlZCxpc0V4dGVuc2libGV9XG4gLy8gIC0gT2JqZWN0LmdldFByb3RvdHlwZU9mXG4gLy8gIC0gT2JqZWN0LmtleXNcbiAvLyAgLSBPYmplY3QucHJvdG90eXBlLnZhbHVlT2ZcbiAvLyAgLSBPYmplY3QucHJvdG90eXBlLmlzUHJvdG90eXBlT2ZcbiAvLyAgLSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nXG4gLy8gIC0gT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eVxuIC8vICAtIE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JcbiAvLyAgLSBPYmplY3QuZGVmaW5lUHJvcGVydHlcbiAvLyAgLSBPYmplY3QuZGVmaW5lUHJvcGVydGllc1xuIC8vICAtIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzXG4gLy8gIC0gT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9sc1xuIC8vICAtIE9iamVjdC5nZXRQcm90b3R5cGVPZlxuIC8vICAtIE9iamVjdC5zZXRQcm90b3R5cGVPZlxuIC8vICAtIE9iamVjdC5hc3NpZ25cbiAvLyAgLSBGdW5jdGlvbi5wcm90b3R5cGUudG9TdHJpbmdcbiAvLyAgLSBEYXRlLnByb3RvdHlwZS50b1N0cmluZ1xuIC8vICAtIEFycmF5LmlzQXJyYXlcbiAvLyAgLSBBcnJheS5wcm90b3R5cGUuY29uY2F0XG4gLy8gIC0gUHJveHlcbiAvLyBBZGRzIG5ldyBnbG9iYWxzOlxuIC8vICAtIFJlZmxlY3RcblxuIC8vIERpcmVjdCBwcm94aWVzIGNhbiBiZSBjcmVhdGVkIHZpYSBQcm94eSh0YXJnZXQsIGhhbmRsZXIpXG5cbiAvLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbmV4cG9ydCBjb25zdCByZWZsZWN0ID0gKGZ1bmN0aW9uKGdsb2JhbCl7IC8vIGZ1bmN0aW9uLWFzLW1vZHVsZSBwYXR0ZXJuXG5cInVzZSBzdHJpY3RcIjtcbiBcbi8vID09PSBEaXJlY3QgUHJveGllczogSW52YXJpYW50IEVuZm9yY2VtZW50ID09PVxuXG4vLyBEaXJlY3QgcHJveGllcyBidWlsZCBvbiBub24tZGlyZWN0IHByb3hpZXMgYnkgYXV0b21hdGljYWxseSB3cmFwcGluZ1xuLy8gYWxsIHVzZXItZGVmaW5lZCBwcm94eSBoYW5kbGVycyBpbiBhIFZhbGlkYXRvciBoYW5kbGVyIHRoYXQgY2hlY2tzIGFuZFxuLy8gZW5mb3JjZXMgRVM1IGludmFyaWFudHMuXG5cbi8vIEEgZGlyZWN0IHByb3h5IGlzIGEgcHJveHkgZm9yIGFuIGV4aXN0aW5nIG9iamVjdCBjYWxsZWQgdGhlIHRhcmdldCBvYmplY3QuXG5cbi8vIEEgVmFsaWRhdG9yIGhhbmRsZXIgaXMgYSB3cmFwcGVyIGZvciBhIHRhcmdldCBwcm94eSBoYW5kbGVyIEguXG4vLyBUaGUgVmFsaWRhdG9yIGZvcndhcmRzIGFsbCBvcGVyYXRpb25zIHRvIEgsIGJ1dCBhZGRpdGlvbmFsbHlcbi8vIHBlcmZvcm1zIGEgbnVtYmVyIG9mIGludGVncml0eSBjaGVja3Mgb24gdGhlIHJlc3VsdHMgb2Ygc29tZSB0cmFwcyxcbi8vIHRvIG1ha2Ugc3VyZSBIIGRvZXMgbm90IHZpb2xhdGUgdGhlIEVTNSBpbnZhcmlhbnRzIHcuci50LiBub24tY29uZmlndXJhYmxlXG4vLyBwcm9wZXJ0aWVzIGFuZCBub24tZXh0ZW5zaWJsZSwgc2VhbGVkIG9yIGZyb3plbiBvYmplY3RzLlxuXG4vLyBGb3IgZWFjaCBwcm9wZXJ0eSB0aGF0IEggZXhwb3NlcyBhcyBvd24sIG5vbi1jb25maWd1cmFibGVcbi8vIChlLmcuIGJ5IHJldHVybmluZyBhIGRlc2NyaXB0b3IgZnJvbSBhIGNhbGwgdG8gZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKVxuLy8gdGhlIFZhbGlkYXRvciBoYW5kbGVyIGRlZmluZXMgdGhvc2UgcHJvcGVydGllcyBvbiB0aGUgdGFyZ2V0IG9iamVjdC5cbi8vIFdoZW4gdGhlIHByb3h5IGJlY29tZXMgbm9uLWV4dGVuc2libGUsIGFsc28gY29uZmlndXJhYmxlIG93biBwcm9wZXJ0aWVzXG4vLyBhcmUgY2hlY2tlZCBhZ2FpbnN0IHRoZSB0YXJnZXQuXG4vLyBXZSB3aWxsIGNhbGwgcHJvcGVydGllcyB0aGF0IGFyZSBkZWZpbmVkIG9uIHRoZSB0YXJnZXQgb2JqZWN0XG4vLyBcImZpeGVkIHByb3BlcnRpZXNcIi5cblxuLy8gV2Ugd2lsbCBuYW1lIGZpeGVkIG5vbi1jb25maWd1cmFibGUgcHJvcGVydGllcyBcInNlYWxlZCBwcm9wZXJ0aWVzXCIuXG4vLyBXZSB3aWxsIG5hbWUgZml4ZWQgbm9uLWNvbmZpZ3VyYWJsZSBub24td3JpdGFibGUgcHJvcGVydGllcyBcImZyb3plblxuLy8gcHJvcGVydGllc1wiLlxuXG4vLyBUaGUgVmFsaWRhdG9yIGhhbmRsZXIgdXBob2xkcyB0aGUgZm9sbG93aW5nIGludmFyaWFudHMgdy5yLnQuIG5vbi1jb25maWd1cmFiaWxpdHk6XG4vLyAtIGdldE93blByb3BlcnR5RGVzY3JpcHRvciBjYW5ub3QgcmVwb3J0IHNlYWxlZCBwcm9wZXJ0aWVzIGFzIG5vbi1leGlzdGVudFxuLy8gLSBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IgY2Fubm90IHJlcG9ydCBpbmNvbXBhdGlibGUgY2hhbmdlcyB0byB0aGVcbi8vICAgYXR0cmlidXRlcyBvZiBhIHNlYWxlZCBwcm9wZXJ0eSAoZS5nLiByZXBvcnRpbmcgYSBub24tY29uZmlndXJhYmxlXG4vLyAgIHByb3BlcnR5IGFzIGNvbmZpZ3VyYWJsZSwgb3IgcmVwb3J0aW5nIGEgbm9uLWNvbmZpZ3VyYWJsZSwgbm9uLXdyaXRhYmxlXG4vLyAgIHByb3BlcnR5IGFzIHdyaXRhYmxlKVxuLy8gLSBnZXRQcm9wZXJ0eURlc2NyaXB0b3IgY2Fubm90IHJlcG9ydCBzZWFsZWQgcHJvcGVydGllcyBhcyBub24tZXhpc3RlbnRcbi8vIC0gZ2V0UHJvcGVydHlEZXNjcmlwdG9yIGNhbm5vdCByZXBvcnQgaW5jb21wYXRpYmxlIGNoYW5nZXMgdG8gdGhlXG4vLyAgIGF0dHJpYnV0ZXMgb2YgYSBzZWFsZWQgcHJvcGVydHkuIEl0IF9jYW5fIHJlcG9ydCBpbmNvbXBhdGlibGUgY2hhbmdlc1xuLy8gICB0byB0aGUgYXR0cmlidXRlcyBvZiBub24tb3duLCBpbmhlcml0ZWQgcHJvcGVydGllcy5cbi8vIC0gZGVmaW5lUHJvcGVydHkgY2Fubm90IG1ha2UgaW5jb21wYXRpYmxlIGNoYW5nZXMgdG8gdGhlIGF0dHJpYnV0ZXMgb2Zcbi8vICAgc2VhbGVkIHByb3BlcnRpZXNcbi8vIC0gZGVsZXRlUHJvcGVydHkgY2Fubm90IHJlcG9ydCBhIHN1Y2Nlc3NmdWwgZGVsZXRpb24gb2YgYSBzZWFsZWQgcHJvcGVydHlcbi8vIC0gaGFzT3duIGNhbm5vdCByZXBvcnQgYSBzZWFsZWQgcHJvcGVydHkgYXMgbm9uLWV4aXN0ZW50XG4vLyAtIGhhcyBjYW5ub3QgcmVwb3J0IGEgc2VhbGVkIHByb3BlcnR5IGFzIG5vbi1leGlzdGVudFxuLy8gLSBnZXQgY2Fubm90IHJlcG9ydCBpbmNvbnNpc3RlbnQgdmFsdWVzIGZvciBmcm96ZW4gZGF0YVxuLy8gICBwcm9wZXJ0aWVzLCBhbmQgbXVzdCByZXBvcnQgdW5kZWZpbmVkIGZvciBzZWFsZWQgYWNjZXNzb3JzIHdpdGggYW5cbi8vICAgdW5kZWZpbmVkIGdldHRlclxuLy8gLSBzZXQgY2Fubm90IHJlcG9ydCBhIHN1Y2Nlc3NmdWwgYXNzaWdubWVudCBmb3IgZnJvemVuIGRhdGFcbi8vICAgcHJvcGVydGllcyBvciBzZWFsZWQgYWNjZXNzb3JzIHdpdGggYW4gdW5kZWZpbmVkIHNldHRlci5cbi8vIC0gZ2V0e093bn1Qcm9wZXJ0eU5hbWVzIGxpc3RzIGFsbCBzZWFsZWQgcHJvcGVydGllcyBvZiB0aGUgdGFyZ2V0LlxuLy8gLSBrZXlzIGxpc3RzIGFsbCBlbnVtZXJhYmxlIHNlYWxlZCBwcm9wZXJ0aWVzIG9mIHRoZSB0YXJnZXQuXG4vLyAtIGVudW1lcmF0ZSBsaXN0cyBhbGwgZW51bWVyYWJsZSBzZWFsZWQgcHJvcGVydGllcyBvZiB0aGUgdGFyZ2V0LlxuLy8gLSBpZiBhIHByb3BlcnR5IG9mIGEgbm9uLWV4dGVuc2libGUgcHJveHkgaXMgcmVwb3J0ZWQgYXMgbm9uLWV4aXN0ZW50LFxuLy8gICB0aGVuIGl0IG11c3QgZm9yZXZlciBiZSByZXBvcnRlZCBhcyBub24tZXhpc3RlbnQuIFRoaXMgYXBwbGllcyB0b1xuLy8gICBvd24gYW5kIGluaGVyaXRlZCBwcm9wZXJ0aWVzIGFuZCBpcyBlbmZvcmNlZCBpbiB0aGVcbi8vICAgZGVsZXRlUHJvcGVydHksIGdldHtPd259UHJvcGVydHlEZXNjcmlwdG9yLCBoYXN7T3dufSxcbi8vICAgZ2V0e093bn1Qcm9wZXJ0eU5hbWVzLCBrZXlzIGFuZCBlbnVtZXJhdGUgdHJhcHNcblxuLy8gVmlvbGF0aW9uIG9mIGFueSBvZiB0aGVzZSBpbnZhcmlhbnRzIGJ5IEggd2lsbCByZXN1bHQgaW4gVHlwZUVycm9yIGJlaW5nXG4vLyB0aHJvd24uXG5cbi8vIEFkZGl0aW9uYWxseSwgb25jZSBPYmplY3QucHJldmVudEV4dGVuc2lvbnMsIE9iamVjdC5zZWFsIG9yIE9iamVjdC5mcmVlemVcbi8vIGlzIGludm9rZWQgb24gdGhlIHByb3h5LCB0aGUgc2V0IG9mIG93biBwcm9wZXJ0eSBuYW1lcyBmb3IgdGhlIHByb3h5IGlzXG4vLyBmaXhlZC4gQW55IHByb3BlcnR5IG5hbWUgdGhhdCBpcyBub3QgZml4ZWQgaXMgY2FsbGVkIGEgJ25ldycgcHJvcGVydHkuXG5cbi8vIFRoZSBWYWxpZGF0b3IgdXBob2xkcyB0aGUgZm9sbG93aW5nIGludmFyaWFudHMgcmVnYXJkaW5nIGV4dGVuc2liaWxpdHk6XG4vLyAtIGdldE93blByb3BlcnR5RGVzY3JpcHRvciBjYW5ub3QgcmVwb3J0IG5ldyBwcm9wZXJ0aWVzIGFzIGV4aXN0ZW50XG4vLyAgIChpdCBtdXN0IHJlcG9ydCB0aGVtIGFzIG5vbi1leGlzdGVudCBieSByZXR1cm5pbmcgdW5kZWZpbmVkKVxuLy8gLSBkZWZpbmVQcm9wZXJ0eSBjYW5ub3Qgc3VjY2Vzc2Z1bGx5IGFkZCBhIG5ldyBwcm9wZXJ0eSAoaXQgbXVzdCByZWplY3QpXG4vLyAtIGdldE93blByb3BlcnR5TmFtZXMgY2Fubm90IGxpc3QgbmV3IHByb3BlcnRpZXNcbi8vIC0gaGFzT3duIGNhbm5vdCByZXBvcnQgdHJ1ZSBmb3IgbmV3IHByb3BlcnRpZXMgKGl0IG11c3QgcmVwb3J0IGZhbHNlKVxuLy8gLSBrZXlzIGNhbm5vdCBsaXN0IG5ldyBwcm9wZXJ0aWVzXG5cbi8vIEludmFyaWFudHMgY3VycmVudGx5IG5vdCBlbmZvcmNlZDpcbi8vIC0gZ2V0T3duUHJvcGVydHlOYW1lcyBsaXN0cyBvbmx5IG93biBwcm9wZXJ0eSBuYW1lc1xuLy8gLSBrZXlzIGxpc3RzIG9ubHkgZW51bWVyYWJsZSBvd24gcHJvcGVydHkgbmFtZXNcbi8vIEJvdGggdHJhcHMgbWF5IGxpc3QgbW9yZSBwcm9wZXJ0eSBuYW1lcyB0aGFuIGFyZSBhY3R1YWxseSBkZWZpbmVkIG9uIHRoZVxuLy8gdGFyZ2V0LlxuXG4vLyBJbnZhcmlhbnRzIHdpdGggcmVnYXJkIHRvIGluaGVyaXRhbmNlIGFyZSBjdXJyZW50bHkgbm90IGVuZm9yY2VkLlxuLy8gLSBhIG5vbi1jb25maWd1cmFibGUgcG90ZW50aWFsbHkgaW5oZXJpdGVkIHByb3BlcnR5IG9uIGEgcHJveHkgd2l0aFxuLy8gICBub24tbXV0YWJsZSBhbmNlc3RyeSBjYW5ub3QgYmUgcmVwb3J0ZWQgYXMgbm9uLWV4aXN0ZW50XG4vLyAoQW4gb2JqZWN0IHdpdGggbm9uLW11dGFibGUgYW5jZXN0cnkgaXMgYSBub24tZXh0ZW5zaWJsZSBvYmplY3Qgd2hvc2Vcbi8vIFtbUHJvdG90eXBlXV0gaXMgZWl0aGVyIG51bGwgb3IgYW4gb2JqZWN0IHdpdGggbm9uLW11dGFibGUgYW5jZXN0cnkuKVxuXG4vLyBDaGFuZ2VzIGluIEhhbmRsZXIgQVBJIGNvbXBhcmVkIHRvIHByZXZpb3VzIGhhcm1vbnk6cHJveGllcywgc2VlOlxuLy8gaHR0cDovL3dpa2kuZWNtYXNjcmlwdC5vcmcvZG9rdS5waHA/aWQ9c3RyYXdtYW46ZGlyZWN0X3Byb3hpZXNcbi8vIGh0dHA6Ly93aWtpLmVjbWFzY3JpcHQub3JnL2Rva3UucGhwP2lkPWhhcm1vbnk6ZGlyZWN0X3Byb3hpZXNcblxuLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4vLyAtLS0tIFdlYWtNYXAgcG9seWZpbGwgLS0tLVxuXG4vLyBUT0RPOiBmaW5kIGEgcHJvcGVyIFdlYWtNYXAgcG9seWZpbGxcblxuLy8gZGVmaW5lIGFuIGVtcHR5IFdlYWtNYXAgc28gdGhhdCBhdCBsZWFzdCB0aGUgUmVmbGVjdCBtb2R1bGUgY29kZVxuLy8gd2lsbCB3b3JrIGluIHRoZSBhYnNlbmNlIG9mIFdlYWtNYXBzLiBQcm94eSBlbXVsYXRpb24gZGVwZW5kcyBvblxuLy8gYWN0dWFsIFdlYWtNYXBzLCBzbyB3aWxsIG5vdCB3b3JrIHdpdGggdGhpcyBsaXR0bGUgc2hpbS5cbmlmICh0eXBlb2YgV2Vha01hcCA9PT0gXCJ1bmRlZmluZWRcIikge1xuICBnbG9iYWwuV2Vha01hcCA9IGZ1bmN0aW9uKCl7fTtcbiAgZ2xvYmFsLldlYWtNYXAucHJvdG90eXBlID0ge1xuICAgIGdldDogZnVuY3Rpb24oaykgeyByZXR1cm4gdW5kZWZpbmVkOyB9LFxuICAgIHNldDogZnVuY3Rpb24oayx2KSB7IHRocm93IG5ldyBFcnJvcihcIldlYWtNYXAgbm90IHN1cHBvcnRlZFwiKTsgfVxuICB9O1xufVxuXG4vLyAtLS0tIE5vcm1hbGl6YXRpb24gZnVuY3Rpb25zIGZvciBwcm9wZXJ0eSBkZXNjcmlwdG9ycyAtLS0tXG5cbmZ1bmN0aW9uIGlzU3RhbmRhcmRBdHRyaWJ1dGUobmFtZSkge1xuICByZXR1cm4gL14oZ2V0fHNldHx2YWx1ZXx3cml0YWJsZXxlbnVtZXJhYmxlfGNvbmZpZ3VyYWJsZSkkLy50ZXN0KG5hbWUpO1xufVxuXG4vLyBBZGFwdGVkIGZyb20gRVM1IHNlY3Rpb24gOC4xMC41XG5mdW5jdGlvbiB0b1Byb3BlcnR5RGVzY3JpcHRvcihvYmopIHtcbiAgaWYgKE9iamVjdChvYmopICE9PSBvYmopIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwicHJvcGVydHkgZGVzY3JpcHRvciBzaG91bGQgYmUgYW4gT2JqZWN0LCBnaXZlbjogXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICBvYmopO1xuICB9XG4gIHZhciBkZXNjID0ge307XG4gIGlmICgnZW51bWVyYWJsZScgaW4gb2JqKSB7IGRlc2MuZW51bWVyYWJsZSA9ICEhb2JqLmVudW1lcmFibGU7IH1cbiAgaWYgKCdjb25maWd1cmFibGUnIGluIG9iaikgeyBkZXNjLmNvbmZpZ3VyYWJsZSA9ICEhb2JqLmNvbmZpZ3VyYWJsZTsgfVxuICBpZiAoJ3ZhbHVlJyBpbiBvYmopIHsgZGVzYy52YWx1ZSA9IG9iai52YWx1ZTsgfVxuICBpZiAoJ3dyaXRhYmxlJyBpbiBvYmopIHsgZGVzYy53cml0YWJsZSA9ICEhb2JqLndyaXRhYmxlOyB9XG4gIGlmICgnZ2V0JyBpbiBvYmopIHtcbiAgICB2YXIgZ2V0dGVyID0gb2JqLmdldDtcbiAgICBpZiAoZ2V0dGVyICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIGdldHRlciAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwicHJvcGVydHkgZGVzY3JpcHRvciAnZ2V0JyBhdHRyaWJ1dGUgbXVzdCBiZSBcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCJjYWxsYWJsZSBvciB1bmRlZmluZWQsIGdpdmVuOiBcIitnZXR0ZXIpO1xuICAgIH1cbiAgICBkZXNjLmdldCA9IGdldHRlcjtcbiAgfVxuICBpZiAoJ3NldCcgaW4gb2JqKSB7XG4gICAgdmFyIHNldHRlciA9IG9iai5zZXQ7XG4gICAgaWYgKHNldHRlciAhPT0gdW5kZWZpbmVkICYmIHR5cGVvZiBzZXR0ZXIgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcInByb3BlcnR5IGRlc2NyaXB0b3IgJ3NldCcgYXR0cmlidXRlIG11c3QgYmUgXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwiY2FsbGFibGUgb3IgdW5kZWZpbmVkLCBnaXZlbjogXCIrc2V0dGVyKTtcbiAgICB9XG4gICAgZGVzYy5zZXQgPSBzZXR0ZXI7XG4gIH1cbiAgaWYgKCdnZXQnIGluIGRlc2MgfHwgJ3NldCcgaW4gZGVzYykge1xuICAgIGlmICgndmFsdWUnIGluIGRlc2MgfHwgJ3dyaXRhYmxlJyBpbiBkZXNjKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwicHJvcGVydHkgZGVzY3JpcHRvciBjYW5ub3QgYmUgYm90aCBhIGRhdGEgYW5kIGFuIFwiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICBcImFjY2Vzc29yIGRlc2NyaXB0b3I6IFwiK29iaik7XG4gICAgfVxuICB9XG4gIHJldHVybiBkZXNjO1xufVxuXG5mdW5jdGlvbiBpc0FjY2Vzc29yRGVzY3JpcHRvcihkZXNjKSB7XG4gIGlmIChkZXNjID09PSB1bmRlZmluZWQpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuICgnZ2V0JyBpbiBkZXNjIHx8ICdzZXQnIGluIGRlc2MpO1xufVxuZnVuY3Rpb24gaXNEYXRhRGVzY3JpcHRvcihkZXNjKSB7XG4gIGlmIChkZXNjID09PSB1bmRlZmluZWQpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuICgndmFsdWUnIGluIGRlc2MgfHwgJ3dyaXRhYmxlJyBpbiBkZXNjKTtcbn1cbmZ1bmN0aW9uIGlzR2VuZXJpY0Rlc2NyaXB0b3IoZGVzYykge1xuICBpZiAoZGVzYyA9PT0gdW5kZWZpbmVkKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiAhaXNBY2Nlc3NvckRlc2NyaXB0b3IoZGVzYykgJiYgIWlzRGF0YURlc2NyaXB0b3IoZGVzYyk7XG59XG5cbmZ1bmN0aW9uIHRvQ29tcGxldGVQcm9wZXJ0eURlc2NyaXB0b3IoZGVzYykge1xuICB2YXIgaW50ZXJuYWxEZXNjID0gdG9Qcm9wZXJ0eURlc2NyaXB0b3IoZGVzYyk7XG4gIGlmIChpc0dlbmVyaWNEZXNjcmlwdG9yKGludGVybmFsRGVzYykgfHwgaXNEYXRhRGVzY3JpcHRvcihpbnRlcm5hbERlc2MpKSB7XG4gICAgaWYgKCEoJ3ZhbHVlJyBpbiBpbnRlcm5hbERlc2MpKSB7IGludGVybmFsRGVzYy52YWx1ZSA9IHVuZGVmaW5lZDsgfVxuICAgIGlmICghKCd3cml0YWJsZScgaW4gaW50ZXJuYWxEZXNjKSkgeyBpbnRlcm5hbERlc2Mud3JpdGFibGUgPSBmYWxzZTsgfVxuICB9IGVsc2Uge1xuICAgIGlmICghKCdnZXQnIGluIGludGVybmFsRGVzYykpIHsgaW50ZXJuYWxEZXNjLmdldCA9IHVuZGVmaW5lZDsgfVxuICAgIGlmICghKCdzZXQnIGluIGludGVybmFsRGVzYykpIHsgaW50ZXJuYWxEZXNjLnNldCA9IHVuZGVmaW5lZDsgfVxuICB9XG4gIGlmICghKCdlbnVtZXJhYmxlJyBpbiBpbnRlcm5hbERlc2MpKSB7IGludGVybmFsRGVzYy5lbnVtZXJhYmxlID0gZmFsc2U7IH1cbiAgaWYgKCEoJ2NvbmZpZ3VyYWJsZScgaW4gaW50ZXJuYWxEZXNjKSkgeyBpbnRlcm5hbERlc2MuY29uZmlndXJhYmxlID0gZmFsc2U7IH1cbiAgcmV0dXJuIGludGVybmFsRGVzYztcbn1cblxuZnVuY3Rpb24gaXNFbXB0eURlc2NyaXB0b3IoZGVzYykge1xuICByZXR1cm4gISgnZ2V0JyBpbiBkZXNjKSAmJlxuICAgICAgICAgISgnc2V0JyBpbiBkZXNjKSAmJlxuICAgICAgICAgISgndmFsdWUnIGluIGRlc2MpICYmXG4gICAgICAgICAhKCd3cml0YWJsZScgaW4gZGVzYykgJiZcbiAgICAgICAgICEoJ2VudW1lcmFibGUnIGluIGRlc2MpICYmXG4gICAgICAgICAhKCdjb25maWd1cmFibGUnIGluIGRlc2MpO1xufVxuXG5mdW5jdGlvbiBpc0VxdWl2YWxlbnREZXNjcmlwdG9yKGRlc2MxLCBkZXNjMikge1xuICByZXR1cm4gc2FtZVZhbHVlKGRlc2MxLmdldCwgZGVzYzIuZ2V0KSAmJlxuICAgICAgICAgc2FtZVZhbHVlKGRlc2MxLnNldCwgZGVzYzIuc2V0KSAmJlxuICAgICAgICAgc2FtZVZhbHVlKGRlc2MxLnZhbHVlLCBkZXNjMi52YWx1ZSkgJiZcbiAgICAgICAgIHNhbWVWYWx1ZShkZXNjMS53cml0YWJsZSwgZGVzYzIud3JpdGFibGUpICYmXG4gICAgICAgICBzYW1lVmFsdWUoZGVzYzEuZW51bWVyYWJsZSwgZGVzYzIuZW51bWVyYWJsZSkgJiZcbiAgICAgICAgIHNhbWVWYWx1ZShkZXNjMS5jb25maWd1cmFibGUsIGRlc2MyLmNvbmZpZ3VyYWJsZSk7XG59XG5cbi8vIGNvcGllZCBmcm9tIGh0dHA6Ly93aWtpLmVjbWFzY3JpcHQub3JnL2Rva3UucGhwP2lkPWhhcm1vbnk6ZWdhbFxuZnVuY3Rpb24gc2FtZVZhbHVlKHgsIHkpIHtcbiAgaWYgKHggPT09IHkpIHtcbiAgICAvLyAwID09PSAtMCwgYnV0IHRoZXkgYXJlIG5vdCBpZGVudGljYWxcbiAgICByZXR1cm4geCAhPT0gMCB8fCAxIC8geCA9PT0gMSAvIHk7XG4gIH1cblxuICAvLyBOYU4gIT09IE5hTiwgYnV0IHRoZXkgYXJlIGlkZW50aWNhbC5cbiAgLy8gTmFOcyBhcmUgdGhlIG9ubHkgbm9uLXJlZmxleGl2ZSB2YWx1ZSwgaS5lLiwgaWYgeCAhPT0geCxcbiAgLy8gdGhlbiB4IGlzIGEgTmFOLlxuICAvLyBpc05hTiBpcyBicm9rZW46IGl0IGNvbnZlcnRzIGl0cyBhcmd1bWVudCB0byBudW1iZXIsIHNvXG4gIC8vIGlzTmFOKFwiZm9vXCIpID0+IHRydWVcbiAgcmV0dXJuIHggIT09IHggJiYgeSAhPT0geTtcbn1cblxuLyoqXG4gKiBSZXR1cm5zIGEgZnJlc2ggcHJvcGVydHkgZGVzY3JpcHRvciB0aGF0IGlzIGd1YXJhbnRlZWRcbiAqIHRvIGJlIGNvbXBsZXRlIChpLmUuIGNvbnRhaW4gYWxsIHRoZSBzdGFuZGFyZCBhdHRyaWJ1dGVzKS5cbiAqIEFkZGl0aW9uYWxseSwgYW55IG5vbi1zdGFuZGFyZCBlbnVtZXJhYmxlIHByb3BlcnRpZXMgb2ZcbiAqIGF0dHJpYnV0ZXMgYXJlIGNvcGllZCBvdmVyIHRvIHRoZSBmcmVzaCBkZXNjcmlwdG9yLlxuICpcbiAqIElmIGF0dHJpYnV0ZXMgaXMgdW5kZWZpbmVkLCByZXR1cm5zIHVuZGVmaW5lZC5cbiAqXG4gKiBTZWUgYWxzbzogaHR0cDovL3dpa2kuZWNtYXNjcmlwdC5vcmcvZG9rdS5waHA/aWQ9aGFybW9ueTpwcm94aWVzX3NlbWFudGljc1xuICovXG5mdW5jdGlvbiBub3JtYWxpemVBbmRDb21wbGV0ZVByb3BlcnR5RGVzY3JpcHRvcihhdHRyaWJ1dGVzKSB7XG4gIGlmIChhdHRyaWJ1dGVzID09PSB1bmRlZmluZWQpIHsgcmV0dXJuIHVuZGVmaW5lZDsgfVxuICB2YXIgZGVzYyA9IHRvQ29tcGxldGVQcm9wZXJ0eURlc2NyaXB0b3IoYXR0cmlidXRlcyk7XG4gIC8vIE5vdGU6IG5vIG5lZWQgdG8gY2FsbCBGcm9tUHJvcGVydHlEZXNjcmlwdG9yKGRlc2MpLCBhcyB3ZSByZXByZXNlbnRcbiAgLy8gXCJpbnRlcm5hbFwiIHByb3BlcnR5IGRlc2NyaXB0b3JzIGFzIHByb3BlciBPYmplY3RzIGZyb20gdGhlIHN0YXJ0XG4gIGZvciAodmFyIG5hbWUgaW4gYXR0cmlidXRlcykge1xuICAgIGlmICghaXNTdGFuZGFyZEF0dHJpYnV0ZShuYW1lKSkge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGRlc2MsIG5hbWUsXG4gICAgICAgIHsgdmFsdWU6IGF0dHJpYnV0ZXNbbmFtZV0sXG4gICAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICBjb25maWd1cmFibGU6IHRydWUgfSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBkZXNjO1xufVxuXG4vKipcbiAqIFJldHVybnMgYSBmcmVzaCBwcm9wZXJ0eSBkZXNjcmlwdG9yIHdob3NlIHN0YW5kYXJkXG4gKiBhdHRyaWJ1dGVzIGFyZSBndWFyYW50ZWVkIHRvIGJlIGRhdGEgcHJvcGVydGllcyBvZiB0aGUgcmlnaHQgdHlwZS5cbiAqIEFkZGl0aW9uYWxseSwgYW55IG5vbi1zdGFuZGFyZCBlbnVtZXJhYmxlIHByb3BlcnRpZXMgb2ZcbiAqIGF0dHJpYnV0ZXMgYXJlIGNvcGllZCBvdmVyIHRvIHRoZSBmcmVzaCBkZXNjcmlwdG9yLlxuICpcbiAqIElmIGF0dHJpYnV0ZXMgaXMgdW5kZWZpbmVkLCB3aWxsIHRocm93IGEgVHlwZUVycm9yLlxuICpcbiAqIFNlZSBhbHNvOiBodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1oYXJtb255OnByb3hpZXNfc2VtYW50aWNzXG4gKi9cbmZ1bmN0aW9uIG5vcm1hbGl6ZVByb3BlcnR5RGVzY3JpcHRvcihhdHRyaWJ1dGVzKSB7XG4gIHZhciBkZXNjID0gdG9Qcm9wZXJ0eURlc2NyaXB0b3IoYXR0cmlidXRlcyk7XG4gIC8vIE5vdGU6IG5vIG5lZWQgdG8gY2FsbCBGcm9tR2VuZXJpY1Byb3BlcnR5RGVzY3JpcHRvcihkZXNjKSwgYXMgd2UgcmVwcmVzZW50XG4gIC8vIFwiaW50ZXJuYWxcIiBwcm9wZXJ0eSBkZXNjcmlwdG9ycyBhcyBwcm9wZXIgT2JqZWN0cyBmcm9tIHRoZSBzdGFydFxuICBmb3IgKHZhciBuYW1lIGluIGF0dHJpYnV0ZXMpIHtcbiAgICBpZiAoIWlzU3RhbmRhcmRBdHRyaWJ1dGUobmFtZSkpIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShkZXNjLCBuYW1lLFxuICAgICAgICB7IHZhbHVlOiBhdHRyaWJ1dGVzW25hbWVdLFxuICAgICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlIH0pO1xuICAgIH1cbiAgfVxuICByZXR1cm4gZGVzYztcbn1cblxuLy8gc3RvcmUgYSByZWZlcmVuY2UgdG8gdGhlIHJlYWwgRVM1IHByaW1pdGl2ZXMgYmVmb3JlIHBhdGNoaW5nIHRoZW0gbGF0ZXJcbnZhciBwcmltX3ByZXZlbnRFeHRlbnNpb25zID0gICAgICAgIE9iamVjdC5wcmV2ZW50RXh0ZW5zaW9ucyxcbiAgICBwcmltX3NlYWwgPSAgICAgICAgICAgICAgICAgICAgIE9iamVjdC5zZWFsLFxuICAgIHByaW1fZnJlZXplID0gICAgICAgICAgICAgICAgICAgT2JqZWN0LmZyZWV6ZSxcbiAgICBwcmltX2lzRXh0ZW5zaWJsZSA9ICAgICAgICAgICAgIE9iamVjdC5pc0V4dGVuc2libGUsXG4gICAgcHJpbV9pc1NlYWxlZCA9ICAgICAgICAgICAgICAgICBPYmplY3QuaXNTZWFsZWQsXG4gICAgcHJpbV9pc0Zyb3plbiA9ICAgICAgICAgICAgICAgICBPYmplY3QuaXNGcm96ZW4sXG4gICAgcHJpbV9nZXRQcm90b3R5cGVPZiA9ICAgICAgICAgICBPYmplY3QuZ2V0UHJvdG90eXBlT2YsXG4gICAgcHJpbV9nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yLFxuICAgIHByaW1fZGVmaW5lUHJvcGVydHkgPSAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5LFxuICAgIHByaW1fZGVmaW5lUHJvcGVydGllcyA9ICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMsXG4gICAgcHJpbV9rZXlzID0gICAgICAgICAgICAgICAgICAgICBPYmplY3Qua2V5cyxcbiAgICBwcmltX2dldE93blByb3BlcnR5TmFtZXMgPSAgICAgIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzLFxuICAgIHByaW1fZ2V0T3duUHJvcGVydHlTeW1ib2xzID0gICAgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyxcbiAgICBwcmltX2Fzc2lnbiA9ICAgICAgICAgICAgICAgICAgIE9iamVjdC5hc3NpZ24sXG4gICAgcHJpbV9pc0FycmF5ID0gICAgICAgICAgICAgICAgICBBcnJheS5pc0FycmF5LFxuICAgIHByaW1fY29uY2F0ID0gICAgICAgICAgICAgICAgICAgQXJyYXkucHJvdG90eXBlLmNvbmNhdCxcbiAgICBwcmltX2lzUHJvdG90eXBlT2YgPSAgICAgICAgICAgIE9iamVjdC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZixcbiAgICBwcmltX2hhc093blByb3BlcnR5ID0gICAgICAgICAgIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbi8vIHRoZXNlIHdpbGwgcG9pbnQgdG8gdGhlIHBhdGNoZWQgdmVyc2lvbnMgb2YgdGhlIHJlc3BlY3RpdmUgbWV0aG9kcyBvblxuLy8gT2JqZWN0LiBUaGV5IGFyZSB1c2VkIHdpdGhpbiB0aGlzIG1vZHVsZSBhcyB0aGUgXCJpbnRyaW5zaWNcIiBiaW5kaW5nc1xuLy8gb2YgdGhlc2UgbWV0aG9kcyAoaS5lLiB0aGUgXCJvcmlnaW5hbFwiIGJpbmRpbmdzIGFzIGRlZmluZWQgaW4gdGhlIHNwZWMpXG52YXIgT2JqZWN0X2lzRnJvemVuLFxuICAgIE9iamVjdF9pc1NlYWxlZCxcbiAgICBPYmplY3RfaXNFeHRlbnNpYmxlLFxuICAgIE9iamVjdF9nZXRQcm90b3R5cGVPZixcbiAgICBPYmplY3RfZ2V0T3duUHJvcGVydHlOYW1lcztcblxuLyoqXG4gKiBBIHByb3BlcnR5ICduYW1lJyBpcyBmaXhlZCBpZiBpdCBpcyBhbiBvd24gcHJvcGVydHkgb2YgdGhlIHRhcmdldC5cbiAqL1xuZnVuY3Rpb24gaXNGaXhlZChuYW1lLCB0YXJnZXQpIHtcbiAgcmV0dXJuICh7fSkuaGFzT3duUHJvcGVydHkuY2FsbCh0YXJnZXQsIG5hbWUpO1xufVxuZnVuY3Rpb24gaXNTZWFsZWQobmFtZSwgdGFyZ2V0KSB7XG4gIHZhciBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIG5hbWUpO1xuICBpZiAoZGVzYyA9PT0gdW5kZWZpbmVkKSB7IHJldHVybiBmYWxzZTsgfVxuICByZXR1cm4gZGVzYy5jb25maWd1cmFibGUgPT09IGZhbHNlO1xufVxuZnVuY3Rpb24gaXNTZWFsZWREZXNjKGRlc2MpIHtcbiAgcmV0dXJuIGRlc2MgIT09IHVuZGVmaW5lZCAmJiBkZXNjLmNvbmZpZ3VyYWJsZSA9PT0gZmFsc2U7XG59XG5cbi8qKlxuICogUGVyZm9ybXMgYWxsIHZhbGlkYXRpb24gdGhhdCBPYmplY3QuZGVmaW5lUHJvcGVydHkgcGVyZm9ybXMsXG4gKiB3aXRob3V0IGFjdHVhbGx5IGRlZmluaW5nIHRoZSBwcm9wZXJ0eS4gUmV0dXJucyBhIGJvb2xlYW5cbiAqIGluZGljYXRpbmcgd2hldGhlciB2YWxpZGF0aW9uIHN1Y2NlZWRlZC5cbiAqXG4gKiBJbXBsZW1lbnRhdGlvbiB0cmFuc2xpdGVyYXRlZCBmcm9tIEVTNS4xIHNlY3Rpb24gOC4xMi45XG4gKi9cbmZ1bmN0aW9uIGlzQ29tcGF0aWJsZURlc2NyaXB0b3IoZXh0ZW5zaWJsZSwgY3VycmVudCwgZGVzYykge1xuICBpZiAoY3VycmVudCA9PT0gdW5kZWZpbmVkICYmIGV4dGVuc2libGUgPT09IGZhbHNlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmIChjdXJyZW50ID09PSB1bmRlZmluZWQgJiYgZXh0ZW5zaWJsZSA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIGlmIChpc0VtcHR5RGVzY3JpcHRvcihkZXNjKSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIGlmIChpc0VxdWl2YWxlbnREZXNjcmlwdG9yKGN1cnJlbnQsIGRlc2MpKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgaWYgKGN1cnJlbnQuY29uZmlndXJhYmxlID09PSBmYWxzZSkge1xuICAgIGlmIChkZXNjLmNvbmZpZ3VyYWJsZSA9PT0gdHJ1ZSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoJ2VudW1lcmFibGUnIGluIGRlc2MgJiYgZGVzYy5lbnVtZXJhYmxlICE9PSBjdXJyZW50LmVudW1lcmFibGUpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH1cbiAgaWYgKGlzR2VuZXJpY0Rlc2NyaXB0b3IoZGVzYykpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBpZiAoaXNEYXRhRGVzY3JpcHRvcihjdXJyZW50KSAhPT0gaXNEYXRhRGVzY3JpcHRvcihkZXNjKSkge1xuICAgIGlmIChjdXJyZW50LmNvbmZpZ3VyYWJsZSA9PT0gZmFsc2UpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgaWYgKGlzRGF0YURlc2NyaXB0b3IoY3VycmVudCkgJiYgaXNEYXRhRGVzY3JpcHRvcihkZXNjKSkge1xuICAgIGlmIChjdXJyZW50LmNvbmZpZ3VyYWJsZSA9PT0gZmFsc2UpIHtcbiAgICAgIGlmIChjdXJyZW50LndyaXRhYmxlID09PSBmYWxzZSAmJiBkZXNjLndyaXRhYmxlID09PSB0cnVlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmIChjdXJyZW50LndyaXRhYmxlID09PSBmYWxzZSkge1xuICAgICAgICBpZiAoJ3ZhbHVlJyBpbiBkZXNjICYmICFzYW1lVmFsdWUoZGVzYy52YWx1ZSwgY3VycmVudC52YWx1ZSkpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgaWYgKGlzQWNjZXNzb3JEZXNjcmlwdG9yKGN1cnJlbnQpICYmIGlzQWNjZXNzb3JEZXNjcmlwdG9yKGRlc2MpKSB7XG4gICAgaWYgKGN1cnJlbnQuY29uZmlndXJhYmxlID09PSBmYWxzZSkge1xuICAgICAgaWYgKCdzZXQnIGluIGRlc2MgJiYgIXNhbWVWYWx1ZShkZXNjLnNldCwgY3VycmVudC5zZXQpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmICgnZ2V0JyBpbiBkZXNjICYmICFzYW1lVmFsdWUoZGVzYy5nZXQsIGN1cnJlbnQuZ2V0KSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG4vLyBFUzYgNy4zLjExIFNldEludGVncml0eUxldmVsXG4vLyBsZXZlbCBpcyBvbmUgb2YgXCJzZWFsZWRcIiBvciBcImZyb3plblwiXG5mdW5jdGlvbiBzZXRJbnRlZ3JpdHlMZXZlbCh0YXJnZXQsIGxldmVsKSB7XG4gIHZhciBvd25Qcm9wcyA9IE9iamVjdF9nZXRPd25Qcm9wZXJ0eU5hbWVzKHRhcmdldCk7XG4gIHZhciBwZW5kaW5nRXhjZXB0aW9uID0gdW5kZWZpbmVkO1xuICBpZiAobGV2ZWwgPT09IFwic2VhbGVkXCIpIHtcbiAgICB2YXIgbCA9ICtvd25Qcm9wcy5sZW5ndGg7XG4gICAgdmFyIGs7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsOyBpKyspIHtcbiAgICAgIGsgPSBTdHJpbmcob3duUHJvcHNbaV0pO1xuICAgICAgdHJ5IHtcbiAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgaywgeyBjb25maWd1cmFibGU6IGZhbHNlIH0pO1xuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBpZiAocGVuZGluZ0V4Y2VwdGlvbiA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgcGVuZGluZ0V4Y2VwdGlvbiA9IGU7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgLy8gbGV2ZWwgPT09IFwiZnJvemVuXCJcbiAgICB2YXIgbCA9ICtvd25Qcm9wcy5sZW5ndGg7XG4gICAgdmFyIGs7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsOyBpKyspIHtcbiAgICAgIGsgPSBTdHJpbmcob3duUHJvcHNbaV0pO1xuICAgICAgdHJ5IHtcbiAgICAgICAgdmFyIGN1cnJlbnREZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGspO1xuICAgICAgICBpZiAoY3VycmVudERlc2MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHZhciBkZXNjO1xuICAgICAgICAgIGlmIChpc0FjY2Vzc29yRGVzY3JpcHRvcihjdXJyZW50RGVzYykpIHtcbiAgICAgICAgICAgIGRlc2MgPSB7IGNvbmZpZ3VyYWJsZTogZmFsc2UgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBkZXNjID0geyBjb25maWd1cmFibGU6IGZhbHNlLCB3cml0YWJsZTogZmFsc2UgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrLCBkZXNjKTtcbiAgICAgICAgfSAgICAgICAgXG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGlmIChwZW5kaW5nRXhjZXB0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBwZW5kaW5nRXhjZXB0aW9uID0gZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxuICBpZiAocGVuZGluZ0V4Y2VwdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgdGhyb3cgcGVuZGluZ0V4Y2VwdGlvbjtcbiAgfVxuICByZXR1cm4gUmVmbGVjdC5wcmV2ZW50RXh0ZW5zaW9ucyh0YXJnZXQpO1xufVxuXG4vLyBFUzYgNy4zLjEyIFRlc3RJbnRlZ3JpdHlMZXZlbFxuLy8gbGV2ZWwgaXMgb25lIG9mIFwic2VhbGVkXCIgb3IgXCJmcm96ZW5cIlxuZnVuY3Rpb24gdGVzdEludGVncml0eUxldmVsKHRhcmdldCwgbGV2ZWwpIHtcbiAgdmFyIGlzRXh0ZW5zaWJsZSA9IE9iamVjdF9pc0V4dGVuc2libGUodGFyZ2V0KTtcbiAgaWYgKGlzRXh0ZW5zaWJsZSkgcmV0dXJuIGZhbHNlO1xuICBcbiAgdmFyIG93blByb3BzID0gT2JqZWN0X2dldE93blByb3BlcnR5TmFtZXModGFyZ2V0KTtcbiAgdmFyIHBlbmRpbmdFeGNlcHRpb24gPSB1bmRlZmluZWQ7XG4gIHZhciBjb25maWd1cmFibGUgPSBmYWxzZTtcbiAgdmFyIHdyaXRhYmxlID0gZmFsc2U7XG4gIFxuICB2YXIgbCA9ICtvd25Qcm9wcy5sZW5ndGg7XG4gIHZhciBrO1xuICB2YXIgY3VycmVudERlc2M7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgbDsgaSsrKSB7XG4gICAgayA9IFN0cmluZyhvd25Qcm9wc1tpXSk7XG4gICAgdHJ5IHtcbiAgICAgIGN1cnJlbnREZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGspO1xuICAgICAgY29uZmlndXJhYmxlID0gY29uZmlndXJhYmxlIHx8IGN1cnJlbnREZXNjLmNvbmZpZ3VyYWJsZTtcbiAgICAgIGlmIChpc0RhdGFEZXNjcmlwdG9yKGN1cnJlbnREZXNjKSkge1xuICAgICAgICB3cml0YWJsZSA9IHdyaXRhYmxlIHx8IGN1cnJlbnREZXNjLndyaXRhYmxlO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGlmIChwZW5kaW5nRXhjZXB0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgcGVuZGluZ0V4Y2VwdGlvbiA9IGU7XG4gICAgICAgIGNvbmZpZ3VyYWJsZSA9IHRydWU7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmIChwZW5kaW5nRXhjZXB0aW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBwZW5kaW5nRXhjZXB0aW9uO1xuICB9XG4gIGlmIChsZXZlbCA9PT0gXCJmcm96ZW5cIiAmJiB3cml0YWJsZSA9PT0gdHJ1ZSkge1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuICBpZiAoY29uZmlndXJhYmxlID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIHJldHVybiB0cnVlO1xufVxuXG4vLyAtLS0tIFRoZSBWYWxpZGF0b3IgaGFuZGxlciB3cmFwcGVyIGFyb3VuZCB1c2VyIGhhbmRsZXJzIC0tLS1cblxuLyoqXG4gKiBAcGFyYW0gdGFyZ2V0IHRoZSBvYmplY3Qgd3JhcHBlZCBieSB0aGlzIHByb3h5LlxuICogQXMgbG9uZyBhcyB0aGUgcHJveHkgaXMgZXh0ZW5zaWJsZSwgb25seSBub24tY29uZmlndXJhYmxlIHByb3BlcnRpZXNcbiAqIGFyZSBjaGVja2VkIGFnYWluc3QgdGhlIHRhcmdldC4gT25jZSB0aGUgcHJveHkgYmVjb21lcyBub24tZXh0ZW5zaWJsZSxcbiAqIGludmFyaWFudHMgdy5yLnQuIG5vbi1leHRlbnNpYmlsaXR5IGFyZSBhbHNvIGVuZm9yY2VkLlxuICpcbiAqIEBwYXJhbSBoYW5kbGVyIHRoZSBoYW5kbGVyIG9mIHRoZSBkaXJlY3QgcHJveHkuIFRoZSBvYmplY3QgZW11bGF0ZWQgYnlcbiAqIHRoaXMgaGFuZGxlciBpcyB2YWxpZGF0ZWQgYWdhaW5zdCB0aGUgdGFyZ2V0IG9iamVjdCBvZiB0aGUgZGlyZWN0IHByb3h5LlxuICogQW55IHZpb2xhdGlvbnMgdGhhdCB0aGUgaGFuZGxlciBtYWtlcyBhZ2FpbnN0IHRoZSBpbnZhcmlhbnRzXG4gKiBvZiB0aGUgdGFyZ2V0IHdpbGwgY2F1c2UgYSBUeXBlRXJyb3IgdG8gYmUgdGhyb3duLlxuICpcbiAqIEJvdGggdGFyZ2V0IGFuZCBoYW5kbGVyIG11c3QgYmUgcHJvcGVyIE9iamVjdHMgYXQgaW5pdGlhbGl6YXRpb24gdGltZS5cbiAqL1xuZnVuY3Rpb24gVmFsaWRhdG9yKHRhcmdldCwgaGFuZGxlcikge1xuICAvLyBmb3Igbm9uLXJldm9rYWJsZSBwcm94aWVzLCB0aGVzZSBhcmUgY29uc3QgcmVmZXJlbmNlc1xuICAvLyBmb3IgcmV2b2thYmxlIHByb3hpZXMsIG9uIHJldm9jYXRpb246XG4gIC8vIC0gdGhpcy50YXJnZXQgaXMgc2V0IHRvIG51bGxcbiAgLy8gLSB0aGlzLmhhbmRsZXIgaXMgc2V0IHRvIGEgaGFuZGxlciB0aGF0IHRocm93cyBvbiBhbGwgdHJhcHNcbiAgdGhpcy50YXJnZXQgID0gdGFyZ2V0O1xuICB0aGlzLmhhbmRsZXIgPSBoYW5kbGVyO1xufVxuXG5WYWxpZGF0b3IucHJvdG90eXBlID0ge1xuXG4gIC8qKlxuICAgKiBJZiBnZXRUcmFwIHJldHVybnMgdW5kZWZpbmVkLCB0aGUgY2FsbGVyIHNob3VsZCBwZXJmb3JtIHRoZVxuICAgKiBkZWZhdWx0IGZvcndhcmRpbmcgYmVoYXZpb3IuXG4gICAqIElmIGdldFRyYXAgcmV0dXJucyBub3JtYWxseSBvdGhlcndpc2UsIHRoZSByZXR1cm4gdmFsdWVcbiAgICogd2lsbCBiZSBhIGNhbGxhYmxlIHRyYXAgZnVuY3Rpb24uIFdoZW4gY2FsbGluZyB0aGUgdHJhcCBmdW5jdGlvbixcbiAgICogdGhlIGNhbGxlciBpcyByZXNwb25zaWJsZSBmb3IgYmluZGluZyBpdHMgfHRoaXN8IHRvIHx0aGlzLmhhbmRsZXJ8LlxuICAgKi9cbiAgZ2V0VHJhcDogZnVuY3Rpb24odHJhcE5hbWUpIHtcbiAgICB2YXIgdHJhcCA9IHRoaXMuaGFuZGxlclt0cmFwTmFtZV07XG4gICAgaWYgKHRyYXAgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gdGhlIHRyYXAgd2FzIG5vdCBkZWZpbmVkLFxuICAgICAgLy8gcGVyZm9ybSB0aGUgZGVmYXVsdCBmb3J3YXJkaW5nIGJlaGF2aW9yXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgdHJhcCAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKHRyYXBOYW1lICsgXCIgdHJhcCBpcyBub3QgY2FsbGFibGU6IFwiK3RyYXApO1xuICAgIH1cblxuICAgIHJldHVybiB0cmFwO1xuICB9LFxuXG4gIC8vID09PSBmdW5kYW1lbnRhbCB0cmFwcyA9PT1cblxuICAvKipcbiAgICogSWYgbmFtZSBkZW5vdGVzIGEgZml4ZWQgcHJvcGVydHksIGNoZWNrOlxuICAgKiAgIC0gd2hldGhlciB0YXJnZXRIYW5kbGVyIHJlcG9ydHMgaXQgYXMgZXhpc3RlbnRcbiAgICogICAtIHdoZXRoZXIgdGhlIHJldHVybmVkIGRlc2NyaXB0b3IgaXMgY29tcGF0aWJsZSB3aXRoIHRoZSBmaXhlZCBwcm9wZXJ0eVxuICAgKiBJZiB0aGUgcHJveHkgaXMgbm9uLWV4dGVuc2libGUsIGNoZWNrOlxuICAgKiAgIC0gd2hldGhlciBuYW1lIGlzIG5vdCBhIG5ldyBwcm9wZXJ0eVxuICAgKiBBZGRpdGlvbmFsbHksIHRoZSByZXR1cm5lZCBkZXNjcmlwdG9yIGlzIG5vcm1hbGl6ZWQgYW5kIGNvbXBsZXRlZC5cbiAgICovXG4gIGdldE93blByb3BlcnR5RGVzY3JpcHRvcjogZnVuY3Rpb24obmFtZSkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuXG4gICAgdmFyIHRyYXAgPSB0aGlzLmdldFRyYXAoXCJnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3JcIik7XG4gICAgaWYgKHRyYXAgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIFJlZmxlY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRoaXMudGFyZ2V0LCBuYW1lKTtcbiAgICB9XG5cbiAgICBuYW1lID0gU3RyaW5nKG5hbWUpO1xuICAgIHZhciBkZXNjID0gdHJhcC5jYWxsKHRoaXMuaGFuZGxlciwgdGhpcy50YXJnZXQsIG5hbWUpO1xuICAgIGRlc2MgPSBub3JtYWxpemVBbmRDb21wbGV0ZVByb3BlcnR5RGVzY3JpcHRvcihkZXNjKTtcblxuICAgIHZhciB0YXJnZXREZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0aGlzLnRhcmdldCwgbmFtZSk7XG4gICAgdmFyIGV4dGVuc2libGUgPSBPYmplY3QuaXNFeHRlbnNpYmxlKHRoaXMudGFyZ2V0KTtcblxuICAgIGlmIChkZXNjID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmIChpc1NlYWxlZERlc2ModGFyZ2V0RGVzYykpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImNhbm5vdCByZXBvcnQgbm9uLWNvbmZpZ3VyYWJsZSBwcm9wZXJ0eSAnXCIrbmFtZStcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIicgYXMgbm9uLWV4aXN0ZW50XCIpO1xuICAgICAgfVxuICAgICAgaWYgKCFleHRlbnNpYmxlICYmIHRhcmdldERlc2MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIC8vIGlmIGhhbmRsZXIgaXMgYWxsb3dlZCB0byByZXR1cm4gdW5kZWZpbmVkLCB3ZSBjYW5ub3QgZ3VhcmFudGVlXG4gICAgICAgICAgLy8gdGhhdCBpdCB3aWxsIG5vdCByZXR1cm4gYSBkZXNjcmlwdG9yIGZvciB0aGlzIHByb3BlcnR5IGxhdGVyLlxuICAgICAgICAgIC8vIE9uY2UgYSBwcm9wZXJ0eSBoYXMgYmVlbiByZXBvcnRlZCBhcyBub24tZXhpc3RlbnQgb24gYSBub24tZXh0ZW5zaWJsZVxuICAgICAgICAgIC8vIG9iamVjdCwgaXQgc2hvdWxkIGZvcmV2ZXIgYmUgcmVwb3J0ZWQgYXMgbm9uLWV4aXN0ZW50XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImNhbm5vdCByZXBvcnQgZXhpc3Rpbmcgb3duIHByb3BlcnR5ICdcIituYW1lK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCInIGFzIG5vbi1leGlzdGVudCBvbiBhIG5vbi1leHRlbnNpYmxlIG9iamVjdFwiKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgLy8gYXQgdGhpcyBwb2ludCwgd2Uga25vdyAoZGVzYyAhPT0gdW5kZWZpbmVkKSwgaS5lLlxuICAgIC8vIHRhcmdldEhhbmRsZXIgcmVwb3J0cyAnbmFtZScgYXMgYW4gZXhpc3RpbmcgcHJvcGVydHlcblxuICAgIC8vIE5vdGU6IHdlIGNvdWxkIGNvbGxhcHNlIHRoZSBmb2xsb3dpbmcgdHdvIGlmLXRlc3RzIGludG8gYSBzaW5nbGVcbiAgICAvLyB0ZXN0LiBTZXBhcmF0aW5nIG91dCB0aGUgY2FzZXMgdG8gaW1wcm92ZSBlcnJvciByZXBvcnRpbmcuXG5cbiAgICBpZiAoIWV4dGVuc2libGUpIHtcbiAgICAgIGlmICh0YXJnZXREZXNjID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImNhbm5vdCByZXBvcnQgYSBuZXcgb3duIHByb3BlcnR5ICdcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lICsgXCInIG9uIGEgbm9uLWV4dGVuc2libGUgb2JqZWN0XCIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChuYW1lICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIGlmICghaXNDb21wYXRpYmxlRGVzY3JpcHRvcihleHRlbnNpYmxlLCB0YXJnZXREZXNjLCBkZXNjKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiY2Fubm90IHJlcG9ydCBpbmNvbXBhdGlibGUgcHJvcGVydHkgZGVzY3JpcHRvciBcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImZvciBwcm9wZXJ0eSAnXCIrbmFtZStcIidcIik7XG4gICAgICB9XG4gICAgfVxuICAgIFxuICAgIGlmIChkZXNjLmNvbmZpZ3VyYWJsZSA9PT0gZmFsc2UpIHtcbiAgICAgIGlmICh0YXJnZXREZXNjID09PSB1bmRlZmluZWQgfHwgdGFyZ2V0RGVzYy5jb25maWd1cmFibGUgPT09IHRydWUpIHtcbiAgICAgICAgLy8gaWYgdGhlIHByb3BlcnR5IGlzIGNvbmZpZ3VyYWJsZSBvciBub24tZXhpc3RlbnQgb24gdGhlIHRhcmdldCxcbiAgICAgICAgLy8gYnV0IGlzIHJlcG9ydGVkIGFzIGEgbm9uLWNvbmZpZ3VyYWJsZSBwcm9wZXJ0eSwgaXQgbWF5IGxhdGVyIGJlXG4gICAgICAgIC8vIHJlcG9ydGVkIGFzIGNvbmZpZ3VyYWJsZSBvciBub24tZXhpc3RlbnQsIHdoaWNoIHZpb2xhdGVzIHRoZVxuICAgICAgICAvLyBpbnZhcmlhbnQgdGhhdCBpZiB0aGUgcHJvcGVydHkgbWlnaHQgY2hhbmdlIG9yIGRpc2FwcGVhciwgdGhlXG4gICAgICAgIC8vIGNvbmZpZ3VyYWJsZSBhdHRyaWJ1dGUgbXVzdCBiZSB0cnVlLlxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgIFwiY2Fubm90IHJlcG9ydCBhIG5vbi1jb25maWd1cmFibGUgZGVzY3JpcHRvciBcIiArXG4gICAgICAgICAgXCJmb3IgY29uZmlndXJhYmxlIG9yIG5vbi1leGlzdGVudCBwcm9wZXJ0eSAnXCIgKyBuYW1lICsgXCInXCIpO1xuICAgICAgfVxuICAgICAgaWYgKCd3cml0YWJsZScgaW4gZGVzYyAmJiBkZXNjLndyaXRhYmxlID09PSBmYWxzZSkge1xuICAgICAgICBpZiAodGFyZ2V0RGVzYy53cml0YWJsZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgIC8vIGlmIHRoZSBwcm9wZXJ0eSBpcyBub24tY29uZmlndXJhYmxlLCB3cml0YWJsZSBvbiB0aGUgdGFyZ2V0LFxuICAgICAgICAgIC8vIGJ1dCBpcyByZXBvcnRlZCBhcyBub24tY29uZmlndXJhYmxlLCBub24td3JpdGFibGUsIGl0IG1heSBsYXRlclxuICAgICAgICAgIC8vIGJlIHJlcG9ydGVkIGFzIG5vbi1jb25maWd1cmFibGUsIHdyaXRhYmxlIGFnYWluLCB3aGljaCB2aW9sYXRlc1xuICAgICAgICAgIC8vIHRoZSBpbnZhcmlhbnQgdGhhdCBhIG5vbi1jb25maWd1cmFibGUsIG5vbi13cml0YWJsZSBwcm9wZXJ0eVxuICAgICAgICAgIC8vIG1heSBub3QgY2hhbmdlIHN0YXRlLlxuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICAgICBcImNhbm5vdCByZXBvcnQgbm9uLWNvbmZpZ3VyYWJsZSwgd3JpdGFibGUgcHJvcGVydHkgJ1wiICsgbmFtZSArXG4gICAgICAgICAgICBcIicgYXMgbm9uLWNvbmZpZ3VyYWJsZSwgbm9uLXdyaXRhYmxlXCIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRlc2M7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEluIHRoZSBkaXJlY3QgcHJveGllcyBkZXNpZ24gd2l0aCByZWZhY3RvcmVkIHByb3RvdHlwZSBjbGltYmluZyxcbiAgICogdGhpcyB0cmFwIGlzIGRlcHJlY2F0ZWQuIEZvciBwcm94aWVzLWFzLXByb3RvdHlwZXMsIGluc3RlYWRcbiAgICogb2YgY2FsbGluZyB0aGlzIHRyYXAsIHRoZSBnZXQsIHNldCwgaGFzIG9yIGVudW1lcmF0ZSB0cmFwcyBhcmVcbiAgICogY2FsbGVkIGluc3RlYWQuXG4gICAqXG4gICAqIEluIHRoaXMgaW1wbGVtZW50YXRpb24sIHdlIFwiYWJ1c2VcIiBnZXRQcm9wZXJ0eURlc2NyaXB0b3IgdG9cbiAgICogc3VwcG9ydCB0cmFwcGluZyB0aGUgZ2V0IG9yIHNldCB0cmFwcyBmb3IgcHJveGllcy1hcy1wcm90b3R5cGVzLlxuICAgKiBXZSBkbyB0aGlzIGJ5IHJldHVybmluZyBhIGdldHRlci9zZXR0ZXIgcGFpciB0aGF0IGludm9rZXNcbiAgICogdGhlIGNvcnJlc3BvbmRpbmcgdHJhcHMuXG4gICAqXG4gICAqIFdoaWxlIHRoaXMgaGFjayB3b3JrcyBmb3IgaW5oZXJpdGVkIHByb3BlcnR5IGFjY2VzcywgaXQgaGFzIHNvbWVcbiAgICogcXVpcmtzOlxuICAgKlxuICAgKiBJbiBGaXJlZm94LCB0aGlzIHRyYXAgaXMgb25seSBjYWxsZWQgYWZ0ZXIgYSBwcmlvciBpbnZvY2F0aW9uXG4gICAqIG9mIHRoZSAnaGFzJyB0cmFwIGhhcyByZXR1cm5lZCB0cnVlLiBIZW5jZSwgZXhwZWN0IHRoZSBmb2xsb3dpbmdcbiAgICogYmVoYXZpb3I6XG4gICAqIDxjb2RlPlxuICAgKiB2YXIgY2hpbGQgPSBPYmplY3QuY3JlYXRlKFByb3h5KHRhcmdldCwgaGFuZGxlcikpO1xuICAgKiBjaGlsZFtuYW1lXSAvLyB0cmlnZ2VycyBoYW5kbGVyLmhhcyh0YXJnZXQsIG5hbWUpXG4gICAqIC8vIGlmIHRoYXQgcmV0dXJucyB0cnVlLCB0cmlnZ2VycyBoYW5kbGVyLmdldCh0YXJnZXQsIG5hbWUsIGNoaWxkKVxuICAgKiA8L2NvZGU+XG4gICAqXG4gICAqIE9uIHY4LCB0aGUgJ2luJyBvcGVyYXRvciwgd2hlbiBhcHBsaWVkIHRvIGFuIG9iamVjdCB0aGF0IGluaGVyaXRzXG4gICAqIGZyb20gYSBwcm94eSwgd2lsbCBjYWxsIGdldFByb3BlcnR5RGVzY3JpcHRvciBhbmQgd2FsayB0aGUgcHJvdG8tY2hhaW4uXG4gICAqIFRoYXQgY2FsbHMgdGhlIGJlbG93IGdldFByb3BlcnR5RGVzY3JpcHRvciB0cmFwIG9uIHRoZSBwcm94eS4gVGhlXG4gICAqIHJlc3VsdCBvZiB0aGUgJ2luJy1vcGVyYXRvciBpcyB0aGVuIGRldGVybWluZWQgYnkgd2hldGhlciB0aGlzIHRyYXBcbiAgICogcmV0dXJucyB1bmRlZmluZWQgb3IgYSBwcm9wZXJ0eSBkZXNjcmlwdG9yIG9iamVjdC4gVGhhdCBpcyB3aHlcbiAgICogd2UgZmlyc3QgZXhwbGljaXRseSB0cmlnZ2VyIHRoZSAnaGFzJyB0cmFwIHRvIGRldGVybWluZSB3aGV0aGVyXG4gICAqIHRoZSBwcm9wZXJ0eSBleGlzdHMuXG4gICAqXG4gICAqIFRoaXMgaGFzIHRoZSBzaWRlLWVmZmVjdCB0aGF0IHdoZW4gZW51bWVyYXRpbmcgcHJvcGVydGllcyBvblxuICAgKiBhbiBvYmplY3QgdGhhdCBpbmhlcml0cyBmcm9tIGEgcHJveHkgaW4gdjgsIG9ubHkgcHJvcGVydGllc1xuICAgKiBmb3Igd2hpY2ggJ2hhcycgcmV0dXJucyB0cnVlIGFyZSByZXR1cm5lZDpcbiAgICpcbiAgICogPGNvZGU+XG4gICAqIHZhciBjaGlsZCA9IE9iamVjdC5jcmVhdGUoUHJveHkodGFyZ2V0LCBoYW5kbGVyKSk7XG4gICAqIGZvciAodmFyIHByb3AgaW4gY2hpbGQpIHtcbiAgICogICAvLyBvbmx5IGVudW1lcmF0ZXMgcHJvcCBpZiAocHJvcCBpbiBjaGlsZCkgcmV0dXJucyB0cnVlXG4gICAqIH1cbiAgICogPC9jb2RlPlxuICAgKi9cbiAgZ2V0UHJvcGVydHlEZXNjcmlwdG9yOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIGhhbmRsZXIgPSB0aGlzO1xuXG4gICAgaWYgKCFoYW5kbGVyLmhhcyhuYW1lKSkgcmV0dXJuIHVuZGVmaW5lZDtcblxuICAgIHJldHVybiB7XG4gICAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gaGFuZGxlci5nZXQodGhpcywgbmFtZSk7XG4gICAgICB9LFxuICAgICAgc2V0OiBmdW5jdGlvbih2YWwpIHtcbiAgICAgICAgaWYgKGhhbmRsZXIuc2V0KHRoaXMsIG5hbWUsIHZhbCkpIHtcbiAgICAgICAgICByZXR1cm4gdmFsO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJmYWlsZWQgYXNzaWdubWVudCB0byBcIituYW1lKTtcbiAgICAgICAgfVxuICAgICAgfSxcbiAgICAgIGVudW1lcmFibGU6IHRydWUsXG4gICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICB9O1xuICB9LFxuXG4gIC8qKlxuICAgKiBJZiBuYW1lIGRlbm90ZXMgYSBmaXhlZCBwcm9wZXJ0eSwgY2hlY2sgZm9yIGluY29tcGF0aWJsZSBjaGFuZ2VzLlxuICAgKiBJZiB0aGUgcHJveHkgaXMgbm9uLWV4dGVuc2libGUsIGNoZWNrIHRoYXQgbmV3IHByb3BlcnRpZXMgYXJlIHJlamVjdGVkLlxuICAgKi9cbiAgZGVmaW5lUHJvcGVydHk6IGZ1bmN0aW9uKG5hbWUsIGRlc2MpIHtcbiAgICAvLyBUT0RPKHR2Y3V0c2VtKTogdGhlIGN1cnJlbnQgdHJhY2Vtb25rZXkgaW1wbGVtZW50YXRpb24gb2YgcHJveGllc1xuICAgIC8vIGF1dG8tY29tcGxldGVzICdkZXNjJywgd2hpY2ggaXMgbm90IGNvcnJlY3QuICdkZXNjJyBzaG91bGQgYmVcbiAgICAvLyBub3JtYWxpemVkLCBidXQgbm90IGNvbXBsZXRlZC4gQ29uc2lkZXI6XG4gICAgLy8gT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3h5LCAnZm9vJywge2VudW1lcmFibGU6ZmFsc2V9KVxuICAgIC8vIFRoaXMgdHJhcCB3aWxsIHJlY2VpdmUgZGVzYyA9XG4gICAgLy8gIHt2YWx1ZTp1bmRlZmluZWQsd3JpdGFibGU6ZmFsc2UsZW51bWVyYWJsZTpmYWxzZSxjb25maWd1cmFibGU6ZmFsc2V9XG4gICAgLy8gVGhpcyB3aWxsIGFsc28gc2V0IGFsbCBvdGhlciBhdHRyaWJ1dGVzIHRvIHRoZWlyIGRlZmF1bHQgdmFsdWUsXG4gICAgLy8gd2hpY2ggaXMgdW5leHBlY3RlZCBhbmQgZGlmZmVyZW50IGZyb20gW1tEZWZpbmVPd25Qcm9wZXJ0eV1dLlxuICAgIC8vIEJ1ZyBmaWxlZDogaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9NjAxMzI5XG5cbiAgICB2YXIgdHJhcCA9IHRoaXMuZ2V0VHJhcChcImRlZmluZVByb3BlcnR5XCIpO1xuICAgIGlmICh0cmFwID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIGRlZmF1bHQgZm9yd2FyZGluZyBiZWhhdmlvclxuICAgICAgcmV0dXJuIFJlZmxlY3QuZGVmaW5lUHJvcGVydHkodGhpcy50YXJnZXQsIG5hbWUsIGRlc2MpO1xuICAgIH1cblxuICAgIG5hbWUgPSBTdHJpbmcobmFtZSk7XG4gICAgdmFyIGRlc2NPYmogPSBub3JtYWxpemVQcm9wZXJ0eURlc2NyaXB0b3IoZGVzYyk7XG4gICAgdmFyIHN1Y2Nlc3MgPSB0cmFwLmNhbGwodGhpcy5oYW5kbGVyLCB0aGlzLnRhcmdldCwgbmFtZSwgZGVzY09iaik7XG4gICAgc3VjY2VzcyA9ICEhc3VjY2VzczsgLy8gY29lcmNlIHRvIEJvb2xlYW5cblxuICAgIGlmIChzdWNjZXNzID09PSB0cnVlKSB7XG5cbiAgICAgIHZhciB0YXJnZXREZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0aGlzLnRhcmdldCwgbmFtZSk7XG4gICAgICB2YXIgZXh0ZW5zaWJsZSA9IE9iamVjdC5pc0V4dGVuc2libGUodGhpcy50YXJnZXQpO1xuXG4gICAgICAvLyBOb3RlOiB3ZSBjb3VsZCBjb2xsYXBzZSB0aGUgZm9sbG93aW5nIHR3byBpZi10ZXN0cyBpbnRvIGEgc2luZ2xlXG4gICAgICAvLyB0ZXN0LiBTZXBhcmF0aW5nIG91dCB0aGUgY2FzZXMgdG8gaW1wcm92ZSBlcnJvciByZXBvcnRpbmcuXG5cbiAgICAgIGlmICghZXh0ZW5zaWJsZSkge1xuICAgICAgICBpZiAodGFyZ2V0RGVzYyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImNhbm5vdCBzdWNjZXNzZnVsbHkgYWRkIGEgbmV3IHByb3BlcnR5ICdcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWUgKyBcIicgdG8gYSBub24tZXh0ZW5zaWJsZSBvYmplY3RcIik7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKHRhcmdldERlc2MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICBpZiAoIWlzQ29tcGF0aWJsZURlc2NyaXB0b3IoZXh0ZW5zaWJsZSwgdGFyZ2V0RGVzYywgZGVzYykpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiY2Fubm90IGRlZmluZSBpbmNvbXBhdGlibGUgcHJvcGVydHkgXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImRlc2NyaXB0b3IgZm9yIHByb3BlcnR5ICdcIituYW1lK1wiJ1wiKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoaXNEYXRhRGVzY3JpcHRvcih0YXJnZXREZXNjKSAmJlxuICAgICAgICAgICAgdGFyZ2V0RGVzYy5jb25maWd1cmFibGUgPT09IGZhbHNlICYmXG4gICAgICAgICAgICB0YXJnZXREZXNjLndyaXRhYmxlID09PSB0cnVlKSB7XG4gICAgICAgICAgICBpZiAoZGVzYy5jb25maWd1cmFibGUgPT09IGZhbHNlICYmIGRlc2Mud3JpdGFibGUgPT09IGZhbHNlKSB7XG4gICAgICAgICAgICAgIC8vIGlmIHRoZSBwcm9wZXJ0eSBpcyBub24tY29uZmlndXJhYmxlLCB3cml0YWJsZSBvbiB0aGUgdGFyZ2V0XG4gICAgICAgICAgICAgIC8vIGJ1dCB3YXMgc3VjY2Vzc2Z1bGx5IHJlcG9ydGVkIHRvIGJlIHVwZGF0ZWQgdG9cbiAgICAgICAgICAgICAgLy8gbm9uLWNvbmZpZ3VyYWJsZSwgbm9uLXdyaXRhYmxlLCBpdCBjYW4gbGF0ZXIgYmUgcmVwb3J0ZWRcbiAgICAgICAgICAgICAgLy8gYWdhaW4gYXMgbm9uLWNvbmZpZ3VyYWJsZSwgd3JpdGFibGUsIHdoaWNoIHZpb2xhdGVzXG4gICAgICAgICAgICAgIC8vIHRoZSBpbnZhcmlhbnQgdGhhdCBub24tY29uZmlndXJhYmxlLCBub24td3JpdGFibGUgcHJvcGVydGllc1xuICAgICAgICAgICAgICAvLyBjYW5ub3QgY2hhbmdlIHN0YXRlXG4gICAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICAgICAgICAgXCJjYW5ub3Qgc3VjY2Vzc2Z1bGx5IGRlZmluZSBub24tY29uZmlndXJhYmxlLCB3cml0YWJsZSBcIiArXG4gICAgICAgICAgICAgICAgXCIgcHJvcGVydHkgJ1wiICsgbmFtZSArIFwiJyBhcyBub24tY29uZmlndXJhYmxlLCBub24td3JpdGFibGVcIik7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoZGVzYy5jb25maWd1cmFibGUgPT09IGZhbHNlICYmICFpc1NlYWxlZERlc2ModGFyZ2V0RGVzYykpIHtcbiAgICAgICAgLy8gaWYgdGhlIHByb3BlcnR5IGlzIGNvbmZpZ3VyYWJsZSBvciBub24tZXhpc3RlbnQgb24gdGhlIHRhcmdldCxcbiAgICAgICAgLy8gYnV0IGlzIHN1Y2Nlc3NmdWxseSBiZWluZyByZWRlZmluZWQgYXMgYSBub24tY29uZmlndXJhYmxlIHByb3BlcnR5LFxuICAgICAgICAvLyBpdCBtYXkgbGF0ZXIgYmUgcmVwb3J0ZWQgYXMgY29uZmlndXJhYmxlIG9yIG5vbi1leGlzdGVudCwgd2hpY2ggdmlvbGF0ZXNcbiAgICAgICAgLy8gdGhlIGludmFyaWFudCB0aGF0IGlmIHRoZSBwcm9wZXJ0eSBtaWdodCBjaGFuZ2Ugb3IgZGlzYXBwZWFyLCB0aGVcbiAgICAgICAgLy8gY29uZmlndXJhYmxlIGF0dHJpYnV0ZSBtdXN0IGJlIHRydWUuXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICAgXCJjYW5ub3Qgc3VjY2Vzc2Z1bGx5IGRlZmluZSBhIG5vbi1jb25maWd1cmFibGUgXCIgK1xuICAgICAgICAgIFwiZGVzY3JpcHRvciBmb3IgY29uZmlndXJhYmxlIG9yIG5vbi1leGlzdGVudCBwcm9wZXJ0eSAnXCIgK1xuICAgICAgICAgIG5hbWUgKyBcIidcIik7XG4gICAgICB9XG5cbiAgICB9XG5cbiAgICByZXR1cm4gc3VjY2VzcztcbiAgfSxcblxuICAvKipcbiAgICogT24gc3VjY2VzcywgY2hlY2sgd2hldGhlciB0aGUgdGFyZ2V0IG9iamVjdCBpcyBpbmRlZWQgbm9uLWV4dGVuc2libGUuXG4gICAqL1xuICBwcmV2ZW50RXh0ZW5zaW9uczogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRyYXAgPSB0aGlzLmdldFRyYXAoXCJwcmV2ZW50RXh0ZW5zaW9uc1wiKTtcbiAgICBpZiAodHJhcCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBkZWZhdWx0IGZvcndhcmRpbmcgYmVoYXZpb3JcbiAgICAgIHJldHVybiBSZWZsZWN0LnByZXZlbnRFeHRlbnNpb25zKHRoaXMudGFyZ2V0KTtcbiAgICB9XG5cbiAgICB2YXIgc3VjY2VzcyA9IHRyYXAuY2FsbCh0aGlzLmhhbmRsZXIsIHRoaXMudGFyZ2V0KTtcbiAgICBzdWNjZXNzID0gISFzdWNjZXNzOyAvLyBjb2VyY2UgdG8gQm9vbGVhblxuICAgIGlmIChzdWNjZXNzKSB7XG4gICAgICBpZiAoT2JqZWN0X2lzRXh0ZW5zaWJsZSh0aGlzLnRhcmdldCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImNhbid0IHJlcG9ydCBleHRlbnNpYmxlIG9iamVjdCBhcyBub24tZXh0ZW5zaWJsZTogXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXJnZXQpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc3VjY2VzcztcbiAgfSxcblxuICAvKipcbiAgICogSWYgbmFtZSBkZW5vdGVzIGEgc2VhbGVkIHByb3BlcnR5LCBjaGVjayB3aGV0aGVyIGhhbmRsZXIgcmVqZWN0cy5cbiAgICovXG4gIGRlbGV0ZTogZnVuY3Rpb24obmFtZSkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHZhciB0cmFwID0gdGhpcy5nZXRUcmFwKFwiZGVsZXRlUHJvcGVydHlcIik7XG4gICAgaWYgKHRyYXAgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gZGVmYXVsdCBmb3J3YXJkaW5nIGJlaGF2aW9yXG4gICAgICByZXR1cm4gUmVmbGVjdC5kZWxldGVQcm9wZXJ0eSh0aGlzLnRhcmdldCwgbmFtZSk7XG4gICAgfVxuXG4gICAgbmFtZSA9IFN0cmluZyhuYW1lKTtcbiAgICB2YXIgcmVzID0gdHJhcC5jYWxsKHRoaXMuaGFuZGxlciwgdGhpcy50YXJnZXQsIG5hbWUpO1xuICAgIHJlcyA9ICEhcmVzOyAvLyBjb2VyY2UgdG8gQm9vbGVhblxuXG4gICAgdmFyIHRhcmdldERlc2M7XG4gICAgaWYgKHJlcyA9PT0gdHJ1ZSkge1xuICAgICAgdGFyZ2V0RGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGhpcy50YXJnZXQsIG5hbWUpO1xuICAgICAgaWYgKHRhcmdldERlc2MgIT09IHVuZGVmaW5lZCAmJiB0YXJnZXREZXNjLmNvbmZpZ3VyYWJsZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcInByb3BlcnR5ICdcIiArIG5hbWUgKyBcIicgaXMgbm9uLWNvbmZpZ3VyYWJsZSBcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImFuZCBjYW4ndCBiZSBkZWxldGVkXCIpO1xuICAgICAgfVxuICAgICAgaWYgKHRhcmdldERlc2MgIT09IHVuZGVmaW5lZCAmJiAhT2JqZWN0X2lzRXh0ZW5zaWJsZSh0aGlzLnRhcmdldCkpIHtcbiAgICAgICAgLy8gaWYgdGhlIHByb3BlcnR5IHN0aWxsIGV4aXN0cyBvbiBhIG5vbi1leHRlbnNpYmxlIHRhcmdldCBidXRcbiAgICAgICAgLy8gaXMgcmVwb3J0ZWQgYXMgc3VjY2Vzc2Z1bGx5IGRlbGV0ZWQsIGl0IG1heSBsYXRlciBiZSByZXBvcnRlZFxuICAgICAgICAvLyBhcyBwcmVzZW50LCB3aGljaCB2aW9sYXRlcyB0aGUgaW52YXJpYW50IHRoYXQgYW4gb3duIHByb3BlcnR5LFxuICAgICAgICAvLyBkZWxldGVkIGZyb20gYSBub24tZXh0ZW5zaWJsZSBvYmplY3QgY2Fubm90IHJlYXBwZWFyLlxuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFxuICAgICAgICAgIFwiY2Fubm90IHN1Y2Nlc3NmdWxseSBkZWxldGUgZXhpc3RpbmcgcHJvcGVydHkgJ1wiICsgbmFtZSArXG4gICAgICAgICAgXCInIG9uIGEgbm9uLWV4dGVuc2libGUgb2JqZWN0XCIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFRoZSBnZXRPd25Qcm9wZXJ0eU5hbWVzIHRyYXAgd2FzIHJlcGxhY2VkIGJ5IHRoZSBvd25LZXlzIHRyYXAsXG4gICAqIHdoaWNoIG5vdyBhbHNvIHJldHVybnMgYW4gYXJyYXkgKG9mIHN0cmluZ3Mgb3Igc3ltYm9scykgYW5kXG4gICAqIHdoaWNoIHBlcmZvcm1zIHRoZSBzYW1lIHJpZ29yb3VzIGludmFyaWFudCBjaGVja3MgYXMgZ2V0T3duUHJvcGVydHlOYW1lc1xuICAgKlxuICAgKiBTZWUgaXNzdWUgIzQ4IG9uIGhvdyB0aGlzIHRyYXAgY2FuIHN0aWxsIGdldCBpbnZva2VkIGJ5IGV4dGVybmFsIGxpYnNcbiAgICogdGhhdCBkb24ndCB1c2UgdGhlIHBhdGNoZWQgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMgZnVuY3Rpb24uXG4gICAqL1xuICBnZXRPd25Qcm9wZXJ0eU5hbWVzOiBmdW5jdGlvbigpIHtcbiAgICAvLyBOb3RlOiByZW1vdmVkIGRlcHJlY2F0aW9uIHdhcm5pbmcgdG8gYXZvaWQgZGVwZW5kZW5jeSBvbiAnY29uc29sZSdcbiAgICAvLyAoYW5kIG9uIG5vZGUsIHNob3VsZCBhbnl3YXkgdXNlIHV0aWwuZGVwcmVjYXRlKS4gRGVwcmVjYXRpb24gd2FybmluZ3NcbiAgICAvLyBjYW4gYWxzbyBiZSBhbm5veWluZyB3aGVuIHRoZXkgYXJlIG91dHNpZGUgb2YgdGhlIHVzZXIncyBjb250cm9sLCBlLmcuXG4gICAgLy8gd2hlbiBhbiBleHRlcm5hbCBsaWJyYXJ5IGNhbGxzIHVucGF0Y2hlZCBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcy5cbiAgICAvLyBTaW5jZSB0aGVyZSBpcyBhIGNsZWFuIGZhbGxiYWNrIHRvIGBvd25LZXlzYCwgdGhlIGZhY3QgdGhhdCB0aGVcbiAgICAvLyBkZXByZWNhdGVkIG1ldGhvZCBpcyBzdGlsbCBjYWxsZWQgaXMgbW9zdGx5IGhhcm1sZXNzIGFueXdheS5cbiAgICAvLyBTZWUgYWxzbyBpc3N1ZXMgIzY1IGFuZCAjNjYuXG4gICAgLy8gY29uc29sZS53YXJuKFwiZ2V0T3duUHJvcGVydHlOYW1lcyB0cmFwIGlzIGRlcHJlY2F0ZWQuIFVzZSBvd25LZXlzIGluc3RlYWRcIik7XG4gICAgcmV0dXJuIHRoaXMub3duS2V5cygpO1xuICB9LFxuXG4gIC8qKlxuICAgKiBDaGVja3Mgd2hldGhlciB0aGUgdHJhcCByZXN1bHQgZG9lcyBub3QgY29udGFpbiBhbnkgbmV3IHByb3BlcnRpZXNcbiAgICogaWYgdGhlIHByb3h5IGlzIG5vbi1leHRlbnNpYmxlLlxuICAgKlxuICAgKiBBbnkgb3duIG5vbi1jb25maWd1cmFibGUgcHJvcGVydGllcyBvZiB0aGUgdGFyZ2V0IHRoYXQgYXJlIG5vdCBpbmNsdWRlZFxuICAgKiBpbiB0aGUgdHJhcCByZXN1bHQgZ2l2ZSByaXNlIHRvIGEgVHlwZUVycm9yLiBBcyBzdWNoLCB3ZSBjaGVjayB3aGV0aGVyIHRoZVxuICAgKiByZXR1cm5lZCByZXN1bHQgY29udGFpbnMgYXQgbGVhc3QgYWxsIHNlYWxlZCBwcm9wZXJ0aWVzIG9mIHRoZSB0YXJnZXRcbiAgICogb2JqZWN0LlxuICAgKlxuICAgKiBBZGRpdGlvbmFsbHksIHRoZSB0cmFwIHJlc3VsdCBpcyBub3JtYWxpemVkLlxuICAgKiBJbnN0ZWFkIG9mIHJldHVybmluZyB0aGUgdHJhcCByZXN1bHQgZGlyZWN0bHk6XG4gICAqICAtIGNyZWF0ZSBhbmQgcmV0dXJuIGEgZnJlc2ggQXJyYXksXG4gICAqICAtIG9mIHdoaWNoIGVhY2ggZWxlbWVudCBpcyBjb2VyY2VkIHRvIGEgU3RyaW5nXG4gICAqXG4gICAqIFRoaXMgdHJhcCBpcyBjYWxsZWQgYS5vLiBieSBSZWZsZWN0Lm93bktleXMsIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzXG4gICAqIGFuZCBPYmplY3Qua2V5cyAodGhlIGxhdHRlciBmaWx0ZXJzIG91dCBvbmx5IHRoZSBlbnVtZXJhYmxlIG93biBwcm9wZXJ0aWVzKS5cbiAgICovXG4gIG93bktleXM6IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0cmFwID0gdGhpcy5nZXRUcmFwKFwib3duS2V5c1wiKTtcbiAgICBpZiAodHJhcCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBkZWZhdWx0IGZvcndhcmRpbmcgYmVoYXZpb3JcbiAgICAgIHJldHVybiBSZWZsZWN0Lm93bktleXModGhpcy50YXJnZXQpO1xuICAgIH1cblxuICAgIHZhciB0cmFwUmVzdWx0ID0gdHJhcC5jYWxsKHRoaXMuaGFuZGxlciwgdGhpcy50YXJnZXQpO1xuXG4gICAgLy8gcHJvcE5hbWVzIGlzIHVzZWQgYXMgYSBzZXQgb2Ygc3RyaW5nc1xuICAgIHZhciBwcm9wTmFtZXMgPSBPYmplY3QuY3JlYXRlKG51bGwpO1xuICAgIHZhciBudW1Qcm9wcyA9ICt0cmFwUmVzdWx0Lmxlbmd0aDtcbiAgICB2YXIgcmVzdWx0ID0gbmV3IEFycmF5KG51bVByb3BzKTtcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbnVtUHJvcHM7IGkrKykge1xuICAgICAgdmFyIHMgPSBTdHJpbmcodHJhcFJlc3VsdFtpXSk7XG4gICAgICBpZiAoIU9iamVjdC5pc0V4dGVuc2libGUodGhpcy50YXJnZXQpICYmICFpc0ZpeGVkKHMsIHRoaXMudGFyZ2V0KSkge1xuICAgICAgICAvLyBub24tZXh0ZW5zaWJsZSBwcm94aWVzIGRvbid0IHRvbGVyYXRlIG5ldyBvd24gcHJvcGVydHkgbmFtZXNcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIm93bktleXMgdHJhcCBjYW5ub3QgbGlzdCBhIG5ldyBcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInByb3BlcnR5ICdcIitzK1wiJyBvbiBhIG5vbi1leHRlbnNpYmxlIG9iamVjdFwiKTtcbiAgICAgIH1cblxuICAgICAgcHJvcE5hbWVzW3NdID0gdHJ1ZTtcbiAgICAgIHJlc3VsdFtpXSA9IHM7XG4gICAgfVxuXG4gICAgdmFyIG93blByb3BzID0gT2JqZWN0X2dldE93blByb3BlcnR5TmFtZXModGhpcy50YXJnZXQpO1xuICAgIHZhciB0YXJnZXQgPSB0aGlzLnRhcmdldDtcbiAgICBvd25Qcm9wcy5mb3JFYWNoKGZ1bmN0aW9uIChvd25Qcm9wKSB7XG4gICAgICBpZiAoIXByb3BOYW1lc1tvd25Qcm9wXSkge1xuICAgICAgICBpZiAoaXNTZWFsZWQob3duUHJvcCwgdGFyZ2V0KSkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJvd25LZXlzIHRyYXAgZmFpbGVkIHRvIGluY2x1ZGUgXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIm5vbi1jb25maWd1cmFibGUgcHJvcGVydHkgJ1wiK293blByb3ArXCInXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghT2JqZWN0LmlzRXh0ZW5zaWJsZSh0YXJnZXQpICYmXG4gICAgICAgICAgICBpc0ZpeGVkKG93blByb3AsIHRhcmdldCkpIHtcbiAgICAgICAgICAgIC8vIGlmIGhhbmRsZXIgaXMgYWxsb3dlZCB0byByZXBvcnQgb3duUHJvcCBhcyBub24tZXhpc3RlbnQsXG4gICAgICAgICAgICAvLyB3ZSBjYW5ub3QgZ3VhcmFudGVlIHRoYXQgaXQgd2lsbCBuZXZlciBsYXRlciByZXBvcnQgaXQgYXNcbiAgICAgICAgICAgIC8vIGV4aXN0ZW50LiBPbmNlIGEgcHJvcGVydHkgaGFzIGJlZW4gcmVwb3J0ZWQgYXMgbm9uLWV4aXN0ZW50XG4gICAgICAgICAgICAvLyBvbiBhIG5vbi1leHRlbnNpYmxlIG9iamVjdCwgaXQgc2hvdWxkIGZvcmV2ZXIgYmUgcmVwb3J0ZWQgYXNcbiAgICAgICAgICAgIC8vIG5vbi1leGlzdGVudFxuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIm93bktleXMgdHJhcCBjYW5ub3QgcmVwb3J0IGV4aXN0aW5nIG93biBwcm9wZXJ0eSAnXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG93blByb3ArXCInIGFzIG5vbi1leGlzdGVudCBvbiBhIG5vbi1leHRlbnNpYmxlIG9iamVjdFwiKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSxcblxuICAvKipcbiAgICogQ2hlY2tzIHdoZXRoZXIgdGhlIHRyYXAgcmVzdWx0IGlzIGNvbnNpc3RlbnQgd2l0aCB0aGUgc3RhdGUgb2YgdGhlXG4gICAqIHdyYXBwZWQgdGFyZ2V0LlxuICAgKi9cbiAgaXNFeHRlbnNpYmxlOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdHJhcCA9IHRoaXMuZ2V0VHJhcChcImlzRXh0ZW5zaWJsZVwiKTtcbiAgICBpZiAodHJhcCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBkZWZhdWx0IGZvcndhcmRpbmcgYmVoYXZpb3JcbiAgICAgIHJldHVybiBSZWZsZWN0LmlzRXh0ZW5zaWJsZSh0aGlzLnRhcmdldCk7XG4gICAgfVxuXG4gICAgdmFyIHJlc3VsdCA9IHRyYXAuY2FsbCh0aGlzLmhhbmRsZXIsIHRoaXMudGFyZ2V0KTtcbiAgICByZXN1bHQgPSAhIXJlc3VsdDsgLy8gY29lcmNlIHRvIEJvb2xlYW5cbiAgICB2YXIgc3RhdGUgPSBPYmplY3RfaXNFeHRlbnNpYmxlKHRoaXMudGFyZ2V0KTtcbiAgICBpZiAocmVzdWx0ICE9PSBzdGF0ZSkge1xuICAgICAgaWYgKHJlc3VsdCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiY2Fubm90IHJlcG9ydCBub24tZXh0ZW5zaWJsZSBvYmplY3QgYXMgZXh0ZW5zaWJsZTogXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGFyZ2V0KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJjYW5ub3QgcmVwb3J0IGV4dGVuc2libGUgb2JqZWN0IGFzIG5vbi1leHRlbnNpYmxlOiBcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXJnZXQpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc3RhdGU7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENoZWNrIHdoZXRoZXIgdGhlIHRyYXAgcmVzdWx0IGNvcnJlc3BvbmRzIHRvIHRoZSB0YXJnZXQncyBbW1Byb3RvdHlwZV1dXG4gICAqL1xuICBnZXRQcm90b3R5cGVPZjogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRyYXAgPSB0aGlzLmdldFRyYXAoXCJnZXRQcm90b3R5cGVPZlwiKTtcbiAgICBpZiAodHJhcCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBkZWZhdWx0IGZvcndhcmRpbmcgYmVoYXZpb3JcbiAgICAgIHJldHVybiBSZWZsZWN0LmdldFByb3RvdHlwZU9mKHRoaXMudGFyZ2V0KTtcbiAgICB9XG5cbiAgICB2YXIgYWxsZWdlZFByb3RvID0gdHJhcC5jYWxsKHRoaXMuaGFuZGxlciwgdGhpcy50YXJnZXQpO1xuXG4gICAgaWYgKCFPYmplY3RfaXNFeHRlbnNpYmxlKHRoaXMudGFyZ2V0KSkge1xuICAgICAgdmFyIGFjdHVhbFByb3RvID0gT2JqZWN0X2dldFByb3RvdHlwZU9mKHRoaXMudGFyZ2V0KTtcbiAgICAgIGlmICghc2FtZVZhbHVlKGFsbGVnZWRQcm90bywgYWN0dWFsUHJvdG8pKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJwcm90b3R5cGUgdmFsdWUgZG9lcyBub3QgbWF0Y2g6IFwiICsgdGhpcy50YXJnZXQpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBhbGxlZ2VkUHJvdG87XG4gIH0sXG5cbiAgLyoqXG4gICAqIElmIHRhcmdldCBpcyBub24tZXh0ZW5zaWJsZSBhbmQgc2V0UHJvdG90eXBlT2YgdHJhcCByZXR1cm5zIHRydWUsXG4gICAqIGNoZWNrIHdoZXRoZXIgdGhlIHRyYXAgcmVzdWx0IGNvcnJlc3BvbmRzIHRvIHRoZSB0YXJnZXQncyBbW1Byb3RvdHlwZV1dXG4gICAqL1xuICBzZXRQcm90b3R5cGVPZjogZnVuY3Rpb24obmV3UHJvdG8pIHtcbiAgICB2YXIgdHJhcCA9IHRoaXMuZ2V0VHJhcChcInNldFByb3RvdHlwZU9mXCIpO1xuICAgIGlmICh0cmFwID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIGRlZmF1bHQgZm9yd2FyZGluZyBiZWhhdmlvclxuICAgICAgcmV0dXJuIFJlZmxlY3Quc2V0UHJvdG90eXBlT2YodGhpcy50YXJnZXQsIG5ld1Byb3RvKTtcbiAgICB9XG5cbiAgICB2YXIgc3VjY2VzcyA9IHRyYXAuY2FsbCh0aGlzLmhhbmRsZXIsIHRoaXMudGFyZ2V0LCBuZXdQcm90byk7XG5cbiAgICBzdWNjZXNzID0gISFzdWNjZXNzO1xuICAgIGlmIChzdWNjZXNzICYmICFPYmplY3RfaXNFeHRlbnNpYmxlKHRoaXMudGFyZ2V0KSkge1xuICAgICAgdmFyIGFjdHVhbFByb3RvID0gT2JqZWN0X2dldFByb3RvdHlwZU9mKHRoaXMudGFyZ2V0KTtcbiAgICAgIGlmICghc2FtZVZhbHVlKG5ld1Byb3RvLCBhY3R1YWxQcm90bykpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcInByb3RvdHlwZSB2YWx1ZSBkb2VzIG5vdCBtYXRjaDogXCIgKyB0aGlzLnRhcmdldCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHN1Y2Nlc3M7XG4gIH0sXG5cbiAgLyoqXG4gICAqIEluIHRoZSBkaXJlY3QgcHJveGllcyBkZXNpZ24gd2l0aCByZWZhY3RvcmVkIHByb3RvdHlwZSBjbGltYmluZyxcbiAgICogdGhpcyB0cmFwIGlzIGRlcHJlY2F0ZWQuIEZvciBwcm94aWVzLWFzLXByb3RvdHlwZXMsIGZvci1pbiB3aWxsXG4gICAqIGNhbGwgdGhlIGVudW1lcmF0ZSgpIHRyYXAuIElmIHRoYXQgdHJhcCBpcyBub3QgZGVmaW5lZCwgdGhlXG4gICAqIG9wZXJhdGlvbiBpcyBmb3J3YXJkZWQgdG8gdGhlIHRhcmdldCwgbm8gbW9yZSBmYWxsYmFjayBvbiB0aGlzXG4gICAqIGZ1bmRhbWVudGFsIHRyYXAuXG4gICAqL1xuICBnZXRQcm9wZXJ0eU5hbWVzOiBmdW5jdGlvbigpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiZ2V0UHJvcGVydHlOYW1lcyB0cmFwIGlzIGRlcHJlY2F0ZWRcIik7XG4gIH0sXG5cbiAgLy8gPT09IGRlcml2ZWQgdHJhcHMgPT09XG5cbiAgLyoqXG4gICAqIElmIG5hbWUgZGVub3RlcyBhIGZpeGVkIHByb3BlcnR5LCBjaGVjayB3aGV0aGVyIHRoZSB0cmFwIHJldHVybnMgdHJ1ZS5cbiAgICovXG4gIGhhczogZnVuY3Rpb24obmFtZSkge1xuICAgIHZhciB0cmFwID0gdGhpcy5nZXRUcmFwKFwiaGFzXCIpO1xuICAgIGlmICh0cmFwID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIGRlZmF1bHQgZm9yd2FyZGluZyBiZWhhdmlvclxuICAgICAgcmV0dXJuIFJlZmxlY3QuaGFzKHRoaXMudGFyZ2V0LCBuYW1lKTtcbiAgICB9XG5cbiAgICBuYW1lID0gU3RyaW5nKG5hbWUpO1xuICAgIHZhciByZXMgPSB0cmFwLmNhbGwodGhpcy5oYW5kbGVyLCB0aGlzLnRhcmdldCwgbmFtZSk7XG4gICAgcmVzID0gISFyZXM7IC8vIGNvZXJjZSB0byBCb29sZWFuXG5cbiAgICBpZiAocmVzID09PSBmYWxzZSkge1xuICAgICAgaWYgKGlzU2VhbGVkKG5hbWUsIHRoaXMudGFyZ2V0KSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiY2Fubm90IHJlcG9ydCBleGlzdGluZyBub24tY29uZmlndXJhYmxlIG93biBcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInByb3BlcnR5ICdcIisgbmFtZSArIFwiJyBhcyBhIG5vbi1leGlzdGVudCBcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInByb3BlcnR5XCIpO1xuICAgICAgfVxuICAgICAgaWYgKCFPYmplY3QuaXNFeHRlbnNpYmxlKHRoaXMudGFyZ2V0KSAmJlxuICAgICAgICAgIGlzRml4ZWQobmFtZSwgdGhpcy50YXJnZXQpKSB7XG4gICAgICAgICAgLy8gaWYgaGFuZGxlciBpcyBhbGxvd2VkIHRvIHJldHVybiBmYWxzZSwgd2UgY2Fubm90IGd1YXJhbnRlZVxuICAgICAgICAgIC8vIHRoYXQgaXQgd2lsbCBub3QgcmV0dXJuIHRydWUgZm9yIHRoaXMgcHJvcGVydHkgbGF0ZXIuXG4gICAgICAgICAgLy8gT25jZSBhIHByb3BlcnR5IGhhcyBiZWVuIHJlcG9ydGVkIGFzIG5vbi1leGlzdGVudCBvbiBhIG5vbi1leHRlbnNpYmxlXG4gICAgICAgICAgLy8gb2JqZWN0LCBpdCBzaG91bGQgZm9yZXZlciBiZSByZXBvcnRlZCBhcyBub24tZXhpc3RlbnRcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiY2Fubm90IHJlcG9ydCBleGlzdGluZyBvd24gcHJvcGVydHkgJ1wiK25hbWUrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIicgYXMgbm9uLWV4aXN0ZW50IG9uIGEgbm9uLWV4dGVuc2libGUgb2JqZWN0XCIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIGlmIHJlcyA9PT0gdHJ1ZSwgd2UgZG9uJ3QgbmVlZCB0byBjaGVjayBmb3IgZXh0ZW5zaWJpbGl0eVxuICAgIC8vIGV2ZW4gZm9yIGEgbm9uLWV4dGVuc2libGUgcHJveHkgdGhhdCBoYXMgbm8gb3duIG5hbWUgcHJvcGVydHksXG4gICAgLy8gdGhlIHByb3BlcnR5IG1heSBoYXZlIGJlZW4gaW5oZXJpdGVkXG5cbiAgICByZXR1cm4gcmVzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBJZiBuYW1lIGRlbm90ZXMgYSBmaXhlZCBub24tY29uZmlndXJhYmxlLCBub24td3JpdGFibGUgZGF0YSBwcm9wZXJ0eSxcbiAgICogY2hlY2sgaXRzIHJldHVybiB2YWx1ZSBhZ2FpbnN0IHRoZSBwcmV2aW91c2x5IGFzc2VydGVkIHZhbHVlIG9mIHRoZVxuICAgKiBmaXhlZCBwcm9wZXJ0eS5cbiAgICovXG4gIGdldDogZnVuY3Rpb24ocmVjZWl2ZXIsIG5hbWUpIHtcblxuICAgIC8vIGV4cGVyaW1lbnRhbCBzdXBwb3J0IGZvciBpbnZva2UoKSB0cmFwIG9uIHBsYXRmb3JtcyB0aGF0XG4gICAgLy8gc3VwcG9ydCBfX25vU3VjaE1ldGhvZF9fXG4gICAgLypcbiAgICBpZiAobmFtZSA9PT0gJ19fbm9TdWNoTWV0aG9kX18nKSB7XG4gICAgICB2YXIgaGFuZGxlciA9IHRoaXM7XG4gICAgICByZXR1cm4gZnVuY3Rpb24obmFtZSwgYXJncykge1xuICAgICAgICByZXR1cm4gaGFuZGxlci5pbnZva2UocmVjZWl2ZXIsIG5hbWUsIGFyZ3MpO1xuICAgICAgfVxuICAgIH1cbiAgICAqL1xuXG4gICAgdmFyIHRyYXAgPSB0aGlzLmdldFRyYXAoXCJnZXRcIik7XG4gICAgaWYgKHRyYXAgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gZGVmYXVsdCBmb3J3YXJkaW5nIGJlaGF2aW9yXG4gICAgICByZXR1cm4gUmVmbGVjdC5nZXQodGhpcy50YXJnZXQsIG5hbWUsIHJlY2VpdmVyKTtcbiAgICB9XG5cbiAgICBuYW1lID0gU3RyaW5nKG5hbWUpO1xuICAgIHZhciByZXMgPSB0cmFwLmNhbGwodGhpcy5oYW5kbGVyLCB0aGlzLnRhcmdldCwgbmFtZSwgcmVjZWl2ZXIpO1xuXG4gICAgdmFyIGZpeGVkRGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGhpcy50YXJnZXQsIG5hbWUpO1xuICAgIC8vIGNoZWNrIGNvbnNpc3RlbmN5IG9mIHRoZSByZXR1cm5lZCB2YWx1ZVxuICAgIGlmIChmaXhlZERlc2MgIT09IHVuZGVmaW5lZCkgeyAvLyBnZXR0aW5nIGFuIGV4aXN0aW5nIHByb3BlcnR5XG4gICAgICBpZiAoaXNEYXRhRGVzY3JpcHRvcihmaXhlZERlc2MpICYmXG4gICAgICAgICAgZml4ZWREZXNjLmNvbmZpZ3VyYWJsZSA9PT0gZmFsc2UgJiZcbiAgICAgICAgICBmaXhlZERlc2Mud3JpdGFibGUgPT09IGZhbHNlKSB7IC8vIG93biBmcm96ZW4gZGF0YSBwcm9wZXJ0eVxuICAgICAgICBpZiAoIXNhbWVWYWx1ZShyZXMsIGZpeGVkRGVzYy52YWx1ZSkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiY2Fubm90IHJlcG9ydCBpbmNvbnNpc3RlbnQgdmFsdWUgZm9yIFwiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJub24td3JpdGFibGUsIG5vbi1jb25maWd1cmFibGUgcHJvcGVydHkgJ1wiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZStcIidcIik7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7IC8vIGl0J3MgYW4gYWNjZXNzb3IgcHJvcGVydHlcbiAgICAgICAgaWYgKGlzQWNjZXNzb3JEZXNjcmlwdG9yKGZpeGVkRGVzYykgJiZcbiAgICAgICAgICAgIGZpeGVkRGVzYy5jb25maWd1cmFibGUgPT09IGZhbHNlICYmXG4gICAgICAgICAgICBmaXhlZERlc2MuZ2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBpZiAocmVzICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJtdXN0IHJlcG9ydCB1bmRlZmluZWQgZm9yIG5vbi1jb25maWd1cmFibGUgXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiYWNjZXNzb3IgcHJvcGVydHkgJ1wiK25hbWUrXCInIHdpdGhvdXQgZ2V0dGVyXCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIElmIG5hbWUgZGVub3RlcyBhIGZpeGVkIG5vbi1jb25maWd1cmFibGUsIG5vbi13cml0YWJsZSBkYXRhIHByb3BlcnR5LFxuICAgKiBjaGVjayB0aGF0IHRoZSB0cmFwIHJlamVjdHMgdGhlIGFzc2lnbm1lbnQuXG4gICAqL1xuICBzZXQ6IGZ1bmN0aW9uKHJlY2VpdmVyLCBuYW1lLCB2YWwpIHtcbiAgICB2YXIgdHJhcCA9IHRoaXMuZ2V0VHJhcChcInNldFwiKTtcbiAgICBpZiAodHJhcCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBkZWZhdWx0IGZvcndhcmRpbmcgYmVoYXZpb3JcbiAgICAgIHJldHVybiBSZWZsZWN0LnNldCh0aGlzLnRhcmdldCwgbmFtZSwgdmFsLCByZWNlaXZlcik7XG4gICAgfVxuXG4gICAgbmFtZSA9IFN0cmluZyhuYW1lKTtcbiAgICB2YXIgcmVzID0gdHJhcC5jYWxsKHRoaXMuaGFuZGxlciwgdGhpcy50YXJnZXQsIG5hbWUsIHZhbCwgcmVjZWl2ZXIpO1xuICAgIHJlcyA9ICEhcmVzOyAvLyBjb2VyY2UgdG8gQm9vbGVhblxuXG4gICAgLy8gaWYgc3VjY2VzcyBpcyByZXBvcnRlZCwgY2hlY2sgd2hldGhlciBwcm9wZXJ0eSBpcyB0cnVseSBhc3NpZ25hYmxlXG4gICAgaWYgKHJlcyA9PT0gdHJ1ZSkge1xuICAgICAgdmFyIGZpeGVkRGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGhpcy50YXJnZXQsIG5hbWUpO1xuICAgICAgaWYgKGZpeGVkRGVzYyAhPT0gdW5kZWZpbmVkKSB7IC8vIHNldHRpbmcgYW4gZXhpc3RpbmcgcHJvcGVydHlcbiAgICAgICAgaWYgKGlzRGF0YURlc2NyaXB0b3IoZml4ZWREZXNjKSAmJlxuICAgICAgICAgICAgZml4ZWREZXNjLmNvbmZpZ3VyYWJsZSA9PT0gZmFsc2UgJiZcbiAgICAgICAgICAgIGZpeGVkRGVzYy53cml0YWJsZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICBpZiAoIXNhbWVWYWx1ZSh2YWwsIGZpeGVkRGVzYy52YWx1ZSkpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJjYW5ub3Qgc3VjY2Vzc2Z1bGx5IGFzc2lnbiB0byBhIFwiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIm5vbi13cml0YWJsZSwgbm9uLWNvbmZpZ3VyYWJsZSBwcm9wZXJ0eSAnXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWUrXCInXCIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBpZiAoaXNBY2Nlc3NvckRlc2NyaXB0b3IoZml4ZWREZXNjKSAmJlxuICAgICAgICAgICAgICBmaXhlZERlc2MuY29uZmlndXJhYmxlID09PSBmYWxzZSAmJiAvLyBub24tY29uZmlndXJhYmxlXG4gICAgICAgICAgICAgIGZpeGVkRGVzYy5zZXQgPT09IHVuZGVmaW5lZCkgeyAgICAgIC8vIGFjY2Vzc29yIHdpdGggdW5kZWZpbmVkIHNldHRlclxuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcInNldHRpbmcgYSBwcm9wZXJ0eSAnXCIrbmFtZStcIicgdGhhdCBoYXMgXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiIG9ubHkgYSBnZXR0ZXJcIik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlcztcbiAgfSxcblxuICAvKipcbiAgICogQW55IG93biBlbnVtZXJhYmxlIG5vbi1jb25maWd1cmFibGUgcHJvcGVydGllcyBvZiB0aGUgdGFyZ2V0IHRoYXQgYXJlIG5vdFxuICAgKiBpbmNsdWRlZCBpbiB0aGUgdHJhcCByZXN1bHQgZ2l2ZSByaXNlIHRvIGEgVHlwZUVycm9yLiBBcyBzdWNoLCB3ZSBjaGVja1xuICAgKiB3aGV0aGVyIHRoZSByZXR1cm5lZCByZXN1bHQgY29udGFpbnMgYXQgbGVhc3QgYWxsIHNlYWxlZCBlbnVtZXJhYmxlIHByb3BlcnRpZXNcbiAgICogb2YgdGhlIHRhcmdldCBvYmplY3QuXG4gICAqXG4gICAqIFRoZSB0cmFwIHNob3VsZCByZXR1cm4gYW4gaXRlcmF0b3IuXG4gICAqXG4gICAqIEhvd2V2ZXIsIGFzIGltcGxlbWVudGF0aW9ucyBvZiBwcmUtZGlyZWN0IHByb3hpZXMgc3RpbGwgZXhwZWN0IGVudW1lcmF0ZVxuICAgKiB0byByZXR1cm4gYW4gYXJyYXkgb2Ygc3RyaW5ncywgd2UgY29udmVydCB0aGUgaXRlcmF0b3IgaW50byBhbiBhcnJheS5cbiAgICovXG4gIGVudW1lcmF0ZTogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRyYXAgPSB0aGlzLmdldFRyYXAoXCJlbnVtZXJhdGVcIik7XG4gICAgaWYgKHRyYXAgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gZGVmYXVsdCBmb3J3YXJkaW5nIGJlaGF2aW9yXG4gICAgICB2YXIgdHJhcFJlc3VsdCA9IFJlZmxlY3QuZW51bWVyYXRlKHRoaXMudGFyZ2V0KTtcbiAgICAgIHZhciByZXN1bHQgPSBbXTtcbiAgICAgIHZhciBueHQgPSB0cmFwUmVzdWx0Lm5leHQoKTtcbiAgICAgIHdoaWxlICghbnh0LmRvbmUpIHtcbiAgICAgICAgcmVzdWx0LnB1c2goU3RyaW5nKG54dC52YWx1ZSkpO1xuICAgICAgICBueHQgPSB0cmFwUmVzdWx0Lm5leHQoKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiByZXN1bHQ7XG4gICAgfVxuXG4gICAgdmFyIHRyYXBSZXN1bHQgPSB0cmFwLmNhbGwodGhpcy5oYW5kbGVyLCB0aGlzLnRhcmdldCk7XG4gICAgXG4gICAgaWYgKHRyYXBSZXN1bHQgPT09IG51bGwgfHxcbiAgICAgICAgdHJhcFJlc3VsdCA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgIHRyYXBSZXN1bHQubmV4dCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiZW51bWVyYXRlIHRyYXAgc2hvdWxkIHJldHVybiBhbiBpdGVyYXRvciwgZ290OiBcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdHJhcFJlc3VsdCk7ICAgIFxuICAgIH1cbiAgICBcbiAgICAvLyBwcm9wTmFtZXMgaXMgdXNlZCBhcyBhIHNldCBvZiBzdHJpbmdzXG4gICAgdmFyIHByb3BOYW1lcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgXG4gICAgLy8gdmFyIG51bVByb3BzID0gK3RyYXBSZXN1bHQubGVuZ3RoO1xuICAgIHZhciByZXN1bHQgPSBbXTsgLy8gbmV3IEFycmF5KG51bVByb3BzKTtcbiAgICBcbiAgICAvLyB0cmFwUmVzdWx0IGlzIHN1cHBvc2VkIHRvIGJlIGFuIGl0ZXJhdG9yXG4gICAgLy8gZHJhaW4gaXRlcmF0b3IgdG8gYXJyYXkgYXMgY3VycmVudCBpbXBsZW1lbnRhdGlvbnMgc3RpbGwgZXhwZWN0XG4gICAgLy8gZW51bWVyYXRlIHRvIHJldHVybiBhbiBhcnJheSBvZiBzdHJpbmdzXG4gICAgdmFyIG54dCA9IHRyYXBSZXN1bHQubmV4dCgpO1xuICAgIFxuICAgIHdoaWxlICghbnh0LmRvbmUpIHtcbiAgICAgIHZhciBzID0gU3RyaW5nKG54dC52YWx1ZSk7XG4gICAgICBpZiAocHJvcE5hbWVzW3NdKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJlbnVtZXJhdGUgdHJhcCBjYW5ub3QgbGlzdCBhIFwiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZHVwbGljYXRlIHByb3BlcnR5ICdcIitzK1wiJ1wiKTtcbiAgICAgIH1cbiAgICAgIHByb3BOYW1lc1tzXSA9IHRydWU7XG4gICAgICByZXN1bHQucHVzaChzKTtcbiAgICAgIG54dCA9IHRyYXBSZXN1bHQubmV4dCgpO1xuICAgIH1cbiAgICBcbiAgICAvKmZvciAodmFyIGkgPSAwOyBpIDwgbnVtUHJvcHM7IGkrKykge1xuICAgICAgdmFyIHMgPSBTdHJpbmcodHJhcFJlc3VsdFtpXSk7XG4gICAgICBpZiAocHJvcE5hbWVzW3NdKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJlbnVtZXJhdGUgdHJhcCBjYW5ub3QgbGlzdCBhIFwiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZHVwbGljYXRlIHByb3BlcnR5ICdcIitzK1wiJ1wiKTtcbiAgICAgIH1cblxuICAgICAgcHJvcE5hbWVzW3NdID0gdHJ1ZTtcbiAgICAgIHJlc3VsdFtpXSA9IHM7XG4gICAgfSAqL1xuXG4gICAgdmFyIG93bkVudW1lcmFibGVQcm9wcyA9IE9iamVjdC5rZXlzKHRoaXMudGFyZ2V0KTtcbiAgICB2YXIgdGFyZ2V0ID0gdGhpcy50YXJnZXQ7XG4gICAgb3duRW51bWVyYWJsZVByb3BzLmZvckVhY2goZnVuY3Rpb24gKG93bkVudW1lcmFibGVQcm9wKSB7XG4gICAgICBpZiAoIXByb3BOYW1lc1tvd25FbnVtZXJhYmxlUHJvcF0pIHtcbiAgICAgICAgaWYgKGlzU2VhbGVkKG93bkVudW1lcmFibGVQcm9wLCB0YXJnZXQpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImVudW1lcmF0ZSB0cmFwIGZhaWxlZCB0byBpbmNsdWRlIFwiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJub24tY29uZmlndXJhYmxlIGVudW1lcmFibGUgcHJvcGVydHkgJ1wiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3duRW51bWVyYWJsZVByb3ArXCInXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghT2JqZWN0LmlzRXh0ZW5zaWJsZSh0YXJnZXQpICYmXG4gICAgICAgICAgICBpc0ZpeGVkKG93bkVudW1lcmFibGVQcm9wLCB0YXJnZXQpKSB7XG4gICAgICAgICAgICAvLyBpZiBoYW5kbGVyIGlzIGFsbG93ZWQgbm90IHRvIHJlcG9ydCBvd25FbnVtZXJhYmxlUHJvcCBhcyBhbiBvd25cbiAgICAgICAgICAgIC8vIHByb3BlcnR5LCB3ZSBjYW5ub3QgZ3VhcmFudGVlIHRoYXQgaXQgd2lsbCBuZXZlciByZXBvcnQgaXQgYXNcbiAgICAgICAgICAgIC8vIGFuIG93biBwcm9wZXJ0eSBsYXRlci4gT25jZSBhIHByb3BlcnR5IGhhcyBiZWVuIHJlcG9ydGVkIGFzXG4gICAgICAgICAgICAvLyBub24tZXhpc3RlbnQgb24gYSBub24tZXh0ZW5zaWJsZSBvYmplY3QsIGl0IHNob3VsZCBmb3JldmVyIGJlXG4gICAgICAgICAgICAvLyByZXBvcnRlZCBhcyBub24tZXhpc3RlbnRcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJjYW5ub3QgcmVwb3J0IGV4aXN0aW5nIG93biBwcm9wZXJ0eSAnXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG93bkVudW1lcmFibGVQcm9wK1wiJyBhcyBub24tZXhpc3RlbnQgb24gYSBcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJub24tZXh0ZW5zaWJsZSBvYmplY3RcIik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH0sXG5cbiAgLyoqXG4gICAqIFRoZSBpdGVyYXRlIHRyYXAgaXMgZGVwcmVjYXRlZCBieSB0aGUgZW51bWVyYXRlIHRyYXAuXG4gICAqL1xuICBpdGVyYXRlOiBWYWxpZGF0b3IucHJvdG90eXBlLmVudW1lcmF0ZSxcblxuICAvKipcbiAgICogQW55IG93biBub24tY29uZmlndXJhYmxlIHByb3BlcnRpZXMgb2YgdGhlIHRhcmdldCB0aGF0IGFyZSBub3QgaW5jbHVkZWRcbiAgICogaW4gdGhlIHRyYXAgcmVzdWx0IGdpdmUgcmlzZSB0byBhIFR5cGVFcnJvci4gQXMgc3VjaCwgd2UgY2hlY2sgd2hldGhlciB0aGVcbiAgICogcmV0dXJuZWQgcmVzdWx0IGNvbnRhaW5zIGF0IGxlYXN0IGFsbCBzZWFsZWQgcHJvcGVydGllcyBvZiB0aGUgdGFyZ2V0XG4gICAqIG9iamVjdC5cbiAgICpcbiAgICogVGhlIHRyYXAgcmVzdWx0IGlzIG5vcm1hbGl6ZWQuXG4gICAqIFRoZSB0cmFwIHJlc3VsdCBpcyBub3QgcmV0dXJuZWQgZGlyZWN0bHkuIEluc3RlYWQ6XG4gICAqICAtIGNyZWF0ZSBhbmQgcmV0dXJuIGEgZnJlc2ggQXJyYXksXG4gICAqICAtIG9mIHdoaWNoIGVhY2ggZWxlbWVudCBpcyBjb2VyY2VkIHRvIFN0cmluZyxcbiAgICogIC0gd2hpY2ggZG9lcyBub3QgY29udGFpbiBkdXBsaWNhdGVzXG4gICAqXG4gICAqIEZJWE1FOiBrZXlzIHRyYXAgaXMgZGVwcmVjYXRlZFxuICAgKi9cbiAgLypcbiAga2V5czogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRyYXAgPSB0aGlzLmdldFRyYXAoXCJrZXlzXCIpO1xuICAgIGlmICh0cmFwID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIGRlZmF1bHQgZm9yd2FyZGluZyBiZWhhdmlvclxuICAgICAgcmV0dXJuIFJlZmxlY3Qua2V5cyh0aGlzLnRhcmdldCk7XG4gICAgfVxuXG4gICAgdmFyIHRyYXBSZXN1bHQgPSB0cmFwLmNhbGwodGhpcy5oYW5kbGVyLCB0aGlzLnRhcmdldCk7XG5cbiAgICAvLyBwcm9wTmFtZXMgaXMgdXNlZCBhcyBhIHNldCBvZiBzdHJpbmdzXG4gICAgdmFyIHByb3BOYW1lcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgdmFyIG51bVByb3BzID0gK3RyYXBSZXN1bHQubGVuZ3RoO1xuICAgIHZhciByZXN1bHQgPSBuZXcgQXJyYXkobnVtUHJvcHMpO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBudW1Qcm9wczsgaSsrKSB7XG4gICAgIHZhciBzID0gU3RyaW5nKHRyYXBSZXN1bHRbaV0pO1xuICAgICBpZiAocHJvcE5hbWVzW3NdKSB7XG4gICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImtleXMgdHJhcCBjYW5ub3QgbGlzdCBhIFwiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJkdXBsaWNhdGUgcHJvcGVydHkgJ1wiK3MrXCInXCIpO1xuICAgICB9XG4gICAgIGlmICghT2JqZWN0LmlzRXh0ZW5zaWJsZSh0aGlzLnRhcmdldCkgJiYgIWlzRml4ZWQocywgdGhpcy50YXJnZXQpKSB7XG4gICAgICAgLy8gbm9uLWV4dGVuc2libGUgcHJveGllcyBkb24ndCB0b2xlcmF0ZSBuZXcgb3duIHByb3BlcnR5IG5hbWVzXG4gICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImtleXMgdHJhcCBjYW5ub3QgbGlzdCBhIG5ldyBcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgIFwicHJvcGVydHkgJ1wiK3MrXCInIG9uIGEgbm9uLWV4dGVuc2libGUgb2JqZWN0XCIpO1xuICAgICB9XG5cbiAgICAgcHJvcE5hbWVzW3NdID0gdHJ1ZTtcbiAgICAgcmVzdWx0W2ldID0gcztcbiAgICB9XG5cbiAgICB2YXIgb3duRW51bWVyYWJsZVByb3BzID0gT2JqZWN0LmtleXModGhpcy50YXJnZXQpO1xuICAgIHZhciB0YXJnZXQgPSB0aGlzLnRhcmdldDtcbiAgICBvd25FbnVtZXJhYmxlUHJvcHMuZm9yRWFjaChmdW5jdGlvbiAob3duRW51bWVyYWJsZVByb3ApIHtcbiAgICAgIGlmICghcHJvcE5hbWVzW293bkVudW1lcmFibGVQcm9wXSkge1xuICAgICAgICBpZiAoaXNTZWFsZWQob3duRW51bWVyYWJsZVByb3AsIHRhcmdldCkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwia2V5cyB0cmFwIGZhaWxlZCB0byBpbmNsdWRlIFwiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJub24tY29uZmlndXJhYmxlIGVudW1lcmFibGUgcHJvcGVydHkgJ1wiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3duRW51bWVyYWJsZVByb3ArXCInXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghT2JqZWN0LmlzRXh0ZW5zaWJsZSh0YXJnZXQpICYmXG4gICAgICAgICAgICBpc0ZpeGVkKG93bkVudW1lcmFibGVQcm9wLCB0YXJnZXQpKSB7XG4gICAgICAgICAgICAvLyBpZiBoYW5kbGVyIGlzIGFsbG93ZWQgbm90IHRvIHJlcG9ydCBvd25FbnVtZXJhYmxlUHJvcCBhcyBhbiBvd25cbiAgICAgICAgICAgIC8vIHByb3BlcnR5LCB3ZSBjYW5ub3QgZ3VhcmFudGVlIHRoYXQgaXQgd2lsbCBuZXZlciByZXBvcnQgaXQgYXNcbiAgICAgICAgICAgIC8vIGFuIG93biBwcm9wZXJ0eSBsYXRlci4gT25jZSBhIHByb3BlcnR5IGhhcyBiZWVuIHJlcG9ydGVkIGFzXG4gICAgICAgICAgICAvLyBub24tZXhpc3RlbnQgb24gYSBub24tZXh0ZW5zaWJsZSBvYmplY3QsIGl0IHNob3VsZCBmb3JldmVyIGJlXG4gICAgICAgICAgICAvLyByZXBvcnRlZCBhcyBub24tZXhpc3RlbnRcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJjYW5ub3QgcmVwb3J0IGV4aXN0aW5nIG93biBwcm9wZXJ0eSAnXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG93bkVudW1lcmFibGVQcm9wK1wiJyBhcyBub24tZXhpc3RlbnQgb24gYSBcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJub24tZXh0ZW5zaWJsZSBvYmplY3RcIik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH0sXG4gICovXG4gIFxuICAvKipcbiAgICogTmV3IHRyYXAgdGhhdCByZWlmaWVzIFtbQ2FsbF1dLlxuICAgKiBJZiB0aGUgdGFyZ2V0IGlzIGEgZnVuY3Rpb24sIHRoZW4gYSBjYWxsIHRvXG4gICAqICAgcHJveHkoLi4uYXJncylcbiAgICogVHJpZ2dlcnMgdGhpcyB0cmFwXG4gICAqL1xuICBhcHBseTogZnVuY3Rpb24odGFyZ2V0LCB0aGlzQmluZGluZywgYXJncykge1xuICAgIHZhciB0cmFwID0gdGhpcy5nZXRUcmFwKFwiYXBwbHlcIik7XG4gICAgaWYgKHRyYXAgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIFJlZmxlY3QuYXBwbHkodGFyZ2V0LCB0aGlzQmluZGluZywgYXJncyk7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiB0aGlzLnRhcmdldCA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICByZXR1cm4gdHJhcC5jYWxsKHRoaXMuaGFuZGxlciwgdGFyZ2V0LCB0aGlzQmluZGluZywgYXJncyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJhcHBseTogXCIrIHRhcmdldCArIFwiIGlzIG5vdCBhIGZ1bmN0aW9uXCIpO1xuICAgIH1cbiAgfSxcblxuICAvKipcbiAgICogTmV3IHRyYXAgdGhhdCByZWlmaWVzIFtbQ29uc3RydWN0XV0uXG4gICAqIElmIHRoZSB0YXJnZXQgaXMgYSBmdW5jdGlvbiwgdGhlbiBhIGNhbGwgdG9cbiAgICogICBuZXcgcHJveHkoLi4uYXJncylcbiAgICogVHJpZ2dlcnMgdGhpcyB0cmFwXG4gICAqL1xuICBjb25zdHJ1Y3Q6IGZ1bmN0aW9uKHRhcmdldCwgYXJncywgbmV3VGFyZ2V0KSB7XG4gICAgdmFyIHRyYXAgPSB0aGlzLmdldFRyYXAoXCJjb25zdHJ1Y3RcIik7XG4gICAgaWYgKHRyYXAgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIFJlZmxlY3QuY29uc3RydWN0KHRhcmdldCwgYXJncywgbmV3VGFyZ2V0KTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHRhcmdldCAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwibmV3OiBcIisgdGFyZ2V0ICsgXCIgaXMgbm90IGEgZnVuY3Rpb25cIik7XG4gICAgfVxuXG4gICAgaWYgKG5ld1RhcmdldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBuZXdUYXJnZXQgPSB0YXJnZXQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0eXBlb2YgbmV3VGFyZ2V0ICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIm5ldzogXCIrIG5ld1RhcmdldCArIFwiIGlzIG5vdCBhIGZ1bmN0aW9uXCIpO1xuICAgICAgfSAgICAgIFxuICAgIH1cbiAgICByZXR1cm4gdHJhcC5jYWxsKHRoaXMuaGFuZGxlciwgdGFyZ2V0LCBhcmdzLCBuZXdUYXJnZXQpO1xuICB9XG59O1xuXG4vLyAtLS0tIGVuZCBvZiB0aGUgVmFsaWRhdG9yIGhhbmRsZXIgd3JhcHBlciBoYW5kbGVyIC0tLS1cblxuLy8gSW4gd2hhdCBmb2xsb3dzLCBhICdkaXJlY3QgcHJveHknIGlzIGEgcHJveHlcbi8vIHdob3NlIGhhbmRsZXIgaXMgYSBWYWxpZGF0b3IuIFN1Y2ggcHJveGllcyBjYW4gYmUgbWFkZSBub24tZXh0ZW5zaWJsZSxcbi8vIHNlYWxlZCBvciBmcm96ZW4gd2l0aG91dCBsb3NpbmcgdGhlIGFiaWxpdHkgdG8gdHJhcC5cblxuLy8gbWFwcyBkaXJlY3QgcHJveGllcyB0byB0aGVpciBWYWxpZGF0b3IgaGFuZGxlcnNcbnZhciBkaXJlY3RQcm94aWVzID0gbmV3IFdlYWtNYXAoKTtcblxuLy8gcGF0Y2ggT2JqZWN0LntwcmV2ZW50RXh0ZW5zaW9ucyxzZWFsLGZyZWV6ZX0gc28gdGhhdFxuLy8gdGhleSByZWNvZ25pemUgZml4YWJsZSBwcm94aWVzIGFuZCBhY3QgYWNjb3JkaW5nbHlcbk9iamVjdC5wcmV2ZW50RXh0ZW5zaW9ucyA9IGZ1bmN0aW9uKHN1YmplY3QpIHtcbiAgdmFyIHZoYW5kbGVyID0gZGlyZWN0UHJveGllcy5nZXQoc3ViamVjdCk7XG4gIGlmICh2aGFuZGxlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKHZoYW5kbGVyLnByZXZlbnRFeHRlbnNpb25zKCkpIHtcbiAgICAgIHJldHVybiBzdWJqZWN0O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwicHJldmVudEV4dGVuc2lvbnMgb24gXCIrc3ViamVjdCtcIiByZWplY3RlZFwiKTtcbiAgICB9XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHByaW1fcHJldmVudEV4dGVuc2lvbnMoc3ViamVjdCk7XG4gIH1cbn07XG5PYmplY3Quc2VhbCA9IGZ1bmN0aW9uKHN1YmplY3QpIHtcbiAgc2V0SW50ZWdyaXR5TGV2ZWwoc3ViamVjdCwgXCJzZWFsZWRcIik7XG4gIHJldHVybiBzdWJqZWN0O1xufTtcbk9iamVjdC5mcmVlemUgPSBmdW5jdGlvbihzdWJqZWN0KSB7XG4gIHNldEludGVncml0eUxldmVsKHN1YmplY3QsIFwiZnJvemVuXCIpO1xuICByZXR1cm4gc3ViamVjdDtcbn07XG5PYmplY3QuaXNFeHRlbnNpYmxlID0gT2JqZWN0X2lzRXh0ZW5zaWJsZSA9IGZ1bmN0aW9uKHN1YmplY3QpIHtcbiAgdmFyIHZIYW5kbGVyID0gZGlyZWN0UHJveGllcy5nZXQoc3ViamVjdCk7XG4gIGlmICh2SGFuZGxlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHZIYW5kbGVyLmlzRXh0ZW5zaWJsZSgpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBwcmltX2lzRXh0ZW5zaWJsZShzdWJqZWN0KTtcbiAgfVxufTtcbk9iamVjdC5pc1NlYWxlZCA9IE9iamVjdF9pc1NlYWxlZCA9IGZ1bmN0aW9uKHN1YmplY3QpIHtcbiAgcmV0dXJuIHRlc3RJbnRlZ3JpdHlMZXZlbChzdWJqZWN0LCBcInNlYWxlZFwiKTtcbn07XG5PYmplY3QuaXNGcm96ZW4gPSBPYmplY3RfaXNGcm96ZW4gPSBmdW5jdGlvbihzdWJqZWN0KSB7XG4gIHJldHVybiB0ZXN0SW50ZWdyaXR5TGV2ZWwoc3ViamVjdCwgXCJmcm96ZW5cIik7XG59O1xuT2JqZWN0LmdldFByb3RvdHlwZU9mID0gT2JqZWN0X2dldFByb3RvdHlwZU9mID0gZnVuY3Rpb24oc3ViamVjdCkge1xuICB2YXIgdkhhbmRsZXIgPSBkaXJlY3RQcm94aWVzLmdldChzdWJqZWN0KTtcbiAgaWYgKHZIYW5kbGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdkhhbmRsZXIuZ2V0UHJvdG90eXBlT2YoKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcHJpbV9nZXRQcm90b3R5cGVPZihzdWJqZWN0KTtcbiAgfVxufTtcblxuLy8gcGF0Y2ggT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvciB0byBkaXJlY3RseSBjYWxsXG4vLyB0aGUgVmFsaWRhdG9yLnByb3RvdHlwZS5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IgdHJhcFxuLy8gVGhpcyBpcyB0byBjaXJjdW12ZW50IGFuIGFzc2VydGlvbiBpbiB0aGUgYnVpbHQtaW4gUHJveHlcbi8vIHRyYXBwaW5nIG1lY2hhbmlzbSBvZiB2OCwgd2hpY2ggZGlzYWxsb3dzIHRoYXQgdHJhcCB0b1xuLy8gcmV0dXJuIG5vbi1jb25maWd1cmFibGUgcHJvcGVydHkgZGVzY3JpcHRvcnMgKGFzIHBlciB0aGVcbi8vIG9sZCBQcm94eSBkZXNpZ24pXG5PYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yID0gZnVuY3Rpb24oc3ViamVjdCwgbmFtZSkge1xuICB2YXIgdmhhbmRsZXIgPSBkaXJlY3RQcm94aWVzLmdldChzdWJqZWN0KTtcbiAgaWYgKHZoYW5kbGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdmhhbmRsZXIuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKG5hbWUpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBwcmltX2dldE93blByb3BlcnR5RGVzY3JpcHRvcihzdWJqZWN0LCBuYW1lKTtcbiAgfVxufTtcblxuLy8gcGF0Y2ggT2JqZWN0LmRlZmluZVByb3BlcnR5IHRvIGRpcmVjdGx5IGNhbGxcbi8vIHRoZSBWYWxpZGF0b3IucHJvdG90eXBlLmRlZmluZVByb3BlcnR5IHRyYXBcbi8vIFRoaXMgaXMgdG8gY2lyY3VtdmVudCB0d28gaXNzdWVzIHdpdGggdGhlIGJ1aWx0LWluXG4vLyB0cmFwIG1lY2hhbmlzbTpcbi8vIDEpIHRoZSBjdXJyZW50IHRyYWNlbW9ua2V5IGltcGxlbWVudGF0aW9uIG9mIHByb3hpZXNcbi8vIGF1dG8tY29tcGxldGVzICdkZXNjJywgd2hpY2ggaXMgbm90IGNvcnJlY3QuICdkZXNjJyBzaG91bGQgYmVcbi8vIG5vcm1hbGl6ZWQsIGJ1dCBub3QgY29tcGxldGVkLiBDb25zaWRlcjpcbi8vIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm94eSwgJ2ZvbycsIHtlbnVtZXJhYmxlOmZhbHNlfSlcbi8vIFRoaXMgdHJhcCB3aWxsIHJlY2VpdmUgZGVzYyA9XG4vLyAge3ZhbHVlOnVuZGVmaW5lZCx3cml0YWJsZTpmYWxzZSxlbnVtZXJhYmxlOmZhbHNlLGNvbmZpZ3VyYWJsZTpmYWxzZX1cbi8vIFRoaXMgd2lsbCBhbHNvIHNldCBhbGwgb3RoZXIgYXR0cmlidXRlcyB0byB0aGVpciBkZWZhdWx0IHZhbHVlLFxuLy8gd2hpY2ggaXMgdW5leHBlY3RlZCBhbmQgZGlmZmVyZW50IGZyb20gW1tEZWZpbmVPd25Qcm9wZXJ0eV1dLlxuLy8gQnVnIGZpbGVkOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD02MDEzMjlcbi8vIDIpIHRoZSBjdXJyZW50IHNwaWRlcm1vbmtleSBpbXBsZW1lbnRhdGlvbiBkb2VzIG5vdFxuLy8gdGhyb3cgYW4gZXhjZXB0aW9uIHdoZW4gdGhpcyB0cmFwIHJldHVybnMgJ2ZhbHNlJywgYnV0IGluc3RlYWQgc2lsZW50bHlcbi8vIGlnbm9yZXMgdGhlIG9wZXJhdGlvbiAodGhpcyBpcyByZWdhcmRsZXNzIG9mIHN0cmljdC1tb2RlKVxuLy8gMmEpIHY4IGRvZXMgdGhyb3cgYW4gZXhjZXB0aW9uIGZvciB0aGlzIGNhc2UsIGJ1dCBpbmNsdWRlcyB0aGUgcmF0aGVyXG4vLyAgICAgdW5oZWxwZnVsIGVycm9yIG1lc3NhZ2U6XG4vLyAnUHJveHkgaGFuZGxlciAjPE9iamVjdD4gcmV0dXJuZWQgZmFsc2UgZnJvbSAnZGVmaW5lUHJvcGVydHknIHRyYXAnXG5PYmplY3QuZGVmaW5lUHJvcGVydHkgPSBmdW5jdGlvbihzdWJqZWN0LCBuYW1lLCBkZXNjKSB7XG4gIHZhciB2aGFuZGxlciA9IGRpcmVjdFByb3hpZXMuZ2V0KHN1YmplY3QpO1xuICBpZiAodmhhbmRsZXIgIT09IHVuZGVmaW5lZCkge1xuICAgIHZhciBub3JtYWxpemVkRGVzYyA9IG5vcm1hbGl6ZVByb3BlcnR5RGVzY3JpcHRvcihkZXNjKTtcbiAgICB2YXIgc3VjY2VzcyA9IHZoYW5kbGVyLmRlZmluZVByb3BlcnR5KG5hbWUsIG5vcm1hbGl6ZWREZXNjKTtcbiAgICBpZiAoc3VjY2VzcyA9PT0gZmFsc2UpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJjYW4ndCByZWRlZmluZSBwcm9wZXJ0eSAnXCIrbmFtZStcIidcIik7XG4gICAgfVxuICAgIHJldHVybiBzdWJqZWN0O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBwcmltX2RlZmluZVByb3BlcnR5KHN1YmplY3QsIG5hbWUsIGRlc2MpO1xuICB9XG59O1xuXG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyA9IGZ1bmN0aW9uKHN1YmplY3QsIGRlc2NzKSB7XG4gIHZhciB2aGFuZGxlciA9IGRpcmVjdFByb3hpZXMuZ2V0KHN1YmplY3QpO1xuICBpZiAodmhhbmRsZXIgIT09IHVuZGVmaW5lZCkge1xuICAgIHZhciBuYW1lcyA9IE9iamVjdC5rZXlzKGRlc2NzKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG5hbWVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgbmFtZSA9IG5hbWVzW2ldO1xuICAgICAgdmFyIG5vcm1hbGl6ZWREZXNjID0gbm9ybWFsaXplUHJvcGVydHlEZXNjcmlwdG9yKGRlc2NzW25hbWVdKTtcbiAgICAgIHZhciBzdWNjZXNzID0gdmhhbmRsZXIuZGVmaW5lUHJvcGVydHkobmFtZSwgbm9ybWFsaXplZERlc2MpO1xuICAgICAgaWYgKHN1Y2Nlc3MgPT09IGZhbHNlKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJjYW4ndCByZWRlZmluZSBwcm9wZXJ0eSAnXCIrbmFtZStcIidcIik7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzdWJqZWN0O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBwcmltX2RlZmluZVByb3BlcnRpZXMoc3ViamVjdCwgZGVzY3MpO1xuICB9XG59O1xuXG5PYmplY3Qua2V5cyA9IGZ1bmN0aW9uKHN1YmplY3QpIHtcbiAgdmFyIHZIYW5kbGVyID0gZGlyZWN0UHJveGllcy5nZXQoc3ViamVjdCk7XG4gIGlmICh2SGFuZGxlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgdmFyIG93bktleXMgPSB2SGFuZGxlci5vd25LZXlzKCk7XG4gICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgb3duS2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGsgPSBTdHJpbmcob3duS2V5c1tpXSk7XG4gICAgICB2YXIgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3Ioc3ViamVjdCwgayk7XG4gICAgICBpZiAoZGVzYyAhPT0gdW5kZWZpbmVkICYmIGRlc2MuZW51bWVyYWJsZSA9PT0gdHJ1ZSkge1xuICAgICAgICByZXN1bHQucHVzaChrKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcHJpbV9rZXlzKHN1YmplY3QpO1xuICB9XG59XG5cbk9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzID0gT2JqZWN0X2dldE93blByb3BlcnR5TmFtZXMgPSBmdW5jdGlvbihzdWJqZWN0KSB7XG4gIHZhciB2SGFuZGxlciA9IGRpcmVjdFByb3hpZXMuZ2V0KHN1YmplY3QpO1xuICBpZiAodkhhbmRsZXIgIT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB2SGFuZGxlci5vd25LZXlzKCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHByaW1fZ2V0T3duUHJvcGVydHlOYW1lcyhzdWJqZWN0KTtcbiAgfVxufVxuXG4vLyBmaXhlcyBpc3N1ZSAjNzEgKENhbGxpbmcgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scygpIG9uIGEgUHJveHlcbi8vIHRocm93cyBhbiBlcnJvcilcbmlmIChwcmltX2dldE93blByb3BlcnR5U3ltYm9scyAhPT0gdW5kZWZpbmVkKSB7XG4gIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPSBmdW5jdGlvbihzdWJqZWN0KSB7XG4gICAgdmFyIHZIYW5kbGVyID0gZGlyZWN0UHJveGllcy5nZXQoc3ViamVjdCk7XG4gICAgaWYgKHZIYW5kbGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIGFzIHRoaXMgc2hpbSBkb2VzIG5vdCBzdXBwb3J0IHN5bWJvbHMsIGEgUHJveHkgbmV2ZXIgYWR2ZXJ0aXNlc1xuICAgICAgLy8gYW55IHN5bWJvbC12YWx1ZWQgb3duIHByb3BlcnRpZXNcbiAgICAgIHJldHVybiBbXTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHByaW1fZ2V0T3duUHJvcGVydHlTeW1ib2xzKHN1YmplY3QpO1xuICAgIH1cbiAgfTtcbn1cblxuLy8gZml4ZXMgaXNzdWUgIzcyICgnSWxsZWdhbCBhY2Nlc3MnIGVycm9yIHdoZW4gdXNpbmcgT2JqZWN0LmFzc2lnbilcbi8vIE9iamVjdC5hc3NpZ24gcG9seWZpbGwgYmFzZWQgb24gYSBwb2x5ZmlsbCBwb3N0ZWQgb24gTUROOiBcbi8vIGh0dHBzOi8vZGV2ZWxvcGVyLm1vemlsbGEub3JnL2VuLVVTL2RvY3MvV2ViL0phdmFTY3JpcHQvUmVmZXJlbmNlL1xcXG4vLyAgR2xvYmFsX09iamVjdHMvT2JqZWN0L2Fzc2lnblxuLy8gTm90ZSB0aGF0IHRoaXMgcG9seWZpbGwgZG9lcyBub3Qgc3VwcG9ydCBTeW1ib2xzLCBidXQgdGhpcyBQcm94eSBTaGltXG4vLyBkb2VzIG5vdCBzdXBwb3J0IFN5bWJvbHMgYW55d2F5LlxuaWYgKHByaW1fYXNzaWduICE9PSB1bmRlZmluZWQpIHtcbiAgT2JqZWN0LmFzc2lnbiA9IGZ1bmN0aW9uICh0YXJnZXQpIHtcbiAgICBcbiAgICAvLyBjaGVjayBpZiBhbnkgYXJndW1lbnQgaXMgYSBwcm94eSBvYmplY3RcbiAgICB2YXIgbm9Qcm94aWVzID0gdHJ1ZTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIHZIYW5kbGVyID0gZGlyZWN0UHJveGllcy5nZXQoYXJndW1lbnRzW2ldKTtcbiAgICAgIGlmICh2SGFuZGxlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIG5vUHJveGllcyA9IGZhbHNlO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKG5vUHJveGllcykge1xuICAgICAgLy8gbm90IGEgc2luZ2xlIGFyZ3VtZW50IGlzIGEgcHJveHksIHBlcmZvcm0gYnVpbHQtaW4gYWxnb3JpdGhtXG4gICAgICByZXR1cm4gcHJpbV9hc3NpZ24uYXBwbHkoT2JqZWN0LCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBcbiAgICAvLyB0aGVyZSBpcyBhdCBsZWFzdCBvbmUgcHJveHkgYXJndW1lbnQsIHVzZSB0aGUgcG9seWZpbGxcbiAgICBcbiAgICBpZiAodGFyZ2V0ID09PSB1bmRlZmluZWQgfHwgdGFyZ2V0ID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdDYW5ub3QgY29udmVydCB1bmRlZmluZWQgb3IgbnVsbCB0byBvYmplY3QnKTtcbiAgICB9XG5cbiAgICB2YXIgb3V0cHV0ID0gT2JqZWN0KHRhcmdldCk7XG4gICAgZm9yICh2YXIgaW5kZXggPSAxOyBpbmRleCA8IGFyZ3VtZW50cy5sZW5ndGg7IGluZGV4KyspIHtcbiAgICAgIHZhciBzb3VyY2UgPSBhcmd1bWVudHNbaW5kZXhdO1xuICAgICAgaWYgKHNvdXJjZSAhPT0gdW5kZWZpbmVkICYmIHNvdXJjZSAhPT0gbnVsbCkge1xuICAgICAgICBmb3IgKHZhciBuZXh0S2V5IGluIHNvdXJjZSkge1xuICAgICAgICAgIGlmIChzb3VyY2UuaGFzT3duUHJvcGVydHkobmV4dEtleSkpIHtcbiAgICAgICAgICAgIG91dHB1dFtuZXh0S2V5XSA9IHNvdXJjZVtuZXh0S2V5XTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG91dHB1dDtcbiAgfTtcbn1cblxuLy8gcmV0dXJucyB3aGV0aGVyIGFuIGFyZ3VtZW50IGlzIGEgcmVmZXJlbmNlIHRvIGFuIG9iamVjdCxcbi8vIHdoaWNoIGlzIGxlZ2FsIGFzIGEgV2Vha01hcCBrZXkuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgdmFyIHR5cGUgPSB0eXBlb2YgYXJnO1xuICByZXR1cm4gKHR5cGUgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbCkgfHwgKHR5cGUgPT09ICdmdW5jdGlvbicpO1xufTtcblxuLy8gYSB3cmFwcGVyIGZvciBXZWFrTWFwLmdldCB3aGljaCByZXR1cm5zIHRoZSB1bmRlZmluZWQgdmFsdWVcbi8vIGZvciBrZXlzIHRoYXQgYXJlIG5vdCBvYmplY3RzIChpbiB3aGljaCBjYXNlIHRoZSB1bmRlcmx5aW5nXG4vLyBXZWFrTWFwIHdvdWxkIGhhdmUgdGhyb3duIGEgVHlwZUVycm9yKS5cbmZ1bmN0aW9uIHNhZmVXZWFrTWFwR2V0KG1hcCwga2V5KSB7XG4gIHJldHVybiBpc09iamVjdChrZXkpID8gbWFwLmdldChrZXkpIDogdW5kZWZpbmVkO1xufTtcblxuLy8gcmV0dXJucyBhIG5ldyBmdW5jdGlvbiBvZiB6ZXJvIGFyZ3VtZW50cyB0aGF0IHJlY3Vyc2l2ZWx5XG4vLyB1bndyYXBzIGFueSBwcm94aWVzIHNwZWNpZmllZCBhcyB0aGUgfHRoaXN8LXZhbHVlLlxuLy8gVGhlIHByaW1pdGl2ZSBpcyBhc3N1bWVkIHRvIGJlIGEgemVyby1hcmd1bWVudCBtZXRob2Rcbi8vIHRoYXQgdXNlcyBpdHMgfHRoaXN8LWJpbmRpbmcuXG5mdW5jdGlvbiBtYWtlVW53cmFwcGluZzBBcmdNZXRob2QocHJpbWl0aXZlKSB7XG4gIHJldHVybiBmdW5jdGlvbiBidWlsdGluKCkge1xuICAgIHZhciB2SGFuZGxlciA9IHNhZmVXZWFrTWFwR2V0KGRpcmVjdFByb3hpZXMsIHRoaXMpO1xuICAgIGlmICh2SGFuZGxlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gYnVpbHRpbi5jYWxsKHZIYW5kbGVyLnRhcmdldCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBwcmltaXRpdmUuY2FsbCh0aGlzKTtcbiAgICB9XG4gIH1cbn07XG5cbi8vIHJldHVybnMgYSBuZXcgZnVuY3Rpb24gb2YgMSBhcmd1bWVudHMgdGhhdCByZWN1cnNpdmVseVxuLy8gdW53cmFwcyBhbnkgcHJveGllcyBzcGVjaWZpZWQgYXMgdGhlIHx0aGlzfC12YWx1ZS5cbi8vIFRoZSBwcmltaXRpdmUgaXMgYXNzdW1lZCB0byBiZSBhIDEtYXJndW1lbnQgbWV0aG9kXG4vLyB0aGF0IHVzZXMgaXRzIHx0aGlzfC1iaW5kaW5nLlxuZnVuY3Rpb24gbWFrZVVud3JhcHBpbmcxQXJnTWV0aG9kKHByaW1pdGl2ZSkge1xuICByZXR1cm4gZnVuY3Rpb24gYnVpbHRpbihhcmcpIHtcbiAgICB2YXIgdkhhbmRsZXIgPSBzYWZlV2Vha01hcEdldChkaXJlY3RQcm94aWVzLCB0aGlzKTtcbiAgICBpZiAodkhhbmRsZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIGJ1aWx0aW4uY2FsbCh2SGFuZGxlci50YXJnZXQsIGFyZyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBwcmltaXRpdmUuY2FsbCh0aGlzLCBhcmcpO1xuICAgIH1cbiAgfVxufTtcblxuT2JqZWN0LnByb3RvdHlwZS52YWx1ZU9mID1cbiAgbWFrZVVud3JhcHBpbmcwQXJnTWV0aG9kKE9iamVjdC5wcm90b3R5cGUudmFsdWVPZik7XG5PYmplY3QucHJvdG90eXBlLnRvU3RyaW5nID1cbiAgbWFrZVVud3JhcHBpbmcwQXJnTWV0aG9kKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcpO1xuRnVuY3Rpb24ucHJvdG90eXBlLnRvU3RyaW5nID1cbiAgbWFrZVVud3JhcHBpbmcwQXJnTWV0aG9kKEZ1bmN0aW9uLnByb3RvdHlwZS50b1N0cmluZyk7XG5EYXRlLnByb3RvdHlwZS50b1N0cmluZyA9XG4gIG1ha2VVbndyYXBwaW5nMEFyZ01ldGhvZChEYXRlLnByb3RvdHlwZS50b1N0cmluZyk7XG5cbk9iamVjdC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZiA9IGZ1bmN0aW9uIGJ1aWx0aW4oYXJnKSB7XG4gIC8vIGJ1Z2ZpeCB0aGFua3MgdG8gQmlsbCBNYXJrOlxuICAvLyBidWlsdC1pbiBpc1Byb3RvdHlwZU9mIGRvZXMgbm90IHVud3JhcCBwcm94aWVzIHVzZWRcbiAgLy8gYXMgYXJndW1lbnRzLiBTbywgd2UgaW1wbGVtZW50IHRoZSBidWlsdGluIG91cnNlbHZlcyxcbiAgLy8gYmFzZWQgb24gdGhlIEVDTUFTY3JpcHQgNiBzcGVjLiBPdXIgZW5jb2Rpbmcgd2lsbFxuICAvLyBtYWtlIHN1cmUgdGhhdCBpZiBhIHByb3h5IGlzIHVzZWQgYXMgYW4gYXJndW1lbnQsXG4gIC8vIGl0cyBnZXRQcm90b3R5cGVPZiB0cmFwIHdpbGwgYmUgY2FsbGVkLlxuICB3aGlsZSAodHJ1ZSkge1xuICAgIHZhciB2SGFuZGxlcjIgPSBzYWZlV2Vha01hcEdldChkaXJlY3RQcm94aWVzLCBhcmcpO1xuICAgIGlmICh2SGFuZGxlcjIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgYXJnID0gdkhhbmRsZXIyLmdldFByb3RvdHlwZU9mKCk7XG4gICAgICBpZiAoYXJnID09PSBudWxsKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH0gZWxzZSBpZiAoc2FtZVZhbHVlKGFyZywgdGhpcykpIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBwcmltX2lzUHJvdG90eXBlT2YuY2FsbCh0aGlzLCBhcmcpO1xuICAgIH1cbiAgfVxufTtcblxuQXJyYXkuaXNBcnJheSA9IGZ1bmN0aW9uKHN1YmplY3QpIHtcbiAgdmFyIHZIYW5kbGVyID0gc2FmZVdlYWtNYXBHZXQoZGlyZWN0UHJveGllcywgc3ViamVjdCk7XG4gIGlmICh2SGFuZGxlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIEFycmF5LmlzQXJyYXkodkhhbmRsZXIudGFyZ2V0KTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcHJpbV9pc0FycmF5KHN1YmplY3QpO1xuICB9XG59O1xuXG5mdW5jdGlvbiBpc1Byb3h5QXJyYXkoYXJnKSB7XG4gIHZhciB2SGFuZGxlciA9IHNhZmVXZWFrTWFwR2V0KGRpcmVjdFByb3hpZXMsIGFyZyk7XG4gIGlmICh2SGFuZGxlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIEFycmF5LmlzQXJyYXkodkhhbmRsZXIudGFyZ2V0KTtcbiAgfVxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8vIEFycmF5LnByb3RvdHlwZS5jb25jYXQgaW50ZXJuYWxseSB0ZXN0cyB3aGV0aGVyIG9uZSBvZiBpdHNcbi8vIGFyZ3VtZW50cyBpcyBhbiBBcnJheSwgYnkgY2hlY2tpbmcgd2hldGhlciBbW0NsYXNzXV0gPT0gXCJBcnJheVwiXG4vLyBBcyBzdWNoLCBpdCB3aWxsIGZhaWwgdG8gcmVjb2duaXplIHByb3hpZXMtZm9yLWFycmF5cyBhcyBhcnJheXMuXG4vLyBXZSBwYXRjaCBBcnJheS5wcm90b3R5cGUuY29uY2F0IHNvIHRoYXQgaXQgXCJ1bndyYXBzXCIgcHJveGllcy1mb3ItYXJyYXlzXG4vLyBieSBtYWtpbmcgYSBjb3B5LiBUaGlzIHdpbGwgdHJpZ2dlciB0aGUgZXhhY3Qgc2FtZSBzZXF1ZW5jZSBvZlxuLy8gdHJhcHMgb24gdGhlIHByb3h5LWZvci1hcnJheSBhcyBpZiB3ZSB3b3VsZCBub3QgaGF2ZSB1bndyYXBwZWQgaXQuXG4vLyBTZWUgPGh0dHBzOi8vZ2l0aHViLmNvbS90dmN1dHNlbS9oYXJtb255LXJlZmxlY3QvaXNzdWVzLzE5PiBmb3IgbW9yZS5cbkFycmF5LnByb3RvdHlwZS5jb25jYXQgPSBmdW5jdGlvbigvKi4uLmFyZ3MqLykge1xuICB2YXIgbGVuZ3RoO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgIGlmIChpc1Byb3h5QXJyYXkoYXJndW1lbnRzW2ldKSkge1xuICAgICAgbGVuZ3RoID0gYXJndW1lbnRzW2ldLmxlbmd0aDtcbiAgICAgIGFyZ3VtZW50c1tpXSA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50c1tpXSwgMCwgbGVuZ3RoKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHByaW1fY29uY2F0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG59O1xuXG4vLyBzZXRQcm90b3R5cGVPZiBzdXBwb3J0IG9uIHBsYXRmb3JtcyB0aGF0IHN1cHBvcnQgX19wcm90b19fXG5cbnZhciBwcmltX3NldFByb3RvdHlwZU9mID0gT2JqZWN0LnNldFByb3RvdHlwZU9mO1xuXG4vLyBwYXRjaCBhbmQgZXh0cmFjdCBvcmlnaW5hbCBfX3Byb3RvX18gc2V0dGVyXG52YXIgX19wcm90b19fc2V0dGVyID0gKGZ1bmN0aW9uKCkge1xuICB2YXIgcHJvdG9EZXNjID0gcHJpbV9nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoT2JqZWN0LnByb3RvdHlwZSwnX19wcm90b19fJyk7XG4gIGlmIChwcm90b0Rlc2MgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgdHlwZW9mIHByb3RvRGVzYy5zZXQgIT09IFwiZnVuY3Rpb25cIikge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJzZXRQcm90b3R5cGVPZiBub3Qgc3VwcG9ydGVkIG9uIHRoaXMgcGxhdGZvcm1cIik7XG4gICAgfVxuICB9XG5cbiAgLy8gc2VlIGlmIHdlIGNhbiBhY3R1YWxseSBtdXRhdGUgYSBwcm90b3R5cGUgd2l0aCB0aGUgZ2VuZXJpYyBzZXR0ZXJcbiAgLy8gKGUuZy4gQ2hyb21lIHYyOCBkb2Vzbid0IGFsbG93IHNldHRpbmcgX19wcm90b19fIHZpYSB0aGUgZ2VuZXJpYyBzZXR0ZXIpXG4gIHRyeSB7XG4gICAgcHJvdG9EZXNjLnNldC5jYWxsKHt9LHt9KTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJzZXRQcm90b3R5cGVPZiBub3Qgc3VwcG9ydGVkIG9uIHRoaXMgcGxhdGZvcm1cIik7XG4gICAgfVxuICB9XG5cbiAgcHJpbV9kZWZpbmVQcm9wZXJ0eShPYmplY3QucHJvdG90eXBlLCAnX19wcm90b19fJywge1xuICAgIHNldDogZnVuY3Rpb24obmV3UHJvdG8pIHtcbiAgICAgIHJldHVybiBPYmplY3Quc2V0UHJvdG90eXBlT2YodGhpcywgT2JqZWN0KG5ld1Byb3RvKSk7XG4gICAgfVxuICB9KTtcblxuICByZXR1cm4gcHJvdG9EZXNjLnNldDtcbn0oKSk7XG5cbk9iamVjdC5zZXRQcm90b3R5cGVPZiA9IGZ1bmN0aW9uKHRhcmdldCwgbmV3UHJvdG8pIHtcbiAgdmFyIGhhbmRsZXIgPSBkaXJlY3RQcm94aWVzLmdldCh0YXJnZXQpO1xuICBpZiAoaGFuZGxlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgaWYgKGhhbmRsZXIuc2V0UHJvdG90eXBlT2YobmV3UHJvdG8pKSB7XG4gICAgICByZXR1cm4gdGFyZ2V0O1xuICAgIH0gZWxzZSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwicHJveHkgcmVqZWN0ZWQgcHJvdG90eXBlIG11dGF0aW9uXCIpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICBpZiAoIU9iamVjdF9pc0V4dGVuc2libGUodGFyZ2V0KSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImNhbid0IHNldCBwcm90b3R5cGUgb24gbm9uLWV4dGVuc2libGUgb2JqZWN0OiBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgIHRhcmdldCk7XG4gICAgfVxuICAgIGlmIChwcmltX3NldFByb3RvdHlwZU9mKVxuICAgICAgcmV0dXJuIHByaW1fc2V0UHJvdG90eXBlT2YodGFyZ2V0LCBuZXdQcm90byk7XG5cbiAgICBpZiAoT2JqZWN0KG5ld1Byb3RvKSAhPT0gbmV3UHJvdG8gfHwgbmV3UHJvdG8gPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJPYmplY3QgcHJvdG90eXBlIG1heSBvbmx5IGJlIGFuIE9iamVjdCBvciBudWxsOiBcIiArXG4gICAgICAgICAgICAgICAgICAgICAgICAgbmV3UHJvdG8pO1xuICAgICAgLy8gdGhyb3cgbmV3IFR5cGVFcnJvcihcInByb3RvdHlwZSBtdXN0IGJlIGFuIG9iamVjdCBvciBudWxsXCIpXG4gICAgfVxuICAgIF9fcHJvdG9fX3NldHRlci5jYWxsKHRhcmdldCwgbmV3UHJvdG8pO1xuICAgIHJldHVybiB0YXJnZXQ7XG4gIH1cbn1cblxuT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eSA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgdmFyIGhhbmRsZXIgPSBzYWZlV2Vha01hcEdldChkaXJlY3RQcm94aWVzLCB0aGlzKTtcbiAgaWYgKGhhbmRsZXIgIT09IHVuZGVmaW5lZCkge1xuICAgIHZhciBkZXNjID0gaGFuZGxlci5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IobmFtZSk7XG4gICAgcmV0dXJuIGRlc2MgIT09IHVuZGVmaW5lZDtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcHJpbV9oYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMsIG5hbWUpO1xuICB9XG59XG5cbi8vID09PT09PT09PT09PT0gUmVmbGVjdGlvbiBtb2R1bGUgPT09PT09PT09PT09PVxuLy8gc2VlIGh0dHA6Ly93aWtpLmVjbWFzY3JpcHQub3JnL2Rva3UucGhwP2lkPWhhcm1vbnk6cmVmbGVjdF9hcGlcblxudmFyIFJlZmxlY3QgPSBnbG9iYWwuUmVmbGVjdCA9IHtcbiAgZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yOiBmdW5jdGlvbih0YXJnZXQsIG5hbWUpIHtcbiAgICByZXR1cm4gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIG5hbWUpO1xuICB9LFxuICBkZWZpbmVQcm9wZXJ0eTogZnVuY3Rpb24odGFyZ2V0LCBuYW1lLCBkZXNjKSB7XG5cbiAgICAvLyBpZiB0YXJnZXQgaXMgYSBwcm94eSwgaW52b2tlIGl0cyBcImRlZmluZVByb3BlcnR5XCIgdHJhcFxuICAgIHZhciBoYW5kbGVyID0gZGlyZWN0UHJveGllcy5nZXQodGFyZ2V0KTtcbiAgICBpZiAoaGFuZGxlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gaGFuZGxlci5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIG5hbWUsIGRlc2MpO1xuICAgIH1cblxuICAgIC8vIEltcGxlbWVudGF0aW9uIHRyYW5zbGl0ZXJhdGVkIGZyb20gW1tEZWZpbmVPd25Qcm9wZXJ0eV1dXG4gICAgLy8gc2VlIEVTNS4xIHNlY3Rpb24gOC4xMi45XG4gICAgLy8gdGhpcyBpcyB0aGUgX2V4YWN0IHNhbWUgYWxnb3JpdGhtXyBhcyB0aGUgaXNDb21wYXRpYmxlRGVzY3JpcHRvclxuICAgIC8vIGFsZ29yaXRobSBkZWZpbmVkIGFib3ZlLCBleGNlcHQgdGhhdCBhdCBldmVyeSBwbGFjZSBpdFxuICAgIC8vIHJldHVybnMgdHJ1ZSwgdGhpcyBhbGdvcml0aG0gYWN0dWFsbHkgZG9lcyBkZWZpbmUgdGhlIHByb3BlcnR5LlxuICAgIHZhciBjdXJyZW50ID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIG5hbWUpO1xuICAgIHZhciBleHRlbnNpYmxlID0gT2JqZWN0LmlzRXh0ZW5zaWJsZSh0YXJnZXQpO1xuICAgIGlmIChjdXJyZW50ID09PSB1bmRlZmluZWQgJiYgZXh0ZW5zaWJsZSA9PT0gZmFsc2UpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgaWYgKGN1cnJlbnQgPT09IHVuZGVmaW5lZCAmJiBleHRlbnNpYmxlID09PSB0cnVlKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBuYW1lLCBkZXNjKTsgLy8gc2hvdWxkIG5ldmVyIGZhaWxcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAoaXNFbXB0eURlc2NyaXB0b3IoZGVzYykpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAoaXNFcXVpdmFsZW50RGVzY3JpcHRvcihjdXJyZW50LCBkZXNjKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChjdXJyZW50LmNvbmZpZ3VyYWJsZSA9PT0gZmFsc2UpIHtcbiAgICAgIGlmIChkZXNjLmNvbmZpZ3VyYWJsZSA9PT0gdHJ1ZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgICBpZiAoJ2VudW1lcmFibGUnIGluIGRlc2MgJiYgZGVzYy5lbnVtZXJhYmxlICE9PSBjdXJyZW50LmVudW1lcmFibGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoaXNHZW5lcmljRGVzY3JpcHRvcihkZXNjKSkge1xuICAgICAgLy8gbm8gZnVydGhlciB2YWxpZGF0aW9uIG5lY2Vzc2FyeVxuICAgIH0gZWxzZSBpZiAoaXNEYXRhRGVzY3JpcHRvcihjdXJyZW50KSAhPT0gaXNEYXRhRGVzY3JpcHRvcihkZXNjKSkge1xuICAgICAgaWYgKGN1cnJlbnQuY29uZmlndXJhYmxlID09PSBmYWxzZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChpc0RhdGFEZXNjcmlwdG9yKGN1cnJlbnQpICYmIGlzRGF0YURlc2NyaXB0b3IoZGVzYykpIHtcbiAgICAgIGlmIChjdXJyZW50LmNvbmZpZ3VyYWJsZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgaWYgKGN1cnJlbnQud3JpdGFibGUgPT09IGZhbHNlICYmIGRlc2Mud3JpdGFibGUgPT09IHRydWUpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGN1cnJlbnQud3JpdGFibGUgPT09IGZhbHNlKSB7XG4gICAgICAgICAgaWYgKCd2YWx1ZScgaW4gZGVzYyAmJiAhc2FtZVZhbHVlKGRlc2MudmFsdWUsIGN1cnJlbnQudmFsdWUpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChpc0FjY2Vzc29yRGVzY3JpcHRvcihjdXJyZW50KSAmJiBpc0FjY2Vzc29yRGVzY3JpcHRvcihkZXNjKSkge1xuICAgICAgaWYgKGN1cnJlbnQuY29uZmlndXJhYmxlID09PSBmYWxzZSkge1xuICAgICAgICBpZiAoJ3NldCcgaW4gZGVzYyAmJiAhc2FtZVZhbHVlKGRlc2Muc2V0LCBjdXJyZW50LnNldCkpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCdnZXQnIGluIGRlc2MgJiYgIXNhbWVWYWx1ZShkZXNjLmdldCwgY3VycmVudC5nZXQpKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIG5hbWUsIGRlc2MpOyAvLyBzaG91bGQgbmV2ZXIgZmFpbFxuICAgIHJldHVybiB0cnVlO1xuICB9LFxuICBkZWxldGVQcm9wZXJ0eTogZnVuY3Rpb24odGFyZ2V0LCBuYW1lKSB7XG4gICAgdmFyIGhhbmRsZXIgPSBkaXJlY3RQcm94aWVzLmdldCh0YXJnZXQpO1xuICAgIGlmIChoYW5kbGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBoYW5kbGVyLmRlbGV0ZShuYW1lKTtcbiAgICB9XG4gICAgXG4gICAgdmFyIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwgbmFtZSk7XG4gICAgaWYgKGRlc2MgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChkZXNjLmNvbmZpZ3VyYWJsZSA9PT0gdHJ1ZSkge1xuICAgICAgZGVsZXRlIHRhcmdldFtuYW1lXTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7ICAgIFxuICB9LFxuICBnZXRQcm90b3R5cGVPZjogZnVuY3Rpb24odGFyZ2V0KSB7XG4gICAgcmV0dXJuIE9iamVjdC5nZXRQcm90b3R5cGVPZih0YXJnZXQpO1xuICB9LFxuICBzZXRQcm90b3R5cGVPZjogZnVuY3Rpb24odGFyZ2V0LCBuZXdQcm90bykge1xuICAgIFxuICAgIHZhciBoYW5kbGVyID0gZGlyZWN0UHJveGllcy5nZXQodGFyZ2V0KTtcbiAgICBpZiAoaGFuZGxlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gaGFuZGxlci5zZXRQcm90b3R5cGVPZihuZXdQcm90byk7XG4gICAgfVxuICAgIFxuICAgIGlmIChPYmplY3QobmV3UHJvdG8pICE9PSBuZXdQcm90byB8fCBuZXdQcm90byA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBwcm90b3R5cGUgbWF5IG9ubHkgYmUgYW4gT2JqZWN0IG9yIG51bGw6IFwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgICBuZXdQcm90byk7XG4gICAgfVxuICAgIFxuICAgIGlmICghT2JqZWN0X2lzRXh0ZW5zaWJsZSh0YXJnZXQpKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIFxuICAgIHZhciBjdXJyZW50ID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHRhcmdldCk7XG4gICAgaWYgKHNhbWVWYWx1ZShjdXJyZW50LCBuZXdQcm90bykpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBcbiAgICBpZiAocHJpbV9zZXRQcm90b3R5cGVPZikge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcHJpbV9zZXRQcm90b3R5cGVPZih0YXJnZXQsIG5ld1Byb3RvKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBfX3Byb3RvX19zZXR0ZXIuY2FsbCh0YXJnZXQsIG5ld1Byb3RvKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcbiAgcHJldmVudEV4dGVuc2lvbnM6IGZ1bmN0aW9uKHRhcmdldCkge1xuICAgIHZhciBoYW5kbGVyID0gZGlyZWN0UHJveGllcy5nZXQodGFyZ2V0KTtcbiAgICBpZiAoaGFuZGxlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gaGFuZGxlci5wcmV2ZW50RXh0ZW5zaW9ucygpO1xuICAgIH1cbiAgICBwcmltX3ByZXZlbnRFeHRlbnNpb25zKHRhcmdldCk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0sXG4gIGlzRXh0ZW5zaWJsZTogZnVuY3Rpb24odGFyZ2V0KSB7XG4gICAgcmV0dXJuIE9iamVjdC5pc0V4dGVuc2libGUodGFyZ2V0KTtcbiAgfSxcbiAgaGFzOiBmdW5jdGlvbih0YXJnZXQsIG5hbWUpIHtcbiAgICByZXR1cm4gbmFtZSBpbiB0YXJnZXQ7XG4gIH0sXG4gIGdldDogZnVuY3Rpb24odGFyZ2V0LCBuYW1lLCByZWNlaXZlcikge1xuICAgIHJlY2VpdmVyID0gcmVjZWl2ZXIgfHwgdGFyZ2V0O1xuXG4gICAgLy8gaWYgdGFyZ2V0IGlzIGEgcHJveHksIGludm9rZSBpdHMgXCJnZXRcIiB0cmFwXG4gICAgdmFyIGhhbmRsZXIgPSBkaXJlY3RQcm94aWVzLmdldCh0YXJnZXQpO1xuICAgIGlmIChoYW5kbGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBoYW5kbGVyLmdldChyZWNlaXZlciwgbmFtZSk7XG4gICAgfVxuXG4gICAgdmFyIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwgbmFtZSk7XG4gICAgaWYgKGRlc2MgPT09IHVuZGVmaW5lZCkge1xuICAgICAgdmFyIHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHRhcmdldCk7XG4gICAgICBpZiAocHJvdG8gPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cbiAgICAgIHJldHVybiBSZWZsZWN0LmdldChwcm90bywgbmFtZSwgcmVjZWl2ZXIpO1xuICAgIH1cbiAgICBpZiAoaXNEYXRhRGVzY3JpcHRvcihkZXNjKSkge1xuICAgICAgcmV0dXJuIGRlc2MudmFsdWU7XG4gICAgfVxuICAgIHZhciBnZXR0ZXIgPSBkZXNjLmdldDtcbiAgICBpZiAoZ2V0dGVyID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICAgIHJldHVybiBkZXNjLmdldC5jYWxsKHJlY2VpdmVyKTtcbiAgfSxcbiAgLy8gUmVmbGVjdC5zZXQgaW1wbGVtZW50YXRpb24gYmFzZWQgb24gbGF0ZXN0IHZlcnNpb24gb2YgW1tTZXRQXV0gYXRcbiAgLy8gaHR0cDovL3dpa2kuZWNtYXNjcmlwdC5vcmcvZG9rdS5waHA/aWQ9aGFybW9ueTpwcm90b19jbGltYmluZ19yZWZhY3RvcmluZ1xuICBzZXQ6IGZ1bmN0aW9uKHRhcmdldCwgbmFtZSwgdmFsdWUsIHJlY2VpdmVyKSB7XG4gICAgcmVjZWl2ZXIgPSByZWNlaXZlciB8fCB0YXJnZXQ7XG5cbiAgICAvLyBpZiB0YXJnZXQgaXMgYSBwcm94eSwgaW52b2tlIGl0cyBcInNldFwiIHRyYXBcbiAgICB2YXIgaGFuZGxlciA9IGRpcmVjdFByb3hpZXMuZ2V0KHRhcmdldCk7XG4gICAgaWYgKGhhbmRsZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIGhhbmRsZXIuc2V0KHJlY2VpdmVyLCBuYW1lLCB2YWx1ZSk7XG4gICAgfVxuXG4gICAgLy8gZmlyc3QsIGNoZWNrIHdoZXRoZXIgdGFyZ2V0IGhhcyBhIG5vbi13cml0YWJsZSBwcm9wZXJ0eVxuICAgIC8vIHNoYWRvd2luZyBuYW1lIG9uIHJlY2VpdmVyXG4gICAgdmFyIG93bkRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwgbmFtZSk7XG5cbiAgICBpZiAob3duRGVzYyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBuYW1lIGlzIG5vdCBkZWZpbmVkIGluIHRhcmdldCwgc2VhcmNoIHRhcmdldCdzIHByb3RvdHlwZVxuICAgICAgdmFyIHByb3RvID0gT2JqZWN0LmdldFByb3RvdHlwZU9mKHRhcmdldCk7XG5cbiAgICAgIGlmIChwcm90byAhPT0gbnVsbCkge1xuICAgICAgICAvLyBjb250aW51ZSB0aGUgc2VhcmNoIGluIHRhcmdldCdzIHByb3RvdHlwZVxuICAgICAgICByZXR1cm4gUmVmbGVjdC5zZXQocHJvdG8sIG5hbWUsIHZhbHVlLCByZWNlaXZlcik7XG4gICAgICB9XG5cbiAgICAgIC8vIFJldjE2IGNoYW5nZS4gQ2YuIGh0dHBzOi8vYnVncy5lY21hc2NyaXB0Lm9yZy9zaG93X2J1Zy5jZ2k/aWQ9MTU0OVxuICAgICAgLy8gdGFyZ2V0IHdhcyB0aGUgbGFzdCBwcm90b3R5cGUsIG5vdyB3ZSBrbm93IHRoYXQgJ25hbWUnIGlzIG5vdCBzaGFkb3dlZFxuICAgICAgLy8gYnkgYW4gZXhpc3RpbmcgKGFjY2Vzc29yIG9yIGRhdGEpIHByb3BlcnR5LCBzbyB3ZSBjYW4gYWRkIHRoZSBwcm9wZXJ0eVxuICAgICAgLy8gdG8gdGhlIGluaXRpYWwgcmVjZWl2ZXIgb2JqZWN0XG4gICAgICAvLyAodGhpcyBicmFuY2ggd2lsbCBpbnRlbnRpb25hbGx5IGZhbGwgdGhyb3VnaCB0byB0aGUgY29kZSBiZWxvdylcbiAgICAgIG93bkRlc2MgPVxuICAgICAgICB7IHZhbHVlOiB1bmRlZmluZWQsXG4gICAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICBjb25maWd1cmFibGU6IHRydWUgfTtcbiAgICB9XG5cbiAgICAvLyB3ZSBub3cga25vdyB0aGF0IG93bkRlc2MgIT09IHVuZGVmaW5lZFxuICAgIGlmIChpc0FjY2Vzc29yRGVzY3JpcHRvcihvd25EZXNjKSkge1xuICAgICAgdmFyIHNldHRlciA9IG93bkRlc2Muc2V0O1xuICAgICAgaWYgKHNldHRlciA9PT0gdW5kZWZpbmVkKSByZXR1cm4gZmFsc2U7XG4gICAgICBzZXR0ZXIuY2FsbChyZWNlaXZlciwgdmFsdWUpOyAvLyBhc3N1bWVzIEZ1bmN0aW9uLnByb3RvdHlwZS5jYWxsXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgLy8gb3RoZXJ3aXNlLCBpc0RhdGFEZXNjcmlwdG9yKG93bkRlc2MpIG11c3QgYmUgdHJ1ZVxuICAgIGlmIChvd25EZXNjLndyaXRhYmxlID09PSBmYWxzZSkgcmV0dXJuIGZhbHNlO1xuICAgIC8vIHdlIGZvdW5kIGFuIGV4aXN0aW5nIHdyaXRhYmxlIGRhdGEgcHJvcGVydHkgb24gdGhlIHByb3RvdHlwZSBjaGFpbi5cbiAgICAvLyBOb3cgdXBkYXRlIG9yIGFkZCB0aGUgZGF0YSBwcm9wZXJ0eSBvbiB0aGUgcmVjZWl2ZXIsIGRlcGVuZGluZyBvblxuICAgIC8vIHdoZXRoZXIgdGhlIHJlY2VpdmVyIGFscmVhZHkgZGVmaW5lcyB0aGUgcHJvcGVydHkgb3Igbm90LlxuICAgIHZhciBleGlzdGluZ0Rlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHJlY2VpdmVyLCBuYW1lKTtcbiAgICBpZiAoZXhpc3RpbmdEZXNjICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHZhciB1cGRhdGVEZXNjID1cbiAgICAgICAgeyB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgLy8gRklYTUU6IGl0IHNob3VsZCBub3QgYmUgbmVjZXNzYXJ5IHRvIGRlc2NyaWJlIHRoZSBmb2xsb3dpbmdcbiAgICAgICAgICAvLyBhdHRyaWJ1dGVzLiBBZGRlZCB0byBjaXJjdW12ZW50IGEgYnVnIGluIHRyYWNlbW9ua2V5OlxuICAgICAgICAgIC8vIGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTYwMTMyOVxuICAgICAgICAgIHdyaXRhYmxlOiAgICAgZXhpc3RpbmdEZXNjLndyaXRhYmxlLFxuICAgICAgICAgIGVudW1lcmFibGU6ICAgZXhpc3RpbmdEZXNjLmVudW1lcmFibGUsXG4gICAgICAgICAgY29uZmlndXJhYmxlOiBleGlzdGluZ0Rlc2MuY29uZmlndXJhYmxlIH07XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkocmVjZWl2ZXIsIG5hbWUsIHVwZGF0ZURlc2MpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICghT2JqZWN0LmlzRXh0ZW5zaWJsZShyZWNlaXZlcikpIHJldHVybiBmYWxzZTtcbiAgICAgIHZhciBuZXdEZXNjID1cbiAgICAgICAgeyB2YWx1ZTogdmFsdWUsXG4gICAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICBjb25maWd1cmFibGU6IHRydWUgfTtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShyZWNlaXZlciwgbmFtZSwgbmV3RGVzYyk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH0sXG4gIC8qaW52b2tlOiBmdW5jdGlvbih0YXJnZXQsIG5hbWUsIGFyZ3MsIHJlY2VpdmVyKSB7XG4gICAgcmVjZWl2ZXIgPSByZWNlaXZlciB8fCB0YXJnZXQ7XG5cbiAgICB2YXIgaGFuZGxlciA9IGRpcmVjdFByb3hpZXMuZ2V0KHRhcmdldCk7XG4gICAgaWYgKGhhbmRsZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIGhhbmRsZXIuaW52b2tlKHJlY2VpdmVyLCBuYW1lLCBhcmdzKTtcbiAgICB9XG5cbiAgICB2YXIgZnVuID0gUmVmbGVjdC5nZXQodGFyZ2V0LCBuYW1lLCByZWNlaXZlcik7XG4gICAgcmV0dXJuIEZ1bmN0aW9uLnByb3RvdHlwZS5hcHBseS5jYWxsKGZ1biwgcmVjZWl2ZXIsIGFyZ3MpO1xuICB9LCovXG4gIGVudW1lcmF0ZTogZnVuY3Rpb24odGFyZ2V0KSB7XG4gICAgdmFyIGhhbmRsZXIgPSBkaXJlY3RQcm94aWVzLmdldCh0YXJnZXQpO1xuICAgIHZhciByZXN1bHQ7XG4gICAgaWYgKGhhbmRsZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gaGFuZGxlci5lbnVtZXJhdGUgc2hvdWxkIHJldHVybiBhbiBpdGVyYXRvciBkaXJlY3RseSwgYnV0IHRoZVxuICAgICAgLy8gaXRlcmF0b3IgZ2V0cyBjb252ZXJ0ZWQgdG8gYW4gYXJyYXkgZm9yIGJhY2t3YXJkLWNvbXBhdCByZWFzb25zLFxuICAgICAgLy8gc28gd2UgbXVzdCByZS1pdGVyYXRlIG92ZXIgdGhlIGFycmF5XG4gICAgICByZXN1bHQgPSBoYW5kbGVyLmVudW1lcmF0ZShoYW5kbGVyLnRhcmdldCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdCA9IFtdO1xuICAgICAgZm9yICh2YXIgbmFtZSBpbiB0YXJnZXQpIHsgcmVzdWx0LnB1c2gobmFtZSk7IH07ICAgICAgXG4gICAgfVxuICAgIHZhciBsID0gK3Jlc3VsdC5sZW5ndGg7XG4gICAgdmFyIGlkeCA9IDA7XG4gICAgcmV0dXJuIHtcbiAgICAgIG5leHQ6IGZ1bmN0aW9uKCkge1xuICAgICAgICBpZiAoaWR4ID09PSBsKSByZXR1cm4geyBkb25lOiB0cnVlIH07XG4gICAgICAgIHJldHVybiB7IGRvbmU6IGZhbHNlLCB2YWx1ZTogcmVzdWx0W2lkeCsrXSB9O1xuICAgICAgfVxuICAgIH07XG4gIH0sXG4gIC8vIGltcGVyZmVjdCBvd25LZXlzIGltcGxlbWVudGF0aW9uOiBpbiBFUzYsIHNob3VsZCBhbHNvIGluY2x1ZGVcbiAgLy8gc3ltYm9sLWtleWVkIHByb3BlcnRpZXMuXG4gIG93bktleXM6IGZ1bmN0aW9uKHRhcmdldCkge1xuICAgIHJldHVybiBPYmplY3RfZ2V0T3duUHJvcGVydHlOYW1lcyh0YXJnZXQpO1xuICB9LFxuICBhcHBseTogZnVuY3Rpb24odGFyZ2V0LCByZWNlaXZlciwgYXJncykge1xuICAgIC8vIHRhcmdldC5hcHBseShyZWNlaXZlciwgYXJncylcbiAgICByZXR1cm4gRnVuY3Rpb24ucHJvdG90eXBlLmFwcGx5LmNhbGwodGFyZ2V0LCByZWNlaXZlciwgYXJncyk7XG4gIH0sXG4gIGNvbnN0cnVjdDogZnVuY3Rpb24odGFyZ2V0LCBhcmdzLCBuZXdUYXJnZXQpIHtcbiAgICAvLyByZXR1cm4gbmV3IHRhcmdldCguLi5hcmdzKTtcblxuICAgIC8vIGlmIHRhcmdldCBpcyBhIHByb3h5LCBpbnZva2UgaXRzIFwiY29uc3RydWN0XCIgdHJhcFxuICAgIHZhciBoYW5kbGVyID0gZGlyZWN0UHJveGllcy5nZXQodGFyZ2V0KTtcbiAgICBpZiAoaGFuZGxlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gaGFuZGxlci5jb25zdHJ1Y3QoaGFuZGxlci50YXJnZXQsIGFyZ3MsIG5ld1RhcmdldCk7XG4gICAgfVxuICAgIFxuICAgIGlmICh0eXBlb2YgdGFyZ2V0ICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJ0YXJnZXQgaXMgbm90IGEgZnVuY3Rpb246IFwiICsgdGFyZ2V0KTtcbiAgICB9XG4gICAgaWYgKG5ld1RhcmdldCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBuZXdUYXJnZXQgPSB0YXJnZXQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmICh0eXBlb2YgbmV3VGFyZ2V0ICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIm5ld1RhcmdldCBpcyBub3QgYSBmdW5jdGlvbjogXCIgKyB0YXJnZXQpO1xuICAgICAgfSAgICAgIFxuICAgIH1cblxuICAgIHJldHVybiBuZXcgKEZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kLmFwcGx5KG5ld1RhcmdldCwgW251bGxdLmNvbmNhdChhcmdzKSkpO1xuICB9XG59O1xuXG4vLyBmZWF0dXJlLXRlc3Qgd2hldGhlciB0aGUgUHJveHkgZ2xvYmFsIGV4aXN0cywgd2l0aFxuLy8gdGhlIGhhcm1vbnktZXJhIFByb3h5LmNyZWF0ZSBBUElcbmlmICh0eXBlb2YgUHJveHkgIT09IFwidW5kZWZpbmVkXCIgJiZcbiAgICB0eXBlb2YgUHJveHkuY3JlYXRlICE9PSBcInVuZGVmaW5lZFwiKSB7XG5cbiAgdmFyIHByaW1DcmVhdGUgPSBQcm94eS5jcmVhdGUsXG4gICAgICBwcmltQ3JlYXRlRnVuY3Rpb24gPSBQcm94eS5jcmVhdGVGdW5jdGlvbjtcblxuICB2YXIgcmV2b2tlZEhhbmRsZXIgPSBwcmltQ3JlYXRlKHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKFwicHJveHkgaXMgcmV2b2tlZFwiKTsgfVxuICB9KTtcblxuICBnbG9iYWwuUHJveHkgPSBmdW5jdGlvbih0YXJnZXQsIGhhbmRsZXIpIHtcbiAgICAvLyBjaGVjayB0aGF0IHRhcmdldCBpcyBhbiBPYmplY3RcbiAgICBpZiAoT2JqZWN0KHRhcmdldCkgIT09IHRhcmdldCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlByb3h5IHRhcmdldCBtdXN0IGJlIGFuIE9iamVjdCwgZ2l2ZW4gXCIrdGFyZ2V0KTtcbiAgICB9XG4gICAgLy8gY2hlY2sgdGhhdCBoYW5kbGVyIGlzIGFuIE9iamVjdFxuICAgIGlmIChPYmplY3QoaGFuZGxlcikgIT09IGhhbmRsZXIpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJQcm94eSBoYW5kbGVyIG11c3QgYmUgYW4gT2JqZWN0LCBnaXZlbiBcIitoYW5kbGVyKTtcbiAgICB9XG5cbiAgICB2YXIgdkhhbmRsZXIgPSBuZXcgVmFsaWRhdG9yKHRhcmdldCwgaGFuZGxlcik7XG4gICAgdmFyIHByb3h5O1xuICAgIGlmICh0eXBlb2YgdGFyZ2V0ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIHByb3h5ID0gcHJpbUNyZWF0ZUZ1bmN0aW9uKHZIYW5kbGVyLFxuICAgICAgICAvLyBjYWxsIHRyYXBcbiAgICAgICAgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgICAgIHJldHVybiB2SGFuZGxlci5hcHBseSh0YXJnZXQsIHRoaXMsIGFyZ3MpO1xuICAgICAgICB9LFxuICAgICAgICAvLyBjb25zdHJ1Y3QgdHJhcFxuICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgICAgcmV0dXJuIHZIYW5kbGVyLmNvbnN0cnVjdCh0YXJnZXQsIGFyZ3MpO1xuICAgICAgICB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcHJveHkgPSBwcmltQ3JlYXRlKHZIYW5kbGVyLCBPYmplY3QuZ2V0UHJvdG90eXBlT2YodGFyZ2V0KSk7XG4gICAgfVxuICAgIGRpcmVjdFByb3hpZXMuc2V0KHByb3h5LCB2SGFuZGxlcik7XG4gICAgcmV0dXJuIHByb3h5O1xuICB9O1xuXG4gIGdsb2JhbC5Qcm94eS5yZXZvY2FibGUgPSBmdW5jdGlvbih0YXJnZXQsIGhhbmRsZXIpIHtcbiAgICB2YXIgcHJveHkgPSBuZXcgUHJveHkodGFyZ2V0LCBoYW5kbGVyKTtcbiAgICB2YXIgcmV2b2tlID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgdkhhbmRsZXIgPSBkaXJlY3RQcm94aWVzLmdldChwcm94eSk7XG4gICAgICBpZiAodkhhbmRsZXIgIT09IG51bGwpIHtcbiAgICAgICAgdkhhbmRsZXIudGFyZ2V0ICA9IG51bGw7XG4gICAgICAgIHZIYW5kbGVyLmhhbmRsZXIgPSByZXZva2VkSGFuZGxlcjtcbiAgICAgIH1cbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfTtcbiAgICByZXR1cm4ge3Byb3h5OiBwcm94eSwgcmV2b2tlOiByZXZva2V9O1xuICB9XG4gIFxuICAvLyBhZGQgdGhlIG9sZCBQcm94eS5jcmVhdGUgYW5kIFByb3h5LmNyZWF0ZUZ1bmN0aW9uIG1ldGhvZHNcbiAgLy8gc28gb2xkIGNvZGUgdGhhdCBzdGlsbCBkZXBlbmRzIG9uIHRoZSBoYXJtb255LWVyYSBQcm94eSBvYmplY3RcbiAgLy8gaXMgbm90IGJyb2tlbi4gQWxzbyBlbnN1cmVzIHRoYXQgbXVsdGlwbGUgdmVyc2lvbnMgb2YgdGhpc1xuICAvLyBsaWJyYXJ5IHNob3VsZCBsb2FkIGZpbmVcbiAgZ2xvYmFsLlByb3h5LmNyZWF0ZSA9IHByaW1DcmVhdGU7XG4gIGdsb2JhbC5Qcm94eS5jcmVhdGVGdW5jdGlvbiA9IHByaW1DcmVhdGVGdW5jdGlvbjtcblxufSBlbHNlIHtcbiAgLy8gUHJveHkgZ2xvYmFsIG5vdCBkZWZpbmVkLCBvciBvbGQgQVBJIG5vdCBhdmFpbGFibGVcbiAgaWYgKHR5cGVvZiBQcm94eSA9PT0gXCJ1bmRlZmluZWRcIikge1xuICAgIC8vIFByb3h5IGdsb2JhbCBub3QgZGVmaW5lZCwgYWRkIGEgUHJveHkgZnVuY3Rpb24gc3R1YlxuICAgIGdsb2JhbC5Qcm94eSA9IGZ1bmN0aW9uKF90YXJnZXQsIF9oYW5kbGVyKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJwcm94aWVzIG5vdCBzdXBwb3J0ZWQgb24gdGhpcyBwbGF0Zm9ybS4gT24gdjgvbm9kZS9pb2pzLCBtYWtlIHN1cmUgdG8gcGFzcyB0aGUgLS1oYXJtb255X3Byb3hpZXMgZmxhZ1wiKTtcbiAgICB9O1xuICB9XG4gIC8vIFByb3h5IGdsb2JhbCBkZWZpbmVkIGJ1dCBvbGQgQVBJIG5vdCBhdmFpbGFibGVcbiAgLy8gcHJlc3VtYWJseSBQcm94eSBnbG9iYWwgYWxyZWFkeSBzdXBwb3J0cyBuZXcgQVBJLCBsZWF2ZSB1bnRvdWNoZWRcbn1cblxuLy8gZm9yIG5vZGUuanMgbW9kdWxlcywgZXhwb3J0IGV2ZXJ5IHByb3BlcnR5IGluIHRoZSBSZWZsZWN0IG9iamVjdFxuLy8gYXMgcGFydCBvZiB0aGUgbW9kdWxlIGludGVyZmFjZVxuaWYgKHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJykge1xuICBPYmplY3Qua2V5cyhSZWZsZWN0KS5mb3JFYWNoKGZ1bmN0aW9uIChrZXkpIHtcbiAgICBleHBvcnRzW2tleV0gPSBSZWZsZWN0W2tleV07XG4gIH0pO1xufVxuXG4vLyBmdW5jdGlvbi1hcy1tb2R1bGUgcGF0dGVyblxufSh0eXBlb2YgZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcgPyBnbG9iYWwgOiB0aGlzKSk7IiwiY29uc3QgbWJIZWxwZXIgPSB7XG4gICAgcHJvbWlzZXM6IHt9LFxuICAgIGFkZFNvdXJjZUFuZExheWVycyhzb3VyY2VPcHRpb25zLGxheWVyT3B0aW9uc0FycmF5KXsgLy8gdGhpcyA9IG1hcFxuICAgICAgICB2YXIgc291cmNlTmFtZSA9IHNvdXJjZU9wdGlvbnMubmFtZTtcbiAgICAgICAgbWJIZWxwZXIucHJvbWlzZXNbc291cmNlT3B0aW9ucy5uYW1lXSA9IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7IC8vIFRPIERPOiBmaWd1cmUgb3V0IHJlamVjdD9cbiAgICAgICAgICAgIGRlbGV0ZSBzb3VyY2VPcHRpb25zLm5hbWU7XG4gICAgICAgICAgICBmdW5jdGlvbiBjaGVja0RhdGFMb2FkZWQoKXtcbiAgICAgICAgICAgICAgICBpZiAoIHRoaXMuZ2V0U291cmNlKHNvdXJjZU5hbWUpICl7IC8vIGlmIGFkZFNvdXJjZSBoYXMgdGFrZW4gZWZmZWN0XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub2ZmKCdyZW5kZXInLCBjaGVja0RhdGFMb2FkZWQpOyAvLyB0dXJuIG9mZiB0aGUgbGlzdGVuZXIgZm9yIHJlbmRlclxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMub24oJ3JlbmRlcicsIGNoZWNrRGF0YUxvYWRlZCk7XG4gICAgICAgICAgICB0aGlzLmFkZFNvdXJjZShzb3VyY2VOYW1lLCBzb3VyY2VPcHRpb25zKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBsYXllclByb21pc2VzID0gW107XG4gICAgICAgIHJldHVybiBtYkhlbHBlci5wcm9taXNlc1tzb3VyY2VOYW1lXS50aGVuKCgpID0+IHsgXG4gICAgICAgICAgICBsYXllck9wdGlvbnNBcnJheS5mb3JFYWNoKChlYWNoKSA9PiB7XG4gICAgICAgICAgICAgICAgbGF5ZXJQcm9taXNlcy5wdXNoKFxuICAgICAgICAgICAgICAgICAgICBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4geyAvLyBUTyBETzogZmlndXJlIG91dCByZWplY3Q/XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYmVmb3JlTGF5ZXIgPSBlYWNoLmJlZm9yZUxheWVyID8gZWFjaC5iZWZvcmVMYXllciA6ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGVhY2guYmVmb3JlTGF5ZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICBlYWNoLnNvdXJjZSA9IHNvdXJjZU5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBjaGVja0xheWVyTG9hZGVkKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCB0aGlzLmdldExheWVyKGVhY2guaWQpICl7IC8vIGlmIGFkZExheWVyICBoYXMgdGFrZW4gZWZmZWN0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub2ZmKCdyZW5kZXInLCBjaGVja0xheWVyTG9hZGVkKTsgLy8gdHVybiBvZmYgdGhlIGxpc3RlbmVyIGZvciByZW5kZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9uKCdyZW5kZXInLCBjaGVja0xheWVyTG9hZGVkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkTGF5ZXIoZWFjaCwgYmVmb3JlTGF5ZXIpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLmFsbChsYXllclByb21pc2VzKTtcbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuZXhwb3J0cy5hZGRTb3VyY2VBbmRMYXllcnMgPSBtYkhlbHBlci5hZGRTb3VyY2VBbmRMYXllcnM7Il19
