// Pure Candle Range Theory (PureCRT) detector - price-action only
// Pure implementation focusing on clean three-candle setups without additional indicators
// Uses 5m as driver timeframe and 1m for entry refinement

class PureCRTDetector {
  constructor(options = {}) {
    this.driverTimeframe = options.driverTimeframe || '5m';
    this.entryTimeframe = options.entryTimeframe || '1m';
    this.debug = options.debug !== false; // Enable debug logging by default
  }

  log(...args) {
    if (this.debug) {
      console.log(`[PureCRT][${new Date().toISOString()}]`, ...args);
    }
  }

  async detect(symbol, marketDataService) {
    this.log(`Starting detection for ${symbol} on ${this.driverTimeframe}...`);
    
    try {
      // Get market data for the driver timeframe
      const driverData = await marketDataService.getMarketData(symbol, this.driverTimeframe, 100);
      this.log(`Retrieved ${driverData ? driverData.length : 0} candles of market data`);
      
      if (!driverData || driverData.length < 3) {
        this.log('Not enough data points for analysis');
        return [];
      }

      // Log first and last candle times
      if (driverData.length > 0) {
        this.log(`Data range: ${new Date(driverData[0].timestamp).toISOString()} to ${new Date(driverData[driverData.length - 1].timestamp).toISOString()}`);
      }

      // Find three-candle setups
      const setups = this.findThreeCandleSetups(driverData);
      this.log(`Found ${setups.length} potential setups`);
      
      if (setups.length === 0) {
        this.log('No valid CRT patterns found');
        return [];
      }

      // Use the most recent valid setup
      const latestSetup = setups[setups.length - 1];
      this.log('Latest setup:', JSON.stringify(latestSetup, null, 2));
      
      // Get entry timeframe data for refinement
      let refinedEntry = null;
      try {
        const entryData = await marketDataService.getMarketData(symbol, this.entryTimeframe, 50);
        this.log(`Retrieved ${entryData ? entryData.length : 0} entry timeframe candles`);
        refinedEntry = this.refineEntryWithPriceAction(entryData, latestSetup);
        this.log('Refined entry:', refinedEntry);
      } catch (error) {
        this.log(`Entry refinement failed: ${error.message}`);
      }

      const signals = this.generateSignals(latestSetup, refinedEntry);
      this.log(`Generated ${signals.length} signals`);
      
      return signals;
    } catch (error) {
      console.error(`PureCRT detection error for ${symbol}:`, error);
      return [];
    }
  }

  findThreeCandleSetups(data) {
    const setups = [];
    this.log(`Analyzing ${data.length} candles for CRT patterns...`);
    
    for (let i = 2; i < data.length; i++) {
      const rangeCandle = data[i - 2];
      const sweepCandle = data[i - 1];
      const triggerCandle = data[i];
      
      if (!rangeCandle || !sweepCandle || !triggerCandle) {
        this.log(`Missing candle data at index ${i}`);
        continue;
      }

      const rangeHigh = rangeCandle.high;
      const rangeLow = rangeCandle.low;
      const rangeMid = (rangeHigh + rangeLow) / 2;
      const rangeSize = (rangeHigh - rangeLow) / rangeLow; // Range size as % of price

      this.log(`\n--- Analyzing candles ${i-2}-${i} ---`);
      this.log(`Range Candle: O:${rangeCandle.open} H:${rangeHigh} L:${rangeLow} C:${rangeCandle.close}`);
      this.log(`Sweep Candle: O:${sweepCandle.open} H:${sweepCandle.high} L:${sweepCandle.low} C:${sweepCandle.close}`);
      this.log(`Trigger Candle: O:${triggerCandle.open} H:${triggerCandle.high} L:${triggerCandle.low} C:${triggerCandle.close}`);
      this.log(`Range: ${rangeLow.toFixed(5)}-${rangeHigh.toFixed(5)} (${(rangeSize * 100).toFixed(4)}%)`);

      // Check for valid sweep patterns
      const sweptUp = sweepCandle.high > rangeHigh && sweepCandle.close <= rangeHigh;
      const sweptDown = sweepCandle.low < rangeLow && sweepCandle.close >= rangeLow;

      this.log(`Sweep - Up: ${sweptUp}, Down: ${sweptDown}`);

      if (!sweptUp && !sweptDown) {
        this.log('No valid sweep pattern detected');
        continue;
      }

      // Additional validation - sweep should be significant
      const sweepMagnitude = sweptUp 
        ? (sweepCandle.high - rangeHigh) / rangeHigh
        : (rangeLow - sweepCandle.low) / rangeLow;
      
      this.log(`Sweep magnitude: ${(sweepMagnitude * 100).toFixed(4)}%`);
      
      if (sweepMagnitude < 0.0002) { // Minimum 0.02% sweep
        this.log('Sweep magnitude too small');
        continue;
      }

      // Trigger candle should confirm the reversal
      const triggerConfirms = sweptUp 
        ? triggerCandle.close < rangeMid // Bearish confirmation after up sweep
        : triggerCandle.close > rangeMid; // Bullish confirmation after down sweep

      this.log(`Trigger confirms: ${triggerConfirms} (${sweptUp ? 'Bearish' : 'Bullish'})`);

      if (!triggerConfirms) {
        this.log('Trigger candle does not confirm the reversal');
        continue;
      }

      const setup = {
        symbol: data[0].symbol || 'unknown',
        timeframe: this.driverTimeframe,
        sweepDirection: sweptUp ? 'up' : 'down',
        rangeHigh,
        rangeLow,
        sweepHigh: sweepCandle.high,
        sweepLow: sweepCandle.low,
        triggerOpen: triggerCandle.open,
        triggerClose: triggerCandle.close,
        timestamp: triggerCandle.timestamp || Date.now(),
        sweepMagnitude,
        marketData: data // Pass the market data for feature calculation
      };
      
      this.log('Valid CRT pattern found:', JSON.stringify(setup, null, 2));
      setups.push(setup);
    }

    this.log(`Found ${setups.length} valid CRT patterns in total`);
    return setups;
  }

