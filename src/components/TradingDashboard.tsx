import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, BarChart3, Activity, Brain, Zap } from "lucide-react";
import { SymbolSelector } from "./SymbolSelector";
import { TradingChart } from "./TradingChart";
import { SignalPanel } from "./SignalPanel";
import { StrategySelector } from "./StrategySelector";
import { MLAnalysisDashboard } from "./MLAnalysisDashboard";
import { useTradingData } from "@/hooks/useTradingData";

export const TradingDashboard = () => {
  const [selectedSymbol, setSelectedSymbol] = useState("EURUSD");
  const [selectedStrategy, setSelectedStrategy] = useState("scalping");
  const [activeTab, setActiveTab] = useState<"trading" | "analysis">("trading");

  const { connectionStatus, currentPrice, priceChange, analysisEnabled, startAnalysis, stopAnalysis } = useTradingData(selectedSymbol, selectedStrategy);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Grassroot Trading Assistant</h1>
            <p className="text-muted-foreground">ML-Powered Market Analysis & Signal Generation</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant={connectionStatus === 'connected' ? 'default' : 'destructive'}
            >
              <Activity className="w-3 h-3 mr-1" />
              {connectionStatus === 'connected' ? 'Live WebSocket' : 'WebSocket Offline'}
            </Badge>
            {currentPrice && (
              <Badge variant="outline" className="text-blue-600 border-blue-600">
                <TrendingUp className="w-3 h-3 mr-1" />
                {currentPrice.toFixed(5)}
                <span className={`ml-1 ${priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
                </span>
              </Badge>
            )}
          </div>
        </div>

        {/* Controls: Start/Stop Analysis + Tabs */}
        <div className="flex space-x-1 bg-muted p-1 rounded-lg">
          <Button
            variant={analysisEnabled ? "destructive" : "default"}
            size="sm"
            onClick={() => (analysisEnabled ? stopAnalysis() : startAnalysis())}
            className="flex items-center gap-2 mr-2"
          >
            {analysisEnabled ? 'Stop Analysis' : 'Start Analysis'}
          </Button>
          <Button
            variant={activeTab === "trading" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("trading")}
            className="flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Trading Interface
          </Button>
          <Button
            variant={activeTab === "analysis" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("analysis")}
            className="flex items-center gap-2"
          >
            <Brain className="w-4 h-4" />
            ML Analysis
          </Button>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SymbolSelector 
            selectedSymbol={selectedSymbol}
            onSymbolSelect={(symbol) => setSelectedSymbol(symbol)}
          />
          <StrategySelector
            selectedStrategy={selectedStrategy}
            onStrategyChange={setSelectedStrategy}
          />
        </div>

        {/* Main Content */}
        {activeTab === "trading" ? (
          /* Trading Interface */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Area */}
            <div className="lg:col-span-2">
              <TradingChart symbol={selectedSymbol} strategy={selectedStrategy} />
            </div>

            {/* Signal Panel */}
            <div className="lg:col-span-1">
              <SignalPanel symbol={selectedSymbol} strategy={selectedStrategy} />
            </div>
          </div>
        ) : (
          /* ML Analysis Dashboard */
          <MLAnalysisDashboard symbol={selectedSymbol} strategy={selectedStrategy} />
        )}

        {/* Market Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Market Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">+0.87%</div>
                <div className="text-sm text-muted-foreground">EUR/USD</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">-0.23%</div>
                <div className="text-sm text-muted-foreground">GBP/USD</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">+1.45%</div>
                <div className="text-sm text-muted-foreground">USD/JPY</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">-0.56%</div>
                <div className="text-sm text-muted-foreground">AUD/USD</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ML System Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              ML System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold text-blue-600">CHOCH Detection</div>
                <div className="text-sm text-muted-foreground">Smart Money Concepts</div>
                <Badge variant="outline" className="mt-2">Active</Badge>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold text-green-600">Signal Generation</div>
                <div className="text-sm text-muted-foreground">ML-Powered Analysis</div>
                <Badge variant="outline" className="mt-2">Active</Badge>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-lg font-bold text-purple-600">Risk Management</div>
                <div className="text-sm text-muted-foreground">Real-time Assessment</div>
                <Badge variant="outline" className="mt-2">Active</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
