#!/bin/bash
set -e
npx prisma migrate deploy
node main.js
