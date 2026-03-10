# syntax=docker/dockerfile:1

FROM python:3.11-slim

# Build tools needed for webrtcvad (C extension) and other native deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libopus-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
