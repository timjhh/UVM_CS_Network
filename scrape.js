




const begin = "http://catalogue.uvm.edu/undergraduate/artsandsciences/computerscience/#courseinventory";

function query() {
	
	(async () => {
	try {
		const result = await getPageData(begin); // Get the site's element data	
		
		$("#progress").append("Page...");

		const edata = await parseHTML(result);

		$("#progress").append("Data...");

		const coursedata = await getCourses(edata);

		$("#progress").append("Courses...");

		const locdata = await getCourseInfo(coursedata); // Get URL list for transcript links

		$("#progress").append("Sanitizing...");
		const sanitized = await sanitize(locdata); // Associate each transcript link with a title to store
		
		$("#progress").append("Done!");
		await createGraph(locdata); // Create all transcripts in selection box
		

	} catch(err) {
		console.log(err);
	}
	}) ();
$("#query").attr("disabled", "disabled");
}



function getPageData(link) {
	return $.getJSON('https://api.allorigins.win/get?url=' + encodeURIComponent(link));
}
function parseXML(data) {
	return $.parseXML(data.contents);
}
function parseHTML(data) {
	return $.parseHTML(data.contents);
}

// Find all courseblock elements on page
function getCourses(data) {

	const courses = data.find(d => d.id =='page-content').getElementsByClassName("courseblock");

	return courses;
    

}
function getCourseInfo(data) {
	let title = "";
	let desc = "";
	let courses = [];
	let links = [];
	let titles = [];

	Array.from(data).forEach(function(d) {
		title = d.getElementsByClassName("courseblocktitle")[0].outerText;
		desc = d.getElementsByClassName("courseblockdesc")[0].outerText;
		
		let ttl = title.split(" ");
		let course = {};
		course.name = title.match(/[^.]+/)[0].toUpperCase();
		course.credits = ttl[ttl.length-2];
		course.desc = desc;
		course.ttl = title;
		course.alias = null;

		// Find starting index of prerequisite, co-requisite and cross-listed courses
		var pr = course.desc.toUpperCase().search("PREREQUISITE");
		var cr = course.desc.toUpperCase().search("CO-REQ");
		var cl = course.desc.toUpperCase().search("CROSS-LISTED");
		var ip = course.desc.toUpperCase().search("INSTRUCTOR PERMISSION") > 0 ? "ip" : null;
		var skip = course.desc.toUpperCase().search("RECOMMENDED")
		var noCred = course.desc.toUpperCase().search("NO CREDIT IF");
		var group = 2;


		course.ip = ip;

		// Find first occurrence of course number by searching for a word + space + number
		// \w+ n-character word
		// \s space character
		// \d+ n-digit integer
		var prereq = desc.substring(pr).toUpperCase().match(/\w+\s\d+/);
		
		// 12 is the length of "prerequisite" + 2 for 'S:' 
		var idx = pr + 14;

		while(prereq) {
			

			// Add course to list of links for graph
			// Also append status, to show whether course is pr, cr, cl

			if(cl < idx && cl != -1) {

				//links.push({source: prereq[0], target: course.name, value: 4, status: 2 });
				course.alias = prereq[0];
			} else if(cr < idx && cr != -1) {
				links.push({source: prereq[0], target: course.name, value: 1, status: 1 });

			} else if(noCred < idx && noCred != -1) {
				// May not be good practice, but this is a case that must be accounted for
				// This will skip any courses that no credit is awarded for
				break;
			} else { // We don't need to check for -1, because prereq wouldn't exist if it wasn't found
				links.push({source: prereq[0], target: course.name, value: 1, status: 0 });
			}

			if(prereq[0].includes("OR") && prev) {
				// If there are two prereqs, take the field of study and add it to secondary course
				var name = prev.split(" ")[0];
				var num = prereq[0].split(" ")[1];
				var newName = name.toUpperCase() + " " + num;
				if(!titles.includes(newName)) {
					titles.push(newName);
					courses.push({"name": newName, "group": 2, "desc": "N/A", ttl: newName});
				}
				
			}

			// Iterate working index to check progress
			idx = idx + prereq.index + prereq[0].length;

			// Define the now previous course for a one-course-lookback
			var prev = prereq[0];


			// Start at last known index and search for another course
			prereq = prereq.input.substring(prereq[0].length + prereq.index).match(/\w+\s\d+/);

		}

		// Finally, add course to listing
		//courses.push({"name": course.name, "group": 1, "desc": course.desc, "ttl": title, "ip": ip});
		courses.push(course);
		titles.push(course.name);

	});

	// If prereq course is not in database, add to course list
	links.forEach(function(d) {


		if(!(titles.includes(d.source))) {

			titles.push(d.source);
			courses.push({"name": d.source, "group": 2, "desc": "N/A", ttl: d.source});
		}
		if(!(titles.includes(d.target))) {
			titles.push(d.target);
			courses.push({"name": d.target, "group": 2, "desc": "N/A", ttl: d.target});
		}

		// Store course for one-course-lookback
		var prev = d.source;
	
	});

	return [courses, links];
}

function sanitize(data) {

}



