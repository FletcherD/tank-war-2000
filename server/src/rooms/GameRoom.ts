import { Room, Client } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";
import { InputData } from "../../../shared/objects/Tank";
import { TankSchema } from "../schemas/TankSchema";
import { ServerGameScene } from "../scenes/ServerGameScene";
import { PhaserServer } from "../phaser/PhaserServer";
import { WorldMapSchema } from "../schemas/WorldMapSchema";
import { StationSchema } from "../schemas/StationSchema";
import { PillboxSchema } from "../schemas/PillboxSchema";
import { BulletSchema } from "../schemas/BulletSchema";
import { TILE_INDICES, PHYSICS } from "../../../shared/constants";

import { SnapshotInterpolation } from '@geckos.io/snapshot-interpolation'

export class PlayerState extends Schema {
  @type(TankSchema) tank: TankSchema = new TankSchema();
}

export class MyRoomState extends Schema {
  @type("string") mapName: string = "Test Map";
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type(WorldMapSchema) map: WorldMapSchema = new WorldMapSchema();
  @type({ map: StationSchema }) stations = new MapSchema<StationSchema>();
  @type({ map: PillboxSchema }) pillboxes = new MapSchema<PillboxSchema>();
  @type({ map: BulletSchema }) bullets = new MapSchema<BulletSchema>();
}

// Define the newswire message interface
export interface NewswireMessage {
  type: 'player_join' | 'player_leave' | 'player_destroyed' | 'station_capture' | 'pillbox_placed' | 'pillbox_destroyed' | 'wood_harvested' | 'chat' | 'game_win' | 'info';
  playerId?: string;
  playerName?: string;
  team?: number;
  position?: { x: number, y: number };
  message: string;
  isTeamChat?: boolean;
}

export class GameRoom extends Room<MyRoomState> {
  state = new MyRoomState();
  fixedTimeStep = 1000 / 60;
  gameScene: ServerGameScene;
  phaserServer: PhaserServer;
  SI: SnapshotInterpolation = new SnapshotInterpolation();

