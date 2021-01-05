from typing import Dict, List
import records
import json
import dataclasses
from model.ngot_model import NGOTLink, NGOTNode, NGOT
from model.ngot_mapper import map_nodes_dic_2_ngot, map_edges_dic_2_ngot


def get_db(config, collection):
    if collection != "" and collection != None and collection in config["collections_info_backend"]:
        return collection
    else:
        return "default"


class Database():
    def __init__(self, collection, configfile='./config/config.json') -> None:
        with open(configfile) as config_file:
            config = json.load(config_file)
        if (collection in [*config["collections_info_backend"]]):
            self.db = records.Database(
                config["collections_info_backend"][collection])
        else:
            self.db = records.Database(
                config["collections_info_backend"]['default'])


# --- COLLECTION INFORMATION

    def get_all_years(self, column_name) -> List[Dict[int, str]]:
        """ gets initial information on years and ids for collection
        Args:
                column_name ([type]): start_years or end_years
        Returns:
                List[Dict[int, str]]: [description]
        """
        years = []
        t = self.db.query('SELECT * FROM time_slices ORDER BY id ASC')
        for row in t:
            year = {}
            # value and text needed for vue dropdown
            year["value"] = int(row[column_name])
            year["text"] = str(row[column_name])
            # id needed for various operations
            year["id"] = int(row['id'])
            years.append(year)
        return years

