import { Module } from "app-leaf";
import { McpController } from "./Controllers/McpController";

@Module([McpController])
export class McpModule {}
