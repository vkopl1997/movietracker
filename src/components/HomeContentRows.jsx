// Thin wrappers that fetch a TMDb list and pass it to HorizontalRow.
// Co-located here because they're only used on the home page and the logic
// is tiny — each is just "fetch + show".

import { useEffect, useState } from 'react'
import HorizontalRow from './HorizontalRow'
import { getTrendingTv, getTopRatedMovies } from '../lib/tmdb'

function useFetched(fetcher) {
  const [items, setItems] = useState([])
  useEffect(() => {
    let cancelled = false
    fetcher()
      .then((data) => { if (!cancelled) setItems(data) })
      .catch(() => { if (!cancelled) setItems([]) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return items
}

export function TrendingTvRow() {
  const items = useFetched(getTrendingTv)
  return <HorizontalRow title="Trending TV shows" items={items} />
}

export function TopRatedMoviesRow() {
  const items = useFetched(getTopRatedMovies)
  return <HorizontalRow title="Top rated movies of all time" items={items} />
}
