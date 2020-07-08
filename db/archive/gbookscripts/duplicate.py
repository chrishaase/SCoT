# python duplicate.py ../gbooks/1520_1908_sim
import re
import sys
import traceback
import os
from pathlib import Path    


duplinefilename = sys.argv[1]

if len(sys.argv)==3:
    score_threshold = float(sys.argv[2])
else:
    score_threshold = 1.0

new_file = '.'.join(Path(duplinefilename).name.split('.')[:-1])+ '.tsv'
outfile = open("dup_"+os.path.basename(new_file), "w")
               
print(duplinefilename)
print('score_threshold: %s ' %score_threshold)

for line in open(duplinefilename, "r"):
    try:
        l = line.split("\t") # whole line
        f =  l[2].strip() # this is the score
        if float(f)>score_threshold : # filter those lines with score less than 2
#             outfile.write(line.strip()+"\n") # write the line as it is
            outfile.write(l[0].strip()+"\t"+l[1].strip()+"\t"+l[2].strip()+"\n")
            outfile.write(l[1].strip()+"\t"+l[0].strip()+"\t"+l[2].strip()+"\n") # swap the first and second columns (word2, word1)
#            outfile.write(l[1].strip()+"\t"+l[0].strip()+"\t"+l[2].strip()+"\t"+l[3].strip()+"\n") # if feature is also present


    except Exception:
        print(traceback.format_exc())
        print("line " + line + " is wrong\n")
        continue
outfile.close()