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
      {/* Portrait — flatter rounded-md to match the Linear surface
          ladder. No translate-y or coloured glow on hover; just a quiet
          ring-brand swap and a subtle image scale. */}
      <div className="
        relative aspect-[2/3] overflow-hidden rounded-md
        bg-white/[0.04]
        ring-1 ring-white/10
        transition
        group-hover:ring-brand
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
          // Branded fallback: gradient + Inter display initial
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-700 to-neutral-900">
            <span className="font-display text-7xl text-brand drop-shadow leading-none">
              {initial}
            </span>
          </div>
        )}
      </div>

      {/* Name + known for. */}
      <div className="mt-2 px-0.5">
        <div className="text-[13px] font-semibold leading-tight line-clamp-1 text-white/85 group-hover:text-white transition-colors">
          {name}
        </div>
        {knownForWorks?.length > 0 && (
          <div className="text-[11px] text-white/45 line-clamp-1 mt-0.5">
            {knownForWorks.join(' · ')}
          </div>
        )}
      </div>
    </Link>
  )
}

export default memo(PersonCard)
