FROM node:12

COPY . /app

WORKDIR /app

RUN npm i -g @nestjs/cli
RUN npm i

CMD ["npm", "run", "start"]
