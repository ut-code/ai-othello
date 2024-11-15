#/usr/bin/env bash
docker build . -t othello
docker run -p 8000:8000 othello 
