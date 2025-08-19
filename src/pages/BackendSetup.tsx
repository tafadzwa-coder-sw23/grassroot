import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Shield, Zap, Database, Wifi, CheckCircle, AlertCircle } from "lucide-react";

// Deriv Connection Setup Component
const DerivConnectionSetup = () => {
  const [connectionStatus, setConnectionStatus] = React.useState('disconnected');
  const [apiKey, setApiKey] = React.useState('');
  const [appId, setAppId] = React.useState('');

  return (
    <Card className="glass-effect shadow-xl border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-500" />
          Deriv API Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Deriv API key"
              className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">App ID</label>
            <input
              type="text"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              placeholder="Enter your Deriv App ID"
              className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-slate-600">
              Status: {connectionStatus === 'connected' ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <Button 
            className="w-full"
            onClick={() => setConnectionStatus(connectionStatus === 'connected' ? 'disconnected' : 'connected')}
          >
            {connectionStatus === 'connected' ? 'Disconnect' : 'Connect'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Backend Status Component
const BackendStatus = () => {
  const statusItems = [
    { name: 'Database Connection', status: 'connected', icon: Database },
    { name: 'API Gateway', status: 'connected', icon: Wifi },
    { name: 'Signal Processing', status: 'connected', icon: Zap },
    { name: 'Real-time Data', status: 'connected', icon: Settings },
  ];

  return (
    <Card className="glass-effect shadow-xl border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-500" />
          Backend Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {statusItems.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <item.icon className="w-4 h-4 text-slate-500" />
                <span className="text-sm text-slate-700">{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${item.status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-slate-600">{item.status}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Backend Capabilities Component
const BackendCapabilities = () => {
  const capabilities = [
    { name: 'Real-time Market Data', enabled: true, description: 'Live price feeds from multiple sources' },
    { name: 'Signal Generation', enabled: true, description: 'AI-powered trading signals' },
    { name: 'Risk Management', enabled: true, description: 'Automated stop-loss and take-profit' },
    { name: 'Multi-timeframe Analysis', enabled: true, description: 'Analysis across multiple timeframes' },
    { name: 'Portfolio Tracking', enabled: true, description: 'Real-time portfolio performance' },
    { name: 'API Rate Limiting', enabled: true, description: 'Optimized API usage and rate limiting' },
  ];

  return (
    <Card className="glass-effect shadow-xl border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-blue-500" />
          Backend Capabilities
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {capabilities.map((capability) => (
            <div key={capability.name} className="flex items-start gap-3">
              <div className="mt-1">
                {capability.enabled ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">{capability.name}</p>
                <p className="text-xs text-slate-500">{capability.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default function BackendSetup() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-800 via-blue-600 to-slate-800 bg-clip-text text-transparent">
            Backend Setup
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Configure Deriv API integration and check backend capabilities for real-time market analysis
          </p>
        </motion.div>

        {/* Main Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <DerivConnectionSetup />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <BackendStatus />
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <BackendCapabilities />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
