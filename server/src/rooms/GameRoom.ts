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

export class GameRoom extends Room<MyRoomState> {
  state = new MyRoomState();
  fixedTimeStep = 1000 / 60;
  gameScene: ServerGameScene;
  phaserServer: PhaserServer;

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
            reason: "Invalid placement area. Pillboxes require a 2x2 area of land."
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
        
        // Add debugging to check if updates are happening on the server side
        //console.log(`Player ${sessionId} position: ${schema.x.toFixed(2)}, ${schema.y.toFixed(2)}`);
      }
    });
  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "joined!");

    // Create player state
    const playerState = new PlayerState();
    
    // Make sure gameScene is initialized
    if (!this.gameScene) {
      console.error("Game scene not initialized when player joined!");
      return;
    }
    
    // Determine team (alternating assignment)
    const team = this.state.players.size % 2 === 0 ? 1 : 2;
    
    // Get spawn position for team
    const spawnPos = this.gameScene.getSpawnPositionForTeam(team);
    
    // Add player to the game at the spawn position
    const tank = this.gameScene.addPlayer(client.sessionId, spawnPos.x, spawnPos.y);
    
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
    
    console.log(`Player ${client.sessionId} joined at position ${spawnPos.x.toFixed(2)}, ${spawnPos.y.toFixed(2)}, team: ${team}`);
  }

  onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
    
    // Remove player from game world
    this.gameScene.removePlayer(client.sessionId);
    
    // Remove player from state
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
    // Shutdown Phaser server
    this.phaserServer.shutdown();
  }
}