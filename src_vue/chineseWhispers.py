import networkx as nx
import random
import json

#  For the algorithm see the following paper
#  Chris Biemann (2006):
#  Chinese Whispers - an Efficient Graph Clustering Algorithm 
#  https://www.aclweb.org/anthology/W06-3812.pdf
# 

############ ORIGINAL CHINESES WHISPERS (SCOT) #######################

# Apply the Chinese Whispers Clustering Algorithm to the graph
# Chineses Whispers cumulates edge-weights per node and class - 
# and allocates the neighbouring node-class with the highest cumulated weight to the node
# it uses random starting points
def chinese_whispers_algo(graph, iterations=15):
	
	for i in range(0, iterations):
		graph_nodes = list(graph.nodes())
		# select a random starting point for the algorithm
		random.shuffle(graph_nodes)

		for node in graph_nodes:
			# get neighbours of nodes
			neighbours = graph[node]
			# dictionary for cumulating edge-weights of nodes that belong to that class
			classes = {}
			# for each neighbour 
			for neighbour in neighbours:
				# cumulate edges weights in class-dictionary
				if graph.node[neighbour]['class'] in classes:
					classes[graph.node[neighbour]['class']] += graph[node][neighbour]['weight']
				# or init class in dictionary with first edge weight
				else:
					classes[graph.node[neighbour]['class']] = graph[node][neighbour]['weight']	
							
			maxi = 0
			maxclass = 0
			for c in classes:
				if classes[c] > maxi:
					maxi = classes[c]
					maxclass = c
			graph.node[node]['class'] = maxclass

	return  nx.readwrite.json_graph.node_link_data(graph)

# Construct a networkx graph from the nodes and edges
# precondition: nodes_set typed, edges types - all scores in float
def construct_graph(nodes_set, edges):
	nodes = list(nodes_set)
	graph = nx.Graph()
	graph.add_nodes_from(nodes)
	# initialize the class of each node
	for v, n in enumerate(graph.nodes):
		graph.node[n]['class'] = v
	graph.add_edges_from(edges)
	print(graph.edges.data())
	return graph


# call chineses whispers and calc centrality
def chinese_whispers(nodes, edges, iterations=15):
	graph = construct_graph(nodes, edges)

	centrality_nodes = nx.betweenness_centrality(graph)
	for node, centrality_score in centrality_nodes.items():
		graph.node[node]['centrality_score'] = centrality_score
	
	return chinese_whispers_algo(graph, iterations)

############ NEW CHINESE WHISPERS-LABEL PROP (SCOTTI) #######################

# Adjusted version of Chinese Whispers as a Label-Propagation-Learning-Algorithm
# Chineses Whispers cumulates edge-weights per node and class - 
# and allocates the neighbouring node-class with the highest cumulated weight to the node
# the label-prop version - only works on the unlabeled nodes and does not change pre-allocated labels
# PARAM: new_nodes: list of unlabeled nodes
# PARAM: graph - graph with nodes and edges - also the unlabeled nodes need to have feature "class" 
# PRECONDITION: class-Values of unlabeled nodes in graph need to be different to each other and different to all other class values

def chinese_whispers_label_prop(graph, new_nodes, iterations=15):
	newnodelist = list(new_nodes)
	for i in range(0, iterations):
		graph_nodes = list(graph.nodes())
		# select a random starting point for the algorithm
		random.shuffle(newnodelist)

		for node in newnodelist:
			# get neighbours of nodes
			neighbours = graph[node]
			# dictionary for cumulating edge-weights of nodes that belong to that class
			classes = {}
			# for each neighbour 
			for neighbour in neighbours:
				# cumulate edges weights in class-dictionary
				if graph.node[neighbour]['class'] in classes:
					classes[graph.node[neighbour]['class']] += graph[node][neighbour]['weight']
				# or init class in dictionary with first edge weight
				else:
					classes[graph.node[neighbour]['class']] = graph[node][neighbour]['weight']	
							
			maxi = 0
			maxclass = 0
			for c in classes:
				#print(classes[c], maxi)
				if classes[c] > maxi:
					maxi = classes[c]
					maxclass = c
			graph.node[node]['class'] = maxclass

	return  nx.readwrite.json_graph.node_link_data(graph)

# function get graph in json-format with semi-labelled data and runs chineses whispers_label_prop on those
# not used currently (function for graph with results)
def continue_clustering(graphJ, newNodes, iterations = 15):
	# deconstruct json graph from SCOT containes "nodes" and "links"
	edgesJ = graphJ["links"]
	nodesJ = graphJ["nodes"]
	#print(nodesJ)
	graph = nx.Graph()
	for node in nodesJ:
		graph.add_node(node["target_text"])
		graph.node[node["target_text"]]["class"] = node["class"]
		graph.node[node["target_text"]]["id"] = node["id"]
		graph.node[node["target_text"]]["time_ids"] = node["time_ids"]
		graph.node[node["target_text"]]["weights"] = node["weights"]

	for edge in edgesJ:
		gewicht = edge["weight"]
		graph.add_edge(edge["source_text"], edge["target_text"], weight = gewicht)
	
	return chinese_whispers_label_prop(graph, newNodes, iterations)

# function get graph in json-format with semi-labelled data and runs chineses whispers_label_prop
# on unknown nodes - makes sure that previous colours are maintained

def induction(graphJ, newNodes, iterations = 15):
	# deconstruct json graph from FRONTEND containes "nodes" and "links"
	edgesJ = graphJ["links"]
	nodesJ = graphJ["nodes"]
	colorDic = {}
	#print("in ccfe nodesJ", nodesJ)
	graph = nx.Graph()
	for node in nodesJ:
		graph.add_node(node["id"])
		graph.node[node["id"]]["class"] = int(node["class"])
		graph.node[node["id"]]["id"] = node["id"]
		graph.node[node["id"]]["time_ids"] = node["time_ids"]
		graph.node[node["id"]]["weights"] = node["weights"]
		colorDic[node["class"]] = node["colour"]
	#print(colorDic)

	for edge in edgesJ:
		gewicht = float(edge["weight"])
		graph.add_edge(edge["source"], edge["target"], weight = gewicht)
	
	#print(graph.nodes)
	newGraph = chinese_whispers_label_prop(graph, newNodes, iterations)
	newNodes2 = newGraph["nodes"]
	for node in nodesJ:
		for node2 in newNodes2:
			if node["id"] == node2["id"]:
				#print(node["id"], node2["id"], node["class"], colorDic[str(node2["class"])])
				node["class"] = str(node2["class"])
				node["cluster_name"] = str(node2["class"])
				node["colour"] = colorDic[str(node2["class"])]
	#print("in ccfe new graphj", nodesJ)
	return graphJ

