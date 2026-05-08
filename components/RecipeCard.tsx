import Image from 'next/image'
import Link from 'next/link'

interface Props {
  id: string
  title: string
  servings: number
  image_url?: string | null
}

/**
 * Public recipe card used in the homepage grid.
 * Entire card is a link to the recipe detail page.
 */
export default function RecipeCard({ id, title, servings, image_url }: Props) {
  return (
    <Link
      href={`/recipes/${id}`}
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden block"
    >
      {image_url ? (
        <div className="relative w-full aspect-video">
          <Image src={image_url} alt={title} fill unoptimized className="object-cover" />
        </div>
      ) : (
        <div className="w-full aspect-video bg-brand-100 flex items-center justify-center">
          <span className="font-display italic text-brand-300 text-2xl">{title[0]}</span>
        </div>
      )}
      <div className="p-6">
        <h2 className="font-display text-lg font-semibold leading-snug text-neutral-900 line-clamp-2">
          {title}
        </h2>
        <p className="font-sans text-[0.8125rem] text-neutral-500 mt-1">
          {servings} {servings === 1 ? 'serving' : 'servings'}
        </p>
      </div>
    </Link>
  )
}
