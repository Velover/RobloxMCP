import { useFlameworkDependency } from "@rbxts/flamework-react-utils";
import { useAtom } from "@rbxts/react-charm";
import React from "@rbxts/react";
import { ConnectionController } from "../Controllers/ConnectionController";
import { GuiResources } from "Features/PluginUI/Resources/GuiResources";

export function ConnectionStatusUI() {
	const connectionController = useFlameworkDependency<ConnectionController>();
	const connectionState = useAtom(connectionController.GetConnectionStateAtom());

	// Determine color based on connection state
	let statusColor = new Color3(1, 0, 0); // Red for disconnected
	let statusText = "Disconnected";

	if (connectionState === ConnectionController.EConnectionState.CONNECTED) {
		statusColor = new Color3(0, 1, 0); // Green for connected
		statusText = "Connected";
	} else if (connectionState === ConnectionController.EConnectionState.CONNECTING) {
		statusColor = new Color3(1, 1, 0); // Yellow for connecting
		statusText = "Connecting...";
	}

	return (
		<frame
			BackgroundTransparency={1}
			Size={UDim2.fromScale(1, 0.05)}
			Position={UDim2.fromScale(0, 0.95)}
			AnchorPoint={new Vector2(0, 0)}
		>
			<uilistlayout
				FillDirection={Enum.FillDirection.Horizontal}
				HorizontalAlignment={Enum.HorizontalAlignment.Right}
				VerticalAlignment={Enum.VerticalAlignment.Center}
				Padding={new UDim(0, 5)}
			/>

			<textlabel
				Text="MCP Server:"
				TextColor3={new Color3(0, 0, 0)}
				FontFace={GuiResources.FONT_REGULAR}
				TextSize={14}
				Size={UDim2.fromOffset(80, 20)}
				BackgroundTransparency={1}
			/>

			<frame
				Size={UDim2.fromOffset(100, 20)}
				BackgroundColor3={new Color3(1, 1, 1)}
				BorderSizePixel={0}
			>
				<uicorner CornerRadius={new UDim(0, 4)} />
				<uistroke Color={new Color3(0.8, 0.8, 0.8)} Thickness={1} />
				<textlabel
					Text={statusText}
					TextColor3={statusColor}
					FontFace={GuiResources.FONT_BOLD}
					TextSize={14}
					Size={UDim2.fromScale(1, 1)}
					BackgroundTransparency={1}
				/>
			</frame>

			<frame Size={UDim2.fromOffset(10, 0)} BackgroundTransparency={1} />
		</frame>
	);
}
