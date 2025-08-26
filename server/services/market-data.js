const axios = require('axios');
const config = require('../config');
const { v4: uuidv4 } = require('uuid');

class MarketDataService {
  constructor() {
    this.cache = new Map();
    this.cacheTTL = 60000; // 1 minute cache TTL
    this.supportedSymbols = new Set([
      // Forex
      'EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 
      'EUR/GBP', 'USD/CHF', 'NZD/USD', 'EUR/JPY', 'GBP/JPY',
      // Cryptocurrencies
      'BTC/USD', 'ETH/USD', 'XRP/USD', 'LTC/USD', 'BCH/USD',
      'BNB/USD', 'SOL/USD', 'ADA/USD', 'DOT/USD', 'DOGE/USD',
      // Indices
      'US30', 'US100', 'US500', 'UK100', 'GER40', 'JPN225',
      // Commodities
      'XAU/USD', 'XAG/USD', 'OIL/USD', 'NATGAS', 'COPPER',
      // Volatility Indices (Standard and 1s Fast Versions)
      'V10', 'V25', 'V50', 'V75', 'V100', 'V150', 'V250',
      'V10 (1s)', 'V25 (1s)', 'V50 (1s)', 'V75 (1s)', 'V90 (1s)', 
      'V100 (1s)', 'V150 (1s)', 'V200 (1s)', 'V250 (1s)', 'V300 (1s)',
      // Crash and Boom Indices
      'CRASH 1000', 'BOOM 1000', 'CRASH 500', 'BOOM 500', 
      'CRASH 300', 'BOOM 300', 'CRASH 200', 'BOOM 200', 
      'CRASH 100', 'BOOM 100',
      // Jump Indices
      'JUMP INDEX Volatility 10%', 'JUMP INDEX Volatility 25%', 
      'JUMP INDEX Volatility 50%', 'JUMP INDEX Volatility 75%', 
      'JUMP INDEX Volatility 100%',
      // Step Indices
      'STEP INDEX Volatility 10%', 'STEP INDEX Volatility 25%', 
      'STEP INDEX Volatility 50%', 'STEP INDEX Volatility 75%', 
      'STEP INDEX Volatility 100%',
      // Range Break Indices
      'RANGE BREAK INDEX Volatility 10%', 'RANGE BREAK INDEX Volatility 25%', 
      'RANGE BREAK INDEX Volatility 50%', 'RANGE BREAK INDEX Volatility 75%', 
      'RANGE BREAK INDEX Volatility 100%',
      // Daily Reset Indices (Synthetic Indices resetting daily)
      'DAILY RESET INDEX Volatility 10', 'DAILY RESET INDEX Volatility 25', 
      'DAILY RESET INDEX Volatility 50', 'DAILY RESET INDEX Volatility 100',
      // Other Special Synthetic Indices
      'HYBRID INDICES', 'SKEW STEP INDICES', 'TREK INDICES', 'VOLATILITY SWITCH INDICES'
    ]);
  }

  async getMarketData(symbol, timeframe, limit = 500) {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const cacheKey = `${normalizedSymbol}_${timeframe}_${limit}`;
    
    // Check cache first
    const cachedData = this.cache.get(cacheKey);
    if (cachedData && (Date.now() - cachedData.timestamp) < this.cacheTTL) {
      return cachedData.data;
    }

    try {
      let marketData;
      
      if (process.env.USE_REAL_MARKET_DATA === 'true') {
        // In a real implementation, this would fetch from your data provider's API
        marketData = await this.fetchFromDataProvider(normalizedSymbol, timeframe, limit);
      } else {
        // Fallback to synthetic data
        marketData = this.generateSyntheticData(normalizedSymbol, timeframe, limit);
      }
      
      // Update cache
      this.cache.set(cacheKey, {
        data: marketData,
        timestamp: Date.now()
      });
      
      return marketData;
    } catch (error) {
      console.error(`Error fetching market data for ${normalizedSymbol} ${timeframe}:`, error);
      
      // Return synthetic data as fallback
      return this.generateSyntheticData(normalizedSymbol, timeframe, limit);
    }
  }

  async fetchFromDataProvider(symbol, timeframe, limit) {
    // This is a placeholder for actual API integration
    // Replace with your market data provider's API calls
    const response = await axios.get('https://api.marketdata.example/ohlcv', {
      params: {
        symbol,
        timeframe,
        limit,
        apiKey: process.env.MARKET_DATA_API_KEY
      },
      timeout: 10000 // 10 second timeout
    });

    return response.data.map(item => ({
      timestamp: item[0],
      open: parseFloat(item[1]),
      high: parseFloat(item[2]),
      low: parseFloat(item[3]),
      close: parseFloat(item[4]),
      volume: parseFloat(item[5] || 0)
    }));
  }

