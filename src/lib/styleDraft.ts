import type { StyleAnswers } from './travelerStyle'

// The answers to the travel-style questions of a planning that did NOT work (the AI failed): they are kept, so the traveler who tries
// again finds them as they were. A planning that worked clears them, and the first time the questions are always empty.
let draft: StyleAnswers | null = null
export const getDraft = () => draft
export const setDraft = (a: StyleAnswers) => {
  draft = a
}
export const clearDraft = () => {
  draft = null
}
