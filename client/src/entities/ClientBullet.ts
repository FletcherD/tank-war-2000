import { Bullet } from "../../../shared/objects/Bullet";
import { BulletSchema } from "../../../server/src/schemas/BulletSchema";

export class ClientBullet extends Bullet {
    constructor(scene: Phaser.Scene, x: number, y: number, angle: number) {
        super(scene, x, y, angle);
    }
    
    // Update bullet from server schema
    updateFromServer(bulletSchema: BulletSchema) {
        // Update position
        this.x = bulletSchema.x;
        this.y = bulletSchema.y;
        
        // Update angle
        this.angle = bulletSchema.angle;
        
        // Update team (if needed)
        this.team = bulletSchema.team;
    }
}