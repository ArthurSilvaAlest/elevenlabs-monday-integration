/**
 * ElevenLabs Service
 * Handles AI call integration with dynamic variable passing
 */

const axios = require('axios');

class ElevenLabsService {
  
  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY;
    this.agentId = process.env.ELEVENLABS_AGENT_ID;
    this.baseURL = 'https://api.elevenlabs.io/v1';
    
    if (!this.apiKey) {
      console.warn('⚠️ ELEVENLABS_API_KEY not configured in .env');
    }
    
    if (!this.agentId) {
      console.warn('⚠️ ELEVENLABS_AGENT_ID not configured in .env');
    }
  }
  
  /**
   * Initiate a call via ElevenLabs
   * @param {Object} leadData - Lead data
   * @returns {Promise<Object>} - Call result
   */
  async initiateCall(leadData) {
    try {
      console.log('📞 Initiating ElevenLabs call to:', leadData.phone);
      
      // Check if credentials are configured
      if (!this.apiKey || !this.agentId) {
        throw new Error('ElevenLabs credentials not configured');
      }
      
      // Prepare call data
      const callData = this.prepareCallData(leadData);
      
      // Make API request to ElevenLabs
      const response = await this.makeAPICall(callData);
      
      console.log('✅ Call initiated successfully:', response.data);
      
      return {
        success: true,
        call_id: response.data.call_id || response.data.id,
        status: response.data.status || 'initiated',
        leadId: leadData.id,
        phone: leadData.phone,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('❌ Error initiating ElevenLabs call:', error.message);
      
      // If configuration error, simulate call for development
      if (error.message.includes('not configured')) {
        return this.simulateCall(leadData);
      }
      
      throw error;
    }
  }
  
  /**
   * Prepare data for API call
   * @param {Object} leadData - Lead data
   * @returns {Object} - Formatted data for API
   */
  prepareCallData(leadData) {
    // Extract name and company from lead data
    const customerName = leadData.name || 'Customer';
    const companyName = leadData.mcpData?.columns?.lead_company || 
                       leadData.company || 
                       'your restaurant';
    
    console.log('🏷️ Variables for ElevenLabs:', {
      customer_name: customerName,
      company_name: companyName
    });
    
    // Correct format for /convai/twilio/outbound-call endpoint with variables
    return {
      agent_id: this.agentId,
      agent_phone_number_id: process.env.ELEVENLABS_PHONE_NUMBER_ID || 'default_phone_id',
      to_number: leadData.phone,
      
      // 🆕 CORRECT FORMAT FOR ELEVENLABS DYNAMIC VARIABLES
      dynamic_variables: {
        customer_name: customerName,
        company_name: companyName
      }
    };
  }
  
  /**
   * Generate personalized prompt based on lead data
   * @param {Object} leadData - Lead data
   * @returns {string} - Personalized prompt
   */
  generatePersonalizedPrompt(leadData) {
    const customerName = leadData.name || 'Customer';
    const companyName = leadData.company || 'your business';
    
    return `
You are a professional sales representative from iFood, the leading food delivery platform in Brazil.

IMPORTANT INSTRUCTIONS:
- You are calling ${customerName} from ${companyName}
- Be warm, professional, and respectful
- Speak in Portuguese (Brazilian)
- Your goal is to schedule a demonstration of iFood's restaurant solutions
- Listen actively and adapt to their responses
- If they're not interested, be polite and offer to call back later

CONVERSATION FLOW:
1. Introduce yourself: "Olá, ${customerName}! Meu nome é [your name] e eu sou da iFood."
2. Explain the purpose: "Estou entrando em contato porque vimos que ${companyName} tem potencial para crescer ainda mais com nossas soluções para restaurantes."
3. Ask about their current delivery situation
4. Present iFood benefits based on their needs
5. Offer to schedule a demonstration
6. If interested, collect contact information and preferred time
7. Thank them for their time

TONE: Professional, friendly, and consultative
GOAL: Schedule a demonstration or follow-up meeting
`;
  }
  
  /**
   * Make API call to ElevenLabs
   * @param {Object} callData - Call data
   * @returns {Promise<Object>} - API response
   */
  async makeAPICall(callData) {
    try {
      console.log('🔄 Making API call to ElevenLabs...');
      console.log('📋 Call data:', JSON.stringify(callData, null, 2));
      
      const config = {
        method: 'POST',
        url: `${this.baseURL}/convai/twilio/outbound-call`,
        headers: {
          'xi-api-key': this.apiKey,
          'Content-Type': 'application/json'
        },
        data: callData
      };
      
      const response = await axios(config);
      
      console.log('📞 ElevenLabs API Response:', {
        status: response.status,
        data: response.data
      });
      
      return response;
      
    } catch (error) {
      console.error('❌ ElevenLabs API Error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message
      });
      
      throw new Error(`ElevenLabs API Error: ${error.response?.status} - ${error.response?.data?.detail || error.message}`);
    }
  }
  
  /**
   * Simulate call for development mode
   * @param {Object} leadData - Lead data
   * @returns {Object} - Simulated call result
   */
  simulateCall(leadData) {
    console.log('🎭 SIMULATION MODE: ElevenLabs call simulated');
    console.log('📞 Would call:', leadData.phone);
    console.log('👤 Customer:', leadData.name);
    console.log('🏢 Company:', leadData.company || 'Unknown');
    
    return {
      success: true,
      call_id: `sim_${Date.now()}`,
      status: 'simulated',
      leadId: leadData.id,
      phone: leadData.phone,
      timestamp: new Date().toISOString(),
      simulation: true,
      message: 'Call simulated - ElevenLabs credentials not configured'
    };
  }
  
  /**
   * Validate phone number format
   * @param {string} phone - Phone number
   * @returns {boolean} - Is valid
   */
  validatePhone(phone) {
    if (!phone) return false;
    
    // Remove all non-numeric characters except +
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    
    // Check if it's a valid international format
    return cleanPhone.length >= 10 && cleanPhone.startsWith('+');
  }
  
  /**
   * Format phone number for ElevenLabs
   * @param {string} phone - Phone number
   * @returns {string} - Formatted phone
   */
  formatPhone(phone) {
    if (!phone) return null;
    
    // Remove all non-numeric characters except +
    let cleanPhone = phone.replace(/[^\d+]/g, '');
    
    // Add +55 if it's a Brazilian number without country code
    if (cleanPhone.length === 11 && !cleanPhone.startsWith('+')) {
      cleanPhone = '+55' + cleanPhone;
    } else if (cleanPhone.length === 10 && !cleanPhone.startsWith('+')) {
      cleanPhone = '+55' + cleanPhone;
    }
    
    return cleanPhone;
  }
  
  /**
   * Get call status from ElevenLabs
   * @param {string} callId - Call ID
   * @returns {Promise<Object>} - Call status
   */
  async getCallStatus(callId) {
    try {
      const response = await axios.get(
        `${this.baseURL}/convai/calls/${callId}`,
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data;
      
    } catch (error) {
      console.error('❌ Error getting call status:', error.message);
      throw error;
    }
  }
  
  /**
   * List recent calls from ElevenLabs
   * @param {number} limit - Number of calls to retrieve
   * @returns {Promise<Array>} - List of calls
   */
  async listRecentCalls(limit = 10) {
    try {
      const response = await axios.get(
        `${this.baseURL}/convai/calls?limit=${limit}`,
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      
      return response.data;
      
    } catch (error) {
      console.error('❌ Error listing calls:', error.message);
      throw error;
    }
  }
}

module.exports = new ElevenLabsService();