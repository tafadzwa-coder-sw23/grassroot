import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Clock, Target } from "lucide-react";

const tradingStyles = [
  {
    id: "scalping",
    name: "Scalping",
    description: "Quick trades, 1-15 minute positions",
    icon: Zap,
    color: "from-red-400 to-red-600",
    bgColor: "bg-red-50",
    textColor: "text-red-700",
    borderColor: "border-red-200",
    timeframe: "15m → 1m entry"
  },
  {
    id: "day_trading", 
    name: "Day Trading",
    description: "Intraday positions, hours to hold",
    icon: Clock,
    color: "from-blue-400 to-blue-600",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700", 
    borderColor: "border-blue-200",
    timeframe: "1h → 5m entry"
  },
  {
    id: "swing_trading",
    name: "Swing Trading", 
    description: "Multi-day position holds",
    icon: Target,
    color: "from-green-400 to-green-600",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
    borderColor: "border-green-200", 
    timeframe: "4h → 1h entry"
  }
];

interface TradingStyleSelectorProps {
  selectedStyle: string;
  onStyleSelect: (styleId: string) => void;
}

export default function TradingStyleSelector({ selectedStyle, onStyleSelect }: TradingStyleSelectorProps) {
  return (
    <Card className="glass-effect shadow-xl border-0">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl font-bold text-slate-800">
          <Target className="w-6 h-6 text-blue-500" />
          Trading Style
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {tradingStyles.map((style) => {
            const IconComponent = style.icon;
            const isSelected = selectedStyle === style.id;
            
            return (
              <Button
                key={style.id}
                variant="ghost"
                className={`w-full h-auto p-6 justify-start transition-all duration-300 ${
                  isSelected
                    ? `${style.bgColor} border-2 ${style.borderColor} shadow-lg scale-[1.02]`
                    : 'bg-white border border-slate-200 hover:border-slate-300 hover:shadow-md'
                }`}
                onClick={() => onStyleSelect(style.id)}
              >
                <div className="flex items-center gap-4 w-full">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${style.color} flex items-center justify-center shadow-lg`}>
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <div className={`font-bold text-lg ${isSelected ? style.textColor : 'text-slate-800'}`}>
                      {style.name}
                    </div>
                    <div className="text-sm text-slate-500 mb-2">{style.description}</div>
                    <Badge 
                      variant="outline" 
                      className={`text-xs font-medium ${
                        isSelected ? `${style.textColor} ${style.borderColor}` : 'text-slate-600 border-slate-300'
                      }`}
                    >
                      {style.timeframe}
                    </Badge>
                  </div>
                  {isSelected && (
                    <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${style.color} flex items-center justify-center`}>
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
