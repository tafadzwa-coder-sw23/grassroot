require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const WebSocket = require('ws');
const axios = require('axios');
const cron = require('node-cron');
const Database = require('./database');
const CHOCHDetector = require('./services/choch-detector');
const SignalGenerator = require('./services/signal-generator');
const MarketDataService = require('./services/market-data');
const RiskManager = require('./services/risk-manager');
const WebSocketService = require('./services/websocket-service');
const { z } = require('zod');

const app = express();
const port = Number(process.env.PORT) || 3001;
const wsPort = Number(process.env.WS_PORT) || 8081;

// Initialize services
const db = new Database();
const chochDetector = new CHOCHDetector();
const signalGenerator = new SignalGenerator();
const marketDataService = new MarketDataService();
const riskManager = new RiskManager();
const wsService = new WebSocketService();

// Deriv API Configuration
const DERIV_TOKEN = process.env.DERIV_TOKEN || '';
const DERIV_APP_ID = Number(process.env.DERIV_APP_ID) || 0;

// Analysis control state
let analysisEnabled = false;

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',') || true }));
app.use(rateLimit({ windowMs: 60 * 1000, max: 120 }));
app.use(express.json());
// Health/Readiness endpoints
app.get('/healthz', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    analysisEnabled,
    wsPort,
    hasDerivConfig: Boolean(DERIV_TOKEN && DERIV_APP_ID),
  });
});

app.get('/readyz', (req, res) => {
  const ready = true; // extend with deeper checks if needed
  res.status(ready ? 200 : 503).json({ ready });
});

// Simple request validation
const timeframeSchema = z.enum(['1m', '5m', '15m', '1h', '4h', '1d']);
const symbolSchema = z.string().min(1);


// WebSocket server for real-time updates
const wss = new WebSocket.Server({ port: wsPort });

// Store active connections
const clients = new Set();

// WebSocket connection handler
wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('New WebSocket connection');

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      await handleWebSocketMessage(ws, data);
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('WebSocket connection closed');
  });
});

// Broadcast to all connected clients
function broadcast(data) {
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// Handle WebSocket messages
async function handleWebSocketMessage(ws, data) {
  const { type, symbol, timeframe, action } = data;

  switch (type) {
    case 'subscribe':
      await subscribeToSymbol(ws, symbol, timeframe);
      break;
    case 'unsubscribe':
      await unsubscribeFromSymbol(ws, symbol, timeframe);
      break;
    case 'get_signals':
      const signals = await getTradingSignals(symbol, timeframe);
      ws.send(JSON.stringify({ type: 'signals', data: signals }));
      break;
    case 'get_market_data':
      const marketData = await marketDataService.getMarketData(symbol, timeframe);
      ws.send(JSON.stringify({ type: 'market_data', data: marketData }));
      break;
  }
}

// API Routes
app.get('/api/symbols', async (req, res) => {
  try {
    const symbols = await marketDataService.getAllSymbols();
    res.json(symbols);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/market-data/:symbol/:timeframe', async (req, res) => {
  try {
    const { symbol, timeframe } = req.params;
    timeframeSchema.parse(timeframe);
    symbolSchema.parse(symbol);
    const data = await marketDataService.getMarketData(symbol, timeframe);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/signals/:symbol/:timeframe', async (req, res) => {
  try {
    const { symbol, timeframe } = req.params;
    timeframeSchema.parse(timeframe);
    symbolSchema.parse(symbol);
    const signals = await getTradingSignals(symbol, timeframe);
    res.json(signals);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/choch-analysis/:symbol/:timeframe', async (req, res) => {
  try {
    const { symbol, timeframe } = req.params;
    timeframeSchema.parse(timeframe);
    symbolSchema.parse(symbol);
    const analysis = await chochDetector.analyze(symbol, timeframe);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/risk-analysis/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const risk = await riskManager.analyzeRisk(symbol);
    res.json(risk);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Analysis control endpoints
app.post('/api/analysis/start', async (req, res) => {
  try {
    analysisEnabled = true;
    return res.json({ status: 'started' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.post('/api/analysis/stop', async (req, res) => {
  try {
    analysisEnabled = false;
    return res.json({ status: 'stopped' });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.get('/api/analysis/status', (req, res) => {
  res.json({ enabled: analysisEnabled });
});

// Get trading signals with CHOCH detection
async function getTradingSignals(symbol, timeframe) {
  try {
    // Get market data
    const marketData = await marketDataService.getMarketData(symbol, timeframe);
    
    // Detect CHOCH patterns
    const chochAnalysis = await chochDetector.analyze(symbol, timeframe, marketData);
    
    // Generate signals based on CHOCH and smart money concepts
    let signals = await signalGenerator.generateSignals({
      symbol,
      timeframe,
      marketData,
      chochAnalysis,
      riskManager
    });

    // Ensure required fields for storage
    signals = (signals || []).map(s => ({
      symbol,
      timeframe,
      ...s
    }));

    // Store signals in database
    if (signals && signals.length) {
      await db.storeSignals(signals);
    }

    return signals;
  } catch (error) {
    console.error('Error generating signals:', error);
    throw error;
  }
}

// Background job for continuous analysis (controlled by analysisEnabled)
const scheduledTask = cron.schedule('*/5 * * * *', async () => {
  if (!analysisEnabled) return;
  console.log('Running scheduled market analysis...');
  try {
    const symbols = await marketDataService.getActiveSymbols();
    
    for (const symbol of symbols) {
      const timeframes = ['1m', '5m', '15m', '1h', '4h'];
      
      for (const timeframe of timeframes) {
        const signals = await getTradingSignals(symbol, timeframe);
        
        if (signals.length > 0) {
          broadcast({
            type: 'new_signals',
            symbol,
            timeframe,
            signals
          });
        }
      }
    }
  } catch (error) {
    console.error('Scheduled analysis error:', error);
  }
}, { scheduled: true });

// Start with task running but disabled by flag
scheduledTask.start();

// Initialize services on startup
async function initializeServices() {
  try {
    await db.initialize();
    await marketDataService.initialize(DERIV_TOKEN, DERIV_APP_ID);
    console.log('Services initialized successfully');
  } catch (error) {
    console.error('Service initialization error:', error);
  }
}

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  console.log(`WebSocket server running on port ${wsPort}`);
  initializeServices();
});
