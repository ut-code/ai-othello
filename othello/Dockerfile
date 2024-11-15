FROM python:3.10
WORKDIR /srv/othello
RUN --mount=type=cache,target=/root/.cache/pip pip install "fastapi[standard]"
COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip pip install -r requirements.txt
COPY . .
CMD ["fastapi", "run", "./predict.py"]
