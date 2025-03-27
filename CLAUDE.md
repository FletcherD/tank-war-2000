# Tank War Game Project Reference

Tank War is a 2D tank game where players team up to fight for control of the map. Players drive their tank and try to destroy the enemy team and capture their stations. Players can collect resources and use them to build structures on the map to help their team and hinder the enemy. Players can build walls to block the enemy and protect their stations, roads to allow faster travel, and pillboxes which automatically target the nearest enemy. Ammunition is limited, and players must stop to resupply at a station. Strategy and teamwork are key to success.

# Game Mechanics

## Map

The map is composed of tiles. The types of tiles are grass, water, forest, swamp, road, and wall. Each tile has an effect on the top speed of the player, and walls are not passable. Forest tiles hide the player from the enemy.

## Player Movement

Players can move their tank by pressing the WASD or Arrow Keys. The tank can rotate by pressing the A or D keys. The tank can also shoot by pressing the spacebar. Controls are tank controls; that is, relative to the player's tank. The tank accelerates and decelerates fairly slowly. 

## Shooting

Players can shoot bullets by holding the spacebar. Players shoot as long as the spacebar is held with a short cooldown. Bullets travel in a straight line and can be stopped by walls. They have a maximum range. There is friendly fire; all bullets can hit any player. Walls are destroyed by bullets.

## Station

Stations are fixed structures that players spawn at, and can use to resupply their ammunition. Stations are either owned by a certain team, or neutral. When the game starts, each team controls one station, with all other stations being neutral. A station is captured when a player enters the station and stays there for a short period of time. The game is won when a team has captured all stations.

## Pillbox

The pillbox is a buildable structure that automatically targets the nearest enemy. It has unlimited ammunition. Like stations, there are a fixed number of them on the map, but unlike stations, they can be picked up and placed by the player. When a pillbox is destroyed, it can be picked up and then placed by a player.

## Resources

There are two types of resources: ammunition and wood. Ammunition is used to shoot projectiles, and is resupplied by standing on a friendly station. Wood is used to build structures, and is gathered from forest tiles. The player selects a nearby tile and clicks a button to collect the resource.

## Building

Players can build roads and walls by selecting a tile on the map with the mouse, and clicking a button to select the structure to build. Players can build in a small radius around them. To build any structure, the player must have enough wood. 

# Development

## Project Architecture
- This is a multiplayer game using a server-client architecture, with the server being authoritative.
- The project is split into shared game code ('shared' directory), client code ('client' directory), and server code ('server' directory).
- The game logic runs on the Phaser game engine.
- Client and Server import game logic from Shared, and extend it.
- The client is a web app, while the server runs using headless Phaser.
- State is synchronized from the server using Colyseus schemas.
- Server and Client have derived classes for most game objects such as ServerTank and ClientTank. This allows the server to implement functions to update the object's schema, and the client to implement functions to update the object state from a received schema. It also allows rendering and animation functions to run on the client only.
- GameScene, in shared, is the Phaser scene implementing the top-level game logic. ServerGameScene extends GameScene to handle server-specific functions like players joining and leaving. ClientGameScene extends GameScene to implement handlers for schema messages from the server.
- Colyseus manages creation and destruction of game rooms on the server based on players joining or leaving. When a game room is created, a ServerGameScene is as well.
- Many game functions happen only on the server, with the client simply updating the game world based on these events. This includes bullets firing, stations being captured, pillboxes being destroyed and built, and other tiles being built.
- Client prediction with rollback is used on the client.
- The game world is initialized on the server, with the world map being read from a JSON file. The client initialized its game world based on the room schema received from the server.

## Documentation
- Documentation for the Phaser game engine can be found in phaser-docs.
- Documentation for the Colyseus multiplayer framework can be found in colyseus-docs.

## Code Style Guidelines
- TypeScript with 2-space indentation
- Import order: External packages → Internal modules
- Class/Interface names: PascalCase
- Variables/Functions: camelCase
- Prefer explicit types over implicit any
- Physics: Use Phaser.Physics.Matter for game mechanics
- Error handling: Use try/catch for connection-related operations
- Fixed timestep (1000/60 ms) for consistent physics on client and server

## Development
- When you add functionality, add print statements throughout to help debug.
