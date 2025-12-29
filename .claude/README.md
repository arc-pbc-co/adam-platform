# Claude AI Configuration

This directory contains Claude AI configuration and custom skills for the ADAM Platform.

## Directory Structure

```
.claude/
├── README.md                    # This file
├── settings.local.json          # Local Claude settings (gitignored)
└── skills/                      # Custom Claude skills
    ├── intersect-integration/   # INTERSECT integration skill
    │   └── integration-skill.md
    └── starcraft-god-mode-ui/   # StarCraft-inspired UI skill
        ├── SKILL.md
        ├── assets/
        │   ├── god-mode-theme.css
        │   └── install-base-sample.json
        └── references/
            ├── adam-integration.md
            ├── component-patterns.md
            ├── d3-global-map.md
            └── design-tokens.md
```

## Skills Overview

### 1. INTERSECT Integration Skill

**Purpose**: Provides Claude with deep knowledge about integrating ADAM Platform with ORNL's INTERSECT architecture for lab automation and scientific data management.

**Key Topics**:
- System-of-Systems architecture
- Microservices patterns
- Instrument controller capabilities
- Data management tiers
- Communication models
- Orchestration patterns

**Use Cases**:
- Designing INTERSECT-compatible microservices
- Planning integration strategies
- Understanding capability contracts
- Implementing message-based communication

### 2. StarCraft God Mode UI Skill

**Purpose**: Enables Claude to build sophisticated, real-time command & control interfaces inspired by StarCraft's strategic UI paradigm.

**Key Features**:
- Real-time data visualization
- Command & control patterns
- Strategic overview displays
- Resource management interfaces
- Mission control dashboards

**Design Principles**:
- Information density with clarity
- Real-time updates and animations
- Strategic decision support
- Hierarchical information architecture

**Use Cases**:
- Building ADAM's command center UI
- Creating experiment monitoring dashboards
- Designing fleet management interfaces
- Implementing real-time analytics views

## Using Skills

Claude automatically loads skills from this directory when working on the ADAM Platform. Skills provide:

1. **Domain Knowledge**: Deep understanding of specific architectures and patterns
2. **Code Examples**: Reference implementations and patterns
3. **Design Guidelines**: Best practices and conventions
4. **Integration Patterns**: How to connect different systems

## Adding New Skills

To add a new skill:

1. Create a new directory under `.claude/skills/`
2. Add a `SKILL.md` or similar markdown file with the skill content
3. Include any reference materials, assets, or examples
4. Update this README with the new skill description

## Skill Format

Skills are typically markdown files that include:

- **Context**: Background and purpose
- **Architecture**: System design and patterns
- **Examples**: Code snippets and implementations
- **References**: Links to documentation and resources
- **Best Practices**: Guidelines and conventions

## Notes

- `settings.local.json` is gitignored as it contains local configuration
- Skills are tracked in git to share knowledge across the team
- Skills should be updated as the platform evolves
- Keep skills focused and well-documented

## Related Documentation

- [ADAM Platform README](../README.md)
- [INTERSECT Architecture Docs](https://intersect-architecture.readthedocs.io/)
- [Backend Setup](../backend/BACKEND_SETUP.md)

