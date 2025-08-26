// Candle Range Theory (CRT) detector – price-action only
// Detects three-candle setup on a driving timeframe (default 1h) and
// optionally refines entries using a lower timeframe (default 5m) FVG.

const MarketDataService = require('./market-data');
const EventEmitter = require('events');

class CRTDetector extends EventEmitter {
  constructor(options = {}) {
    super();
    this.driverTimeframe = options.driverTimeframe || '1h';
    this.entryTimeframe = options.entryTimeframe || '5m';
    this.marketDataService = new MarketDataService();
    this.scanInterval = null;
    this.scanning = false;
    this.lastScanTime = {}; // Track last scan time per symbol
  }

  async detect(symbol, marketDataService) {
    try {
      const driver = await marketDataService.getMarketData(symbol, this.driverTimeframe, 300);
      if (!driver || driver.length < 3) return [];

      const setups = this.findThreeCandleSetups(driver);
      if (setups.length === 0) return [];

      // Use the most recent valid setup
      const setup = setups[setups.length - 1];

      // Optional refinement: look for FVG on lower timeframe after sweep
      let refinedEntry = null;
      try {
        const lower = await marketDataService.getMarketData(symbol, this.entryTimeframe, 200);
        refinedEntry = this.findFirstFVG(lower, setup.sweepDirection);
      } catch {}

      const direction = setup.sweepDirection === 'up' ? 'SELL' : 'BUY';
      const entryPrice = refinedEntry?.price ?? setup.entryHint;
      const stopLoss = setup.sweepDirection === 'up' ? setup.sweepHigh * 1.0005 : setup.sweepLow * 0.9995;
      const takeProfit = setup.sweepDirection === 'up' ? setup.crl : setup.crh;

      const confidence = Math.min(0.95, 0.65 + (refinedEntry ? 0.1 : 0));

      return [{
        type: 'CRT_THREE_CANDLE',
        direction,
        entryPrice,
        stopLoss,
        takeProfit,
        confidence,
        timeframe: this.entryTimeframe,
        chochPattern: 'crt_liquidity_sweep',
        riskReward: Math.abs(takeProfit - entryPrice) / Math.max(1e-9, Math.abs(entryPrice - stopLoss)),
        marketCondition: 'crt'
      }];
    } catch (e) {
      console.error('CRT detection error:', e);
      return [];
    }
  }

  findThreeCandleSetups(data) {
    const out = [];
    for (let i = 2; i < data.length; i++) {
      const c1 = data[i - 2]; // range candle
      const c2 = data[i - 1]; // sweep candle
      const c3 = data[i];     // trigger/confirmation candle
      if (!c1 || !c2 || !c3) continue;

      const crh = c1.high;
      const crl = c1.low;

      // Sweep up: breaks above CRH but closes back inside range
      const sweptUp = c2.high > crh && c2.close < crh;
      // Sweep down: breaks below CRL but closes back inside range
      const sweptDown = c2.low < crl && c2.close > crl;

      // Invalidation: sweep candle closes outside the range
      const invalid = c2.close > crh || c2.close < crl;
      if (invalid) continue;

      if (sweptUp) {
        out.push({
          sweepDirection: 'up',
          crh, crl,
          sweepHigh: c2.high,
          sweepLow: c2.low,
          entryHint: c3.open
        });
      } else if (sweptDown) {
        out.push({
          sweepDirection: 'down',
          crh, crl,
          sweepHigh: c2.high,
          sweepLow: c2.low,
          entryHint: c3.open
        });
      }
    }
    return out;
  }

  findFirstFVG(data, sweepDirection) {
    if (!data || data.length < 2) return null;
    for (let i = 1; i < data.length; i++) {
      const a = data[i - 1];
      const b = data[i];
      const bullGap = b.low > a.high;
      const bearGap = b.high < a.low;
      if (sweepDirection === 'up' && bearGap) {
        // short entry near gap top
        return { price: a.low };
      }
      if (sweepDirection === 'down' && bullGap) {
        // long entry near gap bottom
        return { price: a.high };
      }
    }
    return null;
  }

