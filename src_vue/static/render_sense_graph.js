/*
Renders the graph on the svg element
@param array of objects graph_nodes
@param array of objects graph_links
@param object target: the target word
*/
async function render_graph(graph_nodes, graph_links, target) {

	// Set initial parameters
	var shiftKey;
	var radius = 5;

	// Choose a predefined colour scheme
	var color = d3.scaleOrdinal(d3.schemePaired);

	// Always remove the svg element. Otherwise a new one is appended every time you click the render button
	d3.select("#graph2").select("svg").remove();
	console.log(app.viewport_width, app.viewport_height)

	// Create the svg element on which you want to render the graph
	var svg = d3.select("#graph2")
		.on("keydown.brush", keydowned)
		.on("keyup.brush", keyupped)
		.each(function() { this.focus(); })
		.append("svg")
			.attr("id", "svg")
			.attr("width", app.svg_width)
			.attr("height", app.svg_height)
			.attr("viewBox", " 0 0 " + app.viewport_width + " " + app.viewport_height)
			.attr("preserveAspectRatio", "xMidYMid meet")
			.classed("svg-content", true)
			
		.call(d3.zoom().on("zoom", function () {
			svg.attr("transform", d3.event.transform)
			}))
		.append("g")

	function keydowned(){
		shiftKey = d3.event.shiftKey || d3.event.metaKey;
	}

	function keyupped() {
		shiftKey = d3.event.shiftKey || d3.event.metaKey;
	}

	// append the brush to the svg for dragging multiple nodes at the same time
	var brush = svg.append("g")
		.attr("class", "brush")

	app.nodes = graph_nodes;
	app.links = graph_links;

	// initialize the class attributes selected and previouslySelected for each node
	app.nodes.forEach(function(d) {
		d.selected = false;
		d.previouslySelected = false;
	});

	// append the target word to the center of the svg
	// var t = svg.append("g")
	// 	.data(target)

	// t.append("text")
	// 	.attr("class", "target")
	// 	.attr("x", (app.viewport_width/2))
	// 	.attr("y", (app.viewport_height/2))
	// 	.text(function(d) { return d.target_word; })

	// create the force simulation
	app.simulation = d3.forceSimulation(app.nodes)
		.force("link", d3.forceLink(app.links).id(function(d) { return d.id; }).distance(function(d) { return app.linkdistance } ))
		.force("charge", d3.forceManyBody().strength(app.charge).distanceMin(1).distanceMax(2000))
		.force("collide", d3.forceCollide().radius(10))
		.force("center", d3.forceCenter(app.svg_width/4, app.svg_height/4))
		.on('tick', ticked);

	var forceLinkDistance = app.simulation.force("link");


	// initialize drag behaviour
	var drag_node = d3.drag()

	// initialize the tooltip for nodes
	var time_diff_tip = d3.tip()
		.attr("class", "d3-tip")
		.html(function(d) { return app.toolTipNode(d.time_ids, d.target_text, d.weights); })

	// initialize the tooltip for edges
	var time_diff_tip_link = d3.tip()
		.attr("class", "d3-tip")
		.html(function(d) { return app.toolTipLink(d.time_ids, d.weights, d.target_text, d.source_text); })

	
	// call the time diff tooltip from the svg
	svg.call(time_diff_tip);
	svg.call(time_diff_tip_link);

	// create the nodes
	app.node = svg.append("g")
			.attr("stroke", "#fff")
			.attr("stroke-width", 1.5)
			.attr("class", "node")
		.selectAll("g")
		.data(app.nodes)
		.enter()
		.append("g")
			.on("mousedown", mousedowned)
				.call(drag_node)
			.on("mouseover", app.mouseOver(0.2))
			.on("mouseout", app.mouseOut)
			.on("click", function(d) {
				if (this.getAttribute("class") === "selected") {
					app.node_selected = true;
				} else {
					app.node_selected = false;
				}
				console.log(d.target_text)
				console.log(d.time_ids)
				app.active_node = {"time_ids": d.time_ids, "weights": d.weights, "source_text": app.target_word, "target_text": d.target_text}
				app.getSimBimsNodes()
				console.log("in nodeclick ", app.active_node)
				app.context_mode3 = true
				app.context_mode = false
				app.select_node_is_no_cluster_node = app.is_normal_node();
				showContextMenu(this);
			})

			
	// append circles to the node
	// this is the way the nodes are displayed in the graph
	app.circles = app.node.append("circle")
		.attr("r", function(d) {
			if (d.cluster_node === "true") {
				// if the node is a cluster node make it twice as big
				return radius * 2;
			} else {
				console.log(d.target_text, Math.max(...d.weights))
				if (isNaN(Math.max(...d.weights))){
					return radius
				} else if(Math.max(...d.weights)<=1){
					return radius * (Math.max(...d.weights)*5+1);
				} else {
					return radius
				}
			}
		})
		.attr("centrality_score", function(d) { 
			if (d.centrality_score != NaN) {
				return d.centrality_score;
			} else {
				return null;
			}
		})
		.attr("cluster", function(d) { 
			if (d.cluster_name) {
				return d.cluster_name;
			} else {
				return d.class;
			}
		})
		.attr("cluster_id", function(d) { return d.class })
		.attr("cluster_node", function(d) {
			// check if the node is a cluster node and make that information known for later
			if (d.cluster_node === "true") {
				return true;
			} else {
				return false;
			}
		})
		.attr("time_ids", function(d) {return d.time_ids})
		.attr("target_text", function(d) {return d.target_text})
		.attr("fill", function(d) { 
			if (d.colour) {
				// if the nodes has an explicit colour use that
				return d.colour
			} else {
				// otherwise look the colour up for the class of the node
				return color(d.class);
			}
		})
		.on("mouseover", time_diff_tip.show)
		.on("mouseout", time_diff_tip.hide);
		

	// append a label to the node which displays its id
	var labels = app.node.append("text")
		.text(function(d) { return d.id; })
		.style('fill', 'black')
		.style('stroke', 'black')
		.attr('x', 6)
		.attr('y', 3)
		.attr("text", function(d) { return d.id; });

	// create the graph links
	app.link = svg.append("g")
		.attr("stroke", "#999")
			.attr("stroke-opacity", app.base_link_opacity)
			.attr("class", "link")
		.selectAll("line")
		.data(app.links)
		.enter().append("line")
			.attr("source", function(d) { return d.source.id })
			.attr("target", function(d) { return d.target.id })
			.attr("source_text", function(d) {return d.source_text})
			.attr("target_text", function(d) {return d.target_text})
			.attr("weight", function(d) { return d.weight })
			.attr("weights", function(d) { return d.weight })
			.attr("time_ids", function(d) {return d.time_ids })
			// set the stroke with in dependence to the weight attribute of the link
			// TODO: sort the weights into three categories and only use three different thicknesses for links according to the category
			.attr("stroke-width", function(d) { 
				if (app.link_thickness_scaled === "true") {
					return Math.sqrt(d.weight / app.link_thickness_factor);
				} else {
					return Math.sqrt(app.link_thickness_value);
				}
			})
			.attr("stroke", function(d) {
				if (d.colour !== undefined) {
					return d.colour
				} else if (d.source.class === d.target.class) {
					return color(d.source.class);
				} else {
					return "#999";
				}
			})
			.on("click", function(d) {
				app.active_edge = {"time_ids": d.time_ids, "weights": d.weights, "source_text": d.source_text, "target_text": d.target_text}
				app.getSimBims()
				// switch on context mode edges, switch off context mode
				app.context_mode = true
				app.context_mode3 = false
			})
			.on("mouseover", time_diff_tip_link.show)
			.on("mouseout", time_diff_tip_link.hide);
	
		app.simulation.on("tick", ticked);

	// update the cluster information in the Vue data variable after initializing the graph
	app.get_clusters();

	// release all pinned nodes and restart the simulation
	d3.select("#restart_button").on("click", function() {
		app.node.each(function(d) {
			//console.log(d)
			d.fx = null;
			d.fy = null;
		});
		app.simulation.alphaTarget(0);
	});

	// determine the dragging behaviour on rendering the graph initially
	// sticky means that the simulation recalculates the other node positions when one has been dragged
	var sticky = app.sticky_mode;

	if (sticky === "false") {
		brush.call(d3.brush()
			.extent([[0, 0], [app.svg_width, app.svg_height]])
			.on("start", brushstarted)
			.on("brush", brushed)
			.on("end", brushended));

		drag_node
			.on("start", function() {
				d3.selectAll('.selected').each(dragstart); })
			.on("drag", function() {
				d3.selectAll('.selected').each(dragmove); })
			.on("end", function() {
				d3.selectAll('.selected').each(dragend); });

	} else if (sticky === "true") {
		drag_node
			.on("start", function() {
				d3.selectAll('.selected').each(dragstart_sticky); })
			.on("drag", function() {
				d3.selectAll('.selected').each(dragmove_sticky); })
			.on("end", function() {
				d3.selectAll('.selected').each(dragend_sticky); });
	} 

	// determine the dragging behaviour if the user switched it on the radio buttons	
	d3.select("#sticky").on("change", function() {
		sticky = app.sticky_mode;

		if (sticky === "false") {
			brush.style("display", "inline")
			brush.call(d3.brush()
				.extent([[0, 0], [app.svg_width, app.svg_height]])
				.on("start", brushstarted)
				.on("brush", brushed)
				.on("end", brushended));

			drag_node
				.on("start", function() {
					d3.selectAll('.selected').each(dragstart); })
				.on("drag", function() {
					d3.selectAll('.selected').each(dragmove); })
				.on("end", function() {
					d3.selectAll('.selected').each(dragend); });

		} else if (sticky === "true") {
			// tidy up after brush and unselect all selected nodes
			brush.style("display", "none");
			
			app.node.classed("selected", function(d) { 
				if (d.selected) {
					d.previouslySelected = d.selected;
					d.selected = ! d.selected;
					return d.selected;
				}
			});

			drag_node
				.on("start", function() {
					d3.selectAll('.selected').each(dragstart_sticky); })
				.on("drag", function() {
					d3.selectAll('.selected').each(dragmove_sticky); })
				.on("end", function() {
					d3.selectAll('.selected').each(dragend_sticky); });
		} 
	});


	// Add cluster nodes when clicking on the apply button in the edit column
	d3.select("#apply_settings_button").on("click", function() {
		for (var i = 0; i < app.clusters.length; i++) {
			var cluster_name = app.clusters[i].cluster_name
			var add_cluster_node = app.clusters[i].add_cluster_node;
			var cluster_colour = app.clusters[i].colour;
			var cluster_id = app.clusters[i].cluster_id;
			var labels = app.clusters[i].labels;

			var text_labels = [];
			var cluster_nodes = []

			for (var j = 0; j < labels.length; j++) {
				text_labels.push(labels[j]["text"]);
				cluster_nodes.push(labels[j]["cluster_node"]);
			}

			var exists = false;
			exists = cluster_node_exists(cluster_id);
			// make sure that each cluster only has one cluster node
			if (add_cluster_node === "true" && !exists) {
				addclusternode(cluster_name, cluster_colour, cluster_id);

				for (var k = 0; k < text_labels.length; k++) {
					addlink(text_labels[k], cluster_name);
				}
			}
		}
		// restart the simulation with the additional nodes and links
		restart();
	})

	// check if a cluster node exists for a specific cluster
	function cluster_node_exists(cluster_id) {
		var nodes = d3.selectAll(".node");
		var exists = false;

		nodes.selectAll("g").each(function(d) {
			childnodes = this.childNodes;

			childnodes.forEach(function(d,i) {
				if (d.tagName === "circle") {
					var is_cluster_node = d.getAttribute("cluster_node");
					var id = d.getAttribute("cluster_id");
					
					if (is_cluster_node === "true" && id === cluster_id) {
						exists = true;
					}
				}
			});
		});
		return exists;
	}

	// Add or remove cluster nodes and edges to the graph and restart the simulation
	// This function is for adding cluster nodes
	function restart() {
		// Apply the general update pattern to the nodes.
		node = app.node.data(app.nodes, function(d) { return d.id;});
		node.exit().remove();

		var g = node.enter()
				.append("g")
				.attr("stroke", "#fff")
				.attr("stroke-width", 1.5)
				.attr("class", "node")
				.on("mousedown", mousedowned)
					.call(drag_node)
				.on("mouseover", app.mouseOver(0.2))
				.on("mouseout", app.mouseOut)
				.on("click", function(d) {
					if (d.selected) {
						app.node_selected = true;
					} else {
						app.node_selected = false;
					}
					app.select_node_is_no_cluster_node = app.is_normal_node();
					showContextMenu(this);
				});

		var circle = g.append("circle")
				.attr("fill", function(d) { return d.colour; })
				//.attr("fill-opacity", 0.5)
				.attr("r", 10)
				.attr("cluster_id", function(d) { return d.cluster_id; })
				.attr("cluster_node", true);

		var text = g.append("text")
			.text(function(d) { return d.id; })
			.style('fill', "black")
			.style('stroke', "black")
			.attr('x', 6)
			.attr('y', 3)
			.attr("text", function(d) { return d.id; });

		app.node = node.merge(g);

		 // Apply the general update pattern to the links.
		link = app.link.data(app.links, function(d) { return d.source.id + "-" + d.target.id; });
		link.exit().remove();
		app.link = link.enter().append("line")
			//.attr("class", "link")
			.attr("weight", 10)
			.attr("source", function(d) { return d.source })
			.attr("target", function(d) { return d.target })
			//.style("stroke-width", 5)
			.attr("stroke", "#eee")
			.merge(link);

		// Update and restart the app.simulation.
		app.simulation.nodes(app.nodes);
		app.simulation.force("link").links(app.links);
		ticked();
		app.simulation.alpha(1).restart();

		// update the object with connected nodes
		app.calc_linkedByIndex()
	}

	function addlink(source, target) {
		if((source !== undefined) && (target !== undefined)) {
			app.links.push({"source": source, "target": target});
			restart();
		}
	}

	function addclusternode(name, colour, cluster_id) {
		app.nodes.push({"id" : name, "colour" : colour, "cluster_id": cluster_id})
		restart()
	}

	// On backspace anywhere in the html body delete cluster node
	// TODO: only focus this on the svg element, otherwise it is really annoying when entering stuff in input fields
	d3.select("body").on("keydown", deleteClusterNode)

	function deleteClusterNode() {
		var KeyID = event.keyCode;
		if (KeyID === 8) {
			var selected_nodes = d3.selectAll(".node").selectAll("g");

			selected_nodes.each(function(d) {
				if (d.selected) {
					var childnodes = this.childNodes;
					var is_cluster_node;
					var node_name;
					//var cluster_id;

					childnodes.forEach(function(d,i) {
						if (d.tagName === "circle") {
							is_cluster_node = d.getAttribute("cluster_node");
							//cluster_id = d.getAttribute("cluster_id");
						}
						if (d.tagName === "text") {
							node_name = d.getAttribute("text");
						}
					});

					if (is_cluster_node === "true") {
						app.deletenode(node_name);
						app.deletelinks(node_name);
						restart();
					}
				}
			});	
		}
	}

	function get_colour(c) {
		return color(c);
	}

	// update the graph with the additional nodes and links
	function update_graph() {
		// Apply the general update pattern to the nodes.
		node = app.node.data(app.nodes, function(d) { return d.id;});
		node.exit().remove();

		var g = node.enter()
				.append("g")
				.attr("stroke", "#fff")
				.attr("stroke-width", 1.5)
				.attr("class", "node")
				.on("mousedown", mousedowned)
					.call(drag_node)
				.on("mouseover", app.mouseOver(0.2))
				.on("mouseout", app.mouseOut)
				.on("click", function(d) {
					if (this.getAttribute("class") === "selected") {
						app.node_selected = true;
					} else {
						app.node_selected = false;
					}
				
					app.select_node_is_no_cluster_node = app.is_normal_node();
					//console.log(this)
					showContextMenu(this);
				})

		circle = g.append("circle")
				.attr("fill", function(d) { return color(d.class); })
				.attr("r", 5)
				.attr("centrality_score", function(d) { return d.centrality_score; })
				.attr("cluster_id", function(d) { return d.class; })
				.attr("cluster_node", false)
				.attr("time_ids", function(d) { return d.time_ids})
				.attr("cluster", function(d) { return d.class; })
				.on("mouseover", time_diff_tip.show)
				.on("mouseout", time_diff_tip.hide);

		d3.select("#select_time_diff").on("change", function(d) {
			if (app.time_diff === false) {
				circle.attr("fill", function(d) { return color(d.class); })
				circle.on("mouseover", null);
				circle.on("mouseout", null);
				app.circles.attr("fill", function(d) { return color(d.class); })
				app.circles.on("mouseover", null);
				app.circles.on("mouseout", null);
				
			}
			if (app.time_diff === true) {
				circle.on("mouseover", time_diff_tip.show);
				circle.on("mouseout", time_diff_tip.hide);
				app.circles.on("mouseover", time_diff_tip.show);
				app.circles.on("mouseout", time_diff_tip.hide);
				
			}
		});


		var text = g.append("text")
			.text(function(d) { return d.id; })
			.style('fill', "black")
			.style('stroke', "black")
			.attr('x', 6)
			.attr('y', 3)
			.attr("text", function(d) { return d.id; });

		app.node = node.merge(g);

		// Apply the general update pattern to the links.
		link = app.link.data(app.links, function(d) { return d.source.id + "-" + d.target.id;});
		link.exit().remove();
		app.link = link.enter().append("line")
			.attr("weight", function(d) { return d.weight })
			.attr("source", function(d) {
				return d.source;
			})
			.attr("target", function(d) { return d.target })
			.attr("stroke-width", function(d) { 
				if (app.link_thickness_scaled === "true") {
					return Math.sqrt(d.weight / app.link_thickness_factor);
				} else {
					return Math.sqrt(app.link_thickness_value);
				}
			})
			.merge(link);

		
		// Update and restart the app.simulation.
		app.simulation.nodes(app.nodes);
		app.simulation.force("link").links(app.links);
		ticked();

		// colour the links
		var all_links = svg.selectAll("line")
		all_links.each(function() {
				// check if link is connected to cluster node
				var is_connected_to_cluster_node = false;
				var source = this.getAttribute("source");
				var target = this.getAttribute("target");
				var source_colour = app.findColour(source);
				var target_colour = app.findColour(target);
				console.log(source, source_colour, target, target_colour)
				
				is_connected_to_cluster_node = app.check_cluster_node_connection(source);
				if (is_connected_to_cluster_node === false) {
					is_connected_to_cluster_node = app.check_cluster_node_connection(target);
				}
				if (is_connected_to_cluster_node === false) {
					if (source_colour === target_colour) {
						this.setAttribute("stroke", source_colour);
					} else {
						this.setAttribute("stroke", "#999");
					}
				}
		})

		app.simulation.alpha(1).restart();

		// keep track of the connected nodes
		app.calc_linkedByIndex();
		// linkedByIndex = {};
		// app.links.forEach(function(d) {
		// 	linkedByIndex[d.source.id + "," + d.target.id] = 1;
		// });
	}


	// Switch between time diff and sense clustering mode
	d3.select("#select_time_diff").on("change", function(d) {
		// sense clustering
		if (app.time_diff === false) {
			
			app.reset_time_diff_colours();
			console.log("time diff change triggered render sense graph")
			
		}
		if (app.time_diff === true) {
			

			d3.select("#skip_through_button").on("click", function(d) {
				if (this.getAttribute("aria-expanded") === "true") {
					app.node.on("mouseover", null);
					app.node.on("mouseout", null);
				} else {
					app.node.on("mouseover", app.mouseOver(0.2));
					app.node.on("mouseout", app.mouseOut);
				}
				
			})
		}
	});

	// add new nodes and edges to the graph when the user updated the number of nodes and edges
	d3.select("#update_button").on("click", async function() {
		app.update().then((res) => {

			var existing_labels = [];
			var new_labels = [];
			for (var j = 0; j < app.clusters.length; j++) {
				var cluster = app.clusters[j];
			
				for (var k=0; k < cluster.labels.length; k++) {
					existing_labels.push(cluster.labels[k].text);
				}
			}

			for (var i = 0; i < app.updated_nodes.length; i++) {
				var new_label = app.updated_nodes[i].id;
				new_labels.push(new_label);

				var cluster_class = app.updated_nodes[i].class;
				var centr_score = app.updated_nodes[i].centrality_score
				
					if (!existing_labels.includes(new_label)) {
						// add new nodes to the nodes array
						app.nodes.push({"id": app.updated_nodes[i].id,
							"class": app.updated_nodes[i].class,
							"time_ids": app.updated_nodes[i].time_ids,
							"centrality_score": app.updated_nodes[i].centrality_score}
							);
					} else {
						// update existing ones (colour, cluster id and cluster name)
						var existing_nodes = d3.selectAll(".node");
						existing_nodes.selectAll("g").each(function(d,i) {
							var label;
							var childnodes = this.childNodes;
							
							childnodes.forEach(function(d,i) {
								if (d.tagName === "text") {
									label = d.getAttribute("text");
							}
						});

						if (new_label === label) {
							childnodes.forEach(function(d,i) {
								if (d.tagName === "circle") {
									var colour = get_colour(cluster_class);

									d.setAttribute("centrality_score", centr_score)
									d.setAttribute("cluster_id", cluster_class);
									d.setAttribute("fill", colour);
									d.setAttribute("cluster", cluster_class);
								}
							});
						}
					});
				}
			}

			// downscale graph
			for (var i = 0; i < existing_labels.length; i++) {
				if (!new_labels.includes(existing_labels[i])) {
					//console.log(existing_labels[i])
					app.deletelinks(existing_labels[i]);
					app.deletenode(existing_labels[i]);
				}
			}

			app.nodes.forEach(function(d) {
				d.selected = false;
				d.previouslySelected = false;
			});

			// update the links too
			for (var i = 0; i < app.updated_links.length; i++) {
				var source = app.updated_links[i].source
				var target = app.updated_links[i].target
				var found = false

				for (var j = 0; j < app.links.length; j++) {
					if (app.links[j].source.id === source && app.links[j].target.id === target) {
						found = true
					}
				}
				if (found === false) {
					app.links.push(app.updated_links[i]);
				}
			}
			update_graph()
			app.get_clusters();
		});
	});



	function showContextMenu(d) {
		if (app.node_selected) {
			d3.select('#nodeOptionsDD')
				.style('display', 'block')

			d3.event.preventDefault();
		} else {
			d3.select('#nodeOptionsDD')
				.style('display', 'none');
		}
	}

	function brushstarted(){
		if (d3.event.sourceEvent.type !== "end") {
			app.node.classed("selected", function(d) {
				return d.selected = d.previouslySelected = shiftKey && d.selected;
			});
		}
	}

	function brushed() {
		if (d3.event.sourceEvent.type !== "end") {
			var selection = d3.event.selection;

			app.node.classed("selected", function(d) {
				return d.selected = d.previouslySelected ^ (selection != null && selection[0][0] <= d.x && d.x < selection[1][0]
				&& selection[0][1] <= d.y && d.y < selection[1][1]);
			});
		}
	 }

	function brushended() {
		if (d3.event.selection != null) {
			d3.select(this).call(d3.event.target.move, null);
		}
	}

	function mousedowned(d){
		/*
		if (shiftKey) {
			d3.select(this).classed("selected", d.selected = !d.selected);
			d3.event.stopImmediatePropagation();
		} else if (!d.selected) {
			node.classed("selected", function(p) { return p.selected = d === p;});
		}
		*/
		if (!d.selected) {
			app.node.classed("selected", function(p) {
				return p.selected = d === p;
			})
		} else if (shiftKey && app.sticky_mode==="true") {
			d3.select(this).classed("selected", d.selected = !d.selected);
			d3.event.stopImmediatePropagation();
		} else if (app.sticky_mode === "true"){
			d3.select(this).classed("selected", d.selected = !d.selected);
			//d3.event.stopImmediatePropagation();
		}
	}

	// update node and link positions
	function ticked() {
		app.node
			.attr("transform", positionNode);
		app.link
			.attr("x1", function(d) { return d.source.x; })
			.attr("y1", function(d) { return d.source.y; })
			.attr("x2", function(d) { return d.target.x; })
			.attr("y2", function(d) { return d.target.y; });

	}

	function positionNode(d) {
		// keep the node within the boundaries of the svg
		if (d.x < 0) {
			d.x = 0;
		};
		if (d.y < 0) {
			d.y = 0;
		};
		if (d.x > app.svg_width) {
			d.x = app.svg_width - 50;
		};
		if (d.y > app.svg_height) {
			d.y = app.svg_height - 50;
		};
		return "translate(" + d.x + "," + d.y + ")";
	}

	// update the connected nodes
	app.calc_linkedByIndex();

	function dragstart(d) {
		app.simulation.stop()
	}

	function dragmove(d) {
		d.x += d3.event.dx;
		d.y += d3.event.dy;
		d.fx = d.x;
		d.fy = d.y;
		ticked();
	}

	function dragend(d) {
		ticked();
	}

	function dragstart_sticky(d) {
		if (!d3.event.active) {
			app.simulation.alphaTarget(0.3).restart();
		}
	}

	function dragmove_sticky(d) {
		d.x = d3.event.x;
		d.y = d3.event.y;
		d.fx = d3.event.x;
		d.fy = d3.event.y;
	}

	function dragend_sticky(d) {
		if (!d3.event.active) {
			app.simulation.alphaTarget(0);
		}
		//d.fx = null;
		//d.fy = null;
	}
}