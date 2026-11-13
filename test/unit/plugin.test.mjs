import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { checkPlugin, pluginFiles, skills } from '../../scripts/check-plugin.mjs'
import { checkVendored } from '../../scripts/vendor-agent-hooks.mjs'

const json = async (name) => JSON.parse(await readFile(new URL('../../' + name, import.meta.url), 'utf8'))

test('every tool call goes through the vendored Copilot adapter, with time to hold for approval', async () => {
  // Agent Plugins 1.0 has no hooks of its own: Copilot finds them in its namespace folder.
  const config = await json('plugins/actera/com.github.copilot/hooks/hooks.json')
  assert.equal(config.version, 1)
  // Copilot's native camelCase events carry its own tool names.
  assert.deepEqual(Object.keys(config.hooks).sort(), ['postToolUse', 'postToolUseFailure', 'preToolUse'])
  for (const [event, entries] of Object.entries(config.hooks)) {
    assert.equal(entries.length, 1)
    const [hook] = entries
    assert.equal(hook.matcher, undefined, 'No matcher: every tool is checked')
    // No shell: Copilot runs node with these arguments on every platform.
    assert.deepEqual([hook.type, hook.exec, hook.args], ['command', 'node', ['${PLUGIN_ROOT}/bin/actera-hook.mjs', 'hook', event]])
  }
  // The adapter's default hold (540 s) must end before Copilot's timeout, which lets the call run.
  assert.equal(config.hooks.preToolUse[0].timeoutSec, 600)
  const shim = await readFile(new URL('../../plugins/actera/bin/actera-hook.mjs', import.meta.url), 'utf8')
  assert.match(shim, /^import '\.\.\/vendor\/agent-hooks\/src\/hosts\/copilot\/cli\.mjs'$/m)
})

test('the shipped command line runs from the plugin folder and the lock is for Copilot', async (t) => {
  const home = await mkdtemp(join(tmpdir(), 'actera-copilot-entry-'))
  t.after(() => rm(home, { recursive: true, force: true }))
  const entry = fileURLToPath(new URL('../../plugins/actera/bin/actera-hook.mjs', import.meta.url))
  const env = { ...process.env, ACTERA_COPILOT_BRIDGE_HOME: home }
  for (const name of ['ACTERA_MODE', 'ACTERA_EVALUATION_FAILURE']) delete env[name]
  const status = JSON.parse(execFileSync(process.execPath, [entry, 'status'], { env, encoding: 'utf8' }))
  assert.deepEqual([status.configured, status.settings.modeName, status.settingsManagedBy], [false, 'monitoring', '/actera:mode'])
  // An unconnected hook lets the call through without output.
  const hook = execFileSync(process.execPath, [entry, 'hook', 'preToolUse'], { env, encoding: 'utf8', input: JSON.stringify({ toolName: 'view', toolArgs: {} }) })
  assert.equal(hook, '')
  assert.equal((await json('scripts/agent-hooks.lock.json')).host, 'copilot')
})

// The Copilot runtime in VS Code passes hooks no toolCallId. agent-hooks 0.5.0
// recorded an error for such a call instead of checking it.
test('a connected hook without a tool call ID is checked and leaves no error', async (t) => {
  const home = await mkdtemp(join(tmpdir(), 'actera-copilot-no-id-'))
  const asked = []
  const server = createServer(async (request, response) => {
    for await (const chunk of request) void chunk
    asked.push(request.url)
    response.setHeader('content-type', 'application/json')
    response.end(JSON.stringify(request.url === '/v1/decisions' ? { id: '00000000-0000-4000-8000-000000000001', status: 'MONITORED' } : {}))
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve))
    await rm(home, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
  })
  const { configure } = await import('../../plugins/actera/vendor/agent-hooks/src/core/bridge.mjs')
  await configure({ baseUrl: `http://127.0.0.1:${server.address().port}`, apiKey: 'actera_' + 'p'.repeat(40), agentId: 'copilot-test', capture: 'tool-inputs' }, home)
  const entry = fileURLToPath(new URL('../../plugins/actera/bin/actera-hook.mjs', import.meta.url))
  const env = { ...process.env, ACTERA_COPILOT_BRIDGE_HOME: home }
  for (const name of ['ACTERA_MODE', 'ACTERA_EVALUATION_FAILURE']) delete env[name]
  // The fixture answers from this process, so the hook must not block it.
  const run = (args, input = '') => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [entry, ...args], { env, windowsHide: true })
    let stdout = ''
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.on('error', reject)
    child.on('close', () => resolve(stdout))
    child.stdin.end(input)
  })
  const call = { sessionId: 'session-1', cwd: '/work', toolName: 'view', toolArgs: { path: '/work/note.txt' } }
  assert.equal(await run(['hook', 'preToolUse'], JSON.stringify(call)), '')
  await run(['hook', 'postToolUse'], JSON.stringify({ ...call, toolResult: { resultType: 'success', textResultForLlm: 'hello' } }))
  assert.ok(asked.includes('/v1/decisions'), 'The call was sent to Actera')
  assert.ok(asked.some((url) => url.endsWith('/reports')), 'Its outcome was reported')
  assert.equal(JSON.parse(await run(['status'])).lastError, undefined)
})

