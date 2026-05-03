'use client'

import { useState } from 'react'
import { ChevronRight, ChevronDown, File, Folder } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'

export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

interface FileTreeProps {
  data: FileNode[]
  onSelectFile?: (path: string) => void
  selectedFile?: string
}

interface TreeNodeProps {
  node: FileNode
  depth: number
  onSelectFile?: (path: string) => void
  selectedFile?: string
}

function TreeNode({ node, depth, onSelectFile, selectedFile }: TreeNodeProps) {
  const [isOpen, setIsOpen] = useState(depth < 2)
  const isDirectory = node.type === 'directory'
  const isSelected = selectedFile === node.path

  const handleClick = () => {
    if (isDirectory) {
      setIsOpen(!isOpen)
    } else {
      onSelectFile?.(node.path)
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          'flex w-full items-center gap-1.5 px-2 py-1 text-sm hover:bg-secondary/50 rounded-sm transition-colors text-left',
          isSelected && 'bg-primary/10 text-primary'
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {isDirectory ? (
          <>
            {isOpen ? (
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            <Folder className="h-4 w-4 shrink-0 text-primary/80" />
          </>
        ) : (
          <>
            <span className="w-3.5" />
            <File className="h-4 w-4 shrink-0 text-muted-foreground" />
          </>
        )}
        <span className="truncate font-mono text-xs">{node.name}</span>
      </button>
      {isDirectory && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onSelectFile={onSelectFile}
              selectedFile={selectedFile}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FileTree({ data, onSelectFile, selectedFile }: FileTreeProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm p-4 text-center">
        Enter a GitHub repository URL above to explore its structure
      </div>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="py-2">
        {data.map((node) => (
          <TreeNode
            key={node.path}
            node={node}
            depth={0}
            onSelectFile={onSelectFile}
            selectedFile={selectedFile}
          />
        ))}
      </div>
    </ScrollArea>
  )
}
