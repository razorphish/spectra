/** Actor snapshot stored in `created_by` / `updated_by` jsonb columns. */
export interface ActorRef {
  name: string;
  userId: string | null;
}

/** Sentinel for migrations and system-driven writes. */
export const SYSTEM_ACTOR: ActorRef = {
  name: 'SYSTEM',
  userId: null,
};

export function buildActorJson(actor: ActorRef): { name: string; userId: string | null } {
  return { name: actor.name, userId: actor.userId };
}
