FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
COPY .env .
EXPOSE 5000

CMD ["npm", "run", "server"]
