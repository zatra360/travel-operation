#!/bin/bash
# Cloudflare R2 bucket setup
# Requires wrangler CLI and Cloudflare account

set -e

echo "Creating R2 buckets..."

# Create buckets
npx wrangler r2 bucket create travelo-documents
npx wrangler r2 bucket create travelo-assets
npx wrangler r2 bucket create travelo-tickets
npx wrangler r2 bucket create travelo-backups

echo "R2 buckets created successfully!"
echo ""
echo "Buckets: travelo-documents, travelo-assets, travelo-tickets, travelo-backups"
echo ""
echo "Add these environment variables to your API deployment:"
echo "  R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com"
echo "  R2_ACCESS_KEY_ID=<your-access-key>"
echo "  R2_SECRET_ACCESS_KEY=<your-secret-key>"
echo "  R2_BUCKET=travelo-documents"
