# Security Specification for TalentBridge

## Data Invariants
1. A Candidate profile must be owned by the user who created it (userId match).
2. A Vacancy must be associated with the recruiter who posted it (postedBy match).
3. Timestamps (createdAt, updatedAt) must be server-generated or validated.
4. Candidates can only read their own private data if implemented (for now profiles are public).
5. Vacancies are public to read but restricted to the owner for writes.

## The Dirty Dozen (Attack Vectors)
1. **Identity Spoofing**: Attempt to create a profile with another user's UID.
2. **Ghost Field Injection**: Adding `isVerified: true` to a vacancy.
3. **Status Shortcutting**: Moving a vacancy to `closed` as a non-owner.
4. **Denial of Wallet**: Injecting 1MB of "skills" data.
5. **Timestamp Backdating**: Setting `createdAt` to 2010.
6. **Orphaned Writes**: Creating a vacancy without a valid postedBy.
7. **Cross-User Updates**: User A trying to edit User B's profile.
8. **Malicious ID**: Using a 1KB string as a Document ID.
9. **Email Hijacking**: Setting a contact email that doesn't match auth.
10. **Role Escalation**: Attempting to set `isAdmin: true` in user data.
11. **Blanket Querying**: Attempting to list all profiles without a limit (if rules didn't check).
12. **PII Leakage**: Accessing private fields (if implemented).

## Rules Implementation Strategy
- Use `isValidId()` for path hardening.
- Use `isValidCandidate()` and `isValidVacancy()` helpers.
- Enforce strict keys with `affectedKeys().hasOnly()`.
- Validate server timestamps.
