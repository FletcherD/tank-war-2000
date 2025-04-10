import Phaser from "phaser";

import { SceneSelector } from "./scenes/SceneSelector";
import { ClientGameScene } from "./scenes/ClientGameScene";

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    fps: {
        target: 60,
        forceSetTimeOut: true,
        smoothStep: false,
    },
    width: "100%",
    height: "100%",
    // height: 200,
    backgroundColor: '#000000',
    parent: 'phaser-example',
    physics: {
        default: "matter",
        matter: {
            debug: false,
            gravity: { x: 0, y: 0 }
        }
    },
    pixelArt: true,
    scene: [SceneSelector, ClientGameScene],
    scale: {
        mode: Phaser.Scale.NONE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        zoom: window.devicePixelRatio
    }
};

const game = new Phaser.Game(config);

// Handle window resize to update UI
window.addEventListener('resize', () => {
    if (game.scale) {
        const scaleFactor = window.devicePixelRatio;
        game.scale.resize(window.innerWidth * scaleFactor, window.innerHeight * scaleFactor);
        game.scale.setZoom(1/window.devicePixelRatio);
    }
});

const scaleFactor = window.devicePixelRatio;
game.scale.resize(window.innerWidth * scaleFactor, window.innerHeight * scaleFactor);
game.scale.setZoom(1/window.devicePixelRatio);
/**
 * Create FPS selector
 */
