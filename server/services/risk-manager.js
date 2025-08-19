const { ATR, BollingerBands } = require('technicalindicators');

class RiskManager {
  constructor() {
    this.maxRiskPerTrade = 0.02; // 2% max risk per trade
    this.maxDailyLoss = 0.05; // 5% max daily loss
    this.maxDrawdown = 0.1; // 10% max drawdown
    this.correlationThreshold = 0.7; // Correlation threshold for diversification
  }

  async analyzeRisk(symbol, marketData = null, positionSize = 1) {
    try {
      if (!marketData) {
        const MarketDataService = require('./market-data');
        const marketDataService = new MarketDataService();
        marketData = await marketDataService.getMarketData(symbol, '1h', 100);
      }

      if (!marketData || marketData.length < 20) {
        throw new Error('Insufficient market data for risk analysis');
      }

      const riskAnalysis = {
        symbol,
        timestamp: Date.now(),
        riskScore: 0,
        volatility: this.calculateVolatility(marketData),
        atr: this.calculateATR(marketData),
        bollingerBands: this.calculateBollingerBands(marketData),
        supportResistance: this.identifySupportResistance(marketData),
        correlation: await this.calculateCorrelation(symbol),
        liquidity: this.assessLiquidity(marketData),
        newsImpact: await this.assessNewsImpact(symbol),
        positionSizing: this.calculatePositionSize(marketData, positionSize),
        riskMetrics: this.calculateRiskMetrics(marketData),
        recommendations: []
      };

      // Calculate overall risk score
      riskAnalysis.riskScore = this.calculateRiskScore(riskAnalysis);
      
      // Generate recommendations
      riskAnalysis.recommendations = this.generateRecommendations(riskAnalysis);

      return riskAnalysis;
    } catch (error) {
      console.error('Risk analysis error:', error);
      return this.getFallbackRiskAnalysis(symbol);
    }
  }

  calculateVolatility(data) {
    const returns = [];
    for (let i = 1; i < data.length; i++) {
      const ret = (data[i].close - data[i-1].close) / data[i-1].close;
      returns.push(ret);
    }

    const mean = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance * 252) * 100; // Annualized volatility in %

