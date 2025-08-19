const { SMA, EMA, RSI, MACD, Stochastic } = require('technicalindicators');
const MLRegression = require('ml-regression');

class SignalGenerator {
  constructor() {
    this.model = null;
    this.features = ['rsi', 'macd', 'stochastic', 'volume', 'price_action'];
    this.scaler = null;
  }

  async generateSignals({ symbol, timeframe, marketData, chochAnalysis, riskManager }) {
    try {
      if (!marketData || marketData.length < 50) {
        throw new Error('Insufficient market data for signal generation');
      }

      // Prepare technical indicators
      const indicators = this.calculateIndicators(marketData);
      
      // Generate CHOCH-based signals
      const chochSignals = this.generateCHOCHSignals(chochAnalysis, marketData);
      
      // Generate technical signals
      const technicalSignals = this.generateTechnicalSignals(indicators, marketData);
      
      // Combine signals using ML model
      const mlSignals = await this.generateMLSignals(marketData, indicators, chochAnalysis);
      
      // Risk assessment
      const riskAssessment = await riskManager.analyzeRisk(symbol, marketData);
      
      // Combine all signals
      const combinedSignals = this.combineSignals([
        ...chochSignals,
        ...technicalSignals,
        ...mlSignals
      ], riskAssessment);

      // Filter by confidence and risk
      const filteredSignals = this.filterSignals(combinedSignals, riskAssessment);

      return filteredSignals;
    } catch (error) {
      console.error('Signal generation error:', error);
      return this.getFallbackSignals(symbol, timeframe);
    }
  }

