ALTER TABLE public.queen_batches
ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX queen_batches_user_archived_idx
ON public.queen_batches (user_id, archived_at);