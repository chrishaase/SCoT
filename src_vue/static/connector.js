/**
 * The functions in this connector module
 * handle VIA AXIOS (which resolves json well)
 * (1) initial prop queries
 * (2) graph-crud queries
 * (3) additional feature information
 * VIA FILE IO
 * (4) the saving and loading of teh graph-model to json local files
 */

// (1) INITIAL PROPS FOR APP
async function getCollections_io() {
  try {
    const res = await axios.get("./api/collections");
    vueApp.collections = res.data;
    vueApp.collections_names = Object.keys(vueApp.collections);
    vueApp.collection_name = vueApp.collections_names[0];
    vueApp.getGraphTypes();
    vueApp.onChangeDb();
  } catch (error) {
    console.error(error);
  }
}

/**
 * (2) GRAPH-CRUD
 */

// create
// Graph create - get initial data (you need to send the props to the backend for creating it)
async function getData_io() {
  const url = "./api/collections/sense_graph";
  try {
    let res = await axios.post(url, graph.props);
    let data_from_db = res.data;
    // attach to graph - assign per nested object
    graph.nodes = data_from_db.nodes;
    graph.links = data_from_db.links;
    graph.singletons = data_from_db.singletons;
    graph.props = data_from_db.props;
    graph.clusters = data_from_db.clusters;
    graph.transit_links = data_from_db.transit_links;
    // clean up of data - python cannot use the reserved word "class"
    // execute mapping to node attribute "class" : "cluster_id" -> "class"
    for (let node of graph.nodes) {
      node.class = node.cluster_id;
    }
    // copy target and source to source-Text and target-text: d3 force is working on them
    for (let link of graph.links) {
      link.target_text = link.target;
      link.source_text = link.source;
    }
    // log original data
    console.log("node data axios received ", graph.nodes);
    console.log("link data axios received ", graph.links);
    console.log("prop data axios received ", graph.props);
    console.log("cluster data axios received ", graph.clusters);
    console.log("transit links data axios received ", graph.transit_links);
    console.log("singleton data axios received ", graph.singletons);
    console.log("end of getData_io");
    // // link graph.singletons to app
    vueApp.singletons = data_from_db.singletons;
    vueApp.graph_clusters = data_from_db.clusters;
    // prep cluster data
    for (let cluster of vueApp.graph_clusters) {
      cluster.colour = color(cluster.cluster_id);
      cluster.opacity = vueApp.node_fill_opacity;
    }
    // and deep copy of links to d3 - it works on these data and modifies them
    d3Data.links = JSON.parse(JSON.stringify(graph.links));
    // create node and link dics for calculations
    vueApp.node_dic = {};
    for (let node of graph.nodes) {
      vueApp.node_dic[node.id] = node;
    }
    vueApp.link_dic = {};
    for (let link of graph.links) {
      vueApp.link_dic[link.id] = link;
    }
    vueApp.cluster_dic = {};
    for (let cluster of graph.clusters) {
      vueApp.cluster_dic[cluster.cluster_id] = cluster;
    }
    // set first active node
  } catch (error) {
    console.log(error);
    if (error.response.status >= 500) {
      alert(error + "\nPlease try a different target word.");
    }
  }
  return "ok";
}

/**
 * UPDATE GRAPH --------------------------------------------
 */
async function recluster_io() {
  // chose type of reclustering
  // this api is for automatic reclustering with chinese whispers
  let url = "./api/reclustering";
  return recluster_with_url(url);
}

async function manual_recluster_io() {
  // chose type of reclustering
  // this api is for an update of the graph after manual reclustering in the frontend
  let url = "./api/manualreclustering";
  let clusters_old = JSON.parse(JSON.stringify(vueApp.graph_clusters));
  await recluster_with_url(url);
  for (let cluster1 of clusters_old) {
    for (let cluster2 of vueApp.graph_clusters) {
      if (cluster1.cluster_id === cluster2.cluster_id) {
        cluster2.cluster_name = cluster1.cluster_name;
        cluster2.add_cluster_node = cluster1.add_cluster_node;
        console.log("cluster2.cluster_name");
      }
    }
  }
  console.log(clusters_old, vueApp.graph_clusters);
  graph.clusters = JSON.parse(JSON.stringify(vueApp.graph_clusters));
  vueApp.applyClusterSettings();
}

async function recluster_with_url(url) {
  if (vueApp.highlightWobblies === true) {
    vueApp.resetCentralityHighlighting();
    vueApp.highlightWobblies = false;
  }
  // remove cluster links and cluster nodes
  let newLinks = d3Data.links.filter((d) => d.cluster_link == false);
  graph.links = JSON.parse(JSON.stringify(newLinks));

  let newnodes = graph.nodes.filter((d) => d.cluster_node == false);
  graph.nodes = newnodes;

  // Repair d3 changes
  for (let link of graph.links) {
    link.target = link.target_text;
    link.source = link.source_text;
    link.colour = null;
  }

  for (let node of graph.nodes) {
    node.class = null;
    node.colour = null;
  }

  // prepare data to send
  let data = {};
  data["nodes"] = graph.nodes;
  data["links"] = graph.links;
  data["singletons"] = graph.singletons;
  data["props"] = graph.props;

  try {
    const response = await axios.post(url, data);

    // NEW REFACTORED
    let data_from_db = response.data;
    // attach to graph updates relevant for clusters
    // nodes contain new cluster ids
    console.log("-----------in recevied reclustering----------------");
    for (let node of data_from_db.nodes) {
      node.class = node.cluster_id;
    }
    graph.nodes = data_from_db.nodes;
    graph.links = data_from_db.links;
    graph.clusters = data_from_db.clusters;
    graph.transit_links = data_from_db.transit_links;
    console.log(graph.clusters);
    // rescue target and source
    for (let link of graph.links) {
      link.target_text = link.target;
      link.source_text = link.source;
    }
    // update links
    d3Data.links = JSON.parse(JSON.stringify(graph.links));
    // update cluster data
    vueApp.graph_clusters = data_from_db.clusters;
    // prep cluster data
    for (let cluster of vueApp.graph_clusters) {
      cluster.colour = color(cluster.cluster_id);
      cluster.opacity = vueApp.node_fill_opacity;
    }
  } catch (error) {
    console.log(error);
  }
  console.log("in recluster ende");
  return "ok";
}

