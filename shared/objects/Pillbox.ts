import { Bullet } from "./Bullet";
import { Tank } from "./Tank";
import { COLLISION_CATEGORIES, PHYSICS, TEAM_COLORS, VISUALS } from "../constants";

export class Pillbox extends Phaser.Physics.Matter.Sprite {
  // Detection range for targeting tanks
  detectionRange: number = PHYSICS.PILLBOX_DETECTION_RANGE;
  
  // Firing properties
  firingCooldown: number = PHYSICS.PILLBOX_FIRE_COOLDOWN;
  firingTimer: number = 0;
  bulletSpeed: number = PHYSICS.BULLET_SPEED;
  
  // Health
  health: number = PHYSICS.PILLBOX_HEALTH;
  
  // Team - 0 for neutral, 1+ for player teams
  team: number = 0;
  
  // The top layer of the pillbox (will be tinted for team color)
  topSprite: Phaser.GameObjects.Sprite;
  
  // Schema ID for server-client synchronization
  schemaId: string = "";
  
  constructor(scene: Phaser.Scene, x: number, y: number, team: number = 0) {
    // Using pillbox0 for the base sprite
    super(scene.matter.world, x, y, 'pillbox0');
    scene.add.existing(this);
    this.setDepth(100);
    
    // Create the top sprite that will be tinted
    this.topSprite = scene.add.sprite(x, y, 'pillbox1');
    this.topSprite.setDepth(101);
    
    // Set up pillbox physics body
    this.setCircle(PHYSICS.PILLBOX_HITBOX_RADIUS);
    this.setStatic(true);
    
    // Set collision category and what it collides with
    this.setCollisionCategory(COLLISION_CATEGORIES.PLAYER);
    this.setCollidesWith([COLLISION_CATEGORIES.WALL, COLLISION_CATEGORIES.PLAYER, COLLISION_CATEGORIES.PROJECTILE]);
    
    // Set team
    this.team = team;
    
    // Apply team color if it's not neutral
    if (team > 0 && TEAM_COLORS[team]) {
      this.topSprite.setTint(TEAM_COLORS[team]);
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
    // Get the bullet speed from constants
    const bulletSpeed = PHYSICS.BULLET_SPEED;
    
    // Get target's current velocity and position
    const targetVelocity = target.body.velocity as Phaser.Math.Vector2;
    const targetPosition = new Phaser.Math.Vector2(target.x, target.y);
    const pillboxPosition = new Phaser.Math.Vector2(this.x, this.y);
    
    // Calculate distance to target
    const distance = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
    
    // Calculate time it would take for bullet to reach target's current position
    const timeToTarget = distance / bulletSpeed;
    
    // Predict where the target will be when the bullet arrives
    const predictedPosition = new Phaser.Math.Vector2(
      target.x + targetVelocity.x * timeToTarget,
      target.y + targetVelocity.y * timeToTarget
    );
    
    // Calculate angle to the predicted position
    const angle = Phaser.Math.Angle.Between(
      this.x, 
      this.y, 
      predictedPosition.x, 
      predictedPosition.y
    );
    
    // Create bullet at pillbox position with the calculated lead angle
    const fireLocation = new Phaser.Math.Vector2(PHYSICS.PILLBOX_HITBOX_RADIUS + 2, 0.0).rotate(angle);
    const bullet = new Bullet(this.scene as any, this.x + fireLocation.x, this.y + fireLocation.y, angle);
    this.scene.add.existing(bullet);
  }
  
  takeDamage(amount: number) {
    this.health -= amount;
    
    // Calculate damage percentage for the pie chart
    const maxHealth = PHYSICS.PILLBOX_HEALTH;
    const damagePct = 1 - (this.health / maxHealth);
    
    // Update damage indicator pie chart
    if (this.health < maxHealth && this.health > 0) {
      const healthFraction = 255.0 * this.health / maxHealth;
      this.setTint(Phaser.Display.Color.GetColor(healthFraction, healthFraction, healthFraction));
    }
    
    if (this.health <= 0) {
      this.destroy();
    }
  }
  
  destroy() {
    // Ensure all related sprites are destroyed when the base is destroyed
    if (this.topSprite && this.topSprite.active) {
      this.topSprite.destroy();
    }
    super.destroy();
  }
}