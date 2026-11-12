# Operating the Copilot integration

Use `/actera:status` in Copilot to see the connection, mode, failure behavior, hook
activity and delivery status. For diagnostics, run the plugin's command line with
Node.js. In an installed plugin it is `bin/actera-hook.mjs` in the plugin folder
(`~/.copilot/installed-plugins/actera/actera` by default); in this repository it is
`plugins/actera/bin/actera-hook.mjs`:

```sh
node plugins/actera/bin/actera-hook.mjs status
node plugins/actera/bin/actera-hook.mjs flush
```

`status` shows the connection, `lastHook` (the last hook Copilot ran), queue depth,
and the last delivery error. `hooksNeedAttention` means no Actera hook has run yet:
start a new Copilot session or run `/restart`, then use any tool.

## Hooks and enforcement

The plugin registers Copilot's native `preToolUse`, `postToolUse` and
`postToolUseFailure` hooks, with no matcher, so every tool call is checked. Copilot
runs them with Node.js directly, without a shell. `preToolUse` asks Actera and
returns Copilot's `permissionDecision`; the other two queue the execution report:
`SUCCESS` after `postToolUse` and `FAILURE` after `postToolUseFailure`.

Copilot denies a call when a `preToolUse` hook exits with an error, and lets it run
when the hook exceeds its timeout. The hook therefore always exits cleanly, denies
on its own only in Enforcing, and ends a held call before the plugin's 600 second
hook timeout. A disabled or uninstalled plugin checks nothing; for mandatory
enforcement, deploy the same hooks as Copilot
[policy hooks](https://docs.github.com/en/copilot/reference/hooks-reference) on each
machine. A policy file has no `${PLUGIN_ROOT}`, so give it the full path to
`actera-hook.mjs`.

## Held calls

In Enforcing mode, a call that needs approval waits while Actera notifies
reviewers in Actera, Slack or email. An approval releases this call only, and
Copilot runs it without asking again. A rejection denies it with the reviewer's
reason. After 540 seconds without a decision (`ACTERA_HOLD_SECONDS`) the call is
denied with a link to review it, and an identical retry in the same session within
an hour reuses the approval once.

## Mode and evaluation failures

`/actera:mode` switches between **Monitoring** (default) and **Enforcing**, and
chooses what happens when Actera cannot evaluate a call: **block** (fail closed,
default) or **allow** (fail open). The failure choice applies only in Enforcing;
explicit denials and required approvals stay enforced either way. Both settings
live in the bridge state directory, survive reconnecting, and apply to the next
tool call. `ACTERA_MODE` and `ACTERA_EVALUATION_FAILURE` override them. Policy
configuration in Actera never changes them.

## Captured input

Tool inputs are scanned locally with the bundled Gitleaks engine, and known
sensitive field names are redacted, before anything is queued or sent. Detection
is best effort; ordinary commands and file paths stay visible. Prompts, tool
output and error text are never sent. Decisions include `context.input_capture`
with the capture status and redacted JSON pointer paths. Inputs over 512 KiB are
omitted. If the scanner cannot start or fails, no raw values are sent: Monitoring
records the call with omitted inputs, and Enforcing treats it as an evaluation
failure.

Copilot names an MCP tool `<server>-<tool>`. The plugin reads the server and tool
for that call from the session's `events.jsonl` under the Copilot home and records
`copilot.mcp.<tool>` with the server under `action.attributes.mcp`. When that
record is missing, the call is recorded as `copilot.tool.<server>-<tool>`.

## Offline delivery

Hooks save reports durably and send them before they exit; there is no background
process. Failures stay queued with a short back-off and are retried by the next
hook; `flush` retries at once. The queue holds up to 128 reports. When it is full,
reporting fails visibly in status, and policy checks still run. Reports keep their
idempotency key across retries.

A new connection archives the previous key and its undelivered reports under
`~/.actera/copilot/archived/`; they are not sent with the new key. The archive can
contain tool inputs, so keep it private and review it before removing it.

## Disconnecting and removing the plugin

Run `/actera:disconnect` before removing the plugin. It sends queued reports, ends
the connection in Actera so the key stops working, and deletes `~/.actera/copilot`,
including the machine key and archives. If reports cannot be sent, it stops
without deleting anything; `--discard` deletes them instead. If Actera cannot be
reached, local state is still removed and the agent should be disconnected on its
page in Actera. Then remove the plugin:

```sh
copilot plugin uninstall actera@actera
```

## Credential rotation

If the machine key is lost or compromised, disconnect the agent in Actera, then
run `/actera:connect --reconnect` and approve the previous agent to keep its
identity and policies.