  onCreate(options: any) {
    console.log("GameRoom created");
    // Initialize game state
    if (options.mapName) {
      this.state.mapName = options.mapName;
    }

    // Initialize Phaser server and create the game scene
    this.phaserServer = new PhaserServer();
    this.gameScene = this.phaserServer.createScene(ServerGameScene, this);

    this.gameScene.room = this;

    // Handle player input
    this.onMessage("input", (client, input: InputData) => {
      //console.log(`Received input from ${client.sessionId}:`, input);
      this.gameScene.handlePlayerInput(client.sessionId, input);
    });
    
    // Handle chat messages
    this.onMessage("chatMessage", (client, data: { message: string, isAllChat: boolean }) => {
      const playerState = this.state.players.get(client.sessionId);
      if (!playerState) return;
      
      // Get player team and name
      const team = playerState.tank.team;
      const playerName = playerState.tank.name || "Player";
      const isTeamChat = !data.isAllChat;
      
      // Sanitize message (remove HTML tags)
      const sanitizedMessage = data.message.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      
      if (isTeamChat) {
        // Send only to players on the same team
        this.state.players.forEach((state, sessionId) => {
          if (state.tank.team === team) {
            const thisClient = this.clients.getById(sessionId);
            if (!thisClient) return;
            this.send(thisClient, "newswire", {
              type: 'chat',
              playerId: client.sessionId,
              playerName: playerName,
              team: team,
              message: sanitizedMessage,
              isTeamChat: true
            });
          }
        });
      } else {
        // Send to all players
        this.broadcast("newswire", {
          type: 'chat',
          playerId: client.sessionId,
          playerName: playerName,
          team: team,
          message: sanitizedMessage,
          isTeamChat: false
        });
      }
    });
    
    // Handle tile building requests
    this.onMessage("buildTile", (client, data: { tiles: { x: number, y: number }[], tileType: string }) => {
      const tank = this.gameScene.players.get(client.sessionId);
      if (!tank) return;
      console.log(`Received tile build request from ${client.sessionId}:`, data);
      
      // Validate tiles for building (ensure they are valid terrain types)
      const validTiles = [];
      let isHarvesting = false;
      let woodCost = 0;
      
      for (const tile of data.tiles) {
        // Get the current tile and check if it can be built on
        const currentTile = this.gameScene.gameMap.getTileAt(tile.x, tile.y);
        if (!currentTile) continue;

        const tileWorldPos = this.gameScene.gameMap.groundLayer.tileToWorldXY(tile.x, tile.y);
        const distance = Phaser.Math.Distance.Between(
          tank.x, tank.y, 
          tileWorldPos.x, tileWorldPos.y
        );
        if(distance > PHYSICS.BUILD_MAX_DISTANCE) continue;
        
        const baseTileType = this.gameScene.gameMap.getBaseTileType(currentTile);
        
        // Check if this is a forest tile (for harvesting wood)
        if (data.tileType === "forest") {
          if(baseTileType === TILE_INDICES.FOREST) {
            validTiles.push(tile);
            isHarvesting = true;
          }
        } 
        // For roads and walls, check if tile is valid for building and not water
        else if (baseTileType !== TILE_INDICES.WALL) {
          // Not a wall
          validTiles.push(tile);
          
          // Count wood cost for roads and walls
          if (data.tileType === "road") {
            woodCost += PHYSICS.WOOD_COST_ROAD; 
          } else if (data.tileType === "wall") {
            woodCost += PHYSICS.WOOD_COST_WALL;
          }
        }
      }
      
      // If no valid tiles, send failure response
      if (validTiles.length === 0) {
        this.send(client, "tileBuildStarted", {
          success: false,
          reason: `No valid tiles for ${data.tileType} building.`
        });
        return;
      }
      
      // If building roads or walls, check wood resource
      if (!isHarvesting && woodCost > 0) {
        // Check if player has enough wood
        if (tank.schema.wood < woodCost) {
          this.send(client, "tileBuildStarted", {
            success: false,
            reason: `Not enough wood. Need ${woodCost}, have ${tank.schema.wood}.`
          });
          return;
        }
        
        // Deduct wood for building
        tank.useWood(woodCost);
      }

      console.log(`Starting tile construction for ${client.sessionId} - ${data.tileType}`);
      
      // Add to player's build queue
      tank.buildQueue = validTiles.map(tile => ({
        tile,
        progress: 0,
        buildTime: PHYSICS.BUILD_TIME_PER_TILE, // Use constant from shared constants.ts
        playerId: client.sessionId,
        tileType: data.tileType, // Add the tile type to the build queue
        isHarvesting: isHarvesting // Mark as harvesting if forest tiles
      }));
      
      // Send success response with the valid tiles
      this.send(client, "tileBuildStarted", {
        success: true,
        tiles: validTiles,
        tileType: data.tileType,
        isHarvesting: isHarvesting,
        woodCost: woodCost
      });
    });
    
    // Handle pillbox placement requests
    this.onMessage("placePillbox", (client, data: { x: number, y: number, tileX: number, tileY: number }) => {
      const tank = this.gameScene.players.get(client.sessionId);
      if (tank) {
        // First validate that the 2x2 area is valid for pillbox placement
        const isValid = (this.gameScene.gameMap as any).isPillboxPlacementValid(data.tileX, data.tileY);
        
        if (!isValid) {
          // If the area is not valid, inform the client
          this.send(client, "pillboxPlaced", { 
            success: false, 
            x: data.x, 
            y: data.y,
            reason: "Invalid placement area."
          });
          return;
        }
        
        // Validate position for placing pillbox and attempt to place it
        // Calculate the world position from tile coordinates
        const worldPos = this.gameScene.gameMap.groundLayer.tileToWorldXY(data.tileX, data.tileY);
        const pillboxX = worldPos.x + 16; // Center of 2x2 area
        const pillboxY = worldPos.y + 16;
        
        const success = tank.placePillbox(pillboxX, pillboxY);
        
        // Inform client of success/failure
        this.send(client, "pillboxPlaced", { 
          success, 
          x: data.x, 
          y: data.y,
          reason: success ? "Pillbox placed successfully" : "Failed to place pillbox"
        });
        
        // If successful, send newswire message
        if (success) {
          const teamName = tank.team === 1 ? "Blue" : "Red";
          this.broadcastNewswire({
            type: 'pillbox_placed',
            playerId: client.sessionId,
            team: tank.team,
            position: { x: pillboxX, y: pillboxY },
            message: `${tank.name} from Team ${teamName} placed a pillbox.`
          });
        }
      }
    });

    // Set up fixed timestep simulation
    let elapsedTime = 0;
    this.setSimulationInterval((deltaTime) => {
      elapsedTime += deltaTime;

      while (elapsedTime >= this.fixedTimeStep) {
        elapsedTime -= this.fixedTimeStep;
        this.fixedTick(this.fixedTimeStep);
      }
    });
  }

