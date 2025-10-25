// extension-cosmos/supabase.js
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const url = "https://yztdblzrlvrjzxjvhsqh.supabase.co"; // 실제 프로젝트 URL
const anon =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6dGRibHpybHZyanhqdmhzcWgiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcyODY5NTQ3NywiZXhwIjoyMDQ0NDcxNDc3fQ.9d6i4rD2IjKUSiSkXq8v3SMcYlC8Ek7nU6RkJPq5Ez4";

export const supabase = createClient(url, anon);
