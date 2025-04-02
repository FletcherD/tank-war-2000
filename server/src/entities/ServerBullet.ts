import { Bullet } from "../../../shared/objects/Bullet";
import { BulletSchema } from "../schemas/BulletSchema";
import { v4 as uuidv4 } from 'uuid'; // We'll need to add this dependency
import { ServerGameScene } from "../scenes/ServerGameScene";
import { ServerTank } from "./ServerTank";
import { ServerPillbox } from "./ServerPillbox";

export class ServerBullet extends Bullet {
    schema: BulletSchema;
    ownerId: string;
    
    constructor(scene: Phaser.Scene, x: number, y: number, rotation: number, ownerId: string = "") {
        super(scene, x, y, rotation);        
        
        // Set owner ID
        this.ownerId = ownerId;
        
        // Create schema
        this.schema = new BulletSchema();
        this.schema.id = uuidv4(); // Generate unique ID
        this.updateSchema();
    }
    
    updateSchema() {
        this.schema.x = this.x;
        this.schema.y = this.y;
        this.schema.rotation = this.rotation;
        this.schema.ownerId = this.ownerId;
    }
    
    update(time: number, delta: number) {
        super.update(time, delta);
        this.updateSchema();
        
        // Check for hits against players or pillboxes
        this.checkCollisions();
    }
    
    checkCollisions() {
        const scene = this.scene as ServerGameScene;
        
        // Check collision with tanks
        scene.players.forEach((tank) => {
            // Don't hit owner or respawning tanks
            if (tank.sessionId === this.ownerId || tank.schema.isRespawning) {
                return;
            }
            
            // Calculate distance
            const distance = Phaser.Math.Distance.Between(
                this.x, this.y,
                tank.x, tank.y
            );
            
            // If hit, apply damage and destroy bullet
            if (distance < 20) { // Adjust hit radius as needed
                tank.takeDamage(25, this.ownerId); // 25 damage per hit, pass attacker ID
                this.destroy();
            }
        });
        
        // Check collision with pillboxes
        scene.pillboxes.forEach((p) => {
            if (!(p instanceof ServerPillbox)) return;
            
            const pillbox = p as ServerPillbox;
            // Skip if this pillbox is held or in a pickup state
            if (pillbox.schema.state !== "placed") {
                return;
            }
            
            // Calculate distance
            const distance = Phaser.Math.Distance.Between(
                this.x, this.y,
                pillbox.x, pillbox.y
            );
            
            // If hit, apply damage and destroy bullet
            if (distance < 20) { // Adjust hit radius as needed
                pillbox.takeDamage(25, this.ownerId); // 25 damage per hit, pass attacker ID
                this.destroy();
            }
        });
    }
}