import { NextRequest } from "next/server"

// Forces dev server to re-read env vars
export async function POST(req: NextRequest) {
  try {
    const { question, repo, fileTree } = await req.json()

    console.log("[v0] Groq key exists:", !!process.env.GROQ_API_KEY)
    console.log("[v0] /api/ask received:", {
      question,
      repo,
      fileTreeType: Array.isArray(fileTree) ? "array" : typeof fileTree,
      fileTreeLength: Array.isArray(fileTree)
        ? fileTree.length
        : typeof fileTree === "string"
        ? fileTree.length
        : 0,
      hasGroqKey: !!process.env.GROQ_API_KEY,
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

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
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
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("[v0] Groq API error:", data)
      return Response.json(
        { error: data?.error?.message || "Groq API request failed" },
        { status: response.status }
      )
    }

    const answer = data.choices?.[0]?.message?.content || "No response"

    console.log("[v0] /api/ask answer length:", answer.length)

    return Response.json({ answer })
  } catch (error) {
    const err = error as Error
    console.error("[v0] Groq error:", err)
    console.error("[v0] error.message:", err?.message)
    console.error("[v0] error.stack:", err?.stack)

    return Response.json(
      { error: err?.message || "Something went wrong" },
      { status: 500 }
    )
  }
}
