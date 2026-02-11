# Pare — Frequently Asked Questions

## Token & Context Cost

### "MCPs are token heavy. How does that work out?"

The tool definitions do have an upfront context cost — that's true of any MCP server. But Pare runs CLI commands locally in your environment just like a shell tool would — no extra context cost there. The savings come from the **output** side: instead of dumping raw terminal text back into context, Pare returns structured JSON that's typically 30-50% leaner. After a couple of tool calls, you come out ahead on net context usage.

### "JSON is verbose compared to plain text though?"

Raw CLI output isn't minimal either — it's full of whitespace padding, box-drawing characters, ANSI formatting, repeated column headers, and progress indicators. Pare strips all that and returns only the fields an agent actually needs. The savings come from _structured minimal JSON_ vs _decorated terminal output_, not raw JSON vs raw text.

### "If I use frequent intentional compaction, I only make a few tool calls per session. Is it still worth it?"

Valid point. If you're running tight sessions with aggressive compaction and repo-specific CLAUDE.md instructions, the upfront tool registration cost matters more relative to fewer calls. The tradeoff shifts when you're in longer sessions, working across multiple repos, or using clients other than Claude Code (where CLAUDE.md isn't an option). Pare also gives you schema-validated structured output an agent can reason about directly — no parsing logic needed in your prompts.

## Architecture

### "Is Pare actually an MCP server?"

Yes. Pare implements the full Model Context Protocol and communicates through the standard MCP transport. It works with any MCP-compatible client out of the box — Claude Code, Claude Desktop, Cursor, Windsurf, custom agents, etc.

### "Why not just build skills or scripts instead?"

Skills are great in a single-client ecosystem like Claude Code, but Pare works with any MCP-compatible client. MCP is the universal protocol for tool discovery and invocation, so you get the structured output benefit regardless of which client you're using. Building it as platform-specific skills would lock us to one client.

### "Does Pare wrap other MCPs, or is it standalone?"

Pare is a set of standalone MCP servers. Each one (git, npm, cargo, etc.) calls the underlying CLI directly, parses the output, and returns typed structured JSON with a Zod-validated schema. It's not a wrapper around other MCP servers.

## Response Quality

### "Does structured output actually improve agent reasoning, or just save tokens?"

No formal benchmark yet, but from daily usage with Claude Code we've seen no degradation in response quality — if anything it's better. When an agent gets a structured diff with `file`, `additions`, `deletions` fields it doesn't hallucinate line counts from eyeballing patch text. A `success: false` boolean is unambiguous vs the agent trying to grep "FAILED" out of a wall of stdout. Fewer tokens _and_ less room for misinterpretation.

A proper eval comparing agent accuracy on raw CLI vs Pare structured output is planned — see [#110](https://github.com/Dave-London/Pare/issues/110).

## Configuration

### "Do I have to load all 65 tools?"

No. Pare has ~10 servers with ~6 tools each. You only install the servers you need — if you just want git, that's about 10 tool definitions. We're also exploring more granular per-tool filtering — see [#111](https://github.com/Dave-London/Pare/issues/111).
