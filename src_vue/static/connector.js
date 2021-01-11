function getCollections_io() {
  axios
    .get("./api/collections")
    .then((res) => {
      console.log(res.data);
      vueApp.collections = res.data;
      vueApp.collections_names = Object.keys(vueApp.collections);
      vueApp.collection_name = vueApp.collections_names[0];
      vueApp.getGraphTypes();
      vueApp.onChangeDb();
    })
    .catch((error) => {
      console.error(error);
    });
}

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

function update_io() {
  console.log("called update --------------------------------------------");
  let target_word = vueApp.target_word;
  let start_year = vueApp.start_year;
  let end_year = vueApp.end_year;
  let senses = vueApp.update_senses;
  let edges = vueApp.update_edges;
  // let time_diff = vueApp.time_diff;

  vueApp.time_diff = false;
  let url =
    "./api/collections/" +
    this.collection_key +
    "/sense_graph" +
    "/" +
    target_word +
    "/" +
    start_year +
    "/" +
    end_year +
    "/" +
    senses +
    "/" +
    edges;

  return axios
    .get(url)
    .then((res) => {
      let data_from_db = res.data;
      vueApp.updated_nodes = data_from_db[0].nodes;

      vueApp.updated_links = data_from_db[0].links;

      graph.singletons = data_from_db[2].singletons;
      vueApp.singletons = data_from_db[2].singletons;
    })
    .catch((error) => {
      console.error(error);
    });
}

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

async function recluster_io() {
  if (vueApp.highlightWobblies === true) {
    vueApp.resetCentralityHighlighting();
    vueApp.highlightWobblies = false;
  }
  // Refactored from here: USE NEW DATASTRUCTURE TO READ GRAPH_DATA AND TO RECLUSTER ----------------------
  graph.links = JSON.parse(JSON.stringify(d3Data.links));

  // Repair d3 changes
  for (let link of graph.links) {
    link.target = link.target_text;
    link.source = link.source_text;
    link.colour = null;
  }
  for (let node of graph.nodes) {
    node.class = null;
    node.cluster_id = null;
    node.colour = null;
  }

  // prepare data to send
  let data = {};
  data["nodes"] = graph.nodes;
  data["links"] = graph.links;
  data["singletons"] = graph.singletons;
  data["props"] = graph.props;

  const promise = axios
    .post("./api/reclustering", data)
    .then(function (response) {
      // NEW REFACTORED
      let data_from_db = response.data;
      // attach to graph updates relevant for clusters
      // nodes contain new cluster ids
      // console.log("-----------in recevied reclustering----------------");
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
    })
    .catch(function (error) {
      console.log(error);
    });
  console.log("in recluster ende");
  return promise;
}

async function getData_io() {
  //console.log("graph props before sending", graph.props);

  const url = "./api/collections/sense_graph";

  const promise = axios
    .post(url, graph.props)
    .then((res) => {
      let data_from_db = res.data;
      // attach to graph
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
      // copy target and source to source-Text and target-text: d3 is working on them
      // TODO refactor
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
      // // send reference pointer copy to vue app
      vueApp.singletons = JSON.parse(JSON.stringify(data_from_db.singletons));
      // and deep copy to d3 - it works on these data and modifies them
      d3Data.links = JSON.parse(JSON.stringify(graph.links));
      d3Data.nodes = JSON.parse(JSON.stringify(graph.nodes));
    })
    .catch((error) => {
      console.log(error);
      if (error.response.status >= 500) {
        alert(error + "\nPlease try a different target word.");
      }
    });
  return promise;
}

function saveGraph_io() {
  let svg = d3.select("#svg");

  let links = svg.selectAll(".link");
  let nodes = svg.selectAll(".node");

  let graph_links = [];
  let graph_nodes = [];

  links.selectAll("line").each(function (d, i) {
    let source = this.getAttribute("source");
    let target = this.getAttribute("target");
    let weight = this.getAttribute("weight");
    let colour = this.getAttribute("stroke");
    let link = {};

    link["source"] = source;
    link["target"] = target;
    link["weight"] = weight;
    link["colour"] = colour;

    graph_links.push(link);
  });

  nodes.selectAll("g").each(function (d, i) {
    let x = this.__data__.x;
    let y = this.__data__.y;
    let fx = this.__data__.fx;
    let fy = this.__data__.fy;
    let id = this.__data__.id;
    let cluster_id;
    let cluster_name;
    let is_cluster_node;
    let colour;
    let time_ids;
    let centrality_score;

    let node = {};

    node["id"] = id;
    node["x"] = x;
    node["y"] = y;
    node["fx"] = fx;
    node["fy"] = fy;

    let childnodes = this.childNodes;
    childnodes.forEach(function (d, i) {
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
    });

    graph_nodes.push(node);
  });

  let graphl = {};
  graphl["links"] = graph_links;
  graphl["nodes"] = graph_nodes;
  graphl["singletons"] = graph.singletons;
  graphl["target"] = vueApp.target_word;
  graphl["link_distance"] = vueApp.linkdistance;
  graphl["charge"] = vueApp.charge;
  graphl["start_year"] = vueApp.start_year;
  graphl["end_year"] = vueApp.end_year;
  graphl["time_diff"] = vueApp.time_diff;
  graphl["senses"] = vueApp.senses;
  graphl["edges"] = vueApp.edges;

  let data = JSON.stringify(graphl, null, 2);
  let blob = new Blob([data], { type: "text/plain" });

  const a = document.createElement("a");
  document.body.appendChild(a);
  const url = window.URL.createObjectURL(blob);
  a.href = url;

  if (vueApp.updated_nodes === null && vueApp.updated_links === null) {
    a.download =
      vueApp.target_word + "_" + vueApp.senses + "_" + vueApp.edges + ".json";
  } else {
    a.download =
      vueApp.target_word +
      "_" +
      vueApp.update_senses +
      "_" +
      vueApp.update_edges +
      ".json";
  }

  // TODO What happens if nodes / clusters are deleted?

  //a.download = vueApp.target_word + "_" + graph_nodes.length + "_" + graph_links.length + ".json"

  a.click();
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 0);
}

