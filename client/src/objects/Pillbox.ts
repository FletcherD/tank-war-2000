import Phaser from "phaser";
import { Bullet } from "./Bullet";
import { Tank } from "./Tank";
import { COLLISION_CATEGORIES } from "./Tank";

export class Pillbox extends Phaser.Physics.Matter.Sprite {
  // Detection range for targeting tanks
  detectionRange: number = 256;
  
  // Firing properties
  firingCooldown: number = 1000; // milliseconds between shots
  firingTimer: number = 0;
  
  // Health
  health: number = 8;
  
  // Team - 0 for neutral, 1+ for player teams
  team: number = 0;
  
  // The top layer of the pillbox (will be tinted for team color)
  topSprite: Phaser.GameObjects.Sprite;
  
  // The team colors
  static TEAM_COLORS = {
    1: 0x0000ff, // Blue for team 1
    2: 0xff0000  // Red for team 2
  };
  
  constructor(scene: Phaser.Scene, x: number, y: number, team: number = 0) {
    // Using pillbox0 for the base sprite
    super(scene.matter.world, x, y, 'pillbox0', 0);
    scene.add.existing(this);
    
    // Create the top sprite that will be tinted
    this.topSprite = scene.add.sprite(x, y, 'pillbox1', 0);
    
    // Set up pillbox physics body
    this.setCircle(14);
    this.setStatic(true);
    
    // Set collision category and what it collides with
    this.setCollisionCategory(COLLISION_CATEGORIES.PLAYER);
    this.setCollidesWith([COLLISION_CATEGORIES.WALL, COLLISION_CATEGORIES.PLAYER, COLLISION_CATEGORIES.PROJECTILE]);
    
    // Set team
    this.team = team;
    
    // Apply team color if it's not neutral
    if (team > 0 && Pillbox.TEAM_COLORS[team]) {
      this.setTint(Pillbox.TEAM_COLORS[team]);
    }
  }
  
  preUpdate(time: number, delta: number) {
    // Update firing timer
    this.firingTimer -= delta;
    
    // Make sure the top sprite follows the base sprite
    if (this.topSprite && this.topSprite.active) {
      this.topSprite.x = this.x;
      this.topSprite.y = this.y;
    }
    
    // Find nearest tank within range
    const targetTank = this.findTargetTank();
    
    // If a target is found and cooldown is complete, fire
    if (targetTank && this.firingTimer <= 0) {
      this.fireAtTarget(targetTank);
      this.firingTimer = this.firingCooldown;
    }
  }
  
  findTargetTank(): Tank | null {
    const gameScene = this.scene as any; // We'll cast to access the playerEntities
    if (!gameScene.playerEntities) return null;
    
    let closestTank: Tank | null = null;
    let closestDistance = this.detectionRange;
    
    // Check all tanks in the scene
    for (const sessionId in gameScene.playerEntities) {
      const tank = gameScene.playerEntities[sessionId];
      
      // Skip tanks on the same team
      if (tank.team === this.team && this.team !== 0) continue;
      
      // Calculate distance
      const distance = Phaser.Math.Distance.Between(this.x, this.y, tank.x, tank.y);
      
      // If in range and closer than previous closest
      if (distance <= closestDistance) {
        closestTank = tank;
        closestDistance = distance;
      }
    }
    
    return closestTank;
  }
  
  fireAtTarget(target: Tank) {
    // Calculate angle to target
    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    
    // Create bullet at pillbox position with calculated angle
    const fireLocation = new Phaser.Math.Vector2(16.0, 0.0).rotate(angle);
    const bullet = new Bullet(this.scene as any, this.x + fireLocation.x, this.y + fireLocation.y, angle);
    this.scene.add.existing(bullet);
  }
  
  takeDamage(amount: number) {
    this.health -= amount;
    
    // Update the frame based on health
    // We have 7 frames (0-6) for each damage level
    // Map health from 8-0 to frame 0-6
    const baseFrame = Math.max(0, 6 - Math.ceil(this.health));
    this.setFrame(baseFrame);
    this.topSprite.setFrame(baseFrame);
    
    if (this.health <= 0) {
      // Destroy both sprites
      if (this.topSprite && this.topSprite.active) {
        this.topSprite.destroy();
      }
      this.destroy();
    }
  }
  
  destroy() {
    // Ensure the top sprite is destroyed when the base is destroyed
    if (this.topSprite && this.topSprite.active) {
      this.topSprite.destroy();
    }
    super.destroy();
  }
}