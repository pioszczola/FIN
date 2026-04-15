// Module-level flag: set when user taps a snapshot push notification.
// The history screen consumes it on mount to trigger auto-save.
let _pendingAutoSave = false;

export function setPendingAutoSave() {
  _pendingAutoSave = true;
}

export function consumePendingAutoSave(): boolean {
  const val = _pendingAutoSave;
  _pendingAutoSave = false;
  return val;
}
