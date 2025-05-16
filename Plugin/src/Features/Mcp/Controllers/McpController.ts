import { OnStart } from "@flamework/core";
import { ConnectionController } from "Features/Connection/Controllers/ConnectionController";
import { Controller } from "FlameworkIntegration";
import { HandleExecuteScript } from "../Commands/ExecuteScript";

@Controller({})
export class McpController implements OnStart {
	constructor(private readonly connectionController: ConnectionController) {}
	onStart(): void {
		this.connectionController.RegisterCommandHandler("execute_script", HandleExecuteScript);
	}
}
