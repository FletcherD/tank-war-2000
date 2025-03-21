
import Phaser from "phaser";

export const COLLISION_CATEGORIES = {
  NONE: 0,            // 0000 (0 in binary)
  WALL: 0x0001,       // 0001 (1 in binary)
  PLAYER: 0x0002,     // 0010 (2 in binary)
  PROJECTILE: 0x0004, // 0100 (4 in binary)
  PICKUP: 0x0008      // 1000 (8 in binary)
};

export interface InputData {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  tick: number;
}

export class Tank extends Phaser.Physics.Matter.Sprite
{
  currentInput: InputData = {
      left: false,
      right: false,
      up: false,
      down: false,
      tick: 0,
  };
  speed: number = 0;
  controlAngle: number = 0;

  constructor (scene: Phaser.Scene, x: number, y: number)
  {
      super(scene.matter.world, x, y, 'tank');
      scene.add.existing(this);
      // Set up player physics body
      this.setCircle(14);
      
      // Set collision category and what it collides with
      this.setCollisionCategory(COLLISION_CATEGORIES.PLAYER);
      this.setCollidesWith([COLLISION_CATEGORIES.WALL, COLLISION_CATEGORIES.PLAYER]);
  }

  preUpdate(time: number, delta: number)
  {
      const acceleration = 0.005; // meters / msec^2
      const rotationSpeed = 0.003; // radians / msec
      const maxSpeed = 2; // meters / msec
  
      // Rotate left/right - in Matter we need to set the angle property
      if (this.currentInput.left) {
        this.controlAngle -= rotationSpeed * delta;
      } else if (this.currentInput.right) {
        this.controlAngle += rotationSpeed * delta;
      }
      this.setRotation(this.controlAngle);

      // Get current velocity and calculate speed
      const velocity = this.body.velocity as Phaser.Math.Vector2;
      this.speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
      
      // Apply forces when moving forward/backward
      if (this.currentInput.up) {
        this.speed += acceleration * delta;
        if (this.speed > maxSpeed) {
          this.speed = maxSpeed;
        }
      } else {
        this.speed -= acceleration * delta;
        if (this.speed < 0) {
          this.speed = 0;
        }
      }

      this.setVelocity(this.speed * Math.cos(this.rotation), this.speed * Math.sin(this.rotation));
  }
}

export class Wall extends Phaser.Physics.Matter.Image
{
  constructor (scene: GameScene, x: number, y: number)
  {
      super(scene.matter.world, x, y, 'wall');
      scene.add.existing(this);
      this.setStatic(true);
      
      this.setCollisionCategory(COLLISION_CATEGORIES.WALL);
      this.setCollidesWith([COLLISION_CATEGORIES.PLAYER, COLLISION_CATEGORIES.PROJECTILE]);
  }
}


export class GameScene extends Phaser.Scene {
    playerEntities: { [sessionId: string]: Tank } = {};
    matter: Phaser.Physics.Matter.MatterPhysics;

    wall: Wall;
    
    // Tilemap properties
    map: Phaser.Tilemaps.Tilemap;
    tileset: Phaser.Tilemaps.Tileset;
    groundLayer: Phaser.Tilemaps.TilemapLayer;

    elapsedTime = 0;
    fixedTimeStep = 1000 / 60;

    currentTick: number = 0;

    constructor() {
      console.log("GameScene constructor");
        super({ key: "game" });
    }

    addPlayer(x: number, y: number, sessionId: string): Tank  {
      const entity = new Tank(this, x, y); 
      this.playerEntities[sessionId] = entity;

      return entity;
    }

    removePlayer(sessionId: string) {
      const entity = this.playerEntities[sessionId];
      if (entity) {
        entity.destroy();
        delete this.playerEntities[sessionId]
      }
    }

    async create() {
      console.log("GameScene create");
        // Create the tilemap
        this.createTilemap();
        
        if (!this.map) {
            console.error("Failed to create tilemap");
            return;
        }
        
        console.log(`Tilemap created successfully: ${this.map.width}x${this.map.height} tiles, ${this.map.widthInPixels}x${this.map.heightInPixels} pixels`);
        
        // Set world bounds to match the tilemap size
        const mapWidth = this.map.widthInPixels;
        const mapHeight = this.map.heightInPixels;
        this.matter.world.setBounds(0, 0, mapWidth, mapHeight);
        
        // Add a wall for testing
        this.wall = new Wall(this, 100, 100);
        
        // Set up collision event handler
        this.matter.world.on('collisionstart', this.handleCollision, this);

        // Set camera bounds to match the map size
        this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
    }
    
