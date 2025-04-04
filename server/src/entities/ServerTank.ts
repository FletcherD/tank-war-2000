import { Tank, InputData } from "../../../shared/objects/Tank";
import { TankSchema } from "../schemas/TankSchema";
import { ServerGameScene } from "../scenes/ServerGameScene";
import { VISUALS, TILE_INDICES, PHYSICS, COLLISION_CATEGORIES } from "../../../shared/constants";
import { ServerBullet } from "./ServerBullet";
import { ServerPillbox } from "./ServerPillbox";

// Define the build queue item type
export interface BuildQueueItem {
    tile: { x: number, y: number };
    progress: number;
    buildTime: number;
    playerId: string;
    tileType: string;
    isHarvesting?: boolean; // Flag for wood harvesting operations
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
    if (this.schema.name !== this.name) this.schema.name = this.name;
    if (this.schema.turnRate !== this.currentInput.turnRate) this.schema.turnRate = this.currentInput.turnRate;
    if (this.schema.up !== this.currentInput.up) this.schema.up = this.currentInput.up;
    if (this.schema.fire !== this.currentInput.fire) this.schema.fire = this.currentInput.fire;
    if (this.schema.tick !== this.currentInput.tick) this.schema.tick = this.currentInput.tick;
    // Wood property is updated in other methods, not directly tied to tank properties
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

    // console.log(`Fired bullet at (${bulletX}, ${bulletY}, ${this.heading}), ammo left: ${this.ammo}`);
  }

  override preUpdate(time: number, delta: number): void {
    // Only update physics for non-respawning tanks
    if (!this.schema.isRespawning) {
      super.preUpdate(time, delta);
    } else {
      // Update respawn timer if in respawn state
      this.updateRespawnTimer(delta);
    }
    
    this.updateSchema();
  }
  
  updateRespawnTimer(delta: number): void {
    if (this.schema.isRespawning && this.schema.respawnTimer > 0) {
      this.schema.respawnTimer -= delta;
      
      // When timer expires, respawn the tank
      if (this.schema.respawnTimer <= 0) {
        this.respawn();
      }
    }
  }
  
  override onDestroyed(attackerId: string = ""): void {
    const scene = this.scene as ServerGameScene;
    
    // Determine destroyer info (player or pillbox)
    let destroyerName = "Unknown";
    let destroyerType = "player";
    let destroyerTeam = 0;
    
    // Check if the destroyer was a player
    const destroyerTank = scene.players.get(attackerId);
    if (destroyerTank) {
      destroyerName = destroyerTank.name;
      destroyerTeam = destroyerTank.team;
    } else {
      // Check if the destroyer was a pillbox
      const pillboxes = scene.pillboxes.filter(p => p.schema?.id === attackerId);
      if (pillboxes.length > 0) {
        const pillbox = pillboxes[0] as ServerPillbox;
        destroyerName = `Pillbox ${pillbox.schema.id.split('_').pop()}`;
        destroyerType = "pillbox";
        destroyerTeam = pillbox.team;
      }
    }
    
    // Send a message to newswire
    scene.sendNewswire({
      type: 'player_destroyed',
      playerId: this.sessionId,
      playerName: this.name,
      team: this.team,
      message: `${this.name} was destroyed by ${destroyerName}!`
    });
    
    // Put the tank in respawn state
    this.schema.isRespawning = true;
    this.schema.respawnTimer = 5000; // 5 seconds to respawn
    this.schema.health = 0;
    
    // Disable collisions during respawn state
    if (this.body) {
      // Set collision category to 0 which means no collisions
      this.body.collisionFilter.category = 0;
      this.body.collisionFilter.mask = 0;
    }
    
    // Visual effect can be handled on the client side
    // Don't destroy the tank object, just set its respawn state
  }
  
  respawn(): void {
    const scene = this.scene as ServerGameScene;
    
    // Find a team station for respawning
    const spawnPos = scene.getSpawnPositionForTeam(this.team);
    
    // Reset tank position and properties
    this.x = spawnPos.x;
    this.y = spawnPos.y;
    this.health = PHYSICS.TANK_HEALTH;
    this.ammo = PHYSICS.TANK_MAX_AMMO;
    this.schema.isRespawning = false;
    this.schema.respawnTimer = 0;
    
    // Re-enable collisions
    if (this.body) {
      // Restore original collision categories from shared Tank
      this.body.collisionFilter.category = COLLISION_CATEGORIES.PLAYER;
      this.body.collisionFilter.mask = COLLISION_CATEGORIES.WALL | COLLISION_CATEGORIES.PLAYER;
    }
    
    // Update schema to sync with clients
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
    scene.room.broadcast("tileBuildProgress", {
        tile: currentBuild.tile,
        progress: currentBuild.progress
    });
    
    // If building is complete
    if (currentBuild.progress >= 1) {
      if (currentBuild.isHarvesting) {
        // For harvesting forest, convert to grass and award wood
        scene.gameMap.setTile(currentBuild.tile.x, currentBuild.tile.y, TILE_INDICES.GRASS, true);
        
        // Award wood resource
        this.addWood(PHYSICS.WOOD_PER_FOREST_TILE);
        
        // Notify clients about completion
        scene.room.broadcast("tileBuildComplete", {
          tile: currentBuild.tile,
          tileType: "grass",
          isHarvesting: true,
          woodAwarded: PHYSICS.WOOD_PER_FOREST_TILE
        });
      } else {
        // Normal road/wall building
        const tileIndex = (currentBuild.tileType === "road") ? TILE_INDICES.ROAD : TILE_INDICES.WALL;
        // Set the tile on the map
        scene.gameMap.setTile(currentBuild.tile.x, currentBuild.tile.y, tileIndex, true);
        
        // Notify clients about completion
        scene.room.broadcast("tileBuildComplete", {
          tile: currentBuild.tile,
          tileType: currentBuild.tileType
        });
      }
      
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
      this.scene.matter.world.remove(pillbox.body);
    }
    
    // Remove from the scene but keep the schema
    const pillboxIndex = this.scene.pillboxes.indexOf(pillbox);
    if (pillboxIndex !== -1) {
      this.scene.pillboxes.splice(pillboxIndex, 1);
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
    const pillbox = scene.createPillbox(x, y, this.team, "placed");
    
    // Update schema
    this.updateSchema();
    
    console.log(`Tank ${this.sessionId} placed pillbox at (${x}, ${y}). Has ${this.schema.pillboxCount} pillboxes left.`);
    return true;
  }


  
  // Add wood to the tank's inventory
  addWood(amount: number): void {
    const maxWood = PHYSICS.TANK_MAX_WOOD;
    // Limit wood to maximum capacity
    this.schema.wood = Math.min(maxWood, this.schema.wood + amount);
    console.log(`Tank ${this.sessionId} collected wood. Now has ${this.schema.wood}/${maxWood} wood.`);
    
    // Update the schema to notify clients
    this.updateSchema();
  }
  
  // Use wood from the tank's inventory
  useWood(amount: number): boolean {
    if (this.schema.wood < amount) {
      return false; // Not enough wood
    }
    
    this.schema.wood -= amount;
    console.log(`Tank ${this.sessionId} used ${amount} wood. Has ${this.schema.wood} wood left.`);
    
    // Update the schema to notify clients
    this.updateSchema();
    return true;
  }
}