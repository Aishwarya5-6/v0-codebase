'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles, FileCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'

interface ChatPanelProps {
  repoUrl: string
  fileTree: string
  selectedFile?: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  filesUsed?: string[]
}

export function ChatPanel({ repoUrl, fileTree }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const repo = repoUrl ? repoUrl.replace('https://github.com/', '').replace(/\/$/, '') : ''
  const isRepoLoaded = !!repoUrl && !!fileTree && fileTree.trim().length > 0

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isLoading])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const question = input.trim()
    if (!question || isLoading) return
    if (!isRepoLoaded) {
      setWarning('Load a repo first')
      return
    }
    setWarning(null)

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: question,
    }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    const payload = { question, repo, fileTree }
    console.log('[v0] Sending payload:', {
      question: payload.question,
      repo: payload.repo,
      fileTreeLength: payload.fileTree?.length || 0,
    })

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()
      console.log('[v0] API response:', data)

      if (!res.ok) {
        throw new Error(data.error || 'Failed to get response')
      }

      setMessages(prev => [...prev, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.answer || data.message || 'No response',
        filesUsed: data.filesUsed || [],
      }])
    } catch (err) {
      console.log('[v0] Chat error:', err)
      setMessages(prev => [...prev, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: err instanceof Error 
          ? `Error: ${err.message}` 
          : 'Sorry, something went wrong. Please try again.',
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="hidden md:flex items-center gap-2 border-b border-border px-4 py-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-medium text-foreground">AI Assistant</h2>
      </div>

      <div className="flex-1 overflow-auto p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="rounded-full bg-primary/10 p-3 mb-4">
              <Bot className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">
              Ask about the codebase
            </h3>
            <p className="text-xs text-muted-foreground max-w-[240px]">
              {isRepoLoaded
                ? 'I can help you understand the code structure, explain files, and answer questions.'
                : 'Load a repository first to start exploring with AI.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div key={message.id} className="space-y-2">
                <div
                  className={cn(
                    'flex gap-3',
                    message.role === 'user' && 'flex-row-reverse'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    )}
                  >
                    {message.role === 'user' ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div
                    className={cn(
                      'rounded-lg px-3 py-2 text-sm max-w-[85%]',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground'
                    )}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>
                </div>

                {message.role === 'assistant' && message.filesUsed && message.filesUsed.length > 0 && (
                  <div className="ml-10 flex flex-wrap items-center gap-1.5">
                    <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
                    {message.filesUsed.map((file) => (
                      <Badge
                        key={file}
                        variant="secondary"
                        className="text-xs font-mono px-1.5 py-0"
                      >
                        {file.split('/').pop()}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-lg bg-secondary px-3 py-2">
                  <Spinner className="h-4 w-4" />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-border p-4">
        {warning && (
          <div className="mb-2 text-xs text-destructive font-medium">
            {warning}
          </div>
        )}
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              if (warning) setWarning(null)
            }}
            onKeyDown={handleKeyDown}
            placeholder={isRepoLoaded ? 'Ask about this codebase...' : 'Load a repo first...'}
            disabled={isLoading || !isRepoLoaded}
            className="min-h-[44px] max-h-[120px] resize-none bg-secondary border-0 text-sm pointer-events-auto"
            style={{ pointerEvents: 'auto' }}
            rows={1}
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !isRepoLoaded || !input.trim()}
            className="shrink-0 pointer-events-auto"
            style={{ pointerEvents: 'auto' }}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  )
}
