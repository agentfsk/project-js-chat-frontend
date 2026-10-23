FROM node:20-alpine

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ linux-headers

# Copy package files
COPY package*.json ./

# Install dependencies (allow build scripts for mediasoup)
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Expose ports
EXPOSE 3001
EXPOSE 40000-40100/udp

# Start server
CMD ["node", "dist/server.js"]