# ------------------ GRAPH QUERY YEAR_TIME_ID RESOLVER

    def get_time_ids(self, start_year, end_year):
        """ frontend queries years - these are resolved to time-ids by this function
        Args:
                start_year ([type]): [description]
                end_year ([type]): [description]
        Returns:
                [type]: list of time-ids
        """
        # get the corresponding ids for the start and end_year parameters
        time_ids = []
        t = self.db.query(
            'SELECT id FROM time_slices WHERE start_year>=:start AND end_year<=:end ORDER BY id ASC',
            start=start_year, end=end_year)

        for r in t:
            time_ids.append(int(r['id']))
        return time_ids

    # ---------------------- GRAPH ALGORITHM NGOT INTERVAL -------------------------------------------

    def get_nodes_interval(self, ngot):
        # STEP 1: GET ALL NODES FROM EACH INTERVAl
        # Var and resulting values
        # resulting nodes
        ngot.nodes = []
        # real nodes per interval
        ngot.props.number_of_interval_nodes = []
        # hilfs var
        ngot_node_dic = {}

        # ... and merge them
        for time_id in ngot.props.selected_time_ids:
            static_ngot_nodes = self.get_nodes_one_interval(
                ngot, time_id)
            ngot.props.number_of_interval_nodes.append(len(static_ngot_nodes))
            for node in static_ngot_nodes:
                if node.id not in ngot_node_dic:
                    ngot_node_dic[node.id] = node
                else:
                    ngot_node_dic[node.id].time_ids.append(node.time_ids[0])
                    ngot_node_dic[node.id].weights.append(node.weights[0])

        ngot_nodes = [v for v in ngot_node_dic.values()]
        for node in ngot_nodes:
            node.weight = max(node.weights)
        # --- simple mapping of new ngot nodes to dictionary structure
        new_nodes = [[node.id, dataclasses.asdict(
            node)] for node in ngot_nodes]
        ngot.nodes_dic = new_nodes
        ngot.props.number_of_ngot_nodes = len(ngot.nodes_dic)
        # result info
        print("expected static n per interval ",
              ngot.props.n_nodes, " per interval in i ", len(
                  ngot.props.selected_time_ids), " intervals")
        print("result n for each interval ",
              ngot.props.number_of_interval_nodes)
        print("expected dynamic n ngot", ngot.props.number_of_static_nodes_per_interval,
              " <= ont <= i*n", ngot.props.number_of_static_nodes_global)
        print("result ngot n =", len(ngot.nodes_dic))
        # return

        return ngot

    def get_nodes_one_interval(
            self,
            ngot,
            interval_time_id
    ):
        # Node function for interval-graph with one selected time_id
        # get the nodes for a target word from the database
        # PARAM ngot.target_word
        # PARAM ngot.props.number_of_static_nodes_per_interval
        # PARAM interval_time_id is integer and references one of the time-ids
        # RETURNS nodes

        static_nodes_interval = self.db.query(
            'SELECT word2, time_id, score FROM similar_words '
            'WHERE word1=:tw AND word1!=word2 AND time_id=:ti '
            'ORDER BY score DESC '
            'LIMIT :li',
            li=int(ngot.props.number_of_static_nodes_per_interval),
            ti=int(interval_time_id),
            tw=str(ngot.props.target_word)
        )
        # mapping to static ngot nodes
        static_ngot_nodes = []
        for row in static_nodes_interval:
            static_ngot_node = NGOTNode()
            static_ngot_node.id = str(row['word2'])
            static_ngot_node.target_text = str(row['word2'])
            static_ngot_node.weights = [float(row["score"])]
            static_ngot_node.time_ids = [int(row['time_id'])]
            static_ngot_nodes.append(static_ngot_node)

        return static_ngot_nodes

    def get_edges_interval(self, ngot):
        # EDGE Algo for NGOT - Interval
        # Calling method creates an NGoT graph by merging all single graphs in each time-id with the same number of nodes and edges
        # this function contributes the edges of the resulting graph
        # PARAM: ngot.props max paradigms, max edges are the params for the graph per time-slice
        # PARAM: time-ids - the slices in which one graph each is created
        # RETURNS Edges, nodes_filtered, and singletons of ngot
        # IMPLEMENTATION Several queries per timeid to the DB are too expensive. Thus, all edges are requested in one go.

        # Params and Vars ##############################################################
        # Params in
        nodes = ngot.nodes_dic
        max_edges = ngot.props.number_of_static_directed_edges_per_interval
        time_ids = ngot.props.selected_time_ids
        remove_singletons = ngot.props.remove_singletons

        # RETURN-VARS for NGOT
        ngot_links = []
        links_dic = []
        singletons = []
        # in case remove singletons has been selected
        nodes_dic_filtered = []

        # HILFSVARIABLEN -----------------------------
        # raw tmp edges from DB as (static) NGOTLinks with one time-interval
        tmp_ngot_links = []
        # various datastructures for easier handling
        nodes_filtered = []
        node_dic = {}
        node_list = []
        for node in nodes:
            node_list.append(node[0])
            node_dic[node[0]] = node[1]

        # STATIC EDGES over all time-ids ##############################################

        con = self.db.query(
            'SELECT word1, word2, score, time_id '
            'FROM similar_words '
            'WHERE word1 IN :nodes AND word2 IN :nodes AND time_id IN :time_ids '
            'ORDER BY score DESC',
            nodes=node_list,
            time_ids=time_ids
        )

        # prepare var for allocating edges top down up until local max per slice is reached
        con_dic = {}
        for time_id in time_ids:
            con_dic[time_id] = []

        # allocate static edges to static dic (in descending order until local edge thresholds reached)

        for row in con:
            word1 = str(row['word1'])
            word2 = str(row['word2'])
            time_id = int(row['time_id'])
            if not word1 == word2 and time_id in time_ids \
                    and word1 in node_dic and word2 in node_dic \
                    and time_id in node_dic[word1]['time_ids'] and time_id in node_dic[word2]['time_ids'] \
                    and len(con_dic[int(row['time_id'])]) < max_edges:

                # count per interval
                con_dic[int(row['time_id'])].append("1")

                # create tmp static NGOT edges from one time-id
                ngot_link = NGOTLink()
                ngot_link.id = str(row['word1']) + "-" + str(
                    row['word2'])
                ngot_link.source = str(row['word1'])
                ngot_link.target = str(row['word2'])
                ngot_link.weights = [float(row['score'])]
                ngot_link.time_ids = [int(row['time_id'])]
                tmp_ngot_links.append(ngot_link)
        # extract number of edges per interval

        ngot.props.number_of_interval_links = []
        for time_id in time_ids:
            ngot.props.number_of_interval_links.append(len(con_dic[time_id]))
        print("expected: directed links per interval ",
              ngot.props.number_of_interval_links)
        print("expected: number of total dir links min ", ngot.props.number_of_static_directed_edges_per_interval,
              " max ", ngot.props.number_of_static_directed_edges_global)

        # ngot-new - convert static to ngot
        ngot_link_dic_temp = {}
        # print(tmp_ngot_links)
        for link in tmp_ngot_links:
            if link.id not in ngot_link_dic_temp:
                ngot_link_dic_temp[link.id] = link
            else:
                ngot_link_dic_temp[link.id].time_ids.append(link.time_ids[0])
                ngot_link_dic_temp[link.id].weights.append(link.weights[0])

        ngot_links = [v for v in ngot_link_dic_temp.values()]
        for link in ngot_links:
            link.weight = max(link.weights)

        # DETERMINE SINGLETONS AND REMOVE FROM NODES IF SELECTED ############################
        links_dic = [
            [link.source, link.target, dataclasses.asdict(link)] for link in ngot_links]

        # # create edge-node list
        edge_node_set = {k[0]
                         for k in links_dic}.union({k[1] for k in links_dic})
        # # filter out the singletons (ie those nodes that have no connecting edge)
        singleton_set = set(node_list) - edge_node_set

        # remove singletons from nodes - if parameter = true
        if remove_singletons:
            for node in nodes:
                if node[0] in edge_node_set:
                    nodes_filtered.append(node)
            nodes_dic_filtered = nodes_filtered
        else:
            nodes_dic_filtered = nodes

        # return singletons als liste
        singletons = list(singleton_set)
        # RETURN values and lists ##################################################
        ngot.singletons = singletons
        ngot.links = ngot_links
        ngot.links_dic = links_dic
        ngot.number_of_ngot_directed_edges = len(links_dic)
        ngot.nodes_dic = nodes_dic_filtered
        ngot.nodes = map_nodes_dic_2_ngot(ngot.nodes_dic)
        print("result: Anzahl NGOT directed links :", len(links_dic))
        # print(ngot_links)

        return ngot

