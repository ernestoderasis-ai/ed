export type TaskStatus = 'pending' | 'in_progress' | 'completed'

export type OpenTask = { id: string; subject: string; status: TaskStatus }

export type GitFile = { code: string; path: string }

export type GitSnapshot = {
  branch: string
  upstream: string | null
  ahead: number
  behind: number
  files: GitFile[]
  stashes: number
}

declare module 'claude-code' {
  interface PluginState {
    'lavori-aperti': {
      tasks: OpenTask[]
      git: GitSnapshot | null
      checkedAt: number
    }
  }
}
