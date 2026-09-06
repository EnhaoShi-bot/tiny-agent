import "dotenv/config"
import {runAgent, createModel} from "@tinyagent/agent-loop"
import {tools} from "./tools"

const systemPrompt = `你是 TinyAgent，一个运行在用户本地电脑上的助手，可以读写文件、执行命令。
规则：
- 文件路径使用绝对路径，或相对于当前工作目录的相对路径
- 修改已有文件前，先用 read_file 查看现有内容
- 命令在 Windows 的 cmd 下执行
- 完成任务后，用简洁的中文总结你做了什么`

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