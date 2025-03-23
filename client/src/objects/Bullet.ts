
export class Bullet extends Phaser.Physics.Matter.Sprite
{
  speed: number = 10;
  distanceToLive: number = 4096;

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
    this.distanceToLive -= delta * this.speed;
    if (this.distanceToLive <= 0) {
      this.destroy();
    }
  }
}