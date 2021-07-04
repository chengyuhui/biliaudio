FROM "python:3.9-alpine"

# RUN apt-get update && apt-get install -y ffmpeg atomicparsley
RUN apk --no-cache --update upgrade && apk --no-cache add ffmpeg

WORKDIR /app

COPY requirements.txt ./
RUN pip install -r requirements.txt

COPY . .

CMD ["python", "app.py"]
