class SlaStatusDto {
  static toSegmentResponse(segment) {
    if (!segment) return null;
    return {
      stage: segment.stage,
      startedAt: segment.startedAt ? new Date(segment.startedAt).toISOString() : null,
      endedAt: segment.endedAt ? new Date(segment.endedAt).toISOString() : null,
      targetMinutes: Number(segment.targetMinutes || 0),
      elapsedMinutes: Number(segment.elapsedMinutes || 0),
      remainingMinutes: Number(segment.remainingMinutes || 0),
      state: segment.state, // WITHIN_SLA, APPROACHING, BREACHED, MET
    };
  }

  static toResponse({ jobOrderId, segments = [], overall = null }) {
    return {
      jobOrderId: jobOrderId ? jobOrderId.toString() : null,
      segments: segments.map((s) => this.toSegmentResponse(s)),
      overall: overall
        ? {
            targetMinutes: Number(overall.targetMinutes || 0),
            elapsedMinutes: Number(overall.elapsedMinutes || 0),
            remainingMinutes: Number(overall.remainingMinutes || 0),
            state: overall.state,
          }
        : null,
    };
  }
}

module.exports = SlaStatusDto;
