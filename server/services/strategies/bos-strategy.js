class BOSStrategy {
  constructor() {
    this.name = 'bos_strategy';
    this.minBars = 50; // Minimum number of candles needed for analysis
    this.structureLookback = 20; // Number of candles to analyze for structure
    this.confirmationCandles = 2; // Number of candles to confirm break
    this.minVolatility = 0.0005; // Minimum ATR percentage for valid break
    this.debug = true;
  }

  log(...args) {
    if (this.debug) {
      console.log(`[${new Date().toISOString()}] [BOS]`, ...args);
    }
  }

  // Calculate Average True Range (ATR)
  calculateATR(candles, period = 14) {
    const trValues = [];
    
    for (let i = 1; i < candles.length; i++) {
      const prevClose = candles[i-1].close;
      const high = candles[i].high;
      const low = candles[i].low;
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trValues.push(tr);
    }
    
    // Simple moving average of true range
    if (trValues.length < period) return 0;
    
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += trValues[trValues.length - 1 - i];
    }
    
    return sum / period;
  }

  // Identify market structure (higher highs/lows or lower highs/lows)
  identifyMarketStructure(candles) {
    if (candles.length < this.structureLookback) {
      return { trend: 'neutral', swingHighs: [], swingLows: [] };
    }

    const swingHighs = [];
    const swingLows = [];
    const lookback = this.structureLookback;
    
    // Find swing highs and lows
    for (let i = 2; i < lookback - 2; i++) {
      const idx = candles.length - lookback + i;
      const prev = candles[idx - 1];
      const curr = candles[idx];
      const next = candles[idx + 1];
      
      // Swing high
      if (curr.high > prev.high && curr.high > next.high) {
        swingHighs.push({
          price: curr.high,
          index: idx,
          timestamp: curr.timestamp
        });
      }
      
      // Swing low
      if (curr.low < prev.low && curr.low < next.low) {
        swingLows.push({
          price: curr.low,
          index: idx,
          timestamp: curr.timestamp
        });
      }
    }
    
    // Determine trend based on swing points
    let trend = 'neutral';
    if (swingHighs.length >= 2 && swingLows.length >= 2) {
      const higherHighs = swingHighs[swingHighs.length - 1].price > swingHighs[swingHighs.length - 2].price;
      const higherLows = swingLows[swingLows.length - 1].price > swingLows[swingLows.length - 2].price;
      const lowerHighs = swingHighs[swingHighs.length - 1].price < swingHighs[swingHighs.length - 2].price;
      const lowerLows = swingLows[swingLows.length - 1].price < swingLows[swingLows.length - 2].price;
      
      if (higherHighs && higherLows) trend = 'uptrend';
      else if (lowerHighs && lowerLows) trend = 'downtrend';
      else if (higherHighs && lowerLows) trend = 'ranging';
    }
    
    return { trend, swingHighs, swingLows };
  }

  // Check for Break of Structure (BOS)
  checkForBOS(candles, structure) {
    if (candles.length < 5 || structure.trend === 'neutral') {
      return null;
    }
    
    const recentCandles = candles.slice(-5);
    const atr = this.calculateATR(candles, 14);
    const currentPrice = recentCandles[recentCandles.length - 1].close;
    
    // For uptrend, look for break below recent swing low
    if (structure.trend === 'uptrend' && structure.swingLows.length >= 2) {
      const recentSwingLow = structure.swingLows[structure.swingLows.length - 1];
      
      // Check if price broke below swing low with confirmation
      const breakCandle = recentCandles.find(c => c.low < recentSwingLow.price);
      if (breakCandle) {
        const breakIndex = candles.findIndex(c => c.timestamp === breakCandle.timestamp);
        const confirmationCandles = candles.slice(breakIndex).slice(0, this.confirmationCandles + 1);
        
        if (confirmationCandles.length >= this.confirmationCandles &&
            confirmationCandles.every(c => c.close < recentSwingLow.price)) {
          
          // Check for significant move (at least 1.5 ATR)
          const moveSize = recentSwingLow.price - currentPrice;
          if (moveSize > atr * 1.5) {
            return {
              type: 'downtrend_bos',
              entry: currentPrice,
              stopLoss: recentSwingLow.price + (atr * 0.5), // SL above recent swing low
              takeProfit: currentPrice - (moveSize * 1.5), // 1.5R target
              confidence: Math.min(0.9, moveSize / atr), // Higher confidence for stronger moves
              timestamp: new Date().toISOString()
            };
          }
        }
      }
    }
    // For downtrend, look for break above recent swing high
    else if (structure.trend === 'downtrend' && structure.swingHighs.length >= 2) {
      const recentSwingHigh = structure.swingHighs[structure.swingHighs.length - 1];
      
      // Check if price broke above swing high with confirmation
      const breakCandle = recentCandles.find(c => c.high > recentSwingHigh.price);
      if (breakCandle) {
        const breakIndex = candles.findIndex(c => c.timestamp === breakCandle.timestamp);
        const confirmationCandles = candles.slice(breakIndex).slice(0, this.confirmationCandles + 1);
        
        if (confirmationCandles.length >= this.confirmationCandles &&
            confirmationCandles.every(c => c.close > recentSwingHigh.price)) {
          
          // Check for significant move (at least 1.5 ATR)
          const moveSize = currentPrice - recentSwingHigh.price;
          if (moveSize > atr * 1.5) {
            return {
              type: 'uptrend_bos',
              entry: currentPrice,
              stopLoss: recentSwingHigh.price - (atr * 0.5), // SL below recent swing high
              takeProfit: currentPrice + (moveSize * 1.5), // 1.5R target
              confidence: Math.min(0.9, moveSize / atr), // Higher confidence for stronger moves
              timestamp: new Date().toISOString()
            };
          }
        }
      }
    }
    
    return null;
  }

  // Main method to generate trading signals
  generateSignals(candles, symbol) {
    if (!candles || candles.length < this.minBars) {
      this.log(`Insufficient data. Need at least ${this.minBars} candles, got ${candles?.length || 0}`);
      return [];
    }

    try {
      // Calculate ATR for volatility check
      const atr = this.calculateATR(candles);
      const currentPrice = candles[candles.length - 1].close;
      const atrPercent = atr / currentPrice;
      
      // Skip if market is too quiet
      if (atrPercent < this.minVolatility) {
        this.log('Market volatility too low for BOS trading');
        return [];
      }
      
      // Identify market structure
      const structure = this.identifyMarketStructure(candles);
      
      // Check for BOS patterns
      const bosSignal = this.checkForBOS(candles, structure);
      
      if (bosSignal) {
        this.log(`BOS signal detected: ${bosSignal.type} on ${symbol}`);
        return [{
          ...bosSignal,
          symbol,
          strategy: this.name,
          timeframe: '1m',
          riskReward: Math.abs((bosSignal.takeProfit - bosSignal.entry) / (bosSignal.entry - bosSignal.stopLoss)),
          atr,
          atrPercent,
          volume: candles[candles.length - 1].volume || 0
        }];
      }
      
      return [];
    } catch (error) {
      console.error('Error in BOS strategy:', error);
      return [];
    }
  }
}

module.exports = BOSStrategy;
