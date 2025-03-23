import Phaser from "phaser";
import { GameMap } from "./Map";
import { Tank } from "../objects/Tank";
import { Bullet } from "../objects/Bullet";
import { Pillbox } from "../objects/Pillbox";

export class GameScene extends Phaser.Scene {
    playerEntities: { [sessionId: string]: Tank } = {};
    matter: Phaser.Physics.Matter.MatterPhysics;
    
    // Map instance
    gameMap: GameMap;

    elapsedTime = 0;
    fixedTimeStep = 1000 / 60;

    currentTick: number = 0;
    
    // For displaying debug information
    debugText: string = "";
    currentPlayer: Tank; // Reference to the local player's tank
    
    // Pillboxes
    pillboxes: Pillbox[] = [];

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
    
    addPillbox(x: number, y: number, team: number = 0): Pillbox {
      const pillbox = new Pillbox(this, x, y, team);
      this.pillboxes.push(pillbox);
      return pillbox;
    }

    async create() {
        const mapData = this.cache.json.get('mapData');
        // Create the game map
        this.gameMap = new GameMap(this);
        this.gameMap.createTilemap();
        
        if (!this.gameMap.map) {
            console.error("Failed to create tilemap");
            return;
        }
        
        console.log(`Tilemap created successfully: ${this.gameMap.map.width}x${this.gameMap.map.height} tiles, ${this.gameMap.map.widthInPixels}x${this.gameMap.map.heightInPixels} pixels`);
        
        // Set world bounds to match the tilemap size
        const mapWidth = this.gameMap.map.widthInPixels;
        const mapHeight = this.gameMap.map.heightInPixels;
        this.matter.world.setBounds(0, 0, mapWidth, mapHeight);
        
        // Set up collision event handler
        this.matter.world.on('collisionstart', this.handleCollision, this);

        // Set camera bounds to match the map size
        this.cameras.main.setBounds(0, 0, mapWidth, mapHeight);
        
        const pillboxLocations = mapData.pillboxes;
        // Add pillboxes to the map
        for (const location of pillboxLocations) {
            const worldLocation = this.gameMap.groundLayer.tileToWorldXY(location[0]*2+1, location[1]*2+1);
            this.addPillbox(worldLocation.x, worldLocation.y, 1);
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
            
            // One object is Tank and one is Wall - determine which is which
            let bullet: Bullet | null = null;
            let otherBody: Phaser.GameObjects.GameObject | null = null;
            
            if (bodyA.gameObject instanceof Bullet) {
                bullet = bodyA.gameObject as Bullet;
                otherBody = bodyB;
            } else if (bodyB.gameObject instanceof Bullet) {
                bullet = bodyB.gameObject as Bullet;
                otherBody = bodyA;
            }
            if (bullet) {
                console.log('Bullet collision detected');
                if (otherBody.gameObject instanceof Tank) {
                    console.log('Tank collision detected');
                    const tank = otherBody.gameObject as Tank;
                    tank.takeDamage(1);
                    bullet.destroy();
                } else if (otherBody.gameObject instanceof Pillbox) {
                    console.log('Pillbox collision detected');
                    const pillbox = otherBody.gameObject as Pillbox;
                    pillbox.takeDamage(1);
                    bullet.destroy();
                } else {
                    this.handleWallBulletCollision(bullet, otherBody);
                }
            }
        }
    }

    handleWallBulletCollision(bullet: Bullet, wall: MatterJS.Body) {
        bullet.destroy();
        const wallTilePos = wall.position;
        this.gameMap.map.setLayer(0);
        const wallTile = this.gameMap.map.getTileAtWorldXY(wallTilePos.x, wallTilePos.y);
        console.log('Wall collision detected at tile ', wallTile);

        // Adding 192 gets us the 'crater' tile with the same wang index
        const newTileIndex = wallTile.index+192;
        this.gameMap.setTile(wallTile.x, wallTile.y, newTileIndex);
    }
}