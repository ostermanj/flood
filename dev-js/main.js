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
	var theCharts = [];
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
		featuresInView.render();
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

			theCharts.push(new _Charts.Charts.Donut({
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
	var featuresInView = {
		render: function render() {
			var _this = this;

			this.total = geojson.features.length;
			this.svg = d3.select('#total-view').append('svg').attr('width', '100%').attr('xmlns', 'http://www.w3.org/2000/svg').attr('version', '1.1').attr('viewBox', '0 0 100 3');

			this.background = this.svg.append('line').classed('background-line', true).attr('x0', 0).attr('y0', 0).attr('x1', 100).attr('y1', 0);

			this.line = this.svg.append('line').classed('total-line', true).attr('x0', 0).attr('y0', 0).attr('x1', 0).attr('y1', 0);

			this.text = d3.select('#total-view').append('span').text(function () {
				return d3.format(",")(_this.total) + ' of ' + d3.format(",")(_this.total) + ' in view';
			});

			this.update(countFeatures());
		},
		update: function update(n) {
			var _this2 = this;

			/*d3.select('#total-in-view')
   	.text(() => d3.format(",")(n) + ' of ' + d3.format(",")(this.total) + ' properties in view');*/
			this.line.transition().duration(200).attr('x1', function () {
				return n / _this2.total * 100;
			});
			this.text.text(function () {
				return d3.format(",")(n) + ' of ' + d3.format(",")(_this2.total) + ' in view';
			});
		}
	};

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
		featuresInView.update(countFeatures());
		theCharts.forEach(function (each) {
			return each.update(false, matchingIDs);
		});
	}
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkZXYtanMvbWFpbi5lczYiLCJqcy1leHBvcnRzL0NoYXJ0cy5qcyIsIm5vZGVfbW9kdWxlcy9tYXBib3gtaGVscGVyL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNDQzs7QUFDQTs7QUFFRDs7Ozs7Ozs7QUFRQTs7Ozs7QUFLQSxPQUFPLE1BQVAsR0FBa0IsWUFBVTtBQUM1Qjs7QUFDQyxTQUFRLEdBQVI7QUFDRyxVQUFTLFdBQVQsR0FBdUIsOEZBQXZCOztBQUVBLEtBQU0sV0FBVyxRQUFRLGVBQVIsQ0FBakI7QUFDQSxLQUFNLFlBQVksRUFBbEI7QUFDQSxLQUFJLE9BQUo7QUFDQSxLQUFJLFlBQVksQ0FBaEI7O0FBRUEsS0FBSSxTQUFTLElBQUksU0FBUyxHQUFiLENBQWlCO0FBQzdCLGFBQVcsS0FEa0I7QUFFN0IsU0FBTyxxREFGc0I7QUFHN0IsVUFBUSxDQUFDLENBQUMsaUJBQUYsRUFBcUIsa0JBQXJCLENBSHFCO0FBSTdCLFFBQU0sQ0FKdUI7QUFLN0IsYUFBVyxDQUFDLENBQUMsQ0FBQyxrQkFBRixFQUFzQixrQkFBdEIsQ0FBRCxFQUEyQyxDQUFDLENBQUMsZ0JBQUYsRUFBbUIsaUJBQW5CLENBQTNDLENBTGtCO0FBTTdCLFdBQVMsQ0FOb0I7QUFPN0Isc0JBQW9CO0FBUFMsRUFBakIsQ0FBYjs7QUFVSCxLQUFJLE1BQU0sSUFBSSxTQUFTLGlCQUFiLENBQStCLEVBQUMsYUFBWSxLQUFiLEVBQS9CLENBQVY7QUFDQSxRQUFPLFVBQVAsQ0FBa0IsR0FBbEIsRUFBdUIsVUFBdkI7O0FBRUEsV0FBVSxjQUFWOztBQUVBLFFBQU8sRUFBUCxDQUFVLE1BQVYsRUFBa0IsWUFBVTtBQUMzQjtBQUNBO0FBQ0EsRUFIRDtBQUlBLFVBQVMsSUFBVCxHQUFlO0FBQ2QsTUFBSyxZQUFZLENBQWpCLEVBQW9CO0FBQ25CO0FBQ0E7QUFDRDtBQUNBO0FBQ0EsaUJBQWUsTUFBZjtBQUNBLEVBcEMwQixDQW9DekI7O0FBRUYsVUFBUyxjQUFULEdBQXlCO0FBQ3hCLFNBQU8sU0FBUyxrQkFBVCxDQUE0QixJQUE1QixDQUFpQyxNQUFqQyxFQUNOLEVBQUU7QUFDRCxXQUFRLGVBRFQ7QUFFTyxXQUFRLFNBRmY7QUFHTyxXQUFRO0FBSGYsR0FETSxFQUtILENBQUU7QUFDSixJQUFFO0FBQ08sU0FBTSxRQURmO0FBRVMsV0FBUSxRQUZqQjtBQUdTLGFBQVUsZUFIbkI7QUFJUyxjQUFXLENBSnBCO0FBS1MsWUFBUztBQUNOLG9CQUFnQixDQUNkLE9BRGMsRUFFZCxDQUFDLEtBQUQsRUFBUSxPQUFSLENBRmMsRUFHZCxDQUhjLEVBR1gsU0FIVztBQUlkLGVBQVksU0FKRSxDQURWO0FBT1IscUJBQWlCO0FBQ2IsY0FBUyxDQUFDLENBQUMsQ0FBRCxFQUFJLENBQUosQ0FBRCxFQUFTLENBQUMsQ0FBRCxFQUFJLEVBQUosQ0FBVDtBQURJLEtBUFQ7QUFVUixzQkFBa0I7QUFWVjtBQUxsQixHQURFLEVBbUJJLEVBQUU7QUFDQyxTQUFNLG9CQURUO0FBRUcsV0FBUSxRQUZYO0FBR0csYUFBVSxlQUhiO0FBSUcsY0FBVyxDQUpkO0FBS0csWUFBUztBQUNOLG9CQUFnQixDQUNkLE9BRGMsRUFFZCxDQUFDLEtBQUQsRUFBUSxPQUFSLENBRmMsRUFHZCxDQUhjLEVBR1gsU0FIVztBQUlkLGVBQVksU0FKRSxDQURWO0FBT1IscUJBQWlCO0FBQ2hCLGVBQVUsTUFETTtBQUViLFdBQU0sYUFGTztBQUduQixZQUFPLENBQ0wsQ0FBQyxFQUFELEVBQUssQ0FBTCxDQURLLEVBRUwsQ0FBQyxJQUFELEVBQU8sRUFBUCxDQUZLO0FBSFksS0FQVDtBQWVSLHNCQUFrQixHQWZWO0FBZ0JSLDJCQUF1QixTQWhCZjtBQWlCUiwyQkFBdUI7QUFqQmY7QUFMWixHQW5CSixDQUxHLENBQVA7QUFrREE7O0FBRUQ7Ozs7Ozs7O0FBUUEsVUFBUyxZQUFULEdBQXVCOztBQUV0QixXQUFTLGtCQUFULENBQTRCLElBQTVCLENBQWlDLE1BQWpDLEVBQ0ksRUFBRTtBQUNELFdBQVEsVUFEVDtBQUVJLFdBQVEsU0FGWjtBQUdJLFdBQVEsT0FIWjtBQUlJLGNBQVcsSUFKZjtBQUtJLG9CQUFpQixHQUxyQixDQUt5QjtBQUx6QixHQURKLEVBT08sQ0FBRTtBQUNGLElBQUU7QUFDRyxPQUFJLGVBRFQ7QUFFRSxTQUFNLFFBRlI7QUFHRSxXQUFRLFVBSFY7QUFJRSxXQUFRLENBQUMsS0FBRCxFQUFRLGFBQVIsQ0FKVjtBQUtFLGNBQVcsQ0FMYjtBQU1FLFdBQVE7QUFDSixrQkFBYywyQkFEVjtBQUVKLGlCQUFhOztBQUZULElBTlY7QUFXRSxZQUFTO0FBQ1Isa0JBQWM7QUFETjtBQVhYLEdBREEsQ0FQUCxDQXVCUztBQXZCVCxJQUZzQixDQTBCaEI7QUFDTixFQTlIMEIsQ0E4SHpCO0FBQ0YsVUFBUyxTQUFULENBQW1CLEdBQW5CLEVBQXVCOztBQUV0QixLQUFHLEdBQUgsQ0FBTyxHQUFQLEVBQVksVUFBUyxHQUFULEVBQWMsSUFBZCxFQUFtQjtBQUM5QixPQUFJLEdBQUosRUFBUztBQUNSLFVBQU0sR0FBTjtBQUNBO0FBQ0Q7QUFDQSxPQUFJLFdBQVcsRUFBZjtBQUNBLFFBQUssT0FBTCxDQUFhLGdCQUFRO0FBQ3BCLFFBQUksVUFBVSxFQUFkO0FBQ0EsU0FBTSxJQUFJLEdBQVYsSUFBaUIsSUFBakIsRUFBd0I7QUFDdkIsU0FBSyxLQUFLLGNBQUwsQ0FBb0IsR0FBcEIsQ0FBTCxFQUErQjtBQUM5QixjQUFRLEdBQVIsSUFBZSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEdBQUwsQ0FBUCxDQUFELEdBQXFCLENBQUMsS0FBSyxHQUFMLENBQXRCLEdBQWtDLEtBQUssR0FBTCxDQUFqRDtBQUNBO0FBQ0Q7QUFDRCxhQUFTLElBQVQsQ0FBYztBQUNiLGFBQVEsU0FESztBQUViLG1CQUFjLE9BRkQ7QUFHYixpQkFBWTtBQUNYLGNBQVEsT0FERztBQUVYLHFCQUFlLENBQUMsQ0FBQyxLQUFLLFNBQVAsRUFBa0IsQ0FBQyxLQUFLLFFBQXhCO0FBRko7QUFIQyxLQUFkO0FBUUEsSUFmRCxFQU44QixDQXFCMUI7QUFDSixhQUFXO0FBQ1YsWUFBUSxtQkFERTtBQUVWLGdCQUFZO0FBRkYsSUFBWDtBQUlBO0FBQ0E7QUFDQTs7QUFFQSxhQUFVLElBQVYsQ0FDQyxJQUFJLGVBQU8sS0FBWCxDQUFpQjtBQUNoQixZQUFRLEVBQUU7QUFDRyxVQUFLLEVBRFY7QUFFSyxZQUFPLEVBRlo7QUFHSyxhQUFRLENBSGI7QUFJSyxXQUFNO0FBSlgsS0FEUTtBQU9QLG1CQUFlLENBUFI7QUFRUCxlQUFXLFVBUko7QUFTUCxVQUFNLFFBQVEsUUFUUDtBQVVQLGdCQUFZLG9CQUFTLElBQVQsRUFBYztBQUN6QixZQUFPLEtBQUssVUFBTCxDQUFnQixLQUFoQixHQUF3QixDQUEvQjtBQUNBO0FBWk0sSUFBakIsQ0FERDtBQWdCQSxHQTlDRCxFQUZzQixDQWdEbEI7QUFDSixFQWhMMEIsQ0FnTHpCO0FBQ0YsS0FBSSxpQkFBaUI7QUFDcEIsUUFEb0Isb0JBQ1o7QUFBQTs7QUFDUCxRQUFLLEtBQUwsR0FBYSxRQUFRLFFBQVIsQ0FBaUIsTUFBOUI7QUFDQSxRQUFLLEdBQUwsR0FBVyxHQUFHLE1BQUgsQ0FBVSxhQUFWLEVBQ1QsTUFEUyxDQUNGLEtBREUsRUFFVCxJQUZTLENBRUosT0FGSSxFQUVLLE1BRkwsRUFHQSxJQUhBLENBR0ssT0FITCxFQUdhLDRCQUhiLEVBSUEsSUFKQSxDQUlLLFNBSkwsRUFJZSxLQUpmLEVBS0EsSUFMQSxDQUtLLFNBTEwsRUFLZ0IsV0FMaEIsQ0FBWDs7QUFPTSxRQUFLLFVBQUwsR0FBa0IsS0FBSyxHQUFMLENBQVMsTUFBVCxDQUFnQixNQUFoQixFQUNoQixPQURnQixDQUNSLGlCQURRLEVBQ1csSUFEWCxFQUVoQixJQUZnQixDQUVYLElBRlcsRUFFTixDQUZNLEVBR2hCLElBSGdCLENBR1gsSUFIVyxFQUdOLENBSE0sRUFJaEIsSUFKZ0IsQ0FJWCxJQUpXLEVBSU4sR0FKTSxFQUtoQixJQUxnQixDQUtYLElBTFcsRUFLTixDQUxNLENBQWxCOztBQU9BLFFBQUssSUFBTCxHQUFZLEtBQUssR0FBTCxDQUFTLE1BQVQsQ0FBZ0IsTUFBaEIsRUFDVixPQURVLENBQ0YsWUFERSxFQUNZLElBRFosRUFFVixJQUZVLENBRUwsSUFGSyxFQUVBLENBRkEsRUFHVixJQUhVLENBR0wsSUFISyxFQUdBLENBSEEsRUFJVixJQUpVLENBSUwsSUFKSyxFQUlBLENBSkEsRUFLVixJQUxVLENBS0wsSUFMSyxFQUtBLENBTEEsQ0FBWjs7QUFPQSxRQUFLLElBQUwsR0FBWSxHQUFHLE1BQUgsQ0FBVSxhQUFWLEVBQ1YsTUFEVSxDQUNILE1BREcsRUFFVixJQUZVLENBRUw7QUFBQSxXQUFTLEdBQUcsTUFBSCxDQUFVLEdBQVYsRUFBZSxNQUFLLEtBQXBCLENBQVQsWUFBMEMsR0FBRyxNQUFILENBQVUsR0FBVixFQUFlLE1BQUssS0FBcEIsQ0FBMUM7QUFBQSxJQUZLLENBQVo7O0FBS04sUUFBSyxNQUFMLENBQVksZUFBWjtBQUNBLEdBOUJtQjtBQStCcEIsUUEvQm9CLGtCQStCYixDQS9CYSxFQStCWDtBQUFBOztBQUNSOztBQUVBLFFBQUssSUFBTCxDQUNFLFVBREYsR0FDZSxRQURmLENBQ3dCLEdBRHhCLEVBRUUsSUFGRixDQUVPLElBRlAsRUFFYTtBQUFBLFdBQVEsSUFBSSxPQUFLLEtBQVgsR0FBb0IsR0FBMUI7QUFBQSxJQUZiO0FBR0EsUUFBSyxJQUFMLENBQ0UsSUFERixDQUNPO0FBQUEsV0FBUyxHQUFHLE1BQUgsQ0FBVSxHQUFWLEVBQWUsQ0FBZixDQUFULFlBQWlDLEdBQUcsTUFBSCxDQUFVLEdBQVYsRUFBZSxPQUFLLEtBQXBCLENBQWpDO0FBQUEsSUFEUDtBQUdBO0FBeENtQixFQUFyQjs7QUEyQ0EsS0FBSSxjQUFjLElBQUksR0FBSixFQUFsQjtBQUNBLFVBQVMsYUFBVCxHQUF3QjtBQUN2QjtBQUNBLGNBQVksS0FBWjtBQUNBO0FBQ0EsTUFBSSxTQUFTLE9BQU8sU0FBUCxFQUFiO0FBQ0EsVUFBUSxRQUFSLENBQWlCLE9BQWpCLENBQXlCLGdCQUFRO0FBQ2hDLE9BQVEsS0FBSyxVQUFMLENBQWdCLFNBQWhCLElBQTZCLE9BQU8sR0FBUCxDQUFXLEdBQXhDLElBQ0gsS0FBSyxVQUFMLENBQWdCLFNBQWhCLElBQTZCLE9BQU8sR0FBUCxDQUFXLEdBRHJDLElBRUgsS0FBSyxVQUFMLENBQWdCLFFBQWhCLElBQTZCLE9BQU8sR0FBUCxDQUFXLEdBRnJDLElBR0gsS0FBSyxVQUFMLENBQWdCLFFBQWhCLElBQTZCLE9BQU8sR0FBUCxDQUFXLEdBSDdDLEVBR2tEO0FBQ2pELGdCQUFZLEdBQVosQ0FBZ0IsS0FBSyxVQUFMLENBQWdCLEVBQWhDO0FBQ0E7QUFDRCxHQVBEO0FBUUEsVUFBUSxHQUFSLENBQVksV0FBWjtBQUNBLFNBQU8sWUFBWSxJQUFuQjtBQUNBO0FBQ0QsUUFBTyxFQUFQLENBQVUsU0FBVixFQUFxQixZQUFVO0FBQzlCO0FBQ0EsRUFGRDtBQUdBLFFBQU8sRUFBUCxDQUFVLFNBQVYsRUFBcUIsWUFBVTtBQUM5QjtBQUNBLEVBRkQ7QUFHQSxVQUFTLFNBQVQsR0FBb0I7QUFDbkIsaUJBQWUsTUFBZixDQUFzQixlQUF0QjtBQUNBLFlBQVUsT0FBVixDQUFrQjtBQUFBLFVBQVEsS0FBSyxNQUFMLENBQVksS0FBWixFQUFtQixXQUFuQixDQUFSO0FBQUEsR0FBbEI7QUFDQTtBQUNEOzs7O0FBSUEsUUFBTyxNQUFQO0FBRUEsQ0E3UGlCLEVBQWxCLEMsQ0E2UE07QUE5UUw7Ozs7Ozs7O0FDQU0sSUFBTSwwQkFBVSxZQUFVO0FBQzdCO0FBQ0Q7Ozs7Ozs7Ozs7Ozs7QUFhQyxLQUFJLE1BQU0sSUFBSSxLQUFLLEVBQW5CO0FBQ0gsS0FBSSxRQUFRLFNBQVIsS0FBUSxDQUFTLFlBQVQsRUFBc0I7QUFBRTtBQUNoQyxVQUFRLEdBQVIsQ0FBWSxJQUFaLEVBQWtCLFlBQWxCO0FBQ0EsT0FBSyxLQUFMLENBQVcsWUFBWDtBQUNILEVBSEQ7O0FBS0EsT0FBTSxTQUFOLEdBQWtCO0FBRWQsT0FGYyxpQkFFUixZQUZRLEVBRUs7QUFDbEIsV0FBUSxHQUFSLENBQVksV0FBWjtBQUNHLE9BQUksVUFBVSxhQUFhLEtBQUssS0FBTCxDQUFXLGFBQWEsYUFBYixHQUE2QixHQUF4QyxDQUEzQjtBQUNBLFFBQUssTUFBTCxHQUFjLGFBQWEsTUFBM0I7QUFDQSxRQUFLLEtBQUwsR0FBYSxNQUFNLEtBQUssTUFBTCxDQUFZLElBQWxCLEdBQXlCLEtBQUssTUFBTCxDQUFZLEtBQWxEO0FBQ0EsUUFBSyxNQUFMLEdBQWMsYUFBYSxhQUFiLEdBQTZCLEdBQTdCLEdBQW1DLEtBQUssTUFBTCxDQUFZLEdBQS9DLEdBQXFELEtBQUssTUFBTCxDQUFZLE1BQS9FO0FBQ0EsUUFBSyxNQUFMLEdBQWMsS0FBSyxHQUFMLENBQVMsS0FBSyxLQUFkLEVBQW9CLEtBQUssTUFBekIsSUFBbUMsQ0FBakQ7QUFDQSxRQUFLLElBQUwsR0FBWSxhQUFhLElBQXpCO0FBQ0EsUUFBSyxVQUFMLEdBQWtCLGFBQWEsVUFBL0I7O0FBRUEsUUFBSyxHQUFMLEdBQVcsR0FBRyxHQUFILEdBQ1IsV0FEUSxDQUNJLEtBQUssTUFEVCxFQUVSLFdBRlEsQ0FFSSxLQUFLLE1BQUwsR0FBYyxHQUZsQixFQUdSLFVBSFEsQ0FHRyxDQUhILENBQVg7O0FBS0EsUUFBSyxHQUFMLEdBQVcsR0FBRyxNQUFILENBQVUsYUFBYSxTQUF2QixFQUNOLE1BRE0sQ0FDQyxLQURELEVBRU4sSUFGTSxDQUVELE9BRkMsRUFFUSxNQUZSLEVBR04sSUFITSxDQUdELE9BSEMsRUFHTyw0QkFIUCxFQUlOLElBSk0sQ0FJRCxTQUpDLEVBSVMsS0FKVCxFQUtOLElBTE0sQ0FLRCxTQUxDLEVBS1UsT0FMVixFQU1OLE1BTk0sQ0FNQyxHQU5ELEVBT04sSUFQTSxDQU9ELFdBUEMsRUFPWSxlQUFlLEtBQUssTUFBTCxDQUFZLElBQTNCLEdBQWtDLEdBQWxDLEdBQXdDLEtBQUssTUFBTCxDQUFZLEdBQXBELEdBQTBELEdBUHRFLENBQVg7O0FBU0gsUUFBSyxHQUFMLENBQVMsTUFBVCxDQUFnQixNQUFoQixFQUNRLE9BRFIsQ0FDZ0IsWUFEaEIsRUFDNkIsSUFEN0IsRUFFUSxLQUZSLENBRWMsRUFBQyxVQUFVLEdBQVgsRUFGZCxFQUdRLElBSFIsQ0FHYSxHQUhiLEVBR2tCLEtBQUssR0FIdkIsRUFJUSxJQUpSLENBSWEsV0FKYixFQUkwQixlQUFlLEtBQUssS0FBTCxHQUFhLENBQTVCLEdBQWdDLEdBQWhDLEdBQXNDLEtBQUssTUFBTCxHQUFjLENBQXBELEdBQXdELEdBSmxGOztBQU1HLFFBQUssVUFBTCxHQUFrQixLQUFLLEdBQUwsQ0FBUyxNQUFULENBQWdCLE1BQWhCLEVBQ2IsS0FEYSxDQUNQLEVBQUMsVUFBVSxHQUFYLEVBRE8sRUFFYixPQUZhLENBRUwsWUFGSyxFQUVRLElBRlIsRUFHYixJQUhhLENBR1IsV0FIUSxFQUdLLGVBQWUsS0FBSyxLQUFMLEdBQWEsQ0FBNUIsR0FBZ0MsR0FBaEMsR0FBc0MsS0FBSyxNQUFMLEdBQWMsQ0FBcEQsR0FBd0QsR0FIN0QsRUFJYixJQUphLENBSVIsR0FKUSxFQUlILEtBQUssR0FKRixDQUFsQjs7QUFNQSxRQUFLLE1BQUwsQ0FBWSxJQUFaOztBQUVBOzs7Ozs7QUFPSCxHQS9DYTtBQWdEZCxRQWhEYyxrQkFnRFAsYUFoRE8sRUFnRFEsV0FoRFIsRUFnRG9CO0FBQUE7O0FBQ2pDLE9BQUksS0FBSjtBQUFBLE9BQ0MsWUFERDtBQUFBLE9BRUMsaUJBQWlCLENBRmxCO0FBR0EsT0FBSyxhQUFMLEVBQW9CO0FBQ25CLFlBQVEsS0FBSyxJQUFMLENBQVUsTUFBbEI7QUFDQSxTQUFLLElBQUwsQ0FBVSxPQUFWLENBQWtCLGdCQUFRO0FBQ3pCLFNBQUssTUFBSyxVQUFMLENBQWdCLElBQWhCLENBQUwsRUFBNEI7QUFDM0I7QUFDQTtBQUNELEtBSkQ7QUFLQSxJQVBELE1BT087QUFDTixZQUFRLEdBQVIsQ0FBWSxLQUFLLElBQWpCO0FBQ0EsbUJBQWUsS0FBSyxJQUFMLENBQVUsTUFBVixDQUFpQjtBQUFBLFlBQVEsWUFBWSxHQUFaLENBQWdCLEtBQUssVUFBTCxDQUFnQixFQUFoQyxDQUFSO0FBQUEsS0FBakIsQ0FBZjtBQUNBLFlBQVEsYUFBYSxNQUFyQjtBQUNBLGlCQUFhLE9BQWIsQ0FBcUIsZ0JBQVE7QUFDNUIsU0FBSyxNQUFLLFVBQUwsQ0FBZ0IsSUFBaEIsQ0FBTCxFQUE0QjtBQUMzQjtBQUNBO0FBQ0QsS0FKRDtBQUtBO0FBQ0QsT0FBSSxXQUFZLGlCQUFpQixLQUFsQixHQUEyQixHQUExQzs7QUFFQSxRQUFLLFVBQUwsQ0FDRSxVQURGLEdBQ2UsUUFEZixDQUN3QixHQUR4QixFQUVFLFNBRkYsQ0FFWSxHQUZaLEVBRWlCLEtBQUssUUFBTCxDQUFjLFFBQWQsQ0FGakI7QUFJQSxHQTNFYTtBQTRFZCxVQTVFYyxvQkE0RUwsUUE1RUssRUE0RUs7QUFBQTs7QUFBRTtBQUN2QixVQUFPLGFBQUs7QUFDUixRQUFJLGNBQWMsR0FBRyxXQUFILENBQWUsRUFBRSxRQUFqQixFQUEyQixRQUEzQixDQUFsQjtBQUNBLFdBQU8sYUFBSztBQUNWLE9BQUUsUUFBRixHQUFhLFlBQVksQ0FBWixDQUFiO0FBQ0MsWUFBTyxPQUFLLEdBQUwsQ0FBUyxDQUFULENBQVA7QUFDRixLQUhEO0FBSUgsSUFORDtBQU9BO0FBcEZnQixFQUFsQjs7QUF1RkEsUUFBTztBQUNOO0FBRE0sRUFBUDtBQUdBLENBL0dzQixFQUFoQjs7Ozs7QUNBUCxJQUFNLFdBQVc7QUFDYixjQUFVLEVBREc7QUFFYixzQkFGYSw4QkFFTSxhQUZOLEVBRW9CLGlCQUZwQixFQUVzQztBQUFBOztBQUFFO0FBQ2pELFlBQUksYUFBYSxjQUFjLElBQS9CO0FBQ0EsaUJBQVMsUUFBVCxDQUFrQixjQUFjLElBQWhDLElBQXdDLElBQUksT0FBSixDQUFZLFVBQUMsT0FBRCxFQUFhO0FBQUU7QUFDL0QsbUJBQU8sY0FBYyxJQUFyQjtBQUNBLHFCQUFTLGVBQVQsR0FBMEI7QUFDdEIsb0JBQUssS0FBSyxTQUFMLENBQWUsVUFBZixDQUFMLEVBQWlDO0FBQUU7QUFDL0IsNEJBQVEsSUFBUjtBQUNBLHlCQUFLLEdBQUwsQ0FBUyxRQUFULEVBQW1CLGVBQW5CLEVBRjZCLENBRVE7QUFDeEM7QUFDSjtBQUNELGtCQUFLLEVBQUwsQ0FBUSxRQUFSLEVBQWtCLGVBQWxCO0FBQ0Esa0JBQUssU0FBTCxDQUFlLFVBQWYsRUFBMkIsYUFBM0I7QUFDSCxTQVZ1QyxDQUF4QztBQVdBLFlBQUksZ0JBQWdCLEVBQXBCO0FBQ0EsZUFBTyxTQUFTLFFBQVQsQ0FBa0IsVUFBbEIsRUFBOEIsSUFBOUIsQ0FBbUMsWUFBTTtBQUM1Qyw4QkFBa0IsT0FBbEIsQ0FBMEIsVUFBQyxJQUFELEVBQVU7QUFDaEMsOEJBQWMsSUFBZCxDQUNJLElBQUksT0FBSixDQUFZLFVBQUMsT0FBRCxFQUFhO0FBQUU7QUFDdkIsd0JBQUksY0FBYyxLQUFLLFdBQUwsR0FBbUIsS0FBSyxXQUF4QixHQUFzQyxFQUF4RDtBQUNBLDJCQUFPLEtBQUssV0FBWjtBQUNBLHlCQUFLLE1BQUwsR0FBYyxVQUFkO0FBQ0EsNkJBQVMsZ0JBQVQsR0FBMkI7QUFDdkIsNEJBQUssS0FBSyxRQUFMLENBQWMsS0FBSyxFQUFuQixDQUFMLEVBQTZCO0FBQUU7QUFDM0Isb0NBQVEsSUFBUjtBQUNBLGlDQUFLLEdBQUwsQ0FBUyxRQUFULEVBQW1CLGdCQUFuQixFQUZ5QixDQUVhO0FBQ3pDO0FBQ0o7QUFDRCwwQkFBSyxFQUFMLENBQVEsUUFBUixFQUFrQixnQkFBbEI7QUFDQSwwQkFBSyxRQUFMLENBQWMsSUFBZCxFQUFvQixXQUFwQjtBQUNILGlCQVpELENBREo7QUFlSCxhQWhCRDtBQWlCQSxtQkFBTyxRQUFRLEdBQVIsQ0FBWSxhQUFaLENBQVA7QUFDSCxTQW5CTSxDQUFQO0FBb0JIO0FBcENZLENBQWpCOztBQXVDQSxRQUFRLGtCQUFSLEdBQTZCLFNBQVMsa0JBQXRDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc31yZXR1cm4gZX0pKCkiLCIgLyogZXhwb3J0ZWQgQ2hhcnRzICovXG4gaW1wb3J0IHsgQ2hhcnRzIH0gZnJvbSAnLi4vanMtZXhwb3J0cy9DaGFydHMnO1xuIC8qIHBvbHlmaWxscyBuZWVkZWQ6IFByb21pc2UgVE8gRE86IE9USEVSUz9cbiAqL1xuLypcbmltcG9ydCB7IHJlZmxlY3QsIGFycmF5RmluZCwgU1ZHSW5uZXJIVE1MLCBTVkdGb2N1cyB9IGZyb20gJy4uL2pzLXZlbmRvci9wb2x5ZmlsbHMnO1xuaW1wb3J0IHsgSGVscGVycyB9IGZyb20gJy4uL2pzLWV4cG9ydHMvSGVscGVycyc7XG5pbXBvcnQgeyBkM1RpcCB9IGZyb20gJy4uL2pzLXZlbmRvci9kMy10aXAnO1xuaW1wb3J0IHsgY3JlYXRlQnJvd3NlQnV0dG9uIH0gZnJvbSAnLi4vanMtZXhwb3J0cy9Ccm93c2VCdXR0b25zJztcbmltcG9ydCB7IGNyZWF0ZVJlc3VsdEl0ZW0gfSBmcm9tICcuLi9qcy1leHBvcnRzL1Jlc3VsdEl0ZW1zJzsgXG4qL1xuICBcbi8qXG50byBkbyA6IHNlZSBhbHNvIGh0dHBzOi8vd3d3Lm1hcGJveC5jb20vbWFwYm94LWdsLWpzL2V4YW1wbGUvaGVhdG1hcC1sYXllci9cblxuXG4qL1xud2luZG93LnRoZU1hcCAgPSAoZnVuY3Rpb24oKXsgICBcblwidXNlIHN0cmljdFwiO1xuXHRjb25zb2xlLmxvZyhDaGFydHMpOyAgXG4gICAgbWFwYm94Z2wuYWNjZXNzVG9rZW4gPSAncGsuZXlKMUlqb2liM04wWlhKdFlXNXFJaXdpWVNJNkltTnBkblU1ZEhWbmRqQTJlRFl5YjNBM05uZzFjR0ozWlhvaWZRLlhvX2sta3pHZllYX1lvX1JEY0hEQmcnO1xuXG4gICAgY29uc3QgbWJIZWxwZXIgPSByZXF1aXJlKCdtYXBib3gtaGVscGVyJyk7XG4gICBcdGNvbnN0IHRoZUNoYXJ0cyA9IFtdO1xuICAgIHZhciBnZW9qc29uO1xuICAgIHZhciBnYXRlQ2hlY2sgPSAwO1xuICAgIFxuICAgIHZhciB0aGVNYXAgPSBuZXcgbWFwYm94Z2wuTWFwKHtcblx0ICAgIGNvbnRhaW5lcjogJ21hcCcsXG5cdCAgICBzdHlsZTogJ21hcGJveDovL3N0eWxlcy9vc3Rlcm1hbmovY2pmMDNvMzdiM3R2ZTJycXAyaW53NmExZicsXG5cdCAgICBjZW50ZXI6IFstOTYuMjkxOTI5NjExMjk4ODMsIDM4LjQ1MzE3NTI4OTA1Mzc0Nl0sXG5cdCAgICB6b29tOiAzLFxuXHQgICAgbWF4Qm91bmRzOiBbWy0xNDIuODg3MDU3MTQ3NDYzNjIsIDE2LjA1ODM0NDk0ODQzMjQwNl0sWy01MS45MDIzMDE3ODY5NzMxLDU1Ljc2NjkwMDY3NDE3MTM4XV0sXG5cdCAgICBtaW5ab29tOiAzLFxuXHQgICAgYXR0cmlidXRpb25Db250cm9sOiBmYWxzZSxcblx0fSk7XG5cblx0dmFyIG5hdiA9IG5ldyBtYXBib3hnbC5OYXZpZ2F0aW9uQ29udHJvbCh7c2hvd0NvbXBhc3M6ZmFsc2V9KTtcblx0dGhlTWFwLmFkZENvbnRyb2wobmF2LCAndG9wLWxlZnQnKTtcblxuXHR0b0dlb0pTT04oJ3BvbGljaWVzLmNzdicpO1xuXG5cdHRoZU1hcC5vbignbG9hZCcsIGZ1bmN0aW9uKCl7XG5cdFx0Z2F0ZUNoZWNrKys7XG5cdFx0Z2F0ZSgpO1xuXHR9KTtcblx0ZnVuY3Rpb24gZ2F0ZSgpe1xuXHRcdGlmICggZ2F0ZUNoZWNrIDwgMiApe1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRhZGRVbmNsdXN0ZXJlZCgpO1xuXHRcdGFkZENsdXN0ZXJlZCgpO1xuXHRcdGZlYXR1cmVzSW5WaWV3LnJlbmRlcigpO1xuXHR9IC8vIGVuZCBnYXRlXG5cblx0ZnVuY3Rpb24gYWRkVW5jbHVzdGVyZWQoKXtcblx0XHRyZXR1cm4gbWJIZWxwZXIuYWRkU291cmNlQW5kTGF5ZXJzLmNhbGwodGhlTWFwLFxuXHRcdFx0eyAvLyBzb3VyY2Vcblx0XHRcdFx0XCJuYW1lXCI6IFwicG9saWN5LXBvaW50c1wiLFxuXHRcdCAgICAgICAgXCJ0eXBlXCI6IFwiZ2VvanNvblwiLFxuXHRcdCAgICAgICAgXCJkYXRhXCI6IGdlb2pzb25cblx0XHRcdH0sIFsgLy8gbGF5ZXJzXG5cdFx0XHRcdHsgLy8gbGF5ZXIgb25lXG5cdCAgICAgICAgICAgIFwiaWRcIjogXCJwb2ludHNcIixcblx0ICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY2lyY2xlXCIsXG5cdCAgICAgICAgICAgIFwic291cmNlXCI6IFwicG9saWN5LXBvaW50c1wiLFxuXHQgICAgICAgICAgICBcIm1heHpvb21cIjogOSxcblx0ICAgICAgICAgICAgXCJwYWludFwiOiB7XG5cdCAgICAgICAgICAgICAgXHRcImNpcmNsZS1jb2xvclwiOiBbXG5cdFx0ICAgICAgICAgICAgICAgICdtYXRjaCcsXG5cdFx0ICAgICAgICAgICAgICAgIFsnZ2V0JywgJ3RfZGVkJ10sXG5cdFx0ICAgICAgICAgICAgICAgIDUsICcjMDUxODM5Jyxcblx0XHQgICAgICAgICAgICAgICAgLyogb3RoZXIgKi8gJyM5OTAwMDAnXG5cdFx0ICAgICAgICAgICAgXSxcblx0XHQgICAgICAgICAgICBcImNpcmNsZS1yYWRpdXNcIjoge1xuXHRcdCAgICAgICAgICAgICAgICAnc3RvcHMnOiBbWzUsIDNdLCBbOCwgMThdXVxuXHRcdCAgICAgICAgICAgIH0sXG5cdFx0ICAgICAgICAgICAgXCJjaXJjbGUtb3BhY2l0eVwiOiAwLjFcblx0XHQgICAgICAgICAgICB9XG5cdFx0ICAgICAgICB9LFxuXHRcdCAgICAgICAgeyAvLyBsYXllciB0d29cblx0ICAgICAgICAgICAgXCJpZFwiOiBcInBvaW50cy1kYXRhLWRyaXZlblwiLFxuXHQgICAgICAgICAgICBcInR5cGVcIjogXCJjaXJjbGVcIixcblx0ICAgICAgICAgICAgXCJzb3VyY2VcIjogXCJwb2xpY3ktcG9pbnRzXCIsXG5cdCAgICAgICAgICAgIFwibWluem9vbVwiOiA5LFxuXHQgICAgICAgICAgICBcInBhaW50XCI6IHtcblx0ICAgICAgICAgICAgICBcdFwiY2lyY2xlLWNvbG9yXCI6IFtcblx0XHQgICAgICAgICAgICAgICAgJ21hdGNoJyxcblx0XHQgICAgICAgICAgICAgICAgWydnZXQnLCAndF9kZWQnXSxcblx0XHQgICAgICAgICAgICAgICAgNSwgJyMwNTE4MzknLFxuXHRcdCAgICAgICAgICAgICAgICAvKiBvdGhlciAqLyAnIzk5MDAwMCdcblx0XHQgICAgICAgICAgICBdLFxuXHRcdCAgICAgICAgICAgIFwiY2lyY2xlLXJhZGl1c1wiOiB7XG5cdFx0ICAgICAgICAgICAgXHRwcm9wZXJ0eTogJ3ByZW0nLFxuXHRcdCAgICAgICAgICAgICAgICB0eXBlOiAnZXhwb25lbnRpYWwnLFxuXHRcdFx0XHQgICAgICAgIHN0b3BzOiBbXG5cdFx0XHRcdCAgICAgICAgICBbNjIsIDVdLFxuXHRcdFx0XHQgICAgICAgICAgWzI1MDAsIDYwXVxuXHRcdFx0XHQgICAgICAgIF1cblx0XHQgICAgICAgICAgICB9LFxuXHRcdCAgICAgICAgICAgIFwiY2lyY2xlLW9wYWNpdHlcIjogMC4xLFxuXHRcdCAgICAgICAgICAgIFwiY2lyY2xlLXN0cm9rZS1jb2xvclwiOiBcIiNmZmZmZmZcIixcblx0XHQgICAgICAgICAgICBcImNpcmNsZS1zdHJva2Utd2lkdGhcIjogMVxuXHRcdCAgICAgICAgfVxuXHRcdFx0fV1cblx0XHQpOyBcblx0fVxuXG5cdC8qZnVuY3Rpb24gY2hlY2tGZWF0dXJlcygpe1xuXHRcdHZhciBmZWF0dXJlcztcblx0XHRpZiAoIHRoZU1hcC5sb2FkZWQoKSl7XG5cdFx0XHRmZWF0dXJlcyA9IHRoZU1hcC5xdWVyeVJlbmRlcmVkRmVhdHVyZXMoe2xheWVyczpbJ3BvaW50cyddfSk7XG5cdFx0XHRjb25zb2xlLmxvZyhmZWF0dXJlcyk7XG5cdFx0XHR0aGVNYXAub2ZmKCdyZW5kZXInLCBjaGVja0ZlYXR1cmVzKTtcblx0XHR9XG5cdH0qL1xuXHRmdW5jdGlvbiBhZGRDbHVzdGVyZWQoKXtcblx0XHRcblx0XHRtYkhlbHBlci5hZGRTb3VyY2VBbmRMYXllcnMuY2FsbCh0aGVNYXAsXG5cdFx0ICAgIHsgLy8gc291cmNlXG5cdFx0ICAgIFx0XCJuYW1lXCI6IFwicG9saWNpZXNcIixcblx0XHQgICAgICAgIFwidHlwZVwiOiBcImdlb2pzb25cIixcblx0XHQgICAgICAgIFwiZGF0YVwiOiBnZW9qc29uLFxuXHRcdCAgICAgICAgXCJjbHVzdGVyXCI6IHRydWUsXG5cdFx0ICAgICAgICBcImNsdXN0ZXJSYWRpdXNcIjogMC41IC8vIFJhZGl1cyBvZiBlYWNoIGNsdXN0ZXIgd2hlbiBjbHVzdGVyaW5nIHBvaW50cyAoZGVmYXVsdHMgdG8gNTApXG5cdFx0ICAgIH0sIFsgLy8gbGF5ZXJzXG5cdFx0ICAgICAgIHsgLy8gbGF5ZXIgb25lXG5cdFx0ICAgICAgICAgICAgaWQ6IFwiY2x1c3Rlci1jb3VudFwiLFxuXHRcdFx0ICAgICAgICB0eXBlOiBcInN5bWJvbFwiLFxuXHRcdFx0ICAgICAgICBzb3VyY2U6IFwicG9saWNpZXNcIixcblx0XHRcdCAgICAgICAgZmlsdGVyOiBbXCJoYXNcIiwgXCJwb2ludF9jb3VudFwiXSxcblx0XHRcdCAgICAgICAgXCJtaW56b29tXCI6IDYsXG5cdFx0XHQgICAgICAgIGxheW91dDoge1xuXHRcdFx0ICAgICAgICAgICAgXCJ0ZXh0LWZpZWxkXCI6IFwie3BvaW50X2NvdW50X2FiYnJldmlhdGVkfVwiLFxuXHRcdFx0ICAgICAgICAgICAgXCJ0ZXh0LXNpemVcIjogMTIsXG5cblx0XHRcdCAgICAgICAgfSxcblx0XHRcdCAgICAgICAgXCJwYWludFwiOiB7XG5cdFx0XHQgICAgICAgIFx0XCJ0ZXh0LWNvbG9yXCI6IFwiI2ZmZmZmZlwiXG5cdFx0XHQgICAgICAgIH1cblx0XHQgICAgICAgIH1cblx0ICAgICAgICBdIC8vIGVuZCBsYXllcnMgYXJyYXlcblx0ICAgICk7IC8vIGVuZCBhZGRsYXllcnNcblx0fSAvLyBlbmQgYWRkQ2x1c3RlcmVkXG5cdGZ1bmN0aW9uIHRvR2VvSlNPTih1cmwpe1xuXHRcdFxuXHRcdGQzLmNzdih1cmwsIGZ1bmN0aW9uKGVyciwgZGF0YSl7XG5cdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdHRocm93IGVycjtcblx0XHRcdH1cblx0XHRcdC8vY29uc29sZS5sb2coZGF0YSk7XG5cdFx0XHR2YXIgZmVhdHVyZXMgPSBbXTsgXG5cdFx0XHRkYXRhLmZvckVhY2goZWFjaCA9PiB7XG5cdFx0XHRcdHZhciBjb2VyY2VkID0ge307XG5cdFx0XHRcdGZvciAoIHZhciBrZXkgaW4gZWFjaCApIHtcblx0XHRcdFx0XHRpZiAoIGVhY2guaGFzT3duUHJvcGVydHkoa2V5KSApe1xuXHRcdFx0XHRcdFx0Y29lcmNlZFtrZXldID0gIWlzTmFOKCtlYWNoW2tleV0pID8gK2VhY2hba2V5XSA6IGVhY2hba2V5XTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gIFxuXHRcdFx0XHRmZWF0dXJlcy5wdXNoKHtcblx0XHRcdFx0XHRcInR5cGVcIjogXCJGZWF0dXJlXCIsXG5cdFx0XHRcdFx0XCJwcm9wZXJ0aWVzXCI6IGNvZXJjZWQsXG5cdFx0XHRcdFx0XCJnZW9tZXRyeVwiOiB7XG5cdFx0XHRcdFx0XHRcInR5cGVcIjogXCJQb2ludFwiLFxuXHRcdFx0XHRcdFx0XCJjb29yZGluYXRlc1wiOiBbK2VhY2gubG9uZ2l0dWRlLCArZWFjaC5sYXRpdHVkZV1cblx0XHRcdFx0XHR9ICAgXG5cdFx0XHRcdH0pO1xuXHRcdFx0fSk7IC8vIGVuZCBmb3JFYWNoXG5cdFx0XHRnZW9qc29uID0gIHtcblx0XHRcdFx0XCJ0eXBlXCI6IFwiRmVhdHVyZUNvbGxlY3Rpb25cIixcblx0XHRcdFx0XCJmZWF0dXJlc1wiOiBmZWF0dXJlc1xuXHRcdFx0fTtcblx0XHRcdGdhdGVDaGVjaysrOyAgXG5cdFx0XHRnYXRlKCk7XG5cdFx0XHQvL2FkZENsdXN0ZXJMYXllcnMocnRuKTtcblx0XHRcdFxuXHRcdFx0dGhlQ2hhcnRzLnB1c2goXG5cdFx0XHRcdG5ldyBDaGFydHMuRG9udXQoe1xuXHRcdFx0XHRcdG1hcmdpbjogeyAvLyBwZXJjZW50YWdlc1xuXHRcdCAgICAgICAgICAgICAgICB0b3A6IDE1LFxuXHRcdCAgICAgICAgICAgICAgICByaWdodDogMTAsXG5cdFx0ICAgICAgICAgICAgICAgIGJvdHRvbTogNSxcblx0XHQgICAgICAgICAgICAgICAgbGVmdDogMTBcblx0XHQgICAgICAgICAgICB9LFxuXHRcdCAgICAgICAgICAgIGhlaWdodFRvV2lkdGg6IDEsXG5cdFx0ICAgICAgICAgICAgY29udGFpbmVyOiAnI2NoYXJ0LTAnLFxuXHRcdCAgICAgICAgICAgIGRhdGE6IGdlb2pzb24uZmVhdHVyZXMsXG5cdFx0ICAgICAgICAgICAgY29tcGFyYXRvcjogZnVuY3Rpb24oZWFjaCl7XG5cdFx0ICAgICAgICAgICAgXHRyZXR1cm4gZWFjaC5wcm9wZXJ0aWVzLnRfZGVkIDwgNTtcblx0XHQgICAgICAgICAgICB9XG5cdFx0XHRcdH0pXG5cdFx0XHQpO1xuXHRcdH0pOyAvLyBlbmQgZDMgY3N2XG5cdH0gLy8gZW5kIHRvR2VvSlNPTlxuXHR2YXIgZmVhdHVyZXNJblZpZXcgPSB7XG5cdFx0cmVuZGVyKCl7XG5cdFx0XHR0aGlzLnRvdGFsID0gZ2VvanNvbi5mZWF0dXJlcy5sZW5ndGg7XG5cdFx0XHR0aGlzLnN2ZyA9IGQzLnNlbGVjdCgnI3RvdGFsLXZpZXcnKVxuXHRcdFx0XHQuYXBwZW5kKCdzdmcnKVxuXHRcdFx0XHQuYXR0cignd2lkdGgnLCAnMTAwJScpXG5cdCAgICAgICAgICAgIC5hdHRyKCd4bWxucycsJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3ZlcnNpb24nLCcxLjEnKSBcblx0ICAgICAgICAgICAgLmF0dHIoJ3ZpZXdCb3gnLCAnMCAwIDEwMCAzJyk7XG5cblx0ICAgICAgICB0aGlzLmJhY2tncm91bmQgPSB0aGlzLnN2Zy5hcHBlbmQoJ2xpbmUnKVxuXHQgICAgICAgIFx0LmNsYXNzZWQoJ2JhY2tncm91bmQtbGluZScsIHRydWUpXG5cdCAgICAgICAgXHQuYXR0cigneDAnLDApXG5cdCAgICAgICAgXHQuYXR0cigneTAnLDApXG5cdCAgICAgICAgXHQuYXR0cigneDEnLDEwMClcblx0ICAgICAgICBcdC5hdHRyKCd5MScsMCk7XG5cblx0ICAgICAgICB0aGlzLmxpbmUgPSB0aGlzLnN2Zy5hcHBlbmQoJ2xpbmUnKVxuXHQgICAgICAgIFx0LmNsYXNzZWQoJ3RvdGFsLWxpbmUnLCB0cnVlKVxuXHQgICAgICAgIFx0LmF0dHIoJ3gwJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kwJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3gxJywwKVxuXHQgICAgICAgIFx0LmF0dHIoJ3kxJywwKTtcblxuXHQgICAgICAgIHRoaXMudGV4dCA9IGQzLnNlbGVjdCgnI3RvdGFsLXZpZXcnKVxuXHQgICAgICAgIFx0LmFwcGVuZCgnc3BhbicpXG5cdCAgICAgICAgXHQudGV4dCgoKSA9PiBgJHtkMy5mb3JtYXQoXCIsXCIpKHRoaXMudG90YWwpfSBvZiAke2QzLmZvcm1hdChcIixcIikodGhpcy50b3RhbCl9IGluIHZpZXdgICk7XG5cdCAgICAgICAgXHRcblxuXHRcdFx0dGhpcy51cGRhdGUoY291bnRGZWF0dXJlcygpKTtcblx0XHR9LFxuXHRcdHVwZGF0ZShuKXtcblx0XHRcdC8qZDMuc2VsZWN0KCcjdG90YWwtaW4tdmlldycpXG5cdFx0XHRcdC50ZXh0KCgpID0+IGQzLmZvcm1hdChcIixcIikobikgKyAnIG9mICcgKyBkMy5mb3JtYXQoXCIsXCIpKHRoaXMudG90YWwpICsgJyBwcm9wZXJ0aWVzIGluIHZpZXcnKTsqL1xuXHRcdFx0dGhpcy5saW5lXG5cdFx0XHRcdC50cmFuc2l0aW9uKCkuZHVyYXRpb24oMjAwKVxuXHRcdFx0XHQuYXR0cigneDEnLCAoKSA9PiAoIG4gLyB0aGlzLnRvdGFsKSAqIDEwMCApO1xuXHRcdFx0dGhpcy50ZXh0XG5cdFx0XHRcdC50ZXh0KCgpID0+IGAke2QzLmZvcm1hdChcIixcIikobil9IG9mICR7ZDMuZm9ybWF0KFwiLFwiKSh0aGlzLnRvdGFsKX0gaW4gdmlld2AgKTtcblxuXHRcdH1cblx0fTtcblx0XG5cdHZhciBtYXRjaGluZ0lEcyA9IG5ldyBTZXQoKTtcblx0ZnVuY3Rpb24gY291bnRGZWF0dXJlcygpe1xuXHRcdC8qIGpzaGludCBsYXhicmVhazp0cnVlICovXG5cdFx0bWF0Y2hpbmdJRHMuY2xlYXIoKTtcblx0XHQvL3ZhciBjb3VudCA9IDA7XG5cdFx0dmFyIGJvdW5kcyA9IHRoZU1hcC5nZXRCb3VuZHMoKTtcblx0XHRnZW9qc29uLmZlYXR1cmVzLmZvckVhY2goZWFjaCA9PiB7XG5cdFx0XHRpZiAoICAgIGVhY2gucHJvcGVydGllcy5sb25naXR1ZGUgPj0gYm91bmRzLl9zdy5sbmcgXG5cdFx0XHRcdCAmJiBlYWNoLnByb3BlcnRpZXMubG9uZ2l0dWRlIDw9IGJvdW5kcy5fbmUubG5nIFxuXHRcdFx0XHQgJiYgZWFjaC5wcm9wZXJ0aWVzLmxhdGl0dWRlICA+PSBib3VuZHMuX3N3LmxhdCBcblx0XHRcdFx0ICYmIGVhY2gucHJvcGVydGllcy5sYXRpdHVkZSAgPD0gYm91bmRzLl9uZS5sYXQgKXtcblx0XHRcdFx0bWF0Y2hpbmdJRHMuYWRkKGVhY2gucHJvcGVydGllcy5pZCk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0Y29uc29sZS5sb2cobWF0Y2hpbmdJRHMpO1xuXHRcdHJldHVybiBtYXRjaGluZ0lEcy5zaXplO1xuXHR9XG5cdHRoZU1hcC5vbignbW92ZWVuZCcsIGZ1bmN0aW9uKCl7XG5cdFx0dXBkYXRlQWxsKCk7XG5cdH0pO1xuXHR0aGVNYXAub24oJ3pvb21lbmQnLCBmdW5jdGlvbigpe1xuXHRcdHVwZGF0ZUFsbCgpO1xuXHR9KTtcblx0ZnVuY3Rpb24gdXBkYXRlQWxsKCl7XG5cdFx0ZmVhdHVyZXNJblZpZXcudXBkYXRlKGNvdW50RmVhdHVyZXMoKSk7XG5cdFx0dGhlQ2hhcnRzLmZvckVhY2goZWFjaCA9PiBlYWNoLnVwZGF0ZShmYWxzZSwgbWF0Y2hpbmdJRHMpKTtcblx0fVxuXHQvKnRoZU1hcC5vbihcIm1vdXNlbW92ZVwiLCBcInBvaW50cy1kYXRhLWRyaXZlblwiLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGUpO1xuICAgIH0pOyovXG5cblx0cmV0dXJuIHRoZU1hcDtcbiAgIFxufSgpKTsgLy8gZW5kIElJRkUgIiwiZXhwb3J0IGNvbnN0IENoYXJ0cyA9IChmdW5jdGlvbigpe1xuICAgIC8qIGdsb2JhbHMgZDMgKi9cbiAgIC8qIGNvbnN0IG1lZGlhbkluY29tZXMgPSBuZXcgTWFwKCk7XG4gICAgZnVuY3Rpb24gY3JlYXRlTWVkaWFuSW5jb21lTWFwKGdlb2pzb24pe1xuXHRcdGdlb2pzb24uZmVhdHVyZXMuZm9yRWFjaChlYWNoID0+IHtcblx0XHRcdGlmICggIW1lZGlhbkluY29tZXMuaGFzKGVhY2gucHJvcGVydGllcy5jZW5fdHJhY3QpICl7XG5cdFx0XHRcdGxldCBpbmNvbWUgPSBlYWNoLnByb3BlcnRpZXMubWVkX2luY29tZSA+IDAgPyBlYWNoLnByb3BlcnRpZXMubWVkX2luY29tZSA6IG51bGw7XG5cdFx0XHRcdG1lZGlhbkluY29tZXMuc2V0KGVhY2gucHJvcGVydGllcy5jZW5fdHJhY3QsIGluY29tZSk7IFx0XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0Y29uc29sZS5sb2cobWVkaWFuSW5jb21lcyk7XG5cdFx0d2luZG93Lm1lZGlhbkluY29tZXMgPSBtZWRpYW5JbmNvbWVzO1xuXHRcdC8vY3JlYXRlQ2hhcnRzKGdlb2pzb24pO1xuXHR9ICovXG5cdFxuICAgIHZhciB0YXUgPSAyICogTWF0aC5QSTtcblx0dmFyIERvbnV0ID0gZnVuY3Rpb24oY29uZmlnT2JqZWN0KXsgLy8gbWFyZ2lucyB7fSwgaGVpZ2h0ICMsIHdpZHRoICMsIGNvbnRhaW5lcklELCBkYXRhUGF0aFxuXHQgICAgY29uc29sZS5sb2codGhpcywgY29uZmlnT2JqZWN0KTtcblx0ICAgIHRoaXMuc2V0dXAoY29uZmlnT2JqZWN0KTtcblx0fTtcblxuXHREb251dC5wcm90b3R5cGUgPSB7XG5cblx0ICAgIHNldHVwKGNvbmZpZ09iamVjdCl7XG5cdCAgICBcdGNvbnNvbGUubG9nKCdpbiBzZXQgdXAnKTtcblx0ICAgICAgICB2YXIgdmlld0JveCA9ICcwIDAgMTAwICcgKyBNYXRoLnJvdW5kKGNvbmZpZ09iamVjdC5oZWlnaHRUb1dpZHRoICogMTAwKTtcblx0ICAgICAgICB0aGlzLm1hcmdpbiA9IGNvbmZpZ09iamVjdC5tYXJnaW47XG5cdCAgICAgICAgdGhpcy53aWR0aCA9IDEwMCAtIHRoaXMubWFyZ2luLmxlZnQgLSB0aGlzLm1hcmdpbi5yaWdodDtcblx0ICAgICAgICB0aGlzLmhlaWdodCA9IGNvbmZpZ09iamVjdC5oZWlnaHRUb1dpZHRoICogMTAwIC0gdGhpcy5tYXJnaW4udG9wIC0gdGhpcy5tYXJnaW4uYm90dG9tO1xuXHQgICAgICAgIHRoaXMucmFkaXVzID0gTWF0aC5taW4odGhpcy53aWR0aCx0aGlzLmhlaWdodCkgLyAzO1xuXHQgICAgICAgIHRoaXMuZGF0YSA9IGNvbmZpZ09iamVjdC5kYXRhO1xuXHQgICAgICAgIHRoaXMuY29tcGFyYXRvciA9IGNvbmZpZ09iamVjdC5jb21wYXJhdG9yO1xuXHQgICAgICBcblx0ICAgICAgICB0aGlzLmFyYyA9IGQzLmFyYygpXG5cdCAgICAgICAgICAub3V0ZXJSYWRpdXModGhpcy5yYWRpdXMpIFxuXHQgICAgICAgICAgLmlubmVyUmFkaXVzKHRoaXMucmFkaXVzIC8gMS41KVxuXHQgICAgICAgICAgLnN0YXJ0QW5nbGUoMCk7IFxuXG5cdCAgICAgICAgdGhpcy5zdmcgPSBkMy5zZWxlY3QoY29uZmlnT2JqZWN0LmNvbnRhaW5lcilcblx0ICAgICAgICAgICAgLmFwcGVuZCgnc3ZnJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3dpZHRoJywgJzEwMCUnKVxuXHQgICAgICAgICAgICAuYXR0cigneG1sbnMnLCdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZycpXG5cdCAgICAgICAgICAgIC5hdHRyKCd2ZXJzaW9uJywnMS4xJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3ZpZXdCb3gnLCB2aWV3Qm94KVxuXHQgICAgICAgICAgICAuYXBwZW5kKCdnJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIHRoaXMubWFyZ2luLmxlZnQgKyAnLCcgKyB0aGlzLm1hcmdpbi50b3AgKyAnKScpO1xuXG5cdCAgICBcdHRoaXMuc3ZnLmFwcGVuZCgncGF0aCcpXG5cdCAgICAgICAgICAgIC5jbGFzc2VkKCdiYWNrZ3JvdW5kJyx0cnVlKVxuXHQgICAgICAgICAgICAuZGF0dW0oe2VuZEFuZ2xlOiB0YXV9KVxuXHQgICAgICAgICAgICAuYXR0cignZCcsIHRoaXMuYXJjKVxuXHQgICAgICAgICAgICAuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgdGhpcy53aWR0aCAvIDIgKyAnLCcgKyB0aGlzLmhlaWdodCAvIDIgKyAnKScpO1xuXG5cdCAgICAgICAgdGhpcy5mb3JlZ3JvdW5kID0gdGhpcy5zdmcuYXBwZW5kKCdwYXRoJylcblx0ICAgICAgICAgICAgLmRhdHVtKHtlbmRBbmdsZTogdGF1fSlcblx0ICAgICAgICAgICAgLmNsYXNzZWQoJ2ZvcmVncm91bmQnLHRydWUpXG5cdCAgICAgICAgICAgIC5hdHRyKCd0cmFuc2Zvcm0nLCAndHJhbnNsYXRlKCcgKyB0aGlzLndpZHRoIC8gMiArICcsJyArIHRoaXMuaGVpZ2h0IC8gMiArICcpJylcblx0ICAgICAgICAgICAgLmF0dHIoJ2QnLCB0aGlzLmFyYyk7XG5cblx0ICAgICAgICB0aGlzLnVwZGF0ZSh0cnVlKTtcblxuXHQgICAgICAgIC8qIHRoaXMuc3ZnLmFwcGVuZChcInRleHRcIilcblx0ICAgICAgICAgICAgLmF0dHIoXCJ0ZXh0LWFuY2hvclwiLCBcIm1pZGRsZVwiKVxuXHQgICAgICAgICAgICAuYXR0cignY2xhc3MnLCdwaWVfbnVtYmVyJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3knLDUpXG5cdCAgICAgICAgICAgIC50ZXh0KGQzLmZvcm1hdChcIi4yc1wiKSh0aGlzLnZhbHVlKSlcblx0ICAgICAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIHRoaXMud2lkdGggLyAyICsgJywnICsgdGhpcy5oZWlnaHQgLyAyICsgJyknKTsqL1xuXG5cdCAgICB9LFxuXHQgICAgdXBkYXRlKGlzRmlyc3RVcGRhdGUsIG1hdGNoaW5nSURzKXtcblx0ICAgIFx0dmFyIHRvdGFsLFxuXHQgICAgXHRcdGZpbHRlcmVkRGF0YSxcblx0ICAgIFx0XHRudW1iZXJNYXRjaGluZyA9IDA7XG5cdCAgICBcdGlmICggaXNGaXJzdFVwZGF0ZSApe1xuXHQgICAgXHRcdHRvdGFsID0gdGhpcy5kYXRhLmxlbmd0aDtcblx0ICAgIFx0XHR0aGlzLmRhdGEuZm9yRWFjaChlYWNoID0+IHtcblx0ICAgIFx0XHRcdGlmICggdGhpcy5jb21wYXJhdG9yKGVhY2gpICl7XG5cdCAgICBcdFx0XHRcdG51bWJlck1hdGNoaW5nKys7XG5cdCAgICBcdFx0XHR9XG5cdCAgICBcdFx0fSk7XG5cdCAgICBcdH0gZWxzZSB7XG5cdCAgICBcdFx0Y29uc29sZS5sb2codGhpcy5kYXRhKTtcblx0ICAgIFx0XHRmaWx0ZXJlZERhdGEgPSB0aGlzLmRhdGEuZmlsdGVyKGVhY2ggPT4gbWF0Y2hpbmdJRHMuaGFzKGVhY2gucHJvcGVydGllcy5pZCkpO1xuXHQgICAgXHRcdHRvdGFsID0gZmlsdGVyZWREYXRhLmxlbmd0aDtcblx0ICAgIFx0XHRmaWx0ZXJlZERhdGEuZm9yRWFjaChlYWNoID0+IHtcblx0ICAgIFx0XHRcdGlmICggdGhpcy5jb21wYXJhdG9yKGVhY2gpICl7XG5cdCAgICBcdFx0XHRcdG51bWJlck1hdGNoaW5nKys7XG5cdCAgICBcdFx0XHR9XG5cdCAgICBcdFx0fSk7XG5cdCAgICBcdH1cblx0ICAgIFx0dmFyIGVuZEFuZ2xlID0gKG51bWJlck1hdGNoaW5nIC8gdG90YWwpICogdGF1O1xuXG5cdCAgICBcdHRoaXMuZm9yZWdyb3VuZCBcblx0ICAgIFx0XHQudHJhbnNpdGlvbigpLmR1cmF0aW9uKDUwMClcblx0ICAgIFx0XHQuYXR0clR3ZWVuKCdkJywgdGhpcy5hcmNUd2VlbihlbmRBbmdsZSkpO1xuXG5cdCAgICB9LFxuXHQgICAgYXJjVHdlZW4obmV3QW5nbGUpIHsgLy8gSFQgaHR0cDovL2JsLm9ja3Mub3JnL21ib3N0b2NrLzUxMDA2MzZcblx0XHRcdHJldHVybiBkID0+IHtcblx0XHRcdCAgICB2YXIgaW50ZXJwb2xhdGUgPSBkMy5pbnRlcnBvbGF0ZShkLmVuZEFuZ2xlLCBuZXdBbmdsZSk7XG5cdFx0XHQgICAgcmV0dXJuIHQgPT4ge1xuXHRcdFx0ICAgICAgZC5lbmRBbmdsZSA9IGludGVycG9sYXRlKHQpO1xuXHRcdFx0XHQgICAgICByZXR1cm4gdGhpcy5hcmMoZCk7XG5cdFx0XHQgICAgfTtcblx0XHRcdH07XG5cdFx0fVxuXHR9O1xuXHRcblx0cmV0dXJuIHtcblx0XHREb251dFxuXHR9O1xufSgpKTsiLCJjb25zdCBtYkhlbHBlciA9IHtcbiAgICBwcm9taXNlczoge30sXG4gICAgYWRkU291cmNlQW5kTGF5ZXJzKHNvdXJjZU9wdGlvbnMsbGF5ZXJPcHRpb25zQXJyYXkpeyAvLyB0aGlzID0gbWFwXG4gICAgICAgIHZhciBzb3VyY2VOYW1lID0gc291cmNlT3B0aW9ucy5uYW1lO1xuICAgICAgICBtYkhlbHBlci5wcm9taXNlc1tzb3VyY2VPcHRpb25zLm5hbWVdID0gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHsgLy8gVE8gRE86IGZpZ3VyZSBvdXQgcmVqZWN0P1xuICAgICAgICAgICAgZGVsZXRlIHNvdXJjZU9wdGlvbnMubmFtZTtcbiAgICAgICAgICAgIGZ1bmN0aW9uIGNoZWNrRGF0YUxvYWRlZCgpe1xuICAgICAgICAgICAgICAgIGlmICggdGhpcy5nZXRTb3VyY2Uoc291cmNlTmFtZSkgKXsgLy8gaWYgYWRkU291cmNlIGhhcyB0YWtlbiBlZmZlY3RcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vZmYoJ3JlbmRlcicsIGNoZWNrRGF0YUxvYWRlZCk7IC8vIHR1cm4gb2ZmIHRoZSBsaXN0ZW5lciBmb3IgcmVuZGVyXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5vbigncmVuZGVyJywgY2hlY2tEYXRhTG9hZGVkKTtcbiAgICAgICAgICAgIHRoaXMuYWRkU291cmNlKHNvdXJjZU5hbWUsIHNvdXJjZU9wdGlvbnMpO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGxheWVyUHJvbWlzZXMgPSBbXTtcbiAgICAgICAgcmV0dXJuIG1iSGVscGVyLnByb21pc2VzW3NvdXJjZU5hbWVdLnRoZW4oKCkgPT4geyBcbiAgICAgICAgICAgIGxheWVyT3B0aW9uc0FycmF5LmZvckVhY2goKGVhY2gpID0+IHtcbiAgICAgICAgICAgICAgICBsYXllclByb21pc2VzLnB1c2goXG4gICAgICAgICAgICAgICAgICAgIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7IC8vIFRPIERPOiBmaWd1cmUgb3V0IHJlamVjdD9cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBiZWZvcmVMYXllciA9IGVhY2guYmVmb3JlTGF5ZXIgPyBlYWNoLmJlZm9yZUxheWVyIDogJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgZWFjaC5iZWZvcmVMYXllcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVhY2guc291cmNlID0gc291cmNlTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGNoZWNrTGF5ZXJMb2FkZWQoKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIHRoaXMuZ2V0TGF5ZXIoZWFjaC5pZCkgKXsgLy8gaWYgYWRkTGF5ZXIgIGhhcyB0YWtlbiBlZmZlY3RcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vZmYoJ3JlbmRlcicsIGNoZWNrTGF5ZXJMb2FkZWQpOyAvLyB0dXJuIG9mZiB0aGUgbGlzdGVuZXIgZm9yIHJlbmRlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub24oJ3JlbmRlcicsIGNoZWNrTGF5ZXJMb2FkZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRMYXllcihlYWNoLCBiZWZvcmVMYXllcik7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKGxheWVyUHJvbWlzZXMpO1xuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG5leHBvcnRzLmFkZFNvdXJjZUFuZExheWVycyA9IG1iSGVscGVyLmFkZFNvdXJjZUFuZExheWVyczsiXX0=
