from flask import Flask, jsonify, render_template, request, Response
from flask_cors import CORS

from db import Database
import chineseWhispers
import urllib.parse
import json
import urllib.request
#from word2vecloader import Word2VecLoader
from documentdb import Documentdb

DEBUG = True
PARAMETERS = {}

class CustomFlask(Flask):
    jinja_options = Flask.jinja_options.copy()
    jinja_options.update(dict(
        variable_start_string='%%',  # Default is '{{', I'm changing this because Vue.js uses '{{' / '}}'
        variable_end_string='%%'
    ))

app = CustomFlask(__name__, 
        static_folder= "./static")  # This replaces your existing "app = Flask(__name__)"
app.config.from_object(__name__)
CORS(app)

def getDbFromRequest(collection):
	if collection != "" and collection != None:
		return collection
	else:
		return "default"
	

@app.route('/')
def index():
	return render_template('index.html')

@app.route('/api/reclustering', methods=['POST'])
# recluster the existing cumulated graph by running Chinese Whispers on it
# Param: nodes [names my be string or any other type]
# Param: edges with weights [weights may be int or float]
# No time-ids needed here: cumulated graph is clustered irrespective of time
# Note: Condition: for calling Chinese Whispers: type-safe FLOAT, type-safe STRING
# Note: Method guarantees type-safety by casting to float and string

def recluster():
	nodes = []
	links = []
	if request.method == 'POST':
		data = json.loads(request.data)
		nodes = data["nodes"]
		links_list = data["links"]
		#print(data)
		for item in links_list:
			links.append((str(item["source"]), str(item["target"]), {'weight': float(item["weight"])}))

		reclustered_graph = chineseWhispers.chinese_whispers(nodes, links)
		return json.dumps(reclustered_graph)

@app.route('/api/collections')
def databases_info():
	with open('./config.json') as config_file:
			config = json.load(config_file)
	return json.dumps(config["collections_info_frontend"])


@app.route('/api/collections/<string:collection>/interval/<int:start>/<int:end>')
# Retrieve the time id(s) of a certain interval between a specified start and end year
# Param selected start from all start (must be valid - precondition to be ensured by frontend)
# Param selected end from all ends (must be valid - precondition to be ensured by frontend)
# Returns interval as json

def interval(start, end, collection):
	db = Database(getDbFromRequest(collection))
	interval = db.get_time_ids(start, end)
	return json.dumps(interval)


@app.route('/api/collections/<string:collection>/start_years')
# retrieve all possible start years from the database
def get_start_years(collection):
	db = Database(getDbFromRequest(collection))
	start_years = db.get_all_years("start_year")
	return json.dumps(start_years)


@app.route('/api/collections/<string:collection>/end_years')
# retrieve all possible end years from the database
def get_end_years(collection):
	db = Database(getDbFromRequest(collection))
	end_years = db.get_all_years("end_year")
	return json.dumps(end_years)


@app.route('/api/collections/<string:collection>/sense_graph', methods=['POST'])
# Retrieves the clustered graph data according to the input parameters of the user and return it as json
# Param: target word: user selected target word out of all possible target words
# Param: selected_start_year: user selected start year out of all possible start years
# Param: selected_end_year: user selected end year out of all possible end years
# Param: max number of cumulated paradigms over time - the global graph will have paradigms up to this number
# Param: max_ed
# Param: collection
# Precondition: selected_start_year < selected_end_year
# Precondition: All Params not null
# Precondition: All Params valid (target word validity cannot be guaranteed by frontend?)
# Postcondition: valid graph in valid json-format

