import { useState, useEffect, useCallback } from 'react';
import { tradingAPI } from '@/services/api';

export interface Signal {
  id: string;
  type: string;
  direction: 'BUY' | 'SELL' | 'SCALE_IN';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  timeframe: string;
  chochPattern: string;
  riskReward: number;
  marketCondition: string;
  timestamp: number;
  symbol: string;
  analysis_notes?: string;
  expires_at?: string;
}

export interface MarketData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CHOCHAnalysis {
  symbol: string;
  timeframe: string;
  timestamp: number;
  patterns: any[];
  marketStructure: {
    trend: string;
    higherHighs: number;
    lowerLows: number;
    breakOfStructure: boolean;
    changeOfCharacter: {
      bullish: boolean;
      bearish: boolean;
    };
  };
  liquidityLevels: any[];
  orderBlocks: any[];
  fairValueGaps: any[];
  breakerBlocks: any[];
  mitigation: any;
  score: number;
}

export interface RiskAnalysis {
  symbol: string;
  timestamp: number;
  riskScore: number;
  volatility: {
    daily: number;
    annualized: number;
    classification: string;
  };
  atr: number;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  supportResistance: {
    support: number[];
    resistance: number[];
  };
  recommendations: string[];
}

export const useTradingData = (symbol: string, strategy: string) => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [chochAnalysis, setChochAnalysis] = useState<CHOCHAnalysis | null>(null);
  const [riskAnalysis, setRiskAnalysis] = useState<RiskAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  const [analysisEnabled, setAnalysisEnabled] = useState<boolean>(false);

  // Get timeframe based on strategy
  const getTimeframe = useCallback((strategy: string) => {
    switch (strategy) {
      case 'scalping':
        return '1m';
      case 'day-trading':
        return '5m';
      case 'swing-trading':
        return '1h';
      default:
        return '1h';
    }
  }, []);

  // Load initial data
  const loadData = useCallback(async () => {
    if (!symbol) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const timeframe = getTimeframe(strategy);
      
      // Load data in parallel
      const [signalsData, marketDataData, chochData, riskData] = await Promise.all([
        tradingAPI.getSignals(symbol, timeframe),
        tradingAPI.getMarketData(symbol, timeframe),
        tradingAPI.getCHOCHAnalysis(symbol, timeframe),
        tradingAPI.getRiskAnalysis(symbol)
      ]);

      setSignals(signalsData);
      setMarketData(marketDataData);
      setChochAnalysis(chochData);
      setRiskAnalysis(riskData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      console.error('Error loading trading data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, strategy, getTimeframe]);

  // Connect to WebSocket for real-time updates
  useEffect(() => {
    if (!symbol) return;

    setConnectionStatus('connecting');
    
    // Connect to WebSocket
    tradingAPI.connectWebSocket();
    
    // Wait for connection to establish
    const connectTimeout = setTimeout(() => {
      if (tradingAPI.isConnected()) {
        setConnectionStatus('connected');
        
        const timeframe = getTimeframe(strategy);
        tradingAPI.subscribeToSymbol(symbol, timeframe);
        
        // Set up message handlers
        tradingAPI.onMessage((data: any) => {
          if (data.type === 'new_signals' && data.symbol === symbol) {
            setSignals(prev => [...prev, ...data.signals]);
          }
        });
        
        tradingAPI.onMessage((data: any) => {
          if (data.type === 'market_data' && data.symbol === symbol) {
            setMarketData(data.data);
          }
        });
        
        tradingAPI.onMessage((data: any) => {
          if (data.type === 'choch_analysis' && data.symbol === symbol) {
            setChochAnalysis(data.analysis);
          }
        });
        
        tradingAPI.onMessage((data: any) => {
          if (data.type === 'risk_analysis' && data.symbol === symbol) {
            setRiskAnalysis(data.analysis);
          }
        });
      } else {
        setConnectionStatus('disconnected');
      }
    }, 1000);

    return () => {
      clearTimeout(connectTimeout);
      const timeframe = getTimeframe(strategy);
      tradingAPI.unsubscribeFromSymbol(symbol, timeframe);
    };
  }, [symbol, strategy, getTimeframe]);

  // Load data when symbol or strategy changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Poll analysis status
  useEffect(() => {
    let mounted = true;
    const fetchStatus = async () => {
      try {
        const status = await tradingAPI.getAnalysisStatus();
        if (mounted) setAnalysisEnabled(status.enabled);
      } catch (e) {
        // ignore
      }
    };
    fetchStatus();
    const t = setInterval(fetchStatus, 10000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  // Get current price from market data
  const currentPrice = marketData.length > 0 ? marketData[marketData.length - 1].close : null;
  
  // Get price change percentage
  const priceChange = marketData.length > 1 
    ? ((marketData[marketData.length - 1].close - marketData[marketData.length - 2].close) / marketData[marketData.length - 2].close) * 100
    : 0;

  // Get active signals (not expired)
  const activeSignals = signals.filter(signal => {
    if (!signal.expires_at) return true;
    return new Date(signal.expires_at).getTime() > Date.now();
  });

  // Get signal by type
  const getSignalsByType = (type: string) => signals.filter(signal => signal.type === type);

  // Get highest confidence signal
  const bestSignal = signals.length > 0 
    ? signals.reduce((best, current) => current.confidence > best.confidence ? current : best)
    : null;

  return {
    // Data
    signals: activeSignals,
    marketData,
    chochAnalysis,
    riskAnalysis,
    currentPrice,
    priceChange,
    
    // State
    isLoading,
    error,
    connectionStatus,
    analysisEnabled,
    
    // Computed values
    bestSignal,
    getSignalsByType,
    
    // Actions
    loadData,
    refresh: loadData,
    startAnalysis: () => tradingAPI.startAnalysis().then(() => setAnalysisEnabled(true)),
    stopAnalysis: () => tradingAPI.stopAnalysis().then(() => setAnalysisEnabled(false))
  };
};