  refineEntryWithPriceAction(entryData, setup) {
    if (!entryData || entryData.length < 5) return null;

    const recentData = entryData.slice(-10); // Last 10 candles for entry refinement
    
    if (setup.sweepDirection === 'up') {
      // For short entries after up sweep, look for bearish price action
      return this.findBearishEntrySignals(recentData, setup.rangeHigh);
    } else {
      // For long entries after down sweep, look for bullish price action  
      return this.findBullishEntrySignals(recentData, setup.rangeLow);
    }
  }

  findBearishEntrySignals(data, resistanceLevel) {
    // Look for rejection at resistance or bearish patterns
    for (let i = data.length - 1; i >= 0; i--) {
      const candle = data[i];
      
      // Strong rejection wick at resistance
      if (candle.high >= resistanceLevel && candle.close < resistanceLevel) {
        const rejectionStrength = (candle.high - candle.close) / candle.close;
        if (rejectionStrength > 0.0005) {
          return {
            price: candle.close,
            type: 'rejection',
            strength: rejectionStrength,
            timestamp: candle.timestamp
          };
        }
      }
      
      // Bearish engulfing pattern
      if (i > 0) {
        const prevCandle = data[i - 1];
        if (prevCandle.close > prevCandle.open && // Previous was bullish
            candle.close < candle.open && // Current is bearish
            candle.close < prevCandle.open && // Closes below previous open
            candle.open > prevCandle.close) { // Opens above previous close
          return {
            price: candle.close,
            type: 'engulfing',
            strength: 0.8,
            timestamp: candle.timestamp
          };
        }
      }
    }
    
    return null;
  }

  findBullishEntrySignals(data, supportLevel) {
    // Look for bounce at support or bullish patterns
    for (let i = data.length - 1; i >= 0; i--) {
      const candle = data[i];
      
      // Strong bounce from support
      if (candle.low <= supportLevel && candle.close > supportLevel) {
        const bounceStrength = (candle.close - candle.low) / candle.low;
        if (bounceStrength > 0.0005) {
          return {
            price: candle.close,
            type: 'bounce',
            strength: bounceStrength,
            timestamp: candle.timestamp
          };
        }
      }
      
      // Bullish engulfing pattern
      if (i > 0) {
        const prevCandle = data[i - 1];
        if (prevCandle.close < prevCandle.open && // Previous was bearish
            candle.close > candle.open && // Current is bullish
            candle.close > prevCandle.open && // Closes above previous open
            candle.open < prevCandle.close) { // Opens below previous close
          return {
            price: candle.close,
            type: 'engulfing',
            strength: 0.8,
            timestamp: candle.timestamp
          };
        }
      }
    }
    
    return null;
  }

