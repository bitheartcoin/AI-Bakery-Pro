-- Check if surveys table exists before creating it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'surveys') THEN
    -- Create surveys table
    CREATE TABLE surveys (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      title text NOT NULL,
      description text,
      status text NOT NULL DEFAULT 'draft'::text,
      created_by uuid REFERENCES profiles(id),
      start_date timestamptz,
      end_date timestamptz,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      
      CONSTRAINT surveys_status_check CHECK (status IN ('draft', 'active', 'completed', 'archived'))
    );
  END IF;
END $$;

-- Check if survey_questions table exists before creating it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'survey_questions') THEN
    -- Create survey questions table
    CREATE TABLE survey_questions (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      survey_id uuid NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
      question text NOT NULL,
      type text NOT NULL,
      options jsonb,
      required boolean DEFAULT true,
      order_index integer DEFAULT 0,
      created_at timestamptz DEFAULT now(),
      
      CONSTRAINT survey_questions_type_check CHECK (type IN ('text', 'multiple_choice', 'checkbox', 'rating', 'date'))
    );
  END IF;
END $$;

-- Check if survey_responses table exists before creating it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'survey_responses') THEN
    -- Create survey responses table
    CREATE TABLE survey_responses (
      id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
      survey_id uuid NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
      question_id uuid NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
      user_id uuid NOT NULL REFERENCES profiles(id),
      response jsonb NOT NULL,
      created_at timestamptz DEFAULT now()
    );
  END IF;
END $$;

-- Create indexes if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_surveys_status') THEN
    CREATE INDEX idx_surveys_status ON surveys(status);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_survey_questions_survey_id') THEN
    CREATE INDEX idx_survey_questions_survey_id ON survey_questions(survey_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_survey_responses_survey_id') THEN
    CREATE INDEX idx_survey_responses_survey_id ON survey_responses(survey_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_survey_responses_user_id') THEN
    CREATE INDEX idx_survey_responses_user_id ON survey_responses(user_id);
  END IF;
END $$;

-- Enable RLS if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'surveys' AND rowsecurity = true) THEN
    ALTER TABLE surveys ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'survey_questions' AND rowsecurity = true) THEN
    ALTER TABLE survey_questions ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'survey_responses' AND rowsecurity = true) THEN
    ALTER TABLE survey_responses ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create policies if they don't exist
DO $$
BEGIN
  -- Surveys policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'surveys' AND policyname = 'Admins can manage surveys') THEN
    CREATE POLICY "Admins can manage surveys" 
    ON surveys FOR ALL 
    TO authenticated 
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
      )
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'surveys' AND policyname = 'All users can read active surveys') THEN
    CREATE POLICY "All users can read active surveys" 
    ON surveys FOR SELECT 
    TO authenticated 
    USING (
      status = 'active' OR status = 'completed'
    );
  END IF;
  
  -- Survey questions policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'survey_questions' AND policyname = 'Admins can manage survey questions') THEN
    CREATE POLICY "Admins can manage survey questions" 
    ON survey_questions FOR ALL 
    TO authenticated 
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
      )
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'survey_questions' AND policyname = 'All users can read survey questions') THEN
    CREATE POLICY "All users can read survey questions" 
    ON survey_questions FOR SELECT 
    TO authenticated 
    USING (
      EXISTS (
        SELECT 1 FROM surveys
        WHERE surveys.id = survey_questions.survey_id
        AND (surveys.status = 'active' OR surveys.status = 'completed')
      )
    );
  END IF;
  
  -- Survey responses policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'survey_responses' AND policyname = 'Admins can read all survey responses') THEN
    CREATE POLICY "Admins can read all survey responses" 
    ON survey_responses FOR SELECT 
    TO authenticated 
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
      )
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'survey_responses' AND policyname = 'Users can insert their own survey responses') THEN
    CREATE POLICY "Users can insert their own survey responses" 
    ON survey_responses FOR INSERT 
    TO authenticated 
    WITH CHECK (
      user_id = auth.uid()
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'survey_responses' AND policyname = 'Users can read their own survey responses') THEN
    CREATE POLICY "Users can read their own survey responses" 
    ON survey_responses FOR SELECT 
    TO authenticated 
    USING (
      user_id = auth.uid()
    );
  END IF;
END $$;

-- Create trigger for updated_at if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_surveys_updated_at') THEN
    CREATE TRIGGER update_surveys_updated_at
    BEFORE UPDATE ON surveys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Insert sample survey if none exists
DO $$
DECLARE
  survey_count integer;
  survey_id uuid;
BEGIN
  -- Check if there are any surveys
  SELECT COUNT(*) INTO survey_count FROM surveys;
  
  IF survey_count = 0 THEN
    -- Insert sample survey
    INSERT INTO surveys (title, description, status, start_date, end_date)
    VALUES (
      'Alkalmazotti elégedettségi felmérés',
      'Kérjük, töltse ki ezt a rövid felmérést, hogy segítsen nekünk javítani a munkakörülményeken.',
      'active',
      now(),
      now() + interval '14 days'
    )
    RETURNING id INTO survey_id;
    
    -- Insert sample questions
    IF survey_id IS NOT NULL THEN
      INSERT INTO survey_questions (survey_id, question, type, options, required, order_index)
      VALUES
        (survey_id, 'Mennyire elégedett a munkahelyével?', 'rating', '{"min": 1, "max": 5, "step": 1}', true, 0),
        (survey_id, 'Mely területeken látna szívesen fejlesztéseket?', 'checkbox', '{"choices": ["Munkakörülmények", "Fizetés", "Csapatépítés", "Képzések", "Kommunikáció", "Vezetés"]}', true, 1),
        (survey_id, 'Van-e konkrét javaslata a munkakörülmények javítására?', 'text', null, false, 2),
        (survey_id, 'Mikor lenne ideális időpont egy csapatépítő eseményre?', 'date', null, false, 3);
    END IF;
  END IF;
END $$;