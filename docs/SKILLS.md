# Install Openvid skills

The three public skills are maintained once in `skills/`: `openvid`, `openvid-docs`, and `openvid-create`. `.agents/skills/openvid*` are repository-discovery symlinks to those directories. Other contributor skills under `.agents/skills` are not included in the distribution.

## Install just the skills

From a checkout of https://github.com/NWYLZW/openvid:

```sh
node cli/install-skills.mjs
```

This installs all three into `~/.agents/skills`. Use `--dest /your/skills/directory` for another agent or a test installation. Existing skill directories are never overwritten; choose a new destination or manage the existing installation explicitly. On Windows where Git symlinks are unavailable, this copy-based installer still works from the canonical `skills/` sources. If you also open this repository, avoid enabling both the installed copy and repository copy in an agent that displays duplicate skill names.

Codex's skill installer can also install all three GitHub paths together: `skills/openvid`, `skills/openvid-docs`, `skills/openvid-create`. Ask it to install these paths from `NWYLZW/openvid`, preferably pinned to a reviewed commit. Installing only the routing skill leaves its companion skills missing.

## Build and install the Codex plugin

```sh
node cli/package-skills.mjs
codex plugin marketplace add ./dist/openvid-skills
codex plugin add openvid@openvid
```

The build creates a local marketplace at `dist/openvid-skills/.agents/plugins/marketplace.json` and a self-contained plugin at `dist/openvid-skills/plugins/openvid/`. A downloaded distribution archive has the same structure; run the last two commands with its extracted root instead of `./dist/openvid-skills`. The plugin manifest is `.codex-plugin/plugin.json`; it includes the three skills, no hooks, MCP server, credentials or editor binaries. A custom package location is supported with `--out DIRECTORY`; packaging refuses to overwrite an existing output.

These commands describe an initial installation. Building the package does not install it into your account, publish it to a public directory, or register a marketplace on your machine. When publishing a new version, bump the plugin manifest version and regenerate the artifact; never edit installed plugin caches as the source of truth. Install the plugin OR standalone skills, rather than both.

The standalone installer is also included inside the packaged plugin:

```sh
node /path/to/distribution/plugins/openvid/cli/install-skills.mjs
```

## Connect the installed skill to the editor

Installing skills does not install Openvid, Node/pnpm, ffmpeg, or Computer Use. Use a checkout containing `cli/openvid.mjs` and `lib/local-edit.ts` and follow `openvid-docs` for the local-only build. Skill installation paths and project paths are independent.

```sh
node ~/.agents/skills/openvid-docs/scripts/openvid.mjs --project /path/to/openvid locate
node ~/.agents/skills/openvid-docs/scripts/openvid.mjs --project /path/to/openvid help
node ~/.agents/skills/openvid-docs/scripts/openvid.mjs --project /path/to/openvid status --port 3088
```

The bridge accepts `--project`, then `OPENVID_PROJECT`, then the current directory and its ancestors. An invalid explicit path fails; it never silently switches projects. `locate` is read-only and does not start services. From the verified checkout you can also run `pnpm openvid ...` directly.

The portable skill instructions keep their own references together and refer to runtime files as `<project>/...`. Recipes and actual media stay in the editor/workspace, not in installed skill caches. The original PolyForm Noncommercial license remains applicable; see the included `LICENSE.md`.

## Validate distribution

```sh
node --test tests/skills-distribution.test.mjs
```

Tests package and install into temporary directories, resolve the real checkout from an unrelated working directory, execute its real CLI help through the installed bridge, check relative references and symlinks, and verify refusal to overwrite installations. They do not launch a service or alter your personal Codex configuration. Plugin schema validation is a separate check; a valid package is not a public-directory listing or proof of installation in every agent.
