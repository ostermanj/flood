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
			console.log(geoJSONData);
			var addPointLayers = mbHelper.addSourceAndLayers.call(theMap, { // source
				/*"name": "policy-points",
    "type": "vector",
    "url": "mapbox://ostermanj.2busm34d"*/
				"name": "policy-points",
				"type": "geojson",
				"data": geoJSONData
			}, [// layers
			{ // layer zero
				"id": "points",
				"type": "circle",
				"source": "policy-points",
				//   "source-layer": "policies",
				//"maxzoom": 5.25,
				// "filter": ["has","point_count"],
				"paint": {
					"circle-color": ['match', ['get', 't_ded'], '5', '#000033',
					/* 4, '#cc9966',
      3, '#cc9966',
      2, '#cc6600',
     //   1.5, '#cc6600',
     //   1.25, '#99000',
      1, '#990000',
      
      /* other */'#990000'],
					"circle-radius": {

						'stops': [[5, 3], [8, 18]]
					},
					"circle-opacity": 0.1
				}
			}]);
			var addClusteredLayers = mbHelper.addSourceAndLayers.call(theMap, { // source


				"name": "policies",
				"type": "geojson",
				"data": geoJSONData,
				"cluster": true,
				//"clusterMaxZoom": 14, // Max zoom to cluster points on
				"clusterRadius": 0.5 // Radius of each cluster when clustering points (defaults to 50)
			}, [// layers

			/* { // layer one
        "id": "clusters",
        "type": "circle",
        "source": "policies",
        "filter": ["has","point_count"],
        "minzoom": 5.25,
        "paint": {
          	 "circle-color": [
             "step",
             ["get", "point_count"],
             "#51bbd6",
             100,
             "#f1f075",
             750,
             "#f28cb1"
         ],
         "circle-radius": [
             "step",
             ["get", "point_count"],
             20,
             100,
             30,
             750,
             40
         ]
        }
    },*/
			{ // layer two
				id: "cluster-count",
				type: "symbol",
				source: "policies",
				filter: ["has", "point_count"],
				"minzoom": 5.25,
				layout: {
					"text-field": "{point_count_abbreviated}",
					"text-size": 12

				},
				"paint": {
					"text-color": "#ffffff"
				}
				/*     { // layer three
         	id: "unclustered-point",
          type: "circle",
          source: "policies",
          filter: ["!has", "point_count"],
          "minzoom": 5.25,
             "paint": {
               	"circle-color": [
                  'match',
                  ['get', 't_ded'],
                  '5', '#000033',
    /               /* other */ /*'#990000'
                                ],
                                "circle-radius": {
                                'base': 3,
                                'stops': [[6, 4], [22, 180]]
                                },
                                "circle-opacity": 0.85
                                }
                                }*/
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

	theMap.on("mousemove", "clusters", function (e) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkZXYtanMvbWFpbi5lczYiLCJub2RlX21vZHVsZXMvbWFwYm94LWhlbHBlci9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDQUMsNEcsQ0FBNkc7QUFDN0c7O0FBRUQ7Ozs7Ozs7O0FBUUE7Ozs7O0FBS0EsT0FBTyxNQUFQLEdBQWtCLFlBQVU7QUFDNUI7O0FBQ0ksVUFBUyxXQUFULEdBQXVCLDhGQUF2Qjs7QUFFQSxLQUFNLFdBQVcsUUFBUSxlQUFSLENBQWpCOztBQUVBLEtBQUksU0FBUyxJQUFJLFNBQVMsR0FBYixDQUFpQjtBQUM3QixhQUFXLEtBRGtCO0FBRTdCLFNBQU8saUNBRnNCO0FBRzdCLFVBQVEsQ0FBQyxDQUFDLGlCQUFGLEVBQXFCLGtCQUFyQixDQUhxQjtBQUk3QixRQUFNOztBQUp1QixFQUFqQixDQUFiOztBQVFILFFBQU8sRUFBUCxDQUFVLE1BQVYsRUFBa0IsWUFBVTs7QUFFM0IsWUFBVSwyQkFBVjs7QUFFQSxXQUFTLEVBQVQsQ0FBWSxXQUFaLEVBQXdCO0FBQ3ZCLFdBQVEsR0FBUixDQUFZLFdBQVo7QUFDQSxPQUFJLGlCQUFpQixTQUFTLGtCQUFULENBQTRCLElBQTVCLENBQWlDLE1BQWpDLEVBQ3BCLEVBQUU7QUFDRDs7O0FBR0EsWUFBUSxlQUpUO0FBS08sWUFBUSxTQUxmO0FBTU8sWUFBUTtBQU5mLElBRG9CLEVBUWpCLENBQUU7QUFDSixLQUFFO0FBQ08sVUFBTSxRQURmO0FBRVMsWUFBUSxRQUZqQjtBQUdTLGNBQVUsZUFIbkI7QUFJTTtBQUNHO0FBQ0Q7QUFDQyxhQUFTO0FBQ04scUJBQWdCLENBQ2QsT0FEYyxFQUVkLENBQUMsS0FBRCxFQUFRLE9BQVIsQ0FGYyxFQUdkLEdBSGMsRUFHVCxTQUhTO0FBSWY7Ozs7Ozs7aUJB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LENBQVEsUUFBUixFQUFrQixlQUFsQjtBQUNBLGtCQUFLLFNBQUwsQ0FBZSxVQUFmLEVBQTJCLGFBQTNCO0FBQ0gsU0FWdUMsQ0FBeEM7QUFXQSxZQUFJLGdCQUFnQixFQUFwQjtBQUNBLGVBQU8sU0FBUyxRQUFULENBQWtCLFVBQWxCLEVBQThCLElBQTlCLENBQW1DLFlBQU07QUFDNUMsOEJBQWtCLE9BQWxCLENBQTBCLFVBQUMsSUFBRCxFQUFVO0FBQ2hDLDhCQUFjLElBQWQsQ0FDSSxJQUFJLE9BQUosQ0FBWSxVQUFDLE9BQUQsRUFBYTtBQUFFO0FBQ3ZCLHdCQUFJLGNBQWMsS0FBSyxXQUFMLEdBQW1CLEtBQUssV0FBeEIsR0FBc0MsRUFBeEQ7QUFDQSwyQkFBTyxLQUFLLFdBQVo7QUFDQSx5QkFBSyxNQUFMLEdBQWMsVUFBZDtBQUNBLDZCQUFTLGdCQUFULEdBQTJCO0FBQ3ZCLDRCQUFLLEtBQUssUUFBTCxDQUFjLEtBQUssRUFBbkIsQ0FBTCxFQUE2QjtBQUFFO0FBQzNCLG9DQUFRLElBQVI7QUFDQSxpQ0FBSyxHQUFMLENBQVMsUUFBVCxFQUFtQixnQkFBbkIsRUFGeUIsQ0FFYTtBQUN6QztBQUNKO0FBQ0QsMEJBQUssRUFBTCxDQUFRLFFBQVIsRUFBa0IsZ0JBQWxCO0FBQ0EsMEJBQUssUUFBTCxDQUFjLElBQWQsRUFBb0IsV0FBcEI7QUFDSCxpQkFaRCxDQURKO0FBZUgsYUFoQkQ7QUFpQkEsbUJBQU8sUUFBUSxHQUFSLENBQVksYUFBWixDQUFQO0FBQ0gsU0FuQk0sQ0FBUDtBQW9CSDtBQXBDWSxDQUFqQjs7QUF1Q0EsUUFBUSxrQkFBUixHQUE2QixTQUFTLGtCQUF0QyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9cmV0dXJuIGV9KSgpIiwiIC8qIGV4cG9ydGVkIHRoZU1hcCwgU2hhcmMsIEhlbHBlcnMsIGQzVGlwLCByZWZsZWN0LCBhcnJheUZpbmQsIFNWR0lubmVySFRNTCwgU1ZHRm9jdXMsIGNyZWF0ZUJyb3dzZUJ1dHRvbiAqLyAvLyBsZXQncyBqc2hpbnQga25vdyB0aGF0IEQzQ2hhcnRzIGNhbiBiZSBcImRlZmluZWQgYnV0IG5vdCB1c2VkXCIgaW4gdGhpcyBmaWxlXG4gLyogcG9seWZpbGxzIG5lZWRlZDogUHJvbWlzZSBUTyBETzogT1RIRVJTP1xuICovXG4vKlxuaW1wb3J0IHsgcmVmbGVjdCwgYXJyYXlGaW5kLCBTVkdJbm5lckhUTUwsIFNWR0ZvY3VzIH0gZnJvbSAnLi4vanMtdmVuZG9yL3BvbHlmaWxscyc7XG5pbXBvcnQgeyBIZWxwZXJzIH0gZnJvbSAnLi4vanMtZXhwb3J0cy9IZWxwZXJzJztcbmltcG9ydCB7IGQzVGlwIH0gZnJvbSAnLi4vanMtdmVuZG9yL2QzLXRpcCc7XG5pbXBvcnQgeyBjcmVhdGVCcm93c2VCdXR0b24gfSBmcm9tICcuLi9qcy1leHBvcnRzL0Jyb3dzZUJ1dHRvbnMnO1xuaW1wb3J0IHsgY3JlYXRlUmVzdWx0SXRlbSB9IGZyb20gJy4uL2pzLWV4cG9ydHMvUmVzdWx0SXRlbXMnOyBcbiovXG5cbi8qXG50byBkbyA6IHNlZSBhbHNvIGh0dHBzOi8vd3d3Lm1hcGJveC5jb20vbWFwYm94LWdsLWpzL2V4YW1wbGUvaGVhdG1hcC1sYXllci9cblxuXG4qL1xud2luZG93LnRoZU1hcCAgPSAoZnVuY3Rpb24oKXsgICBcblwidXNlIHN0cmljdFwiOyAgXG4gICAgbWFwYm94Z2wuYWNjZXNzVG9rZW4gPSAncGsuZXlKMUlqb2liM04wWlhKdFlXNXFJaXdpWVNJNkltTnBkblU1ZEhWbmRqQTJlRFl5YjNBM05uZzFjR0ozWlhvaWZRLlhvX2sta3pHZllYX1lvX1JEY0hEQmcnO1xuXG4gICAgY29uc3QgbWJIZWxwZXIgPSByZXF1aXJlKCdtYXBib3gtaGVscGVyJyk7XG4gICAgXG4gICAgdmFyIHRoZU1hcCA9IG5ldyBtYXBib3hnbC5NYXAoe1xuXHQgICAgY29udGFpbmVyOiAnbWFwJyxcblx0ICAgIHN0eWxlOiAnbWFwYm94Oi8vc3R5bGVzL21hcGJveC9saWdodC12OScsXG5cdCAgICBjZW50ZXI6IFstOTYuMjkxOTI5NjExMjk4ODMsIDM4LjQ1MzE3NTI4OTA1Mzc0Nl0sXG5cdCAgICB6b29tOiAzXG5cblx0fSk7XG5cblx0dGhlTWFwLm9uKCdsb2FkJywgZnVuY3Rpb24oKXtcblxuXHRcdHRvR2VvSlNPTignY2VuX3BvbGljeS1zaW1wbGlmaWVkLmNzdicpO1xuXHRcdFxuXHRcdGZ1bmN0aW9uIGdvKGdlb0pTT05EYXRhKXtcblx0XHRcdGNvbnNvbGUubG9nKGdlb0pTT05EYXRhKTtcblx0XHRcdHZhciBhZGRQb2ludExheWVycyA9IG1iSGVscGVyLmFkZFNvdXJjZUFuZExheWVycy5jYWxsKHRoZU1hcCxcblx0XHRcdFx0eyAvLyBzb3VyY2Vcblx0XHRcdFx0XHQvKlwibmFtZVwiOiBcInBvbGljeS1wb2ludHNcIixcblx0XHRcdFx0XHRcInR5cGVcIjogXCJ2ZWN0b3JcIixcblx0XHRcdFx0XHRcInVybFwiOiBcIm1hcGJveDovL29zdGVybWFuai4yYnVzbTM0ZFwiKi9cblx0XHRcdFx0XHRcIm5hbWVcIjogXCJwb2xpY3ktcG9pbnRzXCIsXG5cdFx0XHQgICAgICAgIFwidHlwZVwiOiBcImdlb2pzb25cIixcblx0XHRcdCAgICAgICAgXCJkYXRhXCI6IGdlb0pTT05EYXRhXG5cdFx0XHRcdH0sIFsgLy8gbGF5ZXJzXG5cdFx0XHRcdFx0eyAvLyBsYXllciB6ZXJvXG5cdFx0ICAgICAgICAgICAgXCJpZFwiOiBcInBvaW50c1wiLFxuXHRcdCAgICAgICAgICAgIFwidHlwZVwiOiBcImNpcmNsZVwiLFxuXHRcdCAgICAgICAgICAgIFwic291cmNlXCI6IFwicG9saWN5LXBvaW50c1wiLFxuXHRcdCAgICAgICAgIC8vICAgXCJzb3VyY2UtbGF5ZXJcIjogXCJwb2xpY2llc1wiLFxuXHRcdCAgICAgICAgICAgIC8vXCJtYXh6b29tXCI6IDUuMjUsXG5cdFx0ICAgICAgICAgICAvLyBcImZpbHRlclwiOiBbXCJoYXNcIixcInBvaW50X2NvdW50XCJdLFxuXHRcdCAgICAgICAgICAgIFwicGFpbnRcIjoge1xuXHRcdCAgICAgICAgICAgICAgXHRcImNpcmNsZS1jb2xvclwiOiBbXG5cdFx0XHQgICAgICAgICAgICAgICAgJ21hdGNoJyxcblx0XHRcdCAgICAgICAgICAgICAgICBbJ2dldCcsICd0X2RlZCddLFxuXHRcdFx0ICAgICAgICAgICAgICAgICc1JywgJyMwMDAwMzMnLFxuXHRcdFx0ICAgICAgICAgICAgICAgLyogNCwgJyNjYzk5NjYnLFxuXHRcdFx0ICAgICAgICAgICAgICAgIDMsICcjY2M5OTY2Jyxcblx0XHRcdCAgICAgICAgICAgICAgICAyLCAnI2NjNjYwMCcsXG5cdFx0XHQgICAgICAgICAgICAgLy8gICAxLjUsICcjY2M2NjAwJyxcblx0XHRcdCAgICAgICAgICAgICAvLyAgIDEuMjUsICcjOTkwMDAnLFxuXHRcdFx0ICAgICAgICAgICAgICAgIDEsICcjOTkwMDAwJyxcblx0XHRcdCAgICAgICAgICAgICAgICBcblx0XHRcdCAgICAgICAgICAgICAgICAvKiBvdGhlciAqLyAnIzk5MDAwMCdcblx0XHRcdCAgICAgICAgICAgIF0sXG5cdFx0XHQgICAgICAgICAgICBcImNpcmNsZS1yYWRpdXNcIjoge1xuXHRcdFx0ICAgICAgICAgICAgXHRcblx0XHRcdCAgICAgICAgICAgICAgICAnc3RvcHMnOiBbWzUsIDNdLCBbOCwgMThdXVxuXHRcdFx0ICAgICAgICAgICAgfSxcblx0XHRcdCAgICAgICAgICAgIFwiY2lyY2xlLW9wYWNpdHlcIjogMC4xXG5cdFx0XHQgICAgICAgICAgICB9XG5cdFx0XHQgICAgICAgIH1cblx0XHRcdFx0XVxuXHRcdFx0KTtcblx0XHRcdHZhciBhZGRDbHVzdGVyZWRMYXllcnMgPSBtYkhlbHBlci5hZGRTb3VyY2VBbmRMYXllcnMuY2FsbCh0aGVNYXAsXG5cdFx0XHQgICAgeyAvLyBzb3VyY2VcblxuXG5cdFx0XHQgICAgXHRcIm5hbWVcIjogXCJwb2xpY2llc1wiLFxuXHRcdFx0ICAgICAgICBcInR5cGVcIjogXCJnZW9qc29uXCIsXG5cdFx0XHQgICAgICAgIFwiZGF0YVwiOiBnZW9KU09ORGF0YSxcblx0XHRcdCAgICAgICAgXCJjbHVzdGVyXCI6IHRydWUsXG5cdFx0XHQgICAgICAgIC8vXCJjbHVzdGVyTWF4Wm9vbVwiOiAxNCwgLy8gTWF4IHpvb20gdG8gY2x1c3RlciBwb2ludHMgb25cblx0XHRcdCAgICAgICAgXCJjbHVzdGVyUmFkaXVzXCI6IDAuNSAvLyBSYWRpdXMgb2YgZWFjaCBjbHVzdGVyIHdoZW4gY2x1c3RlcmluZyBwb2ludHMgKGRlZmF1bHRzIHRvIDUwKVxuXHRcdFx0ICAgIH0sIFsgLy8gbGF5ZXJzXG5cblx0XHRcdCAgICAgICAvKiB7IC8vIGxheWVyIG9uZVxuXHRcdFx0ICAgICAgICAgICAgXCJpZFwiOiBcImNsdXN0ZXJzXCIsXG5cdFx0XHQgICAgICAgICAgICBcInR5cGVcIjogXCJjaXJjbGVcIixcblx0XHRcdCAgICAgICAgICAgIFwic291cmNlXCI6IFwicG9saWNpZXNcIixcblx0XHRcdCAgICAgICAgICAgIFwiZmlsdGVyXCI6IFtcImhhc1wiLFwicG9pbnRfY291bnRcIl0sXG5cdFx0XHQgICAgICAgICAgICBcIm1pbnpvb21cIjogNS4yNSxcblx0XHRcdCAgICAgICAgICAgIFwicGFpbnRcIjoge1xuXHRcdFx0ICAgICAgICAgICAgICBcdCBcImNpcmNsZS1jb2xvclwiOiBbXG5cdFx0XHRcdCAgICAgICAgICAgICAgICBcInN0ZXBcIixcblx0XHRcdFx0ICAgICAgICAgICAgICAgIFtcImdldFwiLCBcInBvaW50X2NvdW50XCJdLFxuXHRcdFx0XHQgICAgICAgICAgICAgICAgXCIjNTFiYmQ2XCIsXG5cdFx0XHRcdCAgICAgICAgICAgICAgICAxMDAsXG5cdFx0XHRcdCAgICAgICAgICAgICAgICBcIiNmMWYwNzVcIixcblx0XHRcdFx0ICAgICAgICAgICAgICAgIDc1MCxcblx0XHRcdFx0ICAgICAgICAgICAgICAgIFwiI2YyOGNiMVwiXG5cdFx0XHRcdCAgICAgICAgICAgIF0sXG5cdFx0XHRcdCAgICAgICAgICAgIFwiY2lyY2xlLXJhZGl1c1wiOiBbXG5cdFx0XHRcdCAgICAgICAgICAgICAgICBcInN0ZXBcIixcblx0XHRcdFx0ICAgICAgICAgICAgICAgIFtcImdldFwiLCBcInBvaW50X2NvdW50XCJdLFxuXHRcdFx0XHQgICAgICAgICAgICAgICAgMjAsXG5cdFx0XHRcdCAgICAgICAgICAgICAgICAxMDAsXG5cdFx0XHRcdCAgICAgICAgICAgICAgICAzMCxcblx0XHRcdFx0ICAgICAgICAgICAgICAgIDc1MCxcblx0XHRcdFx0ICAgICAgICAgICAgICAgIDQwXG5cdFx0XHRcdCAgICAgICAgICAgIF1cblx0XHRcdCAgICAgICAgICAgIH1cblx0XHRcdCAgICAgICAgfSwqL1xuXHRcdFx0ICAgICAgIHsgLy8gbGF5ZXIgdHdvXG5cdFx0XHQgICAgICAgICAgICBpZDogXCJjbHVzdGVyLWNvdW50XCIsXG5cdFx0XHRcdCAgICAgICAgdHlwZTogXCJzeW1ib2xcIixcblx0XHRcdFx0ICAgICAgICBzb3VyY2U6IFwicG9saWNpZXNcIixcblx0XHRcdFx0ICAgICAgICBmaWx0ZXI6IFtcImhhc1wiLCBcInBvaW50X2NvdW50XCJdLFxuXHRcdFx0XHQgICAgICAgIFwibWluem9vbVwiOiA1LjI1LFxuXHRcdFx0XHQgICAgICAgIGxheW91dDoge1xuXHRcdFx0XHQgICAgICAgICAgICBcInRleHQtZmllbGRcIjogXCJ7cG9pbnRfY291bnRfYWJicmV2aWF0ZWR9XCIsXG5cdFx0XHRcdCAgICAgICAgICAgIFwidGV4dC1zaXplXCI6IDEyLFxuXG5cdFx0XHRcdCAgICAgICAgfSxcblx0XHRcdFx0ICAgICAgICBcInBhaW50XCI6IHtcblx0XHRcdFx0ICAgICAgICBcdFwidGV4dC1jb2xvclwiOiBcIiNmZmZmZmZcIlxuXHRcdFx0XHQgICAgICAgIH1cblx0XHRcdCAgICAgICAgfVxuXHRcdFx0ICAgLyogICAgIHsgLy8gbGF5ZXIgdGhyZWVcblx0XHRcdCAgICAgICAgXHRpZDogXCJ1bmNsdXN0ZXJlZC1wb2ludFwiLFxuXHRcdFx0XHQgICAgICAgIHR5cGU6IFwiY2lyY2xlXCIsXG5cdFx0XHRcdCAgICAgICAgc291cmNlOiBcInBvbGljaWVzXCIsXG5cdFx0XHRcdCAgICAgICAgZmlsdGVyOiBbXCIhaGFzXCIsIFwicG9pbnRfY291bnRcIl0sXG5cdFx0XHRcdCAgICAgICAgXCJtaW56b29tXCI6IDUuMjUsXG5cdFx0XHQgICAgICAgICAgICBcInBhaW50XCI6IHtcblx0XHRcdCAgICAgICAgICAgICAgXHRcImNpcmNsZS1jb2xvclwiOiBbXG5cdFx0XHRcdCAgICAgICAgICAgICAgICAnbWF0Y2gnLFxuXHRcdFx0XHQgICAgICAgICAgICAgICAgWydnZXQnLCAndF9kZWQnXSxcblx0XHRcdFx0ICAgICAgICAgICAgICAgICc1JywgJyMwMDAwMzMnLFxuXHRcdFx0XHQgLyAgICAgICAgICAgICAgIC8qIG90aGVyICovIC8qJyM5OTAwMDAnXG5cdFx0XHRcdCAgICAgICAgICAgIF0sXG5cdFx0XHRcdCAgICAgICAgICAgIFwiY2lyY2xlLXJhZGl1c1wiOiB7XG5cdFx0XHRcdCAgICAgICAgICAgIFx0J2Jhc2UnOiAzLFxuXHRcdFx0XHQgICAgICAgICAgICAgICAgJ3N0b3BzJzogW1s2LCA0XSwgWzIyLCAxODBdXVxuXHRcdFx0XHRcdCAgICAgICAgICAgIH0sXG5cdFx0XHRcdCAgICAgICAgICAgIFwiY2lyY2xlLW9wYWNpdHlcIjogMC44NVxuXHRcdFx0XHQgICAgICAgICAgICB9XG5cdFx0XHRcdCAgICAgICAgfSovXG5cdFx0ICAgICAgICBdIC8vIGVuZCBsYXllcnMgYXJyYXlcblx0XHQgICAgKTsgLy8gZW5kIGFkZGxheWVyc1xuXG5cdFx0ICAgYWRkQ2x1c3RlcmVkTGF5ZXJzLnRoZW4oKCkgPT4geyBjb25zb2xlLmxvZygnY2x1c3RlciBsYXllcnMgYWRkZWQnKTt9KTtcblx0XHQgICBhZGRQb2ludExheWVycy50aGVuKCgpID0+IHsgY29uc29sZS5sb2coJ2NsdXN0ZXIgbGF5ZXJzIGFkZGVkJyk7fSk7XG5cdFx0fSAvLyBlbmQgZ28oKSAgXG5cdFx0ZnVuY3Rpb24gdG9HZW9KU09OKHVybCl7XG5cdFx0XHRcblx0XHRcdGQzLmNzdih1cmwsIGZ1bmN0aW9uKGVyciwgZGF0YSl7XG5cdFx0XHRcdGlmIChlcnIpIHtcblx0XHRcdFx0XHR0aHJvdyBlcnI7XG5cdFx0XHRcdH1cblx0XHRcdFx0Ly9jb25zb2xlLmxvZyhkYXRhKTtcblx0XHRcdFx0dmFyIGZlYXR1cmVzID0gW107XG5cdFx0XHRcdGRhdGEuZm9yRWFjaChlYWNoID0+IHtcblx0XHRcdFx0XHRmZWF0dXJlcy5wdXNoKHtcblx0XHRcdFx0XHRcdFwidHlwZVwiOiBcIkZlYXR1cmVcIixcblx0XHRcdFx0XHRcdFwicHJvcGVydGllc1wiOiBlYWNoLFxuXHRcdFx0XHRcdFx0XCJnZW9tZXRyeVwiOiB7XG5cdFx0XHRcdFx0XHRcdFwidHlwZVwiOiBcIlBvaW50XCIsXG5cdFx0XHRcdFx0XHRcdFwiY29vcmRpbmF0ZXNcIjogWytlYWNoLmxvbmdpdHVkZSwgK2VhY2gubGF0aXR1ZGVdXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSk7XG5cdFx0XHRcdH0pOyAvLyBlbmQgZm9yRWFjaFxuXHRcdFx0XHR2YXIgcnRuID0gIHtcblx0XHRcdFx0XHRcInR5cGVcIjogXCJGZWF0dXJlQ29sbGVjdGlvblwiLFxuXHRcdFx0XHRcdFwiZmVhdHVyZXNcIjogZmVhdHVyZXNcblx0XHRcdFx0fTtcblx0XHRcdFx0Y29uc29sZS5sb2cocnRuKTtcblx0XHRcdFx0Z28ocnRuKTtcblx0XHRcdH0pOyAvLyBlbmQgZDMgY3N2XG5cdFx0fSAvLyBlbmQgdG9HZW9KU09OXG5cdH0pOyAvLyBlbmQgb24gbG9hZFxuXG5cdCB0aGVNYXAub24oXCJtb3VzZW1vdmVcIiwgXCJjbHVzdGVyc1wiLCBmdW5jdGlvbihlKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKGUpO1xuICAgIH0pO1xuXG5cdHJldHVybiB0aGVNYXA7XG4gICBcbn0oKSk7IC8vIGVuZCBJSUZFICIsImNvbnN0IG1iSGVscGVyID0ge1xuICAgIHByb21pc2VzOiB7fSxcbiAgICBhZGRTb3VyY2VBbmRMYXllcnMoc291cmNlT3B0aW9ucyxsYXllck9wdGlvbnNBcnJheSl7IC8vIHRoaXMgPSBtYXBcbiAgICAgICAgdmFyIHNvdXJjZU5hbWUgPSBzb3VyY2VPcHRpb25zLm5hbWU7XG4gICAgICAgIG1iSGVscGVyLnByb21pc2VzW3NvdXJjZU9wdGlvbnMubmFtZV0gPSBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4geyAvLyBUTyBETzogZmlndXJlIG91dCByZWplY3Q/XG4gICAgICAgICAgICBkZWxldGUgc291cmNlT3B0aW9ucy5uYW1lO1xuICAgICAgICAgICAgZnVuY3Rpb24gY2hlY2tEYXRhTG9hZGVkKCl7XG4gICAgICAgICAgICAgICAgaWYgKCB0aGlzLmdldFNvdXJjZShzb3VyY2VOYW1lKSApeyAvLyBpZiBhZGRTb3VyY2UgaGFzIHRha2VuIGVmZmVjdFxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICB0aGlzLm9mZigncmVuZGVyJywgY2hlY2tEYXRhTG9hZGVkKTsgLy8gdHVybiBvZmYgdGhlIGxpc3RlbmVyIGZvciByZW5kZXJcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB0aGlzLm9uKCdyZW5kZXInLCBjaGVja0RhdGFMb2FkZWQpO1xuICAgICAgICAgICAgdGhpcy5hZGRTb3VyY2Uoc291cmNlTmFtZSwgc291cmNlT3B0aW9ucyk7XG4gICAgICAgIH0pO1xuICAgICAgICB2YXIgbGF5ZXJQcm9taXNlcyA9IFtdO1xuICAgICAgICByZXR1cm4gbWJIZWxwZXIucHJvbWlzZXNbc291cmNlTmFtZV0udGhlbigoKSA9PiB7IFxuICAgICAgICAgICAgbGF5ZXJPcHRpb25zQXJyYXkuZm9yRWFjaCgoZWFjaCkgPT4ge1xuICAgICAgICAgICAgICAgIGxheWVyUHJvbWlzZXMucHVzaChcbiAgICAgICAgICAgICAgICAgICAgbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHsgLy8gVE8gRE86IGZpZ3VyZSBvdXQgcmVqZWN0P1xuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGJlZm9yZUxheWVyID0gZWFjaC5iZWZvcmVMYXllciA/IGVhY2guYmVmb3JlTGF5ZXIgOiAnJztcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlbGV0ZSBlYWNoLmJlZm9yZUxheWVyO1xuICAgICAgICAgICAgICAgICAgICAgICAgZWFjaC5zb3VyY2UgPSBzb3VyY2VOYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gY2hlY2tMYXllckxvYWRlZCgpe1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICggdGhpcy5nZXRMYXllcihlYWNoLmlkKSApeyAvLyBpZiBhZGRMYXllciAgaGFzIHRha2VuIGVmZmVjdFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHRydWUpO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9mZigncmVuZGVyJywgY2hlY2tMYXllckxvYWRlZCk7IC8vIHR1cm4gb2ZmIHRoZSBsaXN0ZW5lciBmb3IgcmVuZGVyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5vbigncmVuZGVyJywgY2hlY2tMYXllckxvYWRlZCk7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZExheWVyKGVhY2gsIGJlZm9yZUxheWVyKTtcbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5hbGwobGF5ZXJQcm9taXNlcyk7XG4gICAgICAgIH0pO1xuICAgIH1cbn07XG5cbmV4cG9ydHMuYWRkU291cmNlQW5kTGF5ZXJzID0gbWJIZWxwZXIuYWRkU291cmNlQW5kTGF5ZXJzOyJdfQ==
