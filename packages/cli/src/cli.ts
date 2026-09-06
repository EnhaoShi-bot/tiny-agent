#!/usr/bin/env node
import {createInterface} from "node:readline"
import {runAgent, createModel} from "@tinyagent/agent-loop"
import type {Message} from "@tinyagent/llm"
import {tools, systemPrompt} from "@tinyagent/assistant"
import {loadConfig} from "./config"

const main = async () => {
    const config = await loadConfig()
    const model = createModel(config)

    const rl = createInterface({input: process.stdin, output: process.stdout})
    let history: Message[] = []

    const ask = () => {
        rl.question("你> ", async (input) => {
            const text = input.trim()
            if (text === "") {
                ask();
                return
            }
            if (text === "exit" || text === "quit") {
                rl.close();
                return
            }
            history.push({role: "user", content: text})
            const result = await runAgent(history, {
                model, tools, systemPrompt, maxTurns: 10,
                onEvent: (e) => {
                    if (e.type === "messageStart") console.log("  (思考中...)")
                    if (e.type === "toolStart") console.log(`  [${e.toolName}]`, JSON.stringify(e.args).slice(0, 100))
                    if (e.type === "toolEnd") console.log(`  [${e.toolName} ${e.isError ? "失败" : "完成"}]`)
                },
            })
            history = result.messages
            console.log("TinyAgent>", result.output, "\n")
            ask()
        })
    }
    ask()
    rl.on("close", () => {
        console.log("\n再见");
        process.exit(0)
    })
}

main()