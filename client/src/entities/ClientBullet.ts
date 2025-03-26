import { Bullet } from "../../../shared/objects/Bullet";
import { BulletSchema } from "../../../server/src/schemas/BulletSchema";

export class ClientBullet extends Bullet {
    constructor(scene: Phaser.Scene, x: number, y: number, angle: number) {
        super(scene, x, y, angle);
    }
}