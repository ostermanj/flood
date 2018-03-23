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

	function calculateZScores(field, cutoff) {
		// cutoff specifies upper bound to get rid of outliers
		console.log('calculating z-scores');
		var mean = d3.mean(geojson.features, function (d) {
			return d.properties[field];
		});
		var sd = d3.deviation(geojson.features, function (d) {
			return d.properties[field];
		});
		var min,
		    max,
		    cutoffZ = (cutoff - mean) / sd;

		console.log('cutoff is ' + cutoffZ);
		geojson.features.forEach(function (each) {
			each.properties[field + 'Z'] = (each.properties[field] - mean) / sd;
			min = each.properties[field + 'Z'] < min || min === undefined ? each.properties[field + 'Z'] : min;
			max = each.properties[field + 'Z'] > max || max === undefined ? each.properties[field + 'Z'] : max;
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
				zScores: calculateZScores('prem', 2200),
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
					return '$' + d3.format(".2f")(this.zScores.mean + this.zScores.sd * n) + ' (z = ' + d3.format(".2f")(n) + ')';
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
	/*theMap.on("mousemove", "points-data-driven", function(e) {
        console.log(e);
    });*/

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkZXYtanMvbWFpbi5lczYiLCJqcy1leHBvcnRzL0JhcnMuanMiLCJqcy1leHBvcnRzL0RvbnV0cy5qcyIsIm5vZGVfbW9kdWxlcy9tYXBib3gtaGVscGVyL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNDQzs7QUFDQTs7QUFDQTs7QUFFRDs7Ozs7Ozs7QUFRQTs7Ozs7QUFiQztBQWtCRCxPQUFPLE1BQVAsR0FBa0IsWUFBVTtBQUM1Qjs7QUFFSSxVQUFTLFdBQVQsR0FBdUIsOEZBQXZCOztBQUVBLEtBQU0sV0FBVyxRQUFRLGVBQVIsQ0FBakI7QUFDQSxLQUFNLFlBQVksRUFBbEI7O0FBRUEsS0FBSSxPQUFKO0FBQ0EsS0FBSSxZQUFZLENBQWhCOztBQUVBLEtBQUksU0FBUyxJQUFJLFNBQVMsR0FBYixDQUFpQjtBQUM3QixhQUFXLEtBRGtCO0FBRTdCLFNBQU8scURBRnNCO0FBRzdCLFVBQVEsQ0FBQyxDQUFDLGlCQUFGLEVBQXFCLGtCQUFyQixDQUhxQjtBQUk3QixRQUFNLENBSnVCO0FBSzdCLGFBQVcsQ0FBQyxDQUFDLENBQUMsa0JBQUYsRUFBc0Isa0JBQXRCLENBQUQsRUFBMkMsQ0FBQyxDQUFDLGdCQUFGLEVBQW1CLGlCQUFuQixDQUEzQyxDQUxrQjtBQU03QixXQUFTLEdBTm9CO0FBTzdCLHNCQUFvQjtBQVBTLEVBQWpCLENBQWI7O0FBVUgsS0FBSSxNQUFNLElBQUksU0FBUyxpQkFBYixDQUErQixFQUFDLGFBQVksS0FBYixFQUEvQixDQUFWO0FBQ0EsUUFBTyxVQUFQLENBQWtCLEdBQWxCLEVBQXVCLFVBQXZCOztBQUVBLFdBQVUsY0FBVjs7QUFFQSxRQUFPLEVBQVAsQ0FBVSxNQUFWLEVBQWtCLFlBQVU7QUFDM0I7QUFDQTtBQUNBLEVBSEQ7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d0JBQUksY0FBYyxLQUFLLFdBQUwsR0FBbUIsS0FBSyxXQUF4QixHQUFzQyxFQUF4RDtBQUNBLDJCQUFPLEtBQUssV0FBWjtBQUNBLHlCQUFLLE1BQUwsR0FBYyxVQUFkO0FBQ0EsNkJBQVMsZ0JBQVQsR0FBMkI7QUFDdkIsNEJBQUssS0FBSyxRQUFMLENBQWMsS0FBSyxFQUFuQixDQUFMLEVBQTZCO0FBQUU7QUFDM0Isb0NBQVEsSUFBUjtBQUNBLGlDQUFLLEdBQUwsQ0FBUyxRQUFULEVBQW1CLGdCQUFuQixFQUZ5QixDQUVhO0FBQ3pDO0FBQ0o7QUFDRCwwQkFBSyxFQUFMLENBQVEsUUFBUixFQUFrQixnQkFBbEI7QUFDQSwwQkFBSyxRQUFMLENBQWMsSUFBZCxFQUFvQixXQUFwQjtBQUNILGlCQVpELENBREo7QUFlSCxhQWhCRDtBQWlCQSxtQkFBTyxRQUFRLEdBQVIsQ0FBWSxhQUFaLENBQVA7QUFDSCxTQW5CTSxDQUFQO0FBb0JIO0FBcENZLENBQWpCOztBQXVDQSxRQUFRLGtCQUFSLEdBQTZCLFNBQVMsa0JBQXRDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc31yZXR1cm4gZX0pKCkiLCIgLyogZXhwb3J0ZWQgQ2hhcnRzICovXG4gaW1wb3J0IHsgRG9udXRzIH0gZnJvbSAnLi4vanMtZXhwb3J0cy9Eb251dHMnO1xuIGltcG9ydCB7IEJhcnMgfSBmcm9tICcuLi9qcy1leHBvcnRzL0JhcnMnO1xuIC8qIHBvbHlmaWxscyBuZWVkZWQ6IFByb21pc2UgVE8gRE86IE9USEVSUz9cbiAqL1xuLypcbmltcG9ydCB7IHJlZmxlY3QsIGFycmF5RmluZCwgU1ZHSW5uZXJIVE1MLCBTVkdGb2N1cyB9IGZyb20gJy4uL2pzLXZlbmRvci9wb2x5ZmlsbHMnO1xuaW1wb3J0IHsgSGVscGVycyB9IGZyb20gJy4uL2pzLWV4cG9ydHMvSGVscGVycyc7XG5pbXBvcnQgeyBkM1RpcCB9IGZyb20gJy4uL2pzLXZlbmRvci9kMy10aXAnO1xuaW1wb3J0IHsgY3JlYXRlQnJvd3NlQnV0dG9uIH0gZnJvbSAnLi4vanMtZXhwb3J0cy9Ccm93c2VCdXR0b25zJztcbmltcG9ydCB7IGNyZWF0ZVJlc3VsdEl0ZW0gfSBmcm9tICcuLi9qcy1leHBvcnRzL1Jlc3VsdEl0ZW1zJzsgXG4qL1xuICBcbi8qXG50byBkbyA6IHNlZSBhbHNvIGh0dHBzOi8vd3d3Lm1hcGJveC5jb20vbWFwYm94LWdsLWpzL2V4YW1wbGUvaGVhdG1hcC1sYXllci9cblxuXG4qL1xud2luZG93LnRoZU1hcCAgPSAoZnVuY3Rpb24oKXsgICBcblwidXNlIHN0cmljdFwiO1xuXHRcbiAgICBtYXBib3hnbC5hY2Nlc3NUb2tlbiA9ICdway5leUoxSWpvaWIzTjBaWEp0WVc1cUlpd2lZU0k2SW1OcGRuVTVkSFZuZGpBMmVEWXliM0EzTm5nMWNHSjNaWG9pZlEuWG9fay1rekdmWVhfWW9fUkRjSERCZyc7XG5cbiAgICBjb25zdCBtYkhlbHBlciA9IHJlcXVpcmUoJ21hcGJveC1oZWxwZXInKTtcbiAgIFx0Y29uc3QgdGhlQ2hhcnRzID0gW107XG4gICBcbiAgICB2YXIgZ2VvanNvbjtcbiAgICB2YXIgZ2F0ZUNoZWNrID0gMDtcbiAgICBcbiAgICB2YXIgdGhlTWFwID0gbmV3IG1hcGJveGdsLk1hcCh7XG5cdCAgICBjb250YWluZXI6ICdtYXAnLFxuXHQgICAgc3R5bGU6ICdtYXBib3g6Ly9zdHlsZXMvb3N0ZXJtYW5qL2NqZjAzbzM3YjN0dmUycnFwMmludzZhMWYnLFxuXHQgICAgY2VudGVyOiBbLTk2LjI5MTkyOTYxMTI5ODgzLCAzOC40NTMxNzUyODkwNTM3NDZdLFxuXHQgICAgem9vbTogMyxcblx0ICAgIG1heEJvdW5kczogW1stMTQyLjg4NzA1NzE0NzQ2MzYyLCAxNi4wNTgzNDQ5NDg0MzI0MDZdLFstNTEuOTAyMzAxNzg2OTczMSw1NS43NjY5MDA2NzQxNzEzOF1dLFxuXHQgICAgbWluWm9vbTogMS41LFxuXHQgICAgYXR0cmlidXRpb25Db250cm9sOiBmYWxzZSxcblx0fSk7XG5cblx0dmFyIG5hdiA9IG5ldyBtYXBib3hnbC5OYXZpZ2F0aW9uQ29udHJvbCh7c2hvd0NvbXBhc3M6ZmFsc2V9KTtcblx0dGhlTWFwLmFkZENvbnRyb2wobmF2LCAndG9wLWxlZnQnKTtcblxuXHR0b0dlb0pTT04oJ3BvbGljaWVzLmNzdicpO1xuXG5cdHRoZU1hcC5vbignbG9hZCcsIGZ1bmN0aW9uKCl7XG5cdFx0Z2F0ZUNoZWNrKys7XG5cdFx0Z2F0ZSgpO1xuXHR9KTtcblx0ZnVuY3Rpb24gZ2F0ZSgpe1xuXHRcdGlmICggZ2F0ZUNoZWNrIDwgMiApe1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR1cGRhdGVBbGwoKTtcblx0XHRhZGRVbmNsdXN0ZXJlZCgpO1xuXHRcdGFkZENsdXN0ZXJlZCgpO1xuXHRcdC8vY2FsY3VsYXRlWlNjb3JlcygncHJlbScpO1xuXHR9IC8vIGVuZCBnYXRlXG5cblx0ZnVuY3Rpb24gY2FsY3VsYXRlWlNjb3JlcyhmaWVsZCxjdXRvZmYpeyAvLyBjdXRvZmYgc3BlY2lmaWVzIHVwcGVyIGJvdW5kIHRvIGdldCByaWQgb2Ygb3V0bGllcnNcblx0XHRjb25zb2xlLmxvZygnY2FsY3VsYXRpbmcgei1zY29yZXMnKTtcblx0XHR2YXIgbWVhbiA9IGQzLm1lYW4oZ2VvanNvbi5mZWF0dXJlcywgZCA9PiBkLnByb3BlcnRpZXNbZmllbGRdKTtcblx0XHR2YXIgc2QgPSAgIGQzLmRldmlhdGlvbihnZW9qc29uLmZlYXR1cmVzLCBkID0+IGQucHJvcGVydGllc1tmaWVsZF0pO1xuXHRcdHZhciBtaW4sXG5cdFx0XHRtYXgsXG5cdFx0XHRjdXRvZmZaID0gKCBjdXRvZmYgLSBtZWFuICkgLyBzZDtcblxuXHRcdGNvbnNvbGUubG9nKCdjdXRvZmYgaXMgJyArIGN1dG9mZlopO1xuXHRcdGdlb2pzb24uZmVhdHVyZXMuZm9yRWFjaChlYWNoID0+IHtcblx0XHRcdGVhY2gucHJvcGVydGllc1tmaWVsZCArICdaJ10gPSAoIGVhY2gucHJvcGVydGllc1tmaWVsZF0gLSBtZWFuICkgLyBzZDtcblx0XHRcdG1pbiA9IGVhY2gucHJvcGVydGllc1tmaWVsZCArICdaJ10gPCBtaW4gfHwgbWluID09PSB1bmRlZmluZWQgPyBlYWNoLnByb3BlcnRpZXNbZmllbGQgKyAnWiddIDogbWluO1xuXHRcdFx0bWF4ID0gZWFjaC5wcm9wZXJ0aWVzW2ZpZWxkICsgJ1onXSA+IG1heCB8fCBtYXggPT09IHVuZGVmaW5lZCA/IGVhY2gucHJvcGVydGllc1tmaWVsZCArICdaJ10gOiBtYXg7XG5cdFx0fSk7XG5cdFx0bWF4ID0gZDMubWluKFttYXgsY3V0b2ZmWiwzXSk7XG5cdFx0bWluID0gZDMubWF4KFttaW4sIC0zXSk7XG5cdFx0Y29uc29sZS5sb2coJ2RvbmUnLCBnZW9qc29uLCBtaW4sIG1heCk7XG5cdFx0cmV0dXJuIHtcblx0XHRcdG1pbixcblx0XHRcdG1heCxcblx0XHRcdG1lYW4sXG5cdFx0XHRzZFxuXHRcdH07XG5cdH1cblxuXHRmdW5jdGlvbiBhZGRVbmNsdXN0ZXJlZCgpe1xuXHRcdHJldHVybiBtYkhlbHBlci5hZGRTb3VyY2VBbmRMYXllcnMuY2FsbCh0aGVNYXAsXG5cdFx0XHR7IC8vIHNvdXJjZVxuXHRcdFx0XHRcIm5hbWVcIjogXCJwb2xpY3ktcG9pbnRzXCIsXG5cdFx0ICAgICAgICBcInR5cGVcIjogXCJnZW9qc29uXCIsXG5cdFx0ICAgICAgICBcImRhdGFcIjogZ2VvanNvblxuXHRcdFx0fSwgWyAvLyBsYXllcnNcblx0XHRcdFx0eyAvLyBsYXllciBvbmVcblx0ICAgICAgICAgICAgXCJpZFwiOiBcInBvaW50c1wiLFxuXHQgICAgICAgICAgICBcInR5cGVcIjogXCJjaXJjbGVcIixcblx0ICAgICAgICAgICAgXCJzb3VyY2VcIjogXCJwb2xpY3ktcG9pbnRzXCIsXG5cdCAgICAgICAgICAgIFwibWF4em9vbVwiOiA5LFxuXHQgICAgICAgICAgICBcInBhaW50XCI6IHtcblx0ICAgICAgICAgICAgICBcdFwiY2lyY2xlLWNvbG9yXCI6IFtcblx0XHQgICAgICAgICAgICAgICAgJ21hdGNoJyxcblx0XHQgICAgICAgICAgICAgICAgWydnZXQnLCAndF9kZWQnXSxcblx0XHQgICAgICAgICAgICAgICAgNSwgJyMwNTE4MzknLFxuXHRcdCAgICAgICAgICAgICAgICAvKiBvdGhlciAqLyAnIzk5MDAwMCdcblx0XHQgICAgICAgICAgICBdLFxuXHRcdCAgICAgICAgICAgIFwiY2lyY2xlLXJhZGl1c1wiOiB7XG5cdFx0ICAgICAgICAgICAgICAgICdzdG9wcyc6IFtbNSwgM10sIFs4LCAxOF1dXG5cdFx0ICAgICAgICAgICAgfSxcblx0XHQgICAgICAgICAgICBcImNpcmNsZS1vcGFjaXR5XCI6IDAuMVxuXHRcdCAgICAgICAgICAgIH1cblx0XHQgICAgICAgIH0sXG5cdFx0ICAgICAgICB7IC8vIGxheWVyIHR3b1xuXHQgICAgICAgICAgICBcImlkXCI6IFwicG9pbnRzLWRhdGEtZHJpdmVuXCIsXG5cdCAgICAgICAgICAgIFwidHlwZVwiOiBcImNpcmNsZVwiLFxuXHQgICAgICAgICAgICBcInNvdXJjZVwiOiBcInBvbGljeS1wb2ludHNcIixcblx0ICAgICAgICAgICAgXCJtaW56b29tXCI6IDksXG5cdCAgICAgICAgICAgIFwicGFpbnRcIjoge1xuXHQgICAgICAgICAgICAgIFx0XCJjaXJjbGUtY29sb3JcIjogW1xuXHRcdCAgICAgICAgICAgICAgICAnbWF0Y2gnLFxuXHRcdCAgICAgICAgICAgICAgICBbJ2dldCcsICd0X2RlZCddLFxuXHRcdCAgICAgICAgICAgICAgICA1LCAnIzA1MTgzOScsXG5cdFx0ICAgICAgICAgICAgICAgIC8qIG90aGVyICovICcjOTkwMDAwJ1xuXHRcdCAgICAgICAgICAgIF0sXG5cdFx0ICAgICAgICAgICAgXCJjaXJjbGUtcmFkaXVzXCI6IHtcblx0XHQgICAgICAgICAgICBcdHByb3BlcnR5OiAncHJlbScsXG5cdFx0ICAgICAgICAgICAgICAgIHR5cGU6ICdleHBvbmVudGlhbCcsXG5cdFx0XHRcdCAgICAgICAgc3RvcHM6IFtcblx0XHRcdFx0ICAgICAgICAgIFs2MiwgNV0sXG5cdFx0XHRcdCAgICAgICAgICBbMjUwMCwgNjBdXG5cdFx0XHRcdCAgICAgICAgXVxuXHRcdCAgICAgICAgICAgIH0sXG5cdFx0ICAgICAgICAgICAgXCJjaXJjbGUtb3BhY2l0eVwiOiAwLjEsXG5cdFx0ICAgICAgICAgICAgXCJjaXJjbGUtc3Ryb2tlLWNvbG9yXCI6IFwiI2ZmZmZmZlwiLFxuXHRcdCAgICAgICAgICAgIFwiY2lyY2xlLXN0cm9rZS13aWR0aFwiOiAxXG5cdFx0ICAgICAgICB9XG5cdFx0XHR9XVxuXHRcdCk7IFxuXHR9XG5cdC8qZnVuY3Rpb24gY2hlY2tGZWF0dXJlc0xvYWRlZCgpe1xuXHRcdGlmICggdGhlTWFwLmxvYWRlZCgpKXtcblx0XHRcdFxuXHRcdFx0dGhlTWFwLm9mZigncmVuZGVyJywgY2hlY2tGZWF0dXJlcyk7XG5cdFx0fVxuXHR9Ki9cblx0ZnVuY3Rpb24gYWRkQ2x1c3RlcmVkKCl7XG5cdFx0XG5cdFx0bWJIZWxwZXIuYWRkU291cmNlQW5kTGF5ZXJzLmNhbGwodGhlTWFwLFxuXHRcdCAgICB7IC8vIHNvdXJjZVxuXHRcdCAgICBcdFwibmFtZVwiOiBcInBvbGljaWVzXCIsXG5cdFx0ICAgICAgICBcInR5cGVcIjogXCJnZW9qc29uXCIsXG5cdFx0ICAgICAgICBcImRhdGFcIjogZ2VvanNvbixcblx0XHQgICAgICAgIFwiY2x1c3RlclwiOiB0cnVlLFxuXHRcdCAgICAgICAgXCJjbHVzdGVyUmFkaXVzXCI6IDAuNSAvLyBSYWRpdXMgb2YgZWFjaCBjbHVzdGVyIHdoZW4gY2x1c3RlcmluZyBwb2ludHMgKGRlZmF1bHRzIHRvIDUwKVxuXHRcdCAgICB9LCBbIC8vIGxheWVyc1xuXHRcdCAgICAgICB7IC8vIGxheWVyIG9uZVxuXHRcdCAgICAgICAgICAgIGlkOiBcImNsdXN0ZXItY291bnRcIixcblx0XHRcdCAgICAgICAgdHlwZTogXCJzeW1ib2xcIixcblx0XHRcdCAgICAgICAgc291cmNlOiBcInBvbGljaWVzXCIsXG5cdFx0XHQgICAgICAgIGZpbHRlcjogW1wiaGFzXCIsIFwicG9pbnRfY291bnRcIl0sXG5cdFx0XHQgICAgICAgIFwibWluem9vbVwiOiA2LFxuXHRcdFx0ICAgICAgICBsYXlvdXQ6IHtcblx0XHRcdCAgICAgICAgICAgIFwidGV4dC1maWVsZFwiOiBcIntwb2ludF9jb3VudF9hYmJyZXZpYXRlZH1cIixcblx0XHRcdCAgICAgICAgICAgIFwidGV4dC1zaXplXCI6IDEyLFxuXG5cdFx0XHQgICAgICAgIH0sXG5cdFx0XHQgICAgICAgIFwicGFpbnRcIjoge1xuXHRcdFx0ICAgICAgICBcdFwidGV4dC1jb2xvclwiOiBcIiNmZmZmZmZcIlxuXHRcdFx0ICAgICAgICB9XG5cdFx0ICAgICAgICB9XG5cdCAgICAgICAgXSAvLyBlbmQgbGF5ZXJzIGFycmF5XG5cdCAgICApOyAvLyBlbmQgYWRkbGF5ZXJzXG5cdH0gLy8gZW5kIGFkZENsdXN0ZXJlZFxuXHRmdW5jdGlvbiB0b0dlb0pTT04odXJsKXtcblx0XHRcblx0XHRkMy5jc3YodXJsLCBmdW5jdGlvbihlcnIsIGRhdGEpe1xuXHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHR0aHJvdyBlcnI7XG5cdFx0XHR9XG5cdFx0XHQvL2NvbnNvbGUubG9nKGRhdGEpO1xuXHRcdFx0dmFyIGZlYXR1cmVzID0gW107IFxuXHRcdFx0ZGF0YS5mb3JFYWNoKGVhY2ggPT4ge1xuXHRcdFx0XHR2YXIgY29lcmNlZCA9IHt9O1xuXHRcdFx0XHRmb3IgKCB2YXIga2V5IGluIGVhY2ggKSB7XG5cdFx0XHRcdFx0aWYgKCBlYWNoLmhhc093blByb3BlcnR5KGtleSkgKXtcblx0XHRcdFx0XHRcdGNvZXJjZWRba2V5XSA9ICFpc05hTigrZWFjaFtrZXldKSA/ICtlYWNoW2tleV0gOiBlYWNoW2tleV07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9ICBcblx0XHRcdFx0ZmVhdHVyZXMucHVzaCh7XG5cdFx0XHRcdFx0XCJ0eXBlXCI6IFwiRmVhdHVyZVwiLFxuXHRcdFx0XHRcdFwicHJvcGVydGllc1wiOiBjb2VyY2VkLFxuXHRcdFx0XHRcdFwiZ2VvbWV0cnlcIjoge1xuXHRcdFx0XHRcdFx0XCJ0eXBlXCI6IFwiUG9pbnRcIixcblx0XHRcdFx0XHRcdFwiY29vcmRpbmF0ZXNcIjogWytlYWNoLmxvbmdpdHVkZSwgK2VhY2gubGF0aXR1ZGVdXG5cdFx0XHRcdFx0fSAgIFxuXHRcdFx0XHR9KTtcblx0XHRcdH0pOyAvLyBlbmQgZm9yRWFjaFxuXHRcdFx0Z2VvanNvbiA9ICB7XG5cdFx0XHRcdFwidHlwZVwiOiBcIkZlYXR1cmVDb2xsZWN0aW9uXCIsXG5cdFx0XHRcdFwiZmVhdHVyZXNcIjogZmVhdHVyZXNcblx0XHRcdH07XG5cdFx0XHR0aGVDaGFydHMucHVzaCggLy8gc2hvdWxkIGJlIGFibGUgdG8gY3JlYXRlIGNoYXJ0cyBub3csIHdoZXRoZXIgb3Igbm90IG1hcCBoYXMgbG9hZGVkLiBtYXAgbmVlZHMgdG8gaGF2ZVxuXHRcdFx0XHRcdFx0XHQvLyBsb2FkZWQgZm9yIHRoZW0gdG8gdXBkYXRlLCB0aG91Z2guXG5cdFx0XHRcdG5ldyBEb251dHMuRG9udXQoe1xuXHRcdFx0XHRcdG1hcmdpbjogeyAvLyBwZXJjZW50YWdlc1xuXHRcdCAgICAgICAgICAgICAgICB0b3A6IDE1LFxuXHRcdCAgICAgICAgICAgICAgICByaWdodDogMTAsXG5cdFx0ICAgICAgICAgICAgICAgIGJvdHRvbTogNSxcblx0XHQgICAgICAgICAgICAgICAgbGVmdDogMTBcblx0XHQgICAgICAgICAgICB9LFxuXHRcdCAgICAgICAgICAgIGhlaWdodFRvV2lkdGg6IDEsXG5cdFx0ICAgICAgICAgICAgY29udGFpbmVyOiAnI2NoYXJ0LTAnLFxuXHRcdCAgICAgICAgICAgIGRhdGE6IGdlb2pzb24uZmVhdHVyZXMsXG5cdFx0ICAgICAgICAgICAgY29tcGFyYXRvcjogZnVuY3Rpb24oZWFjaCl7XG5cdFx0ICAgICAgICAgICAgXHRyZXR1cm4gZWFjaC5wcm9wZXJ0aWVzLnRfZGVkIDwgNTtcblx0XHQgICAgICAgICAgICB9IFxuXHRcdFx0XHR9KSxcblx0XHRcdFx0bmV3IEJhcnMuQmFyKHsgXG5cdFx0XHRcdFx0dGl0bGU6ICdQcm9wZXJ0aWVzIGluIHZpZXcnLCBcblx0XHRcdFx0XHRtYXJnaW46IHtcblx0XHRcdFx0XHRcdHRvcDowLFxuXHRcdFx0XHRcdFx0cmlnaHQ6MSxcblx0XHRcdFx0XHRcdGJvdHRvbTowLFxuXHRcdFx0XHRcdFx0bGVmdDoxIFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0aGVpZ2h0VG9XaWR0aDogMC4wMyxcblx0XHRcdFx0XHRjb250YWluZXI6ICcjaW4tdmlldy1iYXInLFxuXHRcdFx0XHRcdGRhdGE6IGdlb2pzb24uZmVhdHVyZXMsXG5cdFx0XHRcdFx0bnVtZXJhdG9yKGluVmlld0lEcyl7XG5cdFx0XHRcdFx0XHRyZXR1cm4gaW5WaWV3SURzLnNpemU7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRkZW5vbWluYXRvcigpe1xuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuZGF0YS5sZW5ndGg7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR0ZXh0RnVuY3Rpb24obixkKXtcblx0XHRcdFx0XHRcdHJldHVybiBgJHtkMy5mb3JtYXQoXCIsXCIpKG4pfSBvZiAke2QzLmZvcm1hdChcIixcIikoZCl9ICgke2QzLmZvcm1hdChcIi4wJVwiKShuIC8gZCl9KWA7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KSxcblx0XHRcdFx0bmV3IEJhcnMuQmFyKHtcblx0XHRcdFx0XHR0aXRsZTogJy4uLiB3aXRoIGxvdyBkZWR1Y3RpYmxlJywgXG5cdFx0XHRcdFx0bWFyZ2luOiB7XG5cdFx0XHRcdFx0XHR0b3A6MCxcblx0XHRcdFx0XHRcdHJpZ2h0OjEsXG5cdFx0XHRcdFx0XHRib3R0b206MCxcblx0XHRcdFx0XHRcdGxlZnQ6MSBcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGhlaWdodFRvV2lkdGg6IDAuMDMsXG5cdFx0XHRcdFx0Y29udGFpbmVyOiAnI2RlZHVjdGlibGUtYmFyJyxcblx0XHRcdFx0XHRkYXRhOiBnZW9qc29uLmZlYXR1cmVzLFxuXHRcdFx0XHRcdG51bWVyYXRvcihpblZpZXdJRHMpe1xuXHRcdFx0XHRcdFx0dmFyIGZpbHRlcmVkRGF0YSA9IHRoaXMuZGF0YS5maWx0ZXIoZWFjaCA9PiBpblZpZXdJRHMuaGFzKGVhY2gucHJvcGVydGllcy5pZCkpLFxuXHRcdFx0XHRcdFx0XHRudW1iZXJNYXRjaGluZyA9IDA7XG5cdFx0XHRcdFx0XHRmaWx0ZXJlZERhdGEuZm9yRWFjaChlYWNoID0+IHtcblx0XHRcdFx0XHRcdFx0aWYgKCBlYWNoLnByb3BlcnRpZXMudF9kZWQgPCA1ICl7XG5cdFx0XHRcdFx0XHRcdFx0bnVtYmVyTWF0Y2hpbmcrKztcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gbnVtYmVyTWF0Y2hpbmc7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRkZW5vbWluYXRvcihpblZpZXdJRHMpeyAvLyBmb3IgdGhpcyBvbmUgZGVub21pbmF0b3IgaXMgbnVtYmVyIG9mIHBvbGljaWVzIGluIHZpZXdcblx0XHRcdFx0XHRcdCByZXR1cm4gaW5WaWV3SURzLnNpemU7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR0ZXh0RnVuY3Rpb24obixkKXtcblx0XHRcdFx0XHRcdHJldHVybiBgJHtkMy5mb3JtYXQoXCIsXCIpKG4pfSBvZiAke2QzLmZvcm1hdChcIixcIikoZCl9ICgke2QzLmZvcm1hdChcIi4wJVwiKShuIC8gZCl9KWA7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KSxcblx0XHRcdFx0bmV3IEJhcnMuQmFyKHtcblx0XHRcdFx0XHR0aXRsZTogJ0F2ZXJhZ2UgcHJlbWl1bScsIFxuXHRcdFx0XHRcdG1hcmdpbjoge1xuXHRcdFx0XHRcdFx0dG9wOjAsXG5cdFx0XHRcdFx0XHRyaWdodDoxLFxuXHRcdFx0XHRcdFx0Ym90dG9tOjAsXG5cdFx0XHRcdFx0XHRsZWZ0OjEgXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR6U2NvcmVzOiBjYWxjdWxhdGVaU2NvcmVzKCdwcmVtJywyMjAwKSxcblx0XHRcdFx0XHRtaW4oKXtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKHRoaXMpO1xuXHRcdFx0XHRcdFx0cmV0dXJuIHRoaXMuelNjb3Jlcy5taW47XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRoZWlnaHRUb1dpZHRoOiAwLjAzLFxuXHRcdFx0XHRcdGNvbnRhaW5lcjogJyNwcmVtaXVtLWJhcicsXG5cdFx0XHRcdFx0ZGF0YTogZ2VvanNvbi5mZWF0dXJlcyxcblx0XHRcdFx0XHRudW1lcmF0b3IoaW5WaWV3SURzKXtcblx0XHRcdFx0XHRcdHZhciBmaWx0ZXJlZERhdGEgPSB0aGlzLmRhdGEuZmlsdGVyKGVhY2ggPT4gaW5WaWV3SURzLmhhcyhlYWNoLnByb3BlcnRpZXMuaWQpKTtcblx0XHRcdFx0XHRcdFx0XG5cdFx0XHRcdFx0XHRyZXR1cm4gZDMubWVhbihmaWx0ZXJlZERhdGEsIGQgPT4gZC5wcm9wZXJ0aWVzLnByZW1aKTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGRlbm9taW5hdG9yKCl7IFxuXHRcdFx0XHRcdFx0IHJldHVybiB0aGlzLnpTY29yZXMubWF4O1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0dGV4dEZ1bmN0aW9uKG4peyBcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKHRoaXMuelNjb3Jlcyk7XG5cdFx0XHRcdFx0XHRyZXR1cm4gJyQnICsgZDMuZm9ybWF0KFwiLjJmXCIpKHRoaXMuelNjb3Jlcy5tZWFuICsgdGhpcy56U2NvcmVzLnNkICogbiApICsgJyAoeiA9ICcgKyBkMy5mb3JtYXQoXCIuMmZcIikobikgKyAnKSc7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KVxuXHRcdFx0KTsgLy8gZW5kIHB1c2hcblx0XHRcdGdhdGVDaGVjaysrOyAgXG5cdFx0XHRnYXRlKCk7XG5cdFx0XHQvL2FkZENsdXN0ZXJMYXllcnMocnRuKTtcblx0XHRcdFxuXHRcdH0pOyAvLyBlbmQgZDMgY3N2XG5cdH0gLy8gZW5kIHRvR2VvSlNPTlxuXHQvKnZhciBmZWF0dXJlc0luVmlldyA9IHtcblx0XHRyZW5kZXIoKXtcblx0XHRcdHRoaXMuY2hhcnQgPSBuZXcgQmFycy5CYXIoe1xuXHRcdFx0XHRtYXJnaW46IHtcblx0XHRcdFx0XHR0b3A6MCxcblx0XHRcdFx0XHRyaWdodDowLFxuXHRcdFx0XHRcdGJvdHRvbTowLFxuXHRcdFx0XHRcdGxlZnQ6MFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRoZWlnaHRUb1dpZHRoOiAwLjAzLFxuXHRcdFx0XHRjb250YWluZXI6ICcjdG90YWwtdmlldycsXG5cdFx0XHRcdHRvdGFsOiBnZW9qc29uLmZlYXR1cmVzLmxlbmd0aFxuXHRcdFx0fSk7XG5cblx0XHRcdC8qdGhpcy50b3RhbCA9IGdlb2pzb24uZmVhdHVyZXMubGVuZ3RoO1xuXHRcdFx0dGhpcy5zdmcgPSBkMy5zZWxlY3QoJyN0b3RhbC12aWV3Jylcblx0XHRcdFx0LmFwcGVuZCgnc3ZnJylcblx0XHRcdFx0LmF0dHIoJ3dpZHRoJywgJzEwMCUnKVxuXHQgICAgICAgICAgICAuYXR0cigneG1sbnMnLCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycpXG5cdCAgICAgICAgICAgIC5hdHRyKCd2ZXJzaW9uJywnMS4xJykgXG5cdCAgICAgICAgICAgIC5hdHRyKCd2aWV3Qm94JywgJzAgMCAxMDAgMycpO1xuXG5cdCAgICAgICAgdGhpcy5iYWNrZ3JvdW5kID0gdGhpcy5zdmcuYXBwZW5kKCdsaW5lJylcblx0ICAgICAgICBcdC5jbGFzc2VkKCdiYWNrZ3JvdW5kLWxpbmUnLCB0cnVlKVxuXHQgICAgICAgIFx0LmF0dHIoJ3gwJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kwJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3gxJywxMDApXG5cdCAgICAgICAgXHQuYXR0cigneTEnLDApO1xuXG5cdCAgICAgICAgdGhpcy5saW5lID0gdGhpcy5zdmcuYXBwZW5kKCdsaW5lJylcblx0ICAgICAgICBcdC5jbGFzc2VkKCd0b3RhbC1saW5lJywgdHJ1ZSlcblx0ICAgICAgICBcdC5hdHRyKCd4MCcsMClcblx0ICAgICAgICBcdC5hdHRyKCd5MCcsMClcblx0ICAgICAgICBcdC5hdHRyKCd4MScsMClcblx0ICAgICAgICBcdC5hdHRyKCd5MScsMCk7XG5cblx0ICAgICAgICB0aGlzLnRleHQgPSBkMy5zZWxlY3QoJyN0b3RhbC12aWV3Jylcblx0ICAgICAgICBcdC5hcHBlbmQoJ3NwYW4nKVxuXHQgICAgICAgIFx0LnRleHQoKCkgPT4gYCR7ZDMuZm9ybWF0KFwiLFwiKSh0aGlzLnRvdGFsKX0gb2YgJHtkMy5mb3JtYXQoXCIsXCIpKHRoaXMudG90YWwpfSBpbiB2aWV3YCApO1xuXHQgICAgICAgIFx0XG5cblx0XHRcdHRoaXMudXBkYXRlKGNvdW50RmVhdHVyZXMoKSk7XG5cdFx0fSxcblx0XHR1cGRhdGUobil7XG5cdFx0XHQvKmQzLnNlbGVjdCgnI3RvdGFsLWluLXZpZXcnKVxuXHRcdFx0XHQudGV4dCgoKSA9PiBkMy5mb3JtYXQoXCIsXCIpKG4pICsgJyBvZiAnICsgZDMuZm9ybWF0KFwiLFwiKSh0aGlzLnRvdGFsKSArICcgcHJvcGVydGllcyBpbiB2aWV3Jyk7Ki9cblx0XHRcdC8qdGhpcy5saW5lXG5cdFx0XHRcdC50cmFuc2l0aW9uKCkuZHVyYXRpb24oMjAwKVxuXHRcdFx0XHQuYXR0cigneDEnLCAoKSA9PiAoIG4gLyB0aGlzLnRvdGFsKSAqIDEwMCApO1xuXHRcdFx0dGhpcy50ZXh0XG5cdFx0XHRcdC50ZXh0KCgpID0+IGAke2QzLmZvcm1hdChcIixcIikobil9IG9mICR7ZDMuZm9ybWF0KFwiLFwiKSh0aGlzLnRvdGFsKX0gaW4gdmlld2AgKTtcblxuXHRcdH0qLyBcblxuXHRcblx0dmFyIGluVmlld0lEcyA9IG5ldyBTZXQoKTtcblx0ZnVuY3Rpb24gY291bnRGZWF0dXJlcygpeyBcblx0XHQvKiBqc2hpbnQgbGF4YnJlYWs6dHJ1ZSAqL1xuXHRcdGluVmlld0lEcy5jbGVhcigpOyBcblx0XHQvL3ZhciBjb3VudCA9IDA7XG5cdFx0dmFyIGJvdW5kcyA9IHRoZU1hcC5nZXRCb3VuZHMoKTtcblx0XHRnZW9qc29uLmZlYXR1cmVzLmZvckVhY2goZWFjaCA9PiB7XG5cdFx0XHRpZiAoICAgIGVhY2gucHJvcGVydGllcy5sb25naXR1ZGUgPj0gYm91bmRzLl9zdy5sbmcgXG5cdFx0XHRcdCAmJiBlYWNoLnByb3BlcnRpZXMubG9uZ2l0dWRlIDw9IGJvdW5kcy5fbmUubG5nIFxuXHRcdFx0XHQgJiYgZWFjaC5wcm9wZXJ0aWVzLmxhdGl0dWRlICA+PSBib3VuZHMuX3N3LmxhdCBcblx0XHRcdFx0ICYmIGVhY2gucHJvcGVydGllcy5sYXRpdHVkZSAgPD0gYm91bmRzLl9uZS5sYXQgKXtcblx0XHRcdFx0aW5WaWV3SURzLmFkZChlYWNoLnByb3BlcnRpZXMuaWQpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9XG5cdHRoZU1hcC5vbignbW92ZWVuZCcsIGZ1bmN0aW9uKCl7XG5cdFx0dXBkYXRlQWxsKCk7XG5cdH0pO1xuXHR0aGVNYXAub24oJ3pvb21lbmQnLCBmdW5jdGlvbigpe1xuXHRcdHVwZGF0ZUFsbCgpO1xuXHR9KTtcblx0ZnVuY3Rpb24gdXBkYXRlQWxsKCl7XG5cdFx0Y291bnRGZWF0dXJlcygpO1xuXHRcdHRoZUNoYXJ0cy5mb3JFYWNoKGVhY2ggPT4gZWFjaC51cGRhdGUoaW5WaWV3SURzKSk7XG5cdH1cblx0Lyp0aGVNYXAub24oXCJtb3VzZW1vdmVcIiwgXCJwb2ludHMtZGF0YS1kcml2ZW5cIiwgZnVuY3Rpb24oZSkge1xuICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICB9KTsqL1xuXG5cdHJldHVybiB0aGVNYXA7XG4gICBcbn0oKSk7IC8vIGVuZCBJSUZFICIsImV4cG9ydCBjb25zdCBCYXJzID0gKGZ1bmN0aW9uKCl7XG5cblx0dmFyIEJhciA9IGZ1bmN0aW9uKGNvbmZpZ09iamVjdCl7IC8vIG1hcmdpbnMge30sIGhlaWdodCAjLCB3aWR0aCAjLCBjb250YWluZXJJRCwgZGF0YVBhdGhcblx0ICAgIHRoaXMuc2V0dXAoY29uZmlnT2JqZWN0KTtcblx0fTtcblxuXHRCYXIucHJvdG90eXBlID0ge1xuXHRcdHNldHVwKGNvbmZpZ09iamVjdCl7IC8vIHNvbWUgb2Ygc2V0dXAgaXMgY29tbW9uIHRvIGFsbCBjaGFydHMgYW5kIGNvdWxkIGJlIGhhbmRsZWQgYnkgcHJvdG90eXBpY2FsIGluaGVyaXRhbmNlXG5cdCAgICBcdGNvbnNvbGUubG9nKGNvbmZpZ09iamVjdCk7XG5cdCAgICAgICAgdmFyIHZpZXdCb3ggPSAnMCAwIDEwMCAnICsgTWF0aC5yb3VuZChjb25maWdPYmplY3QuaGVpZ2h0VG9XaWR0aCAqIDEwMCk7XG5cdCAgICAgICAgdGhpcy5jb250YWluZXIgPSBjb25maWdPYmplY3QuY29udGFpbmVyO1xuXHQgICAgICAgIHRoaXMubWFyZ2luID0gY29uZmlnT2JqZWN0Lm1hcmdpbjtcblx0ICAgICAgICB0aGlzLndpZHRoID0gMTAwIC0gdGhpcy5tYXJnaW4ubGVmdCAtIHRoaXMubWFyZ2luLnJpZ2h0O1xuXHQgICAgICAgIHRoaXMuaGVpZ2h0ID0gY29uZmlnT2JqZWN0LmhlaWdodFRvV2lkdGggKiAxMDAgLSB0aGlzLm1hcmdpbi50b3AgLSB0aGlzLm1hcmdpbi5ib3R0b207XG5cdCAgICAgICAgdGhpcy50aXRsZSA9IGNvbmZpZ09iamVjdC50aXRsZTtcblx0ICAgICAgICB0aGlzLmNvbXBhcmF0b3IgPSBjb25maWdPYmplY3QuY29tcGFyYXRvcjtcblx0ICAgICAgICB0aGlzLmJhY2tncm91bmRDb2xvciA9IGNvbmZpZ09iamVjdC5iYWNrZ3JvdW5kQ29sb3IgfHwgJ2dyYXknO1xuXHQgICAgICAgIHRoaXMuZGF0YSA9IGNvbmZpZ09iamVjdC5kYXRhO1xuXHQgICAgICAgIHRoaXMubnVtZXJhdG9yID0gY29uZmlnT2JqZWN0Lm51bWVyYXRvcjtcblx0ICAgICAgICB0aGlzLmRlbm9taW5hdG9yID0gY29uZmlnT2JqZWN0LmRlbm9taW5hdG9yO1xuXHQgICAgICAgIHRoaXMudGV4dEZ1bmN0aW9uID0gY29uZmlnT2JqZWN0LnRleHRGdW5jdGlvbjtcblx0ICAgICAgICB0aGlzLnpTY29yZXMgPSBjb25maWdPYmplY3QuelNjb3JlcyB8fCBudWxsO1xuXHQgICAgICAgIHRoaXMubWluID0gY29uZmlnT2JqZWN0Lm1pbiA/IGNvbmZpZ09iamVjdC5taW4uY2FsbCh0aGlzKSA6IDA7XG5cdCAgICAgICAgLy90aGlzLm1heCA9IGNvbmZpZ09iamVjdC5tYXggPyBjb25maWdPYmplY3QubWF4LmNhbGwodGhpcykgOiAxMDA7XG5cdCAgICAgICAgLy90aGlzLnNjYWxlID0gZDMuc2NhbGVMaW5lYXIoKS5kb21haW4oW3RoaXMubWluLHRoaXMubWF4XSkucmFuZ2UoWzAsdGhpcy53aWR0aF0pO1xuXHQgICAgICAgIFxuXG5cdCAgICAgICAgZDMuc2VsZWN0KHRoaXMuY29udGFpbmVyKVxuXHQgICAgICAgIFx0LmFwcGVuZCgnc3BhbicpXG5cdCAgICAgICAgXHQuY2xhc3NlZCgnZmlndXJlLXRpdGxlJywgdHJ1ZSlcblx0ICAgICAgICBcdC50ZXh0KHRoaXMudGl0bGUpO1xuXG5cdCAgICAgICAgdGhpcy5zdmcgPSBkMy5zZWxlY3QodGhpcy5jb250YWluZXIpXG5cdCAgICAgICAgICAgIC5hcHBlbmQoJ3N2ZycpXG5cdCAgICAgICAgICAgIC5hdHRyKCd3aWR0aCcsICcxMDAlJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3htbG5zJywnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnKVxuXHQgICAgICAgICAgICAuYXR0cigndmVyc2lvbicsJzEuMScpXG5cdCAgICAgICAgICAgIC5hdHRyKCd2aWV3Qm94Jywgdmlld0JveClcblx0ICAgICAgICAgICAgLmFwcGVuZCgnZycpXG5cdCAgICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyB0aGlzLm1hcmdpbi5sZWZ0ICsgJywnICsgdGhpcy5tYXJnaW4udG9wICsgJyknKTtcblxuXHQgICAgICAgIHRoaXMuYmFja2dyb3VuZCA9IHRoaXMuc3ZnLmFwcGVuZCgnbGluZScpXG5cdCAgICAgICAgXHQuY2xhc3NlZCgnYmFja2dyb3VuZC1saW5lLScgKyB0aGlzLmJhY2tncm91bmRDb2xvciwgdHJ1ZSlcblx0ICAgICAgICBcdC5hdHRyKCd4MCcsMClcblx0ICAgICAgICBcdC5hdHRyKCd5MCcsMClcblx0ICAgICAgICBcdC5hdHRyKCd4MScsdGhpcy53aWR0aClcblx0ICAgICAgICBcdC5hdHRyKCd5MScsMCk7XG5cblx0ICAgICAgICB0aGlzLmxpbmUgPSB0aGlzLnN2Zy5hcHBlbmQoJ2xpbmUnKVxuXHQgICAgICAgIFx0LmNsYXNzZWQoJ2ZvcmVncm91bmQtbGluZScsIHRydWUpXG5cdCAgICAgICAgXHQuYXR0cigneDAnLDApXG5cdCAgICAgICAgXHQuYXR0cigneTAnLDApXG5cdCAgICAgICAgXHQuYXR0cigneDEnLDApXG5cdCAgICAgICAgXHQuYXR0cigneTEnLDApO1xuXG5cdCAgICAgICAgdGhpcy50ZXh0ID0gZDMuc2VsZWN0KHRoaXMuY29udGFpbmVyKVxuXHQgICAgICAgIFx0LmFwcGVuZCgnc3BhbicpO1xuXHQgICAgICAgIFx0XG5cblx0ICAgICAgICAvL3RoaXMudXBkYXRlKHRoaXMubnVtZXJhdG9yKCkpOyAgXG4gICAgICAgIH0sXG4gICAgICAgIHVwZGF0ZShpblZpZXdJRHMpe1xuICAgICAgICBcdGNvbnNvbGUubG9nKHRoaXMpO1xuXHRcdFx0dmFyIG4gPSB0aGlzLm51bWVyYXRvcihpblZpZXdJRHMpLFxuXHRcdFx0XHRkID0gdGhpcy5kZW5vbWluYXRvcihpblZpZXdJRHMpOyBcblx0XHRcdGQzLnNlbGVjdCh0aGlzLmNvbnRhaW5lcilcblx0XHRcdFx0LmNsYXNzZWQoJ292ZXJmbG93JywgbiA+IGQgKTtcbiAgICAgICAgXHRpZiAoIHRoaXMubWluIDwgMCAmJiBNYXRoLmFicyh0aGlzLm1pbikgPCBkICYmIGQgPiAwICkge1xuICAgICAgICBcdFx0dGhpcy5taW4gPSAwIC0gZDtcbiAgICAgICAgXHR9XG5cdFx0XHR0aGlzLnNjYWxlID0gZDMuc2NhbGVMaW5lYXIoKS5kb21haW4oW3RoaXMubWluLGRdKS5yYW5nZShbMCx0aGlzLndpZHRoXSkuY2xhbXAodHJ1ZSk7XG5cdFx0XHR0aGlzLmxpbmVcblx0XHRcdFx0LnRyYW5zaXRpb24oKS5kdXJhdGlvbigyMDApXG5cdFx0XHRcdC5hdHRyKCd4MScsICgpID0+IHRoaXMuc2NhbGUobikpO1xuXHRcdFx0dGhpcy50ZXh0XG5cdFx0XHRcdC50ZXh0KCgpID0+IHRoaXMudGV4dEZ1bmN0aW9uKG4sZCkpO1xuXHRcdH1cblx0fTtcblxuXHRyZXR1cm4ge1xuXHRcdEJhclxuXHR9O1xuICAgICAgICBcbn0pKCk7IiwiZXhwb3J0IGNvbnN0IERvbnV0cyA9IChmdW5jdGlvbigpe1xuICAgIC8qIGdsb2JhbHMgZDMgKi9cbiAgIC8qIGNvbnN0IG1lZGlhbkluY29tZXMgPSBuZXcgTWFwKCk7XG4gICAgZnVuY3Rpb24gY3JlYXRlTWVkaWFuSW5jb21lTWFwKGdlb2pzb24pe1xuXHRcdGdlb2pzb24uZmVhdHVyZXMuZm9yRWFjaChlYWNoID0+IHtcblx0XHRcdGlmICggIW1lZGlhbkluY29tZXMuaGFzKGVhY2gucHJvcGVydGllcy5jZW5fdHJhY3QpICl7XG5cdFx0XHRcdGxldCBpbmNvbWUgPSBlYWNoLnByb3BlcnRpZXMubWVkX2luY29tZSA+IDAgPyBlYWNoLnByb3BlcnRpZXMubWVkX2luY29tZSA6IG51bGw7XG5cdFx0XHRcdG1lZGlhbkluY29tZXMuc2V0KGVhY2gucHJvcGVydGllcy5jZW5fdHJhY3QsIGluY29tZSk7IFx0XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0Y29uc29sZS5sb2cobWVkaWFuSW5jb21lcyk7XG5cdFx0d2luZG93Lm1lZGlhbkluY29tZXMgPSBtZWRpYW5JbmNvbWVzO1xuXHRcdC8vY3JlYXRlQ2hhcnRzKGdlb2pzb24pO1xuXHR9ICovXG5cdFxuICAgIHZhciB0YXUgPSAyICogTWF0aC5QSTtcblx0dmFyIERvbnV0ID0gZnVuY3Rpb24oY29uZmlnT2JqZWN0KXsgLy8gbWFyZ2lucyB7fSwgaGVpZ2h0ICMsIHdpZHRoICMsIGNvbnRhaW5lcklELCBkYXRhUGF0aFxuXHQgICAgY29uc29sZS5sb2codGhpcywgY29uZmlnT2JqZWN0KTtcblx0ICAgIHRoaXMuc2V0dXAoY29uZmlnT2JqZWN0KTtcblx0fTtcblxuXHREb251dC5wcm90b3R5cGUgPSB7XG5cblx0ICAgIHNldHVwKGNvbmZpZ09iamVjdCl7XG5cdCAgICBcdGNvbnNvbGUubG9nKCdpbiBzZXQgdXAnKTtcblx0ICAgICAgICB2YXIgdmlld0JveCA9ICcwIDAgMTAwICcgKyBNYXRoLnJvdW5kKGNvbmZpZ09iamVjdC5oZWlnaHRUb1dpZHRoICogMTAwKTtcblx0ICAgICAgICB0aGlzLm1hcmdpbiA9IGNvbmZpZ09iamVjdC5tYXJnaW47XG5cdCAgICAgICAgdGhpcy53aWR0aCA9IDEwMCAtIHRoaXMubWFyZ2luLmxlZnQgLSB0aGlzLm1hcmdpbi5yaWdodDtcblx0ICAgICAgICB0aGlzLmhlaWdodCA9IGNvbmZpZ09iamVjdC5oZWlnaHRUb1dpZHRoICogMTAwIC0gdGhpcy5tYXJnaW4udG9wIC0gdGhpcy5tYXJnaW4uYm90dG9tO1xuXHQgICAgICAgIHRoaXMucmFkaXVzID0gTWF0aC5taW4odGhpcy53aWR0aCx0aGlzLmhlaWdodCkgLyAzO1xuXHQgICAgICAgIHRoaXMuZGF0YSA9IGNvbmZpZ09iamVjdC5kYXRhO1xuXHQgICAgICAgIHRoaXMuY29tcGFyYXRvciA9IGNvbmZpZ09iamVjdC5jb21wYXJhdG9yO1xuXHQgICAgICBcblx0ICAgICAgICB0aGlzLmFyYyA9IGQzLmFyYygpXG5cdCAgICAgICAgICAub3V0ZXJSYWRpdXModGhpcy5yYWRpdXMpIFxuXHQgICAgICAgICAgLmlubmVyUmFkaXVzKHRoaXMucmFkaXVzIC8gMS41KVxuXHQgICAgICAgICAgLnN0YXJ0QW5nbGUoMCk7IFxuXG5cdCAgICAgICAgdGhpcy5zdmcgPSBkMy5zZWxlY3QoY29uZmlnT2JqZWN0LmNvbnRhaW5lcilcblx0ICAgICAgICAgICAgLmFwcGVuZCgnc3ZnJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3dpZHRoJywgJzEwMCUnKVxuXHQgICAgICAgICAgICAuYXR0cigneG1sbnMnLCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycpXG5cdCAgICAgICAgICAgIC5hdHRyKCd2ZXJzaW9uJywnMS4xJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3ZpZXdCb3gnLCB2aWV3Qm94KVxuXHQgICAgICAgICAgICAuYXBwZW5kKCdnJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIHRoaXMubWFyZ2luLmxlZnQgKyAnLCcgKyB0aGlzLm1hcmdpbi50b3AgKyAnKScpO1xuXG5cdCAgICBcdHRoaXMuc3ZnLmFwcGVuZCgncGF0aCcpXG5cdCAgICAgICAgICAgIC5jbGFzc2VkKCdiYWNrZ3JvdW5kJyx0cnVlKVxuXHQgICAgICAgICAgICAuZGF0dW0oe2VuZEFuZ2xlOiB0YXV9KVxuXHQgICAgICAgICAgICAuYXR0cignZCcsIHRoaXMuYXJjKVxuXHQgICAgICAgICAgICAuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgdGhpcy53aWR0aCAvIDIgKyAnLCcgKyB0aGlzLmhlaWdodCAvIDIgKyAnKScpO1xuXG5cdCAgICAgICAgdGhpcy5mb3JlZ3JvdW5kID0gdGhpcy5zdmcuYXBwZW5kKCdwYXRoJylcblx0ICAgICAgICAgICAgLmRhdHVtKHtlbmRBbmdsZTogMH0pXG5cdCAgICAgICAgICAgIC5jbGFzc2VkKCdmb3JlZ3JvdW5kJyx0cnVlKVxuXHQgICAgICAgICAgICAuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgdGhpcy53aWR0aCAvIDIgKyAnLCcgKyB0aGlzLmhlaWdodCAvIDIgKyAnKScpXG5cdCAgICAgICAgICAgIC5hdHRyKCdkJywgdGhpcy5hcmMpO1xuIFxuXHQgICAgIC8vICAgdGhpcy51cGRhdGUodHJ1ZSk7XG5cblx0ICAgICAgICAvKiB0aGlzLnN2Zy5hcHBlbmQoXCJ0ZXh0XCIpXG5cdCAgICAgICAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIilcblx0ICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywncGllX251bWJlcicpXG5cdCAgICAgICAgICAgIC5hdHRyKCd5Jyw1KVxuXHQgICAgICAgICAgICAudGV4dChkMy5mb3JtYXQoXCIuMnNcIikodGhpcy52YWx1ZSkpXG5cdCAgICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyB0aGlzLndpZHRoIC8gMiArICcsJyArIHRoaXMuaGVpZ2h0IC8gMiArICcpJyk7Ki9cblxuXHQgICAgfSxcblx0ICAgIHVwZGF0ZShpblZpZXdJRHMpe1xuXHQgICAgXHR2YXJcdG51bWJlck1hdGNoaW5nID0gMCxcblx0ICAgIFx0XHRmaWx0ZXJlZERhdGEgPSB0aGlzLmRhdGEuZmlsdGVyKGVhY2ggPT4gaW5WaWV3SURzLmhhcyhlYWNoLnByb3BlcnRpZXMuaWQpKSxcblx0ICAgIFx0XHR0b3RhbCA9IGZpbHRlcmVkRGF0YS5sZW5ndGg7XG5cbiAgICBcdFx0ZmlsdGVyZWREYXRhLmZvckVhY2goZWFjaCA9PiB7XG4gICAgXHRcdFx0aWYgKCB0aGlzLmNvbXBhcmF0b3IoZWFjaCkgKXtcbiAgICBcdFx0XHRcdG51bWJlck1hdGNoaW5nKys7XG4gICAgXHRcdFx0fVxuICAgIFx0XHR9KTtcblx0ICAgIFx0XG5cdCAgICBcdHZhciBlbmRBbmdsZSA9IChudW1iZXJNYXRjaGluZyAvIHRvdGFsKSAqIHRhdTtcblxuXHQgICAgXHR0aGlzLmZvcmVncm91bmQgXG5cdCAgICBcdFx0LnRyYW5zaXRpb24oKS5kdXJhdGlvbig1MDApXG5cdCAgICBcdFx0LmF0dHJUd2VlbignZCcsIHRoaXMuYXJjVHdlZW4oZW5kQW5nbGUpKTtcblxuXHQgICAgfSxcblx0ICAgIGFyY1R3ZWVuKG5ld0FuZ2xlKSB7IC8vIEhUIGh0dHA6Ly9ibC5vY2tzLm9yZy9tYm9zdG9jay81MTAwNjM2XG5cdFx0XHRyZXR1cm4gZCA9PiB7XG5cdFx0XHQgICAgdmFyIGludGVycG9sYXRlID0gZDMuaW50ZXJwb2xhdGUoZC5lbmRBbmdsZSwgbmV3QW5nbGUpO1xuXHRcdFx0ICAgIHJldHVybiB0ID0+IHtcblx0XHRcdCAgICAgIGQuZW5kQW5nbGUgPSBpbnRlcnBvbGF0ZSh0KTtcblx0XHRcdFx0ICAgICAgcmV0dXJuIHRoaXMuYXJjKGQpO1xuXHRcdFx0ICAgIH07XG5cdFx0XHR9O1xuXHRcdH1cblx0fTtcblx0XG5cdHJldHVybiB7XG5cdFx0RG9udXRcblx0fTtcbn0oKSk7IiwiY29uc3QgbWJIZWxwZXIgPSB7XG4gICAgcHJvbWlzZXM6IHt9LFxuICAgIGFkZFNvdXJjZUFuZExheWVycyhzb3VyY2VPcHRpb25zLGxheWVyT3B0aW9uc0FycmF5KXsgLy8gdGhpcyA9IG1hcFxuICAgICAgICB2YXIgc291cmNlTmFtZSA9IHNvdXJjZU9wdGlvbnMubmFtZTtcbiAgICAgICAgbWJIZWxwZXIucHJvbWlzZXNbc291cmNlT3B0aW9ucy5uYW1lXSA9IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7IC8vIFRPIERPOiBmaWd1cmUgb3V0IHJlamVjdD9cbiAgICAgICAgICAgIGRlbGV0ZSBzb3VyY2VPcHRpb25zLm5hbWU7XG4gICAgICAgICAgICBmdW5jdGlvbiBjaGVja0RhdGFMb2FkZWQoKXtcbiAgICAgICAgICAgICAgICBpZiAoIHRoaXMuZ2V0U291cmNlKHNvdXJjZU5hbWUpICl7IC8vIGlmIGFkZFNvdXJjZSBoYXMgdGFrZW4gZWZmZWN0XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub2ZmKCdyZW5kZXInLCBjaGVja0RhdGFMb2FkZWQpOyAvLyB0dXJuIG9mZiB0aGUgbGlzdGVuZXIgZm9yIHJlbmRlclxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMub24oJ3JlbmRlcicsIGNoZWNrRGF0YUxvYWRlZCk7XG4gICAgICAgICAgICB0aGlzLmFkZFNvdXJjZShzb3VyY2VOYW1lLCBzb3VyY2VPcHRpb25zKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBsYXllclByb21pc2VzID0gW107XG4gICAgICAgIHJldHVybiBtYkhlbHBlci5wcm9taXNlc1tzb3VyY2VOYW1lXS50aGVuKCgpID0+IHsgXG4gICAgICAgICAgICBsYXllck9wdGlvbnNBcnJheS5mb3JFYWNoKChlYWNoKSA9PiB7XG4gICAgICAgICAgICAgICAgbGF5ZXJQcm9taXNlcy5wdXNoKFxuICAgICAgICAgICAgICAgICAgICBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4geyAvLyBUTyBETzogZmlndXJlIG91dCByZWplY3Q/XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYmVmb3JlTGF5ZXIgPSBlYWNoLmJlZm9yZUxheWVyID8gZWFjaC5iZWZvcmVMYXllciA6ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGVhY2guYmVmb3JlTGF5ZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICBlYWNoLnNvdXJjZSA9IHNvdXJjZU5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBjaGVja0xheWVyTG9hZGVkKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCB0aGlzLmdldExheWVyKGVhY2guaWQpICl7IC8vIGlmIGFkZExheWVyICBoYXMgdGFrZW4gZWZmZWN0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub2ZmKCdyZW5kZXInLCBjaGVja0xheWVyTG9hZGVkKTsgLy8gdHVybiBvZmYgdGhlIGxpc3RlbmVyIGZvciByZW5kZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9uKCdyZW5kZXInLCBjaGVja0xheWVyTG9hZGVkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkTGF5ZXIoZWFjaCwgYmVmb3JlTGF5ZXIpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLmFsbChsYXllclByb21pc2VzKTtcbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuZXhwb3J0cy5hZGRTb3VyY2VBbmRMYXllcnMgPSBtYkhlbHBlci5hZGRTb3VyY2VBbmRMYXllcnM7Il19
