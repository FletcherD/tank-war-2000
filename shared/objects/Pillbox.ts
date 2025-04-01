import { COLLISION_CATEGORIES, PHYSICS, TEAM_COLORS } from "../constants.js";

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
  }
  
  destroy() {
    // Ensure all related sprites are destroyed when the base is destroyed
    if (this.topSprite && this.topSprite.active) {
      this.topSprite.destroy();
      this.topSprite = null;
    }
    
    // Make sure the physics body is properly removed from the world
    if (this.body) {
      this.scene.matter.world.remove(this.body);
    }
    
    // Call parent destroy method
    super.destroy();
  }
}