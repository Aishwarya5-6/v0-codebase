import { NextRequest } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(req: NextRequest) {
  try {
    const { question, repo, fileTree } = await req.json()

    console.log("[v0] /api/ask received:", {
      question,
      repo,
      fileTreeType: Array.isArray(fileTree) ? "array" : typeof fileTree,
      fileTreeLength: Array.isArray(fileTree)
        ? fileTree.length
        : typeof fileTree === "string"
        ? fileTree.length
        : 0,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    })

    if (!question || !repo) {
      return Response.json({ error: "Missing data" }, { status: 400 })
    }

    let context = "No file tree available"
    if (Array.isArray(fileTree) && fileTree.length > 0) {
      context = fileTree
        .slice(0, 50)
        .map((f: { path?: string; name?: string } | string) =>
          typeof f === "string" ? f : f.path || f.name || ""
        )
        .filter(Boolean)
        .join("\n")
    } else if (typeof fileTree === "string" && fileTree.trim().length > 0) {
      context = fileTree.split("\n").slice(0, 50).join("\n")
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are an expert software engineer who explains codebases clearly and practically.",
        },
        {
          role: "user",
          content: `Repository: ${repo}\n\nFiles:\n${context}\n\nQuestion: ${question}`,
        },
      ],
    })

    const answer = response.choices[0].message.content

    console.log("[v0] /api/ask answer length:", answer?.length || 0)

    return Response.json({ answer })
  } catch (error) {
    const err = error as Error
    console.error("[v0] /api/ask error:", err)
    console.error("[v0] error.message:", err?.message)
    console.error("[v0] error.stack:", err?.stack)
    console.error("[v0] OPENAI_API_KEY exists:", !!process.env.OPENAI_API_KEY)

    return Response.json(
      {
        error: err?.message || "Something went wrong",
        stack: err?.stack,
      },
      { status: 500 }
    )
  }
}