# ---------------------- GRAPH ALGORITHM NGOT DYNAMIC/OVERLAY -------------------------------------------

    def get_nodes_overlay(
            self,
            ngot
    ):
        # NGOT-CENTRIC node function for all graph-algos
        # has been previously called overlay or also dynamic
        # get the nodes for a target word from the database
        # PARAM target_word is str
        # PARAM max_paradigms
        # PARAM selected_time_ids is int-array
        # RETURNS nodes

        ngot_nodes = []
        raw_links = self.db.query(
            'SELECT word2, time_id, score FROM similar_words '
            'WHERE word1=:tw AND word1!=word2 '
            'ORDER BY score DESC',
            tw=str(ngot.props.target_word)
        )
        time_dic = {}
        for time_id in ngot.props.selected_time_ids:
            time_dic[time_id] = 0
        for row in raw_links:
            exists = False
            if int(row['time_id']) in ngot.props.selected_time_ids and len(ngot_nodes) < int(ngot.props.number_of_ngot_nodes):
                for node in ngot_nodes:
                    if node.id == str(row['word2']):
                        exists = True
                        if not int(row["time_id"]) in node.time_ids:
                            # new data
                            node.time_ids.append(int(row['time_id']))
                            time_dic[int(row['time_id'])] += 1
                            node.weights.append(float(row['score']))

                if not exists:
                    ngot_node = NGOTNode()
                    ngot_node.id = str(row['word2'])
                    ngot_node.target_text = str(row['word2'])
                    ngot_node.weights = [float(row["score"])]
                    ngot_node.time_ids = [int(row['time_id'])]
                    time_dic[int(row['time_id'])] += 1
                    ngot_nodes.append(ngot_node)
        # update max
        for node in ngot_nodes:
            node.weight = max(node.weights)
        # count values per time-interval
        ngot.props.number_of_interval_nodes = [v for v in time_dic.values()]
        print("result: static nodes per interval ",
              ngot.props.number_of_interval_nodes)
        ngot.props.number_of_static_nodes_global = sum(
            ngot.props.number_of_interval_nodes)
        print("result: static nodes global ",
              ngot.props.number_of_static_nodes_global)
        # map to nodes_dic
        nodes_dic = [[node.id, dataclasses.asdict(
            node)] for node in ngot_nodes]
        # assign results
        ngot.nodes = ngot_nodes
        ngot.nodes_dic = nodes_dic
        # print(nodes_dic)
        # return
        return ngot

    def get_edges_overlay(self, ngot):
        # EDGE ALGORITHM FOR NGOT-Overlay
        # achieves fixed ngot-overlay by allocating static edges until ngot-threshold reached
        # uses the maximal possible number of edges to fulfil requirement (last one before threshold+1)
        # ------------------
        # params
        nodes = ngot.nodes_dic
        max_edges = ngot.props.number_of_ngot_directed_edges
        time_ids = ngot.props.selected_time_ids
        remove_singletons = ngot.props.remove_singletons
        # Hilfsvariablen
        edges = []
        connections = []
        node_list = []
        singletons = []
        node_dic = {}
        i = ngot.props.number_of_intervals
        print("number intervals", i)
        print("ngot overlay param in max_ed", max_edges)
        for node in nodes:
            node_list.append(node[0])
            node_dic[node[0]] = node[1]

        # QUERY ALL DIRECTED EDGES THAT FULFIL BASIC CRITERIA (WORD1, WORD2, in Selected Time-ids) in ALL SELECTED TIME-IDS
        con = self.db.query(
            'SELECT word1, word2, score, time_id '
            'FROM similar_words '
            'WHERE word1 IN :nodes AND word2 IN :nodes AND time_id IN :time_ids '
            'ORDER BY score DESC',
            nodes=node_list,
            time_ids=time_ids
        )
        # get all // alternativ restrict already here: to  global_max = max_edges * i
        for row in con:
            if not str(row['word1']) == str(row['word2']) and int(row['time_id']) in time_ids:
                # and len(connections)<int(global_max):
                connections.append([str(row['word1']), str(
                    row['word2']), float(row['score']), int(row['time_id'])])
        print("ngot overlay all possible directed edges", len(connections))

        # filter global max-set of edges by those which correspond to the more specific time-ids of teh nodes
        # REDUCTION1: begin time overlay process of edges
        potential_edges = {}
        singletons = []
        for c in connections:
            try:
                if c[3] in node_dic[c[0]]["time_ids"] and c[3] in node_dic[c[1]]["time_ids"]:

                    if (c[0], c[1]) not in potential_edges:
                        potential_edges[(c[0], c[1])] = ([c[2]], [c[3]])
                    else:
                        potential_edges[(c[0], c[1])][0].append(c[2])
                        potential_edges[(c[0], c[1])][1].append(c[3])
            except:
                continue
        print("potential directed time-overlayd edges", len(potential_edges))

        # REDUCTION2: reduce max undirected edges to the number of global overlay undirected edges = max_edges in total
        overlay = []
        for key in potential_edges.keys():
            if ((key[0], key[1]) in overlay or (key[1], key[0]) in overlay):
                continue
            else:
                overlay.append((key[0], key[1]))

        # shorten overlay to max global (time-overlaid) length
        undirected = int((max_edges+1)/2)
        # check that is not larger than all potential edges (check macht klarer)
        if undirected > int((len(potential_edges)+1)/2):
            undirected = int((len(potential_edges)+1)/2)
        overlay = overlay[:undirected]
        print("overlay UNDIRECTED laenge adated to available edges", len(overlay))
        # trim potential edges to values in overlay (which is shortened already)
        potential_edges_new = {}
        for key, value in potential_edges.items():
            if (key[0], key[1]) in overlay or (key[1], key[0]) in overlay:
                potential_edges_new[key] = value

        print("new time-overlaid directed edges", len(potential_edges_new))

        # map to edge format
        for k, v in potential_edges_new.items():
            edges.append((k[0], k[1], {'weight': max(
                v[0]), 'weights': v[0], 'time_ids': v[1], 'source_text': k[0], 'target_text': k[1]}))

        # find the singletons (ie those nodes that have no connecting edge)
        for n in node_list:
            exists = False
            for k, v in potential_edges_new.items():
                if n == k[0] or n == k[1]:
                    exists = True
            if not exists:
                singletons.append(n)
                # filter out singletons
                if (ngot.props.remove_singletons):
                    for node in nodes:
                        if n == node[0]:
                            nodes.remove(node)
        singletons = list(singletons)
        #

        # assign
        ngot.nodes_dic = nodes
        ngot.nodes = map_nodes_dic_2_ngot(nodes)
        ngot.singletons = singletons
        ngot.links_dic = edges
        ngot.links = map_edges_dic_2_ngot(ngot.links_dic)

        # determine links per interval
        time_dic = {}
        sum_of_links = 0
        for time_id in ngot.props.selected_time_ids:
            time_dic[time_id] = 0
        for link in ngot.links:
            for time_id in link.time_ids:
                time_dic[time_id] += 1
        ngot.props.number_of_interval_links = [v for v in time_dic.values()]
        print("result static links per interval ",
              ngot.props.number_of_interval_links)
        ngot.props.number_of_static_directed_edges_global = sum(
            ngot.props.number_of_interval_links)
        print("result static links global ",
              ngot.props.number_of_static_directed_edges_global)
        print("--------- end edges ------------- ngot fixed ")
        # print(ngot)
        return ngot

