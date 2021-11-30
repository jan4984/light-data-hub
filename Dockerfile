FROM node:15-buster-slim
#RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list
#RUN sed -i 's/security.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list
#RUN apt update && apt install -y wget
WORKDIR /light-data-hub
COPY package.* ./
RUN npm i --registry=https://registry.npm.taobao.org
ENV DB_PATH=file:/ldh/db/db.sqlite
ENV FILE_PATH=/ldh/files
COPY . ./
RUN npx prisma migrate generate
ENTRYPOINT ["entrypoint.sh"]
