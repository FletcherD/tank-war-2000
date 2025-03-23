
export class Bullet extends Phaser.Physics.Matter.Sprite
{
  speed: number = 10; // Units per msec
  distanceToLive: number = 256; // Total distance in pixels
  distanceTraveled: number = 0; // Track total distance traveled

  constructor(scene: GameScene, x: number, y: number, rotation: number) {
    super(scene.matter.world, x, y, 'bullet');
    scene.add.existing(this);

    this.setCircle(1);
    this.setBounce(1);
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