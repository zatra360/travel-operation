#!/bin/bash
# Cloudflare R2 bucket setup for the zatra360 project
# Requires wrangler CLI authenticated to the Zatra360 Cloudflare account.

set -e

export CLOUDFLARE_ACCOUNT_ID="29cb84c6f8d3d3652b453a529f2e06f9"

echo "Creating R2 buckets on account $CLOUDFLARE_ACCOUNT_ID..."

# Create buckets
npx wrangler r2 bucket create zatra360-documents
npx wrangler r2 bucket create zatra360-assets
npx wrangler r2 bucket create zatra360-tickets
npx wrangler r2 bucket create zatra360-backups

echo "R2 buckets created successfully!"
echo ""
echo "Buckets: zatra360-documents, zatra360-assets, zatra360-tickets, zatra360-backups"
echo ""
echo "Add these environment variables to your API deployment:"
echo "  R2_ENDPOINT=https://${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com"
echo "  R2_REGION=auto"
echo "  R2_ACCESS_KEY_ID=<your-r2-access-key>"
echo "  R2_SECRET_ACCESS_KEY=<your-r2-secret-key>"
echo "  R2_BUCKET=zatra360-documents"
