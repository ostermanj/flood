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

	var theMap = new mapboxgl.Map({
		container: 'map',
		style: 'mapbox://styles/mapbox/light-v9',
		center: [-96.29192961129883, 38.453175289053746],
		zoom: 3,
		maxBounds: [[-142.88705714746362, 16.058344948432406], [-51.9023017869731, 55.76690067417138]],
		minZoom: 2.5,
		attributionControl: false
	});

	var nav = new mapboxgl.NavigationControl({ showCompass: false });
	theMap.addControl(nav, 'top-left');

	theMap.on('load', function () {

		toGeoJSON('cen_policy-simplified-2.csv');

		function go(geoJSONData) {
			console.log(geoJSONData);
			var addPointLayers = mbHelper.addSourceAndLayers.call(theMap, { // source
				"name": "policy-points",
				"type": "vector",
				//"data": geoJSONData
				"url": "mapbox://ostermanj.63wez16h"
			}, [// layers
			{ // layer one
				"id": "points",
				"type": "circle",
				"source": "policy-points",
				"source-layer": "policies",
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
				"source-layer": "policies",
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
			var addClusteredLayers = mbHelper.addSourceAndLayers.call(theMap, { // source


				"name": "policies",
				"type": "geojson",
				"data": geoJSONData,
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

			addClusteredLayers.then(function () {
				console.log('cluster layers added');
			});
			addPointLayers.then(function () {
				console.log('cluster layers added');
			});
		} // end go()  
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
				var rtn = {
					"type": "FeatureCollection",
					"features": features
				};
				console.log(rtn);
				go(rtn);
			}); // end d3 csv
		} // end toGeoJSON
	}); // end on load

	theMap.on("mousemove", "points-data-driven", function (e) {
		console.log(e);
	});

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkZXYtanMvbWFpbi5lczYiLCJub2RlX21vZHVsZXMvbWFwYm94LWhlbHBlci9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDQUMsNEcsQ0FBNkc7QUFDN0c7O0FBRUQ7Ozs7Ozs7O0FBUUE7Ozs7O0FBS0EsT0FBTyxNQUFQLEdBQWtCLFlBQVU7QUFDNUI7O0FBQ0ksVUFBUyxXQUFULEdBQXVCLDhGQUF2Qjs7QUFFQSxLQUFNLFdBQVcsUUFBUSxlQUFSLENBQWpCOztBQUVBLEtBQUksU0FBUyxJQUFJLFNBQVMsR0FBYixDQUFpQjtBQUM3QixhQUFXLEtBRGtCO0FBRTdCLFNBQU8saUNBRnNCO0FBRzdCLFVBQVEsQ0FBQyxDQUFDLGlCQUFGLEVBQXFCLGtCQUFyQixDQUhxQjtBQUk3QixRQUFNLENBSnVCO0FBSzdCLGFBQVcsQ0FBQyxDQUFDLENBQUMsa0JBQUYsRUFBc0Isa0JBQXRCLENBQUQsRUFBMkMsQ0FBQyxDQUFDLGdCQUFGLEVBQW1CLGlCQUFuQixDQUEzQyxDQUxrQjtBQU03QixXQUFTLEdBTm9CO0FBTzdCLHNCQUFvQjtBQVBTLEVBQWpCLENBQWI7O0FBVUgsS0FBSSxNQUFNLElBQUksU0FBUyxpQkFBYixDQUErQixFQUFDLGFBQVksS0FBYixFQUEvQixDQUFWO0FBQ0EsUUFBTyxVQUFQLENBQWtCLEdBQWxCLEVBQXVCLFVBQXZCOztBQUVBLFFBQU8sRUFBUCxDQUFVLE1BQVYsRUFBa0IsWUFBVTs7QUFFM0IsWUFBVSw2QkFBVjs7QUFFQSxXQUFTLEVBQVQsQ0FBWSxXQUFaLEVBQXdCO0FBQ3ZCLFdBQVEsR0FBUixDQUFZLFdBQVo7QUFDQSxPQUFJLGlCQUFpQixTQUFTLGtCQUFULENBQTRCLElBQTVCLENBQWlDLE1BQWpDLEVBQ3BCLEVBQUU7QUFD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bEIsRUFBOEIsSUFBOUIsQ0FBbUMsWUFBTTtBQUM1Qyw4QkFBa0IsT0FBbEIsQ0FBMEIsVUFBQyxJQUFELEVBQVU7QUFDaEMsOEJBQWMsSUFBZCxDQUNJLElBQUksT0FBSixDQUFZLFVBQUMsT0FBRCxFQUFhO0FBQUU7QUFDdkIsd0JBQUksY0FBYyxLQUFLLFdBQUwsR0FBbUIsS0FBSyxXQUF4QixHQUFzQyxFQUF4RDtBQUNBLDJCQUFPLEtBQUssV0FBWjtBQUNBLHlCQUFLLE1BQUwsR0FBYyxVQUFkO0FBQ0EsNkJBQVMsZ0JBQVQsR0FBMkI7QUFDdkIsNEJBQUssS0FBSyxRQUFMLENBQWMsS0FBSyxFQUFuQixDQUFMLEVBQTZCO0FBQUU7QUFDM0Isb0NBQVEsSUFBUjtBQUNBLGlDQUFLLEdBQUwsQ0FBUyxRQUFULEVBQW1CLGdCQUFuQixFQUZ5QixDQUVhO0FBQ3pDO0FBQ0o7QUFDRCwwQkFBSyxFQUFMLENBQVEsUUFBUixFQUFrQixnQkFBbEI7QUFDQSwwQkFBSyxRQUFMLENBQWMsSUFBZCxFQUFvQixXQUFwQjtBQUNILGlCQVpELENBREo7QUFlSCxhQWhCRDtBQWlCQSxtQkFBTyxRQUFRLEdBQVIsQ0FBWSxhQUFaLENBQVA7QUFDSCxTQW5CTSxDQUFQO0FBb0JIO0FBcENZLENBQWpCOztBQXVDQSxRQUFRLGtCQUFSLEdBQTZCLFNBQVMsa0JBQXRDIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24oKXtmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc31yZXR1cm4gZX0pKCkiLCIgLyogZXhwb3J0ZWQgdGhlTWFwLCBTaGFyYywgSGVscGVycywgZDNUaXAsIHJlZmxlY3QsIGFycmF5RmluZCwgU1ZHSW5uZXJIVE1MLCBTVkdGb2N1cywgY3JlYXRlQnJvd3NlQnV0dG9uICovIC8vIGxldCdzIGpzaGludCBrbm93IHRoYXQgRDNDaGFydHMgY2FuIGJlIFwiZGVmaW5lZCBidXQgbm90IHVzZWRcIiBpbiB0aGlzIGZpbGVcbiAvKiBwb2x5ZmlsbHMgbmVlZGVkOiBQcm9taXNlIFRPIERPOiBPVEhFUlM/XG4gKi9cbi8qXG5pbXBvcnQgeyByZWZsZWN0LCBhcnJheUZpbmQsIFNWR0lubmVySFRNTCwgU1ZHRm9jdXMgfSBmcm9tICcuLi9qcy12ZW5kb3IvcG9seWZpbGxzJztcbmltcG9ydCB7IEhlbHBlcnMgfSBmcm9tICcuLi9qcy1leHBvcnRzL0hlbHBlcnMnO1xuaW1wb3J0IHsgZDNUaXAgfSBmcm9tICcuLi9qcy12ZW5kb3IvZDMtdGlwJztcbmltcG9ydCB7IGNyZWF0ZUJyb3dzZUJ1dHRvbiB9IGZyb20gJy4uL2pzLWV4cG9ydHMvQnJvd3NlQnV0dG9ucyc7XG5pbXBvcnQgeyBjcmVhdGVSZXN1bHRJdGVtIH0gZnJvbSAnLi4vanMtZXhwb3J0cy9SZXN1bHRJdGVtcyc7IFxuKi9cblxuLypcbnRvIGRvIDogc2VlIGFsc28gaHR0cHM6Ly93d3cubWFwYm94LmNvbS9tYXBib3gtZ2wtanMvZXhhbXBsZS9oZWF0bWFwLWxheWVyL1xuXG5cbiovXG53aW5kb3cudGhlTWFwICA9IChmdW5jdGlvbigpeyAgIFxuXCJ1c2Ugc3RyaWN0XCI7ICBcbiAgICBtYXBib3hnbC5hY2Nlc3NUb2tlbiA9ICdway5leUoxSWpvaWIzTjBaWEp0WVc1cUlpd2lZU0k2SW1OcGRuVTVkSFZuZGpBMmVEWXliM0EzTm5nMWNHSjNaWG9pZlEuWG9fay1rekdmWVhfWW9fUkRjSERCZyc7XG5cbiAgICBjb25zdCBtYkhlbHBlciA9IHJlcXVpcmUoJ21hcGJveC1oZWxwZXInKTtcbiAgICBcbiAgICB2YXIgdGhlTWFwID0gbmV3IG1hcGJveGdsLk1hcCh7XG5cdCAgICBjb250YWluZXI6ICdtYXAnLFxuXHQgICAgc3R5bGU6ICdtYXBib3g6Ly9zdHlsZXMvbWFwYm94L2xpZ2h0LXY5Jyxcblx0ICAgIGNlbnRlcjogWy05Ni4yOTE5Mjk2MTEyOTg4MywgMzguNDUzMTc1Mjg5MDUzNzQ2XSxcblx0ICAgIHpvb206IDMsXG5cdCAgICBtYXhCb3VuZHM6IFtbLTE0Mi44ODcwNTcxNDc0NjM2MiwgMTYuMDU4MzQ0OTQ4NDMyNDA2XSxbLTUxLjkwMjMwMTc4Njk3MzEsNTUuNzY2OTAwNjc0MTcxMzhdXSxcblx0ICAgIG1pblpvb206IDIuNSxcblx0ICAgIGF0dHJpYnV0aW9uQ29udHJvbDogZmFsc2UsXG5cdH0pO1xuXG5cdHZhciBuYXYgPSBuZXcgbWFwYm94Z2wuTmF2aWdhdGlvbkNvbnRyb2woe3Nob3dDb21wYXNzOmZhbHNlfSk7XG5cdHRoZU1hcC5hZGRDb250cm9sKG5hdiwgJ3RvcC1sZWZ0Jyk7XG5cblx0dGhlTWFwLm9uKCdsb2FkJywgZnVuY3Rpb24oKXtcblxuXHRcdHRvR2VvSlNPTignY2VuX3BvbGljeS1zaW1wbGlmaWVkLTIuY3N2Jyk7XG5cdFx0XG5cdFx0ZnVuY3Rpb24gZ28oZ2VvSlNPTkRhdGEpe1xuXHRcdFx0Y29uc29sZS5sb2coZ2VvSlNPTkRhdGEpO1xuXHRcdFx0dmFyIGFkZFBvaW50TGF5ZXJzID0gbWJIZWxwZXIuYWRkU291cmNlQW5kTGF5ZXJzLmNhbGwodGhlTWFwLFxuXHRcdFx0XHR7IC8vIHNvdXJjZVxuXHRcdFx0XHRcdFwibmFtZVwiOiBcInBvbGljeS1wb2ludHNcIixcblx0XHRcdCAgICAgICAgXCJ0eXBlXCI6IFwidmVjdG9yXCIsXG5cdFx0XHQgICAgICAgIC8vXCJkYXRhXCI6IGdlb0pTT05EYXRhXG5cdFx0XHQgICAgICAgIFwidXJsXCI6IFwibWFwYm94Oi8vb3N0ZXJtYW5qLjYzd2V6MTZoXCJcblx0XHRcdFx0fSwgWyAvLyBsYXllcnNcblx0XHRcdFx0XHR7IC8vIGxheWVyIG9uZVxuXHRcdCAgICAgICAgICAgIFwiaWRcIjogXCJwb2ludHNcIixcblx0XHQgICAgICAgICAgICBcInR5cGVcIjogXCJjaXJjbGVcIixcblx0XHQgICAgICAgICAgICBcInNvdXJjZVwiOiBcInBvbGljeS1wb2ludHNcIixcblx0XHQgICAgICAgICAgICBcInNvdXJjZS1sYXllclwiOiBcInBvbGljaWVzXCIsXG5cdFx0ICAgICAgICAgICAgXCJtYXh6b29tXCI6IDksXG5cdFx0ICAgICAgICAgICAgXCJwYWludFwiOiB7XG5cdFx0ICAgICAgICAgICAgICBcdFwiY2lyY2xlLWNvbG9yXCI6IFtcblx0XHRcdCAgICAgICAgICAgICAgICAnbWF0Y2gnLFxuXHRcdFx0ICAgICAgICAgICAgICAgIFsnZ2V0JywgJ3RfZGVkJ10sXG5cdFx0XHQgICAgICAgICAgICAgICAgNSwgJyMwNTE4MzknLFxuXHRcdFx0ICAgICAgICAgICAgICAgIC8qIG90aGVyICovICcjOTkwMDAwJ1xuXHRcdFx0ICAgICAgICAgICAgXSxcblx0XHRcdCAgICAgICAgICAgIFwiY2lyY2xlLXJhZGl1c1wiOiB7XG5cdFx0XHQgICAgICAgICAgICAgICAgJ3N0b3BzJzogW1s1LCAzXSwgWzgsIDE4XV1cblx0XHRcdCAgICAgICAgICAgIH0sXG5cdFx0XHQgICAgICAgICAgICBcImNpcmNsZS1vcGFjaXR5XCI6IDAuMVxuXHRcdFx0ICAgICAgICAgICAgfVxuXHRcdFx0ICAgICAgICB9LFxuXHRcdFx0ICAgICAgICB7IC8vIGxheWVyIHR3b1xuXHRcdCAgICAgICAgICAgIFwiaWRcIjogXCJwb2ludHMtZGF0YS1kcml2ZW5cIixcblx0XHQgICAgICAgICAgICBcInR5cGVcIjogXCJjaXJjbGVcIixcblx0XHQgICAgICAgICAgICBcInNvdXJjZVwiOiBcInBvbGljeS1wb2ludHNcIixcblx0XHQgICAgICAgICAgICBcInNvdXJjZS1sYXllclwiOiBcInBvbGljaWVzXCIsXG5cdFx0ICAgICAgICAgICAgXCJtaW56b29tXCI6IDksXG5cdFx0ICAgICAgICAgICAgXCJwYWludFwiOiB7XG5cdFx0ICAgICAgICAgICAgICBcdFwiY2lyY2xlLWNvbG9yXCI6IFtcblx0XHRcdCAgICAgICAgICAgICAgICAnbWF0Y2gnLFxuXHRcdFx0ICAgICAgICAgICAgICAgIFsnZ2V0JywgJ3RfZGVkJ10sXG5cdFx0XHQgICAgICAgICAgICAgICAgNSwgJyMwNTE4MzknLFxuXHRcdFx0ICAgICAgICAgICAgICAgIC8qIG90aGVyICovICcjOTkwMDAwJ1xuXHRcdFx0ICAgICAgICAgICAgXSxcblx0XHRcdCAgICAgICAgICAgIFwiY2lyY2xlLXJhZGl1c1wiOiB7XG5cdFx0XHQgICAgICAgICAgICBcdHByb3BlcnR5OiAncHJlbScsXG5cdFx0XHQgICAgICAgICAgICAgICAgdHlwZTogJ2V4cG9uZW50aWFsJyxcblx0XHRcdFx0XHQgICAgICAgIHN0b3BzOiBbXG5cdFx0XHRcdFx0ICAgICAgICAgIFs2MiwgNV0sXG5cdFx0XHRcdFx0ICAgICAgICAgIFsyNTAwLCA2MF1cblx0XHRcdFx0XHQgICAgICAgIF1cblx0XHRcdCAgICAgICAgICAgIH0sXG5cdFx0XHQgICAgICAgICAgICBcImNpcmNsZS1vcGFjaXR5XCI6IDAuMSxcblx0XHRcdCAgICAgICAgICAgIFwiY2lyY2xlLXN0cm9rZS1jb2xvclwiOiBcIiNmZmZmZmZcIixcblx0XHRcdCAgICAgICAgICAgIFwiY2lyY2xlLXN0cm9rZS13aWR0aFwiOiAxXG5cdFx0XHQgICAgICAgIH1cblx0XHRcdFx0fV1cblx0XHRcdCk7XG5cdFx0XHR2YXIgYWRkQ2x1c3RlcmVkTGF5ZXJzID0gbWJIZWxwZXIuYWRkU291cmNlQW5kTGF5ZXJzLmNhbGwodGhlTWFwLFxuXHRcdFx0ICAgIHsgLy8gc291cmNlXG5cblxuXHRcdFx0ICAgIFx0XCJuYW1lXCI6IFwicG9saWNpZXNcIixcblx0XHRcdCAgICAgICAgXCJ0eXBlXCI6IFwiZ2VvanNvblwiLFxuXHRcdFx0ICAgICAgICBcImRhdGFcIjogZ2VvSlNPTkRhdGEsXG5cdFx0XHQgICAgICAgIFwiY2x1c3RlclwiOiB0cnVlLFxuXHRcdFx0ICAgICAgICBcImNsdXN0ZXJSYWRpdXNcIjogMC41IC8vIFJhZGl1cyBvZiBlYWNoIGNsdXN0ZXIgd2hlbiBjbHVzdGVyaW5nIHBvaW50cyAoZGVmYXVsdHMgdG8gNTApXG5cdFx0XHQgICAgfSwgWyAvLyBsYXllcnNcblxuXHRcdFx0ICAgICAgIHsgLy8gbGF5ZXIgb25lXG5cdFx0XHQgICAgICAgICAgICBpZDogXCJjbHVzdGVyLWNvdW50XCIsXG5cdFx0XHRcdCAgICAgICAgdHlwZTogXCJzeW1ib2xcIixcblx0XHRcdFx0ICAgICAgICBzb3VyY2U6IFwicG9saWNpZXNcIixcblx0XHRcdFx0ICAgICAgICBmaWx0ZXI6IFtcImhhc1wiLCBcInBvaW50X2NvdW50XCJdLFxuXHRcdFx0XHQgICAgICAgIFwibWluem9vbVwiOiA2LFxuXHRcdFx0XHQgICAgICAgIGxheW91dDoge1xuXHRcdFx0XHQgICAgICAgICAgICBcInRleHQtZmllbGRcIjogXCJ7cG9pbnRfY291bnRfYWJicmV2aWF0ZWR9XCIsXG5cdFx0XHRcdCAgICAgICAgICAgIFwidGV4dC1zaXplXCI6IDEyLFxuXG5cdFx0XHRcdCAgICAgICAgfSxcblx0XHRcdFx0ICAgICAgICBcInBhaW50XCI6IHtcblx0XHRcdFx0ICAgICAgICBcdFwidGV4dC1jb2xvclwiOiBcIiNmZmZmZmZcIlxuXHRcdFx0XHQgICAgICAgIH1cblx0XHRcdCAgICAgICAgfVxuXHRcdCAgICAgICAgXSAvLyBlbmQgbGF5ZXJzIGFycmF5XG5cdFx0ICAgICk7IC8vIGVuZCBhZGRsYXllcnNcblxuXHRcdCAgIGFkZENsdXN0ZXJlZExheWVycy50aGVuKCgpID0+IHsgY29uc29sZS5sb2coJ2NsdXN0ZXIgbGF5ZXJzIGFkZGVkJyk7fSk7XG5cdFx0ICAgYWRkUG9pbnRMYXllcnMudGhlbigoKSA9PiB7IGNvbnNvbGUubG9nKCdjbHVzdGVyIGxheWVycyBhZGRlZCcpO30pO1xuXHRcdH0gLy8gZW5kIGdvKCkgIFxuXHRcdGZ1bmN0aW9uIHRvR2VvSlNPTih1cmwpe1xuXHRcdFx0XG5cdFx0XHRkMy5jc3YodXJsLCBmdW5jdGlvbihlcnIsIGRhdGEpe1xuXHRcdFx0XHRpZiAoZXJyKSB7XG5cdFx0XHRcdFx0dGhyb3cgZXJyO1xuXHRcdFx0XHR9XG5cdFx0XHRcdC8vY29uc29sZS5sb2coZGF0YSk7XG5cdFx0XHRcdHZhciBmZWF0dXJlcyA9IFtdO1xuXHRcdFx0XHRkYXRhLmZvckVhY2goZWFjaCA9PiB7XG5cdFx0XHRcdFx0dmFyIGNvZXJjZWQgPSB7fTtcblx0XHRcdFx0XHRmb3IgKCB2YXIga2V5IGluIGVhY2ggKSB7XG5cdFx0XHRcdFx0XHRpZiAoIGVhY2guaGFzT3duUHJvcGVydHkoa2V5KSApe1xuXHRcdFx0XHRcdFx0XHRjb2VyY2VkW2tleV0gPSAhaXNOYU4oK2VhY2hba2V5XSkgPyArZWFjaFtrZXldIDogZWFjaFtrZXldO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRmZWF0dXJlcy5wdXNoKHtcblx0XHRcdFx0XHRcdFwidHlwZVwiOiBcIkZlYXR1cmVcIixcblx0XHRcdFx0XHRcdFwicHJvcGVydGllc1wiOiBjb2VyY2VkLFxuXHRcdFx0XHRcdFx0XCJnZW9tZXRyeVwiOiB7XG5cdFx0XHRcdFx0XHRcdFwidHlwZVwiOiBcIlBvaW50XCIsXG5cdFx0XHRcdFx0XHRcdFwiY29vcmRpbmF0ZXNcIjogWytlYWNoLmxvbmdpdHVkZSwgK2VhY2gubGF0aXR1ZGVdXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pOyAvLyBlbmQgZm9yRWFjaFxuXHRcdFx0XHR2YXIgcnRuID0gIHtcblx0XHRcdFx0XHRcInR5cGVcIjogXCJGZWF0dXJlQ29sbGVjdGlvblwiLFxuXHRcdFx0XHRcdFwiZmVhdHVyZXNcIjogZmVhdHVyZXNcblx0XHRcdFx0fTtcblx0XHRcdFx0Y29uc29sZS5sb2cocnRuKTtcblx0XHRcdFx0Z28ocnRuKTtcblx0XHRcdH0pOyAvLyBlbmQgZDMgY3N2XG5cdFx0fSAvLyBlbmQgdG9HZW9KU09OXG5cdH0pOyAvLyBlbmQgb24gbG9hZFxuXG5cdCB0aGVNYXAub24oXCJtb3VzZW1vdmVcIiwgXCJwb2ludHMtZGF0YS1kcml2ZW5cIiwgZnVuY3Rpb24oZSkge1xuICAgICAgICBjb25zb2xlLmxvZyhlKTtcbiAgICB9KTtcblxuXHRyZXR1cm4gdGhlTWFwO1xuICAgXG59KCkpOyAvLyBlbmQgSUlGRSAiLCJjb25zdCBtYkhlbHBlciA9IHtcbiAgICBwcm9taXNlczoge30sXG4gICAgYWRkU291cmNlQW5kTGF5ZXJzKHNvdXJjZU9wdGlvbnMsbGF5ZXJPcHRpb25zQXJyYXkpeyAvLyB0aGlzID0gbWFwXG4gICAgICAgIHZhciBzb3VyY2VOYW1lID0gc291cmNlT3B0aW9ucy5uYW1lO1xuICAgICAgICBtYkhlbHBlci5wcm9taXNlc1tzb3VyY2VPcHRpb25zLm5hbWVdID0gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHsgLy8gVE8gRE86IGZpZ3VyZSBvdXQgcmVqZWN0P1xuICAgICAgICAgICAgZGVsZXRlIHNvdXJjZU9wdGlvbnMubmFtZTtcbiAgICAgICAgICAgIGZ1bmN0aW9uIGNoZWNrRGF0YUxvYWRlZCgpe1xuICAgICAgICAgICAgICAgIGlmICggdGhpcy5nZXRTb3VyY2Uoc291cmNlTmFtZSkgKXsgLy8gaWYgYWRkU291cmNlIGhhcyB0YWtlbiBlZmZlY3RcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vZmYoJ3JlbmRlcicsIGNoZWNrRGF0YUxvYWRlZCk7IC8vIHR1cm4gb2ZmIHRoZSBsaXN0ZW5lciBmb3IgcmVuZGVyXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5vbigncmVuZGVyJywgY2hlY2tEYXRhTG9hZGVkKTtcbiAgICAgICAgICAgIHRoaXMuYWRkU291cmNlKHNvdXJjZU5hbWUsIHNvdXJjZU9wdGlvbnMpO1xuICAgICAgICB9KTtcbiAgICAgICAgdmFyIGxheWVyUHJvbWlzZXMgPSBbXTtcbiAgICAgICAgcmV0dXJuIG1iSGVscGVyLnByb21pc2VzW3NvdXJjZU5hbWVdLnRoZW4oKCkgPT4geyBcbiAgICAgICAgICAgIGxheWVyT3B0aW9uc0FycmF5LmZvckVhY2goKGVhY2gpID0+IHtcbiAgICAgICAgICAgICAgICBsYXllclByb21pc2VzLnB1c2goXG4gICAgICAgICAgICAgICAgICAgIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7IC8vIFRPIERPOiBmaWd1cmUgb3V0IHJlamVjdD9cbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBiZWZvcmVMYXllciA9IGVhY2guYmVmb3JlTGF5ZXIgPyBlYWNoLmJlZm9yZUxheWVyIDogJyc7XG4gICAgICAgICAgICAgICAgICAgICAgICBkZWxldGUgZWFjaC5iZWZvcmVMYXllcjtcbiAgICAgICAgICAgICAgICAgICAgICAgIGVhY2guc291cmNlID0gc291cmNlTmFtZTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIGNoZWNrTGF5ZXJMb2FkZWQoKXtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIHRoaXMuZ2V0TGF5ZXIoZWFjaC5pZCkgKXsgLy8gaWYgYWRkTGF5ZXIgIGhhcyB0YWtlbiBlZmZlY3RcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZSh0cnVlKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vZmYoJ3JlbmRlcicsIGNoZWNrTGF5ZXJMb2FkZWQpOyAvLyB0dXJuIG9mZiB0aGUgbGlzdGVuZXIgZm9yIHJlbmRlclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub24oJ3JlbmRlcicsIGNoZWNrTGF5ZXJMb2FkZWQpO1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRMYXllcihlYWNoLCBiZWZvcmVMYXllcik7XG4gICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKGxheWVyUHJvbWlzZXMpO1xuICAgICAgICB9KTtcbiAgICB9XG59O1xuXG5leHBvcnRzLmFkZFNvdXJjZUFuZExheWVycyA9IG1iSGVscGVyLmFkZFNvdXJjZUFuZExheWVyczsiXX0=
