import { Steel } from "../../../shared/objects/Steel";
import { SteelSchema } from "../schemas/SteelSchema";
import { ServerGameScene } from "../scenes/ServerGameScene";
import { PHYSICS } from "../../../shared/constants";

export class ServerSteel extends Steel {
  schema: SteelSchema;
  createdAt: number;
  
  constructor(scene: ServerGameScene, x: number, y: number, value: number) {
    super(scene, x, y, value);
    
    // Create schema for network sync
    this.schema = new SteelSchema();
    this.createdAt = Date.now();
    this.updateSchema();
    
    // Add expiration timer
    scene.time.delayedCall(PHYSICS.STEEL_DECAY_TIME, () => {
      this.destroy();
    });
  }
  
  updateSchema(): void {
    if (this.schema.x !== this.x) this.schema.x = this.x;
    if (this.schema.y !== this.y) this.schema.y = this.y;
    if (this.schema.value !== this.value) this.schema.value = this.value;
    if (this.schema.createdAt !== this.createdAt) this.schema.createdAt = this.createdAt;
  }
  
  override pickup(): void {
    // The actual pickup logic is in ServerTank
    console.log(`Steel pickup (${this.value} units)`);
    
    // When picked up, destroy the steel and remove from server
    this.destroy();
  }
}