const { SMA, EMA, RSI, MACD, BollingerBands } = require('technicalindicators');
const axios = require('axios');

class CHOCHDetector {
  constructor() {
    this.patterns = [];
    this.threshold = 0.7;
  }

  async analyze(symbol, timeframe, marketData = null) {
    try {
      if (!marketData) {
        const MarketDataService = require('./market-data');
        const marketDataService = new MarketDataService();
        marketData = await marketDataService.getMarketData(symbol, timeframe, 500);
      }

      if (!marketData || marketData.length < 50) {
        throw new Error('Insufficient market data for CHOCH analysis');
      }

      const analysis = {
        symbol,
        timeframe,
        timestamp: Date.now(),
        patterns: [],
        marketStructure: this.analyzeMarketStructure(marketData),
        liquidityLevels: this.identifyLiquidityLevels(marketData),
        orderBlocks: this.detectOrderBlocks(marketData),
        fairValueGaps: this.detectFairValueGaps(marketData),
        breakerBlocks: this.detectBreakerBlocks(marketData),
        mitigation: this.analyzeMitigation(marketData),
        score: 0
      };

      // Calculate confidence score
      analysis.score = this.calculateConfidenceScore(analysis);
      
      // Store analysis
      await this.storeAnalysis(analysis);
      
      return analysis;
    } catch (error) {
      console.error('CHOCH analysis error:', error);
      return this.getFallbackAnalysis(symbol, timeframe);
    }
  }

  analyzeMarketStructure(data) {
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const closes = data.map(d => d.close);

    // Identify swing highs and lows
    const swingHighs = this.findSwingPoints(highs, 'high');
    const swingLows = this.findSwingPoints(lows, 'low');

    // Determine market structure
    const structure = {
      trend: this.determineTrend(closes),
      higherHighs: this.countHigherHighs(swingHighs),
      lowerLows: this.countLowerLows(swingLows),
      breakOfStructure: this.detectBOS(swingHighs, swingLows),
      changeOfCharacter: this.detectCHOCH(swingHighs, swingLows),
      swingHighs,
      swingLows
    };

    return structure;
  }

  findSwingPoints(prices, type) {
    const swingPoints = [];
    const window = 5;

    for (let i = window; i < prices.length - window; i++) {
      const current = prices[i];
      const leftWindow = prices.slice(i - window, i);
      const rightWindow = prices.slice(i + 1, i + window + 1);

      const isSwing = type === 'high' 
        ? leftWindow.every(p => p < current) && rightWindow.every(p => p < current)
        : leftWindow.every(p => p > current) && rightWindow.every(p => p > current);

      if (isSwing) {
        swingPoints.push({
          index: i,
          price: current,
          timestamp: Date.now() - (prices.length - i) * 60000 // Approximate
        });
      }
    }

    return swingPoints;
  }

  determineTrend(closes) {
    const sma20 = SMA.calculate({ period: 20, values: closes });
    const sma50 = SMA.calculate({ period: 50, values: closes });
    
    if (sma20.length === 0 || sma50.length === 0) return 'neutral';
    
    const currentSMA20 = sma20[sma20.length - 1];
    const currentSMA50 = sma50[sma50.length - 1];
    
    if (currentSMA20 > currentSMA50) return 'bullish';
    if (currentSMA20 < currentSMA50) return 'bearish';
    return 'neutral';
  }

  countHigherHighs(swingHighs) {
    if (swingHighs.length < 2) return 0;
    
    let count = 0;
    for (let i = 1; i < swingHighs.length; i++) {
      if (swingHighs[i].price > swingHighs[i-1].price) count++;
    }
    return count;
  }

  countLowerLows(swingLows) {
    if (swingLows.length < 2) return 0;
    
    let count = 0;
    for (let i = 1; i < swingLows.length; i++) {
      if (swingLows[i].price < swingLows[i-1].price) count++;
    }
    return count;
  }

