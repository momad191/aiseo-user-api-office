"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userCache = void 0;
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const body_parser_1 = __importDefault(require("body-parser"));
const helmet_1 = __importDefault(require("helmet"));
const LRUCache_1 = require("./utils/LRUCache");
// Create cache: 100 entries max, TTL 60s
exports.userCache = new LRUCache_1.LRUCache(100, 60);
function createApp() {
    const app = (0, express_1.default)();
    // security headers
    app.use((0, helmet_1.default)());
    // CORS - in prod tighten this up to allowed origins
    app.use((0, cors_1.default)({
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
    }));
    // body parsing
    app.use(body_parser_1.default.json({ limit: '1mb' }));
    app.use(body_parser_1.default.urlencoded({ extended: true }));
    //  request logger 
    app.use((req, _res, next) => {
        console.log(`${new Date().toISOString()} — ${req.method} ${req.originalUrl}`);
        next();
    });
    // health check
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok', timestamp: Date.now() });
    });
    app.get('/cache-status', (_req, res) => {
        res.json(exports.userCache.stats());
    });
    app.delete('/cache', (_req, res) => {
        exports.userCache.clear();
        res.json({ message: 'Cache cleared' });
    });
    return app;
}
