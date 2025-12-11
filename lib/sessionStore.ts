export type UserProfile = {
  id: string;
  name?: string;
  country?: string;
  homePensionSystem?: string;
  hasBilateralAgreement?: boolean;
  pensionNumber?: string;
  residenceCardNumber?: string;
  language?: string;
};

export type DocumentType = "marketing_electricity" | "pension_non_payment" | "other";

export type CaseDocument = {
  id: string;
  type: DocumentType;
  originalImageUrl?: string;
  extracted: {
    issuer?: string;
    amountYen?: number | null;
    dueDate?: string | null;
    period?: string | null;
    contactPhone?: string | null;
    isPaymentRequired?: boolean | null;
    summaryEn?: string | null;
    rawJson?: any;
  };
};

export type CaseState = {
  id: string;
  userId: string;
  documentId: string;
  callContext?: any;
  memoryBlob?: string;
  callSummaryEn?: string;
  nextStepsEn?: string;
  pendingField?: string;
  pendingReason?: string;
  awaitingUserInfo?: boolean;
  readyToResume?: boolean;
};

export type SessionState = {
  user: UserProfile;
  documents: CaseDocument[];
  currentCase?: CaseState;
};

const sessions: Record<string, SessionState> = {};

export function getSession(sessionId: string = "demo"): SessionState {
  if (!sessions[sessionId]) {
    sessions[sessionId] = {
      user: { id: sessionId, language: "en" },
      documents: [],
    };
  }
  return sessions[sessionId];
}

export function saveSession(sessionId: string, state: SessionState): void {
  sessions[sessionId] = state;
}
