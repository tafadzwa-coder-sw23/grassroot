import { useEffect, useState, useCallback } from 'react';
import { tradingAPI } from '@/services/api';

export interface CandleData {
  epoch: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export function useMarketData(symbol: string, interval: string) {
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMarketData = useCallback((data: any) => {
    if (data.msg_type === 'candles' && data.candles) {
      setCandles(prevCandles => {
        // Update existing candles or add new ones
        const updatedCandles = [...prevCandles];
        
        data.candles.forEach((newCandle: CandleData) => {
          const existingIndex = updatedCandles.findIndex(
            c => c.epoch === newCandle.epoch
          );
          
          if (existingIndex >= 0) {
            updatedCandles[existingIndex] = newCandle;
          } else {
            updatedCandles.push(newCandle);
          }
        });
        
        // Sort by timestamp and keep only the most recent 100 candles
        return updatedCandles
          .sort((a, b) => a.epoch - b.epoch)
          .slice(-100);
      });
    }
  }, []);

  useEffect(() => {
    // Subscribe to market data
    const subscribe = async () => {
      try {
        await tradingAPI.connectWebSocket();
        tradingAPI.subscribeToMarketData(symbol, interval, handleMarketData);
        setIsConnected(true);
        setError(null);
      } catch (err) {
        console.error('Failed to subscribe to market data:', err);
        setError('Failed to connect to market data');
        setIsConnected(false);
      }
    };

    subscribe();

    // Cleanup on unmount or when symbol/interval changes
    return () => {
      if (tradingAPI.isWebSocketConnected()) {
        tradingAPI.unsubscribeFromMarketData(symbol, interval, handleMarketData);
      }
    };
  }, [symbol, interval, handleMarketData]);

  return {
    candles,
    isConnected,
    error,
    latestCandle: candles.length > 0 ? candles[candles.length - 1] : null,
  };
}
