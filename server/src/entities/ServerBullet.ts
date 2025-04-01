import { Bullet } from "../../../shared/objects/Bullet";
import { BulletSchema } from "../schemas/BulletSchema";
import { v4 as uuidv4 } from 'uuid'; // We'll need to add this dependency

export class ServerBullet extends Bullet {
    schema: BulletSchema;
    ownerId: string;
    team: number = 0;
    
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
        // Add team property to schema if needed
    }
    
    update(time: number, delta: number) {
        super.update(time, delta);
        this.updateSchema();
    }
}