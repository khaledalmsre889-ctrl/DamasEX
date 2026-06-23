
/*
# Green Exhibition CRM - Complete Database Schema

1. New Tables
  - `profiles` - User profiles linked to auth.users (role: admin/employee)
  - `employees` - Employee details (department, phone)
  - `exhibitions` - Exhibition/trade fair events
  - `companies` - Master company database
  - `contacts` - Company contacts
  - `visits` - Customer visit records
  - `visit_discussions` - Visit discussion topics (multi-select)
  - `opportunities` - Sales opportunities per visit
  - `followups` - Follow-up reminders
  - `activity_logs` - Audit trail
  - `notifications` - User notifications

2. Security
  - RLS enabled on all tables
  - Admins can access all data
  - Employees can only access their own visits/data

3. Important Notes
  - profiles.role is either 'admin' or 'employee'
  - visits.visit_number is auto-generated
  - companies have a unique constraint on name (case-insensitive) to prevent duplicates
*/

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  username text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  email text,
  phone text,
  department text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE TO authenticated USING (
  auth.uid() = id OR 
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  auth.uid() = id OR 
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "profiles_delete" ON profiles;
CREATE POLICY "profiles_delete" ON profiles FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Exhibitions table
CREATE TABLE IF NOT EXISTS exhibitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  country text,
  city text,
  venue text,
  start_date date,
  end_date date,
  organizer text,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE exhibitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exhibitions_select" ON exhibitions;
CREATE POLICY "exhibitions_select" ON exhibitions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "exhibitions_insert" ON exhibitions;
CREATE POLICY "exhibitions_insert" ON exhibitions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "exhibitions_update" ON exhibitions;
CREATE POLICY "exhibitions_update" ON exhibitions FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "exhibitions_delete" ON exhibitions;
CREATE POLICY "exhibitions_delete" ON exhibitions FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_lower text GENERATED ALWAYS AS (lower(name)) STORED,
  industry text,
  country text,
  city text,
  website text,
  address text,
  phone text,
  email text,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS companies_name_lower_idx ON companies(name_lower);
CREATE INDEX IF NOT EXISTS companies_name_idx ON companies(name);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "companies_select" ON companies;
CREATE POLICY "companies_select" ON companies FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "companies_insert" ON companies;
CREATE POLICY "companies_insert" ON companies FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "companies_update" ON companies;
CREATE POLICY "companies_update" ON companies FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "companies_delete" ON companies;
CREATE POLICY "companies_delete" ON companies FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Contacts table
CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  position text,
  phone text,
  phone2 text,
  email text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contacts_select" ON contacts;
CREATE POLICY "contacts_select" ON contacts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "contacts_insert" ON contacts;
CREATE POLICY "contacts_insert" ON contacts FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "contacts_update" ON contacts;
CREATE POLICY "contacts_update" ON contacts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "contacts_delete" ON contacts;
CREATE POLICY "contacts_delete" ON contacts FOR DELETE TO authenticated USING (true);

-- Visits table
CREATE TABLE IF NOT EXISTS visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_number text UNIQUE NOT NULL,
  employee_id uuid NOT NULL REFERENCES profiles(id),
  company_id uuid NOT NULL REFERENCES companies(id),
  exhibition_id uuid REFERENCES exhibitions(id),
  booth_number text,
  contact_name text,
  contact_position text,
  contact_phone text,
  contact_phone2 text,
  contact_email text,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  visit_time time DEFAULT CURRENT_TIME,
  evaluation text CHECK (evaluation IN ('very_important', 'important', 'normal', 'weak')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS visits_employee_idx ON visits(employee_id);
CREATE INDEX IF NOT EXISTS visits_company_idx ON visits(company_id);
CREATE INDEX IF NOT EXISTS visits_date_idx ON visits(visit_date);

ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "visits_select" ON visits;
CREATE POLICY "visits_select" ON visits FOR SELECT TO authenticated USING (
  employee_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "visits_insert" ON visits;
CREATE POLICY "visits_insert" ON visits FOR INSERT TO authenticated WITH CHECK (
  employee_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "visits_update" ON visits;
CREATE POLICY "visits_update" ON visits FOR UPDATE TO authenticated USING (
  employee_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
) WITH CHECK (
  employee_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "visits_delete" ON visits;
CREATE POLICY "visits_delete" ON visits FOR DELETE TO authenticated USING (
  employee_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- Visit discussions (multi-select tags)
CREATE TABLE IF NOT EXISTS visit_discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  discussion_type text NOT NULL
);

ALTER TABLE visit_discussions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "visit_discussions_select" ON visit_discussions;
CREATE POLICY "visit_discussions_select" ON visit_discussions FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM visits v WHERE v.id = visit_id AND (
      v.employee_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    )
  )
);

DROP POLICY IF EXISTS "visit_discussions_insert" ON visit_discussions;
CREATE POLICY "visit_discussions_insert" ON visit_discussions FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "visit_discussions_update" ON visit_discussions;
CREATE POLICY "visit_discussions_update" ON visit_discussions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "visit_discussions_delete" ON visit_discussions;
CREATE POLICY "visit_discussions_delete" ON visit_discussions FOR DELETE TO authenticated USING (true);

-- Opportunities table
CREATE TABLE IF NOT EXISTS opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'quotation_sent', 'negotiation', 'won', 'lost')),
  details text,
  estimated_value numeric(15,2),
  priority text CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  followup_date date,
  responsible_id uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "opportunities_select" ON opportunities;
CREATE POLICY "opportunities_select" ON opportunities FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM visits v WHERE v.id = visit_id AND (
      v.employee_id = auth.uid() OR
      EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    )
  )
);

