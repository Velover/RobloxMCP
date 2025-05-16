import React from "@rbxts/react";
import { GreetingUi } from "Features/Greeting/UI/GreetingUi";
import { ConnectionStatusUI } from "Features/Connection/UI/ConnectionStatusUI";

export function App() {
	return (
		<frame Size={UDim2.fromScale(1, 1)} BackgroundColor3={new Color3(1, 1, 1)} BorderSizePixel={0}>
			{/* Main Ui Here  */}
			<GreetingUi />
			
			{/* Connection Status */}
			<ConnectionStatusUI />
		</frame>
	);
}
