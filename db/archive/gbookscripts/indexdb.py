#python indexdb.py db_name
import csv
# import MySQLdb
import mysql.connector as mysql
import sys

db_name = sys.argv[1]

db = mysql.connect(   host = "ltdatabase1",
                        user = "scot",
                        passwd = "scot",
                        db = db_name)
cursor = db.cursor()
word1_idx = "CREATE INDEX word1_idx ON similar_words(word1)"
word2_idx = "CREATE INDEX word2_idx ON similar_words(word2)"
time_id_idx = "CREATE INDEX time_id_idx ON similar_words(time_id)"

print ("indexing word1...")
cursor.execute(word1_idx)

print ("indexing word2...")
cursor.execute(word2_idx)

print ("indexing time_id...")
cursor.execute(time_id_idx)

print ("Done...")

