
/*
# Allow anon to read profiles for login (username lookup only)
Adds a SELECT policy for anon role so username → email lookup works
before the user is authenticated.
*/
DROP POLICY IF EXISTS "profiles_select_anon" ON profiles;
CREATE POLICY "profiles_select_anon" ON profiles FOR SELECT
  TO anon
  USING (true);
