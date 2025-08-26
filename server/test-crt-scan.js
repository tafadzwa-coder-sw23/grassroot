const SignalGenerator = require('./services/signal-generator');
const MarketDataService = require('./services/market-data');
const config = require('./config/crt-scanner');

async function testCRTScanner() {
  console.log('=== Starting CRT Scanner Test ===');
  
  const marketData = new MarketDataService();
  const signalGenerator = require('./services/signal-generator');
  
  // Listen for signals
  signalGenerator.on('newSignal', (signal) => {
    console.log('\n=== NEW SIGNAL DETECTED ===');
    console.log(`Symbol: ${signal.symbol}`);
    console.log(`Type: ${signal.type}`);
    console.log(`Timeframe: ${signal.timeframe}`);
    console.log(`Entry: ${signal.entry} | SL: ${signal.stopLoss} | TP: ${signal.takeProfit}`);
    console.log(`Confidence: ${signal.confidence} | Risk/Reward: ${signal.riskReward}`);
    console.log('==========================\n');
  });
  
  // Test with a few symbols
  const testSymbols = ['BTCUSDT', 'ETHUSDT', 'XRPUSDT'];
  
  for (const symbol of testSymbols) {
    try {
      console.log(`\nTesting ${symbol}...`);
      
      // Get market data
      const candles = await marketData.getMarketData(symbol, '1m', 100);
      if (!candles || candles.length === 0) {
        console.log(`No data for ${symbol}`);
        continue;
      }
      
      console.log(`Fetched ${candles.length} candles for ${symbol}`);
      
      // Manually trigger scan for this symbol
      const signals = await signalGenerator.crt.scanSymbol(symbol, '1m');
      
      if (signals && signals.length > 0) {
        console.log(`Found ${signals.length} potential signals for ${symbol}:`);
        signals.forEach((sig, i) => {
          console.log(`  ${i + 1}. Type: ${sig.type}, Entry: ${sig.entry}, ` +
                     `SL: ${sig.stopLoss}, TP: ${sig.takeProfit}, ` +
                     `Confidence: ${sig.confidence}`);
        });
      } else {
        console.log(`No signals found for ${symbol}`);
      }
      
    } catch (error) {
      console.error(`Error testing ${symbol}:`, error.message);
    }
  }
  
  console.log('\n=== CRT Scanner Test Complete ===');
  process.exit(0);
}

// Run the test
testCRTScanner().catch(console.error);
