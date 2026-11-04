/**
 * The system refreshes documents with an empty update (`doc.update({})`) while preparing their data.
 * Documents inside a compendium (or embedded in one) and documents the user does not own cannot be
 * updated: Foundry then shows "You may not update documents in the locked compendium" every time
 * such a document is loaded, for example by a content link in a journal. Skip the refresh there.
 */
export function inCompendium(doc) {
  for (let d = doc; d; d = d.parent) if (d.pack) return true;
  return false;
}

export async function touch(doc) {
  if (!doc || inCompendium(doc) || !doc.isOwner) return;
  return doc.update({});
}
