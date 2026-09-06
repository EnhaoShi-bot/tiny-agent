import type {Message, ToolResultMessage} from "@tinyagent/llm"
import type {AgentResult, RunAgentOptions} from "./types"

export async function runAgent(input: Message[], options: RunAgentOptions): Promise<AgentResult> {
    const {model, tools, systemPrompt, onEvent} = options
    const maxTurns = options.maxTurns ?? 10
    const messages: Message[] = [...input]
    let turns = 0

    while (true) {
        if (turns >= maxTurns) {
            onEvent?.({type: "agentEnd", output: "达到最大轮次数", turns})
            return {output: "达到最大轮次数", messages, turns}
        }
        turns++
        onEvent?.({type: "messageStart", turn: turns})
        const context = systemPrompt ? {systemPrompt, messages, tools} : {messages, tools}
        const assistMes = await model.generate(context)
        messages.push(assistMes)

        if (assistMes.stopReason !== "toolUse" || assistMes.toolCalls.length === 0) {
            if (assistMes.stopReason === "error") {
                console.log("模型调用失败: " + assistMes.errorMessage)
            }
            onEvent?.({type: "agentEnd", output: assistMes.content, turns})
            return {output: assistMes.content, messages, turns}
        }

        for (const call of assistMes.toolCalls) {
            onEvent?.({type: "toolStart", turn: turns, toolCallId: call.id, toolName: call.name, args: call.arguments})
            const tool = tools.find(t => t.name === call.name)
            if (!tool) {
                const errorRes: ToolResultMessage = {
                    role: "toolResult",
                    toolCallId: call.id,
                    toolName: call.name,
                    isError: true,
                    content: `工具${call.name}不存在`
                }
                messages.push(errorRes)
                onEvent?.({
                    type: "toolEnd",
                    turn: turns,
                    toolCallId: call.id,
                    toolName: call.name,
                    isError: true,
                    content: errorRes.content
                })
            } else {
                try {
                    const result = await tool.execute(call.arguments)
                    const successRes: ToolResultMessage = {
                        role: "toolResult",
                        toolCallId: call.id,
                        toolName: call.name,
                        isError: false,
                        content: String(result)
                    }
                    messages.push(successRes)
                    onEvent?.({
                        type: "toolEnd",
                        turn: turns,
                        toolCallId: call.id,
                        toolName: call.name,
                        isError: false,
                        content: successRes.content
                    })
                } catch (error) {
                    const errorRes: ToolResultMessage = {
                        role: "toolResult",
                        toolCallId: call.id,
                        toolName: call.name,
                        isError: true,
                        content: String(error)
                    }
                    messages.push(errorRes)
                    onEvent?.({
                        type: "toolEnd",
                        turn: turns,
                        toolCallId: call.id,
                        toolName: call.name,
                        isError: true,
                        content: errorRes.content
                    })
                }
            }
        }
    }
}