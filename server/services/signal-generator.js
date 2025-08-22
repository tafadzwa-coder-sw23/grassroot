const SMCStrategy = require('./smc-strategy');
const CRTDetector = require('./crt-detector');
const PureCRTDetector = require('./pure-crt-detector');
const MarketDataService = require('./market-data');
const CHOCHDetector = require('./choch-detector');
const PureScalpingStrategy = require('./strategies/pure-scalping');
const PriceActionScalping = require('./strategies/price-action-scalping');

class SignalGenerator {
  constructor() {
    this.model = null;
    this.features = ['returns', 'volatility', 'swing_features'];
    this.scaler = null;
    this.smc = new SMCStrategy();
    this.crt = new CRTDetector();
    this.pureCrt = new PureCRTDetector({ debug: true });
    this.chochDetector = new CHOCHDetector();
    this.pureScalping = new PureScalpingStrategy();
    this.priceActionScalper = new PriceActionScalping();
    
    // Strategy configurations
    this.strategies = {
      scalping: {
        minConfidence: 0.7,
        minRiskReward: 1.5,
        timeframes: ['1m', '5m'],
        indicators: ['price_action'],
        detectors: ['pure_scalping', 'price_action']
      },
      daytrading: {
        minConfidence: 0.65,
        minRiskReward: 2.0,
        timeframes: ['15m', '1h'],
        indicators: ['rsi', 'macd', 'sma', 'volume'],
        detectors: ['crt', 'pure_crt', 'choch']
      },
      swingtrading: {
        minConfidence: 0.6,
        minRiskReward: 3.0,
        timeframes: ['4h', '1d'],
        indicators: ['sma', 'ema', 'volume', 'atr'],
        detectors: ['crt', 'choch']
      }
    };
  }

  async generateSignals({ symbol, timeframe, marketData, strategy = 'scalping' }) {
    try {
      if (!marketData || marketData.length < 20) {
        throw new Error('Insufficient market data for signal generation');
      }

      const strategyConfig = this.strategies[strategy] || this.strategies.scalping;
      const allSignals = [];

      // Generate signals from each detector based on strategy configuration
      for (const detectorType of strategyConfig.detectors) {
        try {
          let detectorSignals = [];
          
          switch(detectorType) {
            case 'pure_scalping':
              if (timeframe === '1m' || timeframe === '5m') {
                detectorSignals = this.pureScalping.generateSignals(marketData);
                // Add metadata to signals
                detectorSignals = detectorSignals.map(signal => ({
                  ...signal,
                  detector: 'pure_scalping',
                  symbol,
                  timeframe,
                  strategy: 'scalping',
                  timestamp: new Date().toISOString()
                }));
              }
              break;
              
            case 'price_action':
              if (timeframe === '1m' || timeframe === '5m') {
                detectorSignals = this.priceActionScalper.generateSignals(marketData);
                // Add metadata to signals
                detectorSignals = detectorSignals.map(signal => ({
                  ...signal,
                  detector: 'price_action',
                  symbol,
                  timeframe,
                  strategy: 'scalping',
                  timestamp: new Date().toISOString()
                }));
              }
              break;
              
            case 'pure_crt':
              const crtSetups = await this.pureCrt.detectSetups({
                symbol,
                timeframe,
                candles: marketData
              });
              detectorSignals = crtSetups.map(setup => ({
                ...setup,
                detector: 'pure_crt',
                symbol,
                timeframe,
                timestamp: new Date().toISOString()
              }));
              break;
              
            case 'crt':
              const crtResults = this.crt.analyze(marketData);
              detectorSignals = crtResults.map(result => ({
                ...result,
                detector: 'crt',
                symbol,
                timeframe,
                timestamp: new Date().toISOString()
              }));
              break;
              
            case 'choch':
              const chochResults = this.chochDetector.detect(marketData);
              detectorSignals = chochResults.map(result => ({
                ...result,
                detector: 'choch',
                symbol,
                timeframe,
                timestamp: new Date().toISOString()
              }));
              break;
          }
          
          // Filter signals by confidence and add to all signals
          allSignals.push(...detectorSignals.filter(signal => 
            signal.confidence >= strategyConfig.minConfidence
          ));
          
        } catch (error) {
          console.error(`Error in ${detectorType} detector:`, error);
        }
      }

      // Sort signals by confidence (highest first)
      allSignals.sort((a, b) => b.confidence - a.confidence);

      return allSignals;
      
    } catch (error) {
      console.error('Error generating signals:', error);
      return [];
    }
  }

  async generateCHOCHSignals(symbol, marketData, chochAnalysis) {
    try {
      const analysis = await this.chochDetector.analyze(symbol, '1h', marketData);
      return this.processCHOCHAnalysis(analysis, marketData[marketData.length - 1].close);
    } catch (error) {
      console.error('Error in CHOCH signal generation:', error);
      return [];
    }
  }

  processCHOCHAnalysis(analysis, latestPrice) {
    const signals = [];
    const chochScore = analysis.score;

    // CHOCH pattern signals
    if (analysis.marketStructure.changeOfCharacter.bullish) {
      signals.push({
        type: 'CHOCH_BULLISH',
        direction: 'BUY',
        entryPrice: latestPrice,
        stopLoss: analysis.marketStructure.changeOfCharacter.level * 0.99,
        takeProfit: latestPrice * 1.02,
        confidence: chochScore * 0.8,
        timeframe: 'current',
        chochPattern: 'bullish_reversal',
        riskReward: 2.0,
        marketCondition: 'reversal'
      });
    }

    if (analysis.marketStructure.changeOfCharacter.bearish) {
      signals.push({
        type: 'CHOCH_BEARISH',
        direction: 'SELL',
        entryPrice: latestPrice,
        stopLoss: analysis.marketStructure.changeOfCharacter.level * 1.01,
        takeProfit: latestPrice * 0.98,
        confidence: chochScore * 0.8,
        timeframe: 'current',
        chochPattern: 'bearish_reversal',
        riskReward: 2.0,
        marketCondition: 'reversal'
      });
    }

    // Order block signals
    if (analysis.orderBlocks && analysis.orderBlocks.length > 0) {
      analysis.orderBlocks.forEach(ob => {
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
}

module.exports = new SignalGenerator();
