FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run generate

FROM base AS development
ENV NODE_ENV=development
CMD ["npm", "run", "start:dev"]

FROM base AS test
ENV NODE_ENV=test
RUN npm run build
CMD ["npm", "run", "test"]

FROM base AS production
ENV NODE_ENV=production
RUN npm run build
RUN npm ci --only=production
CMD ["npm", "run", "start:prod"] 