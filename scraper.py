import requests
import json
import time
import os
import glob
import argparse
from bs4 import BeautifulSoup

# --- CONFIGURATION ---
CATEGORIES = {"Elite Bullet Arena": "bullet", "Elite SuperBlitz Arena": "superblitz"}
HEADERS = {"User-Agent": "LichessEliteArchive/5.0"}
DATA_DIR = "data"

# --- CORE UTILITIES ---

def safe_get(url, stream=False, extra_headers=None):
    """Polite requester with rate-limit handling."""
    headers = HEADERS.copy()
    if extra_headers:
        headers.update(extra_headers)
    while True:
        res = requests.get(url, headers=headers, stream=stream)
        if res.status_code == 200: return res
        if res.status_code == 429:
            wait = int(res.headers.get("Retry-After", 65))
            print(f"⚠️ Rate limit. Waiting {wait}s...")
            time.sleep(wait)
            continue
        return None

def get_ndjson(url):
    res = safe_get(url, stream=True, extra_headers={"Accept": "application/x-ndjson"})
    return [json.loads(line) for line in res.iter_lines() if line] if res else []

# --- CALCULATION HELPERS ---

def get_stats_from_games(t_id):
    """Streams games to find longest game, player stats, and biggest upset."""
    games_url = f"https://lichess.org/api/tournament/{t_id}/games?moves=true&clocks=false&berserk=true"
    res = safe_get(games_url, stream=True, extra_headers={"Accept": "application/x-ndjson"})

    longest_move_count = 0
    biggest_upset = {"diff": 0, "winner": "", "loser": ""}
    player_stats = {}

    if res:
        for line in res.iter_lines():
            if not line: continue
            try:
                g = json.loads(line)
            except json.JSONDecodeError:
                continue

            moves = g.get('moves', '').split()
            move_count = len(moves)
            longest_move_count = max(longest_move_count, move_count)

            winner_color = g.get('winner')

            for side in ['white', 'black']:
                user_info = g['players'][side].get('user')
                if not user_info: continue
                name = user_info['name']
                
                if name not in player_stats:
                    player_stats[name] = {
                        "games": 0, "wins": 0, "moves": 0, 
                        "berserks": 0, "best_streak": 0, "current_streak": 0
                    }
                
                stats = player_stats[name]
                stats["games"] += 1
                stats["moves"] += (move_count // 2)
                if g['players'][side].get('berserk'):
                    stats["berserks"] += 1
                
                if winner_color == side:
                    stats["wins"] += 1
                    stats["current_streak"] += 1
                else:
                    stats["best_streak"] = max(stats["best_streak"], stats["current_streak"])
                    stats["current_streak"] = 0

            if winner_color:
                loser_color = 'black' if winner_color == 'white' else 'white'
                if 'rating' in g['players'][winner_color] and 'rating' in g['players'][loser_color]:
                    w_rating = g['players'][winner_color]['rating']
                    l_rating = g['players'][loser_color]['rating']
                    diff = l_rating - w_rating
                    if diff > biggest_upset['diff']:
                        biggest_upset = {
                            "diff": diff, 
                            "winner": g['players'][winner_color]['user']['name'], 
                            "loser": g['players'][loser_color]['user']['name']
                        }

    for name in player_stats:
        player_stats[name]["best_streak"] = max(player_stats[name]["best_streak"], player_stats[name]["current_streak"])
        del player_stats[name]["current_streak"]

    return longest_move_count, player_stats, biggest_upset

# --- MAIN PHASES ---

def find_all_tournament_ids(cat_to_find=None):
    """Scrapes Lichess history until the very end."""
    print(f"🔎 Searching for {cat_to_find if cat_to_find else 'all'} Elite Tournaments in history...")
    page = 1
    found = []

    while True:
        res = requests.get(f"https://lichess.org/tournament/history/weekend?page={page}")
        soup = BeautifulSoup(res.text, 'html.parser')
        links = soup.find_all('a', href=True)

        current_page_count = 0
        for l in links:
            for cat_name, cat_key in CATEGORIES.items():
                if cat_to_find and cat_to_find != cat_key: continue
                if cat_name in l.text:
                    found.append({"id": l['href'].split('/')[-1], "cat": cat_key})
                    current_page_count += 1

        if current_page_count == 0: break 
        print(f"  - Page {page}: Found {current_page_count} tournaments")
        page += 1
        time.sleep(0.5)

    return found

def aggregate_data(cat):
    """Reads all tournament files and builds global stats and individual player files for a category."""
    print(f"📊 Aggregating {cat} statistics...")
    cat_dir = f"{DATA_DIR}/{cat}"
    cat_tournament_dir = f"{cat_dir}/tournaments"
    cat_player_dir = f"{cat_dir}/players"
    
    os.makedirs(cat_tournament_dir, exist_ok=True)
    os.makedirs(cat_player_dir, exist_ok=True)
    
    files = glob.glob(f"{cat_tournament_dir}/*.json")
    
    # Global structure for stats.json
    cat_stats = {"player_list": [], "tournament_list": [], "records": {}}
    
    # Internal index for calculation
    player_index = {}

    all_single_scores = []
    all_single_spg = []
    all_single_streaks = []

    for f_path in files:
        with open(f_path, "r") as f:
            t = json.load(f)
        
        title = t['meta'].get('fullName', '')
        t_id = t['id']
        
        # Add to tournament list
        cat_stats["tournament_list"].append({
            "id": t_id,
            "name": title,
            "date": t['meta'].get('startsAt')
        })
        p_stats = t.get('player_stats', {})
        results = t.get('results', [])

        for r in results:
            name = r['username']
            if name not in player_index:
                player_index[name] = {
                    "title": r.get('title'),
                    "highest_score": 0, "highest_rank": 9999, "total_tournaments": 0,
                    "total_games": 0, "total_moves": 0, "total_wins": 0, "total_berserks": 0,
                    "highest_performance": 0, "tournament_wins": 0, "total_score": 0,
                    "highest_win_streak": 0
                }
            
            p = player_index[name]
            if not p.get('title') and r.get('title'):
                p['title'] = r.get('title')
                
            p["total_tournaments"] += 1
            p["highest_score"] = max(p["highest_score"], r['score'])
            p["total_score"] += r['score']
            p["highest_rank"] = min(p["highest_rank"], r['rank'])
            p["highest_performance"] = max(p["highest_performance"], r.get('performance', 0))
            if r['rank'] == 1: p["tournament_wins"] += 1
            
            if name in p_stats:
                ps = p_stats[name]
                p["total_games"] += ps['games']
                p["total_moves"] += ps['moves']
                p["total_wins"] += ps['wins']
                p["total_berserks"] += ps['berserks']
                p["highest_win_streak"] = max(p["highest_win_streak"], ps['best_streak'])
                
                all_single_scores.append({"value": r['score'], "player": name, "tournament": t_id, "title": p.get('title')})
                if ps['games'] > 0:
                    all_single_spg.append({"value": round(r['score'] / ps['games'], 2), "player": name, "tournament": t_id, "title": p.get('title')})
                all_single_streaks.append({"value": ps['best_streak'], "player": name, "tournament": t_id, "title": p.get('title')})

    # Build Top 100 Records and save individual players
    for name, p in player_index.items():
        if p["total_games"] > 0:
            p["berserk_rate"] = round(p["total_berserks"] / p["total_games"], 4)
        else:
            p["berserk_rate"] = 0
        
        with open(f"{cat_player_dir}/{name}.json", "w") as f:
            json.dump(p, f)
        
        cat_stats["player_list"].append({"username": name, "title": p.get('title')})

    recs = cat_stats["records"]
    
    def get_top(data, key_fn=lambda x: x['value']):
        return sorted(data, key=key_fn, reverse=True)[:100]

    recs["highest_score"] = get_top(all_single_scores)
    recs["highest_score_per_game"] = get_top(all_single_spg)
    recs["longest_win_streak"] = get_top(all_single_streaks)
    recs["most_tournament_wins"] = get_top([{"value": v['tournament_wins'], "player": k, "title": v.get('title')} for k, v in player_index.items()])
    recs["most_games_played"] = get_top([{"value": v['total_games'], "player": k, "title": v.get('title')} for k, v in player_index.items()])
    recs["most_games_won"] = get_top([{"value": v['total_wins'], "player": k, "title": v.get('title')} for k, v in player_index.items()])
    recs["highest_total_score"] = get_top([{"value": v['total_score'], "player": k, "title": v.get('title')} for k, v in player_index.items()])
    recs["most_total_moves_played"] = get_top([{"value": v['total_moves'], "player": k, "title": v.get('title')} for k, v in player_index.items()])

    with open(f"{cat_dir}/stats.json", "w") as f:
        json.dump(cat_stats, f)
    print(f"✅ {cat} stats and {len(player_index)} player files updated.")

def harvest_and_aggregate(cat_to_scrape=None):
    tournament_list = find_all_tournament_ids(cat_to_scrape)
    total = len(tournament_list)

    for i, t in enumerate(tournament_list):
        t_id, cat = t['id'], t['cat']
        cat_tournament_dir = f"{DATA_DIR}/{cat}/tournaments"
        os.makedirs(cat_tournament_dir, exist_ok=True)
        file_path = f"{cat_tournament_dir}/{t_id}.json"

        if os.path.exists(file_path):
            continue
        
        print(f"📦 [{i+1}/{total}] Harvesting NEW tournament: {t_id} ({cat})")
        meta_res = safe_get(f"https://lichess.org/api/tournament/{t_id}")
        if not meta_res: continue
        meta = meta_res.json()
        results = get_ndjson(f"https://lichess.org/api/tournament/{t_id}/results")

        longest_moves, player_stats, upset = get_stats_from_games(t_id)

        t_data = {
            "id": t_id,
            "meta": meta,
            "results": results,
            "longest_game_moves": longest_moves,
            "biggest_upset": upset,
            "player_stats": player_stats
        }
        with open(file_path, "w") as f: json.dump(t_data, f)
        time.sleep(1)

    print("✅ Finished harvesting.")
    
    if cat_to_scrape:
        aggregate_data(cat_to_scrape)
    else:
        for cat in CATEGORIES.values():
            aggregate_data(cat)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Lichess Elite Archive Scraper")
    parser.add_argument("--type", choices=["bullet", "superblitz", "all"], default="all", help="The type of tournament to scrape.")
    args = parser.parse_args()
    
    cat_to_scrape = args.type if args.type != "all" else None
    harvest_and_aggregate(cat_to_scrape)
