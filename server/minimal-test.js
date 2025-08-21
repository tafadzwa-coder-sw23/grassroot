const WebSocket = require('ws');

// Configuration
const APP_ID = 80727;
const TOKEN = '9LA9mR3KifMmi2o';
const WS_URL = `wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID}`;

console.log('🔌 Testing WebSocket connection to Deriv API...');

// Create WebSocket connection
const ws = new WebSocket(WS_URL, {
  headers: { 'Origin': 'https://localhost' }
});

// Set up event handlers
ws.on('open', () => {
  console.log('✅ Connected to WebSocket');
  
  // Send authorization request
  const authMsg = JSON.stringify({ authorize: TOKEN });
  console.log('🔑 Sending authorization...');
  ws.send(authMsg);
});

ws.on('message', (data) => {
  const response = JSON.parse(data);
  console.log('📨 Received:', JSON.stringify(response, null, 2));
  
  if (response.msg_type === 'authorize') {
    if (response.error) {
      console.error('❌ Authorization failed:', response.error.message);
      ws.close();
      return;
    }
    console.log('✅ Authorized successfully');
    
    // Request active symbols
    const symbolsMsg = JSON.stringify({
      active_symbols: 'brief',
      product_type: 'basic'
    });
    console.log('📊 Requesting symbols...');
    ws.send(symbolsMsg);
  }
  
  if (response.msg_type === 'active_symbols') {
    console.log(`✅ Got ${response.active_symbols?.length || 0} symbols`);
    if (response.active_symbols?.length > 0) {
      console.log('Sample symbol:', response.active_symbols[0]);
    }
    ws.close();
  }
});

ws.on('error', (error) => {
  console.error('❌ WebSocket error:', error);
});

ws.on('close', () => {
  console.log('🔌 WebSocket connection closed');  
});

// Set timeout for the whole test
setTimeout(() => {
  if (ws.readyState === WebSocket.OPEN) {
    console.log('⏰ Test timeout - closing connection');
    ws.close();
  }
}, 10000); // 10 second timeout
