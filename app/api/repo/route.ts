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

  // Sort items to ensure directories come before their contents
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

  // Sort children: directories first, then alphabetically
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

export async function POST(req: Request) {
  try {
    const { url } = await req.json()

    // Parse GitHub URL
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/)
    if (!match) {
      return NextResponse.json(
        { error: 'Invalid GitHub URL' },
        { status: 400 }
      )
    }

    const [, owner, repo] = match
    const cleanRepo = repo.replace(/\.git$/, '').split('/')[0].split('#')[0].split('?')[0]

    // Fetch the default branch
    const repoResponse = await fetch(
      `https://api.github.com/repos/${owner}/${cleanRepo}`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Codebase-Explorer-AI',
          ...(process.env.GITHUB_TOKEN && {
            'Authorization': `token ${process.env.GITHUB_TOKEN}`
          })
        }
      }
    )

    if (!repoResponse.ok) {
      if (repoResponse.status === 404) {
        return NextResponse.json(
          { error: 'Repository not found. Make sure it exists and is public.' },
          { status: 404 }
        )
      }
      throw new Error(`GitHub API error: ${repoResponse.status}`)
    }

    const repoData = await repoResponse.json()
    const defaultBranch = repoData.default_branch

    // Fetch the tree
    const treeResponse = await fetch(
      `https://api.github.com/repos/${owner}/${cleanRepo}/git/trees/${defaultBranch}?recursive=1`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Codebase-Explorer-AI',
          ...(process.env.GITHUB_TOKEN && {
            'Authorization': `token ${process.env.GITHUB_TOKEN}`
          })
        }
      }
    )

    if (!treeResponse.ok) {
      throw new Error(`Failed to fetch repository tree: ${treeResponse.status}`)
    }

    const treeData = await treeResponse.json()
    
    // Filter out very large repos (limit to first 1000 items)
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
