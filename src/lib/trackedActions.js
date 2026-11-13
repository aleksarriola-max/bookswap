import { addBook, createRequest, getBooks, getRequests, updateRequestStatus, setRequestAvailability, confirmSlot, communityAction } from '../store';
import { track, trackOnce } from './analytics';

// Each write awaits the save first. If it throws, nothing is captured. Success events use
// trackOnce keyed by the saved record, so retries cannot double-count.

const listingType = mode => mode === 'sale' ? 'sale' : 'exchange';
const CONDITION_KEYS = { 'Like new': 'like_new', Good: 'good', Worn: 'worn' };
const isDemoListing = bookId => Boolean(getBooks().find(book => book.id === bookId)?.isDemo);

export async function publishListing(args) {
  const book = await addBook(args);
  if (book?.id && !book.isDemo) {
    trackOnce(`listing_published:${book.id}`, 'listing_published', {
      listing_type: listingType(args.exchangeMode),
      condition: CONDITION_KEYS[args.condition],
      book_count: Math.max(1, args.bundleItems?.length || 0),
    });
  }
  return book;
}

export async function submitRequest(args) {
  const book = getBooks().find(item => item.id === args.bookId);
  const existed = getRequests().some(item => item.bookId === args.bookId && item.requesterId === args.requesterId);
  const request = await createRequest(args);
  // The server returns an existing request instead of creating a new one; count only new ones.
  if (request?.id && !existed && !book?.isDemo) {
    trackOnce(`request_submitted:${request.id}`, 'request_submitted', { listing_type: listingType(request.exchangeMode || book?.exchangeMode) });
  }
  return request;
}

export async function acceptRequest(request) {
  const wasPending = request.status === 'pending';
  await updateRequestStatus(request.id, 'accepted');
  if (wasPending && !isDemoListing(request.bookId)) trackOnce(`request_accepted:${request.id}`, 'request_accepted', { listing_type: listingType(request.exchangeMode) });
}

export async function offerAvailability(request, slots) {
  await setRequestAvailability(request.id, slots);
  if (!isDemoListing(request.bookId)) trackOnce(`availability_offered:${request.id}`, 'availability_offered', { listing_type: listingType(request.exchangeMode), slot_count: slots.length });
}

export async function confirmMeetup(request, slot, spot) {
  await confirmSlot(request.id, slot, spot);
  if (!isDemoListing(request.bookId)) trackOnce(`meetup_confirmed:${request.id}`, 'meetup_confirmed', { listing_type: listingType(request.exchangeMode) });
}

export async function completeHandoff(request, args) {
  const result = await communityAction('completeHandoff', { ...args, requestId: request.id });
  if (!isDemoListing(request.bookId)) trackOnce(`handoff_completed:${request.id}`, 'handoff_completed', { listing_type: listingType(request.exchangeMode) });
  return result;
}

export function recordListingSelected(book, { groupId } = {}) {
  if (!book || book.isDemo) return false;
  return track('listing_selected', { listing_type: listingType(book.exchangeMode), discovery_source: groupId ? 'group' : 'browse' });
}

export function recordComparison(task, comparison) {
  return trackOnce(`comparison_submitted:${task}`, 'comparison_submitted', { task, comparison });
}
