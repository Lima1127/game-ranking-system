ALTER TABLE completions
ADD COLUMN underdog_awarded BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE completions c
SET underdog_awarded = TRUE
WHERE EXISTS (
    SELECT 1
    FROM score_events se
    WHERE se.completion_id = c.id
      AND se.rule_code = 'UNDERDOG_BONUS'
);
