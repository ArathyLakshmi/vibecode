-- Seed test data for Announcements feature
-- Update existing meeting requests to have Status="Announced"
-- Or insert new ones if needed

-- First, let's see what exists
-- SELECT * FROM MeetingRequests LIMIT 5;

-- Update some existing requests to be "Announced" with future dates
UPDATE MeetingRequests 
SET Status = 'Announced',
    MeetingDate = datetime('now', '+7 days')
WHERE Id IN (SELECT Id FROM MeetingRequests LIMIT 2);

-- Insert test announcements if table is empty or we need more
INSERT INTO MeetingRequests (
    Title, MeetingDate, AlternateDate, Category, Subcategory, 
    Description, Comments, Classification, Status, IsDraft,
    ReferenceNumber, RequestorName, RequestType, Country
) VALUES 
(
    'Q1 Budget Review Meeting',
    datetime('now', '+7 days'),
    NULL,
    'Finance',
    'Budget Planning',
    'Quarterly budget review for all departments',
    'All department heads should attend',
    'Internal',
    'Announced',
    0,
    'FIN-' || strftime('%Y', 'now') || '-001',
    'John Doe',
    'Budget Review',
    'USA'
),
(
    'Product Launch Strategy Session',
    datetime('now', '+14 days'),
    datetime('now', '+15 days'),
    'Product',
    'Strategy',
    'Strategic planning for upcoming product launch',
    'Marketing and Product teams required',
    'Confidential',
    'Announced',
    0,
    'PRD-' || strftime('%Y', 'now') || '-002',
    'Jane Smith',
    'Strategy Session',
    'USA'
),
(
    'Team Building Workshop',
    datetime('now', '+21 days'),
    NULL,
    'HR',
    'Team Development',
    'Annual team building activities and workshops',
    'All team members invited',
    'Internal',
    'Announced',
    0,
    'HR-' || strftime('%Y', 'now') || '-003',
    'Bob Johnson',
    'Workshop',
    'USA'
),
(
    'Past Meeting - Should Not Show',
    datetime('now', '-5 days'),
    NULL,
    'Test',
    'Testing',
    'This is a past announcement for testing filtering',
    'Should not appear in the announcements list',
    'Internal',
    'Announced',
    0,
    'TST-' || strftime('%Y', 'now') || '-004',
    'Test User',
    'Test',
    'USA'
);

-- Verify the data
SELECT Id, Title, MeetingDate, Category, Status, Classification
FROM MeetingRequests 
WHERE Status = 'Announced'
ORDER BY MeetingDate DESC;
