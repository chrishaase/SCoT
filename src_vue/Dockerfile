# Use an official Python runtime as a parent image
# FROM python:3.8

# Use uwsgi-nginx-flask-python3.8 as parent image
FROM tiangolo/uwsgi-nginx-flask:python3.8

# Set the working directory to
WORKDIR /app

# Copy the current directory contents into the container at /app
COPY . /app

RUN mv /app/scot.py /app/main.py

# Install any needed packages specified in requirements.txt
RUN pip install --trusted-host pypi.python.org -r requirements.txt

# Make port 80 available to the world outside this container
# EXPOSE 80

# Define environment variable
# ENV FLASK_APP="scot.py"
# ENV FLASK_ENV="production"

# Run app.py when the container launches
# CMD ["python", "scot.py"]
