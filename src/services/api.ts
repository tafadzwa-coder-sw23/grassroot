import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8081';

class TradingAPI {
  private ws: WebSocket | null = null;
  private messageHandlers: Map<string, Function[]> = new Map();

  // Initialize WebSocket connection
  connectWebSocket() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(WS_URL);
    
    this.ws.onopen = () => {
      console.log('WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleWebSocketMessage(data);
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Reconnect after 5 seconds
      setTimeout(() => this.connectWebSocket(), 5000);
    };
  }

  // Expose read-only ready state for UI/hooks
  getWebSocketReadyState(): number | null {
    return this.ws?.readyState ?? null;
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

  // Subscribe to symbol updates
  subscribeToSymbol(symbol: string, timeframe: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'subscribe',
        symbol,
        timeframe
      }));
    }
  }

  // Unsubscribe from symbol updates
  unsubscribeFromSymbol(symbol: string, timeframe: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'unsubscribe',
        symbol,
        timeframe
      }));
    }
  }

  // Add message handler
  onMessage(type: string, handler: Function) {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, []);
    }
    this.messageHandlers.get(type)!.push(handler);
  }

  // Remove message handler
  offMessage(type: string, handler: Function) {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Handle incoming WebSocket messages
  private handleWebSocketMessage(data: any) {
    const { type } = data;
    const handlers = this.messageHandlers.get(type);
    
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const tradingAPI = new TradingAPI();
export default TradingAPI;
