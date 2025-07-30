require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser');

const mondayService = require('./services/monday');
const elevenlabsService = require('./services/elevenlabs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Monday-ElevenLabs Bridge'
  });
});

// Webhook endpoint para Monday.com
// Suporte para HEAD request (validação do Monday.com)
app.head('/webhook/monday', (req, res) => {
  res.status(200).end();
});

app.post('/webhook/monday', async (req, res) => {
  // Verifica se é um challenge do Monday.com
  if (req.body.challenge) {
    console.log('🔐 Challenge recebido do Monday.com:', req.body.challenge);
    return res.json({ challenge: req.body.challenge });
  }
  try {
    console.log('📨 Webhook recebido do Monday.com:', JSON.stringify(req.body, null, 2));
    
    // Processa dados do Monday
    const leadData = await mondayService.processWebhook(req.body);
    
    if (!leadData) {
      return res.status(400).json({ error: 'Dados inválidos do webhook' });
    }
    
    console.log('📋 Dados do lead processados:', leadData);
    
    // Valida se tem telefone
    if (!leadData.phone) {
      console.log('⚠️ Lead sem telefone, ignorando...');
      return res.status(200).json({ message: 'Lead sem telefone, ignorado' });
    }
    
    // Inicia chamada via ElevenLabs
    console.log('📞 Iniciando chamada via ElevenLabs...');
    const callResult = await elevenlabsService.initiateCall(leadData);
    
    console.log('✅ Chamada iniciada com sucesso:', callResult);
    
    res.json({
      success: true,
      message: 'Chamada iniciada com sucesso',
      leadId: leadData.id,
      callId: callResult.call_id
    });
    
  } catch (error) {
    console.error('❌ Erro ao processar webhook:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// Webhook endpoint para ElevenLabs (debug de variáveis)
app.post('/webhook/elevenlabs', async (req, res) => {
  try {
    console.log('🔔 Webhook recebido do ElevenLabs:', JSON.stringify(req.body, null, 2));
    
    // Extrai dados do webhook do ElevenLabs
    const {
      conversation_id,
      dynamic_variables,
      status,
      event_type,
      call_id,
      agent_id
    } = req.body;
    
    console.log('📊 Dados extraídos do ElevenLabs:');
    console.log('  🆔 Conversation ID:', conversation_id);
    console.log('  📞 Call ID:', call_id);
    console.log('  🤖 Agent ID:', agent_id);
    console.log('  📋 Status:', status);
    console.log('  🎯 Event Type:', event_type);
    
    // FOCO: Verificar se as variáveis chegaram corretamente
    if (dynamic_variables) {
      console.log('✅ VARIÁVEIS DINÂMICAS RECEBIDAS:');
      console.log('  👤 Customer Name:', dynamic_variables.customer_name);
      console.log('  🏢 Company Name:', dynamic_variables.company_name);
      
      // Verifica se as variáveis estão corretas
      if (dynamic_variables.customer_name && dynamic_variables.company_name) {
        console.log('🎉 SUCESSO: ElevenLabs recebeu as variáveis corretamente!');
      } else {
        console.log('⚠️ PROBLEMA: Variáveis estão vazias ou undefined');
      }
    } else {
      console.log('❌ PROBLEMA: Nenhuma variável dinâmica foi recebida!');
    }
    
    // Log completo para análise
    console.log('📋 Webhook completo do ElevenLabs:', {
      timestamp: new Date().toISOString(),
      conversation_id,
      dynamic_variables,
      status,
      event_type
    });
    
    // Responde ao ElevenLabs
    res.json({
      success: true,
      message: 'Webhook processado com sucesso',
      received_variables: dynamic_variables || null,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Erro ao processar webhook do ElevenLabs:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
});

// Endpoint para testar chamada manual
app.post('/test/call', async (req, res) => {
  try {
    const { phone, name } = req.body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Telefone é obrigatório' });
    }
    
    const testLead = {
      id: 'test-' + Date.now(),
      name: name || 'Teste',
      phone: phone,
      source: 'manual-test'
    };
    
    console.log('🧪 Testando chamada manual:', testLead);
    
    const callResult = await elevenlabsService.initiateCall(testLead);
    
    res.json({
      success: true,
      message: 'Chamada de teste iniciada',
      callResult
    });
    
  } catch (error) {
    console.error('❌ Erro no teste de chamada:', error);
    res.status(500).json({
      error: 'Erro ao testar chamada',
      message: error.message
    });
  }
});

// Endpoint para logs (útil para debug)
app.get('/logs', (req, res) => {
  res.json({
    message: 'Logs disponíveis no console do servidor',
    timestamp: new Date().toISOString()
  });
});

// Inicializa servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📡 Webhook URL: http://localhost:${PORT}/webhook/monday`);
  console.log(`🧪 Teste manual: http://localhost:${PORT}/test/call`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Erro não capturado:', error);
});