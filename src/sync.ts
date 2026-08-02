// Cloud-sync client: a thin fetch wrapper plus the reconcile rules.
// The server is a dumb blob store; all decisions happen here.

export interface CloudSave {
  blob: string
  updatedAt: number
}

export type SyncState =
  | { kind: 'unknown' }
  | { kind: 'offline' } // API unreachable or not configured — game plays on happily
  | { kind: 'signedOut' }
  | { kind: 'signedIn'; username: string }

interface ApiReply {
  status: number
  data: Record<string, unknown>
}

async function api(path: string, init?: RequestInit): Promise<ApiReply> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    credentials: 'same-origin',
  })
  let data: Record<string, unknown> = {}
  try {
    data = (await res.json()) as Record<string, unknown>
  } catch {
    // non-JSON (e.g. a 404 page when the API isn't deployed) — treat as empty
  }
  return { status: res.status, data }
}

const asCloudSave = (value: unknown): CloudSave | null => {
  if (typeof value !== 'object' || value === null) return null
  const save = value as Record<string, unknown>
  return typeof save.blob === 'string' && typeof save.updatedAt === 'number'
    ? { blob: save.blob, updatedAt: save.updatedAt }
    : null
}

/** Who am I, and what does the cloud have? Never throws. */
export async function checkSession(): Promise<{ sync: SyncState; save: CloudSave | null }> {
  try {
    const { status, data } = await api('/api/save')
    if (status === 200 && typeof data.username === 'string') {
      return { sync: { kind: 'signedIn', username: data.username }, save: asCloudSave(data.save) }
    }
    if (status === 401) return { sync: { kind: 'signedOut' }, save: null }
    return { sync: { kind: 'offline' }, save: null }
  } catch {
    return { sync: { kind: 'offline' }, save: null }
  }
}

export type AuthResult =
  | { ok: true; username: string; recoveryCode?: string; cloudSave: CloudSave | null }
  | { ok: false; error: string }

export async function registerAccount(username: string, password: string): Promise<AuthResult> {
  try {
    const { status, data } = await api('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    if (status === 201 && typeof data.username === 'string') {
      return {
        ok: true,
        username: data.username,
        recoveryCode: typeof data.recoveryCode === 'string' ? data.recoveryCode : undefined,
        cloudSave: null,
      }
    }
    return { ok: false, error: typeof data.error === 'string' ? data.error : 'unknown' }
  } catch {
    return { ok: false, error: 'network' }
  }
}

export async function loginAccount(username: string, password: string): Promise<AuthResult> {
  try {
    const { status, data } = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    if (status !== 200 || typeof data.username !== 'string') {
      return { ok: false, error: typeof data.error === 'string' ? data.error : 'unknown' }
    }
    // Fetch whatever the cloud already has so the caller can reconcile.
    const session = await checkSession()
    return { ok: true, username: data.username, cloudSave: session.save }
  } catch {
    return { ok: false, error: 'network' }
  }
}

export async function resetAccountPassword(
  username: string,
  recoveryCode: string,
  newPassword: string,
): Promise<AuthResult> {
  try {
    const { status, data } = await api('/api/auth/reset', {
      method: 'POST',
      body: JSON.stringify({ username, recoveryCode, newPassword }),
    })
    if (status !== 200 || typeof data.username !== 'string') {
      return { ok: false, error: typeof data.error === 'string' ? data.error : 'unknown' }
    }
    const session = await checkSession()
    return { ok: true, username: data.username, cloudSave: session.save }
  } catch {
    return { ok: false, error: 'network' }
  }
}

export async function logoutAccount(): Promise<void> {
  try {
    await api('/api/auth/logout', { method: 'POST' })
  } catch {
    // signing out locally is what matters
  }
}

export type PushResult = { ok: true } | { ok: false; conflict?: CloudSave }

export async function pushSave(blob: string, updatedAt: number): Promise<PushResult> {
  try {
    const { status, data } = await api('/api/save', {
      method: 'PUT',
      body: JSON.stringify({ blob, updatedAt }),
    })
    if (status === 200) return { ok: true }
    if (status === 409) {
      const conflict = asCloudSave(data.save)
      return conflict ? { ok: false, conflict } : { ok: false }
    }
    return { ok: false }
  } catch {
    return { ok: false }
  }
}

export async function deleteAccountRemote(): Promise<boolean> {
  try {
    const { status } = await api('/api/account', { method: 'DELETE' })
    return status === 200
  } catch {
    return false
  }
}
