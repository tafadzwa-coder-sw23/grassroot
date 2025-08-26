# Insight Trader Tool - Deployment Guide

## WebSocket Issues Fixed

The WebSocket connection issues have been resolved with the following changes:

1. **Frontend WebSocket Configuration**: Updated `src/services/api.ts` to use environment variables for WebSocket URL
2. **CORS Configuration**: Updated `server/index.js` to handle production and development environments

## Deployment Steps
