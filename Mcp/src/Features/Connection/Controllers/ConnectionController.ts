import { Controller, OnStart } from "app-leaf";

@Controller()
export class ConnectionController {
  private static readonly KEEP_ALIVE_ENDPOINT = "/keep-alive";
  private static readonly KEEP_ALIVE_LIFETIME_MS = 5000;

  private static readonly GET_COMMANDS_ENDPOINT = "/get-commands";
  private static readonly SUMBIT_COMMANDS_ENDPOINT = "/submit-commands";

  @OnStart()
  private Start() {}
}
