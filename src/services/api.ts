import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const WS_URL = import.meta.env.VITE_WS_URL || 'wss://ws.binaryws.com/websockets/v3';

class TradingAPI {
  private ws: WebSocket | null = null;
  private _isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second delay
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private connectionPromise: Promise<void> | null = null;
  private messageHandlers: Array<(data: any) => void> = [];
  private connectionChangeListeners: Array<(isConnected: boolean) => void> = [];
  private readonly WS_URL = WS_URL;  // Use the configured WebSocket URL

  // Add this method to expose WebSocket ready state
  public getWebSocketReadyState(): number | null {
    return this.ws?.readyState ?? null;
  }

  // Add connection state change listener
  public onConnectionChange(callback: (isConnected: boolean) => void): () => void {
    this.connectionChangeListeners.push(callback);
    return () => {
      this.connectionChangeListeners = this.connectionChangeListeners.filter(cb => cb !== callback);
    };
  }

  private notifyConnectionChange(isConnected: boolean) {
    this._isConnected = isConnected;
    this.connectionChangeListeners.forEach(callback => {
      try {
        callback(isConnected);
      } catch (error) {
        console.error('Error in connection change callback:', error);
      }
    });
  }

  public isConnected(): boolean {
    return this._isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  public async connectWebSocket(): Promise<void> {
    // If already connected, resolve immediately
    if (this.isConnected()) {
      return Promise.resolve();
    }

    // If already connecting, return the existing promise
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // Create a new connection promise
    this.connectionPromise = new Promise((resolve, reject) => {
      // Close existing connection if any
      if (this.ws) {
        this.ws.close();
      }

      console.log(`Connecting to WebSocket at ${this.WS_URL}`);
      this.ws = new WebSocket(this.WS_URL);

      // Set up event handlers
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this._isConnected = true;
        this.reconnectAttempts = 0;
        this.notifyConnectionChange(true);
        resolve();
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this._isConnected = false;
        this.notifyConnectionChange(false);
        
        // Clear the connection promise
        this.connectionPromise = null;
        
        // Only attempt to reconnect if the connection was previously established
        if (event.code !== 1000) { // Don't reconnect on normal closure
          this.attemptReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this._isConnected = false;
        this.notifyConnectionChange(false);
        reject(error);
        this.connectionPromise = null;
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.messageHandlers.forEach(handler => {
            try {
              if (typeof handler === 'function') {
                handler(data);
              }
            } catch (error) {
              console.error('Error in message handler:', error);
            }
          });
        } catch (error) {
          console.error('Error parsing WebSocket message:', error, event.data);
        }
      };
    });

    // Set a connection timeout
    const timeout = new Promise<void>((_, reject) => {
      setTimeout(() => {
        if (!this.isConnected()) {
          this.ws?.close();
          reject(new Error('WebSocket connection timeout'));
          this.connectionPromise = null;
        }
      }, 5000); // 5 second timeout
    });

    return Promise.race([this.connectionPromise, timeout])
      .finally(() => {
        // Clean up the connection promise if it's still the same one
        if (this.connectionPromise === this.connectionPromise) {
          this.connectionPromise = null;
        }
      });
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connectWebSocket().catch(console.error);
    }, delay);
  }

  public disconnectWebSocket() {
    // Clear any pending reconnection attempt
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }
    
    this._isConnected = false;
    this.reconnectAttempts = 0;
    this.connectionPromise = null;
    this.notifyConnectionChange(false);
  }

  public subscribeToSymbol(symbol: string, timeframe: string) {
    if (!this.isConnected()) {
      console.warn('WebSocket not connected, cannot subscribe to symbol');
      return;
    }
    
    try {
      this.ws?.send(JSON.stringify({
        type: 'subscribe',
        symbol,
        timeframe
      }));
    } catch (error) {
      console.error('Error subscribing to symbol:', error);
    }
  }

  public unsubscribeFromSymbol(symbol: string, timeframe: string) {
    if (!this.isConnected()) {
      return;
    }
    
    try {
      this.ws?.send(JSON.stringify({
        type: 'unsubscribe',
        symbol,
        timeframe343
      }));
    } catch (error) {
      console.error('Error unsubscribing from symbol:', error);
    }
  }

  public onMessage(handler: (data: any) => void): () => void {
    if (typeof handler !== 'function') {
      console.error('Handler must be a function');
      return () => {};
    }
    
    this.messageHandlers.push(handler);
    
    // Return unsubscribe function
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  // Analysis control
  async startAnalysis() {
    const response = await axios.post(`${API_BASE_URL}/analysis/start`);
    return response.data;
  }

  async stopAnalysis() {
    const response = await axios.post(`${API_BASE_URL}/analysis/stop`);
    return response.data;
  }

  async getAnalysisStatus(): Promise<{ enabled: boolean }> {
    const response = await axios.get(`${API_BASE_URL}/analysis/status`);
    return response.data;
  }

  // Get all available symbols
  async getSymbols() {
    try {
      const response = await axios.get(`${API_BASE_URL}/symbols`);
      return response.data;
    } catch (error) {
      console.error('Error fetching symbols:', error);
      throw error;
    }
  }

  // Get market data for a symbol and timeframe
  async getMarketData(symbol: string, timeframe: string) {
    try {
      const response = await axios.get(`${API_BASE_URL}/market-data/${symbol}/${timeframe}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching market data:', error);
      throw error;
    }
  }

  // Get trading signals for a symbol and timeframe
  async getSignals(symbol: string, timeframe: string) {
    try {
      const response = await axios.get(`${API_BASE_URL}/signals/${symbol}/${timeframe}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching signals:', error);
      throw error;
    }
  }

  // Get CHOCH analysis for a symbol and timeframe
  async getCHOCHAnalysis(symbol: string, timeframe: string) {
    try {
      const response = await axios.get(`${API_BASE_URL}/choch-analysis/${symbol}/${timeframe}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching CHOCH analysis:', error);
      throw error;
    }
  }

  // Get risk analysis for a symbol
  async getRiskAnalysis(symbol: string) {
    try {
      const response = await axios.get(`${API_BASE_URL}/risk-analysis/${symbol}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching risk analysis:', error);
      throw error;
    }
  }

  // Close WebSocket connection
  disconnect() {
    this.disconnectWebSocket();
  }
}

// Export a singleton instance
export const tradingAPI = new TradingAPI();
export { TradingAPI };
