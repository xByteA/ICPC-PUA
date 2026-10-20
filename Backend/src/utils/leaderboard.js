export function rankLeaderboard(entries) {
  let rank = 0;
  let previousPoints = null;

  return entries.map((entry, index) => {
    if (index === 0 || entry.points !== previousPoints) rank += 1;
    previousPoints = entry.points;
    return { ...entry, rank };
  });
}
