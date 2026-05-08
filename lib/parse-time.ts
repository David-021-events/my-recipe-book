/**
 * Extracts a duration in seconds from a recipe step string.
 * Returns null if no time reference is found.
 *
 * Handles: "for 5 minutes", "bake 1 hour 30 minutes", "cook for 30 seconds",
 * "2-3 minutes" (takes the number immediately before the unit), etc.
 */
export function parseStepTime(step: string): number | null {
  let total = 0
  let found = false

  const hours = step.match(/\b(\d+)\s*(?:hours?|hrs?)\b/i)
  if (hours) { total += parseInt(hours[1]) * 3600; found = true }

  const minutes = step.match(/\b(\d+)\s*(?:minutes?|mins?)\b/i)
  if (minutes) { total += parseInt(minutes[1]) * 60; found = true }

  const seconds = step.match(/\b(\d+)\s*(?:seconds?|secs?)\b/i)
  if (seconds) { total += parseInt(seconds[1]); found = true }

  return found && total > 0 ? total : null
}
