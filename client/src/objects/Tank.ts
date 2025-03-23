import Phaser from "phaser";
import { Bullet } from "../objects/Bullet";
import { COLLISION_CATEGORIES, PHYSICS, VISUALS } from "../constants";
import { GameScene } from "../scenes/GameScene";

export interface InputData {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    fire: boolean;
    tick: number;
  }

export class Tank extends Phaser.GameObjects.Container
{
  team: number = 0;
  health: number = PHYSICS.TANK_HEALTH;  
  width: number;
  height: number;

  // Tank sprites
  tankBody: Phaser.GameObjects.Sprite;
  leftTread: Phaser.GameObjects.Sprite;
  rightTread: Phaser.GameObjects.Sprite;
  crosshair: Phaser.GameObjects.Sprite;
  
  // Tread animation
  leftTreadPosition: number = 0;  
  rightTreadPosition: number = 0;

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

  baseMaxSpeed: number = PHYSICS.TANK_MAX_SPEED;
  baseRotationSpeed: number = PHYSICS.TANK_ROTATION_SPEED;
  baseAcceleration: number = PHYSICS.TANK_ACCELERATION;
  
  fireCooldownTimer: number = 0;
  cooldownDuration: number = PHYSICS.TANK_FIRE_COOLDOWN;

  constructor(scene: GameScene, x: number, y: number)
  {
      super(scene as Phaser.Scene, x, y);
      
      // Create tank body sprite
      this.tankBody = scene.add.sprite(0, 0, 'tank');
      
      // Create left and right tread sprites
      // Left tread uses frames from top row (row 0)
      this.leftTread = scene.add.sprite(0, 0, 'tankTreads', 0);
      // Right tread uses frames from bottom row (row 1)
      this.rightTread = scene.add.sprite(0, 0, 'tankTreads', 31);
      
      // Create crosshair sprite (initially invisible)
      this.crosshair = scene.add.sprite(PHYSICS.BULLET_RANGE, 0, 'crosshair');
      this.crosshair.setVisible(false);
      
      // Add sprites to container (order matters - treads first, then tank body on top, then crosshair)
      this.add([this.leftTread, this.rightTread, this.tankBody, this.crosshair]);
      
      // Set up tread frames
      this.createTreadFrames(scene);
      
      // Add the container to the Matter physics system
      scene.matter.add.gameObject(this, {
        shape: {
          type: 'circle',
          radius: PHYSICS.TANK_HITBOX_RADIUS
        },
        friction: 0.0,
        frictionStatic: 0.0,
        frictionAir: 0.0,
        collisionFilter: {
          category: COLLISION_CATEGORIES.PLAYER,
          mask: COLLISION_CATEGORIES.WALL | COLLISION_CATEGORIES.PLAYER
        }
      });
      scene.add.existing(this);
  }

  preUpdate(time: number, delta: number)
  {
      const gameScene = this.scene as GameScene;
      
      // Get speed multiplier from the current tile
      const speedMultiplier = gameScene.gameMap.getSpeedAtPosition(this.x, this.y);
      const maxSpeed = this.baseMaxSpeed * speedMultiplier;
      const rotationSpeed = this.baseRotationSpeed * speedMultiplier;
      
      // Debug output for tile speed
      if (this === gameScene.currentPlayer) {
          gameScene.debugText = `Tile Speed: ${speedMultiplier.toFixed(2)}`;
          
          // Show crosshair only for current player
          this.crosshair.setVisible(true);
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
        this.speed -= this.baseAcceleration * delta;
        if (this.speed < targetSpeed) {
          this.speed = targetSpeed;
        }
      } else if (this.speed < targetSpeed) {
        this.speed += this.baseAcceleration * delta;
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
      
      // Animate treads based on tank speed
      this.animateTreads(delta, this.speed, rotationSpeed);
  }
  
  // Helper method to set up tread sprite frames
  createTreadFrames(scene: Phaser.Scene) {
    // Ensure the texture exists and has frame configurations
    const texture = scene.textures.get('tankTreads');
    
    // If the frames haven't been set up yet, create them
    if (texture.frameTotal <= 1) {
      // Create frames for a 31x2 grid of 32x32 sprites
      const frameWidth = 32;
      const frameHeight = 32;
      const framesPerRow = 31;
      
      for (let row = 0; row < 2; row++) {
        for (let col = 0; col < framesPerRow; col++) {
          const frameIndex = row * framesPerRow + col;
          texture.add(
            frameIndex, // Frame name (numeric index)
            0, // Source image index
            col * frameWidth, row * frameHeight, // Position in the atlas
            frameWidth, frameHeight // Size of the frame
          );
        }
      }
    }

    this.leftTread.setFrame(this.leftTreadPosition);
    this.rightTread.setFrame(this.rightTreadPosition);
  }
  
  // Helper method to animate treads based on speed and direction
  animateTreads(delta: number, speed: number, rotationSpeed: number) {
    // Only animate if moving
    const animationSpeed: number = -0.02;
    const turningSpeed: number = -10;
    const framesPerRow: number = 31;

    if (Math.abs(speed) > 0 || Math.abs(rotationSpeed) > 0) {
      // Calculate frame increment based on speed
      // Faster speed = faster animation
      let frameIncrementL = (speed * delta) * animationSpeed;
      let frameIncrementR = (speed * delta) * animationSpeed;
      
      // Handle turning - treads move in opposite directions when turning
      if (this.currentInput.left) {
        // Left tread moves backward, right tread moves forward
        frameIncrementL -= (rotationSpeed * delta) * turningSpeed;
        frameIncrementR += (rotationSpeed * delta) * turningSpeed;
      } else if (this.currentInput.right) {
        // Left tread moves forward, right tread moves backward
        frameIncrementL += (rotationSpeed * delta) * turningSpeed;
        frameIncrementR -= (rotationSpeed * delta) * turningSpeed;
      }

      function mod(n: number, m: number): number {
        return ((n % m) + m) % m;
      }

      this.leftTreadPosition = mod(this.leftTreadPosition + frameIncrementL, framesPerRow);
      this.rightTreadPosition = mod(this.rightTreadPosition + frameIncrementR, framesPerRow);

      this.leftTread.setFrame(Math.floor(this.leftTreadPosition));
      this.rightTread.setFrame(Math.floor(this.rightTreadPosition) + framesPerRow);
    }
  }

  fire() {
    const fireLocation = new Phaser.Math.Vector2(VISUALS.FIRING_OFFSET, 0.0).rotate(this.controlAngle);
    const bullet = new Bullet(this.scene as GameScene, this.x + fireLocation.x, this.y + fireLocation.y, this.controlAngle);
    this.scene.add.existing(bullet);
  }

  takeDamage(amount: number) {
    this.health -= amount;
    if (this.health <= 0) {
      this.destroy();
    }
  }
}