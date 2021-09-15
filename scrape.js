




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
