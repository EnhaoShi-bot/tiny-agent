import type {Context, AssistantMessage, ToolCall} from "./types"

interface WireToolCall {
    id: string
    type: "function"
    function: {
        name: string
        arguments: string
    }
}

interface WireTool {
    type: "function"
    function: {
        name: string
        description: string
        parameters: { type: "object"; properties?: Record<string, unknown>; required?: string[] }
    }
}


interface WireMessage {
    role: "system" | "user" | "assistant" | "tool"
    content: string
    tool_calls?: WireToolCall[]
    tool_call_id?: string

}


export const convertContext = (ctx: Context) => {
    const messages: WireMessage[] = []

    // 系统提示词放最前面
    if (ctx.systemPrompt) {
        messages.push(
            {"role": "system", "content": ctx.systemPrompt}
        )
    }
    // 放入消息
    for (const mes of ctx.messages) {
        if (mes.role === "user") {
            messages.push(
                {"role": "user", "content": mes.content}
            )
        }
        if (mes.role === "assistant") {
            if (mes.toolCalls.length > 0) {
                messages.push({
                    role: "assistant",
                    content: mes.content,          // 可能是 ""，也要带上
                    tool_calls: mes.toolCalls.map(c => ({
                        id: c.id,
                        type: "function",
                        function: {name: c.name, arguments: JSON.stringify(c.arguments)},
                    })),
                })
            } else {
                messages.push(
                    {"role": "assistant", "content": mes.content}
                )
            }
        }
        if (mes.role === "toolResult") {
            messages.push(
                {"role": "tool", "content": mes.content, "tool_call_id": mes.toolCallId}
            )
        }
    }
    // 返回这个数组（列表）
    if (ctx.tools && ctx.tools.length > 0) {
        return {
            messages,
            tools: ctx.tools.map(t => ({
                type: "function",
                function: {name: t.name, description: t.description, parameters: t.parameters},
            })),
        }
    }
    return {messages}
}

interface WireChatResponse {
    choices: {
        message: { content: string | null; tool_calls?: WireToolCall[] }
        finish_reason: string
    }[]
}


export const convertResponse = (data: unknown): AssistantMessage => {
    const resp = data as WireChatResponse
    // 异常处理
    const choice = resp.choices[0]
    if (!choice) {
        return {
            role: "assistant",
            content: "",
            toolCalls: [],
            stopReason: "error",
            errorMessage: "响应为空（无choices内容）"
        }
    }

    // 解析响应内容
    const content = choice.message.content ?? ""
    const wireToolCalls = choice.message.tool_calls ?? []
    const toolCalls: ToolCall[] = wireToolCalls.map(tool => ({
        id: tool.id,
        name: tool.function.name,
        arguments: JSON.parse(tool.function.arguments) as Record<string, unknown>,
    }))

    // 返回
    return {
        role: "assistant",
        content,
        toolCalls,
        stopReason: toolCalls.length > 0 ? "toolUse" : "stop"
    }

}

export interface GenerateOptions {
    baseUrl: string
    apiKey: string
    model: string
}

export async function generate(ctx: Context, opts: GenerateOptions): Promise<AssistantMessage> {
    const {messages, tools} = convertContext(ctx)

    const body = tools
        ? {model: opts.model, messages, tools}
        : {model: opts.model, messages}
    const url = `${opts.baseUrl}/v1/chat/completions`
    const maxAttempts = 3   // 共尝试 3 次：1 次原始 + 2 次重试

    for (let attempt = 1; ; attempt++) {
        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${opts.apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            })
            const data = await response.json() as Record<string, unknown>

            // 成功：交给 convertResponse
            if (response.ok && data.choices) {
                return convertResponse(data)
            }

            // 失败：判断值不值得重试
            const retryable =
                (response.status === 429 || response.status >= 500)   // 限流/服务器错
                || (response.ok && !data.choices)                     // 200 但坏 body（这次炸你的那种）
            if (retryable && attempt < maxAttempts) {
                console.log(`第 ${attempt} 次失败 (HTTP ${response.status})，1 秒后重试...`)
                await new Promise(r => setTimeout(r, 1000))
                continue
            }
            return {
                role: "assistant", content: "", toolCalls: [],
                stopReason: "error",
                errorMessage: `HTTP ${response.status}: ${JSON.stringify(data).slice(0, 200)}`,
            }
        } catch (e) {
            // 网络层异常（断网、DNS、连接被掐）也按瞬时故障处理
            if (attempt < maxAttempts) {
                console.log(`第 ${attempt} 次网络异常，1 秒后重试...`)
                await new Promise(r => setTimeout(r, 1000))
                continue
            }
            return {role: "assistant", content: "", toolCalls: [], stopReason: "error", errorMessage: String(e)}
        }
    }
}











