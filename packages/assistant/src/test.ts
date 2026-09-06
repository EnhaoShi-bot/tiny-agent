import {tools} from "./tools"
import {truncateOutput} from "./truncate"

const main = async () => {
    // 截断函数
    const long = "a".repeat(25000)
    console.log("截断后长度:", truncateOutput(long).length)

    const readTool = tools[0]
    if (!readTool) throw new Error("没有工具")

    // 正路径：读一个一定存在的文件（从仓库根目录运行时）
    const content = await readTool.execute({path: "packages/assistant/package.json"})
    console.log("读到的开头:", content.slice(0, 60))

    // 错误路径：确认抛错信息干净可读
    try {
        await readTool.execute({path: "不存在的文件.txt"})
    } catch (e) {
        console.log("按预期抛错:", String(e))
    }

    const writeTool = tools.find(t => t.name === "write_file")
    if (!writeTool) throw new Error("没有 write_file")
    console.log(await writeTool.execute({path: "tmp-test/hello.txt", content: "你好 TinyAgent"}))
    console.log("读回验证:", await readTool.execute({path: "tmp-test/hello.txt"}))

    const cmdTool = tools.find(t => t.name === "run_command")
    if (!cmdTool) throw new Error("没有 run_command")
    console.log(await cmdTool.execute({command: "node -v"}))
    console.log(await cmdTool.execute({command: "type 不存在的文件.txt"}))
}

main()