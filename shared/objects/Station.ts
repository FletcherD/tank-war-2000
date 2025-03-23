import Phaser from "phaser";
import { COLLISION_CATEGORIES, TEAM_COLORS } from "../constants";

export class Station extends Phaser.Physics.Matter.Sprite {
  // Team - 0 for neutral, 1+ for player teams
  team: number = 0;
  
  // The top layer of the station (will be tinted for team color)
  topSprite: Phaser.GameObjects.Sprite;
  
  constructor(scene: Phaser.Scene, x: number, y: number, team: number = 0) {
    // Using station0 for the base sprite
    super(scene.matter.world, x, y, 'station0', 0);
    scene.add.existing(this);
    
    // Create the top sprite that will be tinted
    this.topSprite = scene.add.sprite(x, y, 'station1', 0);
    
    // Set up station physics body
    this.setStatic(true);
    
    // Set collision category and what it collides with
    this.setCollidesWith([]);
    
    // Set team
    this.team = team;
    
    // Apply team color if it's not neutral
    if (team > 0 && TEAM_COLORS[team]) {
      this.topSprite.setTint(TEAM_COLORS[team]);
    }
  }
  
  preUpdate(time: number, delta: number) {
    // Make sure the top sprite follows the base sprite
    if (this.topSprite && this.topSprite.active) {
      this.topSprite.x = this.x;
      this.topSprite.y = this.y;
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