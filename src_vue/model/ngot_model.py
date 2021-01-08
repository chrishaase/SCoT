from dataclasses import dataclass, field, asdict
from dataclasses_json import dataclass_json
from typing import List, Dict, Optional
from flask_sqlalchemy import SQLAlchemy

"""  
This defines the model of the clustered neighbourhood graph over time
It dynamically merges a number of static nodes and edges
The same model is used in the fronted
The transfer-format is JSON - dataclass-json decorators are used for serialization and deserialization
Deep copies of the model are provided to different additional frameworks for manipulation (ie d3 and networkx)
"""


@dataclass_json
@dataclass()
class NGOTNode:
    # new format for nodes - this is compatible to all usages in Python, networkx, Vue, D3
    # networkx and d3 require a dic-format
    # mapping to format of dictionary nodes simple:
    # [[node.id, dataclasses.asdict(node)] for node in ngot_nodes]
    id: Optional[str] = None
    target_text: Optional[str] = None
    # max weight as main derived from weights
    weight: Optional[int] = None
    # overlay data information
    time_ids: List[int] = None
    weights: List[float] = None
    # calculated scores and clusters
    centrality_score: Optional[float] = None
    cluster_id: Optional[int] = None
    # display - values can be tweaked in frontend
    x: Optional[float] = None
    y: Optional[float] = None
    # fixed x and y
    fx: Optional[float] = None
    fy: Optional[float] = None
    # color and opacity can change during various interactions
    colour: Optional[float] = None
    opacity: Optional[float] = None
    hidden: Optional[bool] = None


@dataclass_json
@dataclass()
class NGOTLink():
    # new format for links - this is compatible to all usages in Python, networkx, Vue, D3
    # networkx and d3 require a dic-format
    # easy mapping puts all these elements into array/dictionary. use following function
    # [link.source, link.target, dataclasses.asdict(link)] for link in ngot_links]
    # id is source + "-" + target String [diese kombination kann nur einmal pro Graph vorkommen - da ngot links overlaid sind]
    id: Optional[str] = None
    # node is s von source und target
    source: Optional[str] = None
    target: Optional[str] = None
    # max weight
    weight: Optional[float] = None
    # time ids and weights
    time_ids: List[int] = None
    weights: List[float] = None
    # color and opacity can change during various interactions
    colour: Optional[float] = None
    opacity: Optional[float] = None
    hidden: Optional[bool] = None
    # No Positional data as these depend on nodes


@dataclass_json
@dataclass()
class NGOTCluster:
    id: Optional[int] = None
    # changeable by user
    name: Optional[str] = None
    # Display
    colour: Optional[int] = None
    # data information with IDs [-> can be used as labels]
    cluster_nodes: List[str] = None
    # edges between cluster nodes with IDs [-> for coloring]
    cluster_links: List[str] = None
    # default: special cluster node for displaying cluster - IT IS STORED ONLY HERE!!!!
    label_node: Optional[NGOTNode] = None
    # connecting edges from the label_node to all cluster_nodes
    edges_label_node: List[NGOTLink] = None
    # show yes no
    show_label_node: bool = False


@dataclass_json
@dataclass()
class NGOTProperties:
    # NGOT Parameters managed by front- and back-end
    # All parameters, except those labelled as "result" are managed by the front-end
    # Result refers to the results of NGoT-building
    #  Definition:
    # ngot/dynamic refers to the ngot - merging methods[an edge with several time-ids]
    # static refers to the static graph per interval [one static edge= in one interval]
    # parameter interval-data
    collection_key: Optional[str] = None
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    # graph props
    target_word: Optional[str] = None
    number_of_intervals: Optional[int] = None
    selected_time_ids: List[int] = None
    # field(default_factory=[None])
    # graph params basic
    # parameter d - only relevant in frontend where it is resolved to e
    density: Optional[float] = None
    # parameter n
    n_nodes: Optional[int] = None
    # parameter e - edges [precalculated from density in frontend according to graph-type]
    # e is used in backend
    e_edges: Optional[int] = None
    # parameter graph type - determines what n and d refer to exactly
    graph_type: Optional[str] = None
    # ---------------------------------------------------------------
    # set and resulting parameters per graph-type
    # depending on graph-type some parameters are either used as in-param
    # or out-param
    # ---------------------------
    # ngot-interval: set [computed array for global and dynamic - see below]
    number_of_static_nodes_per_interval: Optional[int] = None
    number_of_static_directed_edges_per_interval: Optional[int] = None
    # derived props for global and overlay [numbers can vary per interval...]
    number_of_interval_nodes: List[int] = None
    number_of_interval_links: List[int] = None
    # ----------------------------
    # ngot-global: set, ngot-dynamic: result, ngot-interval: result
    # scaled with i[ie this refers to the global total]
    number_of_static_nodes_global: Optional[int] = None
    number_of_static_directed_edges_global: Optional[int] = None
    # ----------------------------
    # ngot-dynamic: set, ngot-global: result, ngot-interval: result
    number_of_ngot_nodes: Optional[int] = None
    # attention we count directed overlaid edges here!
    number_of_ngot_directed_edges: Optional[int] = None
    # max and min expected for ngot for testing
    # if graph = interval then number of static nodes per int. <= number of ngot nodes <= number of static nodes p. int * i
    # if graph = interval then number of satic edges per int. <= number of ngot edges <= number of static edges p. int * i
    # if graph = global then number of static nodes global / i <= number of ngot nodes <= number of static nodes global
    # if graph = global then number of static edges global / i <= number of ngot edges <= number of static edges global
    # SPECIAL SETTING ------------------------------------------------
    # Do not change if not necessary
    remove_singletons: bool = False


@dataclass_json
@dataclass()
class NGOT():
    # the central properties of the graph - managed by Vue and by python
    props: NGOTProperties = None
    # the main node list as managed by python and the vue-framework and d3 and sent via json
    nodes: List[NGOTNode] = None
    # the temporary backend-only node list for input to networkx and some old graph-functions is a simple conversion into dictionary-form
    nodes_dic: List[None] = None
    # the main link list as managed by python and the vue-framework and d3 and sent via json
    links: List[NGOTLink] = None
    # the temporary backend onlylist for input to networkx and some old graph-functions is a simple conversion into dictionary-form
    links_dic: List[None] = None
    # list with ids of singleton nodes [they are part of nodes] managed by python and vue
    singletons: List[str] = None
    # the main datastructure for clusters managed by python and vue
    clusters: List[NGOTCluster] = None
    # list with ids of transitlinks [they are part of links] managed by vue, colored grey by d3
    transit_links: List[str] = None