def get_clustered_graph(
		collection):
	if request.method == 'POST':
		data = json.loads(request.data)
		target_word = str(data["target_word"])
		start_year = int(data["start_year"])
		end_year = int(data["end_year"])
		paradigms = int(data["senses"])
		density = int(data["edges"])
			

	def clusters(
		collection, 
		target_word,
		start_year,
		end_year,
		paradigms,
		density
		):
		
		db = Database(getDbFromRequest(collection))
		time_ids = db.get_time_ids(start_year, end_year)
		## ------------------- experimental features ---- start
		## the following algorithm project the data differently onto a graph
		# get all nodes from a collection (Ignore target-word and number of paradigms)
		if target_word == "Xall":
			nodes = db.get_all_nodes(time_ids)
			edges, nodes, singletons = db.get_edges_in_time(nodes, density, time_ids)
		# gets negativ-edge graph from embedding WordVec
		# mulitple time-ids not fully implemented
		elif target_word[:2] == "WV":
			#print(" in word target WV", target_word[2:])
			target_word = target_word[2:]
			#w2v = Word2VecLoader()
			# all in one function
			# nodes, edges, singletons = w2v.egoGraph(target_word, paradigms, density, time_ids)
		# gets Stable Graph - ie only nodes that occur at least in factor * time_ids (ie 66%)
		elif target_word[:2]=="SG":
			#print(" in word target SG", target_word[2:])
			target_word = target_word[2:]
			# factor determines minimum number of time-slices
			factor = 1
			nodes = db.get_stable_nodes(target_word, paradigms, time_ids, factor)
			edges, nodes, singletons = db.get_edges_in_time(nodes, density, time_ids)
		# get additive nodes - ie the top paradigms from each selected time id
		# problem size of graph may vary between paradigm and time-id*paradigm
		elif target_word[:2]=="AD":
			node_dic = {}
			for time_id in time_ids:
				time = []
				time.append(time_id)
				result = db.get_nodes(target_word[2:], paradigms, time)
				print("nodes pro time-id", len(result))
				#print(result)
				for res in result:
					if res[0] not in node_dic:
						node_dic[res[0]] = res[1]
					else:
						# add time res[1]["time_ids"] zu node_dic[res[0]]["time_ids"]
						node_dic[res[0]]["time_ids"].append(res[1]["time_ids"][0])
						node_dic[res[0]]["weights"].append(res[1]["weights"][0])
			nodes = []
			for k,v in node_dic.items():
				nodes.append([k, v])
			print("total additiver graph nodes", len(nodes))
			#print(nodes)
			edges, nodes, singletons = db.get_edges_per_time(nodes, paradigms, density, time_ids)
		# ---- standard from here - but can change to db.get_edges_in_time to avoid implicit nodes
		else:
			nodes = db.get_nodes(target_word, paradigms, time_ids)
			edges, nodes, singletons = db.get_edges(nodes, density, time_ids)
		## ------------------- experimental features ----- end
		
		return singletons, chineseWhispers.chinese_whispers(nodes, edges)
	
	singletons, clustered_graph = clusters(collection, target_word, start_year, end_year, paradigms, density)
	c_graph = json.dumps([clustered_graph, {'target_word': target_word}, {'singletons': singletons}], sort_keys=False, indent=4)
	
	return c_graph


def get_edge_info(collection, word1, word2, time_id):
	# get edge, ie. intersection of two word features in one time-id, from database
	# Param word1 (not null, valid)
	# Param word2 (not null, valid)
	# Param collection (not null, valid)
	# Param time_id(not null, valid)
	# Preconditions (see conditions after params)
	# db returns dictionary {"feature": score} with maxima and intersection set

	db = Database(getDbFromRequest(collection))
	res1_dic = db.get_features(word1, time_id)
	res2_dic = db.get_features(word2, time_id)
	
	if len(res1_dic) > 0 and len(res2_dic) > 0:
		
		# put results into intersection-set of res1 and res2
		res_set = set(res1_dic.keys()).intersection(set(res2_dic.keys()))
		
		#print(res_set)
		# determine maxima (sets are ordered by db in desc - thus first is the maximum)
		max1 = list(res1_dic.values())[0]
		max2 = list(res2_dic.values())[0]
		return res1_dic, res2_dic, res_set, max1, max2
	
	else:
		return {},{}, set(),0,0


@app.route('/api/collections/<string:collection>/simbim', methods=['POST'])
# retrieve edge information, ie intersection between two words in one collection and one time-id
# Param: collection
# Param: word1, word2
# Param: time-id
# Returns_ dictionary with result-set error or Zero-code (in case result set is empty)
# the response_dictionary is limited to max 200

def simbim(collection="default"):
	if request.method == 'POST':
		data = json.loads(request.data)
		word1 = str(data["word1"])
		word2 = str(data["word2"])
		time_id = int(data["time_id"])
	
	# get intersection of node-contexts (res_set), context-dics and max values
	res1_dic, res2_dic, res_set, max1, max2 = get_edge_info(collection, word1, word2, time_id)
	
	if len(res1_dic) == 0 or len(res2_dic) == 0 or len(res_set) == 0:
		# check if zero-error
		return {"error":"zero values"}
	else:
		# calc return dictionary and normalize values
		# format of dic = {"1": {"score": 34, "key": "wort", "score2": 34}, "2": ...}
		return_dic = {}
		index_count = 0
		for key in res_set:
			return_dic[str(index_count)] = {"score": float(res1_dic[key]/max1), "key" : str(key), "score2": float(res2_dic[key]/max2) }
			index_count += 1
		# limit response dictionary by top 100 values for each score (ie max 200)
		res_dic_topn = {}
		topn = 100
		if (len(return_dic)>2*topn):
			# select topN for score1
			return_dic = {k:v for k,v in sorted(return_dic.items(), key=lambda item: item[1]["score"], reverse = True)}
			score1key = list(return_dic.keys())[:topn]
			for key in score1key:
				res_dic_topn[key] = return_dic[key]
			# now for score2
			return_dic = {k:v for k,v in sorted(return_dic.items(), key=lambda item: item[1]["score2"], reverse = True)}
			score2key = list(return_dic.keys())[:topn]
			for key in score2key:
				res_dic_topn[key] = return_dic[key]
			return_dic = res_dic_topn

		return_dic["error"] = "none"
		return return_dic



