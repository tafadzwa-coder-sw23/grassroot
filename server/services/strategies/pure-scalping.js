class PureScalpingStrategy {
  constructor() {
    this.name = 'pure_scalping';
    this.minBars = 20;
    this.session = {
      london: { start: 7, end: 16 },
      newyork: { start: 13, end: 22 }
    };
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

  generateSignals(candles) {
    if (!this.isTradingSession() || candles.length < this.minBars) return [];
    
    const current = candles[candles.length - 1];
    const previous = candles[candles.length - 2];
    const trend = this.identifyTrend(candles);
    const levels = this.findKeyLevels(candles);
    const signals = [];

    // Check for long setups
    if (trend !== 'downtrend') {
      // Check support levels for longs
      levels.support.forEach(level => {
        if (Math.abs(current.low - level.price) <= 0.0002) {
          if (this.isPinBar(current, 'uptrend')) {
            signals.push({
              type: 'BUY',
              price: current.close,
              stopLoss: current.low - 0.0001,
              takeProfit: current.close + ((current.close - current.low) * 1.5),
              confidence: 0.75,
              pattern: 'pin_bar',
              level: 'support',
              trend
            });
          }
          
          if (this.isEngulfing(current, previous, 'uptrend')) {
            signals.push({
              type: 'BUY',
              price: current.close,
              stopLoss: Math.min(current.low, previous.low) - 0.0001,
              takeProfit: current.close + ((current.close - Math.min(current.low, previous.low)) * 1.5),
              confidence: 0.8,
              pattern: 'bullish_engulfing',
              level: 'support',
              trend
            });
          }
        }
      });
    }

    // Check for short setups
    if (trend !== 'uptrend') {
      // Check resistance levels for shorts
      levels.resistance.forEach(level => {
        if (Math.abs(current.high - level.price) <= 0.0002) {
          if (this.isPinBar(current, 'downtrend')) {
            signals.push({
              type: 'SELL',
              price: current.close,
              stopLoss: current.high + 0.0001,
              takeProfit: current.close - ((current.high - current.close) * 1.5),
              confidence: 0.75,
              pattern: 'pin_bar',
              level: 'resistance',
              trend
            });
          }
          
          if (this.isEngulfing(current, previous, 'downtrend')) {
            signals.push({
              type: 'SELL',
              price: current.close,
              stopLoss: Math.max(current.high, previous.high) + 0.0001,
              takeProfit: current.close - ((Math.max(current.high, previous.high) - current.close) * 1.5),
              confidence: 0.8,
              pattern: 'bearish_engulfing',
              level: 'resistance',
              trend
            });
          }
        }
      });
    }

    return signals;
  }
}

module.exports = PureScalpingStrategy;