  detectBOS(swingHighs, swingLows) {
    const breakOfStructure = {
      bullish: false,
      bearish: false,
      level: null
    };

    // Check for bullish BOS (break above previous high)
    if (swingHighs.length >= 2) {
      const lastHigh = swingHighs[swingHighs.length - 1];
      const prevHigh = swingHighs[swingHighs.length - 2];
      
      if (lastHigh.price > prevHigh.price) {
        breakOfStructure.bullish = true;
        breakOfStructure.level = lastHigh.price;
      }
    }

    // Check for bearish BOS (break below previous low)
    if (swingLows.length >= 2) {
      const lastLow = swingLows[swingLows.length - 1];
      const prevLow = swingLows[swingLows.length - 2];
      
      if (lastLow.price < prevLow.price) {
        breakOfStructure.bearish = true;
        breakOfStructure.level = lastLow.price;
      }
    }

    return breakOfStructure;
  }

  detectCHOCH(swingHighs, swingLows) {
    const changeOfCharacter = {
      bullish: false,
      bearish: false,
      level: null
    };

    // Check for bullish CHOCH (break above previous lower high)
    if (swingHighs.length >= 3) {
      const lastHigh = swingHighs[swingHighs.length - 1];
      const prevHigh = swingHighs[swingHighs.length - 2];
      
      if (lastHigh.price > prevHigh.price) {
        changeOfCharacter.bullish = true;
        changeOfCharacter.level = lastHigh.price;
      }
    }

    // Check for bearish CHOCH (break below previous higher low)
    if (swingLows.length >= 3) {
      const lastLow = swingLows[swingLows.length - 1];
      const prevLow = swingLows[swingLows.length - 2];
      
      if (lastLow.price < prevLow.price) {
        changeOfCharacter.bearish = true;
        changeOfCharacter.level = lastLow.price;
      }
    }

    return changeOfCharacter;
  }

  identifyLiquidityLevels(data) {
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    
    const liquidityLevels = {
      buySide: [],
      sellSide: []
    };

    // Identify buy-side liquidity (below current price)
    const supportLevels = this.findSupportLevels(lows);
    liquidityLevels.buySide = supportLevels.map(level => ({
      level,
      type: 'support',
      strength: this.calculateLiquidityStrength(level, lows)
    }));

    // Identify sell-side liquidity (above current price)
    const resistanceLevels = this.findResistanceLevels(highs);
    liquidityLevels.sellSide = resistanceLevels.map(level => ({
      level,
      type: 'resistance',
      strength: this.calculateLiquidityStrength(level, highs)
    }));

    return liquidityLevels;
  }

  findSupportLevels(lows) {
    const levels = [];
    const threshold = 0.001; // 0.1% threshold
    
    for (let i = 0; i < lows.length; i++) {
      const level = lows[i];
      const isUnique = !levels.some(l => Math.abs(l - level) / level < threshold);
      
      if (isUnique) {
        levels.push(level);
      }
    }
    
    return levels.sort((a, b) => b - a).slice(0, 5);
  }

  findResistanceLevels(highs) {
    const levels = [];
    const threshold = 0.001;
    
    for (let i = 0; i < highs.length; i++) {
      const level = highs[i];
      const isUnique = !levels.some(l => Math.abs(l - level) / level < threshold);
      
      if (isUnique) {
        levels.push(level);
      }
    }
    
    return levels.sort((a, b) => a - b).slice(0, 5);
  }

  calculateLiquidityStrength(level, prices) {
    const occurrences = prices.filter(p => Math.abs(p - level) / level < 0.001);
    return occurrences.length;
  }

  detectOrderBlocks(data) {
    const orderBlocks = [];
    
    for (let i = 2; i < data.length - 2; i++) {
      const current = data[i];
      const prev = data[i-1];
      const next = data[i+1];
      
      // Bullish order block (down candle followed by strong up move)
      if (current.close < current.open && 
          next.close > next.open && 
          next.close > current.high) {
        orderBlocks.push({
          type: 'bullish',
          level: current.low,
          timestamp: current.timestamp,
          strength: Math.abs(next.close - current.close) / current.close
        });
      }
      
      // Bearish order block (up candle followed by strong down move)
      if (current.close > current.open && 
          next.close < next.open && 
          next.close < current.low) {
        orderBlocks.push({
          type: 'bearish',
          level: current.high,
          timestamp: current.timestamp,
          strength: Math.abs(next.close - current.close) / current.close
        });
      }
    }
    
    return orderBlocks;
  }

