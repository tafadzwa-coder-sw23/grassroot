import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, TrendingUp, TrendingDown, Clock, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Signal {
  id: number;
  symbol: string;
  trading_style: string;
  signal_type: string;
  entry_price: number;
  stop_loss: number;
  take_profit: number;
  confidence_score: number;
  analysis_notes: string;
  timeframe: string;
  created_date: string;
  expires_at: string;
}

interface ActiveSignalsPanelProps {
  symbol: any;
  tradingStyle: string;
}

export default function ActiveSignalsPanel({ symbol, tradingStyle }: ActiveSignalsPanelProps) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSignals();
    const interval = setInterval(loadSignals, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [symbol, tradingStyle]);

  const loadSignals = async () => {
    if (!symbol || !tradingStyle) return;
    
    setIsLoading(true);
    try {
      // Generate sample signals for demo
      generateSampleSignals();
    } catch (error) {
      console.error("Error loading signals:", error);
      generateSampleSignals();
    }
    setIsLoading(false);
  };

  const generateSampleSignals = () => {
    if (!symbol || !tradingStyle) return;
    
    const sampleSignals: Signal[] = [
      {
        id: 1,
        symbol: symbol.symbol || "EURUSD",
        trading_style: tradingStyle,
        signal_type: "buy",
        entry_price: 1.0845,
        stop_loss: 1.0825,
        take_profit: 1.0885,
        confidence_score: 87,
        analysis_notes: "Strong bullish momentum with breakout above resistance",
        timeframe: "15m",
        created_date: new Date(Date.now() - 5 * 60000).toISOString(),
        expires_at: new Date(Date.now() + 25 * 60000).toISOString()
      },
      {
        id: 2,
        symbol: symbol.symbol || "EURUSD",
        trading_style: tradingStyle,
        signal_type: "scale_in",
        entry_price: 1.0838,
        stop_loss: 1.0825,
        take_profit: 1.0885,
        confidence_score: 72,
        analysis_notes: "Pullback to support level, good scale-in opportunity",
        timeframe: "15m",
        created_date: new Date(Date.now() - 12 * 60000).toISOString(),
        expires_at: new Date(Date.now() + 18 * 60000).toISOString()
      }
    ];
    
    setSignals(sampleSignals);
  };

  const getSignalIcon = (signalType: string) => {
    switch (signalType) {
      case "buy":
        return <TrendingUp className="w-4 h-4" />;
      case "sell":
        return <TrendingDown className="w-4 h-4" />;
      case "scale_in":
        return <Target className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  const getSignalColor = (signalType: string) => {
    switch (signalType) {
      case "buy":
        return "bg-green-100 text-green-700 border-green-200";
      case "sell":
        return "bg-red-100 text-red-700 border-red-200";
      case "scale_in":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  const isExpiringSoon = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    return (expiry.getTime() - now.getTime()) < 5 * 60 * 1000; // Less than 5 minutes
  };

  return (
    <Card className="glass-effect shadow-xl border-0">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
          <Target className="w-6 h-6 text-blue-500" />
          Active Signals
          {signals.length > 0 && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              {signals.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-slate-500">Loading signals...</div>
          </div>
        ) : signals.length === 0 ? (
          <div className="text-center py-8">
            <Target className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">No active signals</p>
            <p className="text-sm text-slate-400">
              {!symbol || !tradingStyle 
                ? "Select symbol and trading style to see signals"
                : "Waiting for market opportunities..."
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {signals.map((signal) => (
              <div
                key={signal.id}
                className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge className={`${getSignalColor(signal.signal_type)} border font-medium`}>
                      {getSignalIcon(signal.signal_type)}
                      {signal.signal_type.replace("_", " ").toUpperCase()}
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className={`${getConfidenceColor(signal.confidence_score)} border`}
                    >
                      {signal.confidence_score}% confidence
                    </Badge>
                  </div>
                  
                  {signal.expires_at && isExpiringSoon(signal.expires_at) && (
                    <Badge variant="destructive" className="bg-red-50 text-red-600 border-red-200">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Expires soon
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div className="text-center">
                    <p className="text-xs text-slate-500 font-medium">Entry</p>
                    <p className="font-bold text-slate-800">{signal.entry_price.toFixed(5)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 font-medium">Stop Loss</p>
                    <p className="font-bold text-red-600">{signal.stop_loss.toFixed(5)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 font-medium">Take Profit</p>
                    <p className="font-bold text-green-600">{signal.take_profit.toFixed(5)}</p>
                  </div>
                </div>

                {signal.analysis_notes && (
                  <div className="bg-slate-50 rounded-lg p-3 mb-3">
                    <p className="text-sm text-slate-700">{signal.analysis_notes}</p>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(signal.created_date), { addSuffix: true })}
                  </div>
                  {signal.expires_at && (
                    <div>
                      Expires {formatDistanceToNow(new Date(signal.expires_at), { addSuffix: true })}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
