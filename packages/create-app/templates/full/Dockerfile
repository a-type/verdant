FROM node:18-alpine3.16 AS base
ENV CI=true

RUN npm install -g pnpm
WORKDIR /root/monorepo

# add git
RUN apk add --no-cache git

# missing dep for turbo - mentioned by @nathanhammond
# on https://github.com/vercel/turborepo/issues/2293
RUN apk add --no-cache libc6-compat

ENV CYPRESS_INSTALL_BINARY=0
ENV PNPM_HOME=/usr/local/share/pnpm
ENV PATH="$PNPM_HOME:$PATH"

FROM base as dev
COPY ./pnpm-lock.yaml .
RUN pnpm fetch

COPY . .

RUN pnpm add --global ts-node

RUN pnpm install --filter . --frozen-lockfile
RUN pnpm install --filter "@{{todo}}/api..." --frozen-lockfile --unsafe-perm
RUN pnpm --filter "@{{todo}}/api" run build
RUN pnpm --filter "@{{todo}}/api" run gen

WORKDIR /root/monorepo/apps/api
EXPOSE 3001
ENV NODE_ENV=production
ENTRYPOINT ["pnpm", "start"]
