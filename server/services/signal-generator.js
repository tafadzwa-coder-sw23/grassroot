const SMCStrategy = require('./smc-strategy');
const CRTDetector = require('./crt-detector');
const MarketDataService = require('./market-data');

class SignalGenerator {
  constructor() {
    this.model = null; // simple in-house logistic-like model
    this.features = ['returns', 'volatility', 'swing_features'];
    this.scaler = null;
    this.smc = new SMCStrategy();
    this.crt = new CRTDetector();
    
    // Strategy configurations
    this.strategies = {
      scalping: {
        minConfidence: 0.7,
        minRiskReward: 1.5,
        timeframes: ['1m', '5m'],
        indicators: ['rsi', 'macd', 'stochastic']
      },
      daytrading: {
        minConfidence: 0.65,
        minRiskReward: 2.0,
        timeframes: ['15m', '1h'],
        indicators: ['rsi', 'macd', 'sma', 'volume']
      },
      swingtrading: {
        minConfidence: 0.6,
        minRiskReward: 3.0,
        timeframes: ['4h', '1d'],
        indicators: ['sma', 'ema', 'volume', 'atr']
      }
    };
  }

  async generateSignals({ symbol, timeframe, marketData, chochAnalysis, riskManager, strategy = 'daytrading' }) {
    try {
      if (!marketData || marketData.length < 50) {
        throw new Error('Insufficient market data for signal generation');
      }

      // Get strategy config
      const strategyConfig = this.strategies[strategy] || this.strategies.daytrading;
      
      // Check if timeframe is valid for this strategy
      if (!strategyConfig.timeframes.includes(timeframe)) {
        return []; // No signals for unsupported timeframes
      }

      // Generate signals based on strategy
      const signals = [];
      
      // Price-action signals (common for all strategies)
      const chochSignals = this.generateCHOCHSignals(chochAnalysis, marketData);
      const priceActionSignals = this.generatePriceActionSignals(marketData, chochAnalysis?.marketStructure?.regime);
      
      // Strategy-specific signals
      let strategySpecificSignals = [];
      
      switch(strategy) {
        case 'scalping':
          strategySpecificSignals = await this.generateScalpingSignals(marketData);
          break;
        case 'swingtrading':
          strategySpecificSignals = await this.generateSwingTradingSignals(marketData);
          break;
        default: // daytrading
          strategySpecificSignals = await this.generateDayTradingSignals(marketData);
      }
      
      // Combine all signals
      const allSignals = [
        ...chochSignals,
        ...priceActionSignals,
        ...strategySpecificSignals
      ];
      
      // Filter signals based on strategy requirements
      const filteredSignals = allSignals.filter(signal => 
        signal.confidence >= strategyConfig.minConfidence &&
        signal.riskReward >= strategyConfig.minRiskReward
      );
      
      // Risk assessment
      const riskAssessment = await riskManager.analyzeRisk(symbol, marketData);
      
      // Combine all signals
      const combinedSignals = this.combineSignals(filteredSignals, riskAssessment);

      // Filter by confidence and risk
      const finalSignals = this.filterSignals(combinedSignals, riskAssessment);

      return finalSignals;
      
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

  generateTechnicalSignals(indicators, marketData, regime = 'ranging') {
    const signals = [];
    const latestPrice = marketData[marketData.length - 1].close;
    
    // Get latest indicator values
    const latestRSI = indicators.rsi[indicators.rsi.length - 1];
    const latestMACD = indicators.macd[indicators.macd.length - 1];
    const latestStochastic = indicators.stochastic[indicators.stochastic.length - 1];
    const latestSMA20 = indicators.sma20[indicators.sma20.length - 1];
    const latestSMA50 = indicators.sma50[indicators.sma50.length - 1];

    // RSI signals (prefer mean-reversion only in ranging regime)
    if (regime === 'ranging' && latestRSI < 30) {
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

    if (regime === 'ranging' && latestRSI > 70) {
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

    // Moving average crossover (prefer only in trending regimes)
    if (latestSMA20 && latestSMA50 && regime !== 'ranging') {
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

  generatePriceActionSignals(marketData, regime = 'ranging') {
    const signals = [];
    if (!marketData || marketData.length < 10) return signals;
    const last = marketData[marketData.length - 1];
    const prev = marketData[marketData.length - 2];
    const swingRange = Math.max(1e-9, last.high - last.low);
    const momUp = last.close > prev.close && (last.close - prev.close) / swingRange > 0.2;
    const momDn = last.close < prev.close && (prev.close - last.close) / swingRange > 0.2;

    if (regime !== 'ranging' && momUp) {
      signals.push({
        type: 'PA_MOMENTUM',
        direction: 'BUY',
        entryPrice: last.close,
        stopLoss: last.low,
        takeProfit: last.close * 1.01,
        confidence: 0.65,
        timeframe: 'current',
        chochPattern: 'pa_momentum',
        riskReward: 2.0,
        marketCondition: regime
      });
    }

    if (regime !== 'ranging' && momDn) {
      signals.push({
        type: 'PA_MOMENTUM',
        direction: 'SELL',
        entryPrice: last.close,
        stopLoss: last.high,
        takeProfit: last.close * 0.99,
        confidence: 0.65,
        timeframe: 'current',
        chochPattern: 'pa_momentum',
        riskReward: 2.0,
        marketCondition: regime
      });
    }

    return signals;
  }

  async generateMLSignals(marketData, chochAnalysis) {
    const signals = [];
    
    try {
      // Prepare features for ML model (price-action only)
      const features = this.prepareFeatures(marketData, chochAnalysis);
      
      if (features.length < 10) return signals;

      // Train or load model
      if (!this.model) {
        await this.trainModel(features);
      }

      // Make prediction
      let prediction = await this.predict(features[features.length - 1]);
      
      // Regime-aware adjustment: bias prediction confidence in direction of regime
      const regime = chochAnalysis?.marketStructure?.regime;
      if (regime && prediction.direction !== 'HOLD') {
        const align = (regime === 'bullish_trend' && prediction.direction === 'BUY') ||
                      (regime === 'bearish_trend' && prediction.direction === 'SELL');
        if (align) prediction = { ...prediction, confidence: Math.min(1, prediction.confidence + 0.15) };
        if (!align && regime !== 'ranging') prediction = { ...prediction, confidence: Math.max(0, prediction.confidence - 0.15) };
      }
      
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

  prepareFeatures(marketData, chochAnalysis) {
    const features = [];
    
    for (let i = 1; i < marketData.length; i++) {
      const regime = chochAnalysis?.marketStructure?.regime || 'ranging';
      const regimeNumeric = regime === 'bullish_trend' ? 1 : regime === 'bearish_trend' ? -1 : 0;
      const priceChange = (marketData[i].close - marketData[i-1].close) / (marketData[i-1].close || 1);
      const volatility = (marketData[i].high - marketData[i].low) / (marketData[i].close || 1);
      features.push({
        volume: marketData[i].volume || 0,
        price_change: priceChange,
        choch_score: chochAnalysis?.score ?? 0.5,
        volatility,
        regime: regimeNumeric
      });
    }
    
    return features;
  }

  async trainModel(features) {
    try {
      // Prepare simple correlation-based weights model
      const X = features.map(f => [
        f.volume,
        f.price_change,
        f.choch_score,
        f.volatility,
        f.regime
      ]);
      const y = features.map(f => (f.price_change > 0 ? 1 : 0));

      // Compute mean/std per feature
      const means = Array(X[0].length).fill(0);
      const stds = Array(X[0].length).fill(0);
      for (let j = 0; j < means.length; j++) {
        means[j] = X.reduce((s, row) => s + row[j], 0) / X.length;
        stds[j] = Math.sqrt(
          X.reduce((s, row) => s + Math.pow(row[j] - means[j], 2), 0) / Math.max(1, X.length - 1)
        ) || 1;
      }

      // Standardize and compute simple weights via covariance with target
      const weights = Array(X[0].length).fill(0);
      const yMean = y.reduce((s, v) => s + v, 0) / y.length;
      const yStd = Math.sqrt(y.reduce((s, v) => s + Math.pow(v - yMean, 2), 0) / Math.max(1, y.length - 1)) || 1;
      for (let j = 0; j < weights.length; j++) {
        let cov = 0;
        for (let i = 0; i < X.length; i++) {
          cov += ((X[i][j] - means[j]) / stds[j]) * ((y[i] - yMean) / yStd);
        }
        weights[j] = cov / X.length;
      }

      // Bias term as negative mean of weighted inputs for centered decision boundary
      const bias = -weights.reduce((s, w, j) => s + w * (0), 0);

      this.model = { weights, means, stds, bias };
      console.log('ML lightweight model prepared');
    } catch (error) {
      console.error('ML model training error:', error);
      this.model = null;
    }
  }

  async predict(features) {
    if (!this.model) {
      return { direction: 'HOLD', confidence: 0.5 };
    }

    try {
      const input = [
        features.volume,
        features.price_change,
        features.choch_score,
        features.volatility,
        features.regime
      ];

      // Standardize and score
      const xz = input.map((v, j) => (v - this.model.means[j]) / (this.model.stds[j] || 1));
      const score = xz.reduce((s, z, j) => s + z * this.model.weights[j], this.model.bias);
      const prob = 1 / (1 + Math.exp(-score));

      return {
        direction: prob > 0.5 ? 'BUY' : 'SELL',
        confidence: Math.max(0.5, Math.min(0.99, Math.abs(prob - 0.5) * 2))
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

  async generateScalpingSignals(marketData) {
    const signals = [];
    if (marketData.length < 20) return signals;
    
    const closes = marketData.map(d => d.close);
    const highs = marketData.map(d => d.high);
    const lows = marketData.map(d => d.low);
    
    // Use faster indicators for scalping
    const rsi = RSI.calculate({ period: 10, values: closes });
    const stoch = Stochastic.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: 10,
      signalPeriod: 3
    });
    
    const lastCandle = marketData[marketData.length - 1];
    const currentRsi = rsi[rsi.length - 1];
    const currentStoch = stoch[stoch.length - 1];
    
    // RSI and Stochastic overbought/oversold signals
    if (currentRsi < 30 && currentStoch.k < 20) {
      signals.push({
        type: 'SCALP_BUY',
        direction: 'BUY',
        entryPrice: lastCandle.close,
        stopLoss: lastCandle.low * 0.998,
        takeProfit: lastCandle.close * 1.005,
        confidence: 0.7,
        timeframe: '1m',
        riskReward: 1.5,
        marketCondition: 'oversold'
      });
    } else if (currentRsi > 70 && currentStoch.k > 80) {
      signals.push({
        type: 'SCALP_SELL',
        direction: 'SELL',
        entryPrice: lastCandle.close,
        stopLoss: lastCandle.high * 1.002,
        takeProfit: lastCandle.close * 0.995,
        confidence: 0.7,
        timeframe: '1m',
        riskReward: 1.5,
        marketCondition: 'overbought'
      });
    }
    
    return signals;
  }

  async generateDayTradingSignals(marketData) {
    const signals = [];
    if (marketData.length < 50) return signals;
    
    const closes = marketData.map(d => d.close);
    const highs = marketData.map(d => d.high);
    const lows = marketData.map(d => d.low);
    
    // Use 15m/1h timeframe indicators
    const rsi = RSI.calculate({ period: 14, values: closes });
    const ema20 = EMA.calculate({ period: 20, values: closes });
    const ema50 = EMA.calculate({ period: 50, values: closes });
    
    const lastCandle = marketData[marketData.length - 1];
    const currentRsi = rsi[rsi.length - 1];
    const currentEma20 = ema20[ema20.length - 1];
    const currentEma50 = ema50[ema50.length - 1];
    
    // EMA crossover strategy
    if (currentEma20 > currentEma50 && ema20[ema20.length - 2] <= ema50[ema50.length - 2]) {
      signals.push({
        type: 'DAYTRADE_BUY',
        direction: 'BUY',
        entryPrice: lastCandle.close,
        stopLoss: Math.min(lastCandle.low, currentEma50) * 0.995,
        takeProfit: lastCandle.close * 1.015,
        confidence: 0.65,
        timeframe: '15m',
        riskReward: 2.0,
        marketCondition: 'bullish_crossover'
      });
    } else if (currentEma20 < currentEma50 && ema20[ema20.length - 2] >= ema50[ema50.length - 2]) {
      signals.push({
        type: 'DAYTRADE_SELL',
        direction: 'SELL',
        entryPrice: lastCandle.close,
        stopLoss: Math.max(lastCandle.high, currentEma50) * 1.005,
        takeProfit: lastCandle.close * 0.985,
        confidence: 0.65,
        timeframe: '15m',
        riskReward: 2.0,
        marketCondition: 'bearish_crossover'
      });
    }
    
    return signals;
  }

  async generateSwingTradingSignals(marketData) {
    const signals = [];
    if (marketData.length < 200) return signals; // Need more data for swing trading
    
    const closes = marketData.map(d => d.close);
    const highs = marketData.map(d => d.high);
    const lows = marketData.map(d => d.low);
    
    // Use daily/weekly indicators for swing trading
    const sma50 = SMA.calculate({ period: 50, values: closes });
    const sma200 = SMA.calculate({ period: 200, values: closes });
    const atr = ATR.calculate({
      high: highs,
      low: lows,
      close: closes,
      period: 14
    });
    
    const lastCandle = marketData[marketData.length - 1];
    const currentSma50 = sma50[sma50.length - 1];
    const currentSma200 = sma200[sma200.length - 1];
    const currentAtr = atr[atr.length - 1];
    
    // Golden/Death Cross strategy
    if (currentSma50 > currentSma200 && sma50[sma50.length - 2] <= sma200[sma200.length - 2]) {
      signals.push({
        type: 'SWING_LONG',
        direction: 'BUY',
        entryPrice: lastCandle.close,
        stopLoss: lastCandle.low - (currentAtr * 2),
        takeProfit: lastCandle.close + (currentAtr * 4),
        confidence: 0.6,
        timeframe: '4h',
        riskReward: 3.0,
        marketCondition: 'bullish_trend'
      });
    } else if (currentSma50 < currentSma200 && sma50[sma50.length - 2] >= sma200[sma200.length - 2]) {
      signals.push({
        type: 'SWING_SHORT',
        direction: 'SELL',
        entryPrice: lastCandle.close,
        stopLoss: lastCandle.high + (currentAtr * 2),
        takeProfit: lastCandle.close - (currentAtr * 4),
        confidence: 0.6,
        timeframe: '4h',
        riskReward: 3.0,
        marketCondition: 'bearish_trend'
      });
    }
    
    return signals;
  }
}

module.exports = SignalGenerator;
