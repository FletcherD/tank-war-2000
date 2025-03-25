import { Room, Client } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";
import { InputData } from "../../../shared/objects/Tank";
import { TankSchema } from "../schemas/TankSchema";
import { ServerGameScene } from "../scenes/ServerGameScene";
import { PhaserServer } from "../phaser/PhaserServer";

export class PlayerState extends Schema {
  @type(TankSchema) tank: TankSchema = new TankSchema();
}

export class MyRoomState extends Schema {
  @type("string") mapName: string = "Test Map";
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
}

export class GameRoom extends Room<MyRoomState> {
  state = new MyRoomState();
  fixedTimeStep = 1000 / 60;
  gameScene: ServerGameScene;
  phaserServer: PhaserServer;

  onCreate(options: any) {
    // Initialize game state
    if (options.mapName) {
      this.state.mapName = options.mapName;
    }

    // Initialize Phaser server and create the game scene
    this.phaserServer = new PhaserServer();
    this.gameScene = this.phaserServer.createScene(ServerGameScene, this);

    // Handle player input
    this.onMessage("input", (client, input: InputData) => {
      this.gameScene.handlePlayerInput(client.sessionId, input);
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
    // We just need to sync the state
    this.state.players.forEach((playerState, sessionId) => {
      const tank = this.gameScene.players.get(sessionId);
      if (tank) {
        playerState.tank = tank.schema;
      }
    });
  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "joined!");

    // Create player state
    const playerState = new PlayerState();
    this.state.players.set(client.sessionId, playerState);

    // Spawn player in game world
    const spawnX = Math.random() * 800;
    const spawnY = Math.random() * 600;
    const tank = this.gameScene.addPlayer(client.sessionId, spawnX, spawnY);
    playerState.tank = tank.schema;
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