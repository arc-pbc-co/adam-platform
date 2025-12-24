# Desktop Metal Instrument Controller Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json ./
RUN npm install

# Copy source files
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 8080

# Environment variables
ENV CONTROLLER_ID=desktop-metal-controller
ENV EVENT_CALLBACK_URL=http://api-gateway:3000/api/intersect/events

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --spider -q http://localhost:8080/health || exit 1

# Start server
CMD ["npm", "start"]
