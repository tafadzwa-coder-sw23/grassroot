# Insight Trader Tool - ML-Powered Trading Assistant

A sophisticated trading application designed to be a powerful, non-intrusive aid for manual traders. The system performs advanced market analysis using CHOCH (Change of Character) detection and ML-powered signal generation, while leaving all trade execution decisions entirely to the user.

## 🚀 Features

### Core Trading Capabilities
- **Real-time Market Data** - Live price feeds from Deriv API
- **ML-Powered Signal Generation** - AI-driven trading signals with confidence scoring
- **CHOCH Detection** - Smart money concepts and market structure analysis
- **Risk Management** - Comprehensive risk assessment and position sizing
- **Multi-timeframe Analysis** - Scalping, Day Trading, and Swing Trading strategies

### ML & Analysis Features
- **Market Structure Analysis** - Break of structure, higher highs/lows detection
- **Liquidity Level Identification** - Order blocks, fair value gaps, breaker blocks
- **Volatility Assessment** - ATR, Bollinger Bands, risk scoring
- **Real-time Signal Processing** - Continuous market monitoring and analysis
- **WebSocket Integration** - Live updates and real-time data streaming

## 🏗️ Architecture

### Frontend (React + TypeScript)
- **Modern UI Components** - Built with Radix UI and Tailwind CSS
- **Real-time Updates** - WebSocket connection for live data
- **Responsive Design** - Mobile and desktop optimized
- **Interactive Charts** - Real-time candlestick visualization

### Backend (Node.js + ML Services)
- **Express Server** - RESTful API endpoints
- **WebSocket Server** - Real-time communication
- **ML Signal Generator** - CHOCH + technical analysis
- **Risk Manager** - Position sizing and risk assessment
- **Market Data Service** - Deriv API integration

### ML Components
- **CHOCH Detector** - Smart money concepts implementation
- **Signal Generator** - ML regression models for prediction
- **Pattern Recognition** - Market structure and trend analysis
- **Risk Assessment** - Volatility and correlation analysis

## 🎯 Trading Strategies

### Three-Tier Strategy System
1. **Scalping** - 15m → 1m timeframes
2. **Day Trading** - 1h → 5m timeframes  
3. **Swing Trading** - 4h → 1h timeframes

### Signal Types
- **BUY** - Bullish momentum signals
- **SELL** - Bearish momentum signals
- **SCALE_IN** - Position scaling opportunities

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Windows 10/11 (for batch script)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd insight-trader-tool-main
   ```

2. **Install dependencies**
   ```bash
   # Install frontend dependencies
   npm install
   
   # Install backend dependencies
   cd server
   npm install
   cd ..
   ```

3. **Configure Deriv API** (Optional)
   - Edit `server/index.js` to add your Deriv API credentials
   - Or use the default demo credentials

4. **Start the system**
   ```bash
   # Windows (recommended)
   start-trading-system.bat
   
   # Manual start
   # Terminal 1: Backend
   cd server && npm start
   
   # Terminal 2: Frontend  
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:3001
   - WebSocket: ws://localhost:8081

## 📊 Using the System

### 1. Symbol Selection
- Choose from available forex pairs
- Real-time market data loading
- Category filtering and search

### 2. Strategy Selection
- Select your trading style
- Automatic timeframe adjustment
- Strategy-specific analysis

### 3. Signal Analysis
- View ML-generated signals
- Check confidence scores
- Review entry/exit levels
- Monitor risk metrics

### 4. Market Analysis
- CHOCH market structure
- Liquidity levels
- Risk assessment
- Volatility analysis

### 5. Manual Execution
- **All trades are manual** - No automatic execution
- Use provided entry/exit levels
- Set your own stop-loss and take-profit
- Scale in based on ML recommendations

## 🔧 Configuration

### Backend Configuration
```javascript
// server/index.js
const DERIV_TOKEN = 'your_deriv_token';
const DERIV_APP_ID = your_app_id;
```

### Frontend Configuration
```bash
# .env.local (frontend)
VITE_API_BASE_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:8081
```

## 📈 ML Signal Generation

### CHOCH Analysis
- **Market Structure** - Trend identification and structure breaks
- **Liquidity Levels** - Order block detection and fair value gaps
- **Pattern Recognition** - Swing high/low identification
- **Change of Character** - Market behavior shifts

