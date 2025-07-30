/**
 * Monday.com Service
 * Handles webhook processing and data extraction from Monday.com CRM
 */

const axios = require('axios');

class MondayService {
  
  constructor() {
    this.mondayApiKey = process.env.MONDAY_API_KEY;
    this.mondayApiUrl = 'https://api.monday.com/v2';
    
    if (!this.mondayApiKey) {
      console.warn('⚠️ MONDAY_API_KEY not configured in .env');
    }
  }
  
  /**
   * Fetch complete item details from Monday.com API
   * @param {number} boardId - Board ID
   * @param {number} itemId - Item ID
   * @returns {Promise<Object>} - Complete item data
   */
  async fetchItemDetails(boardId, itemId) {
    try {
      console.log('🔍 Fetching complete data from Monday.com API...', { boardId, itemId });
      
      const query = `
        query {
          items(ids: [${itemId}]) {
            id
            name
            column_values {
              id
              text
              value
            }
          }
        }
      `;
      
      const response = await axios.post(this.mondayApiUrl, 
        { query },
        {
          headers: {
            'Authorization': this.mondayApiKey,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.data || !response.data.data || !response.data.data.items || response.data.data.items.length === 0) {
        console.log('⚠️ Item not found in Monday.com');
        return null;
      }
      
      const item = response.data.data.items[0];
      console.log('📊 Raw data from Monday.com:', JSON.stringify(item, null, 2));
      
      // Process item data
      const itemData = {
        id: item.id,
        name: item.name,
        phone: null,
        email: null,
        company: null,
        columns: {}
      };
      
      // Process column_values to extract phone, email, and company
      if (item.column_values) {
        item.column_values.forEach(column => {
          itemData.columns[column.id] = column.text || column.value;
          
          // Look for phone in phone columns
          if (this.isPhoneColumn(column.id) && column.text) {
            itemData.phone = this.extractPhone(column.text);
            console.log('📞 Phone found in column', column.id + ':', itemData.phone);
          }
          
          // Look for email in email columns
          if (this.isEmailColumn(column.id) && column.text) {
            itemData.email = column.text;
            console.log('📧 Email found in column', column.id + ':', itemData.email);
          }
          
          // Look for company in company columns
          if (this.isCompanyColumn(column.id) && column.text) {
            itemData.company = column.text;
            console.log('🏢 Company found in column', column.id + ':', itemData.company);
          }
        });
      }
      
      console.log('✅ Data processed from Monday.com:', itemData);
      return itemData;
      
    } catch (error) {
      console.error('❌ Error fetching data from Monday.com:', error);
      return null;
    }
  }
  
  /**
   * Process Monday.com webhook and extract lead data
   * @param {Object} webhookData - Webhook data received
   * @returns {Promise<Object|null>} - Processed lead data or null if invalid
   */
  async processWebhook(webhookData) {
    try {
      console.log('🔍 Processing Monday.com webhook...');
      
      // Extract data from webhook structure
      const { event, pulseName, pulseId, boardId, columnValues } = webhookData;
      
      // Extract event data
      const eventType = event?.type;
      const eventData = event?.data;
      
      // Monday.com can send data in different formats
      const itemId = eventData?.pulse_id || event?.pulseId || pulseId;
      const boardIdFromEvent = eventData?.board_id || event?.boardId || boardId;
      const columnId = eventData?.column_id || event?.columnId;
      const columnValue = eventData?.value || event?.value;
      const itemName = event?.pulseName || pulseName;
      
      console.log('📋 Event data:', {
        type: eventType,
        itemId,
        boardId: boardIdFromEvent,
        columnId,
        value: columnValue
      });
      
      // Check if it's a valid event (creation or status change)
      const isCreateEvent = eventType === 'create_pulse';
      const isChangeEvent = eventType === 'change_column_value' || eventType === 'update_column_value';
      
      if (!isCreateEvent && !isChangeEvent) {
        console.log('⚠️ Event is not creation or column change, ignoring...');
        console.log('📋 Event type:', eventType);
        return null;
      }
      
      console.log('✅ Valid event detected! Processing...');
      
      // Fetch complete data from Monday.com API
      console.log('🔄 Fetching complete item data from Monday.com API...');
      const itemDetails = await this.fetchItemDetails(boardIdFromEvent, itemId);
      
      // Extract basic data from webhook + API data
      const leadData = {
        id: itemId || `lead-${Date.now()}`,
        name: itemName || itemDetails?.name || 'Lead without name',
        boardId: boardIdFromEvent,
        phone: itemDetails?.phone || null,
        email: itemDetails?.email || null,
        company: itemDetails?.company || null,
        source: 'monday.com',
        createdAt: new Date().toISOString(),
        eventType: eventType,
        columnId: columnId,
        columnValue: columnValue,
        mcpData: itemDetails // Complete API data for debugging
      };
      
      // Process Monday.com columns to extract phone and other data
      if (columnValues) {
        Object.keys(columnValues).forEach(columnId => {
          const columnValue = columnValues[columnId];
          
          // Identify phone column (adapt according to your board)
          if (this.isPhoneColumn(columnId) && columnValue) {
            leadData.phone = this.extractPhone(columnValue);
          }
          
          // Identify email column
          if (this.isEmailColumn(columnId) && columnValue) {
            leadData.email = this.extractEmail(columnValue);
          }
          
          // Identify company column
          if (this.isCompanyColumn(columnId) && columnValue) {
            leadData.company = columnValue.text || columnValue.value || columnValue;
          }
        });
      }
      
      // Basic validation
      if (!leadData.phone) {
        console.log('⚠️ Phone not found in webhook data');
      }
      
      console.log('✅ Lead processed successfully:', leadData);
      return leadData;
      
    } catch (error) {
      console.error('❌ Error processing Monday.com webhook:', error);
      return null;
    }
  }
  
  /**
   * Check if a column contains phone data
   * @param {string} columnId - Column ID
   * @returns {boolean}
   */
  isPhoneColumn(columnId) {
    const phoneKeywords = ['phone', 'telefone', 'tel', 'celular', 'mobile'];
    return phoneKeywords.some(keyword => 
      columnId.toLowerCase().includes(keyword)
    );
  }
  
  /**
   * Check if a column contains email data
   * @param {string} columnId - Column ID
   * @returns {boolean}
   */
  isEmailColumn(columnId) {
    const emailKeywords = ['email', 'mail', 'e-mail'];
    return emailKeywords.some(keyword => 
      columnId.toLowerCase().includes(keyword)
    );
  }
  
  /**
   * Check if a column contains company data
   * @param {string} columnId - Column ID
   * @returns {boolean}
   */
  isCompanyColumn(columnId) {
    const companyKeywords = ['company', 'empresa', 'business', 'organization'];
    return companyKeywords.some(keyword => 
      columnId.toLowerCase().includes(keyword)
    );
  }
  
  /**
   * Extract phone number from various formats
   * @param {string|Object} phoneData - Phone data
   * @returns {string|null} - Formatted phone number
   */
  extractPhone(phoneData) {
    try {
      let phone = '';
      
      if (typeof phoneData === 'string') {
        phone = phoneData;
      } else if (phoneData && phoneData.text) {
        phone = phoneData.text;
      } else if (phoneData && phoneData.value) {
        phone = phoneData.value;
      }
      
      // Remove all non-numeric characters except +
      phone = phone.replace(/[^\d+]/g, '');
      
      // Add +55 if it's a Brazilian number without country code
      if (phone.length === 11 && !phone.startsWith('+')) {
        phone = '+55' + phone;
      } else if (phone.length === 10 && !phone.startsWith('+')) {
        phone = '+55' + phone;
      }
      
      // Validate phone format
      if (phone.length >= 10) {
        console.log('📞 Phone extracted and formatted:', phone);
        return phone;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error extracting phone:', error);
      return null;
    }
  }
  
  /**
   * Extract email from various formats
   * @param {string|Object} emailData - Email data
   * @returns {string|null} - Email address
   */
  extractEmail(emailData) {
    try {
      let email = '';
      
      if (typeof emailData === 'string') {
        email = emailData;
      } else if (emailData && emailData.text) {
        email = emailData.text;
      } else if (emailData && emailData.value) {
        email = emailData.value;
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(email)) {
        console.log('📧 Email extracted:', email);
        return email;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error extracting email:', error);
      return null;
    }
  }
}

module.exports = new MondayService();