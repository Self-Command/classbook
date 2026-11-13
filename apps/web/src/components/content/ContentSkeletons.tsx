import { Card, Skeleton } from '@heroui/react';

const range = (count: number) => Array.from({ length: count }, (_, index) => index);

export function ClassmateGridSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4"
    >
      {range(8).map((item) => (
        <Card
          key={item}
          className="gap-0 rounded-[22px] border border-border/70 p-3 shadow-none"
        >
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <Skeleton className="mt-3 h-5 w-2/3 rounded-full" />
          <Skeleton className="mt-2 h-3 w-full rounded-full" />
          <Skeleton className="mt-1.5 h-3 w-4/5 rounded-full" />
        </Card>
      ))}
    </div>
  );
}

export function AlbumGridSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3"
    >
      {range(3).map((item) => (
        <Card key={item} className="gap-0 overflow-hidden rounded-3xl p-0 shadow-none">
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="p-5">
            <Skeleton className="h-5 w-1/2 rounded-full" />
            <Skeleton className="mt-3 h-3 w-full rounded-full" />
            <Skeleton className="mt-2 h-3 w-2/3 rounded-full" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function MessageListSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-3">
      {range(3).map((item) => (
        <Card key={item} className="rounded-2xl border border-border/70 p-4 shadow-none sm:p-5">
          <div className="flex items-start gap-3">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 w-28 rounded-full" />
              <Skeleton className="mt-3 h-3 w-full rounded-full" />
              <Skeleton className="mt-2 h-3 w-11/12 rounded-full" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export function TimelineSkeleton() {
  return (
    <div aria-hidden="true" className="mx-auto max-w-3xl space-y-6">
      {range(3).map((item) => (
        <div key={item} className="grid grid-cols-[14px_1fr] gap-3 sm:grid-cols-[18px_1fr] sm:gap-5">
          <div className="flex flex-col items-center">
            <Skeleton className="mt-5 size-3 rounded-full" />
            <Skeleton className="mt-2 w-px flex-1 rounded-full" />
          </div>
          <Card className="gap-0 overflow-hidden rounded-2xl p-0 shadow-none">
            <Skeleton className="aspect-[16/9] w-full rounded-none" />
            <div className="p-5">
              <Skeleton className="h-3 w-24 rounded-full" />
              <Skeleton className="mt-3 h-5 w-1/2 rounded-full" />
              <Skeleton className="mt-3 h-3 w-full rounded-full" />
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
}

export function ProfileDetailSkeleton() {
  return (
    <Card aria-hidden="true" className="rounded-3xl border border-border/70 p-5 shadow-none sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row">
        <Skeleton className="size-24 shrink-0 rounded-3xl" />
        <div className="min-w-0 flex-1">
          <Skeleton className="h-5 w-32 rounded-full" />
          <Skeleton className="mt-3 h-3 w-48 rounded-full" />
          <Skeleton className="mt-5 h-3 w-full rounded-full" />
          <Skeleton className="mt-2 h-3 w-11/12 rounded-full" />
          <Skeleton className="mt-2 h-3 w-2/3 rounded-full" />
        </div>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-14 rounded-2xl" />
        <Skeleton className="h-14 rounded-2xl" />
      </div>
    </Card>
  );
}
