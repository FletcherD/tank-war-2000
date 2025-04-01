import config from "@colyseus/tools";
import { Server } from "@colyseus/core";
import { monitor } from "@colyseus/monitor";
import { playground } from "@colyseus/playground";


import '@geckos.io/phaser-on-nodejs'
import Phaser from 'phaser'
/**
 * Import your Room files
 */
import { GameRoom } from "./rooms/GameRoom";
import { ServerGameScene } from "./scenes/ServerGameScene";

let gameServerRef: Server;
let latencySimulationMs: number = 0;

const defaultConfig = {
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

export default config({
    options: {
        // devMode: true,
    },

    initializeGameServer: (gameServer) => {
        /**
         * Define your room handlers:
         */
        gameServer.define('game', GameRoom);

        //
        // keep gameServer reference, so we can
        // call `.simulateLatency()` later through an http route
        //
        gameServerRef = gameServer;
    },

    initializeExpress: (app) => {
        /**
         * Bind your custom express routes here:
         */
        app.get("/hello", (req, res) => {
            res.send("It's time to kick ass and chew bubblegum!");
        });

        // these latency methods are for development purpose only.
        app.get("/latency", (req: any, res: any) => res.json(latencySimulationMs));
        app.get("/simulate-latency/:milliseconds", (req: any, res: any) => {
            latencySimulationMs = parseInt(req.params.milliseconds || "100");

            // enable latency simulation
            gameServerRef.simulateLatency(latencySimulationMs);

            res.json({ success: true });
        });

        if (process.env.NODE_ENV !== "production") {
            app.use("/", playground());
        }

        /**
         * Bind @colyseus/monitor
         * It is recommended to protect this route with a password.
         * Read more: https://docs.colyseus.io/tools/monitor/
         */
        app.use("/colyseus", monitor());
    },


    beforeListen: () => {
        /**
         * Before before gameServer.listen() is called.
         */
    }
});
