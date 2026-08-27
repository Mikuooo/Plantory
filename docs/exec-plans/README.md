# Execution Plans

Use a checked-in execution plan when work spans multiple modules, requires a
migration, changes native configuration, or cannot be completed safely in one
short session.

An active plan contains scope, affected files, ordered steps, decisions,
verification evidence, cleanup, and remaining risks. Move completed plans to
`completed/`; do not rewrite their decision history.

- [Active plans](./active/README.md)
- [Completed plans](./completed/README.md)
