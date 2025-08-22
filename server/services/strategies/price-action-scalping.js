class PriceActionScalping {
  constructor() {
    this.name = 'price_action_scalping';
    this.minBars = 20;
  }

  detectTrend(candles) {
    if (candles.length < 5) return 0;
    let up = 0, down = 0;
    for (let i = 1; i < 5; i++) {
      if (candles[i].close > candles[i-1].close) up++;
      else down++;
    }
    return up > down * 1.5 ? 1 : (down > up * 1.5 ? -1 : 0);
  }

  findKeyLevels(candles, lookback = 20) {
    const levels = { support: [], resistance: [] };
    for (let i = 1; i < candles.length - 1; i++) {
      if (candles[i].low < candles[i-1].low && candles[i].low < candles[i+1].low) {
        levels.support.push(candles[i].low);
      }
      if (candles[i].high > candles[i-1].high && candles[i].high > candles[i+1].high) {
        levels.resistance.push(candles[i].high);
      }
    }
    return levels;
  }

  isPinBar(candle, trend) {
    const body = Math.abs(candle.close - candle.open);
    const upper = candle.high - Math.max(candle.open, candle.close);
    const lower = Math.min(candle.open, candle.close) - candle.low;
    const minWickRatio = 2;
    
    if (trend === 1) return lower > body * minWickRatio && lower > upper * 2;
    if (trend === -1) return upper > body * minWickRatio && upper > lower * 2;
    return false;
  }

  isEngulfing(curr, prev, trend) {
    const prevBody = Math.abs(prev.close - prev.open);
    const currBody = Math.abs(curr.close - curr.open);
    
    if (trend === 1) {
      return curr.close > curr.open && 
             prev.close < prev.open &&
             curr.open < prev.close &&
             curr.close > prev.open &&
             currBody > prevBody * 1.5;
    } else if (trend === -1) {
      return curr.close < curr.open && 
             prev.close > prev.open &&
             curr.open > prev.close &&
             curr.close < prev.open &&
             currBody > prevBody * 1.5;
    }
    return false;
  }

  generateSignals(candles) {
    if (candles.length < this.minBars) return [];
    
    const curr = candles[candles.length - 1];
    const prev = candles[candles.length - 2];
    const trend = this.detectTrend(candles);
    const levels = this.findKeyLevels(candles);
    const signals = [];

    // Check support for longs
    if (trend >= 0) {
      levels.support.forEach(level => {
        if (Math.abs(curr.low - level) <= 0.0002) {
          if (this.isPinBar(curr, 1)) {
            signals.push({
              type: 'BUY',
              price: curr.close,
              stopLoss: curr.low - 0.0001,
              takeProfit: curr.close + ((curr.close - curr.low) * 1.5),
              confidence: 0.7,
              pattern: 'pin_bar'
            });
          }
          if (this.isEngulfing(curr, prev, 1)) {
            signals.push({
              type: 'BUY',
              price: curr.close,
              stopLoss: Math.min(curr.low, prev.low) - 0.0001,
              takeProfit: curr.close + ((curr.close - Math.min(curr.low, prev.low)) * 1.5),
              confidence: 0.75,
              pattern: 'bullish_engulfing'
            });
          }
        }
      });
    }

    // Check resistance for shorts
    if (trend <= 0) {
      levels.resistance.forEach(level => {
        if (Math.abs(curr.high - level) <= 0.0002) {
          if (this.isPinBar(curr, -1)) {
            signals.push({
              type: 'SELL',
              price: curr.close,
              stopLoss: curr.high + 0.0001,
              takeProfit: curr.close - ((curr.high - curr.close) * 1.5),
              confidence: 0.7,
              pattern: 'pin_bar'
            });
          }
          if (this.isEngulfing(curr, prev, -1)) {
            signals.push({
              type: 'SELL',
              price: curr.close,
              stopLoss: Math.max(curr.high, prev.high) + 0.0001,
              takeProfit: curr.close - ((Math.max(curr.high, prev.high) - curr.close) * 1.5),
              confidence: 0.75,
              pattern: 'bearish_engulfing'
            });
          }
        }
      });
    }

    return signals;
  }
}

module.exports = PriceActionScalping;
