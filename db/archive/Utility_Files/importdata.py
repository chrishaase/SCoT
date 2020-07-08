import csv
import records

FILE_NAMES = [
        "../CSV_gbooks/gbooks_1520_1908.csv",
        "../CSV_gbooks/gbooks_1909_1953.csv",
        "../CSV_gbooks/gbooks_1954_1972.csv",
        "../CSV_gbooks/gbooks_1973_1986.csv",
        "../CSV_gbooks/gbooks_1987_1995.csv",
        "../CSV_gbooks/gbooks_1996_2001.csv",
        "../CSV_gbooks/gbooks_2002_2005.csv",
        "../CSV_gbooks/gbooks_2006_2008.csv"
        ]

def main():
    db = records.Database('mysql://inga@localhost/scot')
    fill_time_slice_table(db)
    fill_similar_words_table(db)

def fill_similar_words_table(db):
    for file_name in FILE_NAMES:
        with open(file_name, 'r') as file:
            reader = csv.DictReader(file)
            for row in reader:
                word1 = row['word1']
                word2= row['word2']
                score = row['count']
                time_id = get_time_id(file_name, db)
                db.query(
                    'INSERT INTO similar_words (word1, word2, score, time_id) VALUES (:word1, :word2, :score, :time)',
                    word1=word1,
                    word2=word2,
                    score=score,
                    time=time_id)

def get_time_id(filename, db):
    start_year = int(filename.split("_")[2])
    time_id = db.query('SELECT id FROM time_slices WHERE start_year=:start', start=start_year)[0]['id']
    return time_id
    
    
def fill_time_slice_table(db):
    db.query('INSERT INTO time_slices (start_year, end_year) VALUES (1520, 1908)')
    db.query('INSERT INTO time_slices (start_year, end_year) VALUES (1909, 1953)')
    db.query('INSERT INTO time_slices (start_year, end_year) VALUES (1954, 1972)')
    db.query('INSERT INTO time_slices (start_year, end_year) VALUES (1973, 1986)')
    db.query('INSERT INTO time_slices (start_year, end_year) VALUES (1987, 1995)')
    db.query('INSERT INTO time_slices (start_year, end_year) VALUES (1996, 2001)')
    db.query('INSERT INTO time_slices (start_year, end_year) VALUES (2002, 2005)')
    db.query('INSERT INTO time_slices (start_year, end_year) VALUES (2006, 2008)')


if __name__ == "__main__":
    main()
