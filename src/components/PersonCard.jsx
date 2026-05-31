// PersonCard — actor/director card with portrait + name + "known for".
// Same 2:3 aspect ratio as MediaCard so they look good side-by-side if mixed.

import { memo, useState } from 'react'
import { Link } from 'react-router-dom'

function PersonCard({ id, name, photoUrl, knownForWorks }) {
  // Track image load failures so we can show the branded fallback instead
  // of a broken icon or TMDb's generic blue silhouette.
  const [failed, setFailed] = useState(false)
  const initial = (name || '?').trim().charAt(0).toUpperCase()
  const showImage = photoUrl && !failed

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
        {showImage ? (
          <img
            src={photoUrl}
            alt={name}
            loading="lazy"
            onError={() => setFailed(true)}
            className="
              w-full h-full object-cover
              transition duration-500 group-hover:scale-105
            "
          />
        ) : (
          // Branded fallback: gradient + Bebas Neue initial in brand gold
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-300 to-neutral-200 dark:from-neutral-700 dark:to-neutral-900">
            <span className="font-display text-8xl text-brand drop-shadow-lg leading-none">
              {initial}
            </span>
          </div>
        )}
      </div>

      {/* Name + known for. */}
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
