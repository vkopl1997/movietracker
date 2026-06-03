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
    <section className="mb-16 w-full">
      <div className="
        rounded-lg bg-surface-1 border border-white/[0.08]
        shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_8px_24px_-12px_rgba(0,0,0,0.5)]
        overflow-hidden
      ">
        {/* ── Section: header (title + subtitle) ── */}
        <div className="px-5 sm:px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-[15px] font-semibold tracking-tight text-white">
            Popular actors
          </h2>
          <p className="mt-1.5 text-[12px] text-white/45">
            The most famous people on TMDb right now
          </p>
        </div>

        {/* ── Section: body (horizontal scroll of portrait cards) ── */}
        <div className="relative p-4 sm:p-5">
          <ScrollArrows
            canLeft={canLeft}
            canRight={canRight}
            onLeft={scrollLeft}
            onRight={scrollRight}
            topPercent="40%"
          />

          <div
            ref={ref}
            className="overflow-x-auto scrollbar-hide scroll-smooth"
          >
            <div className="flex gap-5 pb-1">
              {people.map((person) => (
                <PopularPersonCard key={person.id} person={person} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function PopularPersonCard({ person }) {
  const [failed, setFailed] = useState(false)
  const initial = (person.name || '?').trim().charAt(0).toUpperCase()
  const showImage = person.photoUrl && !failed

  return (
    <Link
      to={`/person/${person.id}`}
      className="group block w-32 sm:w-36 shrink-0 text-center"
    >
      {/* Rectangular portrait — same size, just rounded corners instead
          of a full circle to match the Linear table design language. */}
      <div className="
        relative aspect-square rounded-md overflow-hidden mb-2.5
        bg-white/[0.04]
        ring-1 ring-white/10
        transition
        group-hover:ring-brand
      ">
        {showImage ? (
          <img
            src={person.photoUrl}
            alt={person.name}
            loading="lazy"
            onError={() => setFailed(true)}
            className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-700 to-neutral-900">
            <span className="font-display text-6xl text-brand drop-shadow leading-none">
              {initial}
            </span>
          </div>
        )}
      </div>

      {/* Name */}
      <div className="text-sm font-semibold leading-tight line-clamp-2 text-white/85 group-hover:text-white transition-colors">
        {person.name}
      </div>

      {/* "Known for" — only show when it's NOT acting (acting is implied) */}
      {person.knownFor && person.knownFor !== 'Acting' && (
        <div className="text-[11px] text-white/45 mt-0.5 line-clamp-1">
          {person.knownFor}
        </div>
      )}
    </Link>
  )
}

export default PopularPeopleRow
