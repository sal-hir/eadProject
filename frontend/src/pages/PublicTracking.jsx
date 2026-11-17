import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useNavigate, useParams, Link } from 'react-router-dom';

import {
  MapPin,
  Clock,
  PackageSearch,
  CheckCircle2,
  Circle,
  Truck,
  PackageCheck,
  AlertTriangle,
  CalendarDays,
} from 'lucide-react';

import { TrackingSearch } from '../components/PublicWebsite';

import {
  PageHeader,
  Button,
  EmptyState,
  ErrorState,
  LoadingSkeleton,
} from '../components/ui';

import { StatusBadge } from '../components/StatusBadge';

import {
  publicServices,
  normalizeTrackingNumber,
  validTrackingNumber,
} from '../api/publicServices';


const TRACKING_STEPS = [
  {
    key: 'CREATED',
    label: 'Order Confirmed',
    description: 'Your parcel booking has been successfully created.',
    icon: PackageCheck,
  },
  {
    key: 'ASSIGNED_TO_COURIER',
    label: 'Courier Assigned',
    description: 'A courier has been assigned to your parcel.',
    icon: Truck,
  },
  {
    key: 'PENDING_PICKUP',
    label: 'Pending Pickup',
    description: 'The courier is preparing to collect your parcel.',
    icon: Clock,
  },
  {
    key: 'PICKED_UP',
    label: 'Picked Up',
    description: 'Your parcel has been collected by the courier.',
    icon: PackageCheck,
  },
  {
    key: 'IN_TRANSIT',
    label: 'In Transit',
    description: 'Your parcel is on its way to the destination.',
    icon: Truck,
  },
  {
    key: 'OUT_FOR_DELIVERY',
    label: 'Out for Delivery',
    description: 'Your parcel is with the courier for final delivery.',
    icon: Truck,
  },
  {
    key: 'DELIVERED',
    label: 'Delivered',
    description: 'Your parcel has been successfully delivered.',
    icon: CheckCircle2,
  },
];


const formatDate = (value) => {
  if (!value || !Number.isFinite(Date.parse(value))) {
    return 'Not available';
  }

  return new Date(value).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};


