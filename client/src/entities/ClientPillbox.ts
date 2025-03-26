import { Pillbox } from "../../../shared/objects/Pillbox";
import { PillboxSchema } from "../../../server/src/schemas/PillboxSchema";
import { TEAM_COLORS, VISUALS } from "../../../shared/constants";
import { Tank } from "../../../shared/objects/Tank";

export class ClientPillbox extends Pillbox {
    // Override fireAtTarget to do nothing - server handles all bullets
    override fireAtTarget(target: Tank): void {
        // Only show visual effects if ready to fire
        if (this.firingTimer <= 0) {
            // Reset firing timer
            this.firingTimer = this.firingCooldown;
            
            // Flash effect
            this.setTint(0xFFFFFF);
            this.scene.time.delayedCall(50, () => {
                this.clearTint();
            });
            
            // Calculate angle to target
            const angle = Phaser.Math.Angle.Between(
                this.x, 
                this.y, 
                target.x, 
                target.y
            );
            
            // Position for muzzle flash
            const fireLocation = new Phaser.Math.Vector2(VISUALS.FIRING_OFFSET, 0.0).rotate(angle);
            
            // Add particle effect for muzzle flash
            const particles = this.scene.add.particles(
                this.x + fireLocation.x, 
                this.y + fireLocation.y, 
                'bullet', 
                {
                    speed: 100,
                    scale: { start: 0.5, end: 0 },
                    blendMode: 'ADD',
                    lifespan: 100,
                    quantity: 1
                }
            );
            
            // Destroy particles after a short time
            this.scene.time.delayedCall(100, () => {
                particles.destroy();
            });
        }
    }
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