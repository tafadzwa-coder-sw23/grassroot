const axios = require('axios');
const WebSocket = require('ws');

class MarketDataService {
  constructor() {
    this.baseURL = 'https://api.deriv.com';
    this.wsURL = 'wss://ws.derivws.com/websockets/v3';
    this.token = null;
    this.appId = null;
    this.activeSymbols = [];
    this.api = null;
  }

  async initialize(token, appId) {
    this.token = token;
    this.appId = appId;
    try {
      if (!this.token || !this.appId) {
        console.warn('Deriv API credentials not set. Using public websocket endpoints.');
      }
      console.log('MarketDataService initialized');
    } catch (e) {
      console.error('Initialization error:', e.message);
    }
  }

  sendWSRequest(payload) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`${this.wsURL}?app_id=${this.appId}`, undefined, {
        headers: { Origin: 'https://localhost' }
      });
      let resolved = false;
      let authorized = !this.token; // if no token, skip auth
      ws.on('open', () => {
        try {
          if (this.token) {
            ws.send(JSON.stringify({ authorize: this.token }));
          } else {
            ws.send(JSON.stringify(payload));
          }
        } catch (e) { reject(e); }
      });
      ws.on('message', (msg) => {
        try {
          const data = JSON.parse(msg.toString());
          if (data.error) {
            reject(new Error(data.error.message));
          } else {
            // if we just authorized, send the real payload next
            if (!authorized && (data.authorize || data.msg_type === 'authorize')) {
              authorized = true;
              ws.send(JSON.stringify(payload));
              return;
            }
            resolved = true;
            resolve(data);
          }
        } catch (e) {
          reject(e);
        } finally {
          try { ws.close(); } catch {}
        }
      });
      ws.on('error', (err) => { if (!resolved) reject(err); });
      ws.on('close', () => {});
    });
  }

  async getAllSymbols() {
    try {
      let symbols = [];
      const resp = await this.sendWSRequest({ active_symbols: 'full', product_type: 'basic' });
      const { active_symbols } = resp || {};
      symbols = active_symbols || [];
      
      // Filter and categorize symbols based on the provided list
      const categorizedSymbols = symbols.map(symbol => ({
        symbol: symbol.symbol,
        display_name: symbol.display_name,
        market: symbol.market,
        market_display_name: symbol.market_display_name,
        submarket: symbol.submarket,
        submarket_display_name: symbol.submarket_display_name,
        pip: symbol.pip,
        display_decimals: symbol.display_decimals,
        exchange_is_open: symbol.exchange_is_open,
        is_trading_suspended: symbol.is_trading_suspended,
        category: this.categorizeSymbol(symbol)
      }));

      console.log(`Retrieved ${categorizedSymbols.length} total symbols from Deriv API`);
      
      return categorizedSymbols;
    } catch (error) {
      console.error('Error fetching symbols:', error);
      // Return fallback symbols for testing
      return this.getFallbackSymbols();
    }
  }

  categorizeSymbol(symbol) {
    const symbolMap = {
      // Synthetic Indices
      'WLDAUD': 'synthetic_index',
      'RDBEAR': 'synthetic_index',
      'BOOM300N': 'synthetic_index',
      'BOOM500': 'synthetic_index',
      'BOOM600': 'synthetic_index',
      'BOOM900': 'synthetic_index',
      'BOOM1000': 'synthetic_index',
      'RDBULL': 'synthetic_index',
      'CRASH300N': 'synthetic_index',
      'CRASH500': 'synthetic_index',
      'CRASH600': 'synthetic_index',
      'CRASH900': 'synthetic_index',
      'CRASH1000': 'synthetic_index',
      'WLDEUR': 'synthetic_index',
      'WLDGBP': 'synthetic_index',
      'WLDXAU': 'synthetic_index',
      'JD10': 'synthetic_index',
      'JD25': 'synthetic_index',
      'JD50': 'synthetic_index',
      'JD75': 'synthetic_index',
      'JD100': 'synthetic_index',
      'RB100': 'synthetic_index',
      'RB200': 'synthetic_index',
      'stpRNG': 'synthetic_index',
      'stpRNG2': 'synthetic_index',
      'stpRNG3': 'synthetic_index',
      'stpRNG4': 'synthetic_index',
      'stpRNG5': 'synthetic_index',
      'WLDUSD': 'synthetic_index',
      '1HZ10V': 'synthetic_index',
      'R_10': 'synthetic_index',
      '1HZ15V': 'synthetic_index',
      '1HZ25V': 'synthetic_index',
      'R_25': 'synthetic_index',
      '1HZ30V': 'synthetic_index',
      '1HZ50V': 'synthetic_index',
      'R_50': 'synthetic_index',
      '1HZ75V': 'synthetic_index',
      'R_75': 'synthetic_index',
      '1HZ90V': 'synthetic_index',
      '1HZ100V': 'synthetic_index',
      'R_100': 'synthetic_index',
      
      // Forex
      'frxAUDCAD': 'forex',
      'frxAUDCHF': 'forex',
      'frxAUDJPY': 'forex',
      'frxAUDNZD': 'forex',
      'frxAUDUSD': 'forex',
      'frxEURAUD': 'forex',
      'frxEURCAD': 'forex',
      'frxEURCHF': 'forex',
      'frxEURGBP': 'forex',
      'frxEURJPY': 'forex',
      'frxEURNZD': 'forex',
      'frxEURUSD': 'forex',
      'frxGBPAUD': 'forex',
      'frxGBPCAD': 'forex',
      'frxGBPCHF': 'forex',
      'frxGBPJPY': 'forex',
      'frxGBPNOK': 'forex',
      'frxGBPNZD': 'forex',
      'frxGBPUSD': 'forex',
      'frxNZDJPY': 'forex',
      'frxNZDUSD': 'forex',
      'frxUSDCAD': 'forex',
      'frxUSDCHF': 'forex',
      'frxUSDJPY': 'forex',
      'frxUSDMXN': 'forex',
      'frxUSDNOK': 'forex',
      'frxUSDPLN': 'forex',
      'frxUSDSEK': 'forex',
      
      // Indices
      'OTC_AS51': 'indices',
      'OTC_SX5E': 'indices',
      'OTC_FCHI': 'indices',
      'OTC_GDAXI': 'indices',
      'OTC_HSI': 'indices',
      'OTC_N225': 'indices',
      'OTC_AEX': 'indices',
      'OTC_SSMI': 'indices',
      'OTC_FTSE': 'indices',
      'OTC_SPC': 'indices',
      'OTC_NDX': 'indices',
      'OTC_DJI': 'indices',
      
      // Cryptocurrency
      'cryBTCUSD': 'cryptocurrency',
      'cryETHUSD': 'cryptocurrency',
      
      // Commodities
      'frxXAUUSD': 'commodities',
      'frxXPDUSD': 'commodities',
      'frxXPTUSD': 'commodities',
      'frxXAGUSD': 'commodities'
    };

    return symbolMap[symbol.symbol] || 'other';
  }

  async getMarketData(symbol, timeframe, limit = 100) {
    try {
      const normalized = MarketDataService.normalizeSymbol(symbol);
      const resp = await this.sendWSRequest({
        ticks_history: normalized,
        style: 'candles',
        granularity: this.getGranularity(timeframe),
        count: limit,
        end: 'latest'
      });
      const candles = resp?.candles || [];
      return candles.map(candle => ({
        timestamp: candle.epoch,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume || 0
      }));
    } catch (error) {
      console.error('Error fetching market data:', error);
      return [];
    }
  }

  async getActiveSymbols() {
    // Return a small, common set to drive scheduled analysis
    return ['frxEURUSD', 'frxGBPUSD', 'frxUSDJPY'];
  }

  getGranularity(timeframe) {
    const granularities = {
      '1m': 60,
      '5m': 300,
      '15m': 900,
      '1h': 3600,
      '4h': 14400,
      '1d': 86400
    };
    return granularities[timeframe] || 300;
  }

  // Map user-friendly symbols (e.g., EURUSD) to Deriv codes (e.g., frxEURUSD)
  static normalizeSymbol(userSymbol) {
    if (!userSymbol) return userSymbol;
    const upper = userSymbol.toUpperCase();
    if (/^[A-Z]{6}$/.test(upper)) {
      // Assume forex pair like EURUSD
      return `frx${upper.slice(0,3)}/${upper.slice(3)}`.replace('/', '');
    }
    // Already a Deriv code or synthetic
    return userSymbol;
  }

  getFallbackSymbols() {
    // Complete fallback with all the symbols you provided
    return [
      // Synthetic Indices
      { symbol: "WLDAUD", display_name: "AUD Basket", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "basket_indices" },
      { symbol: "RDBEAR", display_name: "Bear Market Index", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "market_indices" },
      { symbol: "BOOM300N", display_name: "Boom 300 Index", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "boom_crash" },
      { symbol: "BOOM500", display_name: "Boom 500 Index", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "boom_crash" },
      { symbol: "BOOM600", display_name: "Boom 600 Index", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "boom_crash" },
      { symbol: "BOOM900", display_name: "Boom 900 Index", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "boom_crash" },
      { symbol: "BOOM1000", display_name: "Boom 1000 Index", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "boom_crash" },
      { symbol: "RDBULL", display_name: "Bull Market Index", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "market_indices" },
      { symbol: "CRASH300N", display_name: "Crash 300 Index", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "boom_crash" },
      { symbol: "CRASH500", display_name: "Crash 500 Index", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "boom_crash" },
      { symbol: "CRASH600", display_name: "Crash 600 Index", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "boom_crash" },
      { symbol: "CRASH900", display_name: "Crash 900 Index", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "boom_crash" },
      { symbol: "CRASH1000", display_name: "Crash 1000 Index", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "boom_crash" },
      { symbol: "WLDEUR", display_name: "EUR Basket", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "basket_indices" },
      { symbol: "WLDGBP", display_name: "GBP Basket", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "basket_indices" },
      { symbol: "WLDXAU", display_name: "Gold Basket", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "basket_indices" },
      { symbol: "JD10", display_name: "Jump 10 Index", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "jump_indices" },
      { symbol: "JD25", display_name: "Jump 25 Index", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "jump_indices" },
      { symbol: "JD50", display_name: "Jump 50 Index", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "jump_indices" },
      { symbol: "JD75", display_name: "Jump 75 Index", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "jump_indices" },
      { symbol: "JD100", display_name: "Jump 100 Index", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "jump_indices" },
      { symbol: "RB100", display_name: "Range Break 100 Index", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "range_break" },
      { symbol: "RB200", display_name: "Range Break 200 Index", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "range_break" },
      { symbol: "stpRNG", display_name: "Step Index 100", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "step_indices" },
      { symbol: "stpRNG2", display_name: "Step Index 200", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "step_indices" },
      { symbol: "stpRNG3", display_name: "Step Index 300", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "step_indices" },
      { symbol: "stpRNG4", display_name: "Step Index 400", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "step_indices" },
      { symbol: "stpRNG5", display_name: "Step Index 500", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "step_indices" },
      { symbol: "WLDUSD", display_name: "USD Basket", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "basket_indices" },
      { symbol: "1HZ10V", display_name: "Volatility 10 (1s) Index", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "volatility_indices" },
      { symbol: "R_10", display_name: "Volatility 10 Index", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "volatility_indices" },
      { symbol: "1HZ15V", display_name: "Volatility 15 (1s) Index", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "volatility_indices" },
      { symbol: "1HZ25V", display_name: "Volatility 25 (1s) Index", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "volatility_indices" },
      { symbol: "R_25", display_name: "Volatility 25 Index", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "volatility_indices" },
      { symbol: "1HZ30V", display_name: "Volatility 30 (1s) Index", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "volatility_indices" },
      { symbol: "1HZ50V", display_name: "Volatility 50 (1s) Index", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "volatility_indices" },
      { symbol: "R_50", display_name: "Volatility 50 Index", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "volatility_indices" },
      { symbol: "1HZ75V", display_name: "Volatility 75 (1s) Index", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "volatility_indices" },
      { symbol: "R_75", display_name: "Volatility 75 Index", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "volatility_indices" },
      { symbol: "1HZ90V", display_name: "Volatility 90 (1s) Index", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "volatility_indices" },
      { symbol: "1HZ100V", display_name: "Volatility 100 (1s) Index", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "volatility_indices" },
      { symbol: "R_100", display_name: "Volatility 100 Index", market: "synthetic_index", market_display_name: "Synthetic Indices", submarket: "volatility_indices" },
      
      // Forex
      { symbol: "frxAUDCAD", display_name: "AUD/CAD", market: "forex", market_display_name: "Forex", submarket: "major_pairs" },
      { symbol: "frxAUDCHF", display_name: "AUD/CHF", market: "forex", market_display_name: "Forex", submarket: "major_pairs" },
      { symbol: "frxAUDJPY", display_name: "AUD/JPY", market: "forex", market_display_name: "Forex", submarket: "major_pairs" },
      { symbol: "frxAUDNZD", display_name: "AUD/NZD", market: "forex", market_display_name: "Forex", submarket: "major_pairs" },
      { symbol: "frxAUDUSD", display_name: "AUD/USD", market: "forex", market_display_name: "Forex", submarket: "major_pairs" },
      { symbol: "frxEURAUD", display_name: "EUR/AUD", market: "forex", market_display_name: "Forex", submarket: "major_pairs" },
      { symbol: "frxEURCAD", display_name: "EUR/CAD", market: "forex", market_display_name: "Forex", submarket: "major_pairs" },
      { symbol: "frxEURCHF", display_name: "EUR/CHF", market: "forex", market_display_name: "Forex", submarket: "major_pairs" },
      { symbol: "frxEURGBP", display_name: "EUR/GBP", market: "forex", market_display_name: "Forex", submarket: "major_pairs" },
      { symbol: "frxEURJPY", display_name: "EUR/JPY", market: "forex", market_display_name: "Forex", submarket: "major_pairs" },
      { symbol: "frxEURNZD", display_name: "EUR/NZD", market: "forex", market_display_name: "Forex", submarket: "major_pairs" },
      { symbol: "frxEURUSD", display_name: "EUR/USD", market: "forex", market_display_name: "Forex", submarket: "major_pairs" },
      { symbol: "frxGBPAUD", display_name: "GBP/AUD", market: "forex", market_display_name: "Forex", submarket: "major_pairs" },
      { symbol: "frxGBPCAD", display_name: "GBP/CAD", market: "forex", market_display_name: "Forex", submarket: "major_pairs" },
      { symbol: "frxGBPCHF", display_name: "GBP/CHF", market: "forex", market_display_name: "Forex", submarket: "major_pairs" },
      { symbol: "frxGBPJPY", display_name: "GBP/JPY", market: "forex", market_display_name: "Forex", submarket: "major_pairs" },
      { symbol: "frxGBPNOK", display_name: "GBP/NOK", market: "forex", market_display_name: "Forex", submarket: "minor_pairs" },
      { symbol: "frxGBPNZD", display_name: "GBP/NZD", market: "forex", market_display_name: "Forex", submarket: "major_pairs" },
      { symbol: "frxGBPUSD", display_name: "GBP/USD", market: "forex", market_display_name: "Forex", submarket: "major_pairs" },
      { symbol: "frxNZDJPY", display_name: "NZD/JPY", market: "forex", market_display_name: "Forex", submarket: "major_pairs" },
      { symbol: "frxNZDUSD", display_name: "NZD/USD", market: "forex", market_display_name: "Forex", submarket: "major_pairs" },
      { symbol: "frxUSDCAD", display_name: "USD/CAD", market: "forex", market_display_name: "Forex", submarket: "major_pairs" },
      { symbol: "frxUSDCHF", display_name: "USD/CHF", market: "forex", market_display_name: "Forex", submarket: "major_pairs" },
      { symbol: "frxUSDJPY", display_name: "USD/JPY", market: "forex", market_display_name: "Forex", submarket: "major_pairs" },
      { symbol: "frxUSDMXN", display_name: "USD/MXN", market: "forex", market_display_name: "Forex", submarket: "minor_pairs" },
      { symbol: "frxUSDNOK", display_name: "USD/NOK", market: "forex", market_display_name: "Forex", submarket: "minor_pairs" },
      { symbol: "frxUSDPLN", display_name: "USD/PLN", market: "forex", market_display_name: "Forex", submarket: "minor_pairs" },
      { symbol: "frxUSDSEK", display_name: "USD/SEK", market: "forex", market_display_name: "Forex", submarket: "minor_pairs" },
      
      // Indices
      { symbol: "OTC_AS51", display_name: "Australia 200", market: "indices", market_display_name: "Stock Indices", submarket: "asia_oceania" },
      { symbol: "OTC_SX5E", display_name: "Europe 50", market: "indices", market_display_name: "Stock Indices", submarket: "europe" },
      { symbol: "OTC_FCHI", display_name: "France 40", market: "indices", market_display_name: "Stock Indices", submarket: "europe" },
      { symbol: "OTC_GDAXI", display_name: "Germany 40", market: "indices", market_display_name: "Stock Indices", submarket: "europe" },
      { symbol: "OTC_HSI", display_name: "Hong Kong 50", market: "indices", market_display_name: "Stock Indices", submarket: "asia_oceania" },
      { symbol: "OTC_N225", display_name: "Japan 225", market: "indices", market_display_name: "Stock Indices", submarket: "asia_oceania" },
      { symbol: "OTC_AEX", display_name: "Netherlands 25", market: "indices", market_display_name: "Stock Indices", submarket: "europe" },
      { symbol: "OTC_SSMI", display_name: "Switzerland 20", market: "indices", market_display_name: "Stock Indices", submarket: "europe" },
      { symbol: "OTC_FTSE", display_name: "UK 100", market: "indices", market_display_name: "Stock Indices", submarket: "europe" },
      { symbol: "OTC_SPC", display_name: "US 500", market: "indices", market_display_name: "Stock Indices", submarket: "americas" },
      { symbol: "OTC_NDX", display_name: "US Tech 100", market: "indices", market_display_name: "Stock Indices", submarket: "americas" },
      { symbol: "OTC_DJI", display_name: "Wall Street 30", market: "indices", market_display_name: "Stock Indices", submarket: "americas" },
      
      // Cryptocurrency
      { symbol: "cryBTCUSD", display_name: "BTC/USD", market: "cryptocurrency", market_display_name: "Cryptocurrencies", submarket: "crypto_pairs" },
      { symbol: "cryETHUSD", display_name: "ETH/USD", market: "cryptocurrency", market_display_name: "Cryptocurrencies", submarket: "crypto_pairs" },
      
      // Commodities
      { symbol: "frxXAUUSD", display_name: "Gold/USD", market: "commodities", market_display_name: "Commodities", submarket: "metals" },
      { symbol: "frxXPDUSD", display_name: "Palladium/USD", market: "commodities", market_display_name: "Commodities", submarket: "metals" },
      { symbol: "frxXPTUSD", display_name: "Platinum/USD", market: "commodities", market_display_name: "Commodities", submarket: "metals" },
      { symbol: "frxXAGUSD", display_name: "Silver/USD", market: "commodities", market_display_name: "Commodities", submarket: "metals" }
    ];
  }
}

module.exports = MarketDataService;
