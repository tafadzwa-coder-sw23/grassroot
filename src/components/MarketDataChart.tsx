import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, Clock } from "lucide-react";
import { format } from "date-fns";

const timeframes = [
  { id: "1m", label: "1M", name: "1 Minute" },
  { id: "5m", label: "5M", name: "5 Minutes" },
  { id: "15m", label: "15M", name: "15 Minutes" },
  { id: "1h", label: "1H", name: "1 Hour" },
  { id: "4h", label: "4H", name: "4 Hours" },
];

interface Symbol {
  id: string;
  symbol: string;
  display_name: string;
  category: string;
}

interface MarketDataChartProps {
  symbol: Symbol | null;
  tradingStyle: string;
}

interface MarketDataPoint {
  timestamp: string;
  close: number;
  high: number;
  low: number;
  open: number;
}

export default function MarketDataChart({ symbol, tradingStyle }: MarketDataChartProps) {
  const [marketData, setMarketData] = useState<MarketDataPoint[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState("15m");
  const [isLoading, setIsLoading] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);

  useEffect(() => {
    if (symbol) {
      loadMarketData();
      // Simulate real-time price updates
      const interval = setInterval(() => {
        updateCurrentPrice();
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [symbol, selectedTimeframe]);

  const loadMarketData = async () => {
    if (!symbol) return;
    
    setIsLoading(true);
    try {
      // Generate sample data for demo
      generateSampleData();
    } catch (error) {
      console.error("Error loading market data:", error);
      generateSampleData();
    }
    setIsLoading(false);
  };

  const generateSampleData = () => {
    const sampleData: MarketDataPoint[] = [];
    let price = 1.0850 + (Math.random() - 0.5) * 0.01;
    
    for (let i = 0; i < 50; i++) {
      const timestamp = new Date(Date.now() - (50 - i) * 60000);
      const change = (Math.random() - 0.5) * 0.001;
      price += change;
      
      sampleData.push({
        timestamp: timestamp.toISOString(),
        close: price,
        high: price + Math.random() * 0.0005,
        low: price - Math.random() * 0.0005,
        open: price + (Math.random() - 0.5) * 0.0002,
      });
    }
    
    setMarketData(sampleData);
    setCurrentPrice(price);
    setPriceChange((Math.random() - 0.5) * 0.001);
  };

  const updateCurrentPrice = () => {
    if (currentPrice !== null) {
      const change = (Math.random() - 0.5) * 0.0005;
      const newPrice = currentPrice + change;
      setCurrentPrice(newPrice);
      setPriceChange(change);
      
      // Update last data point
      setMarketData(prev => {
        if (prev.length > 0) {
          const updated = [...prev];
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            close: newPrice,
            timestamp: new Date().toISOString()
          };
          return updated;
        }
        return prev;
      });
    }
  };

  const formatPrice = (price: number | null): string => {
    return price?.toFixed(5) || "0.00000";
  };

  const formatChange = (change: number | null): string => {
    if (!change) return "0.0000";
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(4)}`;
  };

  const isPositive = priceChange !== null && priceChange >= 0;

  return (
    <Card className="glass-effect shadow-xl border-0">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
            <Activity className="w-6 h-6 text-blue-500" />
            {symbol ? symbol.display_name : "Select Symbol"}
          </CardTitle>
          {symbol && (
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-800">
                {formatPrice(currentPrice)}
              </div>
              <div className={`text-sm font-semibold flex items-center gap-1 ${
                isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {formatChange(priceChange)}
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Timeframe Selection */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <div className="flex gap-1">
            {timeframes.map((tf) => (
              <Button
                key={tf.id}
                variant={selectedTimeframe === tf.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTimeframe(tf.id)}
                className="px-3 py-1 text-xs"
              >
                {tf.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Chart Placeholder */}
        <div className="h-80 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-200">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-pulse text-slate-500">Loading chart data...</div>
            </div>
          ) : marketData.length > 0 ? (
            <div className="text-center">
              <div className="text-lg font-semibold text-slate-700 mb-2">Live Chart</div>
              <div className="text-sm text-slate-500">
                {marketData.length} data points loaded
              </div>
              <div className="mt-4 text-xs text-slate-400">
                Current: {formatPrice(currentPrice)} | Change: {formatChange(priceChange)}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              {symbol ? "No data available" : "Select a symbol to view chart"}
            </div>
          )}
        </div>

        {/* Trading Style Indicator */}
        {tradingStyle && (
          <div className="flex items-center justify-center">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {tradingStyle.replace("_", " ").toUpperCase()} Mode
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
