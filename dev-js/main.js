(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
'use strict';

var _Bars = require('../js-exports/Bars');

var _d3Tip = require('../js-vendor/d3-tip');

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } } /* exported Charts, d3Tip */
//import { Donuts } from '../js-exports/Donuts';


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

},{"../js-exports/Bars":2,"../js-vendor/d3-tip":3,"mapbox-helper":4}],2:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkZXYtanMvbWFpbi5lczYiLCJqcy1leHBvcnRzL0JhcnMuanMiLCJqcy12ZW5kb3IvZDMtdGlwLmpzIiwibm9kZV9tb2R1bGVzL21hcGJveC1oZWxwZXIvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztBQ0VDOztBQUNBOztvTUFIQTtBQUNBOzs7QUFJQTs7QUFFRDs7Ozs7Ozs7QUFRQTs7Ozs7QUFLQSxPQUFPLE1BQVAsR0FBa0IsWUFBVTtBQUM1Qjs7QUFDRSxVQUFTLGFBQVQsR0FBeUI7QUFDdkIsTUFBRztBQUNGLE9BQUksU0FBUyxTQUFTLGFBQVQsQ0FBd0IsUUFBeEIsQ0FBYjtBQUNBLFVBQU8sQ0FBQyxDQUFFLE9BQU8scUJBQVYsS0FDRixPQUFPLFVBQVAsQ0FBbUIsT0FBbkIsS0FBZ0MsT0FBTyxVQUFQLENBQW1CLG9CQUFuQixDQUQ5QixDQUFQO0FBRUEsR0FKRCxDQUlDLE9BQU8sQ0FBUCxFQUFXO0FBQUUsVUFBTyxLQUFQO0FBQWU7QUFDOUI7QUFDRCxTQUFRLEdBQVIsQ0FBWSxlQUFaO0FBQ0QsS0FBSyxtQkFBbUIsSUFBeEIsRUFBOEI7QUFDN0IsS0FBRyxNQUFILENBQVUsZ0JBQVYsRUFDRSxPQURGLENBQ1UsU0FEVixFQUNxQixJQURyQixFQUVFLElBRkYsQ0FFTyxzRkFGUDtBQUdBO0FBQ0Q7O0FBRUcsVUFBUyxXQUFULEdBQXVCLDhGQUF2QjtBQUNBLElBQUcsU0FBSCxDQUFhLFlBQWIsRUFDRSxFQURGLENBQ0ssT0FETCxFQUNjLFlBQU07QUFDbEIsS0FBRyxLQUFILENBQVMsY0FBVDtBQUNBLEVBSEY7QUFJQSxLQUFNLFdBQVcsUUFBUSxlQUFSLENBQWpCO0FBQ0Q7QUFDQyxLQUFNLE1BQU0sR0FBRyxHQUFILEdBQVMsSUFBVCxDQUFj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QUNBLDZCQUFTLGdCQUFULEdBQTJCO0FBQ3ZCLDRCQUFLLEtBQUssUUFBTCxDQUFjLEtBQUssRUFBbkIsQ0FBTCxFQUE2QjtBQUFFO0FBQzNCLG9DQUFRLElBQVI7QUFDQSxpQ0FBSyxHQUFMLENBQVMsUUFBVCxFQUFtQixnQkFBbkIsRUFGeUIsQ0FFYTtBQUN6QztBQUNKO0FBQ0QsMEJBQUssRUFBTCxDQUFRLFFBQVIsRUFBa0IsZ0JBQWxCO0FBQ0EsMEJBQUssUUFBTCxDQUFjLElBQWQsRUFBb0IsV0FBcEI7QUFDSCxpQkFaRCxDQURKO0FBZUgsYUFoQkQ7QUFpQkEsbUJBQU8sUUFBUSxHQUFSLENBQVksYUFBWixDQUFQO0FBQ0gsU0FuQk0sQ0FBUDtBQW9CSDtBQXBDWSxDQUFqQjs7QUF1Q0EsUUFBUSxrQkFBUixHQUE2QixTQUFTLGtCQUF0QyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9cmV0dXJuIGV9KSgpIiwiIC8qIGV4cG9ydGVkIENoYXJ0cywgZDNUaXAgKi9cbiAvL2ltcG9ydCB7IERvbnV0cyB9IGZyb20gJy4uL2pzLWV4cG9ydHMvRG9udXRzJztcbiBpbXBvcnQgeyBCYXJzIH0gZnJvbSAnLi4vanMtZXhwb3J0cy9CYXJzJztcbiBpbXBvcnQgeyBkM1RpcCB9IGZyb20gJy4uL2pzLXZlbmRvci9kMy10aXAnO1xuIFxuIC8qIHBvbHlmaWxscyBuZWVkZWQ6IFByb21pc2UgVE8gRE86IE9USEVSUz9cbiAqL1xuLypcbmltcG9ydCB7IHJlZmxlY3QsIGFycmF5RmluZCwgU1ZHSW5uZXJIVE1MLCBTVkdGb2N1cyB9IGZyb20gJy4uL2pzLXZlbmRvci9wb2x5ZmlsbHMnO1xuaW1wb3J0IHsgSGVscGVycyB9IGZyb20gJy4uL2pzLWV4cG9ydHMvSGVscGVycyc7XG5pbXBvcnQgeyBkM1RpcCB9IGZyb20gJy4uL2pzLXZlbmRvci9kMy10aXAnO1xuaW1wb3J0IHsgY3JlYXRlQnJvd3NlQnV0dG9uIH0gZnJvbSAnLi4vanMtZXhwb3J0cy9Ccm93c2VCdXR0b25zJztcbmltcG9ydCB7IGNyZWF0ZVJlc3VsdEl0ZW0gfSBmcm9tICcuLi9qcy1leHBvcnRzL1Jlc3VsdEl0ZW1zJzsgXG4qL1xuICBcbi8qXG50byBkbyA6IHNlZSBhbHNvIGh0dHBzOi8vd3d3Lm1hcGJveC5jb20vbWFwYm94LWdsLWpzL2V4YW1wbGUvaGVhdG1hcC1sYXllci9cbiBcblxuKi9cbndpbmRvdy50aGVNYXAgID0gKGZ1bmN0aW9uKCl7ICAgXG5cInVzZSBzdHJpY3RcIjtcblx0IGZ1bmN0aW9uIHdlYmdsX3N1cHBvcnQoKSB7IFxuXHQgICB0cnl7XG5cdCAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggJ2NhbnZhcycgKTsgXG5cdCAgICByZXR1cm4gISEgd2luZG93LldlYkdMUmVuZGVyaW5nQ29udGV4dCAmJiAoIFxuXHQgICAgICAgICBjYW52YXMuZ2V0Q29udGV4dCggJ3dlYmdsJyApIHx8IGNhbnZhcy5nZXRDb250ZXh0KCAnZXhwZXJpbWVudGFsLXdlYmdsJyApICk7XG5cdCAgIH1jYXRjaCggZSApIHsgcmV0dXJuIGZhbHNlOyB9IFxuXHQgfVxuXHQgY29uc29sZS5sb2cod2ViZ2xfc3VwcG9ydCgpKTtcblx0aWYgKCB3ZWJnbF9zdXBwb3J0KCkgPT0gbnVsbCApe1xuXHRcdGQzLnNlbGVjdCgnI3dlYmdsLXdhcm5pbmcnKVxuXHRcdFx0LmNsYXNzZWQoJ3dhcm5pbmcnLCB0cnVlKVxuXHRcdFx0LnRleHQoJ1lvdXIgZGV2aWNlIG1heSBub3Qgc3VwcG9ydCB0aGUgZ3JhcGhpY3MgdGhpcyB0b29sIHJlbGllcyBvbjsgcGxlYXNlIHRyeSBvbiBhbm90aGVyLicpO1xuXHR9XG5cdC8vdmFyIHRpcCA9IGQzLnRpcCgpLmF0dHIoJ2NsYXNzJywgJ2QzLXRpcCcpLmh0bWwoZnVuY3Rpb24oZCkgeyByZXR1cm4gZDsgfSk7XG5cdFxuICAgIG1hcGJveGdsLmFjY2Vzc1Rva2VuID0gJ3BrLmV5SjFJam9pYjNOMFpYSnRZVzVxSWl3aVlTSTZJbU5wZG5VNWRIVm5kakEyZURZeWIzQTNObmcxY0dKM1pYb2lmUS5Yb19rLWt6R2ZZWF9Zb19SRGNIREJnJztcbiAgICBkMy5zZWxlY3RBbGwoJy5oZWxwLWxpbmsnKVxuICAgIFx0Lm9uKCdjbGljaycsICgpID0+IHtcbiAgICBcdFx0ZDMuZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBcdH0pO1xuICAgIGNvbnN0IG1iSGVscGVyID0gcmVxdWlyZSgnbWFwYm94LWhlbHBlcicpO1xuICAgLy8gZDMudGlwID0gcmVxdWlyZSgnZDMtdGlwJyk7XG4gICAgY29uc3QgdGlwID0gZDMudGlwKCkuYXR0cignY2xhc3MnLCAnZDMtdGlwJykuZGlyZWN0aW9uKCd3JykuaHRtbChmdW5jdGlvbihkKSB7IGNvbnNvbGUubG9nKHRoaXMsZCk7cmV0dXJuIGRbZDMuc2VsZWN0KHRoaXMucGFyZW50Tm9kZS5wYXJlbnROb2RlLnBhcmVudE5vZGUpLmF0dHIoJ2lkJykucmVwbGFjZSgnLScsJycpXTsgfSk7XG4gICBcdGNvbnN0IHRoZUNoYXJ0cyA9IFtdO1xuICAgXG4gICAgdmFyIGdlb2pzb247XG4gICAgdmFyIGZlYXR1cmVQcm9wZXJ0aWVzQnlJZCA9IG5ldyBNYXAoKTsgXG4gICAgdmFyIGdhdGVDaGVjayA9IDA7XG5cbiAgICB2YXIgc2l6ZVpvb21UaHJlc2hvbGQgPSA4O1xuICAgIFxuICAgIHZhciB0aGVNYXAgPSBuZXcgbWFwYm94Z2wuTWFwKHtcblx0ICAgIGNvbnRhaW5lcjogJ21hcCcsXG5cdCAgICBzdHlsZTogJ21hcGJveDovL3N0eWxlcy9vc3Rlcm1hbmovY2pmMDNvMzdiM3R2ZTJycXAyaW53NmExZicsXG5cdCAgICBjZW50ZXI6IFstOTUuMTQ5MzUxNDg2NDU5MDczLCAzNy45ODQ2NzMzNzA4NTU5OV0sXG5cdCAgICB6b29tOiAzLFxuXHQgICAgbWF4Qm91bmRzOiBbWy0xNDIuODg3MDU3MTQ3NDYzNjIsIDE2LjA1ODM0NDk0ODQzMjQwNl0sWy01MS45MDIzMDE3ODY5NzMxLDU1Ljc2NjkwMDY3NDE3MTM4XV0sXG5cdCAgICBtaW5ab29tOiAxLjUsXG5cdCAgICBhdHRyaWJ1dGlvbkNvbnRyb2w6IGZhbHNlLFxuXHR9KTtcblxuXHR2YXIgbmF2ID0gbmV3IG1hcGJveGdsLk5hdmlnYXRpb25Db250cm9sKHtzaG93Q29tcGFzczpmYWxzZX0pO1xuXHR0aGVNYXAuYWRkQ29udHJvbChuYXYsICd0b3AtcmlnaHQnKTtcblxuXHR2YXIgbWVkaWFuSW5jb21lcyA9IG5ldyBNYXAoKTtcblx0dG9HZW9KU09OKCdwb2xpY2llcy5jc3YnKTtcblx0dGhlTWFwLm9uKCdsb2FkJywgZnVuY3Rpb24oKXtcblx0XHRnYXRlQ2hlY2srKztcblx0XHRnYXRlKCk7XG5cdH0pO1xuXHRmdW5jdGlvbiBnYXRlKCl7XG5cdFx0aWYgKCBnYXRlQ2hlY2sgPCAyICl7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHVwZGF0ZUFsbCgpO1xuXHRcdGFkZFVuY2x1c3RlcmVkKCk7XG5cdFx0YWRkQ2x1c3RlcmVkKCk7XG5cdFx0Ly9jYWxjdWxhdGVaU2NvcmVzKCdwcmVtJyk7XG5cdH0gLy8gZW5kIGdhdGVcblxuXHQvKnZhciBjZW5zdXNUcmFjdHNJblZpZXcgPSBuZXcgU2V0KCk7XG5cdGZ1bmN0aW9uIGNhbGN1bGF0ZU1lZGlhbkluY29tZXMoaW5WaWV3SURzKXtcblx0XHRjb25zb2xlLmxvZyhpblZpZXdJRHMpO1xuXHRcdHZhciBtZWRpYW5JbmNvbWVzID0gW107XG5cdFx0Y2Vuc3VzVHJhY3RzSW5WaWV3LmNsZWFyKCk7XG5cdFx0aW5WaWV3SURzLmZvckVhY2goZCA9PiB7XG5cdFx0XHRjb25zb2xlLmxvZyhkKTtcblx0XHRcdHZhciBmZWF0dXJlID0gZ2VvanNvbi5mZWF0dXJlcy5maW5kKGYgPT4gZi5wcm9wZXJ0aWVzLmlkID09PSBkKTtcblx0XHRcdHZhciBjZW5zdXNUcmFjdCA9IGZlYXR1cmUuY2VuX3RyYWN0O1xuXHRcdFx0aWYgKCAhY2Vuc3VzVHJhY3RzSW5WaWV3LmhhcyhjZW5zdXNUcmFjdCkpe1xuXHRcdFx0XHRjZW5zdXNUcmFjdHNJblZpZXcuYWRkKGNlbnN1c1RyYWN0KTtcblx0XHRcdFx0bWVkaWFuSW5jb21lcy5wdXNoKGZlYXR1cmUubWVkX2luY29tZSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0cmV0dXJuIG1lZGlhbkluY29tZXM7XG5cdH0qL1xuXHRmdW5jdGlvbiBjYWxjdWxhdGVaU2NvcmVzKGZpZWxkLCBjdXRvZmYgPSBudWxsLCBoYXJkQ3V0b2ZmID0gbnVsbCwgaWdub3JlID0gW10gKXsgIC8vIGN1dG9mZiBzcGVjaWZpZXMgdXBwZXIgYm91bmQgdG8gZ2V0IHJpZCBvZiBvdXRsaWVyc1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQgIC8vIGEgd2VhayBjdXRvZmYgY2FsY3VsYXRlcyB2YWx1ZXMgZm9yIHdob2xlIHNldCBidXRcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ICAvLyBzZXRzIG1heCBmb3IgdGhlIHZpeiBiYXNlZCBvbiB0aGUgY3V0b2ZmIHZhbHVlLiBhIGhhcmRcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ICAvLyBjdXRvZmYgZXhjbHVkZXMgdmFsdWVzIGJleW9uZCB0aGUgY3V0b2ZmIGZyb20gdGhlIFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQgIC8vIGNhbGN1bGF0aW9uc1x0XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCAgLy8gdGhlIGlnbm9yZSBhcnJheSBpcyB2YWx1ZXMgdGhhdCBzaG91bGQgYmUgdHJlYXRlZCBhcyBpbnZhbGlkXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCAgLy8gc3VjaCBhcyBhbGwgdGhlIGVycm9uZW91ZSAkMjUwayBob21lIHZhbHVlcy5cblx0XHRjb25zb2xlLmxvZygnY2FsY3VsYXRpbmcgei1zY29yZXMnKTtcblx0XHR2YXIgbWVhbiA9IGQzLm1lYW4oZ2VvanNvbi5mZWF0dXJlcywgZCA9PiB7XG5cdFx0XHRpZiAoIGhhcmRDdXRvZmYgPT09IG51bGwgKSB7XG5cdFx0XHRcdHJldHVybiBpZ25vcmUuaW5kZXhPZihkLnByb3BlcnRpZXNbZmllbGRdKSA9PT0gLTEgPyBkLnByb3BlcnRpZXNbZmllbGRdIDogbnVsbDtcblx0XHRcdH1cblx0XHRcdGlmICggZC5wcm9wZXJ0aWVzW2ZpZWxkXSA8PSBoYXJkQ3V0b2ZmICl7XG5cdFx0XHRcdHJldHVybiBpZ25vcmUuaW5kZXhPZihkLnByb3BlcnRpZXNbZmllbGRdKSA9PT0gLTEgPyBkLnByb3BlcnRpZXNbZmllbGRdIDogbnVsbDtcblx0XHRcdH1cblx0XHR9KTtcblx0XHR2YXIgc2QgPSBkMy5kZXZpYXRpb24oZ2VvanNvbi5mZWF0dXJlcywgZCA9PiB7XG5cdFx0XHRpZiAoIGhhcmRDdXRvZmYgPT09IG51bGwgKSB7XG5cdFx0XHRcdHJldHVybiBpZ25vcmUuaW5kZXhPZihkLnByb3BlcnRpZXNbZmllbGRdKSA9PT0gLTEgPyBkLnByb3BlcnRpZXNbZmllbGRdIDogbnVsbDtcblx0XHRcdH1cblx0XHRcdGlmICggZC5wcm9wZXJ0aWVzW2ZpZWxkXSA8PSBoYXJkQ3V0b2ZmICl7XG5cdFx0XHRcdHJldHVybiBpZ25vcmUuaW5kZXhPZihkLnByb3BlcnRpZXNbZmllbGRdKSA9PT0gLTEgPyBkLnByb3BlcnRpZXNbZmllbGRdIDogbnVsbDtcblx0XHRcdH1cblx0XHR9KTtcblx0XHR2YXIgbWluLFxuXHRcdFx0bWF4LFxuXHRcdFx0Y3V0b2ZmWiA9IGN1dG9mZiA/ICggY3V0b2ZmIC0gbWVhbiApIC8gc2QgOiBudWxsO1xuXG5cdFx0Y29uc29sZS5sb2coJ2N1dG9mZiBpcyAnICsgY3V0b2ZmWik7XG5cdFx0Z2VvanNvbi5mZWF0dXJlcy5mb3JFYWNoKGVhY2ggPT4ge1xuXHRcdFx0aWYgKCBoYXJkQ3V0b2ZmICYmIGVhY2gucHJvcGVydGllc1tmaWVsZF0gPiBoYXJkQ3V0b2ZmIHx8IGlnbm9yZS5pbmRleE9mKGVhY2gucHJvcGVydGllc1tmaWVsZF0pICE9PSAtMSApe1xuXHRcdFx0XHRlYWNoLnByb3BlcnRpZXNbZmllbGQgKyAnWiddID0gbnVsbDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGVhY2gucHJvcGVydGllc1tmaWVsZCArICdaJ10gPSAoIGVhY2gucHJvcGVydGllc1tmaWVsZF0gLSBtZWFuICkgLyBzZDtcblx0XHRcdFx0bWluID0gZWFjaC5wcm9wZXJ0aWVzW2ZpZWxkICsgJ1onXSA8IG1pbiB8fCBtaW4gPT09IHVuZGVmaW5lZCA/IGVhY2gucHJvcGVydGllc1tmaWVsZCArICdaJ10gOiBtaW47XG5cdFx0XHRcdG1heCA9IGVhY2gucHJvcGVydGllc1tmaWVsZCArICdaJ10gPiBtYXggfHwgbWF4ID09PSB1bmRlZmluZWQgPyBlYWNoLnByb3BlcnRpZXNbZmllbGQgKyAnWiddIDogbWF4O1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdGNvbnNvbGUubG9nKCdhY3R1YWxNaW46JyArIG1pbiwgJ2FjdHVhbE1heDonICsgbWF4KTtcblx0XHQvL21heCA9IGQzLm1pbihbbWF4LGN1dG9mZlosM10pO1xuXHRcdC8vbWluID0gZDMubWF4KFttaW4sIC0zXSk7XG5cdFx0bWF4ID0gMi4zMztcblx0XHRtaW4gPSAtMi4zMztcblx0XHRjb25zb2xlLmxvZygnZG9uZScsIGdlb2pzb24sIG1pbiwgbWF4KTtcblx0XHRyZXR1cm4ge1xuXHRcdFx0bWluLFxuXHRcdFx0bWF4LFxuXHRcdFx0bWVhbixcblx0XHRcdHNkXG5cdFx0fTtcblx0fVxuXG5cdGZ1bmN0aW9uIGFkZFVuY2x1c3RlcmVkKCl7XG5cdFx0cmV0dXJuIG1iSGVscGVyLmFkZFNvdXJjZUFuZExheWVycy5jYWxsKHRoZU1hcCxcblx0XHRcdHsgLy8gc291cmNlXG5cdFx0XHRcdFwibmFtZVwiOiBcInBvbGljeS1wb2ludHNcIixcblx0XHQgICAgICAgIFwidHlwZVwiOiBcImdlb2pzb25cIixcblx0XHQgICAgICAgIFwiZGF0YVwiOiBnZW9qc29uXG5cdFx0XHR9LCBbIC8vIGxheWVyc1xuXHRcdFx0XHR7IC8vIGxheWVyIG9uZVxuXHQgICAgICAgICAgICBcImlkXCI6IFwicG9pbnRzXCIsXG5cdCAgICAgICAgICAgIFwidHlwZVwiOiBcImNpcmNsZVwiLFxuXHQgICAgICAgICAgICBcInNvdXJjZVwiOiBcInBvbGljeS1wb2ludHNcIixcblx0ICAgICAgICAgICAgXCJtYXh6b29tXCI6IHNpemVab29tVGhyZXNob2xkLFxuXHQgICAgICAgICAgICBcInBhaW50XCI6IHtcblx0ICAgICAgICAgICAgICBcdFwiY2lyY2xlLWNvbG9yXCI6IFtcblx0XHQgICAgICAgICAgICAgICAgJ21hdGNoJyxcblx0XHQgICAgICAgICAgICAgICAgWydnZXQnLCAndF9kZWQnXSxcblx0XHQgICAgICAgICAgICAgICAgNSwgJyMwZjQzOWMnLFxuXHRcdCAgICAgICAgICAgICAgICAvKiBvdGhlciAqLyAnIzk5MDAwMCdcblx0XHQgICAgICAgICAgICBdLFxuXHRcdCAgICAgICAgICAgIFwiY2lyY2xlLXJhZGl1c1wiOiB7XG5cdFx0ICAgICAgICAgICAgICAgICdzdG9wcyc6IFtbNSwgM10sIFs4LCAxOF1dXG5cdFx0ICAgICAgICAgICAgfSxcblx0XHQgICAgICAgICAgICBcImNpcmNsZS1vcGFjaXR5XCI6IDAuMVxuXHRcdCAgICAgICAgICAgIH1cblx0XHQgICAgICAgIH0sXG5cdFx0ICAgICAgICB7IC8vIGxheWVyIHR3b1xuXHQgICAgICAgICAgICBcImlkXCI6IFwicG9pbnRzLWRhdGEtZHJpdmVuXCIsXG5cdCAgICAgICAgICAgIFwidHlwZVwiOiBcImNpcmNsZVwiLFxuXHQgICAgICAgICAgICBcInNvdXJjZVwiOiBcInBvbGljeS1wb2ludHNcIixcblx0ICAgICAgICAgICAgXCJtaW56b29tXCI6IHNpemVab29tVGhyZXNob2xkLFxuXHQgICAgICAgICAgICBcInBhaW50XCI6IHtcblx0ICAgICAgICAgICAgICBcdFwiY2lyY2xlLWNvbG9yXCI6IFtcblx0XHQgICAgICAgICAgICAgICAgJ21hdGNoJyxcblx0XHQgICAgICAgICAgICAgICAgWydnZXQnLCAndF9kZWQnXSxcblx0XHQgICAgICAgICAgICAgICAgNSwgJyMwZjQzOWMnLFxuXHRcdCAgICAgICAgICAgICAgICAvKiBvdGhlciAqLyAnIzk5MDAwMCdcblx0XHQgICAgICAgICAgICBdLFxuXHRcdCAgICAgICAgICAgIFwiY2lyY2xlLXJhZGl1c1wiOiB7XG5cdFx0ICAgICAgICAgICAgXHRwcm9wZXJ0eTogJ3ByZW0nLFxuXHRcdCAgICAgICAgICAgICAgICB0eXBlOiAnZXhwb25lbnRpYWwnLFxuXHRcdFx0XHQgICAgICAgIHN0b3BzOiBbXG5cdFx0XHRcdCAgICAgICAgICBbNjIsIDVdLFxuXHRcdFx0XHQgICAgICAgICAgWzI1MDAsIDYwXVxuXHRcdFx0XHQgICAgICAgIF1cblx0XHQgICAgICAgICAgICB9LFxuXHRcdCAgICAgICAgICAgIFwiY2lyY2xlLW9wYWNpdHlcIjogMC4xLFxuXHRcdCAgICAgICAgICAgIFwiY2lyY2xlLXN0cm9rZS1jb2xvclwiOiBcIiNmZmZmZmZcIixcblx0XHQgICAgICAgICAgICBcImNpcmNsZS1zdHJva2Utd2lkdGhcIjogMVxuXHRcdCAgICAgICAgfVxuXHRcdFx0fV1cblx0XHQpOyBcblx0fVxuXHQvKmZ1bmN0aW9uIGNoZWNrRmVhdHVyZXNMb2FkZWQoKXtcblx0XHRpZiAoIHRoZU1hcC5sb2FkZWQoKSl7XG5cdFx0XHRcblx0XHRcdHRoZU1hcC5vZmYoJ3JlbmRlcicsIGNoZWNrRmVhdHVyZXMpO1xuXHRcdH1cblx0fSovXG5cdGZ1bmN0aW9uIGFkZENsdXN0ZXJlZCgpe1xuXHRcdFxuXHRcdG1iSGVscGVyLmFkZFNvdXJjZUFuZExheWVycy5jYWxsKHRoZU1hcCxcblx0XHQgICAgeyAvLyBzb3VyY2Vcblx0XHQgICAgXHRcIm5hbWVcIjogXCJwb2xpY2llc1wiLFxuXHRcdCAgICAgICAgXCJ0eXBlXCI6IFwiZ2VvanNvblwiLFxuXHRcdCAgICAgICAgXCJkYXRhXCI6IGdlb2pzb24sXG5cdFx0ICAgICAgICBcImNsdXN0ZXJcIjogdHJ1ZSxcblx0XHQgICAgICAgIFwiY2x1c3RlclJhZGl1c1wiOiAwLjUgLy8gUmFkaXVzIG9mIGVhY2ggY2x1c3RlciB3aGVuIGNsdXN0ZXJpbmcgcG9pbnRzIChkZWZhdWx0cyB0byA1MClcblx0XHQgICAgfSwgWyAvLyBsYXllcnNcblx0XHQgICAgICAgeyAvLyBsYXllciBvbmVcblx0XHQgICAgICAgICAgICBpZDogXCJjbHVzdGVyLWNvdW50XCIsXG5cdFx0XHQgICAgICAgIHR5cGU6IFwic3ltYm9sXCIsXG5cdFx0XHQgICAgICAgIHNvdXJjZTogXCJwb2xpY2llc1wiLFxuXHRcdFx0ICAgICAgICBmaWx0ZXI6IFtcImhhc1wiLCBcInBvaW50X2NvdW50XCJdLFxuXHRcdFx0ICAgICAgICBcIm1pbnpvb21cIjogNixcblx0XHRcdCAgICAgICAgbGF5b3V0OiB7XG5cdFx0XHQgICAgICAgICAgICBcInRleHQtZmllbGRcIjogXCJ7cG9pbnRfY291bnRfYWJicmV2aWF0ZWR9XCIsXG5cdFx0XHQgICAgICAgICAgICBcInRleHQtc2l6ZVwiOiAxMixcblxuXHRcdFx0ICAgICAgICB9LFxuXHRcdFx0ICAgICAgICBcInBhaW50XCI6IHtcblx0XHRcdCAgICAgICAgXHRcInRleHQtY29sb3JcIjogXCIjZmZmZmZmXCJcblx0XHRcdCAgICAgICAgfVxuXHRcdCAgICAgICAgfVxuXHQgICAgICAgIF0gLy8gZW5kIGxheWVycyBhcnJheVxuXHQgICAgKTsgLy8gZW5kIGFkZGxheWVyc1xuXHR9IC8vIGVuZCBhZGRDbHVzdGVyZWRcblx0ZnVuY3Rpb24gdG9HZW9KU09OKHVybCl7XG5cdFx0XG5cdFx0ZDMuY3N2KHVybCwgZnVuY3Rpb24oZXJyLCBkYXRhKXtcblx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0dGhyb3cgZXJyO1xuXHRcdFx0fVxuXHRcdFx0Ly9jb25zb2xlLmxvZyhkYXRhKTtcblx0XHRcdHZhciBmZWF0dXJlcyA9IFtdOyBcblx0XHRcdGRhdGEuZm9yRWFjaChlYWNoID0+IHtcblxuXHRcdFx0XHR2YXIgdmFsdWUgPSArZWFjaC5tZWRfaW5jb21lID8gK2VhY2gubWVkX2luY29tZSA6IG51bGw7XG5cdFx0XHRcdGlmICggIW1lZGlhbkluY29tZXMuaGFzKCtlYWNoLmNlbl90cmFjdCkgKXtcblx0XHRcdFx0XHRtZWRpYW5JbmNvbWVzLnNldCgrZWFjaC5jZW5fdHJhY3QsIHZhbHVlKTsgLy8gbm8gZHVwbGljYXRlIHRyYWN0c1xuXHRcdFx0XHR9XG5cdFx0XHRcdHZhciBjb2VyY2VkID0ge307XG5cdFx0XHRcdGZvciAoIHZhciBrZXkgaW4gZWFjaCApIHtcblx0XHRcdFx0XHRpZiAoIGVhY2guaGFzT3duUHJvcGVydHkoa2V5KSApe1xuXHRcdFx0XHRcdFx0Y29lcmNlZFtrZXldID0gIWlzTmFOKCtlYWNoW2tleV0pID8gK2VhY2hba2V5XSA6IGVhY2hba2V5XTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gIFxuXHRcdFx0XHRmZWF0dXJlUHJvcGVydGllc0J5SWQuc2V0KGNvZXJjZWQuaWQsY29lcmNlZCk7XG5cdFx0XHRcdGZlYXR1cmVzLnB1c2goe1xuXHRcdFx0XHRcdFwidHlwZVwiOiBcIkZlYXR1cmVcIixcblx0XHRcdFx0XHRcInByb3BlcnRpZXNcIjogY29lcmNlZCxcblx0XHRcdFx0XHRcImdlb21ldHJ5XCI6IHtcblx0XHRcdFx0XHRcdFwidHlwZVwiOiBcIlBvaW50XCIsXG5cdFx0XHRcdFx0XHRcImNvb3JkaW5hdGVzXCI6IFsrZWFjaC5sb25naXR1ZGUsICtlYWNoLmxhdGl0dWRlXVxuXHRcdFx0XHRcdH0gICBcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTsgLy8gZW5kIGZvckVhY2hcblx0XHRcdGNvbnNvbGUubG9nKG1lZGlhbkluY29tZXMpO1xuXHRcdFx0Y29uc29sZS5sb2coZmVhdHVyZVByb3BlcnRpZXNCeUlkKTtcblx0XHRcdGdlb2pzb24gPSAge1xuXHRcdFx0XHRcInR5cGVcIjogXCJGZWF0dXJlQ29sbGVjdGlvblwiLFxuXHRcdFx0XHRcImZlYXR1cmVzXCI6IGZlYXR1cmVzXG5cdFx0XHR9O1xuXHRcdFx0dGhlQ2hhcnRzLnB1c2goIC8vIHNob3VsZCBiZSBhYmxlIHRvIGNyZWF0ZSBjaGFydHMgbm93LCB3aGV0aGVyIG9yIG5vdCBtYXAgaGFzIGxvYWRlZC4gbWFwIG5lZWRzIHRvIGhhdmVcblx0XHRcdFx0XHRcdFx0Ly8gbG9hZGVkIGZvciB0aGVtIHRvIHVwZGF0ZSwgdGhvdWdoLlxuXHRcdFx0XHRuZXcgQmFycy5CYXIoeyBcblx0XHRcdFx0XHR0aXRsZTogJ1Byb3BlcnRpZXMgaW4gdmlldycsIFxuXHRcdFx0XHRcdG1hcmdpbjoge1xuXHRcdFx0XHRcdFx0dG9wOjAsXG5cdFx0XHRcdFx0XHRyaWdodDoxLFxuXHRcdFx0XHRcdFx0Ym90dG9tOjAsXG5cdFx0XHRcdFx0XHRsZWZ0OjEgXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRoZWlnaHRUb1dpZHRoOiAwLjA1LFxuXHRcdFx0XHRcdGNvbnRhaW5lcjogJyNpbi12aWV3LWJhcicsXG5cdFx0XHRcdFx0ZGF0YTogZ2VvanNvbi5mZWF0dXJlcyxcblx0XHRcdFx0XHRudW1lcmF0b3IoaW5WaWV3SURzKXtcblx0XHRcdFx0XHRcdHJldHVybiBpblZpZXdJRHMuc2l6ZTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGRlbm9taW5hdG9yKCl7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5kYXRhLmxlbmd0aDtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHRleHRGdW5jdGlvbihuLGQpe1xuXHRcdFx0XHRcdFx0cmV0dXJuIGAke2QzLmZvcm1hdChcIixcIikobil9IG9mICR7ZDMuZm9ybWF0KFwiLFwiKShkKX0gKCR7ZDMuZm9ybWF0KFwiLjAlXCIpKG4gLyBkKX0pYDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pLFxuXHRcdFx0XHRuZXcgQmFycy5CYXIoe1xuXHRcdFx0XHRcdHRpdGxlOiAnLi4uIHdpdGggbG93IGRlZHVjdGlibGUnLCBcblx0XHRcdFx0XHRtYXJnaW46IHtcblx0XHRcdFx0XHRcdHRvcDowLFxuXHRcdFx0XHRcdFx0cmlnaHQ6MSxcblx0XHRcdFx0XHRcdGJvdHRvbTowLFxuXHRcdFx0XHRcdFx0bGVmdDoxIFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aGVpZ2h0VG9XaWR0aDogMC4wNSxcblx0XHRcdFx0XHRpbmZvTWFyazp0cnVlLFxuXHRcdFx0XHRcdGNvbnRhaW5lcjogJyNkZWR1Y3RpYmxlLWJhcicsXG5cdFx0XHRcdFx0ZGF0YTogZ2VvanNvbi5mZWF0dXJlcyxcblx0XHRcdFx0XHRudW1lcmF0b3IoaW5WaWV3SURzKXtcblx0XHRcdFx0XHRcdGlmICggaW5WaWV3SURzLnNpemUgPT09IDAgKXtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMubWluO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0dmFyIGZpbHRlcmVkRGF0YSA9IHRoaXMuZGF0YS5maWx0ZXIoZWFjaCA9PiBpblZpZXdJRHMuaGFzKGVhY2gucHJvcGVydGllcy5pZCkpLFxuXHRcdFx0XHRcdFx0XHRudW1iZXJNYXRjaGluZyA9IDA7XG5cdFx0XHRcdFx0XHRmaWx0ZXJlZERhdGEuZm9yRWFjaChlYWNoID0+IHtcblx0XHRcdFx0XHRcdFx0aWYgKCBlYWNoLnByb3BlcnRpZXMudF9kZWQgPCA1ICl7XG5cdFx0XHRcdFx0XHRcdFx0bnVtYmVyTWF0Y2hpbmcrKztcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gbnVtYmVyTWF0Y2hpbmc7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRkZW5vbWluYXRvcihpblZpZXdJRHMpeyAvLyBmb3IgdGhpcyBvbmUgZGVub21pbmF0b3IgaXMgbnVtYmVyIG9mIHBvbGljaWVzIGluIHZpZXdcblx0XHRcdFx0XHRcdCByZXR1cm4gaW5WaWV3SURzLnNpemU7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR0ZXh0RnVuY3Rpb24obixkKXtcblx0XHRcdFx0XHRcdGlmIChpblZpZXdJRHMuc2l6ZSA9PT0gMCl7XG5cdFx0XHRcdFx0XHRcdHJldHVybiAnbm9uZSBpbiB2aWV3Jztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybiBgJHtkMy5mb3JtYXQoXCIsXCIpKG4pfSBvZiAke2QzLmZvcm1hdChcIixcIikoZCl9ICgke2QzLmZvcm1hdChcIi4wJVwiKShuIC8gZCl9KWA7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KSxcblx0XHRcdFx0bmV3IEJhcnMuQmFyKHtcblx0XHRcdFx0XHR0aXRsZTogJ0F2ZXJhZ2UgcHJlbWl1bScsIFxuXHRcdFx0XHRcdG1hcmdpbjoge1xuXHRcdFx0XHRcdFx0dG9wOjAsXG5cdFx0XHRcdFx0XHRyaWdodDoxLFxuXHRcdFx0XHRcdFx0Ym90dG9tOjAsXG5cdFx0XHRcdFx0XHRsZWZ0OjEgXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR6U2NvcmVzOiBjYWxjdWxhdGVaU2NvcmVzKCdwcmVtJywyMDAwKSxcblx0XHRcdFx0XHRtaW4oKXtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKHRoaXMpO1xuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuelNjb3Jlcy5taW47XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRoZWlnaHRUb1dpZHRoOiAwLjA1LFxuXHRcdFx0XHRcdGNvbnRhaW5lcjogJyNwcmVtaXVtLWJhcicsXG5cdFx0XHRcdFx0ZGF0YTogZ2VvanNvbi5mZWF0dXJlcyxcblx0XHRcdFx0XHRudW1lcmF0b3IoaW5WaWV3SURzKXtcblx0XHRcdFx0XHRcdGlmICggaW5WaWV3SURzLnNpemUgPT09IDAgKXtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMubWluO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0dmFyIGZpbHRlcmVkRGF0YSA9IHRoaXMuZGF0YS5maWx0ZXIoZWFjaCA9PiBpblZpZXdJRHMuaGFzKGVhY2gucHJvcGVydGllcy5pZCkpO1xuXHRcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdHJldHVybiBkMy5tZWFuKGZpbHRlcmVkRGF0YSwgZCA9PiBkLnByb3BlcnRpZXMucHJlbVopO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0ZGVub21pbmF0b3IoKXsgXG5cdFx0XHRcdFx0XHQgcmV0dXJuIHRoaXMuelNjb3Jlcy5tYXg7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR0ZXh0RnVuY3Rpb24obil7IFxuXHRcdFx0XHRcdFx0aWYgKGluVmlld0lEcy5zaXplID09PSAwKXtcblx0XHRcdFx0XHRcdFx0cmV0dXJuICdub25lIGluIHZpZXcnO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuICckJyArIGQzLmZvcm1hdChcIiwuMmZcIikodGhpcy56U2NvcmVzLm1lYW4gKyB0aGlzLnpTY29yZXMuc2QgKiBuICkgKyAnICh6ID0gJyArIGQzLmZvcm1hdChcIi4yZlwiKShuKSArICcpJztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pLFxuXHRcdFx0XHRcblx0XHRcdFx0bmV3IEJhcnMuQmFyKHtcblx0XHRcdFx0XHR0aXRsZTogJ0F2ZXJhZ2UgaG9tZSByZXBsYWNlbWVudCB2YWx1ZScsIFxuXHRcdFx0XHRcdG1hcmdpbjoge1xuXHRcdFx0XHRcdFx0dG9wOjAsXG5cdFx0XHRcdFx0XHRyaWdodDoxLFxuXHRcdFx0XHRcdFx0Ym90dG9tOjAsXG5cdFx0XHRcdFx0XHRsZWZ0OjEgXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR6U2NvcmVzOiBjYWxjdWxhdGVaU2NvcmVzKCd2YWx1ZScsNTUwLDIwMDAwLFsyNTBdKSxcblx0XHRcdFx0XHRtaW4oKXtcblx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuelNjb3Jlcy5taW47XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRpbmZvTWFyazp0cnVlLFxuXHRcdFx0XHRcdGhlaWdodFRvV2lkdGg6IDAuMDUsXG5cdFx0XHRcdFx0Y29udGFpbmVyOiAnI3ZhbHVlLWJhcicsXG5cdFx0XHRcdFx0ZGF0YTogZ2VvanNvbi5mZWF0dXJlcyxcblx0XHRcdFx0XHRudW1lcmF0b3IoaW5WaWV3SURzKXtcblx0XHRcdFx0XHRcdGlmICggaW5WaWV3SURzLnNpemUgPT09IDAgKXtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMubWluO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0dmFyIGZpbHRlcmVkRGF0YSA9IHRoaXMuZGF0YS5maWx0ZXIoZWFjaCA9PiBpblZpZXdJRHMuaGFzKGVhY2gucHJvcGVydGllcy5pZCkpO1xuXHRcdFx0XHRcdFx0cmV0dXJuIGQzLm1lYW4oZmlsdGVyZWREYXRhLCBkID0+IGQucHJvcGVydGllcy52YWx1ZVopO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0ZGVub21pbmF0b3IoKXsgXG5cdFx0XHRcdFx0XHQgcmV0dXJuIHRoaXMuelNjb3Jlcy5tYXg7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR0ZXh0RnVuY3Rpb24obil7IFxuXHRcdFx0XHRcdFx0aWYgKGluVmlld0lEcy5zaXplID09PSAwKXtcblx0XHRcdFx0XHRcdFx0cmV0dXJuICdub25lIGluIHZpZXcnO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuICckJyArIGQzLmZvcm1hdChcIiwuMGZcIikoKHRoaXMuelNjb3Jlcy5tZWFuICsgdGhpcy56U2NvcmVzLnNkICogbiApICogMTAwMCApICsgJyAoeiA9ICcgKyBkMy5mb3JtYXQoXCIuMmZcIikobikgKyAnKSc7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KSxcblx0XHRcdFx0bmV3IEJhcnMuQmFyKHtcblx0XHRcdFx0XHR0aXRsZTogJ0F2ZXJhZ2UgZmxvb2QgaW5zdXJhbmNlIGNvdmVyYWdlJywgXG5cdFx0XHRcdFx0bWFyZ2luOiB7XG5cdFx0XHRcdFx0XHR0b3A6MCxcblx0XHRcdFx0XHRcdHJpZ2h0OjEsXG5cdFx0XHRcdFx0XHRib3R0b206MCxcblx0XHRcdFx0XHRcdGxlZnQ6MSBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGluZm9NYXJrOnRydWUsXG5cdFx0XHRcdFx0elNjb3JlczogY2FsY3VsYXRlWlNjb3JlcygndGNvdicsbnVsbCxudWxsLFtdKSxcblx0XHRcdFx0XHQvKm1pbigpe1xuXHRcdFx0XHRcdFx0cmV0dXJuIGQzLm1pbih0aGlzLmRhdGEsIGQgPT4gZC5wcm9wZXJ0aWVzLnRjb3YpO1xuXHRcdFx0XHRcdH0sKi9cblx0XHRcdFx0XHRtaW4oKXtcblx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuelNjb3Jlcy5taW47XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRoZWlnaHRUb1dpZHRoOiAwLjA1LFxuXHRcdFx0XHRcdGNvbnRhaW5lcjogJyNjb3ZlcmFnZS1iYXInLFxuXHRcdFx0XHRcdGRhdGE6IGdlb2pzb24uZmVhdHVyZXMsXG5cdFx0XHRcdFx0bnVtZXJhdG9yKGluVmlld0lEcyl7XG5cdFx0XHRcdFx0XHRpZiAoIGluVmlld0lEcy5zaXplID09PSAwICl7XG5cdFx0XHRcdFx0XHRcdHJldHVybiB0aGlzLm1pbjtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHRoaXMuZmlsdGVyZWREYXRhID0gdGhpcy5kYXRhLmZpbHRlcihlYWNoID0+IGluVmlld0lEcy5oYXMoZWFjaC5wcm9wZXJ0aWVzLmlkKSk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZDMubWVhbih0aGlzLmZpbHRlcmVkRGF0YSwgZCA9PiBkLnByb3BlcnRpZXMudGNvdlopO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0ZGVub21pbmF0b3IoKXsgXG5cdFx0XHRcdFx0XHQgcmV0dXJuIHRoaXMuelNjb3Jlcy5tYXg7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR0ZXh0RnVuY3Rpb24obil7IFxuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRpZiAoaW5WaWV3SURzLnNpemUgPT09IDApe1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gJ25vbmUgaW4gdmlldyc7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZXR1cm4gJyQnICsgZDMuZm9ybWF0KFwiLC4wZlwiKSgodGhpcy56U2NvcmVzLm1lYW4gKyB0aGlzLnpTY29yZXMuc2QgKiBuICkgKiAxMDAwICkgKyAnICh6ID0gJyArIGQzLmZvcm1hdChcIi4yZlwiKShuKSArICcpJztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pLFxuXHRcdFx0XHRuZXcgQmFycy5CYXIoe1xuXHRcdFx0XHRcdHRpdGxlOiAnQXZlcmFnZSBtZWRpYW4gaG91c2Vob2xkIGluY29tZScsIFxuXHRcdFx0XHRcdG1hcmdpbjoge1xuXHRcdFx0XHRcdFx0dG9wOjAsXG5cdFx0XHRcdFx0XHRyaWdodDoxLFxuXHRcdFx0XHRcdFx0Ym90dG9tOjAsXG5cdFx0XHRcdFx0XHRsZWZ0OjEgXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRpbmZvTWFyazp0cnVlLFxuXHRcdFx0XHRcdHpTY29yZXM6IChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2cobWVkaWFuSW5jb21lcyk7XG5cdFx0XHRcdFx0XHR2YXIgbWVhbiA9IGQzLm1lYW4oWy4uLm1lZGlhbkluY29tZXMudmFsdWVzKCldKTtcblx0XHRcdFx0XHRcdHZhciBzZCA9IGQzLmRldmlhdGlvbihbLi4ubWVkaWFuSW5jb21lcy52YWx1ZXMoKV0pO1xuXHRcdFx0XHRcdFx0dmFyIG1pbixcblx0XHRcdFx0XHRcdFx0bWF4LFxuXHRcdFx0XHRcdFx0XHRjdXRvZmZaID0gKCAxNTAwMDAgLSBtZWFuICkgLyBzZDtcblx0XHRcdFx0XHRcdGdlb2pzb24uZmVhdHVyZXMuZm9yRWFjaChlYWNoID0+IHtcblx0XHRcdFx0XHRcdFx0Ly8gc29tZSBtZWRfaW5jb21lcyBhcmUgcmVjb3JkZWQgYXMgemVybzsgdGhleSBzaG91bGQgYmUgaWdub3JlZFxuXHRcdFx0XHRcdFx0XHRpZiAoIGVhY2gucHJvcGVydGllcy5tZWRfaW5jb21lID4gMCApe1xuXHRcdFx0XHRcdFx0XHRcdGVhY2gucHJvcGVydGllcy5tZWRfaW5jb21lWiA9ICggZWFjaC5wcm9wZXJ0aWVzLm1lZF9pbmNvbWUgLSBtZWFuICkgLyBzZDtcblx0XHRcdFx0XHRcdFx0XHRtaW4gPSBlYWNoLnByb3BlcnRpZXMubWVkX2luY29tZVogPCBtaW4gfHwgbWluID09PSB1bmRlZmluZWQgPyBlYWNoLnByb3BlcnRpZXMubWVkX2luY29tZVogOiBtaW47XG5cdFx0XHRcdFx0XHRcdFx0bWF4ID0gZWFjaC5wcm9wZXJ0aWVzLm1lZF9pbmNvbWVaID4gbWF4IHx8IG1heCA9PT0gdW5kZWZpbmVkID8gZWFjaC5wcm9wZXJ0aWVzLm1lZF9pbmNvbWVaIDogbWF4O1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdGVhY2gucHJvcGVydGllcy5tZWRfaW5jb21lWiA9IG51bGw7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0bWF4ID0gbWF4IDwgY3V0b2ZmWiA/IG1heCA6IGN1dG9mZlo7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyh7XG5cdFx0XHRcdFx0XHRcdG1pbixcblx0XHRcdFx0XHRcdFx0bWF4LFxuXHRcdFx0XHRcdFx0XHRtZWFuLFxuXHRcdFx0XHRcdFx0XHRzZFxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0XHRtaW46IC0yLjMzLFxuXHRcdFx0XHRcdFx0XHRtYXg6IDIuMzMsXG5cdFx0XHRcdFx0XHRcdG1lYW4sXG5cdFx0XHRcdFx0XHRcdHNkXG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdH0pKCksXG5cdFx0XHRcdFx0bWluKCl7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy56U2NvcmVzLm1pbjtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGhlaWdodFRvV2lkdGg6IDAuMDUsXG5cdFx0XHRcdFx0Y29udGFpbmVyOiAnI2luY29tZS1iYXInLFxuXHRcdFx0XHRcdGRhdGE6IGdlb2pzb24uZmVhdHVyZXMsXG5cdFx0XHRcdFx0bnVtZXJhdG9yKGluVmlld0lEcyl7XG5cdFx0XHRcdFx0XHRpZiAoIGluVmlld0lEcy5zaXplID09PSAwICl7XG5cdFx0XHRcdFx0XHRcdHJldHVybiB0aGlzLm1pbjtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHZhciByZXByZXNlbnRlZFRyYWN0cyA9IG5ldyBTZXQoKTtcblx0XHRcdFx0XHRcdHZhciBtZWRJbmNvbWVaQXJyYXkgPSBbXTtcblx0XHRcdFx0XHRcdGluVmlld0lEcy5mb3JFYWNoKGlkID0+IHtcblx0XHRcdFx0XHRcdFx0dmFyIG1hdGNoaW5nRmVhdHVyZSA9IGZlYXR1cmVQcm9wZXJ0aWVzQnlJZC5nZXQoaWQpO1xuXHRcdFx0XHRcdFx0XHRpZiAoICFyZXByZXNlbnRlZFRyYWN0cy5oYXMobWF0Y2hpbmdGZWF0dXJlLmNlbl90cmFjdCkgKXtcblx0XHRcdFx0XHRcdFx0XHRyZXByZXNlbnRlZFRyYWN0cy5hZGQobWF0Y2hpbmdGZWF0dXJlLmNlbl90cmFjdCk7XG5cdFx0XHRcdFx0XHRcdFx0bWVkSW5jb21lWkFycmF5LnB1c2gobWF0Y2hpbmdGZWF0dXJlLm1lZF9pbmNvbWVaKTsgLy8gcHVzaGVzIGluY29tZSBmcm9tIG9ubHkgb25lIHJlcHJlc2VudGF0aXZlXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ICAvL1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdtZWRJbmNvbWVaQXJyYXknLG1lZEluY29tZVpBcnJheSk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZDMubWVhbihtZWRJbmNvbWVaQXJyYXkpO1xuXG5cdFx0XHRcdFx0XHQvL3RoaXMubWVkaWFuSW5jb21lc0luVmlldyA9IGNhbGN1bGF0ZU1lZGlhbkluY29tZXMoaW5WaWV3SURzKTtcblx0XHRcdFx0XHRcdC8vcmV0dXJuIGQzLm1lYW4odGhpcy5tZWRpYW5JbmNvbWVzSW5WaWV3KTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGRlbm9taW5hdG9yKCl7IFxuXHRcdFx0XHRcdFx0IHJldHVybiB0aGlzLnpTY29yZXMubWF4O1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0dGV4dEZ1bmN0aW9uKG4peyBcblx0XHRcdFx0XHRcdGlmIChpblZpZXdJRHMuc2l6ZSA9PT0gMCl7XG5cdFx0XHRcdFx0XHRcdHJldHVybiAnbm9uZSBpbiB2aWV3Jztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybiAnJCcgKyBkMy5mb3JtYXQoXCIsLjBmXCIpKHRoaXMuelNjb3Jlcy5tZWFuICsgdGhpcy56U2NvcmVzLnNkICogbiApICsgJyAoeiA9ICcgKyBkMy5mb3JtYXQoXCIuMmZcIikobikgKyAnKSc7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KSxcblx0XHRcdFx0bmV3IEJhcnMuQmFyKHtcblx0XHRcdFx0XHR0aXRsZTogJ0F2ZXJhZ2UgbWFyZ2luYWwgY29zdCBmb3IgbG93ZXIgZGVkdWN0aWJsZScsIFxuXHRcdFx0XHRcdG1hcmdpbjoge1xuXHRcdFx0XHRcdFx0dG9wOjAsXG5cdFx0XHRcdFx0XHRyaWdodDoxLFxuXHRcdFx0XHRcdFx0Ym90dG9tOjAsXG5cdFx0XHRcdFx0XHRsZWZ0OjEgXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR6U2NvcmVzOiBjYWxjdWxhdGVaU2NvcmVzKCdkZHAnLG51bGwsbnVsbCxbXSksXG5cdFx0XHRcdFx0LyptaW4oKXtcblx0XHRcdFx0XHRcdHJldHVybiBkMy5taW4odGhpcy5kYXRhLCBkID0+IGQucHJvcGVydGllcy50Y292KTtcblx0XHRcdFx0XHR9LCovXG5cdFx0XHRcdFx0bWluKCl7XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLnpTY29yZXMubWluO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aGVpZ2h0VG9XaWR0aDogMC4wNSxcblx0XHRcdFx0XHRjb250YWluZXI6ICcjbWFyZ2luYWwtYmFyJyxcblx0XHRcdFx0XHRkYXRhOiBnZW9qc29uLmZlYXR1cmVzLFxuXHRcdFx0XHRcdG51bWVyYXRvcihpblZpZXdJRHMpe1xuXHRcdFx0XHRcdFx0aWYgKCBpblZpZXdJRHMuc2l6ZSA9PT0gMCApe1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5taW47XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR0aGlzLmZpbHRlcmVkRGF0YSA9IHRoaXMuZGF0YS5maWx0ZXIoZWFjaCA9PiBpblZpZXdJRHMuaGFzKGVhY2gucHJvcGVydGllcy5pZCkpO1xuXHRcdFx0XHRcdFx0cmV0dXJuIGQzLm1lYW4odGhpcy5maWx0ZXJlZERhdGEsIGQgPT4gZC5wcm9wZXJ0aWVzLmRkcFopO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0ZGVub21pbmF0b3IoKXsgXG5cdFx0XHRcdFx0XHQgcmV0dXJuIHRoaXMuelNjb3Jlcy5tYXg7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR0ZXh0RnVuY3Rpb24obil7IFxuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRpZiAoaW5WaWV3SURzLnNpemUgPT09IDApe1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gJ25vbmUgaW4gdmlldyc7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZXR1cm4gJyQnICsgZDMuZm9ybWF0KFwiLC4wZlwiKSgodGhpcy56U2NvcmVzLm1lYW4gKyB0aGlzLnpTY29yZXMuc2QgKiBuICkgKSArICcgKHogPSAnICsgZDMuZm9ybWF0KFwiLjJmXCIpKG4pICsgJyknO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSlcblxuXHRcdFx0KTsgLy8gZW5kIHB1c2hcblx0XHRcdGdhdGVDaGVjaysrO1xuXHRcdFx0dmFyIGluZm9ybWF0aW9uID0ge1xuXHRcdFx0XHRtYXBmZWF0dXJlOiAnVGhpcyBtYXAgcmVwcmVzZW50cyBuZXcgZmxvb2QgaW5zdXJhbmNlIHBvbGljaWVzIGluaXRpYXRlZCBiZXR3ZWVuIEp1bmUgYW5kIERlY2VtYmVyIDIwMTQuIFRoZSBhbmFseXNpcyBpbiB0aGUgcmVsYXRlZCBwYXBlciByZXZvbHZlcyBhcm91bmQgdGhlIGRlY2lzaW9uIHdoZXRoZXIgdG8gcGF5IG1vcmUgZm9yIGEgbG93ZXIgZGVkdWN0aWJsZS4nLFxuXHRcdFx0XHRkZWR1Y3RpYmxlYmFyOiAnVGhlIHN0YW5kYXJkIGRlZHVjdGlibGUgaXMgJDUsMDAwOyBhbnl0aGluZyBsZXNzIGlzIGNvbnNpZGVyIGEgbG93IGRlZHVjdGlibGUuJyxcblx0XHRcdFx0dmFsdWViYXI6ICdUaGlzIGNhbGN1bGF0aW9uIGlnbm9yZXMgZXh0cmVtZSBvdXRsaWVycyAodmFsdWVzIGFib3ZlICQyME0pIHdoaWNoIGFyZSBsaWtlbHkgZHVlIHRvIGRhdGEgZXJyb3JzOyBpdCBhbHNvIGlnbm9yZXMgb3ZlcnJlcHJlc2VudGVkIHZhbHVlcyBvZiAkMjUwLDAwMCwgdGhlIG1ham9yaXR5IG9mIHdoaWNoIGFyZSBsaWtlbHkgZHVlIHRvIHJlcG9ydGluZyBlcnJvcnMuJyxcblx0XHRcdFx0aW5jb21lYmFyOiAnTWVkaWFuIGhvdXNlaG9sZCBpbmNvbWUgaXMgYSBwcm9wZXJ0eSBvZiB0aGUgY2Vuc3VzIHRyYWN0IGluIHdoaWNoIHRoZSBwb2xpY3lob2xkZXIgcmVzaWRlcy4gRWFjaCBjZW5zdXMgdHJhY3Qgd2l0aCBhbiBhc3NvY2lhdGVkIHBvbGljeSBpbiB2aWV3IGlzIGNvdW50ZWQgb25jZS4nLFxuXHRcdFx0XHRjb3ZlcmFnZWJhcjogJ0Zsb29kIGNvdmVyYWdlIGlzIGxpbWl0ZWQgdG8gJDI1MCwwMDAuJ1xuXHRcdFx0fTtcblx0XHRcdHZhciBpbmZvTWFya3MgPSBkMy5zZWxlY3RBbGwoJy5oYXMtaW5mby1tYXJrJylcblx0XHRcdFx0LmFwcGVuZCgnc3ZnJylcblx0XHRcdFx0LmRhdHVtKGluZm9ybWF0aW9uKVxuXHRcdFx0XHQuYXR0cignd2lkdGgnLCcxMnB4Jylcblx0XHRcdFx0LmF0dHIoJ3ZpZXdCb3gnLCAnMCAwIDEyIDEyJylcblx0XHRcdFx0LmF0dHIoJ2NsYXNzJywnaW5mby1tYXJrJylcblx0XHRcdFx0LmFwcGVuZCgnZycpO1xuXG5cdFx0XHRpbmZvTWFya3Ncblx0XHRcdFx0LmNhbGwodGlwKVxuXHRcdFx0XHQub24oJ21vdXNlZW50ZXInLCBmdW5jdGlvbihkKXtcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhkMy5ldmVudCk7XG5cdFx0XHRcdFx0dGlwLnNob3cuY2FsbCh0aGlzLGQpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQub24oJ21vdXNlbGVhdmUnLCB0aXAuaGlkZSk7XG5cdFx0XHRcdFxuXG5cdFx0XHRpbmZvTWFya3Ncblx0XHRcdFx0LmFwcGVuZCgnY2lyY2xlJylcblx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ2luZm8tbWFyay1iYWNrZ3JvdW5kJykgXG5cdFx0XHRcdC5hdHRyKCdjeCcsNilcblx0XHRcdFx0LmF0dHIoJ2N5Jyw2KVxuXHRcdFx0XHQuYXR0cigncicsNik7XG5cdFx0XHRcdFxuXG5cdFx0XHRpbmZvTWFya3Ncblx0XHRcdFx0LmFwcGVuZCgncGF0aCcpXG5cdFx0XHRcdC5hdHRyKCdjbGFzcycsJ2luZm8tbWFyay1mb3JlZ3JvdW5kJylcblx0XHRcdFx0LmF0dHIoJ2QnLCBgTTUuMjMxLDcuNjE0VjYuOTE1YzAtMC4zNjQsMC4wODQtMC43MDIsMC4yNTQtMS4wMTZjMC4xNjktMC4zMTMsMC4zNTUtMC42MTMsMC41NTktMC45MDJcblx0XHRcdFx0XHRcdFx0YzAuMjAzLTAuMjg3LDAuMzktMC41NjQsMC41NTktMC44MzFDNi43NzIsMy45LDYuODU3LDMuNjMxLDYuODU3LDMuMzZjMC0wLjE5NS0wLjA4MS0wLjM1Ny0wLjI0Mi0wLjQ4OVxuXHRcdFx0XHRcdFx0XHRDNi40NTUsMi43NCw2LjI2OCwyLjY3NCw2LjA1NywyLjY3NGMtMC4xNTMsMC0wLjI4OCwwLjAzNC0wLjQwNywwLjEwMmMtMC4xMTgsMC4wNjgtMC4yMjIsMC4xNTUtMC4zMTEsMC4yNlxuXHRcdFx0XHRcdFx0XHRDNS4yNSwzLjE0Miw1LjE3NywzLjI2MSw1LjExNywzLjM5MmMtMC4wNiwwLjEzMS0wLjA5NywwLjI2NC0wLjExNCwwLjRsLTEuNDYtMC40MDdDMy43MDQsMi43NSw0LjAwOCwyLjI2MSw0LjQ1NywxLjkxOVxuXHRcdFx0XHRcdFx0XHRjMC40NDgtMC4zNDMsMS4wMTYtMC41MTUsMS43MDEtMC41MTVjMC4zMTMsMCwwLjYwNywwLjA0NCwwLjg4MiwwLjEzM0M3LjMxNiwxLjYyNiw3LjU2LDEuNzU2LDcuNzcxLDEuOTI1XG5cdFx0XHRcdFx0XHRcdEM3Ljk4MiwyLjA5NSw4LjE1LDIuMzA2LDguMjcyLDIuNTZjMC4xMjMsMC4yNTQsMC4xODUsMC41NDYsMC4xODUsMC44NzZjMCwwLjQyMy0wLjA5NiwwLjc4NS0wLjI4NiwxLjA4NVxuXHRcdFx0XHRcdFx0XHRjLTAuMTkxLDAuMzAxLTAuNCwwLjU4Ni0wLjYyOSwwLjg1N0M3LjMxNCw1LjY1LDcuMTA0LDUuOTIzLDYuOTE0LDYuMTk4UzYuNjI4LDYuNzg5LDYuNjI4LDcuMTQ0djAuNDdINS4yMzF6IE01LjA3OSwxMC42OTlWOC44OTZcblx0XHRcdFx0XHRcdFx0aDEuNzUydjEuODAzSDUuMDc5emBcblx0XHRcdFx0KTtcblxuXHRcdFx0LypkMy5zZWxlY3RBbGwoJy5maWd1cmUtdGl0bGUuaGFzLWluZm8tbWFyaycpXG5cdFx0XHRcdC5hcHBlbmQoJ2EnKVxuXHRcdFx0XHQuYXR0cigndGl0bGUnLCBmdW5jdGlvbigpe1xuXHRcdFx0XHRcdHJldHVybiBpbmZvcm1hdGlvbltkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlLnBhcmVudE5vZGUpLmF0dHIoJ2lkJykucmVwbGFjZSgnLScsJycpXTtcblx0XHRcdFx0fSlcblx0XHRcdFx0LmF0dHIoJ2hyZWYnLCcjJylcblx0XHRcdFx0LmF0dHIoJ2NsYXNzJywnaW5mby1tYXJrIHNtYWxsJylcblx0XHRcdFx0LnRleHQoJz8nKTtcblx0XHRcdGQzLnNlbGVjdEFsbCgnLmluZm8tbWFyaycpXG5cdFx0XHRcdC5vbignY2xpY2snLCgpID0+IHtcblx0XHRcdFx0XHRkMy5ldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHR9KTsqL1xuXG5cdFx0XHRnYXRlKCk7XG5cdFx0XHQvL2FkZENsdXN0ZXJMYXllcnMocnRuKTtcblx0XHRcdFxuXHRcdH0pOyAvLyBlbmQgZDMgY3N2XG5cdH0gLy8gZW5kIHRvR2VvSlNPTlxuXHQvKnZhciBmZWF0dXJlc0luVmlldyA9IHtcblx0XHRyZW5kZXIoKXtcblx0XHRcdHRoaXMuY2hhcnQgPSBuZXcgQmFycy5CYXIoe1xuXHRcdFx0XHRtYXJnaW46IHtcblx0XHRcdFx0XHR0b3A6MCxcblx0XHRcdFx0XHRyaWdodDowLFxuXHRcdFx0XHRcdGJvdHRvbTowLFxuXHRcdFx0XHRcdGxlZnQ6MFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRoZWlnaHRUb1dpZHRoOiAwLjAzLFxuXHRcdFx0XHRjb250YWluZXI6ICcjdG90YWwtdmlldycsXG5cdFx0XHRcdHRvdGFsOiBnZW9qc29uLmZlYXR1cmVzLmxlbmd0aFxuXHRcdFx0fSk7XG5cblx0XHRcdC8qdGhpcy50b3RhbCA9IGdlb2pzb24uZmVhdHVyZXMubGVuZ3RoO1xuXHRcdFx0dGhpcy5zdmcgPSBkMy5zZWxlY3QoJyN0b3RhbC12aWV3Jylcblx0XHRcdFx0LmFwcGVuZCgnc3ZnJylcblx0XHRcdFx0LmF0dHIoJ3dpZHRoJywgJzEwMCUnKVxuXHQgICAgICAgICAgICAuYXR0cigneG1sbnMnLCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycpXG5cdCAgICAgICAgICAgIC5hdHRyKCd2ZXJzaW9uJywnMS4xJykgXG5cdCAgICAgICAgICAgIC5hdHRyKCd2aWV3Qm94JywgJzAgMCAxMDAgMycpO1xuXG5cdCAgICAgICAgdGhpcy5iYWNrZ3JvdW5kID0gdGhpcy5zdmcuYXBwZW5kKCdsaW5lJylcblx0ICAgICAgICBcdC5jbGFzc2VkKCdiYWNrZ3JvdW5kLWxpbmUnLCB0cnVlKVxuXHQgICAgICAgIFx0LmF0dHIoJ3gwJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kwJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3gxJywxMDApXG5cdCAgICAgICAgXHQuYXR0cigneTEnLDApO1xuXG5cdCAgICAgICAgdGhpcy5saW5lID0gdGhpcy5zdmcuYXBwZW5kKCdsaW5lJylcblx0ICAgICAgICBcdC5jbGFzc2VkKCd0b3RhbC1saW5lJywgdHJ1ZSlcblx0ICAgICAgICBcdC5hdHRyKCd4MCcsMClcblx0ICAgICAgICBcdC5hdHRyKCd5MCcsMClcblx0ICAgICAgICBcdC5hdHRyKCd4MScsMClcblx0ICAgICAgICBcdC5hdHRyKCd5MScsMCk7XG5cblx0ICAgICAgICB0aGlzLnRleHQgPSBkMy5zZWxlY3QoJyN0b3RhbC12aWV3Jylcblx0ICAgICAgICBcdC5hcHBlbmQoJ3NwYW4nKVxuXHQgICAgICAgIFx0LnRleHQoKCkgPT4gYCR7ZDMuZm9ybWF0KFwiLFwiKSh0aGlzLnRvdGFsKX0gb2YgJHtkMy5mb3JtYXQoXCIsXCIpKHRoaXMudG90YWwpfSBpbiB2aWV3YCApO1xuXHQgICAgICAgIFx0XG5cblx0XHRcdHRoaXMudXBkYXRlKGNvdW50RmVhdHVyZXMoKSk7XG5cdFx0fSxcblx0XHR1cGRhdGUobil7XG5cdFx0XHQvKmQzLnNlbGVjdCgnI3RvdGFsLWluLXZpZXcnKVxuXHRcdFx0XHQudGV4dCgoKSA9PiBkMy5mb3JtYXQoXCIsXCIpKG4pICsgJyBvZiAnICsgZDMuZm9ybWF0KFwiLFwiKSh0aGlzLnRvdGFsKSArICcgcHJvcGVydGllcyBpbiB2aWV3Jyk7Ki9cblx0XHRcdC8qdGhpcy5saW5lXG5cdFx0XHRcdC50cmFuc2l0aW9uKCkuZHVyYXRpb24oMjAwKVxuXHRcdFx0XHQuYXR0cigneDEnLCAoKSA9PiAoIG4gLyB0aGlzLnRvdGFsKSAqIDEwMCApO1xuXHRcdFx0dGhpcy50ZXh0XG5cdFx0XHRcdC50ZXh0KCgpID0+IGAke2QzLmZvcm1hdChcIixcIikobil9IG9mICR7ZDMuZm9ybWF0KFwiLFwiKSh0aGlzLnRvdGFsKX0gaW4gdmlld2AgKTtcbiAgXG5cdFx0fSovIFxuXG5cdFxuXHR2YXIgaW5WaWV3SURzID0gbmV3IFNldCgpO1xuXHRmdW5jdGlvbiBjb3VudEZlYXR1cmVzKCl7IFxuXHRcdC8qIGpzaGludCBsYXhicmVhazp0cnVlICovXG5cdFx0aW5WaWV3SURzLmNsZWFyKCk7IFxuXHRcdC8vdmFyIGNvdW50ID0gMDtcblx0XHR2YXIgYm91bmRzID0gdGhlTWFwLmdldEJvdW5kcygpO1xuXHRcdGdlb2pzb24uZmVhdHVyZXMuZm9yRWFjaChlYWNoID0+IHtcblx0XHRcdGlmICggICAgZWFjaC5wcm9wZXJ0aWVzLmxvbmdpdHVkZSA+PSBib3VuZHMuX3N3LmxuZyBcblx0XHRcdFx0ICYmIGVhY2gucHJvcGVydGllcy5sb25naXR1ZGUgPD0gYm91bmRzLl9uZS5sbmcgXG5cdFx0XHRcdCAmJiBlYWNoLnByb3BlcnRpZXMubGF0aXR1ZGUgID49IGJvdW5kcy5fc3cubGF0IFxuXHRcdFx0XHQgJiYgZWFjaC5wcm9wZXJ0aWVzLmxhdGl0dWRlICA8PSBib3VuZHMuX25lLmxhdCApe1xuXHRcdFx0XHRpblZpZXdJRHMuYWRkKGVhY2gucHJvcGVydGllcy5pZCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0Y29uc29sZS5sb2coaW5WaWV3SURzKTtcblx0fVxuXHR0aGVNYXAub24oJ21vdmVlbmQnLCBmdW5jdGlvbigpe1xuXHRcdHVwZGF0ZUFsbCgpO1xuXHR9KTtcblx0dGhlTWFwLm9uKCd6b29tZW5kJywgZnVuY3Rpb24oYXJnKXtcblx0XHRjb25zb2xlLmxvZyhhcmcpO1xuXHRcdHVwZGF0ZUFsbCgpO1xuXHRcdGQzLnNlbGVjdCgnI3NpemUtbGVnZW5kJylcblx0XHRcdC5jbGFzc2VkKCdzaG93JywgdGhlTWFwLmdldFpvb20oKSA+PSBzaXplWm9vbVRocmVzaG9sZCk7XG5cdH0pO1xuXHRmdW5jdGlvbiB1cGRhdGVBbGwoKXtcblx0XHRjb3VudEZlYXR1cmVzKCk7XG5cdFx0dGhlQ2hhcnRzLmZvckVhY2goZWFjaCA9PiBlYWNoLnVwZGF0ZShpblZpZXdJRHMpKTtcblx0fVxuXHR0aGVNYXAub24oXCJtb3VzZW1vdmVcIiwgXCJwb2ludHMtZGF0YS1kcml2ZW5cIiwgZnVuY3Rpb24oZSkge1xuICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICB9KTtcblxuICAgXG5cblx0cmV0dXJuIHRoZU1hcDtcbiAgIFxufSgpKTsgLy8gZW5kIElJRkUgIiwiZXhwb3J0IGNvbnN0IEJhcnMgPSAoZnVuY3Rpb24oKXtcblxuXHR2YXIgQmFyID0gZnVuY3Rpb24oY29uZmlnT2JqZWN0KXsgLy8gbWFyZ2lucyB7fSwgaGVpZ2h0ICMsIHdpZHRoICMsIGNvbnRhaW5lcklELCBkYXRhUGF0aFxuXHQgICAgdGhpcy5zZXR1cChjb25maWdPYmplY3QpO1xuXHR9O1xuXG5cdEJhci5wcm90b3R5cGUgPSB7XG5cdFx0c2V0dXAoY29uZmlnT2JqZWN0KXsgLy8gc29tZSBvZiBzZXR1cCBpcyBjb21tb24gdG8gYWxsIGNoYXJ0cyBhbmQgY291bGQgYmUgaGFuZGxlZCBieSBwcm90b3R5cGljYWwgaW5oZXJpdGFuY2Vcblx0ICAgIFx0Y29uc29sZS5sb2coY29uZmlnT2JqZWN0KTtcblx0ICAgICAgICB2YXIgdmlld0JveCA9ICcwIDAgMTAwICcgKyBNYXRoLnJvdW5kKGNvbmZpZ09iamVjdC5oZWlnaHRUb1dpZHRoICogMTAwKTtcblx0ICAgICAgICB0aGlzLmNvbnRhaW5lciA9IGNvbmZpZ09iamVjdC5jb250YWluZXI7XG5cdCAgICAgICAgdGhpcy5tYXJnaW4gPSBjb25maWdPYmplY3QubWFyZ2luO1xuXHQgICAgICAgIHRoaXMud2lkdGggPSAxMDAgLSB0aGlzLm1hcmdpbi5sZWZ0IC0gdGhpcy5tYXJnaW4ucmlnaHQ7XG5cdCAgICAgICAgdGhpcy5oZWlnaHQgPSBjb25maWdPYmplY3QuaGVpZ2h0VG9XaWR0aCAqIDEwMCAtIHRoaXMubWFyZ2luLnRvcCAtIHRoaXMubWFyZ2luLmJvdHRvbTtcblx0ICAgICAgICB0aGlzLnRpdGxlID0gY29uZmlnT2JqZWN0LnRpdGxlO1xuXHQgICAgICAgIHRoaXMuaW5mb01hcmsgPSBjb25maWdPYmplY3QuaW5mb01hcmsgfHwgZmFsc2U7XG5cdCAgICAgICAgdGhpcy5jb21wYXJhdG9yID0gY29uZmlnT2JqZWN0LmNvbXBhcmF0b3I7XG5cdCAgICAgICAgdGhpcy50cnVuY2F0ZVJpZ2h0ID0gY29uZmlnT2JqZWN0LnRydW5jYXRlUmlnaHQgfHwgZmFsc2U7XG5cdCAgICAgICAgdGhpcy5iYWNrZ3JvdW5kQ29sb3IgPSBjb25maWdPYmplY3QuYmFja2dyb3VuZENvbG9yIHx8ICdncmF5Jztcblx0ICAgICAgICB0aGlzLmRhdGEgPSBjb25maWdPYmplY3QuZGF0YTtcblx0ICAgICAgICB0aGlzLm51bWVyYXRvciA9IGNvbmZpZ09iamVjdC5udW1lcmF0b3I7XG5cdCAgICAgICAgdGhpcy5kZW5vbWluYXRvciA9IGNvbmZpZ09iamVjdC5kZW5vbWluYXRvcjtcblx0ICAgICAgICB0aGlzLnRleHRGdW5jdGlvbiA9IGNvbmZpZ09iamVjdC50ZXh0RnVuY3Rpb247XG5cdCAgICAgICAgdGhpcy56U2NvcmVzID0gY29uZmlnT2JqZWN0LnpTY29yZXMgfHwgbnVsbDtcblx0ICAgICAgICB0aGlzLm1pbiA9IGNvbmZpZ09iamVjdC5taW4gPyBjb25maWdPYmplY3QubWluLmNhbGwodGhpcykgOiAwO1xuXHQgICAgICAgIC8vdGhpcy5tYXggPSBjb25maWdPYmplY3QubWF4ID8gY29uZmlnT2JqZWN0Lm1heC5jYWxsKHRoaXMpIDogMTAwO1xuXHQgICAgICAgIC8vdGhpcy5zY2FsZSA9IGQzLnNjYWxlTGluZWFyKCkuZG9tYWluKFt0aGlzLm1pbix0aGlzLm1heF0pLnJhbmdlKFswLHRoaXMud2lkdGhdKTtcblx0ICAgICAgICBcblxuXHQgICAgICAgIGQzLnNlbGVjdCh0aGlzLmNvbnRhaW5lcilcblx0ICAgICAgICBcdC5hcHBlbmQoJ3NwYW4nKVxuXHQgICAgICAgIFx0LmNsYXNzZWQoJ2ZpZ3VyZS10aXRsZScsIHRydWUpXG5cdCAgICAgICAgXHQuY2xhc3NlZCgnaGFzLWluZm8tbWFyaycsICgpID0+IHRoaXMuaW5mb01hcmspXG5cdCAgICAgICAgXHQudGV4dCh0aGlzLnRpdGxlKTtcblxuXHQgICAgICAgIHRoaXMuc3ZnID0gZDMuc2VsZWN0KHRoaXMuY29udGFpbmVyKVxuXHQgICAgICAgICAgICAuYXBwZW5kKCdzdmcnKVxuXHQgICAgICAgICAgICAuYXR0cignd2lkdGgnLCAnMTAwJScpXG5cdCAgICAgICAgICAgIC5hdHRyKCd4bWxucycsJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3ZlcnNpb24nLCcxLjEnKVxuXHQgICAgICAgICAgICAuYXR0cigndmlld0JveCcsIHZpZXdCb3gpXG5cdCAgICAgICAgICAgIC5hcHBlbmQoJ2cnKVxuXHQgICAgICAgICAgICAuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgdGhpcy5tYXJnaW4ubGVmdCArICcsJyArIHRoaXMubWFyZ2luLnRvcCArICcpJyk7XG5cblx0ICAgICAgICB0aGlzLmJhY2tncm91bmQgPSB0aGlzLnN2Zy5hcHBlbmQoJ2xpbmUnKVxuXHQgICAgICAgIFx0LmNsYXNzZWQoJ2JhY2tncm91bmQtbGluZS0nICsgdGhpcy5iYWNrZ3JvdW5kQ29sb3IsIHRydWUpXG5cdCAgICAgICAgXHQuYXR0cigneDAnLDApXG5cdCAgICAgICAgXHQuYXR0cigneTAnLDApXG5cdCAgICAgICAgXHQuYXR0cigneDEnLHRoaXMud2lkdGgpXG5cdCAgICAgICAgXHQuYXR0cigneTEnLDApO1xuXG5cdCAgICAgICAgdGhpcy5saW5lID0gdGhpcy5zdmcuYXBwZW5kKCdsaW5lJylcblx0ICAgICAgICBcdC5jbGFzc2VkKCdmb3JlZ3JvdW5kLWxpbmUnLCB0cnVlKVxuXHQgICAgICAgIFx0LmF0dHIoJ3gwJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kwJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3gxJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kxJywwKTtcblxuXHQgICAgICAgIHRoaXMudGV4dCA9IGQzLnNlbGVjdCh0aGlzLmNvbnRhaW5lcilcblx0ICAgICAgICBcdC5hcHBlbmQoJ3NwYW4nKVxuXHQgICAgICAgIFx0LmF0dHIoJ2NsYXNzJywndmFsdWUnKTtcblx0ICAgICAgICBcdFxuXG5cdCAgICAgICAgLy90aGlzLnVwZGF0ZSh0aGlzLm51bWVyYXRvcigpKTsgIFxuICAgICAgICB9LFxuICAgICAgICB1cGRhdGUoaW5WaWV3SURzKXtcbiAgICAgICAgXHRjb25zb2xlLmxvZyh0aGlzKTtcblx0XHRcdHZhciBuID0gdGhpcy5udW1lcmF0b3IoaW5WaWV3SURzKSxcblx0XHRcdFx0ZCA9IHRoaXMuZGVub21pbmF0b3IoaW5WaWV3SURzKTsgXG5cdFx0XHRkMy5zZWxlY3QodGhpcy5jb250YWluZXIpXG5cdFx0XHRcdC5jbGFzc2VkKCdvdmVyZmxvdycsIG4gPiBkICk7XG5cbiAgICAgICAgXHRpZiAodGhpcy50cnVuY2F0ZVJpZ2h0KXtcbiAgICAgICAgXHRcdGQgPSB0aGlzLm1pbiA9IDAgLSBkO1xuICAgICAgICBcdH0gZWxzZSBpZiAoIHRoaXMubWluIDwgMCAmJiBkID4gMCApIHtcbiAgICAgICAgXHRcdGlmIChNYXRoLmFicyh0aGlzLm1pbikgPCBkKSB7XG4gICAgICAgIFx0XHRcdHRoaXMubWluID0gMCAtIGQ7XG4gICAgICAgIFx0XHR9IGVsc2Uge1xuICAgICAgICBcdFx0XHRkID0gMCAtIHRoaXMubWluO1xuICAgICAgICBcdFx0fVxuICAgICAgICBcdH1cbiAgICAgICAgXHRjb25zb2xlLmxvZygnbWluOiAnICsgdGhpcy5taW4gKyAnOyBtYXg6ICcgKyBkKTtcblx0XHRcdHRoaXMuc2NhbGUgPSBkMy5zY2FsZUxpbmVhcigpLmRvbWFpbihbdGhpcy5taW4sZF0pLnJhbmdlKFswLHRoaXMud2lkdGhdKS5jbGFtcCh0cnVlKTtcblx0XHRcdHRoaXMubGluZVxuXHRcdFx0XHQudHJhbnNpdGlvbigpLmR1cmF0aW9uKDIwMClcblx0XHRcdFx0LmF0dHIoJ3gxJywgKCkgPT4gdGhpcy5zY2FsZShuKSk7XG5cdFx0XHR0aGlzLnRleHRcblx0XHRcdFx0LnRleHQoKCkgPT4gdGhpcy50ZXh0RnVuY3Rpb24obixkKSk7XG5cdFx0fVxuXHR9O1xuXG5cdHJldHVybiB7XG5cdFx0QmFyXG5cdH07XG4gICAgICAgIFxufSkoKTsiLCIvLyBkMy50aXBcbi8vIENvcHlyaWdodCAoYykgMjAxMyBKdXN0aW4gUGFsbWVyXG4vLyBFUzYgLyBEMyB2NCBBZGFwdGlvbiBDb3B5cmlnaHQgKGMpIDIwMTYgQ29uc3RhbnRpbiBHYXZyaWxldGVcbi8vIFJlbW92YWwgb2YgRVM2IGZvciBEMyB2NCBBZGFwdGlvbiBDb3B5cmlnaHQgKGMpIDIwMTYgRGF2aWQgR290elxuLy9cbi8vIFRvb2x0aXBzIGZvciBkMy5qcyBTVkcgdmlzdWFsaXphdGlvbnNcblxuZXhwb3J0IGNvbnN0IGQzVGlwID0gKGZ1bmN0aW9uKCl7XG4gIGQzLmZ1bmN0b3IgPSBmdW5jdGlvbiBmdW5jdG9yKHYpIHtcbiAgICByZXR1cm4gdHlwZW9mIHYgPT09IFwiZnVuY3Rpb25cIiA/IHYgOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB2O1xuICAgIH07XG4gIH07XG5cbiAgZDMudGlwID0gZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgZGlyZWN0aW9uID0gZDNfdGlwX2RpcmVjdGlvbixcbiAgICAgICAgb2Zmc2V0ICAgID0gZDNfdGlwX29mZnNldCxcbiAgICAgICAgaHRtbCAgICAgID0gZDNfdGlwX2h0bWwsXG4gICAgICAgIG5vZGUgICAgICA9IGluaXROb2RlKCksXG4gICAgICAgIHN2ZyAgICAgICA9IG51bGwsXG4gICAgICAgIHBvaW50ICAgICA9IG51bGwsXG4gICAgICAgIHRhcmdldCAgICA9IG51bGxcblxuICAgIGZ1bmN0aW9uIHRpcCh2aXMpIHtcbiAgICAgIHN2ZyA9IGdldFNWR05vZGUodmlzKVxuICAgICAgcG9pbnQgPSBzdmcuY3JlYXRlU1ZHUG9pbnQoKVxuICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChub2RlKVxuICAgIH1cblxuICAgIC8vIFB1YmxpYyAtIHNob3cgdGhlIHRvb2x0aXAgb24gdGhlIHNjcmVlblxuICAgIC8vXG4gICAgLy8gUmV0dXJucyBhIHRpcFxuICAgIHRpcC5zaG93ID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cylcbiAgICAgIGlmKGFyZ3NbYXJncy5sZW5ndGggLSAxXSBpbnN0YW5jZW9mIFNWR0VsZW1lbnQpIHRhcmdldCA9IGFyZ3MucG9wKClcbiAgICAgIHZhciBjb250ZW50ID0gaHRtbC5hcHBseSh0aGlzLCBhcmdzKSxcbiAgICAgICAgICBwb2Zmc2V0ID0gb2Zmc2V0LmFwcGx5KHRoaXMsIGFyZ3MpLFxuICAgICAgICAgIGRpciAgICAgPSBkaXJlY3Rpb24uYXBwbHkodGhpcywgYXJncyksXG4gICAgICAgICAgbm9kZWwgICA9IGdldE5vZGVFbCgpLFxuICAgICAgICAgIGkgICAgICAgPSBkaXJlY3Rpb25zLmxlbmd0aCxcbiAgICAgICAgICBjb29yZHMsXG4gICAgICAgICAgc2Nyb2xsVG9wICA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxUb3AgfHwgZG9jdW1lbnQuYm9keS5zY3JvbGxUb3AsXG4gICAgICAgICAgc2Nyb2xsTGVmdCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxMZWZ0IHx8IGRvY3VtZW50LmJvZHkuc2Nyb2xsTGVmdFxuXG4gICAgICBub2RlbC5odG1sKGNvbnRlbnQpXG4gICAgICAgIC5zdHlsZSgncG9zaXRpb24nLCAnYWJzb2x1dGUnKVxuICAgICAgICAuc3R5bGUoJ29wYWNpdHknLCAxKVxuICAgICAgICAuc3R5bGUoJ3BvaW50ZXItZXZlbnRzJywgJ2FsbCcpXG5cbiAgICAgIHdoaWxlKGktLSkgbm9kZWwuY2xhc3NlZChkaXJlY3Rpb25zW2ldLCBmYWxzZSlcbiAgICAgIGNvb3JkcyA9IGRpcmVjdGlvbl9jYWxsYmFja3NbZGlyXS5hcHBseSh0aGlzKVxuICAgICAgbm9kZWwuY2xhc3NlZChkaXIsIHRydWUpXG4gICAgICAgIC5zdHlsZSgndG9wJywgKGNvb3Jkcy50b3AgKyAgcG9mZnNldFswXSkgKyBzY3JvbGxUb3AgKyAncHgnKVxuICAgICAgICAuc3R5bGUoJ2xlZnQnLCAoY29vcmRzLmxlZnQgKyBwb2Zmc2V0WzFdKSArIHNjcm9sbExlZnQgKyAncHgnKVxuXG4gICAgICByZXR1cm4gdGlwXG4gICAgfVxuXG4gICAgLy8gUHVibGljIC0gaGlkZSB0aGUgdG9vbHRpcFxuICAgIC8vXG4gICAgLy8gUmV0dXJucyBhIHRpcFxuICAgIHRpcC5oaWRlID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbm9kZWwgPSBnZXROb2RlRWwoKVxuICAgICAgbm9kZWxcbiAgICAgICAgLnN0eWxlKCdvcGFjaXR5JywgMClcbiAgICAgICAgLnN0eWxlKCdwb2ludGVyLWV2ZW50cycsICdub25lJylcbiAgICAgIHJldHVybiB0aXBcbiAgICB9XG5cbiAgICAvLyBQdWJsaWM6IFByb3h5IGF0dHIgY2FsbHMgdG8gdGhlIGQzIHRpcCBjb250YWluZXIuICBTZXRzIG9yIGdldHMgYXR0cmlidXRlIHZhbHVlLlxuICAgIC8vXG4gICAgLy8gbiAtIG5hbWUgb2YgdGhlIGF0dHJpYnV0ZVxuICAgIC8vIHYgLSB2YWx1ZSBvZiB0aGUgYXR0cmlidXRlXG4gICAgLy9cbiAgICAvLyBSZXR1cm5zIHRpcCBvciBhdHRyaWJ1dGUgdmFsdWVcbiAgICB0aXAuYXR0ciA9IGZ1bmN0aW9uKG4sIHYpIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMiAmJiB0eXBlb2YgbiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIGdldE5vZGVFbCgpLmF0dHIobilcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBhcmdzID0gIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cylcbiAgICAgICAgZDMuc2VsZWN0aW9uLnByb3RvdHlwZS5hdHRyLmFwcGx5KGdldE5vZGVFbCgpLCBhcmdzKVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGlwXG4gICAgfVxuXG4gICAgLy8gUHVibGljOiBQcm94eSBzdHlsZSBjYWxscyB0byB0aGUgZDMgdGlwIGNvbnRhaW5lci4gIFNldHMgb3IgZ2V0cyBhIHN0eWxlIHZhbHVlLlxuICAgIC8vXG4gICAgLy8gbiAtIG5hbWUgb2YgdGhlIHByb3BlcnR5XG4gICAgLy8gdiAtIHZhbHVlIG9mIHRoZSBwcm9wZXJ0eVxuICAgIC8vXG4gICAgLy8gUmV0dXJucyB0aXAgb3Igc3R5bGUgcHJvcGVydHkgdmFsdWVcbiAgICB0aXAuc3R5bGUgPSBmdW5jdGlvbihuLCB2KSB7XG4gICAgICAvLyBkZWJ1Z2dlcjtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMiAmJiB0eXBlb2YgbiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIGdldE5vZGVFbCgpLnN0eWxlKG4pXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgIHZhciBzdHlsZXMgPSBhcmdzWzBdO1xuICAgICAgICAgIE9iamVjdC5rZXlzKHN0eWxlcykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgIHJldHVybiBkMy5zZWxlY3Rpb24ucHJvdG90eXBlLnN0eWxlLmFwcGx5KGdldE5vZGVFbCgpLCBba2V5LCBzdHlsZXNba2V5XV0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aXBcbiAgICB9XG5cbiAgICAvLyBQdWJsaWM6IFNldCBvciBnZXQgdGhlIGRpcmVjdGlvbiBvZiB0aGUgdG9vbHRpcFxuICAgIC8vXG4gICAgLy8gdiAtIE9uZSBvZiBuKG5vcnRoKSwgcyhzb3V0aCksIGUoZWFzdCksIG9yIHcod2VzdCksIG53KG5vcnRod2VzdCksXG4gICAgLy8gICAgIHN3KHNvdXRod2VzdCksIG5lKG5vcnRoZWFzdCkgb3Igc2Uoc291dGhlYXN0KVxuICAgIC8vXG4gICAgLy8gUmV0dXJucyB0aXAgb3IgZGlyZWN0aW9uXG4gICAgdGlwLmRpcmVjdGlvbiA9IGZ1bmN0aW9uKHYpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGRpcmVjdGlvblxuICAgICAgZGlyZWN0aW9uID0gdiA9PSBudWxsID8gdiA6IGQzLmZ1bmN0b3IodilcblxuICAgICAgcmV0dXJuIHRpcFxuICAgIH1cblxuICAgIC8vIFB1YmxpYzogU2V0cyBvciBnZXRzIHRoZSBvZmZzZXQgb2YgdGhlIHRpcFxuICAgIC8vXG4gICAgLy8gdiAtIEFycmF5IG9mIFt4LCB5XSBvZmZzZXRcbiAgICAvL1xuICAgIC8vIFJldHVybnMgb2Zmc2V0IG9yXG4gICAgdGlwLm9mZnNldCA9IGZ1bmN0aW9uKHYpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIG9mZnNldFxuICAgICAgb2Zmc2V0ID0gdiA9PSBudWxsID8gdiA6IGQzLmZ1bmN0b3IodilcblxuICAgICAgcmV0dXJuIHRpcFxuICAgIH1cblxuICAgIC8vIFB1YmxpYzogc2V0cyBvciBnZXRzIHRoZSBodG1sIHZhbHVlIG9mIHRoZSB0b29sdGlwXG4gICAgLy9cbiAgICAvLyB2IC0gU3RyaW5nIHZhbHVlIG9mIHRoZSB0aXBcbiAgICAvL1xuICAgIC8vIFJldHVybnMgaHRtbCB2YWx1ZSBvciB0aXBcbiAgICB0aXAuaHRtbCA9IGZ1bmN0aW9uKHYpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGh0bWxcbiAgICAgIGh0bWwgPSB2ID09IG51bGwgPyB2IDogZDMuZnVuY3Rvcih2KVxuXG4gICAgICByZXR1cm4gdGlwXG4gICAgfVxuXG4gICAgLy8gUHVibGljOiBkZXN0cm95cyB0aGUgdG9vbHRpcCBhbmQgcmVtb3ZlcyBpdCBmcm9tIHRoZSBET01cbiAgICAvL1xuICAgIC8vIFJldHVybnMgYSB0aXBcbiAgICB0aXAuZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuICAgICAgaWYobm9kZSkge1xuICAgICAgICBnZXROb2RlRWwoKS5yZW1vdmUoKTtcbiAgICAgICAgbm9kZSA9IG51bGw7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGlwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGQzX3RpcF9kaXJlY3Rpb24oKSB7IHJldHVybiAnbicgfVxuICAgIGZ1bmN0aW9uIGQzX3RpcF9vZmZzZXQoKSB7IHJldHVybiBbMCwgMF0gfVxuICAgIGZ1bmN0aW9uIGQzX3RpcF9odG1sKCkgeyByZXR1cm4gJyAnIH1cblxuICAgIHZhciBkaXJlY3Rpb25fY2FsbGJhY2tzID0ge1xuICAgICAgbjogIGRpcmVjdGlvbl9uLFxuICAgICAgczogIGRpcmVjdGlvbl9zLFxuICAgICAgZTogIGRpcmVjdGlvbl9lLFxuICAgICAgdzogIGRpcmVjdGlvbl93LFxuICAgICAgbnc6IGRpcmVjdGlvbl9udyxcbiAgICAgIG5lOiBkaXJlY3Rpb25fbmUsXG4gICAgICBzdzogZGlyZWN0aW9uX3N3LFxuICAgICAgc2U6IGRpcmVjdGlvbl9zZVxuICAgIH07XG5cbiAgICB2YXIgZGlyZWN0aW9ucyA9IE9iamVjdC5rZXlzKGRpcmVjdGlvbl9jYWxsYmFja3MpO1xuXG4gICAgZnVuY3Rpb24gZGlyZWN0aW9uX24oKSB7XG4gICAgICB2YXIgYmJveCA9IGdldFNjcmVlbkJCb3goKVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9wOiAgYmJveC5uLnkgLSBub2RlLm9mZnNldEhlaWdodCxcbiAgICAgICAgbGVmdDogYmJveC5uLnggLSBub2RlLm9mZnNldFdpZHRoIC8gMlxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpcmVjdGlvbl9zKCkge1xuICAgICAgdmFyIGJib3ggPSBnZXRTY3JlZW5CQm94KClcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRvcDogIGJib3gucy55LFxuICAgICAgICBsZWZ0OiBiYm94LnMueCAtIG5vZGUub2Zmc2V0V2lkdGggLyAyXG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGlyZWN0aW9uX2UoKSB7XG4gICAgICB2YXIgYmJveCA9IGdldFNjcmVlbkJCb3goKVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9wOiAgYmJveC5lLnkgLSBub2RlLm9mZnNldEhlaWdodCAvIDIsXG4gICAgICAgIGxlZnQ6IGJib3guZS54XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGlyZWN0aW9uX3coKSB7XG4gICAgICB2YXIgYmJveCA9IGdldFNjcmVlbkJCb3goKVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9wOiAgYmJveC53LnkgLSBub2RlLm9mZnNldEhlaWdodCAvIDIsXG4gICAgICAgIGxlZnQ6IGJib3gudy54IC0gbm9kZS5vZmZzZXRXaWR0aFxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpcmVjdGlvbl9udygpIHtcbiAgICAgIHZhciBiYm94ID0gZ2V0U2NyZWVuQkJveCgpXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0b3A6ICBiYm94Lm53LnkgLSBub2RlLm9mZnNldEhlaWdodCxcbiAgICAgICAgbGVmdDogYmJveC5udy54IC0gbm9kZS5vZmZzZXRXaWR0aFxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpcmVjdGlvbl9uZSgpIHtcbiAgICAgIHZhciBiYm94ID0gZ2V0U2NyZWVuQkJveCgpXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0b3A6ICBiYm94Lm5lLnkgLSBub2RlLm9mZnNldEhlaWdodCxcbiAgICAgICAgbGVmdDogYmJveC5uZS54XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGlyZWN0aW9uX3N3KCkge1xuICAgICAgdmFyIGJib3ggPSBnZXRTY3JlZW5CQm94KClcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRvcDogIGJib3guc3cueSxcbiAgICAgICAgbGVmdDogYmJveC5zdy54IC0gbm9kZS5vZmZzZXRXaWR0aFxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpcmVjdGlvbl9zZSgpIHtcbiAgICAgIHZhciBiYm94ID0gZ2V0U2NyZWVuQkJveCgpXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0b3A6ICBiYm94LnNlLnksXG4gICAgICAgIGxlZnQ6IGJib3guZS54XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5pdE5vZGUoKSB7XG4gICAgICB2YXIgbm9kZSA9IGQzLnNlbGVjdChkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSlcbiAgICAgIG5vZGVcbiAgICAgICAgLnN0eWxlKCdwb3NpdGlvbicsICdhYnNvbHV0ZScpXG4gICAgICAgIC5zdHlsZSgndG9wJywgMClcbiAgICAgICAgLnN0eWxlKCdvcGFjaXR5JywgMClcbiAgICAgICAgLnN0eWxlKCdwb2ludGVyLWV2ZW50cycsICdub25lJylcbiAgICAgICAgLnN0eWxlKCdib3gtc2l6aW5nJywgJ2JvcmRlci1ib3gnKVxuXG4gICAgICByZXR1cm4gbm9kZS5ub2RlKClcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTVkdOb2RlKGVsKSB7XG4gICAgICBlbCA9IGVsLm5vZGUoKVxuICAgICAgaWYoZWwudGFnTmFtZS50b0xvd2VyQ2FzZSgpID09PSAnc3ZnJylcbiAgICAgICAgcmV0dXJuIGVsXG5cbiAgICAgIHJldHVybiBlbC5vd25lclNWR0VsZW1lbnRcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXROb2RlRWwoKSB7XG4gICAgICBpZihub2RlID09PSBudWxsKSB7XG4gICAgICAgIG5vZGUgPSBpbml0Tm9kZSgpO1xuICAgICAgICAvLyByZS1hZGQgbm9kZSB0byBET01cbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChub2RlKTtcbiAgICAgIH07XG4gICAgICByZXR1cm4gZDMuc2VsZWN0KG5vZGUpO1xuICAgIH1cblxuICAgIC8vIFByaXZhdGUgLSBnZXRzIHRoZSBzY3JlZW4gY29vcmRpbmF0ZXMgb2YgYSBzaGFwZVxuICAgIC8vXG4gICAgLy8gR2l2ZW4gYSBzaGFwZSBvbiB0aGUgc2NyZWVuLCB3aWxsIHJldHVybiBhbiBTVkdQb2ludCBmb3IgdGhlIGRpcmVjdGlvbnNcbiAgICAvLyBuKG5vcnRoKSwgcyhzb3V0aCksIGUoZWFzdCksIHcod2VzdCksIG5lKG5vcnRoZWFzdCksIHNlKHNvdXRoZWFzdCksIG53KG5vcnRod2VzdCksXG4gICAgLy8gc3coc291dGh3ZXN0KS5cbiAgICAvL1xuICAgIC8vICAgICstKy0rXG4gICAgLy8gICAgfCAgIHxcbiAgICAvLyAgICArICAgK1xuICAgIC8vICAgIHwgICB8XG4gICAgLy8gICAgKy0rLStcbiAgICAvL1xuICAgIC8vIFJldHVybnMgYW4gT2JqZWN0IHtuLCBzLCBlLCB3LCBudywgc3csIG5lLCBzZX1cbiAgICBmdW5jdGlvbiBnZXRTY3JlZW5CQm94KCkge1xuICAgICAgdmFyIHRhcmdldGVsICAgPSB0YXJnZXQgfHwgZDMuZXZlbnQudGFyZ2V0O1xuICAgICAgY29uc29sZS5sb2codGFyZ2V0ZWwpO1xuICAgICAgZnVuY3Rpb24gdHJ5QkJveCgpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHRhcmdldGVsLmdldEJCb3goKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgdGFyZ2V0ZWwgPSB0YXJnZXRlbC5wYXJlbnROb2RlO1xuICAgICAgICAgIHRyeUJCb3goKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdHJ5QkJveCgpO1xuICAgICAgd2hpbGUgKCd1bmRlZmluZWQnID09PSB0eXBlb2YgdGFyZ2V0ZWwuZ2V0U2NyZWVuQ1RNICl7Ly8gJiYgJ3VuZGVmaW5lZCcgPT09IHRhcmdldGVsLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICB0YXJnZXRlbCA9IHRhcmdldGVsLnBhcmVudE5vZGU7XG4gICAgICB9XG4gICAgICBjb25zb2xlLmxvZyh0YXJnZXRlbCk7XG4gICAgICB2YXIgYmJveCAgICAgICA9IHt9LFxuICAgICAgICAgIG1hdHJpeCAgICAgPSB0YXJnZXRlbC5nZXRTY3JlZW5DVE0oKSxcbiAgICAgICAgICB0YmJveCAgICAgID0gdGFyZ2V0ZWwuZ2V0QkJveCgpLFxuICAgICAgICAgIHdpZHRoICAgICAgPSB0YmJveC53aWR0aCxcbiAgICAgICAgICBoZWlnaHQgICAgID0gdGJib3guaGVpZ2h0LFxuICAgICAgICAgIHggICAgICAgICAgPSB0YmJveC54LFxuICAgICAgICAgIHkgICAgICAgICAgPSB0YmJveC55XG5cbiAgICAgIHBvaW50LnggPSB4XG4gICAgICBwb2ludC55ID0geVxuICAgICAgYmJveC5udyA9IHBvaW50Lm1hdHJpeFRyYW5zZm9ybShtYXRyaXgpXG4gICAgICBwb2ludC54ICs9IHdpZHRoXG4gICAgICBiYm94Lm5lID0gcG9pbnQubWF0cml4VHJhbnNmb3JtKG1hdHJpeClcbiAgICAgIHBvaW50LnkgKz0gaGVpZ2h0XG4gICAgICBiYm94LnNlID0gcG9pbnQubWF0cml4VHJhbnNmb3JtKG1hdHJpeClcbiAgICAgIHBvaW50LnggLT0gd2lkdGhcbiAgICAgIGJib3guc3cgPSBwb2ludC5tYXRyaXhUcmFuc2Zvcm0obWF0cml4KVxuICAgICAgcG9pbnQueSAtPSBoZWlnaHQgLyAyXG4gICAgICBiYm94LncgID0gcG9pbnQubWF0cml4VHJhbnNmb3JtKG1hdHJpeClcbiAgICAgIHBvaW50LnggKz0gd2lkdGhcbiAgICAgIGJib3guZSA9IHBvaW50Lm1hdHJpeFRyYW5zZm9ybShtYXRyaXgpXG4gICAgICBwb2ludC54IC09IHdpZHRoIC8gMlxuICAgICAgcG9pbnQueSAtPSBoZWlnaHQgLyAyXG4gICAgICBiYm94Lm4gPSBwb2ludC5tYXRyaXhUcmFuc2Zvcm0obWF0cml4KVxuICAgICAgcG9pbnQueSArPSBoZWlnaHRcbiAgICAgIGJib3gucyA9IHBvaW50Lm1hdHJpeFRyYW5zZm9ybShtYXRyaXgpXG5cbiAgICAgIHJldHVybiBiYm94XG4gICAgfVxuXG4gICAgcmV0dXJuIHRpcFxuICB9O1xufSkoKTsiLCJjb25zdCBtYkhlbHBlciA9IHtcbiAgICBwcm9taXNlczoge30sXG4gICAgYWRkU291cmNlQW5kTGF5ZXJzKHNvdXJjZU9wdGlvbnMsbGF5ZXJPcHRpb25zQXJyYXkpeyAvLyB0aGlzID0gbWFwXG4gICAgICAgIHZhciBzb3VyY2VOYW1lID0gc291cmNlT3B0aW9ucy5uYW1lO1xuICAgICAgICBtYkhlbHBlci5wcm9taXNlc1tzb3VyY2VPcHRpb25zLm5hbWVdID0gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHsgLy8gVE8gRE86IGZpZ3VyZSBvdXQgcmVqZWN0P1xuICAgICAgICAgICAgZGVsZXRlIHNvdXJjZU9wdGlvbnMubmFtZTtcbiAgICAgICAgICAgIGZ1bmN0aW9uIGNoZWNrRGF0YUxvYWRlZCgpe1xuICAgICAgICAgICAgICAgIGlmICggdGhpcy5nZXRTb3VyY2Uoc291cmNlTmFtZSkgKXsgLy8gaWYgYWRkU291cmNlIGhhcyB0YWtlbiBlZmZlY3RcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vZmYoJ3JlbmRlcicsIGNoZWNrRGF0YUxvYWRlZCk7IC8vIHR1cm4gb2ZmIHRoZSBsaXN0ZW5lciBmb3IgcmVuZGVyXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5vbigncmVuZGVyJywgY2hlY2tEYXRhTG9hZGVkKTtcbiAgICAgICAgICAgIHRoaXMuYWRkU291cmNlKHNvdXJjZU5hbWUsIHNvdXJjZU9wdGlvbnMpO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGxheWVyUHJvbWlzZXMgPSBbXTtcbiAgICAgICAgcmV0dXJuIG1iSGVscGVyLnByb21pc2VzW3NvdXJjZU5hbWVdLnRoZW4oKCkgPT4geyBcbiAgICAgICAgICAgIGxheWVyT3B0aW9uc0FycmF5LmZvckVhY2goKGVhY2gpID0+IHtcbiAgICAgICAgICAgICAgICBsYXllclByb21pc2VzLnB1c2goXG4gICAgICAgICAgICAgICAgICAgIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7IC8vIFRPIERPOiBmaWd1cmUgb3V0IHJlamVjdD9cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBiZWZvcmVMYXllciA9IGVhY2guYmVmb3JlTGF5ZXIgPyBlYWNoLmJlZm9yZUxheWVyIDogJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgZWFjaC5iZWZvcmVMYXllcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVhY2guc291cmNlID0gc291cmNlTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGNoZWNrTGF5ZXJMb2FkZWQoKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIHRoaXMuZ2V0TGF5ZXIoZWFjaC5pZCkgKXsgLy8gaWYgYWRkTGF5ZXIgIGhhcyB0YWtlbiBlZmZlY3RcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vZmYoJ3JlbmRlcicsIGNoZWNrTGF5ZXJMb2FkZWQpOyAvLyB0dXJuIG9mZiB0aGUgbGlzdGVuZXIgZm9yIHJlbmRlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub24oJ3JlbmRlcicsIGNoZWNrTGF5ZXJMb2FkZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRMYXllcihlYWNoLCBiZWZvcmVMYXllcik7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKGxheWVyUHJvbWlzZXMpO1xuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG5leHBvcnRzLmFkZFNvdXJjZUFuZExheWVycyA9IG1iSGVscGVyLmFkZFNvdXJjZUFuZExheWVyczsiXX0=
