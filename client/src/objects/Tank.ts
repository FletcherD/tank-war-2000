import Phaser from "phaser";
import { Bullet } from "../objects/Bullet";
import { COLLISION_CATEGORIES, PHYSICS, VISUALS } from "../constants";

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
  team: number = 0;

  health: number = PHYSICS.TANK_HEALTH;  

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

  constructor (scene: Phaser.Scene, x: number, y: number)
  {
      super(scene.matter.world, x, y, 'tank');
      scene.add.existing(this);
      // Set up player physics body
      this.setCircle(PHYSICS.TANK_HITBOX_RADIUS);
      
      // Set collision category and what it collides with
      this.setCollisionCategory(COLLISION_CATEGORIES.PLAYER);
      this.setCollidesWith([COLLISION_CATEGORIES.WALL, COLLISION_CATEGORIES.PLAYER]);
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