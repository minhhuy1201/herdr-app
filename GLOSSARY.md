# Herdr personal config

The person's own Herdr layout and panels: the right panel's Files, Changes and Git Graph, and the review dialog they open.

## Language

**Commit**:
One entry in the Git Graph or in the Changes panel's commit list: a recorded change with its subject and changed files.
_Avoid_: PR (a merge commit is still a Commit)

**Merge commit**:
A Commit with more than one parent. Its changed files are measured against its first parent.
_Avoid_: PR, pull request

**Working change**:
A file that differs from the last Commit, as the Changes panel lists it: staged, unstaged or untracked.
_Avoid_: uncommitted change, local change

**Branch range**:
The files HEAD changed since it left its comparison branch (its upstream, else the remote's default branch), counted from their merge base,, listed in the Changes panel's "Committed" group.
_Avoid_: committed changes, unpushed files

**Review dialog**:
The dialog that shows a side-by-side diff for review only. It shows either every file of one Commit, with a file list and a search field, or one Working change or one Branch range file on its own.
_Avoid_: diff modal, diff popup, diff tab

**Side-by-side diff**:
A file's change drawn as two columns: before on the left, after on the right.
_Avoid_: split view, two-pane diff

**Markdown viewer**:
A read-only tab that shows one markdown file from the Files panel. It never changes the file.
_Avoid_: markdown editor, preview pane, doc tab

**Preview mode**:
The Markdown viewer showing the file as formatted text: headings, lists, tables and coloured code blocks.
_Avoid_: rendered view, reader mode

**Source mode**:
The Markdown viewer showing the file's raw text with line numbers and markdown syntax colours.
_Avoid_: raw view, code view, edit mode
