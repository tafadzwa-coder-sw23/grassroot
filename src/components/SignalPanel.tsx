import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Target, Clock, AlertTriangle, Zap, Activity } from "lucide-react";
import { useTradingData, Signal } from "@/hooks/useTradingData";

interface SignalPanelProps {
  symbol: string;
  strategy: string;
}

export const SignalPanel = ({ symbol, strategy }: SignalPanelProps) => {
  const {
    signals,
    currentPrice,
    priceChange,
    chochAnalysis,
    riskAnalysis,
    isLoading,
    error,
    connectionStatus,
    bestSignal
  } = useTradingData(symbol, strategy);

  const getSignalIcon = (signalType: string) => {
    switch (signalType) {
      case "BUY":
        return <TrendingUp className="w-4 h-4" />;
      case "SELL":
        return <TrendingDown className="w-4 h-4" />;
      case "SCALE_IN":
        return <Target className="w-4 h-4" />;
      default:
        return <Target className="w-4 h-4" />;
    }
  };

  const getSignalColor = (signalType: string) => {
    switch (signalType) {
      case "BUY":
        return "bg-green-500 text-white";
      case "SELL":
        return "bg-red-500 text-white";
      case "SCALE_IN":
        return "bg-blue-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600";
    if (confidence >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const formatPrice = (price: number) => {
    return price.toFixed(5);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  if (isLoading) {
  return (
      <Card className="h-[500px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 animate-spin" />
            Loading Signals...
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Analyzing market data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-[500px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Error Loading Signals
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-2">{error}</p>
            <p className="text-sm text-muted-foreground">Please check your connection and try again</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-[500px]">
      <CardHeader>
          <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            ML Trading Signals
          </CardTitle>
          <Badge 
            variant={connectionStatus === 'connected' ? 'default' : 'destructive'}
            className="text-xs"
          >
            {connectionStatus === 'connected' ? 'Live' : 'Offline'}
              </Badge>
        </div>
        
        {/* Current Price Display */}
        {currentPrice && (
          <div className="text-right">
            <div className="text-lg font-bold">{formatPrice(currentPrice)}</div>
            <div className={`text-sm flex items-center gap-1 ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {priceChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {formatPercentage(priceChange)}
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4 h-[400px] overflow-y-auto">
        {/* CHOCH Analysis Summary */}
        {chochAnalysis && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Market Structure Analysis</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Trend: </span>
                <Badge variant="outline" className="text-xs">
                  {chochAnalysis.marketStructure.trend}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Score: </span>
                <Badge variant="outline" className="text-xs">
                  {chochAnalysis.score.toFixed(2)}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Risk Analysis Summary */}
        {riskAnalysis && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Risk Assessment</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Risk Score: </span>
                <Badge 
                  variant={riskAnalysis.riskScore < 0.3 ? 'default' : riskAnalysis.riskScore < 0.6 ? 'secondary' : 'destructive'}
                  className="text-xs"
                >
                  {riskAnalysis.riskScore.toFixed(2)}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Volatility: </span>
                <Badge variant="outline" className="text-xs">
                  {riskAnalysis.volatility.classification}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Best Signal Highlight */}
        {bestSignal && (
          <div className="p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
            <div className="flex items-center justify-between mb-2">
              <Badge className={getSignalColor(bestSignal.direction)}>
                {getSignalIcon(bestSignal.direction)}
                {bestSignal.direction}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {bestSignal.chochPattern}
              </Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Entry:</span>
                <span className="font-medium">{formatPrice(bestSignal.entryPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span>Stop Loss:</span>
                <span className="text-red-600">{formatPrice(bestSignal.stopLoss)}</span>
              </div>
              <div className="flex justify-between">
                <span>Take Profit:</span>
                <span className="text-green-600">{formatPrice(bestSignal.takeProfit)}</span>
              </div>
              <div className="flex justify-between">
                <span>Confidence:</span>
                <span className={`font-medium ${getConfidenceColor(bestSignal.confidence)}`}>
                  {(bestSignal.confidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>
        )}

        {/* All Active Signals */}
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Active Signals ({signals.length})</h4>
          
          {signals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No active signals</p>
              <p className="text-xs">Waiting for market conditions...</p>
          </div>
          ) : (
            signals.map((signal, index) => (
              <div key={signal.id ?? `${signal.symbol}-${signal.timeframe}-${(signal as any).timestamp ?? index}`}
                   className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <Badge className={getSignalColor(signal.direction)}>
                    {getSignalIcon(signal.direction)}
                    {signal.direction}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {signal.timeframe}
                  </Badge>
                </div>
                
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Entry:</span>
                    <span className="font-medium">{formatPrice(signal.entryPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SL:</span>
                    <span className="text-red-600">{formatPrice(signal.stopLoss)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TP:</span>
                    <span className="text-green-600">{formatPrice(signal.takeProfit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>R:R:</span>
                    <span className="text-blue-600">{signal.riskReward.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Confidence:</span>
                    <span className={`font-medium ${getConfidenceColor(signal.confidence)}`}>
                      {(signal.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {signal.analysis_notes && (
                  <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                    <p className="text-muted-foreground">{signal.analysis_notes}</p>
                  </div>
                )}
              </div>
            ))
          )}
          </div>
        </CardContent>
      </Card>
  );
};