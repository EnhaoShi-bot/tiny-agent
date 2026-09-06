import { generate } from "@tinyagent/llm"
import type { GenerateOptions } from "@tinyagent/llm"
import type { Model } from "./types"

export const createModel = (opts: GenerateOptions): Model => ({
    generate: (input) => generate(input, opts),
})