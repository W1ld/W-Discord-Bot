#!/bin/bash
echo "🔄 Mengambil pembaruan dari GitHub..."
git fetch
git reset --hard origin/main

echo "🔨 Building TypeScript..."
npm run build

echo "🚀 Starting bot..."
node dist/index.js
