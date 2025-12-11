import type WebSocket from "ws";

export const activeStreams = new Map<string, WebSocket>();
