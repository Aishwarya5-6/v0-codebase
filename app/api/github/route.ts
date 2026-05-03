import { NextResponse } from 'next/server'

interface GitHubTreeItem {
  path: string
  type: 'blob' | 'tree'
  sha: string
}

interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

function buildFileTree(items: GitHubTreeItem[]): FileNode[] {
  const root: FileNode[] = []
  const pathMap = new Map<string, FileNode>()

  const sortedItems = [...items].sort((a, b) => {
    const aDepth = a.path.split('/').length
    const bDepth = b.path.split('/').length
    if (aDepth !== bDepth) return aDepth - bDepth
    return a.path.localeCompare(b.path)
  })

  for (const item of sortedItems) {
    const parts = item.path.split('/')
    const name = parts[parts.length - 1]
    const parentPath = parts.slice(0, -1).join('/')

    const node: FileNode = {
      name,
      path: item.path,
      type: item.type === 'tree' ? 'directory' : 'file',
      children: item.type === 'tree' ? [] : undefined,
    }

    pathMap.set(item.path, node)

    if (parentPath === '') {
      root.push(node)
    } else {
      const parent = pathMap.get(parentPath)
      if (parent && parent.children) {
        parent.children.push(node)
      }
    }
  }

  const sortNodes = (nodes: FileNode[]) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })
    nodes.forEach(node => {
      if (node.children) {
        sortNodes(node.children)
      }
    })
  }

  sortNodes(root)
  return root
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const repo = searchParams.get('repo')

  if (!repo) {
    return NextResponse.json(
      { error: 'Missing required query parameter: repo (format: owner/repo)' },
      { status: 400 }
    )
  }

  const [owner, repoName] = repo.split('/')
  if (!owner || !repoName) {
    return NextResponse.json(
      { error: 'Invalid repo format. Expected: owner/repo' },
      { status: 400 }
    )
  }

  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Codebase-Explorer-AI',
  }

  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`
  }

  try {
    // Fetch repo info to get default branch
    const repoResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}`,
      { headers }
    )

    if (!repoResponse.ok) {
      if (repoResponse.status === 404) {
        return NextResponse.json(
          { error: 'Repository not found. Make sure it exists and is public.' },
          { status: 404 }
        )
      }
      if (repoResponse.status === 403) {
        return NextResponse.json(
          { error: 'GitHub API rate limit exceeded. Please try again later or add a GITHUB_TOKEN.' },
          { status: 403 }
        )
      }
      return NextResponse.json(
        { error: `GitHub API error: ${repoResponse.status}` },
        { status: repoResponse.status }
      )
    }

    const repoData = await repoResponse.json()
    const defaultBranch = repoData.default_branch

    // Fetch the tree using the default branch
    const treeResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/git/trees/${defaultBranch}?recursive=1`,
      { headers }
    )

    if (!treeResponse.ok) {
      return NextResponse.json(
        { error: `Failed to fetch repository tree: ${treeResponse.status}` },
        { status: treeResponse.status }
      )
    }

    const treeData = await treeResponse.json()
    const limitedTree = treeData.tree.slice(0, 1000)
    const fileTree = buildFileTree(limitedTree)

    return NextResponse.json({
      tree: fileTree,
      truncated: treeData.truncated || treeData.tree.length > 1000,
      repoInfo: {
        name: repoData.full_name,
        description: repoData.description,
        stars: repoData.stargazers_count,
        language: repoData.language,
        defaultBranch: repoData.default_branch,
      }
    })
  } catch (error) {
    console.error('Error fetching repo:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch repository' },
      { status: 500 }
    )
  }
}
