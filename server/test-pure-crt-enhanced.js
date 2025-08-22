const PureCRTDetector = require('./services/pure-crt-detector');
const MarketDataService = require('./services/market-data');

// Mock market data service for testing
class MockMarketDataService {
  constructor(data) {
    this.data = data;
  }

  async getMarketData(symbol, timeframe, limit) {
    // Return the last 'limit' candles
    return this.data.slice(-limit);
  }
}

// Generate sample market data for testing
function generateSampleData(count = 100) {
  const data = [];
  let price = 100.0;
  
  // Generate base candles first
  for (let i = 0; i < count; i++) {
    // Simulate price movement with some volatility
    const change = (Math.random() - 0.5) * 0.002;
    const open = price;
    const high = open * (1 + Math.max(0, change) + Math.random() * 0.001);
    const low = open * (1 + Math.min(0, change) - Math.random() * 0.001);
    const close = open * (1 + change);
    
    data.push({
      open: parseFloat(open.toFixed(5)),
      high: parseFloat(high.toFixed(5)),
      low: parseFloat(low.toFixed(5)),
      close: parseFloat(close.toFixed(5)),
      volume: Math.random() * 1000 + 500,
      timestamp: Date.now() - (count - i) * 300000,
      symbol: 'TEST'
    });
    
    price = close;
  }
  
  // Now inject some CRT patterns
  for (let i = 20; i < data.length - 3; i += 20) {
    // Range candle
    const rangeSize = 0.005;
    const rangeHigh = data[i].close * (1 + rangeSize/2);
    const rangeLow = data[i].close * (1 - rangeSize/2);
    
    // Update current candle to be a range candle
    data[i].high = rangeHigh;
    data[i].low = rangeLow;
    data[i].open = (rangeHigh + rangeLow) / 2;
    data[i].close = data[i].open * (1 + (Math.random() - 0.5) * 0.001);
    
    // Sweep candle (next candle)
    const isUpSweep = Math.random() > 0.5;
    if (isUpSweep) {
      data[i+1].high = rangeHigh * 1.0015;
      data[i+1].low = rangeLow * 0.999;
      data[i+1].close = rangeHigh * 0.999;
      data[i+1].open = (data[i+1].high + data[i+1].low) / 2;
    } else {
      data[i+1].low = rangeLow * 0.9985;
      data[i+1].high = rangeHigh * 1.001;
      data[i+1].close = rangeLow * 1.001;
      data[i+1].open = (data[i+1].high + data[i+1].low) / 2;
    }
    
    // Trigger candle (next next candle)
    if (isUpSweep) {
      data[i+2].open = rangeHigh * 0.998;
      data[i+2].close = (rangeHigh + rangeLow) / 2 * 0.995;
      data[i+2].high = Math.max(data[i+2].open, data[i+2].close) * 1.001;
      data[i+2].low = Math.min(data[i+2].open, data[i+2].close) * 0.999;
    } else {
      data[i+2].open = rangeLow * 1.002;
      data[i+2].close = (rangeHigh + rangeLow) / 2 * 1.005;
      data[i+2].high = Math.max(data[i+2].open, data[i+2].close) * 1.001;
      data[i+2].low = Math.min(data[i+2].open, data[i+2].close) * 0.999;
    }
  }
  
  return data;
}

async function testEnhancedPureCRT() {
  console.log('=== Testing Enhanced PureCRT Detector ===\n');
  
  try {
    // Generate sample market data
    const sampleData = generateSampleData(200);
    const marketDataService = new MockMarketDataService(sampleData);
    
    // Initialize detector
    const detector = new PureCRTDetector({
      driverTimeframe: '5m',
      entryTimeframe: '1m',
      debug: true
    });
    
    // Test detection
    console.log('Testing pattern detection...');
    const signals = await detector.detect('TEST', marketDataService);
    
    console.log('\nDetected signals:');
    signals.forEach((signal, index) => {
      console.log(`\nSignal ${index + 1}:`);
      console.log(`  Type: ${signal.type}`);
      console.log(`  Direction: ${signal.direction}`);
      console.log(`  Entry: ${signal.entryPrice}`);
      console.log(`  Stop Loss: ${signal.stopLoss}`);
      console.log(`  Take Profit: ${signal.takeProfit}`);
      console.log(`  Confidence: ${signal.confidence}`);
      console.log(`  Risk/Reward: ${signal.riskReward}`);
      if (signal.meta) {
        console.log('  Meta:', signal.meta);
      }
    });
    
  } catch (error) {
    console.error('Error in test:', error);
  }
}

// Run the test
testEnhancedPureCRT().catch(console.error);