  generateSignals(setup, refinedEntry) {
    const direction = setup.sweepDirection === 'up' ? 'SELL' : 'BUY';
    const entryPrice = refinedEntry?.price || setup.triggerClose;
    const currentPrice = entryPrice;
    
    // Calculate stop loss - beyond the sweep extreme
    const stopLoss = setup.sweepDirection === 'up' 
      ? setup.sweepHigh * 1.0003  // 0.03% above sweep high for shorts
      : setup.sweepLow * 0.9997;   // 0.03% below sweep low for longs
    
    // Take profit at opposite range boundary
    const takeProfit = setup.sweepDirection === 'up' 
      ? setup.rangeLow 
      : setup.rangeHigh;
    
    // Calculate risk-reward ratio
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(takeProfit - entryPrice);
    const riskReward = risk > 0 ? reward / risk : 1.0; // Avoid division by zero
    
    // Get market features for confidence calculation
    const marketFeatures = this.calculateMarketFeatures(
      [setup.rangeCandle, setup.sweepCandle, setup.triggerCandle],
      currentPrice,
      setup.rangeHigh,
      setup.rangeLow
    );
    
    // Calculate confidence with error handling
    let confidence;
    try {
      confidence = this.calculateEnhancedConfidence(setup, refinedEntry, marketFeatures);
      // Ensure confidence is a valid number between 0 and 1
      confidence = Math.max(0, Math.min(1, parseFloat(confidence) || 0.5));
    } catch (error) {
      console.error('Error calculating confidence:', error);
      // Fallback to basic confidence calculation with error handling
      try {
        return parseFloat(this.calculateBasicConfidence(setup, refinedEntry, marketFeatures)) || 0.5;
      } catch (e) {
        console.error('Fallback confidence calculation failed:', e);
        return 0.5; // Default confidence if all else fails
      }
    }
    
    return [{
      type: 'PURE_CRT_THREE_CANDLE',
      direction,
      entryPrice: parseFloat(entryPrice.toFixed(5)),
      stopLoss: parseFloat(stopLoss.toFixed(5)),
      takeProfit: parseFloat(takeProfit.toFixed(5)),
      confidence: parseFloat(confidence.toFixed(2)),
      timeframe: this.entryTimeframe,
      pattern: 'pure_crt_liquidity_sweep',
      riskReward: parseFloat(riskReward.toFixed(2)),
      marketCondition: 'pure_crt',
      setupQuality: setup.sweepMagnitude > 0.0005 ? 'high' : 'medium',
      refinement: refinedEntry ? refinedEntry.type : 'none',
      marketFeatures: marketFeatures,
      timestamp: Date.now()
    }];
  }

  calculateMarketFeatures(marketData, currentPrice, rangeHigh, rangeLow) {
    // Initialize default features object
    const defaultFeatures = {
      rangeSize: 0,
      sweepStrength: 0,
      volumeRatio: 1,
      volatility: 0.01, // Default low volatility
      trendStrength: 20, // Default neutral trend
      volumeProfile: 0.5, // Default neutral volume profile
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay()
    };

    try {
      // Validate inputs
      if (!marketData || !Array.isArray(marketData) || marketData.length === 0) {
        this.log('Warning: No market data provided for feature calculation');
        return defaultFeatures;
      }

      // Ensure currentPrice, rangeHigh, and rangeLow are valid numbers
      currentPrice = parseFloat(currentPrice) || 0;
      rangeHigh = parseFloat(rangeHigh) || 0;
      rangeLow = parseFloat(rangeLow) || 0;

      // Filter out any invalid candles
      const validCandles = marketData.filter(candle => 
        candle && 
        typeof candle === 'object' && 
        !isNaN(parseFloat(candle.close))
      );

      if (validCandles.length === 0) {
        this.log('Warning: No valid candles found for feature calculation');
        return defaultFeatures;
      }

      // Calculate features with fallbacks
      const features = {
        rangeSize: rangeHigh > 0 ? (rangeHigh - rangeLow) / rangeLow : 0,
        sweepStrength: 0, // Will be calculated if needed
        volumeRatio: 1,
        volatility: 0.01,
        trendStrength: 20,
        volumeProfile: 0.5,
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay()
      };

      // Calculate volume ratio if we have volume data
      const hasVolumeData = validCandles.every(candle => 'volume' in candle);
      if (hasVolumeData && validCandles.length > 0) {
        try {
          const currentVolume = parseFloat(validCandles[validCandles.length - 1].volume) || 0;
          const avgVolume = this.calculateAverageVolume(validCandles, 20);
          features.volumeRatio = avgVolume > 0 ? currentVolume / avgVolume : 1;
        } catch (e) {
          this.log('Error calculating volume ratio:', e);
        }
      }

      // Calculate volatility and trend strength if we have enough data
      if (validCandles.length >= 14) {
        try {
          features.volatility = this.calculateATR(validCandles, 14) / (currentPrice || 1);
          features.trendStrength = this.calculateADX(validCandles, 14);
        } catch (e) {
          this.log('Error calculating volatility/trend:', e);
        }
      }

      // Calculate volume profile if we have valid range
      if (rangeHigh > rangeLow) {
        try {
          features.volumeProfile = this.calculateVolumeProfile(validCandles, rangeHigh, rangeLow);
        } catch (e) {
          this.log('Error calculating volume profile:', e);
        }
      }

      return features;
      
    } catch (error) {
      this.log('Error in calculateMarketFeatures:', error);
      return defaultFeatures;
    }
  }

