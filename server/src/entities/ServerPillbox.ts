import { Pillbox } from "../../../shared/objects/Pillbox";
import { PillboxSchema } from "../schemas/PillboxSchema";
import { ServerGameScene } from "../scenes/ServerGameScene";
import { Tank } from "../../../shared/objects/Tank";
import { VISUALS } from "../../../shared/constants";

export class ServerPillbox extends Pillbox {
    // Schema to be synced with clients
    schema: PillboxSchema;

    constructor(scene: Phaser.Scene, x: number, y: number, team: number = 0) {
        super(scene, x, y, team);
        
        // Initialize schema
        this.schema = new PillboxSchema();
        this.updateSchema();
    }
    
    // Update the schema with current state
    updateSchema() {
        this.schema.x = this.x;
        this.schema.y = this.y;
        this.schema.team = this.team;
        this.schema.health = this.health;
    }
    
    // Override takeDamage to update schema when damage is taken
    takeDamage(amount: number) {
        super.takeDamage(amount);
        this.updateSchema();
    }
    
    // Override team setter to update schema when team changes
    set team(value: number) {
        super.team = value;
        this.updateSchema();
    }
    
    // Override fireAtTarget to use ServerBullet
    override fireAtTarget(target: Tank) {
        // Skip if not active
        if (!this.active) return;
        
        const scene = this.scene as ServerGameScene;
        
        // Get target's current velocity and position
        const targetVelocity = target.body.velocity as Phaser.Math.Vector2;
        const targetPosition = new Phaser.Math.Vector2(target.x, target.y);
        const pillboxPosition = new Phaser.Math.Vector2(this.x, this.y);
        
        // Calculate distance to target
        const distance = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
        
        // Calculate time it would take for bullet to reach target's current position
        const timeToTarget = distance / this.bulletSpeed;
        
        // Predict where the target will be when the bullet arrives
        const predictedPosition = new Phaser.Math.Vector2(
            target.x + targetVelocity.x * timeToTarget,
            target.y + targetVelocity.y * timeToTarget
        );
        
        // Calculate angle to the predicted position
        const angle = Phaser.Math.Angle.Between(
            this.x, 
            this.y, 
            predictedPosition.x, 
            predictedPosition.y
        );
        
        // Create bullet at pillbox position with the calculated lead angle
        const fireLocation = new Phaser.Math.Vector2(VISUALS.FIRING_OFFSET, 0.0).rotate(angle);
        
        // Create a server bullet with this pillbox as owner
        scene.createBullet(
            this.x + fireLocation.x, 
            this.y + fireLocation.y, 
            angle, 
            this.team, 
            this.schemaId
        );
    }
}