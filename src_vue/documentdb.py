from datetime import datetime
from elasticsearch import Elasticsearch
import json


class Documentdb:

    def __init__(self, configfile = './config.json'):
        with open(configfile) as config_file:
            config = json.load(config_file)
            self.el_host = config["elasticsearch"]["host"]
            self.el_port = config["elasticsearch"]["port"]
        try:
            self.es = Elasticsearch([{'host': self.el_host, 'port': self.el_port}])
        except:
            print("exceptino occured in es")

    def search(self, word1, word2, collection="corona_news"):
        self.es.indices.refresh(index=collection)
        query = word1 + " " + word2
        res = self.es.search(index=collection, 
                body={"query": 
                      {"match": 
                       {"text": 
                        {"query": query, "operator": "and"}
                       }
                      }
                     }
               )
        #print(res)
        return res