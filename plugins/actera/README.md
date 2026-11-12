# Actera for GitHub Copilot

Actera decides whether AI agents may take actions. This plugin sends each GitHub Copilot CLI tool call to your Actera workspace before it runs. Your policies allow it, block it, or hold it until a reviewer approves, and every attempt is recorded as a decision with its outcome.

The plugin is tested with the GitHub Copilot CLI and with the Copilot agent in VS Code, which picks up plugins installed with the CLI and uses the same connection and mode. The GitHub Copilot app and Copilot in the cloud can also load Copilot plugins; the hooks have not been tested there. It needs an Actera account, Node.js 22 or later, and GitHub Copilot CLI 1.0.109 or later.

## Get started

1. Run `/actera:connect`. A browser page opens for a workspace admin to name the agent or select an existing one. Check that the code on the page matches the one in the connect command's output.
2. Start a new session or run `/restart`, so Copilot loads the plugin's hooks.

The plugin starts in Monitoring mode, which records decisions and never blocks. To block and hold calls, run `/actera:mode enforcing`.

| Command | What it does |
| --- | --- |
| `/actera:connect` | Connects this machine to an Actera agent |
| `/actera:status` | Shows the connection, the mode, and whether reports are being delivered |
| `/actera:mode` | Switches between Monitoring and Enforcing, and sets what happens when Actera cannot evaluate |
| `/actera:disconnect` | Delivers queued reports, ends the connection in Actera, and removes local state |

## Examples

- **See what your agent did.** Connect in Monitoring mode, ask Copilot to fix a bug, then open Decisions in Actera to see each file edit and shell command it attempted.
- **Block a command.** Publish a policy that blocks `git push --force`, assign it to the agent, switch to Enforcing, and ask Copilot to force-push. The call is denied and the reason appears in Copilot.
- **Require approval.** Publish a policy that requires approval for a shell command, then ask Copilot to run it. The call waits in Copilot until a reviewer approves or rejects it in Actera, Slack or email.

## Modes and failures

- **Monitoring** asks Actera about every call and records the result without blocking.
- **Enforcing** denies blocked calls and holds calls that need approval. A call still waiting after 540 seconds is denied with a link to review it, and the same call can be retried once it is approved. If Actera cannot be reached, calls are blocked by default. `/actera:mode` can change that to allow.

## What the plugin sends

The plugin connects only to the Actera service at `https://app.actera.dev`, over HTTPS.

Each decision request and execution report contains the tool name, the redacted tool input, the MCP server and tool name for MCP tools, Copilot's session and subagent identifiers, the tool call identifier where Copilot passes one, and the working directory.

Sensitive field names are masked, and Gitleaks looks for credentials in argument strings, before anything is stored or sent. Detection is best effort. Ordinary commands and file paths remain visible to policies. Prompt text, model output, and tool results are never sent.

Privacy policy: <https://actera.dev/legal/privacy-policy>

## What the plugin runs on your machine

- **Hooks** on `preToolUse`, `postToolUse`, and `postToolUseFailure` run `bin/actera-hook.mjs` with Node.js. Each hook sends its own reports, and nothing keeps running after it ends.
- **Gitleaks 8.30.1** ships as compiled programs for Windows, macOS, and Linux in `vendor/agent-hooks/vendor/gitleaks`. They come from the Gitleaks project, and the plugin checks them against pinned checksums before unpacking one to `~/.actera/copilot`. It runs once for each tool call, on this machine only.
- **For an MCP tool**, the hook reads the end of the current session's `events.jsonl` in the Copilot home to find which server the tool belongs to. Only the server and tool names are sent.
- **`/actera:connect`** opens your browser and stores a scoped key.

Keys, settings, and queued reports are stored in `~/.actera/copilot`. The agent key cannot administer the workspace or read full decisions. `/actera:disconnect` removes all of it.

Copilot lets a call run when a hook exceeds its timeout, and a disabled or uninstalled plugin checks nothing. For mandatory enforcement, deploy the same hooks as Copilot [policy hooks](https://docs.github.com/en/copilot/reference/hooks-reference) on each machine.

Copilot keeps one skill per name, and a skill of your own wins. With your own skill named `connect`, `status`, `mode` or `disconnect`, that Actera command is unknown to Copilot; run `node bin/actera-hook.mjs <command>` from this folder instead.

## Help

- Source and troubleshooting: <https://github.com/Actera-AI/actera-copilot>
- Issues: <https://github.com/Actera-AI/actera-copilot/issues>
- Support: hello@actera.dev

Licensed under Apache-2.0. Gitleaks is licensed under MIT; see `vendor/agent-hooks/vendor/gitleaks/LICENSE`.
