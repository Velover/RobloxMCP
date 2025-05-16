export namespace ConnectionResources {
  export const CLEANUP_INTERVAL_MS = 10000;
  export const MAX_REQUEST_TIME_MS = 30000;
  export const MAX_RESPONSE_LIFETIME_MS = 5 * 60 * 1000;
  export const KEEP_ALIVE_LIFETIME_MS = 5000;

  export const KEEP_ALIVE_ENDPOINT = "/keep-alive";
  export const GET_COMMANDS_ENDPOINT = "/get-commands";
  export const SUBMIT_COMMANDS_ENDPOINT = "/submit-commands";

  export type StringId = string;
  export const enum EConnectionState {
    CONNECTED,
    CONNECTING,
    DISCONNECTED,
  }
}