# ---------------------------- GLOBAL EDGES -------------------------------------------------------------------
    def get_edges_global_scaled(self, ngot):
        # EDGE Algo for NGOT - Interval
        # Calling method creates an NGoT graph by merging all single graphs in each time-id with the same number of nodes and edges
        # this function contributes the edges of the resulting graph
        # PARAM: ngot.props max paradigms, max edges are the params for the graph per time-slice
        # PARAM: time-ids - the slices in which one graph each is created
        # RETURNS Edges, nodes_filtered, and singletons of ngot
        # IMPLEMENTATION Several queries per timeid to the DB are too expensive. Thus, all edges are requested in one go.

        # Params and Vars ##############################################################
        # Params in
        nodes = ngot.nodes_dic
        max_edges = ngot.props.number_of_static_directed_edges_global
        time_ids = ngot.props.selected_time_ids
        remove_singletons = ngot.props.remove_singletons

        # RETURN-VARS for NGOT
        ngot_links = []
        links_dic = []
        singletons = []
        # in case remove singletons has been selected
        nodes_dic_filtered = []

        # HILFSVARIABLEN -----------------------------
        # raw tmp edges from DB as (static) NGOTLinks with one time-interval
        tmp_ngot_links = []
        # various datastructures for easier handling
        nodes_filtered = []
        node_dic = {}
        node_list = []
        for node in nodes:
            node_list.append(node[0])
            node_dic[node[0]] = node[1]

        # STATIC EDGES over all time-ids ##############################################

        con = self.db.query(
            'SELECT word1, word2, score, time_id '
            'FROM similar_words '
            'WHERE word1 IN :nodes AND word2 IN :nodes AND time_id IN :time_ids '
            'ORDER BY score DESC',
            nodes=node_list,
            time_ids=time_ids
        )

        # prepare var for allocating edges top down up until local max per slice is reached
        con_dic = {}
        for time_id in time_ids:
            con_dic[time_id] = []

        # allocate static edges to static dic (in descending order until local edge thresholds reached)

        for row in con:
            word1 = str(row['word1'])
            word2 = str(row['word2'])
            time_id = int(row['time_id'])
            if not word1 == word2 and time_id in time_ids \
                    and word1 in node_dic and word2 in node_dic \
                    and time_id in node_dic[word1]['time_ids'] and time_id in node_dic[word2]['time_ids'] \
                    and len(tmp_ngot_links) < max_edges:

                # count per interval
                con_dic[int(row['time_id'])].append("1")

                # create tmp static NGOT edges from one time-id
                ngot_link = NGOTLink()
                ngot_link.id = str(row['word1']) + "-" + str(
                    row['word2'])
                ngot_link.source = str(row['word1'])
                ngot_link.target = str(row['word2'])
                ngot_link.weights = [float(row['score'])]
                ngot_link.time_ids = [int(row['time_id'])]
                tmp_ngot_links.append(ngot_link)
        # extract number of edges per interval

        ngot.props.number_of_interval_links = []
        for time_id in time_ids:
            ngot.props.number_of_interval_links.append(len(con_dic[time_id]))

        # ngot-new - convert static to ngot
        ngot_link_dic_temp = {}
        # print(tmp_ngot_links)
        for link in tmp_ngot_links:
            if link.id not in ngot_link_dic_temp:
                ngot_link_dic_temp[link.id] = link
            else:
                ngot_link_dic_temp[link.id].time_ids.append(link.time_ids[0])
                ngot_link_dic_temp[link.id].weights.append(link.weights[0])

        ngot_links = [v for v in ngot_link_dic_temp.values()]
        for link in ngot_links:
            link.weight = max(link.weights)

        # DETERMINE SINGLETONS AND REMOVE FROM NODES IF SELECTED ############################
        links_dic = [
            [link.source, link.target, dataclasses.asdict(link)] for link in ngot_links]

        # # create edge-node list
        edge_node_set = {k[0]
                         for k in links_dic}.union({k[1] for k in links_dic})
        # # filter out the singletons (ie those nodes that have no connecting edge)
        singleton_set = set(node_list) - edge_node_set

        # remove singletons from nodes - if parameter = true
        if remove_singletons:
            for node in nodes:
                if node[0] in edge_node_set:
                    nodes_filtered.append(node)
            nodes_dic_filtered = nodes_filtered
        else:
            nodes_dic_filtered = nodes

        # return singletons als liste
        singletons = list(singleton_set)
        # RETURN values and lists ##################################################
        ngot.singletons = singletons
        ngot.links = ngot_links
        ngot.links_dic = links_dic
        ngot.nodes_dic = nodes_dic_filtered
        ngot.nodes = map_nodes_dic_2_ngot(ngot.nodes_dic)
        ########## results: expected
        # links global
        print("expected: number of static dir links global min 0 max ",
              ngot.props.number_of_static_directed_edges_global)
        print("result static directed links global ",
              sum(ngot.props.number_of_interval_links))
        print("result: directed links per interval ",
              ngot.props.number_of_interval_links)
        # links ngot were not set
        print(" expected ngot links - no expectation")
        ngot.props.number_of_ngot_directed_edges = len(links_dic)
        print("result: Anzahl NGOT directed links :",
              ngot.props.number_of_ngot_directed_edges)
        # nodes ngot were set
        print("expected NGOT nodes ", ngot.props.number_of_ngot_nodes)
        print("result: Anzahl NGOT nodes :",
              len(ngot.nodes))
        # print(ngot_links)

        return ngot


