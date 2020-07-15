import records
import json

class Database:
	def __init__(self, collection, configfile = './config.json'):
		with open(configfile) as config_file:
			config = json.load(config_file)
		if (collection in [*config["collections_info_backend"]]):
			self.db = records.Database(config["collections_info_backend"][collection])
		else:
			self.db = records.Database(config["collections_info_backend"]['default'])
	
	def get_features(self, word1, time_id):
		# get feature and score for a word ie its syntagmatic context
		# Param word1 (not null, valid) (CAST to str just to be sure)
		# Param time_id (not null, valid) - CAST to int (just to be sure)
		# return feature (as STRING) and score as FLOAT

		features = {}
		f = self.db.query(
			'SELECT feature, score FROM similar_features '
			'WHERE word1=:tw and time_id=:td '
			'ORDER BY score DESC',
			tw=str(word1),
			td=int(time_id)
			)
		
		for row in f:
			features[str(row['feature'])] = float(row['score'])
		

		return features

	def get_all_years(self, position):
		# get all the information on a certain column in the time_slices table, e.g. position='start_year'
		years = []
		t = self.db.query('SELECT * FROM time_slices ORDER BY id ASC')
		for row in t:
			year = {}
			year["value"] = int(row[position])
			year["text"] = str(row[position])
			years.append(year)
		return years


	def get_time_ids(self, start_year, end_year):
		# get the corresponding ids for the start and end_year parameters
		time_ids = []
		t = self.db.query(
			'SELECT id FROM time_slices WHERE start_year>=:start AND end_year<=:end ORDER BY id ASC',
			start=start_year, end=end_year)

		for r in t:
			time_ids.append(int(r['id']))
		return time_ids


	
	def get_nodes(
		self,
		target_word,
		max_paradigms,
		selected_time_ids
		):
		# get the nodes for a target word from the database
		# PARAM target_word is str
		# PARAM max_paradigms
		# PARAM selected_time_ids is int-array
		# RETURNS 

		nodes = []
		target_word_senses = self.db.query(
			'SELECT word2, time_id, score FROM similar_words '
			'WHERE word1=:tw AND word1!=word2 '
			'ORDER BY score DESC',
			tw=target_word
			)
		for row in target_word_senses:
			exists = False
			if int(row['time_id']) in selected_time_ids and len(nodes) < max_paradigms:
				for node in nodes:
					if node[0] == str(row['word2']):
						exists = True
						if not int(row["time_id"]) in node[1]["time_ids"]:
							node[1]["time_ids"].append(int(row['time_id']))
							node[1]["weights"].append(float(row['score']))
				
				if not exists:
					nodes.append([str(row['word2']), {"time_ids": [int(row['time_id'])], "weights": [float(row["score"])], "target_text": str(row['word2'])}])
		#print(nodes)
		return nodes
	
	def get_stable_nodes(
		self,
		target_word,
		max_paradigms,
		selected_time_ids,
		factor
		):
		# gets Stable Graph - ie only nodes that occur at least in factor*len(time_ids) time_ids
		# PARAM factor
		# PARAM target_word is str
		# PARAM max_paradigms
		# PARAM selected_time_ids is int-array
		# RETURNS 
		
		nodes = []
		target_word_senses = self.db.query(
			'SELECT word2, time_id, score FROM similar_words '
			'WHERE word1=:tw AND word1!=word2 '
			'ORDER BY score DESC',
			tw=target_word
			)
		
		# put all into node_list 
		for row in target_word_senses:
			exists = False
			if int(row['time_id']) in selected_time_ids:
				for node in nodes:
					if node[0] == str(row['word2']):
						exists = True
						if not int(row["time_id"]) in node[1]["time_ids"]:
							node[1]["time_ids"].append(int(row['time_id']))
							node[1]["weights"].append(float(row['score']))
				
				if not exists:
					nodes.append([str(row['word2']), {"time_ids": [int(row['time_id'])], "weights": [float(row["score"])], "target_text": str(row['word2'])}])
		
		#filter by those that exist in more than factor selected time_ids until max threshold reached
		#print("nodes erste runde")
		
		nodes_stable = []
		for node in nodes:
			#print("node time_ids", node[1]["time_ids"])
			if float(len(set(node[1]["time_ids"]).intersection(set(selected_time_ids)))) >= factor*len(set(selected_time_ids)) and len(nodes_stable) < max_paradigms:
				nodes_stable.append(node)
			

		
		#print("nodes_stable", nodes_stable)
		return nodes_stable
		
	def get_all_nodes(
		self,
		time_ids
		):
		# experimental for target-word "Xall" - get all nodes
		# get the nodes for all words target word from the database
		# precondition_ time_ids not null, is integer
		# postcondition: nodes array words - str-type, time-id int, score -float, target-text str
		nodes = []
		nodeset = set()
		target_word_senses = self.db.query(
			'SELECT * FROM similar_words'
			)
		for row in target_word_senses:
			if row['time_id'] in time_ids:
				word1 = str(row["word1"])
				word2 = str(row["word2"])
											
				if word2 not in nodeset:
					nodes.append([str(row['word2']), {"time_ids": [int(row['time_id'])], "weights": [float(row["score"])], "target_text": str(row['word2'])}])
					nodeset.add(word2)
				if word1 not in nodeset:
					nodes.append([str(row['word1']), {"time_ids": [int(row['time_id'])], "weights": [float(row["score"])], "target_text": str(row['word1'])}])
					nodeset.add(word1)
				
		#print(nodes)
		return nodes

	def get_edges(self, nodes, max_edges, time_ids):
		# standard edge function - allocates edges to nodes
		# Attention: edges can be set independent of time_ids 
		# this can result in node1 from time2, node 2 from time4, and edge from time5 (ie pseudo-nodes)
		# this results in "invisible nodes" (ie node from time5 is implicitly present due to edge from that id)
		# new algo get_edges_in_time below avoids that
		# Param: nodes
		# Para: max_edges
		# Param: time_ids
		#
		edges = []
		connections = []
		node_list = []
		singletons = []
		
			
		for node in nodes:
			node_list.append(node[0])
			
		con = self.db.query(
			'SELECT word1, word2, score, time_id '
			'FROM similar_words '
			'WHERE word1 IN :nodes AND word2 IN :nodes '
			'ORDER BY score DESC',
			nodes=node_list
			)

		# get global maximum of edges
		for row in con:
			if not str(row['word1'])==str(row['word2']) and int(row['time_id']) in time_ids \
				and len(connections)<=int(max_edges)*len(node_list):
				connections.append([str(row['word1']), str(row['word2']), float(row['score']), int(row['time_id'])])
				
		# filter global max-set of edges by those MAX-TIME-IDS CONNECTIONS that connect two nodes in graph globally (regardless of time-ids of nodes..)
		potential_edges = {}
		singletons = []
		for c in connections:
			if c[0] in node_list and c[1] in node_list:
				# if there is no edge yet, append it -- RESULTS IN MAX ONLY EDGE WHICH MAY HAVE A TIME_ID DIFFERENT TO NODES
				# print(node_dic[c[0]])
				if (c[0], c[1]) not in potential_edges:
					potential_edges[(c[0], c[1])] = (c[2], c[3]) 
		#print("filtered set of potential_edges", potential_edges)
		
		# filter out the singletons (ie those nodes that have no connecting edge)
		for n in node_list:
			exists = False
			for k,v in potential_edges.items():
				if n == k[0] or n == k[1]:
					exists = True
					edges.append((k[0], k[1], {'weight': v[0], 'weights': [v[0]], 'time_ids': [v[1]], 'source_text': k[0], 'target_text': k[1]}))
			if not exists:
				singletons.append(n)
				#removes singletons from graph
				for node in nodes:
					if n == node[0]:
						nodes.remove(node)
		singletons = list(singletons)
		return edges, nodes, singletons
		
	def get_edges_in_time(self, nodes, max_edges, time_ids):
		# CURRENTLY NOT IN USE
		# selects top edges based on global max = nodes*max_edges
		# then filters edges set and only connects nodes in SAME TIME-iD
		# this is the difference to algo get_edges which can result in pseudo-nodes
		edges = []
		connections = []
		node_list = []
		singletons = []
		node_dic = {}
	
		for node in nodes:
			node_list.append(node[0])
			node_dic[node[0]] = node[1]
		#print(node_dic)
		#{'a': {'time_ids': [2, 1], 'weights': [0.474804, 0.289683], 'target_text': 'a'},

		con = self.db.query(
			'SELECT word1, word2, score, time_id '
			'FROM similar_words '
			'WHERE word1 IN :nodes AND word2 IN :nodes '
			'ORDER BY score DESC',
			nodes=node_list
			)

		# get global maximum of edges
		for row in con:
			if not str(row['word1'])==str(row['word2']) and int(row['time_id']) in time_ids \
				and len(connections)<=int(max_edges)*len(node_list):
				connections.append([str(row['word1']), str(row['word2']), float(row['score']), int(row['time_id'])])
				
		# print("max global edges", connections)

		# filter global max-set of edges by those MAX-TIME-IDS CONNECTIONS that connect two nodes in graph IN TIME ID
		potential_edges = {}
		singletons = []
		for c in connections:
			if c[0] in node_dic and c[1] in node_dic and c[3] in node_dic[c[0]]["time_ids"] and c[3] in node_dic[c[1]]["time_ids"]:
				# new and c[3] in node_dic[c[0]]["time_ids"] and c[3] in node_dic[c[1]]["time_ids"]
				# if there is no edge yet, append it -- RESULTS IN MAX ONLY EDGE in EXISTING TIME-SLOT IN WHICH BOTH NODES OCCUR

				if (c[0], c[1]) not in potential_edges:
					potential_edges[(c[0], c[1])] = (c[2], c[3]) 
		#print("filtered set of potential_edges", potential_edges)
		
		# filter out the singletons (ie those nodes that have no connecting edge)
		for n in node_list:
			exists = False
			for k,v in potential_edges.items():
				if n == k[0] or n == k[1]:
					exists = True
					edges.append((k[0], k[1], {'weight': v[0], 'weights': [v[0]], 'time_ids': [v[1]], 'source_text': k[0], 'target_text': k[1]}))

			if not exists:
				singletons.append(n)
				#filter out singletons
				# for node in nodes:
				# 	if n == node[0]:
				# 		nodes.remove(node)

		singletons = list(singletons)
		
		return edges, nodes, singletons

	def get_edges_per_time(self, nodes, max_paradigms, max_edges, time_ids):
		# algorithm allocates edges PER time_slice
		# the max per time-slice = max_paradigms * max edge
		# PARAM: Nodes is of form [['a', {'time_ids': [2, 1], 'weights': [0.474804, 0.289683], 'target_text': 'a'}]]
		# PARAM: MAX PARADIGMS PER TIME SLICE // MAX_EDGES -> Max_paradigms * max_edges
		# PARAM: TIME IDs
		# RETURNS Edges, nodes_filtered, and singleton
		
		# VARS -----------------------------
		# RETURN-VARS
		edges = []
		singletons = []
		nodes_filtered = []
		# HILFSVARIABLEN
		# Edges from DB (all possible ones)
		connections = []
		# Filteres Edges in different form than final edges
		potential_edges = {}
		# various forms of nodes for easier handling
		node_dic = {}
		node_list = []
		for node in nodes:
			node_list.append(node[0])
			node_dic[node[0]] = node[1]
		#print(nodes)
		# 1. --------- get maximum possible edges (ie all that all nodes in list in all time ids)

		con = self.db.query(
			'SELECT word1, word2, score, time_id '
			'FROM similar_words '
			'WHERE word1 IN :nodes AND word2 IN :nodes '
			'ORDER BY score DESC',
			nodes=node_list
			)

		# prepare var for allocating edges up until local max reached (ie per slice)
		con_dic = {}
		for time_id in time_ids:
			con_dic[time_id] = []
		
		# allocate edge to dic (in descending order until thresholds reached)
		for row in con:
			if not str(row['word1'])==str(row['word2']) and int(row['time_id']) in time_ids \
				and len(con_dic[int(row['time_id'])]) <= max_paradigms * max_edges:
				con_dic[int(row['time_id'])].append([str(row['word1']), str(row['word2']), float(row['score']), int(row['time_id'])])
		#print(con_dic)
		# convert dic to connections - array
		for k in con_dic.keys():
			for el in con_dic[k]:
				connections.append(el)
				
		# filter global max-set of edges by those MAX-TIME-IDS CONNECTIONS that connect two nodes in graph IN TIME ID
		for c in connections:
			if c[0] in node_dic and c[1] in node_dic and \
			c[3] in node_dic[c[0]]["time_ids"] and c[3] in node_dic[c[1]]["time_ids"]:
				if (c[0], c[1]) not in potential_edges:
					potential_edges[(c[0], c[1])] = (c[2], c[3])
				#else:
					#print("in else connections inner - rejected connection is", c)
			#else:
				#print("in else connections - rejected connection is", c)
				
		# create edge-node list
		edge_node_set = {k[0] for k in potential_edges.keys()}.union({k[1] for k in potential_edges.keys()})
		# filter out the singletons (ie those nodes that have no connecting edge)
		singleton_set = set(node_list) - edge_node_set
						
		# transform potential edges to correct edge-format 
		for k,v in potential_edges.items():
			edges.append((k[0], k[1], {'weight': v[0], 'weights': [v[0]], 'time_ids': [v[1]], 'source_text': k[0], 'target_text': k[1]}))
		
		# remove singletons from nodes
		for node in nodes:
			if node[0] in edge_node_set:
				nodes_filtered.append(node)
		
		# return singletons als liste
		singletons = list(singleton_set)

		print("anzahl edges additive graph", len(edges))
		# if you want to have the singletons in the graph return nodes, if not return nodes_filtered
		return edges, nodes_filtered, singletons