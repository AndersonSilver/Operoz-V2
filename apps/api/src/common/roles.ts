/**
 * Papéis compartilhados por Workspace e (futuramente) Project. Valores
 * numéricos preservam a ordem de privilégio (maior = mais acesso), o que
 * permite comparações diretas (`role >= WorkspaceRole.ADMIN`).
 */
export enum WorkspaceRole {
  GUEST = 5,
  MEMBER = 15,
  ADMIN = 20,
}

export const WORKSPACE_ROLE_VALUES = [
  WorkspaceRole.GUEST,
  WorkspaceRole.MEMBER,
  WorkspaceRole.ADMIN,
] as const;

export function isValidWorkspaceRole(value: number): value is WorkspaceRole {
  return (WORKSPACE_ROLE_VALUES as readonly number[]).includes(value);
}
