/* Jira ticket timing, shared so other parts of a page can wait for the
   ticket's state swap to finish (see JiraTicket.tsx for the full timeline). */

/** One phase of the swap (out, then in), at the base tempo. */
export const SWAP_PHASE_MS = 190

/** Overall tempo of the card's motion: 1.25 = 25% slower than the base timings. */
export const CARD_TEMPO = 1.25

/** A whole state swap, as it plays on screen (two phases × tempo = 475ms).
    Multiply by the page's slow-motion factor. */
export const TICKET_SWAP_MS = SWAP_PHASE_MS * 2 * CARD_TEMPO
