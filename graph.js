window.order = 1;

function updateColors(selection) {

	let options = ["Level", "Subject"];
	let val;
	let circles = d3.selectAll("circle");
	

	console.log(circles.filter(d => console.log(d)));
	let arr = d3.map(circles, d => d.name).keys();
	console.log(arr);
	if(selection == 1) {

	} else if(selection == 2) {
		console.log(circles.map(d => d.name.match(/(\p{L}+)/g)).keys());
		circles.select(this);
	} else if(selection == 3) {

	} else {

	}

}

// Returns a mapping to a forceY coordinate for each object in the scale
// This is used to update spacing between nodes for different orderings of nodes
// Takes an array as input
function getYScale(dom, height) {

	var margin = 50;
	var step = height / dom.length;

	var scale = d3.scaleOrdinal()
	.domain(dom)
	.range(d3.range(margin, height-margin, step));

	return scale;

}


function createGraph(datum) {

	var data = datum[0];
	var links = datum[1];
	var width = 1200,
	height = 600;


	// Node circle radius
	var radius = 5;

	// Get listings grouped by subject name
	//var subjects = d3.reduce(data, d => d.name.match(/[A-Z]+/)[0]);
	var subjects = d3.group(data, d => d.name.match(/[A-Z]+/)[0]);

	// Get ordering mode
	var order_by = $("#order-select > option:selected").prop("label");

	// Define legend levels and coloring for the graph
	var levels = ["0XX", "1XX", "2XX"];


	// DEFINE SCALE TYPES HERE

	// Scale levels such as '0XX', '1XX'
	var levelScale = getYScale(levels, height);

	// Scale subjects such as 'MATH', 'CS'
	var subjectScale = getYScale(d3.map(subjects, function(e) { return e[0] }), height);



	let magmaClr = (d) => d3.interpolateMagma( parseInt(d.match(/\d/)) / 4 );

	d3.select("#order-select")
		.on("change", function() {
			let ordSel = d3.select(this).property("value");
			window.order = parseInt(ordSel);
		});


	// Set the x-position of nodes in accordance with their set order. Otherwise, set 0 x-force for an undirected graph
	var forceX = d3.forceX(null).strength(0);

	// Set the y-position of nodes in accordance with their set order. Otherwise, set 0 y-force for an undirected graph
	var forceY = d3.forceY(null).strength(0);

	d3.select("#color-select")
		.on("change", function() {
			let colSel = d3.select(this).property("value");
			updateColors(colSel);
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
	    .force("repel", d3.forceManyBody().strength(-30))
	    .force("center", d3.forceCenter(width / 2, height / 2))
	    .force("x", forceX)
	    .force("y", forceY);

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
	    
	  svg.on("click", function(d) {

	  		if(d3.event.target.tagName == "svg") {
	  			node.attr("opacity", 1);
	  			link.attr("opacity", 1);
	  		}

	  });


	  var circles = node.append("circle")
	      .attr("r", radius)
	      .attr("fill", d =>  magmaClr(d.name))
	      .on("click", function(d) {

	      	// First, select the title and description to append to the page
	      	d3.select("#ttl")
	      		.text((d.alias ? d.alias+"/" : "") + " " + d.ttl);
	      	d3.select("#desc")
	      		.text(d.desc);

	      	var connected = link.filter(e => e.source.name == d.name || e.target.name == d.name);


	      	node.attr("opacity", 0.1);
	      	link.attr("opacity", e => (e.source.name == d.name || e.target.name == d.name) ? 1 : 0.1);

	      	connected.each(function(g) {

	      		node.filter(h => h.name == g.source.name || h.name == g.target.name).attr("opacity", 1);
	      	});

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

	      	var connected = link.filter(e => e.source.name == d.name || e.target.name == d.name);


	      	node.attr("opacity", 0.1);
	      	link.attr("opacity", e => (e.source.name == d.name || e.target.name == d.name) ? 1 : 0.1);

	      	node.filter(h => h.name == d.name).attr("opacity", 1);

	      	connected.each(function(g) {
	      		node.filter(h => h.name == g.source.name || h.name == g.target.name).attr("opacity", 1);
	      	});


	      })
	      .attr('y', 3);

	d3.select("#order-select")
		.on("change", function() {


			order_by = $("#order-select > option:selected").prop("label");

			simulation.force("y", d3.forceY(function(d) {
				
				if(order_by == "Level") {
					
					$("#legtext").text("Course Level");
					return levelScale(d.name.match(/\d/));

				} else if(order_by == "Subject") {

					$("#legtext").text("Course Subject");
					return subjectScale(d.name.match(/[A-Z]+/));

				}

				// Default legend text
				$("#legtext").text("Course Level");
				// Default, no directed force added
				return null;

			}).strength(function(d) {

				return 1;

			}));


		  // reheat the simulation:
		  simulation
		    .alphaTarget(0)
		    .restart();
			
		});


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
	  	.attr("id", "legtext")
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

	  var search = svg.append("g")
	  	.attr("class", "md-form mt-0")
	  	.attr('transform', 'translate(' + parseFloat(150) + ',' + '50)');

	  search.append("input")
	  	.attr("class", "form-control")
	  	.attr("type", "text")
	  	.attr("placeholder", "Search")
	  	.attr("aria-label", "Search");


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
	       	    return "translate(" + (d.x = Math.max(radius, Math.min(width - radius, d.x))) + "," + (d.y = Math.max(radius, Math.min(height - radius, d.y))) + ")";	
	        });

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