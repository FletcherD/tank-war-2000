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
import * as fs from 'fs';
import * as path from 'path';

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

  constructor(config: Phaser.Types.Scenes.SettingsConfig) {
    super(config);
    console.log("ServerGameScene constructor");
  }

  // Store the selected map name
  selectedMapName: string = "Duff Gardens";
  
  preload() {
    this.load.image('tileset', '../../../../assets/tiles/tileset.png');
    
    // Select a random map from the assets/maps directory
    const mapsDir = path.resolve(__dirname, '../../assets/maps');
    try {
      // Get all JSON files from the maps directory
      const mapFiles = fs.readdirSync(mapsDir)
        .filter(file => file.endsWith('.json'));
      
      if (mapFiles.length === 0) {
        console.error("No map files found in directory:", mapsDir);
        // Fallback to default map
        this.selectedMapName = "Duff Gardens";
        this.load.json('mapData', '../../../../assets/maps/Duff Gardens.json');
      } else {
        // Select a random map file
        const randomMapFile = mapFiles[Math.floor(Math.random() * mapFiles.length)];
        // Store map name without extension
        this.selectedMapName = path.basename(randomMapFile, '.json');
        console.log(`Loading random map: ${randomMapFile}`);
        this.load.json('mapData', `../../../../assets/maps/${randomMapFile}`);
      }
    } catch (error) {
      console.error("Error loading map files:", error);
      // Fallback to default map
      this.selectedMapName = "Duff Gardens";
      this.load.json('mapData', '../../../../assets/maps/Duff Gardens.json');
    }
    
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
    
    // Broadcast the map name to all players
    setTimeout(() => {
      this.sendNewswire({
        type: 'info',
        message: `Map: ${this.selectedMapName}`,
      });
      console.log(`Game started with map: ${this.selectedMapName}`);
    }, 2000); // Small delay to ensure clients are ready

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
            const indices = Phaser.Utils.Array.NumberArray(0, this.stations.length - 1);
            Phaser.Utils.Array.Shuffle(indices);
            
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
  createBullet(x: number, y: number, angle: number, ownerId: string = "") {
    // Get owner information
    let ownerName = "Unknown";
    let team = 0;
    
    // Check if owner is a tank
    if (ownerId) {
      const tank = this.players.get(ownerId);
      if (tank) {
        ownerName = tank.name;
        team = tank.team;
      } else {
        // Check if owner is a pillbox
        const pillboxes = this.pillboxes.filter(p => p.schema?.id === ownerId);
        if (pillboxes.length > 0) {
          const pillbox = pillboxes[0] as ServerPillbox;
          ownerName = `Pillbox ${pillbox.schema.id.split('_').pop()}`;
          team = pillbox.team;
        }
      }
    }
    
    const bullet = new ServerBullet(this, x, y, angle, ownerId, ownerName, team);
    this.serverBullets.push(bullet);
    
    // Add to room state
    this.room.state.bullets.set(bullet.schema.id, bullet.schema);
    
    return bullet;
  }
  
  // Override the base Bullet creation
  createBulletAt(x: number, y: number, angle: number, ownerId: string = "") {
    return this.createBullet(x, y, angle, ownerId);
  }


  addStation(x: number, y: number, id: string, team: number = 0): ServerStation {
    const station = new ServerStation(this, x, y, id, team);
    this.stations.push(station);
    
    // Add to team stations list
    if (!this.teamStations[team]) {
      this.teamStations[team] = [];
    }
    this.teamStations[team].push(station);
    
    return station;
  }
  
  getRandomStationForTeam(team: number): ServerStation | null {
    const teamStations = this.teamStations[team];
    if (!teamStations || teamStations.length === 0) {
      return null;
    }
    
    const randomIndex = Phaser.Math.Between(0, teamStations.length - 1);
    return teamStations[randomIndex];
  }
  
  // Create a new pillbox at the specified location
  createPillbox(x: number, y: number, team: number, state: string = "pickup"): ServerPillbox {
    // Generate a unique ID for the pillbox
    const id = `pillbox_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    // Create the pillbox
    const pillbox = new ServerPillbox(this, x, y, team, state);
    this.pillboxes.push(pillbox);
    
    // Set its ID and update schema
    pillbox.schema.id = id;
    
    pillbox.updateSchema();
    
    // Add to room state
    this.room.state.pillboxes.set(pillbox.schema.id, pillbox.schema);
    
    return pillbox;
  }

  sendSnapshots(): void {
    this.worldState.players = [];
    this.players.forEach(tank => {
      let thisPlayerState = tank.getState();
      thisPlayerState.id = tank.sessionId;
      this.worldState.players.push(thisPlayerState);
    });

    const snapshot = this.room.SI.snapshot.create(this.worldState);

    this.room.broadcast("snapshot", snapshot);
  }
  
  // Game win state tracking
  private winState = {
    gameOver: false,
    winningTeam: 0,
    restartTimer: null
  };
  
  // Check if all stations are owned by one team
  checkWinCondition(): void {
    // Skip if game is already in win state
    if (this.winState.gameOver) return;
    
    // Skip if there are no stations
    if (this.stations.length === 0) return;
    
    // Get the team of the first station
    const firstStation = this.stations[0];
    const firstTeam = firstStation.team;
    
    // Skip checking neutral stations (team 0)
    if (firstTeam === 0) return;
    
    // Check if all stations belong to the same team
    const allSameTeam = this.stations.every(station => station.team === firstTeam);
    
    if (allSameTeam) {
      // All stations owned by the same team - game win!
      this.winState.gameOver = true;
      this.winState.winningTeam = firstTeam;
      
      // Send game win message
      const teamName = firstTeam === 1 ? "Blue" : "Red";
      this.sendNewswire({
        type: 'game_win',
        team: firstTeam,
        message: `Team ${teamName} has won the game by capturing all stations!`
      });
      
      // Send restart message
      this.sendNewswire({
        type: 'info',
        message: `Server will restart in 15 seconds...`
      });
      
      // Schedule server restart
      this.winState.restartTimer = setTimeout(() => {
        this.restartServer();
      }, 15000);
    }
  }
  
  // Restart the server
  restartServer(): void {
    console.log("Restarting server due to game win condition");
    
    // Send final message
    this.sendNewswire({
      type: 'info',
      message: `Server restarting now...`
    });
    
    // Reset game state and restart
    this.scene.restart();
    
    // Clear room state
    this.room.state.stations.clear();
    this.room.state.pillboxes.clear();
    this.room.state.bullets.clear();
    
    // Reset win state
    this.winState.gameOver = false;
    this.winState.winningTeam = 0;
    if (this.winState.restartTimer) {
      clearTimeout(this.winState.restartTimer);
      this.winState.restartTimer = null;
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
    
    // Check for win condition - all stations owned by one team
    this.checkWinCondition();
    
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