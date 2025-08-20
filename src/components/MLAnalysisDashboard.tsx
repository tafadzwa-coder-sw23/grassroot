import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Target, Shield, Brain, Activity, AlertTriangle, Zap, BarChart3 } from "lucide-react";
import { useTradingData } from "@/hooks/useTradingData";

interface MLAnalysisDashboardProps {
  symbol: string;
  strategy: string;
}

export const MLAnalysisDashboard = ({ symbol, strategy }: MLAnalysisDashboardProps) => {
  const {
    chochAnalysis,
    riskAnalysis,
    signals,
    isLoading,
    error,
    connectionStatus
  } = useTradingData(symbol, strategy);

  if (isLoading) {
    return (
      <Card className="h-[600px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 animate-spin" />
            Loading ML Analysis...
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[500px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Analyzing market structure and patterns...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-[600px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            ML Analysis Error
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[500px]">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-2">{String(error)}</p>
            <p className="text-sm text-muted-foreground">Unable to load ML analysis</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const bosDetected = Boolean(
    chochAnalysis?.marketStructure?.breakOfStructure?.bullish ||
    chochAnalysis?.marketStructure?.breakOfStructure?.bearish
  );

  // Normalize liquidity levels to a flat array of { price }
  const liquidityItems = (() => {
    const ll: any = chochAnalysis?.liquidityLevels;
    if (!ll) return [] as Array<{ price: number }>;
    if (Array.isArray(ll)) return ll as Array<{ price: number }>;
    const buy = Array.isArray(ll.buySide) ? ll.buySide.map((x: any) => ({ price: x.level ?? x.price })) : [];
    const sell = Array.isArray(ll.sellSide) ? ll.sellSide.map((x: any) => ({ price: x.level ?? x.price })) : [];
    return [...buy, ...sell].filter((x: any) => typeof x.price === 'number');
  })();

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            ML Backend Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="text-sm">
                {connectionStatus === 'connected' ? 'Connected to ML Backend' : 'Disconnected'}
              </span>
            </div>
            <Badge variant={connectionStatus === 'connected' ? 'default' : 'destructive'}>
              {connectionStatus === 'connected' ? 'Live' : 'Offline'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* CHOCH Analysis */}
      {chochAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              CHOCH Market Structure Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Market Structure Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {Number(chochAnalysis.score ?? 0).toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">CHOCH Score</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold">
                  {chochAnalysis.marketStructure?.trend ?? 'neutral'}
                </div>
                <div className="text-xs text-muted-foreground">Market Trend</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold text-green-600">
                  {chochAnalysis.marketStructure?.higherHighs ?? 0}
                </div>
                <div className="text-xs text-muted-foreground">Higher Highs</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold text-red-600">
                  {chochAnalysis.marketStructure?.lowerLows ?? 0}
                </div>
                <div className="text-xs text-muted-foreground">Lower Lows</div>
              </div>
            </div>

            {/* Market Structure Details */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Market Structure Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <span className="text-sm">Break of Structure:</span>
                  <Badge variant={bosDetected ? 'default' : 'secondary'}>
                    {bosDetected ? 'Detected' : 'None'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-muted/30 rounded">
                  <span className="text-sm">Change of Character:</span>
                  <div className="flex gap-1">
                    {chochAnalysis.marketStructure?.changeOfCharacter?.bullish && (
                      <Badge className="bg-green-500 text-white text-xs">Bullish</Badge>
                    )}
                    {chochAnalysis.marketStructure?.changeOfCharacter?.bearish && (
                      <Badge className="bg-red-500 text-white text-xs">Bearish</Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Liquidity Levels */}
            {liquidityItems.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Liquidity Levels</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {liquidityItems.slice(0, 4).map((level, index) => (
                    <div key={index} className="p-2 bg-blue-50 dark:bg-blue-950/20 rounded text-xs">
                      <div className="font-medium">Level {index + 1}</div>
                      <div className="text-muted-foreground">Price: {Number(level.price).toFixed(5)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Risk Analysis */}
      {riskAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Risk Assessment & Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Risk Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className={`text-2xl font-bold ${
                  riskAnalysis.riskScore < 0.3 ? 'text-green-600' :
                  riskAnalysis.riskScore < 0.6 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {(riskAnalysis.riskScore * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">Risk Score</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold">
                  {riskAnalysis.volatility.classification}
                </div>
                <div className="text-xs text-muted-foreground">Volatility</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold">
                  {Number(riskAnalysis.atr ?? 0).toFixed(5)}
                </div>
                <div className="text-xs text-muted-foreground">ATR</div>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold">
                  {Number(riskAnalysis.volatility.daily ?? 0).toFixed(2)}%
                </div>
                <div className="text-xs text-muted-foreground">Daily Vol</div>
              </div>
            </div>

            {/* Bollinger Bands */}
            {riskAnalysis.bollingerBands && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Bollinger Bands Analysis</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="text-center p-2 bg-red-50 dark:bg-red-950/20 rounded">
                    <div className="text-sm font-medium text-red-600">Upper Band</div>
                    <div className="text-lg font-bold">{Number(riskAnalysis.bollingerBands.upper ?? 0).toFixed(5)}</div>
                  </div>
                  <div className="text-center p-2 bg-blue-50 dark:bg-blue-950/20 rounded">
                    <div className="text-sm font-medium text-blue-600">Middle Band</div>
                    <div className="text-lg font-bold">{Number(riskAnalysis.bollingerBands.middle ?? 0).toFixed(5)}</div>
                  </div>
                  <div className="text-center p-2 bg-green-50 dark:bg-green-950/20 rounded">
                    <div className="text-sm font-medium text-green-600">Lower Band</div>
                    <div className="text-lg font-bold">{Number(riskAnalysis.bollingerBands.lower ?? 0).toFixed(5)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Risk Recommendations */}
            {Array.isArray(riskAnalysis.recommendations) && riskAnalysis.recommendations.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Risk Recommendations</h4>
                <div className="space-y-2">
                  {riskAnalysis.recommendations.map((recommendation, index) => (
                    <div key={index} className="p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded text-sm">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        {String(recommendation)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ML Signal Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            ML Signal Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {signals.length}
              </div>
              <div className="text-xs text-muted-foreground">Active Signals</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold text-green-600">
                {signals.filter(s => s.direction === 'BUY').length}
              </div>
              <div className="text-xs text-muted-foreground">Buy Signals</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold text-red-600">
                {signals.filter(s => s.direction === 'SELL').length}
              </div>
              <div className="text-xs text-muted-foreground">Sell Signals</div>
            </div>
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="text-lg font-bold text-purple-600">
                {signals.filter(s => s.direction === 'SCALE_IN').length}
              </div>
              <div className="text-xs text-muted-foreground">Scale In</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
