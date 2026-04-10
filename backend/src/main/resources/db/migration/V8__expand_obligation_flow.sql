ALTER TABLE obligations
DROP CONSTRAINT IF EXISTS obligations_status_check;

ALTER TABLE obligations
ADD CONSTRAINT obligations_status_check
CHECK (status IN (
    'PENDING',
    'ACCEPTED',
    'REVIEW_PENDING_PARTIAL',
    'REVIEW_PENDING_COMPLETION',
    'REFUSED',
    'CANCELLED',
    'PARTIAL',
    'COMPLETED'
));
