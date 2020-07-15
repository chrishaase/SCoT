import networkx as nx
import random
import json

#  For the algorithm see the following paper
#  Chris Biemann (2006):
#  Chinese Whispers - an Efficient Graph Clustering Algorithm 
#  https://www.aclweb.org/anthology/W06-3812.pdf
# 

# Apply the Chinese Whispers Clustering Algorithm to the graph
def chinese_whispers_algo(graph, iterations=15):
	
	for i in range(0, iterations):
		graph_nodes = list(graph.nodes())
		# select a random starting point for the algorithm
		random.shuffle(graph_nodes)

		for node in graph_nodes:
			neighbours = graph[node]
			classes = {}
			for neighbour in neighbours:
				if graph.node[neighbour]['class'] in classes:
					classes[graph.node[neighbour]['class']] += graph[node][neighbour]['weight']
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
	#print(graph.edges.data())
	return graph


# call chineses whispers and calc centrality
def chinese_whispers(nodes, edges, iterations=15):
	graph = construct_graph(nodes, edges)

	# This function has nothing to do with the CW-algorithm it has been squeezed in here
	centrality_nodes = nx.betweenness_centrality(graph)
	for node, centrality_score in centrality_nodes.items():
		graph.node[node]['centrality_score'] = centrality_score
	
	return chinese_whispers_algo(graph, iterations)

# Chinese Whispers as a Label-Propagation-Learning-Algorithm
# function get graph in json-format with semi-labelled data and runs chineses whispers on those
# 
def continue_clustering(graphJ, iterations = 15):
	# deconstruct json graph containes "nodes" and "links"
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
	
	return chinese_whispers_algo(graph, iterations)
