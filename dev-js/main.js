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
				"data": geoJSONData
				/*  "cluster": true,
      "clusterMaxZoom": 14, // Max zoom to cluster points on
      "clusterRadius": 50 // Radius of each cluster when clustering points (defaults to 50)*/
			}, [// layers
			{ // layer one
				"id": "clusters",
				"type": "circle",
				"source": "policies",
				// "filter": ["has","point_count"],
				"paint": {
					"circle-color": "#ff0000",
					"circle-radius": 1,
					"circle-opacity": 0.2
				},
				"beforeLayer": "water" // <== this is different from mapbox native specs
				/*,
    { // layer two
       id: "cluster-count",
    type: "symbol",
    source: "policies",
    filter: ["has", "point_count"],
    layout: {
        "text-field": "{point_count_abbreviated}",
        "text-size": 12
    }
    },
    { // layer three
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
    }*/
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJkZXYtanMvbWFpbi5lczYiLCJub2RlX21vZHVsZXMvbWFwYm94LWhlbHBlci9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O0FDQUMsNEcsQ0FBNkc7QUFDN0c7O0FBRUQ7Ozs7Ozs7QUFPQSxPQUFPLE1BQVAsR0FBa0IsWUFBVTtBQUM1Qjs7QUFDSSxVQUFTLFdBQVQsR0FBdUIsOEZBQXZCOztBQUVBLEtBQU0sV0FBVyxRQUFRLGVBQVIsQ0FBakI7O0FBRUEsS0FBSSxTQUFTLElBQUksU0FBUyxHQUFiLENBQWlCO0FBQzdCLGFBQVcsS0FEa0I7QUFFN0IsU0FBTyxpQ0FGc0I7QUFHN0IsVUFBUSxDQUFDLENBQUMsaUJBQUYsRUFBcUIsa0JBQXJCLENBSHFCO0FBSTdCLFFBQU07O0FBSnVCLEVBQWpCLENBQWI7O0FBUUgsUUFBTyxFQUFQLENBQVUsTUFBVixFQUFrQixZQUFVOztBQUUzQixZQUFVLDJCQUFWOztBQUVBLFdBQVMsRUFBVCxDQUFZLFdBQVosRUFBd0I7QUFDdkIsT0FBSSxZQUFZLFNBQVMsa0JBQVQsQ0FBNEIsSUFBNUIsQ0FBaUMsTUFBakMsRUFDWixFQUFFO0FBQ0QsWUFBUSxVQURUO0FBRUksWUFBUSxTQUZaO0FBR0ksWUFBUTtBQUNWOzs7QUFKRixJQURZLEVBUVQsQ0FBRTtBQUNELEtBQUU7QUFDRSxVQUFNLFVBRFY7QUFFSSxZQUFRLFFBRlo7QUFHSSxjQUFVLFVBSGQ7QUFJRztBQUNDLGFBQVM7QUFDTixxQkFBZ0IsU0FEVjtBQUVSLHNCQUFpQixDQUZUO0FBR1IsdUJBQWtCO0FBSFYsS0FMYjtBQVVJLG1CQUFlLE9BVm5CLENBVTJCO0FBQzFCOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQVhELElBREQsQ0FSUyxDQTJDUDtBQTNDTyxJQUFo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OlsiKGZ1bmN0aW9uKCl7ZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9cmV0dXJuIGV9KSgpIiwiIC8qIGV4cG9ydGVkIHRoZU1hcCwgU2hhcmMsIEhlbHBlcnMsIGQzVGlwLCByZWZsZWN0LCBhcnJheUZpbmQsIFNWR0lubmVySFRNTCwgU1ZHRm9jdXMsIGNyZWF0ZUJyb3dzZUJ1dHRvbiAqLyAvLyBsZXQncyBqc2hpbnQga25vdyB0aGF0IEQzQ2hhcnRzIGNhbiBiZSBcImRlZmluZWQgYnV0IG5vdCB1c2VkXCIgaW4gdGhpcyBmaWxlXG4gLyogcG9seWZpbGxzIG5lZWRlZDogUHJvbWlzZSBUTyBETzogT1RIRVJTP1xuICovXG4vKlxuaW1wb3J0IHsgcmVmbGVjdCwgYXJyYXlGaW5kLCBTVkdJbm5lckhUTUwsIFNWR0ZvY3VzIH0gZnJvbSAnLi4vanMtdmVuZG9yL3BvbHlmaWxscyc7XG5pbXBvcnQgeyBIZWxwZXJzIH0gZnJvbSAnLi4vanMtZXhwb3J0cy9IZWxwZXJzJztcbmltcG9ydCB7IGQzVGlwIH0gZnJvbSAnLi4vanMtdmVuZG9yL2QzLXRpcCc7XG5pbXBvcnQgeyBjcmVhdGVCcm93c2VCdXR0b24gfSBmcm9tICcuLi9qcy1leHBvcnRzL0Jyb3dzZUJ1dHRvbnMnO1xuaW1wb3J0IHsgY3JlYXRlUmVzdWx0SXRlbSB9IGZyb20gJy4uL2pzLWV4cG9ydHMvUmVzdWx0SXRlbXMnOyBcbiovXG53aW5kb3cudGhlTWFwICA9IChmdW5jdGlvbigpeyAgIFxuXCJ1c2Ugc3RyaWN0XCI7ICBcbiAgICBtYXBib3hnbC5hY2Nlc3NUb2tlbiA9ICdway5leUoxSWpvaWIzTjBaWEp0WVc1cUlpd2lZU0k2SW1OcGRuVTVkSFZuZGpBMmVEWXliM0EzTm5nMWNHSjNaWG9pZlEuWG9fay1rekdmWVhfWW9fUkRjSERCZyc7XG5cbiAgICBjb25zdCBtYkhlbHBlciA9IHJlcXVpcmUoJ21hcGJveC1oZWxwZXInKTtcbiAgICBcbiAgICB2YXIgdGhlTWFwID0gbmV3IG1hcGJveGdsLk1hcCh7XG5cdCAgICBjb250YWluZXI6ICdtYXAnLFxuXHQgICAgc3R5bGU6ICdtYXBib3g6Ly9zdHlsZXMvbWFwYm94L2xpZ2h0LXY5Jyxcblx0ICAgIGNlbnRlcjogWy05Ni4yOTE5Mjk2MTEyOTg4MywgMzguNDUzMTc1Mjg5MDUzNzQ2XSxcblx0ICAgIHpvb206IDNcblxuXHR9KTtcblxuXHR0aGVNYXAub24oJ2xvYWQnLCBmdW5jdGlvbigpe1xuXG5cdFx0dG9HZW9KU09OKCdjZW5fcG9saWN5LXNpbXBsaWZpZWQuY3N2Jyk7XG5cdFx0XG5cdFx0ZnVuY3Rpb24gZ28oZ2VvSlNPTkRhdGEpe1xuXHRcdFx0dmFyIGFkZExheWVycyA9IG1iSGVscGVyLmFkZFNvdXJjZUFuZExheWVycy5jYWxsKHRoZU1hcCxcblx0XHRcdCAgICB7IC8vIHNvdXJjZVxuXHRcdFx0ICAgIFx0XCJuYW1lXCI6IFwicG9saWNpZXNcIixcblx0XHRcdCAgICAgICAgXCJ0eXBlXCI6IFwiZ2VvanNvblwiLFxuXHRcdFx0ICAgICAgICBcImRhdGFcIjogZ2VvSlNPTkRhdGEsXG5cdFx0XHQgICAgICAvKiAgXCJjbHVzdGVyXCI6IHRydWUsXG5cdFx0XHQgICAgICAgIFwiY2x1c3Rlck1heFpvb21cIjogMTQsIC8vIE1heCB6b29tIHRvIGNsdXN0ZXIgcG9pbnRzIG9uXG5cdFx0XHQgICAgICAgIFwiY2x1c3RlclJhZGl1c1wiOiA1MCAvLyBSYWRpdXMgb2YgZWFjaCBjbHVzdGVyIHdoZW4gY2x1c3RlcmluZyBwb2ludHMgKGRlZmF1bHRzIHRvIDUwKSovXG5cdFx0XHQgICAgfSwgWyAvLyBsYXllcnNcblx0XHRcdCAgICAgICAgeyAvLyBsYXllciBvbmVcblx0XHRcdCAgICAgICAgICAgIFwiaWRcIjogXCJjbHVzdGVyc1wiLFxuXHRcdFx0ICAgICAgICAgICAgXCJ0eXBlXCI6IFwiY2lyY2xlXCIsXG5cdFx0XHQgICAgICAgICAgICBcInNvdXJjZVwiOiBcInBvbGljaWVzXCIsXG5cdFx0XHQgICAgICAgICAgIC8vIFwiZmlsdGVyXCI6IFtcImhhc1wiLFwicG9pbnRfY291bnRcIl0sXG5cdFx0XHQgICAgICAgICAgICBcInBhaW50XCI6IHtcblx0XHRcdCAgICAgICAgICAgICAgXHRcImNpcmNsZS1jb2xvclwiOiBcIiNmZjAwMDBcIixcblx0XHRcdFx0ICAgICAgICAgICAgXCJjaXJjbGUtcmFkaXVzXCI6IDEsXG5cdFx0XHRcdCAgICAgICAgICAgIFwiY2lyY2xlLW9wYWNpdHlcIjogMC4yXG5cdFx0XHQgICAgICAgICAgICB9LFxuXHRcdFx0ICAgICAgICAgICAgXCJiZWZvcmVMYXllclwiOiBcIndhdGVyXCIgLy8gPD09IHRoaXMgaXMgZGlmZmVyZW50IGZyb20gbWFwYm94IG5hdGl2ZSBzcGVjc1xuXHRcdFx0ICAgICAgICB9LyosXG5cdFx0XHQgICAgICAgIHsgLy8gbGF5ZXIgdHdvXG5cdFx0XHQgICAgICAgICAgICBpZDogXCJjbHVzdGVyLWNvdW50XCIsXG5cdFx0XHRcdCAgICAgICAgdHlwZTogXCJzeW1ib2xcIixcblx0XHRcdFx0ICAgICAgICBzb3VyY2U6IFwicG9saWNpZXNcIixcblx0XHRcdFx0ICAgICAgICBmaWx0ZXI6IFtcImhhc1wiLCBcInBvaW50X2NvdW50XCJdLFxuXHRcdFx0XHQgICAgICAgIGxheW91dDoge1xuXHRcdFx0XHQgICAgICAgICAgICBcInRleHQtZmllbGRcIjogXCJ7cG9pbnRfY291bnRfYWJicmV2aWF0ZWR9XCIsXG5cdFx0XHRcdCAgICAgICAgICAgIFwidGV4dC1zaXplXCI6IDEyXG5cdFx0XHRcdCAgICAgICAgfVxuXHRcdFx0ICAgICAgICB9LFxuXHRcdFx0ICAgICAgICB7IC8vIGxheWVyIHRocmVlXG5cdFx0XHQgICAgICAgIFx0aWQ6IFwidW5jbHVzdGVyZWQtcG9pbnRcIixcblx0XHRcdFx0ICAgICAgICB0eXBlOiBcImNpcmNsZVwiLFxuXHRcdFx0XHQgICAgICAgIHNvdXJjZTogXCJwb2xpY2llc1wiLFxuXHRcdFx0XHQgICAgICAgIGZpbHRlcjogW1wiIWhhc1wiLCBcInBvaW50X2NvdW50XCJdLFxuXHRcdFx0XHQgICAgICAgIHBhaW50OiB7XG5cdFx0XHRcdCAgICAgICAgICAgIFwiY2lyY2xlLWNvbG9yXCI6IFwiIzExYjRkYVwiLFxuXHRcdFx0XHQgICAgICAgICAgICBcImNpcmNsZS1yYWRpdXNcIjogNCxcblx0XHRcdFx0ICAgICAgICAgICAgXCJjaXJjbGUtc3Ryb2tlLXdpZHRoXCI6IDEsXG5cdFx0XHRcdCAgICAgICAgICAgIFwiY2lyY2xlLXN0cm9rZS1jb2xvclwiOiBcIiNmZmZcIlxuXHRcdFx0XHQgICAgICAgIH1cblx0XHRcdCAgICAgICAgfSovXG5cdFx0ICAgICAgICBdIC8vIGVuZCBsYXllcnMgYXJyYXlcblx0XHQgICAgKTsgLy8gZW5kIGFkZGxheWVyc1xuXG5cdFx0ICAgIGFkZExheWVycy50aGVuKCgpID0+IHsgY29uc29sZS5sb2coJ2FkZGVkJyk7fSk7XG5cdFx0fSAvLyBlbmQgY29udGludWVcblx0XHRmdW5jdGlvbiB0b0dlb0pTT04odXJsKXtcblx0XHRcdFxuXHRcdFx0ZDMuY3N2KHVybCwgZnVuY3Rpb24oZXJyLCBkYXRhKXtcblx0XHRcdFx0aWYgKGVycikge1xuXHRcdFx0XHRcdHRocm93IGVycjtcblx0XHRcdFx0fVxuXHRcdFx0XHQvL2NvbnNvbGUubG9nKGRhdGEpO1xuXHRcdFx0XHR2YXIgZmVhdHVyZXMgPSBbXTtcblx0XHRcdFx0ZGF0YS5mb3JFYWNoKGVhY2ggPT4ge1xuXHRcdFx0XHRcdGZlYXR1cmVzLnB1c2goe1xuXHRcdFx0XHRcdFx0XCJ0eXBlXCI6IFwiRmVhdHVyZVwiLFxuXHRcdFx0XHRcdFx0XCJwcm9wZXJ0aWVzXCI6IGVhY2gsXG5cdFx0XHRcdFx0XHRcImdlb21ldHJ5XCI6IHtcblx0XHRcdFx0XHRcdFx0XCJ0eXBlXCI6IFwiUG9pbnRcIixcblx0XHRcdFx0XHRcdFx0XCJjb29yZGluYXRlc1wiOiBbK2VhY2gubG9uZ2l0dWRlLCArZWFjaC5sYXRpdHVkZV1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9KTtcblx0XHRcdFx0fSk7IC8vIGVuZCBmb3JFYWNoXG5cdFx0XHRcdHZhciBydG4gPSAge1xuXHRcdFx0XHRcdFwidHlwZVwiOiBcIkZlYXR1cmVDb2xsZWN0aW9uXCIsXG5cdFx0XHRcdFx0XCJmZWF0dXJlc1wiOiBmZWF0dXJlc1xuXHRcdFx0XHR9O1xuXHRcdFx0XHRjb25zb2xlLmxvZyhydG4pO1xuXHRcdFx0XHRnbyhydG4pO1xuXHRcdFx0fSk7IC8vIGVuZCBkMyBjc3Zcblx0XHR9IC8vIGVuZCB0b0dlb0pTT05cblx0fSk7IC8vIGVuZCBvbiBsb2FkXG5cblx0XG5cblx0cmV0dXJuIHRoZU1hcDtcbiAgIFxufSgpKTsgLy8gZW5kIElJRkUgIiwiY29uc3QgbWJIZWxwZXIgPSB7XG4gICAgcHJvbWlzZXM6IHt9LFxuICAgIGFkZFNvdXJjZUFuZExheWVycyhzb3VyY2VPcHRpb25zLGxheWVyT3B0aW9uc0FycmF5KXsgLy8gdGhpcyA9IG1hcFxuICAgICAgICB2YXIgc291cmNlTmFtZSA9IHNvdXJjZU9wdGlvbnMubmFtZTtcbiAgICAgICAgbWJIZWxwZXIucHJvbWlzZXNbc291cmNlT3B0aW9ucy5uYW1lXSA9IG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7IC8vIFRPIERPOiBmaWd1cmUgb3V0IHJlamVjdD9cbiAgICAgICAgICAgIGRlbGV0ZSBzb3VyY2VPcHRpb25zLm5hbWU7XG4gICAgICAgICAgICBmdW5jdGlvbiBjaGVja0RhdGFMb2FkZWQoKXtcbiAgICAgICAgICAgICAgICBpZiAoIHRoaXMuZ2V0U291cmNlKHNvdXJjZU5hbWUpICl7IC8vIGlmIGFkZFNvdXJjZSBoYXMgdGFrZW4gZWZmZWN0XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMub2ZmKCdyZW5kZXInLCBjaGVja0RhdGFMb2FkZWQpOyAvLyB0dXJuIG9mZiB0aGUgbGlzdGVuZXIgZm9yIHJlbmRlclxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMub24oJ3JlbmRlcicsIGNoZWNrRGF0YUxvYWRlZCk7XG4gICAgICAgICAgICB0aGlzLmFkZFNvdXJjZShzb3VyY2VOYW1lLCBzb3VyY2VPcHRpb25zKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHZhciBsYXllclByb21pc2VzID0gW107XG4gICAgICAgIHJldHVybiBtYkhlbHBlci5wcm9taXNlc1tzb3VyY2VOYW1lXS50aGVuKCgpID0+IHsgXG4gICAgICAgICAgICBsYXllck9wdGlvbnNBcnJheS5mb3JFYWNoKChlYWNoKSA9PiB7XG4gICAgICAgICAgICAgICAgbGF5ZXJQcm9taXNlcy5wdXNoKFxuICAgICAgICAgICAgICAgICAgICBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4geyAvLyBUTyBETzogZmlndXJlIG91dCByZWplY3Q/XG4gICAgICAgICAgICAgICAgICAgICAgICB2YXIgYmVmb3JlTGF5ZXIgPSBlYWNoLmJlZm9yZUxheWVyID8gZWFjaC5iZWZvcmVMYXllciA6ICcnO1xuICAgICAgICAgICAgICAgICAgICAgICAgZGVsZXRlIGVhY2guYmVmb3JlTGF5ZXI7XG4gICAgICAgICAgICAgICAgICAgICAgICBlYWNoLnNvdXJjZSA9IHNvdXJjZU5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICBmdW5jdGlvbiBjaGVja0xheWVyTG9hZGVkKCl7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCB0aGlzLmdldExheWVyKGVhY2guaWQpICl7IC8vIGlmIGFkZExheWVyICBoYXMgdGFrZW4gZWZmZWN0XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUodHJ1ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMub2ZmKCdyZW5kZXInLCBjaGVja0xheWVyTG9hZGVkKTsgLy8gdHVybiBvZmYgdGhlIGxpc3RlbmVyIGZvciByZW5kZXJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm9uKCdyZW5kZXInLCBjaGVja0xheWVyTG9hZGVkKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkTGF5ZXIoZWFjaCwgYmVmb3JlTGF5ZXIpO1xuICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLmFsbChsYXllclByb21pc2VzKTtcbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuZXhwb3J0cy5hZGRTb3VyY2VBbmRMYXllcnMgPSBtYkhlbHBlci5hZGRTb3VyY2VBbmRMYXllcnM7Il19
