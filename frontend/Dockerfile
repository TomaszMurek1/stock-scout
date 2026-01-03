# ======================
# FRONTEND PRODUCTION
# ======================

# Stage 1: Build with Node
FROM node:20 as build
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps --loglevel=warn --no-progress

# Copy the rest of the code
COPY . .

# Add API URL argument for React
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# ✅ Print the variable for debugging
RUN echo "Building with API URL: $VITE_API_URL"

# Build (for React+Vite or Create React App, adjust accordingly)
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:stable-alpine

# Copy the compiled build output from stage 1 to Nginx
COPY --from=build /app/dist /usr/share/nginx/html
# (If you're using Create React App, your build folder might be /app/build instead of /app/dist)

# (Optional) Copy a custom Nginx config if needed:
COPY ./nginx.prod.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
