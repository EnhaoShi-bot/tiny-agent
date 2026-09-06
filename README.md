# TinyAgent

一个用于学习 agent 原理的最小 AI agent，参考本机 `D:\Desktop\pi-main`（pi-mono）的架构从零实现。
已发布到 npm，任何人 `npm install -g @tinyagent/cli` 后即可用命令 `tinyagent` 对话。

## 架构：四个包，单向依赖

```
@tinyagent/cli          产品外壳（readline REPL、多轮记忆、首启引导、bin 命令 tinyagent）
  └─ @tinyagent/assistant   垂直能力层（read_file / write_file / run_command + systemPrompt）
       └─ @tinyagent/agent-loop   agent 主循环（runAgent：模型 ↔ 工具来回，onEvent 上报进度）
            └─ @tinyagent/llm   LLM 客户端（OpenAI 兼容接口，格式转换 + 失败重试）
```

上层依赖下层，下层永远不知道上层的存在——所以 llm 可以换供应商，cli 可以换成别的界面。

各包 `src/` 下的 `test.ts` / `main.ts` 是冒烟脚本（跑 dist 产物验证），不随 npm 包发布（package.json 的 `files` 负排除）。

## 开发

```powershell
pnpm install                      # 安装依赖（workspace 内四个包用 link 互联）
pnpm -r build                     # 按依赖顺序构建全部包
npx tsc --noEmit                  # 全仓类型检查
node packages/cli/dist/cli.mjs    # 本地运行 CLI
```

开发时的 API 配置放根目录 `.env`（已 gitignore，**永远不要提交**）：

```
BASE_URL=...
API_KEY=...
MODEL=...
```

配置查找优先级：环境变量（.env 也走这条）→ `~/.tinyagent/config.json` → 首次运行问答引导。

两个踩过的坑：

- 包之间通过 dist 里的声明文件互相看见，**改代码后必须按依赖顺序重新 build**（`pnpm -r build` 自动排序），否则类型检查用的是旧声明，报假错。
- tsdown 构建不做类型检查，构建通过 ≠ 类型正确，`npx tsc --noEmit` 才是准绳。

## 发布

npm 组织：`tinyagent`（Free 计划，公开包免费）。
发布用 granular access token（限 `@tinyagent` scope 读写、允许绕过 2FA），存在 `~/.npmrc`。
包路由：根目录 `.npmrc` 写了 `@tinyagent:registry=https://registry.npmjs.org/`——下载走国内镜像，发布走官方。

流程：改代码 → 改到的包 `version` 升一位（npm 不许覆盖已发布版本）→ `pnpm -r build` → **先发被依赖的**：

```powershell
git status        # 必须干净，pnpm publish 会检查
pnpm --filter @tinyagent/llm publish --access public
pnpm --filter @tinyagent/agent-loop publish --access public
pnpm --filter @tinyagent/assistant publish --access public
pnpm --filter @tinyagent/cli publish --access public
```

刚发布的包国内镜像同步有延迟，验证安装要直连官方：`npm install -g @tinyagent/cli --registry=https://registry.npmjs.org/`。

## 用户视角

```powershell
npm install -g @tinyagent/cli --registry=https://registry.npmjs.org/
tinyagent
```

首次运行问答式引导填 BASE_URL / API_KEY / MODEL，存到 `~/.tinyagent/config.json`（可直接手改）。
会话内多轮记忆（`history.push → runAgent → history = result.messages`），`exit` / Ctrl+C 退出。

## 已知边界（待办）

- **历史无限增长**：每轮把完整 history 发给 API，长对话会顶爆上下文窗口和账单；压缩/摘要待做。
- **run_command 无人工确认**：模型可直接执行任意命令，缺审批闸门。
- **无流式输出**：llm 层等完整响应才返回，长回答时用户只能干等。
