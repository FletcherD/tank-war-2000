import Phaser from "phaser";
import { PHYSICS } from "../../../shared/constants";

export class SceneSelector extends Phaser.Scene {

    constructor() {
        super({ key: "selector", active: true });
    }

    preload() {
        // update menu background color
        this.cameras.main.setBackgroundColor(0x000000);

        // preload demo assets
        this.load.image('tank', './assets/'+PHYSICS.TILE_SIZE+'/tank.png');
        this.load.image('tankTreads', './assets/'+PHYSICS.TILE_SIZE+'/tankTreads.png');
        this.load.image('bullet', './assets/'+PHYSICS.TILE_SIZE+'/bullet.png');
        this.load.image('crosshair', './assets/'+PHYSICS.TILE_SIZE+'/crosshair.png');
        
        // Load pillbox sprites (single frame images instead of spritesheet)
        this.load.image('pillbox0', './assets/'+PHYSICS.TILE_SIZE+'/pillbox0.png');
        this.load.image('pillbox1', './assets/'+PHYSICS.TILE_SIZE+'/pillbox1.png');
        
        // Load station sprite images
        this.load.image('station0', './assets/'+PHYSICS.TILE_SIZE+'/station0.png');
        this.load.image('station1', './assets/'+PHYSICS.TILE_SIZE+'/station1.png');
        
        // Load tileset image, tileset data, and tilemap
        this.load.image('tileset', './assets/tiles/tileset'+PHYSICS.TILE_SIZE+'.png');
        this.load.json('tilesetData', './assets/tiles/tileset'+PHYSICS.TILE_SIZE+'.json');
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