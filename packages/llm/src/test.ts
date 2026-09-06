// 虽然.env文件在项目根目录，但是执行的时候如果从根目录执行，也可以得到响应，这里是做响应测试的
import "dotenv/config"
import { generate } from "./openai-completions"
import type { Tool } from "./types"

console.log('============= 正在运行 "packages/llm/src/test.ts" =============')

const opts = {
    baseUrl: process.env.BASE_URL ?? "",
    apiKey: process.env.API_KEY ?? "",
    model: process.env.MODEL ?? "",
}

const main = async () => {
    const tools: Tool[] = [{
        name: "get_weather",
        description: "查询指定城市的实时天气",
        parameters: {
            type: "object",
            properties: { city: { type: "string", description: "城市名，如：北京" } },
            required: ["city"],
        },
    }]

    // 第 1 轮：模型决定调工具
    const turn1 = await generate(
        { messages: [{ role: "user", content: "北京今天天气怎么样？必须用工具查询" }], tools },
        opts,
    )
    console.log("第 1 轮:", turn1)

    const call = turn1.toolCalls[0]
    if (!call) {
        console.log("第 1 轮没有工具调用，先检查场景 2")
        return
    }

    // 第 2 轮：回填结果，整个历史再发一次
    const turn2 = await generate(
        {
            messages: [
                { role: "user", content: "北京今天天气怎么样？必须用工具查询" },
                turn1,                                    // assistant 消息原样进历史
                {
                    role: "toolResult",
                    toolCallId: call.id,                  // 和那次调用对上号
                    toolName: "get_weather",
                    content: "晴，气温 25 度，东南风 2 级",
                    isError: false,
                },
            ],
            tools,
        },
        opts,
    )
    console.log("第 2 轮:", turn2)
}

main()
