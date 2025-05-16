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
}
