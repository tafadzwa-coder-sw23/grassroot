const config = require('../../config');

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
}

module.exports = new RiskManager();
