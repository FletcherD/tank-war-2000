import { COLLISION_CATEGORIES, PHYSICS } from "../constants";
import { GameScene } from "../scenes/Game";

export class Steel extends Phaser.GameObjects.Container {
  // Steel properties
  public value: number = 0;
  public steelSprite: Phaser.GameObjects.Graphics;

  constructor(scene: GameScene, x: number, y: number, value: number = 10) {
    super(scene as Phaser.Scene, x, y);
    
    this.value = value;
    
    // Create steel visual representation (white circle with size based on value)
    this.steelSprite = scene.add.graphics();
    this.steelSprite.fillStyle(0xFFFFFF, 1);
    
    // Calculate radius based on steel value (min 5, max 15)
    const radius = Math.min(Math.max(5, Math.sqrt(value) * 2), 15);
    this.steelSprite.fillCircle(0, 0, radius);
    
    this.add(this.steelSprite);
    
    // Add the container to the Matter physics system as a sensor
    scene.matter.add.gameObject(this, {
      shape: {
        type: 'circle',
        radius: radius
      },
      isSensor: true,
      friction: 0.0,
      frictionStatic: 0.0,
      frictionAir: 0.0,
      collisionFilter: {
        category: COLLISION_CATEGORIES.PICKUP,
        mask: COLLISION_CATEGORIES.PLAYER
      }
    });
    
    scene.add.existing(this);
  }
  
  pickup() {
    // Base method to be overridden
    console.log("Steel pickup");
  }
}