// function record(input: unknown): Record<string, unknown> {
//     // 如果输入是字符串，先 JSON.parse
//     const obj = typeof input === "string" ? JSON.parse(input) : input;
//     // 校验必须是纯对象，不能是数组/null/原始值
//     if (typeof obj !== 'object' || obj === null || Array.isArray(obj)){
//         throw new Error("Expected an object");
//     }
//     return obj;
// }
//
// export const calculateTool: Tool<{
//     a:number,
//     b:number,
//     operator: "add"|"multiply"
// }> = {
//     name: "calculator",
//     description:'计算数学表达式',
//     parameters: {
//         type:"object",
//         properties:{
//             a:{type:"number"},
//             b:{type:"number"},
//             operator:{type:"string", enum:["add","multiply"]}
//         },
//         required:["a","b","operator"]
//     },
//
//     parse(input:string) {
//         const value = record(input)
//         // 参数校验
//         if (typeof value.a !== "number" || typeof value.b !== "number"){
//             throw new Error("a or b is not a number")
//         }
//         if (value.operator !== 'add' && value.operator !== 'multiply'){
//             throw new Error("operator must be add or multiply")
//         }
//         // 参数解析
//         return {
//             a:value.a,
//             b:value.b,
//             operator:value.operator
//         }
//     },
//     execute: ({a:number, b:number, operator:string}) => (operator === "add" ? a+b : a*b)
// }