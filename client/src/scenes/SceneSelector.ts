import Phaser from "phaser";

export class SceneSelector extends Phaser.Scene {

    constructor() {
        super({ key: "selector", active: true });
    }

    preload() {
        // update menu background color
        this.cameras.main.setBackgroundColor(0x000000);

        // preload demo assets
        this.load.image('tank', '../assets/tank.png');
        this.load.image('bullet', '../assets/bullet.png');
        
        // Load tileset image, tileset data, and tilemap
        this.load.image('tileset', '../assets/tiles/tileset.png');
        this.load.json('mapData', '../assets/maps/Duff Gardens.json');
        this.load.json('tilesetData', '../assets/tiles/tileset.json');
    }

    create() {
        // automatically navigate to hash scene if provided
        if (window.location.hash) {
            this.runScene(window.location.hash.substring(1));
            return;
        }

        const textStyle: Phaser.Types.GameObjects.Text.TextStyle = {
            color: "#ff0000",
            fontSize: "32px",
            // fontSize: "24px",
            fontFamily: "Arial"
        };


        this.add.text(130, 150 + 70 * 0, `Start`, textStyle)
            .setInteractive()
            .setPadding(6)
            .on("pointerdown", () => {
                this.runScene("game");
            });
    }

    runScene(key: string) {
        this.game.scene.switch("selector", key)
    }

}