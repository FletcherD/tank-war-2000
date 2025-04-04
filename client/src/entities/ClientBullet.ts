import { Bullet } from "../../../shared/objects/Bullet";
import { BulletSchema } from "../../../server/src/schemas/BulletSchema";

export class ClientBullet extends Bullet {
    constructor(scene: Phaser.Scene, x: number, y: number, angle: number) {
        super(scene, x, y, angle);
        this.setDepth(1000);
    }
    
    // Override destroy to show impact animation
    override destroy(fromScene?: boolean): void {
        // Create impact animation
        this.playImpactAnimation();
        
        // Call base class destroy
        super.destroy(fromScene);
    }
    
    // Play a small white circle flash animation at the impact point
    playImpactAnimation(): void {
        const scene = this.scene;
        if (!scene) return;
        
        // Create a white circle at the bullet's current position
        const impact = scene.add.circle(this.x, this.y, 8, 0xffffff, 1);
        impact.setDepth(1001); // Above bullets
        
        // Animate the circle - fade out and grow slightly
        scene.tweens.add({
            targets: impact,
            alpha: 0,
            scale: 1.5,
            duration: 50,
            ease: 'Power2',
            onComplete: () => {
                impact.destroy();
            }
        });
    }
}