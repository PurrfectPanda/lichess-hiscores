# 🏆 Lichess Elite Arena Archive

A data-driven historical archive for Lichess Elite Arena tournaments. This project scrapes, processes, and visualizes data from Elite Bullet and Elite SuperBlitz Arenas, providing deep insights into player performances and tournament history.

[**View the Live Site**](https://purrfectpanda.github.io/lichess-hiscores/)

---

## 🌟 Features

### 🌍 Global Records
Track all-time records across all archived tournaments (top 100 for each):
- **Performance**: Highest score, highest score per game, and best performance.
- **Activity**: Most games played, most total moves, and most total wins.
- **Consistency**: Longest win streaks and most tournament wins.

### 👤 Player Profiles
Detailed historical statistics for any player who has ever participated in an Elite Arena:
- **Personal Bests**: Highest rank achieved, highest score, and best performance.
- **Career Totals**: Total games, moves, wins, and tournaments played.
- **Playstyle**: Average Berserk rate and longest individual win streaks.

### ⚔️ Tournament Deep-Dives
Explore the specifics of every archived tournament:
- **Full Standings**: Complete results and player performances.
- **Highlights**: Biggest rating upsets and the longest games played.
- **Meta Stats**: Total players, games played, and move counts.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React](https://reactjs.org/) (TypeScript)
- **Bundler**: [Vite](https://vitejs.dev/)
- **Routing**: [React Router](https://reactrouter.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Styling**: Vanilla CSS (Custom properties for theming)

### Data Processing & Automation
- **Scraper**: Python (Requests, BeautifulSoup4)
- **API**: [Lichess API](https://lichess.org/api) (NDJSON streams for games and results)
- **Automation**: GitHub Actions (Scheduled daily updates)
- **Storage**: Flat JSON files in the `data/` directory (static-site friendly)

---

## 🏗️ Architecture

The project is designed to be completely static and serverless, making it ideal for GitHub Pages.

1.  **Scraping**: A Python script (`scraper.py`) fetches tournament IDs from Lichess history and downloads detailed results/games for each.
2.  **Processing**: The script aggregates this raw data into:
    -   `data/stats.json`: Global records and metadata.
    -   `data/tournaments/*.json`: Detailed data for individual tournaments.
    -   `data/players/*/*.json`: Historical stats for individual players.
3.  **Visualization**: The React frontend fetches these JSON files directly to render the UI.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Python (3.10+)

### Development Setup

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/purrfectpanda/lichess-hiscores.git
    cd lichess-hiscores
    ```

2.  **Install Frontend dependencies**:
    ```bash
    npm install
    npm run dev
    ```

3.  **Run the Scraper (Optional)**:
    If you want to update the data locally:
    ```bash
    pip install requests beautifulsoup4
    python scraper.py
    ```

---

## 📅 Maintenance

The data is automatically updated every day at midnight (UTC) via GitHub Actions. You can also manually trigger an update from the **Actions** tab in the repository.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
