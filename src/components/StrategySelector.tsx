import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Clock, TrendingUp } from "lucide-react";

interface StrategySelectorProps {
  selectedStrategy: string;
  onStrategyChange: (strategy: string) => void;
}

const strategies = [
  {
    id: "scalping",
    name: "Scalping",
    icon: Zap,
    description: "15m → 1m timeframes",
    color: "bg-red-500",
    active: true
  },
  {
    id: "day-trading",
    name: "Day Trading", 
    icon: Clock,
    description: "1h → 5m timeframes",
    color: "bg-blue-500",
    active: true
  },
  {
    id: "swing-trading",
    name: "Swing Trading",
    icon: TrendingUp,
    description: "4h → 1h timeframes", 
    color: "bg-green-500",
    active: true
  }
];

export const StrategySelector = ({ selectedStrategy, onStrategyChange }: StrategySelectorProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trading Strategy</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3">
          {strategies.map((strategy) => {
            const Icon = strategy.icon;
            const isSelected = selectedStrategy === strategy.id;
            
            return (
              <Button
                key={strategy.id}
                variant={isSelected ? "default" : "outline"}
                className="justify-start h-auto p-4"
                onClick={() => onStrategyChange(strategy.id)}
              >
                <div className="flex items-center gap-3 w-full">
                  <div className={`p-2 rounded-lg ${strategy.color} text-white`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium">{strategy.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {strategy.description}
                    </div>
                  </div>
                  {strategy.active && (
                    <Badge variant="outline" className="ml-auto text-green-600 border-green-600">
                      Active
                    </Badge>
                  )}
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};