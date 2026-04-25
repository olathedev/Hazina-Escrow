## Summary

<!-- 2-5 sentences on what changed and why. -->

## Related Issue

Closes #

## Change Type

- [ ] Bug fix
- [ ] Feature
- [ ] Refactor
- [ ] Performance improvement
- [ ] Tests only
- [ ] Documentation
- [ ] CI / tooling / infrastructure

## What Changed

<!-- Call out the key implementation changes, grouped by area if useful. -->

- 

## Testing

<!-- List exactly what you ran and any manual verification a reviewer should repeat. -->

### Automated

- [ ] `cd backend && npm test`
- [ ] `cd frontend && npm test`
- [ ] `cd backend && npm run build`
- [ ] `cd frontend && npm run build`
- [ ] `cd contracts/hazina-escrow && cargo test`
- [ ] Not applicable

### Manual

1. 
2. 
3. 

Demo mode reminder: marketplace and agent flows can be exercised without a funded Stellar wallet where demo endpoints are available.

## Risk & Rollout Notes

<!-- Note migrations, env changes, API contract changes, data changes, or rollback concerns. -->

- User-facing risk:
- Operational risk:
- Rollback plan:

## Screenshots / Recordings

<!-- Required for visual changes when practical. Add before/after images or a short video. -->

## Checklist

- [ ] I verified the change against the relevant parts of the app
- [ ] I updated or added tests where the behavior changed, or explained why tests were not needed
- [ ] I updated docs, comments, examples, or API references if needed
- [ ] I did not commit secrets, private keys, or production-only values
- [ ] I used existing logging/error-handling patterns instead of leaving debug-only output behind
- [ ] I reviewed the diff for accidental changes before requesting review
