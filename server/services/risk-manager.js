const config = require('../config');

class RiskManager {
  constructor() {
    this.riskPerTrade = config.trading.risk.maxRiskPerTrade; // Default 1% risk per trade
    this.maxDailyLoss = config.trading.risk.maxDailyLoss; // Default 5% max daily loss
    this.minRiskReward = config.trading.risk.minRiskReward; // Minimum risk/reward ratio
    this.accountBalance = 10000; // Default account balance
    this.dailyPnL = 0;
    this.todayTrades = 0;
    this.maxDailyTrades = 5; // Maximum number of trades per day
  }

  setAccountBalance(balance) {
    this.accountBalance = parseFloat(balance) || 10000;
  }

  calculatePositionSize(entryPrice, stopLoss, riskPercent = null) {
    try {
      const risk = riskPercent !== null ? riskPercent : this.riskPerTrade;
      const riskAmount = this.accountBalance * risk;
      const riskPerUnit = Math.abs(entryPrice - stopLoss);
      
      if (riskPerUnit <= 0) {
        console.warn('Invalid stop loss or entry price');
        return 0;
      }
      
      const positionSize = riskAmount / riskPerUnit;
      return Math.max(0.01, parseFloat(positionSize.toFixed(8)));
    } catch (error) {
      console.error('Error calculating position size:', error);
      return 0;
    }
  }

  validateTrade(signal, currentPrice) {
    if (!signal) return false;

    // Check risk/reward ratio
    const risk = Math.abs(currentPrice - signal.stopLoss);
    const reward = Math.abs(signal.takeProfit - currentPrice);
    const riskReward = reward / (risk || 1);
    
    if (riskReward < this.minRiskReward) {
      console.log(`Trade rejected: Risk/Reward (${riskReward.toFixed(2)}) below minimum (${this.minRiskReward})`);
      return false;
    }

    // Check daily loss limit
    if (Math.abs(this.dailyPnL) >= this.accountBalance * this.maxDailyLoss) {
      console.log('Trade rejected: Daily loss limit reached');
      return false;
    }

    // Check max daily trades
    if (this.todayTrades >= this.maxDailyTrades) {
      console.log('Trade rejected: Maximum daily trades reached');
      return false;
    }

    // Check signal confidence
    if (signal.confidence < 0.6) {
      console.log(`Trade rejected: Low confidence (${signal.confidence})`);
      return false;
    }

    return true;
  }

  updateTradeResult(pnl) {
    this.dailyPnL += pnl;
    this.todayTrades++;
  }

  resetDailyStats() {
    this.dailyPnL = 0;
    this.todayTrades = 0;
  }

  calculateStopLoss(entryPrice, direction, atr, multiplier = 2) {
    const atrStop = atr * multiplier;
    return direction === 'BUY' 
      ? entryPrice - atrStop 
      : entryPrice + atrStop;
  }

  calculateTakeProfit(entryPrice, stopLoss, riskRewardRatio) {
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = risk * riskRewardRatio;
    return entryPrice > stopLoss 
      ? entryPrice + reward 
      : entryPrice - reward;
  }

  getRiskParameters() {
    return {
      accountBalance: this.accountBalance,
      riskPerTrade: this.riskPerTrade,
      maxDailyLoss: this.maxDailyLoss,
      minRiskReward: this.minRiskReward,
      dailyPnL: this.dailyPnL,
      todayTrades: this.todayTrades,
      maxDailyTrades: this.maxDailyTrades
    };
  }

  // Analyze risk for a symbol based on market data
  async analyzeRisk(symbol, marketData) {
    try {
      if (!marketData || marketData.length < 20) {
        return {
          symbol,
          riskLevel: 'UNKNOWN',
          volatility: 0,
          trend: 'NEUTRAL',
          confidence: 0,
          recommendation: 'INSUFFICIENT_DATA',
          message: 'Not enough market data for risk analysis'
        };
      }

      // Calculate volatility (standard deviation of returns)
      const returns = [];
      for (let i = 1; i < marketData.length; i++) {
        const returnPct = (marketData[i].close - marketData[i-1].close) / marketData[i-1].close;
        returns.push(returnPct);
      }
      
      const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
      const volatility = Math.sqrt(variance) * Math.sqrt(252); // Annualized volatility

      // Determine trend
      const last20Prices = marketData.slice(-20).map(c => c.close);
      const first10Avg = last20Prices.slice(0, 10).reduce((sum, p) => sum + p, 0) / 10;
      const last10Avg = last20Prices.slice(10).reduce((sum, p) => sum + p, 0) / 10;
      const trend = last10Avg > first10Avg ? 'BULLISH' : last10Avg < first10Avg ? 'BEARISH' : 'NEUTRAL';

      // Calculate risk level based on volatility
      let riskLevel, confidence;
      if (volatility < 0.1) {
        riskLevel = 'LOW';
        confidence = 0.8;
      } else if (volatility < 0.2) {
        riskLevel = 'MODERATE';
        confidence = 0.6;
      } else if (volatility < 0.3) {
        riskLevel = 'HIGH';
        confidence = 0.4;
      } else {
        riskLevel = 'VERY_HIGH';
        confidence = 0.2;
      }

      // Generate recommendation
      let recommendation;
      if (riskLevel === 'LOW' && trend === 'BULLISH') {
        recommendation = 'STRONG_BUY';
      } else if (riskLevel === 'LOW' && trend === 'BEARISH') {
        recommendation = 'CAUTIOUS_BUY';
      } else if (riskLevel === 'MODERATE' && trend === 'BULLISH') {
        recommendation = 'BUY';
      } else if (riskLevel === 'MODERATE' && trend === 'BEARISH') {
        recommendation = 'HOLD';
      } else if (riskLevel === 'HIGH' && trend === 'BULLISH') {
        recommendation = 'CAUTIOUS_BUY';
      } else if (riskLevel === 'HIGH' && trend === 'BEARISH') {
        recommendation = 'SELL';
      } else if (riskLevel === 'VERY_HIGH') {
        recommendation = 'AVOID';
      } else {
        recommendation = 'HOLD';
      }

      return {
        symbol,
        riskLevel,
        volatility: parseFloat(volatility.toFixed(4)),
        trend,
        confidence: parseFloat(confidence.toFixed(2)),
        recommendation,
        dataPoints: marketData.length,
        analysisTime: new Date().toISOString(),
        message: `Risk analysis completed for ${symbol}`
      };
    } catch (error) {
      console.error('Error in risk analysis:', error);
      return {
        symbol,
        riskLevel: 'ERROR',
        volatility: 0,
        trend: 'NEUTRAL',
        confidence: 0,
        recommendation: 'ERROR',
        message: error.message
      };
    }
  }
}

module.exports = RiskManager;
