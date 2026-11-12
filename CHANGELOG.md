# Changelog

## 0.1.0

- First release for GitHub Copilot CLI. Native `preToolUse`, `postToolUse` and
  `postToolUseFailure` hooks check each tool call with Actera, hold calls that need approval,
  and report each call's outcome. Actions are `copilot.tool.<tool>` and `copilot.mcp.<tool>`.
- Skills: `/actera:connect` (browser approval or a setup code), `/actera:status`,
  `/actera:mode` and `/actera:disconnect`.
- Vendors `@actera-ai/agent-hooks` 0.5.0.
