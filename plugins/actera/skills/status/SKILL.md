---
name: status
description: Show the Actera connection, mode, evaluation-failure behavior, whether the hooks run, and report delivery.
---

The Actera plugin's command line is `<base directory>/../../bin/actera-hook.mjs`, where `<base directory>` is this skill's base directory (`skills/<name>` inside the plugin folder). Resolve it to an absolute path; call that plugin folder `<plugin folder>` below. Run `node "<plugin folder>/bin/actera-hook.mjs" status` with its absolute path.

If `configured` is false, Actera is not connected: say so, that nothing is checked until `/actera:connect` runs, and the mode it will start in. Stop there; the hook and report lines below do not apply yet.

Otherwise summarize in plain language:

- Which agent Actera is connected to.
- The mode (`settings.modeName`) and the evaluation-failure choice (`settings.evaluationFailureName`). In Monitoring, tool calls always continue and the failure choice applies only in Enforcing.
- Whether the hooks run. If `hooksNeedAttention` is present, say exactly that: no Actera hook has run in Copilot yet, so the person should start a new Copilot session or run `/restart`. Otherwise give the time and event of `lastHook`.
- Reports waiting to be sent: `queue.executionReports` are tool outcomes and `queue.decisionRetries` are policy checks Actera could not receive yet, with the oldest pending age. The hooks send them on the next tool call. Report `lastError` if present, without claiming it proves Actera is down.

`/actera:mode` changes the mode. Do not edit the plugin's state folder yourself.
