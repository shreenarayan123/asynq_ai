# WhatsApp Auto-Reply Bot

A WhatsApp Auto-Reply Bot with a web dashboard that automatically responds to incoming messages using rule-based responses and AI.

## Features

- **WhatsApp Integration**: Connect your WhatsApp account via QR code
- **Auto-Reply System**: Respond to messages automatically using rules or AI (OpenAI)
- **Web Dashboard**: Manage response rules, view message history, control bot settings
- **Real-time Updates**: See messages and connection status in real-time

## Tech Stack

- **Backend**: Express.js, MongoDB, Socket.io, WhatsApp Web.js
- **Frontend**: Next.js, TailwindCSS, Radix UI components
- **AI Integration**: OpenAI API

## Screenshots

![Dashboard](/frontend/public/placeholder.jpg)
![Messages](/frontend/public/placeholder.jpg)
![Rules Management](/frontend/public/placeholder.jpg)

## Setup Instructions

### Prerequisites

- Node.js v16+ 
- MongoDB database (local or cloud)
- OpenAI API key (optional, for AI responses)

### Backend Setup

1. Clone the repository:
   ```
   git clone https://github.com/shreenarayan123/asynq_ai.git
   cd asynq_ai/backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure environment variables:
   - Copy `.env.example` to `.env` 
   - Update the MongoDB connection string and other settings

4. Start the server:
   ```
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd ../frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. Connect WhatsApp:
   - Navigate to the "Connection" page
   - Scan the QR code with WhatsApp on your phone
   - Wait for the connection status to show "Connected"

2. Configure Auto-Reply Rules:
   - Go to the "Rules" section
   - Add rules with keywords and responses
   - Set priority and matching methods

3. Enable the Bot:
   - Navigate to "Settings"
   - Toggle the bot enabled switch
   - Optionally add your OpenAI API key for AI responses

## API Endpoints

### Connection
- `GET /api/connection` - Get connection status and QR code
- `POST /api/connection/reconnect` - Request a new QR code

### Messages
- `GET /api/messages` - Get message history with pagination
- `GET /api/messages/filter` - Filter messages by phone, date, etc.
- `POST /api/messages/send` - Send a message to a specific number

### Rules
- `GET /api/rules` - Get all auto-reply rules
- `GET /api/rules/:id` - Get a specific rule
- `POST /api/rules` - Create a new rule
- `PUT /api/rules/:id` - Update a rule
- `DELETE /api/rules/:id` - Delete a rule

### Settings
- `GET /api/settings` - Get all settings
- `PUT /api/settings` - Update multiple settings
- `PUT /api/settings/:key` - Update a specific setting

## License

MIT License

## Acknowledgements

- [WhatsApp Web.js](https://github.com/pedroslopez/whatsapp-web.js)
- [Next.js](https://nextjs.org/)
- [OpenAI API](https://openai.com/api/)
