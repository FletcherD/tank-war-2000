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
  health: number = 50;
  
  // Team - 0 for neutral, 1+ for player teams
  team: number = 0;
  
  constructor(scene: Phaser.Scene, x: number, y: number, team: number = 0) {
    super(scene.matter.world, x, y, 'pillbox');
    scene.add.existing(this);
    
    // Set up pillbox physics body
    this.setCircle(14);
    this.setStatic(true);
    
    // Set collision category and what it collides with
    this.setCollisionCategory(COLLISION_CATEGORIES.PLAYER);
    this.setCollidesWith([COLLISION_CATEGORIES.WALL, COLLISION_CATEGORIES.PLAYER, COLLISION_CATEGORIES.PROJECTILE]);
    
    // Set team
    this.team = team;
    
    // Set a different tint to distinguish from tanks
    this.setTint(0xff0000); // Red tint
  }
  
  preUpdate(time: number, delta: number) {
    // Update firing timer
    this.firingTimer -= delta;
    
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
      //if (tank.team === this.team) continue;
      
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
    if (this.health <= 0) {
      this.destroy();
    }
  }
}