/*
	Takes an unordered dictionary, changes it to a d3.entries() array, sorts by(guaranteed numerical) value and returns it
*/
function sortByValue(datum) {

	var data = d3.entries(datum);
	var sorted = data.sort(function(f, s) { // Sort proximity words greatest to least
				return s.value - f.value;
	});
	return sorted;

}
function getStats(datum) {
	var data = d3.entries(datum[0]);

	var mean = d3.mean(data, d => d.value);
	var median = d3.median(data, d => d.value);
	var stdev = d3.deviation(data, d => d.value);
	var max = d3.max(data, d => d.value);
	var min = d3.min(data, d => d.value);

	console.log("stdev " + stdev);
	console.log("mean " + mean);
	console.log("median " + median);
	console.log("max " + max);
	console.log("min " + min);
	console.log("25th quantile " + d3.quantile(data, .25, d => d.value));
	console.log("50th quantile " + d3.quantile(data, .5, d => d.value));
	console.log("75th quantile " + d3.quantile(data, .75, d => d.value));
} 
function createGraph(datum) {

	var data = datum[0];
	var links = datum[1];
	var width = 1200,
	height = 600;


	// Node circle radius
	var radius = 5;
	var levels = ["0XX", "1XX", "2XX", "3XX"];
	//let magmaClr = (d) => d3.interpolateMagma( parseFloat( parseFloat((d.split(" ")[1][0])) / 4 ));
	function magmaClr(d) {
		try {
			console.log(d);
			//let num = d.split(" ")[1][0];
			let num = d.match("/\d/");
			console.log(num);
			return d3.interpolateMagma( parseFloat( parseFloat(num) / 4 ))
		} catch(e) {
			//console.log(d.match("/\d/"));
			console.log(e);
		}
		
	}

	// var colors = d3.scaleSequential().domain(levels)
	//    d3.interpolateMagma(t);

	d3.select("#graph")
		.append("svg")
		.attr("width", "1200")
		.attr("height", "600")
		.style("border", "1px solid black");

	var svg = d3.select("svg"),
	    width = svg.attr("width"),
	    height = svg.attr("height");

	var color = d3.scaleOrdinal(d3.schemeCategory20);
	//https://observablehq.com/@d3/color-schemes#Magma

	var simulation = d3.forceSimulation()
	    .force("link", d3.forceLink().id(function(d) { return d.name; }))
	    .force("charge", d3.forceManyBody())
	    .force("center", d3.forceCenter(width / 2, height / 2));

	  // var link = svg.append("g")
	  //     .attr("class", "links")
	  //   .selectAll("line")
	  //   .data(links)
	  //   .enter().append("line")
	  //     .attr("class", function(d) {
	  //     	if(d.status == 1) {
	  //     		return "cr"
	  //     	} else if(d.status == 2) {
	  //     		return "cl"
	  //     	} else if(d.status == 3) {
	  //     		return "or"
	  //     	}
	  //     	return "ln";
	  //     })
	  //     .attr("stroke-width", 1);

// build the arrow.
svg.append("svg:defs").selectAll("marker")
    .data(["end"])      // Different link/path types can be defined here
  .enter().append("svg:marker")    // This section adds in the arrows
    .attr("id", String)
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 15)
    .attr("refY", -1.5)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
  .append("svg:path")
    .attr("d", "M0,-5L10,0L0,5");

// add the links and the arrows
var path = svg.append("svg:g").selectAll("path")
    .data(links)
  .enter().append("svg:path")
//    .attr("class", function(d) { return "link " + d.type; })
    .attr("class", "link")
    .attr("marker-end", "url(#end)");


	  var node = svg.append("g")
	      .attr("class", "nodes")
	    .selectAll("g")
	    .data(data)
	    .enter().append("g");
	    
	  var circles = node.append("circle")
	      .attr("r", radius)
	      //.attr("fill", d => d.ip ? 'red' : 'steelblue' )
	      .attr("fill", d =>  d.name : magmaClr(d.name))
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
	      .on("click", function(d) {
	      	d3.select("#ttl")
	      		.text((d.alias ? d.alias+"/" : "") + " " + d.ttl)
	      	d3.select("#desc")
	      		.text(d.desc)
	      })
	      .attr('y', 3);

	  var legend = svg.append("g")
	  	  .style("border", "1px solid black")
	      .attr('transform', 'translate(' + parseFloat(width-150) + ',' + '50)');


	     
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

	    path.attr("d", function(d) {
	        var dx = d.target.x - d.source.x,
	            dy = d.target.y - d.source.y,
	            dr = Math.sqrt(dx * dx + dy * dy);
	        return "M" + 
	            d.source.x + "," + 
	            d.source.y + "A" + 
	            dr + "," + dr + " 0 0,1 " + 
	            d.target.x + "," + 
	            d.target.y;
	    });

	    // link
	    //     .attr("x1", function(d) { return d.source.x; })
	    //     .attr("y1", function(d) { return d.source.y; })
	    //     .attr("x2", function(d) { return d.target.x; })
	    //     .attr("y2", function(d) { return d.target.y; });

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