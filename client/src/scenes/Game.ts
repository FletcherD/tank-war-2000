import Phaser from "phaser";
import { GameMap } from "./Map";

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
  fire: boolean;
  tick: number;
}

export class Tank extends Phaser.Physics.Matter.Sprite
{
  currentInput: InputData = {
      left: false,
      right: false,
      up: false,
      down: false,
      fire: false,
      tick: 0,
  };
  speed: number = 0;
  controlAngle: number = 0;
  baseMaxSpeed: number = 2; // Base max speed without tile modifiers
  fireCooldownTimer: number = 0;
  cooldownDuration: number = 1000; // Cooldown duration in milliseconds

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
      const gameScene = this.scene as GameScene;
      
      const acceleration = 0.005; // meters / msec^2
      const rotationSpeed = 0.003; // radians / msec
      
      // Get speed multiplier from the current tile
      const speedMultiplier = gameScene.gameMap.getSpeedAtPosition(this.x, this.y);
      const maxSpeed = this.baseMaxSpeed * speedMultiplier;
      
      // Debug output for tile speed
      if (this === gameScene.currentPlayer) {
          gameScene.debugText = `Tile Speed: ${speedMultiplier.toFixed(2)}`;
      }
  
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
      
      let targetSpeed = 0;
      // Apply forces when moving forward/backward
      if (this.currentInput.up) {
        targetSpeed = maxSpeed;
      } else {
        targetSpeed = 0;
      }

      if (this.speed > targetSpeed) {
        this.speed -= acceleration * delta;
        if (this.speed < targetSpeed) {
          this.speed = targetSpeed;
        }
      } else if (this.speed < targetSpeed) {
        this.speed += acceleration * delta;
        if (this.speed > targetSpeed) {
          this.speed = targetSpeed;
        }
      }

      this.setVelocity(this.speed * Math.cos(this.rotation), this.speed * Math.sin(this.rotation));

      // Handle fire cooldown
      if (this.currentInput.fire && this.fireCooldownTimer <= 0) {
        this.fire();
        this.fireCooldownTimer = this.cooldownDuration;
      }
      this.fireCooldownTimer -= delta;
  }

  fire() {
    const fireLocation = new Phaser.Math.Vector2(16.0, 0.0).rotate(this.controlAngle);
    const bullet = new Bullet(this.scene as GameScene, this.x + fireLocation.x, this.y + fireLocation.y, this.controlAngle);
    this.scene.add.existing(bullet);
  }
}

export class Bullet extends Phaser.Physics.Matter.Sprite
{
  speed: number = 10;
  distanceToLive: number = 4096;

  constructor(scene: GameScene, x: number, y: number, rotation: number) {
    super(scene.matter.world, x, y, 'bullet');
    scene.add.existing(this);

    this.setCircle(1);
    this.setBounce(1);
    this.setRotation(rotation);
    const velocity: Phaser.Math.Vector2 = new Phaser.Math.Vector2(
      this.speed * Math.cos(this.rotation), 
      this.speed * Math.sin(this.rotation));
    this.setVelocity(velocity.x, velocity.y);
  }


  preUpdate(time: number, delta: number)
  {
    this.distanceToLive -= delta * this.speed;
    if (this.distanceToLive <= 0) {
      this.destroy();
    }
  }
}

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
        console.log('Wall collision detected at tile ', wallTilePos);
    }
}