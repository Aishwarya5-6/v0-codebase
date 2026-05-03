'use client'

import { useState, useCallback } from 'react'
import { RepoInput } from '@/components/repo-input'
import { FileTree, FileNode } from '@/components/file-tree'
import { ChatPanel } from '@/components/chat-panel'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, FolderTree, MessageSquare } from 'lucide-react'

function fileTreeToString(nodes: FileNode[], indent = ''): string {
  return nodes.map(node => {
    const prefix = node.type === 'directory' ? '/' : ''
    const line = `${indent}${node.name}${prefix}`
    if (node.children && node.children.length > 0) {
      return line + '\n' + fileTreeToString(node.children, indent + '  ')
    }
    return line
  }).join('\n')
}

export default function Home() {
  const [fileTree, setFileTree] = useState<FileNode[]>([])
  const [fileTreeString, setFileTreeString] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentRepo, setCurrentRepo] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<string>()

  const extractRepoFromUrl = (url: string): string | null => {
    // Handle full GitHub URLs
    const match = url.match(/github\.com\/([^/]+\/[^/]+)/)
    if (match) {
      return match[1].replace(/\.git$/, '').split('#')[0].split('?')[0]
    }
    // Handle owner/repo format directly
    if (/^[^/]+\/[^/]+$/.test(url.trim())) {
      return url.trim()
    }
    return null
  }

  const handleFetchRepo = useCallback(async (url: string) => {
    setIsLoading(true)
    setError(null)

    const repo = extractRepoFromUrl(url)
    
    if (!repo) {
      setError('Invalid GitHub URL. Use format: https://github.com/owner/repo or owner/repo')
      setIsLoading(false)
      return
    }

    try {
      console.log('[v0] Calling /api/github')
      const response = await fetch(`/api/github?repo=${encodeURIComponent(repo)}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch repository')
      }

      console.log('[v0] File tree loaded')
      setFileTree(data.tree)
      setFileTreeString(fileTreeToString(data.tree))
      setCurrentRepo(`https://github.com/${repo}`)
      setSelectedFile(undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setFileTree([])
      setFileTreeString('')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleSelectFile = useCallback((path: string) => {
    setSelectedFile(path)
  }, [])

  return (
    <div className="flex h-screen flex-col bg-background">
      <RepoInput 
        onFetch={handleFetchRepo} 
        isLoading={isLoading}
        currentRepo={currentRepo}
      />

      {error && (
        <Alert variant="destructive" className="mx-4 mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* File Explorer Panel */}
        <div className="hidden md:flex w-80 flex-col border-r border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <FolderTree className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-medium text-foreground">Explorer</h2>
            {fileTree.length > 0 && (
              <span className="ml-auto text-xs text-muted-foreground font-mono">
                {countFiles(fileTree)} files
              </span>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <FileTree 
              data={fileTree} 
              onSelectFile={handleSelectFile}
              selectedFile={selectedFile}
            />
          </div>
        </div>

        {/* Chat Panel */}
        <div className="flex flex-1 flex-col bg-background">
          <div className="md:hidden flex items-center gap-2 border-b border-border px-4 py-3">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-medium text-foreground">Chat</h2>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatPanel 
              repoUrl={currentRepo}
              fileTree={fileTreeString}
              selectedFile={selectedFile}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function countFiles(nodes: FileNode[]): number {
  return nodes.reduce((count, node) => {
    if (node.type === 'file') {
      return count + 1
    }
    if (node.children) {
      return count + countFiles(node.children)
    }
    return count
  }, 0)
}
