// 用户消息
export interface UserMessage {
    role: "user"
    content: string
}

// 工具调用
export interface ToolCall {
    id: string
    name: string
    arguments: Record<string, unknown>
}

// 大模型响应消息
export interface AssistantMessage {
    role: "assistant"
    content: string
    toolCalls: ToolCall[]
    stopReason: "stop" | "toolUse" | "error"
    errorMessage?: string
}

// 工具调用结果
export interface ToolResultMessage {
    role: "toolResult"
    toolCallId: string
    toolName: string
    content: string
    isError: boolean
}

// 总共包含3种消息类型
export type Message = UserMessage | AssistantMessage | ToolResultMessage


// 有关工具的定义
export type JsonSchema = {
    type: "object";
    properties?: Record<string, unknown>;
    required?: string[];
};

export interface Tool {
    name: string;
    description: string;
    parameters: JsonSchema;
}



// 模型上下文，主要由3部分组成
export interface Context {
    systemPrompt?: string;
    messages: Message[];
    tools?: Tool[];
}



