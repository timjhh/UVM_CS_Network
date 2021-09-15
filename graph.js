function createGraph(datum) {

	var data = datum[0];
	var links = datum[1];
	var width = 1200,
	height = 600;


	// Node circle radius
	var radius = 5;

	// Define legend levels and coloring for the graph
	var levels = ["0XX", "1XX", "2XX", "3XX"];
	let magmaClr = (d) => d3.interpolateMagma( parseInt(d.match(/\d/)) / 4 );

	d3.select("#color-select")
		.on("change", function() {
			console.log(d3.select(this).property("value"));
		});




	d3.select("#graph")
		.append("svg")
		.attr("width", "1200")
		.attr("height", "600")
		.style("border", "1px solid black");

	var svg = d3.select("svg"),
	    width = svg.attr("width"),
	    height = svg.attr("height");

	var simulation = d3.forceSimulation()
	    .force("link", d3.forceLink().id(function(d) { return d.name; }).strength(0.1))
	    .force("charge", d3.forceManyBody())
	    .force("center", d3.forceCenter(width / 2, height / 2));

	  var link = svg.append("g")
	      .attr("class", "links")
	    .selectAll("line")
	    .data(links)
	    .enter().append("line")
	      .attr("class", function(d) {
	      	if(d.status == 1) {
	      		return "cr"
	      	} else if(d.status == 2) {
	      		return "cl"
	      	} else if(d.status == 3) {
	      		return "or"
	      	}
	      	return "ln";
	      })
	      .attr("stroke-width", 1);

	// build the arrow.
	// svg.append("svg:defs").selectAll("marker")
	//     .data(["end"])      // Different link/path types can be defined here
	//   .enter().append("svg:marker")    // This section adds in the arrows
	//     .attr("id", String)
	//     .attr("viewBox", "0 -5 10 10")
	//     .attr("refX", 15)
	//     .attr("refY", -1.5)
	//     .attr("markerWidth", 6)
	//     .attr("markerHeight", 6)
	//     .attr("orient", "auto")
	//   .append("svg:path")
	//     .attr("d", "M0,-5L10,0L0,5");

	// add the links and the arrows
	// var path = svg.append("svg:g").selectAll("path")
	//     .data(links)
	//   .enter().append("svg:path")
	// //    .attr("class", function(d) { return "link " + d.type; })
	//     .attr("class", "link")
	//     .attr("marker-end", "url(#end)");


	  var node = svg.append("g")
	      .attr("class", "nodes")
	    .selectAll("g")
	    .data(data)
	    .enter().append("g");
	    
	  var circles = node.append("circle")
	      .attr("r", radius)
	      .attr("fill", d =>  magmaClr(d.name))
	      //.style("stroke", d => d.ip ? '2px solid green' : '' )
	      .on("click", function(d) {
	      	d3.select("#ttl")
	      		.text((d.alias ? d.alias+"/" : "") + " " + d.ttl)
	      	d3.select("#desc")
	      		.text(d.desc)
	      })
	      .call(d3.drag()
	          .on("start", dragstarted)
	          .on("drag", dragged)
	          .on("end", dragended));

	  var labels = node.append("text")
	      .text((d) => d.name.toUpperCase())
	      .attr('x', 6)
	      .style("cursor", "pointer")
	      .on("click", function(d) {
	      	d3.select("#ttl")
	      		.text((d.alias ? d.alias+"/" : "") + " " + d.ttl)
	      	d3.select("#desc")
	      		.text(d.desc)
	      })
	      .attr('y', 3);


	  // Build physical legend component and styling
	  var legend = svg.append("g")
	  	  .style("border", "1px solid black")
	      .attr('transform', 'translate(' + parseFloat(width-150) + ',' + '50)');

	  // Append search bar to legend area
	  legend.append("input")
	  .text("abcd")
	  .attr("transform", "translate(-20,-25)");



	  // Append title to legend
	  legend.append("text")
	  	.attr("font-weight", "bold")
	  	.text("Class Level")
	  	.attr("transform", "translate(-20,-15)");

	  // Build legend by appending labels
	  levels.map(function(d, idx) {

		  legend.append("circle")
		      .attr("r", radius)
		      .attr("transform", "translate(0," + idx*radius*3 + ")")
		      .attr("fill", d3.interpolateMagma(parseFloat(idx/4)));

		  legend.append("text")
		      .text(d)
		      .attr("transform", "translate(" + radius*2 + "," + ((idx*radius*3)+radius) + ")");
	  });


	  node.append("title")
	      .text(function(d) { return d.id });

	  simulation
	      .nodes(data)
	      .on("tick", ticked);

	  simulation.force("link")
	      .links(links);

	  function ticked() {

	    // path.attr("d", function(d) {
	    //     var dx = d.target.x - d.source.x,
	    //         dy = d.target.y - d.source.y,
	    //         dr = Math.sqrt(dx * dx + dy * dy);
	    //     return "M" + 
	    //         d.source.x + "," + 
	    //         d.source.y + "A" + 
	    //         dr + "," + dr + " 0 0,1 " + 
	    //         d.target.x + "," + 
	    //         d.target.y;
	    // });

	    link
	        .attr("x1", function(d) { return d.source.x; })
	        .attr("y1", function(d) { return d.source.y; })
	        .attr("x2", function(d) { return d.target.x; })
	        .attr("y2", function(d) { return d.target.y; });

	    node
	        .attr("transform", function(d) {
	        	let r = 5;
	        	// let x = d.x % width == d.x ? d.x : width % d.x;
	        	// let y = d.y % height == d.y ? d.y : height % d.y;
	         // 	return "translate(" + x + "," + y + ")";
	         
	         	return "translate(" + (d.x = Math.max(r, Math.min(width - r, d.x))) + "," + (d.y = Math.max(r, Math.min(height - r, d.y))) + ")";
	        })
	  }

	function dragstarted(d) {
	  if (!d3.event.active) simulation.alphaTarget(0.3).restart();
	  d.fx = d.x;
	  d.fy = d.y;
	}

	function dragged(d) {
	  d.fx = d3.event.x;
	  d.fy = d3.event.y;
	}

	function dragended(d) {
	  if (!d3.event.active) simulation.alphaTarget(0);
	  d.fx = null;
	  d.fy = null;
	}
}