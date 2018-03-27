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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkZXYtanMvbWFpbi5lczYiLCJqcy1leHBvcnRzL0JhcnMuanMiLCJqcy12ZW5kb3IvZDMtdGlwLmpzIiwianMtdmVuZG9yL3BvbHlmaWxscy5qcyIsIm5vZGVfbW9kdWxlcy9tYXBib3gtaGVscGVyL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNFQzs7QUFDQTs7QUFDQTs7b01BSkE7QUFDQTs7O0FBS0E7O0FBRUQ7Ozs7Ozs7QUFPQTs7Ozs7QUFLQSxPQUFPLE1BQVAsR0FBa0IsWUFBVTtBQUM1Qjs7QUFDRSxVQUFTLGFBQVQsR0FBeUI7QUFDdkIsTUFBRztBQUNGLE9BQUksU0FBUyxTQUFTLGFBQVQsQ0FBd0IsUUFBeEIsQ0FBYjtBQUNBLFVBQU8sQ0FBQyxDQUFFLE9BQU8scUJBQVYsS0FDRixPQUFPLFVBQVAsQ0FBbUIsT0FBbkIsS0FBZ0MsT0FBTyxVQUFQLENBQW1CLG9CQUFuQixDQUQ5QixDQUFQO0FBRUEsR0FKRCxDQUlDLE9BQU8sQ0FBUCxFQUFXO0FBQUUsVUFBTyxLQUFQO0FBQWU7QUFDOUI7QUFDRCxTQUFRLEdBQVIsQ0FBWSxlQUFaO0FBQ0QsS0FBSyxtQkFBbUIsSUFBeEIsRUFBOEI7QUFDN0IsS0FBRyxNQUFILENBQVUsZ0JBQVYsRUFDRSxPQURGLENBQ1UsU0FEVixFQUNxQixJQURyQixFQUVFLElBRkYsQ0FFTyxzRkFGUDtBQUdBO0FBQ0Q7O0FBRUcsVUFBUyxXQUFULEdBQXVCLDhGQUF2QjtBQUNBLElBQUcsU0FBSCxDQUFhLFlBQWIsRUFDRSxFQURGLENBQ0ssT0FETCxFQUNjLFlBQU07QUFDbEIsS0FBRyxLQUFILENBQVMsY0FBVDtBQUNBLEVBSEY7QUFJQSxLQUFNLFdBQVcsUUFBUSxlQUFSLENBQWpCO0FBQ0Q7QUFDQyxLQUFN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dCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc31yZXR1cm4gZX0pKCkiLCIgLyogZXhwb3J0ZWQgQ2hhcnRzLCBkM1RpcCwgTWFwVmFsdWVzLCBQcm9taXNlUG9seWZpbGwgKi9cbiAvL2ltcG9ydCB7IERvbnV0cyB9IGZyb20gJy4uL2pzLWV4cG9ydHMvRG9udXRzJztcbiBpbXBvcnQgeyBCYXJzIH0gZnJvbSAnLi4vanMtZXhwb3J0cy9CYXJzJztcbiBpbXBvcnQgeyBkM1RpcCB9IGZyb20gJy4uL2pzLXZlbmRvci9kMy10aXAnO1xuIGltcG9ydCB7IE1hcFZhbHVlcywgUHJvbWlzZVBvbHlmaWxsIH0gZnJvbSAnLi4vanMtdmVuZG9yL3BvbHlmaWxscyc7XG4gXG4gLyogcG9seWZpbGxzIG5lZWRlZDogUHJvbWlzZSBUTyBETzogT1RIRVJTP1xuICovXG4vKlxuaW1wb3J0IHsgSGVscGVycyB9IGZyb20gJy4uL2pzLWV4cG9ydHMvSGVscGVycyc7XG5pbXBvcnQgeyBkM1RpcCB9IGZyb20gJy4uL2pzLXZlbmRvci9kMy10aXAnO1xuaW1wb3J0IHsgY3JlYXRlQnJvd3NlQnV0dG9uIH0gZnJvbSAnLi4vanMtZXhwb3J0cy9Ccm93c2VCdXR0b25zJztcbmltcG9ydCB7IGNyZWF0ZVJlc3VsdEl0ZW0gfSBmcm9tICcuLi9qcy1leHBvcnRzL1Jlc3VsdEl0ZW1zJzsgXG4qL1xuICBcbi8qXG50byBkbyA6IHNlZSBhbHNvIGh0dHBzOi8vd3d3Lm1hcGJveC5jb20vbWFwYm94LWdsLWpzL2V4YW1wbGUvaGVhdG1hcC1sYXllci9cbiBcblxuKi9cbndpbmRvdy50aGVNYXAgID0gKGZ1bmN0aW9uKCl7ICAgXG5cInVzZSBzdHJpY3RcIjtcblx0IGZ1bmN0aW9uIHdlYmdsX3N1cHBvcnQoKSB7IFxuXHQgICB0cnl7XG5cdCAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggJ2NhbnZhcycgKTsgXG5cdCAgICByZXR1cm4gISEgd2luZG93LldlYkdMUmVuZGVyaW5nQ29udGV4dCAmJiAoIFxuXHQgICAgICAgICBjYW52YXMuZ2V0Q29udGV4dCggJ3dlYmdsJyApIHx8IGNhbnZhcy5nZXRDb250ZXh0KCAnZXhwZXJpbWVudGFsLXdlYmdsJyApICk7XG5cdCAgIH1jYXRjaCggZSApIHsgcmV0dXJuIGZhbHNlOyB9IFxuXHQgfVxuXHQgY29uc29sZS5sb2cod2ViZ2xfc3VwcG9ydCgpKTtcblx0aWYgKCB3ZWJnbF9zdXBwb3J0KCkgPT0gbnVsbCApe1xuXHRcdGQzLnNlbGVjdCgnI3dlYmdsLXdhcm5pbmcnKVxuXHRcdFx0LmNsYXNzZWQoJ3dhcm5pbmcnLCB0cnVlKVxuXHRcdFx0LnRleHQoJ1lvdXIgZGV2aWNlIG1heSBub3Qgc3VwcG9ydCB0aGUgZ3JhcGhpY3MgdGhpcyB0b29sIHJlbGllcyBvbjsgcGxlYXNlIHRyeSBvbiBhbm90aGVyLicpO1xuXHR9XG5cdC8vdmFyIHRpcCA9IGQzLnRpcCgpLmF0dHIoJ2NsYXNzJywgJ2QzLXRpcCcpLmh0bWwoZnVuY3Rpb24oZCkgeyByZXR1cm4gZDsgfSk7XG5cdFxuICAgIG1hcGJveGdsLmFjY2Vzc1Rva2VuID0gJ3BrLmV5SjFJam9pYjNOMFpYSnRZVzVxSWl3aVlTSTZJbU5wZG5VNWRIVm5kakEyZURZeWIzQTNObmcxY0dKM1pYb2lmUS5Yb19rLWt6R2ZZWF9Zb19SRGNIREJnJztcbiAgICBkMy5zZWxlY3RBbGwoJy5oZWxwLWxpbmsnKVxuICAgIFx0Lm9uKCdjbGljaycsICgpID0+IHtcbiAgICBcdFx0ZDMuZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBcdH0pO1xuICAgIGNvbnN0IG1iSGVscGVyID0gcmVxdWlyZSgnbWFwYm94LWhlbHBlcicpO1xuICAgLy8gZDMudGlwID0gcmVxdWlyZSgnZDMtdGlwJyk7XG4gICAgY29uc3QgdGlwID0gZDMudGlwKCkuYXR0cignY2xhc3MnLCAnZDMtdGlwJykuZGlyZWN0aW9uKCd3JykuaHRtbChmdW5jdGlvbihkKSB7IGNvbnNvbGUubG9nKHRoaXMsZCk7cmV0dXJuIGRbZDMuc2VsZWN0KHRoaXMucGFyZW50Tm9kZS5wYXJlbnROb2RlLnBhcmVudE5vZGUpLmF0dHIoJ2lkJykucmVwbGFjZSgnLScsJycpXTsgfSk7XG4gICBcdGNvbnN0IHRoZUNoYXJ0cyA9IFtdO1xuICAgXG4gICAgdmFyIGdlb2pzb247XG4gICAgdmFyIGZlYXR1cmVQcm9wZXJ0aWVzQnlJZCA9IG5ldyBNYXAoKTsgXG4gICAgdmFyIGdhdGVDaGVjayA9IDA7XG5cbiAgICB2YXIgc2l6ZVpvb21UaHJlc2hvbGQgPSA4O1xuICAgIFxuICAgIHZhciB0aGVNYXAgPSBuZXcgbWFwYm94Z2wuTWFwKHtcblx0ICAgIGNvbnRhaW5lcjogJ21hcCcsXG5cdCAgICBzdHlsZTogJ21hcGJveDovL3N0eWxlcy9vc3Rlcm1hbmovY2pmMDNvMzdiM3R2ZTJycXAyaW53NmExZicsXG5cdCAgICBjZW50ZXI6IFstOTUuMTQ5MzUxNDg2NDU5MDczLCAzNy45ODQ2NzMzNzA4NTU5OV0sXG5cdCAgICB6b29tOiAzLFxuXHQgICAgbWF4Qm91bmRzOiBbWy0xNDIuODg3MDU3MTQ3NDYzNjIsIDE2LjA1ODM0NDk0ODQzMjQwNl0sWy01MS45MDIzMDE3ODY5NzMxLDU1Ljc2NjkwMDY3NDE3MTM4XV0sXG5cdCAgICBtaW5ab29tOiAxLjUsXG5cdCAgICBhdHRyaWJ1dGlvbkNvbnRyb2w6IGZhbHNlLFxuXHR9KTtcblxuXHR2YXIgbmF2ID0gbmV3IG1hcGJveGdsLk5hdmlnYXRpb25Db250cm9sKHtzaG93Q29tcGFzczpmYWxzZX0pO1xuXHR0aGVNYXAuYWRkQ29udHJvbChuYXYsICd0b3AtcmlnaHQnKTtcblxuXHR2YXIgbWVkaWFuSW5jb21lcyA9IG5ldyBNYXAoKTtcblx0dG9HZW9KU09OKCdwb2xpY2llcy5jc3YnKTtcblx0dGhlTWFwLm9uKCdsb2FkJywgZnVuY3Rpb24oKXtcblx0XHRnYXRlQ2hlY2srKztcblx0XHRnYXRlKCk7XG5cdH0pO1xuXHRmdW5jdGlvbiBnYXRlKCl7XG5cdFx0aWYgKCBnYXRlQ2hlY2sgPCAyICl7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHVwZGF0ZUFsbCgpO1xuXHRcdGFkZFVuY2x1c3RlcmVkKCk7XG5cdFx0YWRkQ2x1c3RlcmVkKCk7XG5cdFx0Ly9jYWxjdWxhdGVaU2NvcmVzKCdwcmVtJyk7XG5cdH0gLy8gZW5kIGdhdGVcblxuXHQvKnZhciBjZW5zdXNUcmFjdHNJblZpZXcgPSBuZXcgU2V0KCk7XG5cdGZ1bmN0aW9uIGNhbGN1bGF0ZU1lZGlhbkluY29tZXMoaW5WaWV3SURzKXtcblx0XHRjb25zb2xlLmxvZyhpblZpZXdJRHMpO1xuXHRcdHZhciBtZWRpYW5JbmNvbWVzID0gW107XG5cdFx0Y2Vuc3VzVHJhY3RzSW5WaWV3LmNsZWFyKCk7XG5cdFx0aW5WaWV3SURzLmZvckVhY2goZCA9PiB7XG5cdFx0XHRjb25zb2xlLmxvZyhkKTtcblx0XHRcdHZhciBmZWF0dXJlID0gZ2VvanNvbi5mZWF0dXJlcy5maW5kKGYgPT4gZi5wcm9wZXJ0aWVzLmlkID09PSBkKTtcblx0XHRcdHZhciBjZW5zdXNUcmFjdCA9IGZlYXR1cmUuY2VuX3RyYWN0O1xuXHRcdFx0aWYgKCAhY2Vuc3VzVHJhY3RzSW5WaWV3LmhhcyhjZW5zdXNUcmFjdCkpe1xuXHRcdFx0XHRjZW5zdXNUcmFjdHNJblZpZXcuYWRkKGNlbnN1c1RyYWN0KTtcblx0XHRcdFx0bWVkaWFuSW5jb21lcy5wdXNoKGZlYXR1cmUubWVkX2luY29tZSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0cmV0dXJuIG1lZGlhbkluY29tZXM7XG5cdH0qL1xuXHRmdW5jdGlvbiBjYWxjdWxhdGVaU2NvcmVzKGZpZWxkLCBjdXRvZmYgPSBudWxsLCBoYXJkQ3V0b2ZmID0gbnVsbCwgaWdub3JlID0gW10gKXsgIC8vIGN1dG9mZiBzcGVjaWZpZXMgdXBwZXIgYm91bmQgdG8gZ2V0IHJpZCBvZiBvdXRsaWVyc1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQgIC8vIGEgd2VhayBjdXRvZmYgY2FsY3VsYXRlcyB2YWx1ZXMgZm9yIHdob2xlIHNldCBidXRcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ICAvLyBzZXRzIG1heCBmb3IgdGhlIHZpeiBiYXNlZCBvbiB0aGUgY3V0b2ZmIHZhbHVlLiBhIGhhcmRcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ICAvLyBjdXRvZmYgZXhjbHVkZXMgdmFsdWVzIGJleW9uZCB0aGUgY3V0b2ZmIGZyb20gdGhlIFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQgIC8vIGNhbGN1bGF0aW9uc1x0XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCAgLy8gdGhlIGlnbm9yZSBhcnJheSBpcyB2YWx1ZXMgdGhhdCBzaG91bGQgYmUgdHJlYXRlZCBhcyBpbnZhbGlkXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCAgLy8gc3VjaCBhcyBhbGwgdGhlIGVycm9uZW91ZSAkMjUwayBob21lIHZhbHVlcy5cblx0XHRjb25zb2xlLmxvZygnY2FsY3VsYXRpbmcgei1zY29yZXMnKTtcblx0XHR2YXIgbWVhbiA9IGQzLm1lYW4oZ2VvanNvbi5mZWF0dXJlcywgZCA9PiB7XG5cdFx0XHRpZiAoIGhhcmRDdXRvZmYgPT09IG51bGwgKSB7XG5cdFx0XHRcdHJldHVybiBpZ25vcmUuaW5kZXhPZihkLnByb3BlcnRpZXNbZmllbGRdKSA9PT0gLTEgPyBkLnByb3BlcnRpZXNbZmllbGRdIDogbnVsbDtcblx0XHRcdH1cblx0XHRcdGlmICggZC5wcm9wZXJ0aWVzW2ZpZWxkXSA8PSBoYXJkQ3V0b2ZmICl7XG5cdFx0XHRcdHJldHVybiBpZ25vcmUuaW5kZXhPZihkLnByb3BlcnRpZXNbZmllbGRdKSA9PT0gLTEgPyBkLnByb3BlcnRpZXNbZmllbGRdIDogbnVsbDtcblx0XHRcdH1cblx0XHR9KTtcblx0XHR2YXIgc2QgPSBkMy5kZXZpYXRpb24oZ2VvanNvbi5mZWF0dXJlcywgZCA9PiB7XG5cdFx0XHRpZiAoIGhhcmRDdXRvZmYgPT09IG51bGwgKSB7XG5cdFx0XHRcdHJldHVybiBpZ25vcmUuaW5kZXhPZihkLnByb3BlcnRpZXNbZmllbGRdKSA9PT0gLTEgPyBkLnByb3BlcnRpZXNbZmllbGRdIDogbnVsbDtcblx0XHRcdH1cblx0XHRcdGlmICggZC5wcm9wZXJ0aWVzW2ZpZWxkXSA8PSBoYXJkQ3V0b2ZmICl7XG5cdFx0XHRcdHJldHVybiBpZ25vcmUuaW5kZXhPZihkLnByb3BlcnRpZXNbZmllbGRdKSA9PT0gLTEgPyBkLnByb3BlcnRpZXNbZmllbGRdIDogbnVsbDtcblx0XHRcdH1cblx0XHR9KTtcblx0XHR2YXIgbWluLFxuXHRcdFx0bWF4LFxuXHRcdFx0Y3V0b2ZmWiA9IGN1dG9mZiA/ICggY3V0b2ZmIC0gbWVhbiApIC8gc2QgOiBudWxsO1xuXG5cdFx0Y29uc29sZS5sb2coJ2N1dG9mZiBpcyAnICsgY3V0b2ZmWik7XG5cdFx0Z2VvanNvbi5mZWF0dXJlcy5mb3JFYWNoKGVhY2ggPT4ge1xuXHRcdFx0aWYgKCBoYXJkQ3V0b2ZmICYmIGVhY2gucHJvcGVydGllc1tmaWVsZF0gPiBoYXJkQ3V0b2ZmIHx8IGlnbm9yZS5pbmRleE9mKGVhY2gucHJvcGVydGllc1tmaWVsZF0pICE9PSAtMSApe1xuXHRcdFx0XHRlYWNoLnByb3BlcnRpZXNbZmllbGQgKyAnWiddID0gbnVsbDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGVhY2gucHJvcGVydGllc1tmaWVsZCArICdaJ10gPSAoIGVhY2gucHJvcGVydGllc1tmaWVsZF0gLSBtZWFuICkgLyBzZDtcblx0XHRcdFx0bWluID0gZWFjaC5wcm9wZXJ0aWVzW2ZpZWxkICsgJ1onXSA8IG1pbiB8fCBtaW4gPT09IHVuZGVmaW5lZCA/IGVhY2gucHJvcGVydGllc1tmaWVsZCArICdaJ10gOiBtaW47XG5cdFx0XHRcdG1heCA9IGVhY2gucHJvcGVydGllc1tmaWVsZCArICdaJ10gPiBtYXggfHwgbWF4ID09PSB1bmRlZmluZWQgPyBlYWNoLnByb3BlcnRpZXNbZmllbGQgKyAnWiddIDogbWF4O1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdGNvbnNvbGUubG9nKCdhY3R1YWxNaW46JyArIG1pbiwgJ2FjdHVhbE1heDonICsgbWF4KTtcblx0XHQvL21heCA9IGQzLm1pbihbbWF4LGN1dG9mZlosM10pO1xuXHRcdC8vbWluID0gZDMubWF4KFttaW4sIC0zXSk7XG5cdFx0bWF4ID0gMi4zMztcblx0XHRtaW4gPSAtMi4zMztcblx0XHRjb25zb2xlLmxvZygnZG9uZScsIGdlb2pzb24sIG1pbiwgbWF4KTtcblx0XHRyZXR1cm4ge1xuXHRcdFx0bWluLFxuXHRcdFx0bWF4LFxuXHRcdFx0bWVhbixcblx0XHRcdHNkXG5cdFx0fTtcblx0fVxuXG5cdGZ1bmN0aW9uIGFkZFVuY2x1c3RlcmVkKCl7XG5cdFx0cmV0dXJuIG1iSGVscGVyLmFkZFNvdXJjZUFuZExheWVycy5jYWxsKHRoZU1hcCxcblx0XHRcdHsgLy8gc291cmNlXG5cdFx0XHRcdFwibmFtZVwiOiBcInBvbGljeS1wb2ludHNcIixcblx0XHQgICAgICAgIFwidHlwZVwiOiBcImdlb2pzb25cIixcblx0XHQgICAgICAgIFwiZGF0YVwiOiBnZW9qc29uXG5cdFx0XHR9LCBbIC8vIGxheWVyc1xuXHRcdFx0XHR7IC8vIGxheWVyIG9uZVxuXHQgICAgICAgICAgICBcImlkXCI6IFwicG9pbnRzXCIsXG5cdCAgICAgICAgICAgIFwidHlwZVwiOiBcImNpcmNsZVwiLFxuXHQgICAgICAgICAgICBcInNvdXJjZVwiOiBcInBvbGljeS1wb2ludHNcIixcblx0ICAgICAgICAgICAgXCJtYXh6b29tXCI6IHNpemVab29tVGhyZXNob2xkLFxuXHQgICAgICAgICAgICBcInBhaW50XCI6IHtcblx0ICAgICAgICAgICAgICBcdFwiY2lyY2xlLWNvbG9yXCI6IFtcblx0XHQgICAgICAgICAgICAgICAgJ21hdGNoJyxcblx0XHQgICAgICAgICAgICAgICAgWydnZXQnLCAndF9kZWQnXSxcblx0XHQgICAgICAgICAgICAgICAgNSwgJyMwZjQzOWMnLFxuXHRcdCAgICAgICAgICAgICAgICAvKiBvdGhlciAqLyAnIzk5MDAwMCdcblx0XHQgICAgICAgICAgICBdLFxuXHRcdCAgICAgICAgICAgIFwiY2lyY2xlLXJhZGl1c1wiOiB7XG5cdFx0ICAgICAgICAgICAgICAgICdzdG9wcyc6IFtbNSwgM10sIFs4LCAxOF1dXG5cdFx0ICAgICAgICAgICAgfSxcblx0XHQgICAgICAgICAgICBcImNpcmNsZS1vcGFjaXR5XCI6IDAuMVxuXHRcdCAgICAgICAgICAgIH1cblx0XHQgICAgICAgIH0sXG5cdFx0ICAgICAgICB7IC8vIGxheWVyIHR3b1xuXHQgICAgICAgICAgICBcImlkXCI6IFwicG9pbnRzLWRhdGEtZHJpdmVuXCIsXG5cdCAgICAgICAgICAgIFwidHlwZVwiOiBcImNpcmNsZVwiLFxuXHQgICAgICAgICAgICBcInNvdXJjZVwiOiBcInBvbGljeS1wb2ludHNcIixcblx0ICAgICAgICAgICAgXCJtaW56b29tXCI6IHNpemVab29tVGhyZXNob2xkLFxuXHQgICAgICAgICAgICBcInBhaW50XCI6IHtcblx0ICAgICAgICAgICAgICBcdFwiY2lyY2xlLWNvbG9yXCI6IFtcblx0XHQgICAgICAgICAgICAgICAgJ21hdGNoJyxcblx0XHQgICAgICAgICAgICAgICAgWydnZXQnLCAndF9kZWQnXSxcblx0XHQgICAgICAgICAgICAgICAgNSwgJyMwZjQzOWMnLFxuXHRcdCAgICAgICAgICAgICAgICAvKiBvdGhlciAqLyAnIzk5MDAwMCdcblx0XHQgICAgICAgICAgICBdLFxuXHRcdCAgICAgICAgICAgIFwiY2lyY2xlLXJhZGl1c1wiOiB7XG5cdFx0ICAgICAgICAgICAgXHRwcm9wZXJ0eTogJ3ByZW0nLFxuXHRcdCAgICAgICAgICAgICAgICB0eXBlOiAnZXhwb25lbnRpYWwnLFxuXHRcdFx0XHQgICAgICAgIHN0b3BzOiBbXG5cdFx0XHRcdCAgICAgICAgICBbNjIsIDVdLFxuXHRcdFx0XHQgICAgICAgICAgWzI1MDAsIDYwXVxuXHRcdFx0XHQgICAgICAgIF1cblx0XHQgICAgICAgICAgICB9LFxuXHRcdCAgICAgICAgICAgIFwiY2lyY2xlLW9wYWNpdHlcIjogMC4xLFxuXHRcdCAgICAgICAgICAgIFwiY2lyY2xlLXN0cm9rZS1jb2xvclwiOiBcIiNmZmZmZmZcIixcblx0XHQgICAgICAgICAgICBcImNpcmNsZS1zdHJva2Utd2lkdGhcIjogMVxuXHRcdCAgICAgICAgfVxuXHRcdFx0fV1cblx0XHQpOyBcblx0fVxuXHQvKmZ1bmN0aW9uIGNoZWNrRmVhdHVyZXNMb2FkZWQoKXtcblx0XHRpZiAoIHRoZU1hcC5sb2FkZWQoKSl7XG5cdFx0XHRcblx0XHRcdHRoZU1hcC5vZmYoJ3JlbmRlcicsIGNoZWNrRmVhdHVyZXMpO1xuXHRcdH1cblx0fSovXG5cdGZ1bmN0aW9uIGFkZENsdXN0ZXJlZCgpe1xuXHRcdFxuXHRcdG1iSGVscGVyLmFkZFNvdXJjZUFuZExheWVycy5jYWxsKHRoZU1hcCxcblx0XHQgICAgeyAvLyBzb3VyY2Vcblx0XHQgICAgXHRcIm5hbWVcIjogXCJwb2xpY2llc1wiLFxuXHRcdCAgICAgICAgXCJ0eXBlXCI6IFwiZ2VvanNvblwiLFxuXHRcdCAgICAgICAgXCJkYXRhXCI6IGdlb2pzb24sXG5cdFx0ICAgICAgICBcImNsdXN0ZXJcIjogdHJ1ZSxcblx0XHQgICAgICAgIFwiY2x1c3RlclJhZGl1c1wiOiAwLjUgLy8gUmFkaXVzIG9mIGVhY2ggY2x1c3RlciB3aGVuIGNsdXN0ZXJpbmcgcG9pbnRzIChkZWZhdWx0cyB0byA1MClcblx0XHQgICAgfSwgWyAvLyBsYXllcnNcblx0XHQgICAgICAgeyAvLyBsYXllciBvbmVcblx0XHQgICAgICAgICAgICBpZDogXCJjbHVzdGVyLWNvdW50XCIsXG5cdFx0XHQgICAgICAgIHR5cGU6IFwic3ltYm9sXCIsXG5cdFx0XHQgICAgICAgIHNvdXJjZTogXCJwb2xpY2llc1wiLFxuXHRcdFx0ICAgICAgICBmaWx0ZXI6IFtcImhhc1wiLCBcInBvaW50X2NvdW50XCJdLFxuXHRcdFx0ICAgICAgICBcIm1pbnpvb21cIjogNixcblx0XHRcdCAgICAgICAgbGF5b3V0OiB7XG5cdFx0XHQgICAgICAgICAgICBcInRleHQtZmllbGRcIjogXCJ7cG9pbnRfY291bnRfYWJicmV2aWF0ZWR9XCIsXG5cdFx0XHQgICAgICAgICAgICBcInRleHQtc2l6ZVwiOiAxMixcblxuXHRcdFx0ICAgICAgICB9LFxuXHRcdFx0ICAgICAgICBcInBhaW50XCI6IHtcblx0XHRcdCAgICAgICAgXHRcInRleHQtY29sb3JcIjogXCIjZmZmZmZmXCJcblx0XHRcdCAgICAgICAgfVxuXHRcdCAgICAgICAgfVxuXHQgICAgICAgIF0gLy8gZW5kIGxheWVycyBhcnJheVxuXHQgICAgKTsgLy8gZW5kIGFkZGxheWVyc1xuXHR9IC8vIGVuZCBhZGRDbHVzdGVyZWRcblx0ZnVuY3Rpb24gdG9HZW9KU09OKHVybCl7XG5cdFx0XG5cdFx0ZDMuY3N2KHVybCwgZnVuY3Rpb24oZXJyLCBkYXRhKXtcblx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0dGhyb3cgZXJyO1xuXHRcdFx0fVxuXHRcdFx0Ly9jb25zb2xlLmxvZyhkYXRhKTtcblx0XHRcdHZhciBmZWF0dXJlcyA9IFtdOyBcblx0XHRcdGRhdGEuZm9yRWFjaChlYWNoID0+IHtcblxuXHRcdFx0XHR2YXIgdmFsdWUgPSArZWFjaC5tZWRfaW5jb21lID8gK2VhY2gubWVkX2luY29tZSA6IG51bGw7XG5cdFx0XHRcdGlmICggIW1lZGlhbkluY29tZXMuaGFzKCtlYWNoLmNlbl90cmFjdCkgKXtcblx0XHRcdFx0XHRtZWRpYW5JbmNvbWVzLnNldCgrZWFjaC5jZW5fdHJhY3QsIHZhbHVlKTsgLy8gbm8gZHVwbGljYXRlIHRyYWN0c1xuXHRcdFx0XHR9XG5cdFx0XHRcdHZhciBjb2VyY2VkID0ge307XG5cdFx0XHRcdGZvciAoIHZhciBrZXkgaW4gZWFjaCApIHtcblx0XHRcdFx0XHRpZiAoIGVhY2guaGFzT3duUHJvcGVydHkoa2V5KSApe1xuXHRcdFx0XHRcdFx0Y29lcmNlZFtrZXldID0gIWlzTmFOKCtlYWNoW2tleV0pID8gK2VhY2hba2V5XSA6IGVhY2hba2V5XTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gIFxuXHRcdFx0XHRmZWF0dXJlUHJvcGVydGllc0J5SWQuc2V0KGNvZXJjZWQuaWQsY29lcmNlZCk7XG5cdFx0XHRcdGZlYXR1cmVzLnB1c2goe1xuXHRcdFx0XHRcdFwidHlwZVwiOiBcIkZlYXR1cmVcIixcblx0XHRcdFx0XHRcInByb3BlcnRpZXNcIjogY29lcmNlZCxcblx0XHRcdFx0XHRcImdlb21ldHJ5XCI6IHtcblx0XHRcdFx0XHRcdFwidHlwZVwiOiBcIlBvaW50XCIsXG5cdFx0XHRcdFx0XHRcImNvb3JkaW5hdGVzXCI6IFsrZWFjaC5sb25naXR1ZGUsICtlYWNoLmxhdGl0dWRlXVxuXHRcdFx0XHRcdH0gICBcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTsgLy8gZW5kIGZvckVhY2hcblx0XHRcdGNvbnNvbGUubG9nKG1lZGlhbkluY29tZXMpO1xuXHRcdFx0Y29uc29sZS5sb2coZmVhdHVyZVByb3BlcnRpZXNCeUlkKTtcblx0XHRcdGdlb2pzb24gPSAge1xuXHRcdFx0XHRcInR5cGVcIjogXCJGZWF0dXJlQ29sbGVjdGlvblwiLFxuXHRcdFx0XHRcImZlYXR1cmVzXCI6IGZlYXR1cmVzXG5cdFx0XHR9O1xuXHRcdFx0dGhlQ2hhcnRzLnB1c2goIC8vIHNob3VsZCBiZSBhYmxlIHRvIGNyZWF0ZSBjaGFydHMgbm93LCB3aGV0aGVyIG9yIG5vdCBtYXAgaGFzIGxvYWRlZC4gbWFwIG5lZWRzIHRvIGhhdmVcblx0XHRcdFx0XHRcdFx0Ly8gbG9hZGVkIGZvciB0aGVtIHRvIHVwZGF0ZSwgdGhvdWdoLlxuXHRcdFx0XHRuZXcgQmFycy5CYXIoeyBcblx0XHRcdFx0XHR0aXRsZTogJ1Byb3BlcnRpZXMgaW4gdmlldycsIFxuXHRcdFx0XHRcdG1hcmdpbjoge1xuXHRcdFx0XHRcdFx0dG9wOjAsXG5cdFx0XHRcdFx0XHRyaWdodDoxLFxuXHRcdFx0XHRcdFx0Ym90dG9tOjAsXG5cdFx0XHRcdFx0XHRsZWZ0OjEgXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRoZWlnaHRUb1dpZHRoOiAwLjA1LFxuXHRcdFx0XHRcdGNvbnRhaW5lcjogJyNpbi12aWV3LWJhcicsXG5cdFx0XHRcdFx0ZGF0YTogZ2VvanNvbi5mZWF0dXJlcyxcblx0XHRcdFx0XHRudW1lcmF0b3IoaW5WaWV3SURzKXtcblx0XHRcdFx0XHRcdHJldHVybiBpblZpZXdJRHMuc2l6ZTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGRlbm9taW5hdG9yKCl7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5kYXRhLmxlbmd0aDtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHRleHRGdW5jdGlvbihuLGQpe1xuXHRcdFx0XHRcdFx0cmV0dXJuIGAke2QzLmZvcm1hdChcIixcIikobil9IG9mICR7ZDMuZm9ybWF0KFwiLFwiKShkKX0gKCR7ZDMuZm9ybWF0KFwiLjAlXCIpKG4gLyBkKX0pYDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pLFxuXHRcdFx0XHRuZXcgQmFycy5CYXIoe1xuXHRcdFx0XHRcdHRpdGxlOiAnLi4uIHdpdGggbG93IGRlZHVjdGlibGUnLCBcblx0XHRcdFx0XHRtYXJnaW46IHtcblx0XHRcdFx0XHRcdHRvcDowLFxuXHRcdFx0XHRcdFx0cmlnaHQ6MSxcblx0XHRcdFx0XHRcdGJvdHRvbTowLFxuXHRcdFx0XHRcdFx0bGVmdDoxIFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aGVpZ2h0VG9XaWR0aDogMC4wNSxcblx0XHRcdFx0XHRpbmZvTWFyazp0cnVlLFxuXHRcdFx0XHRcdGNvbnRhaW5lcjogJyNkZWR1Y3RpYmxlLWJhcicsXG5cdFx0XHRcdFx0ZGF0YTogZ2VvanNvbi5mZWF0dXJlcyxcblx0XHRcdFx0XHRudW1lcmF0b3IoaW5WaWV3SURzKXtcblx0XHRcdFx0XHRcdGlmICggaW5WaWV3SURzLnNpemUgPT09IDAgKXtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMubWluO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0dmFyIGZpbHRlcmVkRGF0YSA9IHRoaXMuZGF0YS5maWx0ZXIoZWFjaCA9PiBpblZpZXdJRHMuaGFzKGVhY2gucHJvcGVydGllcy5pZCkpLFxuXHRcdFx0XHRcdFx0XHRudW1iZXJNYXRjaGluZyA9IDA7XG5cdFx0XHRcdFx0XHRmaWx0ZXJlZERhdGEuZm9yRWFjaChlYWNoID0+IHtcblx0XHRcdFx0XHRcdFx0aWYgKCBlYWNoLnByb3BlcnRpZXMudF9kZWQgPCA1ICl7XG5cdFx0XHRcdFx0XHRcdFx0bnVtYmVyTWF0Y2hpbmcrKztcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gbnVtYmVyTWF0Y2hpbmc7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRkZW5vbWluYXRvcihpblZpZXdJRHMpeyAvLyBmb3IgdGhpcyBvbmUgZGVub21pbmF0b3IgaXMgbnVtYmVyIG9mIHBvbGljaWVzIGluIHZpZXdcblx0XHRcdFx0XHRcdCByZXR1cm4gaW5WaWV3SURzLnNpemU7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR0ZXh0RnVuY3Rpb24obixkKXtcblx0XHRcdFx0XHRcdGlmIChpblZpZXdJRHMuc2l6ZSA9PT0gMCl7XG5cdFx0XHRcdFx0XHRcdHJldHVybiAnbm9uZSBpbiB2aWV3Jztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybiBgJHtkMy5mb3JtYXQoXCIsXCIpKG4pfSBvZiAke2QzLmZvcm1hdChcIixcIikoZCl9ICgke2QzLmZvcm1hdChcIi4wJVwiKShuIC8gZCl9KWA7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KSxcblx0XHRcdFx0bmV3IEJhcnMuQmFyKHtcblx0XHRcdFx0XHR0aXRsZTogJ0F2ZXJhZ2UgcHJlbWl1bScsIFxuXHRcdFx0XHRcdG1hcmdpbjoge1xuXHRcdFx0XHRcdFx0dG9wOjAsXG5cdFx0XHRcdFx0XHRyaWdodDoxLFxuXHRcdFx0XHRcdFx0Ym90dG9tOjAsXG5cdFx0XHRcdFx0XHRsZWZ0OjEgXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR6U2NvcmVzOiBjYWxjdWxhdGVaU2NvcmVzKCdwcmVtJywyMDAwKSxcblx0XHRcdFx0XHRtaW4oKXtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKHRoaXMpO1xuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuelNjb3Jlcy5taW47XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRoZWlnaHRUb1dpZHRoOiAwLjA1LFxuXHRcdFx0XHRcdGNvbnRhaW5lcjogJyNwcmVtaXVtLWJhcicsXG5cdFx0XHRcdFx0ZGF0YTogZ2VvanNvbi5mZWF0dXJlcyxcblx0XHRcdFx0XHRudW1lcmF0b3IoaW5WaWV3SURzKXtcblx0XHRcdFx0XHRcdGlmICggaW5WaWV3SURzLnNpemUgPT09IDAgKXtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMubWluO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0dmFyIGZpbHRlcmVkRGF0YSA9IHRoaXMuZGF0YS5maWx0ZXIoZWFjaCA9PiBpblZpZXdJRHMuaGFzKGVhY2gucHJvcGVydGllcy5pZCkpO1xuXHRcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdHJldHVybiBkMy5tZWFuKGZpbHRlcmVkRGF0YSwgZCA9PiBkLnByb3BlcnRpZXMucHJlbVopO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0ZGVub21pbmF0b3IoKXsgXG5cdFx0XHRcdFx0XHQgcmV0dXJuIHRoaXMuelNjb3Jlcy5tYXg7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR0ZXh0RnVuY3Rpb24obil7IFxuXHRcdFx0XHRcdFx0aWYgKGluVmlld0lEcy5zaXplID09PSAwKXtcblx0XHRcdFx0XHRcdFx0cmV0dXJuICdub25lIGluIHZpZXcnO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuICckJyArIGQzLmZvcm1hdChcIiwuMmZcIikodGhpcy56U2NvcmVzLm1lYW4gKyB0aGlzLnpTY29yZXMuc2QgKiBuICkgKyAnICh6ID0gJyArIGQzLmZvcm1hdChcIi4yZlwiKShuKSArICcpJztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pLFxuXHRcdFx0XHRcblx0XHRcdFx0bmV3IEJhcnMuQmFyKHtcblx0XHRcdFx0XHR0aXRsZTogJ0F2ZXJhZ2UgaG9tZSByZXBsYWNlbWVudCB2YWx1ZScsIFxuXHRcdFx0XHRcdG1hcmdpbjoge1xuXHRcdFx0XHRcdFx0dG9wOjAsXG5cdFx0XHRcdFx0XHRyaWdodDoxLFxuXHRcdFx0XHRcdFx0Ym90dG9tOjAsXG5cdFx0XHRcdFx0XHRsZWZ0OjEgXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR6U2NvcmVzOiBjYWxjdWxhdGVaU2NvcmVzKCd2YWx1ZScsNTUwLDIwMDAwLFsyNTBdKSxcblx0XHRcdFx0XHRtaW4oKXtcblx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuelNjb3Jlcy5taW47XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRpbmZvTWFyazp0cnVlLFxuXHRcdFx0XHRcdGhlaWdodFRvV2lkdGg6IDAuMDUsXG5cdFx0XHRcdFx0Y29udGFpbmVyOiAnI3ZhbHVlLWJhcicsXG5cdFx0XHRcdFx0ZGF0YTogZ2VvanNvbi5mZWF0dXJlcyxcblx0XHRcdFx0XHRudW1lcmF0b3IoaW5WaWV3SURzKXtcblx0XHRcdFx0XHRcdGlmICggaW5WaWV3SURzLnNpemUgPT09IDAgKXtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMubWluO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0dmFyIGZpbHRlcmVkRGF0YSA9IHRoaXMuZGF0YS5maWx0ZXIoZWFjaCA9PiBpblZpZXdJRHMuaGFzKGVhY2gucHJvcGVydGllcy5pZCkpO1xuXHRcdFx0XHRcdFx0cmV0dXJuIGQzLm1lYW4oZmlsdGVyZWREYXRhLCBkID0+IGQucHJvcGVydGllcy52YWx1ZVopO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0ZGVub21pbmF0b3IoKXsgXG5cdFx0XHRcdFx0XHQgcmV0dXJuIHRoaXMuelNjb3Jlcy5tYXg7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR0ZXh0RnVuY3Rpb24obil7IFxuXHRcdFx0XHRcdFx0aWYgKGluVmlld0lEcy5zaXplID09PSAwKXtcblx0XHRcdFx0XHRcdFx0cmV0dXJuICdub25lIGluIHZpZXcnO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuICckJyArIGQzLmZvcm1hdChcIiwuMGZcIikoKHRoaXMuelNjb3Jlcy5tZWFuICsgdGhpcy56U2NvcmVzLnNkICogbiApICogMTAwMCApICsgJyAoeiA9ICcgKyBkMy5mb3JtYXQoXCIuMmZcIikobikgKyAnKSc7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KSxcblx0XHRcdFx0bmV3IEJhcnMuQmFyKHtcblx0XHRcdFx0XHR0aXRsZTogJ0F2ZXJhZ2UgZmxvb2QgaW5zdXJhbmNlIGNvdmVyYWdlJywgXG5cdFx0XHRcdFx0bWFyZ2luOiB7XG5cdFx0XHRcdFx0XHR0b3A6MCxcblx0XHRcdFx0XHRcdHJpZ2h0OjEsXG5cdFx0XHRcdFx0XHRib3R0b206MCxcblx0XHRcdFx0XHRcdGxlZnQ6MSBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGluZm9NYXJrOnRydWUsXG5cdFx0XHRcdFx0elNjb3JlczogY2FsY3VsYXRlWlNjb3JlcygndGNvdicsbnVsbCxudWxsLFtdKSxcblx0XHRcdFx0XHQvKm1pbigpe1xuXHRcdFx0XHRcdFx0cmV0dXJuIGQzLm1pbih0aGlzLmRhdGEsIGQgPT4gZC5wcm9wZXJ0aWVzLnRjb3YpO1xuXHRcdFx0XHRcdH0sKi9cblx0XHRcdFx0XHRtaW4oKXtcblx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuelNjb3Jlcy5taW47XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRoZWlnaHRUb1dpZHRoOiAwLjA1LFxuXHRcdFx0XHRcdGNvbnRhaW5lcjogJyNjb3ZlcmFnZS1iYXInLFxuXHRcdFx0XHRcdGRhdGE6IGdlb2pzb24uZmVhdHVyZXMsXG5cdFx0XHRcdFx0bnVtZXJhdG9yKGluVmlld0lEcyl7XG5cdFx0XHRcdFx0XHRpZiAoIGluVmlld0lEcy5zaXplID09PSAwICl7XG5cdFx0XHRcdFx0XHRcdHJldHVybiB0aGlzLm1pbjtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHRoaXMuZmlsdGVyZWREYXRhID0gdGhpcy5kYXRhLmZpbHRlcihlYWNoID0+IGluVmlld0lEcy5oYXMoZWFjaC5wcm9wZXJ0aWVzLmlkKSk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZDMubWVhbih0aGlzLmZpbHRlcmVkRGF0YSwgZCA9PiBkLnByb3BlcnRpZXMudGNvdlopO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0ZGVub21pbmF0b3IoKXsgXG5cdFx0XHRcdFx0XHQgcmV0dXJuIHRoaXMuelNjb3Jlcy5tYXg7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR0ZXh0RnVuY3Rpb24obil7IFxuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRpZiAoaW5WaWV3SURzLnNpemUgPT09IDApe1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gJ25vbmUgaW4gdmlldyc7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZXR1cm4gJyQnICsgZDMuZm9ybWF0KFwiLC4wZlwiKSgodGhpcy56U2NvcmVzLm1lYW4gKyB0aGlzLnpTY29yZXMuc2QgKiBuICkgKiAxMDAwICkgKyAnICh6ID0gJyArIGQzLmZvcm1hdChcIi4yZlwiKShuKSArICcpJztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pLFxuXHRcdFx0XHRuZXcgQmFycy5CYXIoe1xuXHRcdFx0XHRcdHRpdGxlOiAnQXZlcmFnZSBtZWRpYW4gaG91c2Vob2xkIGluY29tZScsIFxuXHRcdFx0XHRcdG1hcmdpbjoge1xuXHRcdFx0XHRcdFx0dG9wOjAsXG5cdFx0XHRcdFx0XHRyaWdodDoxLFxuXHRcdFx0XHRcdFx0Ym90dG9tOjAsXG5cdFx0XHRcdFx0XHRsZWZ0OjEgXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRpbmZvTWFyazp0cnVlLFxuXHRcdFx0XHRcdHpTY29yZXM6IChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2cobWVkaWFuSW5jb21lcyk7XG5cdFx0XHRcdFx0XHR2YXIgbWVhbiA9IGQzLm1lYW4oWy4uLm1lZGlhbkluY29tZXMudmFsdWVzKCldKTtcblx0XHRcdFx0XHRcdHZhciBzZCA9IGQzLmRldmlhdGlvbihbLi4ubWVkaWFuSW5jb21lcy52YWx1ZXMoKV0pO1xuXHRcdFx0XHRcdFx0dmFyIG1pbixcblx0XHRcdFx0XHRcdFx0bWF4LFxuXHRcdFx0XHRcdFx0XHRjdXRvZmZaID0gKCAxNTAwMDAgLSBtZWFuICkgLyBzZDtcblx0XHRcdFx0XHRcdGdlb2pzb24uZmVhdHVyZXMuZm9yRWFjaChlYWNoID0+IHtcblx0XHRcdFx0XHRcdFx0Ly8gc29tZSBtZWRfaW5jb21lcyBhcmUgcmVjb3JkZWQgYXMgemVybzsgdGhleSBzaG91bGQgYmUgaWdub3JlZFxuXHRcdFx0XHRcdFx0XHRpZiAoIGVhY2gucHJvcGVydGllcy5tZWRfaW5jb21lID4gMCApe1xuXHRcdFx0XHRcdFx0XHRcdGVhY2gucHJvcGVydGllcy5tZWRfaW5jb21lWiA9ICggZWFjaC5wcm9wZXJ0aWVzLm1lZF9pbmNvbWUgLSBtZWFuICkgLyBzZDtcblx0XHRcdFx0XHRcdFx0XHRtaW4gPSBlYWNoLnByb3BlcnRpZXMubWVkX2luY29tZVogPCBtaW4gfHwgbWluID09PSB1bmRlZmluZWQgPyBlYWNoLnByb3BlcnRpZXMubWVkX2luY29tZVogOiBtaW47XG5cdFx0XHRcdFx0XHRcdFx0bWF4ID0gZWFjaC5wcm9wZXJ0aWVzLm1lZF9pbmNvbWVaID4gbWF4IHx8IG1heCA9PT0gdW5kZWZpbmVkID8gZWFjaC5wcm9wZXJ0aWVzLm1lZF9pbmNvbWVaIDogbWF4O1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdGVhY2gucHJvcGVydGllcy5tZWRfaW5jb21lWiA9IG51bGw7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0bWF4ID0gbWF4IDwgY3V0b2ZmWiA/IG1heCA6IGN1dG9mZlo7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyh7XG5cdFx0XHRcdFx0XHRcdG1pbixcblx0XHRcdFx0XHRcdFx0bWF4LFxuXHRcdFx0XHRcdFx0XHRtZWFuLFxuXHRcdFx0XHRcdFx0XHRzZFxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0XHRtaW46IC0yLjMzLFxuXHRcdFx0XHRcdFx0XHRtYXg6IDIuMzMsXG5cdFx0XHRcdFx0XHRcdG1lYW4sXG5cdFx0XHRcdFx0XHRcdHNkXG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdH0pKCksXG5cdFx0XHRcdFx0bWluKCl7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy56U2NvcmVzLm1pbjtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGhlaWdodFRvV2lkdGg6IDAuMDUsXG5cdFx0XHRcdFx0Y29udGFpbmVyOiAnI2luY29tZS1iYXInLFxuXHRcdFx0XHRcdGRhdGE6IGdlb2pzb24uZmVhdHVyZXMsXG5cdFx0XHRcdFx0bnVtZXJhdG9yKGluVmlld0lEcyl7XG5cdFx0XHRcdFx0XHRpZiAoIGluVmlld0lEcy5zaXplID09PSAwICl7XG5cdFx0XHRcdFx0XHRcdHJldHVybiB0aGlzLm1pbjtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHZhciByZXByZXNlbnRlZFRyYWN0cyA9IG5ldyBTZXQoKTtcblx0XHRcdFx0XHRcdHZhciBtZWRJbmNvbWVaQXJyYXkgPSBbXTtcblx0XHRcdFx0XHRcdGluVmlld0lEcy5mb3JFYWNoKGlkID0+IHtcblx0XHRcdFx0XHRcdFx0dmFyIG1hdGNoaW5nRmVhdHVyZSA9IGZlYXR1cmVQcm9wZXJ0aWVzQnlJZC5nZXQoaWQpO1xuXHRcdFx0XHRcdFx0XHRpZiAoICFyZXByZXNlbnRlZFRyYWN0cy5oYXMobWF0Y2hpbmdGZWF0dXJlLmNlbl90cmFjdCkgKXtcblx0XHRcdFx0XHRcdFx0XHRyZXByZXNlbnRlZFRyYWN0cy5hZGQobWF0Y2hpbmdGZWF0dXJlLmNlbl90cmFjdCk7XG5cdFx0XHRcdFx0XHRcdFx0bWVkSW5jb21lWkFycmF5LnB1c2gobWF0Y2hpbmdGZWF0dXJlLm1lZF9pbmNvbWVaKTsgLy8gcHVzaGVzIGluY29tZSBmcm9tIG9ubHkgb25lIHJlcHJlc2VudGF0aXZlXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ICAvL1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdtZWRJbmNvbWVaQXJyYXknLG1lZEluY29tZVpBcnJheSk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZDMubWVhbihtZWRJbmNvbWVaQXJyYXkpO1xuXG5cdFx0XHRcdFx0XHQvL3RoaXMubWVkaWFuSW5jb21lc0luVmlldyA9IGNhbGN1bGF0ZU1lZGlhbkluY29tZXMoaW5WaWV3SURzKTtcblx0XHRcdFx0XHRcdC8vcmV0dXJuIGQzLm1lYW4odGhpcy5tZWRpYW5JbmNvbWVzSW5WaWV3KTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGRlbm9taW5hdG9yKCl7IFxuXHRcdFx0XHRcdFx0IHJldHVybiB0aGlzLnpTY29yZXMubWF4O1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0dGV4dEZ1bmN0aW9uKG4peyBcblx0XHRcdFx0XHRcdGlmIChpblZpZXdJRHMuc2l6ZSA9PT0gMCl7XG5cdFx0XHRcdFx0XHRcdHJldHVybiAnbm9uZSBpbiB2aWV3Jztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybiAnJCcgKyBkMy5mb3JtYXQoXCIsLjBmXCIpKHRoaXMuelNjb3Jlcy5tZWFuICsgdGhpcy56U2NvcmVzLnNkICogbiApICsgJyAoeiA9ICcgKyBkMy5mb3JtYXQoXCIuMmZcIikobikgKyAnKSc7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KSxcblx0XHRcdFx0bmV3IEJhcnMuQmFyKHtcblx0XHRcdFx0XHR0aXRsZTogJ0F2ZXJhZ2UgbWFyZ2luYWwgY29zdCBmb3IgbG93ZXIgZGVkdWN0aWJsZScsIFxuXHRcdFx0XHRcdG1hcmdpbjoge1xuXHRcdFx0XHRcdFx0dG9wOjAsXG5cdFx0XHRcdFx0XHRyaWdodDoxLFxuXHRcdFx0XHRcdFx0Ym90dG9tOjAsXG5cdFx0XHRcdFx0XHRsZWZ0OjEgXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR6U2NvcmVzOiBjYWxjdWxhdGVaU2NvcmVzKCdkZHAnLG51bGwsbnVsbCxbXSksXG5cdFx0XHRcdFx0LyptaW4oKXtcblx0XHRcdFx0XHRcdHJldHVybiBkMy5taW4odGhpcy5kYXRhLCBkID0+IGQucHJvcGVydGllcy50Y292KTtcblx0XHRcdFx0XHR9LCovXG5cdFx0XHRcdFx0bWluKCl7XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLnpTY29yZXMubWluO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aGVpZ2h0VG9XaWR0aDogMC4wNSxcblx0XHRcdFx0XHRjb250YWluZXI6ICcjbWFyZ2luYWwtYmFyJyxcblx0XHRcdFx0XHRkYXRhOiBnZW9qc29uLmZlYXR1cmVzLFxuXHRcdFx0XHRcdG51bWVyYXRvcihpblZpZXdJRHMpe1xuXHRcdFx0XHRcdFx0aWYgKCBpblZpZXdJRHMuc2l6ZSA9PT0gMCApe1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5taW47XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR0aGlzLmZpbHRlcmVkRGF0YSA9IHRoaXMuZGF0YS5maWx0ZXIoZWFjaCA9PiBpblZpZXdJRHMuaGFzKGVhY2gucHJvcGVydGllcy5pZCkpO1xuXHRcdFx0XHRcdFx0cmV0dXJuIGQzLm1lYW4odGhpcy5maWx0ZXJlZERhdGEsIGQgPT4gZC5wcm9wZXJ0aWVzLmRkcFopO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0ZGVub21pbmF0b3IoKXsgXG5cdFx0XHRcdFx0XHQgcmV0dXJuIHRoaXMuelNjb3Jlcy5tYXg7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR0ZXh0RnVuY3Rpb24obil7IFxuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRpZiAoaW5WaWV3SURzLnNpemUgPT09IDApe1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gJ25vbmUgaW4gdmlldyc7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZXR1cm4gJyQnICsgZDMuZm9ybWF0KFwiLC4wZlwiKSgodGhpcy56U2NvcmVzLm1lYW4gKyB0aGlzLnpTY29yZXMuc2QgKiBuICkgKSArICcgKHogPSAnICsgZDMuZm9ybWF0KFwiLjJmXCIpKG4pICsgJyknO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSlcblxuXHRcdFx0KTsgLy8gZW5kIHB1c2hcblx0XHRcdGdhdGVDaGVjaysrO1xuXHRcdFx0dmFyIGluZm9ybWF0aW9uID0ge1xuXHRcdFx0XHRtYXBmZWF0dXJlOiAnVGhpcyBtYXAgcmVwcmVzZW50cyBuZXcgZmxvb2QgaW5zdXJhbmNlIHBvbGljaWVzIGluaXRpYXRlZCBiZXR3ZWVuIEp1bmUgYW5kIERlY2VtYmVyIDIwMTQuIFRoZSBhbmFseXNpcyBpbiB0aGUgcmVsYXRlZCBwYXBlciByZXZvbHZlcyBhcm91bmQgdGhlIGRlY2lzaW9uIHdoZXRoZXIgdG8gcGF5IG1vcmUgZm9yIGEgbG93ZXIgZGVkdWN0aWJsZS4nLFxuXHRcdFx0XHRkZWR1Y3RpYmxlYmFyOiAnVGhlIHN0YW5kYXJkIGRlZHVjdGlibGUgaXMgJDUsMDAwOyBhbnl0aGluZyBsZXNzIGlzIGNvbnNpZGVyIGEgbG93IGRlZHVjdGlibGUuJyxcblx0XHRcdFx0dmFsdWViYXI6ICdUaGlzIGNhbGN1bGF0aW9uIGlnbm9yZXMgZXh0cmVtZSBvdXRsaWVycyAodmFsdWVzIGFib3ZlICQyME0pIHdoaWNoIGFyZSBsaWtlbHkgZHVlIHRvIGRhdGEgZXJyb3JzOyBpdCBhbHNvIGlnbm9yZXMgb3ZlcnJlcHJlc2VudGVkIHZhbHVlcyBvZiAkMjUwLDAwMCwgdGhlIG1ham9yaXR5IG9mIHdoaWNoIGFyZSBsaWtlbHkgZHVlIHRvIHJlcG9ydGluZyBlcnJvcnMuJyxcblx0XHRcdFx0aW5jb21lYmFyOiAnTWVkaWFuIGhvdXNlaG9sZCBpbmNvbWUgaXMgYSBwcm9wZXJ0eSBvZiB0aGUgY2Vuc3VzIHRyYWN0IGluIHdoaWNoIHRoZSBwb2xpY3lob2xkZXIgcmVzaWRlcy4gRWFjaCBjZW5zdXMgdHJhY3Qgd2l0aCBhbiBhc3NvY2lhdGVkIHBvbGljeSBpbiB2aWV3IGlzIGNvdW50ZWQgb25jZS4nLFxuXHRcdFx0XHRjb3ZlcmFnZWJhcjogJ0Zsb29kIGNvdmVyYWdlIGlzIGxpbWl0ZWQgdG8gJDI1MCwwMDAuJ1xuXHRcdFx0fTtcblx0XHRcdHZhciBpbmZvTWFya3MgPSBkMy5zZWxlY3RBbGwoJy5oYXMtaW5mby1tYXJrJylcblx0XHRcdFx0LmFwcGVuZCgnc3ZnJylcblx0XHRcdFx0LmRhdHVtKGluZm9ybWF0aW9uKVxuXHRcdFx0XHQuYXR0cignd2lkdGgnLCcxMnB4Jylcblx0XHRcdFx0LmF0dHIoJ3ZpZXdCb3gnLCAnMCAwIDEyIDEyJylcblx0XHRcdFx0LmF0dHIoJ2NsYXNzJywnaW5mby1tYXJrJylcblx0XHRcdFx0LmFwcGVuZCgnZycpO1xuXG5cdFx0XHRpbmZvTWFya3Ncblx0XHRcdFx0LmNhbGwodGlwKSBcblx0XHRcdFx0Lm9uKCdtb3VzZWVudGVyJywgZnVuY3Rpb24oZCl7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coZDMuZXZlbnQpO1xuXHRcdFx0XHRcdHRpcC5zaG93LmNhbGwodGhpcyxkKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0Lm9uKCdtb3VzZWxlYXZlJywgdGlwLmhpZGUpO1xuXHRcdFx0XHRcblxuXHRcdFx0aW5mb01hcmtzXG5cdFx0XHRcdC5hcHBlbmQoJ2NpcmNsZScpXG5cdFx0XHRcdC5hdHRyKCdjbGFzcycsICdpbmZvLW1hcmstYmFja2dyb3VuZCcpIFxuXHRcdFx0XHQuYXR0cignY3gnLDYpXG5cdFx0XHRcdC5hdHRyKCdjeScsNilcblx0XHRcdFx0LmF0dHIoJ3InLDYpO1xuXHRcdFx0XHRcblxuXHRcdFx0aW5mb01hcmtzXG5cdFx0XHRcdC5hcHBlbmQoJ3BhdGgnKVxuXHRcdFx0XHQuYXR0cignY2xhc3MnLCdpbmZvLW1hcmstZm9yZWdyb3VuZCcpXG5cdFx0XHRcdC5hdHRyKCdkJywgYE01LjIzMSw3LjYxNFY2LjkxNWMwLTAuMzY0LDAuMDg0LTAuNzAyLDAuMjU0LTEuMDE2YzAuMTY5LTAuMzEzLDAuMzU1LTAuNjEzLDAuNTU5LTAuOTAyXG5cdFx0XHRcdFx0XHRcdGMwLjIwMy0wLjI4NywwLjM5LTAuNTY0LDAuNTU5LTAuODMxQzYuNzcyLDMuOSw2Ljg1NywzLjYzMSw2Ljg1NywzLjM2YzAtMC4xOTUtMC4wODEtMC4zNTctMC4yNDItMC40ODlcblx0XHRcdFx0XHRcdFx0QzYuNDU1LDIuNzQsNi4yNjgsMi42NzQsNi4wNTcsMi42NzRjLTAuMTUzLDAtMC4yODgsMC4wMzQtMC40MDcsMC4xMDJjLTAuMTE4LDAuMDY4LTAuMjIyLDAuMTU1LTAuMzExLDAuMjZcblx0XHRcdFx0XHRcdFx0QzUuMjUsMy4xNDIsNS4xNzcsMy4yNjEsNS4xMTcsMy4zOTJjLTAuMDYsMC4xMzEtMC4wOTcsMC4yNjQtMC4xMTQsMC40bC0xLjQ2LTAuNDA3QzMuNzA0LDIuNzUsNC4wMDgsMi4yNjEsNC40NTcsMS45MTlcblx0XHRcdFx0XHRcdFx0YzAuNDQ4LTAuMzQzLDEuMDE2LTAuNTE1LDEuNzAxLTAuNTE1YzAuMzEzLDAsMC42MDcsMC4wNDQsMC44ODIsMC4xMzNDNy4zMTYsMS42MjYsNy41NiwxLjc1Niw3Ljc3MSwxLjkyNVxuXHRcdFx0XHRcdFx0XHRDNy45ODIsMi4wOTUsOC4xNSwyLjMwNiw4LjI3MiwyLjU2YzAuMTIzLDAuMjU0LDAuMTg1LDAuNTQ2LDAuMTg1LDAuODc2YzAsMC40MjMtMC4wOTYsMC43ODUtMC4yODYsMS4wODVcblx0XHRcdFx0XHRcdFx0Yy0wLjE5MSwwLjMwMS0wLjQsMC41ODYtMC42MjksMC44NTdDNy4zMTQsNS42NSw3LjEwNCw1LjkyMyw2LjkxNCw2LjE5OFM2LjYyOCw2Ljc4OSw2LjYyOCw3LjE0NHYwLjQ3SDUuMjMxeiBNNS4wNzksMTAuNjk5VjguODk2XG5cdFx0XHRcdFx0XHRcdGgxLjc1MnYxLjgwM0g1LjA3OXpgXG5cdFx0XHRcdCk7XG5cblx0XHRcdC8qZDMuc2VsZWN0QWxsKCcuZmlndXJlLXRpdGxlLmhhcy1pbmZvLW1hcmsnKVxuXHRcdFx0XHQuYXBwZW5kKCdhJylcblx0XHRcdFx0LmF0dHIoJ3RpdGxlJywgZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRyZXR1cm4gaW5mb3JtYXRpb25bZDMuc2VsZWN0KHRoaXMucGFyZW50Tm9kZS5wYXJlbnROb2RlKS5hdHRyKCdpZCcpLnJlcGxhY2UoJy0nLCcnKV07XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5hdHRyKCdocmVmJywnIycpXG5cdFx0XHRcdC5hdHRyKCdjbGFzcycsJ2luZm8tbWFyayBzbWFsbCcpXG5cdFx0XHRcdC50ZXh0KCc/Jyk7XG5cdFx0XHRkMy5zZWxlY3RBbGwoJy5pbmZvLW1hcmsnKVxuXHRcdFx0XHQub24oJ2NsaWNrJywoKSA9PiB7XG5cdFx0XHRcdFx0ZDMuZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0fSk7Ki9cblxuXHRcdFx0Z2F0ZSgpO1xuXHRcdFx0Ly9hZGRDbHVzdGVyTGF5ZXJzKHJ0bik7XG5cdFx0XHRcblx0XHR9KTsgLy8gZW5kIGQzIGNzdlxuXHR9IC8vIGVuZCB0b0dlb0pTT05cblx0Lyp2YXIgZmVhdHVyZXNJblZpZXcgPSB7XG5cdFx0cmVuZGVyKCl7XG5cdFx0XHR0aGlzLmNoYXJ0ID0gbmV3IEJhcnMuQmFyKHtcblx0XHRcdFx0bWFyZ2luOiB7XG5cdFx0XHRcdFx0dG9wOjAsXG5cdFx0XHRcdFx0cmlnaHQ6MCxcblx0XHRcdFx0XHRib3R0b206MCxcblx0XHRcdFx0XHRsZWZ0OjBcblx0XHRcdFx0fSxcblx0XHRcdFx0aGVpZ2h0VG9XaWR0aDogMC4wMyxcblx0XHRcdFx0Y29udGFpbmVyOiAnI3RvdGFsLXZpZXcnLFxuXHRcdFx0XHR0b3RhbDogZ2VvanNvbi5mZWF0dXJlcy5sZW5ndGhcblx0XHRcdH0pO1xuXG5cdFx0XHQvKnRoaXMudG90YWwgPSBnZW9qc29uLmZlYXR1cmVzLmxlbmd0aDtcblx0XHRcdHRoaXMuc3ZnID0gZDMuc2VsZWN0KCcjdG90YWwtdmlldycpXG5cdFx0XHRcdC5hcHBlbmQoJ3N2ZycpXG5cdFx0XHRcdC5hdHRyKCd3aWR0aCcsICcxMDAlJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3htbG5zJywnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnKVxuXHQgICAgICAgICAgICAuYXR0cigndmVyc2lvbicsJzEuMScpIFxuXHQgICAgICAgICAgICAuYXR0cigndmlld0JveCcsICcwIDAgMTAwIDMnKTtcblxuXHQgICAgICAgIHRoaXMuYmFja2dyb3VuZCA9IHRoaXMuc3ZnLmFwcGVuZCgnbGluZScpXG5cdCAgICAgICAgXHQuY2xhc3NlZCgnYmFja2dyb3VuZC1saW5lJywgdHJ1ZSlcblx0ICAgICAgICBcdC5hdHRyKCd4MCcsMClcblx0ICAgICAgICBcdC5hdHRyKCd5MCcsMClcblx0ICAgICAgICBcdC5hdHRyKCd4MScsMTAwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kxJywwKTtcblxuXHQgICAgICAgIHRoaXMubGluZSA9IHRoaXMuc3ZnLmFwcGVuZCgnbGluZScpXG5cdCAgICAgICAgXHQuY2xhc3NlZCgndG90YWwtbGluZScsIHRydWUpXG5cdCAgICAgICAgXHQuYXR0cigneDAnLDApXG5cdCAgICAgICAgXHQuYXR0cigneTAnLDApXG5cdCAgICAgICAgXHQuYXR0cigneDEnLDApXG5cdCAgICAgICAgXHQuYXR0cigneTEnLDApO1xuXG5cdCAgICAgICAgdGhpcy50ZXh0ID0gZDMuc2VsZWN0KCcjdG90YWwtdmlldycpXG5cdCAgICAgICAgXHQuYXBwZW5kKCdzcGFuJylcblx0ICAgICAgICBcdC50ZXh0KCgpID0+IGAke2QzLmZvcm1hdChcIixcIikodGhpcy50b3RhbCl9IG9mICR7ZDMuZm9ybWF0KFwiLFwiKSh0aGlzLnRvdGFsKX0gaW4gdmlld2AgKTtcblx0ICAgICAgICBcdFxuXG5cdFx0XHR0aGlzLnVwZGF0ZShjb3VudEZlYXR1cmVzKCkpO1xuXHRcdH0sXG5cdFx0dXBkYXRlKG4pe1xuXHRcdFx0LypkMy5zZWxlY3QoJyN0b3RhbC1pbi12aWV3Jylcblx0XHRcdFx0LnRleHQoKCkgPT4gZDMuZm9ybWF0KFwiLFwiKShuKSArICcgb2YgJyArIGQzLmZvcm1hdChcIixcIikodGhpcy50b3RhbCkgKyAnIHByb3BlcnRpZXMgaW4gdmlldycpOyovXG5cdFx0XHQvKnRoaXMubGluZVxuXHRcdFx0XHQudHJhbnNpdGlvbigpLmR1cmF0aW9uKDIwMClcblx0XHRcdFx0LmF0dHIoJ3gxJywgKCkgPT4gKCBuIC8gdGhpcy50b3RhbCkgKiAxMDAgKTtcblx0XHRcdHRoaXMudGV4dFxuXHRcdFx0XHQudGV4dCgoKSA9PiBgJHtkMy5mb3JtYXQoXCIsXCIpKG4pfSBvZiAke2QzLmZvcm1hdChcIixcIikodGhpcy50b3RhbCl9IGluIHZpZXdgICk7XG4gIFxuXHRcdH0qLyBcblxuXHRcblx0dmFyIGluVmlld0lEcyA9IG5ldyBTZXQoKTtcblx0ZnVuY3Rpb24gY291bnRGZWF0dXJlcygpeyBcblx0XHQvKiBqc2hpbnQgbGF4YnJlYWs6dHJ1ZSAqL1xuXHRcdGluVmlld0lEcy5jbGVhcigpOyBcblx0XHQvL3ZhciBjb3VudCA9IDA7XG5cdFx0dmFyIGJvdW5kcyA9IHRoZU1hcC5nZXRCb3VuZHMoKTtcblx0XHRnZW9qc29uLmZlYXR1cmVzLmZvckVhY2goZWFjaCA9PiB7XG5cdFx0XHRpZiAoICAgIGVhY2gucHJvcGVydGllcy5sb25naXR1ZGUgPj0gYm91bmRzLl9zdy5sbmcgXG5cdFx0XHRcdCAmJiBlYWNoLnByb3BlcnRpZXMubG9uZ2l0dWRlIDw9IGJvdW5kcy5fbmUubG5nIFxuXHRcdFx0XHQgJiYgZWFjaC5wcm9wZXJ0aWVzLmxhdGl0dWRlICA+PSBib3VuZHMuX3N3LmxhdCBcblx0XHRcdFx0ICYmIGVhY2gucHJvcGVydGllcy5sYXRpdHVkZSAgPD0gYm91bmRzLl9uZS5sYXQgKXtcblx0XHRcdFx0aW5WaWV3SURzLmFkZChlYWNoLnByb3BlcnRpZXMuaWQpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdGNvbnNvbGUubG9nKGluVmlld0lEcyk7XG5cdH1cblx0dGhlTWFwLm9uKCdtb3ZlZW5kJywgZnVuY3Rpb24oKXtcblx0XHR1cGRhdGVBbGwoKTtcblx0fSk7XG5cdHRoZU1hcC5vbignem9vbWVuZCcsIGZ1bmN0aW9uKGFyZyl7XG5cdFx0Y29uc29sZS5sb2coYXJnKTtcblx0XHR1cGRhdGVBbGwoKTtcblx0XHRkMy5zZWxlY3QoJyNzaXplLWxlZ2VuZCcpXG5cdFx0XHQuY2xhc3NlZCgnc2hvdycsIHRoZU1hcC5nZXRab29tKCkgPj0gc2l6ZVpvb21UaHJlc2hvbGQpO1xuXHR9KTtcblx0ZnVuY3Rpb24gdXBkYXRlQWxsKCl7XG5cdFx0Y291bnRGZWF0dXJlcygpO1xuXHRcdHRoZUNoYXJ0cy5mb3JFYWNoKGVhY2ggPT4gZWFjaC51cGRhdGUoaW5WaWV3SURzKSk7XG5cdH1cblx0dGhlTWFwLm9uKFwibW91c2Vtb3ZlXCIsIFwicG9pbnRzLWRhdGEtZHJpdmVuXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgfSk7XG5cbiAgIFxuXG5cdHJldHVybiB0aGVNYXA7XG4gICBcbn0oKSk7IC8vIGVuZCBJSUZFICIsImV4cG9ydCBjb25zdCBCYXJzID0gKGZ1bmN0aW9uKCl7XG5cblx0dmFyIEJhciA9IGZ1bmN0aW9uKGNvbmZpZ09iamVjdCl7IC8vIG1hcmdpbnMge30sIGhlaWdodCAjLCB3aWR0aCAjLCBjb250YWluZXJJRCwgZGF0YVBhdGhcblx0ICAgIHRoaXMuc2V0dXAoY29uZmlnT2JqZWN0KTtcblx0fTtcblxuXHRCYXIucHJvdG90eXBlID0ge1xuXHRcdHNldHVwKGNvbmZpZ09iamVjdCl7IC8vIHNvbWUgb2Ygc2V0dXAgaXMgY29tbW9uIHRvIGFsbCBjaGFydHMgYW5kIGNvdWxkIGJlIGhhbmRsZWQgYnkgcHJvdG90eXBpY2FsIGluaGVyaXRhbmNlXG5cdCAgICBcdGNvbnNvbGUubG9nKGNvbmZpZ09iamVjdCk7XG5cdCAgICAgICAgdmFyIHZpZXdCb3ggPSAnMCAwIDEwMCAnICsgTWF0aC5yb3VuZChjb25maWdPYmplY3QuaGVpZ2h0VG9XaWR0aCAqIDEwMCk7XG5cdCAgICAgICAgdGhpcy5jb250YWluZXIgPSBjb25maWdPYmplY3QuY29udGFpbmVyO1xuXHQgICAgICAgIHRoaXMubWFyZ2luID0gY29uZmlnT2JqZWN0Lm1hcmdpbjtcblx0ICAgICAgICB0aGlzLndpZHRoID0gMTAwIC0gdGhpcy5tYXJnaW4ubGVmdCAtIHRoaXMubWFyZ2luLnJpZ2h0O1xuXHQgICAgICAgIHRoaXMuaGVpZ2h0ID0gY29uZmlnT2JqZWN0LmhlaWdodFRvV2lkdGggKiAxMDAgLSB0aGlzLm1hcmdpbi50b3AgLSB0aGlzLm1hcmdpbi5ib3R0b207XG5cdCAgICAgICAgdGhpcy50aXRsZSA9IGNvbmZpZ09iamVjdC50aXRsZTtcblx0ICAgICAgICB0aGlzLmluZm9NYXJrID0gY29uZmlnT2JqZWN0LmluZm9NYXJrIHx8IGZhbHNlO1xuXHQgICAgICAgIHRoaXMuY29tcGFyYXRvciA9IGNvbmZpZ09iamVjdC5jb21wYXJhdG9yO1xuXHQgICAgICAgIHRoaXMudHJ1bmNhdGVSaWdodCA9IGNvbmZpZ09iamVjdC50cnVuY2F0ZVJpZ2h0IHx8IGZhbHNlO1xuXHQgICAgICAgIHRoaXMuYmFja2dyb3VuZENvbG9yID0gY29uZmlnT2JqZWN0LmJhY2tncm91bmRDb2xvciB8fCAnZ3JheSc7XG5cdCAgICAgICAgdGhpcy5kYXRhID0gY29uZmlnT2JqZWN0LmRhdGE7XG5cdCAgICAgICAgdGhpcy5udW1lcmF0b3IgPSBjb25maWdPYmplY3QubnVtZXJhdG9yO1xuXHQgICAgICAgIHRoaXMuZGVub21pbmF0b3IgPSBjb25maWdPYmplY3QuZGVub21pbmF0b3I7XG5cdCAgICAgICAgdGhpcy50ZXh0RnVuY3Rpb24gPSBjb25maWdPYmplY3QudGV4dEZ1bmN0aW9uO1xuXHQgICAgICAgIHRoaXMuelNjb3JlcyA9IGNvbmZpZ09iamVjdC56U2NvcmVzIHx8IG51bGw7XG5cdCAgICAgICAgdGhpcy5taW4gPSBjb25maWdPYmplY3QubWluID8gY29uZmlnT2JqZWN0Lm1pbi5jYWxsKHRoaXMpIDogMDtcblx0ICAgICAgICAvL3RoaXMubWF4ID0gY29uZmlnT2JqZWN0Lm1heCA/IGNvbmZpZ09iamVjdC5tYXguY2FsbCh0aGlzKSA6IDEwMDtcblx0ICAgICAgICAvL3RoaXMuc2NhbGUgPSBkMy5zY2FsZUxpbmVhcigpLmRvbWFpbihbdGhpcy5taW4sdGhpcy5tYXhdKS5yYW5nZShbMCx0aGlzLndpZHRoXSk7XG5cdCAgICAgICAgXG5cblx0ICAgICAgICBkMy5zZWxlY3QodGhpcy5jb250YWluZXIpXG5cdCAgICAgICAgXHQuYXBwZW5kKCdzcGFuJylcblx0ICAgICAgICBcdC5jbGFzc2VkKCdmaWd1cmUtdGl0bGUnLCB0cnVlKVxuXHQgICAgICAgIFx0LmNsYXNzZWQoJ2hhcy1pbmZvLW1hcmsnLCAoKSA9PiB0aGlzLmluZm9NYXJrKVxuXHQgICAgICAgIFx0LnRleHQodGhpcy50aXRsZSk7XG5cblx0ICAgICAgICB0aGlzLnN2ZyA9IGQzLnNlbGVjdCh0aGlzLmNvbnRhaW5lcilcblx0ICAgICAgICBcdC5hcHBlbmQoJ2RpdicpXG5cdCAgICAgICAgXHQuYXR0cignY2xhc3MnLCdzdmctd3JhcHBlcicpXG5cdCAgICAgICAgICAgIC5hcHBlbmQoJ3N2ZycpXG5cdCAgICAgICAgICAgIC5hdHRyKCd3aWR0aCcsICcxMDAlJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3htbG5zJywnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnKVxuXHQgICAgICAgICAgICAuYXR0cigndmVyc2lvbicsJzEuMScpXG5cdCAgICAgICAgICAgIC5hdHRyKCd2aWV3Qm94Jywgdmlld0JveClcblx0ICAgICAgICAgICAgLmFwcGVuZCgnZycpXG5cdCAgICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyB0aGlzLm1hcmdpbi5sZWZ0ICsgJywnICsgdGhpcy5tYXJnaW4udG9wICsgJyknKTtcblxuXHQgICAgICAgIHRoaXMuYmFja2dyb3VuZCA9IHRoaXMuc3ZnLmFwcGVuZCgnbGluZScpXG5cdCAgICAgICAgXHQuY2xhc3NlZCgnYmFja2dyb3VuZC1saW5lLScgKyB0aGlzLmJhY2tncm91bmRDb2xvciwgdHJ1ZSlcblx0ICAgICAgICBcdC5hdHRyKCd4MCcsMClcblx0ICAgICAgICBcdC5hdHRyKCd5MCcsMClcblx0ICAgICAgICBcdC5hdHRyKCd4MScsdGhpcy53aWR0aClcblx0ICAgICAgICBcdC5hdHRyKCd5MScsMCk7XG5cblx0ICAgICAgICB0aGlzLmxpbmUgPSB0aGlzLnN2Zy5hcHBlbmQoJ2xpbmUnKVxuXHQgICAgICAgIFx0LmNsYXNzZWQoJ2ZvcmVncm91bmQtbGluZScsIHRydWUpXG5cdCAgICAgICAgXHQuYXR0cigneDAnLDApXG5cdCAgICAgICAgXHQuYXR0cigneTAnLDApXG5cdCAgICAgICAgXHQuYXR0cigneDEnLDApXG5cdCAgICAgICAgXHQuYXR0cigneTEnLDApO1xuXG5cdCAgICAgICAgdGhpcy50ZXh0ID0gZDMuc2VsZWN0KHRoaXMuY29udGFpbmVyKVxuXHQgICAgICAgIFx0LmFwcGVuZCgnc3BhbicpXG5cdCAgICAgICAgXHQuYXR0cignY2xhc3MnLCd2YWx1ZScpO1xuXHQgICAgICAgIFx0XG5cblx0ICAgICAgICAvL3RoaXMudXBkYXRlKHRoaXMubnVtZXJhdG9yKCkpOyAgXG4gICAgICAgIH0sXG4gICAgICAgIHVwZGF0ZShpblZpZXdJRHMpe1xuICAgICAgICBcdGNvbnNvbGUubG9nKHRoaXMpO1xuXHRcdFx0dmFyIG4gPSB0aGlzLm51bWVyYXRvcihpblZpZXdJRHMpLFxuXHRcdFx0XHRkID0gdGhpcy5kZW5vbWluYXRvcihpblZpZXdJRHMpOyBcblx0XHRcdGQzLnNlbGVjdCh0aGlzLmNvbnRhaW5lcilcblx0XHRcdFx0LmNsYXNzZWQoJ292ZXJmbG93JywgbiA+IGQgKTtcblxuICAgICAgICBcdGlmICh0aGlzLnRydW5jYXRlUmlnaHQpe1xuICAgICAgICBcdFx0ZCA9IHRoaXMubWluID0gMCAtIGQ7XG4gICAgICAgIFx0fSBlbHNlIGlmICggdGhpcy5taW4gPCAwICYmIGQgPiAwICkge1xuICAgICAgICBcdFx0aWYgKE1hdGguYWJzKHRoaXMubWluKSA8IGQpIHtcbiAgICAgICAgXHRcdFx0dGhpcy5taW4gPSAwIC0gZDtcbiAgICAgICAgXHRcdH0gZWxzZSB7XG4gICAgICAgIFx0XHRcdGQgPSAwIC0gdGhpcy5taW47XG4gICAgICAgIFx0XHR9XG4gICAgICAgIFx0fVxuICAgICAgICBcdGNvbnNvbGUubG9nKCdtaW46ICcgKyB0aGlzLm1pbiArICc7IG1heDogJyArIGQpO1xuXHRcdFx0dGhpcy5zY2FsZSA9IGQzLnNjYWxlTGluZWFyKCkuZG9tYWluKFt0aGlzLm1pbixkXSkucmFuZ2UoWzAsdGhpcy53aWR0aF0pLmNsYW1wKHRydWUpO1xuXHRcdFx0dGhpcy5saW5lXG5cdFx0XHRcdC50cmFuc2l0aW9uKCkuZHVyYXRpb24oMjAwKVxuXHRcdFx0XHQuYXR0cigneDEnLCAoKSA9PiB0aGlzLnNjYWxlKG4pKTtcblx0XHRcdHRoaXMudGV4dFxuXHRcdFx0XHQudGV4dCgoKSA9PiB0aGlzLnRleHRGdW5jdGlvbihuLGQpKTtcblx0XHR9XG5cdH07XG5cblx0cmV0dXJuIHtcblx0XHRCYXJcblx0fTtcbiAgICAgICAgXG59KSgpOyIsIi8vIGQzLnRpcFxuLy8gQ29weXJpZ2h0IChjKSAyMDEzIEp1c3RpbiBQYWxtZXJcbi8vIEVTNiAvIEQzIHY0IEFkYXB0aW9uIENvcHlyaWdodCAoYykgMjAxNiBDb25zdGFudGluIEdhdnJpbGV0ZVxuLy8gUmVtb3ZhbCBvZiBFUzYgZm9yIEQzIHY0IEFkYXB0aW9uIENvcHlyaWdodCAoYykgMjAxNiBEYXZpZCBHb3R6XG4vL1xuLy8gVG9vbHRpcHMgZm9yIGQzLmpzIFNWRyB2aXN1YWxpemF0aW9uc1xuXG5leHBvcnQgY29uc3QgZDNUaXAgPSAoZnVuY3Rpb24oKXtcbiAgZDMuZnVuY3RvciA9IGZ1bmN0aW9uIGZ1bmN0b3Iodikge1xuICAgIHJldHVybiB0eXBlb2YgdiA9PT0gXCJmdW5jdGlvblwiID8gdiA6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHY7XG4gICAgfTtcbiAgfTtcblxuICBkMy50aXAgPSBmdW5jdGlvbigpIHtcblxuICAgIHZhciBkaXJlY3Rpb24gPSBkM190aXBfZGlyZWN0aW9uLFxuICAgICAgICBvZmZzZXQgICAgPSBkM190aXBfb2Zmc2V0LFxuICAgICAgICBodG1sICAgICAgPSBkM190aXBfaHRtbCxcbiAgICAgICAgbm9kZSAgICAgID0gaW5pdE5vZGUoKSxcbiAgICAgICAgc3ZnICAgICAgID0gbnVsbCxcbiAgICAgICAgcG9pbnQgICAgID0gbnVsbCxcbiAgICAgICAgdGFyZ2V0ICAgID0gbnVsbFxuXG4gICAgZnVuY3Rpb24gdGlwKHZpcykge1xuICAgICAgc3ZnID0gZ2V0U1ZHTm9kZSh2aXMpXG4gICAgICBwb2ludCA9IHN2Zy5jcmVhdGVTVkdQb2ludCgpXG4gICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKG5vZGUpXG4gICAgfVxuXG4gICAgLy8gUHVibGljIC0gc2hvdyB0aGUgdG9vbHRpcCBvbiB0aGUgc2NyZWVuXG4gICAgLy9cbiAgICAvLyBSZXR1cm5zIGEgdGlwXG4gICAgdGlwLnNob3cgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxuICAgICAgaWYoYXJnc1thcmdzLmxlbmd0aCAtIDFdIGluc3RhbmNlb2YgU1ZHRWxlbWVudCkgdGFyZ2V0ID0gYXJncy5wb3AoKVxuICAgICAgdmFyIGNvbnRlbnQgPSBodG1sLmFwcGx5KHRoaXMsIGFyZ3MpLFxuICAgICAgICAgIHBvZmZzZXQgPSBvZmZzZXQuYXBwbHkodGhpcywgYXJncyksXG4gICAgICAgICAgZGlyICAgICA9IGRpcmVjdGlvbi5hcHBseSh0aGlzLCBhcmdzKSxcbiAgICAgICAgICBub2RlbCAgID0gZ2V0Tm9kZUVsKCksXG4gICAgICAgICAgaSAgICAgICA9IGRpcmVjdGlvbnMubGVuZ3RoLFxuICAgICAgICAgIGNvb3JkcyxcbiAgICAgICAgICBzY3JvbGxUb3AgID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbFRvcCB8fCBkb2N1bWVudC5ib2R5LnNjcm9sbFRvcCxcbiAgICAgICAgICBzY3JvbGxMZWZ0ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LnNjcm9sbExlZnQgfHwgZG9jdW1lbnQuYm9keS5zY3JvbGxMZWZ0XG5cbiAgICAgIG5vZGVsLmh0bWwoY29udGVudClcbiAgICAgICAgLnN0eWxlKCdwb3NpdGlvbicsICdhYnNvbHV0ZScpXG4gICAgICAgIC5zdHlsZSgnb3BhY2l0eScsIDEpXG4gICAgICAgIC5zdHlsZSgncG9pbnRlci1ldmVudHMnLCAnYWxsJylcblxuICAgICAgd2hpbGUoaS0tKSBub2RlbC5jbGFzc2VkKGRpcmVjdGlvbnNbaV0sIGZhbHNlKVxuICAgICAgY29vcmRzID0gZGlyZWN0aW9uX2NhbGxiYWNrc1tkaXJdLmFwcGx5KHRoaXMpXG4gICAgICBub2RlbC5jbGFzc2VkKGRpciwgdHJ1ZSlcbiAgICAgICAgLnN0eWxlKCd0b3AnLCAoY29vcmRzLnRvcCArICBwb2Zmc2V0WzBdKSArIHNjcm9sbFRvcCArICdweCcpXG4gICAgICAgIC5zdHlsZSgnbGVmdCcsIChjb29yZHMubGVmdCArIHBvZmZzZXRbMV0pICsgc2Nyb2xsTGVmdCArICdweCcpXG5cbiAgICAgIHJldHVybiB0aXBcbiAgICB9XG5cbiAgICAvLyBQdWJsaWMgLSBoaWRlIHRoZSB0b29sdGlwXG4gICAgLy9cbiAgICAvLyBSZXR1cm5zIGEgdGlwXG4gICAgdGlwLmhpZGUgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBub2RlbCA9IGdldE5vZGVFbCgpXG4gICAgICBub2RlbFxuICAgICAgICAuc3R5bGUoJ29wYWNpdHknLCAwKVxuICAgICAgICAuc3R5bGUoJ3BvaW50ZXItZXZlbnRzJywgJ25vbmUnKVxuICAgICAgcmV0dXJuIHRpcFxuICAgIH1cblxuICAgIC8vIFB1YmxpYzogUHJveHkgYXR0ciBjYWxscyB0byB0aGUgZDMgdGlwIGNvbnRhaW5lci4gIFNldHMgb3IgZ2V0cyBhdHRyaWJ1dGUgdmFsdWUuXG4gICAgLy9cbiAgICAvLyBuIC0gbmFtZSBvZiB0aGUgYXR0cmlidXRlXG4gICAgLy8gdiAtIHZhbHVlIG9mIHRoZSBhdHRyaWJ1dGVcbiAgICAvL1xuICAgIC8vIFJldHVybnMgdGlwIG9yIGF0dHJpYnV0ZSB2YWx1ZVxuICAgIHRpcC5hdHRyID0gZnVuY3Rpb24obiwgdikge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyICYmIHR5cGVvZiBuID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gZ2V0Tm9kZUVsKCkuYXR0cihuKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGFyZ3MgPSAgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKVxuICAgICAgICBkMy5zZWxlY3Rpb24ucHJvdG90eXBlLmF0dHIuYXBwbHkoZ2V0Tm9kZUVsKCksIGFyZ3MpXG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aXBcbiAgICB9XG5cbiAgICAvLyBQdWJsaWM6IFByb3h5IHN0eWxlIGNhbGxzIHRvIHRoZSBkMyB0aXAgY29udGFpbmVyLiAgU2V0cyBvciBnZXRzIGEgc3R5bGUgdmFsdWUuXG4gICAgLy9cbiAgICAvLyBuIC0gbmFtZSBvZiB0aGUgcHJvcGVydHlcbiAgICAvLyB2IC0gdmFsdWUgb2YgdGhlIHByb3BlcnR5XG4gICAgLy9cbiAgICAvLyBSZXR1cm5zIHRpcCBvciBzdHlsZSBwcm9wZXJ0eSB2YWx1ZVxuICAgIHRpcC5zdHlsZSA9IGZ1bmN0aW9uKG4sIHYpIHtcbiAgICAgIC8vIGRlYnVnZ2VyO1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPCAyICYmIHR5cGVvZiBuID09PSAnc3RyaW5nJykge1xuICAgICAgICByZXR1cm4gZ2V0Tm9kZUVsKCkuc3R5bGUobilcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgICAgaWYgKGFyZ3MubGVuZ3RoID09PSAxKSB7XG4gICAgICAgICAgdmFyIHN0eWxlcyA9IGFyZ3NbMF07XG4gICAgICAgICAgT2JqZWN0LmtleXMoc3R5bGVzKS5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICAgICAgcmV0dXJuIGQzLnNlbGVjdGlvbi5wcm90b3R5cGUuc3R5bGUuYXBwbHkoZ2V0Tm9kZUVsKCksIFtrZXksIHN0eWxlc1trZXldXSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRpcFxuICAgIH1cblxuICAgIC8vIFB1YmxpYzogU2V0IG9yIGdldCB0aGUgZGlyZWN0aW9uIG9mIHRoZSB0b29sdGlwXG4gICAgLy9cbiAgICAvLyB2IC0gT25lIG9mIG4obm9ydGgpLCBzKHNvdXRoKSwgZShlYXN0KSwgb3Igdyh3ZXN0KSwgbncobm9ydGh3ZXN0KSxcbiAgICAvLyAgICAgc3coc291dGh3ZXN0KSwgbmUobm9ydGhlYXN0KSBvciBzZShzb3V0aGVhc3QpXG4gICAgLy9cbiAgICAvLyBSZXR1cm5zIHRpcCBvciBkaXJlY3Rpb25cbiAgICB0aXAuZGlyZWN0aW9uID0gZnVuY3Rpb24odikge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gZGlyZWN0aW9uXG4gICAgICBkaXJlY3Rpb24gPSB2ID09IG51bGwgPyB2IDogZDMuZnVuY3Rvcih2KVxuXG4gICAgICByZXR1cm4gdGlwXG4gICAgfVxuXG4gICAgLy8gUHVibGljOiBTZXRzIG9yIGdldHMgdGhlIG9mZnNldCBvZiB0aGUgdGlwXG4gICAgLy9cbiAgICAvLyB2IC0gQXJyYXkgb2YgW3gsIHldIG9mZnNldFxuICAgIC8vXG4gICAgLy8gUmV0dXJucyBvZmZzZXQgb3JcbiAgICB0aXAub2Zmc2V0ID0gZnVuY3Rpb24odikge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gb2Zmc2V0XG4gICAgICBvZmZzZXQgPSB2ID09IG51bGwgPyB2IDogZDMuZnVuY3Rvcih2KVxuXG4gICAgICByZXR1cm4gdGlwXG4gICAgfVxuXG4gICAgLy8gUHVibGljOiBzZXRzIG9yIGdldHMgdGhlIGh0bWwgdmFsdWUgb2YgdGhlIHRvb2x0aXBcbiAgICAvL1xuICAgIC8vIHYgLSBTdHJpbmcgdmFsdWUgb2YgdGhlIHRpcFxuICAgIC8vXG4gICAgLy8gUmV0dXJucyBodG1sIHZhbHVlIG9yIHRpcFxuICAgIHRpcC5odG1sID0gZnVuY3Rpb24odikge1xuICAgICAgaWYgKCFhcmd1bWVudHMubGVuZ3RoKSByZXR1cm4gaHRtbFxuICAgICAgaHRtbCA9IHYgPT0gbnVsbCA/IHYgOiBkMy5mdW5jdG9yKHYpXG5cbiAgICAgIHJldHVybiB0aXBcbiAgICB9XG5cbiAgICAvLyBQdWJsaWM6IGRlc3Ryb3lzIHRoZSB0b29sdGlwIGFuZCByZW1vdmVzIGl0IGZyb20gdGhlIERPTVxuICAgIC8vXG4gICAgLy8gUmV0dXJucyBhIHRpcFxuICAgIHRpcC5kZXN0cm95ID0gZnVuY3Rpb24oKSB7XG4gICAgICBpZihub2RlKSB7XG4gICAgICAgIGdldE5vZGVFbCgpLnJlbW92ZSgpO1xuICAgICAgICBub2RlID0gbnVsbDtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aXA7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZDNfdGlwX2RpcmVjdGlvbigpIHsgcmV0dXJuICduJyB9XG4gICAgZnVuY3Rpb24gZDNfdGlwX29mZnNldCgpIHsgcmV0dXJuIFswLCAwXSB9XG4gICAgZnVuY3Rpb24gZDNfdGlwX2h0bWwoKSB7IHJldHVybiAnICcgfVxuXG4gICAgdmFyIGRpcmVjdGlvbl9jYWxsYmFja3MgPSB7XG4gICAgICBuOiAgZGlyZWN0aW9uX24sXG4gICAgICBzOiAgZGlyZWN0aW9uX3MsXG4gICAgICBlOiAgZGlyZWN0aW9uX2UsXG4gICAgICB3OiAgZGlyZWN0aW9uX3csXG4gICAgICBudzogZGlyZWN0aW9uX253LFxuICAgICAgbmU6IGRpcmVjdGlvbl9uZSxcbiAgICAgIHN3OiBkaXJlY3Rpb25fc3csXG4gICAgICBzZTogZGlyZWN0aW9uX3NlXG4gICAgfTtcblxuICAgIHZhciBkaXJlY3Rpb25zID0gT2JqZWN0LmtleXMoZGlyZWN0aW9uX2NhbGxiYWNrcyk7XG5cbiAgICBmdW5jdGlvbiBkaXJlY3Rpb25fbigpIHtcbiAgICAgIHZhciBiYm94ID0gZ2V0U2NyZWVuQkJveCgpXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0b3A6ICBiYm94Lm4ueSAtIG5vZGUub2Zmc2V0SGVpZ2h0LFxuICAgICAgICBsZWZ0OiBiYm94Lm4ueCAtIG5vZGUub2Zmc2V0V2lkdGggLyAyXG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGlyZWN0aW9uX3MoKSB7XG4gICAgICB2YXIgYmJveCA9IGdldFNjcmVlbkJCb3goKVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9wOiAgYmJveC5zLnksXG4gICAgICAgIGxlZnQ6IGJib3gucy54IC0gbm9kZS5vZmZzZXRXaWR0aCAvIDJcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkaXJlY3Rpb25fZSgpIHtcbiAgICAgIHZhciBiYm94ID0gZ2V0U2NyZWVuQkJveCgpXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0b3A6ICBiYm94LmUueSAtIG5vZGUub2Zmc2V0SGVpZ2h0IC8gMixcbiAgICAgICAgbGVmdDogYmJveC5lLnhcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkaXJlY3Rpb25fdygpIHtcbiAgICAgIHZhciBiYm94ID0gZ2V0U2NyZWVuQkJveCgpXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0b3A6ICBiYm94LncueSAtIG5vZGUub2Zmc2V0SGVpZ2h0IC8gMixcbiAgICAgICAgbGVmdDogYmJveC53LnggLSBub2RlLm9mZnNldFdpZHRoXG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGlyZWN0aW9uX253KCkge1xuICAgICAgdmFyIGJib3ggPSBnZXRTY3JlZW5CQm94KClcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRvcDogIGJib3gubncueSAtIG5vZGUub2Zmc2V0SGVpZ2h0LFxuICAgICAgICBsZWZ0OiBiYm94Lm53LnggLSBub2RlLm9mZnNldFdpZHRoXG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGlyZWN0aW9uX25lKCkge1xuICAgICAgdmFyIGJib3ggPSBnZXRTY3JlZW5CQm94KClcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRvcDogIGJib3gubmUueSAtIG5vZGUub2Zmc2V0SGVpZ2h0LFxuICAgICAgICBsZWZ0OiBiYm94Lm5lLnhcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkaXJlY3Rpb25fc3coKSB7XG4gICAgICB2YXIgYmJveCA9IGdldFNjcmVlbkJCb3goKVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9wOiAgYmJveC5zdy55LFxuICAgICAgICBsZWZ0OiBiYm94LnN3LnggLSBub2RlLm9mZnNldFdpZHRoXG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGlyZWN0aW9uX3NlKCkge1xuICAgICAgdmFyIGJib3ggPSBnZXRTY3JlZW5CQm94KClcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRvcDogIGJib3guc2UueSxcbiAgICAgICAgbGVmdDogYmJveC5lLnhcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpbml0Tm9kZSgpIHtcbiAgICAgIHZhciBub2RlID0gZDMuc2VsZWN0KGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpKVxuICAgICAgbm9kZVxuICAgICAgICAuc3R5bGUoJ3Bvc2l0aW9uJywgJ2Fic29sdXRlJylcbiAgICAgICAgLnN0eWxlKCd0b3AnLCAwKVxuICAgICAgICAuc3R5bGUoJ29wYWNpdHknLCAwKVxuICAgICAgICAuc3R5bGUoJ3BvaW50ZXItZXZlbnRzJywgJ25vbmUnKVxuICAgICAgICAuc3R5bGUoJ2JveC1zaXppbmcnLCAnYm9yZGVyLWJveCcpXG5cbiAgICAgIHJldHVybiBub2RlLm5vZGUoKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldFNWR05vZGUoZWwpIHtcbiAgICAgIGVsID0gZWwubm9kZSgpXG4gICAgICBpZihlbC50YWdOYW1lLnRvTG93ZXJDYXNlKCkgPT09ICdzdmcnKVxuICAgICAgICByZXR1cm4gZWxcblxuICAgICAgcmV0dXJuIGVsLm93bmVyU1ZHRWxlbWVudFxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGdldE5vZGVFbCgpIHtcbiAgICAgIGlmKG5vZGUgPT09IG51bGwpIHtcbiAgICAgICAgbm9kZSA9IGluaXROb2RlKCk7XG4gICAgICAgIC8vIHJlLWFkZCBub2RlIHRvIERPTVxuICAgICAgICBkb2N1bWVudC5ib2R5LmFwcGVuZENoaWxkKG5vZGUpO1xuICAgICAgfTtcbiAgICAgIHJldHVybiBkMy5zZWxlY3Qobm9kZSk7XG4gICAgfVxuXG4gICAgLy8gUHJpdmF0ZSAtIGdldHMgdGhlIHNjcmVlbiBjb29yZGluYXRlcyBvZiBhIHNoYXBlXG4gICAgLy9cbiAgICAvLyBHaXZlbiBhIHNoYXBlIG9uIHRoZSBzY3JlZW4sIHdpbGwgcmV0dXJuIGFuIFNWR1BvaW50IGZvciB0aGUgZGlyZWN0aW9uc1xuICAgIC8vIG4obm9ydGgpLCBzKHNvdXRoKSwgZShlYXN0KSwgdyh3ZXN0KSwgbmUobm9ydGhlYXN0KSwgc2Uoc291dGhlYXN0KSwgbncobm9ydGh3ZXN0KSxcbiAgICAvLyBzdyhzb3V0aHdlc3QpLlxuICAgIC8vXG4gICAgLy8gICAgKy0rLStcbiAgICAvLyAgICB8ICAgfFxuICAgIC8vICAgICsgICArXG4gICAgLy8gICAgfCAgIHxcbiAgICAvLyAgICArLSstK1xuICAgIC8vXG4gICAgLy8gUmV0dXJucyBhbiBPYmplY3Qge24sIHMsIGUsIHcsIG53LCBzdywgbmUsIHNlfVxuICAgIGZ1bmN0aW9uIGdldFNjcmVlbkJCb3goKSB7XG4gICAgICB2YXIgdGFyZ2V0ZWwgICA9IHRhcmdldCB8fCBkMy5ldmVudC50YXJnZXQ7XG4gICAgICBjb25zb2xlLmxvZyh0YXJnZXRlbCk7XG4gICAgICBmdW5jdGlvbiB0cnlCQm94KCl7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgdGFyZ2V0ZWwuZ2V0QkJveCgpO1xuICAgICAgICB9XG4gICAgICAgIGNhdGNoIChlcnIpIHtcbiAgICAgICAgICB0YXJnZXRlbCA9IHRhcmdldGVsLnBhcmVudE5vZGU7XG4gICAgICAgICAgdHJ5QkJveCgpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICB0cnlCQm94KCk7XG4gICAgICB3aGlsZSAoJ3VuZGVmaW5lZCcgPT09IHR5cGVvZiB0YXJnZXRlbC5nZXRTY3JlZW5DVE0gKXsvLyAmJiAndW5kZWZpbmVkJyA9PT0gdGFyZ2V0ZWwucGFyZW50Tm9kZSkge1xuICAgICAgICAgIHRhcmdldGVsID0gdGFyZ2V0ZWwucGFyZW50Tm9kZTtcbiAgICAgIH1cbiAgICAgIGNvbnNvbGUubG9nKHRhcmdldGVsKTtcbiAgICAgIHZhciBiYm94ICAgICAgID0ge30sXG4gICAgICAgICAgbWF0cml4ICAgICA9IHRhcmdldGVsLmdldFNjcmVlbkNUTSgpLFxuICAgICAgICAgIHRiYm94ICAgICAgPSB0YXJnZXRlbC5nZXRCQm94KCksXG4gICAgICAgICAgd2lkdGggICAgICA9IHRiYm94LndpZHRoLFxuICAgICAgICAgIGhlaWdodCAgICAgPSB0YmJveC5oZWlnaHQsXG4gICAgICAgICAgeCAgICAgICAgICA9IHRiYm94LngsXG4gICAgICAgICAgeSAgICAgICAgICA9IHRiYm94LnlcblxuICAgICAgcG9pbnQueCA9IHhcbiAgICAgIHBvaW50LnkgPSB5XG4gICAgICBiYm94Lm53ID0gcG9pbnQubWF0cml4VHJhbnNmb3JtKG1hdHJpeClcbiAgICAgIHBvaW50LnggKz0gd2lkdGhcbiAgICAgIGJib3gubmUgPSBwb2ludC5tYXRyaXhUcmFuc2Zvcm0obWF0cml4KVxuICAgICAgcG9pbnQueSArPSBoZWlnaHRcbiAgICAgIGJib3guc2UgPSBwb2ludC5tYXRyaXhUcmFuc2Zvcm0obWF0cml4KVxuICAgICAgcG9pbnQueCAtPSB3aWR0aFxuICAgICAgYmJveC5zdyA9IHBvaW50Lm1hdHJpeFRyYW5zZm9ybShtYXRyaXgpXG4gICAgICBwb2ludC55IC09IGhlaWdodCAvIDJcbiAgICAgIGJib3gudyAgPSBwb2ludC5tYXRyaXhUcmFuc2Zvcm0obWF0cml4KVxuICAgICAgcG9pbnQueCArPSB3aWR0aFxuICAgICAgYmJveC5lID0gcG9pbnQubWF0cml4VHJhbnNmb3JtKG1hdHJpeClcbiAgICAgIHBvaW50LnggLT0gd2lkdGggLyAyXG4gICAgICBwb2ludC55IC09IGhlaWdodCAvIDJcbiAgICAgIGJib3gubiA9IHBvaW50Lm1hdHJpeFRyYW5zZm9ybShtYXRyaXgpXG4gICAgICBwb2ludC55ICs9IGhlaWdodFxuICAgICAgYmJveC5zID0gcG9pbnQubWF0cml4VHJhbnNmb3JtKG1hdHJpeClcblxuICAgICAgcmV0dXJuIGJib3hcbiAgICB9XG5cbiAgICByZXR1cm4gdGlwXG4gIH07XG59KSgpOyIsIi8qIFBvbHlmaWxsIHNlcnZpY2UgdjMuMjUuMVxuICogRm9yIGRldGFpbGVkIGNyZWRpdHMgYW5kIGxpY2VuY2UgaW5mb3JtYXRpb24gc2VlIGh0dHBzOi8vZ2l0aHViLmNvbS9maW5hbmNpYWwtdGltZXMvcG9seWZpbGwtc2VydmljZS5cbiAqIFxuICogVUEgZGV0ZWN0ZWQ6IGllLzEwLjAuMFxuICogRmVhdHVyZXMgcmVxdWVzdGVkOiBQcm9taXNlXG4gKiBcbiAqIC0gUHJvbWlzZSwgTGljZW5zZTogTUlUICovXG5cbmV4cG9ydCBjb25zdCBQcm9taXNlUG9seWZpbGwgPSAgKGZ1bmN0aW9uKHVuZGVmaW5lZCkge1xuXG4vLyBQcm9taXNlXG4hZnVuY3Rpb24obil7ZnVuY3Rpb24gdChlKXtpZihyW2VdKXJldHVybiByW2VdLmV4cG9ydHM7dmFyIG89cltlXT17ZXhwb3J0czp7fSxpZDplLGxvYWRlZDohMX07cmV0dXJuIG5bZV0uY2FsbChvLmV4cG9ydHMsbyxvLmV4cG9ydHMsdCksby5sb2FkZWQ9ITAsby5leHBvcnRzfXZhciByPXt9O3JldHVybiB0Lm09bix0LmM9cix0LnA9XCJcIix0KDApfSh7MDovKiEqKioqKioqKioqKioqKioqKioqKioqKiEqXFxcbiAgISoqKiAuL3NyYy9nbG9iYWwuanMgKioqIVxuICBcXCoqKioqKioqKioqKioqKioqKioqKioqL1xuZnVuY3Rpb24obix0LHIpeyhmdW5jdGlvbihuKXt2YXIgdD1yKC8qISAuL3lha3UgKi84MCk7dHJ5eyhufHx7fSkuUHJvbWlzZT10LHdpbmRvdy5Qcm9taXNlPXR9Y2F0Y2goZXJyKXt9fSkuY2FsbCh0LGZ1bmN0aW9uKCl7cmV0dXJuIHRoaXN9KCkpfSw4MDovKiEqKioqKioqKioqKioqKioqKioqKiohKlxcXG4gICEqKiogLi9zcmMveWFrdS5qcyAqKiohXG4gIFxcKioqKioqKioqKioqKioqKioqKioqL1xuZnVuY3Rpb24obix0KXsoZnVuY3Rpb24odCl7IWZ1bmN0aW9uKCl7XCJ1c2Ugc3RyaWN0XCI7ZnVuY3Rpb24gcigpe3JldHVybiB1bltCXVtHXXx8Sn1mdW5jdGlvbiBlKG4sdCl7Zm9yKHZhciByIGluIHQpbltyXT10W3JdfWZ1bmN0aW9uIG8obil7cmV0dXJuIG4mJlwib2JqZWN0XCI9PXR5cGVvZiBufWZ1bmN0aW9uIGkobil7cmV0dXJuXCJmdW5jdGlvblwiPT10eXBlb2Ygbn1mdW5jdGlvbiB1KG4sdCl7cmV0dXJuIG4gaW5zdGFuY2VvZiB0fWZ1bmN0aW9uIGMobil7cmV0dXJuIHUobixVKX1mdW5jdGlvbiBmKG4sdCxyKXtpZighdChuKSl0aHJvdyB2KHIpfWZ1bmN0aW9uIHMoKXt0cnl7cmV0dXJuIEMuYXBwbHkoRixhcmd1bWVudHMpfWNhdGNoKGUpe3JldHVybiBybi5lPWUscm59fWZ1bmN0aW9uIGEobix0KXtyZXR1cm4gQz1uLEY9dCxzfWZ1bmN0aW9uIGwobix0KXtmdW5jdGlvbiByKCl7Zm9yKHZhciByPTA7cjxvOyl0KGVbcl0sZVtyKzFdKSxlW3IrK109UyxlW3IrK109UztvPTAsZS5sZW5ndGg+biYmKGUubGVuZ3RoPW4pfXZhciBlPU8obiksbz0wO3JldHVybiBmdW5jdGlvbihuLHQpe2VbbysrXT1uLGVbbysrXT10LDI9PT1vJiZ1bi5uZXh0VGljayhyKX19ZnVuY3Rpb24gaChuLHQpe3ZhciByLGUsbyxjLGY9MDtpZighbil0aHJvdyB2KFcpO3ZhciBzPW5bdW5bQl1bRF1dO2lmKGkocykpZT1zLmNhbGwobik7ZWxzZXtpZighaShuLm5leHQpKXtpZih1KG4sTykpe2ZvcihyPW4ubGVuZ3RoO2Y8cjspdChuW2ZdLGYrKyk7cmV0dXJuIGZ9dGhyb3cgdihXKX1lPW59Zm9yKDshKG89ZS5uZXh0KCkpLmRvbmU7KWlmKGM9YSh0KShvLnZhbHVlLGYrKyksYz09PXJuKXRocm93IGkoZVtLXSkmJmVbS10oKSxjLmU7cmV0dXJuIGZ9ZnVuY3Rpb24gdihuKXtyZXR1cm4gbmV3IFR5cGVFcnJvcihuKX1mdW5jdGlvbiBfKG4pe3JldHVybihuP1wiXCI6WCkrKG5ldyBVKS5zdGFja31mdW5jdGlvbiBkKG4sdCl7dmFyIHI9XCJvblwiK24udG9Mb3dlckNhc2UoKSxlPUhbcl07SSYmSS5saXN0ZW5lcnMobikubGVuZ3RoP249PT10bj9JLmVtaXQobix0Ll92LHQpOkkuZW1pdChuLHQpOmU/ZSh7cmVhc29uOnQuX3YscHJvbWlzZTp0fSk6dW5bbl0odC5fdix0KX1mdW5jdGlvbiBwKG4pe3JldHVybiBuJiZuLl9zfWZ1bmN0aW9uIHcobil7aWYocChuKSlyZXR1cm4gbmV3IG4oZW4pO3ZhciB0LHIsZTtyZXR1cm4gdD1uZXcgbihmdW5jdGlvbihuLG8pe2lmKHQpdGhyb3cgdigpO3I9bixlPW99KSxmKHIsaSksZihlLGkpLHR9ZnVuY3Rpb24gbShuLHQpe3JldHVybiBmdW5jdGlvbihyKXtBJiYobltRXT1fKCEwKSksdD09PXE/VChuLHIpOmsobix0LHIpfX1mdW5jdGlvbiB5KG4sdCxyLGUpe3JldHVybiBpKHIpJiYodC5fb25GdWxmaWxsZWQ9ciksaShlKSYmKG5bTV0mJmQobm4sbiksdC5fb25SZWplY3RlZD1lKSxBJiYodC5fcD1uKSxuW24uX2MrK109dCxuLl9zIT09eiYmY24obix0KSx0fWZ1bmN0aW9uIGoobil7aWYobi5fdW1hcmspcmV0dXJuITA7bi5fdW1hcms9ITA7Zm9yKHZhciB0LHI9MCxlPW4uX2M7cjxlOylpZih0PW5bcisrXSx0Ll9vblJlamVjdGVkfHxqKHQpKXJldHVybiEwfWZ1bmN0aW9uIHgobix0KXtmdW5jdGlvbiByKG4pe3JldHVybiBlLnB1c2gobi5yZXBsYWNlKC9eXFxzK3xcXHMrJC9nLFwiXCIpKX12YXIgZT1bXTtyZXR1cm4gQSYmKHRbUV0mJnIodFtRXSksZnVuY3Rpb24gbyhuKXtuJiZOIGluIG4mJihvKG4uX25leHQpLHIobltOXStcIlwiKSxvKG4uX3ApKX0odCkpLChuJiZuLnN0YWNrP24uc3RhY2s6bikrKFwiXFxuXCIrZS5qb2luKFwiXFxuXCIpKS5yZXBsYWNlKG9uLFwiXCIpfWZ1bmN0aW9uIGcobix0KXtyZXR1cm4gbih0KX1mdW5jdGlvbiBrKG4sdCxyKXt2YXIgZT0wLG89bi5fYztpZihuLl9zPT09eilmb3Iobi5fcz10LG4uX3Y9cix0PT09JCYmKEEmJmMocikmJihyLmxvbmdTdGFjaz14KHIsbikpLGZuKG4pKTtlPG87KWNuKG4sbltlKytdKTtyZXR1cm4gbn1mdW5jdGlvbiBUKG4sdCl7aWYodD09PW4mJnQpcmV0dXJuIGsobiwkLHYoWSkpLG47aWYodCE9PVAmJihpKHQpfHxvKHQpKSl7dmFyIHI9YShiKSh0KTtpZihyPT09cm4pcmV0dXJuIGsobiwkLHIuZSksbjtpKHIpPyhBJiZwKHQpJiYobi5fbmV4dD10KSxwKHQpP1Iobix0LHIpOnVuLm5leHRUaWNrKGZ1bmN0aW9uKCl7UihuLHQscil9KSk6ayhuLHEsdCl9ZWxzZSBrKG4scSx0KTtyZXR1cm4gbn1mdW5jdGlvbiBiKG4pe3JldHVybiBuLnRoZW59ZnVuY3Rpb24gUihuLHQscil7dmFyIGU9YShyLHQpKGZ1bmN0aW9uKHIpe3QmJih0PVAsVChuLHIpKX0sZnVuY3Rpb24ocil7dCYmKHQ9UCxrKG4sJCxyKSl9KTtlPT09cm4mJnQmJihrKG4sJCxlLmUpLHQ9UCl9dmFyIFMsQyxGLFA9bnVsbCxFPVwib2JqZWN0XCI9PXR5cGVvZiB3aW5kb3csSD1FP3dpbmRvdzp0LEk9SC5wcm9jZXNzLEw9SC5jb25zb2xlLEE9ITEsTz1BcnJheSxVPUVycm9yLCQ9MSxxPTIsej0zLEI9XCJTeW1ib2xcIixEPVwiaXRlcmF0b3JcIixHPVwic3BlY2llc1wiLEo9QitcIihcIitHK1wiKVwiLEs9XCJyZXR1cm5cIixNPVwiX3VoXCIsTj1cIl9wdFwiLFE9XCJfc3RcIixWPVwiSW52YWxpZCB0aGlzXCIsVz1cIkludmFsaWQgYXJndW1lbnRcIixYPVwiXFxuRnJvbSBwcmV2aW91cyBcIixZPVwiQ2hhaW5pbmcgY3ljbGUgZGV0ZWN0ZWQgZm9yIHByb21pc2VcIixaPVwiVW5jYXVnaHQgKGluIHByb21pc2UpXCIsbm49XCJyZWplY3Rpb25IYW5kbGVkXCIsdG49XCJ1bmhhbmRsZWRSZWplY3Rpb25cIixybj17ZTpQfSxlbj1mdW5jdGlvbigpe30sb249L14uK1xcL25vZGVfbW9kdWxlc1xcL3lha3VcXC8uK1xcbj8vZ20sdW49bi5leHBvcnRzPWZ1bmN0aW9uKG4pe3ZhciB0LHI9dGhpcztpZighbyhyKXx8ci5fcyE9PVMpdGhyb3cgdihWKTtpZihyLl9zPXosQSYmKHJbTl09XygpKSxuIT09ZW4pe2lmKCFpKG4pKXRocm93IHYoVyk7dD1hKG4pKG0ocixxKSxtKHIsJCkpLHQ9PT1ybiYmayhyLCQsdC5lKX19O3VuW1wiZGVmYXVsdFwiXT11bixlKHVuLnByb3RvdHlwZSx7dGhlbjpmdW5jdGlvbihuLHQpe2lmKHZvaWQgMD09PXRoaXMuX3MpdGhyb3cgdigpO3JldHVybiB5KHRoaXMsdyh1bi5zcGVjaWVzQ29uc3RydWN0b3IodGhpcyx1bikpLG4sdCl9LFwiY2F0Y2hcIjpmdW5jdGlvbihuKXtyZXR1cm4gdGhpcy50aGVuKFMsbil9LFwiZmluYWxseVwiOmZ1bmN0aW9uKG4pe2Z1bmN0aW9uIHQodCl7cmV0dXJuIHVuLnJlc29sdmUobigpKS50aGVuKGZ1bmN0aW9uKCl7cmV0dXJuIHR9KX1yZXR1cm4gdGhpcy50aGVuKHQsdCl9LF9jOjAsX3A6UH0pLHVuLnJlc29sdmU9ZnVuY3Rpb24obil7cmV0dXJuIHAobik/bjpUKHcodGhpcyksbil9LHVuLnJlamVjdD1mdW5jdGlvbihuKXtyZXR1cm4gayh3KHRoaXMpLCQsbil9LHVuLnJhY2U9ZnVuY3Rpb24obil7dmFyIHQ9dGhpcyxyPXcodCksZT1mdW5jdGlvbihuKXtrKHIscSxuKX0sbz1mdW5jdGlvbihuKXtrKHIsJCxuKX0saT1hKGgpKG4sZnVuY3Rpb24obil7dC5yZXNvbHZlKG4pLnRoZW4oZSxvKX0pO3JldHVybiBpPT09cm4/dC5yZWplY3QoaS5lKTpyfSx1bi5hbGw9ZnVuY3Rpb24obil7ZnVuY3Rpb24gdChuKXtrKG8sJCxuKX12YXIgcixlPXRoaXMsbz13KGUpLGk9W107cmV0dXJuIHI9YShoKShuLGZ1bmN0aW9uKG4sdSl7ZS5yZXNvbHZlKG4pLnRoZW4oZnVuY3Rpb24obil7aVt1XT1uLC0tcnx8ayhvLHEsaSl9LHQpfSkscj09PXJuP2UucmVqZWN0KHIuZSk6KHJ8fGsobyxxLFtdKSxvKX0sdW4uU3ltYm9sPUhbQl18fHt9LGEoZnVuY3Rpb24oKXtPYmplY3QuZGVmaW5lUHJvcGVydHkodW4scigpLHtnZXQ6ZnVuY3Rpb24oKXtyZXR1cm4gdGhpc319KX0pKCksdW4uc3BlY2llc0NvbnN0cnVjdG9yPWZ1bmN0aW9uKG4sdCl7dmFyIGU9bi5jb25zdHJ1Y3RvcjtyZXR1cm4gZT9lW3IoKV18fHQ6dH0sdW4udW5oYW5kbGVkUmVqZWN0aW9uPWZ1bmN0aW9uKG4sdCl7TCYmTC5lcnJvcihaLEE/dC5sb25nU3RhY2s6eChuLHQpKX0sdW4ucmVqZWN0aW9uSGFuZGxlZD1lbix1bi5lbmFibGVMb25nU3RhY2tUcmFjZT1mdW5jdGlvbigpe0E9ITB9LHVuLm5leHRUaWNrPUU/ZnVuY3Rpb24obil7c2V0VGltZW91dChuKX06SS5uZXh0VGljayx1bi5fcz0xO3ZhciBjbj1sKDk5OSxmdW5jdGlvbihuLHQpe3ZhciByLGU7cmV0dXJuIGU9bi5fcyE9PSQ/dC5fb25GdWxmaWxsZWQ6dC5fb25SZWplY3RlZCxlPT09Uz92b2lkIGsodCxuLl9zLG4uX3YpOihyPWEoZykoZSxuLl92KSxyPT09cm4/dm9pZCBrKHQsJCxyLmUpOnZvaWQgVCh0LHIpKX0pLGZuPWwoOSxmdW5jdGlvbihuKXtqKG4pfHwobltNXT0xLGQodG4sbikpfSl9KCl9KS5jYWxsKHQsZnVuY3Rpb24oKXtyZXR1cm4gdGhpc30oKSl9fSk7fSlcbi5jYWxsKCdvYmplY3QnID09PSB0eXBlb2Ygd2luZG93ICYmIHdpbmRvdyB8fCAnb2JqZWN0JyA9PT0gdHlwZW9mIHNlbGYgJiYgc2VsZiB8fCAnb2JqZWN0JyA9PT0gdHlwZW9mIGdsb2JhbCAmJiBnbG9iYWwgfHwge30pO1xuXG5cbi8qKlxuICogTWFwVmFsdWVzICBcbiAqIENvcHlyaWdodChjKSAyMDE3LCBKb2huIE9zdGVybWFuXG4gKlxuICogTUlUIExpY2Vuc2VcbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIFxuICogYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIFxuICogd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIFxuICogZm9sbG93aW5nIGNvbmRpdGlvbnM6XG5cbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgXG4gKiBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gXG4gKiBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgXG4gKiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBcbiAqIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG4gKi9cbiBcbiAvKiBwb29yIG1hbidzIHBvbHlmaWxsIGZvciBNYXAudmFsdWVzKCkuIHNpbXBseSByZXR1cm5zIGFuIGFycmF5IG9mIHRoZSB2YWx1ZXMuIENhbm5vdCBndWFyYW50ZWUgaXQgcHJlc2VydmVzXG4gICogaW5zZXJ0aW9uIG9yZGVyIG9yIHRoYXQgaXQgd2lsbCBoYW5kbGUgYWxsIHByb3BlcnR5IG9yIHZhbHVlIHR5cGVzLiBhbG1vc3QgY2VydGFpbmx5IG5vdCBlcXVpdmFsZW50IHRvIG5hdGl2ZVxuICAqIHByb3RvdHlwZSBcbiAgKi9cblxuZXhwb3J0IGNvbnN0IE1hcFZhbHVlcyA9IChmdW5jdGlvbigpe1xuICBNYXAucHJvdG90eXBlLnZhbHVlcyA9IE1hcC5wcm90b3R5cGUudmFsdWVzIHx8IGZ1bmN0aW9uKCl7XG4gICAgdmFyIGFycmF5ID0gW107XG4gICAgdGhpcy5mb3JFYWNoKGZ1bmN0aW9uKGVhY2gpe1xuICAgICAgYXJyYXkucHVzaChlYWNoKTtcbiAgICB9KTtcbiAgICByZXR1cm4gYXJyYXk7XG4gIH07XG59KSgpO1xuXG4vKipcbiAqIFNWRyBmb2N1cyBcbiAqIENvcHlyaWdodChjKSAyMDE3LCBKb2huIE9zdGVybWFuXG4gKlxuICogTUlUIExpY2Vuc2VcbiAqXG4gKiBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYSBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIFxuICogYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGUgXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nIFxuICogd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLCBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBcbiAqIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlIFxuICogZm9sbG93aW5nIGNvbmRpdGlvbnM6XG5cbiAqIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1MgT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgXG4gKiBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU4gTk8gXG4gKiBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgXG4gKiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1IgT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBcbiAqIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG4gKi9cblxuIC8vIElFL0VkZ2UgKHBlcmhhcHMgb3RoZXJzKSBkb2VzIG5vdCBhbGxvdyBwcm9ncmFtbWF0aWMgZm9jdXNpbmcgb2YgU1ZHIEVsZW1lbnRzICh2aWEgYGZvY3VzKClgKS4gU2FtZSBmb3IgYGJsdXIoKWAuXG5cbiBleHBvcnQgY29uc3QgU1ZHRm9jdXMgPSAoZnVuY3Rpb24oKXtcbiAgICBpZiAoICdmb2N1cycgaW4gU1ZHRWxlbWVudC5wcm90b3R5cGUgPT09IGZhbHNlICkge1xuICAgICAgU1ZHRWxlbWVudC5wcm90b3R5cGUuZm9jdXMgPSBIVE1MRWxlbWVudC5wcm90b3R5cGUuZm9jdXM7XG4gICAgfVxuICAgIGlmICggJ2JsdXInIGluIFNWR0VsZW1lbnQucHJvdG90eXBlID09PSBmYWxzZSApIHtcbiAgICAgIFNWR0VsZW1lbnQucHJvdG90eXBlLmJsdXIgPSBIVE1MRWxlbWVudC5wcm90b3R5cGUuYmx1cjtcbiAgICB9XG4gfSkoKTtcblxuXG5cblxuLyoqXG4gKiBpbm5lckhUTUwgcHJvcGVydHkgZm9yIFNWR0VsZW1lbnRcbiAqIENvcHlyaWdodChjKSAyMDEwLCBKZWZmIFNjaGlsbGVyXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDJcbiAqXG4gKiBXb3JrcyBpbiBhIFNWRyBkb2N1bWVudCBpbiBDaHJvbWUgNissIFNhZmFyaSA1KywgRmlyZWZveCA0KyBhbmQgSUU5Ky5cbiAqIFdvcmtzIGluIGEgSFRNTDUgZG9jdW1lbnQgaW4gQ2hyb21lIDcrLCBGaXJlZm94IDQrIGFuZCBJRTkrLlxuICogRG9lcyBub3Qgd29yayBpbiBPcGVyYSBzaW5jZSBpdCBkb2Vzbid0IHN1cHBvcnQgdGhlIFNWR0VsZW1lbnQgaW50ZXJmYWNlIHlldC5cbiAqXG4gKiBJIGhhdmVuJ3QgZGVjaWRlZCBvbiB0aGUgYmVzdCBuYW1lIGZvciB0aGlzIHByb3BlcnR5IC0gdGh1cyB0aGUgZHVwbGljYXRpb24uXG4gKi9cbi8vIGVkaXRlZCBieSBKb2huIE9zdGVybWFuIHRvIGRlY2xhcmUgdGhlIHZhcmlhYmxlIGBzWE1MYCwgd2hpY2ggd2FzIHJlZmVyZW5jZWQgd2l0aG91dCBiZWluZyBkZWNsYXJlZFxuLy8gd2hpY2ggZmFpbGVkIHNpbGVudGx5IGluIGltcGxpY2l0IHN0cmljdCBtb2RlIG9mIGFuIGV4cG9ydFxuXG4vLyBtb3N0IGJyb3dzZXJzIGFsbG93IHNldHRpbmcgaW5uZXJIVE1MIG9mIHN2ZyBlbGVtZW50cyBidXQgSUUgZG9lcyBub3QgKG5vdCBhbiBIVE1MIGVsZW1lbnQpXG4vLyB0aGlzIHBvbHlmaWxsIHByb3ZpZGVzIHRoYXQuIG5lY2Vzc2FyeSBmb3IgZDMgbWV0aG9kIGAuaHRtbCgpYCBvbiBzdmcgZWxlbWVudHNcblxuZXhwb3J0IGNvbnN0IFNWR0lubmVySFRNTCA9IChmdW5jdGlvbigpIHtcbiAgdmFyIHNlcmlhbGl6ZVhNTCA9IGZ1bmN0aW9uKG5vZGUsIG91dHB1dCkge1xuICAgIHZhciBub2RlVHlwZSA9IG5vZGUubm9kZVR5cGU7XG4gICAgaWYgKG5vZGVUeXBlID09IDMpIHsgLy8gVEVYVCBub2Rlcy5cbiAgICAgIC8vIFJlcGxhY2Ugc3BlY2lhbCBYTUwgY2hhcmFjdGVycyB3aXRoIHRoZWlyIGVudGl0aWVzLlxuICAgICAgb3V0cHV0LnB1c2gobm9kZS50ZXh0Q29udGVudC5yZXBsYWNlKC8mLywgJyZhbXA7JykucmVwbGFjZSgvPC8sICcmbHQ7JykucmVwbGFjZSgnPicsICcmZ3Q7JykpO1xuICAgIH0gZWxzZSBpZiAobm9kZVR5cGUgPT0gMSkgeyAvLyBFTEVNRU5UIG5vZGVzLlxuICAgICAgLy8gU2VyaWFsaXplIEVsZW1lbnQgbm9kZXMuXG4gICAgICBvdXRwdXQucHVzaCgnPCcsIG5vZGUudGFnTmFtZSk7XG4gICAgICBpZiAobm9kZS5oYXNBdHRyaWJ1dGVzKCkpIHtcbiAgICAgICAgdmFyIGF0dHJNYXAgPSBub2RlLmF0dHJpYnV0ZXM7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBhdHRyTWFwLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgICAgdmFyIGF0dHJOb2RlID0gYXR0ck1hcC5pdGVtKGkpO1xuICAgICAgICAgIG91dHB1dC5wdXNoKCcgJywgYXR0ck5vZGUubmFtZSwgJz1cXCcnLCBhdHRyTm9kZS52YWx1ZSwgJ1xcJycpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBpZiAobm9kZS5oYXNDaGlsZE5vZGVzKCkpIHtcbiAgICAgICAgb3V0cHV0LnB1c2goJz4nKTtcbiAgICAgICAgdmFyIGNoaWxkTm9kZXMgPSBub2RlLmNoaWxkTm9kZXM7XG4gICAgICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBjaGlsZE5vZGVzLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICAgICAgc2VyaWFsaXplWE1MKGNoaWxkTm9kZXMuaXRlbShpKSwgb3V0cHV0KTtcbiAgICAgICAgfVxuICAgICAgICBvdXRwdXQucHVzaCgnPC8nLCBub2RlLnRhZ05hbWUsICc+Jyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvdXRwdXQucHVzaCgnLz4nKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKG5vZGVUeXBlID09IDgpIHtcbiAgICAgIC8vIFRPRE8oY29kZWRyZWFkKTogUmVwbGFjZSBzcGVjaWFsIGNoYXJhY3RlcnMgd2l0aCBYTUwgZW50aXRpZXM/XG4gICAgICBvdXRwdXQucHVzaCgnPCEtLScsIG5vZGUubm9kZVZhbHVlLCAnLS0+Jyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFRPRE86IEhhbmRsZSBDREFUQSBub2Rlcy5cbiAgICAgIC8vIFRPRE86IEhhbmRsZSBFTlRJVFkgbm9kZXMuXG4gICAgICAvLyBUT0RPOiBIYW5kbGUgRE9DVU1FTlQgbm9kZXMuXG4gICAgICB0aHJvdyAnRXJyb3Igc2VyaWFsaXppbmcgWE1MLiBVbmhhbmRsZWQgbm9kZSBvZiB0eXBlOiAnICsgbm9kZVR5cGU7XG4gICAgfVxuICB9XG4gIC8vIFRoZSBpbm5lckhUTUwgRE9NIHByb3BlcnR5IGZvciBTVkdFbGVtZW50LlxuICBpZiAoICdpbm5lckhUTUwnIGluIFNWR0VsZW1lbnQucHJvdG90eXBlID09PSBmYWxzZSApe1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShTVkdFbGVtZW50LnByb3RvdHlwZSwgJ2lubmVySFRNTCcsIHtcbiAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBvdXRwdXQgPSBbXTtcbiAgICAgICAgdmFyIGNoaWxkTm9kZSA9IHRoaXMuZmlyc3RDaGlsZDtcbiAgICAgICAgd2hpbGUgKGNoaWxkTm9kZSkge1xuICAgICAgICAgIHNlcmlhbGl6ZVhNTChjaGlsZE5vZGUsIG91dHB1dCk7XG4gICAgICAgICAgY2hpbGROb2RlID0gY2hpbGROb2RlLm5leHRTaWJsaW5nO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiBvdXRwdXQuam9pbignJyk7XG4gICAgICB9LFxuICAgICAgc2V0OiBmdW5jdGlvbihtYXJrdXBUZXh0KSB7XG4gICAgICAgIGNvbnNvbGUubG9nKHRoaXMpO1xuICAgICAgICAvLyBXaXBlIG91dCB0aGUgY3VycmVudCBjb250ZW50cyBvZiB0aGUgZWxlbWVudC5cbiAgICAgICAgd2hpbGUgKHRoaXMuZmlyc3RDaGlsZCkge1xuICAgICAgICAgIHRoaXMucmVtb3ZlQ2hpbGQodGhpcy5maXJzdENoaWxkKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgLy8gUGFyc2UgdGhlIG1hcmt1cCBpbnRvIHZhbGlkIG5vZGVzLlxuICAgICAgICAgIHZhciBkWE1MID0gbmV3IERPTVBhcnNlcigpO1xuICAgICAgICAgIGRYTUwuYXN5bmMgPSBmYWxzZTtcbiAgICAgICAgICAvLyBXcmFwIHRoZSBtYXJrdXAgaW50byBhIFNWRyBub2RlIHRvIGVuc3VyZSBwYXJzaW5nIHdvcmtzLlxuICAgICAgICAgIGNvbnNvbGUubG9nKG1hcmt1cFRleHQpO1xuICAgICAgICAgIHZhciBzWE1MID0gJzxzdmcgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiPicgKyBtYXJrdXBUZXh0ICsgJzwvc3ZnPic7XG4gICAgICAgICAgY29uc29sZS5sb2coc1hNTCk7XG4gICAgICAgICAgdmFyIHN2Z0RvY0VsZW1lbnQgPSBkWE1MLnBhcnNlRnJvbVN0cmluZyhzWE1MLCAndGV4dC94bWwnKS5kb2N1bWVudEVsZW1lbnQ7XG5cbiAgICAgICAgICAvLyBOb3cgdGFrZSBlYWNoIG5vZGUsIGltcG9ydCBpdCBhbmQgYXBwZW5kIHRvIHRoaXMgZWxlbWVudC5cbiAgICAgICAgICB2YXIgY2hpbGROb2RlID0gc3ZnRG9jRWxlbWVudC5maXJzdENoaWxkO1xuICAgICAgICAgIHdoaWxlKGNoaWxkTm9kZSkge1xuICAgICAgICAgICAgdGhpcy5hcHBlbmRDaGlsZCh0aGlzLm93bmVyRG9jdW1lbnQuaW1wb3J0Tm9kZShjaGlsZE5vZGUsIHRydWUpKTtcbiAgICAgICAgICAgIGNoaWxkTm9kZSA9IGNoaWxkTm9kZS5uZXh0U2libGluZztcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2goZSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcignRXJyb3IgcGFyc2luZyBYTUwgc3RyaW5nJyk7XG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICAvLyBUaGUgaW5uZXJTVkcgRE9NIHByb3BlcnR5IGZvciBTVkdFbGVtZW50LlxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShTVkdFbGVtZW50LnByb3RvdHlwZSwgJ2lubmVyU1ZHJywge1xuICAgICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuaW5uZXJIVE1MO1xuICAgICAgfSxcbiAgICAgIHNldDogZnVuY3Rpb24obWFya3VwVGV4dCkge1xuICAgICAgICB0aGlzLmlubmVySFRNTCA9IG1hcmt1cFRleHQ7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn0pKCk7XG5cblxuLy8gaHR0cHM6Ly90YzM5LmdpdGh1Yi5pby9lY21hMjYyLyNzZWMtYXJyYXkucHJvdG90eXBlLmZpbmRcbmV4cG9ydCBjb25zdCBhcnJheUZpbmQgPSAoZnVuY3Rpb24oKXtcbiAgaWYgKCFBcnJheS5wcm90b3R5cGUuZmluZCkge1xuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShBcnJheS5wcm90b3R5cGUsICdmaW5kJywge1xuICAgICAgdmFsdWU6IGZ1bmN0aW9uKHByZWRpY2F0ZSkge1xuICAgICAgIC8vIDEuIExldCBPIGJlID8gVG9PYmplY3QodGhpcyB2YWx1ZSkuXG4gICAgICAgIGlmICh0aGlzID09IG51bGwpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdcInRoaXNcIiBpcyBudWxsIG9yIG5vdCBkZWZpbmVkJyk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbyA9IE9iamVjdCh0aGlzKTtcblxuICAgICAgICAvLyAyLiBMZXQgbGVuIGJlID8gVG9MZW5ndGgoPyBHZXQoTywgXCJsZW5ndGhcIikpLlxuICAgICAgICB2YXIgbGVuID0gby5sZW5ndGggPj4+IDA7XG5cbiAgICAgICAgLy8gMy4gSWYgSXNDYWxsYWJsZShwcmVkaWNhdGUpIGlzIGZhbHNlLCB0aHJvdyBhIFR5cGVFcnJvciBleGNlcHRpb24uXG4gICAgICAgIGlmICh0eXBlb2YgcHJlZGljYXRlICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcigncHJlZGljYXRlIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuICAgICAgICB9XG5cbiAgICAgICAgLy8gNC4gSWYgdGhpc0FyZyB3YXMgc3VwcGxpZWQsIGxldCBUIGJlIHRoaXNBcmc7IGVsc2UgbGV0IFQgYmUgdW5kZWZpbmVkLlxuICAgICAgICB2YXIgdGhpc0FyZyA9IGFyZ3VtZW50c1sxXTtcblxuICAgICAgICAvLyA1LiBMZXQgayBiZSAwLlxuICAgICAgICB2YXIgayA9IDA7XG5cbiAgICAgICAgLy8gNi4gUmVwZWF0LCB3aGlsZSBrIDwgbGVuXG4gICAgICAgIHdoaWxlIChrIDwgbGVuKSB7XG4gICAgICAgICAgLy8gYS4gTGV0IFBrIGJlICEgVG9TdHJpbmcoaykuXG4gICAgICAgICAgLy8gYi4gTGV0IGtWYWx1ZSBiZSA/IEdldChPLCBQaykuXG4gICAgICAgICAgLy8gYy4gTGV0IHRlc3RSZXN1bHQgYmUgVG9Cb29sZWFuKD8gQ2FsbChwcmVkaWNhdGUsIFQsIMKrIGtWYWx1ZSwgaywgTyDCuykpLlxuICAgICAgICAgIC8vIGQuIElmIHRlc3RSZXN1bHQgaXMgdHJ1ZSwgcmV0dXJuIGtWYWx1ZS5cbiAgICAgICAgICB2YXIga1ZhbHVlID0gb1trXTtcbiAgICAgICAgICBpZiAocHJlZGljYXRlLmNhbGwodGhpc0FyZywga1ZhbHVlLCBrLCBvKSkge1xuICAgICAgICAgICAgcmV0dXJuIGtWYWx1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgLy8gZS4gSW5jcmVhc2UgayBieSAxLlxuICAgICAgICAgIGsrKztcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIDcuIFJldHVybiB1bmRlZmluZWQuXG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbn0pKCk7IFxuXG4vLyBDb3B5cmlnaHQgKEMpIDIwMTEtMjAxMiBTb2Z0d2FyZSBMYW5ndWFnZXMgTGFiLCBWcmlqZSBVbml2ZXJzaXRlaXQgQnJ1c3NlbFxuLy8gVGhpcyBjb2RlIGlzIGR1YWwtbGljZW5zZWQgdW5kZXIgYm90aCB0aGUgQXBhY2hlIExpY2Vuc2UgYW5kIHRoZSBNUExcblxuLy8gTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbi8vIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbi8vIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuLy9cbi8vIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuLy9cbi8vIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbi8vIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbi8vIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuLy8gU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuLy8gbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG5cbi8qIFZlcnNpb246IE1QTCAxLjFcbiAqXG4gKiBUaGUgY29udGVudHMgb2YgdGhpcyBmaWxlIGFyZSBzdWJqZWN0IHRvIHRoZSBNb3ppbGxhIFB1YmxpYyBMaWNlbnNlIFZlcnNpb25cbiAqIDEuMSAodGhlIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoXG4gKiB0aGUgTGljZW5zZS4gWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XG4gKiBodHRwOi8vd3d3Lm1vemlsbGEub3JnL01QTC9cbiAqXG4gKiBTb2Z0d2FyZSBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgYmFzaXMsXG4gKiBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLiBTZWUgdGhlIExpY2Vuc2VcbiAqIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHJpZ2h0cyBhbmQgbGltaXRhdGlvbnMgdW5kZXIgdGhlXG4gKiBMaWNlbnNlLlxuICpcbiAqIFRoZSBPcmlnaW5hbCBDb2RlIGlzIGEgc2hpbSBmb3IgdGhlIEVTLUhhcm1vbnkgcmVmbGVjdGlvbiBtb2R1bGVcbiAqXG4gKiBUaGUgSW5pdGlhbCBEZXZlbG9wZXIgb2YgdGhlIE9yaWdpbmFsIENvZGUgaXNcbiAqIFRvbSBWYW4gQ3V0c2VtLCBWcmlqZSBVbml2ZXJzaXRlaXQgQnJ1c3NlbC5cbiAqIFBvcnRpb25zIGNyZWF0ZWQgYnkgdGhlIEluaXRpYWwgRGV2ZWxvcGVyIGFyZSBDb3B5cmlnaHQgKEMpIDIwMTEtMjAxMlxuICogdGhlIEluaXRpYWwgRGV2ZWxvcGVyLiBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIENvbnRyaWJ1dG9yKHMpOlxuICpcbiAqL1xuXG4gLy8gLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuXG4gLy8gVGhpcyBmaWxlIGlzIGEgcG9seWZpbGwgZm9yIHRoZSB1cGNvbWluZyBFQ01BU2NyaXB0IFJlZmxlY3QgQVBJLFxuIC8vIGluY2x1ZGluZyBzdXBwb3J0IGZvciBQcm94aWVzLiBTZWUgdGhlIGRyYWZ0IHNwZWNpZmljYXRpb24gYXQ6XG4gLy8gaHR0cDovL3dpa2kuZWNtYXNjcmlwdC5vcmcvZG9rdS5waHA/aWQ9aGFybW9ueTpyZWZsZWN0X2FwaVxuIC8vIGh0dHA6Ly93aWtpLmVjbWFzY3JpcHQub3JnL2Rva3UucGhwP2lkPWhhcm1vbnk6ZGlyZWN0X3Byb3hpZXNcblxuIC8vIEZvciBhbiBpbXBsZW1lbnRhdGlvbiBvZiB0aGUgSGFuZGxlciBBUEksIHNlZSBoYW5kbGVycy5qcywgd2hpY2ggaW1wbGVtZW50czpcbiAvLyBodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1oYXJtb255OnZpcnR1YWxfb2JqZWN0X2FwaVxuXG4gLy8gVGhpcyBpbXBsZW1lbnRhdGlvbiBzdXBlcnNlZGVzIHRoZSBlYXJsaWVyIHBvbHlmaWxsIGF0OlxuIC8vIGNvZGUuZ29vZ2xlLmNvbS9wL2VzLWxhYi9zb3VyY2UvYnJvd3NlL3RydW5rL3NyYy9wcm94aWVzL0RpcmVjdFByb3hpZXMuanNcblxuIC8vIFRoaXMgY29kZSB3YXMgdGVzdGVkIG9uIHRyYWNlbW9ua2V5IC8gRmlyZWZveCAxMlxuLy8gIChhbmQgc2hvdWxkIHJ1biBmaW5lIG9uIG9sZGVyIEZpcmVmb3ggdmVyc2lvbnMgc3RhcnRpbmcgd2l0aCBGRjQpXG4gLy8gVGhlIGNvZGUgYWxzbyB3b3JrcyBjb3JyZWN0bHkgb25cbiAvLyAgIHY4IC0taGFybW9ueV9wcm94aWVzIC0taGFybW9ueV93ZWFrbWFwcyAodjMuNi41LjEpXG5cbiAvLyBMYW5ndWFnZSBEZXBlbmRlbmNpZXM6XG4gLy8gIC0gRUNNQVNjcmlwdCA1L3N0cmljdFxuIC8vICAtIFwib2xkXCIgKGkuZS4gbm9uLWRpcmVjdCkgSGFybW9ueSBQcm94aWVzXG4gLy8gIC0gSGFybW9ueSBXZWFrTWFwc1xuIC8vIFBhdGNoZXM6XG4gLy8gIC0gT2JqZWN0LntmcmVlemUsc2VhbCxwcmV2ZW50RXh0ZW5zaW9uc31cbiAvLyAgLSBPYmplY3Que2lzRnJvemVuLGlzU2VhbGVkLGlzRXh0ZW5zaWJsZX1cbiAvLyAgLSBPYmplY3QuZ2V0UHJvdG90eXBlT2ZcbiAvLyAgLSBPYmplY3Qua2V5c1xuIC8vICAtIE9iamVjdC5wcm90b3R5cGUudmFsdWVPZlxuIC8vICAtIE9iamVjdC5wcm90b3R5cGUuaXNQcm90b3R5cGVPZlxuIC8vICAtIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmdcbiAvLyAgLSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5XG4gLy8gIC0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvclxuIC8vICAtIE9iamVjdC5kZWZpbmVQcm9wZXJ0eVxuIC8vICAtIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzXG4gLy8gIC0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXNcbiAvLyAgLSBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzXG4gLy8gIC0gT2JqZWN0LmdldFByb3RvdHlwZU9mXG4gLy8gIC0gT2JqZWN0LnNldFByb3RvdHlwZU9mXG4gLy8gIC0gT2JqZWN0LmFzc2lnblxuIC8vICAtIEZ1bmN0aW9uLnByb3RvdHlwZS50b1N0cmluZ1xuIC8vICAtIERhdGUucHJvdG90eXBlLnRvU3RyaW5nXG4gLy8gIC0gQXJyYXkuaXNBcnJheVxuIC8vICAtIEFycmF5LnByb3RvdHlwZS5jb25jYXRcbiAvLyAgLSBQcm94eVxuIC8vIEFkZHMgbmV3IGdsb2JhbHM6XG4gLy8gIC0gUmVmbGVjdFxuXG4gLy8gRGlyZWN0IHByb3hpZXMgY2FuIGJlIGNyZWF0ZWQgdmlhIFByb3h5KHRhcmdldCwgaGFuZGxlcilcblxuIC8vIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cblxuZXhwb3J0IGNvbnN0IHJlZmxlY3QgPSAoZnVuY3Rpb24oZ2xvYmFsKXsgLy8gZnVuY3Rpb24tYXMtbW9kdWxlIHBhdHRlcm5cblwidXNlIHN0cmljdFwiO1xuIFxuLy8gPT09IERpcmVjdCBQcm94aWVzOiBJbnZhcmlhbnQgRW5mb3JjZW1lbnQgPT09XG5cbi8vIERpcmVjdCBwcm94aWVzIGJ1aWxkIG9uIG5vbi1kaXJlY3QgcHJveGllcyBieSBhdXRvbWF0aWNhbGx5IHdyYXBwaW5nXG4vLyBhbGwgdXNlci1kZWZpbmVkIHByb3h5IGhhbmRsZXJzIGluIGEgVmFsaWRhdG9yIGhhbmRsZXIgdGhhdCBjaGVja3MgYW5kXG4vLyBlbmZvcmNlcyBFUzUgaW52YXJpYW50cy5cblxuLy8gQSBkaXJlY3QgcHJveHkgaXMgYSBwcm94eSBmb3IgYW4gZXhpc3Rpbmcgb2JqZWN0IGNhbGxlZCB0aGUgdGFyZ2V0IG9iamVjdC5cblxuLy8gQSBWYWxpZGF0b3IgaGFuZGxlciBpcyBhIHdyYXBwZXIgZm9yIGEgdGFyZ2V0IHByb3h5IGhhbmRsZXIgSC5cbi8vIFRoZSBWYWxpZGF0b3IgZm9yd2FyZHMgYWxsIG9wZXJhdGlvbnMgdG8gSCwgYnV0IGFkZGl0aW9uYWxseVxuLy8gcGVyZm9ybXMgYSBudW1iZXIgb2YgaW50ZWdyaXR5IGNoZWNrcyBvbiB0aGUgcmVzdWx0cyBvZiBzb21lIHRyYXBzLFxuLy8gdG8gbWFrZSBzdXJlIEggZG9lcyBub3QgdmlvbGF0ZSB0aGUgRVM1IGludmFyaWFudHMgdy5yLnQuIG5vbi1jb25maWd1cmFibGVcbi8vIHByb3BlcnRpZXMgYW5kIG5vbi1leHRlbnNpYmxlLCBzZWFsZWQgb3IgZnJvemVuIG9iamVjdHMuXG5cbi8vIEZvciBlYWNoIHByb3BlcnR5IHRoYXQgSCBleHBvc2VzIGFzIG93biwgbm9uLWNvbmZpZ3VyYWJsZVxuLy8gKGUuZy4gYnkgcmV0dXJuaW5nIGEgZGVzY3JpcHRvciBmcm9tIGEgY2FsbCB0byBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IpXG4vLyB0aGUgVmFsaWRhdG9yIGhhbmRsZXIgZGVmaW5lcyB0aG9zZSBwcm9wZXJ0aWVzIG9uIHRoZSB0YXJnZXQgb2JqZWN0LlxuLy8gV2hlbiB0aGUgcHJveHkgYmVjb21lcyBub24tZXh0ZW5zaWJsZSwgYWxzbyBjb25maWd1cmFibGUgb3duIHByb3BlcnRpZXNcbi8vIGFyZSBjaGVja2VkIGFnYWluc3QgdGhlIHRhcmdldC5cbi8vIFdlIHdpbGwgY2FsbCBwcm9wZXJ0aWVzIHRoYXQgYXJlIGRlZmluZWQgb24gdGhlIHRhcmdldCBvYmplY3Rcbi8vIFwiZml4ZWQgcHJvcGVydGllc1wiLlxuXG4vLyBXZSB3aWxsIG5hbWUgZml4ZWQgbm9uLWNvbmZpZ3VyYWJsZSBwcm9wZXJ0aWVzIFwic2VhbGVkIHByb3BlcnRpZXNcIi5cbi8vIFdlIHdpbGwgbmFtZSBmaXhlZCBub24tY29uZmlndXJhYmxlIG5vbi13cml0YWJsZSBwcm9wZXJ0aWVzIFwiZnJvemVuXG4vLyBwcm9wZXJ0aWVzXCIuXG5cbi8vIFRoZSBWYWxpZGF0b3IgaGFuZGxlciB1cGhvbGRzIHRoZSBmb2xsb3dpbmcgaW52YXJpYW50cyB3LnIudC4gbm9uLWNvbmZpZ3VyYWJpbGl0eTpcbi8vIC0gZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yIGNhbm5vdCByZXBvcnQgc2VhbGVkIHByb3BlcnRpZXMgYXMgbm9uLWV4aXN0ZW50XG4vLyAtIGdldE93blByb3BlcnR5RGVzY3JpcHRvciBjYW5ub3QgcmVwb3J0IGluY29tcGF0aWJsZSBjaGFuZ2VzIHRvIHRoZVxuLy8gICBhdHRyaWJ1dGVzIG9mIGEgc2VhbGVkIHByb3BlcnR5IChlLmcuIHJlcG9ydGluZyBhIG5vbi1jb25maWd1cmFibGVcbi8vICAgcHJvcGVydHkgYXMgY29uZmlndXJhYmxlLCBvciByZXBvcnRpbmcgYSBub24tY29uZmlndXJhYmxlLCBub24td3JpdGFibGVcbi8vICAgcHJvcGVydHkgYXMgd3JpdGFibGUpXG4vLyAtIGdldFByb3BlcnR5RGVzY3JpcHRvciBjYW5ub3QgcmVwb3J0IHNlYWxlZCBwcm9wZXJ0aWVzIGFzIG5vbi1leGlzdGVudFxuLy8gLSBnZXRQcm9wZXJ0eURlc2NyaXB0b3IgY2Fubm90IHJlcG9ydCBpbmNvbXBhdGlibGUgY2hhbmdlcyB0byB0aGVcbi8vICAgYXR0cmlidXRlcyBvZiBhIHNlYWxlZCBwcm9wZXJ0eS4gSXQgX2Nhbl8gcmVwb3J0IGluY29tcGF0aWJsZSBjaGFuZ2VzXG4vLyAgIHRvIHRoZSBhdHRyaWJ1dGVzIG9mIG5vbi1vd24sIGluaGVyaXRlZCBwcm9wZXJ0aWVzLlxuLy8gLSBkZWZpbmVQcm9wZXJ0eSBjYW5ub3QgbWFrZSBpbmNvbXBhdGlibGUgY2hhbmdlcyB0byB0aGUgYXR0cmlidXRlcyBvZlxuLy8gICBzZWFsZWQgcHJvcGVydGllc1xuLy8gLSBkZWxldGVQcm9wZXJ0eSBjYW5ub3QgcmVwb3J0IGEgc3VjY2Vzc2Z1bCBkZWxldGlvbiBvZiBhIHNlYWxlZCBwcm9wZXJ0eVxuLy8gLSBoYXNPd24gY2Fubm90IHJlcG9ydCBhIHNlYWxlZCBwcm9wZXJ0eSBhcyBub24tZXhpc3RlbnRcbi8vIC0gaGFzIGNhbm5vdCByZXBvcnQgYSBzZWFsZWQgcHJvcGVydHkgYXMgbm9uLWV4aXN0ZW50XG4vLyAtIGdldCBjYW5ub3QgcmVwb3J0IGluY29uc2lzdGVudCB2YWx1ZXMgZm9yIGZyb3plbiBkYXRhXG4vLyAgIHByb3BlcnRpZXMsIGFuZCBtdXN0IHJlcG9ydCB1bmRlZmluZWQgZm9yIHNlYWxlZCBhY2Nlc3NvcnMgd2l0aCBhblxuLy8gICB1bmRlZmluZWQgZ2V0dGVyXG4vLyAtIHNldCBjYW5ub3QgcmVwb3J0IGEgc3VjY2Vzc2Z1bCBhc3NpZ25tZW50IGZvciBmcm96ZW4gZGF0YVxuLy8gICBwcm9wZXJ0aWVzIG9yIHNlYWxlZCBhY2Nlc3NvcnMgd2l0aCBhbiB1bmRlZmluZWQgc2V0dGVyLlxuLy8gLSBnZXR7T3dufVByb3BlcnR5TmFtZXMgbGlzdHMgYWxsIHNlYWxlZCBwcm9wZXJ0aWVzIG9mIHRoZSB0YXJnZXQuXG4vLyAtIGtleXMgbGlzdHMgYWxsIGVudW1lcmFibGUgc2VhbGVkIHByb3BlcnRpZXMgb2YgdGhlIHRhcmdldC5cbi8vIC0gZW51bWVyYXRlIGxpc3RzIGFsbCBlbnVtZXJhYmxlIHNlYWxlZCBwcm9wZXJ0aWVzIG9mIHRoZSB0YXJnZXQuXG4vLyAtIGlmIGEgcHJvcGVydHkgb2YgYSBub24tZXh0ZW5zaWJsZSBwcm94eSBpcyByZXBvcnRlZCBhcyBub24tZXhpc3RlbnQsXG4vLyAgIHRoZW4gaXQgbXVzdCBmb3JldmVyIGJlIHJlcG9ydGVkIGFzIG5vbi1leGlzdGVudC4gVGhpcyBhcHBsaWVzIHRvXG4vLyAgIG93biBhbmQgaW5oZXJpdGVkIHByb3BlcnRpZXMgYW5kIGlzIGVuZm9yY2VkIGluIHRoZVxuLy8gICBkZWxldGVQcm9wZXJ0eSwgZ2V0e093bn1Qcm9wZXJ0eURlc2NyaXB0b3IsIGhhc3tPd259LFxuLy8gICBnZXR7T3dufVByb3BlcnR5TmFtZXMsIGtleXMgYW5kIGVudW1lcmF0ZSB0cmFwc1xuXG4vLyBWaW9sYXRpb24gb2YgYW55IG9mIHRoZXNlIGludmFyaWFudHMgYnkgSCB3aWxsIHJlc3VsdCBpbiBUeXBlRXJyb3IgYmVpbmdcbi8vIHRocm93bi5cblxuLy8gQWRkaXRpb25hbGx5LCBvbmNlIE9iamVjdC5wcmV2ZW50RXh0ZW5zaW9ucywgT2JqZWN0LnNlYWwgb3IgT2JqZWN0LmZyZWV6ZVxuLy8gaXMgaW52b2tlZCBvbiB0aGUgcHJveHksIHRoZSBzZXQgb2Ygb3duIHByb3BlcnR5IG5hbWVzIGZvciB0aGUgcHJveHkgaXNcbi8vIGZpeGVkLiBBbnkgcHJvcGVydHkgbmFtZSB0aGF0IGlzIG5vdCBmaXhlZCBpcyBjYWxsZWQgYSAnbmV3JyBwcm9wZXJ0eS5cblxuLy8gVGhlIFZhbGlkYXRvciB1cGhvbGRzIHRoZSBmb2xsb3dpbmcgaW52YXJpYW50cyByZWdhcmRpbmcgZXh0ZW5zaWJpbGl0eTpcbi8vIC0gZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yIGNhbm5vdCByZXBvcnQgbmV3IHByb3BlcnRpZXMgYXMgZXhpc3RlbnRcbi8vICAgKGl0IG11c3QgcmVwb3J0IHRoZW0gYXMgbm9uLWV4aXN0ZW50IGJ5IHJldHVybmluZyB1bmRlZmluZWQpXG4vLyAtIGRlZmluZVByb3BlcnR5IGNhbm5vdCBzdWNjZXNzZnVsbHkgYWRkIGEgbmV3IHByb3BlcnR5IChpdCBtdXN0IHJlamVjdClcbi8vIC0gZ2V0T3duUHJvcGVydHlOYW1lcyBjYW5ub3QgbGlzdCBuZXcgcHJvcGVydGllc1xuLy8gLSBoYXNPd24gY2Fubm90IHJlcG9ydCB0cnVlIGZvciBuZXcgcHJvcGVydGllcyAoaXQgbXVzdCByZXBvcnQgZmFsc2UpXG4vLyAtIGtleXMgY2Fubm90IGxpc3QgbmV3IHByb3BlcnRpZXNcblxuLy8gSW52YXJpYW50cyBjdXJyZW50bHkgbm90IGVuZm9yY2VkOlxuLy8gLSBnZXRPd25Qcm9wZXJ0eU5hbWVzIGxpc3RzIG9ubHkgb3duIHByb3BlcnR5IG5hbWVzXG4vLyAtIGtleXMgbGlzdHMgb25seSBlbnVtZXJhYmxlIG93biBwcm9wZXJ0eSBuYW1lc1xuLy8gQm90aCB0cmFwcyBtYXkgbGlzdCBtb3JlIHByb3BlcnR5IG5hbWVzIHRoYW4gYXJlIGFjdHVhbGx5IGRlZmluZWQgb24gdGhlXG4vLyB0YXJnZXQuXG5cbi8vIEludmFyaWFudHMgd2l0aCByZWdhcmQgdG8gaW5oZXJpdGFuY2UgYXJlIGN1cnJlbnRseSBub3QgZW5mb3JjZWQuXG4vLyAtIGEgbm9uLWNvbmZpZ3VyYWJsZSBwb3RlbnRpYWxseSBpbmhlcml0ZWQgcHJvcGVydHkgb24gYSBwcm94eSB3aXRoXG4vLyAgIG5vbi1tdXRhYmxlIGFuY2VzdHJ5IGNhbm5vdCBiZSByZXBvcnRlZCBhcyBub24tZXhpc3RlbnRcbi8vIChBbiBvYmplY3Qgd2l0aCBub24tbXV0YWJsZSBhbmNlc3RyeSBpcyBhIG5vbi1leHRlbnNpYmxlIG9iamVjdCB3aG9zZVxuLy8gW1tQcm90b3R5cGVdXSBpcyBlaXRoZXIgbnVsbCBvciBhbiBvYmplY3Qgd2l0aCBub24tbXV0YWJsZSBhbmNlc3RyeS4pXG5cbi8vIENoYW5nZXMgaW4gSGFuZGxlciBBUEkgY29tcGFyZWQgdG8gcHJldmlvdXMgaGFybW9ueTpwcm94aWVzLCBzZWU6XG4vLyBodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1zdHJhd21hbjpkaXJlY3RfcHJveGllc1xuLy8gaHR0cDovL3dpa2kuZWNtYXNjcmlwdC5vcmcvZG9rdS5waHA/aWQ9aGFybW9ueTpkaXJlY3RfcHJveGllc1xuXG4vLyAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG5cbi8vIC0tLS0gV2Vha01hcCBwb2x5ZmlsbCAtLS0tXG5cbi8vIFRPRE86IGZpbmQgYSBwcm9wZXIgV2Vha01hcCBwb2x5ZmlsbFxuXG4vLyBkZWZpbmUgYW4gZW1wdHkgV2Vha01hcCBzbyB0aGF0IGF0IGxlYXN0IHRoZSBSZWZsZWN0IG1vZHVsZSBjb2RlXG4vLyB3aWxsIHdvcmsgaW4gdGhlIGFic2VuY2Ugb2YgV2Vha01hcHMuIFByb3h5IGVtdWxhdGlvbiBkZXBlbmRzIG9uXG4vLyBhY3R1YWwgV2Vha01hcHMsIHNvIHdpbGwgbm90IHdvcmsgd2l0aCB0aGlzIGxpdHRsZSBzaGltLlxuaWYgKHR5cGVvZiBXZWFrTWFwID09PSBcInVuZGVmaW5lZFwiKSB7XG4gIGdsb2JhbC5XZWFrTWFwID0gZnVuY3Rpb24oKXt9O1xuICBnbG9iYWwuV2Vha01hcC5wcm90b3R5cGUgPSB7XG4gICAgZ2V0OiBmdW5jdGlvbihrKSB7IHJldHVybiB1bmRlZmluZWQ7IH0sXG4gICAgc2V0OiBmdW5jdGlvbihrLHYpIHsgdGhyb3cgbmV3IEVycm9yKFwiV2Vha01hcCBub3Qgc3VwcG9ydGVkXCIpOyB9XG4gIH07XG59XG5cbi8vIC0tLS0gTm9ybWFsaXphdGlvbiBmdW5jdGlvbnMgZm9yIHByb3BlcnR5IGRlc2NyaXB0b3JzIC0tLS1cblxuZnVuY3Rpb24gaXNTdGFuZGFyZEF0dHJpYnV0ZShuYW1lKSB7XG4gIHJldHVybiAvXihnZXR8c2V0fHZhbHVlfHdyaXRhYmxlfGVudW1lcmFibGV8Y29uZmlndXJhYmxlKSQvLnRlc3QobmFtZSk7XG59XG5cbi8vIEFkYXB0ZWQgZnJvbSBFUzUgc2VjdGlvbiA4LjEwLjVcbmZ1bmN0aW9uIHRvUHJvcGVydHlEZXNjcmlwdG9yKG9iaikge1xuICBpZiAoT2JqZWN0KG9iaikgIT09IG9iaikge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJwcm9wZXJ0eSBkZXNjcmlwdG9yIHNob3VsZCBiZSBhbiBPYmplY3QsIGdpdmVuOiBcIitcbiAgICAgICAgICAgICAgICAgICAgICAgIG9iaik7XG4gIH1cbiAgdmFyIGRlc2MgPSB7fTtcbiAgaWYgKCdlbnVtZXJhYmxlJyBpbiBvYmopIHsgZGVzYy5lbnVtZXJhYmxlID0gISFvYmouZW51bWVyYWJsZTsgfVxuICBpZiAoJ2NvbmZpZ3VyYWJsZScgaW4gb2JqKSB7IGRlc2MuY29uZmlndXJhYmxlID0gISFvYmouY29uZmlndXJhYmxlOyB9XG4gIGlmICgndmFsdWUnIGluIG9iaikgeyBkZXNjLnZhbHVlID0gb2JqLnZhbHVlOyB9XG4gIGlmICgnd3JpdGFibGUnIGluIG9iaikgeyBkZXNjLndyaXRhYmxlID0gISFvYmoud3JpdGFibGU7IH1cbiAgaWYgKCdnZXQnIGluIG9iaikge1xuICAgIHZhciBnZXR0ZXIgPSBvYmouZ2V0O1xuICAgIGlmIChnZXR0ZXIgIT09IHVuZGVmaW5lZCAmJiB0eXBlb2YgZ2V0dGVyICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJwcm9wZXJ0eSBkZXNjcmlwdG9yICdnZXQnIGF0dHJpYnV0ZSBtdXN0IGJlIFwiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICBcImNhbGxhYmxlIG9yIHVuZGVmaW5lZCwgZ2l2ZW46IFwiK2dldHRlcik7XG4gICAgfVxuICAgIGRlc2MuZ2V0ID0gZ2V0dGVyO1xuICB9XG4gIGlmICgnc2V0JyBpbiBvYmopIHtcbiAgICB2YXIgc2V0dGVyID0gb2JqLnNldDtcbiAgICBpZiAoc2V0dGVyICE9PSB1bmRlZmluZWQgJiYgdHlwZW9mIHNldHRlciAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwicHJvcGVydHkgZGVzY3JpcHRvciAnc2V0JyBhdHRyaWJ1dGUgbXVzdCBiZSBcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgXCJjYWxsYWJsZSBvciB1bmRlZmluZWQsIGdpdmVuOiBcIitzZXR0ZXIpO1xuICAgIH1cbiAgICBkZXNjLnNldCA9IHNldHRlcjtcbiAgfVxuICBpZiAoJ2dldCcgaW4gZGVzYyB8fCAnc2V0JyBpbiBkZXNjKSB7XG4gICAgaWYgKCd2YWx1ZScgaW4gZGVzYyB8fCAnd3JpdGFibGUnIGluIGRlc2MpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJwcm9wZXJ0eSBkZXNjcmlwdG9yIGNhbm5vdCBiZSBib3RoIGEgZGF0YSBhbmQgYW4gXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgIFwiYWNjZXNzb3IgZGVzY3JpcHRvcjogXCIrb2JqKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlc2M7XG59XG5cbmZ1bmN0aW9uIGlzQWNjZXNzb3JEZXNjcmlwdG9yKGRlc2MpIHtcbiAgaWYgKGRlc2MgPT09IHVuZGVmaW5lZCkgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gKCdnZXQnIGluIGRlc2MgfHwgJ3NldCcgaW4gZGVzYyk7XG59XG5mdW5jdGlvbiBpc0RhdGFEZXNjcmlwdG9yKGRlc2MpIHtcbiAgaWYgKGRlc2MgPT09IHVuZGVmaW5lZCkgcmV0dXJuIGZhbHNlO1xuICByZXR1cm4gKCd2YWx1ZScgaW4gZGVzYyB8fCAnd3JpdGFibGUnIGluIGRlc2MpO1xufVxuZnVuY3Rpb24gaXNHZW5lcmljRGVzY3JpcHRvcihkZXNjKSB7XG4gIGlmIChkZXNjID09PSB1bmRlZmluZWQpIHJldHVybiBmYWxzZTtcbiAgcmV0dXJuICFpc0FjY2Vzc29yRGVzY3JpcHRvcihkZXNjKSAmJiAhaXNEYXRhRGVzY3JpcHRvcihkZXNjKTtcbn1cblxuZnVuY3Rpb24gdG9Db21wbGV0ZVByb3BlcnR5RGVzY3JpcHRvcihkZXNjKSB7XG4gIHZhciBpbnRlcm5hbERlc2MgPSB0b1Byb3BlcnR5RGVzY3JpcHRvcihkZXNjKTtcbiAgaWYgKGlzR2VuZXJpY0Rlc2NyaXB0b3IoaW50ZXJuYWxEZXNjKSB8fCBpc0RhdGFEZXNjcmlwdG9yKGludGVybmFsRGVzYykpIHtcbiAgICBpZiAoISgndmFsdWUnIGluIGludGVybmFsRGVzYykpIHsgaW50ZXJuYWxEZXNjLnZhbHVlID0gdW5kZWZpbmVkOyB9XG4gICAgaWYgKCEoJ3dyaXRhYmxlJyBpbiBpbnRlcm5hbERlc2MpKSB7IGludGVybmFsRGVzYy53cml0YWJsZSA9IGZhbHNlOyB9XG4gIH0gZWxzZSB7XG4gICAgaWYgKCEoJ2dldCcgaW4gaW50ZXJuYWxEZXNjKSkgeyBpbnRlcm5hbERlc2MuZ2V0ID0gdW5kZWZpbmVkOyB9XG4gICAgaWYgKCEoJ3NldCcgaW4gaW50ZXJuYWxEZXNjKSkgeyBpbnRlcm5hbERlc2Muc2V0ID0gdW5kZWZpbmVkOyB9XG4gIH1cbiAgaWYgKCEoJ2VudW1lcmFibGUnIGluIGludGVybmFsRGVzYykpIHsgaW50ZXJuYWxEZXNjLmVudW1lcmFibGUgPSBmYWxzZTsgfVxuICBpZiAoISgnY29uZmlndXJhYmxlJyBpbiBpbnRlcm5hbERlc2MpKSB7IGludGVybmFsRGVzYy5jb25maWd1cmFibGUgPSBmYWxzZTsgfVxuICByZXR1cm4gaW50ZXJuYWxEZXNjO1xufVxuXG5mdW5jdGlvbiBpc0VtcHR5RGVzY3JpcHRvcihkZXNjKSB7XG4gIHJldHVybiAhKCdnZXQnIGluIGRlc2MpICYmXG4gICAgICAgICAhKCdzZXQnIGluIGRlc2MpICYmXG4gICAgICAgICAhKCd2YWx1ZScgaW4gZGVzYykgJiZcbiAgICAgICAgICEoJ3dyaXRhYmxlJyBpbiBkZXNjKSAmJlxuICAgICAgICAgISgnZW51bWVyYWJsZScgaW4gZGVzYykgJiZcbiAgICAgICAgICEoJ2NvbmZpZ3VyYWJsZScgaW4gZGVzYyk7XG59XG5cbmZ1bmN0aW9uIGlzRXF1aXZhbGVudERlc2NyaXB0b3IoZGVzYzEsIGRlc2MyKSB7XG4gIHJldHVybiBzYW1lVmFsdWUoZGVzYzEuZ2V0LCBkZXNjMi5nZXQpICYmXG4gICAgICAgICBzYW1lVmFsdWUoZGVzYzEuc2V0LCBkZXNjMi5zZXQpICYmXG4gICAgICAgICBzYW1lVmFsdWUoZGVzYzEudmFsdWUsIGRlc2MyLnZhbHVlKSAmJlxuICAgICAgICAgc2FtZVZhbHVlKGRlc2MxLndyaXRhYmxlLCBkZXNjMi53cml0YWJsZSkgJiZcbiAgICAgICAgIHNhbWVWYWx1ZShkZXNjMS5lbnVtZXJhYmxlLCBkZXNjMi5lbnVtZXJhYmxlKSAmJlxuICAgICAgICAgc2FtZVZhbHVlKGRlc2MxLmNvbmZpZ3VyYWJsZSwgZGVzYzIuY29uZmlndXJhYmxlKTtcbn1cblxuLy8gY29waWVkIGZyb20gaHR0cDovL3dpa2kuZWNtYXNjcmlwdC5vcmcvZG9rdS5waHA/aWQ9aGFybW9ueTplZ2FsXG5mdW5jdGlvbiBzYW1lVmFsdWUoeCwgeSkge1xuICBpZiAoeCA9PT0geSkge1xuICAgIC8vIDAgPT09IC0wLCBidXQgdGhleSBhcmUgbm90IGlkZW50aWNhbFxuICAgIHJldHVybiB4ICE9PSAwIHx8IDEgLyB4ID09PSAxIC8geTtcbiAgfVxuXG4gIC8vIE5hTiAhPT0gTmFOLCBidXQgdGhleSBhcmUgaWRlbnRpY2FsLlxuICAvLyBOYU5zIGFyZSB0aGUgb25seSBub24tcmVmbGV4aXZlIHZhbHVlLCBpLmUuLCBpZiB4ICE9PSB4LFxuICAvLyB0aGVuIHggaXMgYSBOYU4uXG4gIC8vIGlzTmFOIGlzIGJyb2tlbjogaXQgY29udmVydHMgaXRzIGFyZ3VtZW50IHRvIG51bWJlciwgc29cbiAgLy8gaXNOYU4oXCJmb29cIikgPT4gdHJ1ZVxuICByZXR1cm4geCAhPT0geCAmJiB5ICE9PSB5O1xufVxuXG4vKipcbiAqIFJldHVybnMgYSBmcmVzaCBwcm9wZXJ0eSBkZXNjcmlwdG9yIHRoYXQgaXMgZ3VhcmFudGVlZFxuICogdG8gYmUgY29tcGxldGUgKGkuZS4gY29udGFpbiBhbGwgdGhlIHN0YW5kYXJkIGF0dHJpYnV0ZXMpLlxuICogQWRkaXRpb25hbGx5LCBhbnkgbm9uLXN0YW5kYXJkIGVudW1lcmFibGUgcHJvcGVydGllcyBvZlxuICogYXR0cmlidXRlcyBhcmUgY29waWVkIG92ZXIgdG8gdGhlIGZyZXNoIGRlc2NyaXB0b3IuXG4gKlxuICogSWYgYXR0cmlidXRlcyBpcyB1bmRlZmluZWQsIHJldHVybnMgdW5kZWZpbmVkLlxuICpcbiAqIFNlZSBhbHNvOiBodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1oYXJtb255OnByb3hpZXNfc2VtYW50aWNzXG4gKi9cbmZ1bmN0aW9uIG5vcm1hbGl6ZUFuZENvbXBsZXRlUHJvcGVydHlEZXNjcmlwdG9yKGF0dHJpYnV0ZXMpIHtcbiAgaWYgKGF0dHJpYnV0ZXMgPT09IHVuZGVmaW5lZCkgeyByZXR1cm4gdW5kZWZpbmVkOyB9XG4gIHZhciBkZXNjID0gdG9Db21wbGV0ZVByb3BlcnR5RGVzY3JpcHRvcihhdHRyaWJ1dGVzKTtcbiAgLy8gTm90ZTogbm8gbmVlZCB0byBjYWxsIEZyb21Qcm9wZXJ0eURlc2NyaXB0b3IoZGVzYyksIGFzIHdlIHJlcHJlc2VudFxuICAvLyBcImludGVybmFsXCIgcHJvcGVydHkgZGVzY3JpcHRvcnMgYXMgcHJvcGVyIE9iamVjdHMgZnJvbSB0aGUgc3RhcnRcbiAgZm9yICh2YXIgbmFtZSBpbiBhdHRyaWJ1dGVzKSB7XG4gICAgaWYgKCFpc1N0YW5kYXJkQXR0cmlidXRlKG5hbWUpKSB7XG4gICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZGVzYywgbmFtZSxcbiAgICAgICAgeyB2YWx1ZTogYXR0cmlidXRlc1tuYW1lXSxcbiAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlc2M7XG59XG5cbi8qKlxuICogUmV0dXJucyBhIGZyZXNoIHByb3BlcnR5IGRlc2NyaXB0b3Igd2hvc2Ugc3RhbmRhcmRcbiAqIGF0dHJpYnV0ZXMgYXJlIGd1YXJhbnRlZWQgdG8gYmUgZGF0YSBwcm9wZXJ0aWVzIG9mIHRoZSByaWdodCB0eXBlLlxuICogQWRkaXRpb25hbGx5LCBhbnkgbm9uLXN0YW5kYXJkIGVudW1lcmFibGUgcHJvcGVydGllcyBvZlxuICogYXR0cmlidXRlcyBhcmUgY29waWVkIG92ZXIgdG8gdGhlIGZyZXNoIGRlc2NyaXB0b3IuXG4gKlxuICogSWYgYXR0cmlidXRlcyBpcyB1bmRlZmluZWQsIHdpbGwgdGhyb3cgYSBUeXBlRXJyb3IuXG4gKlxuICogU2VlIGFsc286IGh0dHA6Ly93aWtpLmVjbWFzY3JpcHQub3JnL2Rva3UucGhwP2lkPWhhcm1vbnk6cHJveGllc19zZW1hbnRpY3NcbiAqL1xuZnVuY3Rpb24gbm9ybWFsaXplUHJvcGVydHlEZXNjcmlwdG9yKGF0dHJpYnV0ZXMpIHtcbiAgdmFyIGRlc2MgPSB0b1Byb3BlcnR5RGVzY3JpcHRvcihhdHRyaWJ1dGVzKTtcbiAgLy8gTm90ZTogbm8gbmVlZCB0byBjYWxsIEZyb21HZW5lcmljUHJvcGVydHlEZXNjcmlwdG9yKGRlc2MpLCBhcyB3ZSByZXByZXNlbnRcbiAgLy8gXCJpbnRlcm5hbFwiIHByb3BlcnR5IGRlc2NyaXB0b3JzIGFzIHByb3BlciBPYmplY3RzIGZyb20gdGhlIHN0YXJ0XG4gIGZvciAodmFyIG5hbWUgaW4gYXR0cmlidXRlcykge1xuICAgIGlmICghaXNTdGFuZGFyZEF0dHJpYnV0ZShuYW1lKSkge1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGRlc2MsIG5hbWUsXG4gICAgICAgIHsgdmFsdWU6IGF0dHJpYnV0ZXNbbmFtZV0sXG4gICAgICAgICAgd3JpdGFibGU6IHRydWUsXG4gICAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgICAgICBjb25maWd1cmFibGU6IHRydWUgfSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBkZXNjO1xufVxuXG4vLyBzdG9yZSBhIHJlZmVyZW5jZSB0byB0aGUgcmVhbCBFUzUgcHJpbWl0aXZlcyBiZWZvcmUgcGF0Y2hpbmcgdGhlbSBsYXRlclxudmFyIHByaW1fcHJldmVudEV4dGVuc2lvbnMgPSAgICAgICAgT2JqZWN0LnByZXZlbnRFeHRlbnNpb25zLFxuICAgIHByaW1fc2VhbCA9ICAgICAgICAgICAgICAgICAgICAgT2JqZWN0LnNlYWwsXG4gICAgcHJpbV9mcmVlemUgPSAgICAgICAgICAgICAgICAgICBPYmplY3QuZnJlZXplLFxuICAgIHByaW1faXNFeHRlbnNpYmxlID0gICAgICAgICAgICAgT2JqZWN0LmlzRXh0ZW5zaWJsZSxcbiAgICBwcmltX2lzU2VhbGVkID0gICAgICAgICAgICAgICAgIE9iamVjdC5pc1NlYWxlZCxcbiAgICBwcmltX2lzRnJvemVuID0gICAgICAgICAgICAgICAgIE9iamVjdC5pc0Zyb3plbixcbiAgICBwcmltX2dldFByb3RvdHlwZU9mID0gICAgICAgICAgIE9iamVjdC5nZXRQcm90b3R5cGVPZixcbiAgICBwcmltX2dldE93blByb3BlcnR5RGVzY3JpcHRvciA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IsXG4gICAgcHJpbV9kZWZpbmVQcm9wZXJ0eSA9ICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHksXG4gICAgcHJpbV9kZWZpbmVQcm9wZXJ0aWVzID0gICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyxcbiAgICBwcmltX2tleXMgPSAgICAgICAgICAgICAgICAgICAgIE9iamVjdC5rZXlzLFxuICAgIHByaW1fZ2V0T3duUHJvcGVydHlOYW1lcyA9ICAgICAgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMsXG4gICAgcHJpbV9nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPSAgICBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzLFxuICAgIHByaW1fYXNzaWduID0gICAgICAgICAgICAgICAgICAgT2JqZWN0LmFzc2lnbixcbiAgICBwcmltX2lzQXJyYXkgPSAgICAgICAgICAgICAgICAgIEFycmF5LmlzQXJyYXksXG4gICAgcHJpbV9jb25jYXQgPSAgICAgICAgICAgICAgICAgICBBcnJheS5wcm90b3R5cGUuY29uY2F0LFxuICAgIHByaW1faXNQcm90b3R5cGVPZiA9ICAgICAgICAgICAgT2JqZWN0LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mLFxuICAgIHByaW1faGFzT3duUHJvcGVydHkgPSAgICAgICAgICAgT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eTtcblxuLy8gdGhlc2Ugd2lsbCBwb2ludCB0byB0aGUgcGF0Y2hlZCB2ZXJzaW9ucyBvZiB0aGUgcmVzcGVjdGl2ZSBtZXRob2RzIG9uXG4vLyBPYmplY3QuIFRoZXkgYXJlIHVzZWQgd2l0aGluIHRoaXMgbW9kdWxlIGFzIHRoZSBcImludHJpbnNpY1wiIGJpbmRpbmdzXG4vLyBvZiB0aGVzZSBtZXRob2RzIChpLmUuIHRoZSBcIm9yaWdpbmFsXCIgYmluZGluZ3MgYXMgZGVmaW5lZCBpbiB0aGUgc3BlYylcbnZhciBPYmplY3RfaXNGcm96ZW4sXG4gICAgT2JqZWN0X2lzU2VhbGVkLFxuICAgIE9iamVjdF9pc0V4dGVuc2libGUsXG4gICAgT2JqZWN0X2dldFByb3RvdHlwZU9mLFxuICAgIE9iamVjdF9nZXRPd25Qcm9wZXJ0eU5hbWVzO1xuXG4vKipcbiAqIEEgcHJvcGVydHkgJ25hbWUnIGlzIGZpeGVkIGlmIGl0IGlzIGFuIG93biBwcm9wZXJ0eSBvZiB0aGUgdGFyZ2V0LlxuICovXG5mdW5jdGlvbiBpc0ZpeGVkKG5hbWUsIHRhcmdldCkge1xuICByZXR1cm4gKHt9KS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHRhcmdldCwgbmFtZSk7XG59XG5mdW5jdGlvbiBpc1NlYWxlZChuYW1lLCB0YXJnZXQpIHtcbiAgdmFyIGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwgbmFtZSk7XG4gIGlmIChkZXNjID09PSB1bmRlZmluZWQpIHsgcmV0dXJuIGZhbHNlOyB9XG4gIHJldHVybiBkZXNjLmNvbmZpZ3VyYWJsZSA9PT0gZmFsc2U7XG59XG5mdW5jdGlvbiBpc1NlYWxlZERlc2MoZGVzYykge1xuICByZXR1cm4gZGVzYyAhPT0gdW5kZWZpbmVkICYmIGRlc2MuY29uZmlndXJhYmxlID09PSBmYWxzZTtcbn1cblxuLyoqXG4gKiBQZXJmb3JtcyBhbGwgdmFsaWRhdGlvbiB0aGF0IE9iamVjdC5kZWZpbmVQcm9wZXJ0eSBwZXJmb3JtcyxcbiAqIHdpdGhvdXQgYWN0dWFsbHkgZGVmaW5pbmcgdGhlIHByb3BlcnR5LiBSZXR1cm5zIGEgYm9vbGVhblxuICogaW5kaWNhdGluZyB3aGV0aGVyIHZhbGlkYXRpb24gc3VjY2VlZGVkLlxuICpcbiAqIEltcGxlbWVudGF0aW9uIHRyYW5zbGl0ZXJhdGVkIGZyb20gRVM1LjEgc2VjdGlvbiA4LjEyLjlcbiAqL1xuZnVuY3Rpb24gaXNDb21wYXRpYmxlRGVzY3JpcHRvcihleHRlbnNpYmxlLCBjdXJyZW50LCBkZXNjKSB7XG4gIGlmIChjdXJyZW50ID09PSB1bmRlZmluZWQgJiYgZXh0ZW5zaWJsZSA9PT0gZmFsc2UpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKGN1cnJlbnQgPT09IHVuZGVmaW5lZCAmJiBleHRlbnNpYmxlID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgaWYgKGlzRW1wdHlEZXNjcmlwdG9yKGRlc2MpKSB7XG4gICAgcmV0dXJuIHRydWU7XG4gIH1cbiAgaWYgKGlzRXF1aXZhbGVudERlc2NyaXB0b3IoY3VycmVudCwgZGVzYykpIHtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBpZiAoY3VycmVudC5jb25maWd1cmFibGUgPT09IGZhbHNlKSB7XG4gICAgaWYgKGRlc2MuY29uZmlndXJhYmxlID09PSB0cnVlKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIGlmICgnZW51bWVyYWJsZScgaW4gZGVzYyAmJiBkZXNjLmVudW1lcmFibGUgIT09IGN1cnJlbnQuZW51bWVyYWJsZSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfVxuICBpZiAoaXNHZW5lcmljRGVzY3JpcHRvcihkZXNjKSkge1xuICAgIHJldHVybiB0cnVlO1xuICB9XG4gIGlmIChpc0RhdGFEZXNjcmlwdG9yKGN1cnJlbnQpICE9PSBpc0RhdGFEZXNjcmlwdG9yKGRlc2MpKSB7XG4gICAgaWYgKGN1cnJlbnQuY29uZmlndXJhYmxlID09PSBmYWxzZSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBpZiAoaXNEYXRhRGVzY3JpcHRvcihjdXJyZW50KSAmJiBpc0RhdGFEZXNjcmlwdG9yKGRlc2MpKSB7XG4gICAgaWYgKGN1cnJlbnQuY29uZmlndXJhYmxlID09PSBmYWxzZSkge1xuICAgICAgaWYgKGN1cnJlbnQud3JpdGFibGUgPT09IGZhbHNlICYmIGRlc2Mud3JpdGFibGUgPT09IHRydWUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKGN1cnJlbnQud3JpdGFibGUgPT09IGZhbHNlKSB7XG4gICAgICAgIGlmICgndmFsdWUnIGluIGRlc2MgJiYgIXNhbWVWYWx1ZShkZXNjLnZhbHVlLCBjdXJyZW50LnZhbHVlKSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuICBpZiAoaXNBY2Nlc3NvckRlc2NyaXB0b3IoY3VycmVudCkgJiYgaXNBY2Nlc3NvckRlc2NyaXB0b3IoZGVzYykpIHtcbiAgICBpZiAoY3VycmVudC5jb25maWd1cmFibGUgPT09IGZhbHNlKSB7XG4gICAgICBpZiAoJ3NldCcgaW4gZGVzYyAmJiAhc2FtZVZhbHVlKGRlc2Muc2V0LCBjdXJyZW50LnNldCkpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgICAgaWYgKCdnZXQnIGluIGRlc2MgJiYgIXNhbWVWYWx1ZShkZXNjLmdldCwgY3VycmVudC5nZXQpKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8vIEVTNiA3LjMuMTEgU2V0SW50ZWdyaXR5TGV2ZWxcbi8vIGxldmVsIGlzIG9uZSBvZiBcInNlYWxlZFwiIG9yIFwiZnJvemVuXCJcbmZ1bmN0aW9uIHNldEludGVncml0eUxldmVsKHRhcmdldCwgbGV2ZWwpIHtcbiAgdmFyIG93blByb3BzID0gT2JqZWN0X2dldE93blByb3BlcnR5TmFtZXModGFyZ2V0KTtcbiAgdmFyIHBlbmRpbmdFeGNlcHRpb24gPSB1bmRlZmluZWQ7XG4gIGlmIChsZXZlbCA9PT0gXCJzZWFsZWRcIikge1xuICAgIHZhciBsID0gK293blByb3BzLmxlbmd0aDtcbiAgICB2YXIgaztcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgayA9IFN0cmluZyhvd25Qcm9wc1tpXSk7XG4gICAgICB0cnkge1xuICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrLCB7IGNvbmZpZ3VyYWJsZTogZmFsc2UgfSk7XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGlmIChwZW5kaW5nRXhjZXB0aW9uID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICBwZW5kaW5nRXhjZXB0aW9uID0gZTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSBlbHNlIHtcbiAgICAvLyBsZXZlbCA9PT0gXCJmcm96ZW5cIlxuICAgIHZhciBsID0gK293blByb3BzLmxlbmd0aDtcbiAgICB2YXIgaztcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgayA9IFN0cmluZyhvd25Qcm9wc1tpXSk7XG4gICAgICB0cnkge1xuICAgICAgICB2YXIgY3VycmVudERlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwgayk7XG4gICAgICAgIGlmIChjdXJyZW50RGVzYyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgdmFyIGRlc2M7XG4gICAgICAgICAgaWYgKGlzQWNjZXNzb3JEZXNjcmlwdG9yKGN1cnJlbnREZXNjKSkge1xuICAgICAgICAgICAgZGVzYyA9IHsgY29uZmlndXJhYmxlOiBmYWxzZSB9XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRlc2MgPSB7IGNvbmZpZ3VyYWJsZTogZmFsc2UsIHdyaXRhYmxlOiBmYWxzZSB9XG4gICAgICAgICAgfVxuICAgICAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGssIGRlc2MpO1xuICAgICAgICB9ICAgICAgICBcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgaWYgKHBlbmRpbmdFeGNlcHRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIHBlbmRpbmdFeGNlcHRpb24gPSBlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmIChwZW5kaW5nRXhjZXB0aW9uICE9PSB1bmRlZmluZWQpIHtcbiAgICB0aHJvdyBwZW5kaW5nRXhjZXB0aW9uO1xuICB9XG4gIHJldHVybiBSZWZsZWN0LnByZXZlbnRFeHRlbnNpb25zKHRhcmdldCk7XG59XG5cbi8vIEVTNiA3LjMuMTIgVGVzdEludGVncml0eUxldmVsXG4vLyBsZXZlbCBpcyBvbmUgb2YgXCJzZWFsZWRcIiBvciBcImZyb3plblwiXG5mdW5jdGlvbiB0ZXN0SW50ZWdyaXR5TGV2ZWwodGFyZ2V0LCBsZXZlbCkge1xuICB2YXIgaXNFeHRlbnNpYmxlID0gT2JqZWN0X2lzRXh0ZW5zaWJsZSh0YXJnZXQpO1xuICBpZiAoaXNFeHRlbnNpYmxlKSByZXR1cm4gZmFsc2U7XG4gIFxuICB2YXIgb3duUHJvcHMgPSBPYmplY3RfZ2V0T3duUHJvcGVydHlOYW1lcyh0YXJnZXQpO1xuICB2YXIgcGVuZGluZ0V4Y2VwdGlvbiA9IHVuZGVmaW5lZDtcbiAgdmFyIGNvbmZpZ3VyYWJsZSA9IGZhbHNlO1xuICB2YXIgd3JpdGFibGUgPSBmYWxzZTtcbiAgXG4gIHZhciBsID0gK293blByb3BzLmxlbmd0aDtcbiAgdmFyIGs7XG4gIHZhciBjdXJyZW50RGVzYztcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBsOyBpKyspIHtcbiAgICBrID0gU3RyaW5nKG93blByb3BzW2ldKTtcbiAgICB0cnkge1xuICAgICAgY3VycmVudERlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwgayk7XG4gICAgICBjb25maWd1cmFibGUgPSBjb25maWd1cmFibGUgfHwgY3VycmVudERlc2MuY29uZmlndXJhYmxlO1xuICAgICAgaWYgKGlzRGF0YURlc2NyaXB0b3IoY3VycmVudERlc2MpKSB7XG4gICAgICAgIHdyaXRhYmxlID0gd3JpdGFibGUgfHwgY3VycmVudERlc2Mud3JpdGFibGU7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgaWYgKHBlbmRpbmdFeGNlcHRpb24gPT09IHVuZGVmaW5lZCkge1xuICAgICAgICBwZW5kaW5nRXhjZXB0aW9uID0gZTtcbiAgICAgICAgY29uZmlndXJhYmxlID0gdHJ1ZTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgaWYgKHBlbmRpbmdFeGNlcHRpb24gIT09IHVuZGVmaW5lZCkge1xuICAgIHRocm93IHBlbmRpbmdFeGNlcHRpb247XG4gIH1cbiAgaWYgKGxldmVsID09PSBcImZyb3plblwiICYmIHdyaXRhYmxlID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG4gIGlmIChjb25maWd1cmFibGUgPT09IHRydWUpIHtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH1cbiAgcmV0dXJuIHRydWU7XG59XG5cbi8vIC0tLS0gVGhlIFZhbGlkYXRvciBoYW5kbGVyIHdyYXBwZXIgYXJvdW5kIHVzZXIgaGFuZGxlcnMgLS0tLVxuXG4vKipcbiAqIEBwYXJhbSB0YXJnZXQgdGhlIG9iamVjdCB3cmFwcGVkIGJ5IHRoaXMgcHJveHkuXG4gKiBBcyBsb25nIGFzIHRoZSBwcm94eSBpcyBleHRlbnNpYmxlLCBvbmx5IG5vbi1jb25maWd1cmFibGUgcHJvcGVydGllc1xuICogYXJlIGNoZWNrZWQgYWdhaW5zdCB0aGUgdGFyZ2V0LiBPbmNlIHRoZSBwcm94eSBiZWNvbWVzIG5vbi1leHRlbnNpYmxlLFxuICogaW52YXJpYW50cyB3LnIudC4gbm9uLWV4dGVuc2liaWxpdHkgYXJlIGFsc28gZW5mb3JjZWQuXG4gKlxuICogQHBhcmFtIGhhbmRsZXIgdGhlIGhhbmRsZXIgb2YgdGhlIGRpcmVjdCBwcm94eS4gVGhlIG9iamVjdCBlbXVsYXRlZCBieVxuICogdGhpcyBoYW5kbGVyIGlzIHZhbGlkYXRlZCBhZ2FpbnN0IHRoZSB0YXJnZXQgb2JqZWN0IG9mIHRoZSBkaXJlY3QgcHJveHkuXG4gKiBBbnkgdmlvbGF0aW9ucyB0aGF0IHRoZSBoYW5kbGVyIG1ha2VzIGFnYWluc3QgdGhlIGludmFyaWFudHNcbiAqIG9mIHRoZSB0YXJnZXQgd2lsbCBjYXVzZSBhIFR5cGVFcnJvciB0byBiZSB0aHJvd24uXG4gKlxuICogQm90aCB0YXJnZXQgYW5kIGhhbmRsZXIgbXVzdCBiZSBwcm9wZXIgT2JqZWN0cyBhdCBpbml0aWFsaXphdGlvbiB0aW1lLlxuICovXG5mdW5jdGlvbiBWYWxpZGF0b3IodGFyZ2V0LCBoYW5kbGVyKSB7XG4gIC8vIGZvciBub24tcmV2b2thYmxlIHByb3hpZXMsIHRoZXNlIGFyZSBjb25zdCByZWZlcmVuY2VzXG4gIC8vIGZvciByZXZva2FibGUgcHJveGllcywgb24gcmV2b2NhdGlvbjpcbiAgLy8gLSB0aGlzLnRhcmdldCBpcyBzZXQgdG8gbnVsbFxuICAvLyAtIHRoaXMuaGFuZGxlciBpcyBzZXQgdG8gYSBoYW5kbGVyIHRoYXQgdGhyb3dzIG9uIGFsbCB0cmFwc1xuICB0aGlzLnRhcmdldCAgPSB0YXJnZXQ7XG4gIHRoaXMuaGFuZGxlciA9IGhhbmRsZXI7XG59XG5cblZhbGlkYXRvci5wcm90b3R5cGUgPSB7XG5cbiAgLyoqXG4gICAqIElmIGdldFRyYXAgcmV0dXJucyB1bmRlZmluZWQsIHRoZSBjYWxsZXIgc2hvdWxkIHBlcmZvcm0gdGhlXG4gICAqIGRlZmF1bHQgZm9yd2FyZGluZyBiZWhhdmlvci5cbiAgICogSWYgZ2V0VHJhcCByZXR1cm5zIG5vcm1hbGx5IG90aGVyd2lzZSwgdGhlIHJldHVybiB2YWx1ZVxuICAgKiB3aWxsIGJlIGEgY2FsbGFibGUgdHJhcCBmdW5jdGlvbi4gV2hlbiBjYWxsaW5nIHRoZSB0cmFwIGZ1bmN0aW9uLFxuICAgKiB0aGUgY2FsbGVyIGlzIHJlc3BvbnNpYmxlIGZvciBiaW5kaW5nIGl0cyB8dGhpc3wgdG8gfHRoaXMuaGFuZGxlcnwuXG4gICAqL1xuICBnZXRUcmFwOiBmdW5jdGlvbih0cmFwTmFtZSkge1xuICAgIHZhciB0cmFwID0gdGhpcy5oYW5kbGVyW3RyYXBOYW1lXTtcbiAgICBpZiAodHJhcCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyB0aGUgdHJhcCB3YXMgbm90IGRlZmluZWQsXG4gICAgICAvLyBwZXJmb3JtIHRoZSBkZWZhdWx0IGZvcndhcmRpbmcgYmVoYXZpb3JcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuXG4gICAgaWYgKHR5cGVvZiB0cmFwICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IodHJhcE5hbWUgKyBcIiB0cmFwIGlzIG5vdCBjYWxsYWJsZTogXCIrdHJhcCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHRyYXA7XG4gIH0sXG5cbiAgLy8gPT09IGZ1bmRhbWVudGFsIHRyYXBzID09PVxuXG4gIC8qKlxuICAgKiBJZiBuYW1lIGRlbm90ZXMgYSBmaXhlZCBwcm9wZXJ0eSwgY2hlY2s6XG4gICAqICAgLSB3aGV0aGVyIHRhcmdldEhhbmRsZXIgcmVwb3J0cyBpdCBhcyBleGlzdGVudFxuICAgKiAgIC0gd2hldGhlciB0aGUgcmV0dXJuZWQgZGVzY3JpcHRvciBpcyBjb21wYXRpYmxlIHdpdGggdGhlIGZpeGVkIHByb3BlcnR5XG4gICAqIElmIHRoZSBwcm94eSBpcyBub24tZXh0ZW5zaWJsZSwgY2hlY2s6XG4gICAqICAgLSB3aGV0aGVyIG5hbWUgaXMgbm90IGEgbmV3IHByb3BlcnR5XG4gICAqIEFkZGl0aW9uYWxseSwgdGhlIHJldHVybmVkIGRlc2NyaXB0b3IgaXMgbm9ybWFsaXplZCBhbmQgY29tcGxldGVkLlxuICAgKi9cbiAgZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG5cbiAgICB2YXIgdHJhcCA9IHRoaXMuZ2V0VHJhcChcImdldE93blByb3BlcnR5RGVzY3JpcHRvclwiKTtcbiAgICBpZiAodHJhcCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gUmVmbGVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGhpcy50YXJnZXQsIG5hbWUpO1xuICAgIH1cblxuICAgIG5hbWUgPSBTdHJpbmcobmFtZSk7XG4gICAgdmFyIGRlc2MgPSB0cmFwLmNhbGwodGhpcy5oYW5kbGVyLCB0aGlzLnRhcmdldCwgbmFtZSk7XG4gICAgZGVzYyA9IG5vcm1hbGl6ZUFuZENvbXBsZXRlUHJvcGVydHlEZXNjcmlwdG9yKGRlc2MpO1xuXG4gICAgdmFyIHRhcmdldERlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRoaXMudGFyZ2V0LCBuYW1lKTtcbiAgICB2YXIgZXh0ZW5zaWJsZSA9IE9iamVjdC5pc0V4dGVuc2libGUodGhpcy50YXJnZXQpO1xuXG4gICAgaWYgKGRlc2MgPT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKGlzU2VhbGVkRGVzYyh0YXJnZXREZXNjKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiY2Fubm90IHJlcG9ydCBub24tY29uZmlndXJhYmxlIHByb3BlcnR5ICdcIituYW1lK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiJyBhcyBub24tZXhpc3RlbnRcIik7XG4gICAgICB9XG4gICAgICBpZiAoIWV4dGVuc2libGUgJiYgdGFyZ2V0RGVzYyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgLy8gaWYgaGFuZGxlciBpcyBhbGxvd2VkIHRvIHJldHVybiB1bmRlZmluZWQsIHdlIGNhbm5vdCBndWFyYW50ZWVcbiAgICAgICAgICAvLyB0aGF0IGl0IHdpbGwgbm90IHJldHVybiBhIGRlc2NyaXB0b3IgZm9yIHRoaXMgcHJvcGVydHkgbGF0ZXIuXG4gICAgICAgICAgLy8gT25jZSBhIHByb3BlcnR5IGhhcyBiZWVuIHJlcG9ydGVkIGFzIG5vbi1leGlzdGVudCBvbiBhIG5vbi1leHRlbnNpYmxlXG4gICAgICAgICAgLy8gb2JqZWN0LCBpdCBzaG91bGQgZm9yZXZlciBiZSByZXBvcnRlZCBhcyBub24tZXhpc3RlbnRcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiY2Fubm90IHJlcG9ydCBleGlzdGluZyBvd24gcHJvcGVydHkgJ1wiK25hbWUrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIicgYXMgbm9uLWV4aXN0ZW50IG9uIGEgbm9uLWV4dGVuc2libGUgb2JqZWN0XCIpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG5cbiAgICAvLyBhdCB0aGlzIHBvaW50LCB3ZSBrbm93IChkZXNjICE9PSB1bmRlZmluZWQpLCBpLmUuXG4gICAgLy8gdGFyZ2V0SGFuZGxlciByZXBvcnRzICduYW1lJyBhcyBhbiBleGlzdGluZyBwcm9wZXJ0eVxuXG4gICAgLy8gTm90ZTogd2UgY291bGQgY29sbGFwc2UgdGhlIGZvbGxvd2luZyB0d28gaWYtdGVzdHMgaW50byBhIHNpbmdsZVxuICAgIC8vIHRlc3QuIFNlcGFyYXRpbmcgb3V0IHRoZSBjYXNlcyB0byBpbXByb3ZlIGVycm9yIHJlcG9ydGluZy5cblxuICAgIGlmICghZXh0ZW5zaWJsZSkge1xuICAgICAgaWYgKHRhcmdldERlc2MgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiY2Fubm90IHJlcG9ydCBhIG5ldyBvd24gcHJvcGVydHkgJ1wiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWUgKyBcIicgb24gYSBub24tZXh0ZW5zaWJsZSBvYmplY3RcIik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG5hbWUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgaWYgKCFpc0NvbXBhdGlibGVEZXNjcmlwdG9yKGV4dGVuc2libGUsIHRhcmdldERlc2MsIGRlc2MpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJjYW5ub3QgcmVwb3J0IGluY29tcGF0aWJsZSBwcm9wZXJ0eSBkZXNjcmlwdG9yIFwiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZm9yIHByb3BlcnR5ICdcIituYW1lK1wiJ1wiKTtcbiAgICAgIH1cbiAgICB9XG4gICAgXG4gICAgaWYgKGRlc2MuY29uZmlndXJhYmxlID09PSBmYWxzZSkge1xuICAgICAgaWYgKHRhcmdldERlc2MgPT09IHVuZGVmaW5lZCB8fCB0YXJnZXREZXNjLmNvbmZpZ3VyYWJsZSA9PT0gdHJ1ZSkge1xuICAgICAgICAvLyBpZiB0aGUgcHJvcGVydHkgaXMgY29uZmlndXJhYmxlIG9yIG5vbi1leGlzdGVudCBvbiB0aGUgdGFyZ2V0LFxuICAgICAgICAvLyBidXQgaXMgcmVwb3J0ZWQgYXMgYSBub24tY29uZmlndXJhYmxlIHByb3BlcnR5LCBpdCBtYXkgbGF0ZXIgYmVcbiAgICAgICAgLy8gcmVwb3J0ZWQgYXMgY29uZmlndXJhYmxlIG9yIG5vbi1leGlzdGVudCwgd2hpY2ggdmlvbGF0ZXMgdGhlXG4gICAgICAgIC8vIGludmFyaWFudCB0aGF0IGlmIHRoZSBwcm9wZXJ0eSBtaWdodCBjaGFuZ2Ugb3IgZGlzYXBwZWFyLCB0aGVcbiAgICAgICAgLy8gY29uZmlndXJhYmxlIGF0dHJpYnV0ZSBtdXN0IGJlIHRydWUuXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICAgXCJjYW5ub3QgcmVwb3J0IGEgbm9uLWNvbmZpZ3VyYWJsZSBkZXNjcmlwdG9yIFwiICtcbiAgICAgICAgICBcImZvciBjb25maWd1cmFibGUgb3Igbm9uLWV4aXN0ZW50IHByb3BlcnR5ICdcIiArIG5hbWUgKyBcIidcIik7XG4gICAgICB9XG4gICAgICBpZiAoJ3dyaXRhYmxlJyBpbiBkZXNjICYmIGRlc2Mud3JpdGFibGUgPT09IGZhbHNlKSB7XG4gICAgICAgIGlmICh0YXJnZXREZXNjLndyaXRhYmxlID09PSB0cnVlKSB7XG4gICAgICAgICAgLy8gaWYgdGhlIHByb3BlcnR5IGlzIG5vbi1jb25maWd1cmFibGUsIHdyaXRhYmxlIG9uIHRoZSB0YXJnZXQsXG4gICAgICAgICAgLy8gYnV0IGlzIHJlcG9ydGVkIGFzIG5vbi1jb25maWd1cmFibGUsIG5vbi13cml0YWJsZSwgaXQgbWF5IGxhdGVyXG4gICAgICAgICAgLy8gYmUgcmVwb3J0ZWQgYXMgbm9uLWNvbmZpZ3VyYWJsZSwgd3JpdGFibGUgYWdhaW4sIHdoaWNoIHZpb2xhdGVzXG4gICAgICAgICAgLy8gdGhlIGludmFyaWFudCB0aGF0IGEgbm9uLWNvbmZpZ3VyYWJsZSwgbm9uLXdyaXRhYmxlIHByb3BlcnR5XG4gICAgICAgICAgLy8gbWF5IG5vdCBjaGFuZ2Ugc3RhdGUuXG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgICAgIFwiY2Fubm90IHJlcG9ydCBub24tY29uZmlndXJhYmxlLCB3cml0YWJsZSBwcm9wZXJ0eSAnXCIgKyBuYW1lICtcbiAgICAgICAgICAgIFwiJyBhcyBub24tY29uZmlndXJhYmxlLCBub24td3JpdGFibGVcIik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZGVzYztcbiAgfSxcblxuICAvKipcbiAgICogSW4gdGhlIGRpcmVjdCBwcm94aWVzIGRlc2lnbiB3aXRoIHJlZmFjdG9yZWQgcHJvdG90eXBlIGNsaW1iaW5nLFxuICAgKiB0aGlzIHRyYXAgaXMgZGVwcmVjYXRlZC4gRm9yIHByb3hpZXMtYXMtcHJvdG90eXBlcywgaW5zdGVhZFxuICAgKiBvZiBjYWxsaW5nIHRoaXMgdHJhcCwgdGhlIGdldCwgc2V0LCBoYXMgb3IgZW51bWVyYXRlIHRyYXBzIGFyZVxuICAgKiBjYWxsZWQgaW5zdGVhZC5cbiAgICpcbiAgICogSW4gdGhpcyBpbXBsZW1lbnRhdGlvbiwgd2UgXCJhYnVzZVwiIGdldFByb3BlcnR5RGVzY3JpcHRvciB0b1xuICAgKiBzdXBwb3J0IHRyYXBwaW5nIHRoZSBnZXQgb3Igc2V0IHRyYXBzIGZvciBwcm94aWVzLWFzLXByb3RvdHlwZXMuXG4gICAqIFdlIGRvIHRoaXMgYnkgcmV0dXJuaW5nIGEgZ2V0dGVyL3NldHRlciBwYWlyIHRoYXQgaW52b2tlc1xuICAgKiB0aGUgY29ycmVzcG9uZGluZyB0cmFwcy5cbiAgICpcbiAgICogV2hpbGUgdGhpcyBoYWNrIHdvcmtzIGZvciBpbmhlcml0ZWQgcHJvcGVydHkgYWNjZXNzLCBpdCBoYXMgc29tZVxuICAgKiBxdWlya3M6XG4gICAqXG4gICAqIEluIEZpcmVmb3gsIHRoaXMgdHJhcCBpcyBvbmx5IGNhbGxlZCBhZnRlciBhIHByaW9yIGludm9jYXRpb25cbiAgICogb2YgdGhlICdoYXMnIHRyYXAgaGFzIHJldHVybmVkIHRydWUuIEhlbmNlLCBleHBlY3QgdGhlIGZvbGxvd2luZ1xuICAgKiBiZWhhdmlvcjpcbiAgICogPGNvZGU+XG4gICAqIHZhciBjaGlsZCA9IE9iamVjdC5jcmVhdGUoUHJveHkodGFyZ2V0LCBoYW5kbGVyKSk7XG4gICAqIGNoaWxkW25hbWVdIC8vIHRyaWdnZXJzIGhhbmRsZXIuaGFzKHRhcmdldCwgbmFtZSlcbiAgICogLy8gaWYgdGhhdCByZXR1cm5zIHRydWUsIHRyaWdnZXJzIGhhbmRsZXIuZ2V0KHRhcmdldCwgbmFtZSwgY2hpbGQpXG4gICAqIDwvY29kZT5cbiAgICpcbiAgICogT24gdjgsIHRoZSAnaW4nIG9wZXJhdG9yLCB3aGVuIGFwcGxpZWQgdG8gYW4gb2JqZWN0IHRoYXQgaW5oZXJpdHNcbiAgICogZnJvbSBhIHByb3h5LCB3aWxsIGNhbGwgZ2V0UHJvcGVydHlEZXNjcmlwdG9yIGFuZCB3YWxrIHRoZSBwcm90by1jaGFpbi5cbiAgICogVGhhdCBjYWxscyB0aGUgYmVsb3cgZ2V0UHJvcGVydHlEZXNjcmlwdG9yIHRyYXAgb24gdGhlIHByb3h5LiBUaGVcbiAgICogcmVzdWx0IG9mIHRoZSAnaW4nLW9wZXJhdG9yIGlzIHRoZW4gZGV0ZXJtaW5lZCBieSB3aGV0aGVyIHRoaXMgdHJhcFxuICAgKiByZXR1cm5zIHVuZGVmaW5lZCBvciBhIHByb3BlcnR5IGRlc2NyaXB0b3Igb2JqZWN0LiBUaGF0IGlzIHdoeVxuICAgKiB3ZSBmaXJzdCBleHBsaWNpdGx5IHRyaWdnZXIgdGhlICdoYXMnIHRyYXAgdG8gZGV0ZXJtaW5lIHdoZXRoZXJcbiAgICogdGhlIHByb3BlcnR5IGV4aXN0cy5cbiAgICpcbiAgICogVGhpcyBoYXMgdGhlIHNpZGUtZWZmZWN0IHRoYXQgd2hlbiBlbnVtZXJhdGluZyBwcm9wZXJ0aWVzIG9uXG4gICAqIGFuIG9iamVjdCB0aGF0IGluaGVyaXRzIGZyb20gYSBwcm94eSBpbiB2OCwgb25seSBwcm9wZXJ0aWVzXG4gICAqIGZvciB3aGljaCAnaGFzJyByZXR1cm5zIHRydWUgYXJlIHJldHVybmVkOlxuICAgKlxuICAgKiA8Y29kZT5cbiAgICogdmFyIGNoaWxkID0gT2JqZWN0LmNyZWF0ZShQcm94eSh0YXJnZXQsIGhhbmRsZXIpKTtcbiAgICogZm9yICh2YXIgcHJvcCBpbiBjaGlsZCkge1xuICAgKiAgIC8vIG9ubHkgZW51bWVyYXRlcyBwcm9wIGlmIChwcm9wIGluIGNoaWxkKSByZXR1cm5zIHRydWVcbiAgICogfVxuICAgKiA8L2NvZGU+XG4gICAqL1xuICBnZXRQcm9wZXJ0eURlc2NyaXB0b3I6IGZ1bmN0aW9uKG5hbWUpIHtcbiAgICB2YXIgaGFuZGxlciA9IHRoaXM7XG5cbiAgICBpZiAoIWhhbmRsZXIuaGFzKG5hbWUpKSByZXR1cm4gdW5kZWZpbmVkO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBoYW5kbGVyLmdldCh0aGlzLCBuYW1lKTtcbiAgICAgIH0sXG4gICAgICBzZXQ6IGZ1bmN0aW9uKHZhbCkge1xuICAgICAgICBpZiAoaGFuZGxlci5zZXQodGhpcywgbmFtZSwgdmFsKSkge1xuICAgICAgICAgIHJldHVybiB2YWw7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImZhaWxlZCBhc3NpZ25tZW50IHRvIFwiK25hbWUpO1xuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcbiAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxuICAgIH07XG4gIH0sXG5cbiAgLyoqXG4gICAqIElmIG5hbWUgZGVub3RlcyBhIGZpeGVkIHByb3BlcnR5LCBjaGVjayBmb3IgaW5jb21wYXRpYmxlIGNoYW5nZXMuXG4gICAqIElmIHRoZSBwcm94eSBpcyBub24tZXh0ZW5zaWJsZSwgY2hlY2sgdGhhdCBuZXcgcHJvcGVydGllcyBhcmUgcmVqZWN0ZWQuXG4gICAqL1xuICBkZWZpbmVQcm9wZXJ0eTogZnVuY3Rpb24obmFtZSwgZGVzYykge1xuICAgIC8vIFRPRE8odHZjdXRzZW0pOiB0aGUgY3VycmVudCB0cmFjZW1vbmtleSBpbXBsZW1lbnRhdGlvbiBvZiBwcm94aWVzXG4gICAgLy8gYXV0by1jb21wbGV0ZXMgJ2Rlc2MnLCB3aGljaCBpcyBub3QgY29ycmVjdC4gJ2Rlc2MnIHNob3VsZCBiZVxuICAgIC8vIG5vcm1hbGl6ZWQsIGJ1dCBub3QgY29tcGxldGVkLiBDb25zaWRlcjpcbiAgICAvLyBPYmplY3QuZGVmaW5lUHJvcGVydHkocHJveHksICdmb28nLCB7ZW51bWVyYWJsZTpmYWxzZX0pXG4gICAgLy8gVGhpcyB0cmFwIHdpbGwgcmVjZWl2ZSBkZXNjID1cbiAgICAvLyAge3ZhbHVlOnVuZGVmaW5lZCx3cml0YWJsZTpmYWxzZSxlbnVtZXJhYmxlOmZhbHNlLGNvbmZpZ3VyYWJsZTpmYWxzZX1cbiAgICAvLyBUaGlzIHdpbGwgYWxzbyBzZXQgYWxsIG90aGVyIGF0dHJpYnV0ZXMgdG8gdGhlaXIgZGVmYXVsdCB2YWx1ZSxcbiAgICAvLyB3aGljaCBpcyB1bmV4cGVjdGVkIGFuZCBkaWZmZXJlbnQgZnJvbSBbW0RlZmluZU93blByb3BlcnR5XV0uXG4gICAgLy8gQnVnIGZpbGVkOiBodHRwczovL2J1Z3ppbGxhLm1vemlsbGEub3JnL3Nob3dfYnVnLmNnaT9pZD02MDEzMjlcblxuICAgIHZhciB0cmFwID0gdGhpcy5nZXRUcmFwKFwiZGVmaW5lUHJvcGVydHlcIik7XG4gICAgaWYgKHRyYXAgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gZGVmYXVsdCBmb3J3YXJkaW5nIGJlaGF2aW9yXG4gICAgICByZXR1cm4gUmVmbGVjdC5kZWZpbmVQcm9wZXJ0eSh0aGlzLnRhcmdldCwgbmFtZSwgZGVzYyk7XG4gICAgfVxuXG4gICAgbmFtZSA9IFN0cmluZyhuYW1lKTtcbiAgICB2YXIgZGVzY09iaiA9IG5vcm1hbGl6ZVByb3BlcnR5RGVzY3JpcHRvcihkZXNjKTtcbiAgICB2YXIgc3VjY2VzcyA9IHRyYXAuY2FsbCh0aGlzLmhhbmRsZXIsIHRoaXMudGFyZ2V0LCBuYW1lLCBkZXNjT2JqKTtcbiAgICBzdWNjZXNzID0gISFzdWNjZXNzOyAvLyBjb2VyY2UgdG8gQm9vbGVhblxuXG4gICAgaWYgKHN1Y2Nlc3MgPT09IHRydWUpIHtcblxuICAgICAgdmFyIHRhcmdldERlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRoaXMudGFyZ2V0LCBuYW1lKTtcbiAgICAgIHZhciBleHRlbnNpYmxlID0gT2JqZWN0LmlzRXh0ZW5zaWJsZSh0aGlzLnRhcmdldCk7XG5cbiAgICAgIC8vIE5vdGU6IHdlIGNvdWxkIGNvbGxhcHNlIHRoZSBmb2xsb3dpbmcgdHdvIGlmLXRlc3RzIGludG8gYSBzaW5nbGVcbiAgICAgIC8vIHRlc3QuIFNlcGFyYXRpbmcgb3V0IHRoZSBjYXNlcyB0byBpbXByb3ZlIGVycm9yIHJlcG9ydGluZy5cblxuICAgICAgaWYgKCFleHRlbnNpYmxlKSB7XG4gICAgICAgIGlmICh0YXJnZXREZXNjID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiY2Fubm90IHN1Y2Nlc3NmdWxseSBhZGQgYSBuZXcgcHJvcGVydHkgJ1wiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZSArIFwiJyB0byBhIG5vbi1leHRlbnNpYmxlIG9iamVjdFwiKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAodGFyZ2V0RGVzYyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAgIGlmICghaXNDb21wYXRpYmxlRGVzY3JpcHRvcihleHRlbnNpYmxlLCB0YXJnZXREZXNjLCBkZXNjKSkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJjYW5ub3QgZGVmaW5lIGluY29tcGF0aWJsZSBwcm9wZXJ0eSBcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZGVzY3JpcHRvciBmb3IgcHJvcGVydHkgJ1wiK25hbWUrXCInXCIpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChpc0RhdGFEZXNjcmlwdG9yKHRhcmdldERlc2MpICYmXG4gICAgICAgICAgICB0YXJnZXREZXNjLmNvbmZpZ3VyYWJsZSA9PT0gZmFsc2UgJiZcbiAgICAgICAgICAgIHRhcmdldERlc2Mud3JpdGFibGUgPT09IHRydWUpIHtcbiAgICAgICAgICAgIGlmIChkZXNjLmNvbmZpZ3VyYWJsZSA9PT0gZmFsc2UgJiYgZGVzYy53cml0YWJsZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICAgICAgLy8gaWYgdGhlIHByb3BlcnR5IGlzIG5vbi1jb25maWd1cmFibGUsIHdyaXRhYmxlIG9uIHRoZSB0YXJnZXRcbiAgICAgICAgICAgICAgLy8gYnV0IHdhcyBzdWNjZXNzZnVsbHkgcmVwb3J0ZWQgdG8gYmUgdXBkYXRlZCB0b1xuICAgICAgICAgICAgICAvLyBub24tY29uZmlndXJhYmxlLCBub24td3JpdGFibGUsIGl0IGNhbiBsYXRlciBiZSByZXBvcnRlZFxuICAgICAgICAgICAgICAvLyBhZ2FpbiBhcyBub24tY29uZmlndXJhYmxlLCB3cml0YWJsZSwgd2hpY2ggdmlvbGF0ZXNcbiAgICAgICAgICAgICAgLy8gdGhlIGludmFyaWFudCB0aGF0IG5vbi1jb25maWd1cmFibGUsIG5vbi13cml0YWJsZSBwcm9wZXJ0aWVzXG4gICAgICAgICAgICAgIC8vIGNhbm5vdCBjaGFuZ2Ugc3RhdGVcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgICAgICAgICBcImNhbm5vdCBzdWNjZXNzZnVsbHkgZGVmaW5lIG5vbi1jb25maWd1cmFibGUsIHdyaXRhYmxlIFwiICtcbiAgICAgICAgICAgICAgICBcIiBwcm9wZXJ0eSAnXCIgKyBuYW1lICsgXCInIGFzIG5vbi1jb25maWd1cmFibGUsIG5vbi13cml0YWJsZVwiKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIGlmIChkZXNjLmNvbmZpZ3VyYWJsZSA9PT0gZmFsc2UgJiYgIWlzU2VhbGVkRGVzYyh0YXJnZXREZXNjKSkge1xuICAgICAgICAvLyBpZiB0aGUgcHJvcGVydHkgaXMgY29uZmlndXJhYmxlIG9yIG5vbi1leGlzdGVudCBvbiB0aGUgdGFyZ2V0LFxuICAgICAgICAvLyBidXQgaXMgc3VjY2Vzc2Z1bGx5IGJlaW5nIHJlZGVmaW5lZCBhcyBhIG5vbi1jb25maWd1cmFibGUgcHJvcGVydHksXG4gICAgICAgIC8vIGl0IG1heSBsYXRlciBiZSByZXBvcnRlZCBhcyBjb25maWd1cmFibGUgb3Igbm9uLWV4aXN0ZW50LCB3aGljaCB2aW9sYXRlc1xuICAgICAgICAvLyB0aGUgaW52YXJpYW50IHRoYXQgaWYgdGhlIHByb3BlcnR5IG1pZ2h0IGNoYW5nZSBvciBkaXNhcHBlYXIsIHRoZVxuICAgICAgICAvLyBjb25maWd1cmFibGUgYXR0cmlidXRlIG11c3QgYmUgdHJ1ZS5cbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcbiAgICAgICAgICBcImNhbm5vdCBzdWNjZXNzZnVsbHkgZGVmaW5lIGEgbm9uLWNvbmZpZ3VyYWJsZSBcIiArXG4gICAgICAgICAgXCJkZXNjcmlwdG9yIGZvciBjb25maWd1cmFibGUgb3Igbm9uLWV4aXN0ZW50IHByb3BlcnR5ICdcIiArXG4gICAgICAgICAgbmFtZSArIFwiJ1wiKTtcbiAgICAgIH1cblxuICAgIH1cblxuICAgIHJldHVybiBzdWNjZXNzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBPbiBzdWNjZXNzLCBjaGVjayB3aGV0aGVyIHRoZSB0YXJnZXQgb2JqZWN0IGlzIGluZGVlZCBub24tZXh0ZW5zaWJsZS5cbiAgICovXG4gIHByZXZlbnRFeHRlbnNpb25zOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdHJhcCA9IHRoaXMuZ2V0VHJhcChcInByZXZlbnRFeHRlbnNpb25zXCIpO1xuICAgIGlmICh0cmFwID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIGRlZmF1bHQgZm9yd2FyZGluZyBiZWhhdmlvclxuICAgICAgcmV0dXJuIFJlZmxlY3QucHJldmVudEV4dGVuc2lvbnModGhpcy50YXJnZXQpO1xuICAgIH1cblxuICAgIHZhciBzdWNjZXNzID0gdHJhcC5jYWxsKHRoaXMuaGFuZGxlciwgdGhpcy50YXJnZXQpO1xuICAgIHN1Y2Nlc3MgPSAhIXN1Y2Nlc3M7IC8vIGNvZXJjZSB0byBCb29sZWFuXG4gICAgaWYgKHN1Y2Nlc3MpIHtcbiAgICAgIGlmIChPYmplY3RfaXNFeHRlbnNpYmxlKHRoaXMudGFyZ2V0KSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiY2FuJ3QgcmVwb3J0IGV4dGVuc2libGUgb2JqZWN0IGFzIG5vbi1leHRlbnNpYmxlOiBcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhcmdldCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzdWNjZXNzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBJZiBuYW1lIGRlbm90ZXMgYSBzZWFsZWQgcHJvcGVydHksIGNoZWNrIHdoZXRoZXIgaGFuZGxlciByZWplY3RzLlxuICAgKi9cbiAgZGVsZXRlOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgXCJ1c2Ugc3RyaWN0XCI7XG4gICAgdmFyIHRyYXAgPSB0aGlzLmdldFRyYXAoXCJkZWxldGVQcm9wZXJ0eVwiKTtcbiAgICBpZiAodHJhcCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBkZWZhdWx0IGZvcndhcmRpbmcgYmVoYXZpb3JcbiAgICAgIHJldHVybiBSZWZsZWN0LmRlbGV0ZVByb3BlcnR5KHRoaXMudGFyZ2V0LCBuYW1lKTtcbiAgICB9XG5cbiAgICBuYW1lID0gU3RyaW5nKG5hbWUpO1xuICAgIHZhciByZXMgPSB0cmFwLmNhbGwodGhpcy5oYW5kbGVyLCB0aGlzLnRhcmdldCwgbmFtZSk7XG4gICAgcmVzID0gISFyZXM7IC8vIGNvZXJjZSB0byBCb29sZWFuXG5cbiAgICB2YXIgdGFyZ2V0RGVzYztcbiAgICBpZiAocmVzID09PSB0cnVlKSB7XG4gICAgICB0YXJnZXREZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0aGlzLnRhcmdldCwgbmFtZSk7XG4gICAgICBpZiAodGFyZ2V0RGVzYyAhPT0gdW5kZWZpbmVkICYmIHRhcmdldERlc2MuY29uZmlndXJhYmxlID09PSBmYWxzZSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwicHJvcGVydHkgJ1wiICsgbmFtZSArIFwiJyBpcyBub24tY29uZmlndXJhYmxlIFwiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiYW5kIGNhbid0IGJlIGRlbGV0ZWRcIik7XG4gICAgICB9XG4gICAgICBpZiAodGFyZ2V0RGVzYyAhPT0gdW5kZWZpbmVkICYmICFPYmplY3RfaXNFeHRlbnNpYmxlKHRoaXMudGFyZ2V0KSkge1xuICAgICAgICAvLyBpZiB0aGUgcHJvcGVydHkgc3RpbGwgZXhpc3RzIG9uIGEgbm9uLWV4dGVuc2libGUgdGFyZ2V0IGJ1dFxuICAgICAgICAvLyBpcyByZXBvcnRlZCBhcyBzdWNjZXNzZnVsbHkgZGVsZXRlZCwgaXQgbWF5IGxhdGVyIGJlIHJlcG9ydGVkXG4gICAgICAgIC8vIGFzIHByZXNlbnQsIHdoaWNoIHZpb2xhdGVzIHRoZSBpbnZhcmlhbnQgdGhhdCBhbiBvd24gcHJvcGVydHksXG4gICAgICAgIC8vIGRlbGV0ZWQgZnJvbSBhIG5vbi1leHRlbnNpYmxlIG9iamVjdCBjYW5ub3QgcmVhcHBlYXIuXG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXG4gICAgICAgICAgXCJjYW5ub3Qgc3VjY2Vzc2Z1bGx5IGRlbGV0ZSBleGlzdGluZyBwcm9wZXJ0eSAnXCIgKyBuYW1lICtcbiAgICAgICAgICBcIicgb24gYSBub24tZXh0ZW5zaWJsZSBvYmplY3RcIik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlcztcbiAgfSxcblxuICAvKipcbiAgICogVGhlIGdldE93blByb3BlcnR5TmFtZXMgdHJhcCB3YXMgcmVwbGFjZWQgYnkgdGhlIG93bktleXMgdHJhcCxcbiAgICogd2hpY2ggbm93IGFsc28gcmV0dXJucyBhbiBhcnJheSAob2Ygc3RyaW5ncyBvciBzeW1ib2xzKSBhbmRcbiAgICogd2hpY2ggcGVyZm9ybXMgdGhlIHNhbWUgcmlnb3JvdXMgaW52YXJpYW50IGNoZWNrcyBhcyBnZXRPd25Qcm9wZXJ0eU5hbWVzXG4gICAqXG4gICAqIFNlZSBpc3N1ZSAjNDggb24gaG93IHRoaXMgdHJhcCBjYW4gc3RpbGwgZ2V0IGludm9rZWQgYnkgZXh0ZXJuYWwgbGlic1xuICAgKiB0aGF0IGRvbid0IHVzZSB0aGUgcGF0Y2hlZCBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyBmdW5jdGlvbi5cbiAgICovXG4gIGdldE93blByb3BlcnR5TmFtZXM6IGZ1bmN0aW9uKCkge1xuICAgIC8vIE5vdGU6IHJlbW92ZWQgZGVwcmVjYXRpb24gd2FybmluZyB0byBhdm9pZCBkZXBlbmRlbmN5IG9uICdjb25zb2xlJ1xuICAgIC8vIChhbmQgb24gbm9kZSwgc2hvdWxkIGFueXdheSB1c2UgdXRpbC5kZXByZWNhdGUpLiBEZXByZWNhdGlvbiB3YXJuaW5nc1xuICAgIC8vIGNhbiBhbHNvIGJlIGFubm95aW5nIHdoZW4gdGhleSBhcmUgb3V0c2lkZSBvZiB0aGUgdXNlcidzIGNvbnRyb2wsIGUuZy5cbiAgICAvLyB3aGVuIGFuIGV4dGVybmFsIGxpYnJhcnkgY2FsbHMgdW5wYXRjaGVkIE9iamVjdC5nZXRPd25Qcm9wZXJ0eU5hbWVzLlxuICAgIC8vIFNpbmNlIHRoZXJlIGlzIGEgY2xlYW4gZmFsbGJhY2sgdG8gYG93bktleXNgLCB0aGUgZmFjdCB0aGF0IHRoZVxuICAgIC8vIGRlcHJlY2F0ZWQgbWV0aG9kIGlzIHN0aWxsIGNhbGxlZCBpcyBtb3N0bHkgaGFybWxlc3MgYW55d2F5LlxuICAgIC8vIFNlZSBhbHNvIGlzc3VlcyAjNjUgYW5kICM2Ni5cbiAgICAvLyBjb25zb2xlLndhcm4oXCJnZXRPd25Qcm9wZXJ0eU5hbWVzIHRyYXAgaXMgZGVwcmVjYXRlZC4gVXNlIG93bktleXMgaW5zdGVhZFwiKTtcbiAgICByZXR1cm4gdGhpcy5vd25LZXlzKCk7XG4gIH0sXG5cbiAgLyoqXG4gICAqIENoZWNrcyB3aGV0aGVyIHRoZSB0cmFwIHJlc3VsdCBkb2VzIG5vdCBjb250YWluIGFueSBuZXcgcHJvcGVydGllc1xuICAgKiBpZiB0aGUgcHJveHkgaXMgbm9uLWV4dGVuc2libGUuXG4gICAqXG4gICAqIEFueSBvd24gbm9uLWNvbmZpZ3VyYWJsZSBwcm9wZXJ0aWVzIG9mIHRoZSB0YXJnZXQgdGhhdCBhcmUgbm90IGluY2x1ZGVkXG4gICAqIGluIHRoZSB0cmFwIHJlc3VsdCBnaXZlIHJpc2UgdG8gYSBUeXBlRXJyb3IuIEFzIHN1Y2gsIHdlIGNoZWNrIHdoZXRoZXIgdGhlXG4gICAqIHJldHVybmVkIHJlc3VsdCBjb250YWlucyBhdCBsZWFzdCBhbGwgc2VhbGVkIHByb3BlcnRpZXMgb2YgdGhlIHRhcmdldFxuICAgKiBvYmplY3QuXG4gICAqXG4gICAqIEFkZGl0aW9uYWxseSwgdGhlIHRyYXAgcmVzdWx0IGlzIG5vcm1hbGl6ZWQuXG4gICAqIEluc3RlYWQgb2YgcmV0dXJuaW5nIHRoZSB0cmFwIHJlc3VsdCBkaXJlY3RseTpcbiAgICogIC0gY3JlYXRlIGFuZCByZXR1cm4gYSBmcmVzaCBBcnJheSxcbiAgICogIC0gb2Ygd2hpY2ggZWFjaCBlbGVtZW50IGlzIGNvZXJjZWQgdG8gYSBTdHJpbmdcbiAgICpcbiAgICogVGhpcyB0cmFwIGlzIGNhbGxlZCBhLm8uIGJ5IFJlZmxlY3Qub3duS2V5cywgT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXNcbiAgICogYW5kIE9iamVjdC5rZXlzICh0aGUgbGF0dGVyIGZpbHRlcnMgb3V0IG9ubHkgdGhlIGVudW1lcmFibGUgb3duIHByb3BlcnRpZXMpLlxuICAgKi9cbiAgb3duS2V5czogZnVuY3Rpb24oKSB7XG4gICAgdmFyIHRyYXAgPSB0aGlzLmdldFRyYXAoXCJvd25LZXlzXCIpO1xuICAgIGlmICh0cmFwID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIGRlZmF1bHQgZm9yd2FyZGluZyBiZWhhdmlvclxuICAgICAgcmV0dXJuIFJlZmxlY3Qub3duS2V5cyh0aGlzLnRhcmdldCk7XG4gICAgfVxuXG4gICAgdmFyIHRyYXBSZXN1bHQgPSB0cmFwLmNhbGwodGhpcy5oYW5kbGVyLCB0aGlzLnRhcmdldCk7XG5cbiAgICAvLyBwcm9wTmFtZXMgaXMgdXNlZCBhcyBhIHNldCBvZiBzdHJpbmdzXG4gICAgdmFyIHByb3BOYW1lcyA9IE9iamVjdC5jcmVhdGUobnVsbCk7XG4gICAgdmFyIG51bVByb3BzID0gK3RyYXBSZXN1bHQubGVuZ3RoO1xuICAgIHZhciByZXN1bHQgPSBuZXcgQXJyYXkobnVtUHJvcHMpO1xuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBudW1Qcm9wczsgaSsrKSB7XG4gICAgICB2YXIgcyA9IFN0cmluZyh0cmFwUmVzdWx0W2ldKTtcbiAgICAgIGlmICghT2JqZWN0LmlzRXh0ZW5zaWJsZSh0aGlzLnRhcmdldCkgJiYgIWlzRml4ZWQocywgdGhpcy50YXJnZXQpKSB7XG4gICAgICAgIC8vIG5vbi1leHRlbnNpYmxlIHByb3hpZXMgZG9uJ3QgdG9sZXJhdGUgbmV3IG93biBwcm9wZXJ0eSBuYW1lc1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwib3duS2V5cyB0cmFwIGNhbm5vdCBsaXN0IGEgbmV3IFwiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwicHJvcGVydHkgJ1wiK3MrXCInIG9uIGEgbm9uLWV4dGVuc2libGUgb2JqZWN0XCIpO1xuICAgICAgfVxuXG4gICAgICBwcm9wTmFtZXNbc10gPSB0cnVlO1xuICAgICAgcmVzdWx0W2ldID0gcztcbiAgICB9XG5cbiAgICB2YXIgb3duUHJvcHMgPSBPYmplY3RfZ2V0T3duUHJvcGVydHlOYW1lcyh0aGlzLnRhcmdldCk7XG4gICAgdmFyIHRhcmdldCA9IHRoaXMudGFyZ2V0O1xuICAgIG93blByb3BzLmZvckVhY2goZnVuY3Rpb24gKG93blByb3ApIHtcbiAgICAgIGlmICghcHJvcE5hbWVzW293blByb3BdKSB7XG4gICAgICAgIGlmIChpc1NlYWxlZChvd25Qcm9wLCB0YXJnZXQpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIm93bktleXMgdHJhcCBmYWlsZWQgdG8gaW5jbHVkZSBcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibm9uLWNvbmZpZ3VyYWJsZSBwcm9wZXJ0eSAnXCIrb3duUHJvcCtcIidcIik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFPYmplY3QuaXNFeHRlbnNpYmxlKHRhcmdldCkgJiZcbiAgICAgICAgICAgIGlzRml4ZWQob3duUHJvcCwgdGFyZ2V0KSkge1xuICAgICAgICAgICAgLy8gaWYgaGFuZGxlciBpcyBhbGxvd2VkIHRvIHJlcG9ydCBvd25Qcm9wIGFzIG5vbi1leGlzdGVudCxcbiAgICAgICAgICAgIC8vIHdlIGNhbm5vdCBndWFyYW50ZWUgdGhhdCBpdCB3aWxsIG5ldmVyIGxhdGVyIHJlcG9ydCBpdCBhc1xuICAgICAgICAgICAgLy8gZXhpc3RlbnQuIE9uY2UgYSBwcm9wZXJ0eSBoYXMgYmVlbiByZXBvcnRlZCBhcyBub24tZXhpc3RlbnRcbiAgICAgICAgICAgIC8vIG9uIGEgbm9uLWV4dGVuc2libGUgb2JqZWN0LCBpdCBzaG91bGQgZm9yZXZlciBiZSByZXBvcnRlZCBhc1xuICAgICAgICAgICAgLy8gbm9uLWV4aXN0ZW50XG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwib3duS2V5cyB0cmFwIGNhbm5vdCByZXBvcnQgZXhpc3Rpbmcgb3duIHByb3BlcnR5ICdcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3duUHJvcCtcIicgYXMgbm9uLWV4aXN0ZW50IG9uIGEgbm9uLWV4dGVuc2libGUgb2JqZWN0XCIpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9LFxuXG4gIC8qKlxuICAgKiBDaGVja3Mgd2hldGhlciB0aGUgdHJhcCByZXN1bHQgaXMgY29uc2lzdGVudCB3aXRoIHRoZSBzdGF0ZSBvZiB0aGVcbiAgICogd3JhcHBlZCB0YXJnZXQuXG4gICAqL1xuICBpc0V4dGVuc2libGU6IGZ1bmN0aW9uKCkge1xuICAgIHZhciB0cmFwID0gdGhpcy5nZXRUcmFwKFwiaXNFeHRlbnNpYmxlXCIpO1xuICAgIGlmICh0cmFwID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIGRlZmF1bHQgZm9yd2FyZGluZyBiZWhhdmlvclxuICAgICAgcmV0dXJuIFJlZmxlY3QuaXNFeHRlbnNpYmxlKHRoaXMudGFyZ2V0KTtcbiAgICB9XG5cbiAgICB2YXIgcmVzdWx0ID0gdHJhcC5jYWxsKHRoaXMuaGFuZGxlciwgdGhpcy50YXJnZXQpO1xuICAgIHJlc3VsdCA9ICEhcmVzdWx0OyAvLyBjb2VyY2UgdG8gQm9vbGVhblxuICAgIHZhciBzdGF0ZSA9IE9iamVjdF9pc0V4dGVuc2libGUodGhpcy50YXJnZXQpO1xuICAgIGlmIChyZXN1bHQgIT09IHN0YXRlKSB7XG4gICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJjYW5ub3QgcmVwb3J0IG5vbi1leHRlbnNpYmxlIG9iamVjdCBhcyBleHRlbnNpYmxlOiBcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy50YXJnZXQpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImNhbm5vdCByZXBvcnQgZXh0ZW5zaWJsZSBvYmplY3QgYXMgbm9uLWV4dGVuc2libGU6IFwiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRhcmdldCk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBzdGF0ZTtcbiAgfSxcblxuICAvKipcbiAgICogQ2hlY2sgd2hldGhlciB0aGUgdHJhcCByZXN1bHQgY29ycmVzcG9uZHMgdG8gdGhlIHRhcmdldCdzIFtbUHJvdG90eXBlXV1cbiAgICovXG4gIGdldFByb3RvdHlwZU9mOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdHJhcCA9IHRoaXMuZ2V0VHJhcChcImdldFByb3RvdHlwZU9mXCIpO1xuICAgIGlmICh0cmFwID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIGRlZmF1bHQgZm9yd2FyZGluZyBiZWhhdmlvclxuICAgICAgcmV0dXJuIFJlZmxlY3QuZ2V0UHJvdG90eXBlT2YodGhpcy50YXJnZXQpO1xuICAgIH1cblxuICAgIHZhciBhbGxlZ2VkUHJvdG8gPSB0cmFwLmNhbGwodGhpcy5oYW5kbGVyLCB0aGlzLnRhcmdldCk7XG5cbiAgICBpZiAoIU9iamVjdF9pc0V4dGVuc2libGUodGhpcy50YXJnZXQpKSB7XG4gICAgICB2YXIgYWN0dWFsUHJvdG8gPSBPYmplY3RfZ2V0UHJvdG90eXBlT2YodGhpcy50YXJnZXQpO1xuICAgICAgaWYgKCFzYW1lVmFsdWUoYWxsZWdlZFByb3RvLCBhY3R1YWxQcm90bykpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcInByb3RvdHlwZSB2YWx1ZSBkb2VzIG5vdCBtYXRjaDogXCIgKyB0aGlzLnRhcmdldCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGFsbGVnZWRQcm90bztcbiAgfSxcblxuICAvKipcbiAgICogSWYgdGFyZ2V0IGlzIG5vbi1leHRlbnNpYmxlIGFuZCBzZXRQcm90b3R5cGVPZiB0cmFwIHJldHVybnMgdHJ1ZSxcbiAgICogY2hlY2sgd2hldGhlciB0aGUgdHJhcCByZXN1bHQgY29ycmVzcG9uZHMgdG8gdGhlIHRhcmdldCdzIFtbUHJvdG90eXBlXV1cbiAgICovXG4gIHNldFByb3RvdHlwZU9mOiBmdW5jdGlvbihuZXdQcm90bykge1xuICAgIHZhciB0cmFwID0gdGhpcy5nZXRUcmFwKFwic2V0UHJvdG90eXBlT2ZcIik7XG4gICAgaWYgKHRyYXAgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gZGVmYXVsdCBmb3J3YXJkaW5nIGJlaGF2aW9yXG4gICAgICByZXR1cm4gUmVmbGVjdC5zZXRQcm90b3R5cGVPZih0aGlzLnRhcmdldCwgbmV3UHJvdG8pO1xuICAgIH1cblxuICAgIHZhciBzdWNjZXNzID0gdHJhcC5jYWxsKHRoaXMuaGFuZGxlciwgdGhpcy50YXJnZXQsIG5ld1Byb3RvKTtcblxuICAgIHN1Y2Nlc3MgPSAhIXN1Y2Nlc3M7XG4gICAgaWYgKHN1Y2Nlc3MgJiYgIU9iamVjdF9pc0V4dGVuc2libGUodGhpcy50YXJnZXQpKSB7XG4gICAgICB2YXIgYWN0dWFsUHJvdG8gPSBPYmplY3RfZ2V0UHJvdG90eXBlT2YodGhpcy50YXJnZXQpO1xuICAgICAgaWYgKCFzYW1lVmFsdWUobmV3UHJvdG8sIGFjdHVhbFByb3RvKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwicHJvdG90eXBlIHZhbHVlIGRvZXMgbm90IG1hdGNoOiBcIiArIHRoaXMudGFyZ2V0KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc3VjY2VzcztcbiAgfSxcblxuICAvKipcbiAgICogSW4gdGhlIGRpcmVjdCBwcm94aWVzIGRlc2lnbiB3aXRoIHJlZmFjdG9yZWQgcHJvdG90eXBlIGNsaW1iaW5nLFxuICAgKiB0aGlzIHRyYXAgaXMgZGVwcmVjYXRlZC4gRm9yIHByb3hpZXMtYXMtcHJvdG90eXBlcywgZm9yLWluIHdpbGxcbiAgICogY2FsbCB0aGUgZW51bWVyYXRlKCkgdHJhcC4gSWYgdGhhdCB0cmFwIGlzIG5vdCBkZWZpbmVkLCB0aGVcbiAgICogb3BlcmF0aW9uIGlzIGZvcndhcmRlZCB0byB0aGUgdGFyZ2V0LCBubyBtb3JlIGZhbGxiYWNrIG9uIHRoaXNcbiAgICogZnVuZGFtZW50YWwgdHJhcC5cbiAgICovXG4gIGdldFByb3BlcnR5TmFtZXM6IGZ1bmN0aW9uKCkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJnZXRQcm9wZXJ0eU5hbWVzIHRyYXAgaXMgZGVwcmVjYXRlZFwiKTtcbiAgfSxcblxuICAvLyA9PT0gZGVyaXZlZCB0cmFwcyA9PT1cblxuICAvKipcbiAgICogSWYgbmFtZSBkZW5vdGVzIGEgZml4ZWQgcHJvcGVydHksIGNoZWNrIHdoZXRoZXIgdGhlIHRyYXAgcmV0dXJucyB0cnVlLlxuICAgKi9cbiAgaGFzOiBmdW5jdGlvbihuYW1lKSB7XG4gICAgdmFyIHRyYXAgPSB0aGlzLmdldFRyYXAoXCJoYXNcIik7XG4gICAgaWYgKHRyYXAgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gZGVmYXVsdCBmb3J3YXJkaW5nIGJlaGF2aW9yXG4gICAgICByZXR1cm4gUmVmbGVjdC5oYXModGhpcy50YXJnZXQsIG5hbWUpO1xuICAgIH1cblxuICAgIG5hbWUgPSBTdHJpbmcobmFtZSk7XG4gICAgdmFyIHJlcyA9IHRyYXAuY2FsbCh0aGlzLmhhbmRsZXIsIHRoaXMudGFyZ2V0LCBuYW1lKTtcbiAgICByZXMgPSAhIXJlczsgLy8gY29lcmNlIHRvIEJvb2xlYW5cblxuICAgIGlmIChyZXMgPT09IGZhbHNlKSB7XG4gICAgICBpZiAoaXNTZWFsZWQobmFtZSwgdGhpcy50YXJnZXQpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJjYW5ub3QgcmVwb3J0IGV4aXN0aW5nIG5vbi1jb25maWd1cmFibGUgb3duIFwiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwicHJvcGVydHkgJ1wiKyBuYW1lICsgXCInIGFzIGEgbm9uLWV4aXN0ZW50IFwiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwicHJvcGVydHlcIik7XG4gICAgICB9XG4gICAgICBpZiAoIU9iamVjdC5pc0V4dGVuc2libGUodGhpcy50YXJnZXQpICYmXG4gICAgICAgICAgaXNGaXhlZChuYW1lLCB0aGlzLnRhcmdldCkpIHtcbiAgICAgICAgICAvLyBpZiBoYW5kbGVyIGlzIGFsbG93ZWQgdG8gcmV0dXJuIGZhbHNlLCB3ZSBjYW5ub3QgZ3VhcmFudGVlXG4gICAgICAgICAgLy8gdGhhdCBpdCB3aWxsIG5vdCByZXR1cm4gdHJ1ZSBmb3IgdGhpcyBwcm9wZXJ0eSBsYXRlci5cbiAgICAgICAgICAvLyBPbmNlIGEgcHJvcGVydHkgaGFzIGJlZW4gcmVwb3J0ZWQgYXMgbm9uLWV4aXN0ZW50IG9uIGEgbm9uLWV4dGVuc2libGVcbiAgICAgICAgICAvLyBvYmplY3QsIGl0IHNob3VsZCBmb3JldmVyIGJlIHJlcG9ydGVkIGFzIG5vbi1leGlzdGVudFxuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJjYW5ub3QgcmVwb3J0IGV4aXN0aW5nIG93biBwcm9wZXJ0eSAnXCIrbmFtZStcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiJyBhcyBub24tZXhpc3RlbnQgb24gYSBub24tZXh0ZW5zaWJsZSBvYmplY3RcIik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gaWYgcmVzID09PSB0cnVlLCB3ZSBkb24ndCBuZWVkIHRvIGNoZWNrIGZvciBleHRlbnNpYmlsaXR5XG4gICAgLy8gZXZlbiBmb3IgYSBub24tZXh0ZW5zaWJsZSBwcm94eSB0aGF0IGhhcyBubyBvd24gbmFtZSBwcm9wZXJ0eSxcbiAgICAvLyB0aGUgcHJvcGVydHkgbWF5IGhhdmUgYmVlbiBpbmhlcml0ZWRcblxuICAgIHJldHVybiByZXM7XG4gIH0sXG5cbiAgLyoqXG4gICAqIElmIG5hbWUgZGVub3RlcyBhIGZpeGVkIG5vbi1jb25maWd1cmFibGUsIG5vbi13cml0YWJsZSBkYXRhIHByb3BlcnR5LFxuICAgKiBjaGVjayBpdHMgcmV0dXJuIHZhbHVlIGFnYWluc3QgdGhlIHByZXZpb3VzbHkgYXNzZXJ0ZWQgdmFsdWUgb2YgdGhlXG4gICAqIGZpeGVkIHByb3BlcnR5LlxuICAgKi9cbiAgZ2V0OiBmdW5jdGlvbihyZWNlaXZlciwgbmFtZSkge1xuXG4gICAgLy8gZXhwZXJpbWVudGFsIHN1cHBvcnQgZm9yIGludm9rZSgpIHRyYXAgb24gcGxhdGZvcm1zIHRoYXRcbiAgICAvLyBzdXBwb3J0IF9fbm9TdWNoTWV0aG9kX19cbiAgICAvKlxuICAgIGlmIChuYW1lID09PSAnX19ub1N1Y2hNZXRob2RfXycpIHtcbiAgICAgIHZhciBoYW5kbGVyID0gdGhpcztcbiAgICAgIHJldHVybiBmdW5jdGlvbihuYW1lLCBhcmdzKSB7XG4gICAgICAgIHJldHVybiBoYW5kbGVyLmludm9rZShyZWNlaXZlciwgbmFtZSwgYXJncyk7XG4gICAgICB9XG4gICAgfVxuICAgICovXG5cbiAgICB2YXIgdHJhcCA9IHRoaXMuZ2V0VHJhcChcImdldFwiKTtcbiAgICBpZiAodHJhcCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBkZWZhdWx0IGZvcndhcmRpbmcgYmVoYXZpb3JcbiAgICAgIHJldHVybiBSZWZsZWN0LmdldCh0aGlzLnRhcmdldCwgbmFtZSwgcmVjZWl2ZXIpO1xuICAgIH1cblxuICAgIG5hbWUgPSBTdHJpbmcobmFtZSk7XG4gICAgdmFyIHJlcyA9IHRyYXAuY2FsbCh0aGlzLmhhbmRsZXIsIHRoaXMudGFyZ2V0LCBuYW1lLCByZWNlaXZlcik7XG5cbiAgICB2YXIgZml4ZWREZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0aGlzLnRhcmdldCwgbmFtZSk7XG4gICAgLy8gY2hlY2sgY29uc2lzdGVuY3kgb2YgdGhlIHJldHVybmVkIHZhbHVlXG4gICAgaWYgKGZpeGVkRGVzYyAhPT0gdW5kZWZpbmVkKSB7IC8vIGdldHRpbmcgYW4gZXhpc3RpbmcgcHJvcGVydHlcbiAgICAgIGlmIChpc0RhdGFEZXNjcmlwdG9yKGZpeGVkRGVzYykgJiZcbiAgICAgICAgICBmaXhlZERlc2MuY29uZmlndXJhYmxlID09PSBmYWxzZSAmJlxuICAgICAgICAgIGZpeGVkRGVzYy53cml0YWJsZSA9PT0gZmFsc2UpIHsgLy8gb3duIGZyb3plbiBkYXRhIHByb3BlcnR5XG4gICAgICAgIGlmICghc2FtZVZhbHVlKHJlcywgZml4ZWREZXNjLnZhbHVlKSkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJjYW5ub3QgcmVwb3J0IGluY29uc2lzdGVudCB2YWx1ZSBmb3IgXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIm5vbi13cml0YWJsZSwgbm9uLWNvbmZpZ3VyYWJsZSBwcm9wZXJ0eSAnXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuYW1lK1wiJ1wiKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHsgLy8gaXQncyBhbiBhY2Nlc3NvciBwcm9wZXJ0eVxuICAgICAgICBpZiAoaXNBY2Nlc3NvckRlc2NyaXB0b3IoZml4ZWREZXNjKSAmJlxuICAgICAgICAgICAgZml4ZWREZXNjLmNvbmZpZ3VyYWJsZSA9PT0gZmFsc2UgJiZcbiAgICAgICAgICAgIGZpeGVkRGVzYy5nZXQgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgIGlmIChyZXMgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIm11c3QgcmVwb3J0IHVuZGVmaW5lZCBmb3Igbm9uLWNvbmZpZ3VyYWJsZSBcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJhY2Nlc3NvciBwcm9wZXJ0eSAnXCIrbmFtZStcIicgd2l0aG91dCBnZXR0ZXJcIik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJlcztcbiAgfSxcblxuICAvKipcbiAgICogSWYgbmFtZSBkZW5vdGVzIGEgZml4ZWQgbm9uLWNvbmZpZ3VyYWJsZSwgbm9uLXdyaXRhYmxlIGRhdGEgcHJvcGVydHksXG4gICAqIGNoZWNrIHRoYXQgdGhlIHRyYXAgcmVqZWN0cyB0aGUgYXNzaWdubWVudC5cbiAgICovXG4gIHNldDogZnVuY3Rpb24ocmVjZWl2ZXIsIG5hbWUsIHZhbCkge1xuICAgIHZhciB0cmFwID0gdGhpcy5nZXRUcmFwKFwic2V0XCIpO1xuICAgIGlmICh0cmFwID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIGRlZmF1bHQgZm9yd2FyZGluZyBiZWhhdmlvclxuICAgICAgcmV0dXJuIFJlZmxlY3Quc2V0KHRoaXMudGFyZ2V0LCBuYW1lLCB2YWwsIHJlY2VpdmVyKTtcbiAgICB9XG5cbiAgICBuYW1lID0gU3RyaW5nKG5hbWUpO1xuICAgIHZhciByZXMgPSB0cmFwLmNhbGwodGhpcy5oYW5kbGVyLCB0aGlzLnRhcmdldCwgbmFtZSwgdmFsLCByZWNlaXZlcik7XG4gICAgcmVzID0gISFyZXM7IC8vIGNvZXJjZSB0byBCb29sZWFuXG5cbiAgICAvLyBpZiBzdWNjZXNzIGlzIHJlcG9ydGVkLCBjaGVjayB3aGV0aGVyIHByb3BlcnR5IGlzIHRydWx5IGFzc2lnbmFibGVcbiAgICBpZiAocmVzID09PSB0cnVlKSB7XG4gICAgICB2YXIgZml4ZWREZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0aGlzLnRhcmdldCwgbmFtZSk7XG4gICAgICBpZiAoZml4ZWREZXNjICE9PSB1bmRlZmluZWQpIHsgLy8gc2V0dGluZyBhbiBleGlzdGluZyBwcm9wZXJ0eVxuICAgICAgICBpZiAoaXNEYXRhRGVzY3JpcHRvcihmaXhlZERlc2MpICYmXG4gICAgICAgICAgICBmaXhlZERlc2MuY29uZmlndXJhYmxlID09PSBmYWxzZSAmJlxuICAgICAgICAgICAgZml4ZWREZXNjLndyaXRhYmxlID09PSBmYWxzZSkge1xuICAgICAgICAgIGlmICghc2FtZVZhbHVlKHZhbCwgZml4ZWREZXNjLnZhbHVlKSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImNhbm5vdCBzdWNjZXNzZnVsbHkgYXNzaWduIHRvIGEgXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwibm9uLXdyaXRhYmxlLCBub24tY29uZmlndXJhYmxlIHByb3BlcnR5ICdcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmFtZStcIidcIik7XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlmIChpc0FjY2Vzc29yRGVzY3JpcHRvcihmaXhlZERlc2MpICYmXG4gICAgICAgICAgICAgIGZpeGVkRGVzYy5jb25maWd1cmFibGUgPT09IGZhbHNlICYmIC8vIG5vbi1jb25maWd1cmFibGVcbiAgICAgICAgICAgICAgZml4ZWREZXNjLnNldCA9PT0gdW5kZWZpbmVkKSB7ICAgICAgLy8gYWNjZXNzb3Igd2l0aCB1bmRlZmluZWQgc2V0dGVyXG4gICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwic2V0dGluZyBhIHByb3BlcnR5ICdcIituYW1lK1wiJyB0aGF0IGhhcyBcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCIgb25seSBhIGdldHRlclwiKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gcmVzO1xuICB9LFxuXG4gIC8qKlxuICAgKiBBbnkgb3duIGVudW1lcmFibGUgbm9uLWNvbmZpZ3VyYWJsZSBwcm9wZXJ0aWVzIG9mIHRoZSB0YXJnZXQgdGhhdCBhcmUgbm90XG4gICAqIGluY2x1ZGVkIGluIHRoZSB0cmFwIHJlc3VsdCBnaXZlIHJpc2UgdG8gYSBUeXBlRXJyb3IuIEFzIHN1Y2gsIHdlIGNoZWNrXG4gICAqIHdoZXRoZXIgdGhlIHJldHVybmVkIHJlc3VsdCBjb250YWlucyBhdCBsZWFzdCBhbGwgc2VhbGVkIGVudW1lcmFibGUgcHJvcGVydGllc1xuICAgKiBvZiB0aGUgdGFyZ2V0IG9iamVjdC5cbiAgICpcbiAgICogVGhlIHRyYXAgc2hvdWxkIHJldHVybiBhbiBpdGVyYXRvci5cbiAgICpcbiAgICogSG93ZXZlciwgYXMgaW1wbGVtZW50YXRpb25zIG9mIHByZS1kaXJlY3QgcHJveGllcyBzdGlsbCBleHBlY3QgZW51bWVyYXRlXG4gICAqIHRvIHJldHVybiBhbiBhcnJheSBvZiBzdHJpbmdzLCB3ZSBjb252ZXJ0IHRoZSBpdGVyYXRvciBpbnRvIGFuIGFycmF5LlxuICAgKi9cbiAgZW51bWVyYXRlOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdHJhcCA9IHRoaXMuZ2V0VHJhcChcImVudW1lcmF0ZVwiKTtcbiAgICBpZiAodHJhcCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBkZWZhdWx0IGZvcndhcmRpbmcgYmVoYXZpb3JcbiAgICAgIHZhciB0cmFwUmVzdWx0ID0gUmVmbGVjdC5lbnVtZXJhdGUodGhpcy50YXJnZXQpO1xuICAgICAgdmFyIHJlc3VsdCA9IFtdO1xuICAgICAgdmFyIG54dCA9IHRyYXBSZXN1bHQubmV4dCgpO1xuICAgICAgd2hpbGUgKCFueHQuZG9uZSkge1xuICAgICAgICByZXN1bHQucHVzaChTdHJpbmcobnh0LnZhbHVlKSk7XG4gICAgICAgIG54dCA9IHRyYXBSZXN1bHQubmV4dCgpO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cbiAgICB2YXIgdHJhcFJlc3VsdCA9IHRyYXAuY2FsbCh0aGlzLmhhbmRsZXIsIHRoaXMudGFyZ2V0KTtcbiAgICBcbiAgICBpZiAodHJhcFJlc3VsdCA9PT0gbnVsbCB8fFxuICAgICAgICB0cmFwUmVzdWx0ID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgdHJhcFJlc3VsdC5uZXh0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJlbnVtZXJhdGUgdHJhcCBzaG91bGQgcmV0dXJuIGFuIGl0ZXJhdG9yLCBnb3Q6IFwiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICB0cmFwUmVzdWx0KTsgICAgXG4gICAgfVxuICAgIFxuICAgIC8vIHByb3BOYW1lcyBpcyB1c2VkIGFzIGEgc2V0IG9mIHN0cmluZ3NcbiAgICB2YXIgcHJvcE5hbWVzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICBcbiAgICAvLyB2YXIgbnVtUHJvcHMgPSArdHJhcFJlc3VsdC5sZW5ndGg7XG4gICAgdmFyIHJlc3VsdCA9IFtdOyAvLyBuZXcgQXJyYXkobnVtUHJvcHMpO1xuICAgIFxuICAgIC8vIHRyYXBSZXN1bHQgaXMgc3VwcG9zZWQgdG8gYmUgYW4gaXRlcmF0b3JcbiAgICAvLyBkcmFpbiBpdGVyYXRvciB0byBhcnJheSBhcyBjdXJyZW50IGltcGxlbWVudGF0aW9ucyBzdGlsbCBleHBlY3RcbiAgICAvLyBlbnVtZXJhdGUgdG8gcmV0dXJuIGFuIGFycmF5IG9mIHN0cmluZ3NcbiAgICB2YXIgbnh0ID0gdHJhcFJlc3VsdC5uZXh0KCk7XG4gICAgXG4gICAgd2hpbGUgKCFueHQuZG9uZSkge1xuICAgICAgdmFyIHMgPSBTdHJpbmcobnh0LnZhbHVlKTtcbiAgICAgIGlmIChwcm9wTmFtZXNbc10pIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImVudW1lcmF0ZSB0cmFwIGNhbm5vdCBsaXN0IGEgXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJkdXBsaWNhdGUgcHJvcGVydHkgJ1wiK3MrXCInXCIpO1xuICAgICAgfVxuICAgICAgcHJvcE5hbWVzW3NdID0gdHJ1ZTtcbiAgICAgIHJlc3VsdC5wdXNoKHMpO1xuICAgICAgbnh0ID0gdHJhcFJlc3VsdC5uZXh0KCk7XG4gICAgfVxuICAgIFxuICAgIC8qZm9yICh2YXIgaSA9IDA7IGkgPCBudW1Qcm9wczsgaSsrKSB7XG4gICAgICB2YXIgcyA9IFN0cmluZyh0cmFwUmVzdWx0W2ldKTtcbiAgICAgIGlmIChwcm9wTmFtZXNbc10pIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImVudW1lcmF0ZSB0cmFwIGNhbm5vdCBsaXN0IGEgXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJkdXBsaWNhdGUgcHJvcGVydHkgJ1wiK3MrXCInXCIpO1xuICAgICAgfVxuXG4gICAgICBwcm9wTmFtZXNbc10gPSB0cnVlO1xuICAgICAgcmVzdWx0W2ldID0gcztcbiAgICB9ICovXG5cbiAgICB2YXIgb3duRW51bWVyYWJsZVByb3BzID0gT2JqZWN0LmtleXModGhpcy50YXJnZXQpO1xuICAgIHZhciB0YXJnZXQgPSB0aGlzLnRhcmdldDtcbiAgICBvd25FbnVtZXJhYmxlUHJvcHMuZm9yRWFjaChmdW5jdGlvbiAob3duRW51bWVyYWJsZVByb3ApIHtcbiAgICAgIGlmICghcHJvcE5hbWVzW293bkVudW1lcmFibGVQcm9wXSkge1xuICAgICAgICBpZiAoaXNTZWFsZWQob3duRW51bWVyYWJsZVByb3AsIHRhcmdldCkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiZW51bWVyYXRlIHRyYXAgZmFpbGVkIHRvIGluY2x1ZGUgXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIm5vbi1jb25maWd1cmFibGUgZW51bWVyYWJsZSBwcm9wZXJ0eSAnXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvd25FbnVtZXJhYmxlUHJvcCtcIidcIik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFPYmplY3QuaXNFeHRlbnNpYmxlKHRhcmdldCkgJiZcbiAgICAgICAgICAgIGlzRml4ZWQob3duRW51bWVyYWJsZVByb3AsIHRhcmdldCkpIHtcbiAgICAgICAgICAgIC8vIGlmIGhhbmRsZXIgaXMgYWxsb3dlZCBub3QgdG8gcmVwb3J0IG93bkVudW1lcmFibGVQcm9wIGFzIGFuIG93blxuICAgICAgICAgICAgLy8gcHJvcGVydHksIHdlIGNhbm5vdCBndWFyYW50ZWUgdGhhdCBpdCB3aWxsIG5ldmVyIHJlcG9ydCBpdCBhc1xuICAgICAgICAgICAgLy8gYW4gb3duIHByb3BlcnR5IGxhdGVyLiBPbmNlIGEgcHJvcGVydHkgaGFzIGJlZW4gcmVwb3J0ZWQgYXNcbiAgICAgICAgICAgIC8vIG5vbi1leGlzdGVudCBvbiBhIG5vbi1leHRlbnNpYmxlIG9iamVjdCwgaXQgc2hvdWxkIGZvcmV2ZXIgYmVcbiAgICAgICAgICAgIC8vIHJlcG9ydGVkIGFzIG5vbi1leGlzdGVudFxuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImNhbm5vdCByZXBvcnQgZXhpc3Rpbmcgb3duIHByb3BlcnR5ICdcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3duRW51bWVyYWJsZVByb3ArXCInIGFzIG5vbi1leGlzdGVudCBvbiBhIFwiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIm5vbi1leHRlbnNpYmxlIG9iamVjdFwiKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSxcblxuICAvKipcbiAgICogVGhlIGl0ZXJhdGUgdHJhcCBpcyBkZXByZWNhdGVkIGJ5IHRoZSBlbnVtZXJhdGUgdHJhcC5cbiAgICovXG4gIGl0ZXJhdGU6IFZhbGlkYXRvci5wcm90b3R5cGUuZW51bWVyYXRlLFxuXG4gIC8qKlxuICAgKiBBbnkgb3duIG5vbi1jb25maWd1cmFibGUgcHJvcGVydGllcyBvZiB0aGUgdGFyZ2V0IHRoYXQgYXJlIG5vdCBpbmNsdWRlZFxuICAgKiBpbiB0aGUgdHJhcCByZXN1bHQgZ2l2ZSByaXNlIHRvIGEgVHlwZUVycm9yLiBBcyBzdWNoLCB3ZSBjaGVjayB3aGV0aGVyIHRoZVxuICAgKiByZXR1cm5lZCByZXN1bHQgY29udGFpbnMgYXQgbGVhc3QgYWxsIHNlYWxlZCBwcm9wZXJ0aWVzIG9mIHRoZSB0YXJnZXRcbiAgICogb2JqZWN0LlxuICAgKlxuICAgKiBUaGUgdHJhcCByZXN1bHQgaXMgbm9ybWFsaXplZC5cbiAgICogVGhlIHRyYXAgcmVzdWx0IGlzIG5vdCByZXR1cm5lZCBkaXJlY3RseS4gSW5zdGVhZDpcbiAgICogIC0gY3JlYXRlIGFuZCByZXR1cm4gYSBmcmVzaCBBcnJheSxcbiAgICogIC0gb2Ygd2hpY2ggZWFjaCBlbGVtZW50IGlzIGNvZXJjZWQgdG8gU3RyaW5nLFxuICAgKiAgLSB3aGljaCBkb2VzIG5vdCBjb250YWluIGR1cGxpY2F0ZXNcbiAgICpcbiAgICogRklYTUU6IGtleXMgdHJhcCBpcyBkZXByZWNhdGVkXG4gICAqL1xuICAvKlxuICBrZXlzOiBmdW5jdGlvbigpIHtcbiAgICB2YXIgdHJhcCA9IHRoaXMuZ2V0VHJhcChcImtleXNcIik7XG4gICAgaWYgKHRyYXAgPT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gZGVmYXVsdCBmb3J3YXJkaW5nIGJlaGF2aW9yXG4gICAgICByZXR1cm4gUmVmbGVjdC5rZXlzKHRoaXMudGFyZ2V0KTtcbiAgICB9XG5cbiAgICB2YXIgdHJhcFJlc3VsdCA9IHRyYXAuY2FsbCh0aGlzLmhhbmRsZXIsIHRoaXMudGFyZ2V0KTtcblxuICAgIC8vIHByb3BOYW1lcyBpcyB1c2VkIGFzIGEgc2V0IG9mIHN0cmluZ3NcbiAgICB2YXIgcHJvcE5hbWVzID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiAgICB2YXIgbnVtUHJvcHMgPSArdHJhcFJlc3VsdC5sZW5ndGg7XG4gICAgdmFyIHJlc3VsdCA9IG5ldyBBcnJheShudW1Qcm9wcyk7XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG51bVByb3BzOyBpKyspIHtcbiAgICAgdmFyIHMgPSBTdHJpbmcodHJhcFJlc3VsdFtpXSk7XG4gICAgIGlmIChwcm9wTmFtZXNbc10pIHtcbiAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwia2V5cyB0cmFwIGNhbm5vdCBsaXN0IGEgXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICBcImR1cGxpY2F0ZSBwcm9wZXJ0eSAnXCIrcytcIidcIik7XG4gICAgIH1cbiAgICAgaWYgKCFPYmplY3QuaXNFeHRlbnNpYmxlKHRoaXMudGFyZ2V0KSAmJiAhaXNGaXhlZChzLCB0aGlzLnRhcmdldCkpIHtcbiAgICAgICAvLyBub24tZXh0ZW5zaWJsZSBwcm94aWVzIGRvbid0IHRvbGVyYXRlIG5ldyBvd24gcHJvcGVydHkgbmFtZXNcbiAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwia2V5cyB0cmFwIGNhbm5vdCBsaXN0IGEgbmV3IFwiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJwcm9wZXJ0eSAnXCIrcytcIicgb24gYSBub24tZXh0ZW5zaWJsZSBvYmplY3RcIik7XG4gICAgIH1cblxuICAgICBwcm9wTmFtZXNbc10gPSB0cnVlO1xuICAgICByZXN1bHRbaV0gPSBzO1xuICAgIH1cblxuICAgIHZhciBvd25FbnVtZXJhYmxlUHJvcHMgPSBPYmplY3Qua2V5cyh0aGlzLnRhcmdldCk7XG4gICAgdmFyIHRhcmdldCA9IHRoaXMudGFyZ2V0O1xuICAgIG93bkVudW1lcmFibGVQcm9wcy5mb3JFYWNoKGZ1bmN0aW9uIChvd25FbnVtZXJhYmxlUHJvcCkge1xuICAgICAgaWYgKCFwcm9wTmFtZXNbb3duRW51bWVyYWJsZVByb3BdKSB7XG4gICAgICAgIGlmIChpc1NlYWxlZChvd25FbnVtZXJhYmxlUHJvcCwgdGFyZ2V0KSkge1xuICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJrZXlzIHRyYXAgZmFpbGVkIHRvIGluY2x1ZGUgXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIm5vbi1jb25maWd1cmFibGUgZW51bWVyYWJsZSBwcm9wZXJ0eSAnXCIrXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBvd25FbnVtZXJhYmxlUHJvcCtcIidcIik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFPYmplY3QuaXNFeHRlbnNpYmxlKHRhcmdldCkgJiZcbiAgICAgICAgICAgIGlzRml4ZWQob3duRW51bWVyYWJsZVByb3AsIHRhcmdldCkpIHtcbiAgICAgICAgICAgIC8vIGlmIGhhbmRsZXIgaXMgYWxsb3dlZCBub3QgdG8gcmVwb3J0IG93bkVudW1lcmFibGVQcm9wIGFzIGFuIG93blxuICAgICAgICAgICAgLy8gcHJvcGVydHksIHdlIGNhbm5vdCBndWFyYW50ZWUgdGhhdCBpdCB3aWxsIG5ldmVyIHJlcG9ydCBpdCBhc1xuICAgICAgICAgICAgLy8gYW4gb3duIHByb3BlcnR5IGxhdGVyLiBPbmNlIGEgcHJvcGVydHkgaGFzIGJlZW4gcmVwb3J0ZWQgYXNcbiAgICAgICAgICAgIC8vIG5vbi1leGlzdGVudCBvbiBhIG5vbi1leHRlbnNpYmxlIG9iamVjdCwgaXQgc2hvdWxkIGZvcmV2ZXIgYmVcbiAgICAgICAgICAgIC8vIHJlcG9ydGVkIGFzIG5vbi1leGlzdGVudFxuICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImNhbm5vdCByZXBvcnQgZXhpc3Rpbmcgb3duIHByb3BlcnR5ICdcIitcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb3duRW51bWVyYWJsZVByb3ArXCInIGFzIG5vbi1leGlzdGVudCBvbiBhIFwiK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcIm5vbi1leHRlbnNpYmxlIG9iamVjdFwiKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSxcbiAgKi9cbiAgXG4gIC8qKlxuICAgKiBOZXcgdHJhcCB0aGF0IHJlaWZpZXMgW1tDYWxsXV0uXG4gICAqIElmIHRoZSB0YXJnZXQgaXMgYSBmdW5jdGlvbiwgdGhlbiBhIGNhbGwgdG9cbiAgICogICBwcm94eSguLi5hcmdzKVxuICAgKiBUcmlnZ2VycyB0aGlzIHRyYXBcbiAgICovXG4gIGFwcGx5OiBmdW5jdGlvbih0YXJnZXQsIHRoaXNCaW5kaW5nLCBhcmdzKSB7XG4gICAgdmFyIHRyYXAgPSB0aGlzLmdldFRyYXAoXCJhcHBseVwiKTtcbiAgICBpZiAodHJhcCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gUmVmbGVjdC5hcHBseSh0YXJnZXQsIHRoaXNCaW5kaW5nLCBhcmdzKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIHRoaXMudGFyZ2V0ID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIHJldHVybiB0cmFwLmNhbGwodGhpcy5oYW5kbGVyLCB0YXJnZXQsIHRoaXNCaW5kaW5nLCBhcmdzKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImFwcGx5OiBcIisgdGFyZ2V0ICsgXCIgaXMgbm90IGEgZnVuY3Rpb25cIik7XG4gICAgfVxuICB9LFxuXG4gIC8qKlxuICAgKiBOZXcgdHJhcCB0aGF0IHJlaWZpZXMgW1tDb25zdHJ1Y3RdXS5cbiAgICogSWYgdGhlIHRhcmdldCBpcyBhIGZ1bmN0aW9uLCB0aGVuIGEgY2FsbCB0b1xuICAgKiAgIG5ldyBwcm94eSguLi5hcmdzKVxuICAgKiBUcmlnZ2VycyB0aGlzIHRyYXBcbiAgICovXG4gIGNvbnN0cnVjdDogZnVuY3Rpb24odGFyZ2V0LCBhcmdzLCBuZXdUYXJnZXQpIHtcbiAgICB2YXIgdHJhcCA9IHRoaXMuZ2V0VHJhcChcImNvbnN0cnVjdFwiKTtcbiAgICBpZiAodHJhcCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gUmVmbGVjdC5jb25zdHJ1Y3QodGFyZ2V0LCBhcmdzLCBuZXdUYXJnZXQpO1xuICAgIH1cblxuICAgIGlmICh0eXBlb2YgdGFyZ2V0ICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJuZXc6IFwiKyB0YXJnZXQgKyBcIiBpcyBub3QgYSBmdW5jdGlvblwiKTtcbiAgICB9XG5cbiAgICBpZiAobmV3VGFyZ2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIG5ld1RhcmdldCA9IHRhcmdldDtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHR5cGVvZiBuZXdUYXJnZXQgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwibmV3OiBcIisgbmV3VGFyZ2V0ICsgXCIgaXMgbm90IGEgZnVuY3Rpb25cIik7XG4gICAgICB9ICAgICAgXG4gICAgfVxuICAgIHJldHVybiB0cmFwLmNhbGwodGhpcy5oYW5kbGVyLCB0YXJnZXQsIGFyZ3MsIG5ld1RhcmdldCk7XG4gIH1cbn07XG5cbi8vIC0tLS0gZW5kIG9mIHRoZSBWYWxpZGF0b3IgaGFuZGxlciB3cmFwcGVyIGhhbmRsZXIgLS0tLVxuXG4vLyBJbiB3aGF0IGZvbGxvd3MsIGEgJ2RpcmVjdCBwcm94eScgaXMgYSBwcm94eVxuLy8gd2hvc2UgaGFuZGxlciBpcyBhIFZhbGlkYXRvci4gU3VjaCBwcm94aWVzIGNhbiBiZSBtYWRlIG5vbi1leHRlbnNpYmxlLFxuLy8gc2VhbGVkIG9yIGZyb3plbiB3aXRob3V0IGxvc2luZyB0aGUgYWJpbGl0eSB0byB0cmFwLlxuXG4vLyBtYXBzIGRpcmVjdCBwcm94aWVzIHRvIHRoZWlyIFZhbGlkYXRvciBoYW5kbGVyc1xudmFyIGRpcmVjdFByb3hpZXMgPSBuZXcgV2Vha01hcCgpO1xuXG4vLyBwYXRjaCBPYmplY3Que3ByZXZlbnRFeHRlbnNpb25zLHNlYWwsZnJlZXplfSBzbyB0aGF0XG4vLyB0aGV5IHJlY29nbml6ZSBmaXhhYmxlIHByb3hpZXMgYW5kIGFjdCBhY2NvcmRpbmdseVxuT2JqZWN0LnByZXZlbnRFeHRlbnNpb25zID0gZnVuY3Rpb24oc3ViamVjdCkge1xuICB2YXIgdmhhbmRsZXIgPSBkaXJlY3RQcm94aWVzLmdldChzdWJqZWN0KTtcbiAgaWYgKHZoYW5kbGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICBpZiAodmhhbmRsZXIucHJldmVudEV4dGVuc2lvbnMoKSkge1xuICAgICAgcmV0dXJuIHN1YmplY3Q7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJwcmV2ZW50RXh0ZW5zaW9ucyBvbiBcIitzdWJqZWN0K1wiIHJlamVjdGVkXCIpO1xuICAgIH1cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcHJpbV9wcmV2ZW50RXh0ZW5zaW9ucyhzdWJqZWN0KTtcbiAgfVxufTtcbk9iamVjdC5zZWFsID0gZnVuY3Rpb24oc3ViamVjdCkge1xuICBzZXRJbnRlZ3JpdHlMZXZlbChzdWJqZWN0LCBcInNlYWxlZFwiKTtcbiAgcmV0dXJuIHN1YmplY3Q7XG59O1xuT2JqZWN0LmZyZWV6ZSA9IGZ1bmN0aW9uKHN1YmplY3QpIHtcbiAgc2V0SW50ZWdyaXR5TGV2ZWwoc3ViamVjdCwgXCJmcm96ZW5cIik7XG4gIHJldHVybiBzdWJqZWN0O1xufTtcbk9iamVjdC5pc0V4dGVuc2libGUgPSBPYmplY3RfaXNFeHRlbnNpYmxlID0gZnVuY3Rpb24oc3ViamVjdCkge1xuICB2YXIgdkhhbmRsZXIgPSBkaXJlY3RQcm94aWVzLmdldChzdWJqZWN0KTtcbiAgaWYgKHZIYW5kbGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gdkhhbmRsZXIuaXNFeHRlbnNpYmxlKCk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHByaW1faXNFeHRlbnNpYmxlKHN1YmplY3QpO1xuICB9XG59O1xuT2JqZWN0LmlzU2VhbGVkID0gT2JqZWN0X2lzU2VhbGVkID0gZnVuY3Rpb24oc3ViamVjdCkge1xuICByZXR1cm4gdGVzdEludGVncml0eUxldmVsKHN1YmplY3QsIFwic2VhbGVkXCIpO1xufTtcbk9iamVjdC5pc0Zyb3plbiA9IE9iamVjdF9pc0Zyb3plbiA9IGZ1bmN0aW9uKHN1YmplY3QpIHtcbiAgcmV0dXJuIHRlc3RJbnRlZ3JpdHlMZXZlbChzdWJqZWN0LCBcImZyb3plblwiKTtcbn07XG5PYmplY3QuZ2V0UHJvdG90eXBlT2YgPSBPYmplY3RfZ2V0UHJvdG90eXBlT2YgPSBmdW5jdGlvbihzdWJqZWN0KSB7XG4gIHZhciB2SGFuZGxlciA9IGRpcmVjdFByb3hpZXMuZ2V0KHN1YmplY3QpO1xuICBpZiAodkhhbmRsZXIgIT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB2SGFuZGxlci5nZXRQcm90b3R5cGVPZigpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBwcmltX2dldFByb3RvdHlwZU9mKHN1YmplY3QpO1xuICB9XG59O1xuXG4vLyBwYXRjaCBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yIHRvIGRpcmVjdGx5IGNhbGxcbi8vIHRoZSBWYWxpZGF0b3IucHJvdG90eXBlLmdldE93blByb3BlcnR5RGVzY3JpcHRvciB0cmFwXG4vLyBUaGlzIGlzIHRvIGNpcmN1bXZlbnQgYW4gYXNzZXJ0aW9uIGluIHRoZSBidWlsdC1pbiBQcm94eVxuLy8gdHJhcHBpbmcgbWVjaGFuaXNtIG9mIHY4LCB3aGljaCBkaXNhbGxvd3MgdGhhdCB0cmFwIHRvXG4vLyByZXR1cm4gbm9uLWNvbmZpZ3VyYWJsZSBwcm9wZXJ0eSBkZXNjcmlwdG9ycyAoYXMgcGVyIHRoZVxuLy8gb2xkIFByb3h5IGRlc2lnbilcbk9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IgPSBmdW5jdGlvbihzdWJqZWN0LCBuYW1lKSB7XG4gIHZhciB2aGFuZGxlciA9IGRpcmVjdFByb3hpZXMuZ2V0KHN1YmplY3QpO1xuICBpZiAodmhhbmRsZXIgIT09IHVuZGVmaW5lZCkge1xuICAgIHJldHVybiB2aGFuZGxlci5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IobmFtZSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHByaW1fZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHN1YmplY3QsIG5hbWUpO1xuICB9XG59O1xuXG4vLyBwYXRjaCBPYmplY3QuZGVmaW5lUHJvcGVydHkgdG8gZGlyZWN0bHkgY2FsbFxuLy8gdGhlIFZhbGlkYXRvci5wcm90b3R5cGUuZGVmaW5lUHJvcGVydHkgdHJhcFxuLy8gVGhpcyBpcyB0byBjaXJjdW12ZW50IHR3byBpc3N1ZXMgd2l0aCB0aGUgYnVpbHQtaW5cbi8vIHRyYXAgbWVjaGFuaXNtOlxuLy8gMSkgdGhlIGN1cnJlbnQgdHJhY2Vtb25rZXkgaW1wbGVtZW50YXRpb24gb2YgcHJveGllc1xuLy8gYXV0by1jb21wbGV0ZXMgJ2Rlc2MnLCB3aGljaCBpcyBub3QgY29ycmVjdC4gJ2Rlc2MnIHNob3VsZCBiZVxuLy8gbm9ybWFsaXplZCwgYnV0IG5vdCBjb21wbGV0ZWQuIENvbnNpZGVyOlxuLy8gT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3h5LCAnZm9vJywge2VudW1lcmFibGU6ZmFsc2V9KVxuLy8gVGhpcyB0cmFwIHdpbGwgcmVjZWl2ZSBkZXNjID1cbi8vICB7dmFsdWU6dW5kZWZpbmVkLHdyaXRhYmxlOmZhbHNlLGVudW1lcmFibGU6ZmFsc2UsY29uZmlndXJhYmxlOmZhbHNlfVxuLy8gVGhpcyB3aWxsIGFsc28gc2V0IGFsbCBvdGhlciBhdHRyaWJ1dGVzIHRvIHRoZWlyIGRlZmF1bHQgdmFsdWUsXG4vLyB3aGljaCBpcyB1bmV4cGVjdGVkIGFuZCBkaWZmZXJlbnQgZnJvbSBbW0RlZmluZU93blByb3BlcnR5XV0uXG4vLyBCdWcgZmlsZWQ6IGh0dHBzOi8vYnVnemlsbGEubW96aWxsYS5vcmcvc2hvd19idWcuY2dpP2lkPTYwMTMyOVxuLy8gMikgdGhlIGN1cnJlbnQgc3BpZGVybW9ua2V5IGltcGxlbWVudGF0aW9uIGRvZXMgbm90XG4vLyB0aHJvdyBhbiBleGNlcHRpb24gd2hlbiB0aGlzIHRyYXAgcmV0dXJucyAnZmFsc2UnLCBidXQgaW5zdGVhZCBzaWxlbnRseVxuLy8gaWdub3JlcyB0aGUgb3BlcmF0aW9uICh0aGlzIGlzIHJlZ2FyZGxlc3Mgb2Ygc3RyaWN0LW1vZGUpXG4vLyAyYSkgdjggZG9lcyB0aHJvdyBhbiBleGNlcHRpb24gZm9yIHRoaXMgY2FzZSwgYnV0IGluY2x1ZGVzIHRoZSByYXRoZXJcbi8vICAgICB1bmhlbHBmdWwgZXJyb3IgbWVzc2FnZTpcbi8vICdQcm94eSBoYW5kbGVyICM8T2JqZWN0PiByZXR1cm5lZCBmYWxzZSBmcm9tICdkZWZpbmVQcm9wZXJ0eScgdHJhcCdcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eSA9IGZ1bmN0aW9uKHN1YmplY3QsIG5hbWUsIGRlc2MpIHtcbiAgdmFyIHZoYW5kbGVyID0gZGlyZWN0UHJveGllcy5nZXQoc3ViamVjdCk7XG4gIGlmICh2aGFuZGxlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgdmFyIG5vcm1hbGl6ZWREZXNjID0gbm9ybWFsaXplUHJvcGVydHlEZXNjcmlwdG9yKGRlc2MpO1xuICAgIHZhciBzdWNjZXNzID0gdmhhbmRsZXIuZGVmaW5lUHJvcGVydHkobmFtZSwgbm9ybWFsaXplZERlc2MpO1xuICAgIGlmIChzdWNjZXNzID09PSBmYWxzZSkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImNhbid0IHJlZGVmaW5lIHByb3BlcnR5ICdcIituYW1lK1wiJ1wiKTtcbiAgICB9XG4gICAgcmV0dXJuIHN1YmplY3Q7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHByaW1fZGVmaW5lUHJvcGVydHkoc3ViamVjdCwgbmFtZSwgZGVzYyk7XG4gIH1cbn07XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzID0gZnVuY3Rpb24oc3ViamVjdCwgZGVzY3MpIHtcbiAgdmFyIHZoYW5kbGVyID0gZGlyZWN0UHJveGllcy5nZXQoc3ViamVjdCk7XG4gIGlmICh2aGFuZGxlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgdmFyIG5hbWVzID0gT2JqZWN0LmtleXMoZGVzY3MpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbmFtZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBuYW1lID0gbmFtZXNbaV07XG4gICAgICB2YXIgbm9ybWFsaXplZERlc2MgPSBub3JtYWxpemVQcm9wZXJ0eURlc2NyaXB0b3IoZGVzY3NbbmFtZV0pO1xuICAgICAgdmFyIHN1Y2Nlc3MgPSB2aGFuZGxlci5kZWZpbmVQcm9wZXJ0eShuYW1lLCBub3JtYWxpemVkRGVzYyk7XG4gICAgICBpZiAoc3VjY2VzcyA9PT0gZmFsc2UpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcImNhbid0IHJlZGVmaW5lIHByb3BlcnR5ICdcIituYW1lK1wiJ1wiKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHN1YmplY3Q7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIHByaW1fZGVmaW5lUHJvcGVydGllcyhzdWJqZWN0LCBkZXNjcyk7XG4gIH1cbn07XG5cbk9iamVjdC5rZXlzID0gZnVuY3Rpb24oc3ViamVjdCkge1xuICB2YXIgdkhhbmRsZXIgPSBkaXJlY3RQcm94aWVzLmdldChzdWJqZWN0KTtcbiAgaWYgKHZIYW5kbGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICB2YXIgb3duS2V5cyA9IHZIYW5kbGVyLm93bktleXMoKTtcbiAgICB2YXIgcmVzdWx0ID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvd25LZXlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgayA9IFN0cmluZyhvd25LZXlzW2ldKTtcbiAgICAgIHZhciBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihzdWJqZWN0LCBrKTtcbiAgICAgIGlmIChkZXNjICE9PSB1bmRlZmluZWQgJiYgZGVzYy5lbnVtZXJhYmxlID09PSB0cnVlKSB7XG4gICAgICAgIHJlc3VsdC5wdXNoKGspO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBwcmltX2tleXMoc3ViamVjdCk7XG4gIH1cbn1cblxuT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMgPSBPYmplY3RfZ2V0T3duUHJvcGVydHlOYW1lcyA9IGZ1bmN0aW9uKHN1YmplY3QpIHtcbiAgdmFyIHZIYW5kbGVyID0gZGlyZWN0UHJveGllcy5nZXQoc3ViamVjdCk7XG4gIGlmICh2SGFuZGxlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgcmV0dXJuIHZIYW5kbGVyLm93bktleXMoKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gcHJpbV9nZXRPd25Qcm9wZXJ0eU5hbWVzKHN1YmplY3QpO1xuICB9XG59XG5cbi8vIGZpeGVzIGlzc3VlICM3MSAoQ2FsbGluZyBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKCkgb24gYSBQcm94eVxuLy8gdGhyb3dzIGFuIGVycm9yKVxuaWYgKHByaW1fZ2V0T3duUHJvcGVydHlTeW1ib2xzICE9PSB1bmRlZmluZWQpIHtcbiAgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyA9IGZ1bmN0aW9uKHN1YmplY3QpIHtcbiAgICB2YXIgdkhhbmRsZXIgPSBkaXJlY3RQcm94aWVzLmdldChzdWJqZWN0KTtcbiAgICBpZiAodkhhbmRsZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgLy8gYXMgdGhpcyBzaGltIGRvZXMgbm90IHN1cHBvcnQgc3ltYm9scywgYSBQcm94eSBuZXZlciBhZHZlcnRpc2VzXG4gICAgICAvLyBhbnkgc3ltYm9sLXZhbHVlZCBvd24gcHJvcGVydGllc1xuICAgICAgcmV0dXJuIFtdO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gcHJpbV9nZXRPd25Qcm9wZXJ0eVN5bWJvbHMoc3ViamVjdCk7XG4gICAgfVxuICB9O1xufVxuXG4vLyBmaXhlcyBpc3N1ZSAjNzIgKCdJbGxlZ2FsIGFjY2VzcycgZXJyb3Igd2hlbiB1c2luZyBPYmplY3QuYXNzaWduKVxuLy8gT2JqZWN0LmFzc2lnbiBwb2x5ZmlsbCBiYXNlZCBvbiBhIHBvbHlmaWxsIHBvc3RlZCBvbiBNRE46IFxuLy8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvXFxcbi8vICBHbG9iYWxfT2JqZWN0cy9PYmplY3QvYXNzaWduXG4vLyBOb3RlIHRoYXQgdGhpcyBwb2x5ZmlsbCBkb2VzIG5vdCBzdXBwb3J0IFN5bWJvbHMsIGJ1dCB0aGlzIFByb3h5IFNoaW1cbi8vIGRvZXMgbm90IHN1cHBvcnQgU3ltYm9scyBhbnl3YXkuXG5pZiAocHJpbV9hc3NpZ24gIT09IHVuZGVmaW5lZCkge1xuICBPYmplY3QuYXNzaWduID0gZnVuY3Rpb24gKHRhcmdldCkge1xuICAgIFxuICAgIC8vIGNoZWNrIGlmIGFueSBhcmd1bWVudCBpcyBhIHByb3h5IG9iamVjdFxuICAgIHZhciBub1Byb3hpZXMgPSB0cnVlO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICB2YXIgdkhhbmRsZXIgPSBkaXJlY3RQcm94aWVzLmdldChhcmd1bWVudHNbaV0pO1xuICAgICAgaWYgKHZIYW5kbGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgbm9Qcm94aWVzID0gZmFsc2U7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAobm9Qcm94aWVzKSB7XG4gICAgICAvLyBub3QgYSBzaW5nbGUgYXJndW1lbnQgaXMgYSBwcm94eSwgcGVyZm9ybSBidWlsdC1pbiBhbGdvcml0aG1cbiAgICAgIHJldHVybiBwcmltX2Fzc2lnbi5hcHBseShPYmplY3QsIGFyZ3VtZW50cyk7XG4gICAgfVxuICAgIFxuICAgIC8vIHRoZXJlIGlzIGF0IGxlYXN0IG9uZSBwcm94eSBhcmd1bWVudCwgdXNlIHRoZSBwb2x5ZmlsbFxuICAgIFxuICAgIGlmICh0YXJnZXQgPT09IHVuZGVmaW5lZCB8fCB0YXJnZXQgPT09IG51bGwpIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0Nhbm5vdCBjb252ZXJ0IHVuZGVmaW5lZCBvciBudWxsIHRvIG9iamVjdCcpO1xuICAgIH1cblxuICAgIHZhciBvdXRwdXQgPSBPYmplY3QodGFyZ2V0KTtcbiAgICBmb3IgKHZhciBpbmRleCA9IDE7IGluZGV4IDwgYXJndW1lbnRzLmxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgdmFyIHNvdXJjZSA9IGFyZ3VtZW50c1tpbmRleF07XG4gICAgICBpZiAoc291cmNlICE9PSB1bmRlZmluZWQgJiYgc291cmNlICE9PSBudWxsKSB7XG4gICAgICAgIGZvciAodmFyIG5leHRLZXkgaW4gc291cmNlKSB7XG4gICAgICAgICAgaWYgKHNvdXJjZS5oYXNPd25Qcm9wZXJ0eShuZXh0S2V5KSkge1xuICAgICAgICAgICAgb3V0cHV0W25leHRLZXldID0gc291cmNlW25leHRLZXldO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb3V0cHV0O1xuICB9O1xufVxuXG4vLyByZXR1cm5zIHdoZXRoZXIgYW4gYXJndW1lbnQgaXMgYSByZWZlcmVuY2UgdG8gYW4gb2JqZWN0LFxuLy8gd2hpY2ggaXMgbGVnYWwgYXMgYSBXZWFrTWFwIGtleS5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICB2YXIgdHlwZSA9IHR5cGVvZiBhcmc7XG4gIHJldHVybiAodHlwZSA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsKSB8fCAodHlwZSA9PT0gJ2Z1bmN0aW9uJyk7XG59O1xuXG4vLyBhIHdyYXBwZXIgZm9yIFdlYWtNYXAuZ2V0IHdoaWNoIHJldHVybnMgdGhlIHVuZGVmaW5lZCB2YWx1ZVxuLy8gZm9yIGtleXMgdGhhdCBhcmUgbm90IG9iamVjdHMgKGluIHdoaWNoIGNhc2UgdGhlIHVuZGVybHlpbmdcbi8vIFdlYWtNYXAgd291bGQgaGF2ZSB0aHJvd24gYSBUeXBlRXJyb3IpLlxuZnVuY3Rpb24gc2FmZVdlYWtNYXBHZXQobWFwLCBrZXkpIHtcbiAgcmV0dXJuIGlzT2JqZWN0KGtleSkgPyBtYXAuZ2V0KGtleSkgOiB1bmRlZmluZWQ7XG59O1xuXG4vLyByZXR1cm5zIGEgbmV3IGZ1bmN0aW9uIG9mIHplcm8gYXJndW1lbnRzIHRoYXQgcmVjdXJzaXZlbHlcbi8vIHVud3JhcHMgYW55IHByb3hpZXMgc3BlY2lmaWVkIGFzIHRoZSB8dGhpc3wtdmFsdWUuXG4vLyBUaGUgcHJpbWl0aXZlIGlzIGFzc3VtZWQgdG8gYmUgYSB6ZXJvLWFyZ3VtZW50IG1ldGhvZFxuLy8gdGhhdCB1c2VzIGl0cyB8dGhpc3wtYmluZGluZy5cbmZ1bmN0aW9uIG1ha2VVbndyYXBwaW5nMEFyZ01ldGhvZChwcmltaXRpdmUpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIGJ1aWx0aW4oKSB7XG4gICAgdmFyIHZIYW5kbGVyID0gc2FmZVdlYWtNYXBHZXQoZGlyZWN0UHJveGllcywgdGhpcyk7XG4gICAgaWYgKHZIYW5kbGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBidWlsdGluLmNhbGwodkhhbmRsZXIudGFyZ2V0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHByaW1pdGl2ZS5jYWxsKHRoaXMpO1xuICAgIH1cbiAgfVxufTtcblxuLy8gcmV0dXJucyBhIG5ldyBmdW5jdGlvbiBvZiAxIGFyZ3VtZW50cyB0aGF0IHJlY3Vyc2l2ZWx5XG4vLyB1bndyYXBzIGFueSBwcm94aWVzIHNwZWNpZmllZCBhcyB0aGUgfHRoaXN8LXZhbHVlLlxuLy8gVGhlIHByaW1pdGl2ZSBpcyBhc3N1bWVkIHRvIGJlIGEgMS1hcmd1bWVudCBtZXRob2Rcbi8vIHRoYXQgdXNlcyBpdHMgfHRoaXN8LWJpbmRpbmcuXG5mdW5jdGlvbiBtYWtlVW53cmFwcGluZzFBcmdNZXRob2QocHJpbWl0aXZlKSB7XG4gIHJldHVybiBmdW5jdGlvbiBidWlsdGluKGFyZykge1xuICAgIHZhciB2SGFuZGxlciA9IHNhZmVXZWFrTWFwR2V0KGRpcmVjdFByb3hpZXMsIHRoaXMpO1xuICAgIGlmICh2SGFuZGxlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gYnVpbHRpbi5jYWxsKHZIYW5kbGVyLnRhcmdldCwgYXJnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHByaW1pdGl2ZS5jYWxsKHRoaXMsIGFyZyk7XG4gICAgfVxuICB9XG59O1xuXG5PYmplY3QucHJvdG90eXBlLnZhbHVlT2YgPVxuICBtYWtlVW53cmFwcGluZzBBcmdNZXRob2QoT2JqZWN0LnByb3RvdHlwZS52YWx1ZU9mKTtcbk9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcgPVxuICBtYWtlVW53cmFwcGluZzBBcmdNZXRob2QoT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZyk7XG5GdW5jdGlvbi5wcm90b3R5cGUudG9TdHJpbmcgPVxuICBtYWtlVW53cmFwcGluZzBBcmdNZXRob2QoRnVuY3Rpb24ucHJvdG90eXBlLnRvU3RyaW5nKTtcbkRhdGUucHJvdG90eXBlLnRvU3RyaW5nID1cbiAgbWFrZVVud3JhcHBpbmcwQXJnTWV0aG9kKERhdGUucHJvdG90eXBlLnRvU3RyaW5nKTtcblxuT2JqZWN0LnByb3RvdHlwZS5pc1Byb3RvdHlwZU9mID0gZnVuY3Rpb24gYnVpbHRpbihhcmcpIHtcbiAgLy8gYnVnZml4IHRoYW5rcyB0byBCaWxsIE1hcms6XG4gIC8vIGJ1aWx0LWluIGlzUHJvdG90eXBlT2YgZG9lcyBub3QgdW53cmFwIHByb3hpZXMgdXNlZFxuICAvLyBhcyBhcmd1bWVudHMuIFNvLCB3ZSBpbXBsZW1lbnQgdGhlIGJ1aWx0aW4gb3Vyc2VsdmVzLFxuICAvLyBiYXNlZCBvbiB0aGUgRUNNQVNjcmlwdCA2IHNwZWMuIE91ciBlbmNvZGluZyB3aWxsXG4gIC8vIG1ha2Ugc3VyZSB0aGF0IGlmIGEgcHJveHkgaXMgdXNlZCBhcyBhbiBhcmd1bWVudCxcbiAgLy8gaXRzIGdldFByb3RvdHlwZU9mIHRyYXAgd2lsbCBiZSBjYWxsZWQuXG4gIHdoaWxlICh0cnVlKSB7XG4gICAgdmFyIHZIYW5kbGVyMiA9IHNhZmVXZWFrTWFwR2V0KGRpcmVjdFByb3hpZXMsIGFyZyk7XG4gICAgaWYgKHZIYW5kbGVyMiAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICBhcmcgPSB2SGFuZGxlcjIuZ2V0UHJvdG90eXBlT2YoKTtcbiAgICAgIGlmIChhcmcgPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfSBlbHNlIGlmIChzYW1lVmFsdWUoYXJnLCB0aGlzKSkge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgcmV0dXJuIHByaW1faXNQcm90b3R5cGVPZi5jYWxsKHRoaXMsIGFyZyk7XG4gICAgfVxuICB9XG59O1xuXG5BcnJheS5pc0FycmF5ID0gZnVuY3Rpb24oc3ViamVjdCkge1xuICB2YXIgdkhhbmRsZXIgPSBzYWZlV2Vha01hcEdldChkaXJlY3RQcm94aWVzLCBzdWJqZWN0KTtcbiAgaWYgKHZIYW5kbGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gQXJyYXkuaXNBcnJheSh2SGFuZGxlci50YXJnZXQpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBwcmltX2lzQXJyYXkoc3ViamVjdCk7XG4gIH1cbn07XG5cbmZ1bmN0aW9uIGlzUHJveHlBcnJheShhcmcpIHtcbiAgdmFyIHZIYW5kbGVyID0gc2FmZVdlYWtNYXBHZXQoZGlyZWN0UHJveGllcywgYXJnKTtcbiAgaWYgKHZIYW5kbGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICByZXR1cm4gQXJyYXkuaXNBcnJheSh2SGFuZGxlci50YXJnZXQpO1xuICB9XG4gIHJldHVybiBmYWxzZTtcbn1cblxuLy8gQXJyYXkucHJvdG90eXBlLmNvbmNhdCBpbnRlcm5hbGx5IHRlc3RzIHdoZXRoZXIgb25lIG9mIGl0c1xuLy8gYXJndW1lbnRzIGlzIGFuIEFycmF5LCBieSBjaGVja2luZyB3aGV0aGVyIFtbQ2xhc3NdXSA9PSBcIkFycmF5XCJcbi8vIEFzIHN1Y2gsIGl0IHdpbGwgZmFpbCB0byByZWNvZ25pemUgcHJveGllcy1mb3ItYXJyYXlzIGFzIGFycmF5cy5cbi8vIFdlIHBhdGNoIEFycmF5LnByb3RvdHlwZS5jb25jYXQgc28gdGhhdCBpdCBcInVud3JhcHNcIiBwcm94aWVzLWZvci1hcnJheXNcbi8vIGJ5IG1ha2luZyBhIGNvcHkuIFRoaXMgd2lsbCB0cmlnZ2VyIHRoZSBleGFjdCBzYW1lIHNlcXVlbmNlIG9mXG4vLyB0cmFwcyBvbiB0aGUgcHJveHktZm9yLWFycmF5IGFzIGlmIHdlIHdvdWxkIG5vdCBoYXZlIHVud3JhcHBlZCBpdC5cbi8vIFNlZSA8aHR0cHM6Ly9naXRodWIuY29tL3R2Y3V0c2VtL2hhcm1vbnktcmVmbGVjdC9pc3N1ZXMvMTk+IGZvciBtb3JlLlxuQXJyYXkucHJvdG90eXBlLmNvbmNhdCA9IGZ1bmN0aW9uKC8qLi4uYXJncyovKSB7XG4gIHZhciBsZW5ndGg7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGlzUHJveHlBcnJheShhcmd1bWVudHNbaV0pKSB7XG4gICAgICBsZW5ndGggPSBhcmd1bWVudHNbaV0ubGVuZ3RoO1xuICAgICAgYXJndW1lbnRzW2ldID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzW2ldLCAwLCBsZW5ndGgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcHJpbV9jb25jYXQuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbn07XG5cbi8vIHNldFByb3RvdHlwZU9mIHN1cHBvcnQgb24gcGxhdGZvcm1zIHRoYXQgc3VwcG9ydCBfX3Byb3RvX19cblxudmFyIHByaW1fc2V0UHJvdG90eXBlT2YgPSBPYmplY3Quc2V0UHJvdG90eXBlT2Y7XG5cbi8vIHBhdGNoIGFuZCBleHRyYWN0IG9yaWdpbmFsIF9fcHJvdG9fXyBzZXR0ZXJcbnZhciBfX3Byb3RvX19zZXR0ZXIgPSAoZnVuY3Rpb24oKSB7XG4gIHZhciBwcm90b0Rlc2MgPSBwcmltX2dldE93blByb3BlcnR5RGVzY3JpcHRvcihPYmplY3QucHJvdG90eXBlLCdfX3Byb3RvX18nKTtcbiAgaWYgKHByb3RvRGVzYyA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICB0eXBlb2YgcHJvdG9EZXNjLnNldCAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcInNldFByb3RvdHlwZU9mIG5vdCBzdXBwb3J0ZWQgb24gdGhpcyBwbGF0Zm9ybVwiKTtcbiAgICB9XG4gIH1cblxuICAvLyBzZWUgaWYgd2UgY2FuIGFjdHVhbGx5IG11dGF0ZSBhIHByb3RvdHlwZSB3aXRoIHRoZSBnZW5lcmljIHNldHRlclxuICAvLyAoZS5nLiBDaHJvbWUgdjI4IGRvZXNuJ3QgYWxsb3cgc2V0dGluZyBfX3Byb3RvX18gdmlhIHRoZSBnZW5lcmljIHNldHRlcilcbiAgdHJ5IHtcbiAgICBwcm90b0Rlc2Muc2V0LmNhbGwoe30se30pO1xuICB9IGNhdGNoIChlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcInNldFByb3RvdHlwZU9mIG5vdCBzdXBwb3J0ZWQgb24gdGhpcyBwbGF0Zm9ybVwiKTtcbiAgICB9XG4gIH1cblxuICBwcmltX2RlZmluZVByb3BlcnR5KE9iamVjdC5wcm90b3R5cGUsICdfX3Byb3RvX18nLCB7XG4gICAgc2V0OiBmdW5jdGlvbihuZXdQcm90bykge1xuICAgICAgcmV0dXJuIE9iamVjdC5zZXRQcm90b3R5cGVPZih0aGlzLCBPYmplY3QobmV3UHJvdG8pKTtcbiAgICB9XG4gIH0pO1xuXG4gIHJldHVybiBwcm90b0Rlc2Muc2V0O1xufSgpKTtcblxuT2JqZWN0LnNldFByb3RvdHlwZU9mID0gZnVuY3Rpb24odGFyZ2V0LCBuZXdQcm90bykge1xuICB2YXIgaGFuZGxlciA9IGRpcmVjdFByb3hpZXMuZ2V0KHRhcmdldCk7XG4gIGlmIChoYW5kbGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICBpZiAoaGFuZGxlci5zZXRQcm90b3R5cGVPZihuZXdQcm90bykpIHtcbiAgICAgIHJldHVybiB0YXJnZXQ7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJwcm94eSByZWplY3RlZCBwcm90b3R5cGUgbXV0YXRpb25cIik7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmICghT2JqZWN0X2lzRXh0ZW5zaWJsZSh0YXJnZXQpKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiY2FuJ3Qgc2V0IHByb3RvdHlwZSBvbiBub24tZXh0ZW5zaWJsZSBvYmplY3Q6IFwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgdGFyZ2V0KTtcbiAgICB9XG4gICAgaWYgKHByaW1fc2V0UHJvdG90eXBlT2YpXG4gICAgICByZXR1cm4gcHJpbV9zZXRQcm90b3R5cGVPZih0YXJnZXQsIG5ld1Byb3RvKTtcblxuICAgIGlmIChPYmplY3QobmV3UHJvdG8pICE9PSBuZXdQcm90byB8fCBuZXdQcm90byA9PT0gbnVsbCkge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIk9iamVjdCBwcm90b3R5cGUgbWF5IG9ubHkgYmUgYW4gT2JqZWN0IG9yIG51bGw6IFwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgICBuZXdQcm90byk7XG4gICAgICAvLyB0aHJvdyBuZXcgVHlwZUVycm9yKFwicHJvdG90eXBlIG11c3QgYmUgYW4gb2JqZWN0IG9yIG51bGxcIilcbiAgICB9XG4gICAgX19wcm90b19fc2V0dGVyLmNhbGwodGFyZ2V0LCBuZXdQcm90byk7XG4gICAgcmV0dXJuIHRhcmdldDtcbiAgfVxufVxuXG5PYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5ID0gZnVuY3Rpb24obmFtZSkge1xuICB2YXIgaGFuZGxlciA9IHNhZmVXZWFrTWFwR2V0KGRpcmVjdFByb3hpZXMsIHRoaXMpO1xuICBpZiAoaGFuZGxlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgdmFyIGRlc2MgPSBoYW5kbGVyLmdldE93blByb3BlcnR5RGVzY3JpcHRvcihuYW1lKTtcbiAgICByZXR1cm4gZGVzYyAhPT0gdW5kZWZpbmVkO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBwcmltX2hhc093blByb3BlcnR5LmNhbGwodGhpcywgbmFtZSk7XG4gIH1cbn1cblxuLy8gPT09PT09PT09PT09PSBSZWZsZWN0aW9uIG1vZHVsZSA9PT09PT09PT09PT09XG4vLyBzZWUgaHR0cDovL3dpa2kuZWNtYXNjcmlwdC5vcmcvZG9rdS5waHA/aWQ9aGFybW9ueTpyZWZsZWN0X2FwaVxuXG52YXIgUmVmbGVjdCA9IGdsb2JhbC5SZWZsZWN0ID0ge1xuICBnZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3I6IGZ1bmN0aW9uKHRhcmdldCwgbmFtZSkge1xuICAgIHJldHVybiBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwgbmFtZSk7XG4gIH0sXG4gIGRlZmluZVByb3BlcnR5OiBmdW5jdGlvbih0YXJnZXQsIG5hbWUsIGRlc2MpIHtcblxuICAgIC8vIGlmIHRhcmdldCBpcyBhIHByb3h5LCBpbnZva2UgaXRzIFwiZGVmaW5lUHJvcGVydHlcIiB0cmFwXG4gICAgdmFyIGhhbmRsZXIgPSBkaXJlY3RQcm94aWVzLmdldCh0YXJnZXQpO1xuICAgIGlmIChoYW5kbGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBoYW5kbGVyLmRlZmluZVByb3BlcnR5KHRhcmdldCwgbmFtZSwgZGVzYyk7XG4gICAgfVxuXG4gICAgLy8gSW1wbGVtZW50YXRpb24gdHJhbnNsaXRlcmF0ZWQgZnJvbSBbW0RlZmluZU93blByb3BlcnR5XV1cbiAgICAvLyBzZWUgRVM1LjEgc2VjdGlvbiA4LjEyLjlcbiAgICAvLyB0aGlzIGlzIHRoZSBfZXhhY3Qgc2FtZSBhbGdvcml0aG1fIGFzIHRoZSBpc0NvbXBhdGlibGVEZXNjcmlwdG9yXG4gICAgLy8gYWxnb3JpdGhtIGRlZmluZWQgYWJvdmUsIGV4Y2VwdCB0aGF0IGF0IGV2ZXJ5IHBsYWNlIGl0XG4gICAgLy8gcmV0dXJucyB0cnVlLCB0aGlzIGFsZ29yaXRobSBhY3R1YWxseSBkb2VzIGRlZmluZSB0aGUgcHJvcGVydHkuXG4gICAgdmFyIGN1cnJlbnQgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwgbmFtZSk7XG4gICAgdmFyIGV4dGVuc2libGUgPSBPYmplY3QuaXNFeHRlbnNpYmxlKHRhcmdldCk7XG4gICAgaWYgKGN1cnJlbnQgPT09IHVuZGVmaW5lZCAmJiBleHRlbnNpYmxlID09PSBmYWxzZSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBpZiAoY3VycmVudCA9PT0gdW5kZWZpbmVkICYmIGV4dGVuc2libGUgPT09IHRydWUpIHtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIG5hbWUsIGRlc2MpOyAvLyBzaG91bGQgbmV2ZXIgZmFpbFxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChpc0VtcHR5RGVzY3JpcHRvcihkZXNjKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChpc0VxdWl2YWxlbnREZXNjcmlwdG9yKGN1cnJlbnQsIGRlc2MpKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGN1cnJlbnQuY29uZmlndXJhYmxlID09PSBmYWxzZSkge1xuICAgICAgaWYgKGRlc2MuY29uZmlndXJhYmxlID09PSB0cnVlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICAgIGlmICgnZW51bWVyYWJsZScgaW4gZGVzYyAmJiBkZXNjLmVudW1lcmFibGUgIT09IGN1cnJlbnQuZW51bWVyYWJsZSkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpc0dlbmVyaWNEZXNjcmlwdG9yKGRlc2MpKSB7XG4gICAgICAvLyBubyBmdXJ0aGVyIHZhbGlkYXRpb24gbmVjZXNzYXJ5XG4gICAgfSBlbHNlIGlmIChpc0RhdGFEZXNjcmlwdG9yKGN1cnJlbnQpICE9PSBpc0RhdGFEZXNjcmlwdG9yKGRlc2MpKSB7XG4gICAgICBpZiAoY3VycmVudC5jb25maWd1cmFibGUgPT09IGZhbHNlKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzRGF0YURlc2NyaXB0b3IoY3VycmVudCkgJiYgaXNEYXRhRGVzY3JpcHRvcihkZXNjKSkge1xuICAgICAgaWYgKGN1cnJlbnQuY29uZmlndXJhYmxlID09PSBmYWxzZSkge1xuICAgICAgICBpZiAoY3VycmVudC53cml0YWJsZSA9PT0gZmFsc2UgJiYgZGVzYy53cml0YWJsZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoY3VycmVudC53cml0YWJsZSA9PT0gZmFsc2UpIHtcbiAgICAgICAgICBpZiAoJ3ZhbHVlJyBpbiBkZXNjICYmICFzYW1lVmFsdWUoZGVzYy52YWx1ZSwgY3VycmVudC52YWx1ZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKGlzQWNjZXNzb3JEZXNjcmlwdG9yKGN1cnJlbnQpICYmIGlzQWNjZXNzb3JEZXNjcmlwdG9yKGRlc2MpKSB7XG4gICAgICBpZiAoY3VycmVudC5jb25maWd1cmFibGUgPT09IGZhbHNlKSB7XG4gICAgICAgIGlmICgnc2V0JyBpbiBkZXNjICYmICFzYW1lVmFsdWUoZGVzYy5zZXQsIGN1cnJlbnQuc2V0KSkge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoJ2dldCcgaW4gZGVzYyAmJiAhc2FtZVZhbHVlKGRlc2MuZ2V0LCBjdXJyZW50LmdldCkpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHRhcmdldCwgbmFtZSwgZGVzYyk7IC8vIHNob3VsZCBuZXZlciBmYWlsXG4gICAgcmV0dXJuIHRydWU7XG4gIH0sXG4gIGRlbGV0ZVByb3BlcnR5OiBmdW5jdGlvbih0YXJnZXQsIG5hbWUpIHtcbiAgICB2YXIgaGFuZGxlciA9IGRpcmVjdFByb3hpZXMuZ2V0KHRhcmdldCk7XG4gICAgaWYgKGhhbmRsZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIGhhbmRsZXIuZGVsZXRlKG5hbWUpO1xuICAgIH1cbiAgICBcbiAgICB2YXIgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBuYW1lKTtcbiAgICBpZiAoZGVzYyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgaWYgKGRlc2MuY29uZmlndXJhYmxlID09PSB0cnVlKSB7XG4gICAgICBkZWxldGUgdGFyZ2V0W25hbWVdO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTsgICAgXG4gIH0sXG4gIGdldFByb3RvdHlwZU9mOiBmdW5jdGlvbih0YXJnZXQpIHtcbiAgICByZXR1cm4gT2JqZWN0LmdldFByb3RvdHlwZU9mKHRhcmdldCk7XG4gIH0sXG4gIHNldFByb3RvdHlwZU9mOiBmdW5jdGlvbih0YXJnZXQsIG5ld1Byb3RvKSB7XG4gICAgXG4gICAgdmFyIGhhbmRsZXIgPSBkaXJlY3RQcm94aWVzLmdldCh0YXJnZXQpO1xuICAgIGlmIChoYW5kbGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBoYW5kbGVyLnNldFByb3RvdHlwZU9mKG5ld1Byb3RvKTtcbiAgICB9XG4gICAgXG4gICAgaWYgKE9iamVjdChuZXdQcm90bykgIT09IG5ld1Byb3RvIHx8IG5ld1Byb3RvID09PSBudWxsKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiT2JqZWN0IHByb3RvdHlwZSBtYXkgb25seSBiZSBhbiBPYmplY3Qgb3IgbnVsbDogXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Byb3RvKTtcbiAgICB9XG4gICAgXG4gICAgaWYgKCFPYmplY3RfaXNFeHRlbnNpYmxlKHRhcmdldCkpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgXG4gICAgdmFyIGN1cnJlbnQgPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YodGFyZ2V0KTtcbiAgICBpZiAoc2FtZVZhbHVlKGN1cnJlbnQsIG5ld1Byb3RvKSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIFxuICAgIGlmIChwcmltX3NldFByb3RvdHlwZU9mKSB7XG4gICAgICB0cnkge1xuICAgICAgICBwcmltX3NldFByb3RvdHlwZU9mKHRhcmdldCwgbmV3UHJvdG8pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIF9fcHJvdG9fX3NldHRlci5jYWxsKHRhcmdldCwgbmV3UHJvdG8pO1xuICAgIHJldHVybiB0cnVlO1xuICB9LFxuICBwcmV2ZW50RXh0ZW5zaW9uczogZnVuY3Rpb24odGFyZ2V0KSB7XG4gICAgdmFyIGhhbmRsZXIgPSBkaXJlY3RQcm94aWVzLmdldCh0YXJnZXQpO1xuICAgIGlmIChoYW5kbGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBoYW5kbGVyLnByZXZlbnRFeHRlbnNpb25zKCk7XG4gICAgfVxuICAgIHByaW1fcHJldmVudEV4dGVuc2lvbnModGFyZ2V0KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcbiAgaXNFeHRlbnNpYmxlOiBmdW5jdGlvbih0YXJnZXQpIHtcbiAgICByZXR1cm4gT2JqZWN0LmlzRXh0ZW5zaWJsZSh0YXJnZXQpO1xuICB9LFxuICBoYXM6IGZ1bmN0aW9uKHRhcmdldCwgbmFtZSkge1xuICAgIHJldHVybiBuYW1lIGluIHRhcmdldDtcbiAgfSxcbiAgZ2V0OiBmdW5jdGlvbih0YXJnZXQsIG5hbWUsIHJlY2VpdmVyKSB7XG4gICAgcmVjZWl2ZXIgPSByZWNlaXZlciB8fCB0YXJnZXQ7XG5cbiAgICAvLyBpZiB0YXJnZXQgaXMgYSBwcm94eSwgaW52b2tlIGl0cyBcImdldFwiIHRyYXBcbiAgICB2YXIgaGFuZGxlciA9IGRpcmVjdFByb3hpZXMuZ2V0KHRhcmdldCk7XG4gICAgaWYgKGhhbmRsZXIgIT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIGhhbmRsZXIuZ2V0KHJlY2VpdmVyLCBuYW1lKTtcbiAgICB9XG5cbiAgICB2YXIgZGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBuYW1lKTtcbiAgICBpZiAoZGVzYyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB2YXIgcHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YodGFyZ2V0KTtcbiAgICAgIGlmIChwcm90byA9PT0gbnVsbCkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuICAgICAgcmV0dXJuIFJlZmxlY3QuZ2V0KHByb3RvLCBuYW1lLCByZWNlaXZlcik7XG4gICAgfVxuICAgIGlmIChpc0RhdGFEZXNjcmlwdG9yKGRlc2MpKSB7XG4gICAgICByZXR1cm4gZGVzYy52YWx1ZTtcbiAgICB9XG4gICAgdmFyIGdldHRlciA9IGRlc2MuZ2V0O1xuICAgIGlmIChnZXR0ZXIgPT09IHVuZGVmaW5lZCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgcmV0dXJuIGRlc2MuZ2V0LmNhbGwocmVjZWl2ZXIpO1xuICB9LFxuICAvLyBSZWZsZWN0LnNldCBpbXBsZW1lbnRhdGlvbiBiYXNlZCBvbiBsYXRlc3QgdmVyc2lvbiBvZiBbW1NldFBdXSBhdFxuICAvLyBodHRwOi8vd2lraS5lY21hc2NyaXB0Lm9yZy9kb2t1LnBocD9pZD1oYXJtb255OnByb3RvX2NsaW1iaW5nX3JlZmFjdG9yaW5nXG4gIHNldDogZnVuY3Rpb24odGFyZ2V0LCBuYW1lLCB2YWx1ZSwgcmVjZWl2ZXIpIHtcbiAgICByZWNlaXZlciA9IHJlY2VpdmVyIHx8IHRhcmdldDtcblxuICAgIC8vIGlmIHRhcmdldCBpcyBhIHByb3h5LCBpbnZva2UgaXRzIFwic2V0XCIgdHJhcFxuICAgIHZhciBoYW5kbGVyID0gZGlyZWN0UHJveGllcy5nZXQodGFyZ2V0KTtcbiAgICBpZiAoaGFuZGxlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gaGFuZGxlci5zZXQocmVjZWl2ZXIsIG5hbWUsIHZhbHVlKTtcbiAgICB9XG5cbiAgICAvLyBmaXJzdCwgY2hlY2sgd2hldGhlciB0YXJnZXQgaGFzIGEgbm9uLXdyaXRhYmxlIHByb3BlcnR5XG4gICAgLy8gc2hhZG93aW5nIG5hbWUgb24gcmVjZWl2ZXJcbiAgICB2YXIgb3duRGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IodGFyZ2V0LCBuYW1lKTtcblxuICAgIGlmIChvd25EZXNjID09PSB1bmRlZmluZWQpIHtcbiAgICAgIC8vIG5hbWUgaXMgbm90IGRlZmluZWQgaW4gdGFyZ2V0LCBzZWFyY2ggdGFyZ2V0J3MgcHJvdG90eXBlXG4gICAgICB2YXIgcHJvdG8gPSBPYmplY3QuZ2V0UHJvdG90eXBlT2YodGFyZ2V0KTtcblxuICAgICAgaWYgKHByb3RvICE9PSBudWxsKSB7XG4gICAgICAgIC8vIGNvbnRpbnVlIHRoZSBzZWFyY2ggaW4gdGFyZ2V0J3MgcHJvdG90eXBlXG4gICAgICAgIHJldHVybiBSZWZsZWN0LnNldChwcm90bywgbmFtZSwgdmFsdWUsIHJlY2VpdmVyKTtcbiAgICAgIH1cblxuICAgICAgLy8gUmV2MTYgY2hhbmdlLiBDZi4gaHR0cHM6Ly9idWdzLmVjbWFzY3JpcHQub3JnL3Nob3dfYnVnLmNnaT9pZD0xNTQ5XG4gICAgICAvLyB0YXJnZXQgd2FzIHRoZSBsYXN0IHByb3RvdHlwZSwgbm93IHdlIGtub3cgdGhhdCAnbmFtZScgaXMgbm90IHNoYWRvd2VkXG4gICAgICAvLyBieSBhbiBleGlzdGluZyAoYWNjZXNzb3Igb3IgZGF0YSkgcHJvcGVydHksIHNvIHdlIGNhbiBhZGQgdGhlIHByb3BlcnR5XG4gICAgICAvLyB0byB0aGUgaW5pdGlhbCByZWNlaXZlciBvYmplY3RcbiAgICAgIC8vICh0aGlzIGJyYW5jaCB3aWxsIGludGVudGlvbmFsbHkgZmFsbCB0aHJvdWdoIHRvIHRoZSBjb2RlIGJlbG93KVxuICAgICAgb3duRGVzYyA9XG4gICAgICAgIHsgdmFsdWU6IHVuZGVmaW5lZCxcbiAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9O1xuICAgIH1cblxuICAgIC8vIHdlIG5vdyBrbm93IHRoYXQgb3duRGVzYyAhPT0gdW5kZWZpbmVkXG4gICAgaWYgKGlzQWNjZXNzb3JEZXNjcmlwdG9yKG93bkRlc2MpKSB7XG4gICAgICB2YXIgc2V0dGVyID0gb3duRGVzYy5zZXQ7XG4gICAgICBpZiAoc2V0dGVyID09PSB1bmRlZmluZWQpIHJldHVybiBmYWxzZTtcbiAgICAgIHNldHRlci5jYWxsKHJlY2VpdmVyLCB2YWx1ZSk7IC8vIGFzc3VtZXMgRnVuY3Rpb24ucHJvdG90eXBlLmNhbGxcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICAvLyBvdGhlcndpc2UsIGlzRGF0YURlc2NyaXB0b3Iob3duRGVzYykgbXVzdCBiZSB0cnVlXG4gICAgaWYgKG93bkRlc2Mud3JpdGFibGUgPT09IGZhbHNlKSByZXR1cm4gZmFsc2U7XG4gICAgLy8gd2UgZm91bmQgYW4gZXhpc3Rpbmcgd3JpdGFibGUgZGF0YSBwcm9wZXJ0eSBvbiB0aGUgcHJvdG90eXBlIGNoYWluLlxuICAgIC8vIE5vdyB1cGRhdGUgb3IgYWRkIHRoZSBkYXRhIHByb3BlcnR5IG9uIHRoZSByZWNlaXZlciwgZGVwZW5kaW5nIG9uXG4gICAgLy8gd2hldGhlciB0aGUgcmVjZWl2ZXIgYWxyZWFkeSBkZWZpbmVzIHRoZSBwcm9wZXJ0eSBvciBub3QuXG4gICAgdmFyIGV4aXN0aW5nRGVzYyA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IocmVjZWl2ZXIsIG5hbWUpO1xuICAgIGlmIChleGlzdGluZ0Rlc2MgIT09IHVuZGVmaW5lZCkge1xuICAgICAgdmFyIHVwZGF0ZURlc2MgPVxuICAgICAgICB7IHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICAvLyBGSVhNRTogaXQgc2hvdWxkIG5vdCBiZSBuZWNlc3NhcnkgdG8gZGVzY3JpYmUgdGhlIGZvbGxvd2luZ1xuICAgICAgICAgIC8vIGF0dHJpYnV0ZXMuIEFkZGVkIHRvIGNpcmN1bXZlbnQgYSBidWcgaW4gdHJhY2Vtb25rZXk6XG4gICAgICAgICAgLy8gaHR0cHM6Ly9idWd6aWxsYS5tb3ppbGxhLm9yZy9zaG93X2J1Zy5jZ2k/aWQ9NjAxMzI5XG4gICAgICAgICAgd3JpdGFibGU6ICAgICBleGlzdGluZ0Rlc2Mud3JpdGFibGUsXG4gICAgICAgICAgZW51bWVyYWJsZTogICBleGlzdGluZ0Rlc2MuZW51bWVyYWJsZSxcbiAgICAgICAgICBjb25maWd1cmFibGU6IGV4aXN0aW5nRGVzYy5jb25maWd1cmFibGUgfTtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShyZWNlaXZlciwgbmFtZSwgdXBkYXRlRGVzYyk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKCFPYmplY3QuaXNFeHRlbnNpYmxlKHJlY2VpdmVyKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgdmFyIG5ld0Rlc2MgPVxuICAgICAgICB7IHZhbHVlOiB2YWx1ZSxcbiAgICAgICAgICB3cml0YWJsZTogdHJ1ZSxcbiAgICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxuICAgICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZSB9O1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHJlY2VpdmVyLCBuYW1lLCBuZXdEZXNjKTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfSxcbiAgLyppbnZva2U6IGZ1bmN0aW9uKHRhcmdldCwgbmFtZSwgYXJncywgcmVjZWl2ZXIpIHtcbiAgICByZWNlaXZlciA9IHJlY2VpdmVyIHx8IHRhcmdldDtcblxuICAgIHZhciBoYW5kbGVyID0gZGlyZWN0UHJveGllcy5nZXQodGFyZ2V0KTtcbiAgICBpZiAoaGFuZGxlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICByZXR1cm4gaGFuZGxlci5pbnZva2UocmVjZWl2ZXIsIG5hbWUsIGFyZ3MpO1xuICAgIH1cblxuICAgIHZhciBmdW4gPSBSZWZsZWN0LmdldCh0YXJnZXQsIG5hbWUsIHJlY2VpdmVyKTtcbiAgICByZXR1cm4gRnVuY3Rpb24ucHJvdG90eXBlLmFwcGx5LmNhbGwoZnVuLCByZWNlaXZlciwgYXJncyk7XG4gIH0sKi9cbiAgZW51bWVyYXRlOiBmdW5jdGlvbih0YXJnZXQpIHtcbiAgICB2YXIgaGFuZGxlciA9IGRpcmVjdFByb3hpZXMuZ2V0KHRhcmdldCk7XG4gICAgdmFyIHJlc3VsdDtcbiAgICBpZiAoaGFuZGxlciAhPT0gdW5kZWZpbmVkKSB7XG4gICAgICAvLyBoYW5kbGVyLmVudW1lcmF0ZSBzaG91bGQgcmV0dXJuIGFuIGl0ZXJhdG9yIGRpcmVjdGx5LCBidXQgdGhlXG4gICAgICAvLyBpdGVyYXRvciBnZXRzIGNvbnZlcnRlZCB0byBhbiBhcnJheSBmb3IgYmFja3dhcmQtY29tcGF0IHJlYXNvbnMsXG4gICAgICAvLyBzbyB3ZSBtdXN0IHJlLWl0ZXJhdGUgb3ZlciB0aGUgYXJyYXlcbiAgICAgIHJlc3VsdCA9IGhhbmRsZXIuZW51bWVyYXRlKGhhbmRsZXIudGFyZ2V0KTtcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0ID0gW107XG4gICAgICBmb3IgKHZhciBuYW1lIGluIHRhcmdldCkgeyByZXN1bHQucHVzaChuYW1lKTsgfTsgICAgICBcbiAgICB9XG4gICAgdmFyIGwgPSArcmVzdWx0Lmxlbmd0aDtcbiAgICB2YXIgaWR4ID0gMDtcbiAgICByZXR1cm4ge1xuICAgICAgbmV4dDogZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmIChpZHggPT09IGwpIHJldHVybiB7IGRvbmU6IHRydWUgfTtcbiAgICAgICAgcmV0dXJuIHsgZG9uZTogZmFsc2UsIHZhbHVlOiByZXN1bHRbaWR4KytdIH07XG4gICAgICB9XG4gICAgfTtcbiAgfSxcbiAgLy8gaW1wZXJmZWN0IG93bktleXMgaW1wbGVtZW50YXRpb246IGluIEVTNiwgc2hvdWxkIGFsc28gaW5jbHVkZVxuICAvLyBzeW1ib2wta2V5ZWQgcHJvcGVydGllcy5cbiAgb3duS2V5czogZnVuY3Rpb24odGFyZ2V0KSB7XG4gICAgcmV0dXJuIE9iamVjdF9nZXRPd25Qcm9wZXJ0eU5hbWVzKHRhcmdldCk7XG4gIH0sXG4gIGFwcGx5OiBmdW5jdGlvbih0YXJnZXQsIHJlY2VpdmVyLCBhcmdzKSB7XG4gICAgLy8gdGFyZ2V0LmFwcGx5KHJlY2VpdmVyLCBhcmdzKVxuICAgIHJldHVybiBGdW5jdGlvbi5wcm90b3R5cGUuYXBwbHkuY2FsbCh0YXJnZXQsIHJlY2VpdmVyLCBhcmdzKTtcbiAgfSxcbiAgY29uc3RydWN0OiBmdW5jdGlvbih0YXJnZXQsIGFyZ3MsIG5ld1RhcmdldCkge1xuICAgIC8vIHJldHVybiBuZXcgdGFyZ2V0KC4uLmFyZ3MpO1xuXG4gICAgLy8gaWYgdGFyZ2V0IGlzIGEgcHJveHksIGludm9rZSBpdHMgXCJjb25zdHJ1Y3RcIiB0cmFwXG4gICAgdmFyIGhhbmRsZXIgPSBkaXJlY3RQcm94aWVzLmdldCh0YXJnZXQpO1xuICAgIGlmIChoYW5kbGVyICE9PSB1bmRlZmluZWQpIHtcbiAgICAgIHJldHVybiBoYW5kbGVyLmNvbnN0cnVjdChoYW5kbGVyLnRhcmdldCwgYXJncywgbmV3VGFyZ2V0KTtcbiAgICB9XG4gICAgXG4gICAgaWYgKHR5cGVvZiB0YXJnZXQgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcInRhcmdldCBpcyBub3QgYSBmdW5jdGlvbjogXCIgKyB0YXJnZXQpO1xuICAgIH1cbiAgICBpZiAobmV3VGFyZ2V0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIG5ld1RhcmdldCA9IHRhcmdldDtcbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKHR5cGVvZiBuZXdUYXJnZXQgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwibmV3VGFyZ2V0IGlzIG5vdCBhIGZ1bmN0aW9uOiBcIiArIHRhcmdldCk7XG4gICAgICB9ICAgICAgXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ldyAoRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQuYXBwbHkobmV3VGFyZ2V0LCBbbnVsbF0uY29uY2F0KGFyZ3MpKSk7XG4gIH1cbn07XG5cbi8vIGZlYXR1cmUtdGVzdCB3aGV0aGVyIHRoZSBQcm94eSBnbG9iYWwgZXhpc3RzLCB3aXRoXG4vLyB0aGUgaGFybW9ueS1lcmEgUHJveHkuY3JlYXRlIEFQSVxuaWYgKHR5cGVvZiBQcm94eSAhPT0gXCJ1bmRlZmluZWRcIiAmJlxuICAgIHR5cGVvZiBQcm94eS5jcmVhdGUgIT09IFwidW5kZWZpbmVkXCIpIHtcblxuICB2YXIgcHJpbUNyZWF0ZSA9IFByb3h5LmNyZWF0ZSxcbiAgICAgIHByaW1DcmVhdGVGdW5jdGlvbiA9IFByb3h5LmNyZWF0ZUZ1bmN0aW9uO1xuXG4gIHZhciByZXZva2VkSGFuZGxlciA9IHByaW1DcmVhdGUoe1xuICAgIGdldDogZnVuY3Rpb24oKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoXCJwcm94eSBpcyByZXZva2VkXCIpOyB9XG4gIH0pO1xuXG4gIGdsb2JhbC5Qcm94eSA9IGZ1bmN0aW9uKHRhcmdldCwgaGFuZGxlcikge1xuICAgIC8vIGNoZWNrIHRoYXQgdGFyZ2V0IGlzIGFuIE9iamVjdFxuICAgIGlmIChPYmplY3QodGFyZ2V0KSAhPT0gdGFyZ2V0KSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiUHJveHkgdGFyZ2V0IG11c3QgYmUgYW4gT2JqZWN0LCBnaXZlbiBcIit0YXJnZXQpO1xuICAgIH1cbiAgICAvLyBjaGVjayB0aGF0IGhhbmRsZXIgaXMgYW4gT2JqZWN0XG4gICAgaWYgKE9iamVjdChoYW5kbGVyKSAhPT0gaGFuZGxlcikge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlByb3h5IGhhbmRsZXIgbXVzdCBiZSBhbiBPYmplY3QsIGdpdmVuIFwiK2hhbmRsZXIpO1xuICAgIH1cblxuICAgIHZhciB2SGFuZGxlciA9IG5ldyBWYWxpZGF0b3IodGFyZ2V0LCBoYW5kbGVyKTtcbiAgICB2YXIgcHJveHk7XG4gICAgaWYgKHR5cGVvZiB0YXJnZXQgPT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgcHJveHkgPSBwcmltQ3JlYXRlRnVuY3Rpb24odkhhbmRsZXIsXG4gICAgICAgIC8vIGNhbGwgdHJhcFxuICAgICAgICBmdW5jdGlvbigpIHtcbiAgICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgICAgcmV0dXJuIHZIYW5kbGVyLmFwcGx5KHRhcmdldCwgdGhpcywgYXJncyk7XG4gICAgICAgIH0sXG4gICAgICAgIC8vIGNvbnN0cnVjdCB0cmFwXG4gICAgICAgIGZ1bmN0aW9uKCkge1xuICAgICAgICAgIHZhciBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKTtcbiAgICAgICAgICByZXR1cm4gdkhhbmRsZXIuY29uc3RydWN0KHRhcmdldCwgYXJncyk7XG4gICAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICBwcm94eSA9IHByaW1DcmVhdGUodkhhbmRsZXIsIE9iamVjdC5nZXRQcm90b3R5cGVPZih0YXJnZXQpKTtcbiAgICB9XG4gICAgZGlyZWN0UHJveGllcy5zZXQocHJveHksIHZIYW5kbGVyKTtcbiAgICByZXR1cm4gcHJveHk7XG4gIH07XG5cbiAgZ2xvYmFsLlByb3h5LnJldm9jYWJsZSA9IGZ1bmN0aW9uKHRhcmdldCwgaGFuZGxlcikge1xuICAgIHZhciBwcm94eSA9IG5ldyBQcm94eSh0YXJnZXQsIGhhbmRsZXIpO1xuICAgIHZhciByZXZva2UgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciB2SGFuZGxlciA9IGRpcmVjdFByb3hpZXMuZ2V0KHByb3h5KTtcbiAgICAgIGlmICh2SGFuZGxlciAhPT0gbnVsbCkge1xuICAgICAgICB2SGFuZGxlci50YXJnZXQgID0gbnVsbDtcbiAgICAgICAgdkhhbmRsZXIuaGFuZGxlciA9IHJldm9rZWRIYW5kbGVyO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9O1xuICAgIHJldHVybiB7cHJveHk6IHByb3h5LCByZXZva2U6IHJldm9rZX07XG4gIH1cbiAgXG4gIC8vIGFkZCB0aGUgb2xkIFByb3h5LmNyZWF0ZSBhbmQgUHJveHkuY3JlYXRlRnVuY3Rpb24gbWV0aG9kc1xuICAvLyBzbyBvbGQgY29kZSB0aGF0IHN0aWxsIGRlcGVuZHMgb24gdGhlIGhhcm1vbnktZXJhIFByb3h5IG9iamVjdFxuICAvLyBpcyBub3QgYnJva2VuLiBBbHNvIGVuc3VyZXMgdGhhdCBtdWx0aXBsZSB2ZXJzaW9ucyBvZiB0aGlzXG4gIC8vIGxpYnJhcnkgc2hvdWxkIGxvYWQgZmluZVxuICBnbG9iYWwuUHJveHkuY3JlYXRlID0gcHJpbUNyZWF0ZTtcbiAgZ2xvYmFsLlByb3h5LmNyZWF0ZUZ1bmN0aW9uID0gcHJpbUNyZWF0ZUZ1bmN0aW9uO1xuXG59IGVsc2Uge1xuICAvLyBQcm94eSBnbG9iYWwgbm90IGRlZmluZWQsIG9yIG9sZCBBUEkgbm90IGF2YWlsYWJsZVxuICBpZiAodHlwZW9mIFByb3h5ID09PSBcInVuZGVmaW5lZFwiKSB7XG4gICAgLy8gUHJveHkgZ2xvYmFsIG5vdCBkZWZpbmVkLCBhZGQgYSBQcm94eSBmdW5jdGlvbiBzdHViXG4gICAgZ2xvYmFsLlByb3h5ID0gZnVuY3Rpb24oX3RhcmdldCwgX2hhbmRsZXIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcInByb3hpZXMgbm90IHN1cHBvcnRlZCBvbiB0aGlzIHBsYXRmb3JtLiBPbiB2OC9ub2RlL2lvanMsIG1ha2Ugc3VyZSB0byBwYXNzIHRoZSAtLWhhcm1vbnlfcHJveGllcyBmbGFnXCIpO1xuICAgIH07XG4gIH1cbiAgLy8gUHJveHkgZ2xvYmFsIGRlZmluZWQgYnV0IG9sZCBBUEkgbm90IGF2YWlsYWJsZVxuICAvLyBwcmVzdW1hYmx5IFByb3h5IGdsb2JhbCBhbHJlYWR5IHN1cHBvcnRzIG5ldyBBUEksIGxlYXZlIHVudG91Y2hlZFxufVxuXG4vLyBmb3Igbm9kZS5qcyBtb2R1bGVzLCBleHBvcnQgZXZlcnkgcHJvcGVydHkgaW4gdGhlIFJlZmxlY3Qgb2JqZWN0XG4vLyBhcyBwYXJ0IG9mIHRoZSBtb2R1bGUgaW50ZXJmYWNlXG5pZiAodHlwZW9mIGV4cG9ydHMgIT09ICd1bmRlZmluZWQnKSB7XG4gIE9iamVjdC5rZXlzKFJlZmxlY3QpLmZvckVhY2goZnVuY3Rpb24gKGtleSkge1xuICAgIGV4cG9ydHNba2V5XSA9IFJlZmxlY3Rba2V5XTtcbiAgfSk7XG59XG5cbi8vIGZ1bmN0aW9uLWFzLW1vZHVsZSBwYXR0ZXJuXG59KHR5cGVvZiBleHBvcnRzICE9PSAndW5kZWZpbmVkJyA/IGdsb2JhbCA6IHRoaXMpKTsiLCJjb25zdCBtYkhlbHBlciA9IHtcbiAgICBwcm9taXNlczoge30sXG4gICAgYWRkU291cmNlQW5kTGF5ZXJzKHNvdXJjZU9wdGlvbnMsbGF5ZXJPcHRpb25zQXJyYXkpeyAvLyB0aGlzID0gbWFwXG4gICAgICAgIHZhciBzb3VyY2VOYW1lID0gc291cmNlT3B0aW9ucy5uYW1lO1xuICAgICAgICBtYkhlbHBlci5wcm9taXNlc1tzb3VyY2VPcHRpb25zLm5hbWVdID0gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHsgLy8gVE8gRE86IGZpZ3VyZSBvdXQgcmVqZWN0P1xuICAgICAgICAgICAgZGVsZXRlIHNvdXJjZU9wdGlvbnMubmFtZTtcbiAgICAgICAgICAgIGZ1bmN0aW9uIGNoZWNrRGF0YUxvYWRlZCgpe1xuICAgICAgICAgICAgICAgIGlmICggdGhpcy5nZXRTb3VyY2Uoc291cmNlTmFtZSkgKXsgLy8gaWYgYWRkU291cmNlIGhhcyB0YWtlbiBlZmZlY3RcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vZmYoJ3JlbmRlcicsIGNoZWNrRGF0YUxvYWRlZCk7IC8vIHR1cm4gb2ZmIHRoZSBsaXN0ZW5lciBmb3IgcmVuZGVyXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5vbigncmVuZGVyJywgY2hlY2tEYXRhTG9hZGVkKTtcbiAgICAgICAgICAgIHRoaXMuYWRkU291cmNlKHNvdXJjZU5hbWUsIHNvdXJjZU9wdGlvbnMpO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGxheWVyUHJvbWlzZXMgPSBbXTtcbiAgICAgICAgcmV0dXJuIG1iSGVscGVyLnByb21pc2VzW3NvdXJjZU5hbWVdLnRoZW4oKCkgPT4geyBcbiAgICAgICAgICAgIGxheWVyT3B0aW9uc0FycmF5LmZvckVhY2goKGVhY2gpID0+IHtcbiAgICAgICAgICAgICAgICBsYXllclByb21pc2VzLnB1c2goXG4gICAgICAgICAgICAgICAgICAgIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7IC8vIFRPIERPOiBmaWd1cmUgb3V0IHJlamVjdD9cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBiZWZvcmVMYXllciA9IGVhY2guYmVmb3JlTGF5ZXIgPyBlYWNoLmJlZm9yZUxheWVyIDogJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgZWFjaC5iZWZvcmVMYXllcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVhY2guc291cmNlID0gc291cmNlTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGNoZWNrTGF5ZXJMb2FkZWQoKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIHRoaXMuZ2V0TGF5ZXIoZWFjaC5pZCkgKXsgLy8gaWYgYWRkTGF5ZXIgIGhhcyB0YWtlbiBlZmZlY3RcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vZmYoJ3JlbmRlcicsIGNoZWNrTGF5ZXJMb2FkZWQpOyAvLyB0dXJuIG9mZiB0aGUgbGlzdGVuZXIgZm9yIHJlbmRlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub24oJ3JlbmRlcicsIGNoZWNrTGF5ZXJMb2FkZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRMYXllcihlYWNoLCBiZWZvcmVMYXllcik7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKGxheWVyUHJvbWlzZXMpO1xuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG5leHBvcnRzLmFkZFNvdXJjZUFuZExheWVycyA9IG1iSGVscGVyLmFkZFNvdXJjZUFuZExheWVyczsiXX0=