@app.route('/api/cluster_information', methods=['POST'])

# get_cluster_information based on nodes [ie significance of context word for node] - 
# use all occurrences of node in selected time-id [max strength time id]
# calculate score by adding all significances + dividing by number of nodes
# Params: nodes with time-ids
# Returns dictionary of words with Score: averaged normalized over all nodes based on max-time-id
# Precondition: data not null and valid
# Postcondition: the response is limited to max 200
def cluster_information():
	# measure execution time of db-queries
	import time
	start_time = time.time()
	# algo
	from collections import defaultdict
	nodes = set()
	if request.method == 'POST':
		data = json.loads(request.data)
		for node in data["nodes"]:
			nodes.add((node["label"], node["time_id"]))
	#print("nodes", nodes)
	print("-------------------------------------------------------")
	print("in cluster info (1) anzahl unique nodes - alle nodes ", len(nodes))
	# get features (ie context word2 and score) for all unique nodes in all time-ids
	#print("collection", data["collection"])
	db = Database(getDbFromRequest(data["collection"]))
	feature_dic = {}
	for node in nodes:
		feature_dic[node] = db.get_features(node[0], node[1])
	print("-------------------------------------------------------")
	print(" in cluster info (2) after db query --- %s seconds ---" % (time.time() - start_time))
	#print("feature_dic", feature_dic)
	res_dic_all = defaultdict(int)
	for k, v in feature_dic.items():
		for k, v2 in v.items():
			res_dic_all[k] += v2
	print("-------------------------------------------------------")
	#print("res_dic_all", res_dic_all)	
	# normalize and sort significance values
	res_dic_all = {k:v for k,v in sorted(res_dic_all.items(), key = lambda x: x[1], reverse = True)}
	maxi = list(res_dic_all.values())[0]
	for k,v in res_dic_all.items():
		res_dic_all[k] = float(v/maxi)
	# limit response dictionary to topn
	topn = 200
	dic_res = {}
	keys = list(res_dic_all.keys())[:topn]
	for index in range(len(keys)):
		dic_res[keys[index]] = res_dic_all[keys[index]]

	print(" cluster info (3) after algo --- %s seconds ---" % (time.time() - start_time))
	#print("dictionary cluster ", dic_res)
	
	return dic_res

@app.route('/api/collections/<string:collection>/documents', methods=['POST'])
# retrieves documents (ie sentences) which contain two words (not related to time-id yet)
# Param: collection
# Param: word1, word2
# [Param: time-id - not implemented yet]
# Returns_ elasticsearch response
# the response_dictionary is limited to max 200

def documents(collection="default"):
	if request.method == 'POST':
		data = json.loads(request.data)
		word1 = str(data["word1"])
		word2 = str(data["word2"])
		#time_id = int(data["time_id"])
	######## EXPERIMENTALLY LIMITED TO "CORONA_NEWS"
	collection = "corona_news"
	##########
	documentdb = Documentdb()
	ret = []
	res = documentdb.search(word1, word2, collection)
	ret_set = set()
	for hit in res["hits"]["hits"]:
		text = hit["_source"]["date"][:10]+ " [" + str(hit["_source"]["time_id"])+ "] : " \
		+ hit["_source"]["text"] + " [" + hit["_source"]["source"] + "] "
		ret_set.add(text)
	ret_list = list(ret_set)
	ret_list.sort()
	#print(ret_list)
	if ret_list != None and len(ret_list) > 0:
		for text in ret_list:
			ret.append({"doc": text })
	else:
		ret.append({"doc": "No Results."})

	return {"docs": ret}

if __name__ == '__main__':
	# use the config file to get host and database parameters
	with open('./config.json') as config_file:
		config = json.load(config_file)
	app.run(host=config['host'])
