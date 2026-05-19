const http = require('http');

const PORT = 3000;

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/api/ai-proxy') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      console.log('[AI Mock] Recebida requisição');

      // Simula resposta do Claude
      const mockResponse = {
        id: 'msg_' + Math.random().toString(36).substr(2, 9),
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              customerName: 'Cliente Teste Mock',
              documentType: 'cpf',
              customerDocument: '123.456.789-00',
              customerPhone: '(11) 99999-9999',
              customerEmail: 'teste@sistemateste.com.br',
              region: 'SP',
              equipment: 'Autel',
              equipmentSerial: 'MOCK-' + Math.random().toString(36).substr(2, 8).toUpperCase(),
              sgwLogin: 'teste_mock',
              sgwPassword: 'senha123',
              validUntil: '2027-05-14',
              observations: 'Licença gerada via mock API'
            })
          }
        ],
        model: 'claude-opus-4-5-20251001',
        stop_reason: 'end_turn',
        usage: { input_tokens: 100, output_tokens: 50 }
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(mockResponse));
      console.log('[AI Mock] Resposta enviada');
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`🤖 Mock API Server rodando em http://localhost:${PORT}`);
  console.log(`   Endpoint: POST /api/ai-proxy`);
});