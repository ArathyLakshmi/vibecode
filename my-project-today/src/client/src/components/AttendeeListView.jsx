import React from 'react'
import { Spinner, Button } from '@fluentui/react-components'
import { PeopleCommunity24Regular, Dismiss20Regular } from '@fluentui/react-icons'

export default function AttendeeListView({ data, loading, error, onRefresh }) {
  const capacity = data?.capacityInfo
  const confirmed = data?.confirmedAttendees || []
  const waitlisted = data?.waitlistedAttendees || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <PeopleCommunity24Regular />
          <span>Attendees</span>
        </div>
        <div className="flex items-center gap-2">
          <Button appearance="subtle" size="small" onClick={onRefresh} disabled={loading}>
            Refresh
          </Button>
          {data && (capacity?.confirmedCount || capacity?.waitlistedCount) ? (
            <div className="text-xs text-gray-600">
              Confirmed: {capacity?.confirmedCount ?? 0}
              {capacity?.maxAttendees ? ` / ${capacity.maxAttendees}` : ''} • Waitlist: {capacity?.waitlistedCount ?? 0}
            </div>
          ) : null}
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Spinner size="extra-tiny" />
          <span>Loading attendee list...</span>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded">
          <Dismiss20Regular className="text-red-600" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {!loading && !error && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-800">Confirmed ({confirmed.length})</h4>
                <span className="text-xs text-gray-500">{capacity?.confirmedCount ?? confirmed.length} total</span>
              </div>
              {confirmed.length === 0 ? (
                <p className="text-xs text-gray-600">No confirmed attendees yet.</p>
              ) : (
                <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {confirmed.map(att => (
                    <li key={att.id} className="p-2 bg-white rounded border border-gray-200">
                      <div className="text-sm font-medium text-gray-900">{att.userName || att.userEmail}</div>
                      <div className="text-xs text-gray-600">{att.userEmail}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Registered {new Date(att.registrationDate).toLocaleString()}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-gray-800">Waitlisted ({waitlisted.length})</h4>
                <span className="text-xs text-gray-500">{capacity?.waitlistedCount ?? waitlisted.length} total</span>
              </div>
              {waitlisted.length === 0 ? (
                <p className="text-xs text-gray-600">No one on the waitlist.</p>
              ) : (
                <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {waitlisted.map(att => (
                    <li key={att.id} className="p-2 bg-white rounded border border-gray-200">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{att.userName || att.userEmail}</div>
                          <div className="text-xs text-gray-600">{att.userEmail}</div>
                        </div>
                        {att.waitlistPosition && (
                          <span className="px-2 py-1 text-xs font-semibold rounded bg-amber-100 text-amber-800">
                            #{att.waitlistPosition}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Added {new Date(att.registrationDate).toLocaleString()}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {capacity && (
            <div className="text-xs text-gray-600">
              {capacity.maxAttendees ? (
                <span>
                  Capacity: {capacity.confirmedCount}/{capacity.maxAttendees} filled{capacity.isAtCapacity ? ' (Full)' : ''}
                </span>
              ) : (
                <span>Capacity: Unlimited</span>
              )}
              {capacity.registrationDeadline && (
                <span className="ml-2">
                  • Deadline: {new Date(capacity.registrationDeadline).toLocaleString()}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {!loading && !error && !data && (
        <div className="p-3 bg-gray-50 border border-dashed border-gray-200 rounded text-xs text-gray-600">
          Attendee list will appear when a confirmed or announced meeting is selected.
        </div>
      )}
    </div>
  )
}
