// Backtesting module for PureCRT strategy
class Backtester {
  constructor(strategy, options = {}) {
    this.strategy = strategy;
    this.initialCapital = options.initialCapital || 10000;
    this.riskPerTrade = options.riskPerTrade || 0.01; // 1% risk per trade
    this.debug = options.debug !== false;
  }

  log(...args) {
    if (this.debug) {
      console.log(`[Backtester][${new Date().toISOString()}]`, ...args);
    }
  }

  async backtest(marketData, symbol = 'unknown') {
    this.log(`Starting backtest for ${symbol} with ${marketData.length} data points`);
    
    let capital = this.initialCapital;
    let position = null;
    const trades = [];
    const equityCurve = [capital];
    
    // Create a mock market data service for backtesting
    const mockMarketDataService = {
      getMarketData: async (sym, timeframe, limit) => {
        // Return the appropriate slice of market data for the current position
        const currentIndex = equityCurve.length - 1;
        const startIndex = Math.max(0, currentIndex - limit);
        return marketData.slice(startIndex, currentIndex + 1);
      }
    };

    for (let i = 30; i < marketData.length; i++) {
      const currentData = marketData.slice(i-30, i); // Lookback window
      const currentPrice = marketData[i].close;
      
      // Update mock service to return current lookback window
      mockMarketDataService.getMarketData = async () => currentData;
      
      try {
        // Generate signal using the strategy
        const signals = await this.strategy.detect(symbol, mockMarketDataService);
        const signal = signals.length > 0 ? signals[0] : null;
        
        // Check if we should enter a trade
        if (signal && !position) {
          position = this.enterTrade(signal, capital, currentPrice);
          this.log(`Entered ${signal.direction} trade at ${currentPrice.toFixed(5)}`);
        }
        
        // Check exit conditions if we have an open position
        if (position) {
          const exitResult = this.checkExitConditions(position, currentPrice, marketData[i]);
          
          if (exitResult.shouldExit) {
            const pnl = this.calculatePnl(position, currentPrice);
            capital += pnl;
            
            trades.push({
              entry: position.entryPrice,
              exit: currentPrice,
              pnl,
              direction: position.direction,
              entryTime: position.entryTime,
              exitTime: marketData[i].timestamp || Date.now(),
              duration: (marketData[i].timestamp - position.entryTime) / (1000 * 60), // minutes
              confidence: position.confidence,
              riskReward: position.riskReward
            });
            
            this.log(`Exited ${position.direction} trade: PnL ${pnl.toFixed(2)}, Capital: ${capital.toFixed(2)}`);
            position = null;
          }
        }
        
        equityCurve.push(capital);
        
      } catch (error) {
        this.log(`Error during backtest iteration ${i}:`, error.message);
      }
    }

    // Close any open position at the end
    if (position) {
      const finalPrice = marketData[marketData.length - 1].close;
      const pnl = this.calculatePnl(position, finalPrice);
      capital += pnl;
      
      trades.push({
        entry: position.entryPrice,
        exit: finalPrice,
        pnl,
        direction: position.direction,
        entryTime: position.entryTime,
        exitTime: marketData[marketData.length - 1].timestamp || Date.now(),
        duration: (marketData[marketData.length - 1].timestamp - position.entryTime) / (1000 * 60),
        confidence: position.confidence,
        riskReward: position.riskReward
      });
      
      equityCurve[equityCurve.length - 1] = capital;
    }

    const results = this.calculatePerformanceMetrics(trades, equityCurve);
    this.log(`Backtest completed. Final capital: ${capital.toFixed(2)}`);
    
    return {
      finalCapital: capital,
      totalReturn: ((capital - this.initialCapital) / this.initialCapital) * 100,
      trades,
      equityCurve,
      metrics: results
    };
  }

  enterTrade(signal, currentCapital, currentPrice) {
    const positionSize = this.calculatePositionSize(
      currentCapital,
      this.riskPerTrade,
      signal.entryPrice,
      signal.stopLoss
    );

    return {
      direction: signal.direction,
      entryPrice: signal.entryPrice,
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      size: positionSize,
      entryTime: Date.now(),
      confidence: signal.confidence,
      riskReward: signal.riskReward
    };
  }

