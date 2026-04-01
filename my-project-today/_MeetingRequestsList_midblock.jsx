              
              <div className="space-y-5">
                {/* Reference Number */}
                <Field label="Reference Number">
                  <Input 
                    value={item.referenceNumber ?? item.ReferenceNumber ?? ''} 
                    readOnly 
                  />
                </Field>
                
                {/* Status */}
                <Field label="Status">
                  <Input 
                    value={item.status ?? item.Status ?? 'Pending'} 
                    readOnly 
                  />
                </Field>
                
                {/* Meeting Title */}
                <Field label="Meeting Title">
                  <Input 
                    value={item.title ?? item.meetingTitle ?? ''} 
                    readOnly 
                  />
                </Field>
                
                {/* Meeting Date */}
                <Field label="Meeting Date">
                  <Input 
                    type="date"
                    value={item.meetingDate ?? item.MeetingDate ? new Date(item.meetingDate ?? item.MeetingDate).toISOString().slice(0, 10) : ''} 
                    readOnly 
                  />
                </Field>
                
                {/* Alternate Date */}
                <Field label="Alternate Date">
                  <Input 
                    type="date"
                    value={item.alternateDate ?? item.AlternateDate ? new Date(item.alternateDate ?? item.AlternateDate).toISOString().slice(0, 10) : ''} 
                    readOnly 
                  />
                </Field>
                
                {/* Meeting Category */}
                <Field label="Meeting Category">
                  <Input 
                    value={item.category ?? item.meetingCategory ?? item.MeetingCategory ?? ''} 
                    readOnly 
                  />
                </Field>
                
                {/* Meeting Subcategory */}
                <Field label="Meeting Subcategory">
                  <Input 
                    value={item.subcategory ?? item.meetingSubcategory ?? item.MeetingSubcategory ?? ''} 
                    readOnly 
                  />
                </Field>
                
                {/* Meeting Description */}
                <Field label="Meeting Description">
                  <Textarea 
                    value={item.description ?? item.meetingDescription ?? item.MeetingDescription ?? ''} 
                    readOnly 
                    rows={4}
                  />
                </Field>
                
                {/* Comments */}
                <Field label="Comments">
                  <Textarea 
                    value={item.comments ?? item.Comments ?? ''} 
                    readOnly 
                    rows={2}
                  />
                </Field>
                
                {/* Classification */}
                <Field label="Classification of Meeting">
                  <Input 
                    value={item.classification ?? item.Classification ?? ''} 
                    readOnly 
                  />
                </Field>
                
                {/* Request Type */}
                <Field label="Request Type">
                  <Input 
                    value={item.requestType ?? item.type ?? item.RequestType ?? ''} 
                    readOnly 
                  />
                </Field>
                
                {/* Requestor */}
                <Field label="Requestor">
                  <Input 
                    value={item.requestorName ?? item.requestor ?? item.RequestorName ?? ''} 
                    readOnly 
                  />
                </Field>
                            disabled={cancellingRegistration}
                            className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                          >
                            {cancellingRegistration ? 'Cancelling...' : 'Cancel Registration'}
                          </button>
                        )}
                      </div>
                    ) : (capacityInfo?.isRegistrationOpen ?? true) ? (
                      <button
                        onClick={() => handleRegister(selectedItem)}
                        disabled={registeringMeeting}
                        className="w-full px-4 py-3 bg-[#0078d4] text-white rounded-lg hover:bg-[#106ebe] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                      >
                        {registeringMeeting ? (
                          <>
                            <Spinner size="tiny" />
                            <span>Registering...</span>
                          </>
                        ) : (
                          <>
                            <CalendarCheckmark24Regular />
                            <span>Register for Meeting</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="p-3 bg-gray-100 rounded-lg text-center">
                        <p className="text-sm text-gray-600">Registration is currently closed</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Attendees */}
                {canViewAttendeeList && (
                  <div className="mt-8 pt-6 border-t">
                    <div
                      className="flex items-center justify-between cursor-pointer mb-4 hover:bg-gray-50 p-2 rounded -m-2"
                      onClick={() => setShowAttendees(!showAttendees)}
                    >
                      <h3 className="text-sm font-semibold text-gray-700">Attendees</h3>
                      {showAttendees ? <ChevronUp20Regular /> : <ChevronDown20Regular />}
                    </div>

                    {showAttendees && (
                      <AttendeeListView
                        data={attendeeList}
                        loading={loadingAttendees}
                        error={attendeesError}
                        onRefresh={() => selectedItem && fetchAttendees(selectedItem)}
                      />
                    )}
                  </div>
                )}
                
                {/* T057-T065: Attachments Section */}
                <div className="mt-8 pt-6 border-t">
                  <div 
                    className="flex items-center justify-between cursor-pointer mb-4 hover:bg-gray-50 p-2 rounded -m-2"
