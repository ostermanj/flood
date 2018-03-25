(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
'use strict';

var _Bars = require('../js-exports/Bars');

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } } /* exported Charts */
//import { Donuts } from '../js-exports/Donuts';


//d3.tip = require('d3-tip');
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
	var theCharts = [];

	var geojson;
	var featurePropertiesById = new Map();
	var gateCheck = 0;

	var theMap = new mapboxgl.Map({
		container: 'map',
		style: 'mapbox://styles/ostermanj/cjf03o37b3tve2rqp2inw6a1f',
		center: [-96.29192961129883, 38.453175289053746],
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
		max = d3.min([max, cutoffZ, 3]);
		min = d3.max([min, -3]);
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
			"maxzoom": 9,
			"paint": {
				"circle-color": ['match', ['get', 't_ded'], 5, '#051839',
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
			"minzoom": 9,
			"paint": {
				"circle-color": ['match', ['get', 't_ded'], 5, '#051839',
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
				title: 'Average median household income (census tract)',
				margin: {
					top: 0,
					right: 1,
					bottom: 0,
					left: 1
				},
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
						min: min,
						max: max,
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
			})); // end push
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
	theMap.on('zoomend', function () {
		updateAll();
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

},{"../js-exports/Bars":2,"mapbox-helper":3}],2:[function(require,module,exports){
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
			// some of setup is common to all charts and could be handled by prototypical inheritance
			console.log(configObject);
			var viewBox = '0 0 100 ' + Math.round(configObject.heightToWidth * 100);
			this.container = configObject.container;
			this.margin = configObject.margin;
			this.width = 100 - this.margin.left - this.margin.right;
			this.height = configObject.heightToWidth * 100 - this.margin.top - this.margin.bottom;
			this.title = configObject.title;
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


			d3.select(this.container).append('span').classed('figure-title', true).text(this.title);

			this.svg = d3.select(this.container).append('svg').attr('width', '100%').attr('xmlns', 'http://www.w3.org/2000/svg').attr('version', '1.1').attr('viewBox', viewBox).append('g').attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

			this.background = this.svg.append('line').classed('background-line-' + this.backgroundColor, true).attr('x0', 0).attr('y0', 0).attr('x1', this.width).attr('y1', 0);

			this.line = this.svg.append('line').classed('foreground-line', true).attr('x0', 0).attr('y0', 0).attr('x1', 0).attr('y1', 0);

			this.text = d3.select(this.container).append('span');

			//this.update(this.numerator());  
		},
		update: function update(inViewIDs) {
			var _this = this;

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
				return _this.scale(n);
			});
			this.text.text(function () {
				return _this.textFunction(n, d);
			});
		}
	};

	return {
		Bar: Bar
	};
}();

},{}],3:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkZXYtanMvbWFpbi5lczYiLCJqcy1leHBvcnRzL0JhcnMuanMiLCJub2RlX21vZHVsZXMvbWFwYm94LWhlbHBlci9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDRUM7O29NQUZBO0FBQ0E7OztBQUVBO0FBQ0E7O0FBRUQ7Ozs7Ozs7O0FBUUE7Ozs7O0FBS0EsT0FBTyxNQUFQLEdBQWtCLFlBQVU7QUFDNUI7O0FBRUM7O0FBRUcsVUFBUyxXQUFULEdBQXVCLDhGQUF2QjtBQUNBLElBQUcsU0FBSCxDQUFhLFlBQWIsRUFDRSxFQURGLENBQ0ssT0FETCxFQUNjLFlBQU07QUFDbEIsS0FBRyxLQUFILENBQVMsY0FBVDtBQUNBLEVBSEY7QUFJQSxLQUFNLFdBQVcsUUFBUSxlQUFSLENBQWpCO0FBQ0EsS0FBTSxZQUFZLEVBQWxCOztBQUVBLEtBQUksT0FBSjtBQUNBLEtBQUksd0JBQXdCLElBQUksR0FBSixFQUE1QjtBQUNBLEtBQUksWUFBWSxDQUFoQjs7QUFFQSxLQUFJLFNBQVMsSUFBSSxTQUFTLEdBQWIsQ0FBaUI7QUFDN0IsYUFBVyxLQURrQjtBQUU3QixTQUFPLHFEQUZzQjtBQUc3QixVQUFRLENBQUMsQ0FBQyxpQkFBRixFQUFxQixrQkFBckIsQ0FIcUI7QUFJN0IsUUFBTSxDQUp1QjtBQUs3QixhQUFXLENBQUMsQ0FBQyxDQUFDLGtCQUFGLEVBQXNCLGtCQUF0QixDQUFELEVBQTJDLENBQUMsQ0FBQyxnQkFBRixFQUFtQixpQkFBbkIsQ0FBM0MsQ0FMa0I7QUFNN0IsV0FBUyxHQU5vQjtBQU83QixzQkFBb0I7QUFQUyxFQUFqQixDQUFiOztBQVVILEtBQUksTUFBTSxJQUFJLFNBQVMsaUJBQWIsQ0FBK0IsRUFBQyxhQUFZLEtBQWIsRUFBL0IsQ0FBVjtB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QUFuQixDQUFMLEVBQTZCO0FBQUU7QUFDM0Isb0NBQVEsSUFBUjtBQUNBLGlDQUFLLEdBQUwsQ0FBUyxRQUFULEVBQW1CLGdCQUFuQixFQUZ5QixDQUVhO0FBQ3pDO0FBQ0o7QUFDRCwwQkFBSyxFQUFMLENBQVEsUUFBUixFQUFrQixnQkFBbEI7QUFDQSwwQkFBSyxRQUFMLENBQWMsSUFBZCxFQUFvQixXQUFwQjtBQUNILGlCQVpELENBREo7QUFlSCxhQWhCRDtBQWlCQSxtQkFBTyxRQUFRLEdBQVIsQ0FBWSxhQUFaLENBQVA7QUFDSCxTQW5CTSxDQUFQO0FBb0JIO0FBcENZLENBQWpCOztBQXVDQSxRQUFRLGtCQUFSLEdBQTZCLFNBQVMsa0JBQXRDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc31yZXR1cm4gZX0pKCkiLCIgLyogZXhwb3J0ZWQgQ2hhcnRzICovXG4gLy9pbXBvcnQgeyBEb251dHMgfSBmcm9tICcuLi9qcy1leHBvcnRzL0RvbnV0cyc7XG4gaW1wb3J0IHsgQmFycyB9IGZyb20gJy4uL2pzLWV4cG9ydHMvQmFycyc7XG4gLy9kMy50aXAgPSByZXF1aXJlKCdkMy10aXAnKTtcbiAvKiBwb2x5ZmlsbHMgbmVlZGVkOiBQcm9taXNlIFRPIERPOiBPVEhFUlM/XG4gKi9cbi8qXG5pbXBvcnQgeyByZWZsZWN0LCBhcnJheUZpbmQsIFNWR0lubmVySFRNTCwgU1ZHRm9jdXMgfSBmcm9tICcuLi9qcy12ZW5kb3IvcG9seWZpbGxzJztcbmltcG9ydCB7IEhlbHBlcnMgfSBmcm9tICcuLi9qcy1leHBvcnRzL0hlbHBlcnMnO1xuaW1wb3J0IHsgZDNUaXAgfSBmcm9tICcuLi9qcy12ZW5kb3IvZDMtdGlwJztcbmltcG9ydCB7IGNyZWF0ZUJyb3dzZUJ1dHRvbiB9IGZyb20gJy4uL2pzLWV4cG9ydHMvQnJvd3NlQnV0dG9ucyc7XG5pbXBvcnQgeyBjcmVhdGVSZXN1bHRJdGVtIH0gZnJvbSAnLi4vanMtZXhwb3J0cy9SZXN1bHRJdGVtcyc7IFxuKi9cbiAgXG4vKlxudG8gZG8gOiBzZWUgYWxzbyBodHRwczovL3d3dy5tYXBib3guY29tL21hcGJveC1nbC1qcy9leGFtcGxlL2hlYXRtYXAtbGF5ZXIvXG4gXG5cbiovXG53aW5kb3cudGhlTWFwICA9IChmdW5jdGlvbigpeyAgIFxuXCJ1c2Ugc3RyaWN0XCI7XG5cdFxuXHQvL3ZhciB0aXAgPSBkMy50aXAoKS5hdHRyKCdjbGFzcycsICdkMy10aXAnKS5odG1sKGZ1bmN0aW9uKGQpIHsgcmV0dXJuIGQ7IH0pO1xuXHRcbiAgICBtYXBib3hnbC5hY2Nlc3NUb2tlbiA9ICdway5leUoxSWpvaWIzTjBaWEp0WVc1cUlpd2lZU0k2SW1OcGRuVTVkSFZuZGpBMmVEWXliM0EzTm5nMWNHSjNaWG9pZlEuWG9fay1rekdmWVhfWW9fUkRjSERCZyc7XG4gICAgZDMuc2VsZWN0QWxsKCcuaGVscC1saW5rJylcbiAgICBcdC5vbignY2xpY2snLCAoKSA9PiB7XG4gICAgXHRcdGQzLmV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgXHR9KTtcbiAgICBjb25zdCBtYkhlbHBlciA9IHJlcXVpcmUoJ21hcGJveC1oZWxwZXInKTtcbiAgIFx0Y29uc3QgdGhlQ2hhcnRzID0gW107XG4gICBcbiAgICB2YXIgZ2VvanNvbjtcbiAgICB2YXIgZmVhdHVyZVByb3BlcnRpZXNCeUlkID0gbmV3IE1hcCgpO1xuICAgIHZhciBnYXRlQ2hlY2sgPSAwO1xuICAgIFxuICAgIHZhciB0aGVNYXAgPSBuZXcgbWFwYm94Z2wuTWFwKHtcblx0ICAgIGNvbnRhaW5lcjogJ21hcCcsXG5cdCAgICBzdHlsZTogJ21hcGJveDovL3N0eWxlcy9vc3Rlcm1hbmovY2pmMDNvMzdiM3R2ZTJycXAyaW53NmExZicsXG5cdCAgICBjZW50ZXI6IFstOTYuMjkxOTI5NjExMjk4ODMsIDM4LjQ1MzE3NTI4OTA1Mzc0Nl0sXG5cdCAgICB6b29tOiAzLFxuXHQgICAgbWF4Qm91bmRzOiBbWy0xNDIuODg3MDU3MTQ3NDYzNjIsIDE2LjA1ODM0NDk0ODQzMjQwNl0sWy01MS45MDIzMDE3ODY5NzMxLDU1Ljc2NjkwMDY3NDE3MTM4XV0sXG5cdCAgICBtaW5ab29tOiAxLjUsXG5cdCAgICBhdHRyaWJ1dGlvbkNvbnRyb2w6IGZhbHNlLFxuXHR9KTtcblxuXHR2YXIgbmF2ID0gbmV3IG1hcGJveGdsLk5hdmlnYXRpb25Db250cm9sKHtzaG93Q29tcGFzczpmYWxzZX0pO1xuXHR0aGVNYXAuYWRkQ29udHJvbChuYXYsICd0b3AtcmlnaHQnKTtcblxuXHR2YXIgbWVkaWFuSW5jb21lcyA9IG5ldyBNYXAoKTtcblx0dG9HZW9KU09OKCdwb2xpY2llcy5jc3YnKTtcblx0dGhlTWFwLm9uKCdsb2FkJywgZnVuY3Rpb24oKXtcblx0XHRnYXRlQ2hlY2srKztcblx0XHRnYXRlKCk7XG5cdH0pO1xuXHRmdW5jdGlvbiBnYXRlKCl7XG5cdFx0aWYgKCBnYXRlQ2hlY2sgPCAyICl7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHVwZGF0ZUFsbCgpO1xuXHRcdGFkZFVuY2x1c3RlcmVkKCk7XG5cdFx0YWRkQ2x1c3RlcmVkKCk7XG5cdFx0Ly9jYWxjdWxhdGVaU2NvcmVzKCdwcmVtJyk7XG5cdH0gLy8gZW5kIGdhdGVcblxuXHQvKnZhciBjZW5zdXNUcmFjdHNJblZpZXcgPSBuZXcgU2V0KCk7XG5cdGZ1bmN0aW9uIGNhbGN1bGF0ZU1lZGlhbkluY29tZXMoaW5WaWV3SURzKXtcblx0XHRjb25zb2xlLmxvZyhpblZpZXdJRHMpO1xuXHRcdHZhciBtZWRpYW5JbmNvbWVzID0gW107XG5cdFx0Y2Vuc3VzVHJhY3RzSW5WaWV3LmNsZWFyKCk7XG5cdFx0aW5WaWV3SURzLmZvckVhY2goZCA9PiB7XG5cdFx0XHRjb25zb2xlLmxvZyhkKTtcblx0XHRcdHZhciBmZWF0dXJlID0gZ2VvanNvbi5mZWF0dXJlcy5maW5kKGYgPT4gZi5wcm9wZXJ0aWVzLmlkID09PSBkKTtcblx0XHRcdHZhciBjZW5zdXNUcmFjdCA9IGZlYXR1cmUuY2VuX3RyYWN0O1xuXHRcdFx0aWYgKCAhY2Vuc3VzVHJhY3RzSW5WaWV3LmhhcyhjZW5zdXNUcmFjdCkpe1xuXHRcdFx0XHRjZW5zdXNUcmFjdHNJblZpZXcuYWRkKGNlbnN1c1RyYWN0KTtcblx0XHRcdFx0bWVkaWFuSW5jb21lcy5wdXNoKGZlYXR1cmUubWVkX2luY29tZSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0cmV0dXJuIG1lZGlhbkluY29tZXM7XG5cdH0qL1xuXHRmdW5jdGlvbiBjYWxjdWxhdGVaU2NvcmVzKGZpZWxkLCBjdXRvZmYgPSBudWxsLCBoYXJkQ3V0b2ZmID0gbnVsbCwgaWdub3JlID0gW10gKXsgIC8vIGN1dG9mZiBzcGVjaWZpZXMgdXBwZXIgYm91bmQgdG8gZ2V0IHJpZCBvZiBvdXRsaWVyc1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQgIC8vIGEgd2VhayBjdXRvZmYgY2FsY3VsYXRlcyB2YWx1ZXMgZm9yIHdob2xlIHNldCBidXRcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ICAvLyBzZXRzIG1heCBmb3IgdGhlIHZpeiBiYXNlZCBvbiB0aGUgY3V0b2ZmIHZhbHVlLiBhIGhhcmRcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ICAvLyBjdXRvZmYgZXhjbHVkZXMgdmFsdWVzIGJleW9uZCB0aGUgY3V0b2ZmIGZyb20gdGhlIFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQgIC8vIGNhbGN1bGF0aW9uc1x0XG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCAgLy8gdGhlIGlnbm9yZSBhcnJheSBpcyB2YWx1ZXMgdGhhdCBzaG91bGQgYmUgdHJlYXRlZCBhcyBpbnZhbGlkXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCAgLy8gc3VjaCBhcyBhbGwgdGhlIGVycm9uZW91ZSAkMjUwayBob21lIHZhbHVlcy5cblx0XHRjb25zb2xlLmxvZygnY2FsY3VsYXRpbmcgei1zY29yZXMnKTtcblx0XHR2YXIgbWVhbiA9IGQzLm1lYW4oZ2VvanNvbi5mZWF0dXJlcywgZCA9PiB7XG5cdFx0XHRpZiAoIGhhcmRDdXRvZmYgPT09IG51bGwgKSB7XG5cdFx0XHRcdHJldHVybiBpZ25vcmUuaW5kZXhPZihkLnByb3BlcnRpZXNbZmllbGRdKSA9PT0gLTEgPyBkLnByb3BlcnRpZXNbZmllbGRdIDogbnVsbDtcblx0XHRcdH1cblx0XHRcdGlmICggZC5wcm9wZXJ0aWVzW2ZpZWxkXSA8PSBoYXJkQ3V0b2ZmICl7XG5cdFx0XHRcdHJldHVybiBpZ25vcmUuaW5kZXhPZihkLnByb3BlcnRpZXNbZmllbGRdKSA9PT0gLTEgPyBkLnByb3BlcnRpZXNbZmllbGRdIDogbnVsbDtcblx0XHRcdH1cblx0XHR9KTtcblx0XHR2YXIgc2QgPSBkMy5kZXZpYXRpb24oZ2VvanNvbi5mZWF0dXJlcywgZCA9PiB7XG5cdFx0XHRpZiAoIGhhcmRDdXRvZmYgPT09IG51bGwgKSB7XG5cdFx0XHRcdHJldHVybiBpZ25vcmUuaW5kZXhPZihkLnByb3BlcnRpZXNbZmllbGRdKSA9PT0gLTEgPyBkLnByb3BlcnRpZXNbZmllbGRdIDogbnVsbDtcblx0XHRcdH1cblx0XHRcdGlmICggZC5wcm9wZXJ0aWVzW2ZpZWxkXSA8PSBoYXJkQ3V0b2ZmICl7XG5cdFx0XHRcdHJldHVybiBpZ25vcmUuaW5kZXhPZihkLnByb3BlcnRpZXNbZmllbGRdKSA9PT0gLTEgPyBkLnByb3BlcnRpZXNbZmllbGRdIDogbnVsbDtcblx0XHRcdH1cblx0XHR9KTtcblx0XHR2YXIgbWluLFxuXHRcdFx0bWF4LFxuXHRcdFx0Y3V0b2ZmWiA9IGN1dG9mZiA/ICggY3V0b2ZmIC0gbWVhbiApIC8gc2QgOiBudWxsO1xuXG5cdFx0Y29uc29sZS5sb2coJ2N1dG9mZiBpcyAnICsgY3V0b2ZmWik7XG5cdFx0Z2VvanNvbi5mZWF0dXJlcy5mb3JFYWNoKGVhY2ggPT4ge1xuXHRcdFx0aWYgKCBoYXJkQ3V0b2ZmICYmIGVhY2gucHJvcGVydGllc1tmaWVsZF0gPiBoYXJkQ3V0b2ZmIHx8IGlnbm9yZS5pbmRleE9mKGVhY2gucHJvcGVydGllc1tmaWVsZF0pICE9PSAtMSApe1xuXHRcdFx0XHRlYWNoLnByb3BlcnRpZXNbZmllbGQgKyAnWiddID0gbnVsbDtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGVhY2gucHJvcGVydGllc1tmaWVsZCArICdaJ10gPSAoIGVhY2gucHJvcGVydGllc1tmaWVsZF0gLSBtZWFuICkgLyBzZDtcblx0XHRcdFx0bWluID0gZWFjaC5wcm9wZXJ0aWVzW2ZpZWxkICsgJ1onXSA8IG1pbiB8fCBtaW4gPT09IHVuZGVmaW5lZCA/IGVhY2gucHJvcGVydGllc1tmaWVsZCArICdaJ10gOiBtaW47XG5cdFx0XHRcdG1heCA9IGVhY2gucHJvcGVydGllc1tmaWVsZCArICdaJ10gPiBtYXggfHwgbWF4ID09PSB1bmRlZmluZWQgPyBlYWNoLnByb3BlcnRpZXNbZmllbGQgKyAnWiddIDogbWF4O1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdG1heCA9IGQzLm1pbihbbWF4LGN1dG9mZlosM10pO1xuXHRcdG1pbiA9IGQzLm1heChbbWluLCAtM10pO1xuXHRcdGNvbnNvbGUubG9nKCdkb25lJywgZ2VvanNvbiwgbWluLCBtYXgpO1xuXHRcdHJldHVybiB7XG5cdFx0XHRtaW4sXG5cdFx0XHRtYXgsXG5cdFx0XHRtZWFuLFxuXHRcdFx0c2Rcblx0XHR9O1xuXHR9XG5cblx0ZnVuY3Rpb24gYWRkVW5jbHVzdGVyZWQoKXtcblx0XHRyZXR1cm4gbWJIZWxwZXIuYWRkU291cmNlQW5kTGF5ZXJzLmNhbGwodGhlTWFwLFxuXHRcdFx0eyAvLyBzb3VyY2Vcblx0XHRcdFx0XCJuYW1lXCI6IFwicG9saWN5LXBvaW50c1wiLFxuXHRcdCAgICAgICAgXCJ0eXBlXCI6IFwiZ2VvanNvblwiLFxuXHRcdCAgICAgICAgXCJkYXRhXCI6IGdlb2pzb25cblx0XHRcdH0sIFsgLy8gbGF5ZXJzXG5cdFx0XHRcdHsgLy8gbGF5ZXIgb25lXG5cdCAgICAgICAgICAgIFwiaWRcIjogXCJwb2ludHNcIixcblx0ICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY2lyY2xlXCIsXG5cdCAgICAgICAgICAgIFwic291cmNlXCI6IFwicG9saWN5LXBvaW50c1wiLFxuXHQgICAgICAgICAgICBcIm1heHpvb21cIjogOSxcblx0ICAgICAgICAgICAgXCJwYWludFwiOiB7XG5cdCAgICAgICAgICAgICAgXHRcImNpcmNsZS1jb2xvclwiOiBbXG5cdFx0ICAgICAgICAgICAgICAgICdtYXRjaCcsXG5cdFx0ICAgICAgICAgICAgICAgIFsnZ2V0JywgJ3RfZGVkJ10sXG5cdFx0ICAgICAgICAgICAgICAgIDUsICcjMDUxODM5Jyxcblx0XHQgICAgICAgICAgICAgICAgLyogb3RoZXIgKi8gJyM5OTAwMDAnXG5cdFx0ICAgICAgICAgICAgXSxcblx0XHQgICAgICAgICAgICBcImNpcmNsZS1yYWRpdXNcIjoge1xuXHRcdCAgICAgICAgICAgICAgICAnc3RvcHMnOiBbWzUsIDNdLCBbOCwgMThdXVxuXHRcdCAgICAgICAgICAgIH0sXG5cdFx0ICAgICAgICAgICAgXCJjaXJjbGUtb3BhY2l0eVwiOiAwLjFcblx0XHQgICAgICAgICAgICB9XG5cdFx0ICAgICAgICB9LFxuXHRcdCAgICAgICAgeyAvLyBsYXllciB0d29cblx0ICAgICAgICAgICAgXCJpZFwiOiBcInBvaW50cy1kYXRhLWRyaXZlblwiLFxuXHQgICAgICAgICAgICBcInR5cGVcIjogXCJjaXJjbGVcIixcblx0ICAgICAgICAgICAgXCJzb3VyY2VcIjogXCJwb2xpY3ktcG9pbnRzXCIsXG5cdCAgICAgICAgICAgIFwibWluem9vbVwiOiA5LFxuXHQgICAgICAgICAgICBcInBhaW50XCI6IHtcblx0ICAgICAgICAgICAgICBcdFwiY2lyY2xlLWNvbG9yXCI6IFtcblx0XHQgICAgICAgICAgICAgICAgJ21hdGNoJyxcblx0XHQgICAgICAgICAgICAgICAgWydnZXQnLCAndF9kZWQnXSxcblx0XHQgICAgICAgICAgICAgICAgNSwgJyMwNTE4MzknLFxuXHRcdCAgICAgICAgICAgICAgICAvKiBvdGhlciAqLyAnIzk5MDAwMCdcblx0XHQgICAgICAgICAgICBdLFxuXHRcdCAgICAgICAgICAgIFwiY2lyY2xlLXJhZGl1c1wiOiB7XG5cdFx0ICAgICAgICAgICAgXHRwcm9wZXJ0eTogJ3ByZW0nLFxuXHRcdCAgICAgICAgICAgICAgICB0eXBlOiAnZXhwb25lbnRpYWwnLFxuXHRcdFx0XHQgICAgICAgIHN0b3BzOiBbXG5cdFx0XHRcdCAgICAgICAgICBbNjIsIDVdLFxuXHRcdFx0XHQgICAgICAgICAgWzI1MDAsIDYwXVxuXHRcdFx0XHQgICAgICAgIF1cblx0XHQgICAgICAgICAgICB9LFxuXHRcdCAgICAgICAgICAgIFwiY2lyY2xlLW9wYWNpdHlcIjogMC4xLFxuXHRcdCAgICAgICAgICAgIFwiY2lyY2xlLXN0cm9rZS1jb2xvclwiOiBcIiNmZmZmZmZcIixcblx0XHQgICAgICAgICAgICBcImNpcmNsZS1zdHJva2Utd2lkdGhcIjogMVxuXHRcdCAgICAgICAgfVxuXHRcdFx0fV1cblx0XHQpOyBcblx0fVxuXHQvKmZ1bmN0aW9uIGNoZWNrRmVhdHVyZXNMb2FkZWQoKXtcblx0XHRpZiAoIHRoZU1hcC5sb2FkZWQoKSl7XG5cdFx0XHRcblx0XHRcdHRoZU1hcC5vZmYoJ3JlbmRlcicsIGNoZWNrRmVhdHVyZXMpO1xuXHRcdH1cblx0fSovXG5cdGZ1bmN0aW9uIGFkZENsdXN0ZXJlZCgpe1xuXHRcdFxuXHRcdG1iSGVscGVyLmFkZFNvdXJjZUFuZExheWVycy5jYWxsKHRoZU1hcCxcblx0XHQgICAgeyAvLyBzb3VyY2Vcblx0XHQgICAgXHRcIm5hbWVcIjogXCJwb2xpY2llc1wiLFxuXHRcdCAgICAgICAgXCJ0eXBlXCI6IFwiZ2VvanNvblwiLFxuXHRcdCAgICAgICAgXCJkYXRhXCI6IGdlb2pzb24sXG5cdFx0ICAgICAgICBcImNsdXN0ZXJcIjogdHJ1ZSxcblx0XHQgICAgICAgIFwiY2x1c3RlclJhZGl1c1wiOiAwLjUgLy8gUmFkaXVzIG9mIGVhY2ggY2x1c3RlciB3aGVuIGNsdXN0ZXJpbmcgcG9pbnRzIChkZWZhdWx0cyB0byA1MClcblx0XHQgICAgfSwgWyAvLyBsYXllcnNcblx0XHQgICAgICAgeyAvLyBsYXllciBvbmVcblx0XHQgICAgICAgICAgICBpZDogXCJjbHVzdGVyLWNvdW50XCIsXG5cdFx0XHQgICAgICAgIHR5cGU6IFwic3ltYm9sXCIsXG5cdFx0XHQgICAgICAgIHNvdXJjZTogXCJwb2xpY2llc1wiLFxuXHRcdFx0ICAgICAgICBmaWx0ZXI6IFtcImhhc1wiLCBcInBvaW50X2NvdW50XCJdLFxuXHRcdFx0ICAgICAgICBcIm1pbnpvb21cIjogNixcblx0XHRcdCAgICAgICAgbGF5b3V0OiB7XG5cdFx0XHQgICAgICAgICAgICBcInRleHQtZmllbGRcIjogXCJ7cG9pbnRfY291bnRfYWJicmV2aWF0ZWR9XCIsXG5cdFx0XHQgICAgICAgICAgICBcInRleHQtc2l6ZVwiOiAxMixcblxuXHRcdFx0ICAgICAgICB9LFxuXHRcdFx0ICAgICAgICBcInBhaW50XCI6IHtcblx0XHRcdCAgICAgICAgXHRcInRleHQtY29sb3JcIjogXCIjZmZmZmZmXCJcblx0XHRcdCAgICAgICAgfVxuXHRcdCAgICAgICAgfVxuXHQgICAgICAgIF0gLy8gZW5kIGxheWVycyBhcnJheVxuXHQgICAgKTsgLy8gZW5kIGFkZGxheWVyc1xuXHR9IC8vIGVuZCBhZGRDbHVzdGVyZWRcblx0ZnVuY3Rpb24gdG9HZW9KU09OKHVybCl7XG5cdFx0XG5cdFx0ZDMuY3N2KHVybCwgZnVuY3Rpb24oZXJyLCBkYXRhKXtcblx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0dGhyb3cgZXJyO1xuXHRcdFx0fVxuXHRcdFx0Ly9jb25zb2xlLmxvZyhkYXRhKTtcblx0XHRcdHZhciBmZWF0dXJlcyA9IFtdOyBcblx0XHRcdGRhdGEuZm9yRWFjaChlYWNoID0+IHtcblxuXHRcdFx0XHR2YXIgdmFsdWUgPSArZWFjaC5tZWRfaW5jb21lID8gK2VhY2gubWVkX2luY29tZSA6IG51bGw7XG5cdFx0XHRcdGlmICggIW1lZGlhbkluY29tZXMuaGFzKCtlYWNoLmNlbl90cmFjdCkgKXtcblx0XHRcdFx0XHRtZWRpYW5JbmNvbWVzLnNldCgrZWFjaC5jZW5fdHJhY3QsIHZhbHVlKTsgLy8gbm8gZHVwbGljYXRlIHRyYWN0c1xuXHRcdFx0XHR9XG5cdFx0XHRcdHZhciBjb2VyY2VkID0ge307XG5cdFx0XHRcdGZvciAoIHZhciBrZXkgaW4gZWFjaCApIHtcblx0XHRcdFx0XHRpZiAoIGVhY2guaGFzT3duUHJvcGVydHkoa2V5KSApe1xuXHRcdFx0XHRcdFx0Y29lcmNlZFtrZXldID0gIWlzTmFOKCtlYWNoW2tleV0pID8gK2VhY2hba2V5XSA6IGVhY2hba2V5XTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gIFxuXHRcdFx0XHRmZWF0dXJlUHJvcGVydGllc0J5SWQuc2V0KGNvZXJjZWQuaWQsY29lcmNlZCk7XG5cdFx0XHRcdGZlYXR1cmVzLnB1c2goe1xuXHRcdFx0XHRcdFwidHlwZVwiOiBcIkZlYXR1cmVcIixcblx0XHRcdFx0XHRcInByb3BlcnRpZXNcIjogY29lcmNlZCxcblx0XHRcdFx0XHRcImdlb21ldHJ5XCI6IHtcblx0XHRcdFx0XHRcdFwidHlwZVwiOiBcIlBvaW50XCIsXG5cdFx0XHRcdFx0XHRcImNvb3JkaW5hdGVzXCI6IFsrZWFjaC5sb25naXR1ZGUsICtlYWNoLmxhdGl0dWRlXVxuXHRcdFx0XHRcdH0gICBcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTsgLy8gZW5kIGZvckVhY2hcblx0XHRcdGNvbnNvbGUubG9nKG1lZGlhbkluY29tZXMpO1xuXHRcdFx0Y29uc29sZS5sb2coZmVhdHVyZVByb3BlcnRpZXNCeUlkKTtcblx0XHRcdGdlb2pzb24gPSAge1xuXHRcdFx0XHRcInR5cGVcIjogXCJGZWF0dXJlQ29sbGVjdGlvblwiLFxuXHRcdFx0XHRcImZlYXR1cmVzXCI6IGZlYXR1cmVzXG5cdFx0XHR9O1xuXHRcdFx0dGhlQ2hhcnRzLnB1c2goIC8vIHNob3VsZCBiZSBhYmxlIHRvIGNyZWF0ZSBjaGFydHMgbm93LCB3aGV0aGVyIG9yIG5vdCBtYXAgaGFzIGxvYWRlZC4gbWFwIG5lZWRzIHRvIGhhdmVcblx0XHRcdFx0XHRcdFx0Ly8gbG9hZGVkIGZvciB0aGVtIHRvIHVwZGF0ZSwgdGhvdWdoLlxuXHRcdFx0XHRuZXcgQmFycy5CYXIoeyBcblx0XHRcdFx0XHR0aXRsZTogJ1Byb3BlcnRpZXMgaW4gdmlldycsIFxuXHRcdFx0XHRcdG1hcmdpbjoge1xuXHRcdFx0XHRcdFx0dG9wOjAsXG5cdFx0XHRcdFx0XHRyaWdodDoxLFxuXHRcdFx0XHRcdFx0Ym90dG9tOjAsXG5cdFx0XHRcdFx0XHRsZWZ0OjEgXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRoZWlnaHRUb1dpZHRoOiAwLjA1LFxuXHRcdFx0XHRcdGNvbnRhaW5lcjogJyNpbi12aWV3LWJhcicsXG5cdFx0XHRcdFx0ZGF0YTogZ2VvanNvbi5mZWF0dXJlcyxcblx0XHRcdFx0XHRudW1lcmF0b3IoaW5WaWV3SURzKXtcblx0XHRcdFx0XHRcdHJldHVybiBpblZpZXdJRHMuc2l6ZTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGRlbm9taW5hdG9yKCl7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy5kYXRhLmxlbmd0aDtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHRleHRGdW5jdGlvbihuLGQpe1xuXHRcdFx0XHRcdFx0cmV0dXJuIGAke2QzLmZvcm1hdChcIixcIikobil9IG9mICR7ZDMuZm9ybWF0KFwiLFwiKShkKX0gKCR7ZDMuZm9ybWF0KFwiLjAlXCIpKG4gLyBkKX0pYDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pLFxuXHRcdFx0XHRuZXcgQmFycy5CYXIoe1xuXHRcdFx0XHRcdHRpdGxlOiAnLi4uIHdpdGggbG93IGRlZHVjdGlibGUnLCBcblx0XHRcdFx0XHRtYXJnaW46IHtcblx0XHRcdFx0XHRcdHRvcDowLFxuXHRcdFx0XHRcdFx0cmlnaHQ6MSxcblx0XHRcdFx0XHRcdGJvdHRvbTowLFxuXHRcdFx0XHRcdFx0bGVmdDoxIFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aGVpZ2h0VG9XaWR0aDogMC4wNSxcblx0XHRcdFx0XHRjb250YWluZXI6ICcjZGVkdWN0aWJsZS1iYXInLFxuXHRcdFx0XHRcdGRhdGE6IGdlb2pzb24uZmVhdHVyZXMsXG5cdFx0XHRcdFx0bnVtZXJhdG9yKGluVmlld0lEcyl7XG5cdFx0XHRcdFx0XHR2YXIgZmlsdGVyZWREYXRhID0gdGhpcy5kYXRhLmZpbHRlcihlYWNoID0+IGluVmlld0lEcy5oYXMoZWFjaC5wcm9wZXJ0aWVzLmlkKSksXG5cdFx0XHRcdFx0XHRcdG51bWJlck1hdGNoaW5nID0gMDtcblx0XHRcdFx0XHRcdGZpbHRlcmVkRGF0YS5mb3JFYWNoKGVhY2ggPT4ge1xuXHRcdFx0XHRcdFx0XHRpZiAoIGVhY2gucHJvcGVydGllcy50X2RlZCA8IDUgKXtcblx0XHRcdFx0XHRcdFx0XHRudW1iZXJNYXRjaGluZysrO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdHJldHVybiBudW1iZXJNYXRjaGluZztcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGRlbm9taW5hdG9yKGluVmlld0lEcyl7IC8vIGZvciB0aGlzIG9uZSBkZW5vbWluYXRvciBpcyBudW1iZXIgb2YgcG9saWNpZXMgaW4gdmlld1xuXHRcdFx0XHRcdFx0IHJldHVybiBpblZpZXdJRHMuc2l6ZTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHRleHRGdW5jdGlvbihuLGQpe1xuXHRcdFx0XHRcdFx0cmV0dXJuIGAke2QzLmZvcm1hdChcIixcIikobil9IG9mICR7ZDMuZm9ybWF0KFwiLFwiKShkKX0gKCR7ZDMuZm9ybWF0KFwiLjAlXCIpKG4gLyBkKX0pYDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0pLFxuXHRcdFx0XHRuZXcgQmFycy5CYXIoe1xuXHRcdFx0XHRcdHRpdGxlOiAnQXZlcmFnZSBwcmVtaXVtJywgXG5cdFx0XHRcdFx0bWFyZ2luOiB7XG5cdFx0XHRcdFx0XHR0b3A6MCxcblx0XHRcdFx0XHRcdHJpZ2h0OjEsXG5cdFx0XHRcdFx0XHRib3R0b206MCxcblx0XHRcdFx0XHRcdGxlZnQ6MSBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHpTY29yZXM6IGNhbGN1bGF0ZVpTY29yZXMoJ3ByZW0nLDIwMDApLFxuXHRcdFx0XHRcdG1pbigpe1xuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2codGhpcyk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy56U2NvcmVzLm1pbjtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGhlaWdodFRvV2lkdGg6IDAuMDUsXG5cdFx0XHRcdFx0Y29udGFpbmVyOiAnI3ByZW1pdW0tYmFyJyxcblx0XHRcdFx0XHRkYXRhOiBnZW9qc29uLmZlYXR1cmVzLFxuXHRcdFx0XHRcdG51bWVyYXRvcihpblZpZXdJRHMpe1xuXHRcdFx0XHRcdFx0dmFyIGZpbHRlcmVkRGF0YSA9IHRoaXMuZGF0YS5maWx0ZXIoZWFjaCA9PiBpblZpZXdJRHMuaGFzKGVhY2gucHJvcGVydGllcy5pZCkpO1xuXHRcdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdHJldHVybiBkMy5tZWFuKGZpbHRlcmVkRGF0YSwgZCA9PiBkLnByb3BlcnRpZXMucHJlbVopO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0ZGVub21pbmF0b3IoKXsgXG5cdFx0XHRcdFx0XHQgcmV0dXJuIHRoaXMuelNjb3Jlcy5tYXg7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR0ZXh0RnVuY3Rpb24obil7IFxuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2codGhpcy56U2NvcmVzKTtcblx0XHRcdFx0XHRcdHJldHVybiAnJCcgKyBkMy5mb3JtYXQoXCIsLjJmXCIpKHRoaXMuelNjb3Jlcy5tZWFuICsgdGhpcy56U2NvcmVzLnNkICogbiApICsgJyAoeiA9ICcgKyBkMy5mb3JtYXQoXCIuMmZcIikobikgKyAnKSc7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KSxcblx0XHRcdFx0XG5cdFx0XHRcdG5ldyBCYXJzLkJhcih7XG5cdFx0XHRcdFx0dGl0bGU6ICdBdmVyYWdlIGhvbWUgcmVwbGFjZW1lbnQgdmFsdWUnLCBcblx0XHRcdFx0XHRtYXJnaW46IHtcblx0XHRcdFx0XHRcdHRvcDowLFxuXHRcdFx0XHRcdFx0cmlnaHQ6MSxcblx0XHRcdFx0XHRcdGJvdHRvbTowLFxuXHRcdFx0XHRcdFx0bGVmdDoxIFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0elNjb3JlczogY2FsY3VsYXRlWlNjb3JlcygndmFsdWUnLDU1MCwyMDAwMCxbMjUwXSksXG5cdFx0XHRcdFx0bWluKCl7XG5cdFx0XHRcdFx0XHRcblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLnpTY29yZXMubWluO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aGVpZ2h0VG9XaWR0aDogMC4wNSxcblx0XHRcdFx0XHRjb250YWluZXI6ICcjdmFsdWUtYmFyJyxcblx0XHRcdFx0XHRkYXRhOiBnZW9qc29uLmZlYXR1cmVzLFxuXHRcdFx0XHRcdG51bWVyYXRvcihpblZpZXdJRHMpe1xuXHRcdFx0XHRcdFx0dmFyIGZpbHRlcmVkRGF0YSA9IHRoaXMuZGF0YS5maWx0ZXIoZWFjaCA9PiBpblZpZXdJRHMuaGFzKGVhY2gucHJvcGVydGllcy5pZCkpO1xuXHRcdFx0XHRcdFx0cmV0dXJuIGQzLm1lYW4oZmlsdGVyZWREYXRhLCBkID0+IGQucHJvcGVydGllcy52YWx1ZVopO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0ZGVub21pbmF0b3IoKXsgXG5cdFx0XHRcdFx0XHQgcmV0dXJuIHRoaXMuelNjb3Jlcy5tYXg7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR0ZXh0RnVuY3Rpb24obil7IFxuXHRcdFx0XHRcdFx0Y29uc29sZS5sb2codGhpcy56U2NvcmVzKTtcblx0XHRcdFx0XHRcdHJldHVybiAnJCcgKyBkMy5mb3JtYXQoXCIsLjBmXCIpKCh0aGlzLnpTY29yZXMubWVhbiArIHRoaXMuelNjb3Jlcy5zZCAqIG4gKSAqIDEwMDAgKSArICcgKHogPSAnICsgZDMuZm9ybWF0KFwiLjJmXCIpKG4pICsgJyknO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSksXG5cdFx0XHRcdG5ldyBCYXJzLkJhcih7XG5cdFx0XHRcdFx0dGl0bGU6ICdBdmVyYWdlIGZsb29kIGluc3VyYW5jZSBjb3ZlcmFnZScsIFxuXHRcdFx0XHRcdG1hcmdpbjoge1xuXHRcdFx0XHRcdFx0dG9wOjAsXG5cdFx0XHRcdFx0XHRyaWdodDoxLFxuXHRcdFx0XHRcdFx0Ym90dG9tOjAsXG5cdFx0XHRcdFx0XHRsZWZ0OjEgXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR6U2NvcmVzOiBjYWxjdWxhdGVaU2NvcmVzKCd0Y292JyxudWxsLG51bGwsW10pLFxuXHRcdFx0XHRcdC8qbWluKCl7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZDMubWluKHRoaXMuZGF0YSwgZCA9PiBkLnByb3BlcnRpZXMudGNvdik7XG5cdFx0XHRcdFx0fSwqL1xuXHRcdFx0XHRcdG1pbigpe1xuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRyZXR1cm4gdGhpcy56U2NvcmVzLm1pbjtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGhlaWdodFRvV2lkdGg6IDAuMDUsXG5cdFx0XHRcdFx0Y29udGFpbmVyOiAnI2NvdmVyYWdlLWJhcicsXG5cdFx0XHRcdFx0ZGF0YTogZ2VvanNvbi5mZWF0dXJlcyxcblx0XHRcdFx0XHRudW1lcmF0b3IoaW5WaWV3SURzKXtcblx0XHRcdFx0XHRcdHRoaXMuZmlsdGVyZWREYXRhID0gdGhpcy5kYXRhLmZpbHRlcihlYWNoID0+IGluVmlld0lEcy5oYXMoZWFjaC5wcm9wZXJ0aWVzLmlkKSk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZDMubWVhbih0aGlzLmZpbHRlcmVkRGF0YSwgZCA9PiBkLnByb3BlcnRpZXMudGNvdlopO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0ZGVub21pbmF0b3IoKXsgXG5cdFx0XHRcdFx0XHQgcmV0dXJuIHRoaXMuelNjb3Jlcy5tYXg7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR0ZXh0RnVuY3Rpb24obil7IFxuXHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHQvL3JldHVybiAnJCcgKyBkMy5mb3JtYXQoXCIsLjBmXCIpKG4pO1xuXHRcdFx0XHRcdFx0cmV0dXJuICckJyArIGQzLmZvcm1hdChcIiwuMGZcIikoKHRoaXMuelNjb3Jlcy5tZWFuICsgdGhpcy56U2NvcmVzLnNkICogbiApICogMTAwMCApICsgJyAoeiA9ICcgKyBkMy5mb3JtYXQoXCIuMmZcIikobikgKyAnKSc7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KSxcblx0XHRcdFx0bmV3IEJhcnMuQmFyKHtcblx0XHRcdFx0XHR0aXRsZTogJ0F2ZXJhZ2UgbWVkaWFuIGhvdXNlaG9sZCBpbmNvbWUgKGNlbnN1cyB0cmFjdCknLCBcblx0XHRcdFx0XHRtYXJnaW46IHtcblx0XHRcdFx0XHRcdHRvcDowLFxuXHRcdFx0XHRcdFx0cmlnaHQ6MSxcblx0XHRcdFx0XHRcdGJvdHRvbTowLFxuXHRcdFx0XHRcdFx0bGVmdDoxIFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0elNjb3JlczogKGZ1bmN0aW9uKCl7XG5cdFx0XHRcdFx0XHR2YXIgbWVhbiA9IGQzLm1lYW4oWy4uLm1lZGlhbkluY29tZXMudmFsdWVzKCldKTtcblx0XHRcdFx0XHRcdHZhciBzZCA9IGQzLmRldmlhdGlvbihbLi4ubWVkaWFuSW5jb21lcy52YWx1ZXMoKV0pO1xuXHRcdFx0XHRcdFx0dmFyIG1pbixcblx0XHRcdFx0XHRcdFx0bWF4LFxuXHRcdFx0XHRcdFx0XHRjdXRvZmZaID0gKCAxNTAwMDAgLSBtZWFuICkgLyBzZDtcblx0XHRcdFx0XHRcdGdlb2pzb24uZmVhdHVyZXMuZm9yRWFjaChlYWNoID0+IHtcblx0XHRcdFx0XHRcdFx0Ly8gc29tZSBtZWRfaW5jb21lcyBhcmUgcmVjb3JkZWQgYXMgemVybzsgdGhleSBzaG91bGQgYmUgaWdub3JlZFxuXHRcdFx0XHRcdFx0XHRpZiAoIGVhY2gucHJvcGVydGllcy5tZWRfaW5jb21lID4gMCApe1xuXHRcdFx0XHRcdFx0XHRcdGVhY2gucHJvcGVydGllcy5tZWRfaW5jb21lWiA9ICggZWFjaC5wcm9wZXJ0aWVzLm1lZF9pbmNvbWUgLSBtZWFuICkgLyBzZDtcblx0XHRcdFx0XHRcdFx0XHRtaW4gPSBlYWNoLnByb3BlcnRpZXMubWVkX2luY29tZVogPCBtaW4gfHwgbWluID09PSB1bmRlZmluZWQgPyBlYWNoLnByb3BlcnRpZXMubWVkX2luY29tZVogOiBtaW47XG5cdFx0XHRcdFx0XHRcdFx0bWF4ID0gZWFjaC5wcm9wZXJ0aWVzLm1lZF9pbmNvbWVaID4gbWF4IHx8IG1heCA9PT0gdW5kZWZpbmVkID8gZWFjaC5wcm9wZXJ0aWVzLm1lZF9pbmNvbWVaIDogbWF4O1xuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdGVhY2gucHJvcGVydGllcy5tZWRfaW5jb21lWiA9IG51bGw7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdFx0bWF4ID0gbWF4IDwgY3V0b2ZmWiA/IG1heCA6IGN1dG9mZlo7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyh7XG5cdFx0XHRcdFx0XHRcdG1pbixcblx0XHRcdFx0XHRcdFx0bWF4LFxuXHRcdFx0XHRcdFx0XHRtZWFuLFxuXHRcdFx0XHRcdFx0XHRzZFxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRyZXR1cm4ge1xuXHRcdFx0XHRcdFx0XHRtaW4sXG5cdFx0XHRcdFx0XHRcdG1heCxcblx0XHRcdFx0XHRcdFx0bWVhbixcblx0XHRcdFx0XHRcdFx0c2Rcblx0XHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0fSkoKSxcblx0XHRcdFx0XHRtaW4oKXtcblx0XHRcdFx0XHRcdHJldHVybiB0aGlzLnpTY29yZXMubWluO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aGVpZ2h0VG9XaWR0aDogMC4wNSxcblx0XHRcdFx0XHRjb250YWluZXI6ICcjaW5jb21lLWJhcicsXG5cdFx0XHRcdFx0ZGF0YTogZ2VvanNvbi5mZWF0dXJlcyxcblx0XHRcdFx0XHRudW1lcmF0b3IoaW5WaWV3SURzKXtcblx0XHRcdFx0XHRcdHZhciByZXByZXNlbnRlZFRyYWN0cyA9IG5ldyBTZXQoKTtcblx0XHRcdFx0XHRcdHZhciBtZWRJbmNvbWVaQXJyYXkgPSBbXTtcblx0XHRcdFx0XHRcdGluVmlld0lEcy5mb3JFYWNoKGlkID0+IHtcblx0XHRcdFx0XHRcdFx0dmFyIG1hdGNoaW5nRmVhdHVyZSA9IGZlYXR1cmVQcm9wZXJ0aWVzQnlJZC5nZXQoaWQpO1xuXHRcdFx0XHRcdFx0XHRpZiAoICFyZXByZXNlbnRlZFRyYWN0cy5oYXMobWF0Y2hpbmdGZWF0dXJlLmNlbl90cmFjdCkgKXtcblx0XHRcdFx0XHRcdFx0XHRyZXByZXNlbnRlZFRyYWN0cy5hZGQobWF0Y2hpbmdGZWF0dXJlLmNlbl90cmFjdCk7XG5cdFx0XHRcdFx0XHRcdFx0bWVkSW5jb21lWkFycmF5LnB1c2gobWF0Y2hpbmdGZWF0dXJlLm1lZF9pbmNvbWVaKTsgLy8gcHVzaGVzIGluY29tZSBmcm9tIG9ubHkgb25lIHJlcHJlc2VudGF0aXZlXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ICAvL1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCdtZWRJbmNvbWVaQXJyYXknLG1lZEluY29tZVpBcnJheSk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZDMubWVhbihtZWRJbmNvbWVaQXJyYXkpO1xuXG5cdFx0XHRcdFx0XHQvL3RoaXMubWVkaWFuSW5jb21lc0luVmlldyA9IGNhbGN1bGF0ZU1lZGlhbkluY29tZXMoaW5WaWV3SURzKTtcblx0XHRcdFx0XHRcdC8vcmV0dXJuIGQzLm1lYW4odGhpcy5tZWRpYW5JbmNvbWVzSW5WaWV3KTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGRlbm9taW5hdG9yKCl7IFxuXHRcdFx0XHRcdFx0IHJldHVybiB0aGlzLnpTY29yZXMubWF4O1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0dGV4dEZ1bmN0aW9uKG4peyBcblx0XHRcdFx0XHRcdHJldHVybiAnJCcgKyBkMy5mb3JtYXQoXCIsLjBmXCIpKHRoaXMuelNjb3Jlcy5tZWFuICsgdGhpcy56U2NvcmVzLnNkICogbiApICsgJyAoeiA9ICcgKyBkMy5mb3JtYXQoXCIuMmZcIikobikgKyAnKSc7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KVxuXG5cdFx0XHQpOyAvLyBlbmQgcHVzaFxuXHRcdFx0Z2F0ZUNoZWNrKys7ICBcblx0XHRcdGdhdGUoKTtcblx0XHRcdC8vYWRkQ2x1c3RlckxheWVycyhydG4pO1xuXHRcdFx0XG5cdFx0fSk7IC8vIGVuZCBkMyBjc3Zcblx0fSAvLyBlbmQgdG9HZW9KU09OXG5cdC8qdmFyIGZlYXR1cmVzSW5WaWV3ID0ge1xuXHRcdHJlbmRlcigpe1xuXHRcdFx0dGhpcy5jaGFydCA9IG5ldyBCYXJzLkJhcih7XG5cdFx0XHRcdG1hcmdpbjoge1xuXHRcdFx0XHRcdHRvcDowLFxuXHRcdFx0XHRcdHJpZ2h0OjAsXG5cdFx0XHRcdFx0Ym90dG9tOjAsXG5cdFx0XHRcdFx0bGVmdDowXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGhlaWdodFRvV2lkdGg6IDAuMDMsXG5cdFx0XHRcdGNvbnRhaW5lcjogJyN0b3RhbC12aWV3Jyxcblx0XHRcdFx0dG90YWw6IGdlb2pzb24uZmVhdHVyZXMubGVuZ3RoXG5cdFx0XHR9KTtcblxuXHRcdFx0Lyp0aGlzLnRvdGFsID0gZ2VvanNvbi5mZWF0dXJlcy5sZW5ndGg7XG5cdFx0XHR0aGlzLnN2ZyA9IGQzLnNlbGVjdCgnI3RvdGFsLXZpZXcnKVxuXHRcdFx0XHQuYXBwZW5kKCdzdmcnKVxuXHRcdFx0XHQuYXR0cignd2lkdGgnLCAnMTAwJScpXG5cdCAgICAgICAgICAgIC5hdHRyKCd4bWxucycsJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3ZlcnNpb24nLCcxLjEnKSBcblx0ICAgICAgICAgICAgLmF0dHIoJ3ZpZXdCb3gnLCAnMCAwIDEwMCAzJyk7XG5cblx0ICAgICAgICB0aGlzLmJhY2tncm91bmQgPSB0aGlzLnN2Zy5hcHBlbmQoJ2xpbmUnKVxuXHQgICAgICAgIFx0LmNsYXNzZWQoJ2JhY2tncm91bmQtbGluZScsIHRydWUpXG5cdCAgICAgICAgXHQuYXR0cigneDAnLDApXG5cdCAgICAgICAgXHQuYXR0cigneTAnLDApXG5cdCAgICAgICAgXHQuYXR0cigneDEnLDEwMClcblx0ICAgICAgICBcdC5hdHRyKCd5MScsMCk7XG5cblx0ICAgICAgICB0aGlzLmxpbmUgPSB0aGlzLnN2Zy5hcHBlbmQoJ2xpbmUnKVxuXHQgICAgICAgIFx0LmNsYXNzZWQoJ3RvdGFsLWxpbmUnLCB0cnVlKVxuXHQgICAgICAgIFx0LmF0dHIoJ3gwJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kwJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3gxJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kxJywwKTtcblxuXHQgICAgICAgIHRoaXMudGV4dCA9IGQzLnNlbGVjdCgnI3RvdGFsLXZpZXcnKVxuXHQgICAgICAgIFx0LmFwcGVuZCgnc3BhbicpXG5cdCAgICAgICAgXHQudGV4dCgoKSA9PiBgJHtkMy5mb3JtYXQoXCIsXCIpKHRoaXMudG90YWwpfSBvZiAke2QzLmZvcm1hdChcIixcIikodGhpcy50b3RhbCl9IGluIHZpZXdgICk7XG5cdCAgICAgICAgXHRcblxuXHRcdFx0dGhpcy51cGRhdGUoY291bnRGZWF0dXJlcygpKTtcblx0XHR9LFxuXHRcdHVwZGF0ZShuKXtcblx0XHRcdC8qZDMuc2VsZWN0KCcjdG90YWwtaW4tdmlldycpXG5cdFx0XHRcdC50ZXh0KCgpID0+IGQzLmZvcm1hdChcIixcIikobikgKyAnIG9mICcgKyBkMy5mb3JtYXQoXCIsXCIpKHRoaXMudG90YWwpICsgJyBwcm9wZXJ0aWVzIGluIHZpZXcnKTsqL1xuXHRcdFx0Lyp0aGlzLmxpbmVcblx0XHRcdFx0LnRyYW5zaXRpb24oKS5kdXJhdGlvbigyMDApXG5cdFx0XHRcdC5hdHRyKCd4MScsICgpID0+ICggbiAvIHRoaXMudG90YWwpICogMTAwICk7XG5cdFx0XHR0aGlzLnRleHRcblx0XHRcdFx0LnRleHQoKCkgPT4gYCR7ZDMuZm9ybWF0KFwiLFwiKShuKX0gb2YgJHtkMy5mb3JtYXQoXCIsXCIpKHRoaXMudG90YWwpfSBpbiB2aWV3YCApO1xuICBcblx0XHR9Ki8gXG5cblx0XG5cdHZhciBpblZpZXdJRHMgPSBuZXcgU2V0KCk7XG5cdGZ1bmN0aW9uIGNvdW50RmVhdHVyZXMoKXsgXG5cdFx0LyoganNoaW50IGxheGJyZWFrOnRydWUgKi9cblx0XHRpblZpZXdJRHMuY2xlYXIoKTsgXG5cdFx0Ly92YXIgY291bnQgPSAwO1xuXHRcdHZhciBib3VuZHMgPSB0aGVNYXAuZ2V0Qm91bmRzKCk7XG5cdFx0Z2VvanNvbi5mZWF0dXJlcy5mb3JFYWNoKGVhY2ggPT4ge1xuXHRcdFx0aWYgKCAgICBlYWNoLnByb3BlcnRpZXMubG9uZ2l0dWRlID49IGJvdW5kcy5fc3cubG5nIFxuXHRcdFx0XHQgJiYgZWFjaC5wcm9wZXJ0aWVzLmxvbmdpdHVkZSA8PSBib3VuZHMuX25lLmxuZyBcblx0XHRcdFx0ICYmIGVhY2gucHJvcGVydGllcy5sYXRpdHVkZSAgPj0gYm91bmRzLl9zdy5sYXQgXG5cdFx0XHRcdCAmJiBlYWNoLnByb3BlcnRpZXMubGF0aXR1ZGUgIDw9IGJvdW5kcy5fbmUubGF0ICl7XG5cdFx0XHRcdGluVmlld0lEcy5hZGQoZWFjaC5wcm9wZXJ0aWVzLmlkKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRjb25zb2xlLmxvZyhpblZpZXdJRHMpO1xuXHR9XG5cdHRoZU1hcC5vbignbW92ZWVuZCcsIGZ1bmN0aW9uKCl7XG5cdFx0dXBkYXRlQWxsKCk7XG5cdH0pO1xuXHR0aGVNYXAub24oJ3pvb21lbmQnLCBmdW5jdGlvbigpe1xuXHRcdHVwZGF0ZUFsbCgpO1xuXHR9KTtcblx0ZnVuY3Rpb24gdXBkYXRlQWxsKCl7XG5cdFx0Y291bnRGZWF0dXJlcygpO1xuXHRcdHRoZUNoYXJ0cy5mb3JFYWNoKGVhY2ggPT4gZWFjaC51cGRhdGUoaW5WaWV3SURzKSk7XG5cdH1cblx0dGhlTWFwLm9uKFwibW91c2Vtb3ZlXCIsIFwicG9pbnRzLWRhdGEtZHJpdmVuXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgfSk7XG5cblx0cmV0dXJuIHRoZU1hcDtcbiAgIFxufSgpKTsgLy8gZW5kIElJRkUgIiwiZXhwb3J0IGNvbnN0IEJhcnMgPSAoZnVuY3Rpb24oKXtcblxuXHR2YXIgQmFyID0gZnVuY3Rpb24oY29uZmlnT2JqZWN0KXsgLy8gbWFyZ2lucyB7fSwgaGVpZ2h0ICMsIHdpZHRoICMsIGNvbnRhaW5lcklELCBkYXRhUGF0aFxuXHQgICAgdGhpcy5zZXR1cChjb25maWdPYmplY3QpO1xuXHR9O1xuXG5cdEJhci5wcm90b3R5cGUgPSB7XG5cdFx0c2V0dXAoY29uZmlnT2JqZWN0KXsgLy8gc29tZSBvZiBzZXR1cCBpcyBjb21tb24gdG8gYWxsIGNoYXJ0cyBhbmQgY291bGQgYmUgaGFuZGxlZCBieSBwcm90b3R5cGljYWwgaW5oZXJpdGFuY2Vcblx0ICAgIFx0Y29uc29sZS5sb2coY29uZmlnT2JqZWN0KTtcblx0ICAgICAgICB2YXIgdmlld0JveCA9ICcwIDAgMTAwICcgKyBNYXRoLnJvdW5kKGNvbmZpZ09iamVjdC5oZWlnaHRUb1dpZHRoICogMTAwKTtcblx0ICAgICAgICB0aGlzLmNvbnRhaW5lciA9IGNvbmZpZ09iamVjdC5jb250YWluZXI7XG5cdCAgICAgICAgdGhpcy5tYXJnaW4gPSBjb25maWdPYmplY3QubWFyZ2luO1xuXHQgICAgICAgIHRoaXMud2lkdGggPSAxMDAgLSB0aGlzLm1hcmdpbi5sZWZ0IC0gdGhpcy5tYXJnaW4ucmlnaHQ7XG5cdCAgICAgICAgdGhpcy5oZWlnaHQgPSBjb25maWdPYmplY3QuaGVpZ2h0VG9XaWR0aCAqIDEwMCAtIHRoaXMubWFyZ2luLnRvcCAtIHRoaXMubWFyZ2luLmJvdHRvbTtcblx0ICAgICAgICB0aGlzLnRpdGxlID0gY29uZmlnT2JqZWN0LnRpdGxlO1xuXHQgICAgICAgIHRoaXMuY29tcGFyYXRvciA9IGNvbmZpZ09iamVjdC5jb21wYXJhdG9yO1xuXHQgICAgICAgIHRoaXMudHJ1bmNhdGVSaWdodCA9IGNvbmZpZ09iamVjdC50cnVuY2F0ZVJpZ2h0IHx8IGZhbHNlO1xuXHQgICAgICAgIHRoaXMuYmFja2dyb3VuZENvbG9yID0gY29uZmlnT2JqZWN0LmJhY2tncm91bmRDb2xvciB8fCAnZ3JheSc7XG5cdCAgICAgICAgdGhpcy5kYXRhID0gY29uZmlnT2JqZWN0LmRhdGE7XG5cdCAgICAgICAgdGhpcy5udW1lcmF0b3IgPSBjb25maWdPYmplY3QubnVtZXJhdG9yO1xuXHQgICAgICAgIHRoaXMuZGVub21pbmF0b3IgPSBjb25maWdPYmplY3QuZGVub21pbmF0b3I7XG5cdCAgICAgICAgdGhpcy50ZXh0RnVuY3Rpb24gPSBjb25maWdPYmplY3QudGV4dEZ1bmN0aW9uO1xuXHQgICAgICAgIHRoaXMuelNjb3JlcyA9IGNvbmZpZ09iamVjdC56U2NvcmVzIHx8IG51bGw7XG5cdCAgICAgICAgdGhpcy5taW4gPSBjb25maWdPYmplY3QubWluID8gY29uZmlnT2JqZWN0Lm1pbi5jYWxsKHRoaXMpIDogMDtcblx0ICAgICAgICAvL3RoaXMubWF4ID0gY29uZmlnT2JqZWN0Lm1heCA/IGNvbmZpZ09iamVjdC5tYXguY2FsbCh0aGlzKSA6IDEwMDtcblx0ICAgICAgICAvL3RoaXMuc2NhbGUgPSBkMy5zY2FsZUxpbmVhcigpLmRvbWFpbihbdGhpcy5taW4sdGhpcy5tYXhdKS5yYW5nZShbMCx0aGlzLndpZHRoXSk7XG5cdCAgICAgICAgXG5cblx0ICAgICAgICBkMy5zZWxlY3QodGhpcy5jb250YWluZXIpXG5cdCAgICAgICAgXHQuYXBwZW5kKCdzcGFuJylcblx0ICAgICAgICBcdC5jbGFzc2VkKCdmaWd1cmUtdGl0bGUnLCB0cnVlKVxuXHQgICAgICAgIFx0LnRleHQodGhpcy50aXRsZSk7XG5cblx0ICAgICAgICB0aGlzLnN2ZyA9IGQzLnNlbGVjdCh0aGlzLmNvbnRhaW5lcilcblx0ICAgICAgICAgICAgLmFwcGVuZCgnc3ZnJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3dpZHRoJywgJzEwMCUnKVxuXHQgICAgICAgICAgICAuYXR0cigneG1sbnMnLCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycpXG5cdCAgICAgICAgICAgIC5hdHRyKCd2ZXJzaW9uJywnMS4xJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3ZpZXdCb3gnLCB2aWV3Qm94KVxuXHQgICAgICAgICAgICAuYXBwZW5kKCdnJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIHRoaXMubWFyZ2luLmxlZnQgKyAnLCcgKyB0aGlzLm1hcmdpbi50b3AgKyAnKScpO1xuXG5cdCAgICAgICAgdGhpcy5iYWNrZ3JvdW5kID0gdGhpcy5zdmcuYXBwZW5kKCdsaW5lJylcblx0ICAgICAgICBcdC5jbGFzc2VkKCdiYWNrZ3JvdW5kLWxpbmUtJyArIHRoaXMuYmFja2dyb3VuZENvbG9yLCB0cnVlKVxuXHQgICAgICAgIFx0LmF0dHIoJ3gwJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kwJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3gxJyx0aGlzLndpZHRoKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kxJywwKTtcblxuXHQgICAgICAgIHRoaXMubGluZSA9IHRoaXMuc3ZnLmFwcGVuZCgnbGluZScpXG5cdCAgICAgICAgXHQuY2xhc3NlZCgnZm9yZWdyb3VuZC1saW5lJywgdHJ1ZSlcblx0ICAgICAgICBcdC5hdHRyKCd4MCcsMClcblx0ICAgICAgICBcdC5hdHRyKCd5MCcsMClcblx0ICAgICAgICBcdC5hdHRyKCd4MScsMClcblx0ICAgICAgICBcdC5hdHRyKCd5MScsMCk7XG5cblx0ICAgICAgICB0aGlzLnRleHQgPSBkMy5zZWxlY3QodGhpcy5jb250YWluZXIpXG5cdCAgICAgICAgXHQuYXBwZW5kKCdzcGFuJyk7XG5cdCAgICAgICAgXHRcblxuXHQgICAgICAgIC8vdGhpcy51cGRhdGUodGhpcy5udW1lcmF0b3IoKSk7ICBcbiAgICAgICAgfSxcbiAgICAgICAgdXBkYXRlKGluVmlld0lEcyl7XG4gICAgICAgIFx0Y29uc29sZS5sb2codGhpcyk7XG5cdFx0XHR2YXIgbiA9IHRoaXMubnVtZXJhdG9yKGluVmlld0lEcyksXG5cdFx0XHRcdGQgPSB0aGlzLmRlbm9taW5hdG9yKGluVmlld0lEcyk7IFxuXHRcdFx0ZDMuc2VsZWN0KHRoaXMuY29udGFpbmVyKVxuXHRcdFx0XHQuY2xhc3NlZCgnb3ZlcmZsb3cnLCBuID4gZCApO1xuXG4gICAgICAgIFx0aWYgKHRoaXMudHJ1bmNhdGVSaWdodCl7XG4gICAgICAgIFx0XHRkID0gdGhpcy5taW4gPSAwIC0gZDtcbiAgICAgICAgXHR9IGVsc2UgaWYgKCB0aGlzLm1pbiA8IDAgJiYgZCA+IDAgKSB7XG4gICAgICAgIFx0XHRpZiAoTWF0aC5hYnModGhpcy5taW4pIDwgZCkge1xuICAgICAgICBcdFx0XHR0aGlzLm1pbiA9IDAgLSBkO1xuICAgICAgICBcdFx0fSBlbHNlIHtcbiAgICAgICAgXHRcdFx0ZCA9IDAgLSB0aGlzLm1pbjtcbiAgICAgICAgXHRcdH1cbiAgICAgICAgXHR9XG4gICAgICAgIFx0Y29uc29sZS5sb2coJ21pbjogJyArIHRoaXMubWluICsgJzsgbWF4OiAnICsgZCk7XG5cdFx0XHR0aGlzLnNjYWxlID0gZDMuc2NhbGVMaW5lYXIoKS5kb21haW4oW3RoaXMubWluLGRdKS5yYW5nZShbMCx0aGlzLndpZHRoXSkuY2xhbXAodHJ1ZSk7XG5cdFx0XHR0aGlzLmxpbmVcblx0XHRcdFx0LnRyYW5zaXRpb24oKS5kdXJhdGlvbigyMDApXG5cdFx0XHRcdC5hdHRyKCd4MScsICgpID0+IHRoaXMuc2NhbGUobikpO1xuXHRcdFx0dGhpcy50ZXh0XG5cdFx0XHRcdC50ZXh0KCgpID0+IHRoaXMudGV4dEZ1bmN0aW9uKG4sZCkpO1xuXHRcdH1cblx0fTtcblxuXHRyZXR1cm4ge1xuXHRcdEJhclxuXHR9O1xuICAgICAgICBcbn0pKCk7IiwiY29uc3QgbWJIZWxwZXIgPSB7XG4gICAgcHJvbWlzZXM6IHt9LFxuICAgIGFkZFNvdXJjZUFuZExheWVycyhzb3VyY2VPcHRpb25zLGxheWVyT3B0aW9uc0FycmF5KXsgLy8gdGhpcyA9IG1hcFxuICAgICAgICB2YXIgc291cmNlTmFtZSA9IHNvdXJjZU9wdGlvbnMubmFtZTtcbiAgICAgICAgbWJIZWxwZXIucHJvbWlzZXNbc291cmNlT3B0aW9ucy5uYW1lXSA9IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7IC8vIFRPIERPOiBmaWd1cmUgb3V0IHJlamVjdD9cbiAgICAgICAgICAgIGRlbGV0ZSBzb3VyY2VPcHRpb25zLm5hbWU7XG4gICAgICAgICAgICBmdW5jdGlvbiBjaGVja0RhdGFMb2FkZWQoKXtcbiAgICAgICAgICAgICAgICBpZiAoIHRoaXMuZ2V0U291cmNlKHNvdXJjZU5hbWUpICl7IC8vIGlmIGFkZFNvdXJjZSBoYXMgdGFrZW4gZWZmZWN0XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub2ZmKCdyZW5kZXInLCBjaGVja0RhdGFMb2FkZWQpOyAvLyB0dXJuIG9mZiB0aGUgbGlzdGVuZXIgZm9yIHJlbmRlclxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMub24oJ3JlbmRlcicsIGNoZWNrRGF0YUxvYWRlZCk7XG4gICAgICAgICAgICB0aGlzLmFkZFNvdXJjZShzb3VyY2VOYW1lLCBzb3VyY2VPcHRpb25zKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBsYXllclByb21pc2VzID0gW107XG4gICAgICAgIHJldHVybiBtYkhlbHBlci5wcm9taXNlc1tzb3VyY2VOYW1lXS50aGVuKCgpID0+IHsgXG4gICAgICAgICAgICBsYXllck9wdGlvbnNBcnJheS5mb3JFYWNoKChlYWNoKSA9PiB7XG4gICAgICAgICAgICAgICAgbGF5ZXJQcm9taXNlcy5wdXNoKFxuICAgICAgICAgICAgICAgICAgICBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4geyAvLyBUTyBETzogZmlndXJlIG91dCByZWplY3Q/XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYmVmb3JlTGF5ZXIgPSBlYWNoLmJlZm9yZUxheWVyID8gZWFjaC5iZWZvcmVMYXllciA6ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGVhY2guYmVmb3JlTGF5ZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICBlYWNoLnNvdXJjZSA9IHNvdXJjZU5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBjaGVja0xheWVyTG9hZGVkKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCB0aGlzLmdldExheWVyKGVhY2guaWQpICl7IC8vIGlmIGFkZExheWVyICBoYXMgdGFrZW4gZWZmZWN0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub2ZmKCdyZW5kZXInLCBjaGVja0xheWVyTG9hZGVkKTsgLy8gdHVybiBvZmYgdGhlIGxpc3RlbmVyIGZvciByZW5kZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9uKCdyZW5kZXInLCBjaGVja0xheWVyTG9hZGVkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkTGF5ZXIoZWFjaCwgYmVmb3JlTGF5ZXIpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLmFsbChsYXllclByb21pc2VzKTtcbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuZXhwb3J0cy5hZGRTb3VyY2VBbmRMYXllcnMgPSBtYkhlbHBlci5hZGRTb3VyY2VBbmRMYXllcnM7Il19
