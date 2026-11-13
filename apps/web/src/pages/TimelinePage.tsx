import { useMemo } from 'react';
import type { TimelineEventDto } from '@classbook/shared';
import { Card } from '@heroui/react';
import { timelineApi } from '@/lib/api';
import { useAsyncData } from '@/lib/useAsyncData';
import { useSiteCopy } from '@/lib/siteCopy';
import { formatDate, timelineYear } from '@/lib/format';
import { IconCalendar, IconClock } from '@/components/icons';
import { EmptyPanel, ErrorPanel } from '@/components/content/ContentStates';
import { TimelineSkeleton } from '@/components/content/ContentSkeletons';
import { PageShell } from '@/components/content/PageShell';

interface YearGroup {
  year: number | null;
  events: TimelineEventDto[];
}

export default function TimelinePage() {
  const { copy } = useSiteCopy();
  const { data, loading, error, reload } = useAsyncData(() => timelineApi.list(), []);

  const groups = useMemo<YearGroup[]>(() => {
    if (!data) return [];

    const sorted = [...data.items].sort(
      (first, second) =>
        new Date(second.date).getTime() - new Date(first.date).getTime(),
    );

    const grouped = new Map<number | null, TimelineEventDto[]>();
    for (const event of sorted) {
      const year = timelineYear(event.date);
      const bucket = grouped.get(year);
      if (bucket) {
        bucket.push(event);
      } else {
        grouped.set(year, [event]);
      }
    }

    return Array.from(grouped.entries()).map(([year, events]) => ({ year, events }));
  }, [data]);

  return (
    <PageShell
      description={copy.timelineDescription}
      eyebrow="拾光纪事"
      title={copy.timelineTitle}
    >
      {loading && !data && <TimelineSkeleton />}

      {!loading && error && (
        <ErrorPanel message={error} title="时间线暂时打不开" onRetry={reload} />
      )}

      {!loading && !error && data && data.items.length === 0 && (
        <EmptyPanel
          description={copy.timelineEmptyDescription}
          icon={<IconClock className="size-5" />}
          title={copy.timelineEmptyTitle}
        />
      )}

      {groups.length > 0 && (
        <div className={`mx-auto max-w-3xl ${loading ? 'opacity-60' : ''}`}>
          {groups.map((group, groupIndex) => (
            <section
              className={groupIndex === 0 ? '' : 'mt-10 sm:mt-12'}
              key={group.year ?? 'unknown'}
            >
              <div className="mb-5 flex items-baseline gap-3">
                <h2 className="font-display text-2xl leading-8 text-foreground sm:text-3xl">
                  {group.year ?? '旧时光'}
                </h2>
                {group.year !== null && (
                  <span className="text-xs text-muted">年</span>
                )}
                <span className="h-px flex-1 bg-border" />
              </div>

              <ol>
                {group.events.map((event, eventIndex) => {
                  const isLastEvent =
                    groupIndex === groups.length - 1 &&
                    eventIndex === group.events.length - 1;

                  return (
                  <li
                    className="grid grid-cols-[14px_1fr] gap-3 sm:grid-cols-[18px_1fr] sm:gap-5"
                    key={event.id}
                  >
                    <div aria-hidden="true" className="flex flex-col items-center">
                      <span className="mt-5 size-3 rounded-full border-2 border-background bg-accent ring-4 ring-accent/10" />
                      <span
                        className={`w-px flex-1 ${
                          isLastEvent ? 'bg-transparent' : 'bg-accent/20'
                        }`}
                      />
                    </div>

                    <article
                      className={
                        isLastEvent ? 'min-w-0' : 'min-w-0 pb-8'
                      }
                    >
                      <Card className="gap-0 overflow-hidden rounded-2xl border border-border/70 bg-surface p-0 shadow-sm transition hover:shadow-lg">
                        {event.imageUrl && (
                          <img
                            alt={event.title}
                            className="aspect-[16/9] max-h-72 w-full object-cover"
                            loading="lazy"
                            src={event.imageUrl}
                          />
                        )}
                        <div className="p-4 sm:p-5">
                          <p className="flex items-center gap-1.5 text-[11px] text-accent">
                            <IconCalendar className="size-3.5" />
                            {formatDate(event.date)}
                          </p>
                          <h3 className="mt-1.5 font-display text-xl leading-7 text-foreground">
                            {event.title}
                          </h3>
                          {event.description && (
                            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-foreground/85">
                              {event.description}
                            </p>
                          )}
                        </div>
                      </Card>
                    </article>
                  </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </PageShell>
  );
}