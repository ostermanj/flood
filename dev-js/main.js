(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
'use strict';

var _Donuts = require('../js-exports/Donuts');

var _Bars = require('../js-exports/Bars');

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
/* exported Charts */
window.theMap = function () {
	"use strict";

	mapboxgl.accessToken = 'pk.eyJ1Ijoib3N0ZXJtYW5qIiwiYSI6ImNpdnU5dHVndjA2eDYyb3A3Nng1cGJ3ZXoifQ.Xo_k-kzGfYX_Yo_RDcHDBg';

	var mbHelper = require('mapbox-helper');
	var theCharts = [];

	var geojson;
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
	theMap.addControl(nav, 'top-left');

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
				var coerced = {};
				for (var key in each) {
					if (each.hasOwnProperty(key)) {
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
			geojson = {
				"type": "FeatureCollection",
				"features": features
			};
			theCharts.push( // should be able to create charts now, whether or not map has loaded. map needs to have
			// loaded for them to update, though.
			new _Donuts.Donuts.Donut({
				margin: { // percentages
					top: 15,
					right: 10,
					bottom: 5,
					left: 10
				},
				heightToWidth: 1,
				container: '#chart-0',
				data: geojson.features,
				comparator: function comparator(each) {
					return each.properties.t_ded < 5;
				}
			}), new _Bars.Bars.Bar({
				title: 'Properties in view',
				margin: {
					top: 0,
					right: 1,
					bottom: 0,
					left: 1
				},
				heightToWidth: 0.03,
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
				heightToWidth: 0.03,
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

				heightToWidth: 0.03,
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
				title: 'Average replacement value',
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

				heightToWidth: 0.03,
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

},{"../js-exports/Bars":2,"../js-exports/Donuts":3,"mapbox-helper":4}],2:[function(require,module,exports){
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
			if (this.min < 0 && Math.abs(this.min) < d && d > 0) {
				this.min = 0 - d;
			}
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

Object.defineProperty(exports, "__esModule", {
	value: true
});
var Donuts = exports.Donuts = function () {
	/* globals d3 */
	/* const medianIncomes = new Map();
  function createMedianIncomeMap(geojson){
 geojson.features.forEach(each => {
 if ( !medianIncomes.has(each.properties.cen_tract) ){
 	let income = each.properties.med_income > 0 ? each.properties.med_income : null;
 	medianIncomes.set(each.properties.cen_tract, income); 	
 }
 });
 console.log(medianIncomes);
 window.medianIncomes = medianIncomes;
 //createCharts(geojson);
 } */

	var tau = 2 * Math.PI;
	var Donut = function Donut(configObject) {
		// margins {}, height #, width #, containerID, dataPath
		console.log(this, configObject);
		this.setup(configObject);
	};

	Donut.prototype = {
		setup: function setup(configObject) {
			console.log('in set up');
			var viewBox = '0 0 100 ' + Math.round(configObject.heightToWidth * 100);
			this.margin = configObject.margin;
			this.width = 100 - this.margin.left - this.margin.right;
			this.height = configObject.heightToWidth * 100 - this.margin.top - this.margin.bottom;
			this.radius = Math.min(this.width, this.height) / 3;
			this.data = configObject.data;
			this.comparator = configObject.comparator;

			this.arc = d3.arc().outerRadius(this.radius).innerRadius(this.radius / 1.5).startAngle(0);

			this.svg = d3.select(configObject.container).append('svg').attr('width', '100%').attr('xmlns', 'http://www.w3.org/2000/svg').attr('version', '1.1').attr('viewBox', viewBox).append('g').attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

			this.svg.append('path').classed('background', true).datum({ endAngle: tau }).attr('d', this.arc).attr('transform', 'translate(' + this.width / 2 + ',' + this.height / 2 + ')');

			this.foreground = this.svg.append('path').datum({ endAngle: 0 }).classed('foreground', true).attr('transform', 'translate(' + this.width / 2 + ',' + this.height / 2 + ')').attr('d', this.arc);

			//   this.update(true);

			/* this.svg.append("text")
       .attr("text-anchor", "middle")
       .attr('class','pie_number')
       .attr('y',5)
       .text(d3.format(".2s")(this.value))
       .attr('transform', 'translate(' + this.width / 2 + ',' + this.height / 2 + ')');*/
		},
		update: function update(inViewIDs) {
			var _this = this;

			var numberMatching = 0,
			    filteredData = this.data.filter(function (each) {
				return inViewIDs.has(each.properties.id);
			}),
			    total = filteredData.length;

			filteredData.forEach(function (each) {
				if (_this.comparator(each)) {
					numberMatching++;
				}
			});

			var endAngle = numberMatching / total * tau;

			this.foreground.transition().duration(500).attrTween('d', this.arcTween(endAngle));
		},
		arcTween: function arcTween(newAngle) {
			var _this2 = this;

			// HT http://bl.ocks.org/mbostock/5100636
			return function (d) {
				var interpolate = d3.interpolate(d.endAngle, newAngle);
				return function (t) {
					d.endAngle = interpolate(t);
					return _this2.arc(d);
				};
			};
		}
	};

	return {
		Donut: Donut
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkZXYtanMvbWFpbi5lczYiLCJqcy1leHBvcnRzL0JhcnMuanMiLCJqcy1leHBvcnRzL0RvbnV0cy5qcyIsIm5vZGVfbW9kdWxlcy9tYXBib3gtaGVscGVyL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNDQzs7QUFDQTs7QUFDQTs7QUFFRDs7Ozs7Ozs7QUFRQTs7Ozs7QUFiQztBQWtCRCxPQUFPLE1BQVAsR0FBa0IsWUFBVTtBQUM1Qjs7QUFFSSxVQUFTLFdBQVQsR0FBdUIsOEZBQXZCOztBQUVBLEtBQU0sV0FBVyxRQUFRLGVBQVIsQ0FBakI7QUFDQSxLQUFNLFlBQVksRUFBbEI7O0FBRUEsS0FBSSxPQUFKO0FBQ0EsS0FBSSxZQUFZLENBQWhCOztBQUVBLEtBQUksU0FBUyxJQUFJLFNBQVMsR0FBYixDQUFpQjtBQUM3QixhQUFXLEtBRGtCO0FBRTdCLFNBQU8scURBRnNCO0FBRzdCLFVBQVEsQ0FBQyxDQUFDLGlCQUFGLEVBQXFCLGtCQUFyQixDQUhxQjtBQUk3QixRQUFNLENBSnVCO0FBSzdCLGFBQVcsQ0FBQyxDQUFDLENBQUMsa0JBQUYsRUFBc0Isa0JBQXRCLENBQUQsRUFBMkMsQ0FBQyxDQUFDLGdCQUFGLEVBQW1CLGlCQUFuQixDQUEzQyxDQUxrQjtBQU03QixXQUFTLEdBTm9CO0FBTzdCLHNCQUFvQjtBQVBTLEVBQWpCLENBQWI7O0FBVUgsS0FBSSxNQUFNLElBQUksU0FBUyxpQkFBYixDQUErQixFQUFDLGFBQVksS0FBYixFQUEvQixDQUFWO0FBQ0EsUUFBTyxVQUFQLENBQWtCLEdBQWxCLEVBQXVCLFVBQXZCOztBQUVBLFdBQVUsY0FBVjs7QUFFQSxRQUFPLEVBQVAsQ0FBVSxNQUFWLEVBQWtCLFlBQVU7QUFDM0I7QUFDQTtBQUNBLEVBSEQ7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QUFDLE9BQUQsRUFBYTtBQUFFO0FBQ3ZCLHdCQUFJLGNBQWMsS0FBSyxXQUFMLEdBQW1CLEtBQUssV0FBeEIsR0FBc0MsRUFBeEQ7QUFDQSwyQkFBTyxLQUFLLFdBQVo7QUFDQSx5QkFBSyxNQUFMLEdBQWMsVUFBZDtBQUNBLDZCQUFTLGdCQUFULEdBQTJCO0FBQ3ZCLDRCQUFLLEtBQUssUUFBTCxDQUFjLEtBQUssRUFBbkIsQ0FBTCxFQUE2QjtBQUFFO0FBQzNCLG9DQUFRLElBQVI7QUFDQSxpQ0FBSyxHQUFMLENBQVMsUUFBVCxFQUFtQixnQkFBbkIsRUFGeUIsQ0FFYTtBQUN6QztBQUNKO0FBQ0QsMEJBQUssRUFBTCxDQUFRLFFBQVIsRUFBa0IsZ0JBQWxCO0FBQ0EsMEJBQUssUUFBTCxDQUFjLElBQWQsRUFBb0IsV0FBcEI7QUFDSCxpQkFaRCxDQURKO0FBZUgsYUFoQkQ7QUFpQkEsbUJBQU8sUUFBUSxHQUFSLENBQVksYUFBWixDQUFQO0FBQ0gsU0FuQk0sQ0FBUDtBQW9CSDtBQXBDWSxDQUFqQjs7QUF1Q0EsUUFBUSxrQkFBUixHQUE2QixTQUFTLGtCQUF0QyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9cmV0dXJuIGV9KSgpIiwiIC8qIGV4cG9ydGVkIENoYXJ0cyAqL1xuIGltcG9ydCB7IERvbnV0cyB9IGZyb20gJy4uL2pzLWV4cG9ydHMvRG9udXRzJztcbiBpbXBvcnQgeyBCYXJzIH0gZnJvbSAnLi4vanMtZXhwb3J0cy9CYXJzJztcbiAvKiBwb2x5ZmlsbHMgbmVlZGVkOiBQcm9taXNlIFRPIERPOiBPVEhFUlM/XG4gKi9cbi8qXG5pbXBvcnQgeyByZWZsZWN0LCBhcnJheUZpbmQsIFNWR0lubmVySFRNTCwgU1ZHRm9jdXMgfSBmcm9tICcuLi9qcy12ZW5kb3IvcG9seWZpbGxzJztcbmltcG9ydCB7IEhlbHBlcnMgfSBmcm9tICcuLi9qcy1leHBvcnRzL0hlbHBlcnMnO1xuaW1wb3J0IHsgZDNUaXAgfSBmcm9tICcuLi9qcy12ZW5kb3IvZDMtdGlwJztcbmltcG9ydCB7IGNyZWF0ZUJyb3dzZUJ1dHRvbiB9IGZyb20gJy4uL2pzLWV4cG9ydHMvQnJvd3NlQnV0dG9ucyc7XG5pbXBvcnQgeyBjcmVhdGVSZXN1bHRJdGVtIH0gZnJvbSAnLi4vanMtZXhwb3J0cy9SZXN1bHRJdGVtcyc7IFxuKi9cbiAgXG4vKlxudG8gZG8gOiBzZWUgYWxzbyBodHRwczovL3d3dy5tYXBib3guY29tL21hcGJveC1nbC1qcy9leGFtcGxlL2hlYXRtYXAtbGF5ZXIvXG5cblxuKi9cbndpbmRvdy50aGVNYXAgID0gKGZ1bmN0aW9uKCl7ICAgXG5cInVzZSBzdHJpY3RcIjtcblx0XG4gICAgbWFwYm94Z2wuYWNjZXNzVG9rZW4gPSAncGsuZXlKMUlqb2liM04wWlhKdFlXNXFJaXdpWVNJNkltTnBkblU1ZEhWbmRqQTJlRFl5YjNBM05uZzFjR0ozWlhvaWZRLlhvX2sta3pHZllYX1lvX1JEY0hEQmcnO1xuXG4gICAgY29uc3QgbWJIZWxwZXIgPSByZXF1aXJlKCdtYXBib3gtaGVscGVyJyk7XG4gICBcdGNvbnN0IHRoZUNoYXJ0cyA9IFtdO1xuICAgXG4gICAgdmFyIGdlb2pzb247XG4gICAgdmFyIGdhdGVDaGVjayA9IDA7XG4gICAgXG4gICAgdmFyIHRoZU1hcCA9IG5ldyBtYXBib3hnbC5NYXAoe1xuXHQgICAgY29udGFpbmVyOiAnbWFwJyxcblx0ICAgIHN0eWxlOiAnbWFwYm94Oi8vc3R5bGVzL29zdGVybWFuai9jamYwM28zN2IzdHZlMnJxcDJpbnc2YTFmJyxcblx0ICAgIGNlbnRlcjogWy05Ni4yOTE5Mjk2MTEyOTg4MywgMzguNDUzMTc1Mjg5MDUzNzQ2XSxcblx0ICAgIHpvb206IDMsXG5cdCAgICBtYXhCb3VuZHM6IFtbLTE0Mi44ODcwNTcxNDc0NjM2MiwgMTYuMDU4MzQ0OTQ4NDMyNDA2XSxbLTUxLjkwMjMwMTc4Njk3MzEsNTUuNzY2OTAwNjc0MTcxMzhdXSxcblx0ICAgIG1pblpvb206IDEuNSxcblx0ICAgIGF0dHJpYnV0aW9uQ29udHJvbDogZmFsc2UsXG5cdH0pO1xuXG5cdHZhciBuYXYgPSBuZXcgbWFwYm94Z2wuTmF2aWdhdGlvbkNvbnRyb2woe3Nob3dDb21wYXNzOmZhbHNlfSk7XG5cdHRoZU1hcC5hZGRDb250cm9sKG5hdiwgJ3RvcC1sZWZ0Jyk7XG5cblx0dG9HZW9KU09OKCdwb2xpY2llcy5jc3YnKTtcblxuXHR0aGVNYXAub24oJ2xvYWQnLCBmdW5jdGlvbigpe1xuXHRcdGdhdGVDaGVjaysrO1xuXHRcdGdhdGUoKTtcblx0fSk7XG5cdGZ1bmN0aW9uIGdhdGUoKXtcblx0XHRpZiAoIGdhdGVDaGVjayA8IDIgKXtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0dXBkYXRlQWxsKCk7XG5cdFx0YWRkVW5jbHVzdGVyZWQoKTtcblx0XHRhZGRDbHVzdGVyZWQoKTtcblx0XHQvL2NhbGN1bGF0ZVpTY29yZXMoJ3ByZW0nKTtcblx0fSAvLyBlbmQgZ2F0ZVxuXG5cdGZ1bmN0aW9uIGNhbGN1bGF0ZVpTY29yZXMoZmllbGQsIGN1dG9mZiA9IG51bGwsIGhhcmRDdXRvZmYgPSBudWxsLCBpZ25vcmUgPSBbXSApeyAgLy8gY3V0b2ZmIHNwZWNpZmllcyB1cHBlciBib3VuZCB0byBnZXQgcmlkIG9mIG91dGxpZXJzXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCAgLy8gYSB3ZWFrIGN1dG9mZiBjYWxjdWxhdGVzIHZhbHVlcyBmb3Igd2hvbGUgc2V0IGJ1dFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQgIC8vIHNldHMgbWF4IGZvciB0aGUgdml6IGJhc2VkIG9uIHRoZSBjdXRvZmYgdmFsdWUuIGEgaGFyZFxuXHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHQgIC8vIGN1dG9mZiBleGNsdWRlcyB2YWx1ZXMgYmV5b25kIHRoZSBjdXRvZmYgZnJvbSB0aGUgXG5cdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdCAgLy8gY2FsY3VsYXRpb25zXHRcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ICAvLyB0aGUgaWdub3JlIGFycmF5IGlzIHZhbHVlcyB0aGF0IHNob3VsZCBiZSB0cmVhdGVkIGFzIGludmFsaWRcblx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0XHRcdFx0ICAvLyBzdWNoIGFzIGFsbCB0aGUgZXJyb25lb3VlICQyNTBrIGhvbWUgdmFsdWVzLlxuXHRcdGNvbnNvbGUubG9nKCdjYWxjdWxhdGluZyB6LXNjb3JlcycpO1xuXHRcdHZhciBtZWFuID0gZDMubWVhbihnZW9qc29uLmZlYXR1cmVzLCBkID0+IHtcblx0XHRcdGlmICggaGFyZEN1dG9mZiA9PT0gbnVsbCApIHtcblx0XHRcdFx0cmV0dXJuIGlnbm9yZS5pbmRleE9mKGQucHJvcGVydGllc1tmaWVsZF0pID09PSAtMSA/IGQucHJvcGVydGllc1tmaWVsZF0gOiBudWxsO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCBkLnByb3BlcnRpZXNbZmllbGRdIDw9IGhhcmRDdXRvZmYgKXtcblx0XHRcdFx0cmV0dXJuIGlnbm9yZS5pbmRleE9mKGQucHJvcGVydGllc1tmaWVsZF0pID09PSAtMSA/IGQucHJvcGVydGllc1tmaWVsZF0gOiBudWxsO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHZhciBzZCA9IGQzLmRldmlhdGlvbihnZW9qc29uLmZlYXR1cmVzLCBkID0+IHtcblx0XHRcdGlmICggaGFyZEN1dG9mZiA9PT0gbnVsbCApIHtcblx0XHRcdFx0cmV0dXJuIGlnbm9yZS5pbmRleE9mKGQucHJvcGVydGllc1tmaWVsZF0pID09PSAtMSA/IGQucHJvcGVydGllc1tmaWVsZF0gOiBudWxsO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCBkLnByb3BlcnRpZXNbZmllbGRdIDw9IGhhcmRDdXRvZmYgKXtcblx0XHRcdFx0cmV0dXJuIGlnbm9yZS5pbmRleE9mKGQucHJvcGVydGllc1tmaWVsZF0pID09PSAtMSA/IGQucHJvcGVydGllc1tmaWVsZF0gOiBudWxsO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdHZhciBtaW4sXG5cdFx0XHRtYXgsXG5cdFx0XHRjdXRvZmZaID0gY3V0b2ZmID8gKCBjdXRvZmYgLSBtZWFuICkgLyBzZCA6IG51bGw7XG5cblx0XHRjb25zb2xlLmxvZygnY3V0b2ZmIGlzICcgKyBjdXRvZmZaKTtcblx0XHRnZW9qc29uLmZlYXR1cmVzLmZvckVhY2goZWFjaCA9PiB7XG5cdFx0XHRpZiAoIGhhcmRDdXRvZmYgJiYgZWFjaC5wcm9wZXJ0aWVzW2ZpZWxkXSA+IGhhcmRDdXRvZmYgfHwgaWdub3JlLmluZGV4T2YoZWFjaC5wcm9wZXJ0aWVzW2ZpZWxkXSkgIT09IC0xICl7XG5cdFx0XHRcdGVhY2gucHJvcGVydGllc1tmaWVsZCArICdaJ10gPSBudWxsO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZWFjaC5wcm9wZXJ0aWVzW2ZpZWxkICsgJ1onXSA9ICggZWFjaC5wcm9wZXJ0aWVzW2ZpZWxkXSAtIG1lYW4gKSAvIHNkO1xuXHRcdFx0XHRtaW4gPSBlYWNoLnByb3BlcnRpZXNbZmllbGQgKyAnWiddIDwgbWluIHx8IG1pbiA9PT0gdW5kZWZpbmVkID8gZWFjaC5wcm9wZXJ0aWVzW2ZpZWxkICsgJ1onXSA6IG1pbjtcblx0XHRcdFx0bWF4ID0gZWFjaC5wcm9wZXJ0aWVzW2ZpZWxkICsgJ1onXSA+IG1heCB8fCBtYXggPT09IHVuZGVmaW5lZCA/IGVhY2gucHJvcGVydGllc1tmaWVsZCArICdaJ10gOiBtYXg7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0bWF4ID0gZDMubWluKFttYXgsY3V0b2ZmWiwzXSk7XG5cdFx0bWluID0gZDMubWF4KFttaW4sIC0zXSk7XG5cdFx0Y29uc29sZS5sb2coJ2RvbmUnLCBnZW9qc29uLCBtaW4sIG1heCk7XG5cdFx0cmV0dXJuIHtcblx0XHRcdG1pbixcblx0XHRcdG1heCxcblx0XHRcdG1lYW4sXG5cdFx0XHRzZFxuXHRcdH07XG5cdH1cblxuXHRmdW5jdGlvbiBhZGRVbmNsdXN0ZXJlZCgpe1xuXHRcdHJldHVybiBtYkhlbHBlci5hZGRTb3VyY2VBbmRMYXllcnMuY2FsbCh0aGVNYXAsXG5cdFx0XHR7IC8vIHNvdXJjZVxuXHRcdFx0XHRcIm5hbWVcIjogXCJwb2xpY3ktcG9pbnRzXCIsXG5cdFx0ICAgICAgICBcInR5cGVcIjogXCJnZW9qc29uXCIsXG5cdFx0ICAgICAgICBcImRhdGFcIjogZ2VvanNvblxuXHRcdFx0fSwgWyAvLyBsYXllcnNcblx0XHRcdFx0eyAvLyBsYXllciBvbmVcblx0ICAgICAgICAgICAgXCJpZFwiOiBcInBvaW50c1wiLFxuXHQgICAgICAgICAgICBcInR5cGVcIjogXCJjaXJjbGVcIixcblx0ICAgICAgICAgICAgXCJzb3VyY2VcIjogXCJwb2xpY3ktcG9pbnRzXCIsXG5cdCAgICAgICAgICAgIFwibWF4em9vbVwiOiA5LFxuXHQgICAgICAgICAgICBcInBhaW50XCI6IHtcblx0ICAgICAgICAgICAgICBcdFwiY2lyY2xlLWNvbG9yXCI6IFtcblx0XHQgICAgICAgICAgICAgICAgJ21hdGNoJyxcblx0XHQgICAgICAgICAgICAgICAgWydnZXQnLCAndF9kZWQnXSxcblx0XHQgICAgICAgICAgICAgICAgNSwgJyMwNTE4MzknLFxuXHRcdCAgICAgICAgICAgICAgICAvKiBvdGhlciAqLyAnIzk5MDAwMCdcblx0XHQgICAgICAgICAgICBdLFxuXHRcdCAgICAgICAgICAgIFwiY2lyY2xlLXJhZGl1c1wiOiB7XG5cdFx0ICAgICAgICAgICAgICAgICdzdG9wcyc6IFtbNSwgM10sIFs4LCAxOF1dXG5cdFx0ICAgICAgICAgICAgfSxcblx0XHQgICAgICAgICAgICBcImNpcmNsZS1vcGFjaXR5XCI6IDAuMVxuXHRcdCAgICAgICAgICAgIH1cblx0XHQgICAgICAgIH0sXG5cdFx0ICAgICAgICB7IC8vIGxheWVyIHR3b1xuXHQgICAgICAgICAgICBcImlkXCI6IFwicG9pbnRzLWRhdGEtZHJpdmVuXCIsXG5cdCAgICAgICAgICAgIFwidHlwZVwiOiBcImNpcmNsZVwiLFxuXHQgICAgICAgICAgICBcInNvdXJjZVwiOiBcInBvbGljeS1wb2ludHNcIixcblx0ICAgICAgICAgICAgXCJtaW56b29tXCI6IDksXG5cdCAgICAgICAgICAgIFwicGFpbnRcIjoge1xuXHQgICAgICAgICAgICAgIFx0XCJjaXJjbGUtY29sb3JcIjogW1xuXHRcdCAgICAgICAgICAgICAgICAnbWF0Y2gnLFxuXHRcdCAgICAgICAgICAgICAgICBbJ2dldCcsICd0X2RlZCddLFxuXHRcdCAgICAgICAgICAgICAgICA1LCAnIzA1MTgzOScsXG5cdFx0ICAgICAgICAgICAgICAgIC8qIG90aGVyICovICcjOTkwMDAwJ1xuXHRcdCAgICAgICAgICAgIF0sXG5cdFx0ICAgICAgICAgICAgXCJjaXJjbGUtcmFkaXVzXCI6IHtcblx0XHQgICAgICAgICAgICBcdHByb3BlcnR5OiAncHJlbScsXG5cdFx0ICAgICAgICAgICAgICAgIHR5cGU6ICdleHBvbmVudGlhbCcsXG5cdFx0XHRcdCAgICAgICAgc3RvcHM6IFtcblx0XHRcdFx0ICAgICAgICAgIFs2MiwgNV0sXG5cdFx0XHRcdCAgICAgICAgICBbMjUwMCwgNjBdXG5cdFx0XHRcdCAgICAgICAgXVxuXHRcdCAgICAgICAgICAgIH0sXG5cdFx0ICAgICAgICAgICAgXCJjaXJjbGUtb3BhY2l0eVwiOiAwLjEsXG5cdFx0ICAgICAgICAgICAgXCJjaXJjbGUtc3Ryb2tlLWNvbG9yXCI6IFwiI2ZmZmZmZlwiLFxuXHRcdCAgICAgICAgICAgIFwiY2lyY2xlLXN0cm9rZS13aWR0aFwiOiAxXG5cdFx0ICAgICAgICB9XG5cdFx0XHR9XVxuXHRcdCk7IFxuXHR9XG5cdC8qZnVuY3Rpb24gY2hlY2tGZWF0dXJlc0xvYWRlZCgpe1xuXHRcdGlmICggdGhlTWFwLmxvYWRlZCgpKXtcblx0XHRcdFxuXHRcdFx0dGhlTWFwLm9mZigncmVuZGVyJywgY2hlY2tGZWF0dXJlcyk7XG5cdFx0fVxuXHR9Ki9cblx0ZnVuY3Rpb24gYWRkQ2x1c3RlcmVkKCl7XG5cdFx0XG5cdFx0bWJIZWxwZXIuYWRkU291cmNlQW5kTGF5ZXJzLmNhbGwodGhlTWFwLFxuXHRcdCAgICB7IC8vIHNvdXJjZVxuXHRcdCAgICBcdFwibmFtZVwiOiBcInBvbGljaWVzXCIsXG5cdFx0ICAgICAgICBcInR5cGVcIjogXCJnZW9qc29uXCIsXG5cdFx0ICAgICAgICBcImRhdGFcIjogZ2VvanNvbixcblx0XHQgICAgICAgIFwiY2x1c3RlclwiOiB0cnVlLFxuXHRcdCAgICAgICAgXCJjbHVzdGVyUmFkaXVzXCI6IDAuNSAvLyBSYWRpdXMgb2YgZWFjaCBjbHVzdGVyIHdoZW4gY2x1c3RlcmluZyBwb2ludHMgKGRlZmF1bHRzIHRvIDUwKVxuXHRcdCAgICB9LCBbIC8vIGxheWVyc1xuXHRcdCAgICAgICB7IC8vIGxheWVyIG9uZVxuXHRcdCAgICAgICAgICAgIGlkOiBcImNsdXN0ZXItY291bnRcIixcblx0XHRcdCAgICAgICAgdHlwZTogXCJzeW1ib2xcIixcblx0XHRcdCAgICAgICAgc291cmNlOiBcInBvbGljaWVzXCIsXG5cdFx0XHQgICAgICAgIGZpbHRlcjogW1wiaGFzXCIsIFwicG9pbnRfY291bnRcIl0sXG5cdFx0XHQgICAgICAgIFwibWluem9vbVwiOiA2LFxuXHRcdFx0ICAgICAgICBsYXlvdXQ6IHtcblx0XHRcdCAgICAgICAgICAgIFwidGV4dC1maWVsZFwiOiBcIntwb2ludF9jb3VudF9hYmJyZXZpYXRlZH1cIixcblx0XHRcdCAgICAgICAgICAgIFwidGV4dC1zaXplXCI6IDEyLFxuXG5cdFx0XHQgICAgICAgIH0sXG5cdFx0XHQgICAgICAgIFwicGFpbnRcIjoge1xuXHRcdFx0ICAgICAgICBcdFwidGV4dC1jb2xvclwiOiBcIiNmZmZmZmZcIlxuXHRcdFx0ICAgICAgICB9XG5cdFx0ICAgICAgICB9XG5cdCAgICAgICAgXSAvLyBlbmQgbGF5ZXJzIGFycmF5XG5cdCAgICApOyAvLyBlbmQgYWRkbGF5ZXJzXG5cdH0gLy8gZW5kIGFkZENsdXN0ZXJlZFxuXHRmdW5jdGlvbiB0b0dlb0pTT04odXJsKXtcblx0XHRcblx0XHRkMy5jc3YodXJsLCBmdW5jdGlvbihlcnIsIGRhdGEpe1xuXHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHR0aHJvdyBlcnI7XG5cdFx0XHR9XG5cdFx0XHQvL2NvbnNvbGUubG9nKGRhdGEpO1xuXHRcdFx0dmFyIGZlYXR1cmVzID0gW107IFxuXHRcdFx0ZGF0YS5mb3JFYWNoKGVhY2ggPT4ge1xuXHRcdFx0XHR2YXIgY29lcmNlZCA9IHt9O1xuXHRcdFx0XHRmb3IgKCB2YXIga2V5IGluIGVhY2ggKSB7XG5cdFx0XHRcdFx0aWYgKCBlYWNoLmhhc093blByb3BlcnR5KGtleSkgKXtcblx0XHRcdFx0XHRcdGNvZXJjZWRba2V5XSA9ICFpc05hTigrZWFjaFtrZXldKSA/ICtlYWNoW2tleV0gOiBlYWNoW2tleV07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9ICBcblx0XHRcdFx0ZmVhdHVyZXMucHVzaCh7XG5cdFx0XHRcdFx0XCJ0eXBlXCI6IFwiRmVhdHVyZVwiLFxuXHRcdFx0XHRcdFwicHJvcGVydGllc1wiOiBjb2VyY2VkLFxuXHRcdFx0XHRcdFwiZ2VvbWV0cnlcIjoge1xuXHRcdFx0XHRcdFx0XCJ0eXBlXCI6IFwiUG9pbnRcIixcblx0XHRcdFx0XHRcdFwiY29vcmRpbmF0ZXNcIjogWytlYWNoLmxvbmdpdHVkZSwgK2VhY2gubGF0aXR1ZGVdXG5cdFx0XHRcdFx0fSAgIFxuXHRcdFx0XHR9KTtcblx0XHRcdH0pOyAvLyBlbmQgZm9yRWFjaFxuXHRcdFx0Z2VvanNvbiA9ICB7XG5cdFx0XHRcdFwidHlwZVwiOiBcIkZlYXR1cmVDb2xsZWN0aW9uXCIsXG5cdFx0XHRcdFwiZmVhdHVyZXNcIjogZmVhdHVyZXNcblx0XHRcdH07XG5cdFx0XHR0aGVDaGFydHMucHVzaCggLy8gc2hvdWxkIGJlIGFibGUgdG8gY3JlYXRlIGNoYXJ0cyBub3csIHdoZXRoZXIgb3Igbm90IG1hcCBoYXMgbG9hZGVkLiBtYXAgbmVlZHMgdG8gaGF2ZVxuXHRcdFx0XHRcdFx0XHQvLyBsb2FkZWQgZm9yIHRoZW0gdG8gdXBkYXRlLCB0aG91Z2guXG5cdFx0XHRcdG5ldyBEb251dHMuRG9udXQoe1xuXHRcdFx0XHRcdG1hcmdpbjogeyAvLyBwZXJjZW50YWdlc1xuXHRcdCAgICAgICAgICAgICAgICB0b3A6IDE1LFxuXHRcdCAgICAgICAgICAgICAgICByaWdodDogMTAsXG5cdFx0ICAgICAgICAgICAgICAgIGJvdHRvbTogNSxcblx0XHQgICAgICAgICAgICAgICAgbGVmdDogMTBcblx0XHQgICAgICAgICAgICB9LFxuXHRcdCAgICAgICAgICAgIGhlaWdodFRvV2lkdGg6IDEsXG5cdFx0ICAgICAgICAgICAgY29udGFpbmVyOiAnI2NoYXJ0LTAnLFxuXHRcdCAgICAgICAgICAgIGRhdGE6IGdlb2pzb24uZmVhdHVyZXMsXG5cdFx0ICAgICAgICAgICAgY29tcGFyYXRvcjogZnVuY3Rpb24oZWFjaCl7XG5cdFx0ICAgICAgICAgICAgXHRyZXR1cm4gZWFjaC5wcm9wZXJ0aWVzLnRfZGVkIDwgNTtcblx0XHQgICAgICAgICAgICB9IFxuXHRcdFx0XHR9KSxcblx0XHRcdFx0bmV3IEJhcnMuQmFyKHsgXG5cdFx0XHRcdFx0dGl0bGU6ICdQcm9wZXJ0aWVzIGluIHZpZXcnLCBcblx0XHRcdFx0XHRtYXJnaW46IHtcblx0XHRcdFx0XHRcdHRvcDowLFxuXHRcdFx0XHRcdFx0cmlnaHQ6MSxcblx0XHRcdFx0XHRcdGJvdHRvbTowLFxuXHRcdFx0XHRcdFx0bGVmdDoxIFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aGVpZ2h0VG9XaWR0aDogMC4wMyxcblx0XHRcdFx0XHRjb250YWluZXI6ICcjaW4tdmlldy1iYXInLFxuXHRcdFx0XHRcdGRhdGE6IGdlb2pzb24uZmVhdHVyZXMsXG5cdFx0XHRcdFx0bnVtZXJhdG9yKGluVmlld0lEcyl7XG5cdFx0XHRcdFx0XHRyZXR1cm4gaW5WaWV3SURzLnNpemU7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRkZW5vbWluYXRvcigpe1xuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuZGF0YS5sZW5ndGg7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR0ZXh0RnVuY3Rpb24obixkKXtcblx0XHRcdFx0XHRcdHJldHVybiBgJHtkMy5mb3JtYXQoXCIsXCIpKG4pfSBvZiAke2QzLmZvcm1hdChcIixcIikoZCl9ICgke2QzLmZvcm1hdChcIi4wJVwiKShuIC8gZCl9KWA7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KSxcblx0XHRcdFx0bmV3IEJhcnMuQmFyKHtcblx0XHRcdFx0XHR0aXRsZTogJy4uLiB3aXRoIGxvdyBkZWR1Y3RpYmxlJywgXG5cdFx0XHRcdFx0bWFyZ2luOiB7XG5cdFx0XHRcdFx0XHR0b3A6MCxcblx0XHRcdFx0XHRcdHJpZ2h0OjEsXG5cdFx0XHRcdFx0XHRib3R0b206MCxcblx0XHRcdFx0XHRcdGxlZnQ6MSBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGhlaWdodFRvV2lkdGg6IDAuMDMsXG5cdFx0XHRcdFx0Y29udGFpbmVyOiAnI2RlZHVjdGlibGUtYmFyJyxcblx0XHRcdFx0XHRkYXRhOiBnZW9qc29uLmZlYXR1cmVzLFxuXHRcdFx0XHRcdG51bWVyYXRvcihpblZpZXdJRHMpe1xuXHRcdFx0XHRcdFx0dmFyIGZpbHRlcmVkRGF0YSA9IHRoaXMuZGF0YS5maWx0ZXIoZWFjaCA9PiBpblZpZXdJRHMuaGFzKGVhY2gucHJvcGVydGllcy5pZCkpLFxuXHRcdFx0XHRcdFx0XHRudW1iZXJNYXRjaGluZyA9IDA7XG5cdFx0XHRcdFx0XHRmaWx0ZXJlZERhdGEuZm9yRWFjaChlYWNoID0+IHtcblx0XHRcdFx0XHRcdFx0aWYgKCBlYWNoLnByb3BlcnRpZXMudF9kZWQgPCA1ICl7XG5cdFx0XHRcdFx0XHRcdFx0bnVtYmVyTWF0Y2hpbmcrKztcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gbnVtYmVyTWF0Y2hpbmc7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRkZW5vbWluYXRvcihpblZpZXdJRHMpeyAvLyBmb3IgdGhpcyBvbmUgZGVub21pbmF0b3IgaXMgbnVtYmVyIG9mIHBvbGljaWVzIGluIHZpZXdcblx0XHRcdFx0XHRcdCByZXR1cm4gaW5WaWV3SURzLnNpemU7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR0ZXh0RnVuY3Rpb24obixkKXtcblx0XHRcdFx0XHRcdHJldHVybiBgJHtkMy5mb3JtYXQoXCIsXCIpKG4pfSBvZiAke2QzLmZvcm1hdChcIixcIikoZCl9ICgke2QzLmZvcm1hdChcIi4wJVwiKShuIC8gZCl9KWA7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KSxcblx0XHRcdFx0bmV3IEJhcnMuQmFyKHtcblx0XHRcdFx0XHR0aXRsZTogJ0F2ZXJhZ2UgcHJlbWl1bScsIFxuXHRcdFx0XHRcdG1hcmdpbjoge1xuXHRcdFx0XHRcdFx0dG9wOjAsXG5cdFx0XHRcdFx0XHRyaWdodDoxLFxuXHRcdFx0XHRcdFx0Ym90dG9tOjAsXG5cdFx0XHRcdFx0XHRsZWZ0OjEgXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR6U2NvcmVzOiBjYWxjdWxhdGVaU2NvcmVzKCdwcmVtJywyMDAwKSxcblx0XHRcdFx0XHRtaW4oKXtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKHRoaXMpO1xuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuelNjb3Jlcy5taW47XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRoZWlnaHRUb1dpZHRoOiAwLjAzLFxuXHRcdFx0XHRcdGNvbnRhaW5lcjogJyNwcmVtaXVtLWJhcicsXG5cdFx0XHRcdFx0ZGF0YTogZ2VvanNvbi5mZWF0dXJlcyxcblx0XHRcdFx0XHRudW1lcmF0b3IoaW5WaWV3SURzKXtcblx0XHRcdFx0XHRcdHZhciBmaWx0ZXJlZERhdGEgPSB0aGlzLmRhdGEuZmlsdGVyKGVhY2ggPT4gaW5WaWV3SURzLmhhcyhlYWNoLnByb3BlcnRpZXMuaWQpKTtcblx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRyZXR1cm4gZDMubWVhbihmaWx0ZXJlZERhdGEsIGQgPT4gZC5wcm9wZXJ0aWVzLnByZW1aKTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGRlbm9taW5hdG9yKCl7IFxuXHRcdFx0XHRcdFx0IHJldHVybiB0aGlzLnpTY29yZXMubWF4O1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0dGV4dEZ1bmN0aW9uKG4peyBcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKHRoaXMuelNjb3Jlcyk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gJyQnICsgZDMuZm9ybWF0KFwiLC4yZlwiKSh0aGlzLnpTY29yZXMubWVhbiArIHRoaXMuelNjb3Jlcy5zZCAqIG4gKSArICcgKHogPSAnICsgZDMuZm9ybWF0KFwiLjJmXCIpKG4pICsgJyknO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSksXG5cdFx0XHRcdFxuXHRcdFx0XHRuZXcgQmFycy5CYXIoe1xuXHRcdFx0XHRcdHRpdGxlOiAnQXZlcmFnZSByZXBsYWNlbWVudCB2YWx1ZScsIFxuXHRcdFx0XHRcdG1hcmdpbjoge1xuXHRcdFx0XHRcdFx0dG9wOjAsXG5cdFx0XHRcdFx0XHRyaWdodDoxLFxuXHRcdFx0XHRcdFx0Ym90dG9tOjAsXG5cdFx0XHRcdFx0XHRsZWZ0OjEgXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR6U2NvcmVzOiBjYWxjdWxhdGVaU2NvcmVzKCd2YWx1ZScsNTUwLDIwMDAwLFsyNTBdKSxcblx0XHRcdFx0XHRtaW4oKXtcblx0XHRcdFx0XHRcdFxuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuelNjb3Jlcy5taW47XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRoZWlnaHRUb1dpZHRoOiAwLjAzLFxuXHRcdFx0XHRcdGNvbnRhaW5lcjogJyN2YWx1ZS1iYXInLFxuXHRcdFx0XHRcdGRhdGE6IGdlb2pzb24uZmVhdHVyZXMsXG5cdFx0XHRcdFx0bnVtZXJhdG9yKGluVmlld0lEcyl7XG5cdFx0XHRcdFx0XHR2YXIgZmlsdGVyZWREYXRhID0gdGhpcy5kYXRhLmZpbHRlcihlYWNoID0+IGluVmlld0lEcy5oYXMoZWFjaC5wcm9wZXJ0aWVzLmlkKSk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gZDMubWVhbihmaWx0ZXJlZERhdGEsIGQgPT4gZC5wcm9wZXJ0aWVzLnZhbHVlWik7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRkZW5vbWluYXRvcigpeyBcblx0XHRcdFx0XHRcdCByZXR1cm4gdGhpcy56U2NvcmVzLm1heDtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHRleHRGdW5jdGlvbihuKXsgXG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyh0aGlzLnpTY29yZXMpO1xuXHRcdFx0XHRcdFx0cmV0dXJuICckJyArIGQzLmZvcm1hdChcIiwuMGZcIikoKHRoaXMuelNjb3Jlcy5tZWFuICsgdGhpcy56U2NvcmVzLnNkICogbiApICogMTAwMCApICsgJyAoeiA9ICcgKyBkMy5mb3JtYXQoXCIuMmZcIikobikgKyAnKSc7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KVxuXHRcdFx0KTsgLy8gZW5kIHB1c2hcblx0XHRcdGdhdGVDaGVjaysrOyAgXG5cdFx0XHRnYXRlKCk7XG5cdFx0XHQvL2FkZENsdXN0ZXJMYXllcnMocnRuKTtcblx0XHRcdFxuXHRcdH0pOyAvLyBlbmQgZDMgY3N2XG5cdH0gLy8gZW5kIHRvR2VvSlNPTlxuXHQvKnZhciBmZWF0dXJlc0luVmlldyA9IHtcblx0XHRyZW5kZXIoKXtcblx0XHRcdHRoaXMuY2hhcnQgPSBuZXcgQmFycy5CYXIoe1xuXHRcdFx0XHRtYXJnaW46IHtcblx0XHRcdFx0XHR0b3A6MCxcblx0XHRcdFx0XHRyaWdodDowLFxuXHRcdFx0XHRcdGJvdHRvbTowLFxuXHRcdFx0XHRcdGxlZnQ6MFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRoZWlnaHRUb1dpZHRoOiAwLjAzLFxuXHRcdFx0XHRjb250YWluZXI6ICcjdG90YWwtdmlldycsXG5cdFx0XHRcdHRvdGFsOiBnZW9qc29uLmZlYXR1cmVzLmxlbmd0aFxuXHRcdFx0fSk7XG5cblx0XHRcdC8qdGhpcy50b3RhbCA9IGdlb2pzb24uZmVhdHVyZXMubGVuZ3RoO1xuXHRcdFx0dGhpcy5zdmcgPSBkMy5zZWxlY3QoJyN0b3RhbC12aWV3Jylcblx0XHRcdFx0LmFwcGVuZCgnc3ZnJylcblx0XHRcdFx0LmF0dHIoJ3dpZHRoJywgJzEwMCUnKVxuXHQgICAgICAgICAgICAuYXR0cigneG1sbnMnLCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycpXG5cdCAgICAgICAgICAgIC5hdHRyKCd2ZXJzaW9uJywnMS4xJykgXG5cdCAgICAgICAgICAgIC5hdHRyKCd2aWV3Qm94JywgJzAgMCAxMDAgMycpO1xuXG5cdCAgICAgICAgdGhpcy5iYWNrZ3JvdW5kID0gdGhpcy5zdmcuYXBwZW5kKCdsaW5lJylcblx0ICAgICAgICBcdC5jbGFzc2VkKCdiYWNrZ3JvdW5kLWxpbmUnLCB0cnVlKVxuXHQgICAgICAgIFx0LmF0dHIoJ3gwJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kwJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3gxJywxMDApXG5cdCAgICAgICAgXHQuYXR0cigneTEnLDApO1xuXG5cdCAgICAgICAgdGhpcy5saW5lID0gdGhpcy5zdmcuYXBwZW5kKCdsaW5lJylcblx0ICAgICAgICBcdC5jbGFzc2VkKCd0b3RhbC1saW5lJywgdHJ1ZSlcblx0ICAgICAgICBcdC5hdHRyKCd4MCcsMClcblx0ICAgICAgICBcdC5hdHRyKCd5MCcsMClcblx0ICAgICAgICBcdC5hdHRyKCd4MScsMClcblx0ICAgICAgICBcdC5hdHRyKCd5MScsMCk7XG5cblx0ICAgICAgICB0aGlzLnRleHQgPSBkMy5zZWxlY3QoJyN0b3RhbC12aWV3Jylcblx0ICAgICAgICBcdC5hcHBlbmQoJ3NwYW4nKVxuXHQgICAgICAgIFx0LnRleHQoKCkgPT4gYCR7ZDMuZm9ybWF0KFwiLFwiKSh0aGlzLnRvdGFsKX0gb2YgJHtkMy5mb3JtYXQoXCIsXCIpKHRoaXMudG90YWwpfSBpbiB2aWV3YCApO1xuXHQgICAgICAgIFx0XG5cblx0XHRcdHRoaXMudXBkYXRlKGNvdW50RmVhdHVyZXMoKSk7XG5cdFx0fSxcblx0XHR1cGRhdGUobil7XG5cdFx0XHQvKmQzLnNlbGVjdCgnI3RvdGFsLWluLXZpZXcnKVxuXHRcdFx0XHQudGV4dCgoKSA9PiBkMy5mb3JtYXQoXCIsXCIpKG4pICsgJyBvZiAnICsgZDMuZm9ybWF0KFwiLFwiKSh0aGlzLnRvdGFsKSArICcgcHJvcGVydGllcyBpbiB2aWV3Jyk7Ki9cblx0XHRcdC8qdGhpcy5saW5lXG5cdFx0XHRcdC50cmFuc2l0aW9uKCkuZHVyYXRpb24oMjAwKVxuXHRcdFx0XHQuYXR0cigneDEnLCAoKSA9PiAoIG4gLyB0aGlzLnRvdGFsKSAqIDEwMCApO1xuXHRcdFx0dGhpcy50ZXh0XG5cdFx0XHRcdC50ZXh0KCgpID0+IGAke2QzLmZvcm1hdChcIixcIikobil9IG9mICR7ZDMuZm9ybWF0KFwiLFwiKSh0aGlzLnRvdGFsKX0gaW4gdmlld2AgKTtcblxuXHRcdH0qLyBcblxuXHRcblx0dmFyIGluVmlld0lEcyA9IG5ldyBTZXQoKTtcblx0ZnVuY3Rpb24gY291bnRGZWF0dXJlcygpeyBcblx0XHQvKiBqc2hpbnQgbGF4YnJlYWs6dHJ1ZSAqL1xuXHRcdGluVmlld0lEcy5jbGVhcigpOyBcblx0XHQvL3ZhciBjb3VudCA9IDA7XG5cdFx0dmFyIGJvdW5kcyA9IHRoZU1hcC5nZXRCb3VuZHMoKTtcblx0XHRnZW9qc29uLmZlYXR1cmVzLmZvckVhY2goZWFjaCA9PiB7XG5cdFx0XHRpZiAoICAgIGVhY2gucHJvcGVydGllcy5sb25naXR1ZGUgPj0gYm91bmRzLl9zdy5sbmcgXG5cdFx0XHRcdCAmJiBlYWNoLnByb3BlcnRpZXMubG9uZ2l0dWRlIDw9IGJvdW5kcy5fbmUubG5nIFxuXHRcdFx0XHQgJiYgZWFjaC5wcm9wZXJ0aWVzLmxhdGl0dWRlICA+PSBib3VuZHMuX3N3LmxhdCBcblx0XHRcdFx0ICYmIGVhY2gucHJvcGVydGllcy5sYXRpdHVkZSAgPD0gYm91bmRzLl9uZS5sYXQgKXtcblx0XHRcdFx0aW5WaWV3SURzLmFkZChlYWNoLnByb3BlcnRpZXMuaWQpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cdHRoZU1hcC5vbignbW92ZWVuZCcsIGZ1bmN0aW9uKCl7XG5cdFx0dXBkYXRlQWxsKCk7XG5cdH0pO1xuXHR0aGVNYXAub24oJ3pvb21lbmQnLCBmdW5jdGlvbigpe1xuXHRcdHVwZGF0ZUFsbCgpO1xuXHR9KTtcblx0ZnVuY3Rpb24gdXBkYXRlQWxsKCl7XG5cdFx0Y291bnRGZWF0dXJlcygpO1xuXHRcdHRoZUNoYXJ0cy5mb3JFYWNoKGVhY2ggPT4gZWFjaC51cGRhdGUoaW5WaWV3SURzKSk7XG5cdH1cblx0dGhlTWFwLm9uKFwibW91c2Vtb3ZlXCIsIFwicG9pbnRzLWRhdGEtZHJpdmVuXCIsIGZ1bmN0aW9uKGUpIHtcbiAgICAgICAgY29uc29sZS5sb2coZSk7XG4gICAgfSk7XG5cblx0cmV0dXJuIHRoZU1hcDtcbiAgIFxufSgpKTsgLy8gZW5kIElJRkUgIiwiZXhwb3J0IGNvbnN0IEJhcnMgPSAoZnVuY3Rpb24oKXtcblxuXHR2YXIgQmFyID0gZnVuY3Rpb24oY29uZmlnT2JqZWN0KXsgLy8gbWFyZ2lucyB7fSwgaGVpZ2h0ICMsIHdpZHRoICMsIGNvbnRhaW5lcklELCBkYXRhUGF0aFxuXHQgICAgdGhpcy5zZXR1cChjb25maWdPYmplY3QpO1xuXHR9O1xuXG5cdEJhci5wcm90b3R5cGUgPSB7XG5cdFx0c2V0dXAoY29uZmlnT2JqZWN0KXsgLy8gc29tZSBvZiBzZXR1cCBpcyBjb21tb24gdG8gYWxsIGNoYXJ0cyBhbmQgY291bGQgYmUgaGFuZGxlZCBieSBwcm90b3R5cGljYWwgaW5oZXJpdGFuY2Vcblx0ICAgIFx0Y29uc29sZS5sb2coY29uZmlnT2JqZWN0KTtcblx0ICAgICAgICB2YXIgdmlld0JveCA9ICcwIDAgMTAwICcgKyBNYXRoLnJvdW5kKGNvbmZpZ09iamVjdC5oZWlnaHRUb1dpZHRoICogMTAwKTtcblx0ICAgICAgICB0aGlzLmNvbnRhaW5lciA9IGNvbmZpZ09iamVjdC5jb250YWluZXI7XG5cdCAgICAgICAgdGhpcy5tYXJnaW4gPSBjb25maWdPYmplY3QubWFyZ2luO1xuXHQgICAgICAgIHRoaXMud2lkdGggPSAxMDAgLSB0aGlzLm1hcmdpbi5sZWZ0IC0gdGhpcy5tYXJnaW4ucmlnaHQ7XG5cdCAgICAgICAgdGhpcy5oZWlnaHQgPSBjb25maWdPYmplY3QuaGVpZ2h0VG9XaWR0aCAqIDEwMCAtIHRoaXMubWFyZ2luLnRvcCAtIHRoaXMubWFyZ2luLmJvdHRvbTtcblx0ICAgICAgICB0aGlzLnRpdGxlID0gY29uZmlnT2JqZWN0LnRpdGxlO1xuXHQgICAgICAgIHRoaXMuY29tcGFyYXRvciA9IGNvbmZpZ09iamVjdC5jb21wYXJhdG9yO1xuXHQgICAgICAgIHRoaXMuYmFja2dyb3VuZENvbG9yID0gY29uZmlnT2JqZWN0LmJhY2tncm91bmRDb2xvciB8fCAnZ3JheSc7XG5cdCAgICAgICAgdGhpcy5kYXRhID0gY29uZmlnT2JqZWN0LmRhdGE7XG5cdCAgICAgICAgdGhpcy5udW1lcmF0b3IgPSBjb25maWdPYmplY3QubnVtZXJhdG9yO1xuXHQgICAgICAgIHRoaXMuZGVub21pbmF0b3IgPSBjb25maWdPYmplY3QuZGVub21pbmF0b3I7XG5cdCAgICAgICAgdGhpcy50ZXh0RnVuY3Rpb24gPSBjb25maWdPYmplY3QudGV4dEZ1bmN0aW9uO1xuXHQgICAgICAgIHRoaXMuelNjb3JlcyA9IGNvbmZpZ09iamVjdC56U2NvcmVzIHx8IG51bGw7XG5cdCAgICAgICAgdGhpcy5taW4gPSBjb25maWdPYmplY3QubWluID8gY29uZmlnT2JqZWN0Lm1pbi5jYWxsKHRoaXMpIDogMDtcblx0ICAgICAgICAvL3RoaXMubWF4ID0gY29uZmlnT2JqZWN0Lm1heCA/IGNvbmZpZ09iamVjdC5tYXguY2FsbCh0aGlzKSA6IDEwMDtcblx0ICAgICAgICAvL3RoaXMuc2NhbGUgPSBkMy5zY2FsZUxpbmVhcigpLmRvbWFpbihbdGhpcy5taW4sdGhpcy5tYXhdKS5yYW5nZShbMCx0aGlzLndpZHRoXSk7XG5cdCAgICAgICAgXG5cblx0ICAgICAgICBkMy5zZWxlY3QodGhpcy5jb250YWluZXIpXG5cdCAgICAgICAgXHQuYXBwZW5kKCdzcGFuJylcblx0ICAgICAgICBcdC5jbGFzc2VkKCdmaWd1cmUtdGl0bGUnLCB0cnVlKVxuXHQgICAgICAgIFx0LnRleHQodGhpcy50aXRsZSk7XG5cblx0ICAgICAgICB0aGlzLnN2ZyA9IGQzLnNlbGVjdCh0aGlzLmNvbnRhaW5lcilcblx0ICAgICAgICAgICAgLmFwcGVuZCgnc3ZnJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3dpZHRoJywgJzEwMCUnKVxuXHQgICAgICAgICAgICAuYXR0cigneG1sbnMnLCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycpXG5cdCAgICAgICAgICAgIC5hdHRyKCd2ZXJzaW9uJywnMS4xJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3ZpZXdCb3gnLCB2aWV3Qm94KVxuXHQgICAgICAgICAgICAuYXBwZW5kKCdnJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIHRoaXMubWFyZ2luLmxlZnQgKyAnLCcgKyB0aGlzLm1hcmdpbi50b3AgKyAnKScpO1xuXG5cdCAgICAgICAgdGhpcy5iYWNrZ3JvdW5kID0gdGhpcy5zdmcuYXBwZW5kKCdsaW5lJylcblx0ICAgICAgICBcdC5jbGFzc2VkKCdiYWNrZ3JvdW5kLWxpbmUtJyArIHRoaXMuYmFja2dyb3VuZENvbG9yLCB0cnVlKVxuXHQgICAgICAgIFx0LmF0dHIoJ3gwJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kwJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3gxJyx0aGlzLndpZHRoKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kxJywwKTtcblxuXHQgICAgICAgIHRoaXMubGluZSA9IHRoaXMuc3ZnLmFwcGVuZCgnbGluZScpXG5cdCAgICAgICAgXHQuY2xhc3NlZCgnZm9yZWdyb3VuZC1saW5lJywgdHJ1ZSlcblx0ICAgICAgICBcdC5hdHRyKCd4MCcsMClcblx0ICAgICAgICBcdC5hdHRyKCd5MCcsMClcblx0ICAgICAgICBcdC5hdHRyKCd4MScsMClcblx0ICAgICAgICBcdC5hdHRyKCd5MScsMCk7XG5cblx0ICAgICAgICB0aGlzLnRleHQgPSBkMy5zZWxlY3QodGhpcy5jb250YWluZXIpXG5cdCAgICAgICAgXHQuYXBwZW5kKCdzcGFuJyk7XG5cdCAgICAgICAgXHRcblxuXHQgICAgICAgIC8vdGhpcy51cGRhdGUodGhpcy5udW1lcmF0b3IoKSk7ICBcbiAgICAgICAgfSxcbiAgICAgICAgdXBkYXRlKGluVmlld0lEcyl7XG4gICAgICAgIFx0Y29uc29sZS5sb2codGhpcyk7XG5cdFx0XHR2YXIgbiA9IHRoaXMubnVtZXJhdG9yKGluVmlld0lEcyksXG5cdFx0XHRcdGQgPSB0aGlzLmRlbm9taW5hdG9yKGluVmlld0lEcyk7IFxuXHRcdFx0ZDMuc2VsZWN0KHRoaXMuY29udGFpbmVyKVxuXHRcdFx0XHQuY2xhc3NlZCgnb3ZlcmZsb3cnLCBuID4gZCApO1xuICAgICAgICBcdGlmICggdGhpcy5taW4gPCAwICYmIE1hdGguYWJzKHRoaXMubWluKSA8IGQgJiYgZCA+IDAgKSB7XG4gICAgICAgIFx0XHR0aGlzLm1pbiA9IDAgLSBkO1xuICAgICAgICBcdH1cblx0XHRcdHRoaXMuc2NhbGUgPSBkMy5zY2FsZUxpbmVhcigpLmRvbWFpbihbdGhpcy5taW4sZF0pLnJhbmdlKFswLHRoaXMud2lkdGhdKS5jbGFtcCh0cnVlKTtcblx0XHRcdHRoaXMubGluZVxuXHRcdFx0XHQudHJhbnNpdGlvbigpLmR1cmF0aW9uKDIwMClcblx0XHRcdFx0LmF0dHIoJ3gxJywgKCkgPT4gdGhpcy5zY2FsZShuKSk7XG5cdFx0XHR0aGlzLnRleHRcblx0XHRcdFx0LnRleHQoKCkgPT4gdGhpcy50ZXh0RnVuY3Rpb24obixkKSk7XG5cdFx0fVxuXHR9O1xuXG5cdHJldHVybiB7XG5cdFx0QmFyXG5cdH07XG4gICAgICAgIFxufSkoKTsiLCJleHBvcnQgY29uc3QgRG9udXRzID0gKGZ1bmN0aW9uKCl7XG4gICAgLyogZ2xvYmFscyBkMyAqL1xuICAgLyogY29uc3QgbWVkaWFuSW5jb21lcyA9IG5ldyBNYXAoKTtcbiAgICBmdW5jdGlvbiBjcmVhdGVNZWRpYW5JbmNvbWVNYXAoZ2VvanNvbil7XG5cdFx0Z2VvanNvbi5mZWF0dXJlcy5mb3JFYWNoKGVhY2ggPT4ge1xuXHRcdFx0aWYgKCAhbWVkaWFuSW5jb21lcy5oYXMoZWFjaC5wcm9wZXJ0aWVzLmNlbl90cmFjdCkgKXtcblx0XHRcdFx0bGV0IGluY29tZSA9IGVhY2gucHJvcGVydGllcy5tZWRfaW5jb21lID4gMCA/IGVhY2gucHJvcGVydGllcy5tZWRfaW5jb21lIDogbnVsbDtcblx0XHRcdFx0bWVkaWFuSW5jb21lcy5zZXQoZWFjaC5wcm9wZXJ0aWVzLmNlbl90cmFjdCwgaW5jb21lKTsgXHRcblx0XHRcdH1cblx0XHR9KTtcblx0XHRjb25zb2xlLmxvZyhtZWRpYW5JbmNvbWVzKTtcblx0XHR3aW5kb3cubWVkaWFuSW5jb21lcyA9IG1lZGlhbkluY29tZXM7XG5cdFx0Ly9jcmVhdGVDaGFydHMoZ2VvanNvbik7XG5cdH0gKi9cblx0XG4gICAgdmFyIHRhdSA9IDIgKiBNYXRoLlBJO1xuXHR2YXIgRG9udXQgPSBmdW5jdGlvbihjb25maWdPYmplY3QpeyAvLyBtYXJnaW5zIHt9LCBoZWlnaHQgIywgd2lkdGggIywgY29udGFpbmVySUQsIGRhdGFQYXRoXG5cdCAgICBjb25zb2xlLmxvZyh0aGlzLCBjb25maWdPYmplY3QpO1xuXHQgICAgdGhpcy5zZXR1cChjb25maWdPYmplY3QpO1xuXHR9O1xuXG5cdERvbnV0LnByb3RvdHlwZSA9IHtcblxuXHQgICAgc2V0dXAoY29uZmlnT2JqZWN0KXtcblx0ICAgIFx0Y29uc29sZS5sb2coJ2luIHNldCB1cCcpO1xuXHQgICAgICAgIHZhciB2aWV3Qm94ID0gJzAgMCAxMDAgJyArIE1hdGgucm91bmQoY29uZmlnT2JqZWN0LmhlaWdodFRvV2lkdGggKiAxMDApO1xuXHQgICAgICAgIHRoaXMubWFyZ2luID0gY29uZmlnT2JqZWN0Lm1hcmdpbjtcblx0ICAgICAgICB0aGlzLndpZHRoID0gMTAwIC0gdGhpcy5tYXJnaW4ubGVmdCAtIHRoaXMubWFyZ2luLnJpZ2h0O1xuXHQgICAgICAgIHRoaXMuaGVpZ2h0ID0gY29uZmlnT2JqZWN0LmhlaWdodFRvV2lkdGggKiAxMDAgLSB0aGlzLm1hcmdpbi50b3AgLSB0aGlzLm1hcmdpbi5ib3R0b207XG5cdCAgICAgICAgdGhpcy5yYWRpdXMgPSBNYXRoLm1pbih0aGlzLndpZHRoLHRoaXMuaGVpZ2h0KSAvIDM7XG5cdCAgICAgICAgdGhpcy5kYXRhID0gY29uZmlnT2JqZWN0LmRhdGE7XG5cdCAgICAgICAgdGhpcy5jb21wYXJhdG9yID0gY29uZmlnT2JqZWN0LmNvbXBhcmF0b3I7XG5cdCAgICAgIFxuXHQgICAgICAgIHRoaXMuYXJjID0gZDMuYXJjKClcblx0ICAgICAgICAgIC5vdXRlclJhZGl1cyh0aGlzLnJhZGl1cykgXG5cdCAgICAgICAgICAuaW5uZXJSYWRpdXModGhpcy5yYWRpdXMgLyAxLjUpXG5cdCAgICAgICAgICAuc3RhcnRBbmdsZSgwKTsgXG5cblx0ICAgICAgICB0aGlzLnN2ZyA9IGQzLnNlbGVjdChjb25maWdPYmplY3QuY29udGFpbmVyKVxuXHQgICAgICAgICAgICAuYXBwZW5kKCdzdmcnKVxuXHQgICAgICAgICAgICAuYXR0cignd2lkdGgnLCAnMTAwJScpXG5cdCAgICAgICAgICAgIC5hdHRyKCd4bWxucycsJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3ZlcnNpb24nLCcxLjEnKVxuXHQgICAgICAgICAgICAuYXR0cigndmlld0JveCcsIHZpZXdCb3gpXG5cdCAgICAgICAgICAgIC5hcHBlbmQoJ2cnKVxuXHQgICAgICAgICAgICAuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgdGhpcy5tYXJnaW4ubGVmdCArICcsJyArIHRoaXMubWFyZ2luLnRvcCArICcpJyk7XG5cblx0ICAgIFx0dGhpcy5zdmcuYXBwZW5kKCdwYXRoJylcblx0ICAgICAgICAgICAgLmNsYXNzZWQoJ2JhY2tncm91bmQnLHRydWUpXG5cdCAgICAgICAgICAgIC5kYXR1bSh7ZW5kQW5nbGU6IHRhdX0pXG5cdCAgICAgICAgICAgIC5hdHRyKCdkJywgdGhpcy5hcmMpXG5cdCAgICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyB0aGlzLndpZHRoIC8gMiArICcsJyArIHRoaXMuaGVpZ2h0IC8gMiArICcpJyk7XG5cblx0ICAgICAgICB0aGlzLmZvcmVncm91bmQgPSB0aGlzLnN2Zy5hcHBlbmQoJ3BhdGgnKVxuXHQgICAgICAgICAgICAuZGF0dW0oe2VuZEFuZ2xlOiAwfSlcblx0ICAgICAgICAgICAgLmNsYXNzZWQoJ2ZvcmVncm91bmQnLHRydWUpXG5cdCAgICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyB0aGlzLndpZHRoIC8gMiArICcsJyArIHRoaXMuaGVpZ2h0IC8gMiArICcpJylcblx0ICAgICAgICAgICAgLmF0dHIoJ2QnLCB0aGlzLmFyYyk7XG4gXG5cdCAgICAgLy8gICB0aGlzLnVwZGF0ZSh0cnVlKTtcblxuXHQgICAgICAgIC8qIHRoaXMuc3ZnLmFwcGVuZChcInRleHRcIilcblx0ICAgICAgICAgICAgLmF0dHIoXCJ0ZXh0LWFuY2hvclwiLCBcIm1pZGRsZVwiKVxuXHQgICAgICAgICAgICAuYXR0cignY2xhc3MnLCdwaWVfbnVtYmVyJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3knLDUpXG5cdCAgICAgICAgICAgIC50ZXh0KGQzLmZvcm1hdChcIi4yc1wiKSh0aGlzLnZhbHVlKSlcblx0ICAgICAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIHRoaXMud2lkdGggLyAyICsgJywnICsgdGhpcy5oZWlnaHQgLyAyICsgJyknKTsqL1xuXG5cdCAgICB9LFxuXHQgICAgdXBkYXRlKGluVmlld0lEcyl7XG5cdCAgICBcdHZhclx0bnVtYmVyTWF0Y2hpbmcgPSAwLFxuXHQgICAgXHRcdGZpbHRlcmVkRGF0YSA9IHRoaXMuZGF0YS5maWx0ZXIoZWFjaCA9PiBpblZpZXdJRHMuaGFzKGVhY2gucHJvcGVydGllcy5pZCkpLFxuXHQgICAgXHRcdHRvdGFsID0gZmlsdGVyZWREYXRhLmxlbmd0aDtcblxuICAgIFx0XHRmaWx0ZXJlZERhdGEuZm9yRWFjaChlYWNoID0+IHtcbiAgICBcdFx0XHRpZiAoIHRoaXMuY29tcGFyYXRvcihlYWNoKSApe1xuICAgIFx0XHRcdFx0bnVtYmVyTWF0Y2hpbmcrKztcbiAgICBcdFx0XHR9XG4gICAgXHRcdH0pO1xuXHQgICAgXHRcblx0ICAgIFx0dmFyIGVuZEFuZ2xlID0gKG51bWJlck1hdGNoaW5nIC8gdG90YWwpICogdGF1O1xuXG5cdCAgICBcdHRoaXMuZm9yZWdyb3VuZCBcblx0ICAgIFx0XHQudHJhbnNpdGlvbigpLmR1cmF0aW9uKDUwMClcblx0ICAgIFx0XHQuYXR0clR3ZWVuKCdkJywgdGhpcy5hcmNUd2VlbihlbmRBbmdsZSkpO1xuXG5cdCAgICB9LFxuXHQgICAgYXJjVHdlZW4obmV3QW5nbGUpIHsgLy8gSFQgaHR0cDovL2JsLm9ja3Mub3JnL21ib3N0b2NrLzUxMDA2MzZcblx0XHRcdHJldHVybiBkID0+IHtcblx0XHRcdCAgICB2YXIgaW50ZXJwb2xhdGUgPSBkMy5pbnRlcnBvbGF0ZShkLmVuZEFuZ2xlLCBuZXdBbmdsZSk7XG5cdFx0XHQgICAgcmV0dXJuIHQgPT4ge1xuXHRcdFx0ICAgICAgZC5lbmRBbmdsZSA9IGludGVycG9sYXRlKHQpO1xuXHRcdFx0XHQgICAgICByZXR1cm4gdGhpcy5hcmMoZCk7XG5cdFx0XHQgICAgfTtcblx0XHRcdH07XG5cdFx0fVxuXHR9O1xuXHRcblx0cmV0dXJuIHtcblx0XHREb251dFxuXHR9O1xufSgpKTsiLCJjb25zdCBtYkhlbHBlciA9IHtcbiAgICBwcm9taXNlczoge30sXG4gICAgYWRkU291cmNlQW5kTGF5ZXJzKHNvdXJjZU9wdGlvbnMsbGF5ZXJPcHRpb25zQXJyYXkpeyAvLyB0aGlzID0gbWFwXG4gICAgICAgIHZhciBzb3VyY2VOYW1lID0gc291cmNlT3B0aW9ucy5uYW1lO1xuICAgICAgICBtYkhlbHBlci5wcm9taXNlc1tzb3VyY2VPcHRpb25zLm5hbWVdID0gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHsgLy8gVE8gRE86IGZpZ3VyZSBvdXQgcmVqZWN0P1xuICAgICAgICAgICAgZGVsZXRlIHNvdXJjZU9wdGlvbnMubmFtZTtcbiAgICAgICAgICAgIGZ1bmN0aW9uIGNoZWNrRGF0YUxvYWRlZCgpe1xuICAgICAgICAgICAgICAgIGlmICggdGhpcy5nZXRTb3VyY2Uoc291cmNlTmFtZSkgKXsgLy8gaWYgYWRkU291cmNlIGhhcyB0YWtlbiBlZmZlY3RcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vZmYoJ3JlbmRlcicsIGNoZWNrRGF0YUxvYWRlZCk7IC8vIHR1cm4gb2ZmIHRoZSBsaXN0ZW5lciBmb3IgcmVuZGVyXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5vbigncmVuZGVyJywgY2hlY2tEYXRhTG9hZGVkKTtcbiAgICAgICAgICAgIHRoaXMuYWRkU291cmNlKHNvdXJjZU5hbWUsIHNvdXJjZU9wdGlvbnMpO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGxheWVyUHJvbWlzZXMgPSBbXTtcbiAgICAgICAgcmV0dXJuIG1iSGVscGVyLnByb21pc2VzW3NvdXJjZU5hbWVdLnRoZW4oKCkgPT4geyBcbiAgICAgICAgICAgIGxheWVyT3B0aW9uc0FycmF5LmZvckVhY2goKGVhY2gpID0+IHtcbiAgICAgICAgICAgICAgICBsYXllclByb21pc2VzLnB1c2goXG4gICAgICAgICAgICAgICAgICAgIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7IC8vIFRPIERPOiBmaWd1cmUgb3V0IHJlamVjdD9cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBiZWZvcmVMYXllciA9IGVhY2guYmVmb3JlTGF5ZXIgPyBlYWNoLmJlZm9yZUxheWVyIDogJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgZWFjaC5iZWZvcmVMYXllcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVhY2guc291cmNlID0gc291cmNlTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGNoZWNrTGF5ZXJMb2FkZWQoKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIHRoaXMuZ2V0TGF5ZXIoZWFjaC5pZCkgKXsgLy8gaWYgYWRkTGF5ZXIgIGhhcyB0YWtlbiBlZmZlY3RcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vZmYoJ3JlbmRlcicsIGNoZWNrTGF5ZXJMb2FkZWQpOyAvLyB0dXJuIG9mZiB0aGUgbGlzdGVuZXIgZm9yIHJlbmRlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub24oJ3JlbmRlcicsIGNoZWNrTGF5ZXJMb2FkZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRMYXllcihlYWNoLCBiZWZvcmVMYXllcik7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKGxheWVyUHJvbWlzZXMpO1xuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG5leHBvcnRzLmFkZFNvdXJjZUFuZExheWVycyA9IG1iSGVscGVyLmFkZFNvdXJjZUFuZExheWVyczsiXX0=
