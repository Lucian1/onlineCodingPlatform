#! /bin/bash

fuser -k 3000/tcp
fuser -k 5000/tcp

service redis_6379 start

cd ./executor
pip3 install -r requirements.txt
python3 executor_server.py &

cd ../oj-server
nodemon server.js &

echo "============================="
read -p "PRESS [enter] to terminate processes" PRESSKEY

fuser -k 3000/tcp
fuser -k 5000/tcp

service redis_6379 stop