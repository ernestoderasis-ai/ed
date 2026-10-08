import { describe, expect, test } from 'claude-code/testing'

import { parseStatus, summary } from '../hooks/git'

describe('parseStatus', () => {
  test('branch con upstream, ahead/behind e file', async () => {
    const git = parseStatus(
      '## main...origin/main [ahead 2, behind 1]\n M src/a.ts\n?? new.txt\n',
      1,
    )
    expect(git.branch).toBe('main')
    expect(git.upstream).toBe('origin/main')
    expect(git.ahead).toBe(2)
    expect(git.behind).toBe(1)
    expect(git.files).toEqual([
      { code: ' M', path: 'src/a.ts' },
      { code: '??', path: 'new.txt' },
    ])
    expect(summary([], git)).toBe('Lavori aperti: 2 file modificati · 2 commit da pushare · 1 stash')
  })

  test('repository senza commit', async () => {
    const git = parseStatus('## No commits yet on feature\n', 0)
    expect(git.branch).toBe('feature')
    expect(git.upstream).toBe(null)
    expect(summary([], git)).toBe(undefined)
  })

  test('task completati non contano', async () => {
    const tasks = [
      { id: '1', subject: 'a', status: 'completed' as const },
      { id: '2', subject: 'b', status: 'in_progress' as const },
    ]
    expect(summary(tasks, null)).toBe('Lavori aperti: 1 task')
  })
})
