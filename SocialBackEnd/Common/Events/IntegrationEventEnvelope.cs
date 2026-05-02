namespace SocialBackEnd.Common.Events;

public sealed record IntegrationEventEnvelope(
    string EventType,
    DateTime OccurredAtUtc,
    string? Key,
    string Payload);
