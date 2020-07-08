import os
import csv
import records
# iterate over all the files in the directory, read them line by line and insert each line separately into db
def main():
    # docker filepath var/lib/mysql-files/datahub/
    #/csv_test/datahub/sim_data/
    directory = os.fsencode("./data/")

    db = records.Database('mysql://user:password@db/scot')

    for file in os.listdir(directory):
        filepath = os.fsdecode(directory + file)
        filename = os.fsdecode(file)

        if filename.endswith(".csv") and filename.startswith("sim"):
            with open(filepath, 'r') as file:
                reader = csv.reader(file)
                values = []
                for i, line in enumerate(reader):
                    if i%100000 == 0:
                        print(str(i), flush=True)
                    word1 = line[0].encode('utf8')
                    word2 = line[1].encode('utf8')
                    score = line[2]
                    time_id = line[3]
                    
                    db.query('INSERT INTO similar_words (word1, word2, score, time_id) VALUES (:word1, :word2, :score, :time)', word1=word1,
                    word2=word2,
                    score=score,
                    time=time_id)
                        
                print(filename + " is completed", flush=True)

        else:
            continue

    db.query("CREATE INDEX word1_idx ON similar_words(word1);")
    db.query("CREATE INDEX word2_idx ON similar_words(word1);")
    db.query("CREATE INDEX time_id_idx ON similar_words(time_id);")

if __name__ == "__main__":
    main()