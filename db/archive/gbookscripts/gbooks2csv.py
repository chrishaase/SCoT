#python gbooks2csv.py uniq_sort_dup_1520_1908_sim 1
import re
import sys
import traceback
import csv

duplinefilename = sys.argv[1]
t = sys.argv[2] # time slice
w = csv.writer(open(duplinefilename.replace(".tsv", ".csv"),"w"))

for line in open(duplinefilename, "r"):
    try:
       l = line.split("\t")
       w1 = l[0].strip()
       w2 = l[1].strip()
       score = l[2].strip()
      # feature = l[3].strip()
       #w.writerow([w1,w2,score,t,feature]) # TODO extedn the DB with the feature column
       w.writerow([w1,w2,score,t])
    except Exception:
        print(traceback.format_exc())
        print("line " + line + " is wrong\n")
        continue