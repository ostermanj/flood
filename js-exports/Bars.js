export const Bars = (function(){

	var Bar = function(configObject){ // margins {}, height #, width #, containerID, dataPath
	    this.setup(configObject);
	};

	Bar.prototype = {
		setup(configObject){ // some of setup is common to all charts and could be handled by prototypical inheritance
	    	console.log(configObject);
	        var viewBox = '0 0 100 ' + Math.round(configObject.heightToWidth * 100);
	        this.container = configObject.container;
	        this.margin = configObject.margin;
	        this.width = 100 - this.margin.left - this.margin.right;
	        this.height = configObject.heightToWidth * 100 - this.margin.top - this.margin.bottom;
	        this.title = configObject.title;
	        this.infoMark = configObject.infoMark || false;
	        this.comparator = configObject.comparator;
	        this.truncateRight = configObject.truncateRight || false;
	        this.backgroundColor = configObject.backgroundColor || 'gray';
	        this.data = configObject.data;
	        this.numerator = configObject.numerator;
	        this.denominator = configObject.denominator;
	        this.textFunction = configObject.textFunction;
	        this.zScores = configObject.zScores || null;
	        this.min = configObject.min ? configObject.min.call(this) : 0;
	        //this.max = configObject.max ? configObject.max.call(this) : 100;
	        //this.scale = d3.scaleLinear().domain([this.min,this.max]).range([0,this.width]);
	        

	        d3.select(this.container)
	        	.append('span')
	        	.classed('figure-title', true)
	        	.classed('has-info-mark', () => this.infoMark)
	        	.text(this.title);

	        this.svg = d3.select(this.container)
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
	        	.attr('x1',this.width)
	        	.attr('y1',0);

	        this.line = this.svg.append('line')
	        	.classed('foreground-line', true)
	        	.attr('x0',0)
	        	.attr('y0',0)
	        	.attr('x1',0)
	        	.attr('y1',0);

	        this.text = d3.select(this.container)
	        	.append('span')
	        	.attr('class','value');
	        	

	        //this.update(this.numerator());  
        },
        update(inViewIDs){
        	console.log(this);
			var n = this.numerator(inViewIDs),
				d = this.denominator(inViewIDs); 
			d3.select(this.container)
				.classed('overflow', n > d );

        	if (this.truncateRight){
        		d = this.min = 0 - d;
        	} else if ( this.min < 0 && d > 0 ) {
        		if (Math.abs(this.min) < d) {
        			this.min = 0 - d;
        		} else {
        			d = 0 - this.min;
        		}
        	}
        	console.log('min: ' + this.min + '; max: ' + d);
			this.scale = d3.scaleLinear().domain([this.min,d]).range([0,this.width]).clamp(true);
			this.line
				.transition().duration(200)
				.attr('x1', () => this.scale(n));
			this.text
				.text(() => this.textFunction(n,d));
		}
	};

	return {
		Bar
	};
        
})();