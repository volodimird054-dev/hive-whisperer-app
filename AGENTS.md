# Project Architecture Rules

- Queen batches use `archived_at` for soft archiving; completed batches are archived seven days after their latest completion-related change so restoration remains reversible.