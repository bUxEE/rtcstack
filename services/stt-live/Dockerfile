FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY agent.py ./

RUN addgroup --system rtcstack && adduser --system --ingroup rtcstack rtcstack
USER rtcstack

ENV LIVEKIT_URL=ws://livekit:7880
ENV WHISPER_URL=http://whisper:8080
ENV REDIS_URL=redis://redis:6379
ENV STT_LANGUAGE=en
ENV STT_CHUNK_SECONDS=4

HEALTHCHECK --interval=20s --timeout=5s --retries=3 --start-period=30s \
  CMD python -c "import sys; sys.exit(0)"

CMD ["python", "agent.py", "start"]
