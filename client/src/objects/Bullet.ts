
import { PHYSICS, COLLISION_CATEGORIES } from "../constants";

export class Bullet extends Phaser.Physics.Matter.Sprite
{
  speed: number = PHYSICS.BULLET_SPEED;
  distanceToLive: number = PHYSICS.BULLET_RANGE;
  distanceTraveled: number = 0; // Track total distance traveled

  constructor(scene: GameScene, x: number, y: number, rotation: number) {
    super(scene.matter.world, x, y, 'bullet');
    scene.add.existing(this);

    this.setCircle(PHYSICS.BULLET_HITBOX_RADIUS);
    this.setBounce(PHYSICS.BULLET_BOUNCE);
    this.setRotation(rotation);
    const velocity: Phaser.Math.Vector2 = new Phaser.Math.Vector2(
      this.speed * Math.cos(this.rotation), 
      this.speed * Math.sin(this.rotation));
    this.setVelocity(velocity.x, velocity.y);
  }


  preUpdate(time: number, delta: number)
  {
    // Calculate the distance moved in this frame (in pixels)
    const distanceThisFrame =  this.speed;
    
    // Add to total distance traveled
    this.distanceTraveled += distanceThisFrame;
    
    // Check if we've exceeded the maximum travel distance
    if (this.distanceTraveled >= this.distanceToLive) {
      this.destroy();
    }
  }
}