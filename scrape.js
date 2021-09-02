
const begin = "http://catalogue.uvm.edu/undergraduate/artsandsciences/computerscience/#courseinventory"


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
	//data.forEach(d => console.log(d.id));

	// ouch
	//const coursecontainer = data.find(d => d.id =='page-content').children[1].children[1].children[5];

	const courses = data.find(d => d.id =='page-content').getElementsByClassName("courseblock");

	return courses;
    
	Array.from(courses).forEach(d => console.log(d));

}
function getCourseInfo(data) {
	let title = "";
	let desc = "";
	let courses = [];
	let titles = [];
	let links = [];
	Array.from(data).forEach(function(d) {
		title = d.getElementsByClassName("courseblocktitle")[0].outerText;
		desc = d.getElementsByClassName("courseblockdesc")[0].outerText;
		
		let ttl = title.split(" ");
		let course = {};
		//course.num = ttl[0].match(/[0-9]+/)[0];
		course.name = title.match(/[^.]+/)[0];
		course.credits = ttl[ttl.length-2];
		course.desc = desc;
		console.log(desc.substring(desc.search("Prereq")).match(/\b\w+\s\d+\b/))
		courses.push({"id": course.name, "group": 1});
		titles.push(course.name);
		var prereq = desc.substring(desc.search("Prereq")).match(/\w+\s\d+/);
		while(prereq) {
			links.push({source: prereq[0], target: course.name, value: 1 });
			prereq = prereq.input.substring(prereq[0].length + prereq.index).match(/\w+\s\d+/);
		}
		console.log(course.desc);
	});
	links.forEach(function(d) {

		if(!(titles.includes(d.source))) {
			titles.push[d.source];
			courses.push({"id": d.source, "group": 1});
		}
		if(!(titles.includes(d.target))) {
			titles.push[d.target];
			courses.push({"id": d.source, "group": 1});
		}

	})

	return [courses, links];
}

function sanitize(data) {

}

// Gets all episode titles from an HTML webpage object
// data MUST be in the form of an HTML webpage object
// Returns a dictionary in the format of episode # -> description
function getEpisodeTitles(data) {
	
	// Code for array-oriented approach
	var titles = {};
	var ttls = data.map(d => d.find('h1').text()).filter(d => d.toLowerCase().includes("episode")); // Find the episode description(usually the only h1 tag on the page)

	ttls.forEach(function(d) {
		var title = d.split("-");
		var description = title.slice(1).join("").trim(); // Include some titles with extra hyphens in their description, trim the whitespace too!
		if(description.length < 100 && description != "") { // Filters out ??? big descriptions ??? just don't take it out
		 titles[parseInt(title[0].match(/[1-9]\d*|0\d+/g)[0])] = description; // index a regex matching of all numbers followed by the description
		}
		
	});
	
	
	return titles;
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

	d3.select("#graph")
		.append("svg")
		.attr("width", "1200")
		.attr("height", "1000");

	var svg = d3.select("svg"),
	    width = svg.attr("width"),
	    height = svg.attr("height");

	var color = d3.scaleOrdinal(d3.schemeCategory20);

	var simulation = d3.forceSimulation()
	    .force("link", d3.forceLink().id(function(d) { return d.id; }))
	    .force("charge", d3.forceManyBody())
	    .force("center", d3.forceCenter(width / 2, height / 2));

	  var link = svg.append("g")
	      .attr("class", "links")
	    .selectAll("line")
	    .data(links)
	    .enter().append("line")
	      .attr("stroke-width", 1);

	  var node = svg.append("g")
	      .attr("class", "nodes")
	    .selectAll("g")
	    .data(data)
	    .enter().append("g");
	    
	  var circles = node.append("circle")
	      //.attr("r", (d) => Math.sqrt(d.key) * 30)
	      .attr("r", (d) => 5)
	      .attr("fill", 'steelblue')
	      .call(d3.drag()
	          .on("start", dragstarted)
	          .on("drag", dragged)
	          .on("end", dragended));

	  var labels = node.append("text")
	      .text((d) => d.id)
	      .attr('x', 6)
	      .attr('y', 3);

	  node.append("title")
	      .text(function(d) { return d.id; });

	  simulation
	      .nodes(data)
	      .on("tick", ticked);

	  simulation.force("link")
	      .links(links);

	  function ticked() {
	    link
	        .attr("x1", function(d) { return d.source.x; })
	        .attr("y1", function(d) { return d.source.y; })
	        .attr("x2", function(d) { return d.target.x; })
	        .attr("y2", function(d) { return d.target.y; });

	    node
	        .attr("transform", function(d) {
	          return "translate(" + d.x + "," + d.y + ")";
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



	// Rectangles
	// svg.selectAll("myRect")
	//   .data(data)
	//   .enter()
	//   .append("rect")
	//   .attr("x", 0 )
	//   .attr("y", function(d) { return y(d.key); })
	//   .attr("width", function(d) { return ((d.value * width) / max); })
	//   .attr("height", y.bandwidth() )
	//   .attr("fill", function(d) { return d.key.charCodeAt(0) % 2 ? "#64727b" : "#28363f" })
	//   .on("mouseover", function(d) {
	//   	tooltip.transition()
	//   	.duration(200)
	//   	.style("opacity", .9);
	//   	tooltip.html("Word: " + d.key + "<br/>" + "Uses: " + d.value)
	//   	.style("left", (d3.event.pageX) + "px")
	//   	.style("top", (d3.event.pageY - 28) + "px");
	//   }) 
	//   .on("mouseout", function(d) {
	//   	tooltip.transition()
	//   	.duration(500)
	//   	.style("opacity", 0);
	//   });
}