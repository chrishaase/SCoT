app = new Vue({
   el: "#vue-app",
   data: {
	   // #### BASIC APP AND COLLECTION DATA (PRESETS AND QUERY-VARS)
		// PRESET title top-left
		title : "Semantic Clustering of Tags over Time",	
		
		// QUERIED DATA from backend-database
		// User Values - suggestions will be loaded from config at startup (first collection will be chosen)
		target_word : "",
		senses : 0,
		edges : 0,
		start_year : 0,
		end_year : 0,
		collection_key : "",
		collection_name: "",
		// all possible collections queried from database
		collections : {}, // collections keys and names
		collections_names: [], // collections_names
		// all possible start years queried from the database
		start_years : [],
		// all possible end years queried from the database
		end_years : [],
		// experimental not implemented yet
		graph_type: "max_across_slices",
		// all possible graph types not implemented yet
		graph_types :["max_across_slices", "max_per_slice", "stable_nodes"], 
		// limits the size of clusters for context-information-search
		// queries larger than 50 usually take too long (can vary accoring to db optimization)
		cluster_search_limit: 1000,


		
		// ##### VIEW SETTINGS APP AND SVG-GRAPH
		// base color scheme bootstrap vue (not implemented via var yet)
		bv_variant : "black",
		bv_type : "white",
		// for setting the view port size for the graph
		viewport_height : screen.availHeight*1,
		viewport_width : screen.availWidth*1,
		// for setting the svg size for the graph
		svg_height : screen.availHeight*1.5,
		svg_width : screen.availWidth*1.5,
		// the force simulation
		simulation : null,
		// link thickness parameters
		link_thickness_scaled : "false",
		link_thickness_value : 1,
		link_thickness_factor : 0.1,
		// opacity of links base and reduced (for many functions)
		base_link_opacity : 0.3,
		reduced_link_opacity: 0.1,
		//overlays central
		overlay_main : false,
		// dragging behaviour sticky_mode === "true" -> force, sticky_mode === "false" -> brush
		sticky_mode : "true",
		// simulation parameters
		charge : -50,
		linkdistance : 50,
		// represents the DOM element for a node (see render_sense_graph.js)
		node : "",
		// represents the DOM element for a link (see render_sense_graph.js)
		link : "",

		// true, if a graph is rendered. Used in the HTML to only show buttons if a graph is rendered
		graph_rendered : false,
		wait_rendering : false,		
		
				
		// #### VIEW MODES SIDEBARS AND NAVBARS
		// ## SIDEBAR LEFT GRAPH
		left_selected: 'graph_data',
        left_options: [
          { text: 'Data', value: 'graph_data' },
          { text: 'View', value: 'graph_view' },
          { text: 'Help', value: 'graph_help' }
          
        ],
		// ## SIDEBAR right Cluster
		right_selected: 'cluster_basic',
		right_selected_previous: 'cluster_basic',
        right_options: [
          { text: 'Cluster', value: 'cluster_basic' },
          { text: 'Time-Diff', value: 'cluster_time' },
          { text: 'Functions', value: 'cluster_functions' }
          
        ],
		// controls node colors cluster or time-diff
	   time_diff : false,
	   // edge context sidebar is programmatically controlled
	   context_mode : false,
	   showSidebarRight1 : false,
	   // spinner while loading table data
	   busy_right1 : false,
	    // table information for edge -context view sidebar
		fields_edges : [
			{key: "node1", label:"node1", sortable: true},
			{key: "edge", label:"context-word", sortable: true},
			{key: "node2", label: "node2", sortable: true}
			
		],
	    // cluster context sidebar
		context_mode2 : false,
		showSidebarRight2: false,
		busy_right2: true,
		// table information for cluster -context view sidebar
		fields_cluster : [
			{key: "score", sortable: true},
			{key: "wort", sortable: true}
			
		],


		// node context sidebar
		
	   context_mode3 : false,
	   showSidebarRight3: false,
	   busy_right3 : false,
	  
		// table information for node -context view sidebar
		fields_nodes : [
			{key: "node1", label: "node1", sortable: true},
			{key: "edge", label: "context-word", sortable: true},
			{key: "node2", label: "node2", sortable: true}
			
		],
		// doc context sidebar
		   context_mode4 : false,
		// show sidebar
		   showSidebarRight4: false,
		// spinner
		   busy_right4 : false,
		// table information for cluster -context view sidebar
		documents:[],
		fields_documents : [
			{key: "doc", sortable: true}
						
		],

		// #### BASIC GRAPH DATA ##########################
		// node data
		nodes : [],
		// the circles of updated nodes
		circles : [],
		// link data
		links : [],
		// list of objects to store all the information on the clusters in a rendered graph (see function get_clusters())
		clusters : [],
		// array with node ids that are not connected to any other nodes
		singletons : [],
		// new clusters calculated by reclustering the graph
		newclusters : {},
		// An object for remembering which nodes are connected. The key is of the form "source, target"
		linkedByIndex : {},
		// file from which a graph is to be loaded
		file : null,
		// graph loaded from file
		read_graph : null,
		

		// ### DATA SETTINGS SIDEBARS
	   // edge-click information for data-query for sidebar
	   active_edge: {"time_ids": [1], "weights": [1], "source_text": "happiness/NN", "target_text": "gladness/NN"},	
	   // sigebar right: holds edge context information (score, key, score2)
	   simbim_object: [],
	   // node-click information for data-query for sidebar
	   active_node: {"time_ids": [1], "weights": [1], "source_text": "happiness/NN", "target_text": "gladness/NN"},	
	   // sigebar right: holds node context information (score, key, score2)
	   simbim_node_object: [],
	   // sigebar right: holds cluster context information (score, key, score2)
	   cluster_shared_object: [],
	   // the time id of the graph start year, user input for skipping through time slices
		min_time_id : 1,
		// the time_id of the graph end year, user input for skipping through time slices
		max_time_id: 10,
		// time ids for the time diff mode
		interval_start : 0,
		interval_end : 0,
		// user input: time slice id for skipping through time slices in time diff mode
		interval_id : 0,
		// display nodes in one time-slice
		time_slice_nodes : [],
		// accumulate which nodes are born, deceased, shortlived or normal
		time_diff_nodes : {},
		// true if a node is selected, for showing node option menu
		node_selected : false,
		// true if a link is selected
		link_selected : false,
		// check if selected node is cluster node, for options in the node option menu
		select_node_is_no_cluster_node : true,
		// array that holds information about all selected nodes
		clicked_nodes : [],
		// user input for assignment to different cluster (text, colour)
		new_assigned_cluster : {},
		// user input new cluster name
		created_cluster_name : "",
		// user input new cluster colour
		created_cluster_colour : "",
		// true if the user has selected a cluster
		// TODO implement functionality, currently buggy and not in use
		cluster_selected : false,
		// search term for searching a node in the graph
		searchterm : "",
		// betweenness centrality
		centrality_scores : [],
		// for table display
		centrality_fields : [
			{key: "text", label: "Node", sortable: true},
			{key: "centrality_score", sortable: true}
			],
		// user input
		centrality_threshold_s : "0.0",
		centrality_threshold_m : "0.1",
		centrality_score_distribution : [],
		// toggling the edit column
		edit_column_open : false,
		// highlight balanced neighbourhood
		highlightWobblies : false,
		// highlight betweenness centrality
		hightlighInbetweennessCentrality : false,
		// balanced neighbourhood table fields
		wobblyCandidatesFields : [
			{key:"text", label: "Node", sortable: true},
			{key: "connected_clusters", label: "Connected Clusters", sortable: false},
			{key: "balanced", label: "Balanced", sortable: true},
			{key: "show_details", label: "Show Details"}
			],
		// array containing information about the neighbourhood of each node
		wobblyCandidates : [],
		// node-year for context-information
		node_time_id: 1,
		// row_selected in Node-context
		row_selected: [],
		// row_selected in edge Context
		row_selected_edge: [],
		// ############# DEPRECATED #########################
		// Deprecated
		data_from_db : {},
		// Deprecated: parameters for updating the graph
		update_senses : 150,
		update_edges : 50,
		// clipboard for data from db in update() and getData()
		// all the nodes in the updated graph
		updated_nodes : null,
		// all the links in the updated graph
		updated_links : null
		
	},
	computed: {
			
		
		/*
		Returns all the clusters as an array of objects of the form 
			{"text": cluster_name}, "value": {"cluster_id": some_id, "cluster_name": some_cluster_name, "colour": some_cluster_colour}
		to be used as the options when selecting a different cluster for a node.
		All the information about the clusters is already stored in the data variable clusters.
		*/
		cluster_options: function() {
			app.new_assigned_cluster = {}
			options = [];
			for (var i=0; i < app.clusters.length; i++) {
				options.push(
					{"text": app.clusters[i].cluster_name, "value": {"cluster_id" : app.clusters[i].id, "cluster_name": app.clusters[i].cluster_name, "colour": app.clusters[i].colour}}
				);
			}
			return options;
		},
		/*
		Returns all the possible start years for the small time diff interval
		(Only the start years between the start year and the end year of the graph)
		*/
		reducedStartYears: function() {
			reducedStartYears = [];
			for (var i=0; i < app.start_years.length; i++) {
				if (app.start_years[i].value >= app.start_year && app.end_year > app.start_years[i].value) {
					reducedStartYears.push(app.start_years[i]);
				} 
			}
			return reducedStartYears;
		},
		/*
		Returns all the possible end years for the small time diff interval.
		(The years small that the end year of the graph and larger than the start year of the small interval)
		Takes into account the selected start year of the small time diff interval.
		*/
		reducedEndYears: function() {
			reducedEndYears = []
			for (var i=0; i < app.end_years.length; i++) {
				if (app.end_years[i].value <= app.end_year && app.end_years[i].value > app.interval_start) {
					reducedEndYears.push(app.end_years[i]);
				}
			}
			return reducedEndYears;
		},
		/*
		Returns a string showing the start and end year of a time slice
		*/
		time_slice_from_interval: function() {
			var start = app.start_years[app.interval_id - 1];
			var end = app.end_years[app.interval_id - 1];
			if (typeof start === "undefined") {
				start = "-"
			} else {
				start = start.text;
			}
			if (typeof end === "undefined") {
				end = "-"
			} else {
				end = end.text
			}

			return start + " - " + end
		}
	},
	methods: {
		/*
		/ ############## SIDEBAR RIGHT ADDITIONAL FUNCTIONS Get documents from backend ##############################
		/ You can click one row in node-context or edge-context
		/ and get sentences that contain a combination of two words
		/ Various methods
		*/
		
		// returns selected row in table node-context information
		onRowSelected(items) {
			//this.selected = items
			console.log(items)
			this.row_selected = items
		  },
		// returns selected row in table node-context information
		onRowSelectedEdge(items) {
			//this.selected = items
			console.log(items)
			this.row_selected_edge = items
		  },
		// function for button search N1/
		edgeContextSearchEdgeOne(){

			let wort1 = this.active_edge.source_text
			if (this.row_selected_edge == null || this.row_selected_edge["length"] == 0) {
				//console.log("items is null")
				alert("Please select a row in the table to select a search term.")
			} else {
		  		let wort2 = this.row_selected_edge[0]["edge"]
		  		app.docSearch(wort1, wort2)
			}
		  },
		// function for button search N2
		edgeContextSearchEdgeTwo(){
			let wort1 = this.active_edge.target_text
			if (this.row_selected_edge == null || this.row_selected_edge["length"] == 0) {
				//console.log("items is null")
				alert("Please select a row in the table to select a search term.")
			} else {
				let wort2 = this.row_selected_edge[0]["edge"]
				app.docSearch(wort1, wort2)
			}
		  },
		// function for buttion search N1
		nodeContextSearchNodeOne(){
		  let wort1 = this.active_node.source_text
		  if (this.row_selected == null || this.row_selected["length"] == 0) {
			//console.log("items is null")
			alert("Please select a row in the table to select a search term.")
			} else {
		  		let wort2 = this.row_selected[0]["edge"]
		  		app.docSearch(wort1, wort2)
			}
		},
		// function for button search N2
		nodeContextSearchNodeTwo(){
			let wort1 = this.active_node.target_text
			if (this.row_selected == null || this.row_selected["length"] == 0) {
				//console.log("items is null")
				alert("Please select a row in the table to select a search term.")
			} else {
				let wort2 = this.row_selected[0]["edge"]
				app.docSearch(wort1, wort2)
			}
		},
		// doc search function - searches for sentences that contain two words (regardless of time-id)
		// experimental feature that can be used to request original data (ie sentences)
			// that contain node1 and the selected row -word [to do]
			// data is gathered from these fields (see above methods)
			// data["word1"] = this.active_edge.source_text
			// data["word2"] = this.active_edge.target_text
			// data["time_id"] = this.active_edge.time_ids[0]
			// data["word1"] = this.active_node.source_text
			//data["word2"] = this.active_node.target_text
		docSearch(wort1, wort2){
						
			this.context_mode4 = true
			this.busy_right4 = true
			let data = {}
			data["word1"] = wort1
			data["word2"] = wort2
				
			console.log("selected", data["word1"], data["word2"])
			let url = './api/collections/'+this.collection_key +'/documents'
			console.log(url)
			axios.post(url, data)
				.then((res) => {
					let ret = []
					console.log(res)
					this.documents = res.data["docs"]
					console.log(this.documents)
					this.busy_right4 = false
				}) // end then
			
		},

		/*
		/ ############ Graph-Menu - DATA Functions ###########################
		*/
		// on change database in frontend - update function
		onChangeDb: function(){
			this.collection_key = this.collections[this.collection_name]["key"]
			this.target_word = this.collections[this.collection_name]["target"]
			this.senses = this.collections[this.collection_name]["p"]
			this.edges = this.collections[this.collection_name]["d"]
			console.log("in onchange db" + this.collection_key)
			console.log("in onchange db" + this.collection_name)

			// async
			this.getStartYears()
			this.getEndYears()
						
		},
				
		// init collections from axios
		getCollections: function(){
			
			axios.get('./api/collections')
				.then((res) => {
					this.collections = res.data;
					this.collections_names = Object.keys(this.collections);
					this.collection_name = this.collections_names[0]
					this.onChangeDb()
				})
				.catch((error) => {
					console.error(error);
				});
			},
		/*
		/ ############ Graph-Menu - VIEW Functions ###########################
		*/
		// restart
		restart_change(){
			app.node.each(function(d) {
				//console.log(d)
				d.fx = null;
				d.fy = null;
			});
			app.simulation.alphaTarget(0);
		},
		
		
		// update the charge strength if the user moves the range input with the value from the Vue data variable charge and restart the simulation with the new value
		charge_change(){
			console.log("charge change")
			app.simulation.force("charge", d3.forceManyBody()
			.strength(app.charge)
			.distanceMin(1)
			.distanceMax(2000));
			app.simulation.alpha(1).restart();
			

		},
		// update the link distance if the user moves the range input with the value from the Vue data variable linkdistance and restart the simulation with the new value
		linkdistance_change(){
			console.log("linkdist change")
			let forceLinkDistance = app.simulation.force("link");
			forceLinkDistance.distance(app.linkdistance)
			app.simulation.alpha(1).restart()
			

		},

		nonevent(e){
			//do nothing
		},
		/*
		/ automated sidebars via close buttion #############################
		*/
		toggleSidebarContext: function(){
			this.context_mode3 = false
			this.context_mode = !this.context_mode
			console.log("in toggle", this.context_mode)
		},

		toggleSidebarContext2: function(){
			
			this.context_mode2 = !this.context_mode2
			console.log("in toggle2", this.context_mode2)
		},

		toggleSidebarContext3: function(){
			this.context_mode = false
			this.context_mode3 = !this.context_mode3
			console.log("in toggle3", this.context_mode3)
		},

		toggleSidebarContext4: function(){
			
			this.context_mode4 = !this.context_mode4
			console.log("in toggle4", this.context_mode4)
		},

		toggle_time_diff: function(){
			//  lazy change - ie state changes only after this function
			console.log("inside toggle time diff START", this.time_diff)
			// wenn time-diff on -- dann gehen wir weg von time-diff daher
			if (this.time_diff && this.graph_rendered){
				this.reset_time_diff_colours()
				
			}
			if (this.right_selected === "cluster_time"){
				this.time_diff = false
			}
			console.log("inside toggle time diff END", this.time_diff)

			
		},

		/*
		/ ############# GRAPH-INTERACTION FUNCTIONS ######################
		*/

		// fade nodes on hover
		mouseOver: function(opacity) {
			return function(d) {
				// check all other nodes to see if they're connected
				// to this one. if so, keep the opacity, otherwise
				// fade
				app.node.style("stroke-opacity", function(o) {
					thisOpacity = app.isConnected(d, o) ? 1 : opacity;
					return thisOpacity;
				});
				app.node.style("fill-opacity", function(o) {
					thisOpacity = app.isConnected(d, o) ? 1 : opacity;
					return thisOpacity;
				});
				// also style link accordingly
				app.link.style("stroke-opacity", function(o) {
					return o.source === d || o.target === d ? this.base_link_opacity : this.reduced_link_opacity;
				});
				//link.style("stroke", function(o){
					// TODO: how to get o.source.colour for graph rendered from db?
					// works for graph loaded from file
				//	return o.source === d || o.target === d ? o.source.colour : "#ddd";
				//});
			}
		},

		// fade everything back in
		mouseOut: function() {
			app.node.style("stroke-opacity", 1);
			app.node.style("fill-opacity", 1);
			app.link.style("stroke-opacity", this.base_link_opacity);
			//link.style("stroke", "#ddd");
		},

		/*
		/ ############## TIME_DIFF-FUNCTIONS ####################################
		*/

		// reset the colour of the nodes to cluster colours
		reset_time_diff_colours: function() {
			app.circles.style("stroke-opacity", 1);
			app.link.style("stroke-opacity", this.base_link_opacity);
			
			var circleChilds = d3.selectAll(".node").selectAll("g").selectAll("circle");

			circleChilds.each(function(d) {
				var node_cluster_id = this.getAttribute("cluster_id");
				console.log("in reset color vue.js ", app.clusters)
				for (var i=0; i < app.clusters.length; i++) {
					// set the colour of the nodes back to the cluster colours
					if (node_cluster_id === app.clusters[i].cluster_id) {
						this.setAttribute("fill", app.clusters[i].colour);
					}
				}
			})
			app.node.style("stroke-opacity", 1);
			app.node.style("fill-opacity", 1)
			// don't show time diff tooltip
			// TODO tooltip hier ausstellen
			app.circles.on("mouseover", null);
			app.circles.on("mouseout", null);
			app.node.on("mouseover", app.mouseOver(0.2));
			app.node.on("mouseout", app.mouseOut);
		},
		// /*
		// EXPERIMENTAL Deletes a complete time-group
		// */
		delete_multiple_nodes: async function(labels) {
			// get all the text labels
			console.log(labels)
			
			// find the correct nodes and delete them and the links connecting to them
			var nodes = d3.selectAll(".node").selectAll("g");
			nodes.each(function(d) {
				childnodes = this.childNodes;
				var node_id;
				
				childnodes.forEach(function(d,i) {
					if (d.tagName === "text") {
						node_id = d.getAttribute("text")
					}
				})
				
				// if they belong to the list, that is to be deleted, ...
				if (labels.includes(node_id)){
					console.log("in node del", node_id)
					app.deletenode(node_id)
					app.deletelinks(node_id)
				}

				
			});

			// remove nodes from DOM with D3 and update the simulation
			app.node.data(app.nodes, function(d) { return d.id }).exit().remove();
			app.link.data(app.links, function(d) { return d.source.id + "-" + d.target.id; }).exit().remove();

			app.simulation.nodes(app.nodes);
			app.simulation.force("link").links(app.links);
			app.simulation.alpha(1).restart();

			

			
		},
		/*
		################## CLUSTER-FUNCTIONS Deletes a complete cluster
		*/
		delete_cluster: async function(cluster_name, cluster_id, labels) {
			// get all the text labels
			text_labels = []
			for (var i = 0; i < labels.length; i++) {
				text_labels.push(labels[i].text)
			}

			// see how many nodes are in the cluster
			var number_of_nodes = text_labels.length;

			// find the correct nodes and delete them and the links connecting to them
			var nodes = d3.selectAll(".node").selectAll("g");
			nodes.each(function(d) {
				childnodes = this.childNodes;
				var node_id;
				var id;

				childnodes.forEach(function(d,i) {
					if (d.tagName === "circle") {
						id = d.getAttribute("cluster_id");
					}
					if (d.tagName === "text") {
						node_id = d.getAttribute("text")
					}
				})
				
				// if they belong to the cluster, that is to be deleted, ...
				if (id === cluster_id) {
					app.deletenode(node_id)
					app.deletelinks(node_id)

				}
			});

			// remove nodes from DOM with D3 and update the simulation
			app.node.data(app.nodes, function(d) { return d.id }).exit().remove();
			app.link.data(app.links, function(d) { return d.source.id + "-" + d.target.id; }).exit().remove();

			app.simulation.nodes(app.nodes);
			app.simulation.force("link").links(app.links);
			app.simulation.alpha(1).restart();

			// Update the number of updated senses for when saving the file the name will be correct
			if (app.updated_nodes != null) {
				app.update_senses = app.update_senses - number_of_nodes;
			}

			// update number of senses
			app.senses = app.senses - number_of_nodes;

			// recalculate the cluster information
			await app.get_clusters()
		},
			// check the dictionary to see if nodes are linked
		isConnected: function(a, b) {
			return app.linkedByIndex[a.id + "," + b.id] || app.linkedByIndex[b.id + "," + a.id] || a.id == b.id;
		},
		/*
		Returns an object with the connections in the graph
		*/
		calc_linkedByIndex: function() {
			app.linkedByIndex = {};
			app.links.forEach(function(d) {
				app.linkedByIndex[d.source.id + "," + d.target.id] = 1;
			});
		},
		/*
		Delete one selected node
		*/
		delete_selected_nodes: async function() {
			app.findSelectedNodes();
			app.clicked_nodes.forEach(function(d) {
				app.deletenode(d.id);
				app.deletelinks(d.id);
			})
			// update DOM elements
			var node = app.node.data(app.nodes, function(d) { return d.id })
			node.exit().remove();
			app.node = node.enter().append("g").merge(node);

			var link = app.link.data(app.links, function(d) { return d.source.id + "-" + d.target.id; })
			link.exit().remove();
			app.link = link.enter().append("line").merge(link);

			// update number of senses and updated senses
			app.senses = app.senses - 1;
			if (app.updated_nodes != null) {
				app.update_senses = app.update_senses - 1;
			}

			// update simulation
			app.simulation.nodes(app.nodes);
			app.simulation.force("link").links(app.links);

			app.simulation.alpha(1).restart();

			// recalculate the cluster information
			await app.get_clusters();
		},
		/*
		Delete a node from the data
		*/
		deletenode: function(node_id) {
			for (var i=0; i < app.nodes.length; i++) {
				if (app.nodes[i]["id"] === node_id) {
					app.nodes.splice(i,1)
				}
			}
		},
		/*
		Delete all the links connected to a specific node from the data
		*/
		deletelinks: function(node_id) {
			var allLinks = d3.select(".link").selectAll("line");

			allLinks.each(function(d) {
				if (this.getAttribute("target") === node_id || this.getAttribute("source") === node_id) {
					for (var i = 0; i < app.links.length; i++) {
						if (app.links[i].target.id === node_id || app.links[i].source.id === node_id) {
							app.links.splice(i, 1);
						}
					}
				}
			});
		},
		/*
		Check if a specific link is connected to a cluster node
		*/
		check_cluster_node_connection: function(link_endpoint){
			var is_connected = false;
			var nodes = d3.selectAll(".node").selectAll("g");
			nodes.each(function() {
				var children = this.childNodes;
				children.forEach(function(d) {
					is_cluster_node = d.getAttribute("cluster_node");
				})
				if (is_cluster_node === "true") {
					is_connected = true;
				}
			})
			return is_connected;
		},
		/*
		Apply the changes the user made to the general settings
		*/
		update_general_settings: function() {
			var svg = d3.select("svg");

			// set svg size
			svg.attr("viewBox", "0 0 " + app.svg_height + " " + app.svg_width);
			
			// set view port
			//svg.attr("width", app.viewport_width);
			//svg.attr("height", app.viewport_height);

			// set link thickness
			var links = d3.selectAll(".link");
			links.each(function(d) {
				var children = this.childNodes;
				children.forEach(function(p) {
					var weight = p.getAttribute("weight");
					var thickness;
					if (app.link_thickness_scaled === "true") {
						thickness = Math.sqrt(weight / app.link_thickness_factor);
					} else {
						thickness = Math.sqrt(app.link_thickness_value);
					}
					p.setAttribute("stroke-width", thickness);
				});
			});
			app.simulation.alpha(0).restart();
		},
		/*
		Get the name of a cluster via its id
		*/
		getClusterNameFromID: function(id) {
			var cluster_name;

			for (var i=0; i < app.clusters.length; i++) {
				if (id === app.clusters[i].cluster_id) {
					cluster_name = app.clusters[i].cluster_name;
				}
			}

			return cluster_name;
		},
		/*
		Get the id of the cluster that a specific node belongs to
		*/
		findClusterId: function(node_id) {
			var cluster_id;

			for (var i = 0; i < app.clusters.length; i++) {
				var labels = [];
				var cluster = app.clusters[i];

				for(var j = 0; j < cluster.labels.length; j++) {
					labels.push(cluster.labels[j].text);
				}

				if (labels.includes(node_id)) {
					cluster_id = cluster.cluster_id;
				}
			}
			return cluster_id;
		},
		/*
		Get the clusters to which a node is connected and the amount of nodes per cluster
		Returns an object with the {cluster_id : amount of nodes} and a string containing the cluster names and the number of nodes
		*/
		findNeighbourhoodClusters: function(node) {
			neighbourhoodClusters = {};
			var links = d3.selectAll(".link");

			links.each(function(d) {
				var children = this.childNodes;
				var neighbour_cluster;

				children.forEach(function(p) {
					var source = p.getAttribute("source");
					var target = p.getAttribute("target");
					if (source === node) {
						neighbour_cluster = app.findClusterId(target);
						if (neighbour_cluster !== undefined) {
							// if the cluster has been encountered before ...
							if (neighbourhoodClusters.hasOwnProperty(neighbour_cluster.toString())) {
								neighbourhoodClusters[neighbour_cluster] += 1;
							} else {
								neighbourhoodClusters[neighbour_cluster] = 1;
							}
						}
					}
					if (target === node) {
						neighbour_cluster = app.findClusterId(source);
						if (neighbour_cluster !== undefined) {
							if (neighbourhoodClusters.hasOwnProperty(neighbour_cluster.toString())) {
								neighbourhoodClusters[neighbour_cluster] += 1;
							} else {
								neighbourhoodClusters[neighbour_cluster] = 1;
							}
						}
						
					}
				});
				
			});

			var neighbourhoodClusters_str = []
			// Get the cluster name to each cluster id in the neighbourhood
			Object.keys(neighbourhoodClusters).forEach(function(d) {
				var name = app.getClusterNameFromID(d); 
				// build a list with the cluster names and number of nodes for display in the frontend
				neighbourhoodClusters_str.push(name + "(" + neighbourhoodClusters[d] + ")");
			})
			return [neighbourhoodClusters, neighbourhoodClusters_str.join(", ")];
		},
		/*
		Check if the neighbourhood of a node is balanced 
		*/
		is_balanced: function(clusterDistr) {
			var balanced = false;
			var b = "no";

			// only worth checking if there are at least two neighbourhood clusters
			if (Object.keys(clusterDistr).length > 1) {
				var max = 0;
				var mean = 0;

				clusterDistrValues = Object.values(clusterDistr);

				clusterDistrValues.forEach(function(d) {
					mean += d;
				});

				// the mean number of connections per cluster
				mean = mean / clusterDistrValues.length;

				// the max number of connections to a cluster
				max = Math.max(...clusterDistrValues);

				// get rid of the cluster with the maximum connections
				clusterDistrWithoutMax = clusterDistr;
				for (cluster in clusterDistrWithoutMax) {
					if (clusterDistrWithoutMax[cluster] === max) {
						delete clusterDistrWithoutMax[cluster];
						break;
					}
				}

				// check if the heuristic holds
				Object.values(clusterDistrWithoutMax).forEach(function(d) {
					// heuristic
					if (max - d < mean / 2) {
						balanced = true;
						b = "yes";
					}
				});
			}
			return [balanced, b];
		},
		/*
		For a specific node return an array containg an object for each neighbouring cluster with the cluster id and the neighbouring nodes per cluster
		*/
		findNeighboursAndClusters: function(node) {
			var neighbours = [];
			var links = d3.selectAll(".link");

			links.each(function(d) {
				var children = this.childNodes;

				children.forEach(function(p) {
					var source = p.getAttribute("source");
					var target = p.getAttribute("target");

					if (source === node) {
						var target_cluster_id = app.findClusterId(target);
						if (target_cluster_id !== undefined) {
							var exists=false;
							for (var i = 0; i < neighbours.length; i++) {
								// if there the cluster exists in neighbours already, just push the target to the array of neighbours
								if (neighbours[i]["cluster_id"] === target_cluster_id) {
									neighbours[i]["neighbours"].push(target);
									exists = true;
								}
							}
							if (exists === false) {
								neighbours.push({"cluster_id": target_cluster_id, "neighbours": [target]});
							}
						}
						
					} else if (target === node) {
						var source_cluster_id = app.findClusterId(source);
						if (source_cluster_id !== undefined) {
							var exists=false;
							for (var i = 0; i < neighbours.length; i++) {
								if (neighbours[i]["cluster_id"] === source_cluster_id) {
									neighbours[i]["neighbours"].push(source);
									exists = true;
								}
							}
							if (exists === false) {
								neighbours.push({"cluster_id": source_cluster_id, "neighbours": [source]});
							}
						}
					}
				});
			});
			return neighbours
		},
		/*
		For each node, check if their neighbourhood is balanced and find neighbouring nodes
		*/
		findWobblyCandidates: function() {
			app.wobblyCandidates = [];

			if (app.hightlighInbetweennessCentrality === true) {
				app.resetCentralityHighlighting();
				app.hightlighInbetweennessCentrality = false;
			}

			var nodes = d3.selectAll(".node").selectAll("g");
			var texts = d3.selectAll(".node").selectAll("g").select("text");

			nodes.each(function(d, i) {
				var children = this.childNodes;
				var text = d3.select(texts.nodes()[i]);
				var cluster_id;
				var node_text;
				var candidate = {};
				var is_cluster_node;

				children.forEach(function(p) {
					if (p.tagName === "text") {
						node_text = p.getAttribute("text");
					}
					if (p.tagName === "circle") {
						cluster_id = p.getAttribute("cluster_id");
						is_cluster_node = p.getAttribute("cluster_node");
					}
				});

				if (is_cluster_node === "false") {
					var result = app.findNeighbourhoodClusters(node_text)
					var neighbourClusterDistr = result[0];
					var neighbourClusterDistr_string = result[1];

					b = app.is_balanced(neighbourClusterDistr)[1];
					
					candidate["text"] = node_text;
					candidate["connected_clusters"] = neighbourClusterDistr_string;
					candidate["balanced"] = b;
					candidate["neighbours"] = app.findNeighboursAndClusters(node_text);

					app.wobblyCandidates.push(candidate);
				}
			});
		},
		/*
		Highlight the nodes with a balanced neighbourhood in the graph
		*/
		highlightWobblyCandidates: function() {
			if (app.hightlighInbetweennessCentrality === true) {
				app.resetCentralityHighlighting();
				app.hightlighInbetweennessCentrality = false;
			}
			app.highlightWobblies = true;
			var nodes = d3.selectAll(".node").selectAll("g");
			var texts = d3.selectAll(".node").selectAll("g").select("text");

			nodes.each(function(d, i) {
				var children = this.childNodes;
				var text = d3.select(texts.nodes()[i]);
				var cluster_id;
				var node_text;
				var candidate = {}
				var is_cluster_node;

				children.forEach(function(p) {
					if (p.tagName === "text") {
						node_text = p.getAttribute("text");
					}
					if (p.tagName === "circle") {
						cluster_id = p.getAttribute("cluster_id");
						is_cluster_node = p.getAttribute("cluster_node");
					}
				});

				if (is_cluster_node === "false") {
					var neighbourClusterDistr = app.findNeighbourhoodClusters(node_text)[0];
					balanced = app.is_balanced(neighbourClusterDistr)[0];

					// if a node has a balanced neighbourhood, make it large
					if (balanced === true) {
						children.forEach(function(p) {
							if (p.tagName === "circle") {
								p.setAttribute("r", 20);
								text.style("font-size", "20px");
							}
						})
					}

					// if node is connected to more than one cluster, make it medium-sized
					else if (Object.keys(neighbourClusterDistr).length > 1) {
						children.forEach(function(p) {
							if (p.tagName === "circle") {
								p.setAttribute("r", 10);
								text.style("font-size", "14px")
							}
						})
					}
				}
			});
				
		},
		/*
		Calculate how many nodes have a certain centrality score, so that the user has some reference when changing the thresholds
		*/
		calculateCentralityDistribution: function() {
			app.centrality_score_distribution = [];
			app.getCentralityScores();

			var group0 = 0;
			var group1 = 0;
			var group2 = 0;
			var group3 = 0;
			var group4 = 0;

			app.centrality_scores.forEach(function(d) {
				if (d.centrality_score === 0.0) {
					group0 += 1;
				} else if (d.centrality_score > 0.0 && d.centrality_score <= 0.1) {
					group1 += 1;
				} else if (d.centrality_score > 0.1 && d.centrality_score <= 0.2) {
					group2 += 1;
				} else if (d.centrality_score > 0.2 && d.centrality_score <= 0.3) {
					group3 +=1;
				} else {
					group4 += 1;
				}
			});

			app.centrality_score_distribution.push(
				{"centrality_score": "0.0", "number_of_nodes": group0},
				{"centrality_score": "0.0 - 0.1", "number": group1},
				{"centrality_score": "0.1 - 0.2", "number": group2},
				{"centrality_score": "0.2 - 0.3", "number": group3},
				{"centrality_score": "over 0.3", "number": group4}
			);
		},
		/*
		For each node, get the centrality score
		Returns an array of objects {node: centrality_score}
		*/
		getCentralityScores: function() {
			app.centrality_scores = [];

			var circles = d3.selectAll(".node").selectAll("g").select("circle");
			var texts = d3.selectAll(".node").selectAll("g").select("text");

			texts.each(function(d, i) {
				var node = {};
				node["text"] = this.getAttribute("text");

				var circle = d3.select(circles.nodes()[i]);
				var cen_score = circle.attr("centrality_score");

				if (cen_score != null) {
					node["centrality_score"] = parseFloat(cen_score);
					app.centrality_scores.push(node);
				}
			});
		},
		/*
		Reset all the nodes make to their original size
		*/
		resetCentralityHighlighting: function() {
			var circles = d3.selectAll(".node").selectAll("g").select("circle");
			var texts = d3.selectAll(".node").selectAll("g").select("text");

			circles.each(function(d, i) {
				if (this.getAttribute("centrality_score") != null) {
					this.setAttribute("r", 5)
					var text = d3.select(texts.nodes()[i])
					text.style("font-size", "10px");
				}
			})
		},
		/*
		Highlight betweenness centrality in graph
		*/
		highlightCentralNodes: function(threshold_s, threshold_m) {
			if (app.highlightWobblies === true) {
				app.resetCentralityHighlighting();
				app.highlightWobblies = false;
			}
			app.hightlighInbetweennessCentrality = true;
			threshold_s = parseFloat(threshold_s);
			threshold_m = parseFloat(threshold_m);

			var nodes = d3.selectAll(".node").selectAll("g");
			var texts = d3.selectAll(".node").selectAll("g").select("text");

			nodes.each(function(d, i) {
				var children = this.childNodes;
				var text = d3.select(texts.nodes()[i]);

				children.forEach(function(d,i) {
					if(d.tagName == "circle") {
						if (d.getAttribute("centrality_score") != null) {
							var centrality_score = parseFloat(d.getAttribute("centrality_score"));
							// three different sizes depending on centrality score
							if (centrality_score <= threshold_s) {
								d.setAttribute("r", 2.5);
								text.style("font-size", "8px");
							} else if (centrality_score > threshold_s && centrality_score <= threshold_m) {
								d.setAttribute("r", 10.0);
								text.style("font-size", "14px");
							} else {
								d.setAttribute("r", 20.0);
								text.style("font-size", "20px");
							}
						}
					}
				});
			});
		},
		/*
		Reset the highlighting of the node search
		*/
		unsearch_nodes: function() {
			// undo highlighting
			var nodes = d3.selectAll(".node").selectAll("g");
			var links = d3.selectAll(".link");

			nodes.each(function(d) {
				var children = this.childNodes;
				this.setAttribute("stroke", null);

				children.forEach(function(d) {
					if (d.tagName === "text") {
						d.style.fill = "black";
						d.style.fontSize = "10px";
						d.style.opacity = 1;
					}
					if (d.tagName === "circle") {
						r = d.getAttribute("r");
						d.style.opacity = 1;
						if (r > 5) {
							new_r = r / 2;
							d.setAttribute("r", new_r);
						}
					}
				});
			});

			links.each(function(d) {
				var children = this.childNodes;
				children.forEach(function(p) {
					p.style.strokeOpacity = this.base_link_opacity;
				})
			})
		},
		/*
		Search a node in the graph using prefix matching
		*/
		search_node: function() {
			found_matching_string = false;

			// alert if no search term was entered
			if (app.searchterm === "") {
				alert("Please enter a search term.");
			} else {
				var nodes = d3.selectAll(".node").selectAll("g");

				nodes.each(function(d) {
					var children = this.childNodes;
					var text = "";

					children.forEach(function(d) {
						if (d.tagName === "text") {
							text = d.getAttribute("text");
						}
					});

					// prefix matching, see if there is a node that matches the search term
					if (text.lastIndexOf(app.searchterm, 0) === 0) {
						found_matching_string = true;

					}
				})

				// if a node was found, do the highlighting
				if (found_matching_string === true) {
					nodes.each(function(d) {
						var children = this.childNodes;
						var text = "";

						children.forEach(function(d) {
							if (d.tagName === "text") {
								text = d.getAttribute("text");
							}
						});

						// prefix matching
						if (text.lastIndexOf(app.searchterm, 0) === 0) {
							this.setAttribute("stroke", "yellow");
							// highlight matching node
							children.forEach(function(d) {
								if (d.tagName === "text") {
									d.style.fontSize = "16px";
								}
								if (d.tagName === "circle") {
									r = d.getAttribute("r");
									new_r = r * 2;
									d.setAttribute("r", new_r);
								}
							});
						
						} else {
							// reduce opacity of the other nodes
							// TODO: reduce opacity of links -> coloured links are a bit to strong
							children.forEach(function(d) {
								if (d.tagName === "text") {
									d.style.opacity = 0.4;
								}
								if (d.tagName === "circle") {
									d.style.opacity = 0.4;
								}
							});
						}

						var links = d3.selectAll(".link");
						links.each(function(d) {
							var children = this.childNodes;
							children.forEach(function(p) {
								p.style.strokeOpacity = this.reduced_link_opacity;
							})
						})
					});
					// if no matching node was found, show alert
				} else if (found_matching_string === false) {
					alert("No match found. Please try a different search term.");
				}
				app.searchterm = "";
			}	
		},
		// Not quite there yet. Save cluster_selected for every cluster
		// Otherwise weird behaviour when selecting different cluster
		select_cluster: function(cluster) {
			if (app.cluster_selected === false) {
				app.cluster_selected = true;
				var cluster_id = cluster.cluster_id;
				var cluster_nodes = [];
				for (var i = 0; i < cluster.labels.length; i++) {
					cluster_nodes.push(cluster.labels[i].text);
				}

				var links = d3.selectAll(".link").selectAll("line");

				links.each(function(d) {
					var source = this.getAttribute("source");
					var target = this.getAttribute("target");
					if (cluster_nodes.includes(source) && cluster_nodes.includes(target)) {
							this.setAttribute("stroke", cluster.colour);
					}	
				});
				if (app.sticky_mode === "false") {
					var nodes = d3.selectAll(".node").selectAll("g");
					nodes.classed("selected", function(d, i) {
						if (cluster_nodes.includes(d.id)) {
							return true;	
						} else {
							return false;
						}
					});
				}

			} else {
				app.cluster_selected = false;
				var cluster_id = cluster.cluster_id;
				var cluster_nodes = [];
				for (var i = 0; i < cluster.labels.length; i++) {
					cluster_nodes.push(cluster.labels[i].text);
				}

				var links = d3.selectAll(".link").selectAll("line");

				links.each(function(d) {
					var source = this.getAttribute("source");
					var target = this.getAttribute("target");
					if (cluster_nodes.includes(source) && cluster_nodes.includes(target)) {
						this.setAttribute("stroke", "#999");
					}
				});
			}
			
		},
		/*
		Generate a new, random cluster id, that differs from the existing ones
		*/
		generate_cluster_id: function() {
			var number_of_nodes = d3.selectAll(".node").selectAll("g").size()

			var existing_cluster_ids = [];
			for (var i = 0; i < app.clusters.length; i++) {
				var cluster = app.clusters[i];
				existing_cluster_ids.push(parseInt(cluster.cluster_id));
			}
			
			var random_number = Math.floor(Math.random() * Math.floor(number_of_nodes + 10));

			while (existing_cluster_ids.includes(random_number)) {
				random_number = Math.floor(Math.random() * Math.floor(number_of_nodes + 10));	
			}

			return random_number;
		},
		/*
		Create a new cluster from scratch when using the node options to change the cluster of a node
		*/
		createNewCluster: function(event) {
			var selected_nodes = d3.selectAll(".node").selectAll("g");
			var generated_cluster_id = app.generate_cluster_id().toString();

			selected_nodes.each(function(d,i) {
				text = "";
				var childnodes = this.childNodes;

				childnodes.forEach(function(d,i) {
					if (d.tagName === "text") {
						text = d.getAttribute("text");
					}
				})

				for (var j=0; j < app.clicked_nodes.length; j++) {
					// if the node is one of the selected nodes, assign the new attributes
					if (app.clicked_nodes[j].id === text) {
						childnodes.forEach(function(d,k) {
							if (d.tagName === "circle") {
								d.setAttribute("cluster_id", generated_cluster_id);
								d.setAttribute("cluster", app.created_cluster_name);
								d.setAttribute("fill", app.created_cluster_colour);
							}
						});
					}
				}
			});

			// update the information about the clusters in the graph in the data variable clusters.
			app.get_clusters();

			app.created_cluster_colour = "";
			app.created_cluster_name = "";

			// colour the links accordingly
			var links = d3.selectAll(".link");
			links.each(function(d) {
				var children = this.childNodes;
				children.forEach(function(p) {
					var source = p.getAttribute("source");
					var target = p.getAttribute("target");
					var source_colour = app.findColour(source);
					var target_colour = app.findColour(target);
					if (source_colour === target_colour) {
						p.setAttribute("stroke", source_colour);
					} else {
						p.setAttribute("stroke", "#999");
					}
				})
			})
		},
		/*
		Check if the selected node is a non cluster node. Only those should be considered for changing their cluster assignment
		*/
		is_normal_node: function() {
			var normal_node;
			var selected_node = d3.selectAll(".selected").select("circle");

			selected_node.each(function(d) {
				var n = d3.select(this);
				if (n.attr("cluster_node") === "true") {
					normal_node = false;
				} else {
					normal_node = true;
				}
			});

			return normal_node;
		},
		/*
		Find the colour of a given node_id
		*/
		findColour: function(node_id) {
			var nodes = d3.selectAll(".node").selectAll("g")
			var colour;
			
			nodes.each(function(d) {
				var node_name;
				var children = this.childNodes;
				children.forEach(function(p) {
					if (p.tagName === "text") {
						node_name = p.getAttribute("text");
					}
				})

				if (node_name === node_id) {
					children.forEach(function(p) {
						if (p.tagName === "circle") {
							colour = p.getAttribute("fill");
						}
					})
				}
			})
			return colour;
		},
		/*
		Assigns the newly selected cluster id, cluster name and cluster colour to the selected node node.
		*/
		assignNewCluster: function() {
			var selected_nodes = d3.selectAll(".node").selectAll("g");

			selected_nodes.each(function(d,i) {
				text = "";
				var childnodes = this.childNodes;

				childnodes.forEach(function(d,i) {
					if (d.tagName === "text") {
						text = d.getAttribute("text");
					}
				})

				for (var j=0; j < app.clicked_nodes.length; j++) {
					// if the node is one of the selected nodes, assign the new attributes
					if (app.clicked_nodes[j].id === text) {
						childnodes.forEach(function(d,k) {
							if (d.tagName === "circle") {
								d.setAttribute("cluster_id", app.new_assigned_cluster.cluster_id);
								d.setAttribute("cluster", app.new_assigned_cluster.cluster_name);
								d.setAttribute("fill", app.new_assigned_cluster.colour);
							}
						});
					}
				}
			});
			// update the information about the clusters in the graph in the data variable clusters.
			app.get_clusters();

			var links = d3.selectAll(".link")
			links.each(function(d) {
				var children = this.childNodes;
				children.forEach(function(p) {
					var source = p.getAttribute("source");
					var target = p.getAttribute("target");
					var source_colour = app.findColour(source);
					var target_colour = app.findColour(target);
					if (source_colour === target_colour) {
						p.setAttribute("style", "stroke:" + source_colour);
					} else {
						p.setAttribute("style", "stroke: #999");
					}
				})
			})
		},
		/*
		Return a list of all selected nodes as a list of objects
		An object depicts one selected node with slots for its colour, its cluster id, its cluster name and its id.
		The list is stored in the data variable clicked_nodes.
		*/
		findSelectedNodes: function() {
			list = [];
			var selected_nodes = d3.select(".selected");

			selected_nodes.each(function(d,i) {
				node_characteristics = {};
				var childnodes = this.childNodes;

				childnodes.forEach(function(d) {
					if (d.tagName === "circle") {
						// cluster nodes should not be considered
						if (d.getAttribute("cluster_node") === "false") {
							node_characteristics["colour"] = d.getAttribute("fill");
							app.created_cluster_colour = node_characteristics["colour"];
							node_characteristics["cluster_id"] = d.getAttribute("cluster_id");
							node_characteristics["cluster_name"] = d.getAttribute("cluster");
						}	
					}

					if (d.tagName === "text") {
						node_characteristics["id"] = d.getAttribute("text");
					}
				});
				list.push(node_characteristics);
			});
			app.clicked_nodes = list;
		},
		/*
		Set the opacity of all the nodes and edges that are not in the inspected time slice to 0.2.
		*/
		skip_through_time_slices: function() {
			var nodes = d3.selectAll(".node").selectAll("g");

			nodes.each(function(d,i) {
				

				// Set opacity to one in the beginning - important when changing time slice.
				this.style.strokeOpacity = 1.0;
				this.style.fillOpacity = 1.0;

				var childnodes = this.childNodes;
				// assume that every node is not in the interval
				var in_interval = false;

				childnodes.forEach(function(d,i) {
					if (d.tagName === "circle") {
						// for all nodes that have time ids, retrieve them - cluster nodes do not have any.
						if (d.getAttribute("cluster_node") === "false") {

							var time_ids = d.getAttribute("time_ids");
							if (time_ids !== null) {
								time_ids = time_ids.split(",");

								// check if the time ids of the node include the id of the interval
								time_ids.forEach(function(d, i) {
									if (d === app.interval_id) {
										// if so, the node occurs in the selected time slice
										in_interval = true;
									}
								});
							}
						}
					}
				});

				// Set the opacity to 0.2 for all nodes that do not occur in the focused time slice
				if (in_interval === false) {
					this.style.strokeOpacity = 0.2;
					this.style.fillOpacity = 0.2;
				}	
			});

			var links = d3.selectAll(".link").selectAll("line");

			links.each(function(d,i) {
				// Set the opacity of all links to base_link_opacity initially
				this.style.strokeOpacity = this.base_link_opacity;

				// select the time ids of the source and the target
				var source_time_ids = d.source.time_ids;
				var target_time_ids = d.target.time_ids;

				if (typeof source_time_ids === "string" && typeof target_time_ids === "string") {
					source_time_ids = source_time_ids.split(",");
					target_time_ids = target_time_ids.split(",");

					source_time_ids = source_time_ids.map(x => parseInt(x));
					target_time_ids = target_time_ids.map(x => parseInt(x));

				}

				var in_source_interval = false;
				var in_target_interval = false;

				interval = parseInt(app.interval_id);

				// check if source time ids of a link include the time slice id of the selected interval
				if (source_time_ids.includes(interval)) {
					in_source_interval = true;
				}

				// check if the target time ids of a link include the time slice if of the selected interval
				if (!(target_time_ids === null || typeof target_time_ids === "undefined") && target_time_ids.includes(interval)) {
					in_target_interval = true;
				}
				
				// the link only has opacity 1.0 if both source and target are in the selected time slice
				if (in_source_interval === false || in_target_interval === false) {
					this.style.strokeOpacity = this.reduced_link_opacity;
				}
			});
		},
		/*
		Returns all the time ids of a node as a string of start year and end year to be displayed in the tooltip on a node in the time diff mode
		*/
		toolTipLink: function(time_ids, weights, targetA, targetB ){
			let stringRet = "Edge: " + targetA + " - " + targetB +"<br>" + "<br>"
			stringRet += "Max. similarity:" + "<br>"
			stringRet += this.selectInterval(time_ids, weights) + "<br>"
			stringRet += "For context-information - click me!"
			return stringRet;
		},

		toolTipNode: function(time_ids, target_text, weights){
			let stringRet = "Node: " + target_text +"<br>"+"<br>"
			stringRet += "Highest similarities with " + app.target_word + ":" + "<br>"
			stringRet += this.selectInterval(time_ids, weights) + "<br>"
			return stringRet;
		},

		time_diff_true(){
			this.time_diff = true
			console.log("time diff true")

		},

		time_diff_true_and_reset(){
			this.time_diff = true
			console.log("time diff true")
			this.reset_time_diff_colours()
		},

		selectIntervalWithActive: function(){
			console.log("in selectIntervalwitactive" + this.active_edge.time_ids)
			return this.selectInterval(this.active_edge.time_ids, this.active_edge.weights).slice(0,-4)
		},

		selectInterval: function(time_ids, weights) {
			let intervalString = "";
			if ((time_ids !== null) && (typeof time_ids !== "undefined")) {
				if (typeof time_ids === "string") {
					time_ids = time_ids.split(",");
				}
			}
			if ((weights !== null) && (typeof weights !== "undefined")) {
				if (typeof weights === "string") {
						weights = weights.split(",");
				}
			}
			for (index = 0; index < time_ids.length; index++) {
					let start = app.start_years[time_ids[index] - 1].text;
					let end = app.end_years[time_ids[index] - 1].text ;
					intervalString += start + " - " + end + " [" + weights[index] +"]"+"<br>";
				}
			return intervalString;
			
		},
		/*
		Color nodes depending on whether they started to occur in the selected small time interval, stopped to occur in said interval, or both.
		Basically comparing the graph time interval and the small time interval selected by the user.
		# INTERVAL COUNTING ALWAYS START FIRST ID IN DATABASE WITH 1
		*/
		show_time_diff: async function() {
			
			let big_time_interval = [];
			await axios.get("./api/collections/"+ this.collection_key + "/interval/" + app.start_year + "/" + app.end_year)
				.then((res) => {
					big_time_interval = res.data;
				})
				.catch((error) => {
					console.error(error);
				});

			let small_time_interval = [];
			await axios.get("./api/collections/"+ this.collection_key + "/interval/" + app.interval_start + "/" + app.interval_end)
				.then((res) => {
					small_time_interval = res.data;
				})
				.catch((error) => {
					console.error(error);
				});

			let period_before = [];
			let period_after = [];

			let small_interval_start_time_id = Math.min(...small_time_interval);
			let small_interval_end_time_id = Math.max(...small_time_interval);
			console.log("nall intervall start time id", small_interval_start_time_id)
			console.log("small end time", small_interval_end_time_id)
			console.log("big time intervall", big_time_interval)
			

			for (var i=0; i<big_time_interval.length; i++) {
				if (big_time_interval[i] < small_interval_start_time_id) {
					period_before.push(big_time_interval[i]);
				} else if (big_time_interval[i] > small_interval_end_time_id) {
					period_after.push(big_time_interval[i]);
				}
				console.log("big", big_time_interval)
				console.log("before", period_before)
				console.log("after", period_after)
			}

			let time_diff_nodes = {born_in_interval: [], deceases_in_interval: [], exists_only_in_interval: [], 
				exists_only_before: [], exists_throughout: [], exists_only_after:[], exists_before_and_after:[]};
			
			let nodes = d3.selectAll(".node").selectAll("g");

			nodes.each(function(d) {
				var childnodes = this.childNodes;
				var node_text;

				childnodes.forEach(function(d) {
					if (d.tagName === "text") {
						node_text = d.getAttribute("text")
					}
				})

				childnodes.forEach(function(d){
					if (d.tagName === "circle") {
						if (d.getAttribute("cluster_node") === "false") {

							var time_ids = d.getAttribute("time_ids")

							if ((time_ids !== null) && (typeof time_ids !== "undefined")) {
								time_ids = time_ids.split(",");
								time_ids = time_ids.map(x => parseInt(x));
								console.log("in time ids", time_ids, node_text)
								node_text = node_text //+ " [" + time_ids.sort() + "]"
								var in_interval = false;
								var before_interval = false;
								var after_interval = false;
								
								
								for (var i = 0; i < time_ids.length; i++) {
									var t = time_ids[i];
									
									if (period_before.includes(t)) {
										before_interval = true
									}
									if (small_time_interval.includes(t)) {
										in_interval = true;
									}
									if(period_after.includes(t)) {
										after_interval = true;
									}
									


								}

								if (!before_interval && in_interval && !after_interval) {
									d.setAttribute("fill", "yellow");
									time_diff_nodes.exists_only_in_interval.push(node_text);
								} else if (!before_interval && in_interval && after_interval) {
									d.setAttribute("fill", "#28a745");
									time_diff_nodes.born_in_interval.push(node_text);
								} else if (before_interval && in_interval && !after_interval) {
									d.setAttribute("fill", "#dc3545");
									time_diff_nodes.deceases_in_interval.push(node_text);
								} else if (before_interval && in_interval && after_interval) {
									d.setAttribute("fill", "#343a41");
									time_diff_nodes.exists_throughout.push(node_text);
									console.log("pushed throughout")
								} else if (before_interval && !in_interval && !after_interval ){
									d.setAttribute("fill", "#dc3546");
									time_diff_nodes.exists_only_before.push(node_text);
								} else if (!before_interval && !in_interval && after_interval ){
									d.setAttribute("fill", "#28a746");
									time_diff_nodes.exists_only_after.push(node_text);
								} else if (before_interval && !in_interval && after_interval ){
									d.setAttribute("fill", "#343a40");
									time_diff_nodes.exists_before_and_after.push(node_text);
								}

							}
						
						}
						// would be good to see exactly the time slices of the respective nodes
					}
				});
			});

			app.time_diff_nodes = time_diff_nodes;
			console.log(time_diff_nodes)
		},
		/*
		Fetch the updated amount of nodes and edges as well as the singletons from the BE.
		*/
		update: function() {
			console.log("called update")
			var target_word = this.target_word;
			var start_year = this.start_year;
			var end_year = this.end_year;
			var senses = this.update_senses;
			var edges = this.update_edges;
			var time_diff = this.time_diff;

			app.time_diff = false;
			var url = './api/collections/'+ this.collection_key + '/sense_graph' + '/' + target_word + '/' + start_year + '/' + end_year + '/' + senses + '/' + edges;
			
			return axios.get(url)
				.then((res) => {
					this.data_from_db = res.data;
					app.updated_nodes = this.data_from_db[0].nodes;

					app.updated_links = this.data_from_db[0].links;

					app.singletons = this.data_from_db[2].singletons;
				})
				.catch((error) => {
					console.error(error);
			});
		},
		/*
		Reset the opacity of all nodes and edges to their original values (nodes: 1.0, edges: 0.6).
		*/
		reset_opacity: function() {
			var nodes = d3.selectAll(".node").selectAll("g");
			var links = d3.selectAll(".link");

			nodes.each(function(d) {
				this.style.strokeOpacity = 1.0;
				this.style.fillOpacity = 1.0;
			});

			links.each(function(d) {
				var childnodes = this.childNodes;
				childnodes.forEach(function(d) {
					d.setAttribute("style", "stroke: #999;");
					d.setAttribute("style", "stroke-opacity:" + this.base_link_opacity);

				});
			});
		},
		/*
		Fade in the nodes of a certain colour and the connecting links.
		The purpose of this function is to fade in only the red, yellow, green and grey nodes in the time diff mode.
		@param String CSS colour such as 'red'
		*/
		fade_in_nodes: function(colour) {
			var nodes = d3.selectAll(".node").selectAll("g");
			var links = d3.selectAll(".link");
			
			// collect all the nodes with opacity 1.0, so you can check them against the source and target of links
			var faded_in = [];

			nodes.each(function(d,i) {
				var childnodes = this.childNodes;
				var node_colour;

				childnodes.forEach(function(d) {	
					if (d.tagName === "circle") {
						node_colour = d.getAttribute("fill");
					}
				});

				if (colour !== node_colour) {
					this.style.strokeOpacity = 0.2;
					this.style.fillOpacity = 0.2;
				} else {
					childnodes.forEach(function(d) {	
						if (d.tagName === "text") {
							faded_in.push(d.getAttribute("text"));
						}
					});
				}
			});


			links.each(function(d) {
				var linknodes = this.childNodes;

				linknodes.forEach(function(d) {
					var source = d.getAttribute("source");
					var target = d.getAttribute("target");

					if (faded_in.includes(source) && faded_in.includes(target)) {
						// if the link is faded in, set the colour to the same as all the nodes
						d.setAttribute("style", "stroke:" + colour);
					} else {
						d.setAttribute("style", "stroke-opacity:" + this.reduced_link_opacity);
					}
				})
			})

		},
		
		/*
		Set the opacity of nodes and links of a specific cluster.
		@param Object cluster: the entry for a specific cluster in the data variable clusters.
		@param float opacity: some number between 0.0 and 1.0.
		@param float link_opacity: some number between 0.0 and 1.0.
		*/
		set_cluster_opacity: function(cluster, opacity, link_opacity) {
			var cluster_id = cluster.cluster_id;
			var cluster_nodes = [];

			for (var i = 0; i < cluster.labels.length; i++) {
				cluster_nodes.push(cluster.labels[i].text);
			}

			var svg = d3.select("#svg");
			var nodes = svg.selectAll(".node");
			var links = svg.selectAll(".link");

			nodes.selectAll("g").each(function(d,i) {
				var childnodes = this.childNodes;
				var node_text;
				var node_cluster_id;
				childnodes.forEach(function(d,i) {
					if (d.tagName === "circle") {
						node_cluster_id = d.getAttribute("cluster_id");
					}
					if (d.tagName === "text") {
						node_text = d.getAttribute("text");
					}
				});
				if (! cluster_nodes.includes(node_text)) {
					this.style.strokeOpacity = opacity;
					this.style.fillOpacity = opacity;
				}
			})

			links.each(function(d,i) {
				var childnodes = this.childNodes;
				childnodes.forEach(function(d,i) {
					var source = d.getAttribute("source");
					var target = d.getAttribute("target");
					if (!cluster_nodes.includes(source) || !cluster_nodes.includes(target)) {
						//d.setAttribute("style", "stroke-opacity:" + link_opacity);
						d.style.strokeOpacity = link_opacity;
					} 
					//if (cluster_nodes.includes(source) && cluster_nodes.includes(target)) {
						//if (opacity < 1) {
						//	d.setAttribute("style", "stroke:" + cluster.colour);
						//} else {
					//		d.setAttribute("style", "stroke:" + cluster.colour);
						//}
					//}
				}) ;	
			});
		},
		/*
		Send all the nodes and edges to the backend, recluster them and change the nodes in the graph accordingly (cluster id, cluster name, colour)
		*/
		recluster: function() {
			this.overlay_main = true
			if (app.highlightWobblies === true) {
				app.resetCentralityHighlighting();
				app.highlightWobblies = false;
			}
			//document.getElementById("edit_clusters_popup").style.display = "none";			

			var svg = d3.select("#svg");
			var nodes = svg.selectAll(".node");
			var links = svg.selectAll(".link");

			var data = {};

			// accumulate all the graph nodes
			var nodes_array = [];
			nodes.selectAll("g").each(function(d,i) {
				childnodes = this.childNodes;

				var is_cluster_node;
				childnodes.forEach(function(d,i) {
					if (d.tagName === "circle") {
						is_cluster_node = d.getAttribute("cluster_node");
					}
				});

				if (is_cluster_node === "false") {
					childnodes.forEach(function(d,i) {
						if(d.tagName === "text") {
							nodes_array.push(d.getAttribute("text"));
						}
					});
				}	
			})

			// accumulate all the links
			var link_array = [];

			links.each(function(d,i) {
				childnodes = this.childNodes;
				childnodes.forEach(function(d,i) {
					var link = {}
					var source = d.getAttribute("source");
					var target = d.getAttribute("target");

					if (nodes_array.includes(source) && nodes_array.includes(target)) {
						link['source'] = source;
						link['target'] = target;
						link['weight'] = d.getAttribute("weight");

						link_array.push(link);
					}
				});
			});

			// store all the nodes and links in a data object to be sent to the BE
			data["nodes"] = nodes_array;
			data["links"] = link_array;

			axios.post('./api/reclustering', data)
				.then(async function (response) {
					this.newclusters = response.data;

					var colour = d3.scaleOrdinal(d3.schemePaired);

					var newClusteredNodes = this.newclusters.nodes;

					var texts = nodes.selectAll("g").select("text");
					var circles = nodes.selectAll("g").select("circle");

					for (var i=0; i<newClusteredNodes.length; i++) {
						var node_id = newClusteredNodes[i].id;
						var node_new_cluster = newClusteredNodes[i].class;
						//var node_centr_score = newClusteredNodes[i].centrality_score;
						// assign the updated attributes to the nodes
						// Careful, data is not bound to DOM!
						texts.each(function(d,i) {
							var t = d3.select(this);
							if (t.attr("text") === node_id) {
								var circle = d3.select(circles.nodes()[i])
								//circle.attr("centrality_score", node_centr_score)
								circle.attr("cluster", node_new_cluster)
								circle.attr("fill", function() {return colour(node_new_cluster) })
								circle.attr("cluster_id", node_new_cluster);
								circle.attr("cluster_node", false);
							}
						})
					}
					// update the data variable clusters
					await app.get_clusters();

					//var links = d3.selectAll(".link");
					

					links.each(function() {
						var children = this.childNodes;
						children.forEach(function(d,i) {
							var is_in_cluster = false;
							var link = {}
							var source = d.getAttribute("source");
							var target = d.getAttribute("target");
							var weight = d.getAttribute("weight");
							link['source'] = source;
							link['target'] = target;
							link['weight'] = weight;
							if (app.includes(link_array, link)) {
								console.log("includes")
								for (var i=0; i<app.clusters.length; i++) {
									var node_ids = [];
									app.clusters[i].labels.forEach(function(p) {
										node_ids.push(p.text)
									})
									if (node_ids.includes(source) && node_ids.includes(target)) {
										var cluster_colour = app.clusters[i].colour;
										console.log(source, target, d.getAttribute("stroke"), cluster_colour)
										d.setAttribute("stroke", cluster_colour);
										console.log(d.getAttribute("stroke"))
										is_in_cluster = true;
									}
								}
								if (!is_in_cluster) {
									d.setAttribute("stroke", "#999");
								}
							}
							
						}); 
					});
				})
				  .catch(function (error) {
					console.log(error);
				  });
				  console.log("in recluster ende")
				  this.overlay_main = false
		},
		includes: function(array, obj) {
			found = false
			array.forEach((d) => {
				if (d.source === obj.source && d.target === obj.target && d.weight === obj.weight) {
					found = true;
				} 
			});
			return found;
		},
		resetZoom: function() {
			var svg = d3.select("#svg");
			svg.select("g")
				.attr("transform", "translate(0.0, 0.0) scale(1.0)");
		},
		/*
		Choose cluster for context analysis and display context information
		*/
		get_cluster_information: function(cluster){
			
			let links = this.links
			let nodes_graph = this.nodes
			let jsonReq = {"edges": [], "nodes":[], "collection":this.collection_key}
			let nodes_tmp = []
			// get all nodes that are assigned to cluster - irrespective of time-ids
			for (let key in cluster["labels"]){
				let dati = cluster["labels"][key]
				nodes_tmp.push(dati["text"])
			}
			
			// get time-ids for nodes from global
			nodes_tmp.forEach(function(item1, index){ // all texts
				nodes_graph.forEach(function(item2,index){ // all
					if(item1 === item2["target_text"]){
						jsonReq["nodes"].push({label: item2["target_text"], time_id: item2["time_ids"][0]})
					}
				})
			})
			//console.log(jsonReq)
						
			if (jsonReq["nodes"].length > this.cluster_search_limit){
				alert("You clicked on cluster-context information. " 
				+ "Currently, you can only query clusters with 5 or less nodes. "
				+ "Reason: cluster information is extracted from over 1 billion features which takes long for mysql."
								
				);
			} else {
				console.log("cluster info continue with less than six")
				this.busy_right2 = true
				this.context_mode2 = true
				// find edges that are inside the cluster (ie both nodes are cluster nodes)
				for (let key in links){
					let t1 = links[key]["source_text"]
					let t2 = links[key]["target_text"]
					let timeId = links[key]["time_ids"][0]
					let true1 = nodes_tmp.includes(t1) 
					let true2 = nodes_tmp.includes(t2)
					if (true1 && true2){
						jsonReq["edges"].push({"source":t1, "target": t2, "time_id": timeId})
						console.log("includes ", t1 + t2, timeId)
					}
				}
				//console.log(jsonReq)
				let url = './api/cluster_information'
				axios.post(url, jsonReq)
					.then((res)=> {
						console.log(res.data)
						let ret = []
						for (var key in res.data){
							retObj = {}
							retObj.wort = key
							retObj.score = parseFloat(res.data[key]).toFixed(5)
							ret.push(retObj)
						}
						this.cluster_shared_object = ret
						//console.log(this.cluster_shared_object)
						this.busy_right2 = false
				})
				.catch((error) => {
					console.error(error);
				});
			}
		},

		/*
		Get edge information, i.e. the feature-contexts words that are shared by paradigms
		Since we are using similarity - bims (ie contexts) - the function is called simbim
		*/
		getSimBims: async function(){
			this.busy_right1 = true
			let retArray = []
			let data = {}
			data["word1"] = this.active_edge.source_text
			data["word2"] = this.active_edge.target_text
			data["time_id"] = this.active_edge.time_ids[0]
			
			let url = './api/collections/'+this.collection_key +'/simbim'
			console.log(url)
			axios.post(url, data)
				.then((res) => {
					let ret = []
					if (res.data["error"]=="none"){
					for (var key in res.data){
						if (key != "error") {
						var dati = res.data[key]
						retObj = {}
						retObj.node1 = parseFloat(dati["score"]).toFixed(5)
						retObj.edge = dati["key"]
						retObj.node2 = parseFloat(dati["score2"]).toFixed(5)
						ret.push(retObj)
						}
						
					
					}
				}
					
					
					this.simbim_object = ret
					this.busy_right1 = false
				
				})
				.catch((error) => {
					console.error(error);
				});

				
			
		},

		/*
		Get node-target word (invisible edge) information, i.e. the feature-contexts words that are shared by paradigms
		Since we are using similarity - bims (ie contexts) - the function is called simbim
		*/
		getSimBimsNodes: async function(){
			this.busy_right3 = true
			let retArray = []
			let data = {}
			data["word1"] = this.target_word
			data["word2"] = this.active_node.target_text
			data["time_id"] = this.active_node.time_ids[0]
			this.node_time_id = this.active_node.time_ids[0]
			
			
			let url = './api/collections/'+this.collection_key +'/simbim'
			console.log(url)
			axios.post(url, data)
				.then((res) => {
					let ret = []
					if (res.data["error"]=="none"){
					for (var key in res.data){
						if (key != "error") {
						var dati = res.data[key]
						retObj = {}
						retObj.node1 = parseFloat(dati["score"]).toFixed(5)
						retObj.edge = dati["key"]
						retObj.node2 = parseFloat(dati["score2"]).toFixed(5)
						ret.push(retObj)
						}
						
					
					}
				}
					
					
					this.simbim_node_object = ret
					this.busy_right3 = false
				
				})
				.catch((error) => {
					console.error(error);
				});

				
			
		},

		getStartYears: function() {
			axios.get('./api/collections/'+ this.collection_key + '/start_years')
				.then((res) => {
					this.start_years = res.data;
					this.start_year = this.start_years[0]["value"]
				})
				.catch((error) => {
					console.error(error);
				});
		},
		getEndYears: function() {
			axios.get('./api/collections/'+ this.collection_key + '/end_years')
				.then((res) => {
					this.end_years = res.data;
					this.end_year = this.end_years[this.end_years.length-1]["value"]
				})
				.catch((error) => {
					console.error(error);
				});
		},
		/*
		Apply changes in cluster name and colour to all the nodes in the graph (when pressing the "Apply" button in the edit column)
		*/
		applyClusterSettings: function() {
			var svg = d3.select("#svg");
			var nodes = svg.selectAll(".node");
			var links = svg.selectAll(".link");

			for (var i = 0; i < this.clusters.length; i++) {
				var cluster_id = this.clusters[i].cluster_id;
				var cluster_name = this.clusters[i].cluster_name;
				var colour = this.clusters[i].colour;
				var add_cluster_node__ = this.clusters[i].add_cluster_node;
				var labels = this.clusters[i].labels;
				var text_labels = [];

				for (var j = 0; j < labels.length; j++) {
					text_labels.push(labels[j].text);
				}

				nodes.selectAll("g").each(function(d,i) {
					var node_cluster;
					var node_fill;
					var node_label;

					childnodes = this.childNodes;

					childnodes.forEach(function(d,i) {
						if (d.tagName === "circle") {
							node_cluster = d.getAttribute('cluster');
							node_fill = d.getAttribute('fill');
						}
						if (d.tagName === "text") {
							node_label = d.getAttribute('text');
						}
					});

					if (text_labels.includes(node_label)) {
						childnodes.forEach(function(d,i) {
							if (d.tagName === "circle") {
								d.setAttribute('cluster', cluster_name);
								d.setAttribute('fill', colour);
							}
						});
					}
				});

				// TODO: update colour of links
				links.each(function(d) {
					var children = this.childNodes;
					var source;
					var target;
					children.forEach(function(p) {
						source = p.getAttribute("source");
						target = p.getAttribute("target");
						if (text_labels.includes(source) && text_labels.includes(target)) {
							p.setAttribute("stroke", colour);
						}
					});

				});

			}
		},
		showEditMask: function() {
			if (app.time_diff==="false") {
				//update clusters before fading in the column, keep the old clusters in time diff mode though, so that the user can still see the information about clusters
				app.get_clusters();
			}
			if (app.edit_column_open === false) {
				app.edit_column_open = true;
				document.getElementById("edit_clusters_popup").style.display = "block";
			} else if (app.edit_column_open === true) {
				app.edit_column_open = false;
				document.getElementById("edit_clusters_popup").style.display = "none";
			}
			
		},
		
		/*
		Collect the information on the clusters from the graph and store it in the data variable clusters.
		@return Array of objects with cluster information
		// This looks circular - data is pushed on the graph, modified there and then re-read from the graph
		// Better: data is changed on the datastructure - and only displayed on the graph
		*/
		get_clusters: async function() {
				
			function compare_clusters ( a, b ) {
				if ( a.labels.length < b.labels.length ){
				  return 1;
				}
				if ( a.labels.length > b.labels.length ){
				  return -1;
				}
				return 0;
			  }
			
				app.clusters = [];
				let clusters = [];
				
				let svg = d3.select("#svg");
				let nodes = svg.selectAll(".node").selectAll("g");

				nodes.each(function(d,i) {
					let cluster = {};
					let exists = false;
					let cluster_name;
					let colour;
					let text;
					let cluster_id;
					let cluster_node;

					childnodes = this.childNodes;
					childnodes.forEach(function(d,i) {
						
						if (d.tagName === "circle") {
							cluster_name = d.getAttribute("cluster");
							cluster_id = d.getAttribute("cluster_id");
							colour = d.getAttribute("fill");
							cluster_node = d.getAttribute("cluster_node");
						}

						if (d.tagName === "text") {
							text = d.getAttribute("text");
						}
					});

					// TODO - I do not know what exactly this part of the function from IK is doing
					// why does it only push None cluster nodes
					clusters.forEach(function(c,i) {
						if (c.cluster_name === cluster_name) {
							exists = true;
							if (cluster_node === "false") {
								c.labels.push({"text": text, "cluster_node": cluster_node})
							}
						}
					});

					if (! exists) {
						cluster["cluster_id"] = cluster_id;
						cluster["cluster_name"] = cluster_name;
						cluster["colour"] = colour;
						cluster["add_cluster_node"] = false;
						//cluster["delete_cluster"] = false;
						cluster.labels = [];
						if (cluster_node === "false") {
							cluster["labels"].push({"text": text, "cluster_node": cluster_node});
							//console.log("in cluster labels", text, cluster_node )
							
						}
						if (cluster.labels.length > 0) {
							clusters.push(cluster);
						}	
					}
					clusters.sort(compare_clusters)
					console.log(clusters)
				});

				for (var i=0; i < clusters.length; i++) {
					Vue.set(app.clusters, i, clusters[i]);
				}
				return;
		},
		render_graph: async function() {
			this.overlay_main = true
			this.graph_rendered = false
			this.wait_rendering = true
			console.log(this.wait_rendering)
			this.getData()
			await this.$nextTick()
			
		},
		/*
		Get the data from the BE according to the parameters entered in the FE and render the graph
		*/
		getData: function() {
			let data = {}
			data["target_word"] = this.target_word;
			data["start_year"] = this.start_year;
			data["end_year"] = this.end_year;
			data["senses"] = this.senses;
			data["edges"] = this.edges;
			data["time_diff"] = this.time_diff;

			// ## experimental new graph-algos - not fully implemented yet
			// ## data is sent via addition to target word to backend (not very nice but does the job for now)

			if (this.graph_type === "max_per_slice"){
				data["target_word"] = "AD" + this.target_word
			}
			if (this.graph_type === "stable_nodes"){
				data["target_word"] = "SG" + this.target_word
			}


			app.start_years.forEach(function(d,i) {
				if (d.value === app.start_year) {
					app.min_time_id = i + 1;
				}
			});

			app.end_years.forEach(function(d,i) {
				if (d.value === app.end_year) {
					app.max_time_id = i + 1;
				}
			});

			var url = './api/collections/'+ this.collection_key + '/sense_graph';
			
			axios.post(url, data)
				.then((res) => {
					this.data_from_db = res.data;
					var nodes = this.data_from_db[0].nodes;
					console.log("in data get nodes", nodes)
					var links = this.data_from_db[0].links;
					var target = [this.data_from_db[1]];
					app.singletons = this.data_from_db[2].singletons;
					console.log("in data get singletons", app.singletons)
					// Call D3 function to render graph
					render_graph(nodes, links, target)
					this.graph_rendered = true;
					this.overlay_main = false;
					this.wait_rendering = false;
					console.log(this.wait_rendering)
					// Update cluster information
					app.get_clusters();
				})
				.catch((error) => {
					console.log(error)
					if (error.response.status >= 500) {
						alert(error + "\nPlease try a different target word.");
					}
					
				});

			
		},
		/*
		Returns a json object with all the information needed to rerender a graph and saves it locally.
		*/
		saveGraph: function() {
			var svg = d3.select("#svg");

			var links = svg.selectAll(".link");
			var nodes = svg.selectAll(".node");

			var graph_links = [];
			var graph_nodes = [];

			links.selectAll("line").each(function(d,i) {
				var source = this.getAttribute("source");
				var target = this.getAttribute("target");
				var weight = this.getAttribute("weight");
				var colour = this.getAttribute("stroke");
				var link = {};

				link["source"] = source;
				link["target"] = target;
				link["weight"] = weight;
				link["colour"] = colour;

				graph_links.push(link);
			});


			nodes.selectAll("g").each(function(d,i) {
				var x = this.__data__.x;
				var y = this.__data__.y;
				var fx = this.__data__.fx;
				var fy = this.__data__.fy;
				var id = this.__data__.id;
				var cluster_id;
				var cluster_name;
				var is_cluster_node;
				var colour;
				var time_ids;
				var centrality_score;

				var node = {}

				node["id"] = id;
				node["x"] = x;
				node["y"] = y;
				node["fx"] = fx;
				node["fy"] = fy;

				var childnodes = this.childNodes;
				childnodes.forEach(function(d,i) {
					if (d.tagName === "circle") {
						cluster_id = d.getAttribute("cluster_id");
						cluster_name = d.getAttribute("cluster");
						is_cluster_node = d.getAttribute("cluster_node");
						colour = d.getAttribute("fill");
						time_ids = d.getAttribute("time_ids");

						node["class"] = cluster_id;
						node["cluster_name"] = cluster_name;
						node["cluster_node"] = is_cluster_node;
						node["colour"] = colour;
						node["time_ids"] = time_ids;

						if (is_cluster_node === "false") {
							centrality_score = d.getAttribute("centrality_score");
							node["centrality_score"] = centrality_score;
						}
					}
				})

				graph_nodes.push(node);

			})


			
			var graph = {};
			graph['links'] = graph_links;
			graph['nodes'] = graph_nodes;
			graph['singletons'] = app.singletons;
			graph['target'] = app.target_word;
			graph['link_distance'] = app.linkdistance;
			graph['charge'] = app.charge;
			graph['start_year'] = app.start_year;
			graph['end_year'] = app.end_year;
			graph['time_diff'] = app.time_diff;
			graph['senses'] = app.senses;
			graph['edges'] = app.edges;

			var data = JSON.stringify(graph, null, 2);
			var blob = new Blob([data], {type: 'text/plain'});

			const a = document.createElement('a');
			document.body.appendChild(a);
			const url = window.URL.createObjectURL(blob);
			a.href = url;
	
			if (app.updated_nodes === null && app.updated_links === null) {
				a.download = app.target_word + "_" + app.senses + "_" + app.edges + ".json";
			} else {
				a.download = app.target_word + "_" + app.update_senses + "_" + app.update_edges + ".json";
			}

			// TODO What happens if nodes / clusters are deleted?

			//a.download = app.target_word + "_" + graph_nodes.length + "_" + graph_links.length + ".json"
			
			a.click();
			setTimeout(() => {
			  window.URL.revokeObjectURL(url);
			  document.body.removeChild(a);
			}, 0)

		},
		/*
		Render the graph from a json file that the user has specified.
		*/
		loadGraph: function() {
			document.getElementById("loadpopup").style.display = "none";
			app.overlay_main = true;
			const file = this.file;
			const reader = new FileReader()
			console.log("in load graph")
			reader.onload = function(e) {
			  this.read_graph = JSON.parse(reader.result);
			  if (this.read_graph.singletons) {
				app.singletons = this.read_graph.singletons;
			  } else {
				app.singletons = [];
			  }
			  
			  var nodes = this.read_graph.nodes;
			  var links = this.read_graph.links;
			  var target = this.read_graph.target;
			  app.target_word = target;
			  app.charge = this.read_graph.charge;
			  app.linkdistance = this.read_graph.link_distance;
			  app.start_year = this.read_graph.start_year;
			  app.end_year = this.read_graph.end_year;
			  app.time_diff = this.read_graph.time_diff;
			  app.senses = this.read_graph.senses;
			  app.edges = this.read_graph.edges;

			  app.start_years.forEach(function(d,i) {
				if (d.value === app.start_year) {
					app.min_time_id = i + 1;
				}
			  })

			  app.end_years.forEach(function(d,i) {
				if (d.value === app.end_year) {
					app.max_time_id = i + 1;
				}
			  })
			  //Call the D3 function to render the graph
			  render_graph(nodes, links, target, app.time_diff);
			}
			reader.readAsText(file);
			
			app.graph_rendered = true;
			app.overlay_main = false;
		},
		closeForm: function(id) {
			document.getElementById(id).style.display = "none";
		},
		displayForm: function() {
			document.getElementById("loadpopup").style.display = "block";
		}
	},
	mounted() {
		this.getStartYears();
		this.getEndYears();
		this.getCollections();
	}

});