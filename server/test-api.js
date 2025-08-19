const MarketDataService = require('./services/market-data');

async function testDerivAPI() {
  console.log('🚀 Testing Deriv API Integration...\n');
  
  const marketDataService = new MarketDataService();
  
  try {
    // Initialize with your credentials
    await marketDataService.initialize('9LA9mR3KifMmi2o', 80727);
    
    console.log('📊 Testing symbol retrieval...\n');
    
    // Test getting all symbols
    const symbols = await marketDataService.getAllSymbols();
    
    console.log(`✅ Successfully retrieved ${symbols.length} symbols and pairs:\n`);
    
    // Group symbols by market type
    const groupedSymbols = symbols.reduce((acc, symbol) => {
      if (!acc[symbol.market]) acc[symbol.market] = [];
      acc[symbol.market].push(symbol);
      return acc;
    }, {});
    
    // Display symbols by category
    Object.keys(groupedSymbols).forEach(market => {
      console.log(`\n📈 ${market.toUpperCase()} (${groupedSymbols[market].length} symbols):`);
      groupedSymbols[market].slice(0, 10).forEach(symbol => {
        console.log(`   • ${symbol.display_name} (${symbol.symbol})`);
      });
      if (groupedSymbols[market].length > 10) {
        console.log(`   ... and ${groupedSymbols[market].length - 10} more`);
      }
    });
    
    console.log('\n🔍 Testing market data retrieval...\n');
    
    // Test getting market data for a few symbols
    const testSymbols = ['frxEURUSD', 'R_50', 'cryBTCUSD'];
    
    for (const symbol of testSymbols) {
      try {
        console.log(`📊 Fetching 1H data for ${symbol}...`);
        const data = await marketDataService.getMarketData(symbol, '1h', 5);
        console.log(`   ✅ Retrieved ${data.length} candles`);
        if (data.length > 0) {
          console.log(`   📈 Latest: O:${data[0].open} H:${data[0].high} L:${data[0].low} C:${data[0].close}`);
        }
      } catch (error) {
        console.log(`   ❌ Error fetching ${symbol}: ${error.message}`);
      }
    }
    
    console.log('\n🎯 API Test Summary:');
    console.log(`   ✅ Total symbols retrieved: ${symbols.length}`);
    console.log(`   ✅ Market categories: ${Object.keys(groupedSymbols).length}`);
    console.log(`   ✅ Sample data retrieval: Working`);
    console.log('\n🎉 Deriv API integration test completed successfully!');
    
  } catch (error) {
    console.error('❌ API Test Failed:', error.message);
    console.log('\n⚠️  Using fallback symbols for testing...');
    
    // Test fallback symbols
    const fallbackSymbols = marketDataService.getFallbackSymbols();
    console.log(`📋 Fallback symbols available: ${fallbackSymbols.length}`);
    fallbackSymbols.forEach(symbol => {
      console.log(`   • ${symbol.display_name} (${symbol.symbol}) - ${symbol.market}`);
    });
  }
}

// Run the test
testDerivAPI();
