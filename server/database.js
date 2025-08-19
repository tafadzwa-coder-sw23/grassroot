const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = null;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(path.join(__dirname, 'trading_data.db'), (err) => {
        if (err) {
          console.error('Error opening database:', err);
          reject(err);
        } else {
          console.log('Connected to SQLite database');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS symbols (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        market TEXT NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS market_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        timeframe TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        open REAL NOT NULL,
        high REAL NOT NULL,
        low REAL NOT NULL,
        close REAL NOT NULL,
        volume INTEGER,
        UNIQUE(symbol, timeframe, timestamp)
      )`,

      `CREATE TABLE IF NOT EXISTS choch_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        timeframe TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        pattern_type TEXT NOT NULL,
        direction TEXT NOT NULL,
        confidence_score REAL,
        entry_price REAL,
        stop_loss REAL,
        take_profit REAL,
        zones TEXT,
        liquidity_levels TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS trading_signals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        timeframe TEXT NOT NULL,
        signal_type TEXT NOT NULL,
        direction TEXT NOT NULL,
        entry_price REAL,
        stop_loss REAL,
        take_profit REAL,
        confidence_score REAL,
        risk_reward_ratio REAL,
        market_condition TEXT,
        choch_pattern TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at INTEGER
      )`,

      `CREATE TABLE IF NOT EXISTS risk_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        volatility REAL,
        atr REAL,
        support_level REAL,
        resistance_level REAL,
        risk_score REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      `CREATE TABLE IF NOT EXISTS performance_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        symbol TEXT NOT NULL,
        timeframe TEXT NOT NULL,
        signal_id INTEGER,
        outcome TEXT,
        pips_gained REAL,
        accuracy_score REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const table of tables) {
      await this.runQuery(table);
    }
  }

  runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async storeSymbols(symbols) {
    const stmt = `INSERT OR IGNORE INTO symbols (symbol, display_name, market) VALUES (?, ?, ?)`;
    
    for (const symbol of symbols) {
      await this.runQuery(stmt, [symbol.symbol, symbol.display_name, symbol.market]);
    }
  }

  async storeMarketData(symbol, timeframe, data) {
    const stmt = `INSERT OR IGNORE INTO market_data 
      (symbol, timeframe, timestamp, open, high, low, close, volume) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    
    for (const candle of data) {
      await this.runQuery(stmt, [
        symbol,
        timeframe,
        candle.epoch,
        candle.open,
        candle.high,
        candle.low,
        candle.close,
        candle.volume
      ]);
    }
  }

  async storeSignals(signals) {
    const stmt = `INSERT INTO trading_signals 
      (symbol, timeframe, signal_type, direction, entry_price, stop_loss, take_profit, 
       confidence_score, risk_reward_ratio, market_condition, choch_pattern, expires_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    for (const signal of signals) {
      await this.runQuery(stmt, [
        signal.symbol,
        signal.timeframe,
        signal.type,
        signal.direction,
        signal.entryPrice,
        signal.stopLoss,
        signal.takeProfit,
        signal.confidence,
        signal.riskReward,
        signal.marketCondition,
        JSON.stringify(signal.chochPattern),
        signal.expiresAt
      ]);
    }
  }

  async storeCHOCHAnalysis(analysis) {
    const stmt = `INSERT INTO choch_analysis 
      (symbol, timeframe, timestamp, pattern_type, direction, confidence_score, 
       entry_price, stop_loss, take_profit, zones, liquidity_levels) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    await this.runQuery(stmt, [
      analysis.symbol,
      analysis.timeframe,
      analysis.timestamp,
      analysis.patternType,
      analysis.direction,
      analysis.confidence,
      analysis.entryPrice,
      analysis.stopLoss,
      analysis.takeProfit,
      JSON.stringify(analysis.zones),
      JSON.stringify(analysis.liquidityLevels)
    ]);
  }

  async getSymbols() {
    return await this.getQuery('SELECT * FROM symbols WHERE is_active = 1 ORDER BY symbol');
  }

  async getMarketData(symbol, timeframe, limit = 1000) {
    return await this.getQuery(
      'SELECT * FROM market_data WHERE symbol = ? AND timeframe = ? ORDER BY timestamp DESC LIMIT ?',
      [symbol, timeframe, limit]
    );
  }

  async getLatestSignals(symbol, timeframe, limit = 50) {
    return await this.getQuery(
      'SELECT * FROM trading_signals WHERE symbol = ? AND timeframe = ? ORDER BY created_at DESC LIMIT ?',
      [symbol, timeframe, limit]
    );
  }

  async getCHOCHAnalysis(symbol, timeframe, limit = 20) {
    return await this.getQuery(
      'SELECT * FROM choch_analysis WHERE symbol = ? AND timeframe = ? ORDER BY created_at DESC LIMIT ?',
      [symbol, timeframe, limit]
    );
  }

  async close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        } else {
          console.log('Database connection closed');
        }
      });
    }
  }
}

module.exports = Database;
