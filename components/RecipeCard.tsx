import Link from 'next/link'

interface Props {
  id: string
  title: string
  servings: number
}

/**
 * Public recipe card used in the homepage grid.
 * Entire card is a link to the recipe detail page.
 */
export default function RecipeCard({ id, title, servings }: Props) {
  return (
    <Link
      href={`/recipes/${id}`}
      className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden block p-6"
    >
      <h2 className="font-display text-lg font-semibold leading-snug text-neutral-900 line-clamp-2">
        {title}
      </h2>
      <p className="font-sans text-[0.8125rem] text-neutral-500 mt-1">
        {servings} {servings === 1 ? 'serving' : 'servings'}
      </p>
    </Link>
  )
}
