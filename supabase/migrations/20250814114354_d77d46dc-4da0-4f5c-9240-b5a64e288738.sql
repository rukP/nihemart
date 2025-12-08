-- Create categories table
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon_url TEXT,
  link TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subcategories table
CREATE TABLE public.subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name, category_id)
);

-- Insert categories
INSERT INTO public.categories (name, link) VALUES
  ('Imiringa', 'categories/imiringa'),
  ('Amasaha', 'categories/amasaha'),
  ('Ibikoresho byo mu rugo', 'categories/ibikoresho-byo-mu-rugo'),
  ('Abana', 'categories/abana'),
  ('Ibikoresho bya siporo', 'categories/ibikoresho-bya-sport'),
  ('Ibikoresho by''ibinyabiziga', 'categories/ibinyabizinga'),
  ('Ibikapu', 'categories/ibikapu'),
  ('Ubwiza', 'categories/ubwiza'),
  ('Imisatsi', 'categories/imisatsi'),
  ('Ikoranabuhanga', 'categories/ikoranabuhanga'),
  ('Ubuzima', 'categories/ubuzima'),
  ('Imyambaro', 'categories/imyambaro'),
  ('Ibindi', '/ibicuruzwa-byose');

-- Insert subcategories
INSERT INTO public.subcategories (name, category_id) VALUES
  -- Imiringa subcategories
  ('irikumwe nibindi (set)', (SELECT id FROM public.categories WHERE name = 'Imiringa')),
  ('udukomo', (SELECT id FROM public.categories WHERE name = 'Imiringa')),
  ('amaherena', (SELECT id FROM public.categories WHERE name = 'Imiringa')),
  ('amashaneti', (SELECT id FROM public.categories WHERE name = 'Imiringa')),
  ('kumaguru', (SELECT id FROM public.categories WHERE name = 'Imiringa')),
  ('munda', (SELECT id FROM public.categories WHERE name = 'Imiringa')),
  ('iyo kwizuru', (SELECT id FROM public.categories WHERE name = 'Imiringa')),
  
  -- Amasaha subcategories
  ('smart watch', (SELECT id FROM public.categories WHERE name = 'Amasaha')),
  ('ayimibare', (SELECT id FROM public.categories WHERE name = 'Amasaha')),
  ('ayurushinge', (SELECT id FROM public.categories WHERE name = 'Amasaha')),
  ('arikumwe nibindi (set)', (SELECT id FROM public.categories WHERE name = 'Amasaha')),
  
  -- Ibikoresho byo mu rugo subcategories
  ('mugikoni', (SELECT id FROM public.categories WHERE name = 'Ibikoresho byo mu rugo')),
  ('muri saloon', (SELECT id FROM public.categories WHERE name = 'Ibikoresho byo mu rugo')),
  ('mucyumba', (SELECT id FROM public.categories WHERE name = 'Ibikoresho byo mu rugo')),
  ('mubwogero', (SELECT id FROM public.categories WHERE name = 'Ibikoresho byo mu rugo')),
  ('ibyisuku', (SELECT id FROM public.categories WHERE name = 'Ibikoresho byo mu rugo')),
  ('imitako', (SELECT id FROM public.categories WHERE name = 'Ibikoresho byo mu rugo')),
  ('ibindi', (SELECT id FROM public.categories WHERE name = 'Ibikoresho byo mu rugo')),
  
  -- Abana subcategories
  ('ibikinisho', (SELECT id FROM public.categories WHERE name = 'Abana')),
  ('ibipupe', (SELECT id FROM public.categories WHERE name = 'Abana')),
  ('ibifasha kwiga', (SELECT id FROM public.categories WHERE name = 'Abana')),
  ('ibindi', (SELECT id FROM public.categories WHERE name = 'Abana')),
  
  -- Ibikoresho by'ibinyabiziga subcategories
  ('ibyamoto', (SELECT id FROM public.categories WHERE name = 'Ibikoresho by''ibinyabiziga')),
  ('iby''imodoka', (SELECT id FROM public.categories WHERE name = 'Ibikoresho by''ibinyabiziga')),
  ('iby''igare', (SELECT id FROM public.categories WHERE name = 'Ibikoresho by''ibinyabiziga')),
  
  -- Ibikapu subcategories
  ('ibyabagabo', (SELECT id FROM public.categories WHERE name = 'Ibikapu')),
  ('ibyabagore', (SELECT id FROM public.categories WHERE name = 'Ibikapu')),
  ('ibindi', (SELECT id FROM public.categories WHERE name = 'Ibikapu')),
  
  -- Imisatsi subcategories
  ('imiti y''umusatsi', (SELECT id FROM public.categories WHERE name = 'Imisatsi')),
  ('ibikoresho by''umusatsi', (SELECT id FROM public.categories WHERE name = 'Imisatsi')),
  
  -- Ikoranabuhanga subcategories
  ('phones & accessories', (SELECT id FROM public.categories WHERE name = 'Ikoranabuhanga')),
  ('computer & accessories', (SELECT id FROM public.categories WHERE name = 'Ikoranabuhanga')),
  ('electronic devices & accessories', (SELECT id FROM public.categories WHERE name = 'Ikoranabuhanga')),
  ('office', (SELECT id FROM public.categories WHERE name = 'Ikoranabuhanga')),
  
  -- Ubuzima subcategories
  ('kubyibuha & kunanuka', (SELECT id FROM public.categories WHERE name = 'Ubuzima')),
  ('uruhu', (SELECT id FROM public.categories WHERE name = 'Ubuzima')),
  ('amaso', (SELECT id FROM public.categories WHERE name = 'Ubuzima')),
  ('ibindi', (SELECT id FROM public.categories WHERE name = 'Ubuzima')),
  
  -- Imyambaro subcategories
  ('Amarinete', (SELECT id FROM public.categories WHERE name = 'Imyambaro')),
  ('Amashati', (SELECT id FROM public.categories WHERE name = 'Imyambaro')),
  ('Iby''abana', (SELECT id FROM public.categories WHERE name = 'Imyambaro')),
  ('inkweto', (SELECT id FROM public.categories WHERE name = 'Imyambaro')),
  ('ibindi', (SELECT id FROM public.categories WHERE name = 'Imyambaro'));

-- Add foreign key constraints to products table for categories and subcategories
ALTER TABLE public.products 
ADD COLUMN category_id UUID REFERENCES public.categories(id),
ADD COLUMN subcategory_id UUID REFERENCES public.subcategories(id);

-- Enable RLS on new tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for categories
CREATE POLICY "Categories are viewable by everyone" 
ON public.categories 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage categories" 
ON public.categories 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create RLS policies for subcategories
CREATE POLICY "Subcategories are viewable by everyone" 
ON public.subcategories 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage subcategories" 
ON public.subcategories 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));