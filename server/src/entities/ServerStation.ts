import { Station } from "../../../shared/objects/Station";
import { StationSchema } from "../schemas/StationSchema";
import { TEAM_COLORS } from "../../../shared/constants";
import { PHYSICS } from "../../../shared/constants";

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
      
      // Skip tanks on the same team
      if (tank.team != this.team) {
        // Calculate distance
        const distance = Phaser.Math.Distance.Between(this.x, this.y, tank.x, tank.y);
        
        // If in range, capture the station
        if (distance <= PHYSICS.STATION_CAPTURE_RANGE) {
          this.capture(tank.team);
          break;
        }
      }
    }
  }
  
  // Override capture function for server-side logic
  override capture(newTeam: number): void {
    console.log(`Station ${this.schema.id} captured by team ${newTeam}, from ${this.team}`);
    this.team = newTeam;
    
    // Update the top sprite tint
    if (this.team > 0 && TEAM_COLORS[this.team]) {
      this.topSprite.setTint(TEAM_COLORS[this.team]);
    } else {
      this.topSprite.clearTint();
    }
    
    this.updateSchema();
  }
}