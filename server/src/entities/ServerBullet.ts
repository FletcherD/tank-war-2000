import { Bullet } from "../../../shared/objects/Bullet";
import { BulletSchema } from "../schemas/BulletSchema";
import { v4 as uuidv4 } from 'uuid'; // We'll need to add this dependency

export class ServerBullet extends Bullet {
    schema: BulletSchema;
    ownerId: string;
    
    constructor(scene: Phaser.Scene, x: number, y: number, angle: number, team: number = 0, ownerId: string = "") {
        super(scene, x, y, angle);
        
        // Set team
        this.team = team;
        
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
        this.schema.angle = this.angle;
        this.schema.team = this.team;
        this.schema.ownerId = this.ownerId;
    }
    
    update(time: number, delta: number) {
        super.update(time, delta);
        this.updateSchema();
    }
}