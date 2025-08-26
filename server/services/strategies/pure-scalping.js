class PureScalpingStrategy {
  constructor() {
    this.name = 'pure_scalping';
    this.minBars = 20;
    this.session = {
      london: { start: 6, end: 18 },
      newyork: { start: 12, end: 22 }
    };
    this.debug = true;
    this.syntheticIndicies = ['STEP', 'BOOM', 'CRASH', 'JUMP', 'R_', '1HZ'];
  }

  isSynthetic(symbol) {
    return this.syntheticIndicies.some(indicator => symbol.includes(indicator));
  }

  getPipValue(symbol) {
    // For synthetic indices, use larger pip value (0.1 for Step Index)
    return this.isSynthetic(symbol) ? 0.1 : 0.0001;
  }

  log(...args) {
    if (this.debug) {
      console.log(`[${new Date().toISOString()}]`, ...args);
    }
  }

  isTradingSession() {
    const now = new Date();
    const hours = now.getUTCHours();
    return (hours >= this.session.london.start && hours < this.session.london.end) ||
           (hours >= this.session.newyork.start && hours < this.session.newyork.end);
  }

  identifyTrend(candles, length = 5) {
    if (candles.length < length) return 'range';
    
    let higherHighs = 0, lowerLows = 0;
    for (let i = 1; i < length; i++) {
      if (candles[i].high > candles[i-1].high) higherHighs++;
      if (candles[i].low < candles[i-1].low) lowerLows++;
    }
    
    if (higherHighs >= 3 && higherHighs > lowerLows) return 'uptrend';
    if (lowerLows >= 3 && lowerLows > higherHighs) return 'downtrend';
    return 'range';
  }

  findKeyLevels(candles, lookback = 20) {
    const levels = { support: [], resistance: [] };
    
    for (let i = 3; i < candles.length - 3; i++) {
      // Support levels (swing lows)
      if (candles[i].low < candles[i-1].low && 
          candles[i].low < candles[i+1].low &&
          candles[i-1].low > candles[i-2].low &&
          candles[i+1].low > candles[i+2].low) {
        levels.support.push({
          price: candles[i].low,
          strength: 1,
          index: i
        });
      }
      
      // Resistance levels (swing highs)
      if (candles[i].high > candles[i-1].high && 
          candles[i].high > candles[i+1].high &&
          candles[i-1].high < candles[i-2].high &&
          candles[i+1].high < candles[i+2].high) {
        levels.resistance.push({
          price: candles[i].high,
          strength: 1,
          index: i
        });
      }
    }
    
    return levels;
  }

  isPinBar(candle, trend) {
    const body = Math.abs(candle.close - candle.open);
    const upper = candle.high - Math.max(candle.open, candle.close);
    const lower = Math.min(candle.open, candle.close) - candle.low;
    const range = candle.high - candle.low;
    
    // Valid pin bar has small body and long wick in one direction
    if (body > range * 0.3) return false;
    
    if (trend === 'uptrend' || trend === 'range') {
      return lower > body * 2 && lower > upper * 2;
    } else if (trend === 'downtrend' || trend === 'range') {
      return upper > body * 2 && upper > lower * 2;
    }
    
    return false;
  }

  isEngulfing(current, previous, trend) {
    const prevBody = Math.abs(previous.close - previous.open);
    const currBody = Math.abs(current.close - current.open);
    
    if (trend === 'uptrend' || trend === 'range') {
      return current.close > current.open &&
             previous.close < previous.open &&
             current.open <= previous.close &&
             current.close > previous.open &&
             currBody > prevBody * 1.5;
    } else if (trend === 'downtrend' || trend === 'range') {
      return current.close < current.open &&
             previous.close > previous.open &&
             current.open >= previous.close &&
             current.close < previous.open &&
             currBody > prevBody * 1.5;
    }
    
    return false;
  }

  generateSignals(candles, symbol = '') {
    try {
      if (!this.isTradingSession() || candles.length < this.minBars) {
        this.log(`Not enough bars (${candles.length}/${this.minBars})`);
        return [];
      }

      const current = candles[candles.length - 1];
      const previous = candles[candles.length - 2];
      const trend = this.identifyTrend(candles);
      const levels = this.findKeyLevels(candles);
      const signals = [];
      
      // Adjust pip value based on symbol type
      const pip = this.getPipValue(symbol);
      const levelTolerance = pip * 3; // 3 pips tolerance for level hits
      const stopDistance = pip * 5;   // 5 pips for stop loss
      
      this.log(`Analyzing ${symbol || 'pair'}, pip value: ${pip}, price: ${current.close}`);

      // Check for long setups
      if (trend !== 'downtrend') {
        for (const level of levels.support) {
          const distance = Math.abs(current.low - level.price);
          if (distance <= levelTolerance) {
            this.log(`Near support level: ${level.price}, distance: ${distance}`);
            
            if (this.isPinBar(current, 'uptrend')) {
              const stopLoss = current.low - stopDistance;
              const takeProfit = current.close + ((current.close - stopLoss) * 1.5);
              
              signals.push({
                type: 'BUY',
                price: current.close,
                stopLoss,
                takeProfit,
                confidence: 0.75,
                pattern: 'pin_bar',
                level: 'support',
                trend,
                symbol,
                timestamp: new Date().toISOString()
              });
              this.log(`Generated BUY signal at ${current.close}, SL: ${stopLoss}, TP: ${takeProfit}`);
            }
            
            if (this.isEngulfing(current, previous, 'uptrend')) {
              const stopLoss = Math.min(current.low, previous.low) - stopDistance;
              const takeProfit = current.close + ((current.close - Math.min(current.low, previous.low)) * 1.5);
              
              signals.push({
                type: 'BUY',
                price: current.close,
                stopLoss,
                takeProfit,
                confidence: 0.8,
                pattern: 'bullish_engulfing',
                level: 'support',
                trend,
                symbol,
                timestamp: new Date().toISOString()
              });
              this.log(`Generated BUY signal at ${current.close}, SL: ${stopLoss}, TP: ${takeProfit}`);
            }
          }
        }
      }

      // Check for short setups
      if (trend !== 'uptrend') {
        for (const level of levels.resistance) {
          const distance = Math.abs(current.high - level.price);
          if (distance <= levelTolerance) {
            this.log(`Near resistance level: ${level.price}, distance: ${distance}`);
            
            if (this.isPinBar(current, 'downtrend')) {
              const stopLoss = current.high + stopDistance;
              const takeProfit = current.close - ((stopLoss - current.close) * 1.5);
              
              signals.push({
                type: 'SELL',
                price: current.close,
                stopLoss,
                takeProfit,
                confidence: 0.75,
                pattern: 'pin_bar',
                level: 'resistance',
                trend,
                symbol,
                timestamp: new Date().toISOString()
              });
              this.log(`Generated SELL signal at ${current.close}, SL: ${stopLoss}, TP: ${takeProfit}`);
            }
            
            if (this.isEngulfing(current, previous, 'downtrend')) {
              const stopLoss = Math.max(current.high, previous.high) + stopDistance;
              const takeProfit = current.close - ((Math.max(current.high, previous.high) - current.close) * 1.5);
              
              signals.push({
                type: 'SELL',
                price: current.close,
                stopLoss,
                takeProfit,
                confidence: 0.8,
                pattern: 'bearish_engulfing',
                level: 'resistance',
                trend,
                symbol,
                timestamp: new Date().toISOString()
              });
              this.log(`Generated SELL signal at ${current.close}, SL: ${stopLoss}, TP: ${takeProfit}`);
            }
          }
        }
      }
      
      this.log(`Generated ${signals.length} signals for ${symbol || 'pair'}`);
      return signals;
      
    } catch (error) {
      console.error('Error in generateSignals:', error);
      return [];
    }
  }
}

module.exports = PureScalpingStrategy;
