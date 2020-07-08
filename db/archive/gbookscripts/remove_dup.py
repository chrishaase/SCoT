#python remove_dup.py sort_dup_1520_1908_sim
import re
import sys
import traceback

duplinefilenamee = sys.argv[1]

lines_seen = set() # holds lines already seen
outfile = open("uniq_"+duplinefilenamee, "w")
w1ct = 0
prw1 = ""
prw1w2 = ""
w1ctdict = {}
#TODO do not remove duplicates if they have different scores and features
for line in open(duplinefilenamee, "r"):
    try:
       l = line.split("\t")
       w1 = l[0]
       w1w2 = l[0]+l[1]
       if prw1w2 == w1w2:
          continue
       else:
          prw1w2 = w1w2
       if w1 in w1ctdict:
           w1ctdict[w1] += 1
       else:
          w1ctdict[w1] = 1

       if w1ctdict[w1]  < 1001: # limit
           outfile.write(line.strip()+"\n")
    except Exception:
        print(traceback.format_exc())
        print("line " + line + " is wrong\n")
        continue
outfile.close()