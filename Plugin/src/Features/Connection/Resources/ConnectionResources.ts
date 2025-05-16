export namespace ConnectionResources {
	// Base URL for MCP server
	export const BASE_URL = "http://localhost:8695";

	// Endpoints
	export const KEEP_ALIVE_ENDPOINT = "/keep-alive";
	export const GET_COMMANDS_ENDPOINT = "/get-commands";
	export const SUBMIT_COMMANDS_ENDPOINT = "/submit-commands";

	// Intervals in seconds
	export const KEEP_ALIVE_INTERVAL = 4; // Send keep-alive every 4 seconds
	export const FETCH_COMMANDS_INTERVAL = 1; // Fetch commands every 1 second

	export const enum EConnectionState {
		CONNECTED,
		CONNECTING,
		DISCONNECTED,
	}

	// UI Text
	export const UI_CONNECT_BUTTON_TEXT = "Connect";
	export const UI_DISCONNECT_BUTTON_TEXT = "Disconnect";
	export const UI_CONNECTING_TEXT = "Connecting...";
	export const UI_CONNECTED_TEXT = "Connected";
	export const UI_DISCONNECTED_TEXT = "Disconnected";

	// UI Colors
	export const UI_COLOR_CONNECTED = new Color3(0, 1, 0); // Green
	export const UI_COLOR_CONNECTING = new Color3(1, 0.8, 0); // Orange
	export const UI_COLOR_DISCONNECTED = new Color3(1, 0, 0); // Red

	// UI Button colors
	export const UI_BUTTON_CONNECT_COLOR = new Color3(0.2, 0.6, 0.2);
	export const UI_BUTTON_DISCONNECT_COLOR = new Color3(0.8, 0.2, 0.2);
}