  // Scan all available symbols for CRT patterns
  async scanAllSymbols(timeframe = '1m') {
    if (this.scanning) {
      console.log('Scan already in progress');
      return;
    }

    this.scanning = true;
    console.log(`Starting CRT scan for all symbols on ${timeframe} timeframe`);
    
    try {
      const symbols = await this.marketDataService.getAllSymbols();
      const results = [];
      
      // Process symbols in parallel with concurrency limit
      const BATCH_SIZE = 5;
      for (let i = 0; i < symbols.length; i += BATCH_SIZE) {
        const batch = symbols.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(symbolObj => this.scanSymbol(symbolObj.symbol, timeframe))
      );
        results.push(...batchResults.flat());
      }
      
      // Emit any signals found
      results.forEach(signal => {
        if (signal) {
          this.emit('signal', signal);
        }
      });
      
      return results.filter(Boolean);
    } catch (error) {
      console.error('Error during CRT scan:', error);
      throw error;
    } finally {
      this.scanning = false;
      this.lastScanTime[timeframe] = Date.now();
    }
  }

  // Scan a single symbol for CRT patterns
  async scanSymbol(symbol, timeframe = '1m') {
    try {
      // Get recent market data
      const candles = await this.marketDataService.getMarketData(symbol, timeframe, 100);
      if (!candles || candles.length < 50) {
        console.log(`Insufficient data for ${symbol} ${timeframe}`);
        return null;
      }

      // Detect CRT patterns
      const patterns = await this.detectCRTPatterns(candles);
      
      // Filter for valid signals
      const signals = patterns
        .filter(pattern => this.isValidSignal(pattern))
        .map(pattern => this.formatSignal(pattern, symbol, timeframe));

      return signals.length > 0 ? signals : null;
    } catch (error) {
      console.error(`Error scanning ${symbol}:`, error);
      return null;
    }
  }

  // Detect CRT patterns in price data
  async detectCRTPatterns(candles) {
    // Implementation of CRT pattern detection
    // This is a simplified example - replace with your actual CRT detection logic
    const patterns = [];
    
    // Example: Look for strong momentum candles followed by retracement
    for (let i = 20; i < candles.length - 5; i++) {
      const current = candles[i];
      const prev = candles[i - 1];
      
      // Look for strong bullish candle
      const isStrongBullish = (current.close - current.open) / current.open > 0.005 && 
                            current.close > current.open * 1.01;
      
      if (isStrongBullish) {
        // Check for retracement in next few candles
        for (let j = 1; j <= 5; j++) {
          const nextCandle = candles[i + j];
          const retracement = (current.high - nextCandle.low) / (current.high - current.low);
          
          if (retracement >= 0.382 && retracement <= 0.618) {
            patterns.push({
              type: 'bullish_crt',
              entry: nextCandle.close,
              stopLoss: nextCandle.low * 0.998,
              takeProfit: current.high * 1.015,
              confidence: 0.7,
              timestamp: nextCandle.timestamp
            });
            break;
          }
        }
      }
    }
    
    return patterns;
  }

  // Validate if a pattern meets signal criteria
  isValidSignal(pattern) {
    // Minimum confidence threshold
    if (pattern.confidence < 0.6) return false;
    
    // Minimum risk/reward ratio
    const risk = pattern.entry - pattern.stopLoss;
    const reward = pattern.takeProfit - pattern.entry;
    if (reward / risk < 1.5) return false;
    
    return true;
  }

  // Format signal for consistency
  formatSignal(pattern, symbol, timeframe) {
    return {
      ...pattern,
      symbol,
      timeframe,
      timestamp: pattern.timestamp || new Date().toISOString(),
      detector: 'crt',
      strategy: this.getStrategyForTimeframe(timeframe)
    };
  }

  // Map timeframe to strategy
  getStrategyForTimeframe(timeframe) {
    const tf = timeframe.toLowerCase();
    if (tf === '1m' || tf === '5m') return 'scalping';
    if (tf === '15m' || tf === '1h') return 'daytrading';
    return 'swingtrading';
  }

  // Start continuous scanning
  startScanning(interval = 300000) { // Default 5 minutes
    if (this.scanInterval) {
      console.log('CRT scanner already running');
      return;
    }
    
    console.log(`Starting CRT scanner with ${interval/1000}s interval`);
    
    // Initial scan
    this.scanAllSymbols('1m').catch(console.error);
    
    // Set up interval for subsequent scans
    this.scanInterval = setInterval(() => {
      this.scanAllSymbols('1m').catch(console.error);
    }, interval);
  }

  // Stop scanning
  stopScanning() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
      console.log('CRT scanner stopped');
    }
  }
}

module.exports = new CRTDetector();
