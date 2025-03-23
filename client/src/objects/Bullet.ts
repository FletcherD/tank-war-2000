
import { PHYSICS, COLLISION_CATEGORIES } from "../constants";

export class Bullet extends Phaser.GameObjects.Sprite
{
  speed: number = PHYSICS.BULLET_SPEED;
  distanceToLive: number = PHYSICS.BULLET_RANGE;
  distanceTraveled: number = 0; // Track total distance traveled

  constructor(scene: Phaser.Scene, x: number, y: number, rotation: number) {
    super(scene, x, y, 'bullet');    
    
    // Add the sprite to the Matter physics system
    scene.matter.add.gameObject(this, {
      shape: {
        type: 'circle',
        radius: PHYSICS.BULLET_HITBOX_RADIUS
      },
      restitution: PHYSICS.BULLET_BOUNCE
    });
    scene.add.existing(this);
    // Set rotation and velocity
    this.setRotation(rotation);
    const velocity: Phaser.Math.Vector2 = new Phaser.Math.Vector2(
      this.speed * Math.cos(rotation), 
      this.speed * Math.sin(rotation));
    this.setVelocity(velocity.x, velocity.y);
  }

  preUpdate(time: number, delta: number)
  {
    // Calculate the distance moved in this frame (in pixels)
    const distanceThisFrame = this.speed;
    
    // Add to total distance traveled
    this.distanceTraveled += distanceThisFrame;
    
    // Check if we've exceeded the maximum travel distance
    if (this.distanceTraveled >= this.distanceToLive) {
      this.destroy();
    }
  }
}