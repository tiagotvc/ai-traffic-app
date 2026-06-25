import { Skeleton } from "@/components/ui/Skeleton";
import { ADMIN_USERS_ROW_GRID } from "@/components/billing/AdminUserUi";

export function BillingPortalSkeleton({ embedded = false }: { embedded?: boolean } = {}) {
  if (embedded) {
    return (
      <div className="w-full space-y-6">
        <div className="flex gap-6 border-b border-[var(--border-color)] pb-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-20" />
          ))}
        </div>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="space-y-4">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-14 w-full max-w-sm" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-28 w-28 shrink-0 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-44" />
            </div>
          </div>
        </div>
        <div className="border-t border-[var(--border-color)] pt-6">
          <div className="flex justify-between gap-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-32 rounded-lg" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-40 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3 w-64" />
        </div>
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>
      <div className="space-y-4">
        <div className="flex gap-6 border-b border-[var(--border-color)] pb-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-20" />
          ))}
        </div>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto]">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-28 w-56" />
        </div>
      </div>
    </div>
  );
}

export function BillingPlansSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-5 w-20" />
      </div>
      <div className="space-y-2 text-center">
        <Skeleton className="mx-auto h-9 w-32" />
        <Skeleton className="mx-auto h-4 w-96 max-w-full" />
      </div>
      <div className="flex justify-center">
        <Skeleton className="h-11 w-64 rounded-xl" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className={`rounded-2xl ${i === 3 ? "h-[420px]" : "h-96"}`} />
        ))}
      </div>
    </div>
  );
}

export function CheckoutSummarySkeleton() {
  return (
    <div className="space-y-5">
      <div className="overflow-hidden ui-card p-6">
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="mt-5 h-8 w-40" />
        <Skeleton className="mt-3 h-12 w-56" />
      </div>
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
    </div>
  );
}

export function BillingDrawerSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-xl" />
    </div>
  );
}

export function AdminPlansSkeleton() {
  return (
    <div className="w-full space-y-4">
      <div className="space-y-1.5">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-3 w-full max-w-xl" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-5 w-28" />
              </div>
              <Skeleton className="h-3 w-3" />
            </div>
            <div className="mt-4 grid gap-3 border-t border-[var(--border-color)] pt-4 lg:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, j) => (
                <Skeleton key={j} className="h-10 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminUsersListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Skeleton className="h-6 w-52" />
        <Skeleton className="h-3 w-full max-w-2xl" />
      </div>
      <Skeleton className="h-9 w-full max-w-xl rounded-xl" />
      <div className="w-full pb-2">
        <div className={`${ADMIN_USERS_ROW_GRID} mb-3`}>
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="ml-auto h-3 w-12" />
        </div>
        <div className="space-y-2.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className={`${ADMIN_USERS_ROW_GRID} rounded-xl border border-[var(--border-color)]/90 bg-white py-2.5 shadow-sm`}
            >
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="ml-auto h-8 w-24 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
      <div className="-mx-6 mt-6 border-t border-[var(--border-color)]/80 px-6 py-3 lg:-mx-8 lg:px-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-24" />
          <div className="flex gap-1.5">
            <Skeleton className="h-7 w-16 rounded-lg" />
            <Skeleton className="h-7 w-10 rounded-lg" />
            <Skeleton className="h-7 w-16 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdminUserDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-3 w-28" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-11 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-white">
            <div className="flex items-center gap-2.5 border-b border-[var(--border-color)] px-4 py-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-2.5 w-40" />
              </div>
            </div>
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="space-y-1.5">
                  <Skeleton className="h-2.5 w-16" />
                  <Skeleton className="h-9 w-full rounded-lg" />
                </div>
              ))}
              <Skeleton className="h-8 w-28 rounded-lg" />
            </div>
          </div>
        ))}
        <div className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-white lg:col-span-2">
          <div className="flex items-center gap-2.5 border-b border-[var(--border-color)] px-4 py-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-3.5 w-36" />
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-amber-200/60 bg-amber-50/30 lg:col-span-2">
          <div className="border-b border-amber-100 px-4 py-3">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="mt-1.5 h-2.5 w-56" />
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-[var(--border-color)] bg-white lg:col-span-2">
          <div className="border-b border-[var(--border-color)] px-4 py-3">
            <Skeleton className="h-3.5 w-32" />
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
