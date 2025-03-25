# Phaser/Colyseus Tutorial Project Reference

## Build & Run Commands
- Client: `cd client && npm install && npm start` (runs at http://localhost:1234)
- Server: `cd server && npm install && npm start` (runs at ws://localhost:2567)
- Run tests: `cd server && npm test`
- Run single test: `cd server && npx mocha -r tsx test/MyRoom_test.ts --exit --timeout 15000`
- Loadtest: `cd server && npm run loadtest`
- Debug server: `cd server && npm run dev` (with hot reloading)

## Code Style Guidelines
- TypeScript with 2-space indentation
- Import order: External packages → Internal modules
- Class/Interface names: PascalCase
- Variables/Functions: camelCase
- State management: Use Colyseus Schema decorators for networked state
- Prefer explicit types over implicit any
- Physics: Use Phaser.Physics.Matter for game mechanics
- Network model: Client-predicted movement with server reconciliation
- Error handling: Use try/catch for connection-related operations
- Fixed timestep (1000/60 ms) for consistent physics on client and server

## Project Architecture
- Client: Phaser game engine with TypeScript
- Server: Colyseus multiplayer framework with headless Phaser
- Communication: WebSocket protocol with state synchronization
- Player entities: ServerTank and ClientTank extend base Tank class
- Schema design: Use nested schemas for complex state (TankSchema)
- Game rooms: Manage player connections and state distribution