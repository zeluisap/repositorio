FROM node:12

RUN apt update && apt install -y unoconv ffmpeg curl ghostscript
RUN apt upgrade -y imagemagick

# COPY . /app

WORKDIR /app

RUN npm i -g @nestjs/cli
# RUN npm i

CMD ["npm", "run", "start"]