export function PublicTrackingResult({
  parcel,
  demonstration = false,
}) {
  const history = parcel.events || [];

  const historyMap = history.reduce((result, event) => {
    result[event.status] = event;
    return result;
  }, {});

  const isFailed = parcel.status === 'FAILED';
  const isCancelled = parcel.status === 'CANCELLED';

  return (
    <article
      className="ui-card space-y-7 p-5 sm:p-8"
      aria-label="Parcel tracking result"
    >
      {demonstration && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
          Demonstration only — this is not a real shipment.
        </p>
      )}

      {/* Tracking number and current status */}
      <div className="flex flex-col justify-between gap-4 border-b pb-6 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Tracking Number
          </p>

          <h2 className="mt-2 break-all font-mono text-xl font-bold text-slate-900">
            {parcel.trackingNumber}
          </h2>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-slate-500">
            Current Status
          </p>

          <StatusBadge status={parcel.status} />
        </div>
      </div>

      {/* Parcel information */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
          <CalendarDays className="mt-1 h-5 w-5 shrink-0 text-blue-600" />

          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">
              Booking Date
            </p>

            <p className="mt-2 text-sm font-medium text-slate-900">
              {formatDate(parcel.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-4">
          <Clock className="mt-1 h-5 w-5 shrink-0 text-blue-600" />

          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">
              Last Status Update
            </p>

            <p className="mt-2 text-sm font-medium text-slate-900">
              {formatDate(parcel.updatedAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Failed or cancelled notice */}
      {isFailed && (
        <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />

          <div>
            <h3 className="font-bold text-rose-900">
              Delivery Attempt Failed
            </h3>

            <p className="mt-1 text-sm text-rose-700">
              The courier could not complete the delivery. Please contact
              SwiftDrop support for further information.
            </p>
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="flex items-start gap-3 rounded-xl border border-slate-300 bg-slate-100 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" />

          <div>
            <h3 className="font-bold text-slate-900">
              Parcel Booking Cancelled
            </h3>

            <p className="mt-1 text-sm text-slate-700">
              This parcel delivery has been cancelled.
            </p>
          </div>
        </div>
      )}

      {/* Delivery progress */}
      <div>
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-900">
            Delivery Progress
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Follow your parcel through each delivery stage.
          </p>
        </div>

        <ol className="space-y-0">
          {TRACKING_STEPS.map((step, index) => {
            const Icon = step.icon;
            const historyItem = historyMap[step.key];

            const isCompleted = Boolean(historyItem);
            const isCurrent = parcel.status === step.key;

            const isLast = index === TRACKING_STEPS.length - 1;

            return (
              <li
                key={step.key}
                className="relative flex gap-4 pb-7 last:pb-0"
              >
                {/* Timeline icon and connecting line */}
                <div className="relative flex shrink-0 flex-col items-center">
                  <span
                    className={`z-10 flex h-10 w-10 items-center justify-center rounded-full ${
                      isCompleted
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {isCompleted && !isCurrent ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      <Icon className="h-5 w-5" />
                    )}
                  </span>

                  {!isLast && (
                    <span
                      className={`absolute top-10 h-full w-0.5 ${
                        isCompleted
                          ? 'bg-blue-500'
                          : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>

                {/* Timeline information */}
                <div className="min-w-0 flex-1 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p
                      className={`text-sm font-semibold ${
                        isCompleted
                          ? 'text-slate-900'
                          : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </p>

                    {historyItem && (
                      <span className="text-xs text-slate-500">
                        {formatDate(historyItem.timestamp)}
                      </span>
                    )}

                    {isCurrent && (
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                        Current Status
                      </span>
                    )}
                  </div>

                  <p
                    className={`mt-1 text-xs ${
                      isCompleted
                        ? 'text-slate-600'
                        : 'text-slate-400'
                    }`}
                  >
                    {step.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Latest update */}
      <div className="border-t pt-5">
        <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />

          Tracking information is based on status updates received from
          the delivery service. Further updates will appear here as your
          parcel progresses.
        </p>
      </div>
    </article>
  );
}


const demoParcel = {
  trackingNumber: 'DEMO-ONLY',
  status: 'IN_TRANSIT',
  createdAt: '2026-01-15T08:00:00Z',
  updatedAt: '2026-01-15T10:00:00Z',
  events: [
    {
      status: 'CREATED',
      timestamp: '2026-01-15T08:00:00Z',
    },
    {
      status: 'ASSIGNED_TO_COURIER',
      timestamp: '2026-01-15T08:30:00Z',
    },
    {
      status: 'PICKED_UP',
      timestamp: '2026-01-15T09:00:00Z',
    },
    {
      status: 'IN_TRANSIT',
      timestamp: '2026-01-15T10:00:00Z',
    },
  ],
};


export const PublicTracking = () => {
  const { trackingNumber } = useParams();
  const navigate = useNavigate();

  const generation = useRef(0);

  const [state, setState] = useState({ kind: 'idle' });
  const [example, setExample] = useState(false);

  const load = useCallback(async (raw) => {
    const operation = ++generation.current;

    setExample(false);

    if (!raw || !validTrackingNumber(raw)) {
      setState({ kind: 'invalid' });
      return;
    }

    setState({ kind: 'loading' });

    try {
      const parcel = await publicServices.track(
        normalizeTrackingNumber(raw)
      );

      if (operation === generation.current) {
        setState({ kind: 'result', parcel });
      }
    } catch (error) {
      if (operation === generation.current) {
        setState({
          kind: error.kind || 'network',
        });
      }
    }
  }, []);

  useEffect(() => {
    if (trackingNumber) {
      load(trackingNumber);
    } else {
      setState({ kind: 'idle' });
      setExample(false);
    }

    return () => {
      generation.current++;
    };
  }, [trackingNumber, load]);

  return (
    <section className="public-container max-w-4xl space-y-7 py-10 sm:py-14">
      <PageHeader
        title="Track Your Parcel"
        description="Enter your tracking number to follow your parcel's delivery progress."
      />

      <div className="ui-card p-5">
        <TrackingSearch
          key={trackingNumber || 'search'}
          initialValue={trackingNumber || ''}
          busy={state.kind === 'loading'}
          onSearch={(code) => {
            const normalized = normalizeTrackingNumber(code);

            if (normalized === trackingNumber) {
              load(normalized);
            } else {
              navigate(`/track/${encodeURIComponent(normalized)}`);
            }
          }}
        />
      </div>

      {state.kind === 'idle' && (
        <EmptyState
          title="Your parcel journey, in one place"
          description="Enter your tracking number above to view the latest delivery status and progress."
        />
      )}

      {state.kind === 'loading' && (
        <LoadingSkeleton label="Looking up your parcel..." />
      )}

      {state.kind === 'invalid' && (
        <ErrorState message="This tracking reference is invalid. Enter 4–64 letters, numbers or hyphens." />
      )}

      {state.kind === 'unavailable' && (
        <EmptyState
          title="Tracking service unavailable"
          description="The tracking service is temporarily unavailable. Please try again later."
          action={
            <Button
              variant="secondary"
              onClick={() => load(trackingNumber)}
            >
              Try Again
            </Button>
          }
        />
      )}

      {state.kind === 'not-found' && (
        <EmptyState
          title="No parcel found"
          description="We couldn't find a parcel with this tracking number. Please check the number and try again."
        />
      )}

      {state.kind === 'network' && (
        <ErrorState
          message="Tracking could not be reached. Check your connection and try again."
          onRetry={() => load(trackingNumber)}
        />
      )}

      {state.kind === 'result' && (
        <PublicTrackingResult parcel={state.parcel} />
      )}

      <div className="rounded-xl border border-dashed border-slate-300 p-5">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-sm text-slate-600">
            Want to see how the tracking page works?
          </p>

          <Button
            variant="secondary"
            onClick={() => setExample(!example)}
          >
            {example ? 'Hide Example' : 'View Demonstration'}
          </Button>
        </div>
      </div>

      {example && (
        <PublicTrackingResult
          parcel={demoParcel}
          demonstration
        />
      )}

      <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
        <PackageSearch className="h-[18px] w-[18px] shrink-0" />

        Your tracking page displays delivery progress without exposing
        private contact details or delivery addresses.
      </p>
    </section>
  );
};