CREATE TABLE bims (
    bims_id int NOT NULL AUTO_INCREMENT,
	score float NOT NULL,
    context_word varchar(255) ,
    word1 varchar(255) NOT NULL,
    id int, 
    PRIMARY KEY (bims_id),
    CONSTRAINT FK_time_id FOREIGN KEY (id)
    REFERENCES time_slices(id)
) ENGINE=INNODB;