import csv

FILE_NAMES = [
        "gbooks_1520_1908.csv",
        "gbooks_1909_1953.csv",
        "gbooks_1954_1972.csv",
        "gbooks_1973_1986.csv",
        "gbooks_1987_1995.csv",
        "gbooks_1996_2001.csv",
        "gbooks_2002_2005.csv",
        "gbooks_2006_2008.csv"
        ]

def main():
    for file_name in FILE_NAMES:
        lines = []
        with open(file_name, 'r') as file:
            for i, line in enumerate(file):
                if i == 0:
                    lines.append(line)
                elif "word1" in line and "word2" in line:
                    continue
                else:
                    lines.append(line)
        with open(file_name, 'w') as file:
            for line in lines:
                #print(line)
                file.write(line)

if __name__ == "__main__":
    main()