import { generateText } from 'ai'

interface FileContent {
  path: string
  content: string
}

const IMPORTANT_FILE_PATTERNS = [
  /package\.json$/,
  /README\.md$/i,
  /\.tsx?$/,
  /\.jsx?$/,
  /\.py$/,
  /\.go$/,
  /\.rs$/,
  /\.vue$/,
  /\.svelte$/,
]

const SKIP_PATTERNS = [
  /node_modules/,
  /\.lock$/,
  /\.min\./,
  /dist\//,
  /build\//,
  /\.map$/,
  /\.d\.ts$/,
  /\.test\./,
  /\.spec\./,
  /__tests__/,
  /\.git/,
]

function isImportantFile(path: string): boolean {
  if (SKIP_PATTERNS.some(pattern => pattern.test(path))) {
    return false
  }
  return IMPORTANT_FILE_PATTERNS.some(pattern => pattern.test(path))
}

function selectRelevantFiles(
  files: string[],
  question: string,
  maxFiles: number = 5
): string[] {
  const questionLower = question.toLowerCase()
  const keywords = questionLower.split(/\s+/).filter(w => w.length > 2)
  
  const scored = files
    .filter(isImportantFile)
    .map(file => {
      let score = 0
      const fileLower = file.toLowerCase()
      
      // Boost files mentioned in the question
      keywords.forEach(keyword => {
        if (fileLower.includes(keyword)) {
          score += 10
        }
      })
      
      // Boost entry points and config files
      if (fileLower.includes('index') || fileLower.includes('main')) score += 5
      if (fileLower.includes('app') || fileLower.includes('page')) score += 4
      if (fileLower.includes('config') || fileLower.includes('package.json')) score += 3
      if (fileLower.includes('readme')) score += 2
      
      // Prefer shorter paths (less nested)
      score -= file.split('/').length * 0.5
      
      return { file, score }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxFiles)
    .map(item => item.file)
  
  return scored
}

async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  token?: string
): Promise<string | null> {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3.raw',
    'User-Agent': 'Codebase-Explorer-AI',
  }
  
  if (token) {
    headers['Authorization'] = `token ${token}`
  }
  
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      { headers }
    )
    
    if (!response.ok) {
      return null
    }
    
    const text = await response.text()
    // Limit file size to prevent token overflow
    return text.length > 10000 ? text.slice(0, 10000) + '\n... [truncated]' : text
  } catch {
    return null
  }
}

async function fetchRepoFileList(
  owner: string,
  repo: string,
  token?: string
): Promise<string[]> {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Codebase-Explorer-AI',
  }
  if (token) headers['Authorization'] = `token ${token}`

  try {
    // Get default branch
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers })
    if (!repoRes.ok) return []
    const repoData = await repoRes.json()
    const branch = repoData.default_branch || 'main'

    // Get file tree recursively
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      { headers }
    )
    if (!treeRes.ok) return []
    const treeData = await treeRes.json()
    
    return (treeData.tree || [])
      .filter((item: { type: string; path: string }) => item.type === 'blob')
      .map((item: { path: string }) => item.path)
  } catch {
    return []
  }
}

export async function POST(req: Request) {
  try {
    const { question, repo, fileTree } = await req.json()
    
    if (!question || !repo) {
      const missing = [
        !question && 'question',
        !repo && 'repo',
      ].filter(Boolean).join(', ')
      
      return Response.json(
        { error: `Missing required fields: ${missing}` },
        { status: 400 }
      )
    }
    
    const [owner, repoName] = repo.split('/')
    if (!owner || !repoName) {
      return Response.json(
        { error: 'Invalid repo format. Expected: owner/repo' },
        { status: 400 }
      )
    }
    
    const token = process.env.GITHUB_TOKEN
    
    // Parse file tree string to get file paths, or fetch from GitHub if missing
    let allFiles: string[] = []
    if (fileTree && typeof fileTree === 'string' && fileTree.trim().length > 0) {
      allFiles = fileTree
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line && !line.endsWith('/'))
    } else {
      console.log('[v0] fileTree missing, fetching from GitHub')
      allFiles = await fetchRepoFileList(owner, repoName, token)
    }
    
    // Select relevant files based on the question
    const selectedPaths = selectRelevantFiles(allFiles, question)
    
    // Fetch file contents
    const fileContents: FileContent[] = []
    
    for (const path of selectedPaths) {
      const content = await fetchFileContent(owner, repoName, path, token)
      if (content) {
        fileContents.push({ path, content })
      }
    }
    
    // Build context from file contents
    const filesContext = fileContents.length > 0
      ? fileContents.map(f => `### File: ${f.path}\n\`\`\`\n${f.content}\n\`\`\``).join('\n\n')
      : 'No relevant files found in the repository.'
    
    const systemPrompt = `You are a codebase assistant. Answer the question using the given files. Be precise and mention file names when referencing code.

Repository: ${owner}/${repoName}

${filesContext}`

    const { text } = await generateText({
      model: 'anthropic/claude-sonnet-4-20250514',
      system: systemPrompt,
      messages: [{ role: 'user', content: question }],
    })

    return Response.json({
      answer: text,
      filesUsed: fileContents.map(f => f.path),
    })
  } catch (error) {
    console.error('Error in /api/ask:', error)
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to process question' },
      { status: 500 }
    )
  }
}
