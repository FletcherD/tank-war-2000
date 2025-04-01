import Phaser from "phaser";

import { SceneSelector } from "./scenes/SceneSelector";
import { ClientGameScene } from "./scenes/ClientGameScene";

import { BACKEND_HTTP_URL } from "./backend";

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
};

const game = new Phaser.Game(config);
