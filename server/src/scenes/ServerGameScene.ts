import { GameScene } from "../../../shared/scenes/Game";
import { ServerTank } from "../entities/ServerTank";
import { InputData } from "../../../shared/objects/Tank";
import { Room } from "colyseus";
import { MyRoomState } from "../rooms/GameRoom";
import { ServerMap } from "../scenes/ServerMap";

export class ServerGameScene extends GameScene {
  // Map of players by session ID
  players: Map<string, ServerTank> = new Map();
  room: Room<MyRoomState>;

  constructor(config: Phaser.Types.Scenes.SettingsConfig) {
    super(config);
    console.log("ServerGameScene constructor");
  }

  preload() {
    this.load.image('tileset', '../../../../assets/tiles/tileset.png');
    this.load.json('mapData', '../../../../assets/maps/Duff Gardens.json');
    this.load.json('tilesetData', '../../../../assets/tiles/tileset.json');
  }

  create() {
    super.create();
    console.log("ServerGameScene created");

    console.log(this.room.state)

            // Create the game map
    this.gameMap = new ServerMap(this);
    this.gameMap.createTilemapFromFile();
    this.room.state.map = this.gameMap.schema;

    if (!this.gameMap.map) {
        console.error("Failed to create tilemap");
        return;
    }        
    console.log(`Tilemap created successfully: ${this.gameMap.map.width}x${this.gameMap.map.height} tiles, ${this.gameMap.map.widthInPixels}x${this.gameMap.map.heightInPixels} pixels`);
    
    // Set world bounds to match the tilemap size
    const mapWidth = this.gameMap.map.widthInPixels;
    const mapHeight = this.gameMap.map.heightInPixels;
    this.matter.world.setBounds(0, 0, mapWidth, mapHeight);
    
    // Additional setup specific to server could go here
  }
  
  // Get a spawn location for a team
  getSpawnPositionForTeam(team: number): { x: number, y: number } {
    // Try to find a station for this team
    const teamStations = this.stations.filter(station => station.team === team);
    
    if (teamStations.length > 0) {
      // Choose a random station from the team's stations
      const station = teamStations[Math.floor(Math.random() * teamStations.length)];
      return { x: station.x, y: station.y };
    }
    
    // Fallback to a random position if no stations for this team
    return { 
      x: Math.random() * this.gameMap.widthInPixels, 
      y: Math.random() * this.gameMap.heightInPixels 
    };
  }

  // Add a player to the server game scene
  addPlayer(sessionId: string, x: number, y: number): ServerTank {
    console.log(`Server adding player ${sessionId} at (${x}, ${y})`);
    const tank = new ServerTank(this, x, y, sessionId);
    this.players.set(sessionId, tank);
    return tank;
  }

  // Remove a player from the server game scene
  removePlayer(sessionId: string): void {
    const tank = this.players.get(sessionId);
    if (tank) {
      console.log(`Server removing player ${sessionId}`);
      tank.destroy();
      this.players.delete(sessionId);
    }
  }

  handlePlayerInput(sessionId: string, input: InputData) {
    const tank = this.players.get(sessionId);
    if (tank) {
      tank.updateInput(input);
    }
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    
    // Update schemas for all players
    this.players.forEach(tank => {
      tank.updateSchema();
    });
  }
}