### ML Models
- **Regression Analysis** - Price prediction models
- **Feature Engineering** - Technical indicator combinations
- **Confidence Scoring** - Signal reliability assessment
- **Risk-Reward Optimization** - Position sizing recommendations

### Signal Quality
- **Confidence Score** - 0-100% reliability rating
- **Risk-Reward Ratio** - Optimized position sizing
- **Market Condition** - Trend and volatility context
- **Timeframe Alignment** - Multi-timeframe confirmation

## 🛡️ Risk Management

### Risk Metrics
- **Volatility Assessment** - Daily and annualized volatility
- **ATR Analysis** - Average True Range for stop-loss
- **Bollinger Bands** - Price channel analysis
- **Correlation Analysis** - Portfolio diversification

### Position Sizing
- **Risk per Trade** - Configurable percentage limits
- **Daily Loss Limits** - Maximum daily drawdown
- **Portfolio Correlation** - Diversification requirements
- **Market Volatility** - Dynamic position sizing

## 🔌 API Endpoints

### Market Data
- `GET /api/symbols` - Available trading symbols
- `GET /api/market-data/:symbol/:timeframe` - Historical price data
- `GET /api/signals/:symbol/:timeframe` - Trading signals

### Analysis
- `GET /api/choch-analysis/:symbol/:timeframe` - CHOCH analysis
- `GET /api/risk-analysis/:symbol` - Risk assessment

### WebSocket Events
- `subscribe` - Subscribe to symbol updates
- `new_signals` - Real-time signal notifications
- `market_data` - Live price updates
- `choch_analysis` - Market structure updates

## 🧪 Development

### Running Tests
```bash
cd server
npm test
```

### Development Mode
```bash
# Backend with auto-reload
cd server && npm run dev

# Frontend with hot reload
npm run dev
```

### Building for Production
```bash
# Frontend build
npm run build

# Backend production
cd server && npm start
```

## 📁 Project Structure

```
insight-trader-tool-main/
├── src/                          # Frontend source
│   ├── components/               # React components
│   │   ├── ui/                  # UI primitives
│   │   ├── TradingDashboard.tsx # Main dashboard
│   │   ├── TradingChart.tsx     # Chart component
│   │   ├── SignalPanel.tsx      # Signal display
│   │   └── MLAnalysisDashboard.tsx # ML analysis
│   ├── hooks/                   # Custom React hooks
│   │   └── useTradingData.ts    # Trading data management
│   ├── services/                # API services
│   │   └── api.ts               # Backend communication
│   └── pages/                   # Route components
├── server/                       # Backend services
│   ├── services/                # ML services
│   │   ├── choch-detector.js    # CHOCH analysis
│   │   ├── signal-generator.js  # ML signal generation
│   │   ├── risk-manager.js      # Risk assessment
│   │   └── market-data.js       # Market data service
│   ├── index.js                 # Main server
│   └── package.json             # Backend dependencies
├── start-trading-system.bat     # Startup script
└── README.md                    # This file
```

## 🎯 Trading Philosophy

### Manual Trading Focus
- **No Automatic Execution** - User maintains full control
- **Signal Generation Only** - ML provides analysis, not decisions
- **Risk Management** - Automated assessment, manual implementation
- **Continuous Learning** - System improves with market data

### Smart Money Concepts
- **CHOCH Detection** - Institutional behavior patterns
- **Liquidity Analysis** - Order flow and market structure
- **Break of Structure** - Trend continuation/ reversal signals
- **Fair Value Gaps** - Price inefficiency identification

## 🔮 Future Enhancements

### Planned Features
- **Portfolio Tracking** - Performance monitoring
- **Backtesting Engine** - Strategy validation
- **News Sentiment Analysis** - Fundamental integration
- **Advanced ML Models** - Deep learning integration
- **Mobile Application** - iOS/Android support

### ML Improvements
- **Reinforcement Learning** - Adaptive strategy optimization
- **Ensemble Methods** - Multiple model combination
- **Feature Selection** - Dynamic indicator optimization
- **Market Regime Detection** - Bull/bear/sideways classification

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This software is for educational and informational purposes only. It does not constitute financial advice. Trading involves risk, and past performance does not guarantee future results. Always conduct your own research and consider consulting with a financial advisor before making trading decisions.

## 🆘 Support

For technical support or questions:
- Check the documentation
- Review the code comments
- Open an issue on GitHub
- Contact the development team

---

**Built with ❤️ for the trading community**
