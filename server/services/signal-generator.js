const SMCStrategy = require('./smc-strategy');
const CRTDetector = require('./crt-detector');
const PureCRTDetector = require('./pure-crt-detector');
const MarketDataService = require('./market-data');
const CHOCHDetector = require('./choch-detector');
const PureScalpingStrategy = require('./strategies/pure-scalping');
const BOSStrategy = require('./strategies/bos-strategy');
const EventEmitter = require('events');

class SignalGenerator extends EventEmitter {
  constructor() {
    super();
    this.model = null;
    this.features = ['returns', 'volatility', 'swing_features'];
    this.scaler = null;
    this.smc = new SMCStrategy();
    this.crt = CRTDetector;
    this.pureCrt = new PureCRTDetector({ debug: true });
    this.chochDetector = new CHOCHDetector();
    this.pureScalping = new PureScalpingStrategy();
    this.bosStrategy = new BOSStrategy();
    this.marketData = new MarketDataService();
    
    // Strategy configurations
    this.strategies = {
      scalping: {
        minConfidence: 0.7,
        minRiskReward: 1.5,
        timeframes: ['1m', '5m'],
        indicators: ['price_action'],
        detectors: [
          { name: 'crt', allSymbols: true, allTimeframes: true },
          { name: 'pure_scalping', allSymbols: false, allTimeframes: false },
          { name: 'bos', allSymbols: true, allTimeframes: false, timeframes: ['1m'] }
        ]
      },
      daytrading: {
        minConfidence: 0.65,
        minRiskReward: 2.0,
        timeframes: ['15m', '1h'],
        indicators: ['rsi', 'macd', 'sma', 'volume'],
        detectors: [
          { name: 'crt', allSymbols: true, allTimeframes: true },
          { name: 'pure_crt', allSymbols: false, allTimeframes: false },
          { name: 'choch', allSymbols: false, allTimeframes: false }
        ]
      },
      swingtrading: {
        minConfidence: 0.6,
        minRiskReward: 3.0,
        timeframes: ['4h', '1d'],
        indicators: ['sma', 'ema', 'volume', 'atr'],
        detectors: [
          { name: 'crt', allSymbols: true, allTimeframes: true },
          { name: 'choch', allSymbols: false, allTimeframes: false }
        ]
      }
    };

    // Initialize CRT scanner
    this.initializeCRTScanner();
  }

  // Initialize CRT scanner with event listeners
  initializeCRTScanner() {
    // Listen for signals from CRT scanner
    this.crt.on('signal', (signal) => {
      console.log(`CRT Scanner Signal: ${signal.symbol} ${signal.type} on ${signal.timeframe}`);
      this.processCRTSignal(signal);
    });

    // Start scanning on a schedule
    const SCAN_INTERVAL = process.env.CRT_SCAN_INTERVAL || 300000; // 5 minutes
    this.crt.startScanning(SCAN_INTERVAL);
    
    console.log(`CRT Scanner initialized with ${SCAN_INTERVAL/1000}s interval`);
  }

  // Process signals from CRT scanner
  async processCRTSignal(signal) {
    try {
      // Get additional market data for confirmation
      const marketData = await this.marketData.getMarketData(
        signal.symbol, 
        signal.timeframe, 
        100 // Last 100 candles
      );

      // Apply additional filters/confirmations
      const confirmedSignal = await this.confirmSignal(signal, marketData);
      if (!confirmedSignal) {
        console.log(`Signal not confirmed: ${signal.symbol} ${signal.type}`);
        return;
      }

      // Format the signal
      const formattedSignal = {
        ...confirmedSignal,
        timestamp: new Date().toISOString(),
        strategy: this.getStrategyForTimeframe(signal.timeframe),
        detector: 'crt_scanner'
      };

      // Emit the signal for other parts of the system
      this.emit('newSignal', formattedSignal);
      
      console.log(`CRT Signal Confirmed: ${signal.symbol} ${signal.type} on ${signal.timeframe}`);
      
    } catch (error) {
      console.error('Error processing CRT signal:', error);
    }
  }

  // Confirm signal with additional analysis
  async confirmSignal(signal, marketData) {
    // Add your confirmation logic here
    // For example, check volume, volatility, or other indicators
    
    // Simple confirmation: require minimum volume and price above EMA20
    const lastCandle = marketData[marketData.length - 1];
    const ema20 = this.calculateEMA(marketData.map(c => c.close), 20);
    
    if (!lastCandle || !ema20) return null;
    
    const minVolume = this.calculateAverageVolume(marketData) * 1.2;
    
    // Check volume and price conditions
    const volumeOk = lastCandle.volume >= minVolume;
    const priceOk = signal.type === 'bullish_crt' 
      ? lastCandle.close > ema20[ema20.length - 1]
      : lastCandle.close < ema20[ema20.length - 1];
    
    if (volumeOk && priceOk) {
      return {
        ...signal,
        confirmed: true,
        confirmationTime: new Date().toISOString(),
        confidence: signal.confidence * 1.1 // Slightly increase confidence
      };
    }
    
    return null;
  }

