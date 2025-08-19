import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, BarChart3 } from "lucide-react";

interface TradingChartProps {
  symbol: string;
  strategy: string;
}

export const TradingChart = ({ symbol, strategy }: TradingChartProps) => {
  // Mock chart data visualization
  const generateMockBars = () => {
    const bars = [];
    let price = 1.0892;
    
    for (let i = 0; i < 50; i++) {
      const change = (Math.random() - 0.5) * 0.002;
      price += change;
      const isGreen = change > 0;
      
      bars.push({
        x: i * 8,
        height: Math.abs(change * 10000) + 5,
        color: isGreen ? "#22c55e" : "#ef4444",
        price: price.toFixed(5)
      });
    }
    
    return bars;
  };

  const mockBars = generateMockBars();
  const currentPrice = mockBars[mockBars.length - 1]?.price || "1.0892";
  const isUptrend = Math.random() > 0.5;

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
            <div className="text-right">
              <div className="text-lg font-bold">{currentPrice}</div>
              <div className={`text-sm flex items-center gap-1 ${isUptrend ? 'text-green-600' : 'text-red-600'}`}>
                {isUptrend ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isUptrend ? '+' : '-'}0.{Math.floor(Math.random() * 100)}%
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 h-[400px] relative overflow-hidden">
        {/* Mock Chart Visualization */}
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
            
            {/* Price bars */}
            {mockBars.map((bar, i) => (
              <rect
                key={i}
                x={bar.x}
                y={200 - bar.height}
                width="6"
                height={bar.height}
                fill={bar.color}
                opacity="0.8"
              />
            ))}
            
            {/* Trend line */}
            <polyline
              points={mockBars.map((bar, i) => `${bar.x + 3},${200 - bar.height / 2}`).join(' ')}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              opacity="0.6"
            />
          </svg>
          
          {/* Signal indicators */}
          <div className="absolute top-4 left-4">
            <Badge className="bg-green-500 text-white">
              BUY Signal Active
            </Badge>
          </div>
          
          <div className="absolute bottom-4 right-4 text-xs text-muted-foreground">
            Real-time market simulation • Data refreshes every 1s
          </div>
        </div>
      </CardContent>
    </Card>
  );
};