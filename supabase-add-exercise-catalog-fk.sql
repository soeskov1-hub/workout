-- ============================================
-- STEP 1: Add exercise_catalog_id to template_exercises
-- ============================================
ALTER TABLE template_exercises 
  ADD COLUMN exercise_catalog_id UUID REFERENCES exercise_catalog(id) ON DELETE SET NULL;

-- Make name nullable (we'll use catalog name as primary, this as fallback)
ALTER TABLE template_exercises 
  ALTER COLUMN name DROP NOT NULL;

-- ============================================
-- STEP 2: Add exercise_catalog_id to exercises (workout exercises)
-- ============================================
ALTER TABLE exercises 
  ADD COLUMN exercise_catalog_id UUID REFERENCES exercise_catalog(id) ON DELETE SET NULL;

-- Make name nullable
ALTER TABLE exercises 
  ALTER COLUMN name DROP NOT NULL;

-- ============================================
-- STEP 3: Add exercise_catalog_id to one_rep_maxes
-- ============================================
ALTER TABLE one_rep_maxes 
  ADD COLUMN exercise_catalog_id UUID REFERENCES exercise_catalog(id) ON DELETE CASCADE;

-- Make exercise_name nullable (we'll migrate to use catalog)
ALTER TABLE one_rep_maxes 
  ALTER COLUMN exercise_name DROP NOT NULL;

-- ============================================
-- STEP 4: Seed exercise_catalog with common exercises
-- ============================================
INSERT INTO exercise_catalog (name, category, is_compound) VALUES
  -- Chest
  ('Bænkpres', 'Chest', true),
  ('Incline Bænkpres', 'Chest', true),
  ('Decline Bænkpres', 'Chest', true),
  ('Dumbbell Flyes', 'Chest', false),
  ('Cable Flyes', 'Chest', false),
  
  -- Legs
  ('Squat', 'Legs', true),
  ('Front Squat', 'Legs', true),
  ('Leg Press', 'Legs', true),
  ('Romanian Deadlift', 'Legs', true),
  ('Leg Curl', 'Legs', false),
  ('Leg Extension', 'Legs', false),
  ('Lunges', 'Legs', true),
  
  -- Back
  ('Dødløft', 'Back', true),
  ('Bent Over Row', 'Back', true),
  ('Pull-ups', 'Back', true),
  ('Lat Pulldown', 'Back', true),
  ('Seated Row', 'Back', true),
  ('T-Bar Row', 'Back', true),
  
  -- Shoulders
  ('Overhead Press', 'Shoulders', true),
  ('Skulder Pres', 'Shoulders', true),
  ('Lateral Raises', 'Shoulders', false),
  ('Front Raises', 'Shoulders', false),
  ('Rear Delt Flyes', 'Shoulders', false),
  
  -- Arms
  ('Biceps Curl', 'Arms', false),
  ('Hammer Curl', 'Arms', false),
  ('Triceps Pushdown', 'Arms', false),
  ('Skull Crushers', 'Arms', false),
  ('Dips', 'Arms', true)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- STEP 5: Create helper function to get exercise name
-- (This will be used in queries to handle both old and new system)
-- ============================================
CREATE OR REPLACE FUNCTION get_exercise_name(
  catalog_id UUID,
  fallback_name TEXT
) RETURNS TEXT AS $$
BEGIN
  IF catalog_id IS NOT NULL THEN
    RETURN (SELECT name FROM exercise_catalog WHERE id = catalog_id);
  ELSE
    RETURN fallback_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICATION QUERIES (Run these after to check)
-- ============================================

-- Check exercise_catalog
-- SELECT * FROM exercise_catalog ORDER BY category, name;

-- Check template_exercises structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'template_exercises';

-- Check exercises structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'exercises';

-- Check one_rep_maxes structure
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'one_rep_maxes';
