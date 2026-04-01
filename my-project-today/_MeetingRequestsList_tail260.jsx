                          {(item.createdBy ?? item.CreatedBy ?? item.requestorName ?? item.RequestorName) && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                              <Person20Regular />
                              <span>{item.createdBy ?? item.CreatedBy ?? item.requestorName ?? item.RequestorName}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Updated (only show if different from created) */}
                      {(item.updatedAt ?? item.UpdatedAt) && (item.updatedAt ?? item.UpdatedAt) !== (item.createdAt ?? item.CreatedAt) && (
                        <div className="flex items-start gap-3 p-3 bg-[#e6f2ff] rounded-lg">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#cce5ff] flex items-center justify-center">
                            <CalendarClock20Regular className="text-[#0078d4]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900">Last Updated</div>
                            <div className="text-xs text-gray-600 mt-1">
                              {new Date(item.updatedAt ?? item.UpdatedAt).toLocaleString()}
                            </div>
                            {(item.updatedBy ?? item.UpdatedBy) && (
                              <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                                <Person20Regular />
                                <span>{item.updatedBy ?? item.UpdatedBy}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Status Changes Timeline */}
                      {auditLogs && auditLogs.filter(log => log.fieldName === 'Status').length > 0 && (
                        <div className="mt-4">
                          <div className="text-xs font-semibold text-gray-700 mb-2">Status Changes</div>
                          <div className="space-y-2">
                            {auditLogs
                              .filter(log => log.fieldName === 'Status')
                              .map((log, idx) => (
                                <div key={idx} className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                                    <Clock24Regular className="text-purple-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-gray-900">
                                      Status: <span className="text-red-600">{log.oldValue || 'None'}</span> → <span className="text-green-600">{log.newValue}</span>
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">
                                      {new Date(log.changedAt).toLocaleString()}
                                    </div>
                                    {log.changedBy && (
                                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                                        <Person20Regular />
                                        <span>{log.changedBy}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Field-level change history */}
                  <div className="mt-6 pt-4 border-t border-gray-200">
                    <div 
                      className="flex items-center justify-between cursor-pointer mb-3 hover:bg-gray-50 p-2 rounded -m-2"
                      onClick={() => setShowChangeHistory(!showChangeHistory)}
                    >
                      <h4 className="text-xs font-semibold text-gray-700">Change History {auditLogs && auditLogs.length > 0 && `(${auditLogs.length})`}</h4>
                      {showChangeHistory ? <ChevronUp20Regular /> : <ChevronDown20Regular />}
                    </div>
                    
                    {showChangeHistory && (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {auditLogs && auditLogs.length > 0 ? (
                          auditLogs.map((log, idx) => (
                            <div key={idx} className="flex items-start gap-2 p-2 bg-white rounded border border-gray-200">
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-gray-900">{log.fieldName}</div>
                                <div className="text-xs text-gray-600 mt-1">
                                  <span className="text-red-600">Old: {log.oldValue || '(empty)'}</span>
                                  {' → '}
                                  <span className="text-green-600">New: {log.newValue || '(empty)'}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                  <span>{new Date(log.changedAt).toLocaleString()}</span>
                                  {log.changedBy && (
                                    <>
                                      <span>•</span>
                                      <span>{log.changedBy}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-gray-500 italic p-2">
                            No changes recorded yet. Changes will appear here after editing this request.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </FluentProvider>
          )
        })()}
      </Drawer>

      {/* Cancel Request Dialog */}
      {showCancelDialog && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-[60]"
            onClick={() => !cancellingRequest && setShowCancelDialog(false)}
          />
          
          {/* Dialog */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancel Request</h3>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for cancellation <span className="text-red-600">*</span>
              </label>
              <textarea
                ref={cancelReasonRef}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={4}
                placeholder="Please provide a reason for cancelling this request..."
                disabled={cancellingRequest}
              />
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCancelDialog(false)}
                  disabled={cancellingRequest}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCancelConfirm}
                  disabled={cancellingRequest}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancellingRequest ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      </>
      )}

      {showDeleteDialog && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-[60]"
            onClick={() => !deletingRequest && setShowDeleteDialog(false)}
          />
          
          {/* Dialog */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Draft Request</h3>
              
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete this draft request? This action cannot be undone.
              </p>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteDialog(false)}
                  disabled={deletingRequest}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deletingRequest}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deletingRequest ? 'Deleting...' : 'Delete Draft'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Cancel Registration Dialog */}
      {showCancelRegistrationDialog && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-[60]"
            onClick={() => !cancellingRegistration && setShowCancelRegistrationDialog(false)}
          />
          
          {/* Dialog */}
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Cancel Meeting Registration</h3>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for cancellation <span className="text-red-600">*</span>
              </label>
              <textarea
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                rows={4}
                placeholder="Please provide a reason for cancelling your registration..."
                disabled={cancellingRegistration}
                autoFocus
              />
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCancelRegistrationDialog(false)}
                  disabled={cancellingRegistration}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Close
                </button>
                <button
                  onClick={confirmCancelRegistration}
                  disabled={cancellingRegistration || !cancellationReason.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancellingRegistration ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
    </FluentProvider>
  )
}

function formatDate(v) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString()
}
