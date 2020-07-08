#python insertdb.py sorted_all_years.tsv
import csv
# import MySQLdb
import mysql.connector as mysql
import sys

db_name = sys.argv[1]

db = mysql.connect(
    host = "ltdatabase1.informatik.uni-hamburg.de",
    user = "scot",
    passwd = "scot"
                  )
cursor = db.cursor()


print ("Start creating...")

# create DB
createDB = "CREATE DATABASE "+db_name+" CHARACTER SET utf8 COLLATE utf8_general_ci"
cursor.execute("DROP DATABASE IF EXISTS "+db_name)
cursor.execute(createDB)
# use DB
cursor.execute("USE "+db_name)


# create Table similar_words
similar_words = "CREATE TABLE similar_words (\
    word1 VARCHAR(64) NOT NULL,\
    word2 VARCHAR(64) NOT NULL,\
    score INT(10) UNSIGNED NOT NULL,\
    time_id INT(10) UNSIGNED NOT NULL, \
    feature LONGTEXT) ENGINE=MyISAM DEFAULT CHARSET=utf8"


cursor.execute("DROP TABLE IF EXISTS similar_words")
cursor.execute(similar_words)


# create Table time_slices
time_slices = "CREATE TABLE time_slices (\
    id INT UNSIGNED NOT NULL,\
    start_year SMALLINT UNSIGNED NOT NULL,\
    end_year SMALLINT UNSIGNED NOT NULL) ENGINE=MyISAM DEFAULT CHARSET=utf8"


cursor.execute("DROP TABLE IF EXISTS time_slices")
cursor.execute(time_slices)

print ("Done...")

