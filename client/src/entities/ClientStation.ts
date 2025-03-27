import { Station } from "../../../shared/objects/Station";
import { StationSchema } from "../../../server/src/schemas/StationSchema";
import { TEAM_COLORS } from "../../../shared/constants";

export class ClientStation extends Station {
  constructor(scene: Phaser.Scene, x: number, y: number, team: number = 0) {
    super(scene, x, y, team);
  }
  
  // Update station from server schema
  updateFromServer(stationSchema: StationSchema) {
    console.log("Updating station:", stationSchema);
    // Update position if needed (though stations generally don't move)
    if (this.x !== stationSchema.x || this.y !== stationSchema.y) {
      this.x = stationSchema.x;
      this.y = stationSchema.y;
    }
    
    // Update team if needed
    if (this.team !== stationSchema.team) {
      this.team = stationSchema.team;
      console.log(`Station team updated to ${this.team}`);
      
      // Update appearance based on team
      if (this.team > 0 && TEAM_COLORS[this.team]) {
        this.topSprite.setTint(TEAM_COLORS[this.team]);
      } else {
        this.topSprite.clearTint();
      }
    }
  }
  
  // The client version doesn't actually perform the capture
  override capture(newTeam: number): void {
    // Client doesn't handle the actual capture logic, just visual updates
    // The actual capture happens on the server
  }
}