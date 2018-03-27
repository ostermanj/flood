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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkZXYtanMvbWFpbi5lczYiLCJqcy1leHBvcnRzL0JhcnMuanMiLCJqcy12ZW5kb3IvZDMtdGlwLmpzIiwibm9kZV9tb2R1bGVzL21hcGJveC1oZWxwZXIvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztBQ0VDOztBQUNBOztvTUFIQTtBQUNBOzs7QUFJQTs7QUFFRDs7Ozs7Ozs7QUFRQTs7Ozs7QUFLQSxPQUFPLE1BQVAsR0FBa0IsWUFBVTtBQUM1Qjs7QUFFQzs7QUFFRyxVQUFTLFdBQVQsR0FBdUIsOEZBQXZCO0FBQ0EsSUFBRyxTQUFILENBQWEsWUFBYixFQUNFLEVBREYsQ0FDSyxPQURMLEVBQ2MsWUFBTTtBQUNsQixLQUFHLEtBQUgsQ0FBUyxjQUFUO0FBQ0EsRUFIRjtBQUlBLEtBQU0sV0FBVyxRQUFRLGVBQVIsQ0FBakI7QUFDRDtBQUNDLEtBQU0sTUFBTSxHQUFHLEdBQUgsR0FBUyxJQUFULENBQWMsT0FBZCxFQUF1QixRQUF2QixFQUFpQyxTQUFqQyxDQUEyQyxHQUEzQyxFQUFnRCxJQUFoRCxDQUFxRCxVQUFTLENBQVQsRUFBWTtBQUFFLFVBQVEsR0FBUixDQUFZLElBQVosRUFBaUIsQ0FBakIsRUFBb0IsT0FBTyxFQUFFLEdBQUcsTUFBSCxDQUFVLEtBQUssVUFBTCxDQUFnQixVQUFoQixDQUEyQixVQUFyQyxFQUFpRCxJQUFqRCxDQUFzRCxJQUF0RCxFQUE0RCxPQUE1RCxDQUFvRSxHQUFwRSxFQUF3RSxFQUF4RSxDQUFGLENBQVA7QUFBd0YsRUFBL0ssQ0FBWjtBQUNBLEtBQU0sWUFBWSxFQUFsQjs7QUFFQSxLQUFJLE9BQUo7QUFDQSxLQUFJLHdCQUF3QixJQUFJLEdBQUosRUFBNUI7QUFDQSxLQUFJLFlBQVksQ0FBaEI7O0FBRUEsS0FBSSxv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dCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc31yZXR1cm4gZX0pKCkiLCIgLyogZXhwb3J0ZWQgQ2hhcnRzLCBkM1RpcCAqL1xuIC8vaW1wb3J0IHsgRG9udXRzIH0gZnJvbSAnLi4vanMtZXhwb3J0cy9Eb251dHMnO1xuIGltcG9ydCB7IEJhcnMgfSBmcm9tICcuLi9qcy1leHBvcnRzL0JhcnMnO1xuIGltcG9ydCB7IGQzVGlwIH0gZnJvbSAnLi4vanMtdmVuZG9yL2QzLXRpcCc7XG4gXG4gLyogcG9seWZpbGxzIG5lZWRlZDogUHJvbWlzZSBUTyBETzogT1RIRVJTP1xuICovXG4vKlxuaW1wb3J0IHsgcmVmbGVjdCwgYXJyYXlGaW5kLCBTVkdJbm5lckhUTUwsIFNWR0ZvY3VzIH0gZnJvbSAnLi4vanMtdmVuZG9yL3BvbHlmaWxscyc7XG5pbXBvcnQgeyBIZWxwZXJzIH0gZnJvbSAnLi4vanMtZXhwb3J0cy9IZWxwZXJzJztcbmltcG9ydCB7IGQzVGlwIH0gZnJvbSAnLi4vanMtdmVuZG9yL2QzLXRpcCc7XG5pbXBvcnQgeyBjcmVhdGVCcm93c2VCdXR0b24gfSBmcm9tICcuLi9qcy1leHBvcnRzL0Jyb3dzZUJ1dHRvbnMnO1xuaW1wb3J0IHsgY3JlYXRlUmVzdWx0SXRlbSB9IGZyb20gJy4uL2pzLWV4cG9ydHMvUmVzdWx0SXRlbXMnOyBcbiovXG4gIFxuLypcbnRvIGRvIDogc2VlIGFsc28gaHR0cHM6Ly93d3cubWFwYm94LmNvbS9tYXBib3gtZ2wtanMvZXhhbXBsZS9oZWF0bWFwLWxheWVyL1xuIFxuXG4qL1xud2luZG93LnRoZU1hcCAgPSAoZnVuY3Rpb24oKXsgICBcblwidXNlIHN0cmljdFwiO1xuXHRcblx0Ly92YXIgdGlwID0gZDMudGlwKCkuYXR0cignY2xhc3MnLCAnZDMtdGlwJykuaHRtbChmdW5jdGlvbihkKSB7IHJldHVybiBkOyB9KTtcblx0XG4gICAgbWFwYm94Z2wuYWNjZXNzVG9rZW4gPSAncGsuZXlKMUlqb2liM04wWlhKdFlXNXFJaXdpWVNJNkltTnBkblU1ZEhWbmRqQTJlRFl5YjNBM05uZzFjR0ozWlhvaWZRLlhvX2sta3pHZllYX1lvX1JEY0hEQmcnO1xuICAgIGQzLnNlbGVjdEFsbCgnLmhlbHAtbGluaycpXG4gICAgXHQub24oJ2NsaWNrJywgKCkgPT4ge1xuICAgIFx0XHRkMy5ldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgIFx0fSk7XG4gICAgY29uc3QgbWJIZWxwZXIgPSByZXF1aXJlKCdtYXBib3gtaGVscGVyJyk7XG4gICAvLyBkMy50aXAgPSByZXF1aXJlKCdkMy10aXAnKTtcbiAgICBjb25zdCB0aXAgPSBkMy50aXAoKS5hdHRyKCdjbGFzcycsICdkMy10aXAnKS5kaXJlY3Rpb24oJ3cnKS5odG1sKGZ1bmN0aW9uKGQpIHsgY29uc29sZS5sb2codGhpcyxkKTtyZXR1cm4gZFtkMy5zZWxlY3QodGhpcy5wYXJlbnROb2RlLnBhcmVudE5vZGUucGFyZW50Tm9kZSkuYXR0cignaWQnKS5yZXBsYWNlKCctJywnJyldOyB9KTtcbiAgIFx0Y29uc3QgdGhlQ2hhcnRzID0gW107XG4gICBcbiAgICB2YXIgZ2VvanNvbjtcbiAgICB2YXIgZmVhdHVyZVByb3BlcnRpZXNCeUlkID0gbmV3IE1hcCgpOyBcbiAgICB2YXIgZ2F0ZUNoZWNrID0gMDtcblxuICAgIHZhciBzaXplWm9vbVRocmVzaG9sZCA9IDg7XG4gICAgXG4gICAgdmFyIHRoZU1hcCA9IG5ldyBtYXBib3hnbC5NYXAoe1xuXHQgICAgY29udGFpbmVyOiAnbWFwJyxcblx0ICAgIHN0eWxlOiAnbWFwYm94Oi8vc3R5bGVzL29zdGVybWFuai9jamYwM28zN2IzdHZlMnJxcDJpbnc2YTFmJyxcblx0ICAgIGNlbnRlcjogWy05NS4xNDkzNTE0ODY0NTkwNzMsIDM3Ljk4NDY3MzM3MDg1NTk5XSxcblx0ICAgIHpvb206IDMsXG5cdCAgICBtYXhCb3VuZHM6IFtbLTE0Mi44ODcwNTcxNDc0NjM2MiwgMTYuMDU4MzQ0OTQ4NDMyNDA2XSxbLTUxLjkwMjMwMTc4Njk3MzEsNTUuNzY2OTAwNjc0MTcxMzhdXSxcblx0ICAgIG1pblpvb206IDEuNSxcblx0ICAgIGF0dHJpYnV0aW9uQ29udHJvbDogZmFsc2UsXG5cdH0pO1xuXG5cdHZhciBuYXYgPSBuZXcgbWFwYm94Z2wuTmF2aWdhdGlvbkNvbnRyb2woe3Nob3dDb21wYXNzOmZhbHNlfSk7XG5cdHRoZU1hcC5hZGRDb250cm9sKG5hdiwgJ3RvcC1yaWdodCcpO1xuXG5cdHZhciBtZWRpYW5JbmNvbWVzID0gbmV3IE1hcCgpO1xuXHR0b0dlb0pTT04oJ3BvbGljaWVzLmNzdicpO1xuXHR0aGVNYXAub24oJ2xvYWQnLCBmdW5jdGlvbigpe1xuXHRcdGdhdGVDaGVjaysrO1xuXHRcdGdhdGUoKTtcblx0fSk7XG5cdGZ1bmN0aW9uIGdhdGUoKXtcblx0XHRpZiAoIGdhdGVDaGVjayA8IDIgKXtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dXBkYXRlQWxsKCk7XG5cdFx0YWRkVW5jbHVzdGVyZWQoKTtcblx0XHRhZGRDbHVzdGVyZWQoKTtcblx0XHQvL2NhbGN1bGF0ZVpTY29yZXMoJ3ByZW0nKTtcblx0fSAvLyBlbmQgZ2F0ZVxuXG5cdC8qdmFyIGNlbnN1c1RyYWN0c0luVmlldyA9IG5ldyBTZXQoKTtcblx0ZnVuY3Rpb24gY2FsY3VsYXRlTWVkaWFuSW5jb21lcyhpblZpZXdJRHMpe1xuXHRcdGNvbnNvbGUubG9nKGluVmlld0lEcyk7XG5cdFx0dmFyIG1lZGlhbkluY29tZXMgPSBbXTtcblx0XHRjZW5zdXNUcmFjdHNJblZpZXcuY2xlYXIoKTtcblx0XHRpblZpZXdJRHMuZm9yRWFjaChkID0+IHtcblx0XHRcdGNvbnNvbGUubG9nKGQpO1xuXHRcdFx0dmFyIGZlYXR1cmUgPSBnZW9qc29uLmZlYXR1cmVzLmZpbmQoZiA9PiBmLnByb3BlcnRpZXMuaWQgPT09IGQpO1xuXHRcdFx0dmFyIGNlbnN1c1RyYWN0ID0gZmVhdHVyZS5jZW5fdHJhY3Q7XG5cdFx0XHRpZiAoICFjZW5zdXNUcmFjdHNJblZpZXcuaGFzKGNlbnN1c1RyYWN0KSl7XG5cdFx0XHRcdGNlbnN1c1RyYWN0c0luVmlldy5hZGQoY2Vuc3VzVHJhY3QpO1xuXHRcdFx0XHRtZWRpYW5JbmNvbWVzLnB1c2goZmVhdHVyZS5tZWRfaW5jb21lKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRyZXR1cm4gbWVkaWFuSW5jb21lcztcblx0fSovXG5cdGZ1bmN0aW9uIGNhbGN1bGF0ZVpTY29yZXMoZmllbGQsIGN1dG9mZiA9IG51bGwsIGhhcmRDdXRvZmYgPSBudWxsLCBpZ25vcmUgPSBbXSApeyAgLy8gY3V0b2ZmIHNwZWNpZmllcyB1cHBlciBib3VuZCB0byBnZXQgcmlkIG9mIG91dGxpZXJzXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCAgLy8gYSB3ZWFrIGN1dG9mZiBjYWxjdWxhdGVzIHZhbHVlcyBmb3Igd2hvbGUgc2V0IGJ1dFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQgIC8vIHNldHMgbWF4IGZvciB0aGUgdml6IGJhc2VkIG9uIHRoZSBjdXRvZmYgdmFsdWUuIGEgaGFyZFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQgIC8vIGN1dG9mZiBleGNsdWRlcyB2YWx1ZXMgYmV5b25kIHRoZSBjdXRvZmYgZnJvbSB0aGUgXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCAgLy8gY2FsY3VsYXRpb25zXHRcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ICAvLyB0aGUgaWdub3JlIGFycmF5IGlzIHZhbHVlcyB0aGF0IHNob3VsZCBiZSB0cmVhdGVkIGFzIGludmFsaWRcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ICAvLyBzdWNoIGFzIGFsbCB0aGUgZXJyb25lb3VlICQyNTBrIGhvbWUgdmFsdWVzLlxuXHRcdGNvbnNvbGUubG9nKCdjYWxjdWxhdGluZyB6LXNjb3JlcycpO1xuXHRcdHZhciBtZWFuID0gZDMubWVhbihnZW9qc29uLmZlYXR1cmVzLCBkID0+IHtcblx0XHRcdGlmICggaGFyZEN1dG9mZiA9PT0gbnVsbCApIHtcblx0XHRcdFx0cmV0dXJuIGlnbm9yZS5pbmRleE9mKGQucHJvcGVydGllc1tmaWVsZF0pID09PSAtMSA/IGQucHJvcGVydGllc1tmaWVsZF0gOiBudWxsO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCBkLnByb3BlcnRpZXNbZmllbGRdIDw9IGhhcmRDdXRvZmYgKXtcblx0XHRcdFx0cmV0dXJuIGlnbm9yZS5pbmRleE9mKGQucHJvcGVydGllc1tmaWVsZF0pID09PSAtMSA/IGQucHJvcGVydGllc1tmaWVsZF0gOiBudWxsO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHZhciBzZCA9IGQzLmRldmlhdGlvbihnZW9qc29uLmZlYXR1cmVzLCBkID0+IHtcblx0XHRcdGlmICggaGFyZEN1dG9mZiA9PT0gbnVsbCApIHtcblx0XHRcdFx0cmV0dXJuIGlnbm9yZS5pbmRleE9mKGQucHJvcGVydGllc1tmaWVsZF0pID09PSAtMSA/IGQucHJvcGVydGllc1tmaWVsZF0gOiBudWxsO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCBkLnByb3BlcnRpZXNbZmllbGRdIDw9IGhhcmRDdXRvZmYgKXtcblx0XHRcdFx0cmV0dXJuIGlnbm9yZS5pbmRleE9mKGQucHJvcGVydGllc1tmaWVsZF0pID09PSAtMSA/IGQucHJvcGVydGllc1tmaWVsZF0gOiBudWxsO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHZhciBtaW4sXG5cdFx0XHRtYXgsXG5cdFx0XHRjdXRvZmZaID0gY3V0b2ZmID8gKCBjdXRvZmYgLSBtZWFuICkgLyBzZCA6IG51bGw7XG5cblx0XHRjb25zb2xlLmxvZygnY3V0b2ZmIGlzICcgKyBjdXRvZmZaKTtcblx0XHRnZW9qc29uLmZlYXR1cmVzLmZvckVhY2goZWFjaCA9PiB7XG5cdFx0XHRpZiAoIGhhcmRDdXRvZmYgJiYgZWFjaC5wcm9wZXJ0aWVzW2ZpZWxkXSA+IGhhcmRDdXRvZmYgfHwgaWdub3JlLmluZGV4T2YoZWFjaC5wcm9wZXJ0aWVzW2ZpZWxkXSkgIT09IC0xICl7XG5cdFx0XHRcdGVhY2gucHJvcGVydGllc1tmaWVsZCArICdaJ10gPSBudWxsO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZWFjaC5wcm9wZXJ0aWVzW2ZpZWxkICsgJ1onXSA9ICggZWFjaC5wcm9wZXJ0aWVzW2ZpZWxkXSAtIG1lYW4gKSAvIHNkO1xuXHRcdFx0XHRtaW4gPSBlYWNoLnByb3BlcnRpZXNbZmllbGQgKyAnWiddIDwgbWluIHx8IG1pbiA9PT0gdW5kZWZpbmVkID8gZWFjaC5wcm9wZXJ0aWVzW2ZpZWxkICsgJ1onXSA6IG1pbjtcblx0XHRcdFx0bWF4ID0gZWFjaC5wcm9wZXJ0aWVzW2ZpZWxkICsgJ1onXSA+IG1heCB8fCBtYXggPT09IHVuZGVmaW5lZCA/IGVhY2gucHJvcGVydGllc1tmaWVsZCArICdaJ10gOiBtYXg7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0Y29uc29sZS5sb2coJ2FjdHVhbE1pbjonICsgbWluLCAnYWN0dWFsTWF4OicgKyBtYXgpO1xuXHRcdC8vbWF4ID0gZDMubWluKFttYXgsY3V0b2ZmWiwzXSk7XG5cdFx0Ly9taW4gPSBkMy5tYXgoW21pbiwgLTNdKTtcblx0XHRtYXggPSAyLjMzO1xuXHRcdG1pbiA9IC0yLjMzO1xuXHRcdGNvbnNvbGUubG9nKCdkb25lJywgZ2VvanNvbiwgbWluLCBtYXgpO1xuXHRcdHJldHVybiB7XG5cdFx0XHRtaW4sXG5cdFx0XHRtYXgsXG5cdFx0XHRtZWFuLFxuXHRcdFx0c2Rcblx0XHR9O1xuXHR9XG5cblx0ZnVuY3Rpb24gYWRkVW5jbHVzdGVyZWQoKXtcblx0XHRyZXR1cm4gbWJIZWxwZXIuYWRkU291cmNlQW5kTGF5ZXJzLmNhbGwodGhlTWFwLFxuXHRcdFx0eyAvLyBzb3VyY2Vcblx0XHRcdFx0XCJuYW1lXCI6IFwicG9saWN5LXBvaW50c1wiLFxuXHRcdCAgICAgICAgXCJ0eXBlXCI6IFwiZ2VvanNvblwiLFxuXHRcdCAgICAgICAgXCJkYXRhXCI6IGdlb2pzb25cblx0XHRcdH0sIFsgLy8gbGF5ZXJzXG5cdFx0XHRcdHsgLy8gbGF5ZXIgb25lXG5cdCAgICAgICAgICAgIFwiaWRcIjogXCJwb2ludHNcIixcblx0ICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY2lyY2xlXCIsXG5cdCAgICAgICAgICAgIFwic291cmNlXCI6IFwicG9saWN5LXBvaW50c1wiLFxuXHQgICAgICAgICAgICBcIm1heHpvb21cIjogc2l6ZVpvb21UaHJlc2hvbGQsXG5cdCAgICAgICAgICAgIFwicGFpbnRcIjoge1xuXHQgICAgICAgICAgICAgIFx0XCJjaXJjbGUtY29sb3JcIjogW1xuXHRcdCAgICAgICAgICAgICAgICAnbWF0Y2gnLFxuXHRcdCAgICAgICAgICAgICAgICBbJ2dldCcsICd0X2RlZCddLFxuXHRcdCAgICAgICAgICAgICAgICA1LCAnIzBmNDM5YycsXG5cdFx0ICAgICAgICAgICAgICAgIC8qIG90aGVyICovICcjOTkwMDAwJ1xuXHRcdCAgICAgICAgICAgIF0sXG5cdFx0ICAgICAgICAgICAgXCJjaXJjbGUtcmFkaXVzXCI6IHtcblx0XHQgICAgICAgICAgICAgICAgJ3N0b3BzJzogW1s1LCAzXSwgWzgsIDE4XV1cblx0XHQgICAgICAgICAgICB9LFxuXHRcdCAgICAgICAgICAgIFwiY2lyY2xlLW9wYWNpdHlcIjogMC4xXG5cdFx0ICAgICAgICAgICAgfVxuXHRcdCAgICAgICAgfSxcblx0XHQgICAgICAgIHsgLy8gbGF5ZXIgdHdvXG5cdCAgICAgICAgICAgIFwiaWRcIjogXCJwb2ludHMtZGF0YS1kcml2ZW5cIixcblx0ICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY2lyY2xlXCIsXG5cdCAgICAgICAgICAgIFwic291cmNlXCI6IFwicG9saWN5LXBvaW50c1wiLFxuXHQgICAgICAgICAgICBcIm1pbnpvb21cIjogc2l6ZVpvb21UaHJlc2hvbGQsXG5cdCAgICAgICAgICAgIFwicGFpbnRcIjoge1xuXHQgICAgICAgICAgICAgIFx0XCJjaXJjbGUtY29sb3JcIjogW1xuXHRcdCAgICAgICAgICAgICAgICAnbWF0Y2gnLFxuXHRcdCAgICAgICAgICAgICAgICBbJ2dldCcsICd0X2RlZCddLFxuXHRcdCAgICAgICAgICAgICAgICA1LCAnIzBmNDM5YycsXG5cdFx0ICAgICAgICAgICAgICAgIC8qIG90aGVyICovICcjOTkwMDAwJ1xuXHRcdCAgICAgICAgICAgIF0sXG5cdFx0ICAgICAgICAgICAgXCJjaXJjbGUtcmFkaXVzXCI6IHtcblx0XHQgICAgICAgICAgICBcdHByb3BlcnR5OiAncHJlbScsXG5cdFx0ICAgICAgICAgICAgICAgIHR5cGU6ICdleHBvbmVudGlhbCcsXG5cdFx0XHRcdCAgICAgICAgc3RvcHM6IFtcblx0XHRcdFx0ICAgICAgICAgIFs2MiwgNV0sXG5cdFx0XHRcdCAgICAgICAgICBbMjUwMCwgNjBdXG5cdFx0XHRcdCAgICAgICAgXVxuXHRcdCAgICAgICAgICAgIH0sXG5cdFx0ICAgICAgICAgICAgXCJjaXJjbGUtb3BhY2l0eVwiOiAwLjEsXG5cdFx0ICAgICAgICAgICAgXCJjaXJjbGUtc3Ryb2tlLWNvbG9yXCI6IFwiI2ZmZmZmZlwiLFxuXHRcdCAgICAgICAgICAgIFwiY2lyY2xlLXN0cm9rZS13aWR0aFwiOiAxXG5cdFx0ICAgICAgICB9XG5cdFx0XHR9XVxuXHRcdCk7IFxuXHR9XG5cdC8qZnVuY3Rpb24gY2hlY2tGZWF0dXJlc0xvYWRlZCgpe1xuXHRcdGlmICggdGhlTWFwLmxvYWRlZCgpKXtcblx0XHRcdFxuXHRcdFx0dGhlTWFwLm9mZigncmVuZGVyJywgY2hlY2tGZWF0dXJlcyk7XG5cdFx0fVxuXHR9Ki9cblx0ZnVuY3Rpb24gYWRkQ2x1c3RlcmVkKCl7XG5cdFx0XG5cdFx0bWJIZWxwZXIuYWRkU291cmNlQW5kTGF5ZXJzLmNhbGwodGhlTWFwLFxuXHRcdCAgICB7IC8vIHNvdXJjZVxuXHRcdCAgICBcdFwibmFtZVwiOiBcInBvbGljaWVzXCIsXG5cdFx0ICAgICAgICBcInR5cGVcIjogXCJnZW9qc29uXCIsXG5cdFx0ICAgICAgICBcImRhdGFcIjogZ2VvanNvbixcblx0XHQgICAgICAgIFwiY2x1c3RlclwiOiB0cnVlLFxuXHRcdCAgICAgICAgXCJjbHVzdGVyUmFkaXVzXCI6IDAuNSAvLyBSYWRpdXMgb2YgZWFjaCBjbHVzdGVyIHdoZW4gY2x1c3RlcmluZyBwb2ludHMgKGRlZmF1bHRzIHRvIDUwKVxuXHRcdCAgICB9LCBbIC8vIGxheWVyc1xuXHRcdCAgICAgICB7IC8vIGxheWVyIG9uZVxuXHRcdCAgICAgICAgICAgIGlkOiBcImNsdXN0ZXItY291bnRcIixcblx0XHRcdCAgICAgICAgdHlwZTogXCJzeW1ib2xcIixcblx0XHRcdCAgICAgICAgc291cmNlOiBcInBvbGljaWVzXCIsXG5cdFx0XHQgICAgICAgIGZpbHRlcjogW1wiaGFzXCIsIFwicG9pbnRfY291bnRcIl0sXG5cdFx0XHQgICAgICAgIFwibWluem9vbVwiOiA2LFxuXHRcdFx0ICAgICAgICBsYXlvdXQ6IHtcblx0XHRcdCAgICAgICAgICAgIFwidGV4dC1maWVsZFwiOiBcIntwb2ludF9jb3VudF9hYmJyZXZpYXRlZH1cIixcblx0XHRcdCAgICAgICAgICAgIFwidGV4dC1zaXplXCI6IDEyLFxuXG5cdFx0XHQgICAgICAgIH0sXG5cdFx0XHQgICAgICAgIFwicGFpbnRcIjoge1xuXHRcdFx0ICAgICAgICBcdFwidGV4dC1jb2xvclwiOiBcIiNmZmZmZmZcIlxuXHRcdFx0ICAgICAgICB9XG5cdFx0ICAgICAgICB9XG5cdCAgICAgICAgXSAvLyBlbmQgbGF5ZXJzIGFycmF5XG5cdCAgICApOyAvLyBlbmQgYWRkbGF5ZXJzXG5cdH0gLy8gZW5kIGFkZENsdXN0ZXJlZFxuXHRmdW5jdGlvbiB0b0dlb0pTT04odXJsKXtcblx0XHRcblx0XHRkMy5jc3YodXJsLCBmdW5jdGlvbihlcnIsIGRhdGEpe1xuXHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHR0aHJvdyBlcnI7XG5cdFx0XHR9XG5cdFx0XHQvL2NvbnNvbGUubG9nKGRhdGEpO1xuXHRcdFx0dmFyIGZlYXR1cmVzID0gW107IFxuXHRcdFx0ZGF0YS5mb3JFYWNoKGVhY2ggPT4ge1xuXG5cdFx0XHRcdHZhciB2YWx1ZSA9ICtlYWNoLm1lZF9pbmNvbWUgPyArZWFjaC5tZWRfaW5jb21lIDogbnVsbDtcblx0XHRcdFx0aWYgKCAhbWVkaWFuSW5jb21lcy5oYXMoK2VhY2guY2VuX3RyYWN0KSApe1xuXHRcdFx0XHRcdG1lZGlhbkluY29tZXMuc2V0KCtlYWNoLmNlbl90cmFjdCwgdmFsdWUpOyAvLyBubyBkdXBsaWNhdGUgdHJhY3RzXG5cdFx0XHRcdH1cblx0XHRcdFx0dmFyIGNvZXJjZWQgPSB7fTtcblx0XHRcdFx0Zm9yICggdmFyIGtleSBpbiBlYWNoICkge1xuXHRcdFx0XHRcdGlmICggZWFjaC5oYXNPd25Qcm9wZXJ0eShrZXkpICl7XG5cdFx0XHRcdFx0XHRjb2VyY2VkW2tleV0gPSAhaXNOYU4oK2VhY2hba2V5XSkgPyArZWFjaFtrZXldIDogZWFjaFtrZXldO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSAgXG5cdFx0XHRcdGZlYXR1cmVQcm9wZXJ0aWVzQnlJZC5zZXQoY29lcmNlZC5pZCxjb2VyY2VkKTtcblx0XHRcdFx0ZmVhdHVyZXMucHVzaCh7XG5cdFx0XHRcdFx0XCJ0eXBlXCI6IFwiRmVhdHVyZVwiLFxuXHRcdFx0XHRcdFwicHJvcGVydGllc1wiOiBjb2VyY2VkLFxuXHRcdFx0XHRcdFwiZ2VvbWV0cnlcIjoge1xuXHRcdFx0XHRcdFx0XCJ0eXBlXCI6IFwiUG9pbnRcIixcblx0XHRcdFx0XHRcdFwiY29vcmRpbmF0ZXNcIjogWytlYWNoLmxvbmdpdHVkZSwgK2VhY2gubGF0aXR1ZGVdXG5cdFx0XHRcdFx0fSAgIFxuXHRcdFx0XHR9KTtcblx0XHRcdH0pOyAvLyBlbmQgZm9yRWFjaFxuXHRcdFx0Y29uc29sZS5sb2cobWVkaWFuSW5jb21lcyk7XG5cdFx0XHRjb25zb2xlLmxvZyhmZWF0dXJlUHJvcGVydGllc0J5SWQpO1xuXHRcdFx0Z2VvanNvbiA9ICB7XG5cdFx0XHRcdFwidHlwZVwiOiBcIkZlYXR1cmVDb2xsZWN0aW9uXCIsXG5cdFx0XHRcdFwiZmVhdHVyZXNcIjogZmVhdHVyZXNcblx0XHRcdH07XG5cdFx0XHR0aGVDaGFydHMucHVzaCggLy8gc2hvdWxkIGJlIGFibGUgdG8gY3JlYXRlIGNoYXJ0cyBub3csIHdoZXRoZXIgb3Igbm90IG1hcCBoYXMgbG9hZGVkLiBtYXAgbmVlZHMgdG8gaGF2ZVxuXHRcdFx0XHRcdFx0XHQvLyBsb2FkZWQgZm9yIHRoZW0gdG8gdXBkYXRlLCB0aG91Z2guXG5cdFx0XHRcdG5ldyBCYXJzLkJhcih7IFxuXHRcdFx0XHRcdHRpdGxlOiAnUHJvcGVydGllcyBpbiB2aWV3JywgXG5cdFx0XHRcdFx0bWFyZ2luOiB7XG5cdFx0XHRcdFx0XHR0b3A6MCxcblx0XHRcdFx0XHRcdHJpZ2h0OjEsXG5cdFx0XHRcdFx0XHRib3R0b206MCxcblx0XHRcdFx0XHRcdGxlZnQ6MSBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGhlaWdodFRvV2lkdGg6IDAuMDUsXG5cdFx0XHRcdFx0Y29udGFpbmVyOiAnI2luLXZpZXctYmFyJyxcblx0XHRcdFx0XHRkYXRhOiBnZW9qc29uLmZlYXR1cmVzLFxuXHRcdFx0XHRcdG51bWVyYXRvcihpblZpZXdJRHMpe1xuXHRcdFx0XHRcdFx0cmV0dXJuIGluVmlld0lEcy5zaXplO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0ZGVub21pbmF0b3IoKXtcblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLmRhdGEubGVuZ3RoO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0dGV4dEZ1bmN0aW9uKG4sZCl7XG5cdFx0XHRcdFx0XHRyZXR1cm4gYCR7ZDMuZm9ybWF0KFwiLFwiKShuKX0gb2YgJHtkMy5mb3JtYXQoXCIsXCIpKGQpfSAoJHtkMy5mb3JtYXQoXCIuMCVcIikobiAvIGQpfSlgO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSksXG5cdFx0XHRcdG5ldyBCYXJzLkJhcih7XG5cdFx0XHRcdFx0dGl0bGU6ICcuLi4gd2l0aCBsb3cgZGVkdWN0aWJsZScsIFxuXHRcdFx0XHRcdG1hcmdpbjoge1xuXHRcdFx0XHRcdFx0dG9wOjAsXG5cdFx0XHRcdFx0XHRyaWdodDoxLFxuXHRcdFx0XHRcdFx0Ym90dG9tOjAsXG5cdFx0XHRcdFx0XHRsZWZ0OjEgXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRoZWlnaHRUb1dpZHRoOiAwLjA1LFxuXHRcdFx0XHRcdGluZm9NYXJrOnRydWUsXG5cdFx0XHRcdFx0Y29udGFpbmVyOiAnI2RlZHVjdGlibGUtYmFyJyxcblx0XHRcdFx0XHRkYXRhOiBnZW9qc29uLmZlYXR1cmVzLFxuXHRcdFx0XHRcdG51bWVyYXRvcihpblZpZXdJRHMpe1xuXHRcdFx0XHRcdFx0aWYgKCBpblZpZXdJRHMuc2l6ZSA9PT0gMCApe1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5taW47XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR2YXIgZmlsdGVyZWREYXRhID0gdGhpcy5kYXRhLmZpbHRlcihlYWNoID0+IGluVmlld0lEcy5oYXMoZWFjaC5wcm9wZXJ0aWVzLmlkKSksXG5cdFx0XHRcdFx0XHRcdG51bWJlck1hdGNoaW5nID0gMDtcblx0XHRcdFx0XHRcdGZpbHRlcmVkRGF0YS5mb3JFYWNoKGVhY2ggPT4ge1xuXHRcdFx0XHRcdFx0XHRpZiAoIGVhY2gucHJvcGVydGllcy50X2RlZCA8IDUgKXtcblx0XHRcdFx0XHRcdFx0XHRudW1iZXJNYXRjaGluZysrO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdHJldHVybiBudW1iZXJNYXRjaGluZztcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGRlbm9taW5hdG9yKGluVmlld0lEcyl7IC8vIGZvciB0aGlzIG9uZSBkZW5vbWluYXRvciBpcyBudW1iZXIgb2YgcG9saWNpZXMgaW4gdmlld1xuXHRcdFx0XHRcdFx0IHJldHVybiBpblZpZXdJRHMuc2l6ZTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHRleHRGdW5jdGlvbihuLGQpe1xuXHRcdFx0XHRcdFx0aWYgKGluVmlld0lEcy5zaXplID09PSAwKXtcblx0XHRcdFx0XHRcdFx0cmV0dXJuICdub25lIGluIHZpZXcnO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0cmV0dXJuIGAke2QzLmZvcm1hdChcIixcIikobil9IG9mICR7ZDMuZm9ybWF0KFwiLFwiKShkKX0gKCR7ZDMuZm9ybWF0KFwiLjAlXCIpKG4gLyBkKX0pYDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pLFxuXHRcdFx0XHRuZXcgQmFycy5CYXIoe1xuXHRcdFx0XHRcdHRpdGxlOiAnQXZlcmFnZSBwcmVtaXVtJywgXG5cdFx0XHRcdFx0bWFyZ2luOiB7XG5cdFx0XHRcdFx0XHR0b3A6MCxcblx0XHRcdFx0XHRcdHJpZ2h0OjEsXG5cdFx0XHRcdFx0XHRib3R0b206MCxcblx0XHRcdFx0XHRcdGxlZnQ6MSBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHpTY29yZXM6IGNhbGN1bGF0ZVpTY29yZXMoJ3ByZW0nLDIwMDApLFxuXHRcdFx0XHRcdG1pbigpe1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2codGhpcyk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy56U2NvcmVzLm1pbjtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGhlaWdodFRvV2lkdGg6IDAuMDUsXG5cdFx0XHRcdFx0Y29udGFpbmVyOiAnI3ByZW1pdW0tYmFyJyxcblx0XHRcdFx0XHRkYXRhOiBnZW9qc29uLmZlYXR1cmVzLFxuXHRcdFx0XHRcdG51bWVyYXRvcihpblZpZXdJRHMpe1xuXHRcdFx0XHRcdFx0aWYgKCBpblZpZXdJRHMuc2l6ZSA9PT0gMCApe1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5taW47XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR2YXIgZmlsdGVyZWREYXRhID0gdGhpcy5kYXRhLmZpbHRlcihlYWNoID0+IGluVmlld0lEcy5oYXMoZWFjaC5wcm9wZXJ0aWVzLmlkKSk7XG5cdFx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0cmV0dXJuIGQzLm1lYW4oZmlsdGVyZWREYXRhLCBkID0+IGQucHJvcGVydGllcy5wcmVtWik7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRkZW5vbWluYXRvcigpeyBcblx0XHRcdFx0XHRcdCByZXR1cm4gdGhpcy56U2NvcmVzLm1heDtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHRleHRGdW5jdGlvbihuKXsgXG5cdFx0XHRcdFx0XHRpZiAoaW5WaWV3SURzLnNpemUgPT09IDApe1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gJ25vbmUgaW4gdmlldyc7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZXR1cm4gJyQnICsgZDMuZm9ybWF0KFwiLC4yZlwiKSh0aGlzLnpTY29yZXMubWVhbiArIHRoaXMuelNjb3Jlcy5zZCAqIG4gKSArICcgKHogPSAnICsgZDMuZm9ybWF0KFwiLjJmXCIpKG4pICsgJyknO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSksXG5cdFx0XHRcdFxuXHRcdFx0XHRuZXcgQmFycy5CYXIoe1xuXHRcdFx0XHRcdHRpdGxlOiAnQXZlcmFnZSBob21lIHJlcGxhY2VtZW50IHZhbHVlJywgXG5cdFx0XHRcdFx0bWFyZ2luOiB7XG5cdFx0XHRcdFx0XHR0b3A6MCxcblx0XHRcdFx0XHRcdHJpZ2h0OjEsXG5cdFx0XHRcdFx0XHRib3R0b206MCxcblx0XHRcdFx0XHRcdGxlZnQ6MSBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHpTY29yZXM6IGNhbGN1bGF0ZVpTY29yZXMoJ3ZhbHVlJyw1NTAsMjAwMDAsWzI1MF0pLFxuXHRcdFx0XHRcdG1pbigpe1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy56U2NvcmVzLm1pbjtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGluZm9NYXJrOnRydWUsXG5cdFx0XHRcdFx0aGVpZ2h0VG9XaWR0aDogMC4wNSxcblx0XHRcdFx0XHRjb250YWluZXI6ICcjdmFsdWUtYmFyJyxcblx0XHRcdFx0XHRkYXRhOiBnZW9qc29uLmZlYXR1cmVzLFxuXHRcdFx0XHRcdG51bWVyYXRvcihpblZpZXdJRHMpe1xuXHRcdFx0XHRcdFx0aWYgKCBpblZpZXdJRHMuc2l6ZSA9PT0gMCApe1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5taW47XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR2YXIgZmlsdGVyZWREYXRhID0gdGhpcy5kYXRhLmZpbHRlcihlYWNoID0+IGluVmlld0lEcy5oYXMoZWFjaC5wcm9wZXJ0aWVzLmlkKSk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZDMubWVhbihmaWx0ZXJlZERhdGEsIGQgPT4gZC5wcm9wZXJ0aWVzLnZhbHVlWik7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRkZW5vbWluYXRvcigpeyBcblx0XHRcdFx0XHRcdCByZXR1cm4gdGhpcy56U2NvcmVzLm1heDtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHRleHRGdW5jdGlvbihuKXsgXG5cdFx0XHRcdFx0XHRpZiAoaW5WaWV3SURzLnNpemUgPT09IDApe1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gJ25vbmUgaW4gdmlldyc7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZXR1cm4gJyQnICsgZDMuZm9ybWF0KFwiLC4wZlwiKSgodGhpcy56U2NvcmVzLm1lYW4gKyB0aGlzLnpTY29yZXMuc2QgKiBuICkgKiAxMDAwICkgKyAnICh6ID0gJyArIGQzLmZvcm1hdChcIi4yZlwiKShuKSArICcpJztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pLFxuXHRcdFx0XHRuZXcgQmFycy5CYXIoe1xuXHRcdFx0XHRcdHRpdGxlOiAnQXZlcmFnZSBmbG9vZCBpbnN1cmFuY2UgY292ZXJhZ2UnLCBcblx0XHRcdFx0XHRtYXJnaW46IHtcblx0XHRcdFx0XHRcdHRvcDowLFxuXHRcdFx0XHRcdFx0cmlnaHQ6MSxcblx0XHRcdFx0XHRcdGJvdHRvbTowLFxuXHRcdFx0XHRcdFx0bGVmdDoxIFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aW5mb01hcms6dHJ1ZSxcblx0XHRcdFx0XHR6U2NvcmVzOiBjYWxjdWxhdGVaU2NvcmVzKCd0Y292JyxudWxsLG51bGwsW10pLFxuXHRcdFx0XHRcdC8qbWluKCl7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZDMubWluKHRoaXMuZGF0YSwgZCA9PiBkLnByb3BlcnRpZXMudGNvdik7XG5cdFx0XHRcdFx0fSwqL1xuXHRcdFx0XHRcdG1pbigpe1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy56U2NvcmVzLm1pbjtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGhlaWdodFRvV2lkdGg6IDAuMDUsXG5cdFx0XHRcdFx0Y29udGFpbmVyOiAnI2NvdmVyYWdlLWJhcicsXG5cdFx0XHRcdFx0ZGF0YTogZ2VvanNvbi5mZWF0dXJlcyxcblx0XHRcdFx0XHRudW1lcmF0b3IoaW5WaWV3SURzKXtcblx0XHRcdFx0XHRcdGlmICggaW5WaWV3SURzLnNpemUgPT09IDAgKXtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMubWluO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0dGhpcy5maWx0ZXJlZERhdGEgPSB0aGlzLmRhdGEuZmlsdGVyKGVhY2ggPT4gaW5WaWV3SURzLmhhcyhlYWNoLnByb3BlcnRpZXMuaWQpKTtcblx0XHRcdFx0XHRcdHJldHVybiBkMy5tZWFuKHRoaXMuZmlsdGVyZWREYXRhLCBkID0+IGQucHJvcGVydGllcy50Y292Wik7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRkZW5vbWluYXRvcigpeyBcblx0XHRcdFx0XHRcdCByZXR1cm4gdGhpcy56U2NvcmVzLm1heDtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHRleHRGdW5jdGlvbihuKXsgXG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdGlmIChpblZpZXdJRHMuc2l6ZSA9PT0gMCl7XG5cdFx0XHRcdFx0XHRcdHJldHVybiAnbm9uZSBpbiB2aWV3Jztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybiAnJCcgKyBkMy5mb3JtYXQoXCIsLjBmXCIpKCh0aGlzLnpTY29yZXMubWVhbiArIHRoaXMuelNjb3Jlcy5zZCAqIG4gKSAqIDEwMDAgKSArICcgKHogPSAnICsgZDMuZm9ybWF0KFwiLjJmXCIpKG4pICsgJyknO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSksXG5cdFx0XHRcdG5ldyBCYXJzLkJhcih7XG5cdFx0XHRcdFx0dGl0bGU6ICdBdmVyYWdlIG1lZGlhbiBob3VzZWhvbGQgaW5jb21lJywgXG5cdFx0XHRcdFx0bWFyZ2luOiB7XG5cdFx0XHRcdFx0XHR0b3A6MCxcblx0XHRcdFx0XHRcdHJpZ2h0OjEsXG5cdFx0XHRcdFx0XHRib3R0b206MCxcblx0XHRcdFx0XHRcdGxlZnQ6MSBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGluZm9NYXJrOnRydWUsXG5cdFx0XHRcdFx0elNjb3JlczogKGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHR2YXIgbWVhbiA9IGQzLm1lYW4oWy4uLm1lZGlhbkluY29tZXMudmFsdWVzKCldKTtcblx0XHRcdFx0XHRcdHZhciBzZCA9IGQzLmRldmlhdGlvbihbLi4ubWVkaWFuSW5jb21lcy52YWx1ZXMoKV0pO1xuXHRcdFx0XHRcdFx0dmFyIG1pbixcblx0XHRcdFx0XHRcdFx0bWF4LFxuXHRcdFx0XHRcdFx0XHRjdXRvZmZaID0gKCAxNTAwMDAgLSBtZWFuICkgLyBzZDtcblx0XHRcdFx0XHRcdGdlb2pzb24uZmVhdHVyZXMuZm9yRWFjaChlYWNoID0+IHtcblx0XHRcdFx0XHRcdFx0Ly8gc29tZSBtZWRfaW5jb21lcyBhcmUgcmVjb3JkZWQgYXMgemVybzsgdGhleSBzaG91bGQgYmUgaWdub3JlZFxuXHRcdFx0XHRcdFx0XHRpZiAoIGVhY2gucHJvcGVydGllcy5tZWRfaW5jb21lID4gMCApe1xuXHRcdFx0XHRcdFx0XHRcdGVhY2gucHJvcGVydGllcy5tZWRfaW5jb21lWiA9ICggZWFjaC5wcm9wZXJ0aWVzLm1lZF9pbmNvbWUgLSBtZWFuICkgLyBzZDtcblx0XHRcdFx0XHRcdFx0XHRtaW4gPSBlYWNoLnByb3BlcnRpZXMubWVkX2luY29tZVogPCBtaW4gfHwgbWluID09PSB1bmRlZmluZWQgPyBlYWNoLnByb3BlcnRpZXMubWVkX2luY29tZVogOiBtaW47XG5cdFx0XHRcdFx0XHRcdFx0bWF4ID0gZWFjaC5wcm9wZXJ0aWVzLm1lZF9pbmNvbWVaID4gbWF4IHx8IG1heCA9PT0gdW5kZWZpbmVkID8gZWFjaC5wcm9wZXJ0aWVzLm1lZF9pbmNvbWVaIDogbWF4O1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdGVhY2gucHJvcGVydGllcy5tZWRfaW5jb21lWiA9IG51bGw7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0bWF4ID0gbWF4IDwgY3V0b2ZmWiA/IG1heCA6IGN1dG9mZlo7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyh7XG5cdFx0XHRcdFx0XHRcdG1pbixcblx0XHRcdFx0XHRcdFx0bWF4LFxuXHRcdFx0XHRcdFx0XHRtZWFuLFxuXHRcdFx0XHRcdFx0XHRzZFxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0XHRtaW46IC0yLjMzLFxuXHRcdFx0XHRcdFx0XHRtYXg6IDIuMzMsXG5cdFx0XHRcdFx0XHRcdG1lYW4sXG5cdFx0XHRcdFx0XHRcdHNkXG5cdFx0XHRcdFx0XHR9O1xuXHRcdFx0XHRcdH0pKCksXG5cdFx0XHRcdFx0bWluKCl7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy56U2NvcmVzLm1pbjtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGhlaWdodFRvV2lkdGg6IDAuMDUsXG5cdFx0XHRcdFx0Y29udGFpbmVyOiAnI2luY29tZS1iYXInLFxuXHRcdFx0XHRcdGRhdGE6IGdlb2pzb24uZmVhdHVyZXMsXG5cdFx0XHRcdFx0bnVtZXJhdG9yKGluVmlld0lEcyl7XG5cdFx0XHRcdFx0XHRpZiAoIGluVmlld0lEcy5zaXplID09PSAwICl7XG5cdFx0XHRcdFx0XHRcdHJldHVybiB0aGlzLm1pbjtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHZhciByZXByZXNlbnRlZFRyYWN0cyA9IG5ldyBTZXQoKTtcblx0XHRcdFx0XHRcdHZhciBtZWRJbmNvbWVaQXJyYXkgPSBbXTtcblx0XHRcdFx0XHRcdGluVmlld0lEcy5mb3JFYWNoKGlkID0+IHtcblx0XHRcdFx0XHRcdFx0dmFyIG1hdGNoaW5nRmVhdHVyZSA9IGZlYXR1cmVQcm9wZXJ0aWVzQnlJZC5nZXQoaWQpO1xuXHRcdFx0XHRcdFx0XHRpZiAoICFyZXByZXNlbnRlZFRyYWN0cy5oYXMobWF0Y2hpbmdGZWF0dXJlLmNlbl90cmFjdCkgKXtcblx0XHRcdFx0XHRcdFx0XHRyZXByZXNlbnRlZFRyYWN0cy5hZGQobWF0Y2hpbmdGZWF0dXJlLmNlbl90cmFjdCk7XG5cdFx0XHRcdFx0XHRcdFx0bWVkSW5jb21lWkFycmF5LnB1c2gobWF0Y2hpbmdGZWF0dXJlLm1lZF9pbmNvbWVaKTsgLy8gcHVzaGVzIGluY29tZSBmcm9tIG9ubHkgb25lIHJlcHJlc2VudGF0aXZlXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ICAvL1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdtZWRJbmNvbWVaQXJyYXknLG1lZEluY29tZVpBcnJheSk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZDMubWVhbihtZWRJbmNvbWVaQXJyYXkpO1xuXG5cdFx0XHRcdFx0XHQvL3RoaXMubWVkaWFuSW5jb21lc0luVmlldyA9IGNhbGN1bGF0ZU1lZGlhbkluY29tZXMoaW5WaWV3SURzKTtcblx0XHRcdFx0XHRcdC8vcmV0dXJuIGQzLm1lYW4odGhpcy5tZWRpYW5JbmNvbWVzSW5WaWV3KTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGRlbm9taW5hdG9yKCl7IFxuXHRcdFx0XHRcdFx0IHJldHVybiB0aGlzLnpTY29yZXMubWF4O1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0dGV4dEZ1bmN0aW9uKG4peyBcblx0XHRcdFx0XHRcdGlmIChpblZpZXdJRHMuc2l6ZSA9PT0gMCl7XG5cdFx0XHRcdFx0XHRcdHJldHVybiAnbm9uZSBpbiB2aWV3Jztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdHJldHVybiAnJCcgKyBkMy5mb3JtYXQoXCIsLjBmXCIpKHRoaXMuelNjb3Jlcy5tZWFuICsgdGhpcy56U2NvcmVzLnNkICogbiApICsgJyAoeiA9ICcgKyBkMy5mb3JtYXQoXCIuMmZcIikobikgKyAnKSc7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KSxcblx0XHRcdFx0bmV3IEJhcnMuQmFyKHtcblx0XHRcdFx0XHR0aXRsZTogJ0F2ZXJhZ2UgbWFyZ2luYWwgY29zdCBmb3IgbG93ZXIgZGVkdWN0aWJsZScsIFxuXHRcdFx0XHRcdG1hcmdpbjoge1xuXHRcdFx0XHRcdFx0dG9wOjAsXG5cdFx0XHRcdFx0XHRyaWdodDoxLFxuXHRcdFx0XHRcdFx0Ym90dG9tOjAsXG5cdFx0XHRcdFx0XHRsZWZ0OjEgXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR6U2NvcmVzOiBjYWxjdWxhdGVaU2NvcmVzKCdkZHAnLG51bGwsbnVsbCxbXSksXG5cdFx0XHRcdFx0LyptaW4oKXtcblx0XHRcdFx0XHRcdHJldHVybiBkMy5taW4odGhpcy5kYXRhLCBkID0+IGQucHJvcGVydGllcy50Y292KTtcblx0XHRcdFx0XHR9LCovXG5cdFx0XHRcdFx0bWluKCl7XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLnpTY29yZXMubWluO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aGVpZ2h0VG9XaWR0aDogMC4wNSxcblx0XHRcdFx0XHRjb250YWluZXI6ICcjbWFyZ2luYWwtYmFyJyxcblx0XHRcdFx0XHRkYXRhOiBnZW9qc29uLmZlYXR1cmVzLFxuXHRcdFx0XHRcdG51bWVyYXRvcihpblZpZXdJRHMpe1xuXHRcdFx0XHRcdFx0aWYgKCBpblZpZXdJRHMuc2l6ZSA9PT0gMCApe1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5taW47XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR0aGlzLmZpbHRlcmVkRGF0YSA9IHRoaXMuZGF0YS5maWx0ZXIoZWFjaCA9PiBpblZpZXdJRHMuaGFzKGVhY2gucHJvcGVydGllcy5pZCkpO1xuXHRcdFx0XHRcdFx0cmV0dXJuIGQzLm1lYW4odGhpcy5maWx0ZXJlZERhdGEsIGQgPT4gZC5wcm9wZXJ0aWVzLmRkcFopO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0ZGVub21pbmF0b3IoKXsgXG5cdFx0XHRcdFx0XHQgcmV0dXJuIHRoaXMuelNjb3Jlcy5tYXg7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR0ZXh0RnVuY3Rpb24obil7IFxuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRpZiAoaW5WaWV3SURzLnNpemUgPT09IDApe1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gJ25vbmUgaW4gdmlldyc7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRyZXR1cm4gJyQnICsgZDMuZm9ybWF0KFwiLC4wZlwiKSgodGhpcy56U2NvcmVzLm1lYW4gKyB0aGlzLnpTY29yZXMuc2QgKiBuICkgKSArICcgKHogPSAnICsgZDMuZm9ybWF0KFwiLjJmXCIpKG4pICsgJyknO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSlcblxuXHRcdFx0KTsgLy8gZW5kIHB1c2hcblx0XHRcdGdhdGVDaGVjaysrO1xuXHRcdFx0dmFyIGluZm9ybWF0aW9uID0ge1xuXHRcdFx0XHRtYXBmZWF0dXJlOiAnVGhpcyBtYXAgcmVwcmVzZW50cyBuZXcgZmxvb2QgaW5zdXJhbmNlIHBvbGljaWVzIGluaXRpYXRlZCBiZXR3ZWVuIEp1bmUgYW5kIERlY2VtYmVyIDIwMTQuIFRoZSBhbmFseXNpcyBpbiB0aGUgcmVsYXRlZCBwYXBlciByZXZvbHZlcyBhcm91bmQgdGhlIGRlY2lzaW9uIHdoZXRoZXIgdG8gcGF5IG1vcmUgZm9yIGEgbG93ZXIgZGVkdWN0aWJsZS4nLFxuXHRcdFx0XHRkZWR1Y3RpYmxlYmFyOiAnVGhlIHN0YW5kYXJkIGRlZHVjdGlibGUgaXMgJDUsMDAwOyBhbnl0aGluZyBsZXNzIGlzIGNvbnNpZGVyIGEgbG93IGRlZHVjdGlibGUuJyxcblx0XHRcdFx0dmFsdWViYXI6ICdUaGlzIGNhbGN1bGF0aW9uIGlnbm9yZXMgZXh0cmVtZSBvdXRsaWVycyAodmFsdWVzIGFib3ZlICQyME0pIHdoaWNoIGFyZSBsaWtlbHkgZHVlIHRvIGRhdGEgZXJyb3JzOyBpdCBhbHNvIGlnbm9yZXMgb3ZlcnJlcHJlc2VudGVkIHZhbHVlcyBvZiAkMjUwLDAwMCwgdGhlIG1ham9yaXR5IG9mIHdoaWNoIGFyZSBsaWtlbHkgZHVlIHRvIHJlcG9ydGluZyBlcnJvcnMuJyxcblx0XHRcdFx0aW5jb21lYmFyOiAnTWVkaWFuIGhvdXNlaG9sZCBpbmNvbWUgaXMgYSBwcm9wZXJ0eSBvZiB0aGUgY2Vuc3VzIHRyYWN0IGluIHdoaWNoIHRoZSBwb2xpY3lob2xkZXIgcmVzaWRlcy4gRWFjaCBjZW5zdXMgdHJhY3Qgd2l0aCBhbiBhc3NvY2lhdGVkIHBvbGljeSBpbiB2aWV3IGlzIGNvdW50ZWQgb25jZS4nLFxuXHRcdFx0XHRjb3ZlcmFnZWJhcjogJ0Zsb29kIGNvdmVyYWdlIGlzIGxpbWl0ZWQgdG8gJDI1MCwwMDAuJ1xuXHRcdFx0fTtcblx0XHRcdHZhciBpbmZvTWFya3MgPSBkMy5zZWxlY3RBbGwoJy5oYXMtaW5mby1tYXJrJylcblx0XHRcdFx0LmFwcGVuZCgnc3ZnJylcblx0XHRcdFx0LmRhdHVtKGluZm9ybWF0aW9uKVxuXHRcdFx0XHQuYXR0cignd2lkdGgnLCcxMnB4Jylcblx0XHRcdFx0LmF0dHIoJ3ZpZXdCb3gnLCAnMCAwIDEyIDEyJylcblx0XHRcdFx0LmF0dHIoJ2NsYXNzJywnaW5mby1tYXJrJyk7XG5cdFx0XHRcdFxuXG5cdFx0XHRpbmZvTWFya3Ncblx0XHRcdFx0LmFwcGVuZCgnY2lyY2xlJylcblx0XHRcdFx0LmF0dHIoJ2NsYXNzJywgJ2luZm8tbWFyay1iYWNrZ3JvdW5kJykgXG5cdFx0XHRcdC5hdHRyKCdjeCcsNilcblx0XHRcdFx0LmF0dHIoJ2N5Jyw2KVxuXHRcdFx0XHQuYXR0cigncicsNilcblx0XHRcdFx0LmNhbGwodGlwKVxuXHRcdFx0XHQub24oJ21vdXNlZW50ZXInLCBmdW5jdGlvbihkKXtcblx0XHRcdFx0XHRjb25zb2xlLmxvZyhkMy5ldmVudCk7XG5cdFx0XHRcdFx0dGlwLnNob3cuY2FsbCh0aGlzLGQpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQub24oJ21vdXNlbGVhdmUnLCB0aXAuaGlkZSk7ICBcblxuXHRcdFx0aW5mb01hcmtzXG5cdFx0XHRcdC5hcHBlbmQoJ3BhdGgnKVxuXHRcdFx0XHQuYXR0cignY2xhc3MnLCdpbmZvLW1hcmstZm9yZWdyb3VuZCcpXG5cdFx0XHRcdC5hdHRyKCdkJywgYE01LjIzMSw3LjYxNFY2LjkxNWMwLTAuMzY0LDAuMDg0LTAuNzAyLDAuMjU0LTEuMDE2YzAuMTY5LTAuMzEzLDAuMzU1LTAuNjEzLDAuNTU5LTAuOTAyXG5cdFx0XHRcdFx0XHRcdGMwLjIwMy0wLjI4NywwLjM5LTAuNTY0LDAuNTU5LTAuODMxQzYuNzcyLDMuOSw2Ljg1NywzLjYzMSw2Ljg1NywzLjM2YzAtMC4xOTUtMC4wODEtMC4zNTctMC4yNDItMC40ODlcblx0XHRcdFx0XHRcdFx0QzYuNDU1LDIuNzQsNi4yNjgsMi42NzQsNi4wNTcsMi42NzRjLTAuMTUzLDAtMC4yODgsMC4wMzQtMC40MDcsMC4xMDJjLTAuMTE4LDAuMDY4LTAuMjIyLDAuMTU1LTAuMzExLDAuMjZcblx0XHRcdFx0XHRcdFx0QzUuMjUsMy4xNDIsNS4xNzcsMy4yNjEsNS4xMTcsMy4zOTJjLTAuMDYsMC4xMzEtMC4wOTcsMC4yNjQtMC4xMTQsMC40bC0xLjQ2LTAuNDA3QzMuNzA0LDIuNzUsNC4wMDgsMi4yNjEsNC40NTcsMS45MTlcblx0XHRcdFx0XHRcdFx0YzAuNDQ4LTAuMzQzLDEuMDE2LTAuNTE1LDEuNzAxLTAuNTE1YzAuMzEzLDAsMC42MDcsMC4wNDQsMC44ODIsMC4xMzNDNy4zMTYsMS42MjYsNy41NiwxLjc1Niw3Ljc3MSwxLjkyNVxuXHRcdFx0XHRcdFx0XHRDNy45ODIsMi4wOTUsOC4xNSwyLjMwNiw4LjI3MiwyLjU2YzAuMTIzLDAuMjU0LDAuMTg1LDAuNTQ2LDAuMTg1LDAuODc2YzAsMC40MjMtMC4wOTYsMC43ODUtMC4yODYsMS4wODVcblx0XHRcdFx0XHRcdFx0Yy0wLjE5MSwwLjMwMS0wLjQsMC41ODYtMC42MjksMC44NTdDNy4zMTQsNS42NSw3LjEwNCw1LjkyMyw2LjkxNCw2LjE5OFM2LjYyOCw2Ljc4OSw2LjYyOCw3LjE0NHYwLjQ3SDUuMjMxeiBNNS4wNzksMTAuNjk5VjguODk2XG5cdFx0XHRcdFx0XHRcdGgxLjc1MnYxLjgwM0g1LjA3OXpgXG5cdFx0XHRcdCk7XG5cblx0XHRcdC8qZDMuc2VsZWN0QWxsKCcuZmlndXJlLXRpdGxlLmhhcy1pbmZvLW1hcmsnKVxuXHRcdFx0XHQuYXBwZW5kKCdhJylcblx0XHRcdFx0LmF0dHIoJ3RpdGxlJywgZnVuY3Rpb24oKXtcblx0XHRcdFx0XHRyZXR1cm4gaW5mb3JtYXRpb25bZDMuc2VsZWN0KHRoaXMucGFyZW50Tm9kZS5wYXJlbnROb2RlKS5hdHRyKCdpZCcpLnJlcGxhY2UoJy0nLCcnKV07XG5cdFx0XHRcdH0pXG5cdFx0XHRcdC5hdHRyKCdocmVmJywnIycpXG5cdFx0XHRcdC5hdHRyKCdjbGFzcycsJ2luZm8tbWFyayBzbWFsbCcpXG5cdFx0XHRcdC50ZXh0KCc/Jyk7XG5cdFx0XHRkMy5zZWxlY3RBbGwoJy5pbmZvLW1hcmsnKVxuXHRcdFx0XHQub24oJ2NsaWNrJywoKSA9PiB7XG5cdFx0XHRcdFx0ZDMuZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdFx0fSk7Ki9cblxuXHRcdFx0Z2F0ZSgpO1xuXHRcdFx0Ly9hZGRDbHVzdGVyTGF5ZXJzKHJ0bik7XG5cdFx0XHRcblx0XHR9KTsgLy8gZW5kIGQzIGNzdlxuXHR9IC8vIGVuZCB0b0dlb0pTT05cblx0Lyp2YXIgZmVhdHVyZXNJblZpZXcgPSB7XG5cdFx0cmVuZGVyKCl7XG5cdFx0XHR0aGlzLmNoYXJ0ID0gbmV3IEJhcnMuQmFyKHtcblx0XHRcdFx0bWFyZ2luOiB7XG5cdFx0XHRcdFx0dG9wOjAsXG5cdFx0XHRcdFx0cmlnaHQ6MCxcblx0XHRcdFx0XHRib3R0b206MCxcblx0XHRcdFx0XHRsZWZ0OjBcblx0XHRcdFx0fSxcblx0XHRcdFx0aGVpZ2h0VG9XaWR0aDogMC4wMyxcblx0XHRcdFx0Y29udGFpbmVyOiAnI3RvdGFsLXZpZXcnLFxuXHRcdFx0XHR0b3RhbDogZ2VvanNvbi5mZWF0dXJlcy5sZW5ndGhcblx0XHRcdH0pO1xuXG5cdFx0XHQvKnRoaXMudG90YWwgPSBnZW9qc29uLmZlYXR1cmVzLmxlbmd0aDtcblx0XHRcdHRoaXMuc3ZnID0gZDMuc2VsZWN0KCcjdG90YWwtdmlldycpXG5cdFx0XHRcdC5hcHBlbmQoJ3N2ZycpXG5cdFx0XHRcdC5hdHRyKCd3aWR0aCcsICcxMDAlJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3htbG5zJywnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnKVxuXHQgICAgICAgICAgICAuYXR0cigndmVyc2lvbicsJzEuMScpIFxuXHQgICAgICAgICAgICAuYXR0cigndmlld0JveCcsICcwIDAgMTAwIDMnKTtcblxuXHQgICAgICAgIHRoaXMuYmFja2dyb3VuZCA9IHRoaXMuc3ZnLmFwcGVuZCgnbGluZScpXG5cdCAgICAgICAgXHQuY2xhc3NlZCgnYmFja2dyb3VuZC1saW5lJywgdHJ1ZSlcblx0ICAgICAgICBcdC5hdHRyKCd4MCcsMClcblx0ICAgICAgICBcdC5hdHRyKCd5MCcsMClcblx0ICAgICAgICBcdC5hdHRyKCd4MScsMTAwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kxJywwKTtcblxuXHQgICAgICAgIHRoaXMubGluZSA9IHRoaXMuc3ZnLmFwcGVuZCgnbGluZScpXG5cdCAgICAgICAgXHQuY2xhc3NlZCgndG90YWwtbGluZScsIHRydWUpXG5cdCAgICAgICAgXHQuYXR0cigneDAnLDApXG5cdCAgICAgICAgXHQuYXR0cigneTAnLDApXG5cdCAgICAgICAgXHQuYXR0cigneDEnLDApXG5cdCAgICAgICAgXHQuYXR0cigneTEnLDApO1xuXG5cdCAgICAgICAgdGhpcy50ZXh0ID0gZDMuc2VsZWN0KCcjdG90YWwtdmlldycpXG5cdCAgICAgICAgXHQuYXBwZW5kKCdzcGFuJylcblx0ICAgICAgICBcdC50ZXh0KCgpID0+IGAke2QzLmZvcm1hdChcIixcIikodGhpcy50b3RhbCl9IG9mICR7ZDMuZm9ybWF0KFwiLFwiKSh0aGlzLnRvdGFsKX0gaW4gdmlld2AgKTtcblx0ICAgICAgICBcdFxuXG5cdFx0XHR0aGlzLnVwZGF0ZShjb3VudEZlYXR1cmVzKCkpO1xuXHRcdH0sXG5cdFx0dXBkYXRlKG4pe1xuXHRcdFx0LypkMy5zZWxlY3QoJyN0b3RhbC1pbi12aWV3Jylcblx0XHRcdFx0LnRleHQoKCkgPT4gZDMuZm9ybWF0KFwiLFwiKShuKSArICcgb2YgJyArIGQzLmZvcm1hdChcIixcIikodGhpcy50b3RhbCkgKyAnIHByb3BlcnRpZXMgaW4gdmlldycpOyovXG5cdFx0XHQvKnRoaXMubGluZVxuXHRcdFx0XHQudHJhbnNpdGlvbigpLmR1cmF0aW9uKDIwMClcblx0XHRcdFx0LmF0dHIoJ3gxJywgKCkgPT4gKCBuIC8gdGhpcy50b3RhbCkgKiAxMDAgKTtcblx0XHRcdHRoaXMudGV4dFxuXHRcdFx0XHQudGV4dCgoKSA9PiBgJHtkMy5mb3JtYXQoXCIsXCIpKG4pfSBvZiAke2QzLmZvcm1hdChcIixcIikodGhpcy50b3RhbCl9IGluIHZpZXdgICk7XG4gIFxuXHRcdH0qLyBcblxuXHRcblx0dmFyIGluVmlld0lEcyA9IG5ldyBTZXQoKTtcblx0ZnVuY3Rpb24gY291bnRGZWF0dXJlcygpeyBcblx0XHQvKiBqc2hpbnQgbGF4YnJlYWs6dHJ1ZSAqL1xuXHRcdGluVmlld0lEcy5jbGVhcigpOyBcblx0XHQvL3ZhciBjb3VudCA9IDA7XG5cdFx0dmFyIGJvdW5kcyA9IHRoZU1hcC5nZXRCb3VuZHMoKTtcblx0XHRnZW9qc29uLmZlYXR1cmVzLmZvckVhY2goZWFjaCA9PiB7XG5cdFx0XHRpZiAoICAgIGVhY2gucHJvcGVydGllcy5sb25naXR1ZGUgPj0gYm91bmRzLl9zdy5sbmcgXG5cdFx0XHRcdCAmJiBlYWNoLnByb3BlcnRpZXMubG9uZ2l0dWRlIDw9IGJvdW5kcy5fbmUubG5nIFxuXHRcdFx0XHQgJiYgZWFjaC5wcm9wZXJ0aWVzLmxhdGl0dWRlICA+PSBib3VuZHMuX3N3LmxhdCBcblx0XHRcdFx0ICYmIGVhY2gucHJvcGVydGllcy5sYXRpdHVkZSAgPD0gYm91bmRzLl9uZS5sYXQgKXtcblx0XHRcdFx0aW5WaWV3SURzLmFkZChlYWNoLnByb3BlcnRpZXMuaWQpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdGNvbnNvbGUubG9nKGluVmlld0lEcyk7XG5cdH1cblx0dGhlTWFwLm9uKCdtb3ZlZW5kJywgZnVuY3Rpb24oKXtcblx0XHR1cGRhdGVBbGwoKTtcblx0fSk7XG5cdHRoZU1hcC5vbignem9vbWVuZCcsIGZ1bmN0aW9uKGFyZyl7XG5cdFx0Y29uc29sZS5sb2coYXJnKTtcblx0XHR1cGRhdGVBbGwoKTtcblx0XHRkMy5zZWxlY3QoJyNzaXplLWxlZ2VuZCcpXG5cdFx0XHQuY2xhc3NlZCgnc2hvdycsIHRoZU1hcC5nZXRab29tKCkgPj0gc2l6ZVpvb21UaHJlc2hvbGQpO1xuXHR9KTtcblx0ZnVuY3Rpb24gdXBkYXRlQWxsKCl7XG5cdFx0Y291bnRGZWF0dXJlcygpO1xuXHRcdHRoZUNoYXJ0cy5mb3JFYWNoKGVhY2ggPT4gZWFjaC51cGRhdGUoaW5WaWV3SURzKSk7XG5cdH1cblx0dGhlTWFwLm9uKFwibW91c2Vtb3ZlXCIsIFwicG9pbnRzLWRhdGEtZHJpdmVuXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgfSk7XG5cblx0cmV0dXJuIHRoZU1hcDtcbiAgIFxufSgpKTsgLy8gZW5kIElJRkUgIiwiZXhwb3J0IGNvbnN0IEJhcnMgPSAoZnVuY3Rpb24oKXtcblxuXHR2YXIgQmFyID0gZnVuY3Rpb24oY29uZmlnT2JqZWN0KXsgLy8gbWFyZ2lucyB7fSwgaGVpZ2h0ICMsIHdpZHRoICMsIGNvbnRhaW5lcklELCBkYXRhUGF0aFxuXHQgICAgdGhpcy5zZXR1cChjb25maWdPYmplY3QpO1xuXHR9O1xuXG5cdEJhci5wcm90b3R5cGUgPSB7XG5cdFx0c2V0dXAoY29uZmlnT2JqZWN0KXsgLy8gc29tZSBvZiBzZXR1cCBpcyBjb21tb24gdG8gYWxsIGNoYXJ0cyBhbmQgY291bGQgYmUgaGFuZGxlZCBieSBwcm90b3R5cGljYWwgaW5oZXJpdGFuY2Vcblx0ICAgIFx0Y29uc29sZS5sb2coY29uZmlnT2JqZWN0KTtcblx0ICAgICAgICB2YXIgdmlld0JveCA9ICcwIDAgMTAwICcgKyBNYXRoLnJvdW5kKGNvbmZpZ09iamVjdC5oZWlnaHRUb1dpZHRoICogMTAwKTtcblx0ICAgICAgICB0aGlzLmNvbnRhaW5lciA9IGNvbmZpZ09iamVjdC5jb250YWluZXI7XG5cdCAgICAgICAgdGhpcy5tYXJnaW4gPSBjb25maWdPYmplY3QubWFyZ2luO1xuXHQgICAgICAgIHRoaXMud2lkdGggPSAxMDAgLSB0aGlzLm1hcmdpbi5sZWZ0IC0gdGhpcy5tYXJnaW4ucmlnaHQ7XG5cdCAgICAgICAgdGhpcy5oZWlnaHQgPSBjb25maWdPYmplY3QuaGVpZ2h0VG9XaWR0aCAqIDEwMCAtIHRoaXMubWFyZ2luLnRvcCAtIHRoaXMubWFyZ2luLmJvdHRvbTtcblx0ICAgICAgICB0aGlzLnRpdGxlID0gY29uZmlnT2JqZWN0LnRpdGxlO1xuXHQgICAgICAgIHRoaXMuaW5mb01hcmsgPSBjb25maWdPYmplY3QuaW5mb01hcmsgfHwgZmFsc2U7XG5cdCAgICAgICAgdGhpcy5jb21wYXJhdG9yID0gY29uZmlnT2JqZWN0LmNvbXBhcmF0b3I7XG5cdCAgICAgICAgdGhpcy50cnVuY2F0ZVJpZ2h0ID0gY29uZmlnT2JqZWN0LnRydW5jYXRlUmlnaHQgfHwgZmFsc2U7XG5cdCAgICAgICAgdGhpcy5iYWNrZ3JvdW5kQ29sb3IgPSBjb25maWdPYmplY3QuYmFja2dyb3VuZENvbG9yIHx8ICdncmF5Jztcblx0ICAgICAgICB0aGlzLmRhdGEgPSBjb25maWdPYmplY3QuZGF0YTtcblx0ICAgICAgICB0aGlzLm51bWVyYXRvciA9IGNvbmZpZ09iamVjdC5udW1lcmF0b3I7XG5cdCAgICAgICAgdGhpcy5kZW5vbWluYXRvciA9IGNvbmZpZ09iamVjdC5kZW5vbWluYXRvcjtcblx0ICAgICAgICB0aGlzLnRleHRGdW5jdGlvbiA9IGNvbmZpZ09iamVjdC50ZXh0RnVuY3Rpb247XG5cdCAgICAgICAgdGhpcy56U2NvcmVzID0gY29uZmlnT2JqZWN0LnpTY29yZXMgfHwgbnVsbDtcblx0ICAgICAgICB0aGlzLm1pbiA9IGNvbmZpZ09iamVjdC5taW4gPyBjb25maWdPYmplY3QubWluLmNhbGwodGhpcykgOiAwO1xuXHQgICAgICAgIC8vdGhpcy5tYXggPSBjb25maWdPYmplY3QubWF4ID8gY29uZmlnT2JqZWN0Lm1heC5jYWxsKHRoaXMpIDogMTAwO1xuXHQgICAgICAgIC8vdGhpcy5zY2FsZSA9IGQzLnNjYWxlTGluZWFyKCkuZG9tYWluKFt0aGlzLm1pbix0aGlzLm1heF0pLnJhbmdlKFswLHRoaXMud2lkdGhdKTtcblx0ICAgICAgICBcblxuXHQgICAgICAgIGQzLnNlbGVjdCh0aGlzLmNvbnRhaW5lcilcblx0ICAgICAgICBcdC5hcHBlbmQoJ3NwYW4nKVxuXHQgICAgICAgIFx0LmNsYXNzZWQoJ2ZpZ3VyZS10aXRsZScsIHRydWUpXG5cdCAgICAgICAgXHQuY2xhc3NlZCgnaGFzLWluZm8tbWFyaycsICgpID0+IHRoaXMuaW5mb01hcmspXG5cdCAgICAgICAgXHQudGV4dCh0aGlzLnRpdGxlKTtcblxuXHQgICAgICAgIHRoaXMuc3ZnID0gZDMuc2VsZWN0KHRoaXMuY29udGFpbmVyKVxuXHQgICAgICAgICAgICAuYXBwZW5kKCdzdmcnKVxuXHQgICAgICAgICAgICAuYXR0cignd2lkdGgnLCAnMTAwJScpXG5cdCAgICAgICAgICAgIC5hdHRyKCd4bWxucycsJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3ZlcnNpb24nLCcxLjEnKVxuXHQgICAgICAgICAgICAuYXR0cigndmlld0JveCcsIHZpZXdCb3gpXG5cdCAgICAgICAgICAgIC5hcHBlbmQoJ2cnKVxuXHQgICAgICAgICAgICAuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgdGhpcy5tYXJnaW4ubGVmdCArICcsJyArIHRoaXMubWFyZ2luLnRvcCArICcpJyk7XG5cblx0ICAgICAgICB0aGlzLmJhY2tncm91bmQgPSB0aGlzLnN2Zy5hcHBlbmQoJ2xpbmUnKVxuXHQgICAgICAgIFx0LmNsYXNzZWQoJ2JhY2tncm91bmQtbGluZS0nICsgdGhpcy5iYWNrZ3JvdW5kQ29sb3IsIHRydWUpXG5cdCAgICAgICAgXHQuYXR0cigneDAnLDApXG5cdCAgICAgICAgXHQuYXR0cigneTAnLDApXG5cdCAgICAgICAgXHQuYXR0cigneDEnLHRoaXMud2lkdGgpXG5cdCAgICAgICAgXHQuYXR0cigneTEnLDApO1xuXG5cdCAgICAgICAgdGhpcy5saW5lID0gdGhpcy5zdmcuYXBwZW5kKCdsaW5lJylcblx0ICAgICAgICBcdC5jbGFzc2VkKCdmb3JlZ3JvdW5kLWxpbmUnLCB0cnVlKVxuXHQgICAgICAgIFx0LmF0dHIoJ3gwJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kwJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3gxJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kxJywwKTtcblxuXHQgICAgICAgIHRoaXMudGV4dCA9IGQzLnNlbGVjdCh0aGlzLmNvbnRhaW5lcilcblx0ICAgICAgICBcdC5hcHBlbmQoJ3NwYW4nKVxuXHQgICAgICAgIFx0LmF0dHIoJ2NsYXNzJywndmFsdWUnKTtcblx0ICAgICAgICBcdFxuXG5cdCAgICAgICAgLy90aGlzLnVwZGF0ZSh0aGlzLm51bWVyYXRvcigpKTsgIFxuICAgICAgICB9LFxuICAgICAgICB1cGRhdGUoaW5WaWV3SURzKXtcbiAgICAgICAgXHRjb25zb2xlLmxvZyh0aGlzKTtcblx0XHRcdHZhciBuID0gdGhpcy5udW1lcmF0b3IoaW5WaWV3SURzKSxcblx0XHRcdFx0ZCA9IHRoaXMuZGVub21pbmF0b3IoaW5WaWV3SURzKTsgXG5cdFx0XHRkMy5zZWxlY3QodGhpcy5jb250YWluZXIpXG5cdFx0XHRcdC5jbGFzc2VkKCdvdmVyZmxvdycsIG4gPiBkICk7XG5cbiAgICAgICAgXHRpZiAodGhpcy50cnVuY2F0ZVJpZ2h0KXtcbiAgICAgICAgXHRcdGQgPSB0aGlzLm1pbiA9IDAgLSBkO1xuICAgICAgICBcdH0gZWxzZSBpZiAoIHRoaXMubWluIDwgMCAmJiBkID4gMCApIHtcbiAgICAgICAgXHRcdGlmIChNYXRoLmFicyh0aGlzLm1pbikgPCBkKSB7XG4gICAgICAgIFx0XHRcdHRoaXMubWluID0gMCAtIGQ7XG4gICAgICAgIFx0XHR9IGVsc2Uge1xuICAgICAgICBcdFx0XHRkID0gMCAtIHRoaXMubWluO1xuICAgICAgICBcdFx0fVxuICAgICAgICBcdH1cbiAgICAgICAgXHRjb25zb2xlLmxvZygnbWluOiAnICsgdGhpcy5taW4gKyAnOyBtYXg6ICcgKyBkKTtcblx0XHRcdHRoaXMuc2NhbGUgPSBkMy5zY2FsZUxpbmVhcigpLmRvbWFpbihbdGhpcy5taW4sZF0pLnJhbmdlKFswLHRoaXMud2lkdGhdKS5jbGFtcCh0cnVlKTtcblx0XHRcdHRoaXMubGluZVxuXHRcdFx0XHQudHJhbnNpdGlvbigpLmR1cmF0aW9uKDIwMClcblx0XHRcdFx0LmF0dHIoJ3gxJywgKCkgPT4gdGhpcy5zY2FsZShuKSk7XG5cdFx0XHR0aGlzLnRleHRcblx0XHRcdFx0LnRleHQoKCkgPT4gdGhpcy50ZXh0RnVuY3Rpb24obixkKSk7XG5cdFx0fVxuXHR9O1xuXG5cdHJldHVybiB7XG5cdFx0QmFyXG5cdH07XG4gICAgICAgIFxufSkoKTsiLCIvLyBkMy50aXBcbi8vIENvcHlyaWdodCAoYykgMjAxMyBKdXN0aW4gUGFsbWVyXG4vLyBFUzYgLyBEMyB2NCBBZGFwdGlvbiBDb3B5cmlnaHQgKGMpIDIwMTYgQ29uc3RhbnRpbiBHYXZyaWxldGVcbi8vIFJlbW92YWwgb2YgRVM2IGZvciBEMyB2NCBBZGFwdGlvbiBDb3B5cmlnaHQgKGMpIDIwMTYgRGF2aWQgR290elxuLy9cbi8vIFRvb2x0aXBzIGZvciBkMy5qcyBTVkcgdmlzdWFsaXphdGlvbnNcblxuZXhwb3J0IGNvbnN0IGQzVGlwID0gKGZ1bmN0aW9uKCl7XG4gIGQzLmZ1bmN0b3IgPSBmdW5jdGlvbiBmdW5jdG9yKHYpIHtcbiAgICByZXR1cm4gdHlwZW9mIHYgPT09IFwiZnVuY3Rpb25cIiA/IHYgOiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB2O1xuICAgIH07XG4gIH07XG5cbiAgZDMudGlwID0gZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgZGlyZWN0aW9uID0gZDNfdGlwX2RpcmVjdGlvbixcbiAgICAgICAgb2Zmc2V0ICAgID0gZDNfdGlwX29mZnNldCxcbiAgICAgICAgaHRtbCAgICAgID0gZDNfdGlwX2h0bWwsXG4gICAgICAgIG5vZGUgICAgICA9IGluaXROb2RlKCksXG4gICAgICAgIHN2ZyAgICAgICA9IG51bGwsXG4gICAgICAgIHBvaW50ICAgICA9IG51bGwsXG4gICAgICAgIHRhcmdldCAgICA9IG51bGxcblxuICAgIGZ1bmN0aW9uIHRpcCh2aXMpIHtcbiAgICAgIHN2ZyA9IGdldFNWR05vZGUodmlzKVxuICAgICAgcG9pbnQgPSBzdmcuY3JlYXRlU1ZHUG9pbnQoKVxuICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChub2RlKVxuICAgIH1cblxuICAgIC8vIFB1YmxpYyAtIHNob3cgdGhlIHRvb2x0aXAgb24gdGhlIHNjcmVlblxuICAgIC8vXG4gICAgLy8gUmV0dXJucyBhIHRpcFxuICAgIHRpcC5zaG93ID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cylcbiAgICAgIGlmKGFyZ3NbYXJncy5sZW5ndGggLSAxXSBpbnN0YW5jZW9mIFNWR0VsZW1lbnQpIHRhcmdldCA9IGFyZ3MucG9wKClcbiAgICAgIHZhciBjb250ZW50ID0gaHRtbC5hcHBseSh0aGlzLCBhcmdzKSxcbiAgICAgICAgICBwb2Zmc2V0ID0gb2Zmc2V0LmFwcGx5KHRoaXMsIGFyZ3MpLFxuICAgICAgICAgIGRpciAgICAgPSBkaXJlY3Rpb24uYXBwbHkodGhpcywgYXJncyksXG4gICAgICAgICAgbm9kZWwgICA9IGdldE5vZGVFbCgpLFxuICAgICAgICAgIGkgICAgICAgPSBkaXJlY3Rpb25zLmxlbmd0aCxcbiAgICAgICAgICBjb29yZHMsXG4gICAgICAgICAgc2Nyb2xsVG9wICA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxUb3AgfHwgZG9jdW1lbnQuYm9keS5zY3JvbGxUb3AsXG4gICAgICAgICAgc2Nyb2xsTGVmdCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zY3JvbGxMZWZ0IHx8IGRvY3VtZW50LmJvZHkuc2Nyb2xsTGVmdFxuXG4gICAgICBub2RlbC5odG1sKGNvbnRlbnQpXG4gICAgICAgIC5zdHlsZSgncG9zaXRpb24nLCAnYWJzb2x1dGUnKVxuICAgICAgICAuc3R5bGUoJ29wYWNpdHknLCAxKVxuICAgICAgICAuc3R5bGUoJ3BvaW50ZXItZXZlbnRzJywgJ2FsbCcpXG5cbiAgICAgIHdoaWxlKGktLSkgbm9kZWwuY2xhc3NlZChkaXJlY3Rpb25zW2ldLCBmYWxzZSlcbiAgICAgIGNvb3JkcyA9IGRpcmVjdGlvbl9jYWxsYmFja3NbZGlyXS5hcHBseSh0aGlzKVxuICAgICAgbm9kZWwuY2xhc3NlZChkaXIsIHRydWUpXG4gICAgICAgIC5zdHlsZSgndG9wJywgKGNvb3Jkcy50b3AgKyAgcG9mZnNldFswXSkgKyBzY3JvbGxUb3AgKyAncHgnKVxuICAgICAgICAuc3R5bGUoJ2xlZnQnLCAoY29vcmRzLmxlZnQgKyBwb2Zmc2V0WzFdKSArIHNjcm9sbExlZnQgKyAncHgnKVxuXG4gICAgICByZXR1cm4gdGlwXG4gICAgfVxuXG4gICAgLy8gUHVibGljIC0gaGlkZSB0aGUgdG9vbHRpcFxuICAgIC8vXG4gICAgLy8gUmV0dXJucyBhIHRpcFxuICAgIHRpcC5oaWRlID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgbm9kZWwgPSBnZXROb2RlRWwoKVxuICAgICAgbm9kZWxcbiAgICAgICAgLnN0eWxlKCdvcGFjaXR5JywgMClcbiAgICAgICAgLnN0eWxlKCdwb2ludGVyLWV2ZW50cycsICdub25lJylcbiAgICAgIHJldHVybiB0aXBcbiAgICB9XG5cbiAgICAvLyBQdWJsaWM6IFByb3h5IGF0dHIgY2FsbHMgdG8gdGhlIGQzIHRpcCBjb250YWluZXIuICBTZXRzIG9yIGdldHMgYXR0cmlidXRlIHZhbHVlLlxuICAgIC8vXG4gICAgLy8gbiAtIG5hbWUgb2YgdGhlIGF0dHJpYnV0ZVxuICAgIC8vIHYgLSB2YWx1ZSBvZiB0aGUgYXR0cmlidXRlXG4gICAgLy9cbiAgICAvLyBSZXR1cm5zIHRpcCBvciBhdHRyaWJ1dGUgdmFsdWVcbiAgICB0aXAuYXR0ciA9IGZ1bmN0aW9uKG4sIHYpIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMiAmJiB0eXBlb2YgbiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIGdldE5vZGVFbCgpLmF0dHIobilcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBhcmdzID0gIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cylcbiAgICAgICAgZDMuc2VsZWN0aW9uLnByb3RvdHlwZS5hdHRyLmFwcGx5KGdldE5vZGVFbCgpLCBhcmdzKVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gdGlwXG4gICAgfVxuXG4gICAgLy8gUHVibGljOiBQcm94eSBzdHlsZSBjYWxscyB0byB0aGUgZDMgdGlwIGNvbnRhaW5lci4gIFNldHMgb3IgZ2V0cyBhIHN0eWxlIHZhbHVlLlxuICAgIC8vXG4gICAgLy8gbiAtIG5hbWUgb2YgdGhlIHByb3BlcnR5XG4gICAgLy8gdiAtIHZhbHVlIG9mIHRoZSBwcm9wZXJ0eVxuICAgIC8vXG4gICAgLy8gUmV0dXJucyB0aXAgb3Igc3R5bGUgcHJvcGVydHkgdmFsdWVcbiAgICB0aXAuc3R5bGUgPSBmdW5jdGlvbihuLCB2KSB7XG4gICAgICAvLyBkZWJ1Z2dlcjtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMiAmJiB0eXBlb2YgbiA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgcmV0dXJuIGdldE5vZGVFbCgpLnN0eWxlKG4pXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cyk7XG4gICAgICAgIGlmIChhcmdzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgIHZhciBzdHlsZXMgPSBhcmdzWzBdO1xuICAgICAgICAgIE9iamVjdC5rZXlzKHN0eWxlcykuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgICAgIHJldHVybiBkMy5zZWxlY3Rpb24ucHJvdG90eXBlLnN0eWxlLmFwcGx5KGdldE5vZGVFbCgpLCBba2V5LCBzdHlsZXNba2V5XV0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0aXBcbiAgICB9XG5cbiAgICAvLyBQdWJsaWM6IFNldCBvciBnZXQgdGhlIGRpcmVjdGlvbiBvZiB0aGUgdG9vbHRpcFxuICAgIC8vXG4gICAgLy8gdiAtIE9uZSBvZiBuKG5vcnRoKSwgcyhzb3V0aCksIGUoZWFzdCksIG9yIHcod2VzdCksIG53KG5vcnRod2VzdCksXG4gICAgLy8gICAgIHN3KHNvdXRod2VzdCksIG5lKG5vcnRoZWFzdCkgb3Igc2Uoc291dGhlYXN0KVxuICAgIC8vXG4gICAgLy8gUmV0dXJucyB0aXAgb3IgZGlyZWN0aW9uXG4gICAgdGlwLmRpcmVjdGlvbiA9IGZ1bmN0aW9uKHYpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGRpcmVjdGlvblxuICAgICAgZGlyZWN0aW9uID0gdiA9PSBudWxsID8gdiA6IGQzLmZ1bmN0b3IodilcblxuICAgICAgcmV0dXJuIHRpcFxuICAgIH1cblxuICAgIC8vIFB1YmxpYzogU2V0cyBvciBnZXRzIHRoZSBvZmZzZXQgb2YgdGhlIHRpcFxuICAgIC8vXG4gICAgLy8gdiAtIEFycmF5IG9mIFt4LCB5XSBvZmZzZXRcbiAgICAvL1xuICAgIC8vIFJldHVybnMgb2Zmc2V0IG9yXG4gICAgdGlwLm9mZnNldCA9IGZ1bmN0aW9uKHYpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIG9mZnNldFxuICAgICAgb2Zmc2V0ID0gdiA9PSBudWxsID8gdiA6IGQzLmZ1bmN0b3IodilcblxuICAgICAgcmV0dXJuIHRpcFxuICAgIH1cblxuICAgIC8vIFB1YmxpYzogc2V0cyBvciBnZXRzIHRoZSBodG1sIHZhbHVlIG9mIHRoZSB0b29sdGlwXG4gICAgLy9cbiAgICAvLyB2IC0gU3RyaW5nIHZhbHVlIG9mIHRoZSB0aXBcbiAgICAvL1xuICAgIC8vIFJldHVybnMgaHRtbCB2YWx1ZSBvciB0aXBcbiAgICB0aXAuaHRtbCA9IGZ1bmN0aW9uKHYpIHtcbiAgICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkgcmV0dXJuIGh0bWxcbiAgICAgIGh0bWwgPSB2ID09IG51bGwgPyB2IDogZDMuZnVuY3Rvcih2KVxuXG4gICAgICByZXR1cm4gdGlwXG4gICAgfVxuXG4gICAgLy8gUHVibGljOiBkZXN0cm95cyB0aGUgdG9vbHRpcCBhbmQgcmVtb3ZlcyBpdCBmcm9tIHRoZSBET01cbiAgICAvL1xuICAgIC8vIFJldHVybnMgYSB0aXBcbiAgICB0aXAuZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuICAgICAgaWYobm9kZSkge1xuICAgICAgICBnZXROb2RlRWwoKS5yZW1vdmUoKTtcbiAgICAgICAgbm9kZSA9IG51bGw7XG4gICAgICB9XG4gICAgICByZXR1cm4gdGlwO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGQzX3RpcF9kaXJlY3Rpb24oKSB7IHJldHVybiAnbicgfVxuICAgIGZ1bmN0aW9uIGQzX3RpcF9vZmZzZXQoKSB7IHJldHVybiBbMCwgMF0gfVxuICAgIGZ1bmN0aW9uIGQzX3RpcF9odG1sKCkgeyByZXR1cm4gJyAnIH1cblxuICAgIHZhciBkaXJlY3Rpb25fY2FsbGJhY2tzID0ge1xuICAgICAgbjogIGRpcmVjdGlvbl9uLFxuICAgICAgczogIGRpcmVjdGlvbl9zLFxuICAgICAgZTogIGRpcmVjdGlvbl9lLFxuICAgICAgdzogIGRpcmVjdGlvbl93LFxuICAgICAgbnc6IGRpcmVjdGlvbl9udyxcbiAgICAgIG5lOiBkaXJlY3Rpb25fbmUsXG4gICAgICBzdzogZGlyZWN0aW9uX3N3LFxuICAgICAgc2U6IGRpcmVjdGlvbl9zZVxuICAgIH07XG5cbiAgICB2YXIgZGlyZWN0aW9ucyA9IE9iamVjdC5rZXlzKGRpcmVjdGlvbl9jYWxsYmFja3MpO1xuXG4gICAgZnVuY3Rpb24gZGlyZWN0aW9uX24oKSB7XG4gICAgICB2YXIgYmJveCA9IGdldFNjcmVlbkJCb3goKVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9wOiAgYmJveC5uLnkgLSBub2RlLm9mZnNldEhlaWdodCxcbiAgICAgICAgbGVmdDogYmJveC5uLnggLSBub2RlLm9mZnNldFdpZHRoIC8gMlxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpcmVjdGlvbl9zKCkge1xuICAgICAgdmFyIGJib3ggPSBnZXRTY3JlZW5CQm94KClcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRvcDogIGJib3gucy55LFxuICAgICAgICBsZWZ0OiBiYm94LnMueCAtIG5vZGUub2Zmc2V0V2lkdGggLyAyXG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGlyZWN0aW9uX2UoKSB7XG4gICAgICB2YXIgYmJveCA9IGdldFNjcmVlbkJCb3goKVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9wOiAgYmJveC5lLnkgLSBub2RlLm9mZnNldEhlaWdodCAvIDIsXG4gICAgICAgIGxlZnQ6IGJib3guZS54XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGlyZWN0aW9uX3coKSB7XG4gICAgICB2YXIgYmJveCA9IGdldFNjcmVlbkJCb3goKVxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgdG9wOiAgYmJveC53LnkgLSBub2RlLm9mZnNldEhlaWdodCAvIDIsXG4gICAgICAgIGxlZnQ6IGJib3gudy54IC0gbm9kZS5vZmZzZXRXaWR0aFxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpcmVjdGlvbl9udygpIHtcbiAgICAgIHZhciBiYm94ID0gZ2V0U2NyZWVuQkJveCgpXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0b3A6ICBiYm94Lm53LnkgLSBub2RlLm9mZnNldEhlaWdodCxcbiAgICAgICAgbGVmdDogYmJveC5udy54IC0gbm9kZS5vZmZzZXRXaWR0aFxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpcmVjdGlvbl9uZSgpIHtcbiAgICAgIHZhciBiYm94ID0gZ2V0U2NyZWVuQkJveCgpXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0b3A6ICBiYm94Lm5lLnkgLSBub2RlLm9mZnNldEhlaWdodCxcbiAgICAgICAgbGVmdDogYmJveC5uZS54XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZGlyZWN0aW9uX3N3KCkge1xuICAgICAgdmFyIGJib3ggPSBnZXRTY3JlZW5CQm94KClcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHRvcDogIGJib3guc3cueSxcbiAgICAgICAgbGVmdDogYmJveC5zdy54IC0gbm9kZS5vZmZzZXRXaWR0aFxuICAgICAgfVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRpcmVjdGlvbl9zZSgpIHtcbiAgICAgIHZhciBiYm94ID0gZ2V0U2NyZWVuQkJveCgpXG4gICAgICByZXR1cm4ge1xuICAgICAgICB0b3A6ICBiYm94LnNlLnksXG4gICAgICAgIGxlZnQ6IGJib3guZS54XG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gaW5pdE5vZGUoKSB7XG4gICAgICB2YXIgbm9kZSA9IGQzLnNlbGVjdChkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKSlcbiAgICAgIG5vZGVcbiAgICAgICAgLnN0eWxlKCdwb3NpdGlvbicsICdhYnNvbHV0ZScpXG4gICAgICAgIC5zdHlsZSgndG9wJywgMClcbiAgICAgICAgLnN0eWxlKCdvcGFjaXR5JywgMClcbiAgICAgICAgLnN0eWxlKCdwb2ludGVyLWV2ZW50cycsICdub25lJylcbiAgICAgICAgLnN0eWxlKCdib3gtc2l6aW5nJywgJ2JvcmRlci1ib3gnKVxuXG4gICAgICByZXR1cm4gbm9kZS5ub2RlKClcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRTVkdOb2RlKGVsKSB7XG4gICAgICBlbCA9IGVsLm5vZGUoKVxuICAgICAgaWYoZWwudGFnTmFtZS50b0xvd2VyQ2FzZSgpID09PSAnc3ZnJylcbiAgICAgICAgcmV0dXJuIGVsXG5cbiAgICAgIHJldHVybiBlbC5vd25lclNWR0VsZW1lbnRcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXROb2RlRWwoKSB7XG4gICAgICBpZihub2RlID09PSBudWxsKSB7XG4gICAgICAgIG5vZGUgPSBpbml0Tm9kZSgpO1xuICAgICAgICAvLyByZS1hZGQgbm9kZSB0byBET01cbiAgICAgICAgZG9jdW1lbnQuYm9keS5hcHBlbmRDaGlsZChub2RlKTtcbiAgICAgIH07XG4gICAgICByZXR1cm4gZDMuc2VsZWN0KG5vZGUpO1xuICAgIH1cblxuICAgIC8vIFByaXZhdGUgLSBnZXRzIHRoZSBzY3JlZW4gY29vcmRpbmF0ZXMgb2YgYSBzaGFwZVxuICAgIC8vXG4gICAgLy8gR2l2ZW4gYSBzaGFwZSBvbiB0aGUgc2NyZWVuLCB3aWxsIHJldHVybiBhbiBTVkdQb2ludCBmb3IgdGhlIGRpcmVjdGlvbnNcbiAgICAvLyBuKG5vcnRoKSwgcyhzb3V0aCksIGUoZWFzdCksIHcod2VzdCksIG5lKG5vcnRoZWFzdCksIHNlKHNvdXRoZWFzdCksIG53KG5vcnRod2VzdCksXG4gICAgLy8gc3coc291dGh3ZXN0KS5cbiAgICAvL1xuICAgIC8vICAgICstKy0rXG4gICAgLy8gICAgfCAgIHxcbiAgICAvLyAgICArICAgK1xuICAgIC8vICAgIHwgICB8XG4gICAgLy8gICAgKy0rLStcbiAgICAvL1xuICAgIC8vIFJldHVybnMgYW4gT2JqZWN0IHtuLCBzLCBlLCB3LCBudywgc3csIG5lLCBzZX1cbiAgICBmdW5jdGlvbiBnZXRTY3JlZW5CQm94KCkge1xuICAgICAgdmFyIHRhcmdldGVsICAgPSB0YXJnZXQgfHwgZDMuZXZlbnQudGFyZ2V0O1xuICAgICAgY29uc29sZS5sb2codGFyZ2V0ZWwpO1xuICAgICAgZnVuY3Rpb24gdHJ5QkJveCgpe1xuICAgICAgICB0cnkge1xuICAgICAgICAgIHRhcmdldGVsLmdldEJCb3goKTtcbiAgICAgICAgfVxuICAgICAgICBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgdGFyZ2V0ZWwgPSB0YXJnZXRlbC5wYXJlbnROb2RlO1xuICAgICAgICAgIHRyeUJCb3goKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgdHJ5QkJveCgpO1xuICAgICAgd2hpbGUgKCd1bmRlZmluZWQnID09PSB0eXBlb2YgdGFyZ2V0ZWwuZ2V0U2NyZWVuQ1RNICl7Ly8gJiYgJ3VuZGVmaW5lZCcgPT09IHRhcmdldGVsLnBhcmVudE5vZGUpIHtcbiAgICAgICAgICB0YXJnZXRlbCA9IHRhcmdldGVsLnBhcmVudE5vZGU7XG4gICAgICB9XG4gICAgICBjb25zb2xlLmxvZyh0YXJnZXRlbCk7XG4gICAgICB2YXIgYmJveCAgICAgICA9IHt9LFxuICAgICAgICAgIG1hdHJpeCAgICAgPSB0YXJnZXRlbC5nZXRTY3JlZW5DVE0oKSxcbiAgICAgICAgICB0YmJveCAgICAgID0gdGFyZ2V0ZWwuZ2V0QkJveCgpLFxuICAgICAgICAgIHdpZHRoICAgICAgPSB0YmJveC53aWR0aCxcbiAgICAgICAgICBoZWlnaHQgICAgID0gdGJib3guaGVpZ2h0LFxuICAgICAgICAgIHggICAgICAgICAgPSB0YmJveC54LFxuICAgICAgICAgIHkgICAgICAgICAgPSB0YmJveC55XG5cbiAgICAgIHBvaW50LnggPSB4XG4gICAgICBwb2ludC55ID0geVxuICAgICAgYmJveC5udyA9IHBvaW50Lm1hdHJpeFRyYW5zZm9ybShtYXRyaXgpXG4gICAgICBwb2ludC54ICs9IHdpZHRoXG4gICAgICBiYm94Lm5lID0gcG9pbnQubWF0cml4VHJhbnNmb3JtKG1hdHJpeClcbiAgICAgIHBvaW50LnkgKz0gaGVpZ2h0XG4gICAgICBiYm94LnNlID0gcG9pbnQubWF0cml4VHJhbnNmb3JtKG1hdHJpeClcbiAgICAgIHBvaW50LnggLT0gd2lkdGhcbiAgICAgIGJib3guc3cgPSBwb2ludC5tYXRyaXhUcmFuc2Zvcm0obWF0cml4KVxuICAgICAgcG9pbnQueSAtPSBoZWlnaHQgLyAyXG4gICAgICBiYm94LncgID0gcG9pbnQubWF0cml4VHJhbnNmb3JtKG1hdHJpeClcbiAgICAgIHBvaW50LnggKz0gd2lkdGhcbiAgICAgIGJib3guZSA9IHBvaW50Lm1hdHJpeFRyYW5zZm9ybShtYXRyaXgpXG4gICAgICBwb2ludC54IC09IHdpZHRoIC8gMlxuICAgICAgcG9pbnQueSAtPSBoZWlnaHQgLyAyXG4gICAgICBiYm94Lm4gPSBwb2ludC5tYXRyaXhUcmFuc2Zvcm0obWF0cml4KVxuICAgICAgcG9pbnQueSArPSBoZWlnaHRcbiAgICAgIGJib3gucyA9IHBvaW50Lm1hdHJpeFRyYW5zZm9ybShtYXRyaXgpXG5cbiAgICAgIHJldHVybiBiYm94XG4gICAgfVxuXG4gICAgcmV0dXJuIHRpcFxuICB9O1xufSkoKTsiLCJjb25zdCBtYkhlbHBlciA9IHtcbiAgICBwcm9taXNlczoge30sXG4gICAgYWRkU291cmNlQW5kTGF5ZXJzKHNvdXJjZU9wdGlvbnMsbGF5ZXJPcHRpb25zQXJyYXkpeyAvLyB0aGlzID0gbWFwXG4gICAgICAgIHZhciBzb3VyY2VOYW1lID0gc291cmNlT3B0aW9ucy5uYW1lO1xuICAgICAgICBtYkhlbHBlci5wcm9taXNlc1tzb3VyY2VPcHRpb25zLm5hbWVdID0gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHsgLy8gVE8gRE86IGZpZ3VyZSBvdXQgcmVqZWN0P1xuICAgICAgICAgICAgZGVsZXRlIHNvdXJjZU9wdGlvbnMubmFtZTtcbiAgICAgICAgICAgIGZ1bmN0aW9uIGNoZWNrRGF0YUxvYWRlZCgpe1xuICAgICAgICAgICAgICAgIGlmICggdGhpcy5nZXRTb3VyY2Uoc291cmNlTmFtZSkgKXsgLy8gaWYgYWRkU291cmNlIGhhcyB0YWtlbiBlZmZlY3RcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vZmYoJ3JlbmRlcicsIGNoZWNrRGF0YUxvYWRlZCk7IC8vIHR1cm4gb2ZmIHRoZSBsaXN0ZW5lciBmb3IgcmVuZGVyXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5vbigncmVuZGVyJywgY2hlY2tEYXRhTG9hZGVkKTtcbiAgICAgICAgICAgIHRoaXMuYWRkU291cmNlKHNvdXJjZU5hbWUsIHNvdXJjZU9wdGlvbnMpO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGxheWVyUHJvbWlzZXMgPSBbXTtcbiAgICAgICAgcmV0dXJuIG1iSGVscGVyLnByb21pc2VzW3NvdXJjZU5hbWVdLnRoZW4oKCkgPT4geyBcbiAgICAgICAgICAgIGxheWVyT3B0aW9uc0FycmF5LmZvckVhY2goKGVhY2gpID0+IHtcbiAgICAgICAgICAgICAgICBsYXllclByb21pc2VzLnB1c2goXG4gICAgICAgICAgICAgICAgICAgIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7IC8vIFRPIERPOiBmaWd1cmUgb3V0IHJlamVjdD9cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBiZWZvcmVMYXllciA9IGVhY2guYmVmb3JlTGF5ZXIgPyBlYWNoLmJlZm9yZUxheWVyIDogJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgZWFjaC5iZWZvcmVMYXllcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVhY2guc291cmNlID0gc291cmNlTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGNoZWNrTGF5ZXJMb2FkZWQoKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIHRoaXMuZ2V0TGF5ZXIoZWFjaC5pZCkgKXsgLy8gaWYgYWRkTGF5ZXIgIGhhcyB0YWtlbiBlZmZlY3RcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vZmYoJ3JlbmRlcicsIGNoZWNrTGF5ZXJMb2FkZWQpOyAvLyB0dXJuIG9mZiB0aGUgbGlzdGVuZXIgZm9yIHJlbmRlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub24oJ3JlbmRlcicsIGNoZWNrTGF5ZXJMb2FkZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRMYXllcihlYWNoLCBiZWZvcmVMYXllcik7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKGxheWVyUHJvbWlzZXMpO1xuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG5leHBvcnRzLmFkZFNvdXJjZUFuZExheWVycyA9IG1iSGVscGVyLmFkZFNvdXJjZUFuZExheWVyczsiXX0=