  generateSyntheticData(symbol, timeframe, limit) {
    const data = [];
    const now = Date.now();
    const interval = this.getTimeframeInMs(timeframe);
    
    // Generate base price based on symbol for more realistic values
    const basePrice = this.getBasePriceForSymbol(symbol);
    let price = basePrice * (0.9 + Math.random() * 0.2); // ±10% from base
    
    for (let i = 0; i < limit; i++) {
      const open = price;
      const volatility = this.getVolatilityForSymbol(symbol);
      const change = (Math.random() * 2 - 1) * volatility * open;
      const close = open + change;
      const high = Math.max(open, close) * (1 + Math.random() * 0.002);
      const low = Math.min(open, close) * (1 - Math.random() * 0.002);
      const volume = this.getBaseVolumeForSymbol(symbol) * (0.5 + Math.random());
      
      data.unshift({
        timestamp: now - (i * interval),
        open,
        high,
        low,
        close,
        volume
      });
      
      price = close;
    }
    
    return data;
  }

  getBasePriceForSymbol(symbol) {
    const symbolBasePrices = {
      // Forex
      'EUR/USD': 1.08, 'GBP/USD': 1.26, 'USD/JPY': 149.5, 
      'AUD/USD': 0.65, 'USD/CAD': 1.35, 'EUR/GBP': 0.86,
      // Crypto
      'BTC/USD': 65000, 'ETH/USD': 3500, 'XRP/USD': 0.52,
      // Indices
      'US30': 39000, 'US100': 18000, 'US500': 5200,
      // Commodities
      'XAU/USD': 2300, 'XAG/USD': 27.5, 'OIL/USD': 78.5
    };
    
    return symbolBasePrices[symbol] || 100 + Math.random() * 50;
  }

  getBaseVolumeForSymbol(symbol) {
    if (symbol.includes('/USD') || symbol.endsWith('USD')) {
      return 1000 + Math.random() * 1000;
    }
    return 100 + Math.random() * 100;
  }

  getVolatilityForSymbol(symbol) {
    // Return volatility as a percentage (0.01 = 1%)
    const volatilityMap = {
      // Forex
      'EUR/USD': 0.004, 'GBP/USD': 0.005, 'USD/JPY': 0.005,
      // Crypto
      'BTC/USD': 0.02, 'ETH/USD': 0.025, 'XRP/USD': 0.03,
      // Indices
      'US30': 0.008, 'US100': 0.01, 'US500': 0.007,
      // Commodities
      'XAU/USD': 0.009, 'XAG/USD': 0.015, 'OIL/USD': 0.018
    };
    
    return volatilityMap[symbol] || 0.01; // Default 1% volatility
  }

  normalizeSymbol(symbol) {
    // Convert different symbol formats to a standard format
    return symbol.replace(/[-_]/g, '/').toUpperCase();
  }

  getTimeframeInMs(timeframe) {
    const unit = timeframe.slice(-1);
    const value = parseInt(timeframe);
    
    switch(unit) {
      case 'm': return value * 60 * 1000; // minutes
      case 'h': return value * 60 * 60 * 1000; // hours
      case 'd': return value * 24 * 60 * 60 * 1000; // days
      case 'w': return value * 7 * 24 * 60 * 60 * 1000; // weeks
      default: return 60 * 1000; // default to 1 minute
    }
  }

  // Add this method to support live-trading.js
  getLatestPrice(symbol) {
    const normalizedSymbol = this.normalizeSymbol(symbol);
    const cacheKey = `${normalizedSymbol}_latest`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && (Date.now() - cached.timestamp) < 10000) { // 10s cache
      return cached.data;
    }
    
    // In a real implementation, this would fetch the latest price
    const basePrice = this.getBasePriceForSymbol(normalizedSymbol);
    const price = basePrice * (0.99 + Math.random() * 0.02); // ±1% from base
    
    this.cache.set(cacheKey, {
      data: price,
      timestamp: Date.now()
    });
    
    return price;
  }

  // Get all supported symbols
  getAllSymbols() {
    return Array.from(this.supportedSymbols).map(symbol => ({
      symbol,
      display_name: symbol // Assuming display_name is the same as symbol for now
    }));
  }

  // Get active symbols (for scanning)
  getActiveSymbols() {
    // For now, return all supported symbols
    // In a real implementation, this could filter based on market conditions
    return this.getAllSymbols();
  }

  // Initialize method for API integration
  async initialize(apiToken, appId) {
    console.log('MarketDataService initialized with API token and app ID');
    // Store API credentials for real market data fetching
    this.apiToken = apiToken;
    this.appId = appId;
    
    // In a real implementation, this would:
    // 1. Validate API credentials
    // 2. Establish connection to market data provider
    // 3. Load initial market data
    // 4. Set up real-time data streams
    
    return Promise.resolve();
  }
}

module.exports = MarketDataService;
