FROM node:22

# Set the working directory
WORKDIR /app

# Copy frontend code
COPY . /app

# Install dependencies
RUN npm install --legacy-peer-deps

# Expose frontend port
EXPOSE 5173

# Run the frontend
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
