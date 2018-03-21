export const Charts = (function(){
    /* globals d3 */
    const medianIncomes = new Map();
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
	}
	var createCharts = function(geojson){
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
	}

	var Donut = function(configObject){ // margins {}, height #, width #, containerID, dataPath
	    console.log(this, configObject);
	    this.setup(configObject);
	};

	Donut.prototype = {

	    setup(configObject){
	    	console.log('in set up');
	        var viewBox = '0 0 100 ' + Math.round(configObject.heightToWidth * 100);
	        var tau = 2 * Math.PI;
	        this.margin = configObject.margin;
	        this.width = 100 - this.margin.left - this.margin.right;
	        this.height = configObject.heightToWidth * 100 - this.margin.top - this.margin.bottom;
	        this.radius = Math.min(this.width,this.height) / 2;
	        this.data = configObject.data;
	        console.log(this.radius);
	        this.arc = d3.arc()
	          .outerRadius(this.radius)
	          .innerRadius(this.radius / 2)
	          .startAngle(0); 
	        window.arc = this.arc;
	        console.log(this.data);
	        this.scale = d3.scaleLinear().domain([0,this.data.length]).range([0,1]);
	        this.value = this.data.length;
	        //this.y = d3.scaleLinear().domain(d3.range(this.data)).range([this.height, 0]);
 
	        
	       // this.labelOffset = configObject.trendLabelPosition === 'below' ? 4 : -3;
	       // this.yAxisCount = configObject.yAxisCount;
	       // this.hasBeenUpdated = false;


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
	            //.style("fill", "#ddd")
	            .attr('d', this.arc)
	            .attr('transform', 'translate(' + this.width / 2 + ',' + this.height / 2 + ')');

	        this.svg.append('path')
	            .classed('foreground',true)
	            .datum({endAngle: this.value * tau})
	            //.style("fill", "#ddd")
	            .attr('d', this.arc)
	            .attr('transform', 'translate(' + this.width / 2 + ',' + this.height / 2 + ')');

	         this.svg.append("text")
	            .attr("text-anchor", "middle")
	            .attr('class','pie_number')
	            .attr('y',5)
	            .text(d3.format(".2s")(this.value))
	            .attr('transform', 'translate(' + this.width / 2 + ',' + this.height / 2 + ')');

	    }
	};

	return {
		createCharts
	};
}());