  calculatePositionSize(capital, riskPercent, entryPrice, stopLoss) {
    const riskAmount = capital * riskPercent;
    const riskPerUnit = Math.abs(entryPrice - stopLoss);
    return riskAmount / riskPerUnit;
  }

  checkExitConditions(position, currentPrice, currentCandle) {
    const result = { shouldExit: false, reason: '' };
    
    if (position.direction === 'BUY') {
      // Long position exit conditions
      if (currentPrice >= position.takeProfit) {
        result.shouldExit = true;
        result.reason = 'Take profit hit';
      } else if (currentPrice <= position.stopLoss) {
        result.shouldExit = true;
        result.reason = 'Stop loss hit';
      }
    } else {
      // Short position exit conditions
      if (currentPrice <= position.takeProfit) {
        result.shouldExit = true;
        result.reason = 'Take profit hit';
      } else if (currentPrice >= position.stopLoss) {
        result.shouldExit = true;
        result.reason = 'Stop loss hit';
      }
    }
    
    return result;
  }

  calculatePnl(position, exitPrice) {
    if (position.direction === 'BUY') {
      return (exitPrice - position.entryPrice) * position.size;
    } else {
      return (position.entryPrice - exitPrice) * position.size;
    }
  }

  calculatePerformanceMetrics(trades, equityCurve) {
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        winRate: 0,
        averageWin: 0,
        averageLoss: 0,
        profitFactor: 0,
        maxDrawdown: 0,
        sharpeRatio: 0
      };
    }

    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl <= 0);
    
    const totalProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    
    const winRate = (winningTrades.length / trades.length) * 100;
    const averageWin = winningTrades.length > 0 ? totalProfit / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? totalLoss / losingTrades.length : 0;
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : Infinity;
    
    // Calculate max drawdown
    let maxDrawdown = 0;
    let peak = equityCurve[0];
    
    for (let i = 1; i < equityCurve.length; i++) {
      if (equityCurve[i] > peak) {
        peak = equityCurve[i];
      } else {
        const drawdown = ((peak - equityCurve[i]) / peak) * 100;
        maxDrawdown = Math.max(maxDrawdown, drawdown);
      }
    }

    // Calculate Sharpe ratio (simplified)
    const returns = [];
    for (let i = 1; i < equityCurve.length; i++) {
      returns.push((equityCurve[i] - equityCurve[i-1]) / equityCurve[i-1]);
    }
    
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length);
    const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;

    return {
      totalTrades: trades.length,
      winRate: parseFloat(winRate.toFixed(2)),
      averageWin: parseFloat(averageWin.toFixed(2)),
      averageLoss: parseFloat(averageLoss.toFixed(2)),
      profitFactor: parseFloat(profitFactor.toFixed(2)),
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length
    };
  }

  generateReport(results) {
    const { metrics, finalCapital, totalReturn } = results;
    
    return `
=== PureCRT Strategy Backtest Report ===
Initial Capital: $${this.initialCapital.toFixed(2)}
Final Capital: $${finalCapital.toFixed(2)}
Total Return: ${totalReturn.toFixed(2)}%

Performance Metrics:
- Total Trades: ${metrics.totalTrades}
- Win Rate: ${metrics.winRate}%
- Winning Trades: ${metrics.winningTrades}
- Losing Trades: ${metrics.losingTrades}
- Average Win: $${metrics.averageWin.toFixed(2)}
- Average Loss: $${metrics.averageLoss.toFixed(2)}
- Profit Factor: ${metrics.profitFactor}
- Max Drawdown: ${metrics.maxDrawdown}%
- Sharpe Ratio: ${metrics.sharpeRatio}

Trade Analysis:
${results.trades.map((trade, index) => `
Trade ${index + 1}:
  Direction: ${trade.direction}
  Entry: ${trade.entry.toFixed(5)}
  Exit: ${trade.exit.toFixed(5)}
  PnL: $${trade.pnl.toFixed(2)}
  Confidence: ${trade.confidence}
  Risk/Reward: ${trade.riskReward}
  Duration: ${trade.duration.toFixed(1)} minutes
`).join('')}
    `;
  }
}

module.exports = Backtester;
