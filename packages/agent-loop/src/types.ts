import type {AssistantMessage, Message, ToolResultMessage, Tool as ToolDefinition} from "@tinyagent/llm"

// 工具 = 定义（发给模型看的：名字/描述/参数表）+ 执行（只有 agent 知道）
export interface Tool extends ToolDefinition {
    execute: (args: Record<string, unknown>) => string | Promise<string>
}

// agent 只认这个接口，不认 llm 的具体实现 —— 测试时可以塞假模型
export interface Model {
    generate: (input: {
        systemPrompt?: string
        messages: Message[]
        tools?: ToolDefinition[]
    }) => Promise<AssistantMessage>
}

export interface AgentResult {
    output: string      // 最后一条 assistant 的文本
    messages: Message[] // 完整历史，调用方可以拿去继续对话
    turns: number       // 循环转了几圈
}

export interface RunAgentOptions {
    model: Model
    tools: Tool[]
    systemPrompt?: string
    maxTurns?: number
    onEvent?: (event: AgentEvent) => void
}


export type AgentEvent =
    | { type: "agentStart" }
    | { type: "agentEnd"; output: string; turns: number }
    | { type: "turnStart"; turn: number }
    | { type: "turnEnd"; turn: number; message: AssistantMessage; toolResults: ToolResultMessage[] }
    | { type: "messageStart"; turn: number }
    | { type: "messageEnd"; turn: number; message: AssistantMessage }
    | { type: "toolStart"; turn: number; toolCallId: string; toolName: string; args: Record<string, unknown> }
    | { type: "toolEnd"; turn: number; toolCallId: string; toolName: string; isError: boolean; content: string }