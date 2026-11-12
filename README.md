# Actera for GitHub Copilot

Check GitHub Copilot CLI tool calls against Actera policies before they run, hold calls
that need approval until a reviewer decides, and report each call's outcome. The plugin
uses Copilot CLI hooks; it covers shell commands, file reads and edits, MCP tools and other
local tools.

[Actera](https://actera.dev) is a hosted service that decides whether AI agents may take
actions. This plugin is published by Actera and needs an Actera account. Licensed under
[Apache-2.0](LICENSE).

## Status

Alpha, tested on Windows with GitHub Copilot CLI 1.0.109 and with the Copilot agent in
VS Code 1.143. CI installs the plugin with the Copilot CLI on Linux, macOS and Windows.
Behavior and settings can change between minor versions before 1.0; see
[CHANGELOG.md](CHANGELOG.md).

VS Code picks up plugins installed with the CLI and runs their hooks in its Copilot agent,
with the connection and mode set from the CLI. The GitHub Copilot app and Copilot in the
cloud can also load Copilot plugins; the hooks have not been tested there.

## Installation

Requires Node.js 22+ and GitHub Copilot CLI 1.0.109 or later. In a terminal:

```sh
copilot plugin marketplace add Actera-AI/actera-copilot
copilot plugin install actera@actera
```

Then, in Copilot:

1. Run `/actera:connect`. A browser page opens for a workspace administrator to name a new
   agent or choose an existing one. Confirm that the code on the page matches the one
   Copilot shows. With a setup code from the Actera Overview, run
   `/actera:connect <code>` instead; it connects to the agent the code was made for, with no
   browser page.
2. Start a new session, or run `/restart`. Copilot loads a plugin's hooks when a session
   starts.
3. Use any tool. Each call appears in Actera's Decisions.

No API URL or machine key is needed; the plugin never displays the key. Its state lives
under `~/.actera/copilot`.

## Skills

| Skill | Does |
| --- | --- |
| `/actera:connect [setup code]` | Connects this Copilot to an Actera agent. `--reconnect` replaces an existing connection. |
| `/actera:status` | Shows the connection, mode, whether the hooks run, and reports waiting to be sent. |
| `/actera:mode` | Switches between Monitoring and Enforcing, and chooses what happens when Actera cannot evaluate. |
| `/actera:disconnect` | Sends queued reports, ends the connection in Actera, and removes this machine's connection. |

Copilot runs `/actera:mode` and `/actera:disconnect` only when you invoke them.

The default mode is **Monitoring**: every tool call creates a Decision and nothing is
blocked. In **Enforcing**:

- A blocked call is denied with the reason from Actera.
- A call that needs approval waits while Actera notifies reviewers in Actera, Slack or
  email. Approval releases the call; rejection denies it with the reviewer's reason.
- After 540 seconds without a decision the call is denied with a link to review it, and an
  identical retry in the same session within an hour reuses the approval once.
- When Actera cannot be reached, calls are denied unless you choose to fail open with
  `/actera:mode`.

## What policies see

Actions use Copilot's own tool names: `copilot.tool.<tool>`, such as `copilot.tool.bash`,
`copilot.tool.powershell`, `copilot.tool.view`, `copilot.tool.create`, `copilot.tool.edit`
and `copilot.tool.apply_patch`, and `copilot.mcp.<tool>` for MCP tools, with the server
under `action.attributes.mcp`. Which file editing tool Copilot uses depends on the model.
`apply_patch` sends its patch as text, which policies read as
`action.attributes.parameters.patch`. Session details are under `context.copilot`, such as
`context.copilot.cwd`.

| Copilot event | Reported outcome |
| --- | --- |
| `postToolUse` | Tool succeeded |
| `postToolUse` for a shell command with a non-zero exit code | Tool failed |
| `postToolUseFailure` | Tool failed |

A call that Actera denies, or that Copilot's own permission check refuses, has no report: it
did not run. These reports describe Copilot's tool lifecycle. They do not prove that an
external effect took place.

## Data and credentials

Each decision request sends the tool name, the redacted tool input, the MCP server and tool
name for MCP tools, and Copilot's session, subagent and tool call identifiers and working
directory. Execution reports repeat the same action and context. Prompt text, model output
and tool results are never sent.

The plugin redacts sensitive field names and uses bundled Gitleaks 8.30.1 to detect
credentials inside argument strings before storing or sending them. Ordinary commands and
file paths stay visible to policies. Secret detection is best effort; it is not general PII
anonymization or a guarantee that all credentials are found. The original tool input is
unchanged. Decisions include `context.input_capture` with the capture status and the
redacted JSON pointer paths, reasons and detector rule IDs.

The scanner is bundled for Windows, macOS and Linux (x64 and ARM64) and verified against
pinned checksums. It runs once for each tool call on this machine; tool inputs are never sent
to an external scanning service. When the scanner fails or the input is too large, Monitoring
records the omission and Enforcing follows the evaluation-failure choice (block by default).
Raw inputs are never sent as a fallback. Requests use HTTPS outside loopback and reject
redirects.

Configuration, the agent's key and queued reports live under `~/.actera/copilot`. The key is
scoped to this agent: it cannot administer the workspace or read full Decisions. Protect the
local account and state directory; Unix files are owner-only, while Windows inherits profile
ACLs. Never put the key in a repository or in Copilot's settings.

## Limits

- Copilot lets a call run when a hook exceeds its timeout, so the plugin denies a held call
  before its own 600 second hook timeout. A disabled or uninstalled plugin checks nothing.
  For mandatory enforcement, deploy the same hooks as Copilot
  [policy hooks](https://docs.github.com/en/copilot/reference/hooks-reference) on each
  machine, with the full path to `actera-hook.mjs` in place of `${PLUGIN_ROOT}`.
- Copilot keeps one skill per name, and a skill of your own wins over a plugin's. With your
  own skill named `connect`, `status`, `mode` or `disconnect`, that Actera command is
  unknown to Copilot. Run the plugin's command line instead, for example
  `node ~/.copilot/installed-plugins/actera/actera/bin/actera-hook.mjs status`.
- Copilot names an MCP tool `<server>-<tool>`. The plugin reads which server a call went to
  from Copilot's session log; when that record is missing the call is recorded as
  `copilot.tool.<server>-<tool>`.
- Approvals happen in Actera, Slack or email. Copilot cannot ask about a held call from a
  hook.
- The Copilot runtime in VS Code gives tool calls no ID, so there an outcome is matched to
  its call by session, tool and exact arguments. Two identical calls in one turn can have
  their outcomes swapped.

See [operations](docs/operations.md) for status, delivery, disconnecting and credential
rotation.

## Updates

```sh
copilot plugin marketplace update actera
copilot plugin update actera@actera
```

Then start a new Copilot session.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for the checks, local development against your own
Actera API, and updating the vendored hook package. Development files stay outside the
installed plugin; it contains the hooks, skills, vendored bridge, scanner bundles, a README and
licenses.

## Security

Report vulnerabilities privately to [hello@actera.dev](mailto:hello@actera.dev). See
[SECURITY.md](SECURITY.md) for what to include.
