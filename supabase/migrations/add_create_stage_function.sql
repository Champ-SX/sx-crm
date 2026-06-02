-- Create a function to allow anonymous users to insert stages
-- This bypasses the RLS policy issue by providing a direct insert mechanism

CREATE OR REPLACE FUNCTION public.create_op_stage(
  p_stage_id TEXT,
  p_label TEXT,
  p_order INTEGER,
  p_accent_color TEXT DEFAULT NULL,
  p_dot_color TEXT DEFAULT NULL,
  p_header_bg TEXT DEFAULT NULL,
  p_column_bg TEXT DEFAULT NULL,
  p_is_custom BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  stage_id TEXT,
  label TEXT,
  "order" INTEGER,
  accent_color TEXT,
  dot_color TEXT,
  header_bg TEXT,
  column_bg TEXT,
  is_custom BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.dynamic_op_stages (
    stage_id,
    label,
    "order",
    accent_color,
    dot_color,
    header_bg,
    column_bg,
    is_custom
  ) VALUES (
    p_stage_id,
    p_label,
    p_order,
    p_accent_color,
    p_dot_color,
    p_header_bg,
    p_column_bg,
    p_is_custom
  );

  RETURN QUERY
  SELECT
    s.stage_id,
    s.label,
    s."order",
    s.accent_color,
    s.dot_color,
    s.header_bg,
    s.column_bg,
    s.is_custom,
    s.created_at,
    s.updated_at
  FROM public.dynamic_op_stages s
  WHERE s.stage_id = p_stage_id;
END;
$$;

-- Grant execute permission to anonymous users
GRANT EXECUTE ON FUNCTION public.create_op_stage(TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO anon;
