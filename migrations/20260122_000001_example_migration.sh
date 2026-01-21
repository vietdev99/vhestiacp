#!/bin/bash
# Migration: Example migration
# Description: This is an example migration script
# Date: 2026-01-22
#
# What this migration does:
# - Creates example directory
# - Sets up initial config
#
# This is just an example - replace with actual migration logic

echo "This is an example migration"
echo "You can add any bash commands here"

# Example: Create a directory
# mkdir -p /usr/local/hestia/data/example

# Example: Add config value if not exists
# if ! grep -q "EXAMPLE_CONFIG" /usr/local/hestia/conf/hestia.conf; then
#     echo "EXAMPLE_CONFIG='value'" >> /usr/local/hestia/conf/hestia.conf
# fi

# Example: Migrate HAProxy config format
# if [ -f /etc/haproxy/domains/haproxy.json ]; then
#     # Add new field to all domains
#     jq '.domains[] += {"newField": "defaultValue"}' /etc/haproxy/domains/haproxy.json > /tmp/haproxy.json.tmp
#     mv /tmp/haproxy.json.tmp /etc/haproxy/domains/haproxy.json
# fi

echo "Example migration completed"
exit 0
