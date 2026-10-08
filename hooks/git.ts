import type { GitFile, GitSnapshot, OpenTask } from '../types'

// Parses `git status --porcelain=v1 -b` output.
export function parseStatus(stdout: string, stashes: number): GitSnapshot {
  const lines = stdout.split('\n').filter(line => line.length > 0)
  const head = lines[0]?.startsWith('## ') ? lines.shift()!.slice(3) : ''

  let branch = head
  let upstream: string | null = null
  let ahead = 0
  let behind = 0

  const noCommits = /^(?:No commits yet|Initial commit) on (.+)$/.exec(head)
  if (noCommits) {
    branch = noCommits[1]!
  } else {
    const match = /^(.+?)(?:\.\.\.(\S+))?(?: \[(.+)\])?$/.exec(head)
    if (match) {
      branch = match[1]!
      upstream = match[2] ?? null
      const counts = match[3] ?? ''
      ahead = Number(/ahead (\d+)/.exec(counts)?.[1] ?? 0)
      behind = Number(/behind (\d+)/.exec(counts)?.[1] ?? 0)
    }
  }

  const files: GitFile[] = lines.map(line => ({
    code: line.slice(0, 2),
    path: line.slice(3),
  }))

  return { branch, upstream, ahead, behind, files, stashes }
}

export function openTasks(tasks: readonly OpenTask[]): OpenTask[] {
  return tasks.filter(task => task.status !== 'completed')
}

export function summary(tasks: readonly OpenTask[], git: GitSnapshot | null): string | undefined {
  const parts: string[] = []
  const open = openTasks(tasks).length
  if (open > 0) parts.push(`${open} task`)
  if (git) {
    if (git.files.length > 0) parts.push(`${git.files.length} file modificati`)
    if (git.ahead > 0) parts.push(`${git.ahead} commit da pushare`)
    if (git.stashes > 0) parts.push(`${git.stashes} stash`)
  }

  return parts.length > 0 ? `Lavori aperti: ${parts.join(' · ')}` : undefined
}
