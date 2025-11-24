// extension-cosmos/supabase.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ✅ .env.local과 동일한 프로젝트 정보 사용
const url = "https://rggwmslclrvggcmrezzd.supabase.co";
const anon = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnZ3dtc2xjbHJ2Z2djbXJlenpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5MjMyMjUsImV4cCI6MjA3MTQ5OTIyNX0.RJnMRwKMvO_G5pEbXx8ngXmV6CIAqBitNSawFLCjf8I";

export const supabase = createClient(url, anon);
