import { apiRequest } from '../lib/api';
import type { Annotation, FactorTag } from '@aerospec/types';

export interface CreateAnnotationInput {
  homeId: string;
  roomId?: string | null;
  deviceId?: string | null;
  ts: string;
  tags: FactorTag[];
  note?: string | null;
}

export interface AnnotationsResponse {
  annotations: Annotation[];
  total: number;
}

export function createAnnotation(input: CreateAnnotationInput): Promise<Annotation> {
  return apiRequest<Annotation>('/annotations', {
    method: 'POST',
    body: JSON.stringify({
      homeId: input.homeId,
      ...(input.roomId !== undefined && { roomId: input.roomId }),
      ...(input.deviceId !== undefined && { deviceId: input.deviceId }),
      ts: input.ts,
      tags: input.tags,
      ...(input.note !== undefined && { note: input.note }),
    }),
  });
}

export function getAnnotations(params: {
  homeId: string;
  from?: string;
  to?: string;
}): Promise<AnnotationsResponse> {
  const searchParams = new URLSearchParams({ homeId: params.homeId });
  if (params.from) searchParams.set('from', params.from);
  if (params.to) searchParams.set('to', params.to);

  return apiRequest<AnnotationsResponse>(`/annotations?${searchParams.toString()}`);
}
