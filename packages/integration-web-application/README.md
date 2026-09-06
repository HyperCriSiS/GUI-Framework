# Web Application Integration

This package provides the thin host boundary for regular Web applications. It owns only reversible GUI Framework host attributes and explicit capability context; application lifecycle, routing and DOM ownership remain with the host.

The canonical consumer entry point is the package root (`@gui-framework/web-application-integration`). Source development reuses the Web adapter capability resolver from the monorepo. Phase 9 release staging vendors that resolver into the staged package so the packed artifact has no repository-relative dependency outside its own package boundary. This is a build-time self-containment step, not a second source of truth.

Registry publication remains locked. The local artifact gate packs the private development package and imports it from a clean npm consumer before any public registry coordinate is selected.
