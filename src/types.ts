export interface RecordEntry {
  value: number;
  player: string;
  tournament: string;
}

export interface PlayerStats {
  highest_score: number;
  highest_rank: number;
  total_tournaments: number;
  total_games: number;
  total_moves: number;
  total_wins: number;
  total_berserks: number;
  highest_performance: number;
  tournament_wins: number;
  total_score: number;
  highest_win_streak: number;
  berserk_rate: number;
}

export interface TournamentMeta {
  fullName: string;
  nbPlayers: number;
  stats: {
    games: number;
    moves: number;
    whiteWins: number;
    blackWins: number;
    draws: number;
  };
}

export interface TournamentStanding {
  rank: number;
  username: string;
  score: number;
  rating: number;
  performance: number;
}

export interface TournamentData {
  id: string;
  meta: TournamentMeta;
  results: TournamentStanding[];
  longest_game_moves: number;
  biggest_upset: {
    diff: number;
    winner: string;
    loser: string;
  };
  player_stats: Record<string, any>;
}

export interface TournamentSummary {
  id: string;
  name: string;
  date: string;
}

export interface CategoryStats {
  player_list: string[];
  tournament_list: TournamentSummary[];
  records: Record<string, RecordEntry[]>;
}

export interface StatsFile {
  bullet: CategoryStats;
  superblitz: CategoryStats;
}
