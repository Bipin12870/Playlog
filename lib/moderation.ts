import { MODERATION_URL } from '../src/config/env';

type PerspectiveAttribute =
  | 'TOXICITY'
  | 'SEVERE_TOXICITY'
  | 'INSULT'
  | 'PROFANITY'
  | 'IDENTITY_ATTACK'
  | 'THREAT'
  | 'SEXUALLY_EXPLICIT'
  | 'HATE_SPEECH';

type PerspectiveRequestedAttributes = Record<PerspectiveAttribute, Record<string, never>>;

type PerspectiveScore = {
  summaryScore?: {
    value?: number;
    type?: string;
  };
};

type PerspectiveResponse = {
  attributeScores?: Partial<Record<PerspectiveAttribute, PerspectiveScore>>;
  languages?: string[];
};

export type ModerationVerdict = {
  allowed: boolean;
  flagged: { attribute: PerspectiveAttribute; score: number }[];
  response?: PerspectiveResponse;
};

const PERSPECTIVE_API_URL =
  'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze';

const DEFAULT_ATTRIBUTES: PerspectiveAttribute[] = [
  'TOXICITY',
  'SEVERE_TOXICITY',
  'INSULT',
  'PROFANITY',
  'IDENTITY_ATTACK',
  'THREAT',
  'SEXUALLY_EXPLICIT',
];

const DEFAULT_THRESHOLD = 0.75;

function getApiKey() {
  const key = process.env.EXPO_PUBLIC_PERSPECTIVE_API_KEY;
  if (!key) {
    throw new Error('Missing moderation configuration.');
  }
  return key;
}

function toRequestedAttributes(attributes: PerspectiveAttribute[]): PerspectiveRequestedAttributes {
  return attributes.reduce((acc, attribute) => {
    acc[attribute] = {};
    return acc;
  }, {} as PerspectiveRequestedAttributes);
}

export async function moderateText(
  text: string,
  options?: {
    threshold?: number;
    attributes?: PerspectiveAttribute[];
    languages?: string[];
  },
): Promise<ModerationVerdict> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { allowed: true, flagged: [] };
  }

  const threshold = typeof options?.threshold === 'number' ? options.threshold : DEFAULT_THRESHOLD;
  const attributes = options?.attributes ?? DEFAULT_ATTRIBUTES;
  const requestedAttributes = toRequestedAttributes(attributes);

  if (MODERATION_URL) {
    return moderateViaServer(trimmed, {
      threshold,
      attributes,
      languages: options?.languages,
    });
  }

  const apiKey = getApiKey();

  const response = await fetch(`${PERSPECTIVE_API_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      comment: { text: trimmed },
      languages: options?.languages,
      requestedAttributes,
      doNotStore: true,
    }),
  });

  if (!response.ok) {
    let detail: string | undefined;
    try {
      const parsed = (await response.json()) as { error?: { message?: string } };
      detail = parsed?.error?.message;
    } catch {
      detail = undefined;
    }
    throw new Error(detail || 'Unable to check content for abusive language.');
  }

  const payload = (await response.json()) as PerspectiveResponse;
  const flagged: ModerationVerdict['flagged'] = [];

  for (const attribute of attributes) {
    const value = payload.attributeScores?.[attribute]?.summaryScore?.value;
    if (typeof value === 'number' && value >= threshold) {
      flagged.push({ attribute, score: value });
    }
  }

  return { allowed: flagged.length === 0, flagged, response: payload };
}

async function moderateViaServer(
  text: string,
  options: {
    threshold: number;
    attributes: PerspectiveAttribute[];
    languages?: string[];
  },
): Promise<ModerationVerdict> {
  const baseUrl = MODERATION_URL?.replace(/\/+$/, '');
  if (!baseUrl) {
    throw new Error('Missing moderation configuration.');
  }

  const response = await fetch(`${baseUrl}/moderation/check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      threshold: options.threshold,
      attributes: options.attributes,
      languages: options.languages,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || 'Unable to check content for abusive language.');
  }

  const payload = (await response.json()) as ModerationVerdict;
  if (!payload || typeof payload.allowed !== 'boolean' || !Array.isArray(payload.flagged)) {
    throw new Error('Invalid moderation response.');
  }
  return payload;
}