  fixedTick(timeStep: number) {
    // The physics update is now handled by Phaser in the ServerGameScene
    // We need to sync the state properties individually to trigger change detection
    this.state.players.forEach((playerState, sessionId) => {
      const tank = this.gameScene.players.get(sessionId);
      if (tank) {
        // Instead of replacing the schema, update its properties
        const schema = tank.schema;
        
        // Copy all properties individually to ensure change detection
        if (playerState.tank.x !== schema.x) playerState.tank.x = schema.x;
        if (playerState.tank.y !== schema.y) playerState.tank.y = schema.y;
        if (playerState.tank.heading !== schema.heading) playerState.tank.heading = schema.heading;
        if (playerState.tank.speed !== schema.speed) playerState.tank.speed = schema.speed;
        if (playerState.tank.health !== schema.health) playerState.tank.health = schema.health;
        if (playerState.tank.ammo !== schema.ammo) playerState.tank.ammo = schema.ammo;
        if (playerState.tank.team !== schema.team) playerState.tank.team = schema.team;
        if (playerState.tank.left !== schema.left) playerState.tank.left = schema.left;
        if (playerState.tank.right !== schema.right) playerState.tank.right = schema.right;
        if (playerState.tank.up !== schema.up) playerState.tank.up = schema.up;
        if (playerState.tank.down !== schema.down) playerState.tank.down = schema.down;
        if (playerState.tank.fire !== schema.fire) playerState.tank.fire = schema.fire;
        if (playerState.tank.tick !== schema.tick) playerState.tank.tick = schema.tick;
        if (playerState.tank.pillboxCount !== schema.pillboxCount) playerState.tank.pillboxCount = schema.pillboxCount;
        if (playerState.tank.wood !== schema.wood) playerState.tank.wood = schema.wood;
        
        // Add debugging to check if updates are happening on the server side
        //console.log(`Player ${sessionId} position: ${schema.x.toFixed(2)}, ${schema.y.toFixed(2)}`);
      }
    });
  }

  /**
   * Broadcasts a newswire message to all connected clients
   */
  broadcastNewswire(message: NewswireMessage) {
    console.log(message);
    this.broadcast("newswire", message);
  }

  onAuth(client: Client, options: any, auth: any) {
    console.log("Player authenticated: ", client.sessionId, auth.ip);
    return true;
  }

  onJoin(client: Client, options: any, auth: any) {
    console.log("Player joined: ", client.sessionId, options.playerName);

    // Extract player name from options or use default
    const playerName = options.playerName || "Player";

    // Create player state
    const playerState = new PlayerState();
    
    // Make sure gameScene is initialized
    if (!this.gameScene) {
      console.error("Game scene not initialized when player joined!");
      return;
    }
    
    // Determine team (balance based on team size)
    let team: number;
    
    // Count players on each team
    let team1Count = 0;
    let team2Count = 0;
    
    this.state.players.forEach(player => {
      if (player.tank.team === 1) {
        team1Count++;
      } else if (player.tank.team === 2) {
        team2Count++;
      }
    });
    
    if (team1Count < team2Count) {
      // Team 1 has fewer players, assign to team 1
      team = 1;
    } else if (team2Count < team1Count) {
      // Team 2 has fewer players, assign to team 2
      team = 2;
    } else {
      // Teams are equal, decide randomly
      team = Math.random() < 0.5 ? 1 : 2;
    }
    
    // Get spawn position for team
    const spawnPos = this.gameScene.getSpawnPositionForTeam(team);
    
    // Add player to the game at the spawn position with player name
    const tank = this.gameScene.addPlayer(client.sessionId, spawnPos.x, spawnPos.y, playerName);
    
    // Set team
    tank.team = team;
    
    // Copy initial values from tank schema to player state
    Object.keys(tank.schema).forEach(key => {
      playerState.tank[key] = tank.schema[key];
    });
    
    // Make sure team is set in schema
    playerState.tank.team = team;
    
    // Add player to state AFTER initializing properties to ensure first state sync is complete
    this.state.players.set(client.sessionId, playerState);
    
    
    // Send newswire message for player join
    const teamName = team === 1 ? "Blue" : "Red";
    this.broadcastNewswire({
      type: 'player_join',
      playerId: client.sessionId,
      team: team,
      position: spawnPos,
      message: `${playerName} joined Team ${teamName}.`
    });
  }

  onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
    
    // Get player info before removing
    const player = this.state.players.get(client.sessionId);
    const team = player?.tank.team;
    const playerName = player?.tank.name || "Player";
    const teamName = team === 1 ? "Blue" : team === 2 ? "Red" : "Unknown";
    
    // Remove player from game world
    this.gameScene.removePlayer(client.sessionId);
    
    // Remove player from state
    this.state.players.delete(client.sessionId);
    
    // Send newswire message for player leave
    this.broadcastNewswire({
      type: 'player_leave',
      playerId: client.sessionId,
      team: team,
      message: `${playerName} from Team ${teamName} left the game.`
    });
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
    // Shutdown Phaser server
    this.phaserServer.shutdown();
  }
}