/**
 * ADDITIONAL INFORMATION ----------------
 * @param {} wort1
 * @param {*} wort2
 */
// Features

function getSimBims_io() {
  vueApp.busy_right1 = true;
  let retArray = [];
  let data = {};
  data["word1"] = vueApp.active_edge.source_text;
  data["word2"] = vueApp.active_edge.target_text;
  data["time_id"] = vueApp.active_edge.time_ids[0];

  let url = "./api/collections/" + vueApp.collection_key + "/simbim";
  console.log(url);
  axios
    .post(url, data)
    .then((res) => {
      let ret = [];
      if (res.data["error"] == "none") {
        for (let key in res.data) {
          if (key != "error") {
            let dati = res.data[key];
            let retObj = {};
            retObj.node1 = parseFloat(dati["score"]).toFixed(5);
            retObj.edge = dati["key"];
            retObj.node2 = parseFloat(dati["score2"]).toFixed(5);
            ret.push(retObj);
          }
        }
      }

      vueApp.simbim_object = ret;
      vueApp.busy_right1 = false;
    })
    .catch((error) => {
      console.error(error);
    });
}

// Example sentences
function docSearch_io(wort1, wort2) {
  vueApp.context_mode4 = true;
  vueApp.busy_right4 = true;
  let data = {};
  data["jo"] = wort1;
  data["bim"] = wort2;
  data["collection_key"] = vueApp.collection_key;

  console.log("selected", data["jo"], data["bim"]);
  let url = "./api/collections/" + vueApp.collection_key + "/documents";
  console.log(url);
  axios.post(url, data).then((res) => {
    console.log(res);
    vueApp.documents = res.data["docs"];
    console.log(vueApp.documents);
    vueApp.busy_right4 = false;
  }); // end then
}

/**
 * LOAD AND SAVE GRAPH TO JSON
 */

function saveGraph_io() {
  let data = JSON.stringify(graph, null, 2);
  let blob = new Blob([data], { type: "text/plain" });
  console.log(blob);

  const a = document.createElement("a");
  document.body.appendChild(a);
  const url = window.URL.createObjectURL(blob);
  a.href = url;
  a.download =
    graph.props.target_word +
    "_" +
    graph.props.n_nodes +
    "_" +
    graph.props.density +
    "_" +
    graph.props.graph_type +
    ".json";
  a.click();
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 0);
}

function loadGraph_io() {
  document.getElementById("loadpopup").style.display = "none";
  vueApp.overlay_main = true;
  const file = vueApp.file;
  const reader = new FileReader();
  console.log("in load graph");
  let data_from_db;

  reader.onload = function (e) {
    data_from_db = JSON.parse(reader.result);
    console.log("in parsed with", data_from_db);

    // attach to graph - assign per nested object
    graph.nodes = data_from_db.nodes;
    graph.links = data_from_db.links;
    graph.singletons = data_from_db.singletons;
    graph.props = data_from_db.props;
    graph.clusters = data_from_db.clusters;
    graph.transit_links = data_from_db.transit_links;

    // new copy back to vue app props
    vueApp.collection_key = graph.props["collection_key"];
    vueApp.start_year = graph.props["start_year"];
    vueApp.end_year = graph.props["end_year"];

    // user input: graph props
    vueApp.target_word = graph.props["target_word"];
    vueApp.graph_type_keys[vueApp.graph_type] = graph.props["graph_type"];
    vueApp.n_nodes = graph.props["n_nodes"];
    vueApp.density = graph.props["density"];

    // clean up of data - python cannot use the reserved word "class"
    // execute mapping to node attribute "class" : "cluster_id" -> "class"
    for (let node of graph.nodes) {
      node.class = node.cluster_id;
    }
    // copy target and source to source-Text and target-text: d3 force is working on them
    for (let link of graph.links) {
      link.target_text = link.target;
      link.source_text = link.source;
    }
    // log original data
    console.log("node data received ", graph.nodes);
    console.log("link data received ", graph.links);
    console.log("prop data received ", graph.props);
    console.log("cluster received ", graph.clusters);
    console.log("transit links data received ", graph.transit_links);
    console.log("singleton data received ", graph.singletons);
    console.log("end of getData_io");
    // // link graph.singletons to app
    vueApp.singletons = data_from_db.singletons;
    vueApp.graph_clusters = data_from_db.clusters;
    // prep cluster data
    for (let cluster of vueApp.graph_clusters) {
      cluster.colour = color(cluster.cluster_id);
      cluster.opacity = vueApp.node_fill_opacity;
    }
    // and deep copy of links to d3 - it works on these data and modifies them
    d3Data.links = JSON.parse(JSON.stringify(graph.links));
    delete_graph();
    graph_init();
    graph_crud(graph.nodes, d3Data.links, vueApp.graph_clusters);
    sticky_change_d3();
    vueApp.graph_rendered = true;
    vueApp.overlay_main = false;
  };
  console.log(vueApp.file);
  reader.readAsText(vueApp.file);
}
