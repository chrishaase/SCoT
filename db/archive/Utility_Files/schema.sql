DROP DATABASE IF EXISTS scot;
CREATE DATABASE scot;

USE scot;

DROP TABLE IF EXISTS time_slices;
CREATE TABLE time_slices (
    id INT UNSIGNED NOT NULL,
    start_year SMALLINT UNSIGNED NOT NULL,
    end_year SMALLINT UNSIGNED NOT NULL
)ENGINE=MyISAM DEFAULT CHARSET=utf8;


DROP TABLE IF EXISTS similar_words;
CREATE TABLE similar_words (
  word1 varchar(64) NOT NULL,
  word2 varchar(64) NOT NULL,
  score int(10) unsigned NOT NULL,
  time_id int(10) unsigned NOT NULL) ENGINE=MyISAM DEFAULT CHARSET=utf8;


CREATE INDEX word1_idx ON similar_words(word1);
CREATE INDEX word2_idx ON similar_words(word2);
CREATE INDEX time_id_idx ON similar_words(time_id);
