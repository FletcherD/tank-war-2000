import { GameScene } from "../../../shared/scenes/Game";
import { ServerTank } from "../entities/ServerTank";
import { InputData } from "../../../shared/objects/Tank";
import { Room } from "colyseus";
import { MyRoomState } from "../rooms/GameRoom";
import { ServerMap } from "../scenes/ServerMap";
import { StationSchema } from "../schemas/StationSchema";
import { PillboxSchema } from "../schemas/PillboxSchema";
import { TEAM_COLORS, PHYSICS } from "../../../shared/constants";
import { ServerPillbox } from "../entities/ServerPillbox";
import { ServerBullet } from "../entities/ServerBullet";

export class ServerGameScene extends GameScene {
  // Map of players by session ID
  players: Map<string, ServerTank> = new Map();
  room: Room<MyRoomState>;
  
  // Track server-managed bullets
  serverBullets: ServerBullet[] = [];

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
    
    // Add stations to the map
    const mapData = this.cache.json.get('mapData');
    if (mapData.stations) {
        console.log("Adding stations from map data:", mapData.stations);
        const stationLocations = mapData.stations;
        for (let i = 0; i < stationLocations.length; i++) {
            const location = stationLocations[i];
            const worldLocation = this.gameMap.groundLayer.tileToWorldXY(location[0]*2+1, location[1]*2+1);
            const station = this.addStation(worldLocation.x, worldLocation.y, 0); // Neutral station initially
            
            // Create and add station schema
            const stationSchema = new StationSchema();
            stationSchema.x = station.x;
            stationSchema.y = station.y;
            stationSchema.team = station.team;
            stationSchema.id = `station_${i}`;
            
            // Add to room state
            this.room.state.stations.set(stationSchema.id, stationSchema);
        }
        
        // Assign one random station to each team
        if (this.stations.length >= 2) {
            // Get two random indexes for team stations
            const indices = Phaser.Utils.Array.NumberArray(0, this.stations.length - 1);
            Phaser.Utils.Array.Shuffle(indices);
            
            // Assign team 1 station
            const team1StationIndex = indices[0];
            this.stations[team1StationIndex].team = 1;
            this.stations[team1StationIndex].topSprite.setTint(TEAM_COLORS[1]);
            
            // Update schema
            const team1StationId = `station_${team1StationIndex}`;
            if (this.room.state.stations.has(team1StationId)) {
                this.room.state.stations.get(team1StationId).team = 1;
            }
            
            // Assign team 2 station
            const team2StationIndex = indices[1];
            this.stations[team2StationIndex].team = 2;
            this.stations[team2StationIndex].topSprite.setTint(TEAM_COLORS[2]);
            
            // Update schema
            const team2StationId = `station_${team2StationIndex}`;
            if (this.room.state.stations.has(team2StationId)) {
                this.room.state.stations.get(team2StationId).team = 2;
            }
            
            console.log(`Assigned team stations: Team 1 at index ${team1StationIndex}, Team 2 at index ${team2StationIndex}`);
        }
    }
    
    // Add pillboxes to the map
    if (mapData.pillboxes) {
        console.log("Adding pillboxes from map data:", mapData.pillboxes);
        const pillboxLocations = mapData.pillboxes;
        
        this.addPillbox = (x, y, team) => {
            const pillbox = new ServerPillbox(this, x, y, team);
            this.pillboxes.push(pillbox);
            return pillbox;
        };
        
        for (let i = 0; i < pillboxLocations.length; i++) {
            const location = pillboxLocations[i];
            const worldLocation = this.gameMap.groundLayer.tileToWorldXY(location[0]*2+1, location[1]*2+1);
            const pillbox = this.addPillbox(worldLocation.x, worldLocation.y, 0) as ServerPillbox; // Neutral pillbox initially
            
            // Set ID in schema
            pillbox.schema.id = `pillbox_${i}`;
            
            // Add schema to room state
            this.room.state.pillboxes.set(pillbox.schema.id, pillbox.schema);
        }
    }
    
    // Additional setup specific to server could go here
  }
  
  // Get a spawn location for a team
  getSpawnPositionForTeam(team: number): { x: number, y: number } {
    // Try to find a station for this team
    const teamStations = this.stations.filter(station => station.team === team);
    
    // Choose a random station from the team's stations
    const station = teamStations[Math.floor(Math.random() * teamStations.length)];
    return { x: station.x, y: station.y };
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

  // Create a server bullet (from tank or pillbox)
  createBullet(x: number, y: number, angle: number, ownerId: string = "") {
    const bullet = new ServerBullet(this, x, y, angle, ownerId);
    this.serverBullets.push(bullet);
    
    // Add to room state
    this.room.state.bullets.set(bullet.schema.id, bullet.schema);
    
    return bullet;
  }
  
  // Override the base Bullet creation
  createBulletAt(x: number, y: number, angle: number, ownerId: string = "") {
    return this.createBullet(x, y, angle, ownerId);
  }
  
  update(time: number, delta: number): void {
    super.update(time, delta);
    
    // Update schemas for all players
    this.players.forEach(tank => {
      tank.updateSchema();
    });
    
    // Update schemas for all ServerPillbox instances
    this.pillboxes.forEach(pillbox => {
      if (pillbox instanceof ServerPillbox) {
        pillbox.updateSchema();
      }
    });
    
    // Update bullets and clean up destroyed ones
    for (let i = this.serverBullets.length - 1; i >= 0; i--) {
      const bullet = this.serverBullets[i];
      
      // Update schema position for active bullets
      if (bullet.active) {
        bullet.updateSchema();
      } else {
        // Remove from server bullets array and room state
        this.serverBullets.splice(i, 1);
        this.room.state.bullets.delete(bullet.schema.id);
      }
    }
  }
}