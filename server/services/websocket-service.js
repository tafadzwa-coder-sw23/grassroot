const WebSocket = require('ws');
const config = require('../config');

class WebSocketService {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.subscriptions = new Set();
    this.messageQueue = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 5000; // 5 seconds
    this.eventListeners = {};
  }

  async connect() {
    if (this.connected) return Promise.resolve();

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(config.api.websocketUrl);

        this.ws.on('open', () => {
          console.log('WebSocket connected');
          this.connected = true;
          this.reconnectAttempts = 0;
          this.processMessageQueue();
          this.emit('connected');
          resolve();
        });

        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data);
            this.emit('message', message);
            
            // Handle different message types
            if (message.msg_type === 'tick') {
              this.emit('tick', message);
            } else if (message.msg_type === 'ohlc') {
              this.emit('candle', message);
            } else if (message.msg_type === 'active_symbols') {
              this.emit('activeSymbols', message);
            }
          } catch (error) {
            console.error('Error processing WebSocket message:', error);
          }
        });

        this.ws.on('close', () => {
          console.log('WebSocket disconnected');
          this.connected = false;
          this.attemptReconnect();
          this.emit('disconnected');
        });

        this.ws.on('error', (error) => {
          console.error('WebSocket error:', error);
          this.emit('error', error);
          reject(error);
        });
      } catch (error) {
        console.error('WebSocket connection error:', error);
        reject(error);
      }
    });
  }

  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  emit(event, ...args) {
    const listeners = this.eventListeners[event];
    if (listeners) {
      listeners.forEach(callback => callback(...args));
    }
  }

  async subscribeToMarketData(symbol, timeframe) {
    const subscriptionId = `${symbol}_${timeframe}`;
    
    if (this.subscriptions.has(subscriptionId)) {
      return; // Already subscribed
    }

    const request = {
      ticks: symbol,
      subscribe: 1,
      style: 'candles',
      granularity: this.getGranularity(timeframe),
      end: 'latest'
    };

    this.subscriptions.add(subscriptionId);
    this.sendRequest(request);
  }

  async unsubscribeFromMarketData(symbol, timeframe) {
    const subscriptionId = `${symbol}_${timeframe}`;
    
    if (!this.subscriptions.has(subscriptionId)) {
      return; // Not subscribed
    }

    const request = {
      forget: subscriptionId
    };

    this.subscriptions.delete(subscriptionId);
    this.sendRequest(request);
  }

  getGranularity(timeframe) {
    const granularityMap = {
      '1m': 60,
      '5m': 300,
      '15m': 900,
      '1h': 3600,
      '1d': 86400
    };
    return granularityMap[timeframe] || 60; // Default to 1m
  }

  sendRequest(request) {
    if (this.connected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(request));
    } else {
      this.messageQueue.push(request);
      if (!this.connected) {
        this.attemptReconnect();
      }
    }
  }

  processMessageQueue() {
    while (this.messageQueue.length > 0 && this.connected) {
      const message = this.messageQueue.shift();
      this.ws.send(JSON.stringify(message));
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    setTimeout(() => {
      this.connect().catch(console.error);
    }, this.reconnectInterval);
  }

  async disconnect() {
    if (this.ws) {
      this.ws.close();
      this.connected = false;
      this.ws = null;
    }
  }
}

module.exports = WebSocketService;
