const MarketDataService = require('./services/market-data');
const asciichart = require('asciichart');
const WebSocket = require('ws');

async function testDerivAPI() {
  console.log('🚀 Testing Deriv API Integration...\n');
  
  const marketDataService = new MarketDataService();
  
  try {
    console.log('1. Initializing MarketDataService...');
    await marketDataService.initialize('9LA9mR3KifMmi2o', 80727);
    console.log('✅ MarketDataService initialized successfully');
    
    console.log('\n2. Testing symbol retrieval...');
    let symbols;
    try {
      symbols = await marketDataService.getAllSymbols();
      console.log(`✅ Successfully retrieved ${symbols ? symbols.length : 0} symbols`);
      if (symbols && symbols.length > 0) {
        console.log('Sample symbols:', symbols.slice(0, 3).map(s => s.symbol).join(', '));
      }
    } catch (symbolError) {
      console.error('❌ Symbol retrieval failed:', symbolError.message);
      console.error('Stack:', symbolError.stack);
      return;
    }
    
    console.log('\n3. Testing market data retrieval for EUR/USD...');
    try {
      const symbol = 'EURUSD';
      const timeframe = '1m';
      const count = 30; // Get more data points for better chart
      
      console.log(`Fetching ${count} ${timeframe} candles for ${symbol}...`);
      const marketData = await marketDataService.getMarketData(symbol, timeframe, count);
      
      if (!marketData || marketData.length === 0) {
        console.log('No market data received');
        return;
      }
      
      console.log(`✅ Successfully retrieved ${marketData.length} data points`);
      
      // Prepare data for chart
      const prices = marketData.map(candle => (candle.high + candle.low) / 2);
      const timestamps = marketData.map(candle => new Date(candle.epoch * 1000).toLocaleTimeString());
      
      // Create and display the chart
      console.log('\n📈 Price Chart:');
      const chart = asciichart.plot(prices, {
        height: 10,
        min: Math.min(...prices) * 0.999,
        max: Math.max(...prices) * 1.001,
        format: x => x.toFixed(5)
      });
      console.log(chart);
      
      // Display latest price info
      const latest = marketData[0];
      console.log('\n📊 Latest Candle:');
      console.log(`Time:    ${new Date(latest.epoch * 1000).toLocaleString()}`);
      console.log(`Open:    ${latest.open}`);
      console.log(`High:    ${latest.high}`);
      console.log(`Low:     ${latest.low}`);
      console.log(`Close:   ${latest.close}`);
      
    } catch (dataError) {
      console.error('❌ Market data retrieval failed:', dataError.message);
      console.error('Stack:', dataError.stack);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    if (error.response) {
      console.error('Response:', {
        status: error.response.status,
        data: error.response.data
      });
    }
  } finally {
    console.log('\nTest completed');
  }
}

// Install asciichart if not already installed
function ensureAsciiChart() {
  try {
    require.resolve('asciichart');
  } catch (e) {
    console.log('Installing asciichart...');
    const { execSync } = require('child_process');
    try {
      execSync('npm install asciichart --save', { stdio: 'inherit' });
      console.log('asciichart installed successfully');
    } catch (installError) {
      console.error('Failed to install asciichart:', installError.message);
      process.exit(1);
    }
  }
}

// Ensure asciichart is installed, then run the test
ensureAsciiChart();
testDerivAPI();

// Configuration
const APP_ID = 80727;
const TOKEN = '9LA9mR3KifMmi2o';
const SYMBOL = 'frxEURUSD';  // Example: EUR/USD
const INTERVAL = '1m';       // 1 minute candles
const COUNT = 30;           // Number of candles to fetch
const WS_URL = `wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID}`;

console.log('🔌 Testing Deriv API Market Data...');

// Create WebSocket connection
const ws = new WebSocket(WS_URL, {
  headers: { 'Origin': 'https://localhost' }
});

// Set up event handlers
ws.on('open', () => {
  console.log('✅ Connected to WebSocket');
  
  // Send authorization request
  const authMsg = JSON.stringify({ authorize: TOKEN });
  console.log('🔑 Sending authorization...');
  ws.send(authMsg);
});

ws.on('message', (data) => {
  const response = JSON.parse(data);
  
  if (response.msg_type === 'authorize') {
    if (response.error) {
      console.error('❌ Authorization failed:', response.error.message);
      ws.close();
      return;
    }
    console.log('✅ Authorized successfully');
    
    // Request ticks history (candles)
    const ticksMsg = JSON.stringify({
      ticks_history: SYMBOL,
      adjust_start_time: 1,
      count: COUNT,
      end: 'latest',
      start: 1,
      style: 'candles',
      granularity: getGranularity(INTERVAL)
    });
    console.log(`📊 Requesting ${COUNT} ${INTERVAL} candles for ${SYMBOL}...`);
    ws.send(ticksMsg);
  }
  
  if (response.msg_type === 'candles') {
    const candles = response.candles || [];
    console.log(`✅ Received ${candles.length} candles`);
    
    if (candles.length > 0) {
      // Display latest candle
      const latest = candles[0];
      console.log('\n🕯️ Latest Candle:');
      console.log(`Time:   ${new Date(latest.epoch * 1000).toLocaleString()}`);
      console.log(`Open:   ${latest.open}`);
      console.log(`High:   ${latest.high}`);
      console.log(`Low:    ${latest.low}`);
      console.log(`Close:  ${latest.close}`);
      
      // Prepare data for chart (using closing prices)
      const prices = candles.map(c => parseFloat(c.close)).reverse();
      
      // Display ASCII chart
      console.log('\n📈 Price Chart:');
      const chart = asciichart.plot(prices, {
        height: 10,
        min: Math.min(...prices) * 0.9999,  // Add small margin
        max: Math.max(...prices) * 1.0001,  // Add small margin
        format: x => x.toFixed(5)
      });
      console.log(chart);
      
      // Display price change
      const priceChange = ((prices[prices.length - 1] - prices[0]) / prices[0] * 100).toFixed(2);
      console.log(`\n📊 Price Change: ${priceChange}% over ${candles.length} candles`);
    }
    
    ws.close();
  }
  
  if (response.error) {
    console.error('❌ API Error:', response.error.message);
    ws.close();
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);});

ws.on('close', () => {
  console.log('🔌 WebSocket connection closed');  
});

// Helper function to convert interval to seconds
function getGranularity(interval) {
  const intervals = {
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '30m': 1800,
    '1h': 3600,
    '4h': 14400,
    '1d': 86400
  };
  return intervals[interval] || 60; // Default to 1 minute
}

// Set timeout for the whole test
setTimeout(() => {
  if (ws.readyState === WebSocket.OPEN) {
    console.log('⏰ Test timeout - closing connection');
    ws.close();
  }
}, 30000); // 30 second timeout
