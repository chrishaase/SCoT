import csv
from datetime import datetime
from elasticsearch import Elasticsearch
import json

def main():
    # settings
    es = Elasticsearch([{'host': 'elasticsearch', 'port': 9200}])
    indexname = "corona_news"
    es.indices.refresh(index=indexname)
    word1 = "covid-19"
    word2 = "pandemic"
    time_id = 1

    res = es.search(index=indexname, 
                body={"query": 
                      {"bool":
                       {"must":[
                           {"match": {"text": word1}},
                           {"match": {"text": word2}}
                       ],
                        "filter":[
                            {"term": {"time_id": time_id}}
                        ]
                       
                       }
                      }
                     }
               )
    print("Got %d Hits:" % res['hits']['total']['value'])
    for hit in res['hits']['hits']:
        print("%(text)s" % hit["_source"])
    #print(res)


if __name__ == "__main__":
    main()
