const WebSocketService = require('./services/websocket-service');

// Test configuration
const TEST_CONFIG = {
  symbols: ['frxEURUSD', 'frxGBPUSD', 'R_100'],
  timeframes: [60, 300, 900], // 1m, 5m, 15m
  testDuration: 30000, // 30 seconds
  reconnectTest: true
};

class WebSocketTester {
  constructor() {
    this.wsService = new WebSocketService();
    this.testResults = {
      connection: false,
      tickStreaming: false,
      candleStreaming: false,
      subscription: false,
      reconnection: false,
      errorHandling: false
    };
    this.tickCount = 0;
    this.candleCount = 0;
  }

  async runAllTests() {
    console.log('🚀 Starting WebSocket Integration Tests...\n');
    
    try {
      await this.testConnection();
      await this.testTickStreaming();
      await this.testCandleStreaming();
      await this.testSubscriptionManagement();
      
      if (TEST_CONFIG.reconnectTest) {
        await this.testReconnection();
      }
      
      await this.testErrorHandling();
      
      this.printResults();
      
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  }

  async testConnection() {
    console.log('🔌 Testing WebSocket Connection...');
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 10000);

      this.wsService.on('connected', () => {
        console.log('✅ WebSocket connected successfully');
        this.testResults.connection = true;
        clearTimeout(timeout);
        resolve();
      });

      this.wsService.on('error', (error) => {
        console.error('❌ Connection failed:', error);
        clearTimeout(timeout);
        reject(error);
      });

      this.wsService.connect().catch(reject);
    });
  }

  async testTickStreaming() {
    console.log('📊 Testing Tick Streaming...');
    
    return new Promise((resolve) => {
      const symbol = TEST_CONFIG.symbols[0];
      let receivedTicks = false;

      this.wsService.on(`tick:${symbol}`, (tick) => {
        if (!receivedTicks) {
          console.log(`✅ First tick received for ${symbol}:`, {
            bid: tick.bid,
            ask: tick.ask,
            timestamp: new Date(tick.epoch * 1000).toISOString()
          });
          receivedTicks = true;
          this.testResults.tickStreaming = true;
          this.tickCount++;
          resolve();
        }
      });

      this.wsService.subscribeToTicks(symbol);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        if (!receivedTicks) {
          console.log('⚠️ No ticks received within timeout');
          resolve();
        }
      }, 10000);
    });
  }

  async testCandleStreaming() {
    console.log('🕯️ Testing Candle Streaming...');
    
    return new Promise((resolve) => {
      const symbol = TEST_CONFIG.symbols[1];
      let receivedCandles = false;

