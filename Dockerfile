FROM node:20-slim

# Install cron
RUN apt-get update && apt-get install -y cron python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency definitions
COPY package*.json ./

# Install production dependencies
RUN npm ci --omit=dev

# Clean up build-only packages
RUN apt-get purge -y python3 make g++ && apt-get autoremove -y

# Copy application files
COPY src/ ./src/
COPY crontab /etc/cron.d/scraper-cron

# Give execution rights on the cron job and apply it
RUN chmod 0644 /etc/cron.d/scraper-cron && crontab /etc/cron.d/scraper-cron

# Create the log file to be able to run tail
RUN touch /var/log/cron.log

# Run cron in the foreground on container startup
CMD node src/station_id_lookup.js && node src/create_journeys.js && cron -f