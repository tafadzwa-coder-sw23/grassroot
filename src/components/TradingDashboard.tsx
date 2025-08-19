import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, BarChart3, Activity } from "lucide-react";
import { SymbolSelector } from "./SymbolSelector";
import { TradingChart } from "./TradingChart";
import { SignalPanel } from "./SignalPanel";
import { StrategySelector } from "./StrategySelector";

export const TradingDashboard = () => {
  const [selectedSymbol, setSelectedSymbol] = useState("EURUSD");
  const [selectedStrategy, setSelectedStrategy] = useState("scalping");

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Grassroot Trading Assistant</h1>
            <p className="text-muted-foreground">Advanced Market Analysis & Signal Generation</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-green-600 border-green-600">
              <Activity className="w-3 h-3 mr-1" />
              Live Market Data
            </Badge>
          </div>
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

        {/* Main Trading Interface */}
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
      </div>
    </div>
  );
};
