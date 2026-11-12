# Installation checks

The marketplace is a catalog in this repository, `.github/plugin/marketplace.json`.
Copilot installs a copy of `plugins/actera` from the repository's default branch
into `installed-plugins/actera/actera` under the Copilot home.

## Repository access

Copilot fetches the marketplace with the machine's Git configuration. The
repository is public, so no credentials are needed. The marketplace contains no
Actera machine key. Installation and connecting to Actera are separate steps.

## Before merging a version bump

Run from a clean checkout:

```sh
npm test
npm run check:plugin
npm run check:release
```

Then install the checkout into a disposable Copilot home, never your own:

```sh
export COPILOT_HOME="$(mktemp -d)"
copilot plugin install ./plugins/actera
node scripts/check-plugin.mjs "$COPILOT_HOME"/installed-plugins/_direct/actera-*
```

The checker compares every installed runtime and license file, and the scanner
checksums, with the checkout, and rejects extra or missing files. CI runs the same
install on Linux, macOS and Windows for every pull request. After a merge to
`main`, it also installs from the GitHub repository.

## Host acceptance

On a supported Copilot CLI, verify connecting (browser approval and a setup code),
an allowed call, a blocked call, a held call approved in Actera and one rejected, a
hold that runs out and its approved retry, an MCP tool, an unavailable API, a
queued report flush, disconnecting, and a plugin update. CI does not exercise the
full host and service path.

A plugin can be disabled or uninstalled, and Copilot lets a call run when a hook
exceeds its timeout. Actera's decision is advisory in that case; mandatory
enforcement belongs in policy hooks or an application-owned gateway.
