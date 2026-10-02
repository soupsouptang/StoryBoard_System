'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';

export interface ProjectCommit {
  id: string; message: string; branch_name: string; parent_id: string | null;
  merge_parent_id: string | null; created_by: string | null; created_at: string;
  content_hash: string; redaction_revision: number;
}
export interface ProjectBranch { id: string; name: string; head_id: string | null; revision: number }
export interface ProjectGraph { commits: ProjectCommit[]; branches: ProjectBranch[]; next_before_id: string | null }
export interface ProjectState { state_hash: string; sections: Record<string, number>; excluded_components: string[]; pending_components: string[] }
export interface ProjectDiffLine {
  kind: 'equal' | 'replace' | 'insert' | 'delete' | 'fold';
  left_line?: number | null; right_line?: number | null;
  before?: string | null; after?: string | null; unchanged_lines?: number;
}
export interface ProjectChange {
  section: string; section_label: string; entity_id: string; field: string | null;
  label: string; kind: string; before: unknown; after: unknown; lines: ProjectDiffLine[];
}
export interface ProjectComparison {
  from_commit_id: string; to_commit_id: string | null; from_hash: string; to_hash: string;
  changed_count: number; unchanged_entities: number; changes: ProjectChange[];
}
const base = (id: string) => `/api/v1/productions/${encodeURIComponent(id)}`;
const key = (id: string) => ['project-versions', id] as const;

export function useProjectVersionState(id: string) {
  return useQuery({ queryKey: [...key(id), 'state'], queryFn: ({ signal }) => apiClient<ProjectState>(`${base(id)}/version-state`, { signal }), enabled: Boolean(id) });
}
export function useProjectVersionGraph(id: string) {
  return useInfiniteQuery({ queryKey: [...key(id), 'graph'], initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) => apiClient<ProjectGraph>(`${base(id)}/version-graph?limit=50${pageParam ? `&before_id=${encodeURIComponent(pageParam)}` : ''}`, { signal }),
    getNextPageParam: page => page.next_before_id ?? undefined, enabled: Boolean(id) });
}
export function useProjectCommitDetail(id: string, commitId: string | null) {
  return useQuery({ queryKey: [...key(id), 'detail', commitId], enabled: Boolean(id && commitId),
    queryFn: ({ signal }) => apiClient<ProjectCommit & { snapshot: Record<string, unknown> }>(`${base(id)}/commits/${encodeURIComponent(commitId!)}`, { signal }) });
}
export function useProjectVersionCompare(id: string, from: string, to: string, shotId?: string) {
  const params = new URLSearchParams();
  if (to !== 'current') params.set('to_id', to);
  if (shotId) params.set('shot_id', shotId);
  return useQuery({ queryKey: [...key(id), 'compare', from, to, shotId ?? null], enabled: Boolean(id && from && to && from !== to),
    queryFn: ({ signal }) => apiClient<ProjectComparison>(`${base(id)}/commits/${encodeURIComponent(from)}/compare?${params}`, { signal }) });
}
// Writes live here; the panel only supplies commands and handles acknowledged UI state.
export function useProjectVersionMutations(id: string) {
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: key(id) });
  const authorize = () => {
    const permissions = useAuthStore.getState().user?.role?.permissions;
    if (!(permissions?.['*'] || permissions?.['shot.write'] || permissions?.['production.write'])) throw new Error('当前账号没有项目版本写入权限');
  };
  const commit = useMutation({ mutationFn: async (message: string) => {
    authorize();
    const [state, graph] = await Promise.all([
      apiClient<ProjectState>(`${base(id)}/version-state`),
      apiClient<ProjectGraph>(`${base(id)}/version-graph?limit=1`)
    ]);
    const head = graph.branches.find(branch => branch.name === 'main')?.head_id ?? null;
    authorize();
    const result = await apiClient<ProjectCommit>(`${base(id)}/commits`, { method: 'POST', json: {
      message, branch_name: 'main', expected_head_id: head, expected_state_hash: state.state_hash
    } });
    return { commit: result, unchanged: result.id === head };
  }, onSettled: invalidate });
  const branch = useMutation({ mutationFn: (command: { name: string; from_commit_id: string }) => {
    authorize();
    return apiClient<ProjectBranch>(`${base(id)}/version-branches`, { method: 'POST', json: command });
  }, onSettled: invalidate });
  return { commit, branch };
}
