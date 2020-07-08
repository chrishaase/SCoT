import networkx as nx
import random
import json

#  For the algorithm see the following paper
#  Chris Biemann (2006):
#  Chinese Whispers - an Efficient Graph Clustering Algorithm 
#  https://www.aclweb.org/anthology/W06-3812.pdf
# 
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

# Apply the Chinese Whispers Clustering Algorithm to the graph
# and calculate centrality score
def chinese_whispers(nodes, edges, iterations=15):
	graph = construct_graph(nodes, edges)

	centrality_nodes = nx.betweenness_centrality(graph)

	for node, centrality_score in centrality_nodes.items():
		graph.node[node]['centrality_score'] = centrality_score

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