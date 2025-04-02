import { Pillbox } from "../../../shared/objects/Pillbox";
import { PillboxSchema } from "../schemas/PillboxSchema";
import { ServerGameScene } from "../scenes/ServerGameScene";
import { Tank } from "../../../shared/objects/Tank";
import { VISUALS, PHYSICS, COLLISION_CATEGORIES } from "../../../shared/constants";
import { NewswireMessage } from "../rooms/GameRoom";

export class ServerPillbox extends Pillbox {
    // Schema to be synced with clients
    schema: PillboxSchema;

    constructor(scene: Phaser.Scene, x: number, y: number, team: number = 0) {
        super(scene, x, y, team);
        
        // Initialize schema
        this.schema = new PillboxSchema();
        this.updateSchema();
        
        // If the schema state is already set to pickup, configure the physics for pickup
        if (this.schema.state === "pickup") {
            this.setupPickupPhysics();
        }
    }
    
    // Setup the physics body for pickup mode
    setupPickupPhysics() {
        console.log(`Setting up pickup physics for pillbox at (${this.x}, ${this.y})`);
        
        // Completely rebuild the physics body
        // First remove existing body to avoid lingering physics objects
        if (this.body) {
            this.scene.matter.world.remove(this.body);
        }
        
        // Reset the body completely
        this.setBody(null);
        
        // Create a smaller hitbox for the pickup
        this.setCircle(PHYSICS.PILLBOX_HITBOX_RADIUS / 2);
        
        // Change from static to dynamic for pickup physics
        this.setStatic(false);
        
        // Keep it from rolling around but allow it to be pushed
        this.setFriction(0.8);
        this.setFrictionAir(0.2);
        
        // Only collide with players for pickup
        this.setCollidesWith([COLLISION_CATEGORIES.PLAYER]);
        this.setCollisionCategory(COLLISION_CATEGORIES.PICKUP);
        
        // Make sure it doesn't get destroyed
        this.health = 1;
    }
    
    // Update the schema with current state
    updateSchema() {
        this.schema.x = this.x;
        this.schema.y = this.y;
        this.schema.team = this.team;
        this.schema.health = this.health;
        // State and ownerId already handled in state transition methods
    }
    
    // Override takeDamage to update schema when damage is taken
    takeDamage(amount: number, attackerId: string = "") {
        super.takeDamage(amount);
        
        // Check if health is at or below 0 but we're still active (about to be destroyed)
        if (this.health <= 0 && this.active) {
            // Transition to pickup state
            this.convertToPickup(attackerId);
        }
        
        this.updateSchema();
    }
    
    // Convert from placed to pickup state
    convertToPickup(attackerId: string = "") {
        console.log("Converting pillbox to pickup state");
        
        // Update schema state
        this.schema.state = "pickup";
        
        // Setup pickup physics
        this.setupPickupPhysics();
        
        // Update schema - ensure position is accurate
        this.schema.x = this.x;
        this.schema.y = this.y;
        this.updateSchema();
        
        console.log(`Pillbox converted to pickup at (${this.x}, ${this.y})`);
        
        // Send newswire message for pillbox destruction
        const gameScene = this.scene as ServerGameScene;
        if (gameScene.room) {
            const teamName = this.team === 0 ? "Neutral" : this.team === 1 ? "Blue" : "Red";
            
            // Get destroyer info if available
            let destroyerName = "Unknown";
            let destroyerType = "player";
            let message = `A ${teamName} pillbox was destroyed!`;
            
            if (attackerId) {
                // Check if destroyed by a player
                const destroyerTank = gameScene.players.get(attackerId);
                if (destroyerTank) {
                    destroyerName = destroyerTank.name;
                    message = `A ${teamName} pillbox was destroyed by ${destroyerName}!`;
                } else {
                    // Check if destroyed by another pillbox
                    const pillboxes = gameScene.pillboxes.filter(p => p.schema?.id === attackerId);
                    if (pillboxes.length > 0) {
                        destroyerType = "pillbox";
                        message = `A ${teamName} pillbox was destroyed by an enemy pillbox!`;
                    }
                }
            }
            
            const newswireMessage: NewswireMessage = {
                type: 'pillbox_destroyed',
                team: this.team,
                position: { x: this.x, y: this.y },
                message: message
            };
            
            gameScene.room.broadcastNewswire(newswireMessage);
        }
    }
    
    // Override destroy to handle removal based on state
    override destroy() {
        // If we're in "placed" state, transition to pickup instead of destroying
        if (this.schema.state === "placed" && this.health <= 0) {
            // Don't call super.destroy(), instead transition to pickup
            this.convertToPickup();
            return;
        }
        
        // For held state or when explicitly destroying a pickup
        if (this.body) {
            // Ensure we completely remove the physics body from the world
            this.scene.matter.world.remove(this.body);
        }
        
        console.log(`Pillbox destroyed in ${this.schema.state} state at (${this.x}, ${this.y})`);
        
        // For room state cleanup, if this is a held pillbox being destroyed
        const scene = this.scene as ServerGameScene;
        if (scene.room && scene.room.state.pillboxes.has(this.schema.id)) {
            scene.room.state.pillboxes.delete(this.schema.id);
        }
        
        // Perform normal destruction for the sprite and any remaining components
        super.destroy();
    }
    
    // Override team setter to update schema when team changes
    set team(value: number) {
        super.team = value;
        this.updateSchema();
    }

    preUpdate(time: number, delta: number) {
        // Update firing timer
        this.firingTimer -= delta;
        
        // Find nearest tank within range
        const targetTank = this.findTargetTank();
        
        // If a target is found and cooldown is complete, fire
        if (targetTank && this.firingTimer <= 0) {
            this.fireAtTarget(targetTank);
            this.firingTimer = this.firingCooldown;
        }
    }

    findTargetTank(): Tank | null {
        const gameScene = this.scene as ServerGameScene; // We'll cast to access the playerEntities        
        let closestTank: Tank | null = null;
        let closestDistance = this.detectionRange;
        
        // Check all tanks in the scene
        for (const sessionId of gameScene.players.keys()) {
            const tank = gameScene.players.get(sessionId);
            
            // Skip tanks on the same team
            if (tank.team === this.team || this.team === 0) continue;
            
            // Skip tanks that are in respawning state
            if (tank.schema?.isRespawning) continue;
            
            // Calculate distance
            const distance = Phaser.Math.Distance.Between(this.x, this.y, tank.x, tank.y);
            
            // If in range and closer than previous closest
            if (distance <= closestDistance) {
                closestTank = tank;
                closestDistance = distance;
            }
        }
        
        return closestTank;
    }
    
    fireAtTarget(target: Tank) {
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
            this.schema.id
        );
    }
}