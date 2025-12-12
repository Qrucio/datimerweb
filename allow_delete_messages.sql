-- ENABLE MESSAGE DELETION
-- Policy to allow users to delete their OWN messages.

create policy "Users can delete own messages"
on public.messages for delete
using (
    sender_id = auth.uid()
);
