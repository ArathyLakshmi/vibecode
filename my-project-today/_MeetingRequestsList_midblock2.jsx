                      <p className="text-xs text-green-700 mt-1">The meeting request has been cancelled and all parties will be notified.</p>
                    </div>
                  </div>
                </div>
              )}
              
              {approveSuccessMessage && (
                <div className="mb-4 p-4 bg-green-50 border-l-4 border-green-500 rounded-r">
                  <div className="flex items-center">
                    <CheckmarkCircle24Regular className="text-green-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-green-900">Request Approved Successfully</p>
                      <p className="text-xs text-green-700 mt-1">The meeting request has been approved and moved to the next stage.</p>
                    </div>
                  </div>
                </div>
              )}
              
              {confirmSuccessMessage && (
                <div className="mb-4 p-4 bg-[#e6f2ff] border-l-4 border-[#0078d4] rounded-r">
                  <div className="flex items-center">
                    <CheckmarkCircle24Regular className="text-[#0078d4] mr-3" />
                    <div>
                      <p className="text-sm font-medium text-[#0078d4]">Request Confirmed Successfully</p>
                      <p className="text-xs text-[#106ebe] mt-1">The meeting request has been confirmed and is ready for announcement.</p>
                    </div>
                  </div>
                </div>
              )}
              
              {announceSuccessMessage && (
                <div className="mb-4 p-4 bg-purple-50 border-l-4 border-purple-500 rounded-r">
                  <div className="flex items-center">
                    <CheckmarkCircle24Regular className="text-purple-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-purple-900">Request Announced Successfully</p>
                      <p className="text-xs text-purple-700 mt-1">The meeting request has been announced and is now visible to all stakeholders.</p>
                    </div>
                  </div>
                </div>
              )}
              
              {deleteSuccessMessage && (
                <div className="mb-4 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r">
                  <div className="flex items-center">
                    <CheckmarkCircle24Regular className="text-amber-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-amber-900">Draft Request Deleted Successfully</p>
                      <p className="text-xs text-amber-700 mt-1">The draft meeting request has been permanently removed.</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Registration Message Banner */}
              {registrationMessage && (
                <div className={`mb-4 p-4 border-l-4 rounded-r ${
                  registrationMessage.type === 'success' 
                    ? 'bg-green-50 border-green-500'
                    : 'bg-red-50 border-red-500'
                }`}>
                  <div className="flex items-center">
                    <CheckmarkCircle24Regular className={`${
                      registrationMessage.type === 'success' ? 'text-green-600' : 'text-red-600'
                    } mr-3`} />
                    <div>
                      <p className={`text-sm font-medium ${
                        registrationMessage.type === 'success' ? 'text-green-900' : 'text-red-900'
                      }`}>
                        {registrationMessage.text}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Request Lifecycle */}
              <div className="mb-6 pb-6 border-b">
                <div 
                  className="flex items-center justify-between cursor-pointer mb-4 hover:bg-gray-50 p-2 rounded -m-2"
                  onClick={() => setShowLifecycle(!showLifecycle)}
                >
                  <h3 className="text-sm font-semibold text-gray-700">Request Lifecycle</h3>
                  {showLifecycle ? <ChevronUp20Regular /> : <ChevronDown20Regular />}
                </div>
                
                {showLifecycle && (
                  <div>
                    {/* Show cancelled status if applicable */}
                    {(item.status ?? item.Status ?? '').toLowerCase() === 'cancelled' ? (
                      <div className="flex items-center justify-center p-6 bg-red-50 rounded-lg border-2 border-red-200">
                        <div className="text-center">
                          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                            <DismissCircle24Regular className="text-red-600 w-10 h-10" />
                          </div>
                          <div className="text-lg font-semibold text-red-900">Request Cancelled</div>
                          <div className="text-sm text-red-700 mt-1">This meeting request has been cancelled</div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between relative">
                        {/* Progress line */}
                        <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200" style={{ zIndex: 0 }}>
                          <div 
                            className="h-full bg-[#0078d4] transition-all duration-300"
                            style={{ 
                              width: (() => {
                                const status = (item.status ?? item.Status ?? 'Draft').toLowerCase()
                                if (status === 'draft') return '0%'
                                if (status === 'pending') return '25%'
                                if (status === 'approved') return '50%'
                                if (status === 'confirmed') return '75%'
                                if (status === 'announced') return '100%'
                                return '0%' // default to draft
                              })()
                            }}
                          />
                        </div>
                        
                        {/* Stages */}
                        {[
                          { key: 'draft', label: 'Draft', icon: DocumentBulletList24Regular },
                          { key: 'pending', label: 'Pending', icon: Clock24Regular },
                          { key: 'approved', label: 'Approved', icon: CheckmarkCircle24Regular },
                          { key: 'confirmed', label: 'Confirmed', icon: CalendarCheckmark24Regular },
                          { key: 'announced', label: 'Announced', icon: Megaphone24Regular }
                        ].map((stage, index) => {
                          const currentStatus = (item.status ?? item.Status ?? 'Draft').toLowerCase()
                          const isActive = currentStatus === stage.key
                          const isPassed = (() => {
                            const stages = ['draft', 'pending', 'approved', 'confirmed', 'announced']
                            const currentIndex = stages.indexOf(currentStatus)
                            return currentIndex > index
                          })()
                          const Icon = stage.icon
                          
                          return (
                            <div key={stage.key} className="flex flex-col items-center relative" style={{ zIndex: 1 }}>
                              <div 
                                className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                                  isActive 
                                    ? 'bg-[#0078d4] text-white shadow-lg scale-110' 
                                    : isPassed 
                                      ? 'bg-[#0078d4] text-white' 
                                      : 'bg-white border-2 border-gray-300 text-gray-400'
                                }`}
                              >
                                <Icon />
                              </div>
                              <span className={`text-xs font-medium text-center ${isActive ? 'text-[#0078d4]' : 'text-gray-600'}`}>
                                {stage.label}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
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
