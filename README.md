# ElevenLabs Monday Integration

🤖 **Automated Outbound Calling System** - Integration between Monday.com CRM and ElevenLabs conversational AI for intelligent, personalized outbound calls with dynamic variable passing.

[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-blue.svg)](https://expressjs.com/)
[![Monday.com](https://img.shields.io/badge/Monday.com-API-orange.svg)](https://monday.com/)
[![ElevenLabs](https://img.shields.io/badge/ElevenLabs-AI-purple.svg)](https://elevenlabs.io/)

## 🚀 How It Works

1. **Monday.com** creates new lead (item)
2. **Webhook** is sent to this server
3. **Server** processes lead data and extracts variables
4. **ElevenLabs** initiates automated call with personalized variables

## 📋 Prerequisites

- Node.js 16+
- ElevenLabs account with configured agent
- Twilio account (for calls)
- Monday.com board configured
- LocalTunnel or ngrok for webhook exposure

## ⚙️ Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Configure environment variables in `.env`:**
```env
# Monday.com Configuration
MONDAY_WEBHOOK_SECRET=your_monday_webhook_secret_here
MONDAY_API_KEY=your_monday_api_key_here

# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_AGENT_ID=your_elevenlabs_agent_id_here
ELEVENLABS_PHONE_NUMBER_ID=your_elevenlabs_phone_number_id_here

# Twilio Configuration (used by ElevenLabs)
TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
TWILIO_PHONE_NUMBER=your_twilio_phone_number_here

# Server Configuration
PORT=3000
```

3. **Start server:**
```bash
npm start
# or for development:
npm run dev
```

4. **Expose webhook with LocalTunnel:**
```bash
npx localtunnel --port 3000
```

## 📡 Endpoints

### Monday.com Webhook
```
POST /webhook/monday
```
Receives webhooks from Monday.com when new leads are created or updated.

### ElevenLabs Webhook (Debug)
```
POST /webhook/elevenlabs
```
Receives callbacks from ElevenLabs for debugging dynamic variables.

### Manual Test
```
POST /test/call
Content-Type: application/json

{
  "phone": "+5511999999999",
  "name": "João Silva"
}
```

### Health Check
```
GET /health
```

## 🔧 Monday.com Configuration

1. Go to **Automations** in your board
2. Create automation: "When item is created → Send webhook"
3. Webhook URL: `https://your-tunnel-url.loca.lt/webhook/monday`
4. Ensure your board has columns for:
   - Lead name
   - Phone number
   - Email (optional)
   - Company name

## 🎯 ElevenLabs Configuration

1. Create an agent in ElevenLabs
2. Configure Twilio integration
3. Copy Agent ID to `.env`
4. Configure API Key in `.env`
5. Set up dynamic variables in agent:
   - `customer_name`
   - `company_name`

## 📞 Call Structure

The agent is configured to:
- Introduce itself as an iFood representative
- Identify restaurant needs
- Offer demonstration/meeting
- Be cordial and professional
- Use dynamic variables for personalization

## 🔄 Dynamic Variables

The system automatically extracts and passes:
- **Customer Name**: From Monday.com lead name
- **Company Name**: From Monday.com company field
- **Phone Number**: Target phone for the call

Variables are passed in ElevenLabs `dynamic_variables` format:
```json
{
  "customer_name": "João Silva",
  "company_name": "Restaurante do João"
}
```

## 🧪 Development Mode

If credentials are not configured, the system runs in simulation mode:
- Detailed logs in console
- Calls are simulated (not real)
- Useful for testing complete flow

## 📊 Monitoring

- All webhook events are logged with timestamps
- ElevenLabs responses are tracked
- Dynamic variable receipt is monitored
- Health checks available at `/health`

## 🚨 Troubleshooting

### Common Issues:

1. **Webhook not receiving data**
   - Check LocalTunnel is running
   - Verify Monday.com webhook URL
   - Check server logs

2. **ElevenLabs not making calls**
   - Verify API key and Agent ID
   - Check Twilio credentials
   - Ensure phone number format (+country code)

3. **Dynamic variables not working**
   - Check ElevenLabs agent configuration
   - Verify variable names match exactly
   - Monitor `/webhook/elevenlabs` endpoint

## 📁 Project Structure

```
├── server.js              # Main Express server
├── services/
│   ├── monday.js          # Monday.com API integration
│   └── elevenlabs.js      # ElevenLabs API integration
├── package.json           # Dependencies
├── .env.example          # Environment variables template
└── README.md             # This file
```

## 🔐 Security

- Environment variables for sensitive data
- Helmet.js for security headers
- CORS configured for API access
- Webhook validation for Monday.com

## 📝 License

MIT License - feel free to use and modify as needed.

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Create Pull Request

---

**Built with ❤️ for automated customer engagement**