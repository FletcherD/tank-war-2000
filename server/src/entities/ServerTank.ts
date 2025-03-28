import { Tank, InputData } from "../../../shared/objects/Tank";
import { TankSchema } from "../schemas/TankSchema";
import { ServerGameScene } from "../scenes/ServerGameScene";
import { VISUALS } from "../../../shared/constants";

// Define the build queue item type
export interface BuildQueueItem {
    tile: { x: number, y: number };
    progress: number;
    buildTime: number;
    playerId: string;
}

export class ServerTank extends Tank {
  sessionId: string;
  schema: TankSchema;
  // Road building queue
  buildQueue: BuildQueueItem[] = [];
  
  constructor(scene: ServerGameScene, x: number, y: number, sessionId: string) {
    super(scene, x, y);
    this.sessionId = sessionId;
    this.schema = new TankSchema();
    this.updateSchema();
  }

  updateInput(input: InputData): void {
    this.currentInput = input;
    this.updateSchema();
  }

  updateSchema(): void {
    // Instead of just assignment, explicitly set each property to trigger change detection
    if (this.schema.x !== this.x) this.schema.x = this.x;
    if (this.schema.y !== this.y) this.schema.y = this.y;
    if (this.schema.heading !== this.heading) this.schema.heading = this.heading;
    if (this.schema.speed !== this.speed) this.schema.speed = this.speed;
    if (this.schema.health !== this.health) this.schema.health = this.health;
    if (this.schema.ammo !== this.ammo) this.schema.ammo = this.ammo;
    if (this.schema.team !== this.team) this.schema.team = this.team;
    if (this.schema.left !== this.currentInput.left) this.schema.left = this.currentInput.left;
    if (this.schema.right !== this.currentInput.right) this.schema.right = this.currentInput.right;
    if (this.schema.up !== this.currentInput.up) this.schema.up = this.currentInput.up;
    if (this.schema.down !== this.currentInput.down) this.schema.down = this.currentInput.down;
    if (this.schema.fire !== this.currentInput.fire) this.schema.fire = this.currentInput.fire;
    if (this.schema.tick !== this.currentInput.tick) this.schema.tick = this.currentInput.tick;
  }

  override fire() {
    // Check if we have enough ammo
    if (!this.canFire()) {
      return;
    }
    
    // Consume ammo
    this.useAmmo();

    // Only fire if cooldown is complete
    const scene = this.scene as ServerGameScene;      

    const fireLocation = new Phaser.Math.Vector2(VISUALS.FIRING_OFFSET, 0.0).rotate(this.heading);

    const bulletX = this.x + fireLocation.x; 
    const bulletY = this.y + fireLocation.y;
    
    // Create a server bullet with this tank as owner
    scene.createBullet(bulletX, bulletY, this.heading, this.sessionId);

    // Update the schema to sync ammo change
    this.updateSchema();

    console.log(`Fired bullet at (${bulletX}, ${bulletY}, ${this.heading}), ammo left: ${this.ammo}`);
  }

  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    this.updateSchema();
  }
  
  // Update build queue progress
  updateBuildQueue(delta: number) {
    if (!this.buildQueue.length) return;
    
    // Process the first item in the queue
    const currentBuild = this.buildQueue[0];
    currentBuild.progress += delta / currentBuild.buildTime;
    
    // Send progress update to all clients
    const scene = this.scene as ServerGameScene;
    scene.room.broadcast("roadBuildProgress", {
        tile: currentBuild.tile,
        progress: currentBuild.progress
    });
    
    // If building is complete
    if (currentBuild.progress >= 1) {
        // Set the tile on the map
        scene.gameMap.setTile(currentBuild.tile.x, currentBuild.tile.y, 256, true);
        
        // Notify clients about completion
        scene.room.broadcast("roadBuildComplete", {
            tile: currentBuild.tile
        });
        
        // Remove from queue
        this.buildQueue.shift();
    }
  }
  
  // Add a pillbox to the tank's inventory
  pickupPillbox(pillbox: any): void {
    // Increment the pillbox count
    this.schema.pillboxCount++;
    
    // Update the pillbox state to held
    pillbox.schema.state = "held";
    pillbox.schema.ownerId = this.sessionId;
    
    // Update the schema to notify clients
    this.updateSchema();
    pillbox.updateSchema();
    
    console.log(`Tank ${this.sessionId} picked up pillbox. Now has ${this.schema.pillboxCount} pillboxes.`);
    
    // We need to keep the pillbox schema in the state for syncing to clients, 
    // but we should destroy the actual physics object to avoid having invisible
    // bodies left in the scene
    if (pillbox.body) {
      pillbox.scene.matter.world.remove(pillbox.body);
    }
    
    // Remove from the scene but keep the schema
    const scene = this.scene as ServerGameScene;
    const pillboxIndex = scene.pillboxes.indexOf(pillbox);
    if (pillboxIndex !== -1) {
      scene.pillboxes.splice(pillboxIndex, 1);
    }
  }
  
  // Create a pillbox at the specified location
  placePillbox(x: number, y: number): boolean {
    // Verify the tank has a pillbox to place
    if (this.schema.pillboxCount <= 0) {
      return false;
    }
    
    // Decrement the pillbox count
    this.schema.pillboxCount--;
    
    // Create a new pillbox at the specified location
    const scene = this.scene as ServerGameScene;
    const pillbox = scene.createPillbox(x, y, this.team);
    
    // Update schema
    this.updateSchema();
    
    console.log(`Tank ${this.sessionId} placed pillbox at (${x}, ${y}). Has ${this.schema.pillboxCount} pillboxes left.`);
    return true;
  }
}