interface IIncommingData {
	code: string;
}
interface IOutgoingData {
	output: unknown;
	logs: string[];
}

declare function loadstring(code: string): () => unknown;
export async function HandleExecuteScript(data: IIncommingData): Promise<IOutgoingData> {
	const logs: string[] = [];
	let output: unknown = undefined;

	try {
		const chunk = loadstring(data.code);
		const env = getfenv(chunk as never) as Record<string, unknown>;
		env["print"] = (...args: defined[]) => {
			logs.push(`[Print] ${args.join(" ")}`);
			print(...args);
		};
		env["warn"] = (...args: defined[]) => {
			logs.push(`[Warn] ${args.join(" ")}`);
			warn(...args);
		};
		env["error"] = (...args: defined[]) => {
			logs.push(`[Error] ${args.join(" ")}`);
			error(...args);
		};

		output = [chunk()];
	} catch (error) {
		logs.push(`Error during execution: ${error}`);
	}

	return {
		output,
		logs,
	};
}