  detectFairValueGaps(data) {
    const gaps = [];
    
    for (let i = 1; i < data.length; i++) {
      const current = data[i];
      const previous = data[i-1];
      
      // Bullish FVG (current low > previous high)
      if (current.low > previous.high) {
        gaps.push({
          type: 'bullish',
          top: previous.high,
          bottom: current.low,
          midpoint: (previous.high + current.low) / 2,
          timestamp: current.timestamp
        });
      }
      
      // Bearish FVG (current high < previous low)
      if (current.high < previous.low) {
        gaps.push({
          type: 'bearish',
          top: current.high,
          bottom: previous.low,
          midpoint: (current.high + previous.low) / 2,
          timestamp: current.timestamp
        });
      }
    }
    
    return gaps;
  }

  detectBreakerBlocks(data) {
    const breakerBlocks = [];
    const orderBlocks = this.detectOrderBlocks(data);
    
    for (const ob of orderBlocks) {
      const isMitigated = this.checkMitigation(ob, data);
      if (isMitigated) {
        breakerBlocks.push({
          ...ob,
          type: ob.type === 'bullish' ? 'bearish' : 'bullish',
          status: 'breaker'
        });
      }
    }
    
    return breakerBlocks;
  }

  analyzeMitigation(data) {
    const mitigation = {
      levels: [],
      status: 'active'
    };
    
    const orderBlocks = this.detectOrderBlocks(data);
    const fairValueGaps = this.detectFairValueGaps(data);
    
    for (const ob of orderBlocks) {
      const isMitigated = this.checkMitigation(ob, data);
      mitigation.levels.push({
        type: ob.type,
        level: ob.level,
        mitigated: isMitigated,
        timestamp: ob.timestamp
      });
    }
    
    return mitigation;
  }

  checkMitigation(orderBlock, data) {
    const relevantData = data.filter(d => d.timestamp > orderBlock.timestamp);
    
    for (const candle of relevantData) {
      if (orderBlock.type === 'bullish' && candle.low <= orderBlock.level) {
        return true;
      }
      
      if (orderBlock.type === 'bearish' && candle.high >= orderBlock.level) {
        return true;
      }
    }
    
    return false;
  }

  calculateConfidenceScore(analysis) {
    let score = 0.5; // Base score
    
    // Market structure score
    if (analysis.marketStructure.trend !== 'neutral') {
      score += 0.1;
    }
    
    if (analysis.marketStructure.breakOfStructure.bullish || 
        analysis.marketStructure.breakOfStructure.bearish) {
      score += 0.15;
    }
    
    if (analysis.marketStructure.changeOfCharacter.bullish || 
        analysis.marketStructure.changeOfCharacter.bearish) {
      score += 0.2;
    }
    
    // Order blocks score
    if (analysis.orderBlocks && analysis.orderBlocks.length > 0) {
      score += 0.1;
    }
    
    // Fair value gaps score
    if (analysis.fairValueGaps && analysis.fairValueGaps.length > 0) {
      score += 0.05;
    }
    
    return Math.min(score, 1.0);
  }

  async storeAnalysis(analysis) {
    // This would typically store to database
    // For now, we'll just log it
    console.log(`CHOCH Analysis stored for ${analysis.symbol} ${analysis.timeframe}`);
  }

  getFallbackAnalysis(symbol, timeframe) {
    return {
      symbol,
      timeframe,
      timestamp: Date.now(),
      patterns: [],
      marketStructure: {
        trend: 'neutral',
        higherHighs: 0,
        lowerLows: 0,
        breakOfStructure: { bullish: false, bearish: false },
        changeOfCharacter: { bullish: false, bearish: false }
      },
      liquidityLevels: { buySide: [], sellSide: [] },
      orderBlocks: [],
      fairValueGaps: [],
      breakerBlocks: [],
      mitigation: { levels: [], status: 'active' },
      score: 0.5
    };
  }
}

module.exports = CHOCHDetector;
