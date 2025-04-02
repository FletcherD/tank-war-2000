import { Bullet } from "./Bullet";
import { COLLISION_CATEGORIES, PHYSICS, VISUALS } from "../constants";
import { GameScene } from "../scenes/Game";

export interface InputData {
    turnRate: number; // -1.0 to 1.0
    up: boolean;
    fire: boolean;
    tick: number;
  }

export class Tank extends Phaser.GameObjects.Container
{
  team: number = 0;
  health: number = PHYSICS.TANK_HEALTH;
  ammo: number = PHYSICS.TANK_MAX_AMMO;
  name: string = "Player";

  // Tank sprites
  tankBody: Phaser.GameObjects.Sprite;
  leftTread: Phaser.GameObjects.Sprite;
  rightTread: Phaser.GameObjects.Sprite;
  crosshair: Phaser.GameObjects.Sprite;
  
  // Tread animation
  leftTreadPosition: number = 0;  
  rightTreadPosition: number = 0;

  currentInput: InputData = {
      turnRate: 0,
      up: false,
      fire: false,
      tick: 0,
  };
  speed: number = 0;
  heading: number = 0;
  lastPosition: Phaser.Math.Vector2 = new Phaser.Math.Vector2(0, 0);
  lastHeading: number = 0;

  baseMaxSpeed: number = PHYSICS.TANK_MAX_SPEED;
  baseRotationSpeed: number = PHYSICS.TANK_ROTATION_SPEED;
  baseAcceleration: number = PHYSICS.TANK_ACCELERATION;
  
  fireCooldownTimer: number = 0;
  cooldownDuration: number = PHYSICS.TANK_FIRE_COOLDOWN;

  constructor(scene: GameScene, x: number, y: number)
  {
      super(scene as Phaser.Scene, x, y);
      
      this.createSprites();
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

  createSprites() {
    
  }

  preUpdate(time: number, delta: number, isSimulated: boolean = false)
  {
      const gameScene = this.scene as GameScene;
      
      // Get speed multiplier from the current tile
      const speedMultiplier = gameScene.gameMap.getSpeedAtPosition(this.x, this.y);
      const maxSpeed = this.baseMaxSpeed * speedMultiplier;
      const rotationSpeed = this.baseRotationSpeed * speedMultiplier;
      
      if (this === gameScene.currentPlayer) {
          this.crosshair.setVisible(true);
      }
  
      // Rotate based on turnRate - in Matter we need to set the angle property
      if (this.currentInput.turnRate !== 0) {
        const turnRate = Math.max(-1.0, Math.min(1.0, this.currentInput.turnRate));
        this.heading += rotationSpeed * delta * turnRate;
      }
      this.heading = Phaser.Math.Wrap(this.heading, 0, Math.PI * 2);
      this.setRotation(this.heading);

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

      this.setVelocity(this.speed * Math.cos(this.heading), this.speed * Math.sin(this.heading));
      
      // Handle fire cooldown
      if (this.currentInput.fire && this.fireCooldownTimer <= 0 && this.canFire()) {
        this.fire();
        this.fireCooldownTimer = this.cooldownDuration;
      }
      this.fireCooldownTimer -= delta;
      
      this.animate(delta, this.speed, rotationSpeed);

      this.lastPosition = new Phaser.Math.Vector2(this.x, this.y);
      this.lastHeading = this.heading;
  }
  

  fire() {
    console.log("Base Tank fire")
  }

  animate(delta: number, speed: number, rotationSpeed: number) {}

  takeDamage(amount: number, attackerId: string = "") {
    this.health -= amount;
    if (this.health <= 0) {
      this.onDestroyed(attackerId);
    }
  }
  
  onDestroyed(attackerId: string = "") {
    // Base implementation just destroys the tank
    // Server/Client implementations will handle respawn logic
    this.destroy();
  }

  canFire(): boolean {
    return this.ammo >= PHYSICS.TANK_AMMO_PER_SHOT;
  }

  useAmmo(amount: number = PHYSICS.TANK_AMMO_PER_SHOT): boolean {
    if (this.ammo >= amount) {
      this.ammo -= amount;
      return true;
    }
    return false;
  }

  refillAmmo(amount: number): void {
    this.ammo = Math.min(PHYSICS.TANK_MAX_AMMO, this.ammo + amount);
  }

  getState() {
    return {
      id: "0",
      name: this.name,
      x: this.x,
      y: this.y,
      heading: this.heading,
      speed: this.speed,
      health: this.health,
      ammo: this.ammo,
      team: this.team,
      turnRate: this.currentInput.turnRate,
      up: this.currentInput.up,
      down: this.currentInput.down,
      fire: this.currentInput.fire,
      tick: this.currentInput.tick
    };
  }
}