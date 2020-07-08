import records

def main():
    db_names = [
        "gbooks_1520_1908",
        "gbooks_1909_1953",
        "gbooks_1954_1972",
        "gbooks_1973_1986",
        "gbooks_1987_1995",
        "gbooks_1996_2001",
        "gbooks_2002_2005",
        "gbooks_2006_2008"
        ]

    target_words = ["crisis", "freedom", "development", "system", "culture", "work", "labour", "security", "safety", "automomy", "order", "experience", "normality", "medium", "commmunication", "value", "worth", "network", "complexity", "program" "programme", "diversity", "change"]

    for db_name in db_names:
        db = records.Database('mysql://root:root@127.0.0.1:3306/' + db_name)
        for tw in target_words:
            rows = fetch_rows(tw, db)
            dump_rows(rows, db_name + '.csv')
            for r in rows:
                dump_rows(fetch_rows(r.word1, db), db_name + '.csv', print_header=False)

def fetch_rows(target_word, db):
    escaped = target_word.replace("'", "\\'")
    query = "SELECT word1, word2, count FROM LMI_1000_l200 WHERE word2 LIKE :target_word"
    #print(escaped)
    rows = db.query(query, target_word=escaped + '%')
    return rows

def dump_rows(rows, filename, print_header=True):
    with open(filename, 'a') as file:
        if print_header:
            file.write(rows.export('csv'))
        else:
            lines = rows.export('csv').split("\n")[1:]
            csv = "\n".join(lines)
            file.write(csv)

def test():
    db = records.Database('mysql://root:root@127.0.0.1:3306/gbooks_1520_1908')
    rows = db.query("select word1 from LMI_1000_l200 limit 5")
    #print(rows.export("csv"))


if __name__ == "__main__":
    main()
