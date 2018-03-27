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
					console.log(this.zScores);
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
					console.log(this.zScores);
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

					//return '$' + d3.format(",.0f")(n);
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

					//return '$' + d3.format(",.0f")(n);
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
			var infoMarks = d3.selectAll('.has-info-mark').append('svg').datum(information).attr('width', '12px').attr('viewBox', '0 0 12 12').attr('class', 'info-mark');

			infoMarks.append('circle').attr('class', 'info-mark-background').attr('cx', 6).attr('cy', 6).attr('r', 6).call(tip).on('mouseenter', function (d) {
				console.log(d3.event);
				tip.show.call(this, d);
			}).on('mouseleave', tip.hide);

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkZXYtanMvbWFpbi5lczYiLCJqcy1leHBvcnRzL0JhcnMuanMiLCJqcy12ZW5kb3IvZDMtdGlwLmpzIiwibm9kZV9tb2R1bGVzL21hcGJveC1oZWxwZXIvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztBQ0VDOztBQUNBOztvTUFIQTtBQUNBOzs7QUFJQTs7QUFFRDs7Ozs7Ozs7QUFRQTs7Ozs7QUFLQSxPQUFPLE1BQVAsR0FBa0IsWUFBVTtBQUM1Qjs7QUFFQzs7QUFFRyxVQUFTLFdBQVQsR0FBdUIsOEZBQXZCO0FBQ0EsSUFBRyxTQUFILENBQWEsWUFBYixFQUNFLEVBREYsQ0FDSyxPQURMLEVBQ2MsWUFBTTtBQUNsQixLQUFHLEtBQUgsQ0FBUyxjQUFUO0FBQ0EsRUFIRjtBQUlBLEtBQU0sV0FBVyxRQUFRLGVBQVIsQ0FBakI7QUFDRDtBQUNDLEtBQU0sTUFBTSxHQUFHLEdBQUgsR0FBUyxJQUFULENBQWMsT0FBZCxFQUF1QixRQUF2QixFQUFpQyxTQUFqQyxDQUEyQyxHQUEzQyxFQUFnRCxJQUFoRCxDQUFxRCxVQUFTLENBQVQsRUFBWTtBQUFFLFVBQVEsR0FBUixDQUFZLElBQVosRUFBaUIsQ0FBakIsRUFBb0IsT0FBTyxFQUFFLEdBQUcsTUFBSCxDQUFVLEtBQUssVUFBTCxDQUFnQixVQUFoQixDQUEyQixVQUFyQyxFQUFpRCxJQUFqRCxDQUFzRCxJQUF0RCxFQUE0RCxPQUE1RCxDQUFvRSxHQUFwRSxFQUF3RSxFQUF4RSxDQUFGLENBQVA7QUFBd0YsRUFBL0ssQ0FBWjtBQUNBLEtBQU0sWUFBWSxFQUFsQjs7QUFFQSxLQUFJLE9BQUo7QUFDQSxLQUFJLHdCQUF3QixJQUFJLEdBQUosRUFBNUI7QUFDQSxLQUFJLFlBQVksQ0FBaEI7O0FBRUEsS0FBSSxv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QixnQkFBbEI7QUFDQSwwQkFBSyxRQUFMLENBQWMsSUFBZCxFQUFvQixXQUFwQjtBQUNILGlCQVpELENBREo7QUFlSCxhQWhCRDtBQWlCQSxtQkFBTyxRQUFRLEdBQVIsQ0FBWSxhQUFaLENBQVA7QUFDSCxTQW5CTSxDQUFQO0FBb0JIO0FBcENZLENBQWpCOztBQXVDQSxRQUFRLGtCQUFSLEdBQTZCLFNBQVMsa0JBQXRDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc31yZXR1cm4gZX0pKCkiLCIgLyogZXhwb3J0ZWQgQ2hhcnRzLCBkM1RpcCAqL1xuIC8vaW1wb3J0IHsgRG9udXRzIH0gZnJvbSAnLi4vanMtZXhwb3J0cy9Eb251dHMnO1xuIGltcG9ydCB7IEJhcnMgfSBmcm9tICcuLi9qcy1leHBvcnRzL0JhcnMnO1xuIGltcG9ydCB7IGQzVGlwIH0gZnJvbSAnLi4vanMtdmVuZG9yL2QzLXRpcCc7XG4gXG4gLyogcG9seWZpbGxzIG5lZWRlZDogUHJvbWlzZSBUTyBETzogT1RIRVJTP1xuICovXG4vKlxuaW1wb3J0IHsgcmVmbGVjdCwgYXJyYXlGaW5kLCBTVkdJbm5lckhUTUwsIFNWR0ZvY3VzIH0gZnJvbSAnLi4vanMtdmVuZG9yL3BvbHlmaWxscyc7XG5pbXBvcnQgeyBIZWxwZXJzIH0gZnJvbSAnLi4vanMtZXhwb3J0cy9IZWxwZXJzJztcbmltcG9ydCB7IGQzVGlwIH0gZnJvbSAnLi4vanMtdmVuZG9yL2QzLXRpcCc7XG5pbXBvcnQgeyBjcmVhdGVCcm93c2VCdXR0b24gfSBmcm9tICcuLi9qcy1leHBvcnRzL0Jyb3dzZUJ1dHRvbnMnO1xuaW1wb3J0IHsgY3JlYXRlUmVzdWx0SXRlbSB9IGZyb20gJy4uL2pzLWV4cG9ydHMvUmVzdWx0SXRlbXMnOyBcbiovXG4gIFxuLypcbnRvIGRvIDogc2VlIGFsc28gaHR0cHM6Ly93d3cubWFwYm94LmNvbS9tYXBib3gtZ2wtanMvZXhhbXBsZS9oZWF0bWFwLWxheWVyL1xuIFxuXG4qL1xud2luZG93LnRoZU1hcCAgPSAoZnVuY3Rpb24oKXsgICBcblwidXNlIHN0cmljdFwiO1xuXHRcblx0Ly92YXIgdGlwID0gZDMudGlwKCkuYXR0cignY2xhc3MnLCAnZDMtdGlwJykuaHRtbChmdW5jdGlvbihkKSB7IHJldHVybiBkOyB9KTtcblx0XG4gICAgbWFwYm94Z2wuYWNjZXNzVG9rZW4gPSAncGsuZXlKMUlqb2liM04wWlhKdFlXNXFJaXdpWVNJNkltTnBkblU1ZEhWbmRqQTJlRFl5YjNBM05uZzFjR0ozWlhvaWZRLlhvX2sta3pHZllYX1lvX1JEY0hEQmcnO1xuICAgIGQzLnNlbGVjdEFsbCgnLmhlbHAtbGluaycpXG4gICAgXHQub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgIFx0XHRkMy5ldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIFx0fSk7XG4gICAgY29uc3QgbWJIZWxwZXIgPSByZXF1aXJlKCdtYXBib3gtaGVscGVyJyk7XG4gICAvLyBkMy50aXAgPSByZXF1aXJlKCdkMy10aXAnKTtcbiAgICBjb25zdCB0aXAgPSBkMy50aXAoKS5hdHRyKCdjbGFzcycsICdkMy10aXAnKS5kaXJlY3Rpb24oJ3cnKS5odG1sKGZ1bmN0aW9uKGQpIHsgY29uc29sZS5sb2codGhpcyxkKTtyZXR1cm4gZFtkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlLnBhcmVudE5vZGUucGFyZW50Tm9kZSkuYXR0cignaWQnKS5yZXBsYWNlKCctJywnJyldOyB9KTtcbiAgIFx0Y29uc3QgdGhlQ2hhcnRzID0gW107XG4gICBcbiAgICB2YXIgZ2VvanNvbjtcbiAgICB2YXIgZmVhdHVyZVByb3BlcnRpZXNCeUlkID0gbmV3IE1hcCgpOyBcbiAgICB2YXIgZ2F0ZUNoZWNrID0gMDtcblxuICAgIHZhciBzaXplWm9vbVRocmVzaG9sZCA9IDg7XG4gICAgXG4gICAgdmFyIHRoZU1hcCA9IG5ldyBtYXBib3hnbC5NYXAoe1xuXHQgICAgY29udGFpbmVyOiAnbWFwJyxcblx0ICAgIHN0eWxlOiAnbWFwYm94Oi8vc3R5bGVzL29zdGVybWFuai9jamYwM28zN2IzdHZlMnJxcDJpbnc2YTFmJyxcblx0ICAgIGNlbnRlcjogWy05NS4xNDkzNTE0ODY0NTkwNzMsIDM3Ljk4NDY3MzM3MDg1NTk5XSxcblx0ICAgIHpvb206IDMsXG5cdCAgICBtYXhCb3VuZHM6IFtbLTE0Mi44ODcwNTcxNDc0NjM2MiwgMTYuMDU4MzQ0OTQ4NDMyNDA2XSxbLTUxLjkwMjMwMTc4Njk3MzEsNTUuNzY2OTAwNjc0MTcxMzhdXSxcblx0ICAgIG1pblpvb206IDEuNSxcblx0ICAgIGF0dHJpYnV0aW9uQ29udHJvbDogZmFsc2UsXG5cdH0pO1xuXG5cdHZhciBuYXYgPSBuZXcgbWFwYm94Z2wuTmF2aWdhdGlvbkNvbnRyb2woe3Nob3dDb21wYXNzOmZhbHNlfSk7XG5cdHRoZU1hcC5hZGRDb250cm9sKG5hdiwgJ3RvcC1yaWdodCcpO1xuXG5cdHZhciBtZWRpYW5JbmNvbWVzID0gbmV3IE1hcCgpO1xuXHR0b0dlb0pTT04oJ3BvbGljaWVzLmNzdicpO1xuXHR0aGVNYXAub24oJ2xvYWQnLCBmdW5jdGlvbigpe1xuXHRcdGdhdGVDaGVjaysrO1xuXHRcdGdhdGUoKTtcblx0fSk7XG5cdGZ1bmN0aW9uIGdhdGUoKXtcblx0XHRpZiAoIGdhdGVDaGVjayA8IDIgKXtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dXBkYXRlQWxsKCk7XG5cdFx0YWRkVW5jbHVzdGVyZWQoKTtcblx0XHRhZGRDbHVzdGVyZWQoKTtcblx0XHQvL2NhbGN1bGF0ZVpTY29yZXMoJ3ByZW0nKTtcblx0fSAvLyBlbmQgZ2F0ZVxuXG5cdC8qdmFyIGNlbnN1c1RyYWN0c0luVmlldyA9IG5ldyBTZXQoKTtcblx0ZnVuY3Rpb24gY2FsY3VsYXRlTWVkaWFuSW5jb21lcyhpblZpZXdJRHMpe1xuXHRcdGNvbnNvbGUubG9nKGluVmlld0lEcyk7XG5cdFx0dmFyIG1lZGlhbkluY29tZXMgPSBbXTtcblx0XHRjZW5zdXNUcmFjdHNJblZpZXcuY2xlYXIoKTtcblx0XHRpblZpZXdJRHMuZm9yRWFjaChkID0+IHtcblx0XHRcdGNvbnNvbGUubG9nKGQpO1xuXHRcdFx0dmFyIGZlYXR1cmUgPSBnZW9qc29uLmZlYXR1cmVzLmZpbmQoZiA9PiBmLnByb3BlcnRpZXMuaWQgPT09IGQpO1xuXHRcdFx0dmFyIGNlbnN1c1RyYWN0ID0gZmVhdHVyZS5jZW5fdHJhY3Q7XG5cdFx0XHRpZiAoICFjZW5zdXNUcmFjdHNJblZpZXcuaGFzKGNlbnN1c1RyYWN0KSl7XG5cdFx0XHRcdGNlbnN1c1RyYWN0c0luVmlldy5hZGQoY2Vuc3VzVHJhY3QpO1xuXHRcdFx0XHRtZWRpYW5JbmNvbWVzLnB1c2goZmVhdHVyZS5tZWRfaW5jb21lKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRyZXR1cm4gbWVkaWFuSW5jb21lcztcblx0fSovXG5cdGZ1bmN0aW9uIGNhbGN1bGF0ZVpTY29yZXMoZmllbGQsIGN1dG9mZiA9IG51bGwsIGhhcmRDdXRvZmYgPSBudWxsLCBpZ25vcmUgPSBbXSApeyAgLy8gY3V0b2ZmIHNwZWNpZmllcyB1cHBlciBib3VuZCB0byBnZXQgcmlkIG9mIG91dGxpZXJzXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCAgLy8gYSB3ZWFrIGN1dG9mZiBjYWxjdWxhdGVzIHZhbHVlcyBmb3Igd2hvbGUgc2V0IGJ1dFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQgIC8vIHNldHMgbWF4IGZvciB0aGUgdml6IGJhc2VkIG9uIHRoZSBjdXRvZmYgdmFsdWUuIGEgaGFyZFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQgIC8vIGN1dG9mZiBleGNsdWRlcyB2YWx1ZXMgYmV5b25kIHRoZSBjdXRvZmYgZnJvbSB0aGUgXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCAgLy8gY2FsY3VsYXRpb25zXHRcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ICAvLyB0aGUgaWdub3JlIGFycmF5IGlzIHZhbHVlcyB0aGF0IHNob3VsZCBiZSB0cmVhdGVkIGFzIGludmFsaWRcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ICAvLyBzdWNoIGFzIGFsbCB0aGUgZXJyb25lb3VlICQyNTBrIGhvbWUgdmFsdWVzLlxuXHRcdGNvbnNvbGUubG9nKCdjYWxjdWxhdGluZyB6LXNjb3JlcycpO1xuXHRcdHZhciBtZWFuID0gZDMubWVhbihnZW9qc29uLmZlYXR1cmVzLCBkID0+IHtcblx0XHRcdGlmICggaGFyZEN1dG9mZiA9PT0gbnVsbCApIHtcblx0XHRcdFx0cmV0dXJuIGlnbm9yZS5pbmRleE9mKGQucHJvcGVydGllc1tmaWVsZF0pID09PSAtMSA/IGQucHJvcGVydGllc1tmaWVsZF0gOiBudWxsO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCBkLnByb3BlcnRpZXNbZmllbGRdIDw9IGhhcmRDdXRvZmYgKXtcblx0XHRcdFx0cmV0dXJuIGlnbm9yZS5pbmRleE9mKGQucHJvcGVydGllc1tmaWVsZF0pID09PSAtMSA/IGQucHJvcGVydGllc1tmaWVsZF0gOiBudWxsO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHZhciBzZCA9IGQzLmRldmlhdGlvbihnZW9qc29uLmZlYXR1cmVzLCBkID0+IHtcblx0XHRcdGlmICggaGFyZEN1dG9mZiA9PT0gbnVsbCApIHtcblx0XHRcdFx0cmV0dXJuIGlnbm9yZS5pbmRleE9mKGQucHJvcGVydGllc1tmaWVsZF0pID09PSAtMSA/IGQucHJvcGVydGllc1tmaWVsZF0gOiBudWxsO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCBkLnByb3BlcnRpZXNbZmllbGRdIDw9IGhhcmRDdXRvZmYgKXtcblx0XHRcdFx0cmV0dXJuIGlnbm9yZS5pbmRleE9mKGQucHJvcGVydGllc1tmaWVsZF0pID09PSAtMSA/IGQucHJvcGVydGllc1tmaWVsZF0gOiBudWxsO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHZhciBtaW4sXG5cdFx0XHRtYXgsXG5cdFx0XHRjdXRvZmZaID0gY3V0b2ZmID8gKCBjdXRvZmYgLSBtZWFuICkgLyBzZCA6IG51bGw7XG5cblx0XHRjb25zb2xlLmxvZygnY3V0b2ZmIGlzICcgKyBjdXRvZmZaKTtcblx0XHRnZW9qc29uLmZlYXR1cmVzLmZvckVhY2goZWFjaCA9PiB7XG5cdFx0XHRpZiAoIGhhcmRDdXRvZmYgJiYgZWFjaC5wcm9wZXJ0aWVzW2ZpZWxkXSA+IGhhcmRDdXRvZmYgfHwgaWdub3JlLmluZGV4T2YoZWFjaC5wcm9wZXJ0aWVzW2ZpZWxkXSkgIT09IC0xICl7XG5cdFx0XHRcdGVhY2gucHJvcGVydGllc1tmaWVsZCArICdaJ10gPSBudWxsO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZWFjaC5wcm9wZXJ0aWVzW2ZpZWxkICsgJ1onXSA9ICggZWFjaC5wcm9wZXJ0aWVzW2ZpZWxkXSAtIG1lYW4gKSAvIHNkO1xuXHRcdFx0XHRtaW4gPSBlYWNoLnByb3BlcnRpZXNbZmllbGQgKyAnWiddIDwgbWluIHx8IG1pbiA9PT0gdW5kZWZpbmVkID8gZWFjaC5wcm9wZXJ0aWVzW2ZpZWxkICsgJ1onXSA6IG1pbjtcblx0XHRcdFx0bWF4ID0gZWFjaC5wcm9wZXJ0aWVzW2ZpZWxkICsgJ1onXSA+IG1heCB8fCBtYXggPT09IHVuZGVmaW5lZCA/IGVhY2gucHJvcGVydGllc1tmaWVsZCArICdaJ10gOiBtYXg7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0Y29uc29sZS5sb2coJ2FjdHVhbE1pbjonICsgbWluLCAnYWN0dWFsTWF4OicgKyBtYXgpO1xuXHRcdC8vbWF4ID0gZDMubWluKFttYXgsY3V0b2ZmWiwzXSk7XG5cdFx0Ly9taW4gPSBkMy5tYXgoW21pbiwgLTNdKTtcblx0XHRtYXggPSAyLjMzO1xuXHRcdG1pbiA9IC0yLjMzO1xuXHRcdGNvbnNvbGUubG9nKCdkb25lJywgZ2VvanNvbiwgbWluLCBtYXgpO1xuXHRcdHJldHVybiB7XG5cdFx0XHRtaW4sXG5cdFx0XHRtYXgsXG5cdFx0XHRtZWFuLFxuXHRcdFx0c2Rcblx0XHR9O1xuXHR9XG5cblx0ZnVuY3Rpb24gYWRkVW5jbHVzdGVyZWQoKXtcblx0XHRyZXR1cm4gbWJIZWxwZXIuYWRkU291cmNlQW5kTGF5ZXJzLmNhbGwodGhlTWFwLFxuXHRcdFx0eyAvLyBzb3VyY2Vcblx0XHRcdFx0XCJuYW1lXCI6IFwicG9saWN5LXBvaW50c1wiLFxuXHRcdCAgICAgICAgXCJ0eXBlXCI6IFwiZ2VvanNvblwiLFxuXHRcdCAgICAgICAgXCJkYXRhXCI6IGdlb2pzb25cblx0XHRcdH0sIFsgLy8gbGF5ZXJzXG5cdFx0XHRcdHsgLy8gbGF5ZXIgb25lXG5cdCAgICAgICAgICAgIFwiaWRcIjogXCJwb2ludHNcIixcblx0ICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY2lyY2xlXCIsXG5cdCAgICAgICAgICAgIFwic291cmNlXCI6IFwicG9saWN5LXBvaW50c1wiLFxuXHQgICAgICAgICAgICBcIm1heHpvb21cIjogc2l6ZVpvb21UaHJlc2hvbGQsXG5cdCAgICAgICAgICAgIFwicGFpbnRcIjoge1xuXHQgICAgICAgICAgICAgIFx0XCJjaXJjbGUtY29sb3JcIjogW1xuXHRcdCAgICAgICAgICAgICAgICAnbWF0Y2gnLFxuXHRcdCAgICAgICAgICAgICAgICBbJ2dldCcsICd0X2RlZCddLFxuXHRcdCAgICAgICAgICAgICAgICA1LCAnIzBmNDM5YycsXG5cdFx0ICAgICAgICAgICAgICAgIC8qIG90aGVyICovICcjOTkwMDAwJ1xuXHRcdCAgICAgICAgICAgIF0sXG5cdFx0ICAgICAgICAgICAgXCJjaXJjbGUtcmFkaXVzXCI6IHtcblx0XHQgICAgICAgICAgICAgICAgJ3N0b3BzJzogW1s1LCAzXSwgWzgsIDE4XV1cblx0XHQgICAgICAgICAgICB9LFxuXHRcdCAgICAgICAgICAgIFwiY2lyY2xlLW9wYWNpdHlcIjogMC4xXG5cdFx0ICAgICAgICAgICAgfVxuXHRcdCAgICAgICAgfSxcblx0XHQgICAgICAgIHsgLy8gbGF5ZXIgdHdvXG5cdCAgICAgICAgICAgIFwiaWRcIjogXCJwb2ludHMtZGF0YS1kcml2ZW5cIixcblx0ICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY2lyY2xlXCIsXG5cdCAgICAgICAgICAgIFwic291cmNlXCI6IFwicG9saWN5LXBvaW50c1wiLFxuXHQgICAgICAgICAgICBcIm1pbnpvb21cIjogc2l6ZVpvb21UaHJlc2hvbGQsXG5cdCAgICAgICAgICAgIFwicGFpbnRcIjoge1xuXHQgICAgICAgICAgICAgIFx0XCJjaXJjbGUtY29sb3JcIjogW1xuXHRcdCAgICAgICAgICAgICAgICAnbWF0Y2gnLFxuXHRcdCAgICAgICAgICAgICAgICBbJ2dldCcsICd0X2RlZCddLFxuXHRcdCAgICAgICAgICAgICAgICA1LCAnIzBmNDM5YycsXG5cdFx0ICAgICAgICAgICAgICAgIC8qIG90aGVyICovICcjOTkwMDAwJ1xuXHRcdCAgICAgICAgICAgIF0sXG5cdFx0ICAgICAgICAgICAgXCJjaXJjbGUtcmFkaXVzXCI6IHtcblx0XHQgICAgICAgICAgICBcdHByb3BlcnR5OiAncHJlbScsXG5cdFx0ICAgICAgICAgICAgICAgIHR5cGU6ICdleHBvbmVudGlhbCcsXG5cdFx0XHRcdCAgICAgICAgc3RvcHM6IFtcblx0XHRcdFx0ICAgICAgICAgIFs2MiwgNV0sXG5cdFx0XHRcdCAgICAgICAgICBbMjUwMCwgNjBdXG5cdFx0XHRcdCAgICAgICAgXVxuXHRcdCAgICAgICAgICAgIH0sXG5cdFx0ICAgICAgICAgICAgXCJjaXJjbGUtb3BhY2l0eVwiOiAwLjEsXG5cdFx0ICAgICAgICAgICAgXCJjaXJjbGUtc3Ryb2tlLWNvbG9yXCI6IFwiI2ZmZmZmZlwiLFxuXHRcdCAgICAgICAgICAgIFwiY2lyY2xlLXN0cm9rZS13aWR0aFwiOiAxXG5cdFx0ICAgICAgICB9XG5cdFx0XHR9XVxuXHRcdCk7IFxuXHR9XG5cdC8qZnVuY3Rpb24gY2hlY2tGZWF0dXJlc0xvYWRlZCgpe1xuXHRcdGlmICggdGhlTWFwLmxvYWRlZCgpKXtcblx0XHRcdFxuXHRcdFx0dGhlTWFwLm9mZigncmVuZGVyJywgY2hlY2tGZWF0dXJlcyk7XG5cdFx0fVxuXHR9Ki9cblx0ZnVuY3Rpb24gYWRkQ2x1c3RlcmVkKCl7XG5cdFx0XG5cdFx0bWJIZWxwZXIuYWRkU291cmNlQW5kTGF5ZXJzLmNhbGwodGhlTWFwLFxuXHRcdCAgICB7IC8vIHNvdXJjZVxuXHRcdCAgICBcdFwibmFtZVwiOiBcInBvbGljaWVzXCIsXG5cdFx0ICAgICAgICBcInR5cGVcIjogXCJnZW9qc29uXCIsXG5cdFx0ICAgICAgICBcImRhdGFcIjogZ2VvanNvbixcblx0XHQgICAgICAgIFwiY2x1c3RlclwiOiB0cnVlLFxuXHRcdCAgICAgICAgXCJjbHVzdGVyUmFkaXVzXCI6IDAuNSAvLyBSYWRpdXMgb2YgZWFjaCBjbHVzdGVyIHdoZW4gY2x1c3RlcmluZyBwb2ludHMgKGRlZmF1bHRzIHRvIDUwKVxuXHRcdCAgICB9LCBbIC8vIGxheWVyc1xuXHRcdCAgICAgICB7IC8vIGxheWVyIG9uZVxuXHRcdCAgICAgICAgICAgIGlkOiBcImNsdXN0ZXItY291bnRcIixcblx0XHRcdCAgICAgICAgdHlwZTogXCJzeW1ib2xcIixcblx0XHRcdCAgICAgICAgc291cmNlOiBcInBvbGljaWVzXCIsXG5cdFx0XHQgICAgICAgIGZpbHRlcjogW1wiaGFzXCIsIFwicG9pbnRfY291bnRcIl0sXG5cdFx0XHQgICAgICAgIFwibWluem9vbVwiOiA2LFxuXHRcdFx0ICAgICAgICBsYXlvdXQ6IHtcblx0XHRcdCAgICAgICAgICAgIFwidGV4dC1maWVsZFwiOiBcIntwb2ludF9jb3VudF9hYmJyZXZpYXRlZH1cIixcblx0XHRcdCAgICAgICAgICAgIFwidGV4dC1zaXplXCI6IDEyLFxuXG5cdFx0XHQgICAgICAgIH0sXG5cdFx0XHQgICAgICAgIFwicGFpbnRcIjoge1xuXHRcdFx0ICAgICAgICBcdFwidGV4dC1jb2xvclwiOiBcIiNmZmZmZmZcIlxuXHRcdFx0ICAgICAgICB9XG5cdFx0ICAgICAgICB9XG5cdCAgICAgICAgXSAvLyBlbmQgbGF5ZXJzIGFycmF5XG5cdCAgICApOyAvLyBlbmQgYWRkbGF5ZXJzXG5cdH0gLy8gZW5kIGFkZENsdXN0ZXJlZFxuXHRmdW5jdGlvbiB0b0dlb0pTT04odXJsKXtcblx0XHRcblx0XHRkMy5jc3YodXJsLCBmdW5jdGlvbihlcnIsIGRhdGEpe1xuXHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHR0aHJvdyBlcnI7XG5cdFx0XHR9XG5cdFx0XHQvL2NvbnNvbGUubG9nKGRhdGEpO1xuXHRcdFx0dmFyIGZlYXR1cmVzID0gW107IFxuXHRcdFx0ZGF0YS5mb3JFYWNoKGVhY2ggPT4ge1xuXG5cdFx0XHRcdHZhciB2YWx1ZSA9ICtlYWNoLm1lZF9pbmNvbWUgPyArZWFjaC5tZWRfaW5jb21lIDogbnVsbDtcblx0XHRcdFx0aWYgKCAhbWVkaWFuSW5jb21lcy5oYXMoK2VhY2guY2VuX3RyYWN0KSApe1xuXHRcdFx0XHRcdG1lZGlhbkluY29tZXMuc2V0KCtlYWNoLmNlbl90cmFjdCwgdmFsdWUpOyAvLyBubyBkdXBsaWNhdGUgdHJhY3RzXG5cdFx0XHRcdH1cblx0XHRcdFx0dmFyIGNvZXJjZWQgPSB7fTtcblx0XHRcdFx0Zm9yICggdmFyIGtleSBpbiBlYWNoICkge1xuXHRcdFx0XHRcdGlmICggZWFjaC5oYXNPd25Qcm9wZXJ0eShrZXkpICl7XG5cdFx0XHRcdFx0XHRjb2VyY2VkW2tleV0gPSAhaXNOYU4oK2VhY2hba2V5XSkgPyArZWFjaFtrZXldIDogZWFjaFtrZXldO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSAgXG5cdFx0XHRcdGZlYXR1cmVQcm9wZXJ0aWVzQnlJZC5zZXQoY29lcmNlZC5pZCxjb2VyY2VkKTtcblx0XHRcdFx0ZmVhdHVyZXMucHVzaCh7XG5cdFx0XHRcdFx0XCJ0eXBlXCI6IFwiRmVhdHVyZVwiLFxuXHRcdFx0XHRcdFwicHJvcGVydGllc1wiOiBjb2VyY2VkLFxuXHRcdFx0XHRcdFwiZ2VvbWV0cnlcIjoge1xuXHRcdFx0XHRcdFx0XCJ0eXBlXCI6IFwiUG9pbnRcIixcblx0XHRcdFx0XHRcdFwiY29vcmRpbmF0ZXNcIjogWytlYWNoLmxvbmdpdHVkZSwgK2VhY2gubGF0aXR1ZGVdXG5cdFx0XHRcdFx0fSAgIFxuXHRcdFx0XHR9KTtcblx0XHRcdH0pOyAvLyBlbmQgZm9yRWFjaFxuXHRcdFx0Y29uc29sZS5sb2cobWVkaWFuSW5jb21lcyk7XG5cdFx0XHRjb25zb2xlLmxvZyhmZWF0dXJlUHJvcGVydGllc0J5SWQpO1xuXHRcdFx0Z2VvanNvbiA9ICB7XG5cdFx0XHRcdFwidHlwZVwiOiBcIkZlYXR1cmVDb2xsZWN0aW9uXCIsXG5cdFx0XHRcdFwiZmVhdHVyZXNcIjogZmVhdHVyZXNcblx0XHRcdH07XG5cdFx0XHR0aGVDaGFydHMucHVzaCggLy8gc2hvdWxkIGJlIGFibGUgdG8gY3JlYXRlIGNoYXJ0cyBub3csIHdoZXRoZXIgb3Igbm90IG1hcCBoYXMgbG9hZGVkLiBtYXAgbmVlZHMgdG8gaGF2ZVxuXHRcdFx0XHRcdFx0XHQvLyBsb2FkZWQgZm9yIHRoZW0gdG8gdXBkYXRlLCB0aG91Z2guXG5cdFx0XHRcdG5ldyBCYXJzLkJhcih7IFxuXHRcdFx0XHRcdHRpdGxlOiAnUHJvcGVydGllcyBpbiB2aWV3JywgXG5cdFx0XHRcdFx0bWFyZ2luOiB7XG5cdFx0XHRcdFx0XHR0b3A6MCxcblx0XHRcdFx0XHRcdHJpZ2h0OjEsXG5cdFx0XHRcdFx0XHRib3R0b206MCxcblx0XHRcdFx0XHRcdGxlZnQ6MSBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGhlaWdodFRvV2lkdGg6IDAuMDUsXG5cdFx0XHRcdFx0Y29udGFpbmVyOiAnI2luLXZpZXctYmFyJyxcblx0XHRcdFx0XHRkYXRhOiBnZW9qc29uLmZlYXR1cmVzLFxuXHRcdFx0XHRcdG51bWVyYXRvcihpblZpZXdJRHMpe1xuXHRcdFx0XHRcdFx0cmV0dXJuIGluVmlld0lEcy5zaXplO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0ZGVub21pbmF0b3IoKXtcblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLmRhdGEubGVuZ3RoO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0dGV4dEZ1bmN0aW9uKG4sZCl7XG5cdFx0XHRcdFx0XHRyZXR1cm4gYCR7ZDMuZm9ybWF0KFwiLFwiKShuKX0gb2YgJHtkMy5mb3JtYXQoXCIsXCIpKGQpfSAoJHtkMy5mb3JtYXQoXCIuMCVcIikobiAvIGQpfSlgO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSksXG5cdFx0XHRcdG5ldyBCYXJzLkJhcih7XG5cdFx0XHRcdFx0dGl0bGU6ICcuLi4gd2l0aCBsb3cgZGVkdWN0aWJsZScsIFxuXHRcdFx0XHRcdG1hcmdpbjoge1xuXHRcdFx0XHRcdFx0dG9wOjAsXG5cdFx0XHRcdFx0XHRyaWdodDoxLFxuXHRcdFx0XHRcdFx0Ym90dG9tOjAsXG5cdFx0XHRcdFx0XHRsZWZ0OjEgXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRoZWlnaHRUb1dpZHRoOiAwLjA1LFxuXHRcdFx0XHRcdGluZm9NYXJrOnRydWUsXG5cdFx0XHRcdFx0Y29udGFpbmVyOiAnI2RlZHVjdGlibGUtYmFyJyxcblx0XHRcdFx0XHRkYXRhOiBnZW9qc29uLmZlYXR1cmVzLFxuXHRcdFx0XHRcdG51bWVyYXRvcihpblZpZXdJRHMpe1xuXHRcdFx0XHRcdFx0dmFyIGZpbHRlcmVkRGF0YSA9IHRoaXMuZGF0YS5maWx0ZXIoZWFjaCA9PiBpblZpZXdJRHMuaGFzKGVhY2gucHJvcGVydGllcy5pZCkpLFxuXHRcdFx0XHRcdFx0XHRudW1iZXJNYXRjaGluZyA9IDA7XG5cdFx0XHRcdFx0XHRmaWx0ZXJlZERhdGEuZm9yRWFjaChlYWNoID0+IHtcblx0XHRcdFx0XHRcdFx0aWYgKCBlYWNoLnByb3BlcnRpZXMudF9kZWQgPCA1ICl7XG5cdFx0XHRcdFx0XHRcdFx0bnVtYmVyTWF0Y2hpbmcrKztcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gbnVtYmVyTWF0Y2hpbmc7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRkZW5vbWluYXRvcihpblZpZXdJRHMpeyAvLyBmb3IgdGhpcyBvbmUgZGVub21pbmF0b3IgaXMgbnVtYmVyIG9mIHBvbGljaWVzIGluIHZpZXdcblx0XHRcdFx0XHRcdCByZXR1cm4gaW5WaWV3SURzLnNpemU7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR0ZXh0RnVuY3Rpb24obixkKXtcblx0XHRcdFx0XHRcdHJldHVybiBgJHtkMy5mb3JtYXQoXCIsXCIpKG4pfSBvZiAke2QzLmZvcm1hdChcIixcIikoZCl9ICgke2QzLmZvcm1hdChcIi4wJVwiKShuIC8gZCl9KWA7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KSxcblx0XHRcdFx0bmV3IEJhcnMuQmFyKHtcblx0XHRcdFx0XHR0aXRsZTogJ0F2ZXJhZ2UgcHJlbWl1bScsIFxuXHRcdFx0XHRcdG1hcmdpbjoge1xuXHRcdFx0XHRcdFx0dG9wOjAsXG5cdFx0XHRcdFx0XHRyaWdodDoxLFxuXHRcdFx0XHRcdFx0Ym90dG9tOjAsXG5cdFx0XHRcdFx0XHRsZWZ0OjEgXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR6U2NvcmVzOiBjYWxjdWxhdGVaU2NvcmVzKCdwcmVtJywyMDAwKSxcblx0XHRcdFx0XHRtaW4oKXtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKHRoaXMpO1xuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuelNjb3Jlcy5taW47XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRoZWlnaHRUb1dpZHRoOiAwLjA1LFxuXHRcdFx0XHRcdGNvbnRhaW5lcjogJyNwcmVtaXVtLWJhcicsXG5cdFx0XHRcdFx0ZGF0YTogZ2VvanNvbi5mZWF0dXJlcyxcblx0XHRcdFx0XHRudW1lcmF0b3IoaW5WaWV3SURzKXtcblx0XHRcdFx0XHRcdHZhciBmaWx0ZXJlZERhdGEgPSB0aGlzLmRhdGEuZmlsdGVyKGVhY2ggPT4gaW5WaWV3SURzLmhhcyhlYWNoLnByb3BlcnRpZXMuaWQpKTtcblx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRyZXR1cm4gZDMubWVhbihmaWx0ZXJlZERhdGEsIGQgPT4gZC5wcm9wZXJ0aWVzLnByZW1aKTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGRlbm9taW5hdG9yKCl7IFxuXHRcdFx0XHRcdFx0IHJldHVybiB0aGlzLnpTY29yZXMubWF4O1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0dGV4dEZ1bmN0aW9uKG4peyBcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKHRoaXMuelNjb3Jlcyk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gJyQnICsgZDMuZm9ybWF0KFwiLC4yZlwiKSh0aGlzLnpTY29yZXMubWVhbiArIHRoaXMuelNjb3Jlcy5zZCAqIG4gKSArICcgKHogPSAnICsgZDMuZm9ybWF0KFwiLjJmXCIpKG4pICsgJyknO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSksXG5cdFx0XHRcdFxuXHRcdFx0XHRuZXcgQmFycy5CYXIoe1xuXHRcdFx0XHRcdHRpdGxlOiAnQXZlcmFnZSBob21lIHJlcGxhY2VtZW50IHZhbHVlJywgXG5cdFx0XHRcdFx0bWFyZ2luOiB7XG5cdFx0XHRcdFx0XHR0b3A6MCxcblx0XHRcdFx0XHRcdHJpZ2h0OjEsXG5cdFx0XHRcdFx0XHRib3R0b206MCxcblx0XHRcdFx0XHRcdGxlZnQ6MSBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHpTY29yZXM6IGNhbGN1bGF0ZVpTY29yZXMoJ3ZhbHVlJyw1NTAsMjAwMDAsWzI1MF0pLFxuXHRcdFx0XHRcdG1pbigpe1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy56U2NvcmVzLm1pbjtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGluZm9NYXJrOnRydWUsXG5cdFx0XHRcdFx0aGVpZ2h0VG9XaWR0aDogMC4wNSxcblx0XHRcdFx0XHRjb250YWluZXI6ICcjdmFsdWUtYmFyJyxcblx0XHRcdFx0XHRkYXRhOiBnZW9qc29uLmZlYXR1cmVzLFxuXHRcdFx0XHRcdG51bWVyYXRvcihpblZpZXdJRHMpe1xuXHRcdFx0XHRcdFx0dmFyIGZpbHRlcmVkRGF0YSA9IHRoaXMuZGF0YS5maWx0ZXIoZWFjaCA9PiBpblZpZXdJRHMuaGFzKGVhY2gucHJvcGVydGllcy5pZCkpO1xuXHRcdFx0XHRcdFx0cmV0dXJuIGQzLm1lYW4oZmlsdGVyZWREYXRhLCBkID0+IGQucHJvcGVydGllcy52YWx1ZVopO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0ZGVub21pbmF0b3IoKXsgXG5cdFx0XHRcdFx0XHQgcmV0dXJuIHRoaXMuelNjb3Jlcy5tYXg7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR0ZXh0RnVuY3Rpb24obil7IFxuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2codGhpcy56U2NvcmVzKTtcblx0XHRcdFx0XHRcdHJldHVybiAnJCcgKyBkMy5mb3JtYXQoXCIsLjBmXCIpKCh0aGlzLnpTY29yZXMubWVhbiArIHRoaXMuelNjb3Jlcy5zZCAqIG4gKSAqIDEwMDAgKSArICcgKHogPSAnICsgZDMuZm9ybWF0KFwiLjJmXCIpKG4pICsgJyknO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSksXG5cdFx0XHRcdG5ldyBCYXJzLkJhcih7XG5cdFx0XHRcdFx0dGl0bGU6ICdBdmVyYWdlIGZsb29kIGluc3VyYW5jZSBjb3ZlcmFnZScsIFxuXHRcdFx0XHRcdG1hcmdpbjoge1xuXHRcdFx0XHRcdFx0dG9wOjAsXG5cdFx0XHRcdFx0XHRyaWdodDoxLFxuXHRcdFx0XHRcdFx0Ym90dG9tOjAsXG5cdFx0XHRcdFx0XHRsZWZ0OjEgXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRpbmZvTWFyazp0cnVlLFxuXHRcdFx0XHRcdHpTY29yZXM6IGNhbGN1bGF0ZVpTY29yZXMoJ3Rjb3YnLG51bGwsbnVsbCxbXSksXG5cdFx0XHRcdFx0LyptaW4oKXtcblx0XHRcdFx0XHRcdHJldHVybiBkMy5taW4odGhpcy5kYXRhLCBkID0+IGQucHJvcGVydGllcy50Y292KTtcblx0XHRcdFx0XHR9LCovXG5cdFx0XHRcdFx0bWluKCl7XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLnpTY29yZXMubWluO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aGVpZ2h0VG9XaWR0aDogMC4wNSxcblx0XHRcdFx0XHRjb250YWluZXI6ICcjY292ZXJhZ2UtYmFyJyxcblx0XHRcdFx0XHRkYXRhOiBnZW9qc29uLmZlYXR1cmVzLFxuXHRcdFx0XHRcdG51bWVyYXRvcihpblZpZXdJRHMpe1xuXHRcdFx0XHRcdFx0dGhpcy5maWx0ZXJlZERhdGEgPSB0aGlzLmRhdGEuZmlsdGVyKGVhY2ggPT4gaW5WaWV3SURzLmhhcyhlYWNoLnByb3BlcnRpZXMuaWQpKTtcblx0XHRcdFx0XHRcdHJldHVybiBkMy5tZWFuKHRoaXMuZmlsdGVyZWREYXRhLCBkID0+IGQucHJvcGVydGllcy50Y292Wik7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRkZW5vbWluYXRvcigpeyBcblx0XHRcdFx0XHRcdCByZXR1cm4gdGhpcy56U2NvcmVzLm1heDtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHRleHRGdW5jdGlvbihuKXsgXG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdC8vcmV0dXJuICckJyArIGQzLmZvcm1hdChcIiwuMGZcIikobik7XG5cdFx0XHRcdFx0XHRyZXR1cm4gJyQnICsgZDMuZm9ybWF0KFwiLC4wZlwiKSgodGhpcy56U2NvcmVzLm1lYW4gKyB0aGlzLnpTY29yZXMuc2QgKiBuICkgKiAxMDAwICkgKyAnICh6ID0gJyArIGQzLmZvcm1hdChcIi4yZlwiKShuKSArICcpJztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pLFxuXHRcdFx0XHRuZXcgQmFycy5CYXIoe1xuXHRcdFx0XHRcdHRpdGxlOiAnQXZlcmFnZSBtZWRpYW4gaG91c2Vob2xkIGluY29tZScsIFxuXHRcdFx0XHRcdG1hcmdpbjoge1xuXHRcdFx0XHRcdFx0dG9wOjAsXG5cdFx0XHRcdFx0XHRyaWdodDoxLFxuXHRcdFx0XHRcdFx0Ym90dG9tOjAsXG5cdFx0XHRcdFx0XHRsZWZ0OjEgXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRpbmZvTWFyazp0cnVlLFxuXHRcdFx0XHRcdHpTY29yZXM6IChmdW5jdGlvbigpe1xuXHRcdFx0XHRcdFx0dmFyIG1lYW4gPSBkMy5tZWFuKFsuLi5tZWRpYW5JbmNvbWVzLnZhbHVlcygpXSk7XG5cdFx0XHRcdFx0XHR2YXIgc2QgPSBkMy5kZXZpYXRpb24oWy4uLm1lZGlhbkluY29tZXMudmFsdWVzKCldKTtcblx0XHRcdFx0XHRcdHZhciBtaW4sXG5cdFx0XHRcdFx0XHRcdG1heCxcblx0XHRcdFx0XHRcdFx0Y3V0b2ZmWiA9ICggMTUwMDAwIC0gbWVhbiApIC8gc2Q7XG5cdFx0XHRcdFx0XHRnZW9qc29uLmZlYXR1cmVzLmZvckVhY2goZWFjaCA9PiB7XG5cdFx0XHRcdFx0XHRcdC8vIHNvbWUgbWVkX2luY29tZXMgYXJlIHJlY29yZGVkIGFzIHplcm87IHRoZXkgc2hvdWxkIGJlIGlnbm9yZWRcblx0XHRcdFx0XHRcdFx0aWYgKCBlYWNoLnByb3BlcnRpZXMubWVkX2luY29tZSA+IDAgKXtcblx0XHRcdFx0XHRcdFx0XHRlYWNoLnByb3BlcnRpZXMubWVkX2luY29tZVogPSAoIGVhY2gucHJvcGVydGllcy5tZWRfaW5jb21lIC0gbWVhbiApIC8gc2Q7XG5cdFx0XHRcdFx0XHRcdFx0bWluID0gZWFjaC5wcm9wZXJ0aWVzLm1lZF9pbmNvbWVaIDwgbWluIHx8IG1pbiA9PT0gdW5kZWZpbmVkID8gZWFjaC5wcm9wZXJ0aWVzLm1lZF9pbmNvbWVaIDogbWluO1xuXHRcdFx0XHRcdFx0XHRcdG1heCA9IGVhY2gucHJvcGVydGllcy5tZWRfaW5jb21lWiA+IG1heCB8fCBtYXggPT09IHVuZGVmaW5lZCA/IGVhY2gucHJvcGVydGllcy5tZWRfaW5jb21lWiA6IG1heDtcblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRlYWNoLnByb3BlcnRpZXMubWVkX2luY29tZVogPSBudWxsO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdG1heCA9IG1heCA8IGN1dG9mZlogPyBtYXggOiBjdXRvZmZaO1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coe1xuXHRcdFx0XHRcdFx0XHRtaW4sXG5cdFx0XHRcdFx0XHRcdG1heCxcblx0XHRcdFx0XHRcdFx0bWVhbixcblx0XHRcdFx0XHRcdFx0c2Rcblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0cmV0dXJuIHtcblx0XHRcdFx0XHRcdFx0bWluOiAtMi4zMyxcblx0XHRcdFx0XHRcdFx0bWF4OiAyLjMzLFxuXHRcdFx0XHRcdFx0XHRtZWFuLFxuXHRcdFx0XHRcdFx0XHRzZFxuXHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHR9KSgpLFxuXHRcdFx0XHRcdG1pbigpe1xuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuelNjb3Jlcy5taW47XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRoZWlnaHRUb1dpZHRoOiAwLjA1LFxuXHRcdFx0XHRcdGNvbnRhaW5lcjogJyNpbmNvbWUtYmFyJyxcblx0XHRcdFx0XHRkYXRhOiBnZW9qc29uLmZlYXR1cmVzLFxuXHRcdFx0XHRcdG51bWVyYXRvcihpblZpZXdJRHMpe1xuXHRcdFx0XHRcdFx0dmFyIHJlcHJlc2VudGVkVHJhY3RzID0gbmV3IFNldCgpO1xuXHRcdFx0XHRcdFx0dmFyIG1lZEluY29tZVpBcnJheSA9IFtdO1xuXHRcdFx0XHRcdFx0aW5WaWV3SURzLmZvckVhY2goaWQgPT4ge1xuXHRcdFx0XHRcdFx0XHR2YXIgbWF0Y2hpbmdGZWF0dXJlID0gZmVhdHVyZVByb3BlcnRpZXNCeUlkLmdldChpZCk7XG5cdFx0XHRcdFx0XHRcdGlmICggIXJlcHJlc2VudGVkVHJhY3RzLmhhcyhtYXRjaGluZ0ZlYXR1cmUuY2VuX3RyYWN0KSApe1xuXHRcdFx0XHRcdFx0XHRcdHJlcHJlc2VudGVkVHJhY3RzLmFkZChtYXRjaGluZ0ZlYXR1cmUuY2VuX3RyYWN0KTtcblx0XHRcdFx0XHRcdFx0XHRtZWRJbmNvbWVaQXJyYXkucHVzaChtYXRjaGluZ0ZlYXR1cmUubWVkX2luY29tZVopOyAvLyBwdXNoZXMgaW5jb21lIGZyb20gb25seSBvbmUgcmVwcmVzZW50YXRpdmVcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQgIC8vXG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2coJ21lZEluY29tZVpBcnJheScsbWVkSW5jb21lWkFycmF5KTtcblx0XHRcdFx0XHRcdHJldHVybiBkMy5tZWFuKG1lZEluY29tZVpBcnJheSk7XG5cblx0XHRcdFx0XHRcdC8vdGhpcy5tZWRpYW5JbmNvbWVzSW5WaWV3ID0gY2FsY3VsYXRlTWVkaWFuSW5jb21lcyhpblZpZXdJRHMpO1xuXHRcdFx0XHRcdFx0Ly9yZXR1cm4gZDMubWVhbih0aGlzLm1lZGlhbkluY29tZXNJblZpZXcpO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0ZGVub21pbmF0b3IoKXsgXG5cdFx0XHRcdFx0XHQgcmV0dXJuIHRoaXMuelNjb3Jlcy5tYXg7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR0ZXh0RnVuY3Rpb24obil7IFxuXHRcdFx0XHRcdFx0cmV0dXJuICckJyArIGQzLmZvcm1hdChcIiwuMGZcIikodGhpcy56U2NvcmVzLm1lYW4gKyB0aGlzLnpTY29yZXMuc2QgKiBuICkgKyAnICh6ID0gJyArIGQzLmZvcm1hdChcIi4yZlwiKShuKSArICcpJztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pLFxuXHRcdFx0XHRuZXcgQmFycy5CYXIoe1xuXHRcdFx0XHRcdHRpdGxlOiAnQXZlcmFnZSBtYXJnaW5hbCBjb3N0IGZvciBsb3dlciBkZWR1Y3RpYmxlJywgXG5cdFx0XHRcdFx0bWFyZ2luOiB7XG5cdFx0XHRcdFx0XHR0b3A6MCxcblx0XHRcdFx0XHRcdHJpZ2h0OjEsXG5cdFx0XHRcdFx0XHRib3R0b206MCxcblx0XHRcdFx0XHRcdGxlZnQ6MSBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHpTY29yZXM6IGNhbGN1bGF0ZVpTY29yZXMoJ2RkcCcsbnVsbCxudWxsLFtdKSxcblx0XHRcdFx0XHQvKm1pbigpe1xuXHRcdFx0XHRcdFx0cmV0dXJuIGQzLm1pbih0aGlzLmRhdGEsIGQgPT4gZC5wcm9wZXJ0aWVzLnRjb3YpO1xuXHRcdFx0XHRcdH0sKi9cblx0XHRcdFx0XHRtaW4oKXtcblx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuelNjb3Jlcy5taW47XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRoZWlnaHRUb1dpZHRoOiAwLjA1LFxuXHRcdFx0XHRcdGNvbnRhaW5lcjogJyNtYXJnaW5hbC1iYXInLFxuXHRcdFx0XHRcdGRhdGE6IGdlb2pzb24uZmVhdHVyZXMsXG5cdFx0XHRcdFx0bnVtZXJhdG9yKGluVmlld0lEcyl7XG5cdFx0XHRcdFx0XHR0aGlzLmZpbHRlcmVkRGF0YSA9IHRoaXMuZGF0YS5maWx0ZXIoZWFjaCA9PiBpblZpZXdJRHMuaGFzKGVhY2gucHJvcGVydGllcy5pZCkpO1xuXHRcdFx0XHRcdFx0cmV0dXJuIGQzLm1lYW4odGhpcy5maWx0ZXJlZERhdGEsIGQgPT4gZC5wcm9wZXJ0aWVzLmRkcFopO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0ZGVub21pbmF0b3IoKXsgXG5cdFx0XHRcdFx0XHQgcmV0dXJuIHRoaXMuelNjb3Jlcy5tYXg7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR0ZXh0RnVuY3Rpb24obil7IFxuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHQvL3JldHVybiAnJCcgKyBkMy5mb3JtYXQoXCIsLjBmXCIpKG4pO1xuXHRcdFx0XHRcdFx0cmV0dXJuICckJyArIGQzLmZvcm1hdChcIiwuMGZcIikoKHRoaXMuelNjb3Jlcy5tZWFuICsgdGhpcy56U2NvcmVzLnNkICogbiApICkgKyAnICh6ID0gJyArIGQzLmZvcm1hdChcIi4yZlwiKShuKSArICcpJztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pXG5cblx0XHRcdCk7IC8vIGVuZCBwdXNoXG5cdFx0XHRnYXRlQ2hlY2srKztcblx0XHRcdHZhciBpbmZvcm1hdGlvbiA9IHtcblx0XHRcdFx0bWFwZmVhdHVyZTogJ1RoaXMgbWFwIHJlcHJlc2VudHMgbmV3IGZsb29kIGluc3VyYW5jZSBwb2xpY2llcyBpbml0aWF0ZWQgYmV0d2VlbiBKdW5lIGFuZCBEZWNlbWJlciAyMDE0LiBUaGUgYW5hbHlzaXMgaW4gdGhlIHJlbGF0ZWQgcGFwZXIgcmV2b2x2ZXMgYXJvdW5kIHRoZSBkZWNpc2lvbiB3aGV0aGVyIHRvIHBheSBtb3JlIGZvciBhIGxvd2VyIGRlZHVjdGlibGUuJyxcblx0XHRcdFx0ZGVkdWN0aWJsZWJhcjogJ1RoZSBzdGFuZGFyZCBkZWR1Y3RpYmxlIGlzICQ1LDAwMDsgYW55dGhpbmcgbGVzcyBpcyBjb25zaWRlciBhIGxvdyBkZWR1Y3RpYmxlLicsXG5cdFx0XHRcdHZhbHVlYmFyOiAnVGhpcyBjYWxjdWxhdGlvbiBpZ25vcmVzIGV4dHJlbWUgb3V0bGllcnMgKHZhbHVlcyBhYm92ZSAkMjBNKSB3aGljaCBhcmUgbGlrZWx5IGR1ZSB0byBkYXRhIGVycm9yczsgaXQgYWxzbyBpZ25vcmVzIG92ZXJyZXByZXNlbnRlZCB2YWx1ZXMgb2YgJDI1MCwwMDAsIHRoZSBtYWpvcml0eSBvZiB3aGljaCBhcmUgbGlrZWx5IGR1ZSB0byByZXBvcnRpbmcgZXJyb3JzLicsXG5cdFx0XHRcdGluY29tZWJhcjogJ01lZGlhbiBob3VzZWhvbGQgaW5jb21lIGlzIGEgcHJvcGVydHkgb2YgdGhlIGNlbnN1cyB0cmFjdCBpbiB3aGljaCB0aGUgcG9saWN5aG9sZGVyIHJlc2lkZXMuIEVhY2ggY2Vuc3VzIHRyYWN0IHdpdGggYW4gYXNzb2NpYXRlZCBwb2xpY3kgaW4gdmlldyBpcyBjb3VudGVkIG9uY2UuJyxcblx0XHRcdFx0Y292ZXJhZ2ViYXI6ICdGbG9vZCBjb3ZlcmFnZSBpcyBsaW1pdGVkIHRvICQyNTAsMDAwLidcblx0XHRcdH07XG5cdFx0XHR2YXIgaW5mb01hcmtzID0gZDMuc2VsZWN0QWxsKCcuaGFzLWluZm8tbWFyaycpXG5cdFx0XHRcdC5hcHBlbmQoJ3N2ZycpXG5cdFx0XHRcdC5kYXR1bShpbmZvcm1hdGlvbilcblx0XHRcdFx0LmF0dHIoJ3dpZHRoJywnMTJweCcpXG5cdFx0XHRcdC5hdHRyKCd2aWV3Qm94JywgJzAgMCAxMiAxMicpXG5cdFx0XHRcdC5hdHRyKCdjbGFzcycsJ2luZm8tbWFyaycpO1xuXHRcdFx0XHRcblxuXHRcdFx0aW5mb01hcmtzXG5cdFx0XHRcdC5hcHBlbmQoJ2NpcmNsZScpXG5cdFx0XHRcdC5hdHRyKCdjbGFzcycsICdpbmZvLW1hcmstYmFja2dyb3VuZCcpIFxuXHRcdFx0XHQuYXR0cignY3gnLDYpXG5cdFx0XHRcdC5hdHRyKCdjeScsNilcblx0XHRcdFx0LmF0dHIoJ3InLDYpXG5cdFx0XHRcdC5jYWxsKHRpcClcblx0XHRcdFx0Lm9uKCdtb3VzZWVudGVyJywgZnVuY3Rpb24oZCl7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coZDMuZXZlbnQpO1xuXHRcdFx0XHRcdHRpcC5zaG93LmNhbGwodGhpcyxkKTtcblx0XHRcdFx0fSlcblx0XHRcdFx0Lm9uKCdtb3VzZWxlYXZlJywgdGlwLmhpZGUpOyAgXG5cblx0XHRcdGluZm9NYXJrc1xuXHRcdFx0XHQuYXBwZW5kKCdwYXRoJylcblx0XHRcdFx0LmF0dHIoJ2NsYXNzJywnaW5mby1tYXJrLWZvcmVncm91bmQnKVxuXHRcdFx0XHQuYXR0cignZCcsIGBNNS4yMzEsNy42MTRWNi45MTVjMC0wLjM2NCwwLjA4NC0wLjcwMiwwLjI1NC0xLjAxNmMwLjE2OS0wLjMxMywwLjM1NS0wLjYxMywwLjU1OS0wLjkwMlxuXHRcdFx0XHRcdFx0XHRjMC4yMDMtMC4yODcsMC4zOS0wLjU2NCwwLjU1OS0wLjgzMUM2Ljc3MiwzLjksNi44NTcsMy42MzEsNi44NTcsMy4zNmMwLTAuMTk1LTAuMDgxLTAuMzU3LTAuMjQyLTAuNDg5XG5cdFx0XHRcdFx0XHRcdEM2LjQ1NSwyLjc0LDYuMjY4LDIuNjc0LDYuMDU3LDIuNjc0Yy0wLjE1MywwLTAuMjg4LDAuMDM0LTAuNDA3LDAuMTAyYy0wLjExOCwwLjA2OC0wLjIyMiwwLjE1NS0wLjMxMSwwLjI2XG5cdFx0XHRcdFx0XHRcdEM1LjI1LDMuMTQyLDUuMTc3LDMuMjYxLDUuMTE3LDMuMzkyYy0wLjA2LDAuMTMxLTAuMDk3LDAuMjY0LTAuMTE0LDAuNGwtMS40Ni0wLjQwN0MzLjcwNCwyLjc1LDQuMDA4LDIuMjYxLDQuNDU3LDEuOTE5XG5cdFx0XHRcdFx0XHRcdGMwLjQ0OC0wLjM0MywxLjAxNi0wLjUxNSwxLjcwMS0wLjUxNWMwLjMxMywwLDAuNjA3LDAuMDQ0LDAuODgyLDAuMTMzQzcuMzE2LDEuNjI2LDcuNTYsMS43NTYsNy43NzEsMS45MjVcblx0XHRcdFx0XHRcdFx0QzcuOTgyLDIuMDk1LDguMTUsMi4zMDYsOC4yNzIsMi41NmMwLjEyMywwLjI1NCwwLjE4NSwwLjU0NiwwLjE4NSwwLjg3NmMwLDAuNDIzLTAuMDk2LDAuNzg1LTAuMjg2LDEuMDg1XG5cdFx0XHRcdFx0XHRcdGMtMC4xOTEsMC4zMDEtMC40LDAuNTg2LTAuNjI5LDAuODU3QzcuMzE0LDUuNjUsNy4xMDQsNS45MjMsNi45MTQsNi4xOThTNi42MjgsNi43ODksNi42MjgsNy4xNDR2MC40N0g1LjIzMXogTTUuMDc5LDEwLjY5OVY4Ljg5NlxuXHRcdFx0XHRcdFx0XHRoMS43NTJ2MS44MDNINS4wNzl6YFxuXHRcdFx0XHQpO1xuXG5cdFx0XHQvKmQzLnNlbGVjdEFsbCgnLmZpZ3VyZS10aXRsZS5oYXMtaW5mby1tYXJrJylcblx0XHRcdFx0LmFwcGVuZCgnYScpXG5cdFx0XHRcdC5hdHRyKCd0aXRsZScsIGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0cmV0dXJuIGluZm9ybWF0aW9uW2QzLnNlbGVjdCh0aGlzLnBhcmVudE5vZGUucGFyZW50Tm9kZSkuYXR0cignaWQnKS5yZXBsYWNlKCctJywnJyldO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQuYXR0cignaHJlZicsJyMnKVxuXHRcdFx0XHQuYXR0cignY2xhc3MnLCdpbmZvLW1hcmsgc21hbGwnKVxuXHRcdFx0XHQudGV4dCgnPycpO1xuXHRcdFx0ZDMuc2VsZWN0QWxsKCcuaW5mby1tYXJrJylcblx0XHRcdFx0Lm9uKCdjbGljaycsKCkgPT4ge1xuXHRcdFx0XHRcdGQzLmV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdH0pOyovXG5cblx0XHRcdGdhdGUoKTtcblx0XHRcdC8vYWRkQ2x1c3RlckxheWVycyhydG4pO1xuXHRcdFx0XG5cdFx0fSk7IC8vIGVuZCBkMyBjc3Zcblx0fSAvLyBlbmQgdG9HZW9KU09OXG5cdC8qdmFyIGZlYXR1cmVzSW5WaWV3ID0ge1xuXHRcdHJlbmRlcigpe1xuXHRcdFx0dGhpcy5jaGFydCA9IG5ldyBCYXJzLkJhcih7XG5cdFx0XHRcdG1hcmdpbjoge1xuXHRcdFx0XHRcdHRvcDowLFxuXHRcdFx0XHRcdHJpZ2h0OjAsXG5cdFx0XHRcdFx0Ym90dG9tOjAsXG5cdFx0XHRcdFx0bGVmdDowXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGhlaWdodFRvV2lkdGg6IDAuMDMsXG5cdFx0XHRcdGNvbnRhaW5lcjogJyN0b3RhbC12aWV3Jyxcblx0XHRcdFx0dG90YWw6IGdlb2pzb24uZmVhdHVyZXMubGVuZ3RoXG5cdFx0XHR9KTtcblxuXHRcdFx0Lyp0aGlzLnRvdGFsID0gZ2VvanNvbi5mZWF0dXJlcy5sZW5ndGg7XG5cdFx0XHR0aGlzLnN2ZyA9IGQzLnNlbGVjdCgnI3RvdGFsLXZpZXcnKVxuXHRcdFx0XHQuYXBwZW5kKCdzdmcnKVxuXHRcdFx0XHQuYXR0cignd2lkdGgnLCAnMTAwJScpXG5cdCAgICAgICAgICAgIC5hdHRyKCd4bWxucycsJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3ZlcnNpb24nLCcxLjEnKSBcblx0ICAgICAgICAgICAgLmF0dHIoJ3ZpZXdCb3gnLCAnMCAwIDEwMCAzJyk7XG5cblx0ICAgICAgICB0aGlzLmJhY2tncm91bmQgPSB0aGlzLnN2Zy5hcHBlbmQoJ2xpbmUnKVxuXHQgICAgICAgIFx0LmNsYXNzZWQoJ2JhY2tncm91bmQtbGluZScsIHRydWUpXG5cdCAgICAgICAgXHQuYXR0cigneDAnLDApXG5cdCAgICAgICAgXHQuYXR0cigneTAnLDApXG5cdCAgICAgICAgXHQuYXR0cigneDEnLDEwMClcblx0ICAgICAgICBcdC5hdHRyKCd5MScsMCk7XG5cblx0ICAgICAgICB0aGlzLmxpbmUgPSB0aGlzLnN2Zy5hcHBlbmQoJ2xpbmUnKVxuXHQgICAgICAgIFx0LmNsYXNzZWQoJ3RvdGFsLWxpbmUnLCB0cnVlKVxuXHQgICAgICAgIFx0LmF0dHIoJ3gwJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kwJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3gxJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kxJywwKTtcblxuXHQgICAgICAgIHRoaXMudGV4dCA9IGQzLnNlbGVjdCgnI3RvdGFsLXZpZXcnKVxuXHQgICAgICAgIFx0LmFwcGVuZCgnc3BhbicpXG5cdCAgICAgICAgXHQudGV4dCgoKSA9PiBgJHtkMy5mb3JtYXQoXCIsXCIpKHRoaXMudG90YWwpfSBvZiAke2QzLmZvcm1hdChcIixcIikodGhpcy50b3RhbCl9IGluIHZpZXdgICk7XG5cdCAgICAgICAgXHRcblxuXHRcdFx0dGhpcy51cGRhdGUoY291bnRGZWF0dXJlcygpKTtcblx0XHR9LFxuXHRcdHVwZGF0ZShuKXtcblx0XHRcdC8qZDMuc2VsZWN0KCcjdG90YWwtaW4tdmlldycpXG5cdFx0XHRcdC50ZXh0KCgpID0+IGQzLmZvcm1hdChcIixcIikobikgKyAnIG9mICcgKyBkMy5mb3JtYXQoXCIsXCIpKHRoaXMudG90YWwpICsgJyBwcm9wZXJ0aWVzIGluIHZpZXcnKTsqL1xuXHRcdFx0Lyp0aGlzLmxpbmVcblx0XHRcdFx0LnRyYW5zaXRpb24oKS5kdXJhdGlvbigyMDApXG5cdFx0XHRcdC5hdHRyKCd4MScsICgpID0+ICggbiAvIHRoaXMudG90YWwpICogMTAwICk7XG5cdFx0XHR0aGlzLnRleHRcblx0XHRcdFx0LnRleHQoKCkgPT4gYCR7ZDMuZm9ybWF0KFwiLFwiKShuKX0gb2YgJHtkMy5mb3JtYXQoXCIsXCIpKHRoaXMudG90YWwpfSBpbiB2aWV3YCApO1xuICBcblx0XHR9Ki8gXG5cblx0XG5cdHZhciBpblZpZXdJRHMgPSBuZXcgU2V0KCk7XG5cdGZ1bmN0aW9uIGNvdW50RmVhdHVyZXMoKXsgXG5cdFx0LyoganNoaW50IGxheGJyZWFrOnRydWUgKi9cblx0XHRpblZpZXdJRHMuY2xlYXIoKTsgXG5cdFx0Ly92YXIgY291bnQgPSAwO1xuXHRcdHZhciBib3VuZHMgPSB0aGVNYXAuZ2V0Qm91bmRzKCk7XG5cdFx0Z2VvanNvbi5mZWF0dXJlcy5mb3JFYWNoKGVhY2ggPT4ge1xuXHRcdFx0aWYgKCAgICBlYWNoLnByb3BlcnRpZXMubG9uZ2l0dWRlID49IGJvdW5kcy5fc3cubG5nIFxuXHRcdFx0XHQgJiYgZWFjaC5wcm9wZXJ0aWVzLmxvbmdpdHVkZSA8PSBib3VuZHMuX25lLmxuZyBcblx0XHRcdFx0ICYmIGVhY2gucHJvcGVydGllcy5sYXRpdHVkZSAgPj0gYm91bmRzLl9zdy5sYXQgXG5cdFx0XHRcdCAmJiBlYWNoLnByb3BlcnRpZXMubGF0aXR1ZGUgIDw9IGJvdW5kcy5fbmUubGF0ICl7XG5cdFx0XHRcdGluVmlld0lEcy5hZGQoZWFjaC5wcm9wZXJ0aWVzLmlkKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRjb25zb2xlLmxvZyhpblZpZXdJRHMpO1xuXHR9XG5cdHRoZU1hcC5vbignbW92ZWVuZCcsIGZ1bmN0aW9uKCl7XG5cdFx0dXBkYXRlQWxsKCk7XG5cdH0pO1xuXHR0aGVNYXAub24oJ3pvb21lbmQnLCBmdW5jdGlvbihhcmcpe1xuXHRcdGNvbnNvbGUubG9nKGFyZyk7XG5cdFx0dXBkYXRlQWxsKCk7XG5cdFx0ZDMuc2VsZWN0KCcjc2l6ZS1sZWdlbmQnKVxuXHRcdFx0LmNsYXNzZWQoJ3Nob3cnLCB0aGVNYXAuZ2V0Wm9vbSgpID49IHNpemVab29tVGhyZXNob2xkKTtcblx0fSk7XG5cdGZ1bmN0aW9uIHVwZGF0ZUFsbCgpe1xuXHRcdGNvdW50RmVhdHVyZXMoKTtcblx0XHR0aGVDaGFydHMuZm9yRWFjaChlYWNoID0+IGVhY2gudXBkYXRlKGluVmlld0lEcykpO1xuXHR9XG5cdHRoZU1hcC5vbihcIm1vdXNlbW92ZVwiLCBcInBvaW50cy1kYXRhLWRyaXZlblwiLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGUpO1xuICAgIH0pO1xuXG5cdHJldHVybiB0aGVNYXA7XG4gICBcbn0oKSk7IC8vIGVuZCBJSUZFICIsImV4cG9ydCBjb25zdCBCYXJzID0gKGZ1bmN0aW9uKCl7XG5cblx0dmFyIEJhciA9IGZ1bmN0aW9uKGNvbmZpZ09iamVjdCl7IC8vIG1hcmdpbnMge30sIGhlaWdodCAjLCB3aWR0aCAjLCBjb250YWluZXJJRCwgZGF0YVBhdGhcblx0ICAgIHRoaXMuc2V0dXAoY29uZmlnT2JqZWN0KTtcblx0fTtcblxuXHRCYXIucHJvdG90eXBlID0ge1xuXHRcdHNldHVwKGNvbmZpZ09iamVjdCl7IC8vIHNvbWUgb2Ygc2V0dXAgaXMgY29tbW9uIHRvIGFsbCBjaGFydHMgYW5kIGNvdWxkIGJlIGhhbmRsZWQgYnkgcHJvdG90eXBpY2FsIGluaGVyaXRhbmNlXG5cdCAgICBcdGNvbnNvbGUubG9nKGNvbmZpZ09iamVjdCk7XG5cdCAgICAgICAgdmFyIHZpZXdCb3ggPSAnMCAwIDEwMCAnICsgTWF0aC5yb3VuZChjb25maWdPYmplY3QuaGVpZ2h0VG9XaWR0aCAqIDEwMCk7XG5cdCAgICAgICAgdGhpcy5jb250YWluZXIgPSBjb25maWdPYmplY3QuY29udGFpbmVyO1xuXHQgICAgICAgIHRoaXMubWFyZ2luID0gY29uZmlnT2JqZWN0Lm1hcmdpbjtcblx0ICAgICAgICB0aGlzLndpZHRoID0gMTAwIC0gdGhpcy5tYXJnaW4ubGVmdCAtIHRoaXMubWFyZ2luLnJpZ2h0O1xuXHQgICAgICAgIHRoaXMuaGVpZ2h0ID0gY29uZmlnT2JqZWN0LmhlaWdodFRvV2lkdGggKiAxMDAgLSB0aGlzLm1hcmdpbi50b3AgLSB0aGlzLm1hcmdpbi5ib3R0b207XG5cdCAgICAgICAgdGhpcy50aXRsZSA9IGNvbmZpZ09iamVjdC50aXRsZTtcblx0ICAgICAgICB0aGlzLmluZm9NYXJrID0gY29uZmlnT2JqZWN0LmluZm9NYXJrIHx8IGZhbHNlO1xuXHQgICAgICAgIHRoaXMuY29tcGFyYXRvciA9IGNvbmZpZ09iamVjdC5jb21wYXJhdG9yO1xuXHQgICAgICAgIHRoaXMudHJ1bmNhdGVSaWdodCA9IGNvbmZpZ09iamVjdC50cnVuY2F0ZVJpZ2h0IHx8IGZhbHNlO1xuXHQgICAgICAgIHRoaXMuYmFja2dyb3VuZENvbG9yID0gY29uZmlnT2JqZWN0LmJhY2tncm91bmRDb2xvciB8fCAnZ3JheSc7XG5cdCAgICAgICAgdGhpcy5kYXRhID0gY29uZmlnT2JqZWN0LmRhdGE7XG5cdCAgICAgICAgdGhpcy5udW1lcmF0b3IgPSBjb25maWdPYmplY3QubnVtZXJhdG9yO1xuXHQgICAgICAgIHRoaXMuZGVub21pbmF0b3IgPSBjb25maWdPYmplY3QuZGVub21pbmF0b3I7XG5cdCAgICAgICAgdGhpcy50ZXh0RnVuY3Rpb24gPSBjb25maWdPYmplY3QudGV4dEZ1bmN0aW9uO1xuXHQgICAgICAgIHRoaXMuelNjb3JlcyA9IGNvbmZpZ09iamVjdC56U2NvcmVzIHx8IG51bGw7XG5cdCAgICAgICAgdGhpcy5taW4gPSBjb25maWdPYmplY3QubWluID8gY29uZmlnT2JqZWN0Lm1pbi5jYWxsKHRoaXMpIDogMDtcblx0ICAgICAgICAvL3RoaXMubWF4ID0gY29uZmlnT2JqZWN0Lm1heCA/IGNvbmZpZ09iamVjdC5tYXguY2FsbCh0aGlzKSA6IDEwMDtcblx0ICAgICAgICAvL3RoaXMuc2NhbGUgPSBkMy5zY2FsZUxpbmVhcigpLmRvbWFpbihbdGhpcy5taW4sdGhpcy5tYXhdKS5yYW5nZShbMCx0aGlzLndpZHRoXSk7XG5cdCAgICAgICAgXG5cblx0ICAgICAgICBkMy5zZWxlY3QodGhpcy5jb250YWluZXIpXG5cdCAgICAgICAgXHQuYXBwZW5kKCdzcGFuJylcblx0ICAgICAgICBcdC5jbGFzc2VkKCdmaWd1cmUtdGl0bGUnLCB0cnVlKVxuXHQgICAgICAgIFx0LmNsYXNzZWQoJ2hhcy1pbmZvLW1hcmsnLCAoKSA9PiB0aGlzLmluZm9NYXJrKVxuXHQgICAgICAgIFx0LnRleHQodGhpcy50aXRsZSk7XG5cblx0ICAgICAgICB0aGlzLnN2ZyA9IGQzLnNlbGVjdCh0aGlzLmNvbnRhaW5lcilcblx0ICAgICAgICAgICAgLmFwcGVuZCgnc3ZnJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3dpZHRoJywgJzEwMCUnKVxuXHQgICAgICAgICAgICAuYXR0cigneG1sbnMnLCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycpXG5cdCAgICAgICAgICAgIC5hdHRyKCd2ZXJzaW9uJywnMS4xJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3ZpZXdCb3gnLCB2aWV3Qm94KVxuXHQgICAgICAgICAgICAuYXBwZW5kKCdnJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIHRoaXMubWFyZ2luLmxlZnQgKyAnLCcgKyB0aGlzLm1hcmdpbi50b3AgKyAnKScpO1xuXG5cdCAgICAgICAgdGhpcy5iYWNrZ3JvdW5kID0gdGhpcy5zdmcuYXBwZW5kKCdsaW5lJylcblx0ICAgICAgICBcdC5jbGFzc2VkKCdiYWNrZ3JvdW5kLWxpbmUtJyArIHRoaXMuYmFja2dyb3VuZENvbG9yLCB0cnVlKVxuXHQgICAgICAgIFx0LmF0dHIoJ3gwJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kwJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3gxJyx0aGlzLndpZHRoKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kxJywwKTtcblxuXHQgICAgICAgIHRoaXMubGluZSA9IHRoaXMuc3ZnLmFwcGVuZCgnbGluZScpXG5cdCAgICAgICAgXHQuY2xhc3NlZCgnZm9yZWdyb3VuZC1saW5lJywgdHJ1ZSlcblx0ICAgICAgICBcdC5hdHRyKCd4MCcsMClcblx0ICAgICAgICBcdC5hdHRyKCd5MCcsMClcblx0ICAgICAgICBcdC5hdHRyKCd4MScsMClcblx0ICAgICAgICBcdC5hdHRyKCd5MScsMCk7XG5cblx0ICAgICAgICB0aGlzLnRleHQgPSBkMy5zZWxlY3QodGhpcy5jb250YWluZXIpXG5cdCAgICAgICAgXHQuYXBwZW5kKCdzcGFuJylcblx0ICAgICAgICBcdC5hdHRyKCdjbGFzcycsJ3ZhbHVlJyk7XG5cdCAgICAgICAgXHRcblxuXHQgICAgICAgIC8vdGhpcy51cGRhdGUodGhpcy5udW1lcmF0b3IoKSk7ICBcbiAgICAgICAgfSxcbiAgICAgICAgdXBkYXRlKGluVmlld0lEcyl7XG4gICAgICAgIFx0Y29uc29sZS5sb2codGhpcyk7XG5cdFx0XHR2YXIgbiA9IHRoaXMubnVtZXJhdG9yKGluVmlld0lEcyksXG5cdFx0XHRcdGQgPSB0aGlzLmRlbm9taW5hdG9yKGluVmlld0lEcyk7IFxuXHRcdFx0ZDMuc2VsZWN0KHRoaXMuY29udGFpbmVyKVxuXHRcdFx0XHQuY2xhc3NlZCgnb3ZlcmZsb3cnLCBuID4gZCApO1xuXG4gICAgICAgIFx0aWYgKHRoaXMudHJ1bmNhdGVSaWdodCl7XG4gICAgICAgIFx0XHRkID0gdGhpcy5taW4gPSAwIC0gZDtcbiAgICAgICAgXHR9IGVsc2UgaWYgKCB0aGlzLm1pbiA8IDAgJiYgZCA+IDAgKSB7XG4gICAgICAgIFx0XHRpZiAoTWF0aC5hYnModGhpcy5taW4pIDwgZCkge1xuICAgICAgICBcdFx0XHR0aGlzLm1pbiA9IDAgLSBkO1xuICAgICAgICBcdFx0fSBlbHNlIHtcbiAgICAgICAgXHRcdFx0ZCA9IDAgLSB0aGlzLm1pbjtcbiAgICAgICAgXHRcdH1cbiAgICAgICAgXHR9XG4gICAgICAgIFx0Y29uc29sZS5sb2coJ21pbjogJyArIHRoaXMubWluICsgJzsgbWF4OiAnICsgZCk7XG5cdFx0XHR0aGlzLnNjYWxlID0gZDMuc2NhbGVMaW5lYXIoKS5kb21haW4oW3RoaXMubWluLGRdKS5yYW5nZShbMCx0aGlzLndpZHRoXSkuY2xhbXAodHJ1ZSk7XG5cdFx0XHR0aGlzLmxpbmVcblx0XHRcdFx0LnRyYW5zaXRpb24oKS5kdXJhdGlvbigyMDApXG5cdFx0XHRcdC5hdHRyKCd4MScsICgpID0+IHRoaXMuc2NhbGUobikpO1xuXHRcdFx0dGhpcy50ZXh0XG5cdFx0XHRcdC50ZXh0KCgpID0+IHRoaXMudGV4dEZ1bmN0aW9uKG4sZCkpO1xuXHRcdH1cblx0fTtcblxuXHRyZXR1cm4ge1xuXHRcdEJhclxuXHR9O1xuICAgICAgICBcbn0pKCk7IiwiLy8gZDMudGlwXG4vLyBDb3B5cmlnaHQgKGMpIDIwMTMgSnVzdGluIFBhbG1lclxuLy8gRVM2IC8gRDMgdjQgQWRhcHRpb24gQ29weXJpZ2h0IChjKSAyMDE2IENvbnN0YW50aW4gR2F2cmlsZXRlXG4vLyBSZW1vdmFsIG9mIEVTNiBmb3IgRDMgdjQgQWRhcHRpb24gQ29weXJpZ2h0IChjKSAyMDE2IERhdmlkIEdvdHpcbi8vXG4vLyBUb29sdGlwcyBmb3IgZDMuanMgU1ZHIHZpc3VhbGl6YXRpb25zXG5cbmV4cG9ydCBjb25zdCBkM1RpcCA9IChmdW5jdGlvbigpe1xuICBkMy5mdW5jdG9yID0gZnVuY3Rpb24gZnVuY3Rvcih2KSB7XG4gICAgcmV0dXJuIHR5cGVvZiB2ID09PSBcImZ1bmN0aW9uXCIgPyB2IDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdjtcbiAgICB9O1xuICB9O1xuXG4gIGQzLnRpcCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIGRpcmVjdGlvbiA9IGQzX3RpcF9kaXJlY3Rpb24sXG4gICAgICAgIG9mZnNldCAgICA9IGQzX3RpcF9vZmZzZXQsXG4gICAgICAgIGh0bWwgICAgICA9IGQzX3RpcF9odG1sLFxuICAgICAgICBub2RlICAgICAgPSBpbml0Tm9kZSgpLFxuICAgICAgICBzdmcgICAgICAgPSBudWxsLFxuICAgICAgICBwb2ludCAgICAgPSBudWxsLFxuICAgICAgICB0YXJnZXQgICAgPSBudWxsXG5cbiAgICBmdW5jdGlvbiB0aXAodmlzKSB7XG4gICAgICBzdmcgPSBnZXRTVkdOb2RlKHZpcylcbiAgICAgIHBvaW50ID0gc3ZnLmNyZWF0ZVNWR1BvaW50KClcbiAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQobm9kZSlcbiAgICB9XG5cbiAgICAvLyBQdWJsaWMgLSBzaG93IHRoZSB0b29sdGlwIG9uIHRoZSBzY3JlZW5cbiAgICAvL1xuICAgIC8vIFJldHVybnMgYSB0aXBcbiAgICB0aXAuc2hvdyA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpXG4gICAgICBpZihhcmdzW2FyZ3MubGVuZ3RoIC0gMV0gaW5zdGFuY2VvZiBTVkdFbGVtZW50KSB0YXJnZXQgPSBhcmdzLnBvcCgpXG4gICAgICB2YXIgY29udGVudCA9IGh0bWwuYXBwbHkodGhpcywgYXJncyksXG4gICAgICAgICAgcG9mZnNldCA9IG9mZnNldC5hcHBseSh0aGlzLCBhcmdzKSxcbiAgICAgICAgICBkaXIgICAgID0gZGlyZWN0aW9uLmFwcGx5KHRoaXMsIGFyZ3MpLFxuICAgICAgICAgIG5vZGVsICAgPSBnZXROb2RlRWwoKSxcbiAgICAgICAgICBpICAgICAgID0gZGlyZWN0aW9ucy5sZW5ndGgsXG4gICAgICAgICAgY29vcmRzLFxuICAgICAgICAgIHNjcm9sbFRvcCAgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsVG9wIHx8IGRvY3VtZW50LmJvZHkuc2Nyb2xsVG9wLFxuICAgICAgICAgIHNjcm9sbExlZnQgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc2Nyb2xsTGVmdCB8fCBkb2N1bWVudC5ib2R5LnNjcm9sbExlZnRcblxuICAgICAgbm9kZWwuaHRtbChjb250ZW50KVxuICAgICAgICAuc3R5bGUoJ3Bvc2l0aW9uJywgJ2Fic29sdXRlJylcbiAgICAgICAgLnN0eWxlKCdvcGFjaXR5JywgMSlcbiAgICAgICAgLnN0eWxlKCdwb2ludGVyLWV2ZW50cycsICdhbGwnKVxuXG4gICAgICB3aGlsZShpLS0pIG5vZGVsLmNsYXNzZWQoZGlyZWN0aW9uc1tpXSwgZmFsc2UpXG4gICAgICBjb29yZHMgPSBkaXJlY3Rpb25fY2FsbGJhY2tzW2Rpcl0uYXBwbHkodGhpcylcbiAgICAgIG5vZGVsLmNsYXNzZWQoZGlyLCB0cnVlKVxuICAgICAgICAuc3R5bGUoJ3RvcCcsIChjb29yZHMudG9wICsgIHBvZmZzZXRbMF0pICsgc2Nyb2xsVG9wICsgJ3B4JylcbiAgICAgICAgLnN0eWxlKCdsZWZ0JywgKGNvb3Jkcy5sZWZ0ICsgcG9mZnNldFsxXSkgKyBzY3JvbGxMZWZ0ICsgJ3B4JylcblxuICAgICAgcmV0dXJuIHRpcFxuICAgIH1cblxuICAgIC8vIFB1YmxpYyAtIGhpZGUgdGhlIHRvb2x0aXBcbiAgICAvL1xuICAgIC8vIFJldHVybnMgYSB0aXBcbiAgICB0aXAuaGlkZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIG5vZGVsID0gZ2V0Tm9kZUVsKClcbiAgICAgIG5vZGVsXG4gICAgICAgIC5zdHlsZSgnb3BhY2l0eScsIDApXG4gICAgICAgIC5zdHlsZSgncG9pbnRlci1ldmVudHMnLCAnbm9uZScpXG4gICAgICByZXR1cm4gdGlwXG4gICAgfVxuXG4gICAgLy8gUHVibGljOiBQcm94eSBhdHRyIGNhbGxzIHRvIHRoZSBkMyB0aXAgY29udGFpbmVyLiAgU2V0cyBvciBnZXRzIGF0dHJpYnV0ZSB2YWx1ZS5cbiAgICAvL1xuICAgIC8vIG4gLSBuYW1lIG9mIHRoZSBhdHRyaWJ1dGVcbiAgICAvLyB2IC0gdmFsdWUgb2YgdGhlIGF0dHJpYnV0ZVxuICAgIC8vXG4gICAgLy8gUmV0dXJucyB0aXAgb3IgYXR0cmlidXRlIHZhbHVlXG4gICAgdGlwLmF0dHIgPSBmdW5jdGlvbihuLCB2KSB7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIgJiYgdHlwZW9mIG4gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBnZXROb2RlRWwoKS5hdHRyKG4pXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgYXJncyA9ICBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpXG4gICAgICAgIGQzLnNlbGVjdGlvbi5wcm90b3R5cGUuYXR0ci5hcHBseShnZXROb2RlRWwoKSwgYXJncylcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRpcFxuICAgIH1cblxuICAgIC8vIFB1YmxpYzogUHJveHkgc3R5bGUgY2FsbHMgdG8gdGhlIGQzIHRpcCBjb250YWluZXIuICBTZXRzIG9yIGdldHMgYSBzdHlsZSB2YWx1ZS5cbiAgICAvL1xuICAgIC8vIG4gLSBuYW1lIG9mIHRoZSBwcm9wZXJ0eVxuICAgIC8vIHYgLSB2YWx1ZSBvZiB0aGUgcHJvcGVydHlcbiAgICAvL1xuICAgIC8vIFJldHVybnMgdGlwIG9yIHN0eWxlIHByb3BlcnR5IHZhbHVlXG4gICAgdGlwLnN0eWxlID0gZnVuY3Rpb24obiwgdikge1xuICAgICAgLy8gZGVidWdnZXI7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDIgJiYgdHlwZW9mIG4gPT09ICdzdHJpbmcnKSB7XG4gICAgICAgIHJldHVybiBnZXROb2RlRWwoKS5zdHlsZShuKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpO1xuICAgICAgICBpZiAoYXJncy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgICB2YXIgc3R5bGVzID0gYXJnc1swXTtcbiAgICAgICAgICBPYmplY3Qua2V5cyhzdHlsZXMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgICAgICByZXR1cm4gZDMuc2VsZWN0aW9uLnByb3RvdHlwZS5zdHlsZS5hcHBseShnZXROb2RlRWwoKSwgW2tleSwgc3R5bGVzW2tleV1dKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGlwXG4gICAgfVxuXG4gICAgLy8gUHVibGljOiBTZXQgb3IgZ2V0IHRoZSBkaXJlY3Rpb24gb2YgdGhlIHRvb2x0aXBcbiAgICAvL1xuICAgIC8vIHYgLSBPbmUgb2Ygbihub3J0aCksIHMoc291dGgpLCBlKGVhc3QpLCBvciB3KHdlc3QpLCBudyhub3J0aHdlc3QpLFxuICAgIC8vICAgICBzdyhzb3V0aHdlc3QpLCBuZShub3J0aGVhc3QpIG9yIHNlKHNvdXRoZWFzdClcbiAgICAvL1xuICAgIC8vIFJldHVybnMgdGlwIG9yIGRpcmVjdGlvblxuICAgIHRpcC5kaXJlY3Rpb24gPSBmdW5jdGlvbih2KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBkaXJlY3Rpb25cbiAgICAgIGRpcmVjdGlvbiA9IHYgPT0gbnVsbCA/IHYgOiBkMy5mdW5jdG9yKHYpXG5cbiAgICAgIHJldHVybiB0aXBcbiAgICB9XG5cbiAgICAvLyBQdWJsaWM6IFNldHMgb3IgZ2V0cyB0aGUgb2Zmc2V0IG9mIHRoZSB0aXBcbiAgICAvL1xuICAgIC8vIHYgLSBBcnJheSBvZiBbeCwgeV0gb2Zmc2V0XG4gICAgLy9cbiAgICAvLyBSZXR1cm5zIG9mZnNldCBvclxuICAgIHRpcC5vZmZzZXQgPSBmdW5jdGlvbih2KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBvZmZzZXRcbiAgICAgIG9mZnNldCA9IHYgPT0gbnVsbCA/IHYgOiBkMy5mdW5jdG9yKHYpXG5cbiAgICAgIHJldHVybiB0aXBcbiAgICB9XG5cbiAgICAvLyBQdWJsaWM6IHNldHMgb3IgZ2V0cyB0aGUgaHRtbCB2YWx1ZSBvZiB0aGUgdG9vbHRpcFxuICAgIC8vXG4gICAgLy8gdiAtIFN0cmluZyB2YWx1ZSBvZiB0aGUgdGlwXG4gICAgLy9cbiAgICAvLyBSZXR1cm5zIGh0bWwgdmFsdWUgb3IgdGlwXG4gICAgdGlwLmh0bWwgPSBmdW5jdGlvbih2KSB7XG4gICAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHJldHVybiBodG1sXG4gICAgICBodG1sID0gdiA9PSBudWxsID8gdiA6IGQzLmZ1bmN0b3IodilcblxuICAgICAgcmV0dXJuIHRpcFxuICAgIH1cblxuICAgIC8vIFB1YmxpYzogZGVzdHJveXMgdGhlIHRvb2x0aXAgYW5kIHJlbW92ZXMgaXQgZnJvbSB0aGUgRE9NXG4gICAgLy9cbiAgICAvLyBSZXR1cm5zIGEgdGlwXG4gICAgdGlwLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcbiAgICAgIGlmKG5vZGUpIHtcbiAgICAgICAgZ2V0Tm9kZUVsKCkucmVtb3ZlKCk7XG4gICAgICAgIG5vZGUgPSBudWxsO1xuICAgICAgfVxuICAgICAgcmV0dXJuIHRpcDtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkM190aXBfZGlyZWN0aW9uKCkgeyByZXR1cm4gJ24nIH1cbiAgICBmdW5jdGlvbiBkM190aXBfb2Zmc2V0KCkgeyByZXR1cm4gWzAsIDBdIH1cbiAgICBmdW5jdGlvbiBkM190aXBfaHRtbCgpIHsgcmV0dXJuICcgJyB9XG5cbiAgICB2YXIgZGlyZWN0aW9uX2NhbGxiYWNrcyA9IHtcbiAgICAgIG46ICBkaXJlY3Rpb25fbixcbiAgICAgIHM6ICBkaXJlY3Rpb25fcyxcbiAgICAgIGU6ICBkaXJlY3Rpb25fZSxcbiAgICAgIHc6ICBkaXJlY3Rpb25fdyxcbiAgICAgIG53OiBkaXJlY3Rpb25fbncsXG4gICAgICBuZTogZGlyZWN0aW9uX25lLFxuICAgICAgc3c6IGRpcmVjdGlvbl9zdyxcbiAgICAgIHNlOiBkaXJlY3Rpb25fc2VcbiAgICB9O1xuXG4gICAgdmFyIGRpcmVjdGlvbnMgPSBPYmplY3Qua2V5cyhkaXJlY3Rpb25fY2FsbGJhY2tzKTtcblxuICAgIGZ1bmN0aW9uIGRpcmVjdGlvbl9uKCkge1xuICAgICAgdmFyIGJib3ggPSBnZXRTY3JlZW5CQm94KClcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRvcDogIGJib3gubi55IC0gbm9kZS5vZmZzZXRIZWlnaHQsXG4gICAgICAgIGxlZnQ6IGJib3gubi54IC0gbm9kZS5vZmZzZXRXaWR0aCAvIDJcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkaXJlY3Rpb25fcygpIHtcbiAgICAgIHZhciBiYm94ID0gZ2V0U2NyZWVuQkJveCgpXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0b3A6ICBiYm94LnMueSxcbiAgICAgICAgbGVmdDogYmJveC5zLnggLSBub2RlLm9mZnNldFdpZHRoIC8gMlxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpcmVjdGlvbl9lKCkge1xuICAgICAgdmFyIGJib3ggPSBnZXRTY3JlZW5CQm94KClcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRvcDogIGJib3guZS55IC0gbm9kZS5vZmZzZXRIZWlnaHQgLyAyLFxuICAgICAgICBsZWZ0OiBiYm94LmUueFxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpcmVjdGlvbl93KCkge1xuICAgICAgdmFyIGJib3ggPSBnZXRTY3JlZW5CQm94KClcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRvcDogIGJib3gudy55IC0gbm9kZS5vZmZzZXRIZWlnaHQgLyAyLFxuICAgICAgICBsZWZ0OiBiYm94LncueCAtIG5vZGUub2Zmc2V0V2lkdGhcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkaXJlY3Rpb25fbncoKSB7XG4gICAgICB2YXIgYmJveCA9IGdldFNjcmVlbkJCb3goKVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9wOiAgYmJveC5udy55IC0gbm9kZS5vZmZzZXRIZWlnaHQsXG4gICAgICAgIGxlZnQ6IGJib3gubncueCAtIG5vZGUub2Zmc2V0V2lkdGhcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkaXJlY3Rpb25fbmUoKSB7XG4gICAgICB2YXIgYmJveCA9IGdldFNjcmVlbkJCb3goKVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9wOiAgYmJveC5uZS55IC0gbm9kZS5vZmZzZXRIZWlnaHQsXG4gICAgICAgIGxlZnQ6IGJib3gubmUueFxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpcmVjdGlvbl9zdygpIHtcbiAgICAgIHZhciBiYm94ID0gZ2V0U2NyZWVuQkJveCgpXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0b3A6ICBiYm94LnN3LnksXG4gICAgICAgIGxlZnQ6IGJib3guc3cueCAtIG5vZGUub2Zmc2V0V2lkdGhcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBkaXJlY3Rpb25fc2UoKSB7XG4gICAgICB2YXIgYmJveCA9IGdldFNjcmVlbkJCb3goKVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9wOiAgYmJveC5zZS55LFxuICAgICAgICBsZWZ0OiBiYm94LmUueFxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGluaXROb2RlKCkge1xuICAgICAgdmFyIG5vZGUgPSBkMy5zZWxlY3QoZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2JykpXG4gICAgICBub2RlXG4gICAgICAgIC5zdHlsZSgncG9zaXRpb24nLCAnYWJzb2x1dGUnKVxuICAgICAgICAuc3R5bGUoJ3RvcCcsIDApXG4gICAgICAgIC5zdHlsZSgnb3BhY2l0eScsIDApXG4gICAgICAgIC5zdHlsZSgncG9pbnRlci1ldmVudHMnLCAnbm9uZScpXG4gICAgICAgIC5zdHlsZSgnYm94LXNpemluZycsICdib3JkZXItYm94JylcblxuICAgICAgcmV0dXJuIG5vZGUubm9kZSgpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0U1ZHTm9kZShlbCkge1xuICAgICAgZWwgPSBlbC5ub2RlKClcbiAgICAgIGlmKGVsLnRhZ05hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ3N2ZycpXG4gICAgICAgIHJldHVybiBlbFxuXG4gICAgICByZXR1cm4gZWwub3duZXJTVkdFbGVtZW50XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZ2V0Tm9kZUVsKCkge1xuICAgICAgaWYobm9kZSA9PT0gbnVsbCkge1xuICAgICAgICBub2RlID0gaW5pdE5vZGUoKTtcbiAgICAgICAgLy8gcmUtYWRkIG5vZGUgdG8gRE9NXG4gICAgICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQobm9kZSk7XG4gICAgICB9O1xuICAgICAgcmV0dXJuIGQzLnNlbGVjdChub2RlKTtcbiAgICB9XG5cbiAgICAvLyBQcml2YXRlIC0gZ2V0cyB0aGUgc2NyZWVuIGNvb3JkaW5hdGVzIG9mIGEgc2hhcGVcbiAgICAvL1xuICAgIC8vIEdpdmVuIGEgc2hhcGUgb24gdGhlIHNjcmVlbiwgd2lsbCByZXR1cm4gYW4gU1ZHUG9pbnQgZm9yIHRoZSBkaXJlY3Rpb25zXG4gICAgLy8gbihub3J0aCksIHMoc291dGgpLCBlKGVhc3QpLCB3KHdlc3QpLCBuZShub3J0aGVhc3QpLCBzZShzb3V0aGVhc3QpLCBudyhub3J0aHdlc3QpLFxuICAgIC8vIHN3KHNvdXRod2VzdCkuXG4gICAgLy9cbiAgICAvLyAgICArLSstK1xuICAgIC8vICAgIHwgICB8XG4gICAgLy8gICAgKyAgICtcbiAgICAvLyAgICB8ICAgfFxuICAgIC8vICAgICstKy0rXG4gICAgLy9cbiAgICAvLyBSZXR1cm5zIGFuIE9iamVjdCB7biwgcywgZSwgdywgbncsIHN3LCBuZSwgc2V9XG4gICAgZnVuY3Rpb24gZ2V0U2NyZWVuQkJveCgpIHtcbiAgICAgIHZhciB0YXJnZXRlbCAgID0gdGFyZ2V0IHx8IGQzLmV2ZW50LnRhcmdldDtcbiAgICAgIGNvbnNvbGUubG9nKHRhcmdldGVsKTtcbiAgICAgIGZ1bmN0aW9uIHRyeUJCb3goKXtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICB0YXJnZXRlbC5nZXRCQm94KCk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycikge1xuICAgICAgICAgIHRhcmdldGVsID0gdGFyZ2V0ZWwucGFyZW50Tm9kZTtcbiAgICAgICAgICB0cnlCQm94KCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHRyeUJCb3goKTtcbiAgICAgIHdoaWxlICgndW5kZWZpbmVkJyA9PT0gdHlwZW9mIHRhcmdldGVsLmdldFNjcmVlbkNUTSApey8vICYmICd1bmRlZmluZWQnID09PSB0YXJnZXRlbC5wYXJlbnROb2RlKSB7XG4gICAgICAgICAgdGFyZ2V0ZWwgPSB0YXJnZXRlbC5wYXJlbnROb2RlO1xuICAgICAgfVxuICAgICAgY29uc29sZS5sb2codGFyZ2V0ZWwpO1xuICAgICAgdmFyIGJib3ggICAgICAgPSB7fSxcbiAgICAgICAgICBtYXRyaXggICAgID0gdGFyZ2V0ZWwuZ2V0U2NyZWVuQ1RNKCksXG4gICAgICAgICAgdGJib3ggICAgICA9IHRhcmdldGVsLmdldEJCb3goKSxcbiAgICAgICAgICB3aWR0aCAgICAgID0gdGJib3gud2lkdGgsXG4gICAgICAgICAgaGVpZ2h0ICAgICA9IHRiYm94LmhlaWdodCxcbiAgICAgICAgICB4ICAgICAgICAgID0gdGJib3gueCxcbiAgICAgICAgICB5ICAgICAgICAgID0gdGJib3gueVxuXG4gICAgICBwb2ludC54ID0geFxuICAgICAgcG9pbnQueSA9IHlcbiAgICAgIGJib3gubncgPSBwb2ludC5tYXRyaXhUcmFuc2Zvcm0obWF0cml4KVxuICAgICAgcG9pbnQueCArPSB3aWR0aFxuICAgICAgYmJveC5uZSA9IHBvaW50Lm1hdHJpeFRyYW5zZm9ybShtYXRyaXgpXG4gICAgICBwb2ludC55ICs9IGhlaWdodFxuICAgICAgYmJveC5zZSA9IHBvaW50Lm1hdHJpeFRyYW5zZm9ybShtYXRyaXgpXG4gICAgICBwb2ludC54IC09IHdpZHRoXG4gICAgICBiYm94LnN3ID0gcG9pbnQubWF0cml4VHJhbnNmb3JtKG1hdHJpeClcbiAgICAgIHBvaW50LnkgLT0gaGVpZ2h0IC8gMlxuICAgICAgYmJveC53ICA9IHBvaW50Lm1hdHJpeFRyYW5zZm9ybShtYXRyaXgpXG4gICAgICBwb2ludC54ICs9IHdpZHRoXG4gICAgICBiYm94LmUgPSBwb2ludC5tYXRyaXhUcmFuc2Zvcm0obWF0cml4KVxuICAgICAgcG9pbnQueCAtPSB3aWR0aCAvIDJcbiAgICAgIHBvaW50LnkgLT0gaGVpZ2h0IC8gMlxuICAgICAgYmJveC5uID0gcG9pbnQubWF0cml4VHJhbnNmb3JtKG1hdHJpeClcbiAgICAgIHBvaW50LnkgKz0gaGVpZ2h0XG4gICAgICBiYm94LnMgPSBwb2ludC5tYXRyaXhUcmFuc2Zvcm0obWF0cml4KVxuXG4gICAgICByZXR1cm4gYmJveFxuICAgIH1cblxuICAgIHJldHVybiB0aXBcbiAgfTtcbn0pKCk7IiwiY29uc3QgbWJIZWxwZXIgPSB7XG4gICAgcHJvbWlzZXM6IHt9LFxuICAgIGFkZFNvdXJjZUFuZExheWVycyhzb3VyY2VPcHRpb25zLGxheWVyT3B0aW9uc0FycmF5KXsgLy8gdGhpcyA9IG1hcFxuICAgICAgICB2YXIgc291cmNlTmFtZSA9IHNvdXJjZU9wdGlvbnMubmFtZTtcbiAgICAgICAgbWJIZWxwZXIucHJvbWlzZXNbc291cmNlT3B0aW9ucy5uYW1lXSA9IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7IC8vIFRPIERPOiBmaWd1cmUgb3V0IHJlamVjdD9cbiAgICAgICAgICAgIGRlbGV0ZSBzb3VyY2VPcHRpb25zLm5hbWU7XG4gICAgICAgICAgICBmdW5jdGlvbiBjaGVja0RhdGFMb2FkZWQoKXtcbiAgICAgICAgICAgICAgICBpZiAoIHRoaXMuZ2V0U291cmNlKHNvdXJjZU5hbWUpICl7IC8vIGlmIGFkZFNvdXJjZSBoYXMgdGFrZW4gZWZmZWN0XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub2ZmKCdyZW5kZXInLCBjaGVja0RhdGFMb2FkZWQpOyAvLyB0dXJuIG9mZiB0aGUgbGlzdGVuZXIgZm9yIHJlbmRlclxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMub24oJ3JlbmRlcicsIGNoZWNrRGF0YUxvYWRlZCk7XG4gICAgICAgICAgICB0aGlzLmFkZFNvdXJjZShzb3VyY2VOYW1lLCBzb3VyY2VPcHRpb25zKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBsYXllclByb21pc2VzID0gW107XG4gICAgICAgIHJldHVybiBtYkhlbHBlci5wcm9taXNlc1tzb3VyY2VOYW1lXS50aGVuKCgpID0+IHsgXG4gICAgICAgICAgICBsYXllck9wdGlvbnNBcnJheS5mb3JFYWNoKChlYWNoKSA9PiB7XG4gICAgICAgICAgICAgICAgbGF5ZXJQcm9taXNlcy5wdXNoKFxuICAgICAgICAgICAgICAgICAgICBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4geyAvLyBUTyBETzogZmlndXJlIG91dCByZWplY3Q/XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYmVmb3JlTGF5ZXIgPSBlYWNoLmJlZm9yZUxheWVyID8gZWFjaC5iZWZvcmVMYXllciA6ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGVhY2guYmVmb3JlTGF5ZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICBlYWNoLnNvdXJjZSA9IHNvdXJjZU5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBjaGVja0xheWVyTG9hZGVkKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCB0aGlzLmdldExheWVyKGVhY2guaWQpICl7IC8vIGlmIGFkZExheWVyICBoYXMgdGFrZW4gZWZmZWN0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub2ZmKCdyZW5kZXInLCBjaGVja0xheWVyTG9hZGVkKTsgLy8gdHVybiBvZmYgdGhlIGxpc3RlbmVyIGZvciByZW5kZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9uKCdyZW5kZXInLCBjaGVja0xheWVyTG9hZGVkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkTGF5ZXIoZWFjaCwgYmVmb3JlTGF5ZXIpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLmFsbChsYXllclByb21pc2VzKTtcbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuZXhwb3J0cy5hZGRTb3VyY2VBbmRMYXllcnMgPSBtYkhlbHBlci5hZGRTb3VyY2VBbmRMYXllcnM7Il19
