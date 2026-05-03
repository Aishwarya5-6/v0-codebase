'use client'

import { useState } from 'react'
import { Github, Search, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

interface RepoInputProps {
  onFetch: (url: string) => Promise<void>
  isLoading: boolean
  currentRepo?: string
}

export function RepoInput({ onFetch, isLoading, currentRepo }: RepoInputProps) {
  const [url, setUrl] = useState('')

  const handleExplore = () => {
    if (!url.trim() || isLoading) return
    onFetch(url.trim())
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleExplore()
  }

  const parseRepoName = (repoUrl: string) => {
    try {
      const match = repoUrl.match(/github\.com\/([^/]+\/[^/]+)/)
      return match ? match[1] : repoUrl
    } catch {
      return repoUrl
    }
  }

  return (
    <div className="border-b border-border bg-card relative z-50">
      <div className="flex items-center gap-4 px-4 py-3 relative z-50">
        <div className="flex items-center gap-2">
          <Github className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold text-foreground hidden sm:inline">
            Codebase Explorer AI
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-1 items-center gap-2 max-w-2xl relative z-50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter GitHub repository URL..."
              className="pl-9 bg-secondary border-0 h-9 text-sm pointer-events-auto"
              style={{ pointerEvents: 'auto' }}
            />
          </div>
          <Button 
            type="button" 
            size="sm" 
            disabled={isLoading}
            onClick={handleExplore}
            className="h-9 pointer-events-auto"
            style={{ pointerEvents: 'auto' }}
          >
            {isLoading ? (
              <>
                <Spinner className="h-4 w-4 mr-2" />
                Loading
              </>
            ) : (
              'Explore'
            )}
          </Button>
        </form>

        {currentRepo && (
          <a
            href={currentRepo}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="font-mono">{parseRepoName(currentRepo)}</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  )
}
