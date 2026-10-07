# ADR 0001: We record decisions in ADRs and keep a glossary

- Status: Accepted
- Date: 2026-10-06

## Context

Greenfield web app for one boarding house. The domain and stack are settled
through an interview. Decisions must survive the conversation and stay
discoverable by a future contributor, including the owner's future self.

## Decision

Record every confirmed decision as a numbered ADR in `docs/adr/`, in Michael
Nygard's lightweight format (Context / Decision / Consequences). Keep domain
terms in `docs/glossary.md`. Keep `docs/SPEC.md` as the single entry point.

## Consequences

- Every decision carries its rationale and can be superseded later.
- If `SPEC.md` and an ADR disagree, the ADR wins.
- Small overhead per decision, kept low by terse entries.
