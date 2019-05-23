function render_graph(url) {
	console.log("start rendering graph")
	var width = 960;
	var height = 600;


	var color = d3.scaleOrdinal(d3.schemeCategory20)
	/* Set up the SVG elements*/
	var svg = d3.select("body")
		.append("svg")
		.attr("width", width)
		.attr("height", height);

	/* Load and bind data */
	d3.json(url, function(error, graph) {
		if (error) throw error;

		var nodes = graph.nodes;
		var links = graph.links;
		console.log(nodes);

		var simulation = d3.forceSimulation(nodes)
			.force("link", d3.forceLink(links).id(function(d) { return d.id; }))
			.force('charge', d3.forceManyBody())
			.force('center', d3.forceCenter(width/2, height/2))
			.on('tick', ticked);

		var link = svg.append("g")
				.attr("stroke", "#999")
				.attr("stroke-opacity", 0.6)
			.selectAll("line")
			.data(links)
			.enter().append("line")
				.attr("stroke-width", function(d) { return Math.sqrt(d.weight/10); });

		var node = svg.append("g")
		    	.attr("stroke", "#fff")
		    	.attr("stroke-width", 1.5)
		    .selectAll("g")
		    .data(nodes)
		    .enter().append("g");

		var circles = node.append("circle")
			.attr("r", 5)
			.attr("fill", function(d) { return color(d.class); });

	 	var labels = node.append("text")
			.text(function(d) { return d.id; })
			.attr('x', 6)
			.attr('y', 3);

		simulation.on("tick", ticked)

		function ticked() {
		  link
				.attr("x1", function(d) { return d.source.x; })
				.attr("y1", function(d) { return d.source.y; })
				.attr("x2", function(d) { return d.target.x; })
				.attr("y2", function(d) { return d.target.y; });

			node
				.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; })
			};
		});
}