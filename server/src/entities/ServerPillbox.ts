import { Pillbox } from "../../../shared/objects/Pillbox";
import { PillboxSchema } from "../schemas/PillboxSchema";

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
}