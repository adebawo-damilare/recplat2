-- Screening question templates for designers and sales lanes.
-- Apply after 0011_notifications.sql.

INSERT INTO category_screening_questions (category_id, sort_order, prompt, response_type)
SELECT c.id, v.sort_order, v.prompt, 'textarea'
FROM categories c
CROSS JOIN (
  VALUES
    (
      'designers',
      10,
      'Share a link to work you are proud of and describe your role on the project.'
    ),
    ('designers', 20, 'Which design tools do you use daily, and for what?'),
    ('designers', 30, 'How do you incorporate feedback from stakeholders into your design process?'),
    ('designers', 40, 'Describe a time you improved usability or conversion through design.'),
    (
      'sales',
      10,
      'Describe your typical sales cycle and average deal size in your most recent role.'
    ),
    ('sales', 20, 'What CRM or sales stack do you use, and how do you keep pipeline hygiene?'),
    ('sales', 30, 'Share a win you are proud of — what was the situation and outcome?'),
    ('sales', 40, 'How do you research and personalize outreach to prospects?')
) AS v(slug, sort_order, prompt)
WHERE c.slug = v.slug
  AND NOT EXISTS (
    SELECT 1
    FROM category_screening_questions q
    WHERE q.category_id = c.id
  );