# ---------------------- GRAPH ALGORITHM NGOT GLOBAL -------------------------------------------


    def get_nodes_global(
            self,
            target_word,
            max_paradigms,
            selected_time_ids
    ):
        # sglobal node function - ie searches nodes regardless of overlay or time-interval
        # SCALES PARADIGMS WITH THE NUMBER OF TIME-IDS
        max_paradigms = max_paradigms * len(selected_time_ids)
        # get the nodes for a target word from the database
        # PARAM target_word is str
        # PARAM max_paradigms
        # PARAM selected_time_ids is int-array
        # RETURNS nodes

        nodes = []
        target_word_senses = self.db.query(
            'SELECT word2, time_id, score FROM similar_words '
            'WHERE word1=:tw AND word1!=word2 '
            'ORDER BY score DESC',
            tw=target_word
        )
        fullNodeCounter = 0
        for row in target_word_senses:
            exists = False
            if int(row['time_id']) in selected_time_ids and fullNodeCounter < max_paradigms:
                for node in nodes:
                    if node[0] == str(row['word2']):
                        exists = True
                        if not int(row["time_id"]) in node[1]["time_ids"]:
                            node[1]["time_ids"].append(int(row['time_id']))
                            node[1]["weights"].append(float(row['score']))
                            fullNodeCounter += 1

                if not exists:
                    nodes.append([str(row['word2']), {"time_ids": [int(row['time_id'])], "weights": [
                                 float(row["score"])], "target_text": str(row['word2'])}])
                    fullNodeCounter += 1
        print("ngot global all single nodes ", fullNodeCounter)
        print("ngot global overlaid resulting nodes ", len(nodes))
        return nodes


