module.exports = {
  // API Configuration
  api: {
    deriv: {
      appId: process.env.DERIV_APP_ID || '1089', // Default test app ID
      token: process.env.DERIV_TOKEN || '', // User token for live trading
    },
    websocketUrl: 'wss://ws.binaryws.com/websockets/v3',
    apiUrl: 'https://api.deriv.com',
  },

  // Trading Configuration
  trading: {
    // Default symbols to trade
    symbols: [
      'R_100',  // Volatility 100 Index
      'R_50',   // Volatility 50 Index
      '1HZ100V', // Volatility 100 (1s) Index
      'R_75',    // Volatility 75 Index
      'R_25'     // Volatility 25 Index
    ],
    
    // Timeframes to analyze
    timeframes: ['1m', '5m', '15m', '1h'],
    
    // Risk management
    risk: {
      maxRiskPerTrade: 0.01, // 1% risk per trade
      maxDailyLoss: 0.05,    // 5% max daily loss
      minRiskReward: 1.5,    // Minimum risk/reward ratio
      positionSizing: 'fixed_fractional' // or 'fixed_amount'
    },
    
    // Strategy configurations
    strategies: {
      pure_crt: {
        enabled: true,
        minConfidence: 0.6,
        timeframes: ['5m', '15m']
      },
      smc: {
        enabled: true,
        minConfidence: 0.65,
        timeframes: ['15m', '1h']
      },
      choch: {
        enabled: true,
        minConfidence: 0.7,
        timeframes: ['1h', '4h']
      }
    },
    
    // Order settings
    order: {
      type: 'market', // or 'limit'
      slippage: 0.0005, // 0.05% slippage allowance
      expiration: 3600 // 1 hour in seconds
    }
  },
  
  // Logging configuration
  logging: {
    level: 'debug', // error, warn, info, debug
    file: 'trading.log',
    maxSize: '10m',
    maxFiles: 5
  },
  
  // Feature flags
  features: {
    paperTrading: true, // Set to false for live trading
    enableTelegram: false,
    enableEmailAlerts: false,
    enableWebhook: false
  },
  
  // Notification settings
  notifications: {
    telegram: {
      enabled: false,
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
      chatId: process.env.TELEGRAM_CHAT_ID || ''
    },
    email: {
      enabled: false,
      service: 'gmail',
      user: process.env.EMAIL_USER || '',
      password: process.env.EMAIL_PASSWORD || '',
      recipients: []
    },
    webhook: {
      enabled: false,
      url: process.env.WEBHOOK_URL || ''
    }
  }
};
