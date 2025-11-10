# Discord Bot - Card Checker

A Discord bot for card authorization testing with multiple payment gateways.

## Features

- `/au` - Authorization test
- `/cvv` - CVV 0.00$ Authorization (Moneris)
- `/pp` - PayPal 0.01$ Authorization

## Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Discord Bot Token
- Discord Application Client ID and Guild ID

### Installation

1. Clone the repository:
```bash
git clone https://github.com/ahaseeb728/exo-chks.git
cd exo-chks
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Fill in your environment variables in `.env`:
```
BOT_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_client_id
GUILD_ID=your_discord_guild_id
```

5. Build the project:
```bash
npm run build
```

6. Deploy commands to Discord:
```bash
node deploy-commands.js
```

7. Start the bot:
```bash
npm start
```

## Development

Run in development mode (with auto-reload):
```bash
npm run dev
```

## Project Structure

```
├── src/              # TypeScript source files
│   ├── commands/     # Bot commands
│   └── index.ts      # Main bot file
├── dist/             # Compiled JavaScript (generated)
├── deploy-commands.js # Command deployment script
└── package.json      # Dependencies and scripts
```

## Deployment on Linux Server

1. Clone the repository on your server
2. Install dependencies: `npm install`
3. Build the project: `npm run build`
4. Set up environment variables in `.env`
5. Deploy commands: `node deploy-commands.js`
6. Run the bot: `npm start`

### Using PM2 (Process Manager)

```bash
npm install -g pm2
pm2 start dist/index.js --name discord-bot
pm2 save
pm2 startup
```

## License

Private project

