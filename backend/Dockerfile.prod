# ======================
# BACKEND PRODUCTION
# ======================
FROM python:3.12-slim

# Create a non-root user
RUN adduser --disabled-password --gecos '' appuser

# Set the working directory
WORKDIR /app

# Copy and install dependencies (improve caching)
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . /app

# Environment variables for Python
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONPATH=/app

# Switch to non-root user
USER appuser

# Expose backend port
EXPOSE 8000
