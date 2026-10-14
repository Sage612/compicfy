import { isPatronUser, isProUser } from '@/lib/access'
import type { RoleProfile } from '@/lib/access'

/**
 * Single source of truth for reading-list folder rules (item #4).
 * Imported by the folder API routes AND the lists UI, so the tier limits
 * can never drift between what the server enforces and what the screen
 * offers.
 */

// Keep in sync with the CHECK constraint in migration 17
// (list_folders_name_length).
export const LIST_FOLDER_NAME_MAX_LENGTH = 40

// Depth counts levels: a top-level folder is depth 1.
//   pro:    1  -> plain folders, no folder inside a folder
//   patron: 10 -> nesting is a Patron feature ("unlimited nested folders"
//                 in access.ts). The ceiling is a safety limit so a bad
//                 parent chain can never cause runaway recursion; raise it
//                 here if anyone ever genuinely needs deeper.
export const MAX_FOLDER_DEPTH = { pro: 1, patron: 10 } as const

export interface ListFolder {
  id:         string
  parent_id:  string | null
  name:       string
  created_at: string
}

/** How many folder levels this user may use. 0 = no folders at all (Free). */
export function maxFolderDepth(profile: RoleProfile): number {
  if (isPatronUser(profile)) return MAX_FOLDER_DEPTH.patron
  if (isProUser(profile))    return MAX_FOLDER_DEPTH.pro
  return 0
}

/** Depth of a folder: 1 for a top-level folder, 2 for one inside it, etc. */
export function folderDepth(folderId: string, folders: ListFolder[]): number {
  const byId   = new Map(folders.map(f => [f.id, f]))
  const seen   = new Set<string>()
  let   depth  = 0
  let   cursor: string | null = folderId
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor)
    const folder = byId.get(cursor)
    if (!folder) break
    depth++
    cursor = folder.parent_id
  }
  return depth
}

/** Number of levels BELOW a folder (0 when it has no subfolders). */
export function subtreeHeight(folderId: string, folders: ListFolder[]): number {
  const children = new Map<string, string[]>()
  for (const f of folders) {
    if (!f.parent_id) continue
    const list = children.get(f.parent_id) ?? []
    list.push(f.id)
    children.set(f.parent_id, list)
  }
  const seen = new Set<string>()
  const walk = (id: string): number => {
    if (seen.has(id)) return 0
    seen.add(id)
    const kids = children.get(id) ?? []
    if (kids.length === 0) return 0
    return 1 + Math.max(...kids.map(walk))
  }
  return walk(folderId)
}

/** True if candidateId sits anywhere beneath ancestorId. */
export function isDescendantOf(candidateId: string, ancestorId: string, folders: ListFolder[]): boolean {
  const byId = new Map(folders.map(f => [f.id, f]))
  const seen = new Set<string>()
  let cursor = byId.get(candidateId)?.parent_id ?? null
  while (cursor && !seen.has(cursor)) {
    if (cursor === ancestorId) return true
    seen.add(cursor)
    cursor = byId.get(cursor)?.parent_id ?? null
  }
  return false
}

/** Root-to-folder chain, for breadcrumbs. Empty array = top level. */
export function folderPath(folderId: string | null, folders: ListFolder[]): ListFolder[] {
  const byId = new Map(folders.map(f => [f.id, f]))
  const seen = new Set<string>()
  const path: ListFolder[] = []
  let cursor = folderId
  while (cursor && !seen.has(cursor)) {
    const folder = byId.get(cursor)
    if (!folder) break
    seen.add(cursor)
    path.unshift(folder)
    cursor = folder.parent_id
  }
  return path
}

/** Can a new folder be created directly under parentId (null = top level)? */
export function canCreateFolderUnder(
  parentId: string | null,
  folders: ListFolder[],
  maxDepth: number,
): boolean {
  const depth = parentId ? folderDepth(parentId, folders) + 1 : 1
  return depth <= maxDepth
}

/**
 * Tier rule for moving a folder under newParentId (null = top level).
 * Allowed when the deepest folder in the moved branch still fits the
 * user's depth limit, OR when the move makes the tree shallower (so
 * someone whose Patron access lapsed can still flatten what they built).
 * Structural checks (not into itself or its own subfolders) are separate:
 * see isDescendantOf.
 */
export function canMoveFolder(
  folderId: string,
  newParentId: string | null,
  folders: ListFolder[],
  maxDepth: number,
): boolean {
  const height        = subtreeHeight(folderId, folders)
  const deepestAfter  = (newParentId ? folderDepth(newParentId, folders) : 0) + 1 + height
  const deepestBefore = folderDepth(folderId, folders) + height
  return deepestAfter <= maxDepth || deepestAfter < deepestBefore
}

/**
 * Every folder in display order: alphabetical, each folder's children
 * directly after it. `depth` here is the indent level (0 = top level).
 */
export function folderTree(folders: ListFolder[]): { folder: ListFolder; depth: number }[] {
  const children = new Map<string | null, ListFolder[]>()
  for (const f of folders) {
    const siblings = children.get(f.parent_id) ?? []
    siblings.push(f)
    children.set(f.parent_id, siblings)
  }
  const out: { folder: ListFolder; depth: number }[] = []
  const seen = new Set<string>()
  const walk = (parentId: string | null, depth: number) => {
    const siblings = [...(children.get(parentId) ?? [])].sort((a, b) => a.name.localeCompare(b.name))
    for (const folder of siblings) {
      if (seen.has(folder.id)) continue
      seen.add(folder.id)
      out.push({ folder, depth })
      walk(folder.id, depth + 1)
    }
  }
  walk(null, 0)
  return out
}