  calculateIndicators(data) {
    const closes = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const volumes = data.map(d => d.volume);

    // RSI
    const rsi = RSI.calculate({ period: 14, values: closes });
    
    // MACD
    const macd = MACD.calculate({
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
      values: closes
    });
    
    // Stochastic
    const stochastic = Stochastic.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: 14,
      signalPeriod: 3
    });

    // Moving averages
    const sma20 = SMA.calculate({ period: 20, values: closes });
    const sma50 = SMA.calculate({ period: 50, values: closes });
    const ema12 = EMA.calculate({ period: 12, values: closes });
    const ema26 = EMA.calculate({ period: 26, values: closes });

    return {
      rsi,
      macd,
      stochastic,
      sma20,
      sma50,
      ema12,
      ema26,
      volumes
    };
  }

  generateCHOCHSignals(chochAnalysis, marketData) {
    const signals = [];
    const latestPrice = marketData[marketData.length - 1].close;

    // CHOCH pattern signals
    if (chochAnalysis.marketStructure.changeOfCharacter.bullish) {
      signals.push({
        type: 'CHOCH_BULLISH',
        direction: 'BUY',
        entryPrice: latestPrice,
        stopLoss: chochAnalysis.marketStructure.changeOfCharacter.level * 0.99,
        takeProfit: latestPrice * 1.02,
        confidence: chochAnalysis.score * 0.8,
        timeframe: 'current',
        chochPattern: 'bullish_reversal',
        riskReward: 2.0,
        marketCondition: 'reversal'
      });
    }

    if (chochAnalysis.marketStructure.changeOfCharacter.bearish) {
      signals.push({
        type: 'CHOCH_BEARISH',
        direction: 'SELL',
        entryPrice: latestPrice,
        stopLoss: chochAnalysis.marketStructure.changeOfCharacter.level * 1.01,
        takeProfit: latestPrice * 0.98,
        confidence: chochAnalysis.score * 0.8,
        timeframe: 'current',
        chochPattern: 'bearish_reversal',
        riskReward: 2.0,
        marketCondition: 'reversal'
      });
    }

    // Order block signals
    if (chochAnalysis.orderBlocks && chochAnalysis.orderBlocks.length > 0) {
      chochAnalysis.orderBlocks.forEach(ob => {
        const distance = Math.abs(latestPrice - ob.level) / latestPrice;
        
        if (distance < 0.01) { // Within 1% of order block
          signals.push({
            type: 'ORDER_BLOCK',
            direction: ob.type === 'bullish' ? 'BUY' : 'SELL',
            entryPrice: ob.level,
            stopLoss: ob.level * (ob.type === 'bullish' ? 0.99 : 1.01),
            takeProfit: ob.level * (ob.type === 'bullish' ? 1.02 : 0.98),
            confidence: ob.strength * 0.7,
            timeframe: 'current',
            chochPattern: ob.type,
            riskReward: 2.0,
            marketCondition: 'order_block'
          });
        }
      });
    }

    return signals;
  }

  generateTechnicalSignals(indicators, marketData) {
    const signals = [];
    const latestPrice = marketData[marketData.length - 1].close;
    
    // Get latest indicator values
    const latestRSI = indicators.rsi[indicators.rsi.length - 1];
    const latestMACD = indicators.macd[indicators.macd.length - 1];
    const latestStochastic = indicators.stochastic[indicators.stochastic.length - 1];
    const latestSMA20 = indicators.sma20[indicators.sma20.length - 1];
    const latestSMA50 = indicators.sma50[indicators.sma50.length - 1];

    // RSI signals
    if (latestRSI < 30) {
      signals.push({
        type: 'RSI_OVERSOLD',
        direction: 'BUY',
        entryPrice: latestPrice,
        stopLoss: latestPrice * 0.98,
        takeProfit: latestPrice * 1.03,
        confidence: 0.7,
        timeframe: 'current',
        chochPattern: 'oversold_bounce',
        riskReward: 1.5,
        marketCondition: 'oversold'
      });
    }

    if (latestRSI > 70) {
      signals.push({
        type: 'RSI_OVERBOUGHT',
        direction: 'SELL',
        entryPrice: latestPrice,
        stopLoss: latestPrice * 1.02,
        takeProfit: latestPrice * 0.97,
        confidence: 0.7,
        timeframe: 'current',
        chochPattern: 'overbought_reversal',
        riskReward: 1.5,
        marketCondition: 'overbought'
      });
    }

    // Moving average crossover
    if (latestSMA20 && latestSMA50) {
      const prevSMA20 = indicators.sma20[indicators.sma20.length - 2];
      const prevSMA50 = indicators.sma50[indicators.sma50.length - 2];

      if (prevSMA20 < prevSMA50 && latestSMA20 > latestSMA50) {
        signals.push({
          type: 'MA_GOLDEN_CROSS',
          direction: 'BUY',
          entryPrice: latestPrice,
          stopLoss: latestPrice * 0.99,
          takeProfit: latestPrice * 1.02,
          confidence: 0.75,
          timeframe: 'current',
          chochPattern: 'golden_cross',
          riskReward: 2.0,
          marketCondition: 'bullish_crossover'
        });
      }

      if (prevSMA20 > prevSMA50 && latestSMA20 < latestSMA50) {
        signals.push({
          type: 'MA_DEATH_CROSS',
          direction: 'SELL',
          entryPrice: latestPrice,
          stopLoss: latestPrice * 1.01,
          takeProfit: latestPrice * 0.98,
          confidence: 0.75,
          timeframe: 'current',
          chochPattern: 'death_cross',
          riskReward: 2.0,
          marketCondition: 'bearish_crossover'
        });
      }
    }

    return signals;
  }

  async generateMLSignals(marketData, indicators, chochAnalysis) {
    const signals = [];
    
    try {
      // Prepare features for ML model
      const features = this.prepareFeatures(marketData, indicators, chochAnalysis);
      
      if (features.length < 10) return signals;

      // Train or load model
      if (!this.model) {
        await this.trainModel(features);
      }

      // Make prediction
      const prediction = await this.predict(features[features.length - 1]);
      
      if (prediction.confidence > 0.6) {
        const latestPrice = marketData[marketData.length - 1].close;
        
        signals.push({
          type: 'ML_PREDICTION',
          direction: prediction.direction,
          entryPrice: latestPrice,
          stopLoss: prediction.direction === 'BUY' ? latestPrice * 0.99 : latestPrice * 1.01,
          takeProfit: prediction.direction === 'BUY' ? latestPrice * 1.02 : latestPrice * 0.98,
          confidence: prediction.confidence,
          timeframe: 'current',
          chochPattern: 'ml_prediction',
          riskReward: 2.0,
          marketCondition: 'ml_based'
        });
      }
    } catch (error) {
      console.error('ML signal generation error:', error);
    }

    return signals;
  }

  prepareFeatures(marketData, indicators, chochAnalysis) {
    const features = [];
    
    for (let i = 50; i < marketData.length; i++) {
      const feature = {
        rsi: indicators.rsi[i] || 50,
        macd: indicators.macd[i]?.MACD || 0,
        stochastic: indicators.stochastic[i]?.k || 50,
        volume: marketData[i].volume,
        price_change: (marketData[i].close - marketData[i-1].close) / marketData[i-1].close,
        choch_score: chochAnalysis.score,
        trend: indicators.sma20[i] > indicators.sma50[i] ? 1 : 0,
        volatility: (marketData[i].high - marketData[i].low) / marketData[i].close
      };
      
      features.push(feature);
    }
    
    return features;
  }

  async trainModel(features) {
    try {
      // Prepare training data
      const X = features.map(f => [
        f.rsi,
        f.macd,
        f.stochastic,
        f.volume,
        f.price_change,
        f.choch_score,
        f.trend,
        f.volatility
      ]);
      
      const y = features.map(f => f.price_change > 0 ? 1 : 0);
      
      // Simple logistic regression
      this.model = new MLRegression.LogisticRegression(X, y);
      
      console.log('ML model trained successfully');
    } catch (error) {
      console.error('ML model training error:', error);
    }
  }

  async predict(features) {
    if (!this.model) {
      return { direction: 'HOLD', confidence: 0.5 };
    }

    try {
      const input = [
        features.rsi,
        features.macd,
        features.stochastic,
        features.volume,
        features.price_change,
        features.choch_score,
        features.trend,
        features.volatility
      ];
      
      const prediction = this.model.predict(input);
      
      return {
        direction: prediction > 0.5 ? 'BUY' : 'SELL',
        confidence: Math.abs(prediction - 0.5) * 2
      };
    } catch (error) {
      console.error('ML prediction error:', error);
      return { direction: 'HOLD', confidence: 0.5 };
    }
  }

  combineSignals(signals, riskAssessment) {
    const combined = [];
    
    // Group signals by type
    const signalGroups = this.groupSignalsByType(signals);
    
    for (const [type, groupSignals] of Object.entries(signalGroups)) {
      if (groupSignals.length > 0) {
        const consensus = this.calculateConsensus(groupSignals);
        
        if (consensus.confidence > 0.6) {
          const enhancedSignal = this.enhanceWithRisk(consensus, riskAssessment);
          combined.push(enhancedSignal);
        }
      }
    }
    
    return combined;
  }

  groupSignalsByType(signals) {
    const groups = {};
    
    signals.forEach(signal => {
      if (!groups[signal.type]) {
        groups[signal.type] = [];
      }
      groups[signal.type].push(signal);
    });
    
    return groups;
  }

  calculateConsensus(signals) {
    if (signals.length === 0) return null;
    
    const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;
    const buySignals = signals.filter(s => s.direction === 'BUY').length;
    const sellSignals = signals.filter(s => s.direction === 'SELL').length;
    
    const direction = buySignals > sellSignals ? 'BUY' : 'SELL';
    const confidence = avgConfidence * (Math.abs(buySignals - sellSignals) / signals.length);
    
    return {
      ...signals[0],
      confidence,
      direction,
      consensus: true
    };
  }

  enhanceWithRisk(signal, riskAssessment) {
    const enhanced = { ...signal };
    
    // Adjust position size based on risk
    if (riskAssessment.riskScore > 0.7) {
      enhanced.positionSize = 0.5; // Reduce position size for high risk
    } else {
      enhanced.positionSize = 1.0;
    }
    
    // Adjust stop loss based on volatility
    if (riskAssessment.atr) {
      enhanced.stopLoss = signal.direction === 'BUY' 
        ? signal.entryPrice - (riskAssessment.atr * 2)
        : signal.entryPrice + (riskAssessment.atr * 2);
    }
    
    return enhanced;
  }

  filterSignals(signals, riskAssessment) {
    return signals.filter(signal => {
      // Filter by confidence
      if (signal.confidence < 0.6) return false;
      
      // Filter by risk score
      if (riskAssessment.riskScore > 0.8) return false;
      
      // Filter by risk-reward ratio
      if (signal.riskReward < 1.5) return false;
      
      return true;
    });
  }

  getFallbackSignals(symbol, timeframe) {
    return [{
      symbol,
      timeframe,
      type: 'NO_SIGNAL',
      direction: 'HOLD',
      entryPrice: 0,
      stopLoss: 0,
      takeProfit: 0,
      confidence: 0,
      chochPattern: 'none',
      riskReward: 0,
      marketCondition: 'insufficient_data'
    }];
  }
}

module.exports = SignalGenerator;
