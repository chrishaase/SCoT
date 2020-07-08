ALTER TABLE `scot`.`similar_words` 
ADD COLUMN `id` INT NOT NULL AUTO_INCREMENT AFTER `time_id`,
ADD PRIMARY KEY (`id`);
;