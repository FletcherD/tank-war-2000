/**
 * IMPORTANT:
 * ---------
 * Do not manually edit this file if you'd like to use Colyseus Cloud
 *
 * If you're self-hosting (without Colyseus Cloud), you can manually instantiate a
 * Colyseus Server as documented here: 👉 https://docs.colyseus.io/server/api/#constructor-options
 */
import { listen } from "@colyseus/tools";

// imports for headless phaser
import '@geckos.io/phaser-on-nodejs'
import Phaser from 'phaser'

// Import arena config
import appConfig from "./app.config";
import { ServerGameScene } from "./scenes/ServerGameScene";

const config = {
  type: Phaser.HEADLESS,
  width: 1280,
  height: 720,
  banner: false,
  audio: false,
  scene: [ServerGameScene],
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