function saveGraph_io_old() {
  let svg = d3.select("#svg");

  let links = svg.selectAll(".link");
  let nodes = svg.selectAll(".node");

  let graph_links = [];
  let graph_nodes = [];

  links.selectAll("line").each(function (d, i) {
    let source = this.getAttribute("source");
    let target = this.getAttribute("target");
    let weight = this.getAttribute("weight");
    let colour = this.getAttribute("stroke");
    let link = {};

    link["source"] = source;
    link["target"] = target;
    link["weight"] = weight;
    link["colour"] = colour;

    graph_links.push(link);
  });

  nodes.selectAll("g").each(function (d, i) {
    let x = this.__data__.x;
    let y = this.__data__.y;
    let fx = this.__data__.fx;
    let fy = this.__data__.fy;
    let id = this.__data__.id;
    let cluster_id;
    let cluster_name;
    let is_cluster_node;
    let colour;
    let time_ids;
    let centrality_score;

    let node = {};

    node["id"] = id;
    node["x"] = x;
    node["y"] = y;
    node["fx"] = fx;
    node["fy"] = fy;

    let childnodes = this.childNodes;
    childnodes.forEach(function (d, i) {
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
    });

    graph_nodes.push(node);
  });

  let graphl = {};
  graphl["links"] = graph_links;
  graphl["nodes"] = graph_nodes;
  graphl["singletons"] = graph.singletons;
  graphl["target"] = vueApp.target_word;
  graphl["link_distance"] = vueApp.linkdistance;
  graphl["charge"] = vueApp.charge;
  graphl["start_year"] = vueApp.start_year;
  graphl["end_year"] = vueApp.end_year;
  graphl["time_diff"] = vueApp.time_diff;
  graphl["senses"] = vueApp.senses;
  graphl["edges"] = vueApp.edges;

  let data = JSON.stringify(graphl, null, 2);
  let blob = new Blob([data], { type: "text/plain" });

  const a = document.createElement("a");
  document.body.appendChild(a);
  const url = window.URL.createObjectURL(blob);
  a.href = url;

  if (vueApp.updated_nodes === null && vueApp.updated_links === null) {
    a.download =
      vueApp.target_word + "_" + vueApp.senses + "_" + vueApp.edges + ".json";
  } else {
    a.download =
      vueApp.target_word +
      "_" +
      vueApp.update_senses +
      "_" +
      vueApp.update_edges +
      ".json";
  }

  // TODO What happens if nodes / clusters are deleted?

  //a.download = vueApp.target_word + "_" + graph_nodes.length + "_" + graph_links.length + ".json"

  a.click();
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 0);
}

function loadGraph_io() {
  document.getElementById("loadpopup").style.display = "none";
  vueApp.overlay_main = true;
  const file = this.file;
  const reader = new FileReader();
  console.log("in load graph");

  reader.onload = function (e) {
    this.read_graph = JSON.parse(reader.result);
    vueApp.singletons = this.read_graph.singletons;
    graph.singletons = this.read_graph.singletons;
    graph.nodes = this.read_graph.nodes;
    graph.links = this.read_graph.links;
    vueApp.target_word = this.read_graph.target;
    vueApp.charge = this.read_graph.charge;
    vueApp.linkdistance = this.read_graph.link_distance;
    vueApp.start_year = this.read_graph.start_year;
    vueApp.end_year = this.read_graph.end_year;
    vueApp.time_diff = this.read_graph.time_diff;
    vueApp.senses = this.read_graph.senses;
    vueApp.edges = this.read_graph.edges;

    vueApp.start_years.forEach(function (d, i) {
      if (d.value === vueApp.start_year) {
        vueApp.min_time_id = i + 1;
      }
    });

    vueApp.end_years.forEach(function (d, i) {
      if (d.value === vueApp.end_year) {
        vueApp.max_time_id = i + 1;
      }
    });
    //Call the D3 function to render the graph
    render_graph();
  };
  reader.readAsText(file);
}
