import type { FormLabSnapshot } from "@/types/formLab";
import { buildBubbleShape, generateBubbles } from "./generateBubbleShape";

export function generateBoundaryPoints(snapshot: FormLabSnapshot) {
  return generateBubbles(snapshot).bubbles;
}

export function generateOrganicShapePath(snapshot: FormLabSnapshot) {
  return buildBubbleShape(snapshot).shapePath;
}

export function connectionPointsForShape(snapshot: Pick<FormLabSnapshot, "connectionPointCount" | "boundaryShape" | "connectionPointType">) {
  return Array.from({ length: snapshot.connectionPointCount }, (_, index) => ({
    id: `c-${index}`,
    x: 0.5,
    y: 0.5,
    angle: (Math.PI * 2 * index) / snapshot.connectionPointCount,
    type: snapshot.connectionPointType
  }));
}
