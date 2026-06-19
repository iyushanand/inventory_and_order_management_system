# Stage 1: Build the React application with Vite
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install packages
RUN npm ci

# Copy codebase
COPY . .

# Set dynamic build arguments for env variables
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build production bundle
RUN npm run build

# Stage 2: Production server stage
FROM nginx:stable-alpine

# Copy build output from Stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy server configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
