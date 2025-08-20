const WebSocket = require('ws');
const EventEmitter = require('events');

class WebSocketService extends EventEmitter {
  constructor() {
    super();
    this.ws = null;
    this.subscriptions = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 5000;
    this.isConnected = false;
    this.appId = '80727';
    this.wsURL = 'wss://ws.derivws.com/websockets/v3';
  }

  connect() {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`${this.wsURL}?app_id=${this.appId}`);
        
        this.ws.on('open', () => {
          console.log('WebSocket connected to Deriv API');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.emit('connected');
          resolve();
        });

        this.ws.on('message', (data) => {
          try {
            const message = JSON.parse(data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        });

        this.ws.on('close', (code, reason) => {
          console.log(`WebSocket disconnected: ${code} - ${reason}`);
          this.isConnected = false;
          this.emit('disconnected');
          this.attemptReconnect();
        });

        this.ws.on('error', (error) => {
          console.error('WebSocket error:', error);
          this.emit('error', error);
          reject(error);
        });

      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        reject(error);
      }
    });
  }

  handleMessage(message) {
    if (message.error) {
      console.error('Deriv API error:', message.error);
      this.emit('error', message.error);
      return;
    }

    // Handle tick updates
    if (message.tick) {
      const symbol = message.tick.symbol;
      const tickData = {
        symbol: symbol,
        ask: message.tick.ask,
        bid: message.tick.bid,
        quote: message.tick.quote,
        epoch: message.tick.epoch,
        pip_size: message.tick.pip_size || 0.0001
      };

      this.emit('tick', tickData);
      
      // Emit symbol-specific events
      this.emit(`tick:${symbol}`, tickData);
    }

    // Handle candle updates
    if (message.ohlc) {
      const candle = message.ohlc;
      const candleData = {
        symbol: candle.symbol,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume || 0,
        epoch: candle.epoch,
        granularity: candle.granularity
      };

      this.emit('candle', candleData);
      this.emit(`candle:${candle.symbol}`, candleData);
    }

    // Handle subscription confirmations
    if (message.subscription && message.subscription.id) {
      const subscriptionId = message.subscription.id;
      this.subscriptions.set(subscriptionId, {
        id: subscriptionId,
        symbol: message.echo_req.ticks || message.echo_req.ohlc?.symbol,
        type: message.echo_req.ticks ? 'tick' : 'candle',
        granularity: message.echo_req.ohlc?.granularity
      });
      
      this.emit('subscribed', {
        id: subscriptionId,
        symbol: message.echo_req.ticks || message.echo_req.ohlc?.symbol
      });
    }
  }

  subscribeToTicks(symbol) {
    if (!this.isConnected) {
      throw new Error('WebSocket not connected');
    }

    const request = {
      ticks: symbol,
      subscribe: 1
    };

    this.ws.send(JSON.stringify(request));
  }

  subscribeToCandles(symbol, granularity = 60) {
    if (!this.isConnected) {
      throw new Error('WebSocket not connected');
    }

    const request = {
      ticks_history: symbol,
      style: 'candles',
      granularity: granularity,
      subscribe: 1,
      end: 'latest',
      count: 1
    };

    this.ws.send(JSON.stringify(request));
  }

  unsubscribe(subscriptionId) {
    if (!this.isConnected || !this.subscriptions.has(subscriptionId)) {
      return;
    }

    const request = {
      forget: subscriptionId
    };

    this.ws.send(JSON.stringify(request));
    this.subscriptions.delete(subscriptionId);
  }

  unsubscribeAll() {
    this.subscriptions.forEach((subscription, id) => {
      this.unsubscribe(id);
    });
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('maxReconnectAttempts');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, this.reconnectInterval);
  }

  disconnect() {
    if (this.ws) {
      this.unsubscribeAll();
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  getActiveSubscriptions() {
    return Array.from(this.subscriptions.values());
  }

  isSymbolSubscribed(symbol) {
    return Array.from(this.subscriptions.values()).some(
      sub => sub.symbol === symbol
    );
  }
}

module.exports = WebSocketService;
