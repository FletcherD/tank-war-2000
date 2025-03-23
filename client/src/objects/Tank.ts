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
  tankTreads: Phaser.GameObjects.Sprite;

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
      
      // Create tank body and treads sprites
      this.tankTreads = scene.add.sprite(0, 0, 'tankTreads');
      this.tankBody = scene.add.sprite(0, 0, 'tank');
      
      // Add sprites to container
      this.add([this.tankTreads, this.tankBody]);
      
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