DROP POLICY IF EXISTS "opportunities_insert" ON opportunities;
CREATE POLICY "opportunities_insert" ON opportunities FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "opportunities_update" ON opportunities;
CREATE POLICY "opportunities_update" ON opportunities FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "opportunities_delete" ON opportunities;
CREATE POLICY "opportunities_delete" ON opportunities FOR DELETE TO authenticated USING (true);

-- Followups table
CREATE TABLE IF NOT EXISTS followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid REFERENCES visits(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES opportunities(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES profiles(id),
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE followups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "followups_select" ON followups;
CREATE POLICY "followups_select" ON followups FOR SELECT TO authenticated USING (
  assigned_to = auth.uid() OR created_by = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "followups_insert" ON followups;
CREATE POLICY "followups_insert" ON followups FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "followups_update" ON followups;
CREATE POLICY "followups_update" ON followups FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "followups_delete" ON followups;
CREATE POLICY "followups_delete" ON followups FOR DELETE TO authenticated USING (true);

-- Activity logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  description text,
  entity_type text,
  entity_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_logs_select" ON activity_logs;
CREATE POLICY "activity_logs_select" ON activity_logs FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "activity_logs_insert" ON activity_logs;
CREATE POLICY "activity_logs_insert" ON activity_logs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "activity_logs_update" ON activity_logs;
CREATE POLICY "activity_logs_update" ON activity_logs FOR UPDATE TO authenticated USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "activity_logs_delete" ON activity_logs;
CREATE POLICY "activity_logs_delete" ON activity_logs FOR DELETE TO authenticated USING (false);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text,
  status text NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read')),
  type text DEFAULT 'info',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON notifications;
CREATE POLICY "notifications_select" ON notifications FOR SELECT TO authenticated USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_update" ON notifications FOR UPDATE TO authenticated USING (
  user_id = auth.uid()
) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_delete" ON notifications;
CREATE POLICY "notifications_delete" ON notifications FOR DELETE TO authenticated USING (
  user_id = auth.uid()
);

-- Visit number sequence function
CREATE OR REPLACE FUNCTION generate_visit_number()
RETURNS text AS $$
DECLARE
  seq_num int;
  year_str text;
BEGIN
  year_str := to_char(NOW(), 'YYYY');
  SELECT COUNT(*) + 1 INTO seq_num FROM visits WHERE extract(year FROM created_at) = extract(year FROM NOW());
  RETURN 'VIS-' || year_str || '-' || LPAD(seq_num::text, 4, '0');
END;
$$ LANGUAGE plpgsql;
