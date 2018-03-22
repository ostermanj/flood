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
			}));
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
				data: geojson.features,
				numerator: function numerator() {
					return this.total;
				},
				textFunction: function textFunction(n) {
					return d3.format(",")(n) + ' of ' + d3.format(",")(this.total);
				}
			});
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
			return each.update(matchingIDs);
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

			var viewBox = '0 0 100 ' + Math.round(configObject.heightToWidth * 100);
			this.margin = configObject.margin;
			this.width = 100 - this.margin.left - this.margin.right;
			this.height = configObject.heightToWidth * 100 - this.margin.top - this.margin.bottom;
			this.title = configObject.title;
			this.comparator = configObject.comparator;
			this.backgroundColor = configObject.backgroundColor || 'gray';
			this.data = configObject.data;
			this.total = this.data.length;
			this.textFunction = configObject.textFunction;
			this.numerator = configObject.numerator;

			d3.select(configObject.container).append('span').classed('figure-title', true).text(this.title);

			this.svg = d3.select(configObject.container).append('svg').attr('width', '100%').attr('xmlns', 'http://www.w3.org/2000/svg').attr('version', '1.1').attr('viewBox', viewBox).append('g').attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

			this.background = this.svg.append('line').classed('background-line-' + this.backgroundColor, true).attr('x0', 0).attr('y0', 0).attr('x1', 100 - this.margin.left - this.margin.right).attr('y1', 0);

			this.line = this.svg.append('line').classed('foreground-line', true).attr('x0', 0).attr('y0', 0).attr('x1', 0).attr('y1', 0);

			this.text = d3.select('#total-view').append('span');

			//this.update(this.numerator());  
		},
		update: function update(n) {
			var _this = this;

			this.line.transition().duration(200).attr('x1', function () {
				return n / _this.total * 100 - _this.margin.left - _this.margin.right;
			});
			this.text.text(function () {
				return _this.textFunction(n);
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
		update: function update(matchingIDs) {
			var _this = this;

			var numberMatching = 0,
			    filteredData = this.data.filter(function (each) {
				return matchingIDs.has(each.properties.id);
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkZXYtanMvbWFpbi5lczYiLCJqcy1leHBvcnRzL0JhcnMuanMiLCJqcy1leHBvcnRzL0RvbnV0cy5qcyIsIm5vZGVfbW9kdWxlcy9tYXBib3gtaGVscGVyL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNDQzs7QUFDQTs7QUFDQTs7QUFFRDs7Ozs7Ozs7QUFRQTs7Ozs7QUFiQztBQWtCRCxPQUFPLE1BQVAsR0FBa0IsWUFBVTtBQUM1Qjs7QUFFSSxVQUFTLFdBQVQsR0FBdUIsOEZBQXZCOztBQUVBLEtBQU0sV0FBVyxRQUFRLGVBQVIsQ0FBakI7QUFDQSxLQUFNLFlBQVksRUFBbEI7QUFDQSxLQUFJLGdCQUFKO0FBQ0EsS0FBSSxPQUFKO0FBQ0EsS0FBSSxZQUFZLENBQWhCOztBQUVBLEtBQUksU0FBUyxJQUFJLFNBQVMsR0FBYixDQUFpQjtBQUM3QixhQUFXLEtBRGtCO0FBRTdCLFNBQU8scURBRnNCO0FBRzdCLFVBQVEsQ0FBQyxDQUFDLGlCQUFGLEVBQXFCLGtCQUFyQixDQUhxQjtBQUk3QixRQUFNLENBSnVCO0FBSzdCLGFBQVcsQ0FBQyxDQUFDLENBQUMsa0JBQUYsRUFBc0Isa0JBQXRCLENBQUQsRUFBMkMsQ0FBQyxDQUFDLGdCQUFGLEVBQW1CLGlCQUFuQixDQUEzQyxDQUxrQjtBQU03QixXQUFTLEdBTm9CO0FBTzdCLHNCQUFvQjtBQVBTLEVBQWpCLENBQWI7O0FBVUgsS0FBSSxNQUFNLElBQUksU0FBUyxpQkFBYixDQUErQixFQUFDLGFBQVksS0FBYixFQUEvQixDQUFWO0FBQ0EsUUFBTyxVQUFQLENBQWtCLEdBQWxCLEVBQXVCLFVBQXZCOztBQUVBLFdBQVUsY0FBVjs7QUFFQSxRQUFPLEVBQVAsQ0FBVSxNQUFWLEVBQWtCLFlBQVU7QUFDM0I7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ZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9cmV0dXJuIGV9KSgpIiwiIC8qIGV4cG9ydGVkIENoYXJ0cyAqL1xuIGltcG9ydCB7IERvbnV0cyB9IGZyb20gJy4uL2pzLWV4cG9ydHMvRG9udXRzJztcbiBpbXBvcnQgeyBCYXJzIH0gZnJvbSAnLi4vanMtZXhwb3J0cy9CYXJzJztcbiAvKiBwb2x5ZmlsbHMgbmVlZGVkOiBQcm9taXNlIFRPIERPOiBPVEhFUlM/XG4gKi9cbi8qXG5pbXBvcnQgeyByZWZsZWN0LCBhcnJheUZpbmQsIFNWR0lubmVySFRNTCwgU1ZHRm9jdXMgfSBmcm9tICcuLi9qcy12ZW5kb3IvcG9seWZpbGxzJztcbmltcG9ydCB7IEhlbHBlcnMgfSBmcm9tICcuLi9qcy1leHBvcnRzL0hlbHBlcnMnO1xuaW1wb3J0IHsgZDNUaXAgfSBmcm9tICcuLi9qcy12ZW5kb3IvZDMtdGlwJztcbmltcG9ydCB7IGNyZWF0ZUJyb3dzZUJ1dHRvbiB9IGZyb20gJy4uL2pzLWV4cG9ydHMvQnJvd3NlQnV0dG9ucyc7XG5pbXBvcnQgeyBjcmVhdGVSZXN1bHRJdGVtIH0gZnJvbSAnLi4vanMtZXhwb3J0cy9SZXN1bHRJdGVtcyc7IFxuKi9cbiAgXG4vKlxudG8gZG8gOiBzZWUgYWxzbyBodHRwczovL3d3dy5tYXBib3guY29tL21hcGJveC1nbC1qcy9leGFtcGxlL2hlYXRtYXAtbGF5ZXIvXG5cblxuKi9cbndpbmRvdy50aGVNYXAgID0gKGZ1bmN0aW9uKCl7ICAgXG5cInVzZSBzdHJpY3RcIjtcblx0XG4gICAgbWFwYm94Z2wuYWNjZXNzVG9rZW4gPSAncGsuZXlKMUlqb2liM04wWlhKdFlXNXFJaXdpWVNJNkltTnBkblU1ZEhWbmRqQTJlRFl5YjNBM05uZzFjR0ozWlhvaWZRLlhvX2sta3pHZllYX1lvX1JEY0hEQmcnO1xuXG4gICAgY29uc3QgbWJIZWxwZXIgPSByZXF1aXJlKCdtYXBib3gtaGVscGVyJyk7XG4gICBcdGNvbnN0IHRoZUNoYXJ0cyA9IFtdO1xuICAgXHR2YXIgdG90YWxJblZpZXdDaGFydDtcbiAgICB2YXIgZ2VvanNvbjtcbiAgICB2YXIgZ2F0ZUNoZWNrID0gMDtcbiAgICBcbiAgICB2YXIgdGhlTWFwID0gbmV3IG1hcGJveGdsLk1hcCh7XG5cdCAgICBjb250YWluZXI6ICdtYXAnLFxuXHQgICAgc3R5bGU6ICdtYXBib3g6Ly9zdHlsZXMvb3N0ZXJtYW5qL2NqZjAzbzM3YjN0dmUycnFwMmludzZhMWYnLFxuXHQgICAgY2VudGVyOiBbLTk2LjI5MTkyOTYxMTI5ODgzLCAzOC40NTMxNzUyODkwNTM3NDZdLFxuXHQgICAgem9vbTogMyxcblx0ICAgIG1heEJvdW5kczogW1stMTQyLjg4NzA1NzE0NzQ2MzYyLCAxNi4wNTgzNDQ5NDg0MzI0MDZdLFstNTEuOTAyMzAxNzg2OTczMSw1NS43NjY5MDA2NzQxNzEzOF1dLFxuXHQgICAgbWluWm9vbTogMS41LFxuXHQgICAgYXR0cmlidXRpb25Db250cm9sOiBmYWxzZSxcblx0fSk7XG5cblx0dmFyIG5hdiA9IG5ldyBtYXBib3hnbC5OYXZpZ2F0aW9uQ29udHJvbCh7c2hvd0NvbXBhc3M6ZmFsc2V9KTtcblx0dGhlTWFwLmFkZENvbnRyb2wobmF2LCAndG9wLWxlZnQnKTtcblxuXHR0b0dlb0pTT04oJ3BvbGljaWVzLmNzdicpO1xuXG5cdHRoZU1hcC5vbignbG9hZCcsIGZ1bmN0aW9uKCl7XG5cdFx0Z2F0ZUNoZWNrKys7XG5cdFx0Z2F0ZSgpO1xuXHR9KTtcblx0ZnVuY3Rpb24gZ2F0ZSgpe1xuXHRcdGlmICggZ2F0ZUNoZWNrIDwgMiApe1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR1cGRhdGVBbGwoKTtcblx0XHRhZGRVbmNsdXN0ZXJlZCgpO1xuXHRcdGFkZENsdXN0ZXJlZCgpO1xuXHR9IC8vIGVuZCBnYXRlXG5cblx0ZnVuY3Rpb24gYWRkVW5jbHVzdGVyZWQoKXtcblx0XHRyZXR1cm4gbWJIZWxwZXIuYWRkU291cmNlQW5kTGF5ZXJzLmNhbGwodGhlTWFwLFxuXHRcdFx0eyAvLyBzb3VyY2Vcblx0XHRcdFx0XCJuYW1lXCI6IFwicG9saWN5LXBvaW50c1wiLFxuXHRcdCAgICAgICAgXCJ0eXBlXCI6IFwiZ2VvanNvblwiLFxuXHRcdCAgICAgICAgXCJkYXRhXCI6IGdlb2pzb25cblx0XHRcdH0sIFsgLy8gbGF5ZXJzXG5cdFx0XHRcdHsgLy8gbGF5ZXIgb25lXG5cdCAgICAgICAgICAgIFwiaWRcIjogXCJwb2ludHNcIixcblx0ICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY2lyY2xlXCIsXG5cdCAgICAgICAgICAgIFwic291cmNlXCI6IFwicG9saWN5LXBvaW50c1wiLFxuXHQgICAgICAgICAgICBcIm1heHpvb21cIjogOSxcblx0ICAgICAgICAgICAgXCJwYWludFwiOiB7XG5cdCAgICAgICAgICAgICAgXHRcImNpcmNsZS1jb2xvclwiOiBbXG5cdFx0ICAgICAgICAgICAgICAgICdtYXRjaCcsXG5cdFx0ICAgICAgICAgICAgICAgIFsnZ2V0JywgJ3RfZGVkJ10sXG5cdFx0ICAgICAgICAgICAgICAgIDUsICcjMDUxODM5Jyxcblx0XHQgICAgICAgICAgICAgICAgLyogb3RoZXIgKi8gJyM5OTAwMDAnXG5cdFx0ICAgICAgICAgICAgXSxcblx0XHQgICAgICAgICAgICBcImNpcmNsZS1yYWRpdXNcIjoge1xuXHRcdCAgICAgICAgICAgICAgICAnc3RvcHMnOiBbWzUsIDNdLCBbOCwgMThdXVxuXHRcdCAgICAgICAgICAgIH0sXG5cdFx0ICAgICAgICAgICAgXCJjaXJjbGUtb3BhY2l0eVwiOiAwLjFcblx0XHQgICAgICAgICAgICB9XG5cdFx0ICAgICAgICB9LFxuXHRcdCAgICAgICAgeyAvLyBsYXllciB0d29cblx0ICAgICAgICAgICAgXCJpZFwiOiBcInBvaW50cy1kYXRhLWRyaXZlblwiLFxuXHQgICAgICAgICAgICBcInR5cGVcIjogXCJjaXJjbGVcIixcblx0ICAgICAgICAgICAgXCJzb3VyY2VcIjogXCJwb2xpY3ktcG9pbnRzXCIsXG5cdCAgICAgICAgICAgIFwibWluem9vbVwiOiA5LFxuXHQgICAgICAgICAgICBcInBhaW50XCI6IHtcblx0ICAgICAgICAgICAgICBcdFwiY2lyY2xlLWNvbG9yXCI6IFtcblx0XHQgICAgICAgICAgICAgICAgJ21hdGNoJyxcblx0XHQgICAgICAgICAgICAgICAgWydnZXQnLCAndF9kZWQnXSxcblx0XHQgICAgICAgICAgICAgICAgNSwgJyMwNTE4MzknLFxuXHRcdCAgICAgICAgICAgICAgICAvKiBvdGhlciAqLyAnIzk5MDAwMCdcblx0XHQgICAgICAgICAgICBdLFxuXHRcdCAgICAgICAgICAgIFwiY2lyY2xlLXJhZGl1c1wiOiB7XG5cdFx0ICAgICAgICAgICAgXHRwcm9wZXJ0eTogJ3ByZW0nLFxuXHRcdCAgICAgICAgICAgICAgICB0eXBlOiAnZXhwb25lbnRpYWwnLFxuXHRcdFx0XHQgICAgICAgIHN0b3BzOiBbXG5cdFx0XHRcdCAgICAgICAgICBbNjIsIDVdLFxuXHRcdFx0XHQgICAgICAgICAgWzI1MDAsIDYwXVxuXHRcdFx0XHQgICAgICAgIF1cblx0XHQgICAgICAgICAgICB9LFxuXHRcdCAgICAgICAgICAgIFwiY2lyY2xlLW9wYWNpdHlcIjogMC4xLFxuXHRcdCAgICAgICAgICAgIFwiY2lyY2xlLXN0cm9rZS1jb2xvclwiOiBcIiNmZmZmZmZcIixcblx0XHQgICAgICAgICAgICBcImNpcmNsZS1zdHJva2Utd2lkdGhcIjogMVxuXHRcdCAgICAgICAgfVxuXHRcdFx0fV1cblx0XHQpOyBcblx0fVxuXHQvKmZ1bmN0aW9uIGNoZWNrRmVhdHVyZXNMb2FkZWQoKXtcblx0XHRpZiAoIHRoZU1hcC5sb2FkZWQoKSl7XG5cdFx0XHRcblx0XHRcdHRoZU1hcC5vZmYoJ3JlbmRlcicsIGNoZWNrRmVhdHVyZXMpO1xuXHRcdH1cblx0fSovXG5cdGZ1bmN0aW9uIGFkZENsdXN0ZXJlZCgpe1xuXHRcdFxuXHRcdG1iSGVscGVyLmFkZFNvdXJjZUFuZExheWVycy5jYWxsKHRoZU1hcCxcblx0XHQgICAgeyAvLyBzb3VyY2Vcblx0XHQgICAgXHRcIm5hbWVcIjogXCJwb2xpY2llc1wiLFxuXHRcdCAgICAgICAgXCJ0eXBlXCI6IFwiZ2VvanNvblwiLFxuXHRcdCAgICAgICAgXCJkYXRhXCI6IGdlb2pzb24sXG5cdFx0ICAgICAgICBcImNsdXN0ZXJcIjogdHJ1ZSxcblx0XHQgICAgICAgIFwiY2x1c3RlclJhZGl1c1wiOiAwLjUgLy8gUmFkaXVzIG9mIGVhY2ggY2x1c3RlciB3aGVuIGNsdXN0ZXJpbmcgcG9pbnRzIChkZWZhdWx0cyB0byA1MClcblx0XHQgICAgfSwgWyAvLyBsYXllcnNcblx0XHQgICAgICAgeyAvLyBsYXllciBvbmVcblx0XHQgICAgICAgICAgICBpZDogXCJjbHVzdGVyLWNvdW50XCIsXG5cdFx0XHQgICAgICAgIHR5cGU6IFwic3ltYm9sXCIsXG5cdFx0XHQgICAgICAgIHNvdXJjZTogXCJwb2xpY2llc1wiLFxuXHRcdFx0ICAgICAgICBmaWx0ZXI6IFtcImhhc1wiLCBcInBvaW50X2NvdW50XCJdLFxuXHRcdFx0ICAgICAgICBcIm1pbnpvb21cIjogNixcblx0XHRcdCAgICAgICAgbGF5b3V0OiB7XG5cdFx0XHQgICAgICAgICAgICBcInRleHQtZmllbGRcIjogXCJ7cG9pbnRfY291bnRfYWJicmV2aWF0ZWR9XCIsXG5cdFx0XHQgICAgICAgICAgICBcInRleHQtc2l6ZVwiOiAxMixcblxuXHRcdFx0ICAgICAgICB9LFxuXHRcdFx0ICAgICAgICBcInBhaW50XCI6IHtcblx0XHRcdCAgICAgICAgXHRcInRleHQtY29sb3JcIjogXCIjZmZmZmZmXCJcblx0XHRcdCAgICAgICAgfVxuXHRcdCAgICAgICAgfVxuXHQgICAgICAgIF0gLy8gZW5kIGxheWVycyBhcnJheVxuXHQgICAgKTsgLy8gZW5kIGFkZGxheWVyc1xuXHR9IC8vIGVuZCBhZGRDbHVzdGVyZWRcblx0ZnVuY3Rpb24gdG9HZW9KU09OKHVybCl7XG5cdFx0XG5cdFx0ZDMuY3N2KHVybCwgZnVuY3Rpb24oZXJyLCBkYXRhKXtcblx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0dGhyb3cgZXJyO1xuXHRcdFx0fVxuXHRcdFx0Ly9jb25zb2xlLmxvZyhkYXRhKTtcblx0XHRcdHZhciBmZWF0dXJlcyA9IFtdOyBcblx0XHRcdGRhdGEuZm9yRWFjaChlYWNoID0+IHtcblx0XHRcdFx0dmFyIGNvZXJjZWQgPSB7fTtcblx0XHRcdFx0Zm9yICggdmFyIGtleSBpbiBlYWNoICkge1xuXHRcdFx0XHRcdGlmICggZWFjaC5oYXNPd25Qcm9wZXJ0eShrZXkpICl7XG5cdFx0XHRcdFx0XHRjb2VyY2VkW2tleV0gPSAhaXNOYU4oK2VhY2hba2V5XSkgPyArZWFjaFtrZXldIDogZWFjaFtrZXldO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSAgXG5cdFx0XHRcdGZlYXR1cmVzLnB1c2goe1xuXHRcdFx0XHRcdFwidHlwZVwiOiBcIkZlYXR1cmVcIixcblx0XHRcdFx0XHRcInByb3BlcnRpZXNcIjogY29lcmNlZCxcblx0XHRcdFx0XHRcImdlb21ldHJ5XCI6IHtcblx0XHRcdFx0XHRcdFwidHlwZVwiOiBcIlBvaW50XCIsXG5cdFx0XHRcdFx0XHRcImNvb3JkaW5hdGVzXCI6IFsrZWFjaC5sb25naXR1ZGUsICtlYWNoLmxhdGl0dWRlXVxuXHRcdFx0XHRcdH0gICBcblx0XHRcdFx0fSk7XG5cdFx0XHR9KTsgLy8gZW5kIGZvckVhY2hcblx0XHRcdGdlb2pzb24gPSAge1xuXHRcdFx0XHRcInR5cGVcIjogXCJGZWF0dXJlQ29sbGVjdGlvblwiLFxuXHRcdFx0XHRcImZlYXR1cmVzXCI6IGZlYXR1cmVzXG5cdFx0XHR9O1xuXHRcdFx0dGhlQ2hhcnRzLnB1c2goIC8vIHNob3VsZCBiZSBhYmxlIHRvIGNyZWF0ZSBjaGFydHMgbm93LCB3aGV0aGVyIG9yIG5vdCBtYXAgaGFzIGxvYWRlZC4gbWFwIG5lZWRzIHRvIGhhdmVcblx0XHRcdFx0XHRcdFx0Ly8gbG9hZGVkIGZvciB0aGVtIHRvIHVwZGF0ZSwgdGhvdWdoLlxuXHRcdFx0XHRuZXcgRG9udXRzLkRvbnV0KHtcblx0XHRcdFx0XHRtYXJnaW46IHsgLy8gcGVyY2VudGFnZXNcblx0XHQgICAgICAgICAgICAgICAgdG9wOiAxNSxcblx0XHQgICAgICAgICAgICAgICAgcmlnaHQ6IDEwLFxuXHRcdCAgICAgICAgICAgICAgICBib3R0b206IDUsXG5cdFx0ICAgICAgICAgICAgICAgIGxlZnQ6IDEwXG5cdFx0ICAgICAgICAgICAgfSxcblx0XHQgICAgICAgICAgICBoZWlnaHRUb1dpZHRoOiAxLFxuXHRcdCAgICAgICAgICAgIGNvbnRhaW5lcjogJyNjaGFydC0wJyxcblx0XHQgICAgICAgICAgICBkYXRhOiBnZW9qc29uLmZlYXR1cmVzLFxuXHRcdCAgICAgICAgICAgIGNvbXBhcmF0b3I6IGZ1bmN0aW9uKGVhY2gpe1xuXHRcdCAgICAgICAgICAgIFx0cmV0dXJuIGVhY2gucHJvcGVydGllcy50X2RlZCA8IDU7XG5cdFx0ICAgICAgICAgICAgfVxuXHRcdFx0XHR9KVxuXHRcdFx0KTtcblx0XHRcdHRvdGFsSW5WaWV3Q2hhcnQgPSBuZXcgQmFycy5CYXIoe1xuXHRcdFx0XHR0aXRsZTogJ1Byb3BlcnRpZXMgaW4gdmlldycsIFxuXHRcdFx0XHRtYXJnaW46IHtcblx0XHRcdFx0XHR0b3A6MCxcblx0XHRcdFx0XHRyaWdodDoxLFxuXHRcdFx0XHRcdGJvdHRvbTowLFxuXHRcdFx0XHRcdGxlZnQ6MVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRoZWlnaHRUb1dpZHRoOiAwLjAzLFxuXHRcdFx0XHRjb250YWluZXI6ICcjdG90YWwtdmlldycsXG5cdFx0XHRcdGRhdGE6IGdlb2pzb24uZmVhdHVyZXMsXG5cdFx0XHRcdG51bWVyYXRvcigpe1xuXHRcdFx0XHRcdHJldHVybiB0aGlzLnRvdGFsOyBcblx0XHRcdFx0fSxcblx0XHRcdFx0dGV4dEZ1bmN0aW9uKG4pe1xuXHRcdFx0XHRcdHJldHVybiBgJHtkMy5mb3JtYXQoXCIsXCIpKG4pfSBvZiAke2QzLmZvcm1hdChcIixcIikodGhpcy50b3RhbCl9YDtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0XHRnYXRlQ2hlY2srKzsgIFxuXHRcdFx0Z2F0ZSgpO1xuXHRcdFx0Ly9hZGRDbHVzdGVyTGF5ZXJzKHJ0bik7XG5cdFx0XHRcblx0XHR9KTsgLy8gZW5kIGQzIGNzdlxuXHR9IC8vIGVuZCB0b0dlb0pTT05cblx0Lyp2YXIgZmVhdHVyZXNJblZpZXcgPSB7XG5cdFx0cmVuZGVyKCl7XG5cdFx0XHR0aGlzLmNoYXJ0ID0gbmV3IEJhcnMuQmFyKHtcblx0XHRcdFx0bWFyZ2luOiB7XG5cdFx0XHRcdFx0dG9wOjAsXG5cdFx0XHRcdFx0cmlnaHQ6MCxcblx0XHRcdFx0XHRib3R0b206MCxcblx0XHRcdFx0XHRsZWZ0OjBcblx0XHRcdFx0fSxcblx0XHRcdFx0aGVpZ2h0VG9XaWR0aDogMC4wMyxcblx0XHRcdFx0Y29udGFpbmVyOiAnI3RvdGFsLXZpZXcnLFxuXHRcdFx0XHR0b3RhbDogZ2VvanNvbi5mZWF0dXJlcy5sZW5ndGhcblx0XHRcdH0pO1xuXG5cdFx0XHQvKnRoaXMudG90YWwgPSBnZW9qc29uLmZlYXR1cmVzLmxlbmd0aDtcblx0XHRcdHRoaXMuc3ZnID0gZDMuc2VsZWN0KCcjdG90YWwtdmlldycpXG5cdFx0XHRcdC5hcHBlbmQoJ3N2ZycpXG5cdFx0XHRcdC5hdHRyKCd3aWR0aCcsICcxMDAlJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3htbG5zJywnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnKVxuXHQgICAgICAgICAgICAuYXR0cigndmVyc2lvbicsJzEuMScpIFxuXHQgICAgICAgICAgICAuYXR0cigndmlld0JveCcsICcwIDAgMTAwIDMnKTtcblxuXHQgICAgICAgIHRoaXMuYmFja2dyb3VuZCA9IHRoaXMuc3ZnLmFwcGVuZCgnbGluZScpXG5cdCAgICAgICAgXHQuY2xhc3NlZCgnYmFja2dyb3VuZC1saW5lJywgdHJ1ZSlcblx0ICAgICAgICBcdC5hdHRyKCd4MCcsMClcblx0ICAgICAgICBcdC5hdHRyKCd5MCcsMClcblx0ICAgICAgICBcdC5hdHRyKCd4MScsMTAwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kxJywwKTtcblxuXHQgICAgICAgIHRoaXMubGluZSA9IHRoaXMuc3ZnLmFwcGVuZCgnbGluZScpXG5cdCAgICAgICAgXHQuY2xhc3NlZCgndG90YWwtbGluZScsIHRydWUpXG5cdCAgICAgICAgXHQuYXR0cigneDAnLDApXG5cdCAgICAgICAgXHQuYXR0cigneTAnLDApXG5cdCAgICAgICAgXHQuYXR0cigneDEnLDApXG5cdCAgICAgICAgXHQuYXR0cigneTEnLDApO1xuXG5cdCAgICAgICAgdGhpcy50ZXh0ID0gZDMuc2VsZWN0KCcjdG90YWwtdmlldycpXG5cdCAgICAgICAgXHQuYXBwZW5kKCdzcGFuJylcblx0ICAgICAgICBcdC50ZXh0KCgpID0+IGAke2QzLmZvcm1hdChcIixcIikodGhpcy50b3RhbCl9IG9mICR7ZDMuZm9ybWF0KFwiLFwiKSh0aGlzLnRvdGFsKX0gaW4gdmlld2AgKTtcblx0ICAgICAgICBcdFxuXG5cdFx0XHR0aGlzLnVwZGF0ZShjb3VudEZlYXR1cmVzKCkpO1xuXHRcdH0sXG5cdFx0dXBkYXRlKG4pe1xuXHRcdFx0LypkMy5zZWxlY3QoJyN0b3RhbC1pbi12aWV3Jylcblx0XHRcdFx0LnRleHQoKCkgPT4gZDMuZm9ybWF0KFwiLFwiKShuKSArICcgb2YgJyArIGQzLmZvcm1hdChcIixcIikodGhpcy50b3RhbCkgKyAnIHByb3BlcnRpZXMgaW4gdmlldycpOyovXG5cdFx0XHQvKnRoaXMubGluZVxuXHRcdFx0XHQudHJhbnNpdGlvbigpLmR1cmF0aW9uKDIwMClcblx0XHRcdFx0LmF0dHIoJ3gxJywgKCkgPT4gKCBuIC8gdGhpcy50b3RhbCkgKiAxMDAgKTtcblx0XHRcdHRoaXMudGV4dFxuXHRcdFx0XHQudGV4dCgoKSA9PiBgJHtkMy5mb3JtYXQoXCIsXCIpKG4pfSBvZiAke2QzLmZvcm1hdChcIixcIikodGhpcy50b3RhbCl9IGluIHZpZXdgICk7XG5cblx0XHR9Ki9cblxuXHRcblx0dmFyIG1hdGNoaW5nSURzID0gbmV3IFNldCgpO1xuXHRmdW5jdGlvbiBjb3VudEZlYXR1cmVzKCl7XG5cdFx0LyoganNoaW50IGxheGJyZWFrOnRydWUgKi9cblx0XHRtYXRjaGluZ0lEcy5jbGVhcigpO1xuXHRcdC8vdmFyIGNvdW50ID0gMDtcblx0XHR2YXIgYm91bmRzID0gdGhlTWFwLmdldEJvdW5kcygpO1xuXHRcdGdlb2pzb24uZmVhdHVyZXMuZm9yRWFjaChlYWNoID0+IHtcblx0XHRcdGlmICggICAgZWFjaC5wcm9wZXJ0aWVzLmxvbmdpdHVkZSA+PSBib3VuZHMuX3N3LmxuZyBcblx0XHRcdFx0ICYmIGVhY2gucHJvcGVydGllcy5sb25naXR1ZGUgPD0gYm91bmRzLl9uZS5sbmcgXG5cdFx0XHRcdCAmJiBlYWNoLnByb3BlcnRpZXMubGF0aXR1ZGUgID49IGJvdW5kcy5fc3cubGF0IFxuXHRcdFx0XHQgJiYgZWFjaC5wcm9wZXJ0aWVzLmxhdGl0dWRlICA8PSBib3VuZHMuX25lLmxhdCApe1xuXHRcdFx0XHRtYXRjaGluZ0lEcy5hZGQoZWFjaC5wcm9wZXJ0aWVzLmlkKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRjb25zb2xlLmxvZyhtYXRjaGluZ0lEcyk7XG5cdFx0cmV0dXJuIG1hdGNoaW5nSURzLnNpemU7XG5cdH1cblx0dGhlTWFwLm9uKCdtb3ZlZW5kJywgZnVuY3Rpb24oKXtcblx0XHR1cGRhdGVBbGwoKTtcblx0fSk7XG5cdHRoZU1hcC5vbignem9vbWVuZCcsIGZ1bmN0aW9uKCl7XG5cdFx0dXBkYXRlQWxsKCk7XG5cdH0pO1xuXHRmdW5jdGlvbiB1cGRhdGVBbGwoKXtcblx0XHR0b3RhbEluVmlld0NoYXJ0LnVwZGF0ZShjb3VudEZlYXR1cmVzKCkpO1xuXHRcdHRoZUNoYXJ0cy5mb3JFYWNoKGVhY2ggPT4gZWFjaC51cGRhdGUobWF0Y2hpbmdJRHMpKTtcblx0fVxuXHQvKnRoZU1hcC5vbihcIm1vdXNlbW92ZVwiLCBcInBvaW50cy1kYXRhLWRyaXZlblwiLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGUpO1xuICAgIH0pOyovXG5cblx0cmV0dXJuIHRoZU1hcDtcbiAgIFxufSgpKTsgLy8gZW5kIElJRkUgIiwiZXhwb3J0IGNvbnN0IEJhcnMgPSAoZnVuY3Rpb24oKXtcblxuXHR2YXIgQmFyID0gZnVuY3Rpb24oY29uZmlnT2JqZWN0KXsgLy8gbWFyZ2lucyB7fSwgaGVpZ2h0ICMsIHdpZHRoICMsIGNvbnRhaW5lcklELCBkYXRhUGF0aFxuXHQgICAgdGhpcy5zZXR1cChjb25maWdPYmplY3QpO1xuXHR9O1xuXG5cdEJhci5wcm90b3R5cGUgPSB7XG5cdFx0c2V0dXAoY29uZmlnT2JqZWN0KXsgLy8gc29tZSBvZiBzZXR1cCBpcyBjb21tb24gdG8gYWxsIGNoYXJ0cyBhbmQgY291bGQgYmUgaGFuZGxlZCBieSBwcm90b3R5cGljYWwgaW5oZXJpdGFuY2Vcblx0ICAgIFx0XG5cdCAgICAgICAgdmFyIHZpZXdCb3ggPSAnMCAwIDEwMCAnICsgTWF0aC5yb3VuZChjb25maWdPYmplY3QuaGVpZ2h0VG9XaWR0aCAqIDEwMCk7XG5cdCAgICAgICAgdGhpcy5tYXJnaW4gPSBjb25maWdPYmplY3QubWFyZ2luO1xuXHQgICAgICAgIHRoaXMud2lkdGggPSAxMDAgLSB0aGlzLm1hcmdpbi5sZWZ0IC0gdGhpcy5tYXJnaW4ucmlnaHQ7XG5cdCAgICAgICAgdGhpcy5oZWlnaHQgPSBjb25maWdPYmplY3QuaGVpZ2h0VG9XaWR0aCAqIDEwMCAtIHRoaXMubWFyZ2luLnRvcCAtIHRoaXMubWFyZ2luLmJvdHRvbTtcblx0ICAgICAgICB0aGlzLnRpdGxlID0gY29uZmlnT2JqZWN0LnRpdGxlO1xuXHQgICAgICAgIHRoaXMuY29tcGFyYXRvciA9IGNvbmZpZ09iamVjdC5jb21wYXJhdG9yO1xuXHQgICAgICAgIHRoaXMuYmFja2dyb3VuZENvbG9yID0gY29uZmlnT2JqZWN0LmJhY2tncm91bmRDb2xvciB8fCAnZ3JheSc7XG5cdCAgICAgICAgdGhpcy5kYXRhID0gY29uZmlnT2JqZWN0LmRhdGE7XG5cdCAgICAgICAgdGhpcy50b3RhbCA9IHRoaXMuZGF0YS5sZW5ndGg7XG5cdCAgICAgICAgdGhpcy50ZXh0RnVuY3Rpb24gPSBjb25maWdPYmplY3QudGV4dEZ1bmN0aW9uO1xuXHQgICAgICAgIHRoaXMubnVtZXJhdG9yID0gY29uZmlnT2JqZWN0Lm51bWVyYXRvcjtcblxuXHQgICAgICAgIGQzLnNlbGVjdChjb25maWdPYmplY3QuY29udGFpbmVyKVxuXHQgICAgICAgIFx0LmFwcGVuZCgnc3BhbicpXG5cdCAgICAgICAgXHQuY2xhc3NlZCgnZmlndXJlLXRpdGxlJywgdHJ1ZSlcblx0ICAgICAgICBcdC50ZXh0KHRoaXMudGl0bGUpO1xuXG5cdCAgICAgICAgdGhpcy5zdmcgPSBkMy5zZWxlY3QoY29uZmlnT2JqZWN0LmNvbnRhaW5lcilcblx0ICAgICAgICAgICAgLmFwcGVuZCgnc3ZnJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3dpZHRoJywgJzEwMCUnKVxuXHQgICAgICAgICAgICAuYXR0cigneG1sbnMnLCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycpXG5cdCAgICAgICAgICAgIC5hdHRyKCd2ZXJzaW9uJywnMS4xJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3ZpZXdCb3gnLCB2aWV3Qm94KVxuXHQgICAgICAgICAgICAuYXBwZW5kKCdnJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIHRoaXMubWFyZ2luLmxlZnQgKyAnLCcgKyB0aGlzLm1hcmdpbi50b3AgKyAnKScpO1xuXG5cdCAgICAgICAgdGhpcy5iYWNrZ3JvdW5kID0gdGhpcy5zdmcuYXBwZW5kKCdsaW5lJylcblx0ICAgICAgICBcdC5jbGFzc2VkKCdiYWNrZ3JvdW5kLWxpbmUtJyArIHRoaXMuYmFja2dyb3VuZENvbG9yLCB0cnVlKVxuXHQgICAgICAgIFx0LmF0dHIoJ3gwJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kwJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3gxJywxMDAgLSB0aGlzLm1hcmdpbi5sZWZ0IC0gdGhpcy5tYXJnaW4ucmlnaHQpXG5cdCAgICAgICAgXHQuYXR0cigneTEnLDApO1xuXG5cdCAgICAgICAgdGhpcy5saW5lID0gdGhpcy5zdmcuYXBwZW5kKCdsaW5lJylcblx0ICAgICAgICBcdC5jbGFzc2VkKCdmb3JlZ3JvdW5kLWxpbmUnLCB0cnVlKVxuXHQgICAgICAgIFx0LmF0dHIoJ3gwJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kwJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3gxJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kxJywwKTtcblxuXHQgICAgICAgIHRoaXMudGV4dCA9IGQzLnNlbGVjdCgnI3RvdGFsLXZpZXcnKVxuXHQgICAgICAgIFx0LmFwcGVuZCgnc3BhbicpO1xuXHQgICAgICAgIFx0XG5cblx0ICAgICAgICAvL3RoaXMudXBkYXRlKHRoaXMubnVtZXJhdG9yKCkpOyAgXG4gICAgICAgIH0sXG4gICAgICAgIHVwZGF0ZShuKXtcblx0XHRcdFxuXHRcdFx0dGhpcy5saW5lXG5cdFx0XHRcdC50cmFuc2l0aW9uKCkuZHVyYXRpb24oMjAwKVxuXHRcdFx0XHQuYXR0cigneDEnLCAoKSA9PiAoKCBuIC8gdGhpcy50b3RhbCkgKiAxMDAgKSAtIHRoaXMubWFyZ2luLmxlZnQgLSB0aGlzLm1hcmdpbi5yaWdodCApO1xuXHRcdFx0dGhpcy50ZXh0XG5cdFx0XHRcdC50ZXh0KCgpID0+IHRoaXMudGV4dEZ1bmN0aW9uKG4pKTtcblx0XHR9XG5cdH07XG5cblx0cmV0dXJuIHtcblx0XHRCYXJcblx0fTtcbiAgICAgICAgXG59KSgpOyIsImV4cG9ydCBjb25zdCBEb251dHMgPSAoZnVuY3Rpb24oKXtcbiAgICAvKiBnbG9iYWxzIGQzICovXG4gICAvKiBjb25zdCBtZWRpYW5JbmNvbWVzID0gbmV3IE1hcCgpO1xuICAgIGZ1bmN0aW9uIGNyZWF0ZU1lZGlhbkluY29tZU1hcChnZW9qc29uKXtcblx0XHRnZW9qc29uLmZlYXR1cmVzLmZvckVhY2goZWFjaCA9PiB7XG5cdFx0XHRpZiAoICFtZWRpYW5JbmNvbWVzLmhhcyhlYWNoLnByb3BlcnRpZXMuY2VuX3RyYWN0KSApe1xuXHRcdFx0XHRsZXQgaW5jb21lID0gZWFjaC5wcm9wZXJ0aWVzLm1lZF9pbmNvbWUgPiAwID8gZWFjaC5wcm9wZXJ0aWVzLm1lZF9pbmNvbWUgOiBudWxsO1xuXHRcdFx0XHRtZWRpYW5JbmNvbWVzLnNldChlYWNoLnByb3BlcnRpZXMuY2VuX3RyYWN0LCBpbmNvbWUpOyBcdFxuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdGNvbnNvbGUubG9nKG1lZGlhbkluY29tZXMpO1xuXHRcdHdpbmRvdy5tZWRpYW5JbmNvbWVzID0gbWVkaWFuSW5jb21lcztcblx0XHQvL2NyZWF0ZUNoYXJ0cyhnZW9qc29uKTtcblx0fSAqL1xuXHRcbiAgICB2YXIgdGF1ID0gMiAqIE1hdGguUEk7XG5cdHZhciBEb251dCA9IGZ1bmN0aW9uKGNvbmZpZ09iamVjdCl7IC8vIG1hcmdpbnMge30sIGhlaWdodCAjLCB3aWR0aCAjLCBjb250YWluZXJJRCwgZGF0YVBhdGhcblx0ICAgIGNvbnNvbGUubG9nKHRoaXMsIGNvbmZpZ09iamVjdCk7XG5cdCAgICB0aGlzLnNldHVwKGNvbmZpZ09iamVjdCk7XG5cdH07XG5cblx0RG9udXQucHJvdG90eXBlID0ge1xuXG5cdCAgICBzZXR1cChjb25maWdPYmplY3Qpe1xuXHQgICAgXHRjb25zb2xlLmxvZygnaW4gc2V0IHVwJyk7XG5cdCAgICAgICAgdmFyIHZpZXdCb3ggPSAnMCAwIDEwMCAnICsgTWF0aC5yb3VuZChjb25maWdPYmplY3QuaGVpZ2h0VG9XaWR0aCAqIDEwMCk7XG5cdCAgICAgICAgdGhpcy5tYXJnaW4gPSBjb25maWdPYmplY3QubWFyZ2luO1xuXHQgICAgICAgIHRoaXMud2lkdGggPSAxMDAgLSB0aGlzLm1hcmdpbi5sZWZ0IC0gdGhpcy5tYXJnaW4ucmlnaHQ7XG5cdCAgICAgICAgdGhpcy5oZWlnaHQgPSBjb25maWdPYmplY3QuaGVpZ2h0VG9XaWR0aCAqIDEwMCAtIHRoaXMubWFyZ2luLnRvcCAtIHRoaXMubWFyZ2luLmJvdHRvbTtcblx0ICAgICAgICB0aGlzLnJhZGl1cyA9IE1hdGgubWluKHRoaXMud2lkdGgsdGhpcy5oZWlnaHQpIC8gMztcblx0ICAgICAgICB0aGlzLmRhdGEgPSBjb25maWdPYmplY3QuZGF0YTtcblx0ICAgICAgICB0aGlzLmNvbXBhcmF0b3IgPSBjb25maWdPYmplY3QuY29tcGFyYXRvcjtcblx0ICAgICAgXG5cdCAgICAgICAgdGhpcy5hcmMgPSBkMy5hcmMoKVxuXHQgICAgICAgICAgLm91dGVyUmFkaXVzKHRoaXMucmFkaXVzKSBcblx0ICAgICAgICAgIC5pbm5lclJhZGl1cyh0aGlzLnJhZGl1cyAvIDEuNSlcblx0ICAgICAgICAgIC5zdGFydEFuZ2xlKDApOyBcblxuXHQgICAgICAgIHRoaXMuc3ZnID0gZDMuc2VsZWN0KGNvbmZpZ09iamVjdC5jb250YWluZXIpXG5cdCAgICAgICAgICAgIC5hcHBlbmQoJ3N2ZycpXG5cdCAgICAgICAgICAgIC5hdHRyKCd3aWR0aCcsICcxMDAlJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3htbG5zJywnaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnKVxuXHQgICAgICAgICAgICAuYXR0cigndmVyc2lvbicsJzEuMScpXG5cdCAgICAgICAgICAgIC5hdHRyKCd2aWV3Qm94Jywgdmlld0JveClcblx0ICAgICAgICAgICAgLmFwcGVuZCgnZycpXG5cdCAgICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyB0aGlzLm1hcmdpbi5sZWZ0ICsgJywnICsgdGhpcy5tYXJnaW4udG9wICsgJyknKTtcblxuXHQgICAgXHR0aGlzLnN2Zy5hcHBlbmQoJ3BhdGgnKVxuXHQgICAgICAgICAgICAuY2xhc3NlZCgnYmFja2dyb3VuZCcsdHJ1ZSlcblx0ICAgICAgICAgICAgLmRhdHVtKHtlbmRBbmdsZTogdGF1fSlcblx0ICAgICAgICAgICAgLmF0dHIoJ2QnLCB0aGlzLmFyYylcblx0ICAgICAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIHRoaXMud2lkdGggLyAyICsgJywnICsgdGhpcy5oZWlnaHQgLyAyICsgJyknKTtcblxuXHQgICAgICAgIHRoaXMuZm9yZWdyb3VuZCA9IHRoaXMuc3ZnLmFwcGVuZCgncGF0aCcpXG5cdCAgICAgICAgICAgIC5kYXR1bSh7ZW5kQW5nbGU6IDB9KVxuXHQgICAgICAgICAgICAuY2xhc3NlZCgnZm9yZWdyb3VuZCcsdHJ1ZSlcblx0ICAgICAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIHRoaXMud2lkdGggLyAyICsgJywnICsgdGhpcy5oZWlnaHQgLyAyICsgJyknKVxuXHQgICAgICAgICAgICAuYXR0cignZCcsIHRoaXMuYXJjKTtcblxuXHQgICAgIC8vICAgdGhpcy51cGRhdGUodHJ1ZSk7XG5cblx0ICAgICAgICAvKiB0aGlzLnN2Zy5hcHBlbmQoXCJ0ZXh0XCIpXG5cdCAgICAgICAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIilcblx0ICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywncGllX251bWJlcicpXG5cdCAgICAgICAgICAgIC5hdHRyKCd5Jyw1KVxuXHQgICAgICAgICAgICAudGV4dChkMy5mb3JtYXQoXCIuMnNcIikodGhpcy52YWx1ZSkpXG5cdCAgICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyB0aGlzLndpZHRoIC8gMiArICcsJyArIHRoaXMuaGVpZ2h0IC8gMiArICcpJyk7Ki9cblxuXHQgICAgfSxcblx0ICAgIHVwZGF0ZShtYXRjaGluZ0lEcyl7XG5cdCAgICBcdHZhclx0bnVtYmVyTWF0Y2hpbmcgPSAwLFxuXHQgICAgXHRcdGZpbHRlcmVkRGF0YSA9IHRoaXMuZGF0YS5maWx0ZXIoZWFjaCA9PiBtYXRjaGluZ0lEcy5oYXMoZWFjaC5wcm9wZXJ0aWVzLmlkKSksXG5cdCAgICBcdFx0dG90YWwgPSBmaWx0ZXJlZERhdGEubGVuZ3RoO1xuXG4gICAgXHRcdGZpbHRlcmVkRGF0YS5mb3JFYWNoKGVhY2ggPT4ge1xuICAgIFx0XHRcdGlmICggdGhpcy5jb21wYXJhdG9yKGVhY2gpICl7XG4gICAgXHRcdFx0XHRudW1iZXJNYXRjaGluZysrO1xuICAgIFx0XHRcdH1cbiAgICBcdFx0fSk7XG5cdCAgICBcdFxuXHQgICAgXHR2YXIgZW5kQW5nbGUgPSAobnVtYmVyTWF0Y2hpbmcgLyB0b3RhbCkgKiB0YXU7XG5cblx0ICAgIFx0dGhpcy5mb3JlZ3JvdW5kIFxuXHQgICAgXHRcdC50cmFuc2l0aW9uKCkuZHVyYXRpb24oNTAwKVxuXHQgICAgXHRcdC5hdHRyVHdlZW4oJ2QnLCB0aGlzLmFyY1R3ZWVuKGVuZEFuZ2xlKSk7XG5cblx0ICAgIH0sXG5cdCAgICBhcmNUd2VlbihuZXdBbmdsZSkgeyAvLyBIVCBodHRwOi8vYmwub2Nrcy5vcmcvbWJvc3RvY2svNTEwMDYzNlxuXHRcdFx0cmV0dXJuIGQgPT4ge1xuXHRcdFx0ICAgIHZhciBpbnRlcnBvbGF0ZSA9IGQzLmludGVycG9sYXRlKGQuZW5kQW5nbGUsIG5ld0FuZ2xlKTtcblx0XHRcdCAgICByZXR1cm4gdCA9PiB7XG5cdFx0XHQgICAgICBkLmVuZEFuZ2xlID0gaW50ZXJwb2xhdGUodCk7XG5cdFx0XHRcdCAgICAgIHJldHVybiB0aGlzLmFyYyhkKTtcblx0XHRcdCAgICB9O1xuXHRcdFx0fTtcblx0XHR9XG5cdH07XG5cdFxuXHRyZXR1cm4ge1xuXHRcdERvbnV0XG5cdH07XG59KCkpOyIsImNvbnN0IG1iSGVscGVyID0ge1xuICAgIHByb21pc2VzOiB7fSxcbiAgICBhZGRTb3VyY2VBbmRMYXllcnMoc291cmNlT3B0aW9ucyxsYXllck9wdGlvbnNBcnJheSl7IC8vIHRoaXMgPSBtYXBcbiAgICAgICAgdmFyIHNvdXJjZU5hbWUgPSBzb3VyY2VPcHRpb25zLm5hbWU7XG4gICAgICAgIG1iSGVscGVyLnByb21pc2VzW3NvdXJjZU9wdGlvbnMubmFtZV0gPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4geyAvLyBUTyBETzogZmlndXJlIG91dCByZWplY3Q/XG4gICAgICAgICAgICBkZWxldGUgc291cmNlT3B0aW9ucy5uYW1lO1xuICAgICAgICAgICAgZnVuY3Rpb24gY2hlY2tEYXRhTG9hZGVkKCl7XG4gICAgICAgICAgICAgICAgaWYgKCB0aGlzLmdldFNvdXJjZShzb3VyY2VOYW1lKSApeyAvLyBpZiBhZGRTb3VyY2UgaGFzIHRha2VuIGVmZmVjdFxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9mZigncmVuZGVyJywgY2hlY2tEYXRhTG9hZGVkKTsgLy8gdHVybiBvZmYgdGhlIGxpc3RlbmVyIGZvciByZW5kZXJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLm9uKCdyZW5kZXInLCBjaGVja0RhdGFMb2FkZWQpO1xuICAgICAgICAgICAgdGhpcy5hZGRTb3VyY2Uoc291cmNlTmFtZSwgc291cmNlT3B0aW9ucyk7XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgbGF5ZXJQcm9taXNlcyA9IFtdO1xuICAgICAgICByZXR1cm4gbWJIZWxwZXIucHJvbWlzZXNbc291cmNlTmFtZV0udGhlbigoKSA9PiB7IFxuICAgICAgICAgICAgbGF5ZXJPcHRpb25zQXJyYXkuZm9yRWFjaCgoZWFjaCkgPT4ge1xuICAgICAgICAgICAgICAgIGxheWVyUHJvbWlzZXMucHVzaChcbiAgICAgICAgICAgICAgICAgICAgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHsgLy8gVE8gRE86IGZpZ3VyZSBvdXQgcmVqZWN0P1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGJlZm9yZUxheWVyID0gZWFjaC5iZWZvcmVMYXllciA/IGVhY2guYmVmb3JlTGF5ZXIgOiAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBlYWNoLmJlZm9yZUxheWVyO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWFjaC5zb3VyY2UgPSBzb3VyY2VOYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gY2hlY2tMYXllckxvYWRlZCgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICggdGhpcy5nZXRMYXllcihlYWNoLmlkKSApeyAvLyBpZiBhZGRMYXllciAgaGFzIHRha2VuIGVmZmVjdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9mZigncmVuZGVyJywgY2hlY2tMYXllckxvYWRlZCk7IC8vIHR1cm4gb2ZmIHRoZSBsaXN0ZW5lciBmb3IgcmVuZGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vbigncmVuZGVyJywgY2hlY2tMYXllckxvYWRlZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZExheWVyKGVhY2gsIGJlZm9yZUxheWVyKTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwobGF5ZXJQcm9taXNlcyk7XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbmV4cG9ydHMuYWRkU291cmNlQW5kTGF5ZXJzID0gbWJIZWxwZXIuYWRkU291cmNlQW5kTGF5ZXJzOyJdfQ==
