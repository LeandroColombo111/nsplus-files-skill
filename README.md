# nsplus-files

Read and write `.nsplus` files (the format used by the [NS+](https://nsplusowner.github.io/NSPlus-0/)
Nassi-Shneiderman diagram tool) from the command line, without opening the
web editor.

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

## Usage

```bash
# Read an existing .nsplus file as JSON
node nsplus_lib/nsplus.js read path/to/file.nsplus

# Write a new .nsplus file from a JSON spec
node nsplus_lib/nsplus.js write out.nsplus '<json spec>'
```

See `SKILL.md` for the full spec format, the statement-type reference, and
the reasoning behind each fix (this file began life as a
[Claude](https://claude.com) skill built while reverse-engineering the format
for a Programación I course at ORT).

## License

Personal project for study purposes. `nsplus_lib/js/**` are verbatim copies
of the NS+ tool's own client-side source, included so the generator can run
them locally — all credit for that code goes to the original NS+ project.
