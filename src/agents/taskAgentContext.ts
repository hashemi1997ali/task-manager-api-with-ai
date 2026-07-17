export interface TaskScopeDecision {
  isOffTopic: boolean;
  reasoning: string;
}

export interface TaskAgentContext {
  ownerId: string;
  attachment?: Express.Multer.File;
  attachmentConsumed: boolean;
  nowIso: string;
  timeZone: string;
  scopeDecision?: TaskScopeDecision;
}
