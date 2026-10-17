// Hands a file picked on the landing page to the Drive without re-asking for it.
let pending: File | null = null;

export function setPending(file: File | null) {
  pending = file;
}

export function takePending(): File | null {
  const f = pending;
  pending = null;
  return f;
}
