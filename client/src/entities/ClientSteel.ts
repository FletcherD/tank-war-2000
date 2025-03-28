import { Steel } from "../../../shared/objects/Steel";
import { ClientGameScene } from "../scenes/ClientGameScene";

export class ClientSteel extends Steel {
  id: string;
  
  constructor(scene: ClientGameScene, x: number, y: number, value: number, id: string) {
    super(scene, x, y, value);
    this.id = id;
  }
  
  updateFromServer(data: any): void {
    this.x = data.x;
    this.y = data.y;
    this.value = data.value;
    
    // Update the visual representation if value changed
    if (this.value !== data.value) {
      this.steelSprite.clear();
      this.steelSprite.fillStyle(0xFFFFFF, 1);
      
      // Calculate radius based on steel value (min 5, max 15)
      const radius = Math.min(Math.max(5, Math.sqrt(this.value) * 2), 15);
      this.steelSprite.fillCircle(0, 0, radius);
    }
  }
  
  override pickup(): void {
    // Client-side pickup effect (animation, sound, etc.)
    const scene = this.scene as ClientGameScene;
    
    // Simple flash effect
    scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        this.destroy();
      }
    });
  }
}