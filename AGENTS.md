# Project Architecture Rules

- Queen batches use `archived_at` for soft archiving; completed batches are archived seven days after their latest completion-related change so restoration remains reversible.
- Point creation and editing share GPS acquisition and coordinate validation in a browser-safe helper; this keeps retries, permission errors, and decimal-comma input consistent.
