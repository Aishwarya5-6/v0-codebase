import {
  consumeStream,
  convertToModelMessages,
  streamText,
  UIMessage,
} from 'ai'

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages, repoUrl, fileTree, selectedFile }: { 
    messages: UIMessage[]
    repoUrl?: string
    fileTree?: string
    selectedFile?: string
  } = await req.json()

  const systemPrompt = `You are an expert code assistant helping users understand and explore GitHub repositories.

${repoUrl ? `Current repository: ${repoUrl}` : ''}

${fileTree ? `Repository file structure:
\`\`\`
${fileTree}
\`\`\`` : ''}

${selectedFile ? `Currently selected file: ${selectedFile}` : ''}

Your role is to:
- Help users understand the codebase structure and architecture
- Explain code patterns and design decisions
- Answer questions about specific files or directories
- Suggest areas to explore based on user interests
- Provide insights about the technology stack and dependencies

Be concise but thorough. Use markdown formatting for code snippets and technical explanations.`

  const result = streamText({
    model: 'openai/gpt-4o-mini',
    system: systemPrompt,
    messages: await convertToModelMessages(messages),
    abortSignal: req.signal,
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    consumeSseStream: consumeStream,
  })
}
