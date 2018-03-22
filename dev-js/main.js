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
	var totalInViewChart;
	var geojson;
	var gateCheck = 0;

	var theMap = new mapboxgl.Map({
		container: 'map',
		style: 'mapbox://styles/ostermanj/cjf03o37b3tve2rqp2inw6a1f',
		center: [-96.29192961129883, 38.453175289053746],
		zoom: 3,
		maxBounds: [[-142.88705714746362, 16.058344948432406], [-51.9023017869731, 55.76690067417138]],
		minZoom: 3,
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
		addUnclustered();
		addClustered();
		totalInViewChart = new _Bars.Bars.Bar({
			title: 'Properties in view',
			margin: {
				top: 0,
				right: 1,
				bottom: 0,
				left: 1
			},
			heightToWidth: 0.03,
			container: '#total-view',
			total: geojson.features.length
		});
	} // end gate

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

	/*function checkFeatures(){
 	var features;
 	if ( theMap.loaded()){
 		features = theMap.queryRenderedFeatures({layers:['points']});
 		console.log(features);
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
			gateCheck++;
			gate();
			//addClusterLayers(rtn);

			theCharts.push(new _Donuts.Donuts.Donut({
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
			}));
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

	var matchingIDs = new Set();
	function countFeatures() {
		/* jshint laxbreak:true */
		matchingIDs.clear();
		//var count = 0;
		var bounds = theMap.getBounds();
		geojson.features.forEach(function (each) {
			if (each.properties.longitude >= bounds._sw.lng && each.properties.longitude <= bounds._ne.lng && each.properties.latitude >= bounds._sw.lat && each.properties.latitude <= bounds._ne.lat) {
				matchingIDs.add(each.properties.id);
			}
		});
		console.log(matchingIDs);
		return matchingIDs.size;
	}
	theMap.on('moveend', function () {
		updateAll();
	});
	theMap.on('zoomend', function () {
		updateAll();
	});
	function updateAll() {
		totalInViewChart.update(countFeatures());
		theCharts.forEach(function (each) {
			return each.update(false, matchingIDs);
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
			var _this = this;

			// some of setup is common to all charts and could be handled by prototypical inheritance

			var viewBox = '0 0 100 ' + Math.round(configObject.heightToWidth * 100);
			this.margin = configObject.margin;
			this.width = 100 - this.margin.left - this.margin.right;
			this.height = configObject.heightToWidth * 100 - this.margin.top - this.margin.bottom;
			this.title = configObject.title;
			this.comparator = configObject.comparator;
			this.backgroundColor = configObject.backgroundColor || 'gray';
			this.total = configObject.total;

			d3.select(configObject.container).append('span').classed('figure-title', true).text(this.title);

			this.svg = d3.select(configObject.container).append('svg').attr('width', '100%').attr('xmlns', 'http://www.w3.org/2000/svg').attr('version', '1.1').attr('viewBox', viewBox).append('g').attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

			this.background = this.svg.append('line').classed('background-line-' + this.backgroundColor, true).attr('x0', 0).attr('y0', 0).attr('x1', 100 - this.margin.left - this.margin.right).attr('y1', 0);

			this.line = this.svg.append('line').classed('foreground-line', true).attr('x0', 0).attr('y0', 0).attr('x1', 0).attr('y1', 0);

			this.text = d3.select('#total-view').append('span').text(function () {
				return d3.format(",")(_this.total) + ' of ' + d3.format(",")(_this.total) + ' in view';
			});

			this.update(this.total);
		},
		update: function update(n) {
			var _this2 = this;

			this.line.transition().duration(200).attr('x1', function () {
				return n / _this2.total * 100 - _this2.margin.left - _this2.margin.right;
			});
			this.text.text(function () {
				return d3.format(",")(n) + ' of ' + d3.format(",")(_this2.total);
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

			this.foreground = this.svg.append('path').datum({ endAngle: tau }).classed('foreground', true).attr('transform', 'translate(' + this.width / 2 + ',' + this.height / 2 + ')').attr('d', this.arc);

			this.update(true);

			/* this.svg.append("text")
       .attr("text-anchor", "middle")
       .attr('class','pie_number')
       .attr('y',5)
       .text(d3.format(".2s")(this.value))
       .attr('transform', 'translate(' + this.width / 2 + ',' + this.height / 2 + ')');*/
		},
		update: function update(isFirstUpdate, matchingIDs) {
			var _this = this;

			var total,
			    filteredData,
			    numberMatching = 0;
			if (isFirstUpdate) {
				total = this.data.length;
				this.data.forEach(function (each) {
					if (_this.comparator(each)) {
						numberMatching++;
					}
				});
			} else {
				console.log(this.data);
				filteredData = this.data.filter(function (each) {
					return matchingIDs.has(each.properties.id);
				});
				total = filteredData.length;
				filteredData.forEach(function (each) {
					if (_this.comparator(each)) {
						numberMatching++;
					}
				});
			}
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkZXYtanMvbWFpbi5lczYiLCJqcy1leHBvcnRzL0JhcnMuanMiLCJqcy1leHBvcnRzL0RvbnV0cy5qcyIsIm5vZGVfbW9kdWxlcy9tYXBib3gtaGVscGVyL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNDQzs7QUFDQTs7QUFDQTs7QUFFRDs7Ozs7Ozs7QUFRQTs7Ozs7QUFiQztBQWtCRCxPQUFPLE1BQVAsR0FBa0IsWUFBVTtBQUM1Qjs7QUFFSSxVQUFTLFdBQVQsR0FBdUIsOEZBQXZCOztBQUVBLEtBQU0sV0FBVyxRQUFRLGVBQVIsQ0FBakI7QUFDQSxLQUFNLFlBQVksRUFBbEI7QUFDQSxLQUFJLGdCQUFKO0FBQ0EsS0FBSSxPQUFKO0FBQ0EsS0FBSSxZQUFZLENBQWhCOztBQUVBLEtBQUksU0FBUyxJQUFJLFNBQVMsR0FBYixDQUFpQjtBQUM3QixhQUFXLEtBRGtCO0FBRTdCLFNBQU8scURBRnNCO0FBRzdCLFVBQVEsQ0FBQyxDQUFDLGlCQUFGLEVBQXFCLGtCQUFyQixDQUhxQjtBQUk3QixRQUFNLENBSnVCO0FBSzdCLGFBQVcsQ0FBQyxDQUFDLENBQUMsa0JBQUYsRUFBc0Isa0JBQXRCLENBQUQsRUFBMkMsQ0FBQyxDQUFDLGdCQUFGLEVBQW1CLGlCQUFuQixDQUEzQyxDQUxrQjtBQU03QixXQUFTLENBTm9CO0FBTzdCLHNCQUFvQjtBQVBTLEVBQWpCLENBQWI7O0FBVUgsS0FBSSxNQUFNLElBQUksU0FBUyxpQkFBYixDQUErQixFQUFDLGFBQVksS0FBYixFQUEvQixDQUFWO0FBQ0EsUUFBTyxVQUFQLENBQWtCLEdBQWxCLEVBQXVCLFVBQXZCOztBQUVBLFdBQVUsY0FBVjs7QUFFQSxRQUFPLEVBQVAsQ0FBVSxNQUFWLEVBQWtCLFlBQVU7QUFDM0I7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QWxCO0FBQ0EsMEJBQUssUUFBTCxDQUFjLElBQWQsRUFBb0IsV0FBcEI7QUFDSCxpQkFaRCxDQURKO0FBZUgsYUFoQkQ7QUFpQkEsbUJBQU8sUUFBUSxHQUFSLENBQVksYUFBWixDQUFQO0FBQ0gsU0FuQk0sQ0FBUDtBQW9CSDtBQXBDWSxDQUFqQjs7QUF1Q0EsUUFBUSxrQkFBUixHQUE2QixTQUFTLGtCQUF0QyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9cmV0dXJuIGV9KSgpIiwiIC8qIGV4cG9ydGVkIENoYXJ0cyAqL1xuIGltcG9ydCB7IERvbnV0cyB9IGZyb20gJy4uL2pzLWV4cG9ydHMvRG9udXRzJztcbiBpbXBvcnQgeyBCYXJzIH0gZnJvbSAnLi4vanMtZXhwb3J0cy9CYXJzJztcbiAvKiBwb2x5ZmlsbHMgbmVlZGVkOiBQcm9taXNlIFRPIERPOiBPVEhFUlM/XG4gKi9cbi8qXG5pbXBvcnQgeyByZWZsZWN0LCBhcnJheUZpbmQsIFNWR0lubmVySFRNTCwgU1ZHRm9jdXMgfSBmcm9tICcuLi9qcy12ZW5kb3IvcG9seWZpbGxzJztcbmltcG9ydCB7IEhlbHBlcnMgfSBmcm9tICcuLi9qcy1leHBvcnRzL0hlbHBlcnMnO1xuaW1wb3J0IHsgZDNUaXAgfSBmcm9tICcuLi9qcy12ZW5kb3IvZDMtdGlwJztcbmltcG9ydCB7IGNyZWF0ZUJyb3dzZUJ1dHRvbiB9IGZyb20gJy4uL2pzLWV4cG9ydHMvQnJvd3NlQnV0dG9ucyc7XG5pbXBvcnQgeyBjcmVhdGVSZXN1bHRJdGVtIH0gZnJvbSAnLi4vanMtZXhwb3J0cy9SZXN1bHRJdGVtcyc7IFxuKi9cbiAgXG4vKlxudG8gZG8gOiBzZWUgYWxzbyBodHRwczovL3d3dy5tYXBib3guY29tL21hcGJveC1nbC1qcy9leGFtcGxlL2hlYXRtYXAtbGF5ZXIvXG5cblxuKi9cbndpbmRvdy50aGVNYXAgID0gKGZ1bmN0aW9uKCl7ICAgXG5cInVzZSBzdHJpY3RcIjtcblx0XG4gICAgbWFwYm94Z2wuYWNjZXNzVG9rZW4gPSAncGsuZXlKMUlqb2liM04wWlhKdFlXNXFJaXdpWVNJNkltTnBkblU1ZEhWbmRqQTJlRFl5YjNBM05uZzFjR0ozWlhvaWZRLlhvX2sta3pHZllYX1lvX1JEY0hEQmcnO1xuXG4gICAgY29uc3QgbWJIZWxwZXIgPSByZXF1aXJlKCdtYXBib3gtaGVscGVyJyk7XG4gICBcdGNvbnN0IHRoZUNoYXJ0cyA9IFtdO1xuICAgXHR2YXIgdG90YWxJblZpZXdDaGFydDtcbiAgICB2YXIgZ2VvanNvbjtcbiAgICB2YXIgZ2F0ZUNoZWNrID0gMDtcbiAgICBcbiAgICB2YXIgdGhlTWFwID0gbmV3IG1hcGJveGdsLk1hcCh7XG5cdCAgICBjb250YWluZXI6ICdtYXAnLFxuXHQgICAgc3R5bGU6ICdtYXBib3g6Ly9zdHlsZXMvb3N0ZXJtYW5qL2NqZjAzbzM3YjN0dmUycnFwMmludzZhMWYnLFxuXHQgICAgY2VudGVyOiBbLTk2LjI5MTkyOTYxMTI5ODgzLCAzOC40NTMxNzUyODkwNTM3NDZdLFxuXHQgICAgem9vbTogMyxcblx0ICAgIG1heEJvdW5kczogW1stMTQyLjg4NzA1NzE0NzQ2MzYyLCAxNi4wNTgzNDQ5NDg0MzI0MDZdLFstNTEuOTAyMzAxNzg2OTczMSw1NS43NjY5MDA2NzQxNzEzOF1dLFxuXHQgICAgbWluWm9vbTogMyxcblx0ICAgIGF0dHJpYnV0aW9uQ29udHJvbDogZmFsc2UsXG5cdH0pO1xuXG5cdHZhciBuYXYgPSBuZXcgbWFwYm94Z2wuTmF2aWdhdGlvbkNvbnRyb2woe3Nob3dDb21wYXNzOmZhbHNlfSk7XG5cdHRoZU1hcC5hZGRDb250cm9sKG5hdiwgJ3RvcC1sZWZ0Jyk7XG5cblx0dG9HZW9KU09OKCdwb2xpY2llcy5jc3YnKTtcblxuXHR0aGVNYXAub24oJ2xvYWQnLCBmdW5jdGlvbigpe1xuXHRcdGdhdGVDaGVjaysrO1xuXHRcdGdhdGUoKTtcblx0fSk7XG5cdGZ1bmN0aW9uIGdhdGUoKXtcblx0XHRpZiAoIGdhdGVDaGVjayA8IDIgKXtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0YWRkVW5jbHVzdGVyZWQoKTtcblx0XHRhZGRDbHVzdGVyZWQoKTtcblx0XHR0b3RhbEluVmlld0NoYXJ0ID0gbmV3IEJhcnMuQmFyKHtcblx0XHRcdHRpdGxlOiAnUHJvcGVydGllcyBpbiB2aWV3JywgXG5cdFx0XHRtYXJnaW46IHtcblx0XHRcdFx0dG9wOjAsXG5cdFx0XHRcdHJpZ2h0OjEsXG5cdFx0XHRcdGJvdHRvbTowLFxuXHRcdFx0XHRsZWZ0OjFcblx0XHRcdH0sXG5cdFx0XHRoZWlnaHRUb1dpZHRoOiAwLjAzLFxuXHRcdFx0Y29udGFpbmVyOiAnI3RvdGFsLXZpZXcnLFxuXHRcdFx0dG90YWw6IGdlb2pzb24uZmVhdHVyZXMubGVuZ3RoXG5cdFx0XHR9KTtcblx0XHRcblx0fSAvLyBlbmQgZ2F0ZVxuXG5cdGZ1bmN0aW9uIGFkZFVuY2x1c3RlcmVkKCl7XG5cdFx0cmV0dXJuIG1iSGVscGVyLmFkZFNvdXJjZUFuZExheWVycy5jYWxsKHRoZU1hcCxcblx0XHRcdHsgLy8gc291cmNlXG5cdFx0XHRcdFwibmFtZVwiOiBcInBvbGljeS1wb2ludHNcIixcblx0XHQgICAgICAgIFwidHlwZVwiOiBcImdlb2pzb25cIixcblx0XHQgICAgICAgIFwiZGF0YVwiOiBnZW9qc29uXG5cdFx0XHR9LCBbIC8vIGxheWVyc1xuXHRcdFx0XHR7IC8vIGxheWVyIG9uZVxuXHQgICAgICAgICAgICBcImlkXCI6IFwicG9pbnRzXCIsXG5cdCAgICAgICAgICAgIFwidHlwZVwiOiBcImNpcmNsZVwiLFxuXHQgICAgICAgICAgICBcInNvdXJjZVwiOiBcInBvbGljeS1wb2ludHNcIixcblx0ICAgICAgICAgICAgXCJtYXh6b29tXCI6IDksXG5cdCAgICAgICAgICAgIFwicGFpbnRcIjoge1xuXHQgICAgICAgICAgICAgIFx0XCJjaXJjbGUtY29sb3JcIjogW1xuXHRcdCAgICAgICAgICAgICAgICAnbWF0Y2gnLFxuXHRcdCAgICAgICAgICAgICAgICBbJ2dldCcsICd0X2RlZCddLFxuXHRcdCAgICAgICAgICAgICAgICA1LCAnIzA1MTgzOScsXG5cdFx0ICAgICAgICAgICAgICAgIC8qIG90aGVyICovICcjOTkwMDAwJ1xuXHRcdCAgICAgICAgICAgIF0sXG5cdFx0ICAgICAgICAgICAgXCJjaXJjbGUtcmFkaXVzXCI6IHtcblx0XHQgICAgICAgICAgICAgICAgJ3N0b3BzJzogW1s1LCAzXSwgWzgsIDE4XV1cblx0XHQgICAgICAgICAgICB9LFxuXHRcdCAgICAgICAgICAgIFwiY2lyY2xlLW9wYWNpdHlcIjogMC4xXG5cdFx0ICAgICAgICAgICAgfVxuXHRcdCAgICAgICAgfSxcblx0XHQgICAgICAgIHsgLy8gbGF5ZXIgdHdvXG5cdCAgICAgICAgICAgIFwiaWRcIjogXCJwb2ludHMtZGF0YS1kcml2ZW5cIixcblx0ICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY2lyY2xlXCIsXG5cdCAgICAgICAgICAgIFwic291cmNlXCI6IFwicG9saWN5LXBvaW50c1wiLFxuXHQgICAgICAgICAgICBcIm1pbnpvb21cIjogOSxcblx0ICAgICAgICAgICAgXCJwYWludFwiOiB7XG5cdCAgICAgICAgICAgICAgXHRcImNpcmNsZS1jb2xvclwiOiBbXG5cdFx0ICAgICAgICAgICAgICAgICdtYXRjaCcsXG5cdFx0ICAgICAgICAgICAgICAgIFsnZ2V0JywgJ3RfZGVkJ10sXG5cdFx0ICAgICAgICAgICAgICAgIDUsICcjMDUxODM5Jyxcblx0XHQgICAgICAgICAgICAgICAgLyogb3RoZXIgKi8gJyM5OTAwMDAnXG5cdFx0ICAgICAgICAgICAgXSxcblx0XHQgICAgICAgICAgICBcImNpcmNsZS1yYWRpdXNcIjoge1xuXHRcdCAgICAgICAgICAgIFx0cHJvcGVydHk6ICdwcmVtJyxcblx0XHQgICAgICAgICAgICAgICAgdHlwZTogJ2V4cG9uZW50aWFsJyxcblx0XHRcdFx0ICAgICAgICBzdG9wczogW1xuXHRcdFx0XHQgICAgICAgICAgWzYyLCA1XSxcblx0XHRcdFx0ICAgICAgICAgIFsyNTAwLCA2MF1cblx0XHRcdFx0ICAgICAgICBdXG5cdFx0ICAgICAgICAgICAgfSxcblx0XHQgICAgICAgICAgICBcImNpcmNsZS1vcGFjaXR5XCI6IDAuMSxcblx0XHQgICAgICAgICAgICBcImNpcmNsZS1zdHJva2UtY29sb3JcIjogXCIjZmZmZmZmXCIsXG5cdFx0ICAgICAgICAgICAgXCJjaXJjbGUtc3Ryb2tlLXdpZHRoXCI6IDFcblx0XHQgICAgICAgIH1cblx0XHRcdH1dXG5cdFx0KTsgXG5cdH1cblxuXHQvKmZ1bmN0aW9uIGNoZWNrRmVhdHVyZXMoKXtcblx0XHR2YXIgZmVhdHVyZXM7XG5cdFx0aWYgKCB0aGVNYXAubG9hZGVkKCkpe1xuXHRcdFx0ZmVhdHVyZXMgPSB0aGVNYXAucXVlcnlSZW5kZXJlZEZlYXR1cmVzKHtsYXllcnM6Wydwb2ludHMnXX0pO1xuXHRcdFx0Y29uc29sZS5sb2coZmVhdHVyZXMpO1xuXHRcdFx0dGhlTWFwLm9mZigncmVuZGVyJywgY2hlY2tGZWF0dXJlcyk7XG5cdFx0fVxuXHR9Ki9cblx0ZnVuY3Rpb24gYWRkQ2x1c3RlcmVkKCl7XG5cdFx0XG5cdFx0bWJIZWxwZXIuYWRkU291cmNlQW5kTGF5ZXJzLmNhbGwodGhlTWFwLFxuXHRcdCAgICB7IC8vIHNvdXJjZVxuXHRcdCAgICBcdFwibmFtZVwiOiBcInBvbGljaWVzXCIsXG5cdFx0ICAgICAgICBcInR5cGVcIjogXCJnZW9qc29uXCIsXG5cdFx0ICAgICAgICBcImRhdGFcIjogZ2VvanNvbixcblx0XHQgICAgICAgIFwiY2x1c3RlclwiOiB0cnVlLFxuXHRcdCAgICAgICAgXCJjbHVzdGVyUmFkaXVzXCI6IDAuNSAvLyBSYWRpdXMgb2YgZWFjaCBjbHVzdGVyIHdoZW4gY2x1c3RlcmluZyBwb2ludHMgKGRlZmF1bHRzIHRvIDUwKVxuXHRcdCAgICB9LCBbIC8vIGxheWVyc1xuXHRcdCAgICAgICB7IC8vIGxheWVyIG9uZVxuXHRcdCAgICAgICAgICAgIGlkOiBcImNsdXN0ZXItY291bnRcIixcblx0XHRcdCAgICAgICAgdHlwZTogXCJzeW1ib2xcIixcblx0XHRcdCAgICAgICAgc291cmNlOiBcInBvbGljaWVzXCIsXG5cdFx0XHQgICAgICAgIGZpbHRlcjogW1wiaGFzXCIsIFwicG9pbnRfY291bnRcIl0sXG5cdFx0XHQgICAgICAgIFwibWluem9vbVwiOiA2LFxuXHRcdFx0ICAgICAgICBsYXlvdXQ6IHtcblx0XHRcdCAgICAgICAgICAgIFwidGV4dC1maWVsZFwiOiBcIntwb2ludF9jb3VudF9hYmJyZXZpYXRlZH1cIixcblx0XHRcdCAgICAgICAgICAgIFwidGV4dC1zaXplXCI6IDEyLFxuXG5cdFx0XHQgICAgICAgIH0sXG5cdFx0XHQgICAgICAgIFwicGFpbnRcIjoge1xuXHRcdFx0ICAgICAgICBcdFwidGV4dC1jb2xvclwiOiBcIiNmZmZmZmZcIlxuXHRcdFx0ICAgICAgICB9XG5cdFx0ICAgICAgICB9XG5cdCAgICAgICAgXSAvLyBlbmQgbGF5ZXJzIGFycmF5XG5cdCAgICApOyAvLyBlbmQgYWRkbGF5ZXJzXG5cdH0gLy8gZW5kIGFkZENsdXN0ZXJlZFxuXHRmdW5jdGlvbiB0b0dlb0pTT04odXJsKXtcblx0XHRcblx0XHRkMy5jc3YodXJsLCBmdW5jdGlvbihlcnIsIGRhdGEpe1xuXHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHR0aHJvdyBlcnI7XG5cdFx0XHR9XG5cdFx0XHQvL2NvbnNvbGUubG9nKGRhdGEpO1xuXHRcdFx0dmFyIGZlYXR1cmVzID0gW107IFxuXHRcdFx0ZGF0YS5mb3JFYWNoKGVhY2ggPT4ge1xuXHRcdFx0XHR2YXIgY29lcmNlZCA9IHt9O1xuXHRcdFx0XHRmb3IgKCB2YXIga2V5IGluIGVhY2ggKSB7XG5cdFx0XHRcdFx0aWYgKCBlYWNoLmhhc093blByb3BlcnR5KGtleSkgKXtcblx0XHRcdFx0XHRcdGNvZXJjZWRba2V5XSA9ICFpc05hTigrZWFjaFtrZXldKSA/ICtlYWNoW2tleV0gOiBlYWNoW2tleV07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9ICBcblx0XHRcdFx0ZmVhdHVyZXMucHVzaCh7XG5cdFx0XHRcdFx0XCJ0eXBlXCI6IFwiRmVhdHVyZVwiLFxuXHRcdFx0XHRcdFwicHJvcGVydGllc1wiOiBjb2VyY2VkLFxuXHRcdFx0XHRcdFwiZ2VvbWV0cnlcIjoge1xuXHRcdFx0XHRcdFx0XCJ0eXBlXCI6IFwiUG9pbnRcIixcblx0XHRcdFx0XHRcdFwiY29vcmRpbmF0ZXNcIjogWytlYWNoLmxvbmdpdHVkZSwgK2VhY2gubGF0aXR1ZGVdXG5cdFx0XHRcdFx0fSAgIFxuXHRcdFx0XHR9KTtcblx0XHRcdH0pOyAvLyBlbmQgZm9yRWFjaFxuXHRcdFx0Z2VvanNvbiA9ICB7XG5cdFx0XHRcdFwidHlwZVwiOiBcIkZlYXR1cmVDb2xsZWN0aW9uXCIsXG5cdFx0XHRcdFwiZmVhdHVyZXNcIjogZmVhdHVyZXNcblx0XHRcdH07XG5cdFx0XHRnYXRlQ2hlY2srKzsgIFxuXHRcdFx0Z2F0ZSgpO1xuXHRcdFx0Ly9hZGRDbHVzdGVyTGF5ZXJzKHJ0bik7XG5cdFx0XHRcblx0XHRcdHRoZUNoYXJ0cy5wdXNoKFxuXHRcdFx0XHRuZXcgRG9udXRzLkRvbnV0KHtcblx0XHRcdFx0XHRtYXJnaW46IHsgLy8gcGVyY2VudGFnZXNcblx0XHQgICAgICAgICAgICAgICAgdG9wOiAxNSxcblx0XHQgICAgICAgICAgICAgICAgcmlnaHQ6IDEwLFxuXHRcdCAgICAgICAgICAgICAgICBib3R0b206IDUsXG5cdFx0ICAgICAgICAgICAgICAgIGxlZnQ6IDEwXG5cdFx0ICAgICAgICAgICAgfSxcblx0XHQgICAgICAgICAgICBoZWlnaHRUb1dpZHRoOiAxLFxuXHRcdCAgICAgICAgICAgIGNvbnRhaW5lcjogJyNjaGFydC0wJyxcblx0XHQgICAgICAgICAgICBkYXRhOiBnZW9qc29uLmZlYXR1cmVzLFxuXHRcdCAgICAgICAgICAgIGNvbXBhcmF0b3I6IGZ1bmN0aW9uKGVhY2gpe1xuXHRcdCAgICAgICAgICAgIFx0cmV0dXJuIGVhY2gucHJvcGVydGllcy50X2RlZCA8IDU7XG5cdFx0ICAgICAgICAgICAgfVxuXHRcdFx0XHR9KVxuXHRcdFx0KTtcblx0XHR9KTsgLy8gZW5kIGQzIGNzdlxuXHR9IC8vIGVuZCB0b0dlb0pTT05cblx0Lyp2YXIgZmVhdHVyZXNJblZpZXcgPSB7XG5cdFx0cmVuZGVyKCl7XG5cdFx0XHR0aGlzLmNoYXJ0ID0gbmV3IEJhcnMuQmFyKHtcblx0XHRcdFx0bWFyZ2luOiB7XG5cdFx0XHRcdFx0dG9wOjAsXG5cdFx0XHRcdFx0cmlnaHQ6MCxcblx0XHRcdFx0XHRib3R0b206MCxcblx0XHRcdFx0XHRsZWZ0OjBcblx0XHRcdFx0fSxcblx0XHRcdFx0aGVpZ2h0VG9XaWR0aDogMC4wMyxcblx0XHRcdFx0Y29udGFpbmVyOiAnI3RvdGFsLXZpZXcnLFxuXHRcdFx0XHR0b3RhbDogZ2VvanNvbi5mZWF0dXJlcy5sZW5ndGhcblx0XHRcdH0pO1xuXG5cdFx0XHQvKnRoaXMudG90YWwgPSBnZW9qc29uLmZlYXR1cmVzLmxlbmd0aDtcblx0XHRcdHRoaXMuc3ZnID0gZDMuc2VsZWN0KCcjdG90YWwtdmlldycpXG5cdFx0XHRcdC5hcHBlbmQoJ3N2ZycpXG5cdFx0XHRcdC5hdHRyKCd3aWR0aCcsICcxMDAlJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3htbG5zJywnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnKVxuXHQgICAgICAgICAgICAuYXR0cigndmVyc2lvbicsJzEuMScpIFxuXHQgICAgICAgICAgICAuYXR0cigndmlld0JveCcsICcwIDAgMTAwIDMnKTtcblxuXHQgICAgICAgIHRoaXMuYmFja2dyb3VuZCA9IHRoaXMuc3ZnLmFwcGVuZCgnbGluZScpXG5cdCAgICAgICAgXHQuY2xhc3NlZCgnYmFja2dyb3VuZC1saW5lJywgdHJ1ZSlcblx0ICAgICAgICBcdC5hdHRyKCd4MCcsMClcblx0ICAgICAgICBcdC5hdHRyKCd5MCcsMClcblx0ICAgICAgICBcdC5hdHRyKCd4MScsMTAwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kxJywwKTtcblxuXHQgICAgICAgIHRoaXMubGluZSA9IHRoaXMuc3ZnLmFwcGVuZCgnbGluZScpXG5cdCAgICAgICAgXHQuY2xhc3NlZCgndG90YWwtbGluZScsIHRydWUpXG5cdCAgICAgICAgXHQuYXR0cigneDAnLDApXG5cdCAgICAgICAgXHQuYXR0cigneTAnLDApXG5cdCAgICAgICAgXHQuYXR0cigneDEnLDApXG5cdCAgICAgICAgXHQuYXR0cigneTEnLDApO1xuXG5cdCAgICAgICAgdGhpcy50ZXh0ID0gZDMuc2VsZWN0KCcjdG90YWwtdmlldycpXG5cdCAgICAgICAgXHQuYXBwZW5kKCdzcGFuJylcblx0ICAgICAgICBcdC50ZXh0KCgpID0+IGAke2QzLmZvcm1hdChcIixcIikodGhpcy50b3RhbCl9IG9mICR7ZDMuZm9ybWF0KFwiLFwiKSh0aGlzLnRvdGFsKX0gaW4gdmlld2AgKTtcblx0ICAgICAgICBcdFxuXG5cdFx0XHR0aGlzLnVwZGF0ZShjb3VudEZlYXR1cmVzKCkpO1xuXHRcdH0sXG5cdFx0dXBkYXRlKG4pe1xuXHRcdFx0LypkMy5zZWxlY3QoJyN0b3RhbC1pbi12aWV3Jylcblx0XHRcdFx0LnRleHQoKCkgPT4gZDMuZm9ybWF0KFwiLFwiKShuKSArICcgb2YgJyArIGQzLmZvcm1hdChcIixcIikodGhpcy50b3RhbCkgKyAnIHByb3BlcnRpZXMgaW4gdmlldycpOyovXG5cdFx0XHQvKnRoaXMubGluZVxuXHRcdFx0XHQudHJhbnNpdGlvbigpLmR1cmF0aW9uKDIwMClcblx0XHRcdFx0LmF0dHIoJ3gxJywgKCkgPT4gKCBuIC8gdGhpcy50b3RhbCkgKiAxMDAgKTtcblx0XHRcdHRoaXMudGV4dFxuXHRcdFx0XHQudGV4dCgoKSA9PiBgJHtkMy5mb3JtYXQoXCIsXCIpKG4pfSBvZiAke2QzLmZvcm1hdChcIixcIikodGhpcy50b3RhbCl9IGluIHZpZXdgICk7XG5cblx0XHR9Ki9cblxuXHRcblx0dmFyIG1hdGNoaW5nSURzID0gbmV3IFNldCgpO1xuXHRmdW5jdGlvbiBjb3VudEZlYXR1cmVzKCl7XG5cdFx0LyoganNoaW50IGxheGJyZWFrOnRydWUgKi9cblx0XHRtYXRjaGluZ0lEcy5jbGVhcigpO1xuXHRcdC8vdmFyIGNvdW50ID0gMDtcblx0XHR2YXIgYm91bmRzID0gdGhlTWFwLmdldEJvdW5kcygpO1xuXHRcdGdlb2pzb24uZmVhdHVyZXMuZm9yRWFjaChlYWNoID0+IHtcblx0XHRcdGlmICggICAgZWFjaC5wcm9wZXJ0aWVzLmxvbmdpdHVkZSA+PSBib3VuZHMuX3N3LmxuZyBcblx0XHRcdFx0ICYmIGVhY2gucHJvcGVydGllcy5sb25naXR1ZGUgPD0gYm91bmRzLl9uZS5sbmcgXG5cdFx0XHRcdCAmJiBlYWNoLnByb3BlcnRpZXMubGF0aXR1ZGUgID49IGJvdW5kcy5fc3cubGF0IFxuXHRcdFx0XHQgJiYgZWFjaC5wcm9wZXJ0aWVzLmxhdGl0dWRlICA8PSBib3VuZHMuX25lLmxhdCApe1xuXHRcdFx0XHRtYXRjaGluZ0lEcy5hZGQoZWFjaC5wcm9wZXJ0aWVzLmlkKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRjb25zb2xlLmxvZyhtYXRjaGluZ0lEcyk7XG5cdFx0cmV0dXJuIG1hdGNoaW5nSURzLnNpemU7XG5cdH1cblx0dGhlTWFwLm9uKCdtb3ZlZW5kJywgZnVuY3Rpb24oKXtcblx0XHR1cGRhdGVBbGwoKTtcblx0fSk7XG5cdHRoZU1hcC5vbignem9vbWVuZCcsIGZ1bmN0aW9uKCl7XG5cdFx0dXBkYXRlQWxsKCk7XG5cdH0pO1xuXHRmdW5jdGlvbiB1cGRhdGVBbGwoKXtcblx0XHR0b3RhbEluVmlld0NoYXJ0LnVwZGF0ZShjb3VudEZlYXR1cmVzKCkpO1xuXHRcdHRoZUNoYXJ0cy5mb3JFYWNoKGVhY2ggPT4gZWFjaC51cGRhdGUoZmFsc2UsIG1hdGNoaW5nSURzKSk7XG5cdH1cblx0Lyp0aGVNYXAub24oXCJtb3VzZW1vdmVcIiwgXCJwb2ludHMtZGF0YS1kcml2ZW5cIiwgZnVuY3Rpb24oZSkge1xuICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICB9KTsqL1xuXG5cdHJldHVybiB0aGVNYXA7XG4gICBcbn0oKSk7IC8vIGVuZCBJSUZFICIsImV4cG9ydCBjb25zdCBCYXJzID0gKGZ1bmN0aW9uKCl7XG5cblx0dmFyIEJhciA9IGZ1bmN0aW9uKGNvbmZpZ09iamVjdCl7IC8vIG1hcmdpbnMge30sIGhlaWdodCAjLCB3aWR0aCAjLCBjb250YWluZXJJRCwgZGF0YVBhdGhcblx0ICAgIHRoaXMuc2V0dXAoY29uZmlnT2JqZWN0KTtcblx0fTtcblxuXHRCYXIucHJvdG90eXBlID0ge1xuXHRcdHNldHVwKGNvbmZpZ09iamVjdCl7IC8vIHNvbWUgb2Ygc2V0dXAgaXMgY29tbW9uIHRvIGFsbCBjaGFydHMgYW5kIGNvdWxkIGJlIGhhbmRsZWQgYnkgcHJvdG90eXBpY2FsIGluaGVyaXRhbmNlXG5cdCAgICBcdFxuXHQgICAgICAgIHZhciB2aWV3Qm94ID0gJzAgMCAxMDAgJyArIE1hdGgucm91bmQoY29uZmlnT2JqZWN0LmhlaWdodFRvV2lkdGggKiAxMDApO1xuXHQgICAgICAgIHRoaXMubWFyZ2luID0gY29uZmlnT2JqZWN0Lm1hcmdpbjtcblx0ICAgICAgICB0aGlzLndpZHRoID0gMTAwIC0gdGhpcy5tYXJnaW4ubGVmdCAtIHRoaXMubWFyZ2luLnJpZ2h0O1xuXHQgICAgICAgIHRoaXMuaGVpZ2h0ID0gY29uZmlnT2JqZWN0LmhlaWdodFRvV2lkdGggKiAxMDAgLSB0aGlzLm1hcmdpbi50b3AgLSB0aGlzLm1hcmdpbi5ib3R0b207XG5cdCAgICAgICAgdGhpcy50aXRsZSA9IGNvbmZpZ09iamVjdC50aXRsZTtcblx0ICAgICAgICB0aGlzLmNvbXBhcmF0b3IgPSBjb25maWdPYmplY3QuY29tcGFyYXRvcjtcblx0ICAgICAgICB0aGlzLmJhY2tncm91bmRDb2xvciA9IGNvbmZpZ09iamVjdC5iYWNrZ3JvdW5kQ29sb3IgfHwgJ2dyYXknO1xuXHQgICAgICAgIHRoaXMudG90YWwgPSBjb25maWdPYmplY3QudG90YWw7XG5cblx0ICAgICAgICBkMy5zZWxlY3QoY29uZmlnT2JqZWN0LmNvbnRhaW5lcilcblx0ICAgICAgICBcdC5hcHBlbmQoJ3NwYW4nKVxuXHQgICAgICAgIFx0LmNsYXNzZWQoJ2ZpZ3VyZS10aXRsZScsIHRydWUpXG5cdCAgICAgICAgXHQudGV4dCh0aGlzLnRpdGxlKTtcblxuXHQgICAgICAgIHRoaXMuc3ZnID0gZDMuc2VsZWN0KGNvbmZpZ09iamVjdC5jb250YWluZXIpXG5cdCAgICAgICAgICAgIC5hcHBlbmQoJ3N2ZycpXG5cdCAgICAgICAgICAgIC5hdHRyKCd3aWR0aCcsICcxMDAlJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3htbG5zJywnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnKVxuXHQgICAgICAgICAgICAuYXR0cigndmVyc2lvbicsJzEuMScpXG5cdCAgICAgICAgICAgIC5hdHRyKCd2aWV3Qm94Jywgdmlld0JveClcblx0ICAgICAgICAgICAgLmFwcGVuZCgnZycpXG5cdCAgICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyB0aGlzLm1hcmdpbi5sZWZ0ICsgJywnICsgdGhpcy5tYXJnaW4udG9wICsgJyknKTtcblxuXHQgICAgICAgIHRoaXMuYmFja2dyb3VuZCA9IHRoaXMuc3ZnLmFwcGVuZCgnbGluZScpXG5cdCAgICAgICAgXHQuY2xhc3NlZCgnYmFja2dyb3VuZC1saW5lLScgKyB0aGlzLmJhY2tncm91bmRDb2xvciwgdHJ1ZSlcblx0ICAgICAgICBcdC5hdHRyKCd4MCcsMClcblx0ICAgICAgICBcdC5hdHRyKCd5MCcsMClcblx0ICAgICAgICBcdC5hdHRyKCd4MScsMTAwIC0gdGhpcy5tYXJnaW4ubGVmdCAtIHRoaXMubWFyZ2luLnJpZ2h0KVxuXHQgICAgICAgIFx0LmF0dHIoJ3kxJywwKTtcblxuXHQgICAgICAgIHRoaXMubGluZSA9IHRoaXMuc3ZnLmFwcGVuZCgnbGluZScpXG5cdCAgICAgICAgXHQuY2xhc3NlZCgnZm9yZWdyb3VuZC1saW5lJywgdHJ1ZSlcblx0ICAgICAgICBcdC5hdHRyKCd4MCcsMClcblx0ICAgICAgICBcdC5hdHRyKCd5MCcsMClcblx0ICAgICAgICBcdC5hdHRyKCd4MScsMClcblx0ICAgICAgICBcdC5hdHRyKCd5MScsMCk7XG5cblx0ICAgICAgICB0aGlzLnRleHQgPSBkMy5zZWxlY3QoJyN0b3RhbC12aWV3Jylcblx0ICAgICAgICBcdC5hcHBlbmQoJ3NwYW4nKVxuXHQgICAgICAgIFx0LnRleHQoKCkgPT4gYCR7ZDMuZm9ybWF0KFwiLFwiKSh0aGlzLnRvdGFsKX0gb2YgJHtkMy5mb3JtYXQoXCIsXCIpKHRoaXMudG90YWwpfSBpbiB2aWV3YCApO1xuXG5cdCAgICAgICAgdGhpcy51cGRhdGUodGhpcy50b3RhbCk7ICBcbiAgICAgICAgfSxcbiAgICAgICAgdXBkYXRlKG4pe1xuXHRcdFx0XG5cdFx0XHR0aGlzLmxpbmVcblx0XHRcdFx0LnRyYW5zaXRpb24oKS5kdXJhdGlvbigyMDApXG5cdFx0XHRcdC5hdHRyKCd4MScsICgpID0+ICgoIG4gLyB0aGlzLnRvdGFsKSAqIDEwMCApIC0gdGhpcy5tYXJnaW4ubGVmdCAtIHRoaXMubWFyZ2luLnJpZ2h0ICk7XG5cdFx0XHR0aGlzLnRleHRcblx0XHRcdFx0LnRleHQoKCkgPT4gYCR7ZDMuZm9ybWF0KFwiLFwiKShuKX0gb2YgJHtkMy5mb3JtYXQoXCIsXCIpKHRoaXMudG90YWwpfWAgKTtcblx0XHR9XG5cdH07XG5cblx0cmV0dXJuIHtcblx0XHRCYXJcblx0fTtcbiAgICAgICAgXG59KSgpOyIsImV4cG9ydCBjb25zdCBEb251dHMgPSAoZnVuY3Rpb24oKXtcbiAgICAvKiBnbG9iYWxzIGQzICovXG4gICAvKiBjb25zdCBtZWRpYW5JbmNvbWVzID0gbmV3IE1hcCgpO1xuICAgIGZ1bmN0aW9uIGNyZWF0ZU1lZGlhbkluY29tZU1hcChnZW9qc29uKXtcblx0XHRnZW9qc29uLmZlYXR1cmVzLmZvckVhY2goZWFjaCA9PiB7XG5cdFx0XHRpZiAoICFtZWRpYW5JbmNvbWVzLmhhcyhlYWNoLnByb3BlcnRpZXMuY2VuX3RyYWN0KSApe1xuXHRcdFx0XHRsZXQgaW5jb21lID0gZWFjaC5wcm9wZXJ0aWVzLm1lZF9pbmNvbWUgPiAwID8gZWFjaC5wcm9wZXJ0aWVzLm1lZF9pbmNvbWUgOiBudWxsO1xuXHRcdFx0XHRtZWRpYW5JbmNvbWVzLnNldChlYWNoLnByb3BlcnRpZXMuY2VuX3RyYWN0LCBpbmNvbWUpOyBcdFxuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdGNvbnNvbGUubG9nKG1lZGlhbkluY29tZXMpO1xuXHRcdHdpbmRvdy5tZWRpYW5JbmNvbWVzID0gbWVkaWFuSW5jb21lcztcblx0XHQvL2NyZWF0ZUNoYXJ0cyhnZW9qc29uKTtcblx0fSAqL1xuXHRcbiAgICB2YXIgdGF1ID0gMiAqIE1hdGguUEk7XG5cdHZhciBEb251dCA9IGZ1bmN0aW9uKGNvbmZpZ09iamVjdCl7IC8vIG1hcmdpbnMge30sIGhlaWdodCAjLCB3aWR0aCAjLCBjb250YWluZXJJRCwgZGF0YVBhdGhcblx0ICAgIGNvbnNvbGUubG9nKHRoaXMsIGNvbmZpZ09iamVjdCk7XG5cdCAgICB0aGlzLnNldHVwKGNvbmZpZ09iamVjdCk7XG5cdH07XG5cblx0RG9udXQucHJvdG90eXBlID0ge1xuXG5cdCAgICBzZXR1cChjb25maWdPYmplY3Qpe1xuXHQgICAgXHRjb25zb2xlLmxvZygnaW4gc2V0IHVwJyk7XG5cdCAgICAgICAgdmFyIHZpZXdCb3ggPSAnMCAwIDEwMCAnICsgTWF0aC5yb3VuZChjb25maWdPYmplY3QuaGVpZ2h0VG9XaWR0aCAqIDEwMCk7XG5cdCAgICAgICAgdGhpcy5tYXJnaW4gPSBjb25maWdPYmplY3QubWFyZ2luO1xuXHQgICAgICAgIHRoaXMud2lkdGggPSAxMDAgLSB0aGlzLm1hcmdpbi5sZWZ0IC0gdGhpcy5tYXJnaW4ucmlnaHQ7XG5cdCAgICAgICAgdGhpcy5oZWlnaHQgPSBjb25maWdPYmplY3QuaGVpZ2h0VG9XaWR0aCAqIDEwMCAtIHRoaXMubWFyZ2luLnRvcCAtIHRoaXMubWFyZ2luLmJvdHRvbTtcblx0ICAgICAgICB0aGlzLnJhZGl1cyA9IE1hdGgubWluKHRoaXMud2lkdGgsdGhpcy5oZWlnaHQpIC8gMztcblx0ICAgICAgICB0aGlzLmRhdGEgPSBjb25maWdPYmplY3QuZGF0YTtcblx0ICAgICAgICB0aGlzLmNvbXBhcmF0b3IgPSBjb25maWdPYmplY3QuY29tcGFyYXRvcjtcblx0ICAgICAgXG5cdCAgICAgICAgdGhpcy5hcmMgPSBkMy5hcmMoKVxuXHQgICAgICAgICAgLm91dGVyUmFkaXVzKHRoaXMucmFkaXVzKSBcblx0ICAgICAgICAgIC5pbm5lclJhZGl1cyh0aGlzLnJhZGl1cyAvIDEuNSlcblx0ICAgICAgICAgIC5zdGFydEFuZ2xlKDApOyBcblxuXHQgICAgICAgIHRoaXMuc3ZnID0gZDMuc2VsZWN0KGNvbmZpZ09iamVjdC5jb250YWluZXIpXG5cdCAgICAgICAgICAgIC5hcHBlbmQoJ3N2ZycpXG5cdCAgICAgICAgICAgIC5hdHRyKCd3aWR0aCcsICcxMDAlJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3htbG5zJywnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnKVxuXHQgICAgICAgICAgICAuYXR0cigndmVyc2lvbicsJzEuMScpXG5cdCAgICAgICAgICAgIC5hdHRyKCd2aWV3Qm94Jywgdmlld0JveClcblx0ICAgICAgICAgICAgLmFwcGVuZCgnZycpXG5cdCAgICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyB0aGlzLm1hcmdpbi5sZWZ0ICsgJywnICsgdGhpcy5tYXJnaW4udG9wICsgJyknKTtcblxuXHQgICAgXHR0aGlzLnN2Zy5hcHBlbmQoJ3BhdGgnKVxuXHQgICAgICAgICAgICAuY2xhc3NlZCgnYmFja2dyb3VuZCcsdHJ1ZSlcblx0ICAgICAgICAgICAgLmRhdHVtKHtlbmRBbmdsZTogdGF1fSlcblx0ICAgICAgICAgICAgLmF0dHIoJ2QnLCB0aGlzLmFyYylcblx0ICAgICAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIHRoaXMud2lkdGggLyAyICsgJywnICsgdGhpcy5oZWlnaHQgLyAyICsgJyknKTtcblxuXHQgICAgICAgIHRoaXMuZm9yZWdyb3VuZCA9IHRoaXMuc3ZnLmFwcGVuZCgncGF0aCcpXG5cdCAgICAgICAgICAgIC5kYXR1bSh7ZW5kQW5nbGU6IHRhdX0pXG5cdCAgICAgICAgICAgIC5jbGFzc2VkKCdmb3JlZ3JvdW5kJyx0cnVlKVxuXHQgICAgICAgICAgICAuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgdGhpcy53aWR0aCAvIDIgKyAnLCcgKyB0aGlzLmhlaWdodCAvIDIgKyAnKScpXG5cdCAgICAgICAgICAgIC5hdHRyKCdkJywgdGhpcy5hcmMpO1xuXG5cdCAgICAgICAgdGhpcy51cGRhdGUodHJ1ZSk7XG5cblx0ICAgICAgICAvKiB0aGlzLnN2Zy5hcHBlbmQoXCJ0ZXh0XCIpXG5cdCAgICAgICAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIilcblx0ICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywncGllX251bWJlcicpXG5cdCAgICAgICAgICAgIC5hdHRyKCd5Jyw1KVxuXHQgICAgICAgICAgICAudGV4dChkMy5mb3JtYXQoXCIuMnNcIikodGhpcy52YWx1ZSkpXG5cdCAgICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyB0aGlzLndpZHRoIC8gMiArICcsJyArIHRoaXMuaGVpZ2h0IC8gMiArICcpJyk7Ki9cblxuXHQgICAgfSxcblx0ICAgIHVwZGF0ZShpc0ZpcnN0VXBkYXRlLCBtYXRjaGluZ0lEcyl7XG5cdCAgICBcdHZhciB0b3RhbCxcblx0ICAgIFx0XHRmaWx0ZXJlZERhdGEsXG5cdCAgICBcdFx0bnVtYmVyTWF0Y2hpbmcgPSAwO1xuXHQgICAgXHRpZiAoIGlzRmlyc3RVcGRhdGUgKXtcblx0ICAgIFx0XHR0b3RhbCA9IHRoaXMuZGF0YS5sZW5ndGg7XG5cdCAgICBcdFx0dGhpcy5kYXRhLmZvckVhY2goZWFjaCA9PiB7XG5cdCAgICBcdFx0XHRpZiAoIHRoaXMuY29tcGFyYXRvcihlYWNoKSApe1xuXHQgICAgXHRcdFx0XHRudW1iZXJNYXRjaGluZysrO1xuXHQgICAgXHRcdFx0fVxuXHQgICAgXHRcdH0pO1xuXHQgICAgXHR9IGVsc2Uge1xuXHQgICAgXHRcdGNvbnNvbGUubG9nKHRoaXMuZGF0YSk7XG5cdCAgICBcdFx0ZmlsdGVyZWREYXRhID0gdGhpcy5kYXRhLmZpbHRlcihlYWNoID0+IG1hdGNoaW5nSURzLmhhcyhlYWNoLnByb3BlcnRpZXMuaWQpKTtcblx0ICAgIFx0XHR0b3RhbCA9IGZpbHRlcmVkRGF0YS5sZW5ndGg7XG5cdCAgICBcdFx0ZmlsdGVyZWREYXRhLmZvckVhY2goZWFjaCA9PiB7XG5cdCAgICBcdFx0XHRpZiAoIHRoaXMuY29tcGFyYXRvcihlYWNoKSApe1xuXHQgICAgXHRcdFx0XHRudW1iZXJNYXRjaGluZysrO1xuXHQgICAgXHRcdFx0fVxuXHQgICAgXHRcdH0pO1xuXHQgICAgXHR9XG5cdCAgICBcdHZhciBlbmRBbmdsZSA9IChudW1iZXJNYXRjaGluZyAvIHRvdGFsKSAqIHRhdTtcblxuXHQgICAgXHR0aGlzLmZvcmVncm91bmQgXG5cdCAgICBcdFx0LnRyYW5zaXRpb24oKS5kdXJhdGlvbig1MDApXG5cdCAgICBcdFx0LmF0dHJUd2VlbignZCcsIHRoaXMuYXJjVHdlZW4oZW5kQW5nbGUpKTtcblxuXHQgICAgfSxcblx0ICAgIGFyY1R3ZWVuKG5ld0FuZ2xlKSB7IC8vIEhUIGh0dHA6Ly9ibC5vY2tzLm9yZy9tYm9zdG9jay81MTAwNjM2XG5cdFx0XHRyZXR1cm4gZCA9PiB7XG5cdFx0XHQgICAgdmFyIGludGVycG9sYXRlID0gZDMuaW50ZXJwb2xhdGUoZC5lbmRBbmdsZSwgbmV3QW5nbGUpO1xuXHRcdFx0ICAgIHJldHVybiB0ID0+IHtcblx0XHRcdCAgICAgIGQuZW5kQW5nbGUgPSBpbnRlcnBvbGF0ZSh0KTtcblx0XHRcdFx0ICAgICAgcmV0dXJuIHRoaXMuYXJjKGQpO1xuXHRcdFx0ICAgIH07XG5cdFx0XHR9O1xuXHRcdH1cblx0fTtcblx0XG5cdHJldHVybiB7XG5cdFx0RG9udXRcblx0fTtcbn0oKSk7IiwiY29uc3QgbWJIZWxwZXIgPSB7XG4gICAgcHJvbWlzZXM6IHt9LFxuICAgIGFkZFNvdXJjZUFuZExheWVycyhzb3VyY2VPcHRpb25zLGxheWVyT3B0aW9uc0FycmF5KXsgLy8gdGhpcyA9IG1hcFxuICAgICAgICB2YXIgc291cmNlTmFtZSA9IHNvdXJjZU9wdGlvbnMubmFtZTtcbiAgICAgICAgbWJIZWxwZXIucHJvbWlzZXNbc291cmNlT3B0aW9ucy5uYW1lXSA9IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7IC8vIFRPIERPOiBmaWd1cmUgb3V0IHJlamVjdD9cbiAgICAgICAgICAgIGRlbGV0ZSBzb3VyY2VPcHRpb25zLm5hbWU7XG4gICAgICAgICAgICBmdW5jdGlvbiBjaGVja0RhdGFMb2FkZWQoKXtcbiAgICAgICAgICAgICAgICBpZiAoIHRoaXMuZ2V0U291cmNlKHNvdXJjZU5hbWUpICl7IC8vIGlmIGFkZFNvdXJjZSBoYXMgdGFrZW4gZWZmZWN0XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub2ZmKCdyZW5kZXInLCBjaGVja0RhdGFMb2FkZWQpOyAvLyB0dXJuIG9mZiB0aGUgbGlzdGVuZXIgZm9yIHJlbmRlclxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMub24oJ3JlbmRlcicsIGNoZWNrRGF0YUxvYWRlZCk7XG4gICAgICAgICAgICB0aGlzLmFkZFNvdXJjZShzb3VyY2VOYW1lLCBzb3VyY2VPcHRpb25zKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBsYXllclByb21pc2VzID0gW107XG4gICAgICAgIHJldHVybiBtYkhlbHBlci5wcm9taXNlc1tzb3VyY2VOYW1lXS50aGVuKCgpID0+IHsgXG4gICAgICAgICAgICBsYXllck9wdGlvbnNBcnJheS5mb3JFYWNoKChlYWNoKSA9PiB7XG4gICAgICAgICAgICAgICAgbGF5ZXJQcm9taXNlcy5wdXNoKFxuICAgICAgICAgICAgICAgICAgICBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4geyAvLyBUTyBETzogZmlndXJlIG91dCByZWplY3Q/XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYmVmb3JlTGF5ZXIgPSBlYWNoLmJlZm9yZUxheWVyID8gZWFjaC5iZWZvcmVMYXllciA6ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGVhY2guYmVmb3JlTGF5ZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICBlYWNoLnNvdXJjZSA9IHNvdXJjZU5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBjaGVja0xheWVyTG9hZGVkKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCB0aGlzLmdldExheWVyKGVhY2guaWQpICl7IC8vIGlmIGFkZExheWVyICBoYXMgdGFrZW4gZWZmZWN0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub2ZmKCdyZW5kZXInLCBjaGVja0xheWVyTG9hZGVkKTsgLy8gdHVybiBvZmYgdGhlIGxpc3RlbmVyIGZvciByZW5kZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9uKCdyZW5kZXInLCBjaGVja0xheWVyTG9hZGVkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkTGF5ZXIoZWFjaCwgYmVmb3JlTGF5ZXIpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLmFsbChsYXllclByb21pc2VzKTtcbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuZXhwb3J0cy5hZGRTb3VyY2VBbmRMYXllcnMgPSBtYkhlbHBlci5hZGRTb3VyY2VBbmRMYXllcnM7Il19