    createTilemap() {
        // Get the map data from cache
        const mapData = this.cache.json.get('mapData');
        
        // Convert the 1D array into 2D array for tilemap format
        // Each tile is expanded to a 2x2 block to allow terrain drawing later
        const mapDataArray = [];
        for (let y = 0; y < mapData.size[1]; y++) {
            const row = [];
            for (let x = 0; x < mapData.size[0]; x++) {
                const index = y * mapData.size[0] + x;
                const tileIndex = mapData.mapdata[index] * 32;
                row.push(tileIndex);
                row.push(tileIndex);
            }
            mapDataArray.push(row);
            mapDataArray.push(row);
        }
        
        // Create the tilemap with 32x32 tile size using the data
        this.map = this.make.tilemap({
            data: mapDataArray,
            tileWidth: 16, 
            tileHeight: 16
        });
        
        // Add the tileset image we loaded in the preloader (first param is name used in the map, second is the key in the cache)
        this.tileset = this.map.addTilesetImage('tileset');
        
        // Create a layer using the tileset
        this.groundLayer = this.map.createLayer(0, this.tileset, 0, 0);
        
        if (!this.groundLayer) {
            console.error("Failed to create ground layer");
            return;
        }
        
        // Set collision for walls (tile index 1)
        this.map.setCollision(0);
        
        // Create Matter physics bodies for the collision tiles (walls)
        this.createMatterBodiesForTilemap();
    }
    
    createMatterBodiesForTilemap() {
        if (!this.groundLayer) {
            console.error("Ground layer is null, cannot create matter bodies");
            return;
        }
        
        try {
            // Get all tiles that have collision enabled
            const collisionTiles = this.groundLayer.filterTiles(tile => tile.index === 0);
            
            console.log(`Creating physics bodies for ${collisionTiles.length} wall tiles`);
            
            // Create static bodies for each collision tile
            collisionTiles.forEach(tile => {
                const x = tile.pixelX + tile.width / 2;
                const y = tile.pixelY + tile.height / 2;
                
                // Create a static rectangle body at the tile's position
                const body = this.matter.add.rectangle(x, y, tile.width, tile.height, {
                    isStatic: true,
                    label: 'wall'
                });
            });
        } catch (error) {
            console.error("Error creating matter bodies:", error);
        }
    }

    update(time: number, delta: number): void {
        this.elapsedTime += delta;
        while (this.elapsedTime >= this.fixedTimeStep) {
            this.elapsedTime -= this.fixedTimeStep;
            this.fixedTick(time, this.fixedTimeStep);
        }
    }

    fixedTick(time: number, delta: number) {
        this.currentTick++;
    }

    /**
     * Handles collision between tank and wall
     * Prints debug information about the collision
     */
    handleCollision(event: Phaser.Physics.Matter.Events.CollisionStartEvent) {
        // Get colliding pairs
        const pairs = event.pairs;
        
        // Process each collision pair
        for (let i = 0; i < pairs.length; i++) {
            const pair = pairs[i];
            
            // Matter.js collision objects contain game objects in their gameObject property
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;
            
            // Check if both bodies have gameObjects associated with them
            if (bodyA.gameObject && bodyB.gameObject) {
                // One object is Tank and one is Wall - determine which is which
                let tank: Tank | null = null;
                let wall: Wall | null = null;
                
                if (bodyA.gameObject instanceof Tank) {
                    tank = bodyA.gameObject as Tank;
                } else if (bodyA.gameObject instanceof Wall) {
                    wall = bodyA.gameObject as Wall;
                }
                
                if (bodyB.gameObject instanceof Tank) {
                    tank = bodyB.gameObject as Tank;
                } else if (bodyB.gameObject instanceof Wall) {
                    wall = bodyB.gameObject as Wall;
                }
                
                // If we have a tank-wall collision, log information
                if (tank && wall) {
                    console.log('Tank-Wall Collision Detected:');
                    console.log('- Tank position:', tank.x, tank.y);
                    console.log('- Wall position:', wall.x, wall.y);
                    console.log('- Tank velocity:', tank.body.velocity.x, tank.body.velocity.y);
                    console.log('- Tank speed:', tank.speed);
                    console.log('- Collision angle (degrees):', 
                        Phaser.Math.RadToDeg(
                            Phaser.Math.Angle.Between(
                                tank.x, 
                                tank.y, 
                                wall.x, 
                                wall.y
                            )
                        )
                    );
                    console.log('- Tank rotation (degrees):', Phaser.Math.RadToDeg(tank.rotation));
                }
            }
        }
    }
}