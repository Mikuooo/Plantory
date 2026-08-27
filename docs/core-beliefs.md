# Plantory Core Beliefs

These beliefs guide product and engineering decisions. They are durable rules,
not a feature-status list.

## Product

- A plant is an individual specimen, not a species-level aggregate.
- Plants, growth records, care actions, photos, and todos are core records.
- Expenses, inventory, assets, weather risk, and accounts support the core.
- A batch care action expands into an independent record per plant.
- Photos retain their capture time and plant association.
- Calendar, plants, and archive are the primary navigation vocabulary.

## Guest First

- Core workflows work before authentication or backend connectivity.
- Local persistence is the source of truth for a guest.
- Sign-in is an upgrade and migration path, not a prerequisite.
- Remote failure never invalidates a successful local write.
- Storage and synchronization stay behind interfaces so screens do not change
  when cloud accounts arrive.

## Engineering

- Repository-local, versioned knowledge is the source of truth for agents and
  contributors.
- Architectural invariants should become executable checks once the current
  code satisfies them.
- Deterministic checks run before subjective review.
- Native behavior is accepted through its real product entry on an affected
  device; lint and type checking do not replace runtime evidence.
- 3D remains an optional presentation layer.
