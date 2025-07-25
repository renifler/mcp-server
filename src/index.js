"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
const RENIFLER_API_BASE = "https://api.renifler.io/v1";
const getConfigValue = (name, fallback) => {
    const commandArg = process.argv.find(arg => arg.startsWith(`--${name}=`));
    if (commandArg)
        return commandArg.split('=')[1];
    if (process.env[name] || process.env[name.toUpperCase()]) {
        return process.env[name] || process.env[name.toUpperCase()];
    }
    return fallback;
};
const RENIFLER_API_KEY = getConfigValue('renifler_api_key');
const server = new mcp_js_1.McpServer({
    name: "@renifler/mcp-server",
    version: "1.0.0",
    capabilities: {
        resources: {},
        tools: {},
    },
});
function callReniflerApi(endpoint_1, apiKey_1) {
    return __awaiter(this, arguments, void 0, function* (endpoint, apiKey, method = "POST", body) {
        const url = `${RENIFLER_API_BASE}${endpoint}`;
        const options = {
            method,
            headers: {
                "Content-Type": "application/json",
                "X-API-Key": apiKey,
            },
        };
        if (body)
            options.body = JSON.stringify(body);
        const response = yield fetch(url, options);
        if (!response.ok) {
            throw new Error(`Renifler API error: ${response.status} ${response.statusText}`);
        }
        return yield response.json();
    });
}
// server.registerTool(
//     "scan-and-stream",
//     {
//         title: "Start a Renifler.io scan and forward the SSE to MCP",
//         description: "Starts a scan and then forwards the scan's SSE stream in real time.",
//         inputSchema: { url: z.string().url() },
//         streaming: true
//     } as any,
//     async function (
//         this: any,
//         args: any,
//         extra: any,
//         stream?: { send: (data: any) => void }
//     ) {
//         if (!stream) {
//             return { content: [{ type: "text", text: "Streaming not supported on this MCP transport." }] };
//         }
//         // 1. Start the scan
//         const scanResp = await fetch(`${RENIFLER_API_BASE}/scan`, {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json",
//                 "X-API-Key": RENIFLER_API_KEY ?? "",
//             },
//             body: JSON.stringify({ url: args.url }),
//         });
//         if (!scanResp.ok) throw new Error("Error starting scan");
//         const scanData = await scanResp.json();
//         const scanId = scanData.scanId || scanData.id;
//
//         // 2. Stream SSE
//         const sseResp = await fetch(`${RENIFLER_API_BASE}/scan/${scanId}/stream`, {
//             headers: { "X-API-Key": RENIFLER_API_KEY ?? "" },
//         });
//         if (!sseResp.body) throw new Error("No SSE stream available");
//
//         const reader = sseResp.body.getReader();
//         const decoder = new TextDecoder();
//         while (true) {
//             const { value, done } = await reader.read();
//             if (done) break;
//             const chunk = decoder.decode(value);
//             stream.send({ content: [{ type: "text", text: chunk }] });
//         }
//         return { content: [{ type: "text", text: "End of stream" }] };
//     }
// );
server.registerTool("get-technologies", {
    title: "Get detected technologies for a URL",
    description: "Performs a GET on the Renifler API to obtain the technologies of a website. Also displays the Lighthouse score.",
    inputSchema: {
        url: zod_1.z.string().url(),
        apiKey: zod_1.z.string().optional()
    }
}, (args) => __awaiter(void 0, void 0, void 0, function* () {
    let urlStripped = args.url.replace(/^https?:\/\//, "");
    const urlParam = encodeURIComponent(urlStripped);
    const apiKey = args.apiKey || RENIFLER_API_KEY;
    if (!apiKey) {
        return { content: [{ type: "text", text: "No Renifler.io API key provided. Add it via the 'apiKey' parameter or the RENIFLER_API_KEY environment variable." }] };
    }
    const resp = yield fetch(`${RENIFLER_API_BASE}/get/${urlParam}`, {
        method: "GET",
        headers: {
            "X-API-Key": apiKey,
        },
    });
    if (!resp.ok) {
        return { content: [{ type: "text", text: `Renifler error: ${resp.status} ${resp.statusText}` }] };
    }
    const data = yield resp.json();
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}));
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        if (RENIFLER_API_KEY) {
            console.error("Renifler.io API key configured.");
        }
        else {
            console.error("No Renifler.io API key configured, it must be provided with each request.");
        }
        const transport = new stdio_js_1.StdioServerTransport();
        yield server.connect(transport);
        console.error("Renifler.io MCP Server running on stdio");
    });
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
