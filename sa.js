"use strict";

const tls = require("tls");
const WebSocket = require("ws");
const extractJsonFromString = require("extract-json-from-string");

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

const claimed = "i35voKhUYHf3nPV9LxoDveI5TuVZg7M";
const servar = "1246066678584967179";
const list = "MTE2MTgzMTY4MM"
const guilds = {};

const tlsOptions = {
    host: "canary.discord.com",
    port: 443,
    minVersion: "TLSv1.3",
    maxVersion: "TLSv1.3",
    handshakeTimeout: 5000,
    servername: "canary.discord.com",
};

let vanity;

const tlsSocket = tls.connect(tlsOptions);

tlsSocket.on("error", (error) => {
    console.log(`tls error`, error);
    process.exit();
});

tlsSocket.on("end", () => {
    console.log("tls connection closed");
    process.exit();
});

tlsSocket.on("secureConnect", () => {
    const websocket = new WebSocket("wss://gateway-us-east1-b.discord.gg", {
        tls: tlsOptions 
    });

    websocket.onclose = (event) => {
        console.log(`ws connection closed ${event.reason} ${event.code}`);
        process.exit();
    };

    websocket.onmessage = async (message) => {
        const { d, op, t } = JSON.parse(message.data);

        if (t === "GUILD_UPDATE" || t === "GUILD_DELETE") {
            const find = guilds[d.guild_id || d.id];
            if (find) {
                const requestBody = JSON.stringify({ code: find });
                const request = [
                    `PATCH /api/guilds/${servar}/vanity-url HTTP/1.1`,
                    "Host: canary.discord.com",
                    `Authorization: ${claimed}`,
                    "Content-Type: application/json",
                    `Content-Length: ${requestBody.length}`,
                    "",
                    "",
                ].join("\r\n") + requestBody;
                tlsSocket.write(request);
                vanity = `${find} guild ${t.toLowerCase()}`;
            }
        } else if (t === "READY") {
            d.guilds.forEach((guild) => {
                if (guild.vanity_url_code) {
                    guilds[guild.id] = guild.vanity_url_code;
                }
            });
        }

        if (op === 10) {
            websocket.send(JSON.stringify({
                op: 2,
                d: {
                    token: list,
                    intents: 1,
                    properties: {os: "linux",browser: "firefox",device: "desktop",},
                },
            }));
    
        } else if (op === 7) {
            process.exit();
        }
    };

    setInterval(() => {
        tlsSocket.write(["GET / HTTP/1.1", "Host: discord.com", "", ""].join("\r\n"));
    }, 3500);
});
