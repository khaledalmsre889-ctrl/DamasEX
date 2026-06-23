import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  name: string;
  username: string;
  role: 'admin' | 'employee';
  email?: string;
  phone?: string;
  department?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
};

export type Exhibition = {
  id: string;
  name: string;
  country?: string;
  city?: string;
  venue?: string;
  start_date?: string;
  end_date?: string;
  organizer?: string;
  description?: string;
  status: 'active' | 'archived';
  created_by?: string;
  created_at: string;
};

export type Company = {
  id: string;
  name: string;
  industry?: string;
  country?: string;
  city?: string;
  website?: string;
  address?: string;
  phone?: string;
  email?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
};

export type Contact = {
  id: string;
  company_id: string;
  name: string;
  position?: string;
  phone?: string;
  phone2?: string;
  email?: string;
};

export type Visit = {
  id: string;
  visit_number: string;
  employee_id: string;
  company_id: string;
  exhibition_id?: string;
  booth_number?: string;
  contact_name?: string;
  contact_position?: string;
  contact_phone?: string;
  contact_phone2?: string;
  contact_email?: string;
  visit_date: string;
  visit_time?: string;
  evaluation?: 'very_important' | 'important' | 'normal' | 'weak';
  notes?: string;
  created_at: string;
  profiles?: Profile;
  companies?: Company;
  exhibitions?: Exhibition;
  visit_discussions?: VisitDiscussion[];
  opportunities?: Opportunity[];
};

export type VisitDiscussion = {
  id: string;
  visit_id: string;
  discussion_type: string;
};

export type Opportunity = {
  id: string;
  visit_id: string;
  type: string;
  status: 'new' | 'in_progress' | 'quotation_sent' | 'negotiation' | 'won' | 'lost';
  details?: string;
  estimated_value?: number;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  followup_date?: string;
  responsible_id?: string;
  notes?: string;
  created_at: string;
  profiles?: Profile;
};

export type Followup = {
  id: string;
  visit_id?: string;
  opportunity_id?: string;
  assigned_to?: string;
  due_date: string;
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  created_by?: string;
  created_at: string;
  visits?: Visit;
  profiles?: Profile;
};

export type ActivityLog = {
  id: string;
  user_id?: string;
  action: string;
  description?: string;
  entity_type?: string;
  entity_id?: string;
  created_at: string;
  profiles?: Profile;
};

export type Notification = {
  id: string;
  user_id?: string;
  title: string;
  message?: string;
  status: 'unread' | 'read';
  type?: string;
  created_at: string;
};