    return {
      daily: Math.sqrt(variance) * 100,
      annualized: volatility,
      classification: this.classifyVolatility(volatility)
    };
  }

  classifyVolatility(volatility) {
    if (volatility < 10) return 'low';
    if (volatility < 20) return 'medium';
    if (volatility < 30) return 'high';
    return 'extreme';
  }

  calculateATR(data) {
    const atr = ATR.calculate({
      high: data.map(d => d.high),
      low: data.map(d => d.low),
      close: data.map(d => d.close),
      period: 14
    });

    return atr[atr.length - 1] || 0;
  }

  calculateBollingerBands(data) {
    const bb = BollingerBands.calculate({
      period: 20,
      stdDev: 2,
      values: data.map(d => d.close)
    });

    const latest = bb[bb.length - 1];
    const currentPrice = data[data.length - 1].close;

    return {
      upper: latest.upper,
      middle: latest.middle,
      lower: latest.lower,
      position: (currentPrice - latest.lower) / (latest.upper - latest.lower),
      squeeze: this.detectSqueeze(latest, data)
    };
  }

  detectSqueeze(bollingerBands, data) {
    const atr = this.calculateATR(data);
    const bandwidth = (bollingerBands.upper - bollingerBands.lower) / bollingerBands.middle;
    
    return {
      active: bandwidth < 0.05 && atr < this.calculateATR(data.slice(-20)) * 0.8,
      strength: bandwidth
    };
  }

  identifySupportResistance(data) {
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const closes = data.map(d => d.close);
    const currentPrice = closes[closes.length - 1];

    // Find support and resistance levels
    const supportLevels = this.findSupportLevels(lows);
    const resistanceLevels = this.findResistanceLevels(highs);

    // Calculate distances
    const nearestSupport = supportLevels.find(s => s < currentPrice);
    const nearestResistance = resistanceLevels.find(r => r > currentPrice);

    return {
      support: {
        levels: supportLevels,
        nearest: nearestSupport,
        distance: nearestSupport ? (currentPrice - nearestSupport) / currentPrice : null
      },
      resistance: {
        levels: resistanceLevels,
        nearest: nearestResistance,
        distance: nearestResistance ? (nearestResistance - currentPrice) / currentPrice : null
      }
    };
  }

  findSupportLevels(lows) {
    const levels = [];
    const threshold = 0.001;

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

  async calculateCorrelation(symbol) {
    // This would typically fetch correlation data from external API
    // For now, return mock data
    return {
      correlatedPairs: [
        { symbol: 'EURUSD', correlation: 0.85 },
        { symbol: 'GBPUSD', correlation: 0.75 },
        { symbol: 'USDJPY', correlation: -0.65 }
      ],
      diversificationScore: 0.7
    };
  }

  assessLiquidity(data) {
    const volumes = data.map(d => d.volume);
    const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
    const currentVolume = volumes[volumes.length - 1];

    return {
      averageVolume: avgVolume,
      currentVolume: currentVolume,
      liquidityRatio: currentVolume / avgVolume,
      classification: this.classifyLiquidity(currentVolume / avgVolume)
    };
  }

  classifyLiquidity(ratio) {
    if (ratio > 1.5) return 'high';
    if (ratio > 0.8) return 'medium';
    if (ratio > 0.5) return 'low';
    return 'very_low';
  }

  async assessNewsImpact(symbol) {
    // This would typically fetch news sentiment from external API
    // For now, return mock data
    return {
      sentiment: 'neutral',
      impact: 0.1,
      events: [],
      riskLevel: 'low'
    };
  }

  calculatePositionSize(data, desiredSize) {
    const volatility = this.calculateVolatility(data);
    const atr = this.calculateATR(data);
    const currentPrice = data[data.length - 1].close;

    // Kelly Criterion for position sizing
    const winRate = 0.55; // Historical win rate
    const avgWin = 0.02; // Average win percentage
    const avgLoss = 0.01; // Average loss percentage
    
    const kellyFraction = (winRate * avgWin - (1 - winRate) * avgLoss) / avgWin;
    const adjustedSize = Math.min(desiredSize * kellyFraction, this.maxRiskPerTrade);

    return {
      baseSize: desiredSize,
      adjustedSize,
      kellyFraction,
      maxPosition: this.maxRiskPerTrade,
      stopLossDistance: atr * 2,
      positionValue: adjustedSize * currentPrice
    };
  }

  calculateRiskMetrics(data) {
    const returns = [];
    for (let i = 1; i < data.length; i++) {
      const ret = (data[i].close - data[i-1].close) / data[i-1].close;
      returns.push(ret);
    }

    const sortedReturns = returns.sort((a, b) => a - b);
    const var95 = sortedReturns[Math.floor(sortedReturns.length * 0.05)];
    const var99 = sortedReturns[Math.floor(sortedReturns.length * 0.01)];

    return {
      var95: Math.abs(var95) * 100,
      var99: Math.abs(var99) * 100,
      maxDrawdown: this.calculateMaxDrawdown(data),
      sharpeRatio: this.calculateSharpeRatio(returns),
      sortinoRatio: this.calculateSortinoRatio(returns)
    };
  }

  calculateMaxDrawdown(data) {
    let maxDrawdown = 0;
    let peak = data[0].close;

    for (let i = 1; i < data.length; i++) {
      if (data[i].close > peak) {
        peak = data[i].close;
      } else {
        const drawdown = (peak - data[i].close) / peak;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
    }

    return maxDrawdown * 100;
  }

  calculateSharpeRatio(returns) {
    const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const excessReturns = returns.map(ret => ret - 0.0001); // Risk-free rate 0.01%
    const meanExcess = excessReturns.reduce((sum, ret) => sum + ret, 0) / excessReturns.length;
    const stdDev = Math.sqrt(excessReturns.reduce((sum, ret) => sum + Math.pow(ret - meanExcess, 2), 0) / excessReturns.length);
    
    return stdDev === 0 ? 0 : (meanExcess * 252) / (stdDev * Math.sqrt(252));
  }

  calculateSortinoRatio(returns) {
    const meanReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const downsideReturns = returns.filter(ret => ret < 0);
    const downsideDeviation = Math.sqrt(downsideReturns.reduce((sum, ret) => sum + Math.pow(ret, 2), 0) / downsideReturns.length);
    
    return downsideDeviation === 0 ? 0 : (meanReturn * 252) / (downsideDeviation * Math.sqrt(252));
  }

  calculateRiskScore(riskAnalysis) {
    let score = 0;
    
    // Volatility component (30%)
    const volatilityWeight = 0.3;
    const volatilityScore = this.getVolatilityScore(riskAnalysis.volatility.annualized);
    score += volatilityScore * volatilityWeight;
    
    // Liquidity component (20%)
    const liquidityWeight = 0.2;
    const liquidityScore = this.getLiquidityScore(riskAnalysis.liquidity.liquidityRatio);
    score += liquidityScore * liquidityWeight;
    
    // Technical component (25%)
    const technicalWeight = 0.25;
    const technicalScore = this.getTechnicalScore(riskAnalysis.supportResistance, riskAnalysis.bollingerBands);
    score += technicalScore * technicalWeight;
    
    // Correlation component (15%)
    const correlationWeight = 0.15;
    const correlationScore = 1 - riskAnalysis.correlation.diversificationScore;
    score += correlationScore * correlationWeight;
    
    // News component (10%)
    const newsWeight = 0.1;
    const newsScore = riskAnalysis.newsImpact.impact;
    score += newsScore * newsWeight;
    
    return Math.min(score, 1.0);
  }

  getVolatilityScore(volatility) {
    if (volatility < 10) return 0.1;
    if (volatility < 20) return 0.3;
    if (volatility < 30) return 0.6;
    if (volatility < 40) return 0.8;
    return 1.0;
  }

  getLiquidityScore(liquidityRatio) {
    if (liquidityRatio > 1.5) return 0.1;
    if (liquidityRatio > 1.0) return 0.3;
    if (liquidityRatio > 0.7) return 0.5;
    if (liquidityRatio > 0.5) return 0.7;
    return 1.0;
  }

  getTechnicalScore(supportResistance, bollingerBands) {
    let score = 0;
    
    // Distance to support/resistance
    const supportDistance = supportResistance.support.distance || 0;
    const resistanceDistance = supportResistance.resistance.distance || 0;
    
    if (supportDistance < 0.01) score += 0.3;
    if (resistanceDistance < 0.01) score += 0.3;
    
    // Bollinger Bands position
    if (bollingerBands.position > 0.8) score += 0.2;
    if (bollingerBands.position < 0.2) score += 0.2;
    
    return Math.min(score, 1.0);
  }

  generateRecommendations(riskAnalysis) {
    const recommendations = [];
    
    if (riskAnalysis.riskScore > 0.7) {
      recommendations.push({
        type: 'warning',
        message: 'High risk detected - consider reducing position size',
        action: 'reduce_position'
      });
    }
    
    if (riskAnalysis.volatility.classification === 'extreme') {
      recommendations.push({
        type: 'warning',
        message: 'Extreme volatility - use wider stops',
        action: 'adjust_stops'
      });
    }
    
    if (riskAnalysis.liquidity.classification === 'very_low') {
      recommendations.push({
        type: 'warning',
        message: 'Low liquidity - avoid large positions',
        action: 'reduce_size'
      });
    }
    
    if (riskAnalysis.supportResistance.support.distance < 0.005) {
      recommendations.push({
        type: 'opportunity',
        message: 'Near strong support level',
        action: 'consider_long'
      });
    }
    
    if (riskAnalysis.supportResistance.resistance.distance < 0.005) {
      recommendations.push({
        type: 'opportunity',
        message: 'Near strong resistance level',
        action: 'consider_short'
      });
    }
    
    if (riskAnalysis.bollingerBands.squeeze.active) {
      recommendations.push({
        type: 'opportunity',
        message: 'Bollinger Bands squeeze detected - prepare for breakout',
        action: 'watch_breakout'
      });
    }
    
    return recommendations;
  }

  getFallbackRiskAnalysis(symbol) {
    return {
      symbol,
      timestamp: Date.now(),
      riskScore: 0.5,
      volatility: {
        daily: 1.5,
        annualized: 25,
        classification: 'medium'
      },
      atr: 0.001,
      bollingerBands: {
        upper: 0,
        middle: 0,
        lower: 0,
        position: 0.5,
        squeeze: { active: false, strength: 0 }
      },
      supportResistance: {
        support: { levels: [], nearest: null, distance: null },
        resistance: { levels: [], nearest: null, distance: null }
      },
      correlation: {
        correlatedPairs: [],
        diversificationScore: 0.5
      },
      liquidity: {
        averageVolume: 0,
        currentVolume: 0,
        liquidityRatio: 1,
        classification: 'medium'
      },
      newsImpact: {
        sentiment: 'neutral',
        impact: 0.1,
        events: [],
        riskLevel: 'low'
      },
      positionSizing: {
        baseSize: 1,
        adjustedSize: 0.5,
        kellyFraction: 0.5,
        maxPosition: 0.02,
        stopLossDistance: 0.002,
        positionValue: 100
      },
      riskMetrics: {
        var95: 2.5,
        var99: 4.0,
        maxDrawdown: 5.0,
        sharpeRatio: 1.2,
        sortinoRatio: 1.5
      },
      recommendations: [{
        type: 'info',
        message: 'Using fallback risk analysis - real-time data unavailable',
        action: 'monitor_market'
      }]
    };
  }
}

module.exports = RiskManager;
