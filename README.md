# Tank War 2000

A real-time multiplayer 2D tank combat game built with Phaser and Colyseus. Players team up to fight for control of the map by capturing stations, building defenses, and working together to defeat the enemy team.

## Game Features

### Core Gameplay
- **Team-based Combat**: Fight in teams to capture and control stations across the map
- **Strategic Building**: Use wood resources to construct walls and roads
- **Automated Defense**: Deploy pillboxes that automatically target enemies
- **Resource Management**: Collect ammunition at friendly stations and wood from forest tiles
- **Tactical Movement**: Navigate different terrain types that affect tank speed and visibility

### Game Mechanics
- **Tank Controls**: WASD/Arrow keys for movement with realistic tank physics
- **Combat System**: Hold spacebar to fire with limited ammunition and friendly fire
- **Station Capture**: Control stations by staying within them for a period of time
- **Terrain Effects**: Grass, water, forest, swamp, road, and wall tiles with unique properties
- **Stealth**: Forest tiles provide concealment from enemies
- **Victory Condition**: Capture all stations to win the match

## How to Run

### Prerequisites
- [Node.js LTS](https://nodejs.org/en/download/)

### Server Setup
1. Navigate to the server directory:
   ```bash
   cd server
   npm install
   npm start
   ```
   The server will be available at `ws://localhost:2567`

### Client Setup
2. In a new terminal, navigate to the client directory:
   ```bash
   cd client
   npm install
   npm start
   ```
   The game will be accessible at `http://localhost:1234`

### Connecting to Remote Servers
You can connect to a different server using the `server` URL parameter:
```
http://localhost:1234?server=gameserver.example.com:2567
```

## Architecture

- **Server**: Authoritative game server using Colyseus for state management
- **Client**: Web-based client with HTML5 canvas rendering
- **Shared**: Common game logic and entity definitions
- **Real-time Sync**: Server state synchronized to clients via WebSocket
- **Client Prediction**: Smooth gameplay with rollback for responsive controls

## Controls

- **Movement**: WASD or Arrow keys
- **Rotation**: A/D keys
- **Shoot**: Hold Spacebar
- **Building**: Click tiles and use UI buttons
- **Resource Collection**: Select forest tiles and use collection button

## License

MIT License - See source code for details.