---
name: disconnect
description: Disconnect this GitHub Copilot CLI from Actera and remove the plugin's local state.
disable-model-invocation: true
---

Run this only when the person asked to disconnect in this conversation. The Actera plugin's command line is `<base directory>/../../bin/actera-hook.mjs`, where `<base directory>` is this skill's base directory (`skills/<name>` inside the plugin folder). Resolve it to an absolute path; call that plugin folder `<plugin folder>` below. Run `node "<plugin folder>/bin/actera-hook.mjs" disconnect` with its absolute path. Append `--discard` only when the person explicitly asks to discard undelivered reports.

The command first sends queued tool outcomes and policy checks. If some could not be delivered, tell the person how many and the error, and that nothing was removed. They can retry later, or ask to disconnect with `--discard` to delete them. Never add `--discard` on your own.

After success, tell the person that this machine's Actera key, settings and queued reports were removed. The command also ends the connection in Actera, so the agent shows as disconnected there and the key stops working. If the result has `revoked: false`, Actera could not be reached or refused: say so with `revokeError`, and that an administrator should disconnect the agent on its page in Actera. The plugin stays installed but checks nothing until `/actera:connect` runs again; to remove it, run `copilot plugin uninstall actera@actera` in a terminal.
