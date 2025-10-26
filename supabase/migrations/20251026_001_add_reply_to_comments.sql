-- コメントにリプライ機能を追加

-- parent_comment_idカラムを追加
ALTER TABLE public.region_comments
ADD COLUMN parent_comment_id uuid REFERENCES public.region_comments(id) ON DELETE CASCADE;

-- インデックス追加
CREATE INDEX idx_region_comments_parent ON public.region_comments(parent_comment_id) WHERE parent_comment_id IS NOT NULL;

COMMENT ON COLUMN public.region_comments.parent_comment_id IS '親コメントID（リプライの場合）';
