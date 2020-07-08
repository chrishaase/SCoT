# Use an official Python runtime as a parent image
FROM python:3.7

WORKDIR /make_db

COPY . /make_db

RUN pip install --trusted-host pypi.python.org -r requirements.txt

CMD ["python", "insert_into_db.py"]