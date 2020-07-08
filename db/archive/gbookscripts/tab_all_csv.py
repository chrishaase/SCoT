# python tab_all_csv.py all_years.csv
import sys
import csv
import operator

filename = sys.argv[1]
reader = csv.reader(open(filename), delimiter=",", quotechar='"')
w = csv.writer(open("tabbed_"+filename,"w"),delimiter='\t') # converting to TAB sep

#sortedlist = sorted(reader,  key=lambda row: row[0])

for row in reader:
#for line in sortedlist:
    w.writerow(row)
