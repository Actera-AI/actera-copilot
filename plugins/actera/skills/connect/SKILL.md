---
name: connect
description: Connect this GitHub Copilot CLI to an Actera agent through administrator browser approval, or with a setup code from Actera.
argument-hint: "[setup code] [--reconnect]"
---

Connect Actera without asking for or displaying a machine key.

The Actera plugin's command line is `<base directory>/../../bin/actera-hook.mjs`, where `<base directory>` is this skill's base directory (`skills/<name>` inside the plugin folder). Resolve it to an absolute path; call that plugin folder `<plugin folder>` below. Run it with Node.js using its absolute path, as a shell command with a ten-minute timeout. Keep it attached until it prints its result.

- If the person gave a setup code from Actera (16 letters and digits, usually in four groups such as `7AHV-F8T0-M349-HPF7`), run `node "<plugin folder>/bin/actera-hook.mjs" connect --setup-code <code>`. It connects to the agent an administrator made the code for, with no browser page. A code works once and expires after 30 minutes; if it fails, tell the person to get a new code from Actera.
- Otherwise run `node "<plugin folder>/bin/actera-hook.mjs" connect`. It opens an Actera page in the browser and waits for an administrator to approve the connection. Tell the person to check that the code on that page matches the one the command prints. The page suggests a new agent named GitHub Copilot; an administrator can rename it or choose an existing agent.
- Add `--reconnect` only when the person asks to reconnect.

The plugin includes its Actera API endpoint. Do not ask for an API URL, agent ID, key, policies or fallback behavior. Never request, print or pass a machine key.

Before connecting, tell the person what the plugin sends: each tool call's name and inputs, after it redacts sensitive fields and scans for secrets with the bundled Gitleaks. Detection is best effort; ordinary commands and file paths stay visible. Prompts and tool output are not sent.

After it connects, report the mode and the evaluation-failure choice the command printed. Monitoring (the default) records every tool call and never blocks. Enforcing blocks what policies deny and holds calls that need approval until a reviewer decides in Actera, Slack or email. `/actera:mode` changes either setting.

Then tell the person the one step left: start a new Copilot session, or run `/restart`. Copilot loads a plugin's hooks when a session starts, so tool calls in this session are not checked. `/actera:status` shows whether the hooks have run. Do not describe connecting alone as proof that tool calls reach Actera.
