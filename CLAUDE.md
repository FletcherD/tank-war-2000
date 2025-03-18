# Phaser/Colyseus Tutorial Project Reference

## Build & Run Commands
- Client: `cd client && npm install && npm start` (runs at http://localhost:1234)
- Server: `cd server && npm install && npm start` (runs at ws://localhost:2567)
- Run tests: `cd server && npm test`
- Run single test: `cd server && npx mocha -r tsx test/MyRoom_test.ts --exit --timeout 15000`
- Loadtest: `cd server && npm run loadtest`

## Code Style Guidelines
- TypeScript with 2-space indentation
- Import order: External packages → Internal modules
- Class/Interface names: PascalCase
- Variables/Functions: camelCase
- State management: Use Colyseus Schema decorators for networked state
- Prefer explicit types over implicit any
- Physics: Use Phaser.Physics.Arcade for game mechanics
- Network model: Client-predicted movement with server reconciliation
- Error handling: Use try/catch for connection-related operations
- Fixed timestep (60 FPS) for consistent physics on client and server

## Project Architecture
- Client: Phaser game engine with TypeScript
- Server: Colyseus multiplayer framework
- Communication: WebSocket protocol with state synchronization