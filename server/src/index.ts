/**
 * IMPORTANT:
 * ---------
 * Do not manually edit this file if you'd like to use Colyseus Cloud
 *
 * If you're self-hosting (without Colyseus Cloud), you can manually instantiate a
 * Colyseus Server as documented here: 👉 https://docs.colyseus.io/server/api/#constructor-options
 */
import { listen } from "@colyseus/tools";

// Import arena config
import appConfig from "./app.config";


// imports for  phaser
require('@geckos.io/phaser-on-nodejs')
const { SnapshotInterpolation } = require('@geckos.io/snapshot-interpolation')
const SI = new SnapshotInterpolation()
const Phaser = require('phaser')


class ServerScene extends Phaser.Scene {
  constructor() {
    super()
    this.tick = 0
  }

  create() {
    console.log("ServerScene created");
  }

  update() {
    this.tick++
  }
}

const config = {
  type: Phaser.HEADLESS,
  width: 1280,
  height: 720,
  banner: false,
  audio: false,
  scene: [ServerScene],
  physics: {
      default: "matter",
      matter: {
          debug: true,
          gravity: { y: 0 }
      }
  },
}

new Phaser.Game(config)

// Create and listen on 2567 (or PORT environment variable.)
listen(appConfig);
