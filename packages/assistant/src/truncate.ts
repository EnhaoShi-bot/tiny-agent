const LIMIT = 10000

export const truncateOutput = (text: string): string => {
    if (text.length <= LIMIT) return text
    return text.slice(0, LIMIT) + `\n...[输出已截断：原文共 ${text.length} 字符，仅显示前 ${LIMIT} 字符]`
}