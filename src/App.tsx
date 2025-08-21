import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { Trading } from "./pages/Trading";
import { useState, useEffect, useRef } from "react";
import { TradingAPI } from "./services/api";

const queryClient = new QueryClient();

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const tradingAPI = useRef<TradingAPI | null>(null);

  useEffect(() => {
    // Initialize API
    tradingAPI.current = new TradingAPI();
    
    // Connect to WebSocket
    const connect = async () => {
      try {
        await tradingAPI.current?.connectWebSocket();
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
      }
    };
    
    connect();
    
    // Subscribe to connection status changes
    const unsubscribe = tradingAPI.current?.onConnectionChange((connected) => {
      console.log('WebSocket connection status:', connected ? 'Connected' : 'Disconnected');
      setIsConnected(connected);
    });

    // Cleanup on unmount
    return () => {
      unsubscribe?.();
      tradingAPI.current?.disconnect();
      tradingAPI.current = null;
    };
  }, []);

  return (
    <div className="app">
      <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
        {isConnected ? 'Connected' : 'Disconnected'}
      </div>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/trading" element={<Trading />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </div>
  );
}

export default App;
