import { useState, useEffect, createContext, useContext, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';

interface RealTimeDataContextType {
  symbols: string[];
  marketData: any[];
  signals: any[];
  isConnected: boolean;
  subscribeToSymbol: (symbol: string) => void;
  unsubscribeFromSymbol: (symbol: string) => void;
}

const RealTimeDataContext = createContext<RealTimeDataContextType>({
  symbols: [],
  marketData: [],
  signals: [],
  isConnected: false,
  subscribeToSymbol: () => {},
  unsubscribeFromSymbol: () => {},
});

export const useRealTimeData = () => useContext(RealTimeDataContext);

export const RealTimeDataProvider = ({ children }: { children: React.ReactNode }) => {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [marketData, setMarketData] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();
  
  const wsRef = useRef<WebSocket | null>(null);
  const messageQueueRef = useRef<any[]>([]);
  const subscribedSymbolsRef = useRef<Set<string>>(new Set());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const API_BASE_URL = 'http://localhost:3001';
  const WS_URL = `ws://${window.location.hostname}:3001`;

  const connectWebSocket = () => {
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        toast({
          title: "Connected",
          description: "Real-time data connection established",
        });

        // Process queued messages
        while (messageQueueRef.current.length > 0) {
          const message = messageQueueRef.current.shift();
          ws.send(JSON.stringify(message));
        }

        // Resubscribe to all symbols
        subscribedSymbolsRef.current.forEach(symbol => {
          ws.send(JSON.stringify({ type: 'subscribe', symbol }));
        });
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'tick':
            setMarketData(prev => [...prev, data.data]);
            break;
          case 'signals':
            setSignals(data.data);
            break;
          case 'symbols':
            setSymbols(data.data);
            break;
          case 'error':
            toast({
              title: "Error",
              description: data.message,
              variant: "destructive",
            });
            break;
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        toast({
          title: "Disconnected",
          description: "Real-time data connection lost - attempting to reconnect...",
          variant: "destructive",
        });

        // Attempt to reconnect after 3 seconds
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
    }
  };

  useEffect(() => {
    connectWebSocket();

    // Fetch initial data
    fetchInitialData();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const fetchInitialData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/symbols`);
      const symbolsData = await response.json();
      setSymbols(symbolsData);
    } catch (error) {
      console.error('Failed to fetch symbols:', error);
    }
  };

  const subscribeToSymbol = async (symbol: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol })
      });
      
      if (response.ok) {
        toast({ title: "Subscribed", description: `Subscribed to ${symbol}` });
        subscribedSymbolsRef.current.add(symbol);
        
        // Send subscription to WebSocket
        const message = { type: 'subscribe', symbol };
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify(message));
        } else {
          messageQueueRef.current.push(message);
        }
      }
    } catch (error) {
      console.error('Failed to subscribe:', error);
    }
  };

  const unsubscribeFromSymbol = async (symbol: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol })
      });
      
      if (response.ok) {
        toast({ title: "Unsubscribed", description: `Unsubscribed from ${symbol}` });
        subscribedSymbolsRef.current.delete(symbol);
        
        // Send unsubscription to WebSocket
        const message = { type: 'unsubscribe', symbol };
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify(message));
        } else {
          messageQueueRef.current.push(message);
        }
      }
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
    }
  };

  return (
    <RealTimeDataContext.Provider value={{
      symbols,
      marketData,
      signals,
      isConnected,
      subscribeToSymbol,
      unsubscribeFromSymbol
    }}>
      {children}
    </RealTimeDataContext.Provider>
  );
};
