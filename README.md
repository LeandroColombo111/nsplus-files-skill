# nsplus-files

Read and write `.nsplus` files (the format used by the [NS+](https://nsplusowner.github.io/NSPlus-0/)
Nassi-Shneiderman diagram tool) from the command line, without opening the
web editor.

Built on top of **[XNSDiagrams](https://github.com/CharlyCimino/XNSDiagrams)**,
the open-source engine behind NS+.

This is a [Claude](https://claude.com) skill: `SKILL.md` teaches Claude the
format so it can generate and check diagrams for you (e.g. to practice
exercises), and `nsplus_lib/` is the CLI it uses. The CLI also works on its
own, without Claude.

It works by running the NS+ tool's **own** extracted JavaScript source inside
a Node + [jsdom](https://github.com/jsdom/jsdom) sandbox, so the generated
files are structurally identical to ones the live editor itself would
produce (including the `draggable`/`type` attributes and DOM wrapping that
the declarative renderer alone doesn't add — see `SKILL.md` for the details).

## Setup

```bash
cd nsplus_lib
npm install
```

## Installing as a Claude skill

Clone this repo into your skills folder (e.g. `~/.claude/skills/nsplus-files`
for Claude Code) and run `npm install` inside `nsplus_lib`. Claude will pick
it up automatically when you ask it to read or create `.nsplus` files.

## Usage

```bash
# Read an existing .nsplus file as JSON
node nsplus_lib/nsplus.js read path/to/file.nsplus

# Write a new .nsplus file from a JSON spec
node nsplus_lib/nsplus.js write out.nsplus '<json spec>'
```

See `SKILL.md` for the full spec format, the statement-type reference, and
the reasoning behind each fix (built while reverse-engineering the format
for a Programación I course at ORT).

## License

Personal project for study purposes, released under the MIT License (see
[`LICENSE`](LICENSE)).

`nsplus_lib/js/**` are verbatim copies of the client-side source of
[XNSDiagrams](https://github.com/CharlyCimino/XNSDiagrams), Copyright (c) 2018
axxonita, distributed under the MIT License (see
[`nsplus_lib/js/LICENSE`](nsplus_lib/js/LICENSE)). They are included so the
generator can run them locally — all credit for that code goes to the original
project.
