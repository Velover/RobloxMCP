import { Controller, OnStart } from "app-leaf";
import { Config } from "../../../Core/Config";

@Controller()
export class ConnectionController {
  private static readonly KEEP_ALIVE_LIFETIME_MS = 5000;

  private static readonly KEEP_ALIVE_ENDPOINT = "/keep-alive";
  private static readonly GET_COMMANDS_ENDPOINT = "/get-commands";
  private static readonly SUBMIT_COMMANDS_ENDPOINT = "/submit-commands";

  @OnStart()
  private Start() {
    Bun.serve({
      port: Config.PORT,
      routes: {
        [ConnectionController.KEEP_ALIVE_ENDPOINT]: {
          POST: this.HandleKeepAlive.bind(this),
        },
        [ConnectionController.GET_COMMANDS_ENDPOINT]: {
          POST: this.HandleGetCommands.bind(this),
        },
        [ConnectionController.SUBMIT_COMMANDS_ENDPOINT]: {
          POST: this.HandleSubmitCommands.bind(this),
        },
      },
    });
  }

  private HandleKeepAlive() {
    // Handle keep-alive request
    return new Response("Keep-alive response");
  }

  private HandleGetCommands() {
    // Handle get-commands request
    return new Response("Get-commands response");
  }

  private HandleSubmitCommands() {
    // Handle submit-commands request
    return new Response("Submit-commands response");
  }
}

export namespace ConnectionController {
  export const enum EConnectionState {
    CONNECTED,
    CONNECTING,
    DISCONNECTED,
  }
}