test('the marketplace lists this plugin and the manifest names its hooks and skills', async () => {
  const marketplace = await json('.github/plugin/marketplace.json')
  assert.equal(marketplace.name, 'actera')
  assert.deepEqual(marketplace.plugins.map((p) => [p.name, p.source]), [['actera', './plugins/actera']])
  const manifest = await json('plugins/actera/plugin.json')
  // An Agent Plugins 1.0 manifest at the plugin root, with that version's fields only:
  // skills and hooks are found by their folders, not named here.
  assert.equal(manifest.$schema, 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json')
  const fields = ['$schema', 'name', 'version', 'description', 'author', 'homepage', 'repository', 'license', 'keywords', 'extensions']
  assert.deepEqual(Object.keys(manifest).filter((field) => !fields.includes(field)), [])
  assert.ok(manifest.keywords.length <= 10 && manifest.keywords.every((keyword) => /^[a-z0-9-]{1,30}$/.test(keyword)))
  assert.ok(manifest.description.length <= 500)
  assert.equal(manifest.name, 'actera')
  assert.equal(manifest.license, 'Apache-2.0')
  assert.equal(manifest.repository, 'https://github.com/Actera-AI/actera-copilot')
  assert.equal(marketplace.plugins[0].version, manifest.version, 'The catalog and the manifest name one version')
  assert.match(manifest.version, /^\d+\.\d+\.\d+$/)
  const changelog = await readFile(new URL('../../CHANGELOG.md', import.meta.url), 'utf8')
  assert.match(changelog, new RegExp(`^## ${manifest.version.replaceAll('.', '\\.')}$`, 'm'), 'CHANGELOG.md describes this version')
})

// Connect and status may be chosen by Copilot from plain words; the skills that
// weaken enforcement or remove the connection run only when the person invokes them.
const explicitOnly = new Set(['mode', 'disconnect'])

test('each skill uses the plugin command line, and only the person can change or remove enforcement', async () => {
  for (const skill of skills) {
    const body = await readFile(new URL(`../../plugins/actera/skills/${skill}/SKILL.md`, import.meta.url), 'utf8')
    const [, frontmatter] = body.match(/^---\n([\s\S]+?)\n---\n/)
    assert.match(frontmatter, new RegExp(`^name: ${skill}$`, 'm'))
    assert.match(frontmatter, /^description: .+$/m)
    assert.equal(/^disable-model-invocation: true$/m.test(frontmatter), explicitOnly.has(skill))
    assert.match(body, /bin\/actera-hook\.mjs/)
    assert.ok(!/api.?key|ACTERA_API_KEY/i.test(body.replace(/machine key/gi, '')), `${skill} must not handle keys`)
  }
})

test('the vendored agent-hooks files match the lock', () => {
  checkVendored()
})

test('installation validation rejects extra files and changed runtime code', async () => {
  const stage = await mkdtemp(join(tmpdir(), 'actera-copilot-distribution-'))
  try {
    for (const name of pluginFiles) {
      await mkdir(dirname(join(stage, name)), { recursive: true })
      await copyFile(new URL('../../plugins/actera/' + name, import.meta.url), join(stage, name))
    }
    await checkPlugin(stage)
    await writeFile(join(stage, 'notes.txt'), 'development-only')
    await assert.rejects(checkPlugin(stage), /exactly the runtime files/)
    await rm(join(stage, 'notes.txt'))
    await writeFile(join(stage, 'bin/actera-hook.mjs'), '// stale installation')
    await assert.rejects(checkPlugin(stage), /Installed file differs/)
  } finally {
    await rm(stage, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 })
  }
})
