export type Profile = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  is_brother: boolean;
  is_admin: boolean;
  is_paid: boolean;
  is_monthly: boolean;
  paid_month?: string | null;
  no_show_count: number;
  created_at: string;
  updated_at: string;
};

export type PlayerRating = {
  id: string;
  evaluator_id: string;
  evaluated_id: string;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defense: number;
  physical: number;
  created_at: string;
  updated_at: string;
};

export type PlayerCard = {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  is_brother: boolean;
  is_admin: boolean;
  is_paid: boolean;
  is_monthly: boolean;
  paid_month?: string | null;
  no_show_count: number;
  created_at: string;
  total_evaluations: number;
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defense: number;
  physical: number;
  overall: number;
};

export type Match = {
  id: string;
  match_date: string;
  cutoff_time: string;
  max_players: number;
  status: "open" | "closed" | "finished";
  location: string;
  created_at: string;
};

export type MatchAttendee = {
  id: string;
  match_id: string;
  user_id: string;
  status: "confirmed" | "waiting" | "dropped";
  team: "A" | "B" | "none";
  created_at: string;
  profile?: Profile;
  card?: PlayerCard;
};

export type MatchStat = {
  id: string;
  match_id: string;
  user_id: string;
  goals: number;
  assists: number;
  is_mvp: boolean;
  is_fair_play: boolean;
  created_at: string;
  profile?: Profile;
};

export type FinancialLedger = {
  id: string;
  description: string;
  amount: number;
  entry_date: string;
  category: string;
  created_by: string | null;
  created_at: string;
};
