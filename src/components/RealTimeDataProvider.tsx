import { useState, useEffect, createContext, useContext } from 'react';
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

  useEffect(() => {
    // Connect to WebSocket
    const ws = new WebSocket('ws://localhost:8080');
    
    ws.onopen = () => {
      setIsConnected(true);
      toast({
        title: "Connected",
        description: "Real-time data connection established",
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
        description: "Real-time data connection lost",
        variant: "destructive",
      });
    };

    // Fetch initial data
    fetchInitialData();

    return () => {
      ws.close();
    };
  }, []);

  const fetchInitialData = async () => {
    try {
      const response = await fetch('/api/symbols');
      const symbolsData = await response.json();
      setSymbols(symbolsData);
    } catch (error) {
      console.error('Failed to fetch symbols:', error);
    }
  };

  const subscribeToSymbol = async (symbol: string) => {
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol })
      });
      if (response.ok) {
        toast({ title: "Subscribed", description: `Subscribed to ${symbol}` });
      }
    } catch (error) {
      console.error('Failed to subscribe:', error);
    }
  };

  const unsubscribeFromSymbol = async (symbol: string) => {
    try {
      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol })
      });
      if (response.ok) {
        toast({ title: "Unsubscribed", description: `Unsubscribed from ${symbol}` });
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
