ALTER TABLE similar_words
ADD CONSTRAINT timeId
FOREIGN KEY (time_id) 
REFERENCES time_slices(id);