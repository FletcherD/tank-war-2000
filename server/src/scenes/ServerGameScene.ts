import { GameScene } from "../../../shared/scenes/Game";
import { ServerTank } from "../entities/ServerTank";
import { InputData } from "../../../shared/objects/Tank";
import { Room } from "colyseus";
import { MyRoomState, NewswireMessage } from "../rooms/GameRoom";
import { ServerMap } from "../scenes/ServerMap";
import { StationSchema } from "../schemas/StationSchema";
import { PillboxSchema } from "../schemas/PillboxSchema";
import { TEAM_COLORS, PHYSICS } from "../../../shared/constants";
import { ServerPillbox } from "../entities/ServerPillbox";
import { ServerBullet } from "../entities/ServerBullet";
import { ServerStation } from "../entities/ServerStation";

export interface WorldState {
  players: ServerTank[];
  bullets: ServerBullet[];
  pillboxes: ServerPillbox[];
  stations: ServerStation[];
}

export class ServerGameScene extends GameScene {
  // Map of players by session ID
  players: Map<string, ServerTank> = new Map();
  room: Room<MyRoomState>;

  worldState: WorldState = {
    players: [],
    bullets: [],
    pillboxes: [],
    stations: [],
  };
  
  // Track server-managed bullets
  serverBullets: ServerBullet[] = [];

  constructor() {
    super();
    console.log("ServerGameScene constructor");
  }

  preload() {
    this.load.image('tileset', '../../../../assets/tiles/tileset.png');
    this.load.json('mapData', '../../../../assets/maps/Duff Gardens.json');
    this.load.json('tilesetData', '../../../../assets/tiles/tileset.json');
  }

  async create() {
    await Promise.resolve(); // Make it return a Promise
    console.log("ServerGameScene created");

    console.log(this.room.state)

            // Create the game map
    this.gameMap = new ServerMap(this);
    this.gameMap.createTilemapFromFile();
    
    // Set map in room state
    if (this.room && this.room.state) {
      // Cast to access schema property which exists on ServerMap
      const serverMap = this.gameMap as any;
      if (serverMap.schema) {
        this.room.state.map = serverMap.schema;
      }
    }

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
            const station = this.addStation(worldLocation.x, worldLocation.y, "stn_" + i.toString(), 0); // Neutral station initially
            
            // Add schema to room state
            this.room.state.stations.set(station.schema.id, station.schema);
        }
        
        // Assign one random station to each team
        if (this.stations.length >= 2) {
            // Get two random indexes for team stations
            const indices: number[] = [];
            for (let i = 0; i < this.stations.length; i++) {
                indices.push(i);
            }
            // Shuffle the array
            for (let i = indices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [indices[i], indices[j]] = [indices[j], indices[i]];
            }
            
            // Assign team 1 station
            const team1StationIndex = indices[0];
            const station1 = this.stations[team1StationIndex] as ServerStation;
            station1.capture(1); // Use capture method
            
            // Assign team 2 station
            const team2StationIndex = indices[1];
            const station2 = this.stations[team2StationIndex] as ServerStation;
            station2.capture(2); // Use capture method
            
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
  addPlayer(sessionId: string, x: number, y: number, playerName: string = "Player"): ServerTank {
    console.log(`Server adding player ${sessionId} (${playerName}) at (${x}, ${y})`);
    const tank = new ServerTank(this, x, y, sessionId);
    tank.name = playerName;
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
  
  /**
   * Sends a newswire message to all clients
   */
  sendNewswire(message: NewswireMessage) {
    if (this.room) {
      this.room.broadcastNewswire(message);
    }
  }

  // Create a server bullet (from tank or pillbox)
  createBullet(x: number, y: number, angle: number, team: number = 0) {
    const bullet = new ServerBullet(this, x, y, angle, "");
    bullet.team = team;
    this.serverBullets.push(bullet);
    
    // Add to room state
    if (this.room && this.room.state && this.room.state.bullets) {
      this.room.state.bullets.set(bullet.schema.id, bullet.schema);
    }
    
    return bullet;
  }
  
  // Override the base Bullet creation
  createBulletAt(x: number, y: number, angle: number, team: number = 0) {
    return this.createBullet(x, y, angle, team);
  }


  addStation(x: number, y: number, id: string, team: number = 0): any {
    const station = new ServerStation(this, x, y, id, team);
    this.stations.push(station);
    
    // Add to team stations list
    if (!this.teamStations[team]) {
      this.teamStations[team] = [];
    }
    this.teamStations[team].push(station);
    
    return station;
  }
  
  getRandomStationForTeam(team: number): any {
    const teamStations = this.teamStations[team];
    if (!teamStations || teamStations.length === 0) {
      return null;
    }
    
    const randomIndex = Phaser.Math.Between(0, teamStations.length - 1);
    return teamStations[randomIndex];
  }
  
  // Create a new pillbox at the specified location
  createPillbox(x: number, y: number, team: number): ServerPillbox {
    // Generate a unique ID for the pillbox
    const id = `pillbox_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Create the pillbox
    const pillbox = new ServerPillbox(this, x, y, team);
    this.pillboxes.push(pillbox);
    
    // Set its ID and update schema
    pillbox.schema.id = id;
    pillbox.schema.state = "placed";
    pillbox.updateSchema();
    
    // Add to room state
    this.room.state.pillboxes.set(pillbox.schema.id, pillbox.schema);
    
    return pillbox;
  }

  sendSnapshots(): void {
    this.worldState.players = [];
    this.players.forEach(tank => {
      this.worldState.players.push(tank);
    });

    // Check if SI (SnapshotInterpolation) is available
    if (this.room && this.room.SI) {
      const snapshot = this.room.SI.snapshot.create(this.worldState);
      this.room.broadcast("snapshot", snapshot);
    } else {
      console.warn("SnapshotInterpolation (SI) is not initialized");
    }
  }
  
  update(time: number, delta: number): void {
    super.update(time, delta);
    
    // Update schemas for all players
    this.players.forEach(tank => {
      tank.updateSchema();
      
      // Update build queues if present
      if (tank.buildQueue && tank.buildQueue.length > 0) {
        tank.updateBuildQueue(delta);
      }
      
      // Check for collisions with pickup state pillboxes
      this.pillboxes.forEach(p => {
        if (!(p instanceof ServerPillbox)) return;
        
        const pillbox = p as ServerPillbox;
        if (pillbox.schema.state === "pickup") {
          // Calculate distance between tank and pillbox
          const distance = Phaser.Math.Distance.Between(
            tank.x, tank.y, 
            pillbox.x, pillbox.y
          );
          
          // If close enough, collect the pillbox
          if (distance < (tank.width + pillbox.width) / 2) {
            tank.pickupPillbox(pillbox);
          }
        }
      });
    });
    
    // Update schemas for all ServerPillbox instances
    this.pillboxes.forEach(pillbox => {
      if (pillbox instanceof ServerPillbox) {
        pillbox.updateSchema();
      }
    });
    
    // Update schemas for all ServerStation instances
    this.stations.forEach(station => {
      if (station instanceof ServerStation) {
        station.updateSchema();
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

    this.sendSnapshots();
  }
}