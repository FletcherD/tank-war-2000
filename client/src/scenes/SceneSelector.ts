import Phaser from "phaser";

export class SceneSelector extends Phaser.Scene {

    constructor() {
        super({ key: "selector", active: true });
    }

    preload() {
        // update menu background color
        this.cameras.main.setBackgroundColor(0x000000);

        // preload demo assets
        this.load.image('tank', './assets/tank.png');
        this.load.image('tankTreads', './assets/tankTreads.png');
        this.load.image('bullet', './assets/bullet.png');
        this.load.image('crosshair', './assets/crosshair.png');
        
        // Load pillbox sprites (single frame images instead of spritesheet)
        this.load.image('pillbox0', './assets/pillbox0.png');
        this.load.image('pillbox1', './assets/pillbox1.png');
        
        // Load station sprite images
        this.load.image('station0', './assets/station0.png');
        this.load.image('station1', './assets/station1.png');
        
        // Load tileset image, tileset data, and tilemap
        this.load.image('tileset', './assets/tiles/tileset32.png');
        this.load.json('tilesetData', './assets/tiles/tileset.json');
    }

    create() {
        // automatically navigate to hash scene if provided
        if (window.location.hash) {
            this.runScene(window.location.hash.substring(1));
            return;
        }

        this.runScene("game");
    }

    runScene(key: string) {
        this.game.scene.switch("selector", key)
    }

}