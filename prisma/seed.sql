-- Insert default identity for onboarding
INSERT INTO "Identity" (name, description, category, "isActive", "createdAt")
VALUES (
  'Consistent Mover',
  'I prioritize regular movement and building sustainable habits',
  'fitness',
  true,
  NOW()
) ON CONFLICT DO NOTHING;