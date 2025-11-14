-- Create user favorite themes table
CREATE TABLE public.user_favorite_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  theme_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, theme_name)
);

-- Enable Row Level Security
ALTER TABLE public.user_favorite_themes ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own favorite themes" 
ON public.user_favorite_themes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can add their own favorite themes" 
ON public.user_favorite_themes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own favorite themes" 
ON public.user_favorite_themes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_user_favorite_themes_user_id ON public.user_favorite_themes(user_id);