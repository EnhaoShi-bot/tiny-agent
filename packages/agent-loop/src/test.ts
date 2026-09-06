import "dotenv/config"
import { runAgent } from "./agent"
import { createModel } from "./model"
import type { Tool } from "./types"

const getWeather: Tool = {
    name: "get_weather",
    description: "查询指定城市的实时天气",
    parameters: {
        type: "object",
        properties: { city: { type: "string", description: "城市名" } },
        required: ["city"],
    },
    execute: async (args) => `${args.city}今天晴，气温 25 度`,
}

const model = createModel({
    baseUrl: process.env.BASE_URL ?? "",
    apiKey: process.env.API_KEY ?? "",
    model: process.env.MODEL ?? "",
})

const main = async () => {
    const result = await runAgent(
        "北京和上海今天天气怎么样？分别查询后对比总结。",
        { model, tools: [getWeather], maxTurns: 10 },
    )
    console.log("—— 最终回答 ——")
    console.log(result.output)
    console.log("—— 轮数:", result.turns, "消息数:", result.messages.length)
}

main()