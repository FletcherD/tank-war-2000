import { Station } from "../../../shared/objects/Station";
import { StationSchema } from "../schemas/StationSchema";
import { TEAM_COLORS } from "../../../shared/constants";
import { PHYSICS } from "../../../shared/constants";
import { ServerGameScene } from "../scenes/ServerGameScene";
import { NewswireMessage } from "../rooms/GameRoom";

export class ServerStation extends Station {
  // Schema to be synced with clients
  schema: StationSchema;
  
  constructor(scene: Phaser.Scene, x: number, y: number, id: string, team: number = 0) {
    super(scene, x, y, team);
    
    // Initialize schema
    this.schema = new StationSchema();
    this.schema.id = id;
    this.updateSchema();
  }
  
  // Update the schema with current state
  updateSchema() {
    this.schema.x = this.x;
    this.schema.y = this.y;
    this.schema.team = this.team;
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    
    // Check all tanks in the scene
    for (const sessionId of this.scene.players.keys()) {
      const tank = this.scene.players.get(sessionId);
      
      // Calculate distance
      const distance = Phaser.Math.Distance.Between(this.x, this.y, tank.x, tank.y);
      
      // Handle station capture
      // Skip tanks on the same team for capturing
      if (tank.team != this.team) {
        // If in range, capture the station
        if (distance <= PHYSICS.STATION_CAPTURE_RANGE) {
          this.capture(tank.team);
          break;
        }
      }
      
      // Handle ammunition refill - any tank at a station gets ammo refilled
      if (distance <= PHYSICS.STATION_CAPTURE_RANGE) {
        // Calculate ammo to refill based on time
        const ammoToRefill = PHYSICS.STATION_REFILL_RATE * (delta / 1000);
        
        // Refill ammo if not at max
        if (tank.ammo < PHYSICS.TANK_MAX_AMMO) {
          tank.refillAmmo(ammoToRefill);
          tank.updateSchema();
        }
      }
    }
  }
  
  // Override capture function for server-side logic
  override capture(newTeam: number): void {
    // Only broadcast if team actually changed
    const oldTeam = this.team;
    
    if (oldTeam !== newTeam) {
      console.log(`Station ${this.schema.id} captured by team ${newTeam}, from ${oldTeam}`);
      this.team = newTeam;
      
      // Update the top sprite tint
      if (this.team > 0 && TEAM_COLORS[this.team]) {
        this.topSprite.setTint(TEAM_COLORS[this.team]);
      } else {
        this.topSprite.clearTint();
      }
      
      this.updateSchema();
      
      // Send newswire message for station capture
      const gameScene = this.scene as ServerGameScene;
      if (gameScene.room) {
        const oldTeamName = oldTeam === 0 ? "Neutral" : oldTeam === 1 ? "Blue" : "Red";
        const newTeamName = newTeam === 0 ? "Neutral" : newTeam === 1 ? "Blue" : "Red";
        
        const message: NewswireMessage = {
          type: 'station_capture',
          team: newTeam,
          position: { x: this.x, y: this.y },
          message: `Station captured by Team ${newTeamName} from Team ${oldTeamName}!`
        };
        
        gameScene.room.broadcastNewswire(message);
      }
    }
  }
}