# Release Process

## Versioning
- Semantic versioning is used: `MAJOR.MINOR.PATCH`.
- Use root scripts to bump versions:
  - `npm run release:patch`
  - `npm run release:minor`
  - `npm run release:major`

These commands:
1. Update root `package.json` version.
2. Insert a new version heading in `CHANGELOG.md` after `[Unreleased]`.

## Standard Release Steps
1. Run local parity checks:

```bash
npm run ci:local
```

2. Bump version (patch/minor/major).
3. Curate `CHANGELOG.md` entries for the new version.
4. Commit release metadata:

```bash
git add package.json CHANGELOG.md
git commit -m "chore(release): vX.Y.Z"
```

5. Tag release:

```bash
git tag vX.Y.Z
```

6. Push branch and tag.
7. Create GitHub release.

## Release Checklist Workflow
- Trigger workflow: **Release Checklist** (`.github/workflows/release-checklist.yml`)
- Provide:
  - `target_version`
  - `release_notes`
- Workflow validates semver format and changelog heading presence.
