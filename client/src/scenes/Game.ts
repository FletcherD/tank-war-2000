import Phaser from "phaser";
import { GameMap } from "./Map";
import { Tank } from "../objects/Tank";
import { Bullet } from "../objects/Bullet";

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
                if (otherBody instanceof Tank) {
                    console.log('Tank collision detected');
                } else {
                  this.handleWallBulletCollision(bullet, otherBody);
                }
            }
                
                // If we have a tank-wall collision, log information
                // if (tank && wall) {
                //     console.log('Tank-Wall Collision Detected:');
                //     console.log('- Tank position:', tank.x, tank.y);
                //     console.log('- Wall position:', wall.x, wall.y);
                //     console.log('- Tank velocity:', tank.body.velocity.x, tank.body.velocity.y);
                //     console.log('- Tank speed:', tank.speed);
                //     console.log('- Collision angle (degrees):', 
                //         Phaser.Math.RadToDeg(
                //             Phaser.Math.Angle.Between(
                //                 tank.x, 
                //                 tank.y, 
                //                 wall.x, 
                //                 wall.y
                //             )
                //         )
                //     );
                //     console.log('- Tank rotation (degrees):', Phaser.Math.RadToDeg(tank.rotation));
                // }
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