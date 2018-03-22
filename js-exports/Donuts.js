export const Donuts = (function(){
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
	var Donut = function(configObject){ // margins {}, height #, width #, containerID, dataPath
	    console.log(this, configObject);
	    this.setup(configObject);
	};

	Donut.prototype = {

	    setup(configObject){
	    	console.log('in set up');
	        var viewBox = '0 0 100 ' + Math.round(configObject.heightToWidth * 100);
	        this.margin = configObject.margin;
	        this.width = 100 - this.margin.left - this.margin.right;
	        this.height = configObject.heightToWidth * 100 - this.margin.top - this.margin.bottom;
	        this.radius = Math.min(this.width,this.height) / 3;
	        this.data = configObject.data;
	        this.comparator = configObject.comparator;
	      
	        this.arc = d3.arc()
	          .outerRadius(this.radius) 
	          .innerRadius(this.radius / 1.5)
	          .startAngle(0); 

	        this.svg = d3.select(configObject.container)
	            .append('svg')
	            .attr('width', '100%')
	            .attr('xmlns','http://www.w3.org/2000/svg')
	            .attr('version','1.1')
	            .attr('viewBox', viewBox)
	            .append('g')
	            .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

	    	this.svg.append('path')
	            .classed('background',true)
	            .datum({endAngle: tau})
	            .attr('d', this.arc)
	            .attr('transform', 'translate(' + this.width / 2 + ',' + this.height / 2 + ')');

	        this.foreground = this.svg.append('path')
	            .datum({endAngle: 0})
	            .classed('foreground',true)
	            .attr('transform', 'translate(' + this.width / 2 + ',' + this.height / 2 + ')')
	            .attr('d', this.arc);

	     //   this.update(true);

	        /* this.svg.append("text")
	            .attr("text-anchor", "middle")
	            .attr('class','pie_number')
	            .attr('y',5)
	            .text(d3.format(".2s")(this.value))
	            .attr('transform', 'translate(' + this.width / 2 + ',' + this.height / 2 + ')');*/

	    },
	    update(matchingIDs){
	    	var	numberMatching = 0,
	    		filteredData = this.data.filter(each => matchingIDs.has(each.properties.id)),
	    		total = filteredData.length;

    		filteredData.forEach(each => {
    			if ( this.comparator(each) ){
    				numberMatching++;
    			}
    		});
	    	
	    	var endAngle = (numberMatching / total) * tau;

	    	this.foreground 
	    		.transition().duration(500)
	    		.attrTween('d', this.arcTween(endAngle));

	    },
	    arcTween(newAngle) { // HT http://bl.ocks.org/mbostock/5100636
			return d => {
			    var interpolate = d3.interpolate(d.endAngle, newAngle);
			    return t => {
			      d.endAngle = interpolate(t);
				      return this.arc(d);
			    };
			};
		}
	};
	
	return {
		Donut
	};
}());