  // Helper function to calculate EMA
  calculateEMA(prices, period) {
    if (!prices || prices.length < period) return null;
    
    const k = 2 / (period + 1);
    const ema = [prices[0]];
    
    for (let i = 1; i < prices.length; i++) {
      ema.push(prices[i] * k + ema[i - 1] * (1 - k));
    }
    
    return ema;
  }

  // Helper function to calculate average volume
  calculateAverageVolume(candles, period = 20) {
    if (!candles || candles.length < period) return 0;
    
    const volumes = candles.slice(-period).map(c => c.volume || 0);
    return volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length;
  }

  // Get strategy for timeframe
  getStrategyForTimeframe(timeframe) {
    const tf = timeframe.toLowerCase();
    if (tf === '1m' || tf === '5m') return 'scalping';
    if (tf === '15m' || tf === '1h') return 'daytrading';
    return 'swingtrading';
  }

  async generateSignals({ symbol, timeframe, marketData, strategy = 'scalping' }) {
    try {
      if (!marketData || marketData.length < 20) {
        console.error('Insufficient market data for signal generation');
        return [];
      }

      const strategyConfig = this.strategies[strategy] || this.strategies.scalping;
      const allSignals = [];

      // Generate signals from each detector based on strategy configuration
      for (const detector of strategyConfig.detectors) {
        try {
          let detectorSignals = [];
          
          switch(detector.name) {
            case 'bos':
              // Only run BOS on 1m timeframe for scalping
              if (timeframe === '1m') {
                detectorSignals = this.bosStrategy.generateSignals(marketData, symbol);
                
                // Add metadata to signals
                detectorSignals = detectorSignals.map(signal => ({
                  ...signal,
                  detector: 'bos',
                  symbol,
                  timeframe,
                  strategy: 'scalping',
                  timestamp: signal.timestamp || new Date().toISOString()
                }));
              }
              break;
              
            case 'pure_scalping':
              if (timeframe === '1m' || timeframe === '5m') {
                detectorSignals = this.pureScalping.generateSignals(marketData, symbol);
                
                // Add metadata to signals
                detectorSignals = detectorSignals.map(signal => ({
                  ...signal,
                  detector: 'pure_scalping',
                  symbol,
                  timeframe,
                  strategy: 'scalping',
                  timestamp: signal.timestamp || new Date().toISOString()
                }));
              }
              break;
              
            case 'pure_crt':
              const crtSetups = await this.pureCrt.detect(symbol, this.marketData);
              detectorSignals = crtSetups.map(setup => ({
                ...setup,
                detector: 'pure_crt',
                symbol,
                timeframe,
                timestamp: new Date().toISOString()
              }));
              break;
              
            case 'crt':
              if (detector.allSymbols && detector.allTimeframes) {
                const crtSetups = await this.crt.detect(symbol, this.marketData);
                detectorSignals = crtSetups.map(setup => ({
                  ...setup,
                  detector: 'crt',
                  symbol,
                  timeframe,
                  timestamp: new Date().toISOString()
                }));
              } else if (detector.allSymbols) {
                // Apply CRT to all symbols for specific timeframes
                if (strategyConfig.timeframes.includes(timeframe)) {
                  const crtSetups = await this.crt.detect(symbol, this.marketData);
                  detectorSignals = crtSetups.map(setup => ({
                    ...setup,
                    detector: 'crt',
                    symbol,
                    timeframe,
                    timestamp: new Date().toISOString()
                  }));
                }
              } else if (detector.allTimeframes) {
                // Apply CRT to all timeframes for specific symbols
                if (symbol === 'specific-symbol') {
                  const crtSetups = await this.crt.detect(symbol, this.marketData);
                  detectorSignals = crtSetups.map(setup => ({
                    ...setup,
                    detector: 'crt',
                    symbol,
                    timeframe,
                    timestamp: new Date().toISOString()
                  }));
                }
              } else {
                // Apply CRT to specific symbols and timeframes
                if (symbol === 'specific-symbol' && strategyConfig.timeframes.includes(timeframe)) {
                  const crtSetups = await this.crt.detect(symbol, this.marketData);
                  detectorSignals = crtSetups.map(setup => ({
                    ...setup,
                    detector: 'crt',
                    symbol,
                    timeframe,
                    timestamp: new Date().toISOString()
                  }));
                }
              }
              break;
              
            case 'choch':
              const chochAnalysis = await this.chochDetector.analyze(symbol, timeframe, marketData);
              detectorSignals = this.processCHOCHAnalysis(chochAnalysis, marketData[marketData.length - 1].close);
              break;
              
            default:
              console.warn(`Unknown detector type: ${detector.name}`);
          }
          
          // Filter signals by confidence and risk/reward
          detectorSignals = detectorSignals.filter(signal => 
            signal.confidence >= strategyConfig.minConfidence &&
            signal.riskReward >= strategyConfig.minRiskReward
          );
          
          allSignals.push(...detectorSignals);
          
        } catch (error) {
          console.error(`Error in ${detector.name} detector:`, error);
        }
      }
      
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

module.exports = SignalGenerator;
