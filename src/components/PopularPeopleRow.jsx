// PopularPeopleRow — IMDb-style horizontal slider of famous people.
//
// Each card is a circular portrait with the name + "known for" department
// underneath. Tap any card to open that person's filmography page.
//
// Uses the shared useScrollArrows hook + ScrollArrows component, so it
// matches the look of the upcoming-movies and similar-titles rows.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPopularPeople } from '../lib/tmdb'
import { useScrollArrows } from '../lib/useScrollArrows'
import ScrollArrows from './ScrollArrows'

function PopularPeopleRow() {
  const [people, setPeople] = useState([])
  const { ref, canLeft, canRight, scrollLeft, scrollRight } = useScrollArrows()

  useEffect(() => {
    let cancelled = false
    getPopularPeople()
      .then((data) => { if (!cancelled) setPeople(data) })
      .catch(() => { if (!cancelled) setPeople([]) })
    return () => { cancelled = true }
  }, [])

  if (people.length === 0) return null

  return (
    <section className="mb-16">
      {/* Section header — same accent style as the Upcoming row */}
      <div className="mb-5">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <span className="inline-block w-1 h-7 bg-brand rounded-sm" />
          Popular actors
        </h2>
        <p className="text-sm text-neutral-500 dark:text-white/50 mt-1 ml-4">
          The most famous people on TMDb right now
        </p>
      </div>

      {/* Scroller with arrows. topPercent='40%' lands the arrows at the
          vertical midline of the circular portraits (the name text below
          adds height that would otherwise push them too low). */}
      <div className="relative">
        <ScrollArrows
          canLeft={canLeft}
          canRight={canRight}
          onLeft={scrollLeft}
          onRight={scrollRight}
          topPercent="40%"
        />

        <div
          ref={ref}
          className="-mx-4 sm:-mx-6 px-4 sm:px-6 overflow-x-auto scrollbar-hide scroll-smooth"
        >
          <div className="flex gap-5 pb-2">
            {people.map((person) => (
              <PopularPersonCard key={person.id} person={person} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function PopularPersonCard({ person }) {
  return (
    <Link
      to={`/person/${person.id}`}
      className="group block w-32 sm:w-36 shrink-0 text-center"
    >
      {/* Circular portrait */}
      <div className="
        relative aspect-square rounded-full overflow-hidden mb-3
        bg-neutral-200 dark:bg-neutral-800
        ring-1 ring-black/5 dark:ring-white/5
        transition
        group-hover:ring-2 group-hover:ring-brand
        group-hover:shadow-xl group-hover:shadow-brand/30
      ">
        {person.photoUrl ? (
          <img
            src={person.photoUrl}
            alt={person.name}
            loading="lazy"
            className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl bg-neutral-300 dark:bg-neutral-700">
            👤
          </div>
        )}
      </div>

      {/* Name */}
      <div className="text-sm font-semibold leading-tight line-clamp-2 group-hover:text-brand transition-colors">
        {person.name}
      </div>

      {/* "Known for" — only show when it's NOT acting (acting is implied) */}
      {person.knownFor && person.knownFor !== 'Acting' && (
        <div className="text-[11px] text-neutral-500 dark:text-white/50 mt-0.5 line-clamp-1">
          {person.knownFor}
        </div>
      )}
    </Link>
  )
}

export default PopularPeopleRow
