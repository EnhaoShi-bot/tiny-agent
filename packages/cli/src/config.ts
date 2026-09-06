import "dotenv/config"
import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs"
import {homedir} from "node:os"
import {join} from "node:path"
import {createInterface} from "node:readline"

export interface Config {
    baseUrl: string
    apiKey: string
    model: string
}

const configDir = join(homedir(), ".tinyagent")
const configPath = join(configDir, "config.json")

// 第 1 优先：环境变量（开发时的 .env 也走这条路；CI 里也方便）
const fromEnv = (): Config | undefined => {
    const {BASE_URL, API_KEY, MODEL} = process.env
    if (!BASE_URL || !API_KEY || !MODEL) return undefined
    return {baseUrl: BASE_URL, apiKey: API_KEY, model: MODEL}
}

// 第 3 优先：首次运行，问答式引导并保存
const firstRunPrompt = async (): Promise<Config> => {
    console.log(`首次运行 TinyAgent，需要配置模型接口。配置将保存在 ${configPath}（之后可直接手改这个文件）\n`)
    const rl = createInterface({input: process.stdin, output: process.stdout})
    const question = (q: string) => new Promise<string>(resolve => rl.question(q, resolve))

    const baseUrl = (await question("BASE_URL（接口地址，例如 https://api.z.ai）: ")).trim()
    const apiKey = (await question("API_KEY（你的密钥）: ")).trim()
    const model = (await question("MODEL（模型名，例如 glm-4.8）: ")).trim()
    rl.close()

    const config: Config = {baseUrl, apiKey, model}
    mkdirSync(configDir, {recursive: true})
    writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8")
    console.log("\n配置已保存。\n")
    return config
}

export const loadConfig = async (): Promise<Config> => {
    const env = fromEnv()
    if (env) return env
    // 第 2 优先：配置文件
    if (existsSync(configPath)) {
        return JSON.parse(readFileSync(configPath, "utf-8")) as Config
    }
    return firstRunPrompt()
}