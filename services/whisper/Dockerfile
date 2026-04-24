FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py ./

RUN addgroup --system whisper && adduser --system --ingroup whisper whisper && \
    mkdir -p /home/whisper/.cache/huggingface && \
    chown -R whisper:whisper /home/whisper

USER whisper

ENV WHISPER_MODEL=base
ENV WHISPER_DEVICE=cpu
ENV WHISPER_COMPUTE_TYPE=int8
ENV WHISPER_PORT=8080
ENV WHISPER_LANGUAGE=auto
ENV HF_HOME=/home/whisper/.cache/huggingface

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=60s \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/health')"

CMD ["python", "main.py"]
