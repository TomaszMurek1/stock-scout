# ======================
# BACKEND PRODUCTION
# ======================
FROM python:3.12-slim

# Set the working directory inside the container
WORKDIR /app

# Copy and install dependencies first (to improve caching)
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend source code
COPY . /app

# Ensure Python finds the module
ENV PYTHONPATH=/app

# Expose backend port
EXPOSE 8000

# Run FastAPI app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--log-level", "debug"]
