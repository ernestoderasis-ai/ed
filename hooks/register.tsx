import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { OpenTask, TaskStatus } from '../types'
import { openTasks, parseStatus, summary } from './git'

const PANE = 'lavori-aperti'
const TITLE = 'Lavori aperti'
const MAX_FILES = 15

const tasks = atom({ plugin: 'lavori-aperti', key: 'tasks' } as const, [])
const git = atom({ plugin: 'lavori-aperti', key: 'git' } as const, null)
const checkedAt = atom({ plugin: 'lavori-aperti', key: 'checkedAt' } as const, 0)

async function refresh($: EngineInterface): Promise<void> {
  const status = await $.process.run(['git', 'status', '--porcelain=v1', '-b'])
  if (status.exitCode !== 0) {
    await update($, git, () => null)
  } else {
    const stash = await $.process.run(['git', 'stash', 'list'])
    const stashes = stash.exitCode === 0 ? stash.stdout.split('\n').filter(Boolean).length : 0
    await update($, git, () => parseStatus(status.stdout, stashes))
  }
  await update($, checkedAt, () => Date.now())
  $.ui.status(summary(await read($, tasks), await read($, git)))
}

async function setTasks($: EngineInterface, fn: (list: OpenTask[]) => OpenTask[]): Promise<void> {
  await update($, tasks, list => fn([...list]))
  $.ui.status(summary(await read($, tasks), await read($, git)))
}

const MARK: Record<TaskStatus, string> = { pending: '○', in_progress: '◐', completed: '●' }

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'lavori',
      description: 'Mostra i lavori aperti: task, modifiche git, commit non pushati',
    })
    await refresh($)

    return next(e)
  })

  on('command.run', { command: 'lavori' }, async $ => {
    await refresh($)
    await $.ui.open({ id: PANE, title: TITLE })

    return { text: summary(await read($, tasks), await read($, git)) ?? 'Nessun lavoro aperto.' }
  })

  on('turn.complete', async ($, e, next) => {
    await refresh($)

    return next(e)
  })

  on('tool.call', { tool: 'TaskCreate' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.result && !ran.isError) {
      const { id, subject } = ran.result.task
      await setTasks($, list => [...list, { id, subject, status: 'pending' }])
    }

    return ran
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'TaskUpdate' }, async ($, e, next) => {
    const ran = await next(e)
    if (!ran.deny && !ran.isError) {
      const status = e.status
      await setTasks($, list =>
        status === 'deleted'
          ? list.filter(task => task.id !== e.taskId)
          : list.map(task =>
              task.id === e.taskId
                ? { ...task, subject: e.subject ?? task.subject, status: status ?? task.status }
                : task,
            ),
      )
    }

    return ran
  }).catch(($, e, next) => next(e))

  on('tool.call', { tool: 'TodoWrite' }, async ($, e, next) => {
    const ran = await next(e)
    if (!ran.deny && !ran.isError) {
      await setTasks($, () =>
        e.todos.map((todo, i) => ({ id: `todo-${i}`, subject: todo.content, status: todo.status })),
      )
    }

    return ran
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text, Button } = $.ui.resolve(e)
    const open = openTasks(await read($, tasks))
    const repo = await read($, git)
    const at = await read($, checkedAt)
    const width = Math.max(20, (e.props.bodyColumns ?? 60) - 2)
    const cut = (text: string) => (text.length > width ? `${text.slice(0, width - 1)}…` : text)

    return (
      <Box flexDirection="column">
        <Text bold>Task della sessione</Text>
        {open.length === 0 && <Text dimColor>  nessuno</Text>}
        {open.map(task => (
          <Text key={`t-${task.id}`} color={task.status === 'in_progress' ? 'yellow' : undefined}>
            {cut(`  ${MARK[task.status]} ${task.subject}`)}
          </Text>
        ))}

        <Text> </Text>
        <Text bold>Git</Text>
        {repo === null && <Text dimColor>  non è un repository git</Text>}
        {repo !== null && (
          <Box flexDirection="column">
            <Text>
              {cut(`  branch ${repo.branch}${repo.upstream ? ` → ${repo.upstream}` : ' (nessun upstream)'}`)}
            </Text>
            {repo.ahead > 0 && <Text color="yellow">  {repo.ahead} commit da pushare</Text>}
            {repo.behind > 0 && <Text color="cyan">  {repo.behind} commit da scaricare</Text>}
            {repo.stashes > 0 && <Text color="magenta">  {repo.stashes} stash</Text>}
            {repo.files.length === 0 ? (
              <Text dimColor>  working tree pulito</Text>
            ) : (
              <Text>  {repo.files.length} file modificati:</Text>
            )}
            {repo.files.slice(0, MAX_FILES).map(file => (
              <Text key={`f-${file.path}`} color={file.code.includes('?') ? 'gray' : 'green'}>
                {cut(`    ${file.code} ${file.path}`)}
              </Text>
            ))}
            {repo.files.length > MAX_FILES && (
              <Text dimColor>    … altri {repo.files.length - MAX_FILES}</Text>
            )}
          </Box>
        )}

        <Text> </Text>
        <Box>
          <Button key="refresh" label="Aggiorna" hotkey="r" onPress={() => refresh($)} />
          {at > 0 && <Text dimColor> agg. {new Date(at).toLocaleTimeString()}</Text>}
        </Box>
      </Box>
    )
  })
}