  async calculateEnhancedConfidence(setup, refinedEntry, marketFeatures) {
    try {
      // Ensure we have valid market features
      if (!marketFeatures || typeof marketFeatures !== 'object') {
        marketFeatures = {
          volatility: 0.002,
          trendStrength: 20,
          volumeRatio: 1.0,
          timeOfDay: new Date().getHours(),
          dayOfWeek: new Date().getDay()
        };
      }
      
      // Extract features for ML confidence (placeholder for actual ML integration)
      const features = this.extractMLFeatures(setup, marketFeatures, refinedEntry);
      
      // Simulate ML prediction (replace with actual model.predict)
      let mlConfidence = await this.simulateMLPrediction(features);
      mlConfidence = parseFloat(mlConfidence) || 0.5; // Ensure it's a number
      
      // Rule-based confidence factors
      const patternQuality = parseFloat(this.calculatePatternQuality(setup)) || 0;
      const volumeConfirmation = parseFloat(this.calculateVolumeConfirmation(setup, marketFeatures)) || 0;
      
      // Combine ML and rule-based confidence with weighted average
      let confidence = (mlConfidence * 0.6) + (patternQuality * 0.3) + (volumeConfirmation * 0.1);
      
      // Ensure confidence is within valid range
      confidence = Math.max(0, Math.min(1, confidence));
      
      // Apply dynamic parameters based on market conditions
      const dynamicParams = this.getDynamicParameters(marketFeatures);
      const minConfidence = parseFloat(dynamicParams?.confidence?.min) || 0.5;
      const maxConfidence = parseFloat(dynamicParams?.confidence?.max) || 0.95;
      
      return Math.max(minConfidence, Math.min(confidence, maxConfidence));
      
    } catch (error) {
      console.error('Error in enhanced confidence calculation:', error);
      // Fallback to basic confidence calculation with error handling
      try {
        return parseFloat(this.calculateBasicConfidence(setup, refinedEntry, marketFeatures)) || 0.5;
      } catch (e) {
        console.error('Fallback confidence calculation failed:', e);
        return 0.5; // Default confidence if all else fails
      }
    }
  }

  extractMLFeatures(setup, marketFeatures, refinedEntry) {
    return [
      setup.sweepMagnitude * 10000, // Scale for better ML performance
      marketFeatures.volatility * 1000,
      marketFeatures.trendStrength / 100,
      marketFeatures.volumeRatio,
      marketFeatures.rangeSize * 100,
      marketFeatures.timeOfDay / 24,
      marketFeatures.dayOfWeek / 7,
      refinedEntry ? 1 : 0,
      Math.abs(setup.triggerClose - setup.triggerOpen) / setup.triggerOpen * 10000
    ];
  }

  async simulateMLPrediction(features) {
    // Placeholder for actual ML model prediction
    // In production, this would call your trained model
    return new Promise(resolve => {
      setTimeout(() => {
        // Simple heuristic based on feature importance
        let score = 0.5;
        if (features[0] > 5) score += 0.2; // Strong sweep
        if (features[2] > 0.3) score += 0.15; // Strong trend
        if (features[3] > 1.5) score += 0.1; // High volume
        resolve(Math.min(0.95, score));
      }, 10);
    });
  }

  calculatePatternQuality(setup) {
    let quality = 0.6;
    if (setup.sweepMagnitude > 0.0005) quality += 0.2;
    if (Math.abs(setup.triggerClose - setup.triggerOpen) / setup.triggerOpen > 0.0003) {
      quality += 0.15;
    }
    return Math.min(quality, 0.95);
  }

  calculateVolumeConfirmation(setup, marketFeatures) {
    return marketFeatures.volumeRatio > 1.5 ? 0.9 : 0.6;
  }

