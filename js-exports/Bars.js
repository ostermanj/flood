export const Bars = (function(){

	var Bar = function(configObject){ // margins {}, height #, width #, containerID, dataPath
	    this.setup(configObject);
	};

	Bar.prototype = {
		setup(configObject){ // some of setup is common to all charts and could be handled by prototypical inheritance
	    	
	        var viewBox = '0 0 100 ' + Math.round(configObject.heightToWidth * 100);
	        this.margin = configObject.margin;
	        this.width = 100 - this.margin.left - this.margin.right;
	        this.height = configObject.heightToWidth * 100 - this.margin.top - this.margin.bottom;
	        this.title = configObject.title;
	        this.comparator = configObject.comparator;
	        this.backgroundColor = configObject.backgroundColor || 'gray';
	        this.total = configObject.total;

	        d3.select(configObject.container)
	        	.append('span')
	        	.classed('figure-title', true)
	        	.text(this.title);

	        this.svg = d3.select(configObject.container)
	            .append('svg')
	            .attr('width', '100%')
	            .attr('xmlns','http://www.w3.org/2000/svg')
	            .attr('version','1.1')
	            .attr('viewBox', viewBox)
	            .append('g')
	            .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

	        this.background = this.svg.append('line')
	        	.classed('background-line-' + this.backgroundColor, true)
	        	.attr('x0',0)
	        	.attr('y0',0)
	        	.attr('x1',100 - this.margin.left - this.margin.right)
	        	.attr('y1',0);

	        this.line = this.svg.append('line')
	        	.classed('foreground-line', true)
	        	.attr('x0',0)
	        	.attr('y0',0)
	        	.attr('x1',0)
	        	.attr('y1',0);

	        this.text = d3.select('#total-view')
	        	.append('span')
	        	.text(() => `${d3.format(",")(this.total)} of ${d3.format(",")(this.total)} in view` );

	        this.update(this.total);  
        },
        update(n){
			
			this.line
				.transition().duration(200)
				.attr('x1', () => (( n / this.total) * 100 ) - this.margin.left - this.margin.right );
			this.text
				.text(() => `${d3.format(",")(n)} of ${d3.format(",")(this.total)}` );
		}
	};

	return {
		Bar
	};
        
})();