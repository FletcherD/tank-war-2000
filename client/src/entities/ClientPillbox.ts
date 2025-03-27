import { Pillbox } from "../../../shared/objects/Pillbox";
import { PillboxSchema } from "../../../server/src/schemas/PillboxSchema";
import { VISUALS, PHYSICS, COLLISION_CATEGORIES, TEAM_COLORS } from "../../../shared/constants";
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
    
    // State property to track client-side state
    state: string = "placed";
    
    // ID from the schema for tracking
    schemaId: string = "";
    
    // Update pillbox from server schema
    updateFromServer(pillboxSchema: PillboxSchema) {
        console.log("Updating pillbox:", pillboxSchema);
        
        // Check if the state has changed
        if (this.state !== pillboxSchema.state) {
            this.handleStateChange(this.state, pillboxSchema.state);
            this.state = pillboxSchema.state;
        }
        
        // Update position if needed (pillboxes move when in pickup state)
        if (this.x !== pillboxSchema.x || this.y !== pillboxSchema.y) {
            this.x = pillboxSchema.x;
            this.y = pillboxSchema.y;
            
            // Update top sprite position
            if (this.topSprite && this.topSprite.active) {
                this.topSprite.x = this.x;
                this.topSprite.y = this.y;
            }
        }
        
        // Update team if needed
        if (this.team !== pillboxSchema.team) {
            this.team = pillboxSchema.team;
            
            // Update appearance based on team
            if (this.team > 0 && TEAM_COLORS[this.team] && this.topSprite) {
                this.topSprite.setTint(TEAM_COLORS[this.team]);
            } else if (this.topSprite) {
                this.topSprite.clearTint();
            }
        }
        
        // Update health if needed (only relevant in placed state)
        if (this.state === "placed" && this.health !== pillboxSchema.health) {
            // Store old health for damage comparison
            const oldHealth = this.health;
            this.health = pillboxSchema.health;
            
            // Call takeDamage to update the pie chart
            if (oldHealth > this.health) {
                // We pass 0 as the amount since we already updated the health directly
                this.takeDamage(0);
            }
        }
    }
    
    // Handle state transitions on the client
    handleStateChange(oldState: string, newState: string) {
        console.log(`Pillbox state changing from ${oldState} to ${newState}`);
        
        if (newState === "pickup") {
            // Completely rebuild the object for pickup state
            
            // First destroy any existing physics body to prevent lingering objects
            if (this.body) {
                this.scene.matter.world.remove(this.body);
                this.setBody(null);
            }
            
            // Change to pickup appearance
            this.setVisible(false);
            
            // Handle the top sprite - destroy and recreate it to ensure clean state
            if (this.topSprite && this.topSprite.active) {
                this.topSprite.destroy();
            }
            
            // Create a new top sprite with green tint
            this.topSprite = this.scene.add.sprite(this.x, this.y, 'pillbox1');
            this.topSprite.setDepth(101);
            this.topSprite.setTint(0x00ff00); // Green tint
            
            // Create new physics body for pickup
            this.setCircle(PHYSICS.PILLBOX_HITBOX_RADIUS / 2);
            this.setStatic(false);
            this.setCollidesWith([COLLISION_CATEGORIES.PLAYER]);
            this.setCollisionCategory(COLLISION_CATEGORIES.PICKUP);
            this.setFriction(0.8);
            this.setFrictionAir(0.2);
            
            console.log(`Client pillbox converted to pickup at (${this.x}, ${this.y})`);
        }
        else if (newState === "held") {
            // First clean up any existing physics body and sprites
            if (this.body) {
                this.scene.matter.world.remove(this.body);
                this.setBody(null);
            }
            
            // Hide the pillbox when it's held by a player
            this.setVisible(false);
            
            if (this.topSprite && this.topSprite.active) {
                this.topSprite.setVisible(false);
            }
        }
        else if (newState === "placed") {
            // Return to normal appearance if coming from another state
            
            // First clean up any existing physics body to prevent ghosts
            if (this.body) {
                this.scene.matter.world.remove(this.body);
                this.setBody(null);
            }
            
            // Set visibility
            this.setVisible(true);
            
            // Handle the top sprite - destroy and recreate it to ensure clean state
            if (this.topSprite && this.topSprite.active) {
                this.topSprite.destroy();
            }
            
            // Create a fresh top sprite
            this.topSprite = this.scene.add.sprite(this.x, this.y, 'pillbox1');
            this.topSprite.setDepth(101);
            this.topSprite.setVisible(true);
            
            // Set tint based on team
            if (this.team > 0 && TEAM_COLORS[this.team]) {
                this.topSprite.setTint(TEAM_COLORS[this.team]);
            }
            
            // Create new physics body for placed state
            this.setCircle(PHYSICS.PILLBOX_HITBOX_RADIUS);
            this.setStatic(true);
            this.setCollidesWith([COLLISION_CATEGORIES.WALL, COLLISION_CATEGORIES.PLAYER, COLLISION_CATEGORIES.PROJECTILE]);
            this.setCollisionCategory(COLLISION_CATEGORIES.PLAYER);
        }
    }
    
    // Override destroy to ensure complete cleanup
    override destroy() {
        // Properly destroy the topSprite
        if (this.topSprite && this.topSprite.active) {
            this.topSprite.destroy();
        }
        
        // Make sure the physics body is removed
        if (this.body) {
            this.scene.matter.world.remove(this.body);
        }
        
        console.log(`Client pillbox destroyed in ${this.state} state at (${this.x}, ${this.y})`);
        
        // Call parent destroy method
        super.destroy();
    }
}