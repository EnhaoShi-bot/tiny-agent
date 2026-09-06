import {readFile, writeFile, mkdir} from "node:fs/promises"
import {truncateOutput} from "./truncate"
import type {Tool} from "@tinyagent/agent-loop"
import {dirname} from "node:path"
import {exec} from "node:child_process"
import {promisify} from "node:util"

const execAsync = promisify(exec)

const readFileTool: Tool = {
    name: "read_file",
    description: "读取本地文件的文本内容。path 为文件路径，可以是绝对路径，也可以是相对于当前工作目录的相对路径。",
    parameters: {
        type: "object",
        properties: {
            path: {type: "string", description: "要读取的文件路径"},
        },
        required: ["path"],
    },
    execute: async (args) => {
        const path = String(args.path)
        try {
            const content = await readFile(path, "utf-8")
            return truncateOutput(content)
        } catch {
            throw new Error(`读取文件失败，文件不存在或无法访问: ${path}`)
        }
    },
}

const writeFileTool: Tool = {
    name: "write_file",
    description: "把文本内容写入本地文件。文件已存在则整体覆盖，不存在则自动创建（含中间目录）。",
    parameters: {
        type: "object",
        properties: {
            path: {type: "string", description: "目标文件路径"},
            content: {type: "string", description: "要写入的完整文本内容"},
        },
        required: ["path", "content"],
    },
    execute: async (args) => {
        const path = String(args.path)
        const content = String(args.content)
        try {
            await mkdir(dirname(path), {recursive: true})
            await writeFile(path, content, "utf-8")
            return `已写入 ${content.length} 字符到 ${path}`
        } catch {
            throw new Error(`写入文件失败: ${path}`)
        }
    },
}

const runCommandTool: Tool = {
    name: "run_command",
    description: `在本地 shell 执行一条命令并返回输出。当前系统是 ${process.platform === "win32" ? "Windows（cmd 命令行，可用 dir、type、node、npm、git 等）" : "Linux/macOS（bash）"}。命令最长运行 60 秒。`,
    parameters: {
        type: "object",
        properties: {
            command: {type: "string", description: "要执行的完整命令"},
        },
        required: ["command"],
    },
    execute: async (args) => {
        const command = String(args.command)
        const full = process.platform === "win32" ? `chcp 65001 >nul & ${command}` : command
        try {
            const {stdout, stderr} = await execAsync(full, {timeout: 60_000, maxBuffer: 10 * 1024 * 1024})
            return truncateOutput(`退出码 0\n${stdout}${stderr}`)
        } catch (error) {
            const err = error as { code?: number; stdout?: string; stderr?: string }
            const output = `${err.stdout ?? ""}${err.stderr ?? ""}`
            return truncateOutput(`命令失败，退出码 ${err.code ?? "未知"}\n${output || String(error)}`)
        }
    },
}


export const tools: Tool[] = [readFileTool, writeFileTool, runCommandTool]