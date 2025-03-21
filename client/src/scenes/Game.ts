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
    decorationLayer: Phaser.Tilemaps.TilemapLayer;

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
        // Get the map data and tileset data from cache
        const mapData = this.cache.json.get('mapData');
        const tilesetData = this.cache.json.get('tilesetData');
        
        console.log("Loading tileset:", tilesetData.name);

        // Read and add tile properties from tilesetData to the tileset
        const tileProperties = {};
        // Loop through all tiles in the tileset data
        for (const tileKey in tilesetData.tiles) {
            const props = tilesetData.tiles[tileKey].properties || [];
            tileProperties[tileKey] = props;
        }

        // Prepare two map arrays for two layers
        const mapDataLayer0 = [];
        const mapDataLayer1 = [];
        
        // Initialize both layers with empty tiles
        for (let y = 0; y < mapData.size[1]; y++) {
            const row0 = [];
            const row1 = [];
            for (let x = 0; x < mapData.size[0]; x++) {
                row0.push(-1); // -1 means no tile
                row1.push(-1);
            }
            mapDataLayer0.push(row0);
            mapDataLayer0.push(row0.slice()); // Duplicate each row for the doubled resolution
            mapDataLayer1.push(row1);
            mapDataLayer1.push(row1.slice()); // Duplicate each row for the doubled resolution
        }
        
        // Fill the layers based on tile properties
        for (let y = 0; y < mapData.size[1]; y++) {
            for (let x = 0; x < mapData.size[0]; x++) {
                const index = y * mapData.size[0] + x;
                const tileValue = mapData.mapdata[index];
                
                if (tileValue === 0) continue; // Skip empty tiles
                const tileIndex = tileValue * 64;
                
                const tileId = tileValue.toString();
                let layerValue = 0; // Default to layer 0                
                // Check tile properties to determine layer
                const layerProp = tileProperties[tileIndex].find(p => p.name === "layer");
                if (layerProp) {
                    layerValue = layerProp.value;
                }     
                
                
                // Add to the appropriate layer
                if (layerValue === 0) {
                    mapDataLayer0[y*2][x*2] = tileIndex;
                    mapDataLayer0[y*2][(x*2)+1] = tileIndex;
                    mapDataLayer0[(y*2)+1][x*2] = tileIndex;
                    mapDataLayer0[(y*2)+1][(x*2)+1] = tileIndex;
                } else {
                    mapDataLayer1[y*2][x*2] = tileIndex;
                    mapDataLayer1[y*2][(x*2)+1] = tileIndex;
                    mapDataLayer1[(y*2)+1][x*2] = tileIndex;
                    mapDataLayer1[(y*2)+1][(x*2)+1] = tileIndex;
                }
            }
        }

        // Get tileset properties from tileset.json
        const tileWidth = tilesetData.tileheight;
        const tileHeight = tilesetData.tileheight;
        
        // Create the tilemap using the data for layer 0
        this.map = this.make.tilemap({
            data: mapDataLayer0,
            tileWidth: tileWidth, 
            tileHeight: tileHeight
        });
        
        // Add the tileset image using properties from tileset.json
        this.tileset = this.map.addTilesetImage(
            'tileset',         // In-game name for the tileset
            'tileset',         // Key of the image in the cache
            tileWidth,         // Width of each tile
            tileHeight,        // Height of each tile
            0,                 // Margin around the tileset
            0                  // Spacing between tiles
        );
      
        this.tileset.tileProperties = tileProperties;
        
        // Create both layers using the tileset
        this.groundLayer = this.map.createLayer(0, this.tileset, 0, 0);
        
        if (!this.groundLayer) {
            console.error("Failed to create ground layer");
            return;
        }
        
        // Create the decoration layer (layer 1) and add the tileset data
        this.decorationLayer = this.map.createBlankLayer('decoration', this.tileset, 0, 0);
        
        if (!this.decorationLayer) {
            console.error("Failed to create decoration layer");
            return;
        }
        
        // Fill the decoration layer with the layer 1 data
        for (let y = 0; y < mapDataLayer1.length; y++) {
            for (let x = 0; x < mapDataLayer1[y].length; x++) {
                const tileIndex = mapDataLayer1[y][x];
                if (tileIndex !== -1) {
                    this.decorationLayer.putTileAt(tileIndex, x, y);
                }
            }
        }
        
        // Ensure the decoration layer is drawn on top
        this.decorationLayer.setDepth(1);
        
        // Find tiles with collision from tileset data
        const collisionTileIds = [];
        if (tilesetData.tiles) {
            for (const tile of tilesetData.tiles) {
                if (tile.properties) {
                    const hasCollision = tile.properties.find(prop => 
                        prop.name === "hasCollision" && prop.value === true);
                    
                    if (hasCollision) {
                        collisionTileIds.push(parseInt(tile.id));
                    }
                }
            }
        }
        
        console.log(`Setting collision for tile IDs: ${collisionTileIds.join(', ')}`);
        this.map.setCollision(collisionTileIds);
        
        // Create Matter physics bodies for the collision tiles
        this.createMatterBodiesForTilemap();
        
        // Create terrain tiles
        this.applyWangTiles();
    }

    getTileBitmask(layer: Phaser.Tilemaps.TilemapLayer, x: number, y: number): number {
      if (!layer) return 0;

      const isTileSameType = (idA: number, idB: number): boolean => {
        return Math.floor(idA/64) === Math.floor(idB/64);
      }
      
      const centerTile = layer.getTileAt(x, y);
      if (!centerTile) return 0;
      
      // Check all 8 neighbors
      const neighbors = [
        {dx: -1, dy: 0}, // left
        {dx: -1, dy: 1}, // top-left
        {dx: 0, dy: 1},  // top
        {dx: 1, dy: 1},  // top-right
        {dx: 1, dy: 0},  // right
        {dx: 1, dy: -1}, // bottom-right
        {dx: 0, dy: -1},  // bottom
        {dx: -1, dy: -1}, // bottom-left
      ];
      
      let wang = [];
      for (const {dx, dy} of neighbors) {
          const neighborTile = layer.getTileAt(x + dx, y + dy);
          const result = neighborTile && isTileSameType(neighborTile.index, centerTile.index);
          wang.push(result);
      }

      let cornerMask = 0;
      cornerMask |= (wang[0] && wang[1] && wang[2] ? 0x01 : 0);
      cornerMask |= (wang[2] && wang[3] && wang[4] ? 0x02 : 0);
      cornerMask |= (wang[4] && wang[5] && wang[6] ? 0x04 : 0);
      cornerMask |= (wang[6] && wang[7] && wang[0] ? 0x08 : 0);
      
      return cornerMask;
  }

    applyWangTiles() {
      // Create a bitmask indicating which of the 4 corner tiles match the center tile
      // Returns a bitmask where each bit represents a neighbor (clockwise from top-left):
      // 0x01: top-left, 0x02: top-right, 0x04: bottom-right, 0x08: bottom-left


      // Get tileset data
      const tilesetData = this.cache.json.get('tilesetData');

      // Apply Wang tiles to ground layer
      this.applyWangTilesToLayer(this.groundLayer);
      
      // Apply Wang tiles to decoration layer
      this.applyWangTilesToLayer(this.decorationLayer);
    }
    
    // Helper method to apply Wang tiles to a specific layer
    applyWangTilesToLayer(layer: Phaser.Tilemaps.TilemapLayer) {
      if (!layer) return;
      
      // For each tile in the layer, get its bitmask and update its index
      for (let y = 0; y < layer.height; y++) {
          for (let x = 0; x < layer.width; x++) {
              const tile = layer.getTileAt(x, y);
              if (tile) {
                  const tileIndex = tile.index.toString();
                  const tileProperties = this.tileset.tileProperties[tileIndex];
                  
                  if (tileProperties) {
                      const isAffectedByNeighbors = tileProperties.find(prop => 
                          prop.name === "isAffectedByNeighbors" && prop.value === true);
                      
                      if (isAffectedByNeighbors) {
                          const bitmask = this.getTileBitmask(layer, x, y);
                          tile.index = tile.index + bitmask;
                          // Alternate terrain variation based on offset so 2x2 tiles display correctly
                          if (x%2) {
                              tile.index += 16;
                          }
                          if (y%2) {
                              tile.index += 32;
                          }
                      }
                  }
              }
          }
      }
    }
    
    createMatterBodiesForTilemap() {
        if (!this.groundLayer) {
            console.error("Ground layer is null, cannot create matter bodies");
            return;
        }
        
        try {
            // Get tileset data to check for collision properties
            const tilesetData = this.cache.json.get('tilesetData');
            
            // Find tile IDs that should have collision based on tileset data
            const collisionTileIds = new Set<number>();
            
            if (tilesetData.tiles) {
                for (const tile of tilesetData.tiles) {
                    if (tile.properties) {
                        const hasCollision = tile.properties.find(prop => 
                            prop.name === "hasCollision" && prop.value === true);
                        
                        // Only add to collision if in layer 0 (ground layer)
                        const layerProp = tile.properties.find(prop => 
                            prop.name === "layer");
                        const layer = layerProp ? layerProp.value : 0;
                        
                        if (hasCollision && layer === 0) {
                            collisionTileIds.add(parseInt(tile.id));
                        }
                    }
                }
            }
            
            // Filter tiles that have collision enabled
            let collisionTiles;
            if (collisionTileIds.size > 0) {
                collisionTiles = this.groundLayer.filterTiles(tile => {
                    // Get the base tile ID (without wang modifications)
                    const baseTileId = Math.floor(tile.index / 64) * 64;
                    return collisionTileIds.has(baseTileId);
                });
            } else {
                // Fallback to tile index 1 (walls)
                collisionTiles = this.groundLayer.filterTiles(tile => tile.index === 1);
            }
            
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
                
                // Set collision category for this wall
                this.matter.body.setCollisionCategory(body, COLLISION_CATEGORIES.WALL);
                this.matter.body.setCollidesWith(body, [COLLISION_CATEGORIES.PLAYER, COLLISION_CATEGORIES.PROJECTILE]);
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