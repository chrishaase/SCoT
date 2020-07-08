# make sure to create the scot database afresh. See the file: createschema.sql
# login mysql Database and run
#    CREATE DATABASE IF NOT EXISTS scot;
echo "Create duplicate enteries for gbooks sim file"
python duplicate.py ../gbooks/1520_1908_sim
python duplicate.py ../gbooks/1909_1953_sim
python duplicate.py ../gbooks/1954_1972_sim
python duplicate.py ../gbooks/1973_1986_sim
python duplicate.py ../gbooks/1987_1995_sim
python duplicate.py ../gbooks/1996_2001_sim
python duplicate.py ../gbooks/2002_2005_sim
python duplicate.py ../gbooks/2006_2008_sim

echo "Sorting the duplicate files"
sort  -k1,1  -k3,3nr dup_1520_1908_sim > sort_dup_1520_1908_sim
sort  -k1,1  -k3,3nr dup_1909_1953_sim > sort_dup_1909_1953_sim
sort  -k1,1  -k3,3nr dup_1954_1972_sim > sort_dup_1954_1972_sim
sort  -k1,1  -k3,3nr dup_1973_1986_sim > sort_dup_1973_1986_sim
sort  -k1,1  -k3,3nr dup_1987_1995_sim > sort_dup_1987_1995_sim
sort  -k1,1  -k3,3nr dup_1996_2001_sim > sort_dup_1996_2001_sim
sort  -k1,1  -k3,3nr dup_2002_2005_sim > sort_dup_2002_2005_sim
sort  -k1,1  -k3,3nr dup_2006_2008_sim > sort_dup_2006_2008_sim

echo "remove w1 w2 duplicate entries"
python remove_dup.py sort_dup_1520_1908_sim
python remove_dup.py sort_dup_1909_1953_sim
python remove_dup.py sort_dup_1954_1972_sim
python remove_dup.py sort_dup_1973_1986_sim
python remove_dup.py sort_dup_1987_1995_sim
python remove_dup.py sort_dup_1996_2001_sim
python remove_dup.py sort_dup_2002_2005_sim
python remove_dup.py sort_dup_2006_2008_sim


echo "write data as CSV files"
python gbooks2csv.py uniq_sort_dup_1520_1908_sim 1
python gbooks2csv.py uniq_sort_dup_1909_1953_sim 2
python gbooks2csv.py uniq_sort_dup_1954_1972_sim 3
python gbooks2csv.py uniq_sort_dup_1973_1986_sim 4
python gbooks2csv.py uniq_sort_dup_1987_1995_sim 5
python gbooks2csv.py uniq_sort_dup_1996_2001_sim 6
python gbooks2csv.py uniq_sort_dup_2002_2005_sim 7
python gbooks2csv.py uniq_sort_dup_2006_2008_sim 8

## Merge all csv files so that they can be sorted by w1

echo "Merging all files"
cat uniq_sort_dup_1520_1908_sim.csv uniq_sort_dup_1909_1953_sim.csv uniq_sort_dup_1954_1972_sim.csv uniq_sort_dup_1973_1986_sim.csv uniq_sort_dup_1987_1995_sim.csv uniq_sort_dup_1996_2001_sim.csv uniq_sort_dup_2002_2005_sim.csv uniq_sort_dup_2006_2008_sim.csv > all_years.csv

echo "convert to tab separated format"
python tab_all_csv.py all_years.csv

echo "Sorting the merged tsv files"
sh sort_merged.sh

echo "Inserting into the database"
python insertdb.py sorted_all_years.tsv DT_finNews_trigram
echo "Insert statements completed"

# Run the following to create the index from mysql db
# CREATE INDEX word1_idx ON similar_words(word1);
# CREATE INDEX word2_idx ON similar_words(word2);
#CREATE INDEX time_id_idx ON similar_words(time_id);

# If you do not have the times table do as follows
# INSERT INTO `time_slices` VALUES (1,1520,1908),(2,1909,1953),(3,1954,1972),(4,1973,1986),(5,1987,1995),(6,1996,2001),(7,2002,2005),(8,2006,2008);
