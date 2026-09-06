import "dotenv/config"
import {runAgent, createModel} from "@tinyagent/agent-loop"
import {tools, systemPrompt} from "./index"

const model = createModel({
    baseUrl: process.env.BASE_URL ?? "",
    apiKey: process.env.API_KEY ?? "",
    model: process.env.MODEL ?? "",
})

const main = async () => {
    const result = await runAgent(
        [{role: "user", content: "帮我在 tmp-test 目录下创建 notes.md，写三条合理的待办事项，然后读回文件确认写入成功。"}], // 这里必须要接受的是message列表的输入才行
        {
            model,
            tools,
            systemPrompt,
            maxTurns: 10,
            onEvent: (e) => {
                if (e.type === "messageStart") console.log(`>> 第 ${e.turn} 轮，模型思考中`)
                if (e.type === "toolStart") console.log(`>> 调用工具 ${e.toolName}`, JSON.stringify(e.args))
                if (e.type === "toolEnd") console.log(`>> 工具返回${e.isError ? "(失败)" : ""}:`, e.content.slice(0, 50))
                if (e.type === "agentEnd") console.log(`>> 结束，共 ${e.turns} 轮`)
            },
        },
    )

    // 打印循环轨迹，看模型每一轮在干什么
    for (const m of result.messages) {
        if (m.role === "assistant" && m.toolCalls.length > 0) {
            console.log("[模型] 调用工具:", m.toolCalls.map(c => c.name).join(", "))
        } else if (m.role === "toolResult") {
            console.log("[工具]", m.toolName, m.isError ? "失败" : "成功", "-", m.content.slice(0, 60))
        }
    }
    console.log("—— 最终回答 ——")
    console.log(result.output)
    console.log("—— 轮数:", result.turns, "消息数:", result.messages.length)
}

main()