# FEATURES ---------------------------------------------------------------------------------------------


    def get_features(self, word1: str, time_id: int) -> Dict[str, float]:

        features: Dict(str, float) = {}
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


# ----------- DEPRECATED --------------------------------------------------------------------------------

    def get_edges_global_scaled_old(self, ngot):
        # edge function global -scaled for ngot global and ngot overlay-global
        # TODO needs updating
        # This queries and counts all single directed edges
        # There were THREE problems with this algorithm -- TODO DOUBLECHECK WHETHER THEY STILL EXIST
        # 1. Massive problem it does not scale with the the number of time-ids
        # !! Attention this was probably NOT intended !! This algorithm is problemati!!!
        # This has been temporarily solved in the frontend - by scaling max_edges for the graph-type "max_across_slices" by factor i
        # There is also a second problem:
        # 2. Edges can be set independent of time_ids
        # this can result in node1 from time2, node 2 from time4, and edge from time5 (ie pseudo-nodes)
        # this results in "invisible nodes" (ie node from time5 is implicitly present due to edge from that id)
        # 3. Data-Structure - singleton information that is filtered out - deletes nodes from datastructre (this is not a good idea)
        # Param: nodes
        # Para: max_edges = Supremum of Cardinality of Set of Edges
        # Param: time_ids
        nodes = ngot.nodes_dic
        max_edges = ngot.props.number_of_static_directed_edges_global
        time_ids = ngot.props.selected_time_ids
        remove_singletons = ngot.props.remove_singletons

        #
        edges = []
        connections = []
        node_list = []
        singletons = []
        print("expected static undirected edges global", max_edges)

        for node in nodes:
            node_list.append(node[0])

        con = self.db.query(
            'SELECT word1, word2, score, time_id '
            'FROM similar_words '
            'WHERE word1 IN :nodes AND word2 IN :nodes '
            'ORDER BY score DESC',
            nodes=node_list
        )

        # get global maximum of edges - max edges
        for row in con:
            if not str(row['word1']) == str(row['word2']) and int(row['time_id']) in time_ids \
                    and len(connections) < int(max_edges):
                connections.append([str(row['word1']), str(
                    row['word2']), float(row['score']), int(row['time_id'])])

        # filter global max-set of edges by those MAX-TIME-IDS CONNECTIONS that connect two nodes in graph globally (regardless of time-ids of nodes..)
        potential_edges = {}
        singletons = []
        for c in connections:
            if c[0] in node_list and c[1] in node_list:
                # if there is no edge yet, append it -- RESULTS IN MAX ONLY EDGE WHICH MAY HAVE A TIME_ID DIFFERENT TO NODES
                # print(node_dic[c[0]])
                if (c[0], c[1]) not in potential_edges:
                    potential_edges[(c[0], c[1])] = (c[2], c[3])
        # print("filtered set of potential_edges", potential_edges)
        # map to edge format
        for k, v in potential_edges.items():
            edges.append((k[0], k[1], {'weight': v[0], 'weights': [v[0]], 'time_ids': [
                         v[1]], 'source_text': k[0], 'target_text': k[1]}))
        # filter out the singletons (ie those nodes that have no connecting edge)
        for n in node_list:
            exists = False
            for k, v in potential_edges.items():
                if n == k[0] or n == k[1]:
                    exists = True
            if not exists:
                singletons.append(n)
                # removes singletons from graph
                if (remove_singletons):
                    for node in nodes:
                        if n == node[0]:
                            nodes.remove(node)
        singletons = list(singletons)
        # assign
        ngot.nodes_dic = nodes
        ngot.nodes = map_nodes_dic_2_ngot(nodes)
        ngot.singletons = singletons
        ngot.links_dic = edges
        ngot.links = map_edges_dic_2_ngot(ngot.links_dic)
        print(edges)
        # determine links per interval
        time_dic = {}
        for time_id in ngot.props.selected_time_ids:
            time_dic[time_id] = 0
        for link in ngot.links:
            for time_id in link.time_ids:
                time_dic[time_id] += 1
        ngot.props.number_of_interval_links = [v for v in time_dic.values()]
        print("result static links per interval ",
              ngot.props.number_of_interval_links)
        ngot.props.number_of_static_directed_edges_global = sum(
            ngot.props.number_of_interval_links)
        print("result static links global ",
              ngot.props.number_of_static_directed_edges_global)
        print("--------- end edges ------------- ngot fixed ")

        print("max across slices filters out overlay edges!!! -> count of dir edges = overlayd directed edges")
        return ngot
