import { Pillbox } from "../../../shared/objects/Pillbox";
import { PillboxSchema } from "../../../server/src/schemas/PillboxSchema";
import { TEAM_COLORS } from "../../../shared/constants";

export class ClientPillbox extends Pillbox {
    constructor(scene: Phaser.Scene, x: number, y: number, team: number = 0) {
        super(scene, x, y, team);
    }
    
    // Update pillbox from server schema
    updateFromServer(pillboxSchema: PillboxSchema) {
        // Update position if needed (though pillboxes generally don't move)
        if (this.x !== pillboxSchema.x || this.y !== pillboxSchema.y) {
            this.x = pillboxSchema.x;
            this.y = pillboxSchema.y;
        }
        
        // Update team if needed
        if (this.team !== pillboxSchema.team) {
            this.team = pillboxSchema.team;
            
            // Update appearance based on team
            if (this.team > 0 && TEAM_COLORS[this.team]) {
                this.topSprite.setTint(TEAM_COLORS[this.team]);
            } else {
                this.topSprite.clearTint();
            }
        }
        
        // Update health if needed
        if (this.health !== pillboxSchema.health) {
            this.health = pillboxSchema.health;
            
            // Update frame based on health
            const frame = Math.max(0, 6 - Math.ceil(this.health));
            this.setFrame(frame);
            this.topSprite.setFrame(frame);
            
            // If health is zero, destroy the pillbox
            if (this.health <= 0) {
                this.destroy();
            }
        }
    }
}