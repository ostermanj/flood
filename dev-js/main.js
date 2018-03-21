(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
'use strict';

var _Charts = require('../js-exports/Charts');

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

	console.log(_Charts.Charts);
	mapboxgl.accessToken = 'pk.eyJ1Ijoib3N0ZXJtYW5qIiwiYSI6ImNpdnU5dHVndjA2eDYyb3A3Nng1cGJ3ZXoifQ.Xo_k-kzGfYX_Yo_RDcHDBg';

	var mbHelper = require('mapbox-helper');

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
		var unclustered = addUnclustered();
		addClustered();
		unclustered.then(function () {
			console.log(geojson.features.length);
			featuresInView.render();
			//showTotal(geojson.feature.length);
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

			_Charts.Charts.createCharts(geojson);
		}); // end d3 csv
	} // end toGeoJSON
	var featuresInView = {
		render: function render() {
			this.total = geojson.features.length;
			theMap.on('render', firstUpdate);
			function firstUpdate() {
				//console.log(theMap.loaded());
				if (theMap.loaded()) {
					theMap.off('render', firstUpdate);
					featuresInView.update(countUniqueFeatures());
				}
			}
		},
		update: function update(n) {
			var _this = this;

			d3.select('#total-in-view').text(function () {
				return d3.format(",")(n) + ' of ' + d3.format(",")(_this.total) + ' properties in view';
			});
		}
	};

	var uniqueFeatures = new Set();
	function countUniqueFeatures() {
		uniqueFeatures.clear();
		theMap.queryRenderedFeatures({ layers: ['points', 'points-data-driven'] }).forEach(function (each) {
			if (!uniqueFeatures.has(each.properties.id)) {
				uniqueFeatures.add(each.properties.id);
			}
		});
		return uniqueFeatures.size;
	}
	theMap.on('moveend', function () {
		featuresInView.update(countUniqueFeatures());
	});
	theMap.on('zoomend', function () {
		featuresInView.update(countUniqueFeatures());
		//checkFeatures();
	});
	/*theMap.on("mousemove", "points-data-driven", function(e) {
        console.log(e);
    });*/

	return theMap;
}(); // end IIFE 
/* exported Charts */

},{"../js-exports/Charts":2,"mapbox-helper":3}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
var Charts = exports.Charts = function () {
	/* globals d3 */
	var medianIncomes = new Map();
	function createMedianIncomeMap(geojson) {
		geojson.features.forEach(function (each) {
			if (!medianIncomes.has(each.properties.cen_tract)) {
				var income = each.properties.med_income > 0 ? each.properties.med_income : null;
				medianIncomes.set(each.properties.cen_tract, income);
			}
		});
		console.log(medianIncomes);
		window.medianIncomes = medianIncomes;
		//createCharts(geojson);
	}
	var createCharts = function createCharts(geojson) {
		console.log(geojson);
		createMedianIncomeMap(geojson);

		new Donut({
			margin: { // percentages
				top: 15,
				right: 10,
				bottom: 5,
				left: 10
			},
			heightToWidth: 1,
			container: '#chart-0',
			data: geojson.features
		});

		/*	new Donut({
  		margin: { // percentages
                 top: 15,
                 right: 10,
                 bottom: 5,
                 left: 10
             },
             heightToWidth: 1,
             container: '#chart-1',
             data: [...medianIncomes.values()]
  	});
  		new Donut({
  		margin: { // percentages
                 top: 15,
                 right: 10,
                 bottom: 5,
                 left: 10
             },
             heightToWidth: 1,
             container: '#chart-2',
             data: [...medianIncomes.values()]
  	}); //*/
	};

	var Donut = function Donut(configObject) {
		// margins {}, height #, width #, containerID, dataPath
		console.log(this, configObject);
		this.setup(configObject);
	};

	Donut.prototype = {
		setup: function setup(configObject) {
			console.log('in set up');
			var viewBox = '0 0 100 ' + Math.round(configObject.heightToWidth * 100);
			var tau = 2 * Math.PI;
			this.margin = configObject.margin;
			this.width = 100 - this.margin.left - this.margin.right;
			this.height = configObject.heightToWidth * 100 - this.margin.top - this.margin.bottom;
			this.radius = Math.min(this.width, this.height) / 2;
			this.data = configObject.data;
			console.log(this.radius);
			this.arc = d3.arc().outerRadius(this.radius).innerRadius(this.radius / 2).startAngle(0);
			window.arc = this.arc;
			console.log(this.data);
			this.scale = d3.scaleLinear().domain([0, this.data.length]).range([0, 1]);
			this.value = this.data.length;
			//this.y = d3.scaleLinear().domain(d3.range(this.data)).range([this.height, 0]);


			// this.labelOffset = configObject.trendLabelPosition === 'below' ? 4 : -3;
			// this.yAxisCount = configObject.yAxisCount;
			// this.hasBeenUpdated = false;


			this.svg = d3.select(configObject.container).append('svg').attr('width', '100%').attr('xmlns', 'http://www.w3.org/2000/svg').attr('version', '1.1').attr('viewBox', viewBox).append('g').attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

			this.svg.append('path').classed('background', true).datum({ endAngle: tau })
			//.style("fill", "#ddd")
			.attr('d', this.arc).attr('transform', 'translate(' + this.width / 2 + ',' + this.height / 2 + ')');

			this.svg.append('path').classed('foreground', true).datum({ endAngle: this.value * tau })
			//.style("fill", "#ddd")
			.attr('d', this.arc).attr('transform', 'translate(' + this.width / 2 + ',' + this.height / 2 + ')');

			this.svg.append("text").attr("text-anchor", "middle").attr('class', 'pie_number').attr('y', 5).text(d3.format(".2s")(this.value)).attr('transform', 'translate(' + this.width / 2 + ',' + this.height / 2 + ')');
		}
	};

	return {
		createCharts: createCharts
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkZXYtanMvbWFpbi5lczYiLCJqcy1leHBvcnRzL0NoYXJ0cy5qcyIsIm5vZGVfbW9kdWxlcy9tYXBib3gtaGVscGVyL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNDQzs7QUFDQTs7QUFFRDs7Ozs7Ozs7QUFRQTs7Ozs7QUFLQSxPQUFPLE1BQVAsR0FBa0IsWUFBVTtBQUM1Qjs7QUFDQyxTQUFRLEdBQVI7QUFDRyxVQUFTLFdBQVQsR0FBdUIsOEZBQXZCOztBQUVBLEtBQU0sV0FBVyxRQUFRLGVBQVIsQ0FBakI7O0FBRUEsS0FBSSxPQUFKO0FBQ0EsS0FBSSxZQUFZLENBQWhCOztBQUVBLEtBQUksU0FBUyxJQUFJLFNBQVMsR0FBYixDQUFpQjtBQUM3QixhQUFXLEtBRGtCO0FBRTdCLFNBQU8scURBRnNCO0FBRzdCLFVBQVEsQ0FBQyxDQUFDLGlCQUFGLEVBQXFCLGtCQUFyQixDQUhxQjtBQUk3QixRQUFNLENBSnVCO0FBSzdCLGFBQVcsQ0FBQyxDQUFDLENBQUMsa0JBQUYsRUFBc0Isa0JBQXRCLENBQUQsRUFBMkMsQ0FBQyxDQUFDLGdCQUFGLEVBQW1CLGlCQUFuQixDQUEzQyxDQUxrQjtBQU03QixXQUFTLENBTm9CO0FBTzdCLHNCQUFvQjtBQVBTLEVBQWpCLENBQWI7O0FBVUgsS0FBSSxNQUFNLElBQUksU0FBUyxpQkFBYixDQUErQixFQUFDLGFBQVksS0FBYixFQUEvQixDQUFWO0FBQ0EsUUFBTyxVQUFQLENBQWtCLEdBQWxCLEVBQXVCLFVBQXZCOztBQUVBLFdBQVUsY0FBVjs7QUFFQSxRQUFPLEVBQVAsQ0FBVSxNQUFWLEVBQWtCLFlBQVU7QUFDM0I7QUFDQTtBQUNBLEVBSEQ7QUFJQSxVQUFTLElBQVQsR0FBZTtBQUNkLE1BQUssWUFBWSxDQUFq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RTtBQUMvQiw0QkFBUSxJQUFSO0FBQ0EseUJBQUssR0FBTCxDQUFTLFFBQVQsRUFBbUIsZUFBbkIsRUFGNkIsQ0FFUTtBQUN4QztBQUNKO0FBQ0Qsa0JBQUssRUFBTCxDQUFRLFFBQVIsRUFBa0IsZUFBbEI7QUFDQSxrQkFBSyxTQUFMLENBQWUsVUFBZixFQUEyQixhQUEzQjtBQUNILFNBVnVDLENBQXhDO0FBV0EsWUFBSSxnQkFBZ0IsRUFBcEI7QUFDQSxlQUFPLFNBQVMsUUFBVCxDQUFrQixVQUFsQixFQUE4QixJQUE5QixDQUFtQyxZQUFNO0FBQzVDLDhCQUFrQixPQUFsQixDQUEwQixVQUFDLElBQUQsRUFBVTtBQUNoQyw4QkFBYyxJQUFkLENBQ0ksSUFBSSxPQUFKLENBQVksVUFBQyxPQUFELEVBQWE7QUFBRTtBQUN2Qix3QkFBSSxjQUFjLEtBQUssV0FBTCxHQUFtQixLQUFLLFdBQXhCLEdBQXNDLEVBQXhEO0FBQ0EsMkJBQU8sS0FBSyxXQUFaO0FBQ0EseUJBQUssTUFBTCxHQUFjLFVBQWQ7QUFDQSw2QkFBUyxnQkFBVCxHQUEyQjtBQUN2Qiw0QkFBSyxLQUFLLFFBQUwsQ0FBYyxLQUFLLEVBQW5CLENBQUwsRUFBNkI7QUFBRTtBQUMzQixvQ0FBUSxJQUFSO0FBQ0EsaUNBQUssR0FBTCxDQUFTLFFBQVQsRUFBbUIsZ0JBQW5CLEVBRnlCLENBRWE7QUFDekM7QUFDSjtBQUNELDBCQUFLLEVBQUwsQ0FBUSxRQUFSLEVBQWtCLGdCQUFsQjtBQUNBLDBCQUFLLFFBQUwsQ0FBYyxJQUFkLEVBQW9CLFdBQXBCO0FBQ0gsaUJBWkQsQ0FESjtBQWVILGFBaEJEO0FBaUJBLG1CQUFPLFFBQVEsR0FBUixDQUFZLGFBQVosQ0FBUDtBQUNILFNBbkJNLENBQVA7QUFvQkg7QUFwQ1ksQ0FBakI7O0FBdUNBLFFBQVEsa0JBQVIsR0FBNkIsU0FBUyxrQkFBdEMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfXJldHVybiBlfSkoKSIsIiAvKiBleHBvcnRlZCBDaGFydHMgKi9cbiBpbXBvcnQgeyBDaGFydHMgfSBmcm9tICcuLi9qcy1leHBvcnRzL0NoYXJ0cyc7XG4gLyogcG9seWZpbGxzIG5lZWRlZDogUHJvbWlzZSBUTyBETzogT1RIRVJTP1xuICovXG4vKlxuaW1wb3J0IHsgcmVmbGVjdCwgYXJyYXlGaW5kLCBTVkdJbm5lckhUTUwsIFNWR0ZvY3VzIH0gZnJvbSAnLi4vanMtdmVuZG9yL3BvbHlmaWxscyc7XG5pbXBvcnQgeyBIZWxwZXJzIH0gZnJvbSAnLi4vanMtZXhwb3J0cy9IZWxwZXJzJztcbmltcG9ydCB7IGQzVGlwIH0gZnJvbSAnLi4vanMtdmVuZG9yL2QzLXRpcCc7XG5pbXBvcnQgeyBjcmVhdGVCcm93c2VCdXR0b24gfSBmcm9tICcuLi9qcy1leHBvcnRzL0Jyb3dzZUJ1dHRvbnMnO1xuaW1wb3J0IHsgY3JlYXRlUmVzdWx0SXRlbSB9IGZyb20gJy4uL2pzLWV4cG9ydHMvUmVzdWx0SXRlbXMnOyBcbiovXG4gIFxuLypcbnRvIGRvIDogc2VlIGFsc28gaHR0cHM6Ly93d3cubWFwYm94LmNvbS9tYXBib3gtZ2wtanMvZXhhbXBsZS9oZWF0bWFwLWxheWVyL1xuXG5cbiovXG53aW5kb3cudGhlTWFwICA9IChmdW5jdGlvbigpeyAgIFxuXCJ1c2Ugc3RyaWN0XCI7XG5cdGNvbnNvbGUubG9nKENoYXJ0cyk7ICBcbiAgICBtYXBib3hnbC5hY2Nlc3NUb2tlbiA9ICdway5leUoxSWpvaWIzTjBaWEp0WVc1cUlpd2lZU0k2SW1OcGRuVTVkSFZuZGpBMmVEWXliM0EzTm5nMWNHSjNaWG9pZlEuWG9fay1rekdmWVhfWW9fUkRjSERCZyc7XG5cbiAgICBjb25zdCBtYkhlbHBlciA9IHJlcXVpcmUoJ21hcGJveC1oZWxwZXInKTtcbiAgIFxuICAgIHZhciBnZW9qc29uO1xuICAgIHZhciBnYXRlQ2hlY2sgPSAwO1xuICAgIFxuICAgIHZhciB0aGVNYXAgPSBuZXcgbWFwYm94Z2wuTWFwKHtcblx0ICAgIGNvbnRhaW5lcjogJ21hcCcsXG5cdCAgICBzdHlsZTogJ21hcGJveDovL3N0eWxlcy9vc3Rlcm1hbmovY2pmMDNvMzdiM3R2ZTJycXAyaW53NmExZicsXG5cdCAgICBjZW50ZXI6IFstOTYuMjkxOTI5NjExMjk4ODMsIDM4LjQ1MzE3NTI4OTA1Mzc0Nl0sXG5cdCAgICB6b29tOiAzLFxuXHQgICAgbWF4Qm91bmRzOiBbWy0xNDIuODg3MDU3MTQ3NDYzNjIsIDE2LjA1ODM0NDk0ODQzMjQwNl0sWy01MS45MDIzMDE3ODY5NzMxLDU1Ljc2NjkwMDY3NDE3MTM4XV0sXG5cdCAgICBtaW5ab29tOiAzLFxuXHQgICAgYXR0cmlidXRpb25Db250cm9sOiBmYWxzZSxcblx0fSk7XG5cblx0dmFyIG5hdiA9IG5ldyBtYXBib3hnbC5OYXZpZ2F0aW9uQ29udHJvbCh7c2hvd0NvbXBhc3M6ZmFsc2V9KTtcblx0dGhlTWFwLmFkZENvbnRyb2wobmF2LCAndG9wLWxlZnQnKTtcblxuXHR0b0dlb0pTT04oJ3BvbGljaWVzLmNzdicpO1xuXG5cdHRoZU1hcC5vbignbG9hZCcsIGZ1bmN0aW9uKCl7XG5cdFx0Z2F0ZUNoZWNrKys7XG5cdFx0Z2F0ZSgpO1xuXHR9KTtcblx0ZnVuY3Rpb24gZ2F0ZSgpe1xuXHRcdGlmICggZ2F0ZUNoZWNrIDwgMiApe1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR2YXIgdW5jbHVzdGVyZWQgPSBhZGRVbmNsdXN0ZXJlZCgpO1xuXHRcdGFkZENsdXN0ZXJlZCgpO1xuXHRcdHVuY2x1c3RlcmVkLnRoZW4oKCkgPT4ge1xuXHRcdFx0Y29uc29sZS5sb2coZ2VvanNvbi5mZWF0dXJlcy5sZW5ndGgpO1xuXHRcdFx0ZmVhdHVyZXNJblZpZXcucmVuZGVyKCk7XG5cdFx0XHQvL3Nob3dUb3RhbChnZW9qc29uLmZlYXR1cmUubGVuZ3RoKTtcblx0XHR9KTtcblx0fSAvLyBlbmQgZ2F0ZVxuXG5cdGZ1bmN0aW9uIGFkZFVuY2x1c3RlcmVkKCl7XG5cdFx0cmV0dXJuIG1iSGVscGVyLmFkZFNvdXJjZUFuZExheWVycy5jYWxsKHRoZU1hcCxcblx0XHRcdHsgLy8gc291cmNlXG5cdFx0XHRcdFwibmFtZVwiOiBcInBvbGljeS1wb2ludHNcIixcblx0XHQgICAgICAgIFwidHlwZVwiOiBcImdlb2pzb25cIixcblx0XHQgICAgICAgIFwiZGF0YVwiOiBnZW9qc29uXG5cdFx0XHR9LCBbIC8vIGxheWVyc1xuXHRcdFx0XHR7IC8vIGxheWVyIG9uZVxuXHQgICAgICAgICAgICBcImlkXCI6IFwicG9pbnRzXCIsXG5cdCAgICAgICAgICAgIFwidHlwZVwiOiBcImNpcmNsZVwiLFxuXHQgICAgICAgICAgICBcInNvdXJjZVwiOiBcInBvbGljeS1wb2ludHNcIixcblx0ICAgICAgICAgICAgXCJtYXh6b29tXCI6IDksXG5cdCAgICAgICAgICAgIFwicGFpbnRcIjoge1xuXHQgICAgICAgICAgICAgIFx0XCJjaXJjbGUtY29sb3JcIjogW1xuXHRcdCAgICAgICAgICAgICAgICAnbWF0Y2gnLFxuXHRcdCAgICAgICAgICAgICAgICBbJ2dldCcsICd0X2RlZCddLFxuXHRcdCAgICAgICAgICAgICAgICA1LCAnIzA1MTgzOScsXG5cdFx0ICAgICAgICAgICAgICAgIC8qIG90aGVyICovICcjOTkwMDAwJ1xuXHRcdCAgICAgICAgICAgIF0sXG5cdFx0ICAgICAgICAgICAgXCJjaXJjbGUtcmFkaXVzXCI6IHtcblx0XHQgICAgICAgICAgICAgICAgJ3N0b3BzJzogW1s1LCAzXSwgWzgsIDE4XV1cblx0XHQgICAgICAgICAgICB9LFxuXHRcdCAgICAgICAgICAgIFwiY2lyY2xlLW9wYWNpdHlcIjogMC4xXG5cdFx0ICAgICAgICAgICAgfVxuXHRcdCAgICAgICAgfSxcblx0XHQgICAgICAgIHsgLy8gbGF5ZXIgdHdvXG5cdCAgICAgICAgICAgIFwiaWRcIjogXCJwb2ludHMtZGF0YS1kcml2ZW5cIixcblx0ICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY2lyY2xlXCIsXG5cdCAgICAgICAgICAgIFwic291cmNlXCI6IFwicG9saWN5LXBvaW50c1wiLFxuXHQgICAgICAgICAgICBcIm1pbnpvb21cIjogOSxcblx0ICAgICAgICAgICAgXCJwYWludFwiOiB7XG5cdCAgICAgICAgICAgICAgXHRcImNpcmNsZS1jb2xvclwiOiBbXG5cdFx0ICAgICAgICAgICAgICAgICdtYXRjaCcsXG5cdFx0ICAgICAgICAgICAgICAgIFsnZ2V0JywgJ3RfZGVkJ10sXG5cdFx0ICAgICAgICAgICAgICAgIDUsICcjMDUxODM5Jyxcblx0XHQgICAgICAgICAgICAgICAgLyogb3RoZXIgKi8gJyM5OTAwMDAnXG5cdFx0ICAgICAgICAgICAgXSxcblx0XHQgICAgICAgICAgICBcImNpcmNsZS1yYWRpdXNcIjoge1xuXHRcdCAgICAgICAgICAgIFx0cHJvcGVydHk6ICdwcmVtJyxcblx0XHQgICAgICAgICAgICAgICAgdHlwZTogJ2V4cG9uZW50aWFsJyxcblx0XHRcdFx0ICAgICAgICBzdG9wczogW1xuXHRcdFx0XHQgICAgICAgICAgWzYyLCA1XSxcblx0XHRcdFx0ICAgICAgICAgIFsyNTAwLCA2MF1cblx0XHRcdFx0ICAgICAgICBdXG5cdFx0ICAgICAgICAgICAgfSxcblx0XHQgICAgICAgICAgICBcImNpcmNsZS1vcGFjaXR5XCI6IDAuMSxcblx0XHQgICAgICAgICAgICBcImNpcmNsZS1zdHJva2UtY29sb3JcIjogXCIjZmZmZmZmXCIsXG5cdFx0ICAgICAgICAgICAgXCJjaXJjbGUtc3Ryb2tlLXdpZHRoXCI6IDFcblx0XHQgICAgICAgIH1cblx0XHRcdH1dXG5cdFx0KTsgXG5cdH1cblxuXHQvKmZ1bmN0aW9uIGNoZWNrRmVhdHVyZXMoKXtcblx0XHR2YXIgZmVhdHVyZXM7XG5cdFx0aWYgKCB0aGVNYXAubG9hZGVkKCkpe1xuXHRcdFx0ZmVhdHVyZXMgPSB0aGVNYXAucXVlcnlSZW5kZXJlZEZlYXR1cmVzKHtsYXllcnM6Wydwb2ludHMnXX0pO1xuXHRcdFx0Y29uc29sZS5sb2coZmVhdHVyZXMpO1xuXHRcdFx0dGhlTWFwLm9mZigncmVuZGVyJywgY2hlY2tGZWF0dXJlcyk7XG5cdFx0fVxuXHR9Ki9cblx0ZnVuY3Rpb24gYWRkQ2x1c3RlcmVkKCl7XG5cdFx0XG5cdFx0bWJIZWxwZXIuYWRkU291cmNlQW5kTGF5ZXJzLmNhbGwodGhlTWFwLFxuXHRcdCAgICB7IC8vIHNvdXJjZVxuXHRcdCAgICBcdFwibmFtZVwiOiBcInBvbGljaWVzXCIsXG5cdFx0ICAgICAgICBcInR5cGVcIjogXCJnZW9qc29uXCIsXG5cdFx0ICAgICAgICBcImRhdGFcIjogZ2VvanNvbixcblx0XHQgICAgICAgIFwiY2x1c3RlclwiOiB0cnVlLFxuXHRcdCAgICAgICAgXCJjbHVzdGVyUmFkaXVzXCI6IDAuNSAvLyBSYWRpdXMgb2YgZWFjaCBjbHVzdGVyIHdoZW4gY2x1c3RlcmluZyBwb2ludHMgKGRlZmF1bHRzIHRvIDUwKVxuXHRcdCAgICB9LCBbIC8vIGxheWVyc1xuXHRcdCAgICAgICB7IC8vIGxheWVyIG9uZVxuXHRcdCAgICAgICAgICAgIGlkOiBcImNsdXN0ZXItY291bnRcIixcblx0XHRcdCAgICAgICAgdHlwZTogXCJzeW1ib2xcIixcblx0XHRcdCAgICAgICAgc291cmNlOiBcInBvbGljaWVzXCIsXG5cdFx0XHQgICAgICAgIGZpbHRlcjogW1wiaGFzXCIsIFwicG9pbnRfY291bnRcIl0sXG5cdFx0XHQgICAgICAgIFwibWluem9vbVwiOiA2LFxuXHRcdFx0ICAgICAgICBsYXlvdXQ6IHtcblx0XHRcdCAgICAgICAgICAgIFwidGV4dC1maWVsZFwiOiBcIntwb2ludF9jb3VudF9hYmJyZXZpYXRlZH1cIixcblx0XHRcdCAgICAgICAgICAgIFwidGV4dC1zaXplXCI6IDEyLFxuXG5cdFx0XHQgICAgICAgIH0sXG5cdFx0XHQgICAgICAgIFwicGFpbnRcIjoge1xuXHRcdFx0ICAgICAgICBcdFwidGV4dC1jb2xvclwiOiBcIiNmZmZmZmZcIlxuXHRcdFx0ICAgICAgICB9XG5cdFx0ICAgICAgICB9XG5cdCAgICAgICAgXSAvLyBlbmQgbGF5ZXJzIGFycmF5XG5cdCAgICApOyAvLyBlbmQgYWRkbGF5ZXJzXG5cdH0gLy8gZW5kIGFkZENsdXN0ZXJlZFxuXHRmdW5jdGlvbiB0b0dlb0pTT04odXJsKXtcblx0XHRcblx0XHRkMy5jc3YodXJsLCBmdW5jdGlvbihlcnIsIGRhdGEpe1xuXHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHR0aHJvdyBlcnI7XG5cdFx0XHR9XG5cdFx0XHQvL2NvbnNvbGUubG9nKGRhdGEpO1xuXHRcdFx0dmFyIGZlYXR1cmVzID0gW107IFxuXHRcdFx0ZGF0YS5mb3JFYWNoKGVhY2ggPT4ge1xuXHRcdFx0XHR2YXIgY29lcmNlZCA9IHt9O1xuXHRcdFx0XHRmb3IgKCB2YXIga2V5IGluIGVhY2ggKSB7XG5cdFx0XHRcdFx0aWYgKCBlYWNoLmhhc093blByb3BlcnR5KGtleSkgKXtcblx0XHRcdFx0XHRcdGNvZXJjZWRba2V5XSA9ICFpc05hTigrZWFjaFtrZXldKSA/ICtlYWNoW2tleV0gOiBlYWNoW2tleV07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9ICBcblx0XHRcdFx0ZmVhdHVyZXMucHVzaCh7XG5cdFx0XHRcdFx0XCJ0eXBlXCI6IFwiRmVhdHVyZVwiLFxuXHRcdFx0XHRcdFwicHJvcGVydGllc1wiOiBjb2VyY2VkLFxuXHRcdFx0XHRcdFwiZ2VvbWV0cnlcIjoge1xuXHRcdFx0XHRcdFx0XCJ0eXBlXCI6IFwiUG9pbnRcIixcblx0XHRcdFx0XHRcdFwiY29vcmRpbmF0ZXNcIjogWytlYWNoLmxvbmdpdHVkZSwgK2VhY2gubGF0aXR1ZGVdXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH0pOyAvLyBlbmQgZm9yRWFjaFxuXHRcdFx0Z2VvanNvbiA9ICB7XG5cdFx0XHRcdFwidHlwZVwiOiBcIkZlYXR1cmVDb2xsZWN0aW9uXCIsXG5cdFx0XHRcdFwiZmVhdHVyZXNcIjogZmVhdHVyZXNcblx0XHRcdH07XG5cdFx0XHRnYXRlQ2hlY2srKztcblx0XHRcdGdhdGUoKTtcblx0XHRcdC8vYWRkQ2x1c3RlckxheWVycyhydG4pO1xuXHRcdFx0XG5cdFx0XHRDaGFydHMuY3JlYXRlQ2hhcnRzKGdlb2pzb24pO1xuXHRcdH0pOyAvLyBlbmQgZDMgY3N2XG5cdH0gLy8gZW5kIHRvR2VvSlNPTlxuXHR2YXIgZmVhdHVyZXNJblZpZXcgPSB7XG5cdFx0cmVuZGVyKCl7XG5cdFx0XHR0aGlzLnRvdGFsID0gZ2VvanNvbi5mZWF0dXJlcy5sZW5ndGg7XG5cdFx0XHR0aGVNYXAub24oJ3JlbmRlcicsIGZpcnN0VXBkYXRlKTtcblx0XHRcdGZ1bmN0aW9uIGZpcnN0VXBkYXRlKCl7XG5cdFx0XHRcdC8vY29uc29sZS5sb2codGhlTWFwLmxvYWRlZCgpKTtcblx0XHRcdFx0aWYgKCB0aGVNYXAubG9hZGVkKCkgKXtcblx0XHRcdFx0XHR0aGVNYXAub2ZmKCdyZW5kZXInLCBmaXJzdFVwZGF0ZSk7XG5cdFx0XHRcdFx0ZmVhdHVyZXNJblZpZXcudXBkYXRlKGNvdW50VW5pcXVlRmVhdHVyZXMoKSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9LFxuXHRcdHVwZGF0ZShuKXtcblx0XHRcdGQzLnNlbGVjdCgnI3RvdGFsLWluLXZpZXcnKVxuXHRcdFx0XHQudGV4dCgoKSA9PiBkMy5mb3JtYXQoXCIsXCIpKG4pICsgJyBvZiAnICsgZDMuZm9ybWF0KFwiLFwiKSh0aGlzLnRvdGFsKSArICcgcHJvcGVydGllcyBpbiB2aWV3Jyk7XG5cdFx0fVxuXHR9O1xuXHRcblx0dmFyIHVuaXF1ZUZlYXR1cmVzID0gbmV3IFNldCgpO1xuXHRmdW5jdGlvbiBjb3VudFVuaXF1ZUZlYXR1cmVzKCl7XG5cdFx0dW5pcXVlRmVhdHVyZXMuY2xlYXIoKTtcblx0XHR0aGVNYXAucXVlcnlSZW5kZXJlZEZlYXR1cmVzKHtsYXllcnM6Wydwb2ludHMnLCdwb2ludHMtZGF0YS1kcml2ZW4nXX0pLmZvckVhY2goZWFjaCA9PiB7XG5cdFx0XHRpZiAoICF1bmlxdWVGZWF0dXJlcy5oYXMoZWFjaC5wcm9wZXJ0aWVzLmlkKSApe1xuXHRcdFx0XHR1bmlxdWVGZWF0dXJlcy5hZGQoZWFjaC5wcm9wZXJ0aWVzLmlkKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHRyZXR1cm4gdW5pcXVlRmVhdHVyZXMuc2l6ZTtcblx0fVxuXHR0aGVNYXAub24oJ21vdmVlbmQnLCBmdW5jdGlvbigpe1xuXHRcdGZlYXR1cmVzSW5WaWV3LnVwZGF0ZShjb3VudFVuaXF1ZUZlYXR1cmVzKCkpO1x0XG5cdH0pO1xuXHR0aGVNYXAub24oJ3pvb21lbmQnLCBmdW5jdGlvbigpe1xuXHRcdGZlYXR1cmVzSW5WaWV3LnVwZGF0ZShjb3VudFVuaXF1ZUZlYXR1cmVzKCkpO1xuXHRcdC8vY2hlY2tGZWF0dXJlcygpO1xuXHR9KTtcblx0Lyp0aGVNYXAub24oXCJtb3VzZW1vdmVcIiwgXCJwb2ludHMtZGF0YS1kcml2ZW5cIiwgZnVuY3Rpb24oZSkge1xuICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICB9KTsqL1xuXG5cdHJldHVybiB0aGVNYXA7XG4gICBcbn0oKSk7IC8vIGVuZCBJSUZFICIsImV4cG9ydCBjb25zdCBDaGFydHMgPSAoZnVuY3Rpb24oKXtcbiAgICAvKiBnbG9iYWxzIGQzICovXG4gICAgY29uc3QgbWVkaWFuSW5jb21lcyA9IG5ldyBNYXAoKTtcbiAgICBmdW5jdGlvbiBjcmVhdGVNZWRpYW5JbmNvbWVNYXAoZ2VvanNvbil7XG5cdFx0Z2VvanNvbi5mZWF0dXJlcy5mb3JFYWNoKGVhY2ggPT4ge1xuXHRcdFx0aWYgKCAhbWVkaWFuSW5jb21lcy5oYXMoZWFjaC5wcm9wZXJ0aWVzLmNlbl90cmFjdCkgKXtcblx0XHRcdFx0bGV0IGluY29tZSA9IGVhY2gucHJvcGVydGllcy5tZWRfaW5jb21lID4gMCA/IGVhY2gucHJvcGVydGllcy5tZWRfaW5jb21lIDogbnVsbDtcblx0XHRcdFx0bWVkaWFuSW5jb21lcy5zZXQoZWFjaC5wcm9wZXJ0aWVzLmNlbl90cmFjdCwgaW5jb21lKTsgXHRcblx0XHRcdH1cblx0XHR9KTtcblx0XHRjb25zb2xlLmxvZyhtZWRpYW5JbmNvbWVzKTtcblx0XHR3aW5kb3cubWVkaWFuSW5jb21lcyA9IG1lZGlhbkluY29tZXM7XG5cdFx0Ly9jcmVhdGVDaGFydHMoZ2VvanNvbik7XG5cdH1cblx0dmFyIGNyZWF0ZUNoYXJ0cyA9IGZ1bmN0aW9uKGdlb2pzb24pe1xuXHRcdGNvbnNvbGUubG9nKGdlb2pzb24pO1xuXHRcdGNyZWF0ZU1lZGlhbkluY29tZU1hcChnZW9qc29uKTtcblxuXHRcdG5ldyBEb251dCh7XG5cdFx0XHRtYXJnaW46IHsgLy8gcGVyY2VudGFnZXNcbiAgICAgICAgICAgICAgICB0b3A6IDE1LFxuICAgICAgICAgICAgICAgIHJpZ2h0OiAxMCxcbiAgICAgICAgICAgICAgICBib3R0b206IDUsXG4gICAgICAgICAgICAgICAgbGVmdDogMTBcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBoZWlnaHRUb1dpZHRoOiAxLFxuICAgICAgICAgICAgY29udGFpbmVyOiAnI2NoYXJ0LTAnLFxuICAgICAgICAgICAgZGF0YTogZ2VvanNvbi5mZWF0dXJlc1xuXHRcdH0pO1xuXG5cdC8qXHRuZXcgRG9udXQoe1xuXHRcdFx0bWFyZ2luOiB7IC8vIHBlcmNlbnRhZ2VzXG4gICAgICAgICAgICAgICAgdG9wOiAxNSxcbiAgICAgICAgICAgICAgICByaWdodDogMTAsXG4gICAgICAgICAgICAgICAgYm90dG9tOiA1LFxuICAgICAgICAgICAgICAgIGxlZnQ6IDEwXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaGVpZ2h0VG9XaWR0aDogMSxcbiAgICAgICAgICAgIGNvbnRhaW5lcjogJyNjaGFydC0xJyxcbiAgICAgICAgICAgIGRhdGE6IFsuLi5tZWRpYW5JbmNvbWVzLnZhbHVlcygpXVxuXHRcdH0pO1xuXG5cdFx0bmV3IERvbnV0KHtcblx0XHRcdG1hcmdpbjogeyAvLyBwZXJjZW50YWdlc1xuICAgICAgICAgICAgICAgIHRvcDogMTUsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IDEwLFxuICAgICAgICAgICAgICAgIGJvdHRvbTogNSxcbiAgICAgICAgICAgICAgICBsZWZ0OiAxMFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhlaWdodFRvV2lkdGg6IDEsXG4gICAgICAgICAgICBjb250YWluZXI6ICcjY2hhcnQtMicsXG4gICAgICAgICAgICBkYXRhOiBbLi4ubWVkaWFuSW5jb21lcy52YWx1ZXMoKV1cblx0XHR9KTsgLy8qL1xuXHR9XG5cblx0dmFyIERvbnV0ID0gZnVuY3Rpb24oY29uZmlnT2JqZWN0KXsgLy8gbWFyZ2lucyB7fSwgaGVpZ2h0ICMsIHdpZHRoICMsIGNvbnRhaW5lcklELCBkYXRhUGF0aFxuXHQgICAgY29uc29sZS5sb2codGhpcywgY29uZmlnT2JqZWN0KTtcblx0ICAgIHRoaXMuc2V0dXAoY29uZmlnT2JqZWN0KTtcblx0fTtcblxuXHREb251dC5wcm90b3R5cGUgPSB7XG5cblx0ICAgIHNldHVwKGNvbmZpZ09iamVjdCl7XG5cdCAgICBcdGNvbnNvbGUubG9nKCdpbiBzZXQgdXAnKTtcblx0ICAgICAgICB2YXIgdmlld0JveCA9ICcwIDAgMTAwICcgKyBNYXRoLnJvdW5kKGNvbmZpZ09iamVjdC5oZWlnaHRUb1dpZHRoICogMTAwKTtcblx0ICAgICAgICB2YXIgdGF1ID0gMiAqIE1hdGguUEk7XG5cdCAgICAgICAgdGhpcy5tYXJnaW4gPSBjb25maWdPYmplY3QubWFyZ2luO1xuXHQgICAgICAgIHRoaXMud2lkdGggPSAxMDAgLSB0aGlzLm1hcmdpbi5sZWZ0IC0gdGhpcy5tYXJnaW4ucmlnaHQ7XG5cdCAgICAgICAgdGhpcy5oZWlnaHQgPSBjb25maWdPYmplY3QuaGVpZ2h0VG9XaWR0aCAqIDEwMCAtIHRoaXMubWFyZ2luLnRvcCAtIHRoaXMubWFyZ2luLmJvdHRvbTtcblx0ICAgICAgICB0aGlzLnJhZGl1cyA9IE1hdGgubWluKHRoaXMud2lkdGgsdGhpcy5oZWlnaHQpIC8gMjtcblx0ICAgICAgICB0aGlzLmRhdGEgPSBjb25maWdPYmplY3QuZGF0YTtcblx0ICAgICAgICBjb25zb2xlLmxvZyh0aGlzLnJhZGl1cyk7XG5cdCAgICAgICAgdGhpcy5hcmMgPSBkMy5hcmMoKVxuXHQgICAgICAgICAgLm91dGVyUmFkaXVzKHRoaXMucmFkaXVzKVxuXHQgICAgICAgICAgLmlubmVyUmFkaXVzKHRoaXMucmFkaXVzIC8gMilcblx0ICAgICAgICAgIC5zdGFydEFuZ2xlKDApOyBcblx0ICAgICAgICB3aW5kb3cuYXJjID0gdGhpcy5hcmM7XG5cdCAgICAgICAgY29uc29sZS5sb2codGhpcy5kYXRhKTtcblx0ICAgICAgICB0aGlzLnNjYWxlID0gZDMuc2NhbGVMaW5lYXIoKS5kb21haW4oWzAsdGhpcy5kYXRhLmxlbmd0aF0pLnJhbmdlKFswLDFdKTtcblx0ICAgICAgICB0aGlzLnZhbHVlID0gdGhpcy5kYXRhLmxlbmd0aDtcblx0ICAgICAgICAvL3RoaXMueSA9IGQzLnNjYWxlTGluZWFyKCkuZG9tYWluKGQzLnJhbmdlKHRoaXMuZGF0YSkpLnJhbmdlKFt0aGlzLmhlaWdodCwgMF0pO1xuIFxuXHQgICAgICAgIFxuXHQgICAgICAgLy8gdGhpcy5sYWJlbE9mZnNldCA9IGNvbmZpZ09iamVjdC50cmVuZExhYmVsUG9zaXRpb24gPT09ICdiZWxvdycgPyA0IDogLTM7XG5cdCAgICAgICAvLyB0aGlzLnlBeGlzQ291bnQgPSBjb25maWdPYmplY3QueUF4aXNDb3VudDtcblx0ICAgICAgIC8vIHRoaXMuaGFzQmVlblVwZGF0ZWQgPSBmYWxzZTtcblxuXG5cdCAgICAgICAgdGhpcy5zdmcgPSBkMy5zZWxlY3QoY29uZmlnT2JqZWN0LmNvbnRhaW5lcilcblx0ICAgICAgICAgICAgLmFwcGVuZCgnc3ZnJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3dpZHRoJywgJzEwMCUnKVxuXHQgICAgICAgICAgICAuYXR0cigneG1sbnMnLCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycpXG5cdCAgICAgICAgICAgIC5hdHRyKCd2ZXJzaW9uJywnMS4xJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3ZpZXdCb3gnLCB2aWV3Qm94KVxuXHQgICAgICAgICAgICAuYXBwZW5kKCdnJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIHRoaXMubWFyZ2luLmxlZnQgKyAnLCcgKyB0aGlzLm1hcmdpbi50b3AgKyAnKScpO1xuXG5cdCAgICBcdHRoaXMuc3ZnLmFwcGVuZCgncGF0aCcpXG5cdCAgICAgICAgICAgIC5jbGFzc2VkKCdiYWNrZ3JvdW5kJyx0cnVlKVxuXHQgICAgICAgICAgICAuZGF0dW0oe2VuZEFuZ2xlOiB0YXV9KVxuXHQgICAgICAgICAgICAvLy5zdHlsZShcImZpbGxcIiwgXCIjZGRkXCIpXG5cdCAgICAgICAgICAgIC5hdHRyKCdkJywgdGhpcy5hcmMpXG5cdCAgICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyB0aGlzLndpZHRoIC8gMiArICcsJyArIHRoaXMuaGVpZ2h0IC8gMiArICcpJyk7XG5cblx0ICAgICAgICB0aGlzLnN2Zy5hcHBlbmQoJ3BhdGgnKVxuXHQgICAgICAgICAgICAuY2xhc3NlZCgnZm9yZWdyb3VuZCcsdHJ1ZSlcblx0ICAgICAgICAgICAgLmRhdHVtKHtlbmRBbmdsZTogdGhpcy52YWx1ZSAqIHRhdX0pXG5cdCAgICAgICAgICAgIC8vLnN0eWxlKFwiZmlsbFwiLCBcIiNkZGRcIilcblx0ICAgICAgICAgICAgLmF0dHIoJ2QnLCB0aGlzLmFyYylcblx0ICAgICAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIHRoaXMud2lkdGggLyAyICsgJywnICsgdGhpcy5oZWlnaHQgLyAyICsgJyknKTtcblxuXHQgICAgICAgICB0aGlzLnN2Zy5hcHBlbmQoXCJ0ZXh0XCIpXG5cdCAgICAgICAgICAgIC5hdHRyKFwidGV4dC1hbmNob3JcIiwgXCJtaWRkbGVcIilcblx0ICAgICAgICAgICAgLmF0dHIoJ2NsYXNzJywncGllX251bWJlcicpXG5cdCAgICAgICAgICAgIC5hdHRyKCd5Jyw1KVxuXHQgICAgICAgICAgICAudGV4dChkMy5mb3JtYXQoXCIuMnNcIikodGhpcy52YWx1ZSkpXG5cdCAgICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyB0aGlzLndpZHRoIC8gMiArICcsJyArIHRoaXMuaGVpZ2h0IC8gMiArICcpJyk7XG5cblx0ICAgIH1cblx0fTtcblxuXHRyZXR1cm4ge1xuXHRcdGNyZWF0ZUNoYXJ0c1xuXHR9O1xufSgpKTsiLCJjb25zdCBtYkhlbHBlciA9IHtcbiAgICBwcm9taXNlczoge30sXG4gICAgYWRkU291cmNlQW5kTGF5ZXJzKHNvdXJjZU9wdGlvbnMsbGF5ZXJPcHRpb25zQXJyYXkpeyAvLyB0aGlzID0gbWFwXG4gICAgICAgIHZhciBzb3VyY2VOYW1lID0gc291cmNlT3B0aW9ucy5uYW1lO1xuICAgICAgICBtYkhlbHBlci5wcm9taXNlc1tzb3VyY2VPcHRpb25zLm5hbWVdID0gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHsgLy8gVE8gRE86IGZpZ3VyZSBvdXQgcmVqZWN0P1xuICAgICAgICAgICAgZGVsZXRlIHNvdXJjZU9wdGlvbnMubmFtZTtcbiAgICAgICAgICAgIGZ1bmN0aW9uIGNoZWNrRGF0YUxvYWRlZCgpe1xuICAgICAgICAgICAgICAgIGlmICggdGhpcy5nZXRTb3VyY2Uoc291cmNlTmFtZSkgKXsgLy8gaWYgYWRkU291cmNlIGhhcyB0YWtlbiBlZmZlY3RcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vZmYoJ3JlbmRlcicsIGNoZWNrRGF0YUxvYWRlZCk7IC8vIHR1cm4gb2ZmIHRoZSBsaXN0ZW5lciBmb3IgcmVuZGVyXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5vbigncmVuZGVyJywgY2hlY2tEYXRhTG9hZGVkKTtcbiAgICAgICAgICAgIHRoaXMuYWRkU291cmNlKHNvdXJjZU5hbWUsIHNvdXJjZU9wdGlvbnMpO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGxheWVyUHJvbWlzZXMgPSBbXTtcbiAgICAgICAgcmV0dXJuIG1iSGVscGVyLnByb21pc2VzW3NvdXJjZU5hbWVdLnRoZW4oKCkgPT4geyBcbiAgICAgICAgICAgIGxheWVyT3B0aW9uc0FycmF5LmZvckVhY2goKGVhY2gpID0+IHtcbiAgICAgICAgICAgICAgICBsYXllclByb21pc2VzLnB1c2goXG4gICAgICAgICAgICAgICAgICAgIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7IC8vIFRPIERPOiBmaWd1cmUgb3V0IHJlamVjdD9cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBiZWZvcmVMYXllciA9IGVhY2guYmVmb3JlTGF5ZXIgPyBlYWNoLmJlZm9yZUxheWVyIDogJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgZWFjaC5iZWZvcmVMYXllcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVhY2guc291cmNlID0gc291cmNlTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGNoZWNrTGF5ZXJMb2FkZWQoKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIHRoaXMuZ2V0TGF5ZXIoZWFjaC5pZCkgKXsgLy8gaWYgYWRkTGF5ZXIgIGhhcyB0YWtlbiBlZmZlY3RcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vZmYoJ3JlbmRlcicsIGNoZWNrTGF5ZXJMb2FkZWQpOyAvLyB0dXJuIG9mZiB0aGUgbGlzdGVuZXIgZm9yIHJlbmRlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub24oJ3JlbmRlcicsIGNoZWNrTGF5ZXJMb2FkZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRMYXllcihlYWNoLCBiZWZvcmVMYXllcik7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKGxheWVyUHJvbWlzZXMpO1xuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG5leHBvcnRzLmFkZFNvdXJjZUFuZExheWVycyA9IG1iSGVscGVyLmFkZFNvdXJjZUFuZExheWVyczsiXX0=
