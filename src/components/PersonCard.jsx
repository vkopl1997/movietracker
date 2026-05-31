// PersonCard — actor/director card with portrait + name + "known for".
// Same 2:3 aspect ratio as MediaCard so they look good side-by-side if mixed.

import { memo } from 'react'
import { Link } from 'react-router-dom'

function PersonCard({ id, name, photoUrl, knownForWorks }) {
  return (
    <Link to={`/person/${id}`} className="group block">
      <div className="
        relative aspect-[2/3] overflow-hidden rounded-xl
        bg-neutral-200 dark:bg-neutral-900
        ring-1 ring-black/5 dark:ring-white/5
        transition duration-300
        group-hover:ring-brand/60 group-hover:-translate-y-1
        group-hover:shadow-[0_20px_40px_-15px_rgba(212,175,55,0.4)]
      ">
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={name}
            loading="lazy"
            className="
              w-full h-full object-cover
              transition duration-500 group-hover:scale-105
            "
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl bg-neutral-300 dark:bg-neutral-800">
            👤
          </div>
        )}
      </div>

      {/* Name + known for. Sits BELOW the portrait (not overlaid like MediaCard's title)
          because portrait photos rarely have empty space at the bottom. */}
      <div className="mt-2 px-1">
        <div className="text-sm font-semibold leading-tight line-clamp-1">
          {name}
        </div>
        {knownForWorks?.length > 0 && (
          <div className="text-xs text-neutral-500 dark:text-white/50 line-clamp-1 mt-0.5">
            {knownForWorks.join(' · ')}
          </div>
        )}
      </div>
    </Link>
  )
}

export default memo(PersonCard)
