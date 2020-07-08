#!/bin/sh
mysql -uroot -proot < /tmp/loadSchemaAndFiles.sql
mysql -uroot -proot scot -e "LOAD DATA INFILE '/var/lib/mysql-files/datahub/time_slices.csv' INTO TABLE time_slices FIELDS TERMINATED BY ',' LINES TERMINATED BY '\n';"