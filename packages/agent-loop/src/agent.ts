import type {Message, ToolResultMessage} from "@tinyagent/llm"
import type {AgentResult, RunAgentOptions} from "./types"

export async function runAgent(input: string, options: RunAgentOptions): Promise<AgentResult> {
    const {model, tools, systemPrompt} = options
    const maxTurns = options.maxTurns ?? 10
    const messages: Message[] = [{role: "user", content: input}]
    let turns = 0

    // 这里就是最核心的agent-loop部分
    while (true) {
        // 第一步，轮数守卫
        if (turns >= maxTurns) {
            return {
                output: "达到最大轮次数",
                messages: messages,
                turns: turns
            }
        }
        // 第二步：更新轮数，组装输入
        turns++
        const context = systemPrompt ? {systemPrompt, messages, tools} : {messages, tools}
        const assistMes = await model.generate(context)
        messages.push(assistMes)

        // 第三步：退出条件判断(没有调用工具就是结束了)
        if (assistMes.stopReason !== "toolUse" || assistMes.toolCalls.length === 0) {
            if (assistMes.stopReason === "error") {
                console.log("模型调用失败: " + assistMes.errorMessage)
            }
            return {
                output: assistMes.content,
                messages: messages,
                turns: turns
            }
        }

        // 第四步：执行toolCalls，可能存在并行调用了多个工具
        for (const call of assistMes.toolCalls) {
            const tool = tools.find(t => t.name === call.name)
            // 检查工具列表
            if (!tool) {
                const errorRes: ToolResultMessage = {
                    role: "toolResult",
                    toolCallId: call.id,
                    toolName: call.name,
                    isError: true,
                    content: `工具${call.name}不存在`
                }
                messages.push(errorRes) //这里不return，而是把错误信息塞给agent的上下文中，进入下一轮
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
                } catch (error) {
                    const errorRes: ToolResultMessage = {
                        role: "toolResult",
                        toolCallId: call.id,
                        toolName: call.name,
                        isError: true,
                        content: String(error)
                    }
                    messages.push(errorRes)
                }
            }


        }

    }
}