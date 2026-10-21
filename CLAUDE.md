@AGENTS.md

## Claude Code notes
- The skill is `skills/motion-skill/` and is linked at `.claude/skills/motion-skill`, so `/motion-skill <url|file|slug> [--format 16:9|9:16] [--length 5m]` works when Claude Code runs in this folder. If the symlink is missing (Windows without symlink support), copy the folder: `cp -r skills/motion-skill .claude/skills/`.
- Use the Agent tool for the crew in the skill (scriptwriter, fact-checker, visual-reviewer, package-auditor). Spawn independent work in parallel.
- Ask gate questions in one block (AskUserQuestion).
