(function(){function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s}return e})()({1:[function(require,module,exports){
'use strict';

/* exported theMap, Sharc, Helpers, d3Tip, reflect, arrayFind, SVGInnerHTML, SVGFocus, createBrowseButton */ // let's jshint know that D3Charts can be "defined but not used" in this file
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

	mapboxgl.accessToken = 'pk.eyJ1Ijoib3N0ZXJtYW5qIiwiYSI6ImNpdnU5dHVndjA2eDYyb3A3Nng1cGJ3ZXoifQ.Xo_k-kzGfYX_Yo_RDcHDBg';

	var mbHelper = require('mapbox-helper');
	var medianIncomes = new Map();
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

	toGeoJSON('cen_policy-simplified-3.csv');

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
			theMap.on('render', checkFeatures);
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

	function checkFeatures() {
		var features;
		if (theMap.loaded()) {
			features = theMap.queryRenderedFeatures({ layers: ['points'] });
			console.log(features);
			theMap.off('render', checkFeatures);
		}
		/*if ( theMap.areTilesLoaded() && features.length > 0 ){
  	console.log(features);
  	theMap.off('render', checkFeatures);
  	//console.log(theMap.querySourceFeatures('policy-points',{sourceLayer:'policies'}));
  }*/
		//console.log(theMap.loaded());
	}
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
			createMedianIncomeMap();
		}); // end d3 csv
	} // end toGeoJSON
	function createMedianIncomeMap() {
		geojson.features.forEach(function (each) {
			if (!medianIncomes.has(each.properties.cen_tract)) {
				var income = each.properties.med_income > 0 ? each.properties.med_income : null;
				medianIncomes.set(each.properties.cen_tract, income);
			}
		});
		console.log(medianIncomes);
		window.medianIncomes = medianIncomes;
		createCharts(geojson);
	}
	function createCharts(geojson) {
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
	}

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
	theMap.on('moveend', function () {
		console.log('move end');
	});
	/*theMap.on("mousemove", "points-data-driven", function(e) {
        console.log(e);
    });*/

	return theMap;
}(); // end IIFE

},{"mapbox-helper":2}],2:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkZXYtanMvbWFpbi5lczYiLCJub2RlX21vZHVsZXMvbWFwYm94LWhlbHBlci9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDQUMsNEcsQ0FBNkc7QUFDN0c7O0FBRUQ7Ozs7Ozs7O0FBUUE7Ozs7O0FBS0EsT0FBTyxNQUFQLEdBQWtCLFlBQVU7QUFDNUI7O0FBQ0ksVUFBUyxXQUFULEdBQXVCLDhGQUF2Qjs7QUFFQSxLQUFNLFdBQVcsUUFBUSxlQUFSLENBQWpCO0FBQ0EsS0FBTSxnQkFBZ0IsSUFBSSxHQUFKLEVBQXRCO0FBQ0EsS0FBSSxPQUFKO0FBQ0EsS0FBSSxZQUFZLENBQWhCOztBQUVBLEtBQUksU0FBUyxJQUFJLFNBQVMsR0FBYixDQUFpQjtBQUM3QixhQUFXLEtBRGtCO0FBRTdCLFNBQU8scURBRnNCO0FBRzdCLFVBQVEsQ0FBQyxDQUFDLGlCQUFGLEVBQXFCLGtCQUFyQixDQUhxQjtBQUk3QixRQUFNLENBSnVCO0FBSzdCLGFBQVcsQ0FBQyxDQUFDLENBQUMsa0JBQUYsRUFBc0Isa0JBQXRCLENBQUQsRUFBMkMsQ0FBQyxDQUFDLGdCQUFGLEVBQW1CLGlCQUFuQixDQUEzQyxDQUxrQjtBQU03QixXQUFTLENBTm9CO0FBTzdCLHNCQUFvQjtBQVBTLEVBQWpCLENBQWI7O0FBVUgsS0FBSSxNQUFNLElBQUksU0FBUyxpQkFBYixDQUErQixFQUFDLGFBQVksS0FBYixFQUEvQixDQUFWO0FBQ0EsUUFBTyxVQUFQLENBQWtCLEdBQWxCLEVBQXVCLFVBQXZCOztBQUVBLFdBQVUsNkJBQVY7O0FBRUEsUUFBTyxFQUFQLENBQVUsTUFBVixFQUFrQixZQUFVO0FBQzNCO0FBQ0E7QUFDQSxFQUhEO0FBSUEsVUFBUyxJQUFULEdBQWU7QUFDZCxNQUFLLFlBQVksQ0FBakIsRUFBb0I7QUFDbkI7QUFDQTtBQUNELE1BQUksY0FBYyxnQkFBbEI7QUFDQTtBQUNBLGNBQVksSUFBWixDQUFpQixZQUFNO0FBQ3RCLFVBQU8sRUFBUCxDQUFVLFFBQVYsRUFBb0IsYUFBcEI7QUFDQSxHQUZEO0FBR0EsRUFyQzBCLENBcUN6Qjs7QUFFRixVQUFTLGNBQVQsR0FBeUI7QUFDeEIsU0FBTyxTQUFTLGtCQUFULENBQTRCLElBQTVCLENBQWlDLE1BQWpDLEVBQ04sRUFBRTtBQUNELFdBQVEsZUFEVDtBQUVPLFdBQVEsU0FGZjtBQUdPLFdBQVE7QUFIZixHQURNLEVBS0gsQ0FBRTtBQUNKLElBQUU7QUFDTyxTQUFNLFFBRGY7QUFFUyxXQUFRLFFBRmpCO0FBR1MsYUFBVSxlQUhuQjtBQUlTLGNBQVcsQ0FKcEI7QUFLUyxZQUFTO0FBQ04sb0JBQWdCLENBQ2QsT0FEYyxFQUVkLENBQUMsS0FBRCxFQUFRLE9BQVIsQ0FGYyxFQUdkLENBSGMsRUFHWCxTQUhXO0FBSWQsZUFBWSxTQUpFLENBRFY7QUFPUixxQkFBaUI7QUFDYixjQUFTLENBQUMsQ0FBQyxDQUFELEVBQUksQ0FBSixDQUFELEVBQVMsQ0FBQyxDQUFELEVBQUksRUFBSixDQUFUO0FBREksS0FQVDtBQVVSLHNCQUFrQjtBQVZWO0FBTGxCLEdBREUsRUFtQkksRUFBRTtBQUNDLFNBQU0sb0JBRFQ7QUFFRyxXQUFRLFFBRlg7QUFHRyxhQUFVLGVBSGI7QUFJRyxjQUFXLENBSmQ7QUFLRyxZQUFTO0FBQ04sb0JBQWdCLENBQ2QsT0FEYyxFQUVkLENBQUMsS0FBRCxFQUFRLE9BQVIsQ0FGYyxFQUdkLENBSGMsRUFHWCxTQUhXO0FBSWQsZUFBWSxTQUpFLENBRFY7QUFPUixxQkFBaUI7QUFDaEIsZUFBVSxNQURNO0FBRWIsV0FBTSxhQUZPO0FBR25CLFlBQU8sQ0FDTCxDQUFDLEVBQUQsRUFBSyxDQUFMLENBREssRUFFTCxDQUFDLElBQUQsRUFBTyxFQUFQLENBRks7QUFIWSxLQVBUO0FBZVIsc0JBQWtCLEdBZlY7QUFnQlIsMkJBQXVCLFNBaEJmO0FBaUJSLDJCQUF1QjtBQWpCZjtBQUxaLEdBbkJKLENBTEcsQ0FBUDtBQWtEQTs7QUFFRCxVQUFTLGFBQVQsR0FBd0I7QUFDdkIsTUFBSSxRQUFKO0FBQ0EsTUFBSyxPQUFPLE1BQVAsRUFBTCxFQUFxQjtBQUNwQixjQUFXLE9BQU8scUJBQVAsQ0FBNkIsRUFBQyxRQUFPLENBQUMsUUFBRCxDQUFSLEVBQTdCLENBQVg7QUFDQSxXQUFRLEdBQVIsQ0FBWSxRQUFaO0FBQ0EsVUFBTyxHQUFQLENBQVcsUUFBWCxFQUFxQixhQUFyQjtBQUNBO0FBQ0Q7Ozs7O0FBS0E7QUFDQTtBQUNELFVBQVMsWUFBVCxHQUF1Qjs7QUFFdEIsV0FBUyxrQkFBVCxDQUE0QixJQUE1QixDQUFpQyxNQUFqQyxFQUNJLEVBQUU7QUFDRCxXQUFRLFVBRFQ7QUFFSSxXQUFRLFNBRlo7QUFHSSxXQUFRLE9BSFo7QUFJSSxjQUFXLElBSmY7QUFLSSxvQkFBaUIsR0FMckIsQ0FLeUI7QUFMekIsR0FESixFQU9PLENBQUU7QUFDRixJQUFFO0FBQ0csT0FBSSxlQURUO0FBRUUsU0FBTSxRQUZSO0FBR0UsV0FBUSxVQUhWO0FBSUUsV0FBUSxDQUFDLEtBQUQsRUFBUSxhQUFSLENBSlY7QUFLRSxjQUFXLENBTGI7QUFNRSxXQUFRO0FBQ0osa0JBQWMsMkJBRFY7QUFFSixpQkFBYTs7QUFGVCxJQU5WO0FBV0UsWUFBUztBQUNSLGtCQUFjO0FBRE47QUFYWCxHQURBLENBUFAsQ0F1QlM7QUF2QlQsSUFGc0IsQ0EwQmhCO0FBQ04sRUFySTBCLENBcUl6QjtBQUNGLFVBQVMsU0FBVCxDQUFtQixHQUFuQixFQUF1Qjs7QUFFdEIsS0FBRyxHQUFILENBQU8sR0FBUCxFQUFZLFVBQVMsR0FBVCxFQUFjLElBQWQsRUFBbUI7QUFDOUIsT0FBSSxHQUFKLEVBQVM7QUFDUixVQUFNLEdBQU47QUFDQTtBQUNEO0FBQ0EsT0FBSSxXQUFXLEVBQWY7QUFDQSxRQUFLLE9BQUwsQ0FBYSxnQkFBUTtBQUNwQixRQUFJLFVBQVUsRUFBZDtBQUNBLFNBQU0sSUFBSSxHQUFWLElBQWlCLElBQWpCLEVBQXdCO0FBQ3ZCLFNBQUssS0FBSyxjQUFMLENBQW9CLEdBQXBCLENBQUwsRUFBK0I7QUFDOUIsY0FBUSxHQUFSLElBQWUsQ0FBQyxNQUFNLENBQUMsS0FBSyxHQUFMLENBQVAsQ0FBRCxHQUFxQixDQUFDLEtBQUssR0FBTCxDQUF0QixHQUFrQyxLQUFLLEdBQUwsQ0FBakQ7QUFDQTtBQUNEO0FBQ0QsYUFBUyxJQUFULENBQWM7QUFDYixhQUFRLFNBREs7QUFFYixtQkFBYyxPQUZEO0FBR2IsaUJBQVk7QUFDWCxjQUFRLE9BREc7QUFFWCxxQkFBZSxDQUFDLENBQUMsS0FBSyxTQUFQLEVBQWtCLENBQUMsS0FBSyxRQUF4QjtBQUZKO0FBSEMsS0FBZDtBQVFBLElBZkQsRUFOOEIsQ0FxQjFCO0FBQ0osYUFBVztBQUNWLFlBQVEsbUJBREU7QUFFVixnQkFBWTtBQUZGLElBQVg7QUFJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEdBOUJELEVBRnNCLENBZ0NsQjtBQUNKLEVBdkswQixDQXVLekI7QUFDRixVQUFTLHFCQUFULEdBQWdDO0FBQy9CLFVBQVEsUUFBUixDQUFpQixPQUFqQixDQUF5QixnQkFBUTtBQUNoQyxPQUFLLENBQUMsY0FBYyxHQUFkLENBQWtCLEtBQUssVUFBTCxDQUFnQixTQUFsQyxDQUFOLEVBQW9EO0FBQ25ELFFBQUksU0FBUyxLQUFLLFVBQUwsQ0FBZ0IsVUFBaEIsR0FBNkIsQ0FBN0IsR0FBaUMsS0FBSyxVQUFMLENBQWdCLFVBQWpELEdBQThELElBQTNFO0FBQ0Esa0JBQWMsR0FBZCxDQUFrQixLQUFLLFVBQUwsQ0FBZ0IsU0FBbEMsRUFBNkMsTUFBN0M7QUFDQTtBQUNELEdBTEQ7QUFNQSxVQUFRLEdBQVIsQ0FBWSxhQUFaO0FBQ0EsU0FBTyxhQUFQLEdBQXVCLGFBQXZCO0FBQ0EsZUFBYSxPQUFiO0FBQ0E7QUFDRCxVQUFTLFlBQVQsQ0FBc0IsT0FBdEIsRUFBOEI7QUFDN0IsTUFBSSxLQUFKLENBQVU7QUFDVCxXQUFRLEVBQUU7QUFDRyxTQUFLLEVBRFY7QUFFSyxXQUFPLEVBRlo7QUFHSyxZQUFRLENBSGI7QUFJSyxVQUFNO0FBSlgsSUFEQztBQU9BLGtCQUFlLENBUGY7QUFRQSxjQUFXLFVBUlg7QUFTQSxTQUFNLFFBQVE7QUFUZCxHQUFWOztBQVlEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBdUJDOztBQUVELEtBQUksUUFBUSxTQUFSLEtBQVEsQ0FBUyxZQUFULEVBQXNCO0FBQUU7QUFDaEMsVUFBUSxHQUFSLENBQVksSUFBWixFQUFrQixZQUFsQjtBQUNBLE9BQUssS0FBTCxDQUFXLFlBQVg7QUFDSCxFQUhEOztBQUtBLE9BQU0sU0FBTixHQUFrQjtBQUVkLE9BRmMsaUJBRVIsWUFGUSxFQUVLO0FBQ2xCLFdBQVEsR0FBUixDQUFZLFdBQVo7QUFDRyxPQUFJLFVBQVUsYUFBYSxLQUFLLEtBQUwsQ0FBVyxhQUFhLGFBQWIsR0FBNkIsR0FBeEMsQ0FBM0I7QUFDQSxPQUFJLE1BQU0sSUFBSSxLQUFLLEVBQW5CO0FBQ0EsUUFBSyxNQUFMLEdBQWMsYUFBYSxNQUEzQjtBQUNBLFFBQUssS0FBTCxHQUFhLE1BQU0sS0FBSyxNQUFMLENBQVksSUFBbEIsR0FBeUIsS0FBSyxNQUFMLENBQVksS0FBbEQ7QUFDQSxRQUFLLE1BQUwsR0FBYyxhQUFhLGFBQWIsR0FBNkIsR0FBN0IsR0FBbUMsS0FBSyxNQUFMLENBQVksR0FBL0MsR0FBcUQsS0FBSyxNQUFMLENBQVksTUFBL0U7QUFDQSxRQUFLLE1BQUwsR0FBYyxLQUFLLEdBQUwsQ0FBUyxLQUFLLEtBQWQsRUFBb0IsS0FBSyxNQUF6QixJQUFtQyxDQUFqRDtBQUNBLFFBQUssSUFBTCxHQUFZLGFBQWEsSUFBekI7QUFDQSxXQUFRLEdBQVIsQ0FBWSxLQUFLLE1BQWpCO0FBQ0EsUUFBSyxHQUFMLEdBQVcsR0FBRyxHQUFILEdBQ1IsV0FEUSxDQUNJLEtBQUssTUFEVCxFQUVSLFdBRlEsQ0FFSSxLQUFLLE1BQUwsR0FBYyxDQUZsQixFQUdSLFVBSFEsQ0FHRyxDQUhILENBQVg7QUFJQSxVQUFPLEdBQVAsR0FBYSxLQUFLLEdBQWxCO0FBQ0EsV0FBUSxHQUFSLENBQVksS0FBSyxJQUFqQjtBQUNBLFFBQUssS0FBTCxHQUFhLEdBQUcsV0FBSCxHQUFpQixNQUFqQixDQUF3QixDQUFDLENBQUQsRUFBRyxLQUFLLElBQUwsQ0FBVSxNQUFiLENBQXhCLEVBQThDLEtBQTlDLENBQW9ELENBQUMsQ0FBRCxFQUFHLENBQUgsQ0FBcEQsQ0FBYjtBQUNBLFFBQUssS0FBTCxHQUFhLEtBQUssSUFBTCxDQUFVLE1BQXZCO0FBQ0E7OztBQUdEO0FBQ0E7QUFDQTs7O0FBR0MsUUFBSyxHQUFMLEdBQVcsR0FBRyxNQUFILENBQVUsYUFBYSxTQUF2QixFQUNOLE1BRE0sQ0FDQyxLQURELEVBRU4sSUFGTSxDQUVELE9BRkMsRUFFUSxNQUZSLEVBR04sSUFITSxDQUdELE9BSEMsRUFHTyw0QkFIUCxFQUlOLElBSk0sQ0FJRCxTQUpDLEVBSVMsS0FKVCxFQUtOLElBTE0sQ0FLRCxTQUxDLEVBS1UsT0FMVixFQU1OLE1BTk0sQ0FNQyxHQU5ELEVBT04sSUFQTSxDQU9ELFdBUEMsRUFPWSxlQUFlLEtBQUssTUFBTCxDQUFZLElBQTNCLEdBQWtDLEdBQWxDLEdBQXdDLEtBQUssTUFBTCxDQUFZLEdBQXBELEdBQTBELEdBUHRFLENBQVg7O0FBU0gsUUFBSyxHQUFMLENBQVMsTUFBVCxDQUFnQixNQUFoQixFQUNRLE9BRFIsQ0FDZ0IsWUFEaEIsRUFDNkIsSUFEN0IsRUFFUSxLQUZSLENBRWMsRUFBQyxVQUFVLEdBQVgsRUFGZDtBQUdPO0FBSFAsSUFJUSxJQUpSLENBSWEsR0FKYixFQUlrQixLQUFLLEdBSnZCLEVBS1EsSUFMUixDQUthLFdBTGIsRUFLMEIsZUFBZSxLQUFLLEtBQUwsR0FBYSxDQUE1QixHQUFnQyxHQUFoQyxHQUFzQyxLQUFLLE1BQUwsR0FBYyxDQUFwRCxHQUF3RCxHQUxsRjs7QUFPRyxRQUFLLEdBQUwsQ0FBUyxNQUFULENBQWdCLE1BQWhCLEVBQ0ssT0FETCxDQUNhLFlBRGIsRUFDMEIsSUFEMUIsRUFFSyxLQUZMLENBRVcsRUFBQyxVQUFVLEtBQUssS0FBTCxHQUFhLEdBQXhCLEVBRlg7QUFHSTtBQUhKLElBSUssSUFKTCxDQUlVLEdBSlYsRUFJZSxLQUFLLEdBSnBCLEVBS0ssSUFMTCxDQUtVLFdBTFYsRUFLdUIsZUFBZSxLQUFLLEtBQUwsR0FBYSxDQUE1QixHQUFnQyxHQUFoQyxHQUFzQyxLQUFLLE1BQUwsR0FBYyxDQUFwRCxHQUF3RCxHQUwvRTs7QUFPQyxRQUFLLEdBQUwsQ0FBUyxNQUFULENBQWdCLE1BQWhCLEVBQ0ksSUFESixDQUNTLGFBRFQsRUFDd0IsUUFEeEIsRUFFSSxJQUZKLENBRVMsT0FGVCxFQUVpQixZQUZqQixFQUdJLElBSEosQ0FHUyxHQUhULEVBR2EsQ0FIYixFQUlJLElBSkosQ0FJUyxHQUFHLE1BQUgsQ0FBVSxLQUFWLEVBQWlCLEtBQUssS0FBdEIsQ0FKVCxFQUtJLElBTEosQ0FLUyxXQUxULEVBS3NCLGVBQWUsS0FBSyxLQUFMLEdBQWEsQ0FBNUIsR0FBZ0MsR0FBaEMsR0FBc0MsS0FBSyxNQUFMLEdBQWMsQ0FBcEQsR0FBd0QsR0FMOUU7QUFPSjtBQTFEYSxFQUFsQjtBQTREQyxRQUFPLEVBQVAsQ0FBVSxTQUFWLEVBQXFCLFlBQVc7QUFDL0IsVUFBUSxHQUFSLENBQVksVUFBWjtBQUNBLEVBRkQ7QUFHRDs7OztBQUlBLFFBQU8sTUFBUDtBQUVBLENBblNpQixFQUFsQixDLENBbVNNOzs7OztBQ25UTixJQUFNLFdBQVc7QUFDYixjQUFVLEVBREc7QUFFYixzQkFGYSw4QkFFTSxhQUZOLEVBRW9CLGlCQUZwQixFQUVzQztBQUFBOztBQUFFO0FBQ2pELFlBQUksYUFBYSxjQUFjLElBQS9CO0FBQ0EsaUJBQVMsUUFBVCxDQUFrQixjQUFjLElBQWhDLElBQXdDLElBQUksT0FBSixDQUFZLFVBQUMsT0FBRCxFQUFhO0FBQUU7QUFDL0QsbUJBQU8sY0FBYyxJQUFyQjtBQUNBLHFCQUFTLGVBQVQsR0FBMEI7QUFDdEIsb0JBQUssS0FBSyxTQUFMLENBQWUsVUFBZixDQUFMLEVBQWlDO0FBQUU7QUFDL0IsNEJBQVEsSUFBUjtBQUNBLHlCQUFLLEdBQUwsQ0FBUyxRQUFULEVBQW1CLGVBQW5CLEVBRjZCLENBRVE7QUFDeEM7QUFDSjtBQUNELGtCQUFLLEVBQUwsQ0FBUSxRQUFSLEVBQWtCLGVBQWxCO0FBQ0Esa0JBQUssU0FBTCxDQUFlLFVBQWYsRUFBMkIsYUFBM0I7QUFDSCxTQVZ1QyxDQUF4QztBQVdBLFlBQUksZ0JBQWdCLEVBQXBCO0FBQ0EsZUFBTyxTQUFTLFFBQVQsQ0FBa0IsVUFBbEIsRUFBOEIsSUFBOUIsQ0FBbUMsWUFBTTtBQUM1Qyw4QkFBa0IsT0FBbEIsQ0FBMEIsVUFBQyxJQUFELEVBQVU7QUFDaEMsOEJBQWMsSUFBZCxDQUNJLElBQUksT0FBSixDQUFZLFVBQUMsT0FBRCxFQUFhO0FBQUU7QUFDdkIsd0JBQUksY0FBYyxLQUFLLFdBQUwsR0FBbUIsS0FBSyxXQUF4QixHQUFzQyxFQUF4RDtBQUNBLDJCQUFPLEtBQUssV0FBWjtBQUNBLHlCQUFLLE1BQUwsR0FBYyxVQUFkO0FBQ0EsNkJBQVMsZ0JBQVQsR0FBMkI7QUFDdkIsNEJBQUssS0FBSyxRQUFMLENBQWMsS0FBSyxFQUFuQixDQUFMLEVBQTZCO0FBQUU7QUFDM0Isb0NBQVEsSUFBUjtBQUNBLGlDQUFLLEdBQUwsQ0FBUyxRQUFULEVBQW1CLGdCQUFuQixFQUZ5QixDQUVhO0FBQ3pDO0FBQ0o7QUFDRCwwQkFBSyxFQUFMLENBQVEsUUFBUixFQUFrQixnQkFBbEI7QUFDQSwwQkFBSyxRQUFMLENBQWMsSUFBZCxFQUFvQixXQUFwQjtBQUNILGlCQVpELENBREo7QUFlSCxhQWhCRDtBQWlCQSxtQkFBTyxRQUFRLEdBQVIsQ0FBWSxhQUFaLENBQVA7QUFDSCxTQW5CTSxDQUFQO0FBb0JIO0FBcENZLENBQWpCOztBQXVDQSxRQUFRLGtCQUFSLEdBQTZCLFNBQVMsa0JBQXRDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc31yZXR1cm4gZX0pKCkiLCIgLyogZXhwb3J0ZWQgdGhlTWFwLCBTaGFyYywgSGVscGVycywgZDNUaXAsIHJlZmxlY3QsIGFycmF5RmluZCwgU1ZHSW5uZXJIVE1MLCBTVkdGb2N1cywgY3JlYXRlQnJvd3NlQnV0dG9uICovIC8vIGxldCdzIGpzaGludCBrbm93IHRoYXQgRDNDaGFydHMgY2FuIGJlIFwiZGVmaW5lZCBidXQgbm90IHVzZWRcIiBpbiB0aGlzIGZpbGVcbiAvKiBwb2x5ZmlsbHMgbmVlZGVkOiBQcm9taXNlIFRPIERPOiBPVEhFUlM/XG4gKi9cbi8qXG5pbXBvcnQgeyByZWZsZWN0LCBhcnJheUZpbmQsIFNWR0lubmVySFRNTCwgU1ZHRm9jdXMgfSBmcm9tICcuLi9qcy12ZW5kb3IvcG9seWZpbGxzJztcbmltcG9ydCB7IEhlbHBlcnMgfSBmcm9tICcuLi9qcy1leHBvcnRzL0hlbHBlcnMnO1xuaW1wb3J0IHsgZDNUaXAgfSBmcm9tICcuLi9qcy12ZW5kb3IvZDMtdGlwJztcbmltcG9ydCB7IGNyZWF0ZUJyb3dzZUJ1dHRvbiB9IGZyb20gJy4uL2pzLWV4cG9ydHMvQnJvd3NlQnV0dG9ucyc7XG5pbXBvcnQgeyBjcmVhdGVSZXN1bHRJdGVtIH0gZnJvbSAnLi4vanMtZXhwb3J0cy9SZXN1bHRJdGVtcyc7IFxuKi9cblxuLypcbnRvIGRvIDogc2VlIGFsc28gaHR0cHM6Ly93d3cubWFwYm94LmNvbS9tYXBib3gtZ2wtanMvZXhhbXBsZS9oZWF0bWFwLWxheWVyL1xuXG5cbiovXG53aW5kb3cudGhlTWFwICA9IChmdW5jdGlvbigpeyAgIFxuXCJ1c2Ugc3RyaWN0XCI7ICBcbiAgICBtYXBib3hnbC5hY2Nlc3NUb2tlbiA9ICdway5leUoxSWpvaWIzTjBaWEp0WVc1cUlpd2lZU0k2SW1OcGRuVTVkSFZuZGpBMmVEWXliM0EzTm5nMWNHSjNaWG9pZlEuWG9fay1rekdmWVhfWW9fUkRjSERCZyc7XG5cbiAgICBjb25zdCBtYkhlbHBlciA9IHJlcXVpcmUoJ21hcGJveC1oZWxwZXInKTtcbiAgICBjb25zdCBtZWRpYW5JbmNvbWVzID0gbmV3IE1hcCgpO1xuICAgIHZhciBnZW9qc29uO1xuICAgIHZhciBnYXRlQ2hlY2sgPSAwO1xuICAgIFxuICAgIHZhciB0aGVNYXAgPSBuZXcgbWFwYm94Z2wuTWFwKHtcblx0ICAgIGNvbnRhaW5lcjogJ21hcCcsXG5cdCAgICBzdHlsZTogJ21hcGJveDovL3N0eWxlcy9vc3Rlcm1hbmovY2pmMDNvMzdiM3R2ZTJycXAyaW53NmExZicsXG5cdCAgICBjZW50ZXI6IFstOTYuMjkxOTI5NjExMjk4ODMsIDM4LjQ1MzE3NTI4OTA1Mzc0Nl0sXG5cdCAgICB6b29tOiAzLFxuXHQgICAgbWF4Qm91bmRzOiBbWy0xNDIuODg3MDU3MTQ3NDYzNjIsIDE2LjA1ODM0NDk0ODQzMjQwNl0sWy01MS45MDIzMDE3ODY5NzMxLDU1Ljc2NjkwMDY3NDE3MTM4XV0sXG5cdCAgICBtaW5ab29tOiAzLFxuXHQgICAgYXR0cmlidXRpb25Db250cm9sOiBmYWxzZSxcblx0fSk7XG5cblx0dmFyIG5hdiA9IG5ldyBtYXBib3hnbC5OYXZpZ2F0aW9uQ29udHJvbCh7c2hvd0NvbXBhc3M6ZmFsc2V9KTtcblx0dGhlTWFwLmFkZENvbnRyb2wobmF2LCAndG9wLWxlZnQnKTtcblxuXHR0b0dlb0pTT04oJ2Nlbl9wb2xpY3ktc2ltcGxpZmllZC0zLmNzdicpO1xuXG5cdHRoZU1hcC5vbignbG9hZCcsIGZ1bmN0aW9uKCl7XG5cdFx0Z2F0ZUNoZWNrKys7XG5cdFx0Z2F0ZSgpO1xuXHR9KTtcblx0ZnVuY3Rpb24gZ2F0ZSgpe1xuXHRcdGlmICggZ2F0ZUNoZWNrIDwgMiApe1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR2YXIgdW5jbHVzdGVyZWQgPSBhZGRVbmNsdXN0ZXJlZCgpO1xuXHRcdGFkZENsdXN0ZXJlZCgpO1xuXHRcdHVuY2x1c3RlcmVkLnRoZW4oKCkgPT4ge1xuXHRcdFx0dGhlTWFwLm9uKCdyZW5kZXInLCBjaGVja0ZlYXR1cmVzKTtcblx0XHR9KTtcblx0fSAvLyBlbmQgZ2F0ZVxuXG5cdGZ1bmN0aW9uIGFkZFVuY2x1c3RlcmVkKCl7XG5cdFx0cmV0dXJuIG1iSGVscGVyLmFkZFNvdXJjZUFuZExheWVycy5jYWxsKHRoZU1hcCxcblx0XHRcdHsgLy8gc291cmNlXG5cdFx0XHRcdFwibmFtZVwiOiBcInBvbGljeS1wb2ludHNcIixcblx0XHQgICAgICAgIFwidHlwZVwiOiBcImdlb2pzb25cIixcblx0XHQgICAgICAgIFwiZGF0YVwiOiBnZW9qc29uXG5cdFx0XHR9LCBbIC8vIGxheWVyc1xuXHRcdFx0XHR7IC8vIGxheWVyIG9uZVxuXHQgICAgICAgICAgICBcImlkXCI6IFwicG9pbnRzXCIsXG5cdCAgICAgICAgICAgIFwidHlwZVwiOiBcImNpcmNsZVwiLFxuXHQgICAgICAgICAgICBcInNvdXJjZVwiOiBcInBvbGljeS1wb2ludHNcIixcblx0ICAgICAgICAgICAgXCJtYXh6b29tXCI6IDksXG5cdCAgICAgICAgICAgIFwicGFpbnRcIjoge1xuXHQgICAgICAgICAgICAgIFx0XCJjaXJjbGUtY29sb3JcIjogW1xuXHRcdCAgICAgICAgICAgICAgICAnbWF0Y2gnLFxuXHRcdCAgICAgICAgICAgICAgICBbJ2dldCcsICd0X2RlZCddLFxuXHRcdCAgICAgICAgICAgICAgICA1LCAnIzA1MTgzOScsXG5cdFx0ICAgICAgICAgICAgICAgIC8qIG90aGVyICovICcjOTkwMDAwJ1xuXHRcdCAgICAgICAgICAgIF0sXG5cdFx0ICAgICAgICAgICAgXCJjaXJjbGUtcmFkaXVzXCI6IHtcblx0XHQgICAgICAgICAgICAgICAgJ3N0b3BzJzogW1s1LCAzXSwgWzgsIDE4XV1cblx0XHQgICAgICAgICAgICB9LFxuXHRcdCAgICAgICAgICAgIFwiY2lyY2xlLW9wYWNpdHlcIjogMC4xXG5cdFx0ICAgICAgICAgICAgfVxuXHRcdCAgICAgICAgfSxcblx0XHQgICAgICAgIHsgLy8gbGF5ZXIgdHdvXG5cdCAgICAgICAgICAgIFwiaWRcIjogXCJwb2ludHMtZGF0YS1kcml2ZW5cIixcblx0ICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY2lyY2xlXCIsXG5cdCAgICAgICAgICAgIFwic291cmNlXCI6IFwicG9saWN5LXBvaW50c1wiLFxuXHQgICAgICAgICAgICBcIm1pbnpvb21cIjogOSxcblx0ICAgICAgICAgICAgXCJwYWludFwiOiB7XG5cdCAgICAgICAgICAgICAgXHRcImNpcmNsZS1jb2xvclwiOiBbXG5cdFx0ICAgICAgICAgICAgICAgICdtYXRjaCcsXG5cdFx0ICAgICAgICAgICAgICAgIFsnZ2V0JywgJ3RfZGVkJ10sXG5cdFx0ICAgICAgICAgICAgICAgIDUsICcjMDUxODM5Jyxcblx0XHQgICAgICAgICAgICAgICAgLyogb3RoZXIgKi8gJyM5OTAwMDAnXG5cdFx0ICAgICAgICAgICAgXSxcblx0XHQgICAgICAgICAgICBcImNpcmNsZS1yYWRpdXNcIjoge1xuXHRcdCAgICAgICAgICAgIFx0cHJvcGVydHk6ICdwcmVtJyxcblx0XHQgICAgICAgICAgICAgICAgdHlwZTogJ2V4cG9uZW50aWFsJyxcblx0XHRcdFx0ICAgICAgICBzdG9wczogW1xuXHRcdFx0XHQgICAgICAgICAgWzYyLCA1XSxcblx0XHRcdFx0ICAgICAgICAgIFsyNTAwLCA2MF1cblx0XHRcdFx0ICAgICAgICBdXG5cdFx0ICAgICAgICAgICAgfSxcblx0XHQgICAgICAgICAgICBcImNpcmNsZS1vcGFjaXR5XCI6IDAuMSxcblx0XHQgICAgICAgICAgICBcImNpcmNsZS1zdHJva2UtY29sb3JcIjogXCIjZmZmZmZmXCIsXG5cdFx0ICAgICAgICAgICAgXCJjaXJjbGUtc3Ryb2tlLXdpZHRoXCI6IDFcblx0XHQgICAgICAgIH1cblx0XHRcdH1dXG5cdFx0KTsgXG5cdH1cblxuXHRmdW5jdGlvbiBjaGVja0ZlYXR1cmVzKCl7XG5cdFx0dmFyIGZlYXR1cmVzO1xuXHRcdGlmICggdGhlTWFwLmxvYWRlZCgpKXtcblx0XHRcdGZlYXR1cmVzID0gdGhlTWFwLnF1ZXJ5UmVuZGVyZWRGZWF0dXJlcyh7bGF5ZXJzOlsncG9pbnRzJ119KTtcblx0XHRcdGNvbnNvbGUubG9nKGZlYXR1cmVzKTtcblx0XHRcdHRoZU1hcC5vZmYoJ3JlbmRlcicsIGNoZWNrRmVhdHVyZXMpO1xuXHRcdH1cblx0XHQvKmlmICggdGhlTWFwLmFyZVRpbGVzTG9hZGVkKCkgJiYgZmVhdHVyZXMubGVuZ3RoID4gMCApe1xuXHRcdFx0Y29uc29sZS5sb2coZmVhdHVyZXMpO1xuXHRcdFx0dGhlTWFwLm9mZigncmVuZGVyJywgY2hlY2tGZWF0dXJlcyk7XG5cdFx0XHQvL2NvbnNvbGUubG9nKHRoZU1hcC5xdWVyeVNvdXJjZUZlYXR1cmVzKCdwb2xpY3ktcG9pbnRzJyx7c291cmNlTGF5ZXI6J3BvbGljaWVzJ30pKTtcblx0XHR9Ki9cblx0XHQvL2NvbnNvbGUubG9nKHRoZU1hcC5sb2FkZWQoKSk7XG5cdH1cblx0ZnVuY3Rpb24gYWRkQ2x1c3RlcmVkKCl7XG5cdFx0XG5cdFx0bWJIZWxwZXIuYWRkU291cmNlQW5kTGF5ZXJzLmNhbGwodGhlTWFwLFxuXHRcdCAgICB7IC8vIHNvdXJjZVxuXHRcdCAgICBcdFwibmFtZVwiOiBcInBvbGljaWVzXCIsXG5cdFx0ICAgICAgICBcInR5cGVcIjogXCJnZW9qc29uXCIsXG5cdFx0ICAgICAgICBcImRhdGFcIjogZ2VvanNvbixcblx0XHQgICAgICAgIFwiY2x1c3RlclwiOiB0cnVlLFxuXHRcdCAgICAgICAgXCJjbHVzdGVyUmFkaXVzXCI6IDAuNSAvLyBSYWRpdXMgb2YgZWFjaCBjbHVzdGVyIHdoZW4gY2x1c3RlcmluZyBwb2ludHMgKGRlZmF1bHRzIHRvIDUwKVxuXHRcdCAgICB9LCBbIC8vIGxheWVyc1xuXHRcdCAgICAgICB7IC8vIGxheWVyIG9uZVxuXHRcdCAgICAgICAgICAgIGlkOiBcImNsdXN0ZXItY291bnRcIixcblx0XHRcdCAgICAgICAgdHlwZTogXCJzeW1ib2xcIixcblx0XHRcdCAgICAgICAgc291cmNlOiBcInBvbGljaWVzXCIsXG5cdFx0XHQgICAgICAgIGZpbHRlcjogW1wiaGFzXCIsIFwicG9pbnRfY291bnRcIl0sXG5cdFx0XHQgICAgICAgIFwibWluem9vbVwiOiA2LFxuXHRcdFx0ICAgICAgICBsYXlvdXQ6IHtcblx0XHRcdCAgICAgICAgICAgIFwidGV4dC1maWVsZFwiOiBcIntwb2ludF9jb3VudF9hYmJyZXZpYXRlZH1cIixcblx0XHRcdCAgICAgICAgICAgIFwidGV4dC1zaXplXCI6IDEyLFxuXG5cdFx0XHQgICAgICAgIH0sXG5cdFx0XHQgICAgICAgIFwicGFpbnRcIjoge1xuXHRcdFx0ICAgICAgICBcdFwidGV4dC1jb2xvclwiOiBcIiNmZmZmZmZcIlxuXHRcdFx0ICAgICAgICB9XG5cdFx0ICAgICAgICB9XG5cdCAgICAgICAgXSAvLyBlbmQgbGF5ZXJzIGFycmF5XG5cdCAgICApOyAvLyBlbmQgYWRkbGF5ZXJzXG5cdH0gLy8gZW5kIGFkZENsdXN0ZXJlZFxuXHRmdW5jdGlvbiB0b0dlb0pTT04odXJsKXtcblx0XHRcblx0XHRkMy5jc3YodXJsLCBmdW5jdGlvbihlcnIsIGRhdGEpe1xuXHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHR0aHJvdyBlcnI7XG5cdFx0XHR9XG5cdFx0XHQvL2NvbnNvbGUubG9nKGRhdGEpO1xuXHRcdFx0dmFyIGZlYXR1cmVzID0gW107XG5cdFx0XHRkYXRhLmZvckVhY2goZWFjaCA9PiB7XG5cdFx0XHRcdHZhciBjb2VyY2VkID0ge307XG5cdFx0XHRcdGZvciAoIHZhciBrZXkgaW4gZWFjaCApIHtcblx0XHRcdFx0XHRpZiAoIGVhY2guaGFzT3duUHJvcGVydHkoa2V5KSApe1xuXHRcdFx0XHRcdFx0Y29lcmNlZFtrZXldID0gIWlzTmFOKCtlYWNoW2tleV0pID8gK2VhY2hba2V5XSA6IGVhY2hba2V5XTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0ZmVhdHVyZXMucHVzaCh7XG5cdFx0XHRcdFx0XCJ0eXBlXCI6IFwiRmVhdHVyZVwiLFxuXHRcdFx0XHRcdFwicHJvcGVydGllc1wiOiBjb2VyY2VkLFxuXHRcdFx0XHRcdFwiZ2VvbWV0cnlcIjoge1xuXHRcdFx0XHRcdFx0XCJ0eXBlXCI6IFwiUG9pbnRcIixcblx0XHRcdFx0XHRcdFwiY29vcmRpbmF0ZXNcIjogWytlYWNoLmxvbmdpdHVkZSwgK2VhY2gubGF0aXR1ZGVdXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9KTtcblx0XHRcdH0pOyAvLyBlbmQgZm9yRWFjaFxuXHRcdFx0Z2VvanNvbiA9ICB7XG5cdFx0XHRcdFwidHlwZVwiOiBcIkZlYXR1cmVDb2xsZWN0aW9uXCIsXG5cdFx0XHRcdFwiZmVhdHVyZXNcIjogZmVhdHVyZXNcblx0XHRcdH07XG5cdFx0XHRnYXRlQ2hlY2srKztcblx0XHRcdGdhdGUoKTtcblx0XHRcdC8vYWRkQ2x1c3RlckxheWVycyhydG4pO1xuXHRcdFx0Y3JlYXRlTWVkaWFuSW5jb21lTWFwKCk7XG5cdFx0fSk7IC8vIGVuZCBkMyBjc3Zcblx0fSAvLyBlbmQgdG9HZW9KU09OXG5cdGZ1bmN0aW9uIGNyZWF0ZU1lZGlhbkluY29tZU1hcCgpe1xuXHRcdGdlb2pzb24uZmVhdHVyZXMuZm9yRWFjaChlYWNoID0+IHtcblx0XHRcdGlmICggIW1lZGlhbkluY29tZXMuaGFzKGVhY2gucHJvcGVydGllcy5jZW5fdHJhY3QpICl7XG5cdFx0XHRcdGxldCBpbmNvbWUgPSBlYWNoLnByb3BlcnRpZXMubWVkX2luY29tZSA+IDAgPyBlYWNoLnByb3BlcnRpZXMubWVkX2luY29tZSA6IG51bGw7XG5cdFx0XHRcdG1lZGlhbkluY29tZXMuc2V0KGVhY2gucHJvcGVydGllcy5jZW5fdHJhY3QsIGluY29tZSk7IFx0XG5cdFx0XHR9XG5cdFx0fSk7XG5cdFx0Y29uc29sZS5sb2cobWVkaWFuSW5jb21lcyk7XG5cdFx0d2luZG93Lm1lZGlhbkluY29tZXMgPSBtZWRpYW5JbmNvbWVzO1xuXHRcdGNyZWF0ZUNoYXJ0cyhnZW9qc29uKTtcblx0fVxuXHRmdW5jdGlvbiBjcmVhdGVDaGFydHMoZ2VvanNvbil7XG5cdFx0bmV3IERvbnV0KHtcblx0XHRcdG1hcmdpbjogeyAvLyBwZXJjZW50YWdlc1xuICAgICAgICAgICAgICAgIHRvcDogMTUsXG4gICAgICAgICAgICAgICAgcmlnaHQ6IDEwLFxuICAgICAgICAgICAgICAgIGJvdHRvbTogNSxcbiAgICAgICAgICAgICAgICBsZWZ0OiAxMFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGhlaWdodFRvV2lkdGg6IDEsXG4gICAgICAgICAgICBjb250YWluZXI6ICcjY2hhcnQtMCcsXG4gICAgICAgICAgICBkYXRhOiBnZW9qc29uLmZlYXR1cmVzXG5cdFx0fSk7XG5cblx0LypcdG5ldyBEb251dCh7XG5cdFx0XHRtYXJnaW46IHsgLy8gcGVyY2VudGFnZXNcbiAgICAgICAgICAgICAgICB0b3A6IDE1LFxuICAgICAgICAgICAgICAgIHJpZ2h0OiAxMCxcbiAgICAgICAgICAgICAgICBib3R0b206IDUsXG4gICAgICAgICAgICAgICAgbGVmdDogMTBcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBoZWlnaHRUb1dpZHRoOiAxLFxuICAgICAgICAgICAgY29udGFpbmVyOiAnI2NoYXJ0LTEnLFxuICAgICAgICAgICAgZGF0YTogWy4uLm1lZGlhbkluY29tZXMudmFsdWVzKCldXG5cdFx0fSk7XG5cblx0XHRuZXcgRG9udXQoe1xuXHRcdFx0bWFyZ2luOiB7IC8vIHBlcmNlbnRhZ2VzXG4gICAgICAgICAgICAgICAgdG9wOiAxNSxcbiAgICAgICAgICAgICAgICByaWdodDogMTAsXG4gICAgICAgICAgICAgICAgYm90dG9tOiA1LFxuICAgICAgICAgICAgICAgIGxlZnQ6IDEwXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgaGVpZ2h0VG9XaWR0aDogMSxcbiAgICAgICAgICAgIGNvbnRhaW5lcjogJyNjaGFydC0yJyxcbiAgICAgICAgICAgIGRhdGE6IFsuLi5tZWRpYW5JbmNvbWVzLnZhbHVlcygpXVxuXHRcdH0pOyAvLyovXG5cdH1cblxuXHR2YXIgRG9udXQgPSBmdW5jdGlvbihjb25maWdPYmplY3QpeyAvLyBtYXJnaW5zIHt9LCBoZWlnaHQgIywgd2lkdGggIywgY29udGFpbmVySUQsIGRhdGFQYXRoXG5cdCAgICBjb25zb2xlLmxvZyh0aGlzLCBjb25maWdPYmplY3QpO1xuXHQgICAgdGhpcy5zZXR1cChjb25maWdPYmplY3QpO1xuXHR9O1xuXG5cdERvbnV0LnByb3RvdHlwZSA9IHtcblxuXHQgICAgc2V0dXAoY29uZmlnT2JqZWN0KXtcblx0ICAgIFx0Y29uc29sZS5sb2coJ2luIHNldCB1cCcpO1xuXHQgICAgICAgIHZhciB2aWV3Qm94ID0gJzAgMCAxMDAgJyArIE1hdGgucm91bmQoY29uZmlnT2JqZWN0LmhlaWdodFRvV2lkdGggKiAxMDApO1xuXHQgICAgICAgIHZhciB0YXUgPSAyICogTWF0aC5QSTtcblx0ICAgICAgICB0aGlzLm1hcmdpbiA9IGNvbmZpZ09iamVjdC5tYXJnaW47XG5cdCAgICAgICAgdGhpcy53aWR0aCA9IDEwMCAtIHRoaXMubWFyZ2luLmxlZnQgLSB0aGlzLm1hcmdpbi5yaWdodDtcblx0ICAgICAgICB0aGlzLmhlaWdodCA9IGNvbmZpZ09iamVjdC5oZWlnaHRUb1dpZHRoICogMTAwIC0gdGhpcy5tYXJnaW4udG9wIC0gdGhpcy5tYXJnaW4uYm90dG9tO1xuXHQgICAgICAgIHRoaXMucmFkaXVzID0gTWF0aC5taW4odGhpcy53aWR0aCx0aGlzLmhlaWdodCkgLyAyO1xuXHQgICAgICAgIHRoaXMuZGF0YSA9IGNvbmZpZ09iamVjdC5kYXRhO1xuXHQgICAgICAgIGNvbnNvbGUubG9nKHRoaXMucmFkaXVzKTtcblx0ICAgICAgICB0aGlzLmFyYyA9IGQzLmFyYygpXG5cdCAgICAgICAgICAub3V0ZXJSYWRpdXModGhpcy5yYWRpdXMpXG5cdCAgICAgICAgICAuaW5uZXJSYWRpdXModGhpcy5yYWRpdXMgLyAyKVxuXHQgICAgICAgICAgLnN0YXJ0QW5nbGUoMCk7IFxuXHQgICAgICAgIHdpbmRvdy5hcmMgPSB0aGlzLmFyYztcblx0ICAgICAgICBjb25zb2xlLmxvZyh0aGlzLmRhdGEpO1xuXHQgICAgICAgIHRoaXMuc2NhbGUgPSBkMy5zY2FsZUxpbmVhcigpLmRvbWFpbihbMCx0aGlzLmRhdGEubGVuZ3RoXSkucmFuZ2UoWzAsMV0pO1xuXHQgICAgICAgIHRoaXMudmFsdWUgPSB0aGlzLmRhdGEubGVuZ3RoO1xuXHQgICAgICAgIC8vdGhpcy55ID0gZDMuc2NhbGVMaW5lYXIoKS5kb21haW4oZDMucmFuZ2UodGhpcy5kYXRhKSkucmFuZ2UoW3RoaXMuaGVpZ2h0LCAwXSk7XG4gXG5cdCAgICAgICAgXG5cdCAgICAgICAvLyB0aGlzLmxhYmVsT2Zmc2V0ID0gY29uZmlnT2JqZWN0LnRyZW5kTGFiZWxQb3NpdGlvbiA9PT0gJ2JlbG93JyA/IDQgOiAtMztcblx0ICAgICAgIC8vIHRoaXMueUF4aXNDb3VudCA9IGNvbmZpZ09iamVjdC55QXhpc0NvdW50O1xuXHQgICAgICAgLy8gdGhpcy5oYXNCZWVuVXBkYXRlZCA9IGZhbHNlO1xuXG5cblx0ICAgICAgICB0aGlzLnN2ZyA9IGQzLnNlbGVjdChjb25maWdPYmplY3QuY29udGFpbmVyKVxuXHQgICAgICAgICAgICAuYXBwZW5kKCdzdmcnKVxuXHQgICAgICAgICAgICAuYXR0cignd2lkdGgnLCAnMTAwJScpXG5cdCAgICAgICAgICAgIC5hdHRyKCd4bWxucycsJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3ZlcnNpb24nLCcxLjEnKVxuXHQgICAgICAgICAgICAuYXR0cigndmlld0JveCcsIHZpZXdCb3gpXG5cdCAgICAgICAgICAgIC5hcHBlbmQoJ2cnKVxuXHQgICAgICAgICAgICAuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgdGhpcy5tYXJnaW4ubGVmdCArICcsJyArIHRoaXMubWFyZ2luLnRvcCArICcpJyk7XG5cblx0ICAgIFx0dGhpcy5zdmcuYXBwZW5kKCdwYXRoJylcblx0ICAgICAgICAgICAgLmNsYXNzZWQoJ2JhY2tncm91bmQnLHRydWUpXG5cdCAgICAgICAgICAgIC5kYXR1bSh7ZW5kQW5nbGU6IHRhdX0pXG5cdCAgICAgICAgICAgIC8vLnN0eWxlKFwiZmlsbFwiLCBcIiNkZGRcIilcblx0ICAgICAgICAgICAgLmF0dHIoJ2QnLCB0aGlzLmFyYylcblx0ICAgICAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIHRoaXMud2lkdGggLyAyICsgJywnICsgdGhpcy5oZWlnaHQgLyAyICsgJyknKTtcblxuXHQgICAgICAgIHRoaXMuc3ZnLmFwcGVuZCgncGF0aCcpXG5cdCAgICAgICAgICAgIC5jbGFzc2VkKCdmb3JlZ3JvdW5kJyx0cnVlKVxuXHQgICAgICAgICAgICAuZGF0dW0oe2VuZEFuZ2xlOiB0aGlzLnZhbHVlICogdGF1fSlcblx0ICAgICAgICAgICAgLy8uc3R5bGUoXCJmaWxsXCIsIFwiI2RkZFwiKVxuXHQgICAgICAgICAgICAuYXR0cignZCcsIHRoaXMuYXJjKVxuXHQgICAgICAgICAgICAuYXR0cigndHJhbnNmb3JtJywgJ3RyYW5zbGF0ZSgnICsgdGhpcy53aWR0aCAvIDIgKyAnLCcgKyB0aGlzLmhlaWdodCAvIDIgKyAnKScpO1xuXG5cdCAgICAgICAgIHRoaXMuc3ZnLmFwcGVuZChcInRleHRcIilcblx0ICAgICAgICAgICAgLmF0dHIoXCJ0ZXh0LWFuY2hvclwiLCBcIm1pZGRsZVwiKVxuXHQgICAgICAgICAgICAuYXR0cignY2xhc3MnLCdwaWVfbnVtYmVyJylcblx0ICAgICAgICAgICAgLmF0dHIoJ3knLDUpXG5cdCAgICAgICAgICAgIC50ZXh0KGQzLmZvcm1hdChcIi4yc1wiKSh0aGlzLnZhbHVlKSlcblx0ICAgICAgICAgICAgLmF0dHIoJ3RyYW5zZm9ybScsICd0cmFuc2xhdGUoJyArIHRoaXMud2lkdGggLyAyICsgJywnICsgdGhpcy5oZWlnaHQgLyAyICsgJyknKTtcblxuXHQgICAgfVxuXHR9O1xuXHQgdGhlTWFwLm9uKCdtb3ZlZW5kJywgZnVuY3Rpb24oKSB7XG5cdCBcdGNvbnNvbGUubG9nKCdtb3ZlIGVuZCcpOyBcblx0IH0pO1xuXHQvKnRoZU1hcC5vbihcIm1vdXNlbW92ZVwiLCBcInBvaW50cy1kYXRhLWRyaXZlblwiLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGUpO1xuICAgIH0pOyovXG5cblx0cmV0dXJuIHRoZU1hcDtcbiAgIFxufSgpKTsgLy8gZW5kIElJRkUgIiwiY29uc3QgbWJIZWxwZXIgPSB7XG4gICAgcHJvbWlzZXM6IHt9LFxuICAgIGFkZFNvdXJjZUFuZExheWVycyhzb3VyY2VPcHRpb25zLGxheWVyT3B0aW9uc0FycmF5KXsgLy8gdGhpcyA9IG1hcFxuICAgICAgICB2YXIgc291cmNlTmFtZSA9IHNvdXJjZU9wdGlvbnMubmFtZTtcbiAgICAgICAgbWJIZWxwZXIucHJvbWlzZXNbc291cmNlT3B0aW9ucy5uYW1lXSA9IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7IC8vIFRPIERPOiBmaWd1cmUgb3V0IHJlamVjdD9cbiAgICAgICAgICAgIGRlbGV0ZSBzb3VyY2VPcHRpb25zLm5hbWU7XG4gICAgICAgICAgICBmdW5jdGlvbiBjaGVja0RhdGFMb2FkZWQoKXtcbiAgICAgICAgICAgICAgICBpZiAoIHRoaXMuZ2V0U291cmNlKHNvdXJjZU5hbWUpICl7IC8vIGlmIGFkZFNvdXJjZSBoYXMgdGFrZW4gZWZmZWN0XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub2ZmKCdyZW5kZXInLCBjaGVja0RhdGFMb2FkZWQpOyAvLyB0dXJuIG9mZiB0aGUgbGlzdGVuZXIgZm9yIHJlbmRlclxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMub24oJ3JlbmRlcicsIGNoZWNrRGF0YUxvYWRlZCk7XG4gICAgICAgICAgICB0aGlzLmFkZFNvdXJjZShzb3VyY2VOYW1lLCBzb3VyY2VPcHRpb25zKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBsYXllclByb21pc2VzID0gW107XG4gICAgICAgIHJldHVybiBtYkhlbHBlci5wcm9taXNlc1tzb3VyY2VOYW1lXS50aGVuKCgpID0+IHsgXG4gICAgICAgICAgICBsYXllck9wdGlvbnNBcnJheS5mb3JFYWNoKChlYWNoKSA9PiB7XG4gICAgICAgICAgICAgICAgbGF5ZXJQcm9taXNlcy5wdXNoKFxuICAgICAgICAgICAgICAgICAgICBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4geyAvLyBUTyBETzogZmlndXJlIG91dCByZWplY3Q/XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYmVmb3JlTGF5ZXIgPSBlYWNoLmJlZm9yZUxheWVyID8gZWFjaC5iZWZvcmVMYXllciA6ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGVhY2guYmVmb3JlTGF5ZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICBlYWNoLnNvdXJjZSA9IHNvdXJjZU5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBjaGVja0xheWVyTG9hZGVkKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCB0aGlzLmdldExheWVyKGVhY2guaWQpICl7IC8vIGlmIGFkZExheWVyICBoYXMgdGFrZW4gZWZmZWN0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub2ZmKCdyZW5kZXInLCBjaGVja0xheWVyTG9hZGVkKTsgLy8gdHVybiBvZmYgdGhlIGxpc3RlbmVyIGZvciByZW5kZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9uKCdyZW5kZXInLCBjaGVja0xheWVyTG9hZGVkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkTGF5ZXIoZWFjaCwgYmVmb3JlTGF5ZXIpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLmFsbChsYXllclByb21pc2VzKTtcbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuZXhwb3J0cy5hZGRTb3VyY2VBbmRMYXllcnMgPSBtYkhlbHBlci5hZGRTb3VyY2VBbmRMYXllcnM7Il19
