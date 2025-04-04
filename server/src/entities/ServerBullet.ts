import { Bullet } from "../../../shared/objects/Bullet";
import { BulletSchema } from "../schemas/BulletSchema";
import { v4 as uuidv4 } from 'uuid'; // We'll need to add this dependency
import { ServerGameScene } from "../scenes/ServerGameScene";
import { ServerTank } from "./ServerTank";
import { ServerPillbox } from "./ServerPillbox";

export class ServerBullet extends Bullet {
    schema: BulletSchema;
    
    constructor(scene: Phaser.Scene, x: number, y: number, rotation: number, ownerId: string = "", ownerName: string = "", team: number = 0) {
        super(scene, x, y, rotation);        
        
        // Set owner information
        this.ownerId = ownerId;
        this.ownerName = ownerName;
        this.team = team;
        
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
        this.schema.ownerName = this.ownerName;
        this.schema.team = this.team;
    }
    
    update(time: number, delta: number) {
        super.update(time, delta);

        //Don't need to do this I think? Bullets should not change after firing. We'll see
        //this.updateSchema();
    }
    
}