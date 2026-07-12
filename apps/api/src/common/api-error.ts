/**
 * Erro de API padronizado: todo endpoint que falha de forma esperada
 * (validação, permissão, conflito) deve lançar isto, não um Error genérico.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
