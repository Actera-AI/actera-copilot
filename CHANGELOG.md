# Changelog

## 0.1.2

- The plugin follows the Agent Plugins 1.0 layout: its manifest is `plugin.json` at the plugin
  root, and its hooks are in `com.github.copilot/hooks/hooks.json`. Behavior is unchanged on
  the Copilot CLI this plugin requires (1.0.109 or later) and in VS Code 1.143. A Copilot CLI
  from before the 1.0 manifest would load the skills without the hooks.

## 0.1.1

- Works with the Copilot agent in VS Code, which loads plugins installed with the CLI. Its
  Copilot runtime passes hooks no tool call ID. With 0.1.0, Enforcing denied every tool call there
  when set to block on an evaluation failure (the default) and let every call run unchecked
  when set to allow, and Monitoring recorded calls late and without outcomes. Vendors
  `@actera-ai/agent-hooks` 0.5.1, which checks and reports those calls.

## 0.1.0

- First release for GitHub Copilot CLI. Native `preToolUse`, `postToolUse` and
  `postToolUseFailure` hooks check each tool call with Actera, hold calls that need approval,
  and report each call's outcome. Actions are `copilot.tool.<tool>` and `copilot.mcp.<tool>`.
- Skills: `/actera:connect` (browser approval or a setup code), `/actera:status`,
  `/actera:mode` and `/actera:disconnect`.
- Vendors `@actera-ai/agent-hooks` 0.5.0.
