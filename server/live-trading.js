const WebSocket = require('ws');
const config = require('./config');
const SignalGenerator = require('./services/signal-generator');
const MarketDataService = require('./services/market-data');
const RiskManager = require('./services/risk-manager');
const { log } = require('./utils/logger');

class LiveTrading {
  constructor() {
    this.signalGenerator = new SignalGenerator();
    this.marketDataService = new MarketDataService();
    this.riskManager = new RiskManager();
    this.activeSubscriptions = new Map();
    this.activeTrades = new Map();
    this.initialize();
  }

  async initialize() {
    try {
      // Initialize with configuration
      this.symbols = config.trading.symbols || [];
      this.timeframes = config.trading.timeframes || ['15m'];
      this.strategy = config.trading.strategy || 'daytrading';
      
      // Set account balance if provided
      if (config.trading.accountBalance) {
        this.riskManager.setAccountBalance(config.trading.accountBalance);
      }

      log('info', `Starting live trading with ${this.symbols.length} symbols and ${this.timeframes.length} timeframes`);
      
      // Start WebSocket connections
      await this.setupWebSocketConnections();
      
      // Start monitoring for signals
      this.startSignalMonitoring();
      
    } catch (error) {
      log('error', `Failed to initialize live trading: ${error.message}`, error);
      process.exit(1);
    }
  }

  async setupWebSocketConnections() {
    for (const symbol of this.symbols) {
      try {
        // Initialize market data for the symbol
        await this.initializeMarketData(symbol);
        
        // Subscribe to WebSocket for real-time updates
        await this.subscribeToSymbol(symbol);
        
        log('info', `Successfully initialized ${symbol}`);
      } catch (error) {
        log('error', `Failed to initialize ${symbol}: ${error.message}`);
      }
    }
  }

  async initializeMarketData(symbol) {
    // Load historical data for all timeframes
    for (const timeframe of this.timeframes) {
      try {
        const data = await this.marketDataService.getMarketData(symbol, timeframe, 500);
        if (data && data.length > 0) {
          log('info', `Loaded ${data.length} candles for ${symbol} ${timeframe}`);
        } else {
          log('warn', `No data loaded for ${symbol} ${timeframe}`);
        }
      } catch (error) {
        log('error', `Error loading market data for ${symbol} ${timeframe}: ${error.message}`);
      }
    }
  }

  async subscribeToSymbol(symbol) {
    // In a real implementation, this would establish a WebSocket connection
    // For now, we'll simulate WebSocket updates with setInterval
    const interval = setInterval(async () => {
      try {
        const latestPrice = this.marketDataService.getLatestPrice(symbol);
        this.processTick(symbol, latestPrice);
      } catch (error) {
        log('error', `Error processing tick for ${symbol}: ${error.message}`);
      }
    }, 1000); // Simulate tick every second

    this.activeSubscriptions.set(symbol, { interval });
    log('info', `Subscribed to ${symbol} updates`);
  }

  async startSignalMonitoring() {
    // Check for signals periodically
    setInterval(async () => {
      for (const symbol of this.symbols) {
        for (const timeframe of this.timeframes) {
          try {
            await this.checkForSignals(symbol, timeframe);
          } catch (error) {
            log('error', `Error checking signals for ${symbol} ${timeframe}: ${error.message}`);
          }
        }
      }
    }, 30000); // Check every 30 seconds
  }

  async checkForSignals(symbol, timeframe) {
    try {
      // Get market data for the symbol and timeframe
      const marketData = await this.marketDataService.getMarketData(symbol, timeframe, 200);
      
      if (!marketData || marketData.length === 0) {
        log('warn', `No market data available for ${symbol} ${timeframe}`);
        return;
      }

      // Generate signals
      const signals = await this.signalGenerator.generateSignals({
        symbol,
        timeframe,
        marketData,
        riskManager: this.riskManager,
        strategy: this.strategy
      });

      // Process signals
      for (const signal of signals) {
        await this.processSignal(signal);
      }
      
    } catch (error) {
      log('error', `Error in checkForSignals for ${symbol} ${timeframe}: ${error.message}`, error);
    }
  }

  async processSignal(signal) {
    try {
      const { symbol, direction, entry, stopLoss, takeProfit, confidence, detector } = signal;
      
      // Check if we already have an active trade for this symbol
      if (this.activeTrades.has(symbol)) {
        log('info', `Skipping signal for ${symbol} - active trade exists`);
        return;
      }

      // Validate the trade with risk manager
      const currentPrice = this.marketDataService.getLatestPrice(symbol);
      if (!this.riskManager.validateTrade(signal, currentPrice)) {
        log('info', `Trade validation failed for ${symbol} at ${currentPrice}`);
        return;
      }

      // Calculate position size
      const positionSize = this.riskManager.calculatePositionSize(entry, stopLoss);
      
      // Execute the trade
      await this.executeTrade({
        symbol,
        direction,
        entry,
        stopLoss,
        takeProfit,
        size: positionSize,
        confidence,
        detector,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      log('error', `Error processing signal: ${error.message}`, error);
    }
  }

  async executeTrade(trade) {
    const { symbol, direction, entry, stopLoss, takeProfit, size, confidence } = trade;
    
    try {
      // In a real implementation, this would execute the trade through your broker's API
      log('info', `Executing ${direction} trade for ${symbol}:`);
      log('info', `- Entry: ${entry}`);
      log('info', `- Stop Loss: ${stopLoss}`);
      log('info', `- Take Profit: ${takeProfit}`);
      log('info', `- Size: ${size}`);
      log('info', `- Confidence: ${(confidence * 100).toFixed(1)}%`);
      
      // Store the active trade
      this.activeTrades.set(symbol, {
        ...trade,
        status: 'open',
        openTime: new Date(),
        currentPrice: entry
      });
      
      // Start monitoring the trade
      this.monitorTrade(symbol);
      
    } catch (error) {
      log('error', `Failed to execute trade for ${symbol}: ${error.message}`);
    }
  }

  monitorTrade(symbol) {
    const checkInterval = setInterval(() => {
      const trade = this.activeTrades.get(symbol);
      if (!trade) {
        clearInterval(checkInterval);
        return;
      }

      try {
        const currentPrice = this.marketDataService.getLatestPrice(symbol);
        const { direction, stopLoss, takeProfit } = trade;
        
        // Update current price
        trade.currentPrice = currentPrice;
        trade.lastUpdate = new Date();
        
        // Check if take profit or stop loss was hit
        if ((direction === 'BUY' && currentPrice >= takeProfit) || 
            (direction === 'SELL' && currentPrice <= takeProfit)) {
          this.closeTrade(symbol, 'take_profit', currentPrice);
        } else if ((direction === 'BUY' && currentPrice <= stopLoss) || 
                  (direction === 'SELL' && currentPrice >= stopLoss)) {
          this.closeTrade(symbol, 'stop_loss', currentPrice);
        }
        
      } catch (error) {
        log('error', `Error monitoring trade for ${symbol}: ${error.message}`);
      }
    }, 5000); // Check every 5 seconds
  }

  closeTrade(symbol, reason, closePrice) {
    const trade = this.activeTrades.get(symbol);
    if (!trade) return;

    try {
      const pnl = this.calculatePnl(trade, closePrice);
      
      // Update trade status
      trade.status = 'closed';
      trade.closePrice = closePrice;
      trade.closeTime = new Date();
      trade.closeReason = reason;
      trade.pnl = pnl;
      
      // Update risk manager
      this.riskManager.updateTradeResult(pnl);
      
      log('info', `Closed ${trade.direction} trade for ${symbol} at ${closePrice} (${reason})`);
      log('info', `- P&L: ${pnl > 0 ? '+' : ''}${pnl.toFixed(2)}`);
      
      // Remove from active trades
      this.activeTrades.delete(symbol);
      
    } catch (error) {
      log('error', `Error closing trade for ${symbol}: ${error.message}`);
    }
  }

  calculatePnl(trade, closePrice) {
    const { direction, entry, size } = trade;
    const priceDiff = direction === 'BUY' 
      ? closePrice - entry 
      : entry - closePrice;
    
    return priceDiff * size;
  }

  processTick(symbol, price) {
    // Update any indicators or track price movements
    // This would be called for each price update from the WebSocket
  }
}

// Start the trading system
const liveTrading = new LiveTrading();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  log('info', 'Shutting down trading system...');
  
  // Close all active trades
  for (const [symbol] of liveTrading.activeTrades) {
    const currentPrice = liveTrading.marketDataService.getLatestPrice(symbol);
    liveTrading.closeTrade(symbol, 'shutdown', currentPrice);
  }
  
  // Clear all intervals
  for (const [symbol, { interval }] of liveTrading.activeSubscriptions) {
    clearInterval(interval);
    log('info', `Unsubscribed from ${symbol}`);
  }
  
  process.exit(0);
});

module.exports = LiveTrading;
