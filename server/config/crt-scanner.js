module.exports = {
  // Scanner settings
  enabled: true,
  scanInterval: process.env.CRT_SCAN_INTERVAL ? parseInt(process.env.CRT_SCAN_INTERVAL) : 300000, // 5 minutes
  batchSize: 5, // Number of symbols to process in parallel
  minConfidence: 0.6, // Minimum confidence score to consider a signal
  minRiskReward: 1.5, // Minimum risk/reward ratio
  
  // Timeframes to scan (in order of priority)
  timeframes: ['1m', '5m', '15m', '1h'],
  
  // Signal confirmation settings
  confirmation: {
    volumeMultiplier: 1.2, // Minimum volume compared to average
    requireEmaConfirmation: true,
    emaPeriod: 20,
    minCandles: 50, // Minimum candles needed for analysis
  },
  
  // Risk management
  risk: {
    maxPositionSize: 0.1, // Max position size as % of portfolio
    maxDailyLoss: 0.02, // Max daily loss as % of portfolio
    maxOpenTrades: 5, // Max number of open trades
  },
  
  // Notification settings
  notifications: {
    email: {
      enabled: false,
      recipients: [],
    },
    webhook: {
      enabled: true,
      url: process.env.WEBHOOK_URL || '',
    },
  },
  
  // Symbol filters
  filters: {
    minVolume: 100000, // Minimum 24h volume in quote currency
    maxSpread: 0.001, // Maximum spread (as % of price)
    allowedExchanges: ['binance', 'ftx', 'kraken'],
    blacklist: [], // Symbols to exclude
  },
  
  // Performance monitoring
  monitoring: {
    logPerformance: true,
    saveToDatabase: true,
    performanceWindow: 30, // days
  },
  
  // Advanced settings
  advanced: {
    debug: process.env.NODE_ENV === 'development',
    backtestMode: false,
    maxConcurrentRequests: 10,
    requestDelay: 100, // ms between API requests
  },
};