  calculateBasicConfidence(setup, refinedEntry, marketFeatures) {
    let confidence = 0.6; // Base confidence
    
    // Pattern strength factors
    if (setup.sweepMagnitude > 0.0005) confidence += 0.12;
    if (refinedEntry) confidence += 0.18;
    if (Math.abs(setup.triggerClose - setup.triggerOpen) / setup.triggerOpen > 0.0003) {
      confidence += 0.08;
    }
    
    // Market condition factors
    if (marketFeatures.volatility < 0.002) confidence += 0.05;
    if (marketFeatures.trendStrength > 25) confidence += 0.04;
    if (marketFeatures.volumeRatio > 1.5) confidence += 0.06;
    
    // Time-based factors
    const hour = marketFeatures.timeOfDay;
    if ((hour >= 8 && hour <= 11) || (hour >= 14 && hour <= 17)) {
      confidence += 0.03;
    }
    
    return Math.min(confidence, 0.98);
  }

  getDynamicParameters(marketFeatures) {
    const baseParams = {
      range: { min: 0.001, max: 0.01 },
      volume: { min: 1.2, max: 2.0 },
      confidence: { min: 0.6, max: 0.9 }
    };

    // Determine market condition
    let marketCondition = 'normal';
    if (marketFeatures.volatility > 0.003) {
      marketCondition = 'high_volatility';
    } else if (marketFeatures.volatility < 0.001) {
      marketCondition = 'low_volatility';
    }

    switch(marketCondition) {
      case 'high_volatility':
        return { 
          ...baseParams, 
          range: { min: 0.002, max: 0.015 },
          confidence: { min: 0.55, max: 0.85 }
        };
      case 'low_volatility':
        return { 
          ...baseParams, 
          confidence: { min: 0.7, max: 0.95 }
        };
      default:
        return baseParams;
    }
  }

  calculateAverageVolume(candles, period) {
    try {
      // Validate inputs
      if (!Array.isArray(candles) || candles.length === 0 || period <= 0) {
        this.log('Invalid inputs for calculateAverageVolume');
        return 0;
      }

      // Get the most recent 'period' candles with valid volume data
      const validCandles = candles
        .filter(candle => 
          candle && 
          typeof candle === 'object' && 
          'volume' in candle && 
          !isNaN(parseFloat(candle.volume))
        )
        .slice(-period);

      if (validCandles.length === 0) {
        this.log('No valid volume data found');
        return 0;
      }

      // Calculate average volume
      const sum = validCandles.reduce((total, candle) => {
        return total + (parseFloat(candle.volume) || 0);
      }, 0);

      return sum / validCandles.length;
      
    } catch (error) {
      this.log('Error in calculateAverageVolume:', error);
      return 0; // Return 0 if there's an error
    }
  }

  calculateATR(data, period = 14) {
    if (!data || data.length < period + 1) return 0;
    
    let sum = 0;
    for (let i = data.length - period; i < data.length; i++) {
      if (i > 0) {
        const highLow = data[i].high - data[i].low;
        const highClose = Math.abs(data[i].high - data[i-1].close);
        const lowClose = Math.abs(data[i].low - data[i-1].close);
        const trueRange = Math.max(highLow, highClose, lowClose);
        sum += trueRange;
      }
    }
    return sum / period;
  }

  calculateADX(data, period = 14) {
    // Simplified ADX calculation - returns trend strength score
    if (!data || data.length < period * 2) return 25;
    
    // For simplicity, return a value based on recent price movement
    const recentData = data.slice(-period);
    const priceChanges = recentData.map((candle, index) => {
      if (index === 0) return 0;
      return (candle.close - recentData[index-1].close) / recentData[index-1].close;
    });
    
    const avgChange = priceChanges.reduce((sum, change) => sum + Math.abs(change), 0) / period;
    return Math.min(100, avgChange * 10000); // Scale to 0-100 range
  }

  calculateVolumeProfile(data, high, low) {
    if (!data || data.length < 20) return 0.5;
    
    const range = high - low;
    const profile = { high: 0, mid: 0, low: 0 };
    
    data.slice(-20).forEach(candle => {
      const candleMid = (candle.high + candle.low) / 2;
      const position = (candleMid - low) / range;
      
      if (position > 0.66) profile.high += candle.volume || 1;
      else if (position > 0.33) profile.mid += candle.volume || 1;
      else profile.low += candle.volume || 1;
    });
    
    const total = profile.high + profile.mid + profile.low;
    return total > 0 ? profile.high / total : 0.5;
  }
}

module.exports = PureCRTDetector;
