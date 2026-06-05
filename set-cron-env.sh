#!/bin/bash
vars=(
  "NODE_ENV"
  "TZ"
  "USER_AGENT"
  "DB_PATH"
  "DISCORD_WEBHOOK_URL"
)

# 3. Loop through the array and dump them safely
for var in "${vars[@]}"; do
  echo "${var}=\"${!var}\"" >> /etc/environment
done