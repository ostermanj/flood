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
		zoom: 3

	});

	theMap.on('load', function () {

		toGeoJSON('cen_policy-simplified.csv');

		function go(geoJSONData) {
			var addLayers = mbHelper.addSourceAndLayers.call(theMap, { // source
				"name": "policies",
				"type": "geojson",
				"data": geoJSONData,
				"cluster": true,
				"clusterMaxZoom": 14, // Max zoom to cluster points on
				"clusterRadius": 25 // Radius of each cluster when clustering points (defaults to 50)
			}, [// layers
			{ // layer one
				"id": "clusters",
				"type": "circle",
				"source": "policies",
				"filter": ["has", "point_count"],
				"paint": {
					"circle-color": ["step", ["get", "point_count"], "#51bbd6", 100, "#f1f075", 750, "#f28cb1"],
					"circle-radius": ["step", ["get", "point_count"], 20, 100, 30, 750, 40]
				},
				"beforeLayer": "water" // <== this is different from mapbox native specs
			}, { // layer two
				id: "cluster-count",
				type: "symbol",
				source: "policies",
				filter: ["has", "point_count"],
				layout: {
					"text-field": "{point_count_abbreviated}",
					"text-size": 12
				}
			}, { // layer three
				id: "unclustered-point",
				type: "circle",
				source: "policies",
				filter: ["!has", "point_count"],
				paint: {
					"circle-color": "#11b4da",
					"circle-radius": 4,
					"circle-stroke-width": 1,
					"circle-stroke-color": "#fff"
				}
			}] // end layers array
			); // end addlayers

			addLayers.then(function () {
				console.log('added');
			});
		} // end continue
		function toGeoJSON(url) {

			d3.csv(url, function (err, data) {
				if (err) {
					throw err;
				}
				//console.log(data);
				var features = [];
				data.forEach(function (each) {
					features.push({
						"type": "Feature",
						"properties": each,
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkZXYtanMvbWFpbi5lczYiLCJub2RlX21vZHVsZXMvbWFwYm94LWhlbHBlci9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDQUMsNEcsQ0FBNkc7QUFDN0c7O0FBRUQ7Ozs7Ozs7O0FBUUE7Ozs7O0FBS0EsT0FBTyxNQUFQLEdBQWtCLFlBQVU7QUFDNUI7O0FBQ0ksVUFBUyxXQUFULEdBQXVCLDhGQUF2Qjs7QUFFQSxLQUFNLFdBQVcsUUFBUSxlQUFSLENBQWpCOztBQUVBLEtBQUksU0FBUyxJQUFJLFNBQVMsR0FBYixDQUFpQjtBQUM3QixhQUFXLEtBRGtCO0FBRTdCLFNBQU8saUNBRnNCO0FBRzdCLFVBQVEsQ0FBQyxDQUFDLGlCQUFGLEVBQXFCLGtCQUFyQixDQUhxQjtBQUk3QixRQUFNOztBQUp1QixFQUFqQixDQUFiOztBQVFILFFBQU8sRUFBUCxDQUFVLE1BQVYsRUFBa0IsWUFBVTs7QUFFM0IsWUFBVSwyQkFBVjs7QUFFQSxXQUFTLEVBQVQsQ0FBWSxXQUFaLEVBQXdCO0FBQ3ZCLE9BQUksWUFBWSxTQUFTLGtCQUFULENBQTRCLElBQTVCLENBQWlDLE1BQWpDLEVBQ1osRUFBRTtBQUNELFlBQVEsVUFEVDtBQUVJLFlBQVEsU0FGWjtBQUdJLFlBQVEsV0FIWjtBQUlJLGVBQVcsSUFKZjtBQUtJLHNCQUFrQixFQUx0QixFQUswQjtBQUN0QixxQkFBaUIsRUFOckIsQ0FNd0I7QUFOeEIsSUFEWSxFQVFULENBQUU7QUFDRCxLQUFFO0FBQ0UsVUFBTSxVQURWO0FBRUksWUFBUSxRQUZaO0FBR0ksY0FBVSxVQUhkO0FBSUksY0FBVSxDQUFDLEtBQUQsRUFBTyxhQUFQLENBSmQ7QUFLSSxhQUFTO0FBQ0wscUJBQWdCLENBQ2YsTUFEZSxFQUVmLENBQUMsS0FB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YyxJQUFkLENBQ0ksSUFBSSxPQUFKLENBQVksVUFBQyxPQUFELEVBQWE7QUFBRTtBQUN2Qix3QkFBSSxjQUFjLEtBQUssV0FBTCxHQUFtQixLQUFLLFdBQXhCLEdBQXNDLEVBQXhEO0FBQ0EsMkJBQU8sS0FBSyxXQUFaO0FBQ0EseUJBQUssTUFBTCxHQUFjLFVBQWQ7QUFDQSw2QkFBUyxnQkFBVCxHQUEyQjtBQUN2Qiw0QkFBSyxLQUFLLFFBQUwsQ0FBYyxLQUFLLEVBQW5CLENBQUwsRUFBNkI7QUFBRTtBQUMzQixvQ0FBUSxJQUFSO0FBQ0EsaUNBQUssR0FBTCxDQUFTLFFBQVQsRUFBbUIsZ0JBQW5CLEVBRnlCLENBRWE7QUFDekM7QUFDSjtBQUNELDBCQUFLLEVBQUwsQ0FBUSxRQUFSLEVBQWtCLGdCQUFsQjtBQUNBLDBCQUFLLFFBQUwsQ0FBYyxJQUFkLEVBQW9CLFdBQXBCO0FBQ0gsaUJBWkQsQ0FESjtBQWVILGFBaEJEO0FBaUJBLG1CQUFPLFFBQVEsR0FBUixDQUFZLGFBQVosQ0FBUDtBQUNILFNBbkJNLENBQVA7QUFvQkg7QUFwQ1ksQ0FBakI7O0FBdUNBLFFBQVEsa0JBQVIsR0FBNkIsU0FBUyxrQkFBdEMiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfXJldHVybiBlfSkoKSIsIiAvKiBleHBvcnRlZCB0aGVNYXAsIFNoYXJjLCBIZWxwZXJzLCBkM1RpcCwgcmVmbGVjdCwgYXJyYXlGaW5kLCBTVkdJbm5lckhUTUwsIFNWR0ZvY3VzLCBjcmVhdGVCcm93c2VCdXR0b24gKi8gLy8gbGV0J3MganNoaW50IGtub3cgdGhhdCBEM0NoYXJ0cyBjYW4gYmUgXCJkZWZpbmVkIGJ1dCBub3QgdXNlZFwiIGluIHRoaXMgZmlsZVxuIC8qIHBvbHlmaWxscyBuZWVkZWQ6IFByb21pc2UgVE8gRE86IE9USEVSUz9cbiAqL1xuLypcbmltcG9ydCB7IHJlZmxlY3QsIGFycmF5RmluZCwgU1ZHSW5uZXJIVE1MLCBTVkdGb2N1cyB9IGZyb20gJy4uL2pzLXZlbmRvci9wb2x5ZmlsbHMnO1xuaW1wb3J0IHsgSGVscGVycyB9IGZyb20gJy4uL2pzLWV4cG9ydHMvSGVscGVycyc7XG5pbXBvcnQgeyBkM1RpcCB9IGZyb20gJy4uL2pzLXZlbmRvci9kMy10aXAnO1xuaW1wb3J0IHsgY3JlYXRlQnJvd3NlQnV0dG9uIH0gZnJvbSAnLi4vanMtZXhwb3J0cy9Ccm93c2VCdXR0b25zJztcbmltcG9ydCB7IGNyZWF0ZVJlc3VsdEl0ZW0gfSBmcm9tICcuLi9qcy1leHBvcnRzL1Jlc3VsdEl0ZW1zJzsgXG4qL1xuXG4vKlxudG8gZG8gOiBzZWUgYWxzbyBodHRwczovL3d3dy5tYXBib3guY29tL21hcGJveC1nbC1qcy9leGFtcGxlL2hlYXRtYXAtbGF5ZXIvXG5cblxuKi9cbndpbmRvdy50aGVNYXAgID0gKGZ1bmN0aW9uKCl7ICAgXG5cInVzZSBzdHJpY3RcIjsgIFxuICAgIG1hcGJveGdsLmFjY2Vzc1Rva2VuID0gJ3BrLmV5SjFJam9pYjNOMFpYSnRZVzVxSWl3aVlTSTZJbU5wZG5VNWRIVm5kakEyZURZeWIzQTNObmcxY0dKM1pYb2lmUS5Yb19rLWt6R2ZZWF9Zb19SRGNIREJnJztcblxuICAgIGNvbnN0IG1iSGVscGVyID0gcmVxdWlyZSgnbWFwYm94LWhlbHBlcicpO1xuICAgIFxuICAgIHZhciB0aGVNYXAgPSBuZXcgbWFwYm94Z2wuTWFwKHtcblx0ICAgIGNvbnRhaW5lcjogJ21hcCcsXG5cdCAgICBzdHlsZTogJ21hcGJveDovL3N0eWxlcy9tYXBib3gvbGlnaHQtdjknLFxuXHQgICAgY2VudGVyOiBbLTk2LjI5MTkyOTYxMTI5ODgzLCAzOC40NTMxNzUyODkwNTM3NDZdLFxuXHQgICAgem9vbTogM1xuXG5cdH0pO1xuXG5cdHRoZU1hcC5vbignbG9hZCcsIGZ1bmN0aW9uKCl7XG5cblx0XHR0b0dlb0pTT04oJ2Nlbl9wb2xpY3ktc2ltcGxpZmllZC5jc3YnKTtcblx0XHRcblx0XHRmdW5jdGlvbiBnbyhnZW9KU09ORGF0YSl7XG5cdFx0XHR2YXIgYWRkTGF5ZXJzID0gbWJIZWxwZXIuYWRkU291cmNlQW5kTGF5ZXJzLmNhbGwodGhlTWFwLFxuXHRcdFx0ICAgIHsgLy8gc291cmNlXG5cdFx0XHQgICAgXHRcIm5hbWVcIjogXCJwb2xpY2llc1wiLFxuXHRcdFx0ICAgICAgICBcInR5cGVcIjogXCJnZW9qc29uXCIsXG5cdFx0XHQgICAgICAgIFwiZGF0YVwiOiBnZW9KU09ORGF0YSxcblx0XHRcdCAgICAgICAgXCJjbHVzdGVyXCI6IHRydWUsXG5cdFx0XHQgICAgICAgIFwiY2x1c3Rlck1heFpvb21cIjogMTQsIC8vIE1heCB6b29tIHRvIGNsdXN0ZXIgcG9pbnRzIG9uXG5cdFx0XHQgICAgICAgIFwiY2x1c3RlclJhZGl1c1wiOiAyNSAvLyBSYWRpdXMgb2YgZWFjaCBjbHVzdGVyIHdoZW4gY2x1c3RlcmluZyBwb2ludHMgKGRlZmF1bHRzIHRvIDUwKVxuXHRcdFx0ICAgIH0sIFsgLy8gbGF5ZXJzXG5cdFx0XHQgICAgICAgIHsgLy8gbGF5ZXIgb25lXG5cdFx0XHQgICAgICAgICAgICBcImlkXCI6IFwiY2x1c3RlcnNcIixcblx0XHRcdCAgICAgICAgICAgIFwidHlwZVwiOiBcImNpcmNsZVwiLFxuXHRcdFx0ICAgICAgICAgICAgXCJzb3VyY2VcIjogXCJwb2xpY2llc1wiLFxuXHRcdFx0ICAgICAgICAgICAgXCJmaWx0ZXJcIjogW1wiaGFzXCIsXCJwb2ludF9jb3VudFwiXSxcblx0XHRcdCAgICAgICAgICAgIFwicGFpbnRcIjoge1xuXHRcdFx0ICAgICAgICAgICAgICBcdCBcImNpcmNsZS1jb2xvclwiOiBbXG5cdFx0XHRcdCAgICAgICAgICAgICAgICBcInN0ZXBcIixcblx0XHRcdFx0ICAgICAgICAgICAgICAgIFtcImdldFwiLCBcInBvaW50X2NvdW50XCJdLFxuXHRcdFx0XHQgICAgICAgICAgICAgICAgXCIjNTFiYmQ2XCIsXG5cdFx0XHRcdCAgICAgICAgICAgICAgICAxMDAsXG5cdFx0XHRcdCAgICAgICAgICAgICAgICBcIiNmMWYwNzVcIixcblx0XHRcdFx0ICAgICAgICAgICAgICAgIDc1MCxcblx0XHRcdFx0ICAgICAgICAgICAgICAgIFwiI2YyOGNiMVwiXG5cdFx0XHRcdCAgICAgICAgICAgIF0sXG5cdFx0XHRcdCAgICAgICAgICAgIFwiY2lyY2xlLXJhZGl1c1wiOiBbXG5cdFx0XHRcdCAgICAgICAgICAgICAgICBcInN0ZXBcIixcblx0XHRcdFx0ICAgICAgICAgICAgICAgIFtcImdldFwiLCBcInBvaW50X2NvdW50XCJdLFxuXHRcdFx0XHQgICAgICAgICAgICAgICAgMjAsXG5cdFx0XHRcdCAgICAgICAgICAgICAgICAxMDAsXG5cdFx0XHRcdCAgICAgICAgICAgICAgICAzMCxcblx0XHRcdFx0ICAgICAgICAgICAgICAgIDc1MCxcblx0XHRcdFx0ICAgICAgICAgICAgICAgIDQwXG5cdFx0XHRcdCAgICAgICAgICAgIF1cblx0XHRcdCAgICAgICAgICAgIH0sXG5cdFx0XHQgICAgICAgICAgICBcImJlZm9yZUxheWVyXCI6IFwid2F0ZXJcIiAvLyA8PT0gdGhpcyBpcyBkaWZmZXJlbnQgZnJvbSBtYXBib3ggbmF0aXZlIHNwZWNzXG5cdFx0XHQgICAgICAgIH0sXG5cdFx0XHQgICAgICAgIHsgLy8gbGF5ZXIgdHdvXG5cdFx0XHQgICAgICAgICAgICBpZDogXCJjbHVzdGVyLWNvdW50XCIsXG5cdFx0XHRcdCAgICAgICAgdHlwZTogXCJzeW1ib2xcIixcblx0XHRcdFx0ICAgICAgICBzb3VyY2U6IFwicG9saWNpZXNcIixcblx0XHRcdFx0ICAgICAgICBmaWx0ZXI6IFtcImhhc1wiLCBcInBvaW50X2NvdW50XCJdLFxuXHRcdFx0XHQgICAgICAgIGxheW91dDoge1xuXHRcdFx0XHQgICAgICAgICAgICBcInRleHQtZmllbGRcIjogXCJ7cG9pbnRfY291bnRfYWJicmV2aWF0ZWR9XCIsXG5cdFx0XHRcdCAgICAgICAgICAgIFwidGV4dC1zaXplXCI6IDEyXG5cdFx0XHRcdCAgICAgICAgfVxuXHRcdFx0ICAgICAgICB9LFxuXHRcdFx0ICAgICAgICB7IC8vIGxheWVyIHRocmVlXG5cdFx0XHQgICAgICAgIFx0aWQ6IFwidW5jbHVzdGVyZWQtcG9pbnRcIixcblx0XHRcdFx0ICAgICAgICB0eXBlOiBcImNpcmNsZVwiLFxuXHRcdFx0XHQgICAgICAgIHNvdXJjZTogXCJwb2xpY2llc1wiLFxuXHRcdFx0XHQgICAgICAgIGZpbHRlcjogW1wiIWhhc1wiLCBcInBvaW50X2NvdW50XCJdLFxuXHRcdFx0XHQgICAgICAgIHBhaW50OiB7XG5cdFx0XHRcdCAgICAgICAgICAgIFwiY2lyY2xlLWNvbG9yXCI6IFwiIzExYjRkYVwiLFxuXHRcdFx0XHQgICAgICAgICAgICBcImNpcmNsZS1yYWRpdXNcIjogNCxcblx0XHRcdFx0ICAgICAgICAgICAgXCJjaXJjbGUtc3Ryb2tlLXdpZHRoXCI6IDEsXG5cdFx0XHRcdCAgICAgICAgICAgIFwiY2lyY2xlLXN0cm9rZS1jb2xvclwiOiBcIiNmZmZcIlxuXHRcdFx0XHQgICAgICAgIH1cblx0XHRcdCAgICAgICAgfVxuXHRcdCAgICAgICAgXSAvLyBlbmQgbGF5ZXJzIGFycmF5XG5cdFx0ICAgICk7IC8vIGVuZCBhZGRsYXllcnNcblxuXHRcdCAgICBhZGRMYXllcnMudGhlbigoKSA9PiB7IGNvbnNvbGUubG9nKCdhZGRlZCcpO30pO1xuXHRcdH0gLy8gZW5kIGNvbnRpbnVlXG5cdFx0ZnVuY3Rpb24gdG9HZW9KU09OKHVybCl7XG5cdFx0XHRcblx0XHRcdGQzLmNzdih1cmwsIGZ1bmN0aW9uKGVyciwgZGF0YSl7XG5cdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHR0aHJvdyBlcnI7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly9jb25zb2xlLmxvZyhkYXRhKTtcblx0XHRcdFx0dmFyIGZlYXR1cmVzID0gW107XG5cdFx0XHRcdGRhdGEuZm9yRWFjaChlYWNoID0+IHtcblx0XHRcdFx0XHRmZWF0dXJlcy5wdXNoKHtcblx0XHRcdFx0XHRcdFwidHlwZVwiOiBcIkZlYXR1cmVcIixcblx0XHRcdFx0XHRcdFwicHJvcGVydGllc1wiOiBlYWNoLFxuXHRcdFx0XHRcdFx0XCJnZW9tZXRyeVwiOiB7XG5cdFx0XHRcdFx0XHRcdFwidHlwZVwiOiBcIlBvaW50XCIsXG5cdFx0XHRcdFx0XHRcdFwiY29vcmRpbmF0ZXNcIjogWytlYWNoLmxvbmdpdHVkZSwgK2VhY2gubGF0aXR1ZGVdXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pOyAvLyBlbmQgZm9yRWFjaFxuXHRcdFx0XHR2YXIgcnRuID0gIHtcblx0XHRcdFx0XHRcInR5cGVcIjogXCJGZWF0dXJlQ29sbGVjdGlvblwiLFxuXHRcdFx0XHRcdFwiZmVhdHVyZXNcIjogZmVhdHVyZXNcblx0XHRcdFx0fTtcblx0XHRcdFx0Y29uc29sZS5sb2cocnRuKTtcblx0XHRcdFx0Z28ocnRuKTtcblx0XHRcdH0pOyAvLyBlbmQgZDMgY3N2XG5cdFx0fSAvLyBlbmQgdG9HZW9KU09OXG5cdH0pOyAvLyBlbmQgb24gbG9hZFxuXG5cdFxuXG5cdHJldHVybiB0aGVNYXA7XG4gICBcbn0oKSk7IC8vIGVuZCBJSUZFICIsImNvbnN0IG1iSGVscGVyID0ge1xuICAgIHByb21pc2VzOiB7fSxcbiAgICBhZGRTb3VyY2VBbmRMYXllcnMoc291cmNlT3B0aW9ucyxsYXllck9wdGlvbnNBcnJheSl7IC8vIHRoaXMgPSBtYXBcbiAgICAgICAgdmFyIHNvdXJjZU5hbWUgPSBzb3VyY2VPcHRpb25zLm5hbWU7XG4gICAgICAgIG1iSGVscGVyLnByb21pc2VzW3NvdXJjZU9wdGlvbnMubmFtZV0gPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4geyAvLyBUTyBETzogZmlndXJlIG91dCByZWplY3Q/XG4gICAgICAgICAgICBkZWxldGUgc291cmNlT3B0aW9ucy5uYW1lO1xuICAgICAgICAgICAgZnVuY3Rpb24gY2hlY2tEYXRhTG9hZGVkKCl7XG4gICAgICAgICAgICAgICAgaWYgKCB0aGlzLmdldFNvdXJjZShzb3VyY2VOYW1lKSApeyAvLyBpZiBhZGRTb3VyY2UgaGFzIHRha2VuIGVmZmVjdFxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9mZigncmVuZGVyJywgY2hlY2tEYXRhTG9hZGVkKTsgLy8gdHVybiBvZmYgdGhlIGxpc3RlbmVyIGZvciByZW5kZXJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLm9uKCdyZW5kZXInLCBjaGVja0RhdGFMb2FkZWQpO1xuICAgICAgICAgICAgdGhpcy5hZGRTb3VyY2Uoc291cmNlTmFtZSwgc291cmNlT3B0aW9ucyk7XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgbGF5ZXJQcm9taXNlcyA9IFtdO1xuICAgICAgICByZXR1cm4gbWJIZWxwZXIucHJvbWlzZXNbc291cmNlTmFtZV0udGhlbigoKSA9PiB7IFxuICAgICAgICAgICAgbGF5ZXJPcHRpb25zQXJyYXkuZm9yRWFjaCgoZWFjaCkgPT4ge1xuICAgICAgICAgICAgICAgIGxheWVyUHJvbWlzZXMucHVzaChcbiAgICAgICAgICAgICAgICAgICAgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHsgLy8gVE8gRE86IGZpZ3VyZSBvdXQgcmVqZWN0P1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGJlZm9yZUxheWVyID0gZWFjaC5iZWZvcmVMYXllciA/IGVhY2guYmVmb3JlTGF5ZXIgOiAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBlYWNoLmJlZm9yZUxheWVyO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWFjaC5zb3VyY2UgPSBzb3VyY2VOYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gY2hlY2tMYXllckxvYWRlZCgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICggdGhpcy5nZXRMYXllcihlYWNoLmlkKSApeyAvLyBpZiBhZGRMYXllciAgaGFzIHRha2VuIGVmZmVjdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9mZigncmVuZGVyJywgY2hlY2tMYXllckxvYWRlZCk7IC8vIHR1cm4gb2ZmIHRoZSBsaXN0ZW5lciBmb3IgcmVuZGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vbigncmVuZGVyJywgY2hlY2tMYXllckxvYWRlZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZExheWVyKGVhY2gsIGJlZm9yZUxheWVyKTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwobGF5ZXJQcm9taXNlcyk7XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbmV4cG9ydHMuYWRkU291cmNlQW5kTGF5ZXJzID0gbWJIZWxwZXIuYWRkU291cmNlQW5kTGF5ZXJzOyJdfQ==
