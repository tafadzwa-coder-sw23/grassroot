import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, TrendingDown, Target, Shield, Bell, Clock } from "lucide-react";

interface SignalPanelProps {
  symbol: string;
  strategy: string;
}

export const SignalPanel = ({ symbol, strategy }: SignalPanelProps) => {
  const mockSignal = {
    type: "BUY",
    confidence: 87,
    entryPrice: "1.08920",
    stopLoss: "1.08650",
    takeProfit: "1.09450",
    timestamp: new Date().toLocaleTimeString(),
    reasoning: "Strong upward momentum detected on higher timeframe with pullback completion"
  };

  const recentSignals = [
    { time: "14:23", type: "BUY", symbol: "EURUSD", profit: "+0.45%" },
    { time: "13:45", type: "SELL", symbol: "GBPUSD", profit: "-0.12%" },
    { time: "13:12", type: "BUY", symbol: "USDJPY", profit: "+0.78%" },
    { time: "12:55", type: "SELL", symbol: "AUDUSD", profit: "+0.23%" },
  ];

  return (
    <div className="space-y-6">
      {/* Active Signal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Active Signal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className={`${mockSignal.type === 'BUY' ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                {mockSignal.type === 'BUY' ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                {mockSignal.type}
              </Badge>
              <span className="font-medium">{symbol}</span>
            </div>
            <Badge variant="outline" className="text-blue-600 border-blue-600">
              {mockSignal.confidence}% Confidence
            </Badge>
          </div>

          <Alert>
            <AlertDescription className="text-sm">
              {mockSignal.reasoning}
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium">Entry Price</span>
              </div>
              <span className="font-mono font-bold">{mockSignal.entryPrice}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium">Stop Loss</span>
              </div>
              <span className="font-mono font-bold text-red-600">{mockSignal.stopLoss}</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">Take Profit</span>
              </div>
              <span className="font-mono font-bold text-green-600">{mockSignal.takeProfit}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            Signal generated at {mockSignal.timestamp}
          </div>

          <Button className="w-full" variant="outline">
            Mark as Executed
          </Button>
        </CardContent>
      </Card>

      {/* Signal History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Signals</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentSignals.map((signal, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={`${signal.type === 'BUY' ? 'text-green-600 border-green-600' : 'text-red-600 border-red-600'} text-xs`}
                  >
                    {signal.type}
                  </Badge>
                  <span className="text-sm">{signal.symbol}</span>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${signal.profit.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
                    {signal.profit}
                  </div>
                  <div className="text-xs text-muted-foreground">{signal.time}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};