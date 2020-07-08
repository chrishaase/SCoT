#python insertdb.py sorted_all_years.tsv
import csv
import MySQLdb
import mysql.connector as mysql
import sys

db_name = sys.argv[1]
filename = sys.argv[2]


db = mysql.connect( host = "ltdatabase1",
                    user = "scot",
                    passwd = "scot",
                    db = db_name)

cursor = db.cursor()

query = 'INSERT INTO similar_words(word1,word2,score,time_id) VALUES(%s, %s, %s, %s)'
my_data = []
count = 0
print ("Start inserting...")

with open(filename, 'r', encoding='utf-8') as fp:
    for line in fp:
        row = line.split('\t') 
        count += 1
        my_data.append(tuple(row))
        if count % 10000 == 0: # IT depends on your machine Memory
            cursor.executemany(query, my_data)
            my_data = []
            print(count)
            count = 0


cursor.execute('SET autocommit = 0')
cursor.executemany(query, my_data)
cursor.close()
print ("Done...")