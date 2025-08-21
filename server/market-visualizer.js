const WebSocket = require('ws');
const asciichart = require('asciichart');

// Configuration
const CONFIG = {
  APP_ID: 80727,
  TOKEN: '9LA9mR3KifMmi2o',
  SYMBOL: 'R_100',    // Changed to Volatility 100 Index
  INTERVAL: '5m',     // Changed to 5-minute candles
  COUNT: 50,          // Increased to 50 candles
  WS_URL: 'wss://ws.binaryws.com/websockets/v3'
};

console.log('📈 Starting Market Data Visualizer...');
console.log(`📊 Symbol: ${CONFIG.SYMBOL}, Interval: ${CONFIG.INTERVAL}, Candles: ${CONFIG.COUNT}`);

// Create WebSocket connection
const ws = new WebSocket(`${CONFIG.WS_URL}?app_id=${CONFIG.APP_ID}`, {
  headers: { 'Origin': 'https://localhost' }
});

// WebSocket event handlers
ws.on('open', () => {
  console.log('✅ Connected to WebSocket');
  authorize();
});

ws.on('message', (data) => {
  try {
    const response = JSON.parse(data);
    handleResponse(response);
  } catch (error) {
    console.error('Error parsing message:', error);
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

ws.on('close', () => {
  console.log('🔌 WebSocket connection closed');
});

// Handle API responses
function handleResponse(response) {
  console.log(`📨 Received: ${response.msg_type || 'unknown'}`);
  
  switch (response.msg_type) {
    case 'authorize':
      if (response.error) {
        console.error('❌ Authorization failed:', response.error.message);
        ws.close();
        return;
      }
      console.log('✅ Authorized successfully');
      fetchCandles();
      break;
      
    case 'candles':
      if (response.error) {
        console.error('❌ Error fetching candles:', response.error.message);
        break;
      }
      displayCandles(response.candles || []);
      ws.close();
      break;
      
    default:
      if (response.error) {
        console.error('❌ API Error:', response.error.message);
      }
  }
}

// Send authorization request
function authorize() {
  console.log('🔑 Authenticating...');
  ws.send(JSON.stringify({ authorize: CONFIG.TOKEN }));
}

// Fetch candle data
function fetchCandles() {
  console.log(`📊 Fetching ${CONFIG.COUNT} ${CONFIG.INTERVAL} candles...`);
  
  const request = {
    ticks_history: CONFIG.SYMBOL,
    adjust_start_time: 1,
    count: CONFIG.COUNT,
    end: 'latest',
    start: 1,
    style: 'candles',
    granularity: getGranularity(CONFIG.INTERVAL)
  };
  
  ws.send(JSON.stringify(request));
}

// Display candle data
function displayCandles(candles) {
  if (candles.length === 0) {
    console.log('No candle data received');
    return;
  }

  // Get latest candle
  const latest = candles[0];
  console.log('\n🕯️ Latest Candle:');
  console.log(`Time:  ${new Date(latest.epoch * 1000).toLocaleString()}`);
  console.log(`Open:  ${latest.open}`);
  console.log(`High:  ${latest.high}`);
  console.log(`Low:   ${latest.low}`);
  console.log(`Close: ${latest.close}`);

  // Prepare data for chart
  const prices = candles.map(c => parseFloat(c.close)).reverse();
  const priceChange = ((prices[prices.length - 1] - prices[0]) / prices[0] * 100).toFixed(2);
  
  // Display chart
  console.log('\n📈 Price Chart:');
  console.log(asciichart.plot(prices, {
    height: 10,
    min: Math.min(...prices) * 0.9999,
    max: Math.max(...prices) * 1.0001,
    format: x => x.toFixed(5)
  }));
  
  console.log(`\n📊 Price Change: ${priceChange}% over ${candles.length} candles`);
}

// Convert interval to seconds
function getGranularity(interval) {
  const intervals = {
    '1m': 60, '5m': 300, '15m': 900, '30m': 1800,
    '1h': 3600, '4h': 14400, '1d': 86400
  };
  return intervals[interval] || 60;
}

// Set timeout
setTimeout(() => {
  if (ws.readyState === WebSocket.OPEN) {
    console.log('⏰ Timeout - closing connection');
    ws.close();
  }
}, 30000);
