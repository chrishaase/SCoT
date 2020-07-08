#python insertdb.py db_name start-end,start-end
import csv
# import MySQLdb
import mysql.connector as mysql
import sys


db_name = sys.argv[1]
time_slices = sys.argv[2]
print(time_slices)
print(type(time_slices))
tokens = time_slices.replace(' ','').split(',')
time_slices = [t.split('-')for t in tokens]

def convert_toint(strList):
    return [int(v) for v in strList]

time_slices = [convert_toint(span) for span in time_slices]
print(time_slices)

db = mysql.connect(   host = "ltdatabase1",
                        user = "scot",
                        passwd = "scot",
                        db = db_name)
cursor = db.cursor()
print ("inserting")
query = "INSERT INTO time_slices (id, start_year, end_year) VALUES (%s, %s, %s)"
for i, c in enumerate(time_slices):
    values = (i+1, c[0], c[1])
    print(values)
    cursor.execute(query, values)

print ("Done...")


