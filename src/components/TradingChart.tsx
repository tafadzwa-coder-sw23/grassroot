import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, BarChart3, Activity, AlertTriangle } from "lucide-react";
import { useTradingData } from "@/hooks/useTradingData";

interface TradingChartProps {
  symbol: string;
  strategy: string;
}

export const TradingChart = ({ symbol, strategy }: TradingChartProps) => {
  const {
    marketData,
    currentPrice,
    priceChange,
    chochAnalysis,
    riskAnalysis,
    isLoading,
    error,
    connectionStatus
  } = useTradingData(symbol, strategy);

  // Generate candlestick data from market data
  const generateCandlesticks = () => {
    if (!marketData || marketData.length === 0) return [];
    
    return marketData.slice(-50).map((candle, i) => ({
      x: i * 8,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
      timestamp: candle.timestamp,
      isGreen: candle.close >= candle.open
    }));
  };

  const candlesticks = generateCandlesticks();

  if (isLoading) {
    return (
      <Card className="h-[500px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 animate-spin" />
            Loading Chart...
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading market data...</p>
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
            Chart Error
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-2">{error}</p>
            <p className="text-sm text-muted-foreground">Unable to load chart data</p>
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
            <BarChart3 className="w-5 h-5" />
            {symbol} Chart
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-blue-600 border-blue-600">
              {strategy.replace('-', ' ').toUpperCase()}
            </Badge>
            <Badge 
              variant={connectionStatus === 'connected' ? 'default' : 'destructive'}
              className="text-xs"
            >
              {connectionStatus === 'connected' ? 'Live' : 'Offline'}
            </Badge>
            {currentPrice !== null && currentPrice !== undefined && priceChange !== null && priceChange !== undefined && (
              <>
                <div className="text-right">
                  <div className="text-lg font-bold">{currentPrice.toFixed(5)}</div>
                  <div className={`text-sm flex items-center gap-1 ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {priceChange >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 h-[400px] relative overflow-hidden">
        {/* Chart Visualization */}
        <div className="absolute inset-0 bg-gradient-to-b from-background to-muted/20">
          <svg width="100%" height="100%" className="absolute inset-0">
            {/* Grid lines */}
            {[...Array(10)].map((_, i) => (
              <line
                key={i}
                x1="0"
                y1={i * 40}
                x2="100%"
                y2={i * 40}
                stroke="hsl(var(--border))"
                strokeWidth="0.5"
                opacity="0.3"
              />
            ))}
            
            {/* Candlesticks */}
            {candlesticks.map((candle, i) => {
              const bodyHeight = Math.abs(candle.close - candle.open) * 1000;
              const bodyY = 200 - (bodyHeight / 2);
              const wickHeight = (candle.high - candle.low) * 1000;
              const wickY = 200 - (wickHeight / 2);
              
              return (
                <g key={i}>
                  {/* Wick */}
                  <line
                    x1={candle.x + 3}
                    y1={200 - (candle.high - (currentPrice || 0)) * 1000}
                    x2={candle.x + 3}
                    y2={200 - (candle.low - (currentPrice || 0)) * 1000}
                    stroke={candle.isGreen ? "#22c55e" : "#ef4444"}
                    strokeWidth="1"
                  />
                  {/* Body */}
                  <rect
                    x={candle.x + 1}
                    width="4"
                    height={Math.max(bodyHeight, 2)}
                    fill={candle.isGreen ? "#22c55e" : "#ef4444"}
                    opacity="0.8"
                  />
                </g>
              );
            })}
            
            {/* Trend line */}
            {candlesticks.length > 1 && (
              <polyline
                points={candlesticks.map((candle, i) => `${candle.x + 3},${200 - (candle.close - (currentPrice || 0)) * 1000}`).join(' ')}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                opacity="0.6"
              />
            )}
          </svg>
          
          {/* CHOCH Analysis Overlay */}
          {chochAnalysis && chochAnalysis.score !== undefined && chochAnalysis.score !== null && (
            <div className="absolute top-4 left-4 space-y-2">
              <Badge className="bg-blue-500 text-white">
                CHOCH Score: {chochAnalysis.score.toFixed(2)}
              </Badge>
              {chochAnalysis.marketStructure && chochAnalysis.marketStructure.trend && (
                <Badge className="bg-purple-500 text-white">
                  {chochAnalysis.marketStructure.trend}
                </Badge>
              )}
            </div>
          )}
          
          {/* Risk Analysis Overlay */}
          {riskAnalysis && riskAnalysis.riskScore !== undefined && riskAnalysis.riskScore !== null && (
            <div className="absolute top-4 right-4 space-y-2">
              <Badge 
                variant={riskAnalysis.riskScore < 0.3 ? 'default' : riskAnalysis.riskScore < 0.6 ? 'secondary' : 'destructive'}
              >
                Risk: {riskAnalysis.riskScore.toFixed(2)}
              </Badge>
              {riskAnalysis.volatility && riskAnalysis.volatility.classification && (
                <Badge variant="outline">
                  Vol: {riskAnalysis.volatility.classification}
                </Badge>
              )}
            </div>
          )}
          
          {/* Signal indicators */}
          <div className="absolute bottom-4 left-4">
            <Badge className="bg-green-500 text-white">
              ML Signals Active
            </Badge>
          </div>
          
          <div className="absolute bottom-4 right-4 text-xs text-muted-foreground">
            Real-time market data • CHOCH + ML analysis
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
