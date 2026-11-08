export interface RsvpRecord {
  clientId: string;
  name: string;
  attending: boolean;
  attendees: number;
  message: string;
  createdAt: string;
  demo: boolean;
}

export interface WishRecord {
  id: string;
  name: string;
  message: string;
  createdAt: string;
  demo: boolean;
}

export interface SubmitResult {
  ok: boolean;
  demo: boolean;
  error?: string;
  duplicate?: boolean;
}
