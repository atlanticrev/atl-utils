# Changelog

## 0.2.0 - 2026-07-23

### Added

- `@atlanticrev/atl-utils/lifecycle` with abortable scopes, deterministic cleanup, and child lifecycles.
- `@atlanticrev/atl-utils/view-model` with lightweight MVVM state built on `EventTarget`.
- Atomic single-property and property-batch ViewModel changes without replacing the state object.
- Typed ViewModel change events, key-filtered observers, and `AbortSignal`-based listener cleanup.
- Regression coverage for ViewModel state, subscriptions, destruction, and lifecycle behavior.

### Changed

- Package validation now uses the `esm-only` profile that matches the documented package contract.
- `npm publish` runs the complete release quality gate through `prepublishOnly`.

### Compatibility

- No runtime dependencies were added.
- Existing HTTP, cache, storage, async, date, error, and style entry